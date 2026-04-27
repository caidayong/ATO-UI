/**
 * @page 产测软件管理 / 计划管理 / 计划详情
 * @version V1.0.1-P4
 * @base ATO_V1.0.1-P4-页面需求与交互规格.md 第 4.2 节
 * @changes
 *   - V1.0.1-P4: 初始实现，交付三 Tab（软件烧录表/操作日志/生产计划表）及保存、提交、变更态基础交互
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  mockBurnRows,
  mockPlanOperationLogs,
  mockPlanSubmitContacts,
  mockPlanSheetRows,
  mockProductionPlans,
  mockTeamMemberIds,
  mockTeams,
  mockUsers,
} from '@/mocks/data';
import { ROUTES } from '@/constants/routes';
import type { BurnRow, PlanOperationLog, PlanSheetRow, ProductionPlan, ProductionPlanStatus } from '@/types';

const STATUS_COLOR_MAP: Record<ProductionPlanStatus, string> = {
  匹配中: 'processing',
  匹配失败: 'error',
  待确认: 'warning',
  已提交: 'success',
};
const ALERT_TEXT_COLOR = '#cf1322';

type ChangeDetailFormValues = {
  reason: string;
  impactScope: string;
  remark?: string;
};

type SubmitConfirmFormValues = {
  senderIds: string[];
  ccIds?: string[];
  ccTeamId?: string;
};

const DEFAULT_CHANGE_REASONS = ['迭代更新', 'bug修复'];
const CHANGE_REASON_STORAGE_KEY = 'ptsw-change-reasons';
const SUBMIT_CONTACTS_STORAGE_KEY = 'ptsw-submit-contacts-by-plan';

type SubmitContactsDraft = {
  senderIds: string[];
  ccIds?: string[];
  ccTeamId?: string;
};

export function ProductionPlanDetail() {
  const navigate = useNavigate();
  const { planId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'burn' | 'log' | 'production'>('burn');
  const mode = searchParams.get('mode');
  const isChangeEdit = mode === 'changeEdit';
  const [burnKeywordInput, setBurnKeywordInput] = useState('');
  const [burnKeyword, setBurnKeyword] = useState('');
  const [productionKeywordInput, setProductionKeywordInput] = useState('');
  const [productionKeyword, setProductionKeyword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [changeForm] = Form.useForm<ChangeDetailFormValues>();
  const [submitForm] = Form.useForm<SubmitConfirmFormValues>();
  const [changeReasonOptions, setChangeReasonOptions] = useState<string[]>(DEFAULT_CHANGE_REASONS);
  const [newChangeReason, setNewChangeReason] = useState('');
  const [submitContactsByPlan, setSubmitContactsByPlan] = useState<Record<string, SubmitContactsDraft>>({});

  const plan = useMemo<ProductionPlan | undefined>(() => {
    return mockProductionPlans.find((item) => item.id === planId);
  }, [planId]);
  const [currentStatus, setCurrentStatus] = useState<ProductionPlanStatus | undefined>(plan?.status);

  const initialBurnRows = useMemo<BurnRow[]>(() => mockBurnRows.filter((item) => item.planId === planId), [planId]);
  const [burnRows, setBurnRows] = useState<BurnRow[]>(() => initialBurnRows);
  const [logRows, setLogRows] = useState<PlanOperationLog[]>(() => mockPlanOperationLogs.filter((item) => item.planId === planId));
  const productionRows = useMemo<PlanSheetRow[]>(() => mockPlanSheetRows.filter((item) => item.planId === planId), [planId]);
  const initialBurnRowsMap = useMemo<Record<string, BurnRow>>(
    () => Object.fromEntries(initialBurnRows.map((row) => [row.id, row])),
    [initialBurnRows]
  );
  const [changedBurnRowIds, setChangedBurnRowIds] = useState<Set<string>>(() => new Set());

  const filteredBurnRows = useMemo(() => {
    const keyword = burnKeyword.trim().toLowerCase();
    if (!keyword) {
      return burnRows;
    }
    return burnRows.filter((row) =>
      [row.taskNo, row.materialCode, row.materialDesc, row.icPartNo, row.icModel, row.softwareName].some((field) =>
        field.toLowerCase().includes(keyword)
      )
    );
  }, [burnKeyword, burnRows]);

  const filteredProductionRows = useMemo(() => {
    const keyword = productionKeyword.trim().toLowerCase();
    if (!keyword) {
      return productionRows;
    }
    return productionRows.filter((row) =>
      [row.week, row.taskNo, row.materialCode, row.name].some((field) => field.toLowerCase().includes(keyword))
    );
  }, [productionKeyword, productionRows]);

  const burnRowSpanMap = useMemo(() => {
    const spanMap: Record<string, number> = {};
    let start = 0;
    while (start < filteredBurnRows.length) {
      const current = filteredBurnRows[start];
      const groupKey = `${current.taskNo}|${current.materialCode}|${current.materialDesc}|${current.quantity}`;
      let end = start + 1;
      while (end < filteredBurnRows.length) {
        const next = filteredBurnRows[end];
        const nextKey = `${next.taskNo}|${next.materialCode}|${next.materialDesc}|${next.quantity}`;
        if (nextKey !== groupKey) {
          break;
        }
        end += 1;
      }
      const span = end - start;
      spanMap[current.id] = span;
      for (let i = start + 1; i < end; i += 1) {
        spanMap[filteredBurnRows[i].id] = 0;
      }
      start = end;
    }
    return spanMap;
  }, [filteredBurnRows]);

  const editable = isChangeEdit ? true : currentStatus !== '已提交';

  const userOptions = useMemo(
    () => mockUsers.map((user) => ({ label: `${user.name}（${user.employeeId}）`, value: user.id })),
    []
  );
  const teamOptions = useMemo(
    () => mockTeams.map((team) => ({ label: team.name, value: team.id })),
    []
  );

  const handleBurnQuery = () => {
    setBurnKeyword(burnKeywordInput);
  };

  const handleProductionQuery = () => {
    setProductionKeyword(productionKeywordInput);
  };

  const updateBurnRow = (id: string, patch: Partial<BurnRow>) => {
    setBurnRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const next = { ...item, ...patch };
        const baseline = initialBurnRowsMap[id];
        const isChanged = baseline
          ? JSON.stringify(next) !== JSON.stringify(baseline)
          : true;
        setChangedBurnRowIds((prevIds) => {
          const nextIds = new Set(prevIds);
          if (isChanged) {
            nextIds.add(id);
          } else {
            nextIds.delete(id);
          }
          return nextIds;
        });
        return next;
      })
    );
  };
  const hasSoftwareName = (row: BurnRow) => row.softwareName.trim().length > 0;
  const isOfflineAlertRow = (row: BurnRow) => hasSoftwareName(row) && row.softwareStatus === '已下架';

  useEffect(() => {
    setBurnRows(initialBurnRows);
    setChangedBurnRowIds(new Set());
  }, [initialBurnRows]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHANGE_REASON_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      const valid = parsed
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      if (valid.length) {
        setChangeReasonOptions(Array.from(new Set([...DEFAULT_CHANGE_REASONS, ...valid])));
      }
    } catch {
      // ignore invalid localStorage payload
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SUBMIT_CONTACTS_STORAGE_KEY);
      if (!raw) {
        setSubmitContactsByPlan(mockPlanSubmitContacts);
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, SubmitContactsDraft>;
      setSubmitContactsByPlan({ ...mockPlanSubmitContacts, ...parsed });
    } catch {
      setSubmitContactsByPlan(mockPlanSubmitContacts);
    }
  }, []);

  const handleAddChangeReason = () => {
    const next = newChangeReason.trim();
    if (!next) {
      message.warning('请先输入要添加的变更原因');
      return;
    }
    if (changeReasonOptions.includes(next)) {
      message.info('该变更原因已存在');
      setNewChangeReason('');
      return;
    }
    const nextOptions = [...changeReasonOptions, next];
    setChangeReasonOptions(nextOptions);
    setNewChangeReason('');
    window.localStorage.setItem(CHANGE_REASON_STORAGE_KEY, JSON.stringify(nextOptions));
    changeForm.setFieldValue('reason', next);
    message.success('变更原因已添加并保存');
  };

  const validateSubmit = () => {
    const invalidRows = burnRows.filter((row) => row.shouldBurn === '是' && !row.softwareName.trim());
    if (invalidRows.length) {
      Modal.error({
        title: '提交校验失败',
        content: `存在 ${invalidRows.length} 条“需烧录但无软件名称”的记录，请先补齐软件名称。`,
      });
      return false;
    }
    return true;
  };

  const runSubmit = (submitValues: SubmitConfirmFormValues) => {
    setSubmitting(true);
    window.setTimeout(() => {
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const target = mockProductionPlans.find((item) => item.id === planId);
      if (target) {
        target.status = '已提交';
        target.submittedAt = now;
      }
      setCurrentStatus('已提交');
      const changeDetails = changeForm.getFieldsValue();
      const submitLog: PlanOperationLog = {
        id: `LOG-${Date.now()}`,
        planId,
        operatedAt: now,
        operator: '当前用户',
        actionType: isChangeEdit ? '变更' : '提交',
        summary: isChangeEdit
          ? `变更内容：原因=${changeDetails.reason ?? '-'}；影响范围=${changeDetails.impactScope ?? '-'}；备注=${changeDetails.remark || '-'}`
          : '提交计划并发送通知邮件',
      };
      setLogRows((prev) => [submitLog, ...prev]);
      mockPlanOperationLogs.unshift(submitLog);
      setSubmitting(false);
      setSubmitModalOpen(false);
      const savedContacts: SubmitContactsDraft = {
        senderIds: submitValues.senderIds,
        ccIds: submitValues.ccIds,
        ccTeamId: submitValues.ccTeamId,
      };
      setSubmitContactsByPlan((prev) => {
        const next = { ...prev, [planId]: savedContacts };
        window.localStorage.setItem(SUBMIT_CONTACTS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      submitForm.setFieldsValue(savedContacts);
      message.success(isChangeEdit ? '变更提交成功，已进入审批流程（Mock）' : '提交成功');
    }, 500);
  };

  const appendUsersByTeam = (fieldName: 'senderIds' | 'ccIds', teamId?: string) => {
    if (!teamId) {
      return;
    }
    const teamMemberIds = mockTeamMemberIds[teamId] ?? [];
    const current = submitForm.getFieldValue(fieldName) ?? [];
    const merged = Array.from(new Set([...current, ...teamMemberIds]));
    submitForm.setFieldsValue({ [fieldName]: merged });
  };

  const handleConfirmSubmit = async () => {
    const submitValues = await submitForm.validateFields();
    runSubmit(submitValues);
  };

  const handleSubmit = async () => {
    if (!plan) {
      message.warning('计划不存在，无法提交');
      return;
    }
    if (!editable) {
      message.warning('已提交计划不可再次提交');
      return;
    }
    if (!isChangeEdit && currentStatus !== '待确认') {
      message.warning('当前状态不可提交，请在待确认状态下提交');
      return;
    }
    if (!validateSubmit()) {
      return;
    }
    if (isChangeEdit) {
      await changeForm.validateFields();
    }
    const cachedContacts = submitContactsByPlan[planId];
    submitForm.setFieldsValue({
      senderIds: cachedContacts?.senderIds ?? [],
      ccIds: cachedContacts?.ccIds ?? [],
      ccTeamId: cachedContacts?.ccTeamId,
    });
    setSubmitModalOpen(true);
  };

  const handleSave = async () => {
    if (!editable) {
      message.warning('已提交计划不可修改');
      return;
    }
    if (isChangeEdit) {
      await changeForm.validateFields();
    }
    message.success('保存成功');
  };

  const burnColumns: TableProps<BurnRow>['columns'] = [
    {
      title: '生产任务单编号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 170,
      onCell: (record) => ({ rowSpan: burnRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '物料代码',
      dataIndex: 'materialCode',
      key: 'materialCode',
      width: 160,
      onCell: (record) => ({ rowSpan: burnRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '物料描述',
      dataIndex: 'materialDesc',
      key: 'materialDesc',
      width: 220,
      onCell: (record) => ({ rowSpan: burnRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      onCell: (record) => ({ rowSpan: burnRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: 'IC料号',
      dataIndex: 'icPartNo',
      key: 'icPartNo',
      width: 150,
      render: (value, record) => (
        <span style={isOfflineAlertRow(record) ? { color: ALERT_TEXT_COLOR, fontWeight: 500 } : undefined}>{value}</span>
      ),
    },
    {
      title: 'IC型号',
      dataIndex: 'icModel',
      key: 'icModel',
      width: 150,
      render: (value, record) => (
        <span style={isOfflineAlertRow(record) ? { color: ALERT_TEXT_COLOR, fontWeight: 500 } : undefined}>{value}</span>
      ),
    },
    {
      title: '软件名称',
      dataIndex: 'softwareName',
      key: 'softwareName',
      width: 220,
      render: (value: string, record) => (
        <Input
          value={value}
          disabled={!editable}
          placeholder="请输入软件名称"
          style={isOfflineAlertRow(record) ? { color: ALERT_TEXT_COLOR } : undefined}
          status={isOfflineAlertRow(record) ? 'error' : undefined}
          onChange={(e) => {
            const nextName = e.target.value;
            if (!nextName.trim()) {
              updateBurnRow(record.id, {
                softwareName: nextName,
                softwareStatus: undefined,
                shouldBurn: undefined,
                burnStage: undefined,
              });
              return;
            }
            updateBurnRow(record.id, { softwareName: nextName });
          }}
        />
      ),
    },
    {
      title: '软件状态',
      dataIndex: 'softwareStatus',
      key: 'softwareStatus',
      width: 130,
      render: (value, record) =>
        hasSoftwareName(record) ? (
          <Select
            style={{ width: 100 }}
            status={isOfflineAlertRow(record) ? 'error' : undefined}
            value={value}
            disabled={!editable}
            options={[
              { label: '正常', value: '正常' },
              { label: '已下架', value: '已下架' },
            ]}
            onChange={(nextValue) => updateBurnRow(record.id, { softwareStatus: nextValue })}
          />
        ) : (
          ''
        ),
    },
    {
      title: '是否烧录',
      dataIndex: 'shouldBurn',
      key: 'shouldBurn',
      width: 120,
      render: (value, record) =>
        hasSoftwareName(record) ? (
          <Select
            style={{ width: 90 }}
            status={isOfflineAlertRow(record) ? 'error' : undefined}
            value={value}
            disabled={!editable}
            options={[
              { label: '是', value: '是' },
              { label: '否', value: '否' },
            ]}
            onChange={(nextValue) => updateBurnRow(record.id, { shouldBurn: nextValue })}
          />
        ) : (
          ''
        ),
    },
    {
      title: '烧录阶段',
      dataIndex: 'burnStage',
      key: 'burnStage',
      width: 160,
      render: (value, record) =>
        hasSoftwareName(record) ? (
          <Select
            style={{ width: 140 }}
            status={isOfflineAlertRow(record) ? 'error' : undefined}
            value={value}
            disabled={!editable}
            options={[
              { label: '贴片前烧录', value: '贴片前烧录' },
              { label: '贴片后烧录', value: '贴片后烧录' },
            ]}
            onChange={(nextValue) => updateBurnRow(record.id, { burnStage: nextValue })}
          />
        ) : (
          ''
        ),
    },
  ];

  const logColumns: TableProps<PlanOperationLog>['columns'] = [
    { title: '时间', dataIndex: 'operatedAt', key: 'operatedAt', width: 170 },
    { title: '操作人', dataIndex: 'operator', key: 'operator', width: 120 },
    { title: '动作类型', dataIndex: 'actionType', key: 'actionType', width: 120 },
    { title: '摘要', dataIndex: 'summary', key: 'summary' },
  ];

  const productionColumns: TableProps<PlanSheetRow>['columns'] = [
    { title: '周次', dataIndex: 'week', key: 'week', width: 100 },
    { title: '生产任务单编号', dataIndex: 'taskNo', key: 'taskNo', width: 170 },
    { title: '物料代码', dataIndex: 'materialCode', key: 'materialCode', width: 160 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 100 },
  ];

  if (!plan) {
    return (
      <Card>
        <Empty description="计划不存在或已被删除">
          <Button onClick={() => navigate(ROUTES.PTSW_PLANS)}>返回计划列表</Button>
        </Empty>
      </Card>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 140px)' }}>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(ROUTES.PTSW_PLANS)}>
              返回
            </Button>
            <strong>{plan.planName}</strong>
            {currentStatus ? <Tag color={STATUS_COLOR_MAP[currentStatus]}>{currentStatus}</Tag> : null}
            {isChangeEdit && <Tag color="purple">变更编辑态</Tag>}
          </Space>
          <Space>
            <Button icon={<SaveOutlined />} onClick={() => void handleSave()} disabled={!editable}>
              保存
            </Button>
            <Button type="primary" loading={submitting} onClick={() => void handleSubmit()} disabled={!editable}>
              {isChangeEdit ? '提交变更' : '提交'}
            </Button>
          </Space>
        </Space>
      </Card>

      {isChangeEdit ? (
        <Card style={{ marginBottom: 16 }}>
          <Form<ChangeDetailFormValues> form={changeForm} layout="vertical">
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <Form.Item
                style={{ width: 280 }}
                name="reason"
                label="变更原因"
                rules={[{ required: true, message: '请输入变更原因' }]}
              >
                <Select
                  showSearch
                  placeholder="请选择变更原因"
                  options={changeReasonOptions.map((item) => ({ label: item, value: item }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 8px', width: '100%' }}>
                        <Input
                          placeholder="输入自定义变更原因"
                          value={newChangeReason}
                          onChange={(e) => setNewChangeReason(e.target.value)}
                          onPressEnter={handleAddChangeReason}
                        />
                        <Button type="primary" onClick={handleAddChangeReason}>
                          添加
                        </Button>
                      </Space>
                    </>
                  )}
                />
              </Form.Item>
              <Form.Item
                style={{ flex: 1, minWidth: 0 }}
                name="impactScope"
                label="影响范围"
                rules={[{ required: true, message: '请输入影响范围' }]}
              >
                <Input placeholder="请输入影响范围（板卡/工单等）" />
              </Form.Item>
            </div>
            <Form.Item name="remark" label="备注">
              <Input placeholder="可选填写" />
            </Form.Item>
          </Form>
        </Card>
      ) : null}

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'burn' | 'log' | 'production')}
          items={[
            {
              key: 'burn',
              label: '软件烧录表',
              children: (
                <>
                  <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Button icon={<DownloadOutlined />} onClick={() => message.success('导出成功（Mock）')}>
                      导出
                    </Button>
                    <Space>
                      <Input
                        allowClear
                        style={{ width: 280 }}
                        prefix={<SearchOutlined />}
                        placeholder="搜索任务单/物料代码/物料描述/IC料号/软件名称"
                        value={burnKeywordInput}
                        onChange={(e) => setBurnKeywordInput(e.target.value)}
                        onPressEnter={handleBurnQuery}
                      />
                      <Button onClick={handleBurnQuery}>查询</Button>
                    </Space>
                  </Space>
                  <Table
                    rowKey="id"
                    columns={burnColumns}
                    dataSource={filteredBurnRows}
                    pagination={false}
                    scroll={{ x: 1700 }}
                    onRow={(record) => {
                      if (!isChangeEdit || !changedBurnRowIds.has(record.id)) {
                        return {};
                      }
                      return { style: { backgroundColor: '#fff7e6' } };
                    }}
                  />
                </>
              ),
            },
            {
              key: 'log',
              label: '操作日志',
              children: <Table rowKey="id" columns={logColumns} dataSource={logRows} pagination={false} scroll={{ x: 900 }} />,
            },
            {
              key: 'production',
              label: '生产计划表',
              children: (
                <>
                  <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Button icon={<DownloadOutlined />} onClick={() => message.success('导出成功（Mock）')}>
                      导出
                    </Button>
                    <Space>
                      <Input
                        allowClear
                        style={{ width: 280 }}
                        prefix={<SearchOutlined />}
                        placeholder="搜索周次/任务单/物料代码/名称"
                        value={productionKeywordInput}
                        onChange={(e) => setProductionKeywordInput(e.target.value)}
                        onPressEnter={handleProductionQuery}
                      />
                      <Button onClick={handleProductionQuery}>查询</Button>
                    </Space>
                  </Space>
                  <Table
                    rowKey="id"
                    columns={productionColumns}
                    dataSource={filteredProductionRows}
                    pagination={false}
                    scroll={{ x: 900 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="提交确认"
        open={submitModalOpen}
        width={860}
        onCancel={() => setSubmitModalOpen(false)}
        onOk={() => void handleConfirmSubmit()}
        okText="确认提交"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form<SubmitConfirmFormValues> form={submitForm} layout="vertical">
          <Form.Item
            label="发送人"
            name="senderIds"
            rules={[{ required: true, type: 'array', min: 1, message: '请至少选择一个发送人' }]}
            style={{ marginBottom: 12 }}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="支持输入人名模糊搜索，可多选"
              options={userOptions}
            />
          </Form.Item>

          <Form.Item label="抄送" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="ccIds" noStyle>
                <Select
                  mode="multiple"
                  showSearch
                  optionFilterProp="label"
                  style={{ flex: 1, minWidth: 0 }}
                  placeholder="支持输入人名模糊搜索，可多选"
                  options={userOptions}
                />
              </Form.Item>
              <Form.Item name="ccTeamId" noStyle>
                <Select
                  allowClear
                  style={{ width: 220 }}
                  placeholder="选择团队带出成员"
                  options={teamOptions}
                  onChange={(teamId) => appendUsersByTeam('ccIds', teamId)}
                />
              </Form.Item>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
