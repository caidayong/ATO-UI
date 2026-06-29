/**
 * @page 产测软件管理 / 计划管理 / 历史计划数据管理
 * @version V1.0.1-P4
 * @base ATO-V1.0.1-P4-计划管理-新增.md §2.12
 * @changes
 *   - V1.0.1-P4: REQ-039 历史板卡烧录计划表列表、筛选查询、导出、行编辑（Mock）
 *   - V1.0.1-P4: 筛选改为年份（默认当年）+ 周次 Wxx（默认上一周、非必填）
 *   - V1.0.1-P4: 年份下拉 Mock 近十年（对接后由库表返回）
 *   - V1.0.1-P4: 相同任务单+物料维度列合并（计划日期/周次/任务单/物料/数量 rowSpan）
 */

import { useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Form,
  Input,
  Pagination,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormModal, ListPageShell } from '@/components/layout';
import { FILTER_CONTROL_WIDTH, SPACING } from '@/constants/ui';
import { ROUTES } from '@/constants/routes';
import { mockHistoricalBurnPlanRows, mockHistoricalBurnPlanYears } from '@/mocks/data';
import type { HistoricalBurnPlanRow, PlanFactory } from '@/types';

const DEFAULT_PAGE_SIZE = 10;
const CURRENT_YEAR = new Date().getFullYear();

function extractWeekLabel(week: string): string {
  const match = week.match(/-W(\d+)$/i);
  return match ? `W${match[1]}` : week;
}

function buildWeekKey(year: number, weekLabel: string): string {
  const num = weekLabel.replace(/^W/i, '');
  return `${year}-W${num.padStart(2, '0')}`;
}

function resolveDefaultFilterWeek(rows: HistoricalBurnPlanRow[], year: number): string {
  const weekNums = rows
    .filter((row) => row.week.startsWith(String(year)))
    .map((row) => parseInt(row.week.split('-W')[1] ?? '0', 10))
    .filter((num) => num > 0);
  if (weekNums.length === 0) {
    return '';
  }
  const prev = Math.max(...weekNums) - 1;
  return prev >= 1 ? `W${String(prev).padStart(2, '0')}` : '';
}

function getFactoryDefaultWeek(factory: PlanFactory): string {
  return resolveDefaultFilterWeek(
    mockHistoricalBurnPlanRows.filter((row) => row.factory === factory),
    CURRENT_YEAR
  );
}

type EditFormValues = Pick<HistoricalBurnPlanRow, 'programName' | 'checksum' | 'softwarePath'>;

type ExportFormValues = {
  year: number;
  weeks: string[];
};

function getMaterialGroupKey(row: HistoricalBurnPlanRow): string {
  return `${row.taskNo}|${row.materialCode}|${row.materialName}`;
}

function buildMaterialGroupRowSpanMap(rows: HistoricalBurnPlanRow[]): Record<string, number> {
  const spanMap: Record<string, number> = {};
  let start = 0;
  while (start < rows.length) {
    const current = rows[start];
    const groupKey = getMaterialGroupKey(current);
    let end = start + 1;
    while (end < rows.length && getMaterialGroupKey(rows[end]) === groupKey) {
      end += 1;
    }
    const span = end - start;
    spanMap[current.id] = span;
    for (let i = start + 1; i < end; i += 1) {
      spanMap[rows[i].id] = 0;
    }
    start = end;
  }
  return spanMap;
}

const FACTORY_LABEL_MAP: Record<PlanFactory, string> = {
  CN: '国内工厂',
  VN: '越南工厂',
};

