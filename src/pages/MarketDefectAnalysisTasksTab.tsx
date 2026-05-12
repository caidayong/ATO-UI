/**
 * @page 市场缺陷分析 · 分析报告（Tab2）
 * @version V1.0.1-P5
 * @base docs/prd/V1.0.1-P5/ATO_V1.0.1-P5-页面需求与交互规格.md §3.3 Tab2
 * @changes
 *   - V1.0.1-P5: 初始实现分析报告列表/创建编辑弹窗（Mock）
 *   - V1.0.1-P5: 列表「发送邮件」与报告详情共用 `MarketDefectSendMailModal`（发件人只读、收件人多选可搜、团队单选）
 *   - V1.0.1-P5: 进行中时重新生成/发送邮件/删除置灰；已完成或异常时「重新生成」将状态置为进行中；异常时发送邮件置灰
 *   - 创建/编辑报告弹窗：数据范围「月」随「季度」联动（与列表页一致）
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, MailOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { MarketDefectSendMailModal } from '@/components/MarketDefectSendMailModal';
import type { AnalysisReportTask } from '@/types';
import { mockAnalysisReportTasks, mockTeams } from '@/mocks/data';
import { toolsMarketDefectReportDetailPath } from '@/constants/routes';
import {
  MARKET_DEFECT_ACTUAL_TEAM_OPTIONS,
  MARKET_DEFECT_ANALYSIS_REPORT_FIXED_TYPES,
  MARKET_DEFECT_DATA_RANGE_QUARTER_OPTIONS,
  MARKET_DEFECT_DATA_RANGE_YEAR_OPTIONS,
  getMarketDefectDataRangeMonthOptionsByQuarter,
  MARKET_DEFECT_RDMS_PRODUCT_ID_OPTIONS,
  selectOptions,
  selectWithAll,
} from '@/constants/marketDefectMockOptions';

type ReportFormValues = {
  reportName: string;
  assignedTeam: string;
  scopeYear: string;
  scopeQuarter: string;
  scopeMonth: string;
  scopeActualTeam: string;
  rdmsProductIds: string[];
  productOwner: string;
  devOwner: string;
  testOwner: string;
};

function defaultDataRange(): Pick<
  ReportFormValues,
  'scopeYear' | 'scopeQuarter' | 'scopeMonth' | 'scopeActualTeam'
> {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = now.getMonth() + 1;
  return {
    scopeYear: y,
    scopeQuarter: `Q${Math.ceil(m / 3)}`,
    scopeMonth: `${m}月`,
    scopeActualTeam: '全部',
  };
}

function formatYearLabel(y: string): string {
  if (!y || y === '全部') return '全部(年)';
  return `${y}年`;
}

function formatDataScopeSummary(v: ReportFormValues): string {
  const y = formatYearLabel(v.scopeYear);
  const q = v.scopeQuarter === '全部' ? '全部(季)' : v.scopeQuarter;
  const m = v.scopeMonth === '全部' ? '全部(月)' : v.scopeMonth;
  const team = v.scopeActualTeam === '全部' ? '全部' : v.scopeActualTeam;
  return `${y} ${q} ${m} · 实际归属团队:${team}`;
}

function taskToFormValues(r: AnalysisReportTask): ReportFormValues {
  const dr = defaultDataRange();
  return {
    reportName: r.reportName,
    assignedTeam: r.teamName,
    scopeYear: r.scopeYear ?? dr.scopeYear,
    scopeQuarter: r.scopeQuarter ?? dr.scopeQuarter,
    scopeMonth: r.scopeMonth ?? dr.scopeMonth,
    scopeActualTeam: r.scopeActualTeam ?? dr.scopeActualTeam,
    rdmsProductIds: r.rdmsProductIds?.length ? [...r.rdmsProductIds] : [],
    productOwner: r.productOwner ?? '',
    devOwner: r.devOwner ?? '',
    testOwner: r.testOwner ?? '',
  };
}

function buildRowFromForm(
  v: ReportFormValues,
  meta: Pick<
    AnalysisReportTask,
    | 'reportId'
    | 'creator'
    | 'createdAt'
    | 'status'
    | 'leakRate'
    | 'validDefectTotal'
    | 'productDefectLeakRate'
  >,
): AnalysisReportTask {
  const timeRange = formatDataScopeSummary(v);
  const rdmsNote = v.rdmsProductIds.length > 0 ? ` · RDMS:${v.rdmsProductIds.join('、')}` : '';
  return {
    ...meta,
    reportName: v.reportName.trim(),
    teamName: v.assignedTeam,
    timeRange: `${timeRange}${rdmsNote}`,
    scopeYear: v.scopeYear,
    scopeQuarter: v.scopeQuarter,
    scopeMonth: v.scopeMonth,
    scopeActualTeam: v.scopeActualTeam,
    rdmsProductIds: [...v.rdmsProductIds],
    productOwner: v.productOwner.trim(),
    devOwner: v.devOwner.trim(),
    testOwner: v.testOwner.trim(),
  };
}

const RDMS_RULES = [
  { required: true, message: '请选择 RDMS 产品 ID' },
  {
    validator: (_: unknown, v: string[]) =>
      v?.length ? Promise.resolve() : Promise.reject(new Error('请至少选择一个 RDMS 产品 ID')),
  },
];

const OWNER_RULE = (label: string) => [{ required: true, message: `请输入${label}` }];

export function MarketDefectAnalysisTasksTab() {
  const [reportForm] = Form.useForm<ReportFormValues>();
  const [reportModal, setReportModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    reportId?: string;
  }>({ open: false, mode: 'create' });

  const [rows, setRows] = useState<AnalysisReportTask[]>(() =>
    mockAnalysisReportTasks.map((r) => ({ ...r })),
  );
  const [listTeamFilter, setListTeamFilter] = useState('全部');
  const [mailOpen, setMailOpen] = useState(false);
  const [mailRow, setMailRow] = useState<AnalysisReportTask | null>(null);

  const scopeQuarter = Form.useWatch('scopeQuarter', reportForm);
  const scopeMonthOptions = useMemo(
    () => getMarketDefectDataRangeMonthOptionsByQuarter(scopeQuarter ?? '全部'),
    [scopeQuarter],
  );

  useEffect(() => {
    if (!reportModal.open) return;
    const valid = new Set(scopeMonthOptions.map((o) => o.value));
    const cur = reportForm.getFieldValue('scopeMonth') as string | undefined;
    if (cur != null && cur !== '' && !valid.has(cur)) {
      reportForm.setFieldsValue({ scopeMonth: '全部' });
    }
  }, [reportModal.open, scopeQuarter, scopeMonthOptions, reportForm]);

  const dataSource = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (listTeamFilter === '全部') return sorted;
    return sorted.filter((r) => r.teamName === listTeamFilter);
  }, [rows, listTeamFilter]);

  const basicDataTeamOptions = useMemo(
    () => mockTeams.map((t) => ({ value: t.name, label: t.name })),
    [],
  );

  const listTeamFilterOptions = useMemo(
    () => selectWithAll(mockTeams.map((t) => t.name)),
    [],
  );

  const scopeActualTeamOptions = useMemo(() => selectWithAll([...MARKET_DEFECT_ACTUAL_TEAM_OPTIONS]), []);

  const rdmsProductOptions = useMemo(
    () => selectOptions([...MARKET_DEFECT_RDMS_PRODUCT_ID_OPTIONS]),
    [],
  );

  const openCreateModal = useCallback(() => {
    reportForm.setFieldsValue({
      ...defaultDataRange(),
      reportName: '',
      assignedTeam: undefined,
      rdmsProductIds: [],
      productOwner: '',
      devOwner: '',
      testOwner: '',
    });
    setReportModal({ open: true, mode: 'create' });
  }, [reportForm]);

  const openEditModal = useCallback(
    (record: AnalysisReportTask) => {
      reportForm.setFieldsValue(taskToFormValues(record));
      setReportModal({ open: true, mode: 'edit', reportId: record.reportId });
    },
    [reportForm],
  );

  const closeReportModal = useCallback(() => {
    setReportModal({ open: false, mode: 'create' });
    reportForm.resetFields();
  }, [reportForm]);

  const handleReportModalOk = useCallback(async () => {
    const v = await reportForm.validateFields();
    if (reportModal.mode === 'create') {
      const newRow = buildRowFromForm(v, {
        reportId: `RPT-${Date.now()}`,
        creator: '当前用户(Mock)',
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        status: '进行中',
        leakRate: '—',
        validDefectTotal: '—',
        productDefectLeakRate: '—',
      });
      setRows((prev) => [newRow, ...prev]);
      message.success(
        `已提交创建缺陷分析报告（Mock）；后台将按固定 ${MARKET_DEFECT_ANALYSIS_REPORT_FIXED_TYPES.length} 个统计维度生成`,
      );
    } else if (reportModal.reportId) {
      const id = reportModal.reportId;
      setRows((prev) =>
        prev.map((x) =>
          x.reportId === id
            ? buildRowFromForm(v, {
                reportId: x.reportId,
                creator: x.creator,
                createdAt: x.createdAt,
                status: x.status,
                leakRate: x.leakRate,
                validDefectTotal: x.validDefectTotal,
                productDefectLeakRate: x.productDefectLeakRate,
              })
            : x,
        ),
      );
      message.success('已保存编辑（Mock）');
    }
    closeReportModal();
  }, [closeReportModal, reportForm, reportModal]);

  const tryDelete = (record: AnalysisReportTask) => {
    if (record.status === '进行中') {
      message.warning('进行中的报告不可删除');
      return;
    }
    Modal.confirm({
      title: '确认删除该分析报告？',
      content: '删除后不可恢复（Mock）。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setRows((prev) => prev.filter((x) => x.reportId !== record.reportId));
        message.success('已删除（Mock）');
      },
    });
  };

  const tryRegenerate = useCallback((record: AnalysisReportTask) => {
    setRows((prev) =>
      prev.map((x) => (x.reportId === record.reportId ? { ...x, status: '进行中' } : x)),
    );
    message.success(`重新生成任务已提交（Mock），状态已置为「进行中」：${record.reportName}`);
  }, []);

  const columns: ColumnsType<AnalysisReportTask> = [
    {
      title: '报告名称',
      dataIndex: 'reportName',
      ellipsis: true,
      render: (name: string, r) => (
        <Link to={`${toolsMarketDefectReportDetailPath(r.reportId)}?mode=view`}>{name}</Link>
      ),
    },
    { title: '报告归属团队', dataIndex: 'teamName', width: 130 },
    { title: '创建人', dataIndex: 'creator', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    { title: '有效缺陷总数', dataIndex: 'validDefectTotal', width: 110 },
    { title: '产品缺陷泄露率', dataIndex: 'productDefectLeakRate', width: 120 },
    { title: '测试缺陷泄漏率', dataIndex: 'leakRate', width: 130 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: AnalysisReportTask['status']) => {
        if (status === '已完成') {
          return <span style={{ color: '#52c41a' }}>{status}</span>;
        }
        if (status === '异常') {
          return <span style={{ color: '#ff4d4f' }}>{status}</span>;
        }
        return <span>{status}</span>;
      },
    },
    {
      title: '操作',
      key: 'op',
      width: 156,
      render: (_, r) => {
        const inProgress = r.status === '进行中';
        const isAbnormal = r.status === '异常';
        const mailDisabled = inProgress || isAbnormal;
        return (
          <Space size={4}>
            <Tooltip title="编辑">
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditModal(r)} />
            </Tooltip>
            <Tooltip title={inProgress ? '进行中不可重新生成' : '重新生成'}>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                disabled={inProgress}
                onClick={() => tryRegenerate(r)}
              />
            </Tooltip>
            <Tooltip
              title={
                inProgress ? '进行中不可发送邮件' : isAbnormal ? '异常状态不可发送邮件' : '发送邮件'
              }
            >
              <Button
                type="text"
                size="small"
                icon={<MailOutlined />}
                disabled={mailDisabled}
                onClick={() => {
                  setMailRow(r);
                  setMailOpen(true);
                }}
              />
            </Tooltip>
            <Tooltip title={inProgress ? '进行中不可删除' : '删除'}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={inProgress}
                onClick={() => tryDelete(r)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const modalTitle = reportModal.mode === 'create' ? '创建缺陷分析报告' : '编辑缺陷分析报告';

  return (
    <Card size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Space wrap align="center" size="middle">
            <Button type="primary" onClick={openCreateModal}>
              创建缺陷分析报告
            </Button>
            <Space align="center" size={8} wrap>
              <Typography.Text type="secondary">报告归属团队</Typography.Text>
              <Select
                style={{ minWidth: 152 }}
                value={listTeamFilter}
                onChange={setListTeamFilter}
                options={listTeamFilterOptions}
              />
            </Space>
          </Space>
          <Typography.Text type="secondary">
            分析报告列表（Mock）；进行中时重新生成/发邮件/删除不可用；已完成或异常可点「重新生成」回到进行中；异常时不可发邮件。
          </Typography.Text>
        </div>
        <Table<AnalysisReportTask>
          rowKey="reportId"
          size="small"
          columns={columns}
          dataSource={dataSource}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Space>

      <MarketDefectSendMailModal
        open={mailOpen}
        contextText={mailRow ? `报告：${mailRow.reportName}` : undefined}
        defaultTeamName={mailRow?.teamName}
        onCancel={() => {
          setMailOpen(false);
          setMailRow(null);
        }}
        onConfirmSend={async () => {
          message.success('邮件已发送（Mock）');
          setMailOpen(false);
          setMailRow(null);
        }}
      />

      <Modal
        title={modalTitle}
        open={reportModal.open}
        width={760}
        onCancel={closeReportModal}
        onOk={handleReportModalOk}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={reportForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="reportName"
            label="报告名称"
            rules={[{ required: true, message: '请输入报告名称' }]}
          >
            <Input placeholder="例如：S17-2026年Q1市场缺陷分析" allowClear />
          </Form.Item>

          <Form.Item
            name="assignedTeam"
            label="报告归属团队"
            rules={[{ required: true, message: '请选择报告归属团队' }]}
            extra="选项与「基础数据」团队管理同源（Mock：mockTeams）。"
          >
            <Select
              placeholder="请选择报告归属团队"
              options={basicDataTeamOptions}
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Typography.Text type="secondary">数据范围</Typography.Text>
          <Row gutter={12} style={{ marginTop: 8 }}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="scopeYear" label="年" rules={[{ required: true, message: '请选择年' }]}>
                <Select options={MARKET_DEFECT_DATA_RANGE_YEAR_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="scopeQuarter" label="季度" rules={[{ required: true, message: '请选择季度' }]}>
                <Select options={MARKET_DEFECT_DATA_RANGE_QUARTER_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="scopeMonth" label="月" rules={[{ required: true, message: '请选择月' }]}>
                <Select options={scopeMonthOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="scopeActualTeam"
                label="实际归属团队"
                rules={[{ required: true, message: '请选择实际归属团队' }]}
              >
                <Select options={scopeActualTeamOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="rdmsProductIds" label="RDMS 产品 ID" rules={[...RDMS_RULES]}>
            <Select
              mode="multiple"
              allowClear
              placeholder="支持多选，至少选一项"
              options={rdmsProductOptions}
              maxTagCount="responsive"
            />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="productOwner" label="产品负责人" rules={OWNER_RULE('产品负责人')}>
                <Input placeholder="请输入产品负责人" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="devOwner" label="开发负责人" rules={OWNER_RULE('开发负责人')}>
                <Input placeholder="请输入开发负责人" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="testOwner" label="测试负责人" rules={OWNER_RULE('测试负责人')}>
                <Input placeholder="请输入测试负责人" allowClear />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}