export function HistoricalPlanDataManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFactory = searchParams.get('factory');
  const [rows, setRows] = useState<HistoricalBurnPlanRow[]>(mockHistoricalBurnPlanRows);
  const [currentFactory, setCurrentFactory] = useState<PlanFactory>(initialFactory === 'VN' ? 'VN' : 'CN');
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);
  const [filterWeek, setFilterWeek] = useState(() =>
    getFactoryDefaultWeek(initialFactory === 'VN' ? 'VN' : 'CN')
  );
  const [keywordInput, setKeywordInput] = useState('');
  const [queryKeyword, setQueryKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm] = Form.useForm<EditFormValues>();
  const [exportForm] = Form.useForm<ExportFormValues>();
  const exportYear = Form.useWatch('year', exportForm) ?? CURRENT_YEAR;

  const factoryRows = useMemo(
    () => rows.filter((item) => item.factory === currentFactory),
    [currentFactory, rows]
  );

  const weekOptions = useMemo(() => {
    const weeks = Array.from(
      new Set(
        factoryRows
          .filter((item) => item.week.startsWith(String(filterYear)))
          .map((item) => extractWeekLabel(item.week))
      )
    ).sort((a, b) => parseInt(b.slice(1), 10) - parseInt(a.slice(1), 10));
    return weeks.map((week) => ({ label: week, value: week }));
  }, [factoryRows, filterYear]);

  const yearOptions = useMemo(
    () => mockHistoricalBurnPlanYears.map((year) => ({ label: `${year} 年`, value: year })),
    []
  );

  const exportWeekOptions = useMemo(() => {
    return factoryRows
      .filter((item) => item.week.startsWith(String(exportYear)))
      .map((item) => extractWeekLabel(item.week))
      .filter((week, index, arr) => arr.indexOf(week) === index)
      .sort((a, b) => parseInt(b.slice(1), 10) - parseInt(a.slice(1), 10))
      .map((week) => ({ label: week, value: week }));
  }, [exportYear, factoryRows]);

  const filteredRows = useMemo(() => {
    const keyword = queryKeyword.trim().toLowerCase();
    return factoryRows.filter((row) => {
      const matchYear = row.week.startsWith(String(filterYear));
      const matchWeek = !filterWeek || row.week === buildWeekKey(filterYear, filterWeek);
      const matchKeyword =
        !keyword ||
        [row.taskNo, row.materialCode, row.icPartNo, row.icModel].some((field) =>
          field.toLowerCase().includes(keyword)
        );
      return matchYear && matchWeek && matchKeyword;
    });
  }, [factoryRows, filterWeek, filterYear, queryKeyword]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const materialGroupRowSpanMap = useMemo(
    () => buildMaterialGroupRowSpanMap(pagedRows),
    [pagedRows]
  );

  const plansPathWithFactory =
    currentFactory === 'VN' ? `${ROUTES.PTSW_PLANS}?factory=VN` : `${ROUTES.PTSW_PLANS}?factory=CN`;

  const handleQuery = () => {
    setQueryKeyword(keywordInput);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterYear(CURRENT_YEAR);
    setFilterWeek(getFactoryDefaultWeek(currentFactory));
    setKeywordInput('');
    setQueryKeyword('');
    setPage(1);
  };

  const handleOpenEdit = (record: HistoricalBurnPlanRow) => {
    setEditingId(record.id);
    editForm.setFieldsValue({
      programName: record.programName,
      checksum: record.checksum,
      softwarePath: record.softwarePath,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    const values = await editForm.validateFields();
    if (!editingId) {
      return;
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setRows((prev) =>
      prev.map((item) =>
        item.id === editingId
          ? {
              ...item,
              ...values,
              updatedAt: now,
            }
          : item
      )
    );
    setEditModalOpen(false);
    message.success('保存成功');
  };

  const handleExport = async () => {
    const values = await exportForm.validateFields();
    setExportModalOpen(false);
    message.success(
      `导出成功（Mock）：${values.year} 年 ${values.weeks.length} 个周次，共 ${factoryRows.filter((row) => values.weeks.some((week) => row.week === buildWeekKey(values.year, week))).length} 条`
    );
  };

  const columns: TableProps<HistoricalBurnPlanRow>['columns'] = [
    {
      title: '计划日期',
      dataIndex: 'planDate',
      key: 'planDate',
      width: 120,
      onCell: (record) => ({ rowSpan: materialGroupRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '周次',
      dataIndex: 'week',
      key: 'week',
      width: 110,
      onCell: (record) => ({ rowSpan: materialGroupRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '生产任务单编号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 150,
      onCell: (record) => ({ rowSpan: materialGroupRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '物料代码',
      dataIndex: 'materialCode',
      key: 'materialCode',
      width: 150,
      onCell: (record) => ({ rowSpan: materialGroupRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '物料名称',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 200,
      ellipsis: true,
      onCell: (record) => ({ rowSpan: materialGroupRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      onCell: (record) => ({ rowSpan: materialGroupRowSpanMap[record.id] ?? 1 }),
    },
    { title: 'IC料号', dataIndex: 'icPartNo', key: 'icPartNo', width: 130 },
    { title: 'IC型号', dataIndex: 'icModel', key: 'icModel', width: 150, ellipsis: true },
    { title: '程序名称', dataIndex: 'programName', key: 'programName', width: 200, ellipsis: true },
    { title: 'checksum值', dataIndex: 'checksum', key: 'checksum', width: 160, ellipsis: true },
    { title: '是否烧录', dataIndex: 'shouldBurn', key: 'shouldBurn', width: 90 },
    {
      title: '软件存放路径',
      dataIndex: 'softwarePath',
      key: 'softwarePath',
      width: 220,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: SPACING.md }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(plansPathWithFactory)}>
          返回计划列表
        </Button>
        <Typography.Text type="secondary">
          默认展示当年上一周（{filterYear}
          {filterWeek ? `-${filterWeek}` : ''}）历史烧录数据；周次筛选非必填
        </Typography.Text>
      </Space>

      <ListPageShell
        tabs={{
          activeKey: currentFactory,
          onChange: (factoryKey) => {
            const nextFactory = factoryKey as PlanFactory;
            setCurrentFactory(nextFactory);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('factory', nextFactory);
              return next;
            });
            setFilterYear(CURRENT_YEAR);
            setFilterWeek(getFactoryDefaultWeek(nextFactory));
            setKeywordInput('');
            setQueryKeyword('');
            setPage(1);
          },
          items: [
            { key: 'CN', label: '国内工厂' },
            { key: 'VN', label: '越南工厂' },
          ],
        }}
        toolbarLeft={
          <Button icon={<DownloadOutlined />} onClick={() => {
            const defaultWeek = getFactoryDefaultWeek(currentFactory);
            exportForm.setFieldsValue({ year: filterYear, weeks: defaultWeek ? [defaultWeek] : [] });
            setExportModalOpen(true);
          }}>
            导出 Excel
          </Button>
        }
        toolbarRight={
          <>
            <Select
              style={{ width: FILTER_CONTROL_WIDTH.select + 20 }}
              placeholder="年份"
              value={filterYear}
              options={yearOptions}
              onChange={(value) => {
                setFilterYear(value);
                setFilterWeek(resolveDefaultFilterWeek(factoryRows, value));
                setPage(1);
              }}
            />
            <Select
              allowClear
              style={{ width: FILTER_CONTROL_WIDTH.select }}
              placeholder="周次"
              value={filterWeek || undefined}
              options={weekOptions}
              onChange={(value) => {
                setFilterWeek(value ?? '');
                setPage(1);
              }}
            />
            <Input
              allowClear
              style={{ width: FILTER_CONTROL_WIDTH.searchWide }}
              prefix={<SearchOutlined />}
              placeholder="任务单/物料代码/IC料号/IC型号"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onPressEnter={handleQuery}
            />
            <Button onClick={handleQuery}>查询</Button>
            <Button onClick={handleResetFilters}>重置</Button>
          </>
        }
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: SPACING.sm }}>
            <Typography.Text type="secondary">共 {filteredRows.length} 条</Typography.Text>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={filteredRows.length}
              showSizeChanger
              pageSizeOptions={[10, 20, 50]}
              onChange={(nextPage, nextPageSize) => {
                setPage(nextPage);
                if (nextPageSize !== pageSize) {
                  setPageSize(nextPageSize);
                }
              }}
            />
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={pagedRows}
          pagination={false}
          scroll={{ x: 1900 }}
          locale={{
            emptyText: <Empty description={`${FACTORY_LABEL_MAP[currentFactory]}暂无历史数据`} />,
          }}
        />
      </ListPageShell>

      <FormModal
        title="编辑历史烧录数据"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => void handleSaveEdit()}
        okText="保存"
      >
        <Form<EditFormValues> form={editForm} layout="vertical">
          <Form.Item
            name="programName"
            label="程序名称"
            rules={[{ required: true, message: '请输入程序名称' }]}
          >
            <Input placeholder="请输入程序名称" />
          </Form.Item>
          <Form.Item name="checksum" label="checksum值" rules={[{ required: true, message: '请输入 checksum 值' }]}>
            <Input placeholder="请输入 checksum 值" />
          </Form.Item>
          <Form.Item
            name="softwarePath"
            label="软件存放路径"
            rules={[{ required: true, message: '请输入软件存放路径' }]}
          >
            <Input placeholder="例如 \\192.168.1.30\firmware\..." />
          </Form.Item>
        </Form>
      </FormModal>

      <FormModal
        title="导出 Excel"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        onOk={() => void handleExport()}
        okText="确认导出"
      >
        <Form<ExportFormValues> form={exportForm} layout="vertical" initialValues={{ year: CURRENT_YEAR, weeks: [] }}>
          <Form.Item name="year" label="年份" rules={[{ required: true, message: '请选择年份' }]}>
            <Select options={yearOptions} placeholder="选择年份" />
          </Form.Item>
          <Form.Item
            name="weeks"
            label="周次（可多选）"
            rules={[{ required: true, type: 'array', min: 1, message: '请至少选择一个周次' }]}
          >
            <Select mode="multiple" options={exportWeekOptions} placeholder="选择导出周次，支持多选" />
          </Form.Item>
          <Typography.Text type="secondary">支持批量导出多周或整年数据（Mock 仅提示成功）</Typography.Text>
        </Form>
      </FormModal>
    </>
  );
}
