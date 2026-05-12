/**
 * @page 市场缺陷列表（Tab）
 * @version V1.0.1-P5
 * @base docs/prd/V1.0.1-P5/ATO_V1.0.1-P5-页面需求与交互规格.md §3.3 Tab1
 * @changes
 *   - V1.0.1-P5: 操作列刷新图标居中，悬停提示「刷新」
 *   - V1.0.1-P5: 新增「缺陷归属团队」列（产品线后，只读，支持筛选）
 *   - V1.0.1-P5: 筛选/搜索/Mock 表/RDMS Mock 弹层；跳转报表写 sessionStorage
 *   - V1.0.1-P5 验收: 工具栏含「刷新→导出→报表」等；列设置入口移至表头「操作」后
 *   - V1.0.1-P5 验收: 列表列与冻结列（左三列 + 操作列固定，横向滚动）
 *   - V1.0.1-P5: Mock 枚举（缺陷来源/类型/团队/产品线/责任归属/流出原因）与筛选下拉对齐
 *   - V1.0.1-P5: 「缺陷类型」列移至「实际归属团队」之后
 *   - V1.0.1-P5: 「是否有效问题」至「自动化未发现原因」双击编辑；优化措施为输入，其余为下拉
 *   - 验收: 缺陷ID～产品线只读底色；可编辑区分两段浅色区（至完成进度 / 至自动化未发现原因）；表头筛选三列；操作栏去掉「自动化复盘分析」
 *   - 「完成进度」为 0～100 百分比，进度条展示，双击后数字输入 + 确定/取消
 *   - 列表 UI：短内容列收窄；表头两行居中 + 加高 padding；完成进度列收窄 + Tooltip 百分比
 *   - 顶部：左为年/季/月，右为报表/保存；次行左为刷新/导出（需勾选行后可用）+ 右为搜索；表前勾选列；分页区 showTotal 数据统计
 *   - 季/月筛选与「创建缺陷分析报告」共用 `getMarketDefectDataRangeMonthOptionsByQuarter`（constants）
 */
import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Row,
  Col,
  Progress,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import {
  BarChartOutlined,
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { MarketDefect, MarketDefectListSnapshot } from '@/types';
import { mockMarketDefects } from '@/mocks/data';
import { ROUTES } from '@/constants/routes';
import {
  MARKET_DEFECT_ACTUAL_TEAM_OPTIONS,
  MARKET_DEFECT_AUTO_MISS_REASON_OPTIONS,
  MARKET_DEFECT_DEFECT_OWNER_TEAM_OPTIONS,
  MARKET_DEFECT_LEAKAGE_REASON_OPTIONS,
  MARKET_DEFECT_MAIN_RESP_ATTRIBUTION_OPTIONS,
  MARKET_DEFECT_OWNER_PERSON_OPTIONS,
  MARKET_DEFECT_TYPE_OPTIONS,
  MARKET_DEFECT_UNCOVERED_REASON_OPTIONS,
  MARKET_DEFECT_YES_NO_OPTIONS,
  getMarketDefectDataRangeMonthOptionsByQuarter,
  selectOptions,
  selectWithAll,
} from '@/constants/marketDefectMockOptions';
import { saveMarketDefectListSnapshot } from '@/utils/marketDefectListSnapshot';

const VALID_OPTS = ['全部', '是', '否'];

const TIME_YEAR_SELECT_OPTIONS = ['全部', '2024', '2025', '2026', '2027', '2028'].map((v) =>
  v === '全部' ? { value: v, label: v } : { value: v, label: `${v}年` },
);
const TIME_QUARTER_SELECT_OPTIONS = ['全部', 'Q1', 'Q2', 'Q3', 'Q4'].map((v) => ({ value: v, label: v }));

function defaultTimeFilterState() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return {
    filterYear: String(y),
    filterQuarter: `Q${Math.ceil(m / 3)}`,
    filterMonth: `${m}月`,
  };
}

function parseCreatedYearMonth(createdAt: string): { y: number; m: number } | null {
  const match = createdAt.trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) };
}

function quarterNumFromMonth(month1to12: number): number {
  return Math.ceil(month1to12 / 3);
}

function rowMatchesTimeFilter(createdAt: string, year: string, quarter: string, month: string): boolean {
  const parsed = parseCreatedYearMonth(createdAt);
  if (!parsed) return true;
  const { y, m } = parsed;
  if (year !== '全部' && y !== Number(year)) return false;
  if (quarter !== '全部' && quarter !== `Q${quarterNumFromMonth(m)}`) return false;
  if (month !== '全部' && m !== Number(month.replace('月', ''))) return false;
  return true;
}

/** 表头列内筛选 */
function renderEnumColumnFilter(config: {
  value: string;
  options: { label: string; value: string }[];
  onPick: (v: string) => void;
}) {
  return (props: FilterDropdownProps) => {
    const { confirm, clearFilters } = props;
    return (
      <div style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
        <Select
          style={{ width: 168 }}
          value={config.value}
          options={config.options}
          onChange={(v) => {
            config.onPick(String(v));
            confirm({ closeDropdown: true });
          }}
        />
        <Button
          type="link"
          size="small"
          style={{ padding: 0, marginTop: 4, height: 'auto' }}
          onClick={() => {
            clearFilters?.();
            config.onPick('全部');
            confirm({ closeDropdown: true });
          }}
        >
          重置
        </Button>
      </div>
    );
  };
}

/** 缺陷ID～产品线：只读区底色 */
const BG_READONLY_HEADER = '#f0f0f0';
const BG_READONLY_CELL = '#fafafa';
/** 可编辑第一段：是否有效问题～完成进度 */
const BG_EDIT1_HEADER = '#e6f4ff';
const BG_EDIT1_CELL = '#f0f7ff';
/** 可编辑第二段：自动化是否覆盖～自动化未发现原因 */
const BG_EDIT2_HEADER = '#f4ffe8';
const BG_EDIT2_CELL = '#f9fff2';

/** 列表横向总宽约度，用于固定列 + 滚动（与各列 width 之和大致对齐） */
const TABLE_SCROLL_X = 2450;

/** 表头：允许换行、加高，与其它列表风格统一 */
function marketDefectThProps(bg: string) {
  return {
    style: {
      background: bg,
      whiteSpace: 'normal' as const,
      verticalAlign: 'middle' as const,
      padding: '10px 6px',
      lineHeight: 1.25,
      textAlign: 'center' as const,
    },
  };
}

/** 表头两行文案（居中） */
function thTwoLines(a: string, b: string) {
  return (
    <span style={{ display: 'inline-block', maxWidth: '100%' }}>
      {a}
      <br />
      {b}
    </span>
  );
}

function textOrDash(v: string | undefined): string {
  const t = v?.trim();
  return t ? t : '—';
}

/** 从「是否有效问题」起可双击编辑的字段（至「自动化未发现原因」） */
type EditableField =
  | 'validIssue'
  | 'actualTeam'
  | 'defectType'
  | 'mainResponsibilityAttribution'
  | 'mainResponsiblePerson'
  | 'leakageReason'
  | 'improvementMeasure'
  | 'improvementOwner'
  | 'completionProgress'
  | 'autoCovered'
  | 'canCover'
  | 'uncoveredReason'
  | 'autoMissReason';

type EditCellState = { id: string; field: EditableField } | null;

function clampCompletionProgress(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function InlineProgressEditor({
  value,
  onSave,
  onCloseWithoutSave,
}: {
  value: number;
  onSave: (n: number) => void;
  onCloseWithoutSave: () => void;
}) {
  const [draft, setDraft] = useState(() => clampCompletionProgress(value));
  useEffect(() => {
    setDraft(clampCompletionProgress(value));
  }, [value]);

  const commit = () => {
    onSave(clampCompletionProgress(draft));
  };

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ minWidth: 96 }}>
      <Progress
        percent={clampCompletionProgress(draft)}
        size="small"
        status={clampCompletionProgress(draft) >= 100 ? 'success' : 'active'}
      />
      <InputNumber
        size="small"
        min={0}
        max={100}
        value={draft}
        onChange={(v) => setDraft(clampCompletionProgress(typeof v === 'number' ? v : 0))}
        addonAfter="%"
        style={{ width: '100%', marginTop: 6 }}
        autoFocus
        onPressEnter={commit}
      />
      <Space size={4} style={{ marginTop: 6 }}>
        <Button type="primary" size="small" onClick={commit}>
          确定
        </Button>
        <Button size="small" onClick={onCloseWithoutSave}>
          取消
        </Button>
      </Space>
    </div>
  );
}

function InlineSelectEditor({
  value,
  options,
  onSave,
  onCloseWithoutSave,
}: {
  value: string;
  options: { label: string; value: string }[];
  onSave: (v: string) => void;
  onCloseWithoutSave: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Select
      size="small"
      style={{ width: '100%' }}
      value={value}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) onCloseWithoutSave();
      }}
      options={options}
      showSearch
      optionFilterProp="label"
      autoFocus
      listHeight={280}
      onChange={(v) => {
        onSave(String(v));
      }}
    />
  );
}

export function MarketDefectListTab() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MarketDefect[]>(() => mockMarketDefects.map((r) => ({ ...r })));
  const [editCell, setEditCell] = useState<EditCellState>(null);

  const initTime = useMemo(() => defaultTimeFilterState(), []);
  const [filterYear, setFilterYear] = useState(initTime.filterYear);
  const [filterQuarter, setFilterQuarter] = useState(initTime.filterQuarter);
  const [filterMonth, setFilterMonth] = useState(initTime.filterMonth);

  /** 根据季度动态生成的月份选项 */
  const monthOptions = useMemo(() => getMarketDefectDataRangeMonthOptionsByQuarter(filterQuarter), [filterQuarter]);

  /** 季度变化时，若当前月份不在新季度范围内则重置为「全部」 */
  useEffect(() => {
    const validMonths = monthOptions.map((o) => o.value);
    if (!validMonths.includes(filterMonth)) {
      setFilterMonth('全部');
    }
  }, [filterQuarter, monthOptions, filterMonth]);

  useEffect(() => {
    if (!editCell) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditCell(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editCell]);

  const [valid, setValid] = useState('全部');
  const [actualTeam, setActualTeam] = useState('全部');
  const [mainRespAttr, setMainRespAttr] = useState('全部');
  const [defectOwnerTeam, setDefectOwnerTeam] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rdmsOpen, setRdmsOpen] = useState(false);
  const [rdmsId, setRdmsId] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const hasRowSelection = selectedRowKeys.length > 0;

  const saveField = useCallback((id: string, field: EditableField, value: string | number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === 'completionProgress') {
          const n = typeof value === 'number' ? value : Number(value);
          return { ...r, completionProgress: clampCompletionProgress(n) };
        }
        return { ...r, [field]: String(value) } as MarketDefect;
      }),
    );
    setEditCell(null);
    message.success('已保存（Mock）');
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!rowMatchesTimeFilter(r.createdAt, filterYear, filterQuarter, filterMonth)) return false;
      if (valid !== '全部' && r.validIssue !== valid) return false;
      if (actualTeam !== '全部' && r.actualTeam !== actualTeam) return false;
      if (mainRespAttr !== '全部' && r.mainResponsibilityAttribution !== mainRespAttr) return false;
      if (defectOwnerTeam !== '全部' && r.defectOwnerTeam !== defectOwnerTeam) return false;
      if (searchText.trim()) {
        const k = searchText.trim().toLowerCase();
        const blob = [
          r.id,
          r.defectSource,
          r.title,
          r.defectType,
          r.productLine,
          r.defectOwnerTeam,
          r.validIssue,
          r.actualTeam,
          r.mainResponsibilityAttribution,
          r.mainResponsiblePerson,
          r.leakageReason,
          r.improvementMeasure,
          r.improvementOwner,
          String(r.completionProgress),
          r.autoCovered,
          r.canCover,
          r.uncoveredReason,
          r.autoMissReason,
          r.createdAt,
        ]
          .join(' ')
          .toLowerCase();
        if (!blob.includes(k)) return false;
      }
      return true;
    });
  }, [rows, filterYear, filterQuarter, filterMonth, valid, actualTeam, mainRespAttr, defectOwnerTeam, searchText]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const persistSnapshot = useCallback((): MarketDefectListSnapshot => {
    const snap: MarketDefectListSnapshot = {
      filters: {
        year: filterYear,
        quarter: filterQuarter,
        month: filterMonth,
        valid,
        actualTeam,
        mainResponsibilityAttribution: mainRespAttr,
        defectOwnerTeam,
      },
      search: { text: searchText.trim() },
      page,
      pageSize,
      updatedAt: new Date().toISOString(),
    };
    saveMarketDefectListSnapshot(snap);
    return snap;
  }, [
    filterYear,
    filterQuarter,
    filterMonth,
    valid,
    actualTeam,
    mainRespAttr,
    defectOwnerTeam,
    searchText,
    page,
    pageSize,
  ]);

  const goReport = () => {
    persistSnapshot();
    navigate(ROUTES.TOOLS_MARKET_DEFECTS_REPORT);
  };

  const globalRefresh = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      message.success(`同步完成（Mock），涉及 ${selectedRowKeys.length} 条已选`);
    }, 600);
  };

  const handleToolbarSave = useCallback(() => {
    message.success('列表已保存（Mock）');
  }, []);

  const isEditing = (record: MarketDefect, field: EditableField) =>
    editCell?.id === record.id && editCell?.field === field;

  const dbl = (field: EditableField) => (record: MarketDefect) => ({
    onDoubleClick: () => setEditCell({ id: record.id, field }),
  });

  const columns: ColumnsType<MarketDefect> = useMemo(
    () => [
      {
        title: thTwoLines('缺陷', 'ID'),
        dataIndex: 'id',
        width: 108,
        fixed: 'left',
        onHeaderCell: () => marketDefectThProps(BG_READONLY_HEADER),
        onCell: () => ({ style: { background: BG_READONLY_CELL } }),
        render: (id: string) => (
          <Typography.Link
            onClick={() => {
              setRdmsId(id);
              setRdmsOpen(true);
            }}
          >
            {id}
          </Typography.Link>
        ),
      },
      {
        title: thTwoLines('缺陷', '来源'),
        dataIndex: 'defectSource',
        width: 88,
        fixed: 'left',
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_READONLY_HEADER),
        onCell: () => ({ style: { background: BG_READONLY_CELL } }),
        render: (v: string) => textOrDash(v),
      },
      {
        title: thTwoLines('缺陷', '标题'),
        dataIndex: 'title',
        width: 200,
        fixed: 'left',
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_READONLY_HEADER),
        onCell: () => ({ style: { background: BG_READONLY_CELL } }),
      },
      {
        title: thTwoLines('创建', '日期'),
        dataIndex: 'createdAt',
        width: 104,
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_READONLY_HEADER),
        onCell: () => ({ style: { background: BG_READONLY_CELL } }),
      },
      {
        title: thTwoLines('产品', '线'),
        dataIndex: 'productLine',
        width: 96,
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_READONLY_HEADER),
        onCell: () => ({ style: { background: BG_READONLY_CELL } }),
      },
      {
        title: thTwoLines('缺陷归属', '团队'),
        dataIndex: 'defectOwnerTeam',
        width: 140,
        ellipsis: true,
        filterDropdown: renderEnumColumnFilter({
          value: defectOwnerTeam,
          options: selectWithAll([...MARKET_DEFECT_DEFECT_OWNER_TEAM_OPTIONS]),
          onPick: (v) => {
            setDefectOwnerTeam(v);
            setPage(1);
          },
        }),
        filterIcon: <FilterOutlined style={{ color: defectOwnerTeam !== '全部' ? '#1677ff' : undefined }} />,
        filteredValue: defectOwnerTeam === '全部' ? undefined : [defectOwnerTeam],
        onHeaderCell: () => marketDefectThProps(BG_READONLY_HEADER),
        onCell: () => ({ style: { background: BG_READONLY_CELL } }),
        render: (v: string) => textOrDash(v),
      },
      {
        title: thTwoLines('是否有效', '问题'),
        dataIndex: 'validIssue',
        width: 82,
        filterDropdown: renderEnumColumnFilter({
          value: valid,
          options: VALID_OPTS.map((v) => ({ value: v, label: v })),
          onPick: (v) => {
            setValid(v);
            setPage(1);
          },
        }),
        filterIcon: <FilterOutlined style={{ color: valid !== '全部' ? '#1677ff' : undefined }} />,
        filteredValue: valid === '全部' ? undefined : [valid],
        onHeaderCell: () => marketDefectThProps(BG_EDIT1_HEADER),
        onCell: (record) => ({
          ...dbl('validIssue')(record),
          style: { background: BG_EDIT1_CELL, textAlign: 'center' as const },
        }),
        render: (_, record) =>
          isEditing(record, 'validIssue') ? (
            <InlineSelectEditor
              value={record.validIssue}
              options={selectOptions([...MARKET_DEFECT_YES_NO_OPTIONS])}
              onSave={(v) => saveField(record.id, 'validIssue', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.validIssue)
          ),
      },
      {
        title: thTwoLines('实际归属', '团队'),
        dataIndex: 'actualTeam',
        width: 126,
        ellipsis: true,
        filterDropdown: renderEnumColumnFilter({
          value: actualTeam,
          options: selectWithAll([...MARKET_DEFECT_ACTUAL_TEAM_OPTIONS]),
          onPick: (v) => {
            setActualTeam(v);
            setPage(1);
          },
        }),
        filterIcon: <FilterOutlined style={{ color: actualTeam !== '全部' ? '#1677ff' : undefined }} />,
        filteredValue: actualTeam === '全部' ? undefined : [actualTeam],
        onHeaderCell: () => marketDefectThProps(BG_EDIT1_HEADER),
        onCell: (record) => ({ ...dbl('actualTeam')(record), style: { background: BG_EDIT1_CELL } }),
        render: (_, record) =>
          isEditing(record, 'actualTeam') ? (
            <InlineSelectEditor
              value={record.actualTeam}
              options={selectOptions([...MARKET_DEFECT_ACTUAL_TEAM_OPTIONS])}
              onSave={(v) => saveField(record.id, 'actualTeam', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.actualTeam)
          ),
      },
      {
        title: thTwoLines('缺陷', '类型'),
        dataIndex: 'defectType',
        width: 96,
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_EDIT1_HEADER),
        onCell: (record) => ({ ...dbl('defectType')(record), style: { background: BG_EDIT1_CELL } }),
        render: (_, record) =>
          isEditing(record, 'defectType') ? (
            <InlineSelectEditor
              value={record.defectType}
              options={selectOptions([...MARKET_DEFECT_TYPE_OPTIONS])}
              onSave={(v) => saveField(record.id, 'defectType', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.defectType)
          ),
      },
      {
        title: thTwoLines('主要责任', '归属'),
        dataIndex: 'mainResponsibilityAttribution',
        width: 84,
        ellipsis: true,
        filterDropdown: renderEnumColumnFilter({
          value: mainRespAttr,
          options: selectWithAll([...MARKET_DEFECT_MAIN_RESP_ATTRIBUTION_OPTIONS]),
          onPick: (v) => {
            setMainRespAttr(v);
            setPage(1);
          },
        }),
        filterIcon: <FilterOutlined style={{ color: mainRespAttr !== '全部' ? '#1677ff' : undefined }} />,
        filteredValue: mainRespAttr === '全部' ? undefined : [mainRespAttr],
        onHeaderCell: () => marketDefectThProps(BG_EDIT1_HEADER),
        onCell: (record) => ({
          ...dbl('mainResponsibilityAttribution')(record),
          style: { background: BG_EDIT1_CELL, textAlign: 'center' as const },
        }),
        render: (_, record) =>
          isEditing(record, 'mainResponsibilityAttribution') ? (
            <InlineSelectEditor
              value={record.mainResponsibilityAttribution}
              options={selectOptions([...MARKET_DEFECT_MAIN_RESP_ATTRIBUTION_OPTIONS])}
              onSave={(v) => saveField(record.id, 'mainResponsibilityAttribution', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.mainResponsibilityAttribution)
          ),
      },
      {
        title: thTwoLines('主要', '责任人'),
        dataIndex: 'mainResponsiblePerson',
        width: 86,
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_EDIT1_HEADER),
        onCell: (record) => ({
          ...dbl('mainResponsiblePerson')(record),
          style: { background: BG_EDIT1_CELL },
        }),
        render: (_, record) =>
          isEditing(record, 'mainResponsiblePerson') ? (
            <InlineSelectEditor
              value={record.mainResponsiblePerson}
              options={selectOptions([...MARKET_DEFECT_OWNER_PERSON_OPTIONS])}
              onSave={(v) => saveField(record.id, 'mainResponsiblePerson', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.mainResponsiblePerson)
          ),
      },
      {
        title: thTwoLines('流出', '原因'),
        dataIndex: 'leakageReason',
        width: 160,
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_EDIT1_HEADER),
        onCell: (record) => ({ ...dbl('leakageReason')(record), style: { background: BG_EDIT1_CELL } }),
        render: (_, record) =>
          isEditing(record, 'leakageReason') ? (
            <InlineSelectEditor
              value={record.leakageReason}
              options={selectOptions([...MARKET_DEFECT_LEAKAGE_REASON_OPTIONS])}
              onSave={(v) => saveField(record.id, 'leakageReason', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.leakageReason)
          ),
      },
      {
        title: thTwoLines('优化', '措施'),
        dataIndex: 'improvementMeasure',
        width: 200,
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_EDIT1_HEADER),
        onCell: (record) => ({
          ...dbl('improvementMeasure')(record),
          style: { background: BG_EDIT1_CELL },
        }),
        render: (_, record) =>
          isEditing(record, 'improvementMeasure') ? (
            <Input
              key={`${record.id}-improvementMeasure`}
              size="small"
              autoFocus
              defaultValue={record.improvementMeasure}
              onBlur={(e) => {
                saveField(record.id, 'improvementMeasure', e.target.value);
              }}
              onPressEnter={(e) => {
                (e.target as HTMLInputElement).blur();
              }}
            />
          ) : (
            textOrDash(record.improvementMeasure)
          ),
      },
      {
        title: thTwoLines('优化', '责任人'),
        dataIndex: 'improvementOwner',
        width: 88,
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_EDIT1_HEADER),
        onCell: (record) => ({ ...dbl('improvementOwner')(record), style: { background: BG_EDIT1_CELL } }),
        render: (_, record) =>
          isEditing(record, 'improvementOwner') ? (
            <InlineSelectEditor
              value={record.improvementOwner}
              options={selectOptions([...MARKET_DEFECT_OWNER_PERSON_OPTIONS])}
              onSave={(v) => saveField(record.id, 'improvementOwner', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.improvementOwner)
          ),
      },
      {
        title: thTwoLines('完成', '进度'),
        dataIndex: 'completionProgress',
        width: 100,
        onHeaderCell: () => marketDefectThProps(BG_EDIT1_HEADER),
        onCell: (record) => ({
          ...dbl('completionProgress')(record),
          style: { background: BG_EDIT1_CELL, textAlign: 'center' as const },
        }),
        render: (_, record) =>
          isEditing(record, 'completionProgress') ? (
            <InlineProgressEditor
              value={record.completionProgress}
              onSave={(n) => saveField(record.id, 'completionProgress', n)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            <Tooltip title={`${clampCompletionProgress(record.completionProgress)}%`}>
              <Progress
                percent={clampCompletionProgress(record.completionProgress)}
                size="small"
                showInfo={false}
                strokeWidth={6}
                style={{ margin: 0 }}
                status={record.completionProgress >= 100 ? 'success' : 'active'}
              />
            </Tooltip>
          ),
      },
      {
        title: thTwoLines('自动化', '是否覆盖'),
        dataIndex: 'autoCovered',
        width: 92,
        onHeaderCell: () => marketDefectThProps(BG_EDIT2_HEADER),
        onCell: (record) => ({
          ...dbl('autoCovered')(record),
          style: { background: BG_EDIT2_CELL, textAlign: 'center' as const },
        }),
        render: (_, record) =>
          isEditing(record, 'autoCovered') ? (
            <InlineSelectEditor
              value={record.autoCovered}
              options={selectOptions([...MARKET_DEFECT_YES_NO_OPTIONS])}
              onSave={(v) => saveField(record.id, 'autoCovered', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.autoCovered)
          ),
      },
      {
        title: thTwoLines('是否', '可覆盖'),
        dataIndex: 'canCover',
        width: 80,
        onHeaderCell: () => marketDefectThProps(BG_EDIT2_HEADER),
        onCell: (record) => ({
          ...dbl('canCover')(record),
          style: { background: BG_EDIT2_CELL, textAlign: 'center' as const },
        }),
        render: (_, record) =>
          isEditing(record, 'canCover') ? (
            <InlineSelectEditor
              value={record.canCover}
              options={selectOptions([...MARKET_DEFECT_YES_NO_OPTIONS])}
              onSave={(v) => saveField(record.id, 'canCover', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.canCover)
          ),
      },
      {
        title: thTwoLines('不可覆盖', '原因'),
        dataIndex: 'uncoveredReason',
        width: 158,
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_EDIT2_HEADER),
        onCell: (record) => ({ ...dbl('uncoveredReason')(record), style: { background: BG_EDIT2_CELL } }),
        render: (_, record) =>
          isEditing(record, 'uncoveredReason') ? (
            <InlineSelectEditor
              value={record.uncoveredReason}
              options={selectOptions([...MARKET_DEFECT_UNCOVERED_REASON_OPTIONS])}
              onSave={(v) => saveField(record.id, 'uncoveredReason', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.uncoveredReason)
          ),
      },
      {
        title: thTwoLines('自动化', '未发现原因'),
        dataIndex: 'autoMissReason',
        width: 172,
        ellipsis: true,
        onHeaderCell: () => marketDefectThProps(BG_EDIT2_HEADER),
        onCell: (record) => ({ ...dbl('autoMissReason')(record), style: { background: BG_EDIT2_CELL } }),
        render: (_, record) =>
          isEditing(record, 'autoMissReason') ? (
            <InlineSelectEditor
              value={record.autoMissReason}
              options={selectOptions([...MARKET_DEFECT_AUTO_MISS_REASON_OPTIONS])}
              onSave={(v) => saveField(record.id, 'autoMissReason', v)}
              onCloseWithoutSave={() => setEditCell(null)}
            />
          ) : (
            textOrDash(record.autoMissReason)
          ),
      },
      {
        title: (
          <Space size={4}>
            <span>操作</span>
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              aria-label="列设置"
              onClick={() => setSettingsOpen(true)}
            />
          </Space>
        ),
        key: 'op',
        width: 112,
        fixed: 'right',
        align: 'center',
        onHeaderCell: () => marketDefectThProps('#ffffff'),
        render: (_, record) => (
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            title="刷新"
            onClick={() => message.success(`已刷新 ${record.id}（Mock）`)}
          />
        ),
      },
    ],
    [editCell, saveField, valid, actualTeam, mainRespAttr, defectOwnerTeam],
  );

  return (
    <Card size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Row align="middle" gutter={[12, 8]} wrap style={{ width: '100%' }}>
          <Col flex="auto">
            <Space wrap align="center" size={[8, 8]}>
              <Typography.Text type="secondary">时间</Typography.Text>
              <Space size={4} align="center">
                <Typography.Text type="secondary">年</Typography.Text>
                <Select
                  value={filterYear}
                  onChange={(v) => {
                    setFilterYear(v);
                    setPage(1);
                  }}
                  style={{ width: 108 }}
                  options={TIME_YEAR_SELECT_OPTIONS}
                />
              </Space>
              <Space size={4} align="center">
                <Typography.Text type="secondary">季度</Typography.Text>
                <Select
                  value={filterQuarter}
                  onChange={(v) => {
                    setFilterQuarter(v);
                    setPage(1);
                  }}
                  style={{ width: 88 }}
                  options={TIME_QUARTER_SELECT_OPTIONS}
                />
              </Space>
              <Space size={4} align="center">
                <Typography.Text type="secondary">月</Typography.Text>
                <Select
                  value={filterMonth}
                  onChange={(v) => {
                    setFilterMonth(v);
                    setPage(1);
                  }}
                  style={{ width: 88 }}
                  options={monthOptions}
                />
              </Space>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Button type="primary" icon={<BarChartOutlined />} onClick={goReport}>
                报表
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleToolbarSave}>
                保存
              </Button>
            </Space>
          </Col>
        </Row>

        <Row align="middle" gutter={[12, 8]} wrap style={{ width: '100%' }}>
          <Col>
            <Space wrap>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                disabled={!hasRowSelection}
                onClick={() => setExportOpen(true)}
              >
                导出
              </Button>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                disabled={!hasRowSelection}
                onClick={globalRefresh}
              >
                刷新
              </Button>
            </Space>
          </Col>
          <Col flex="auto" style={{ minWidth: 8 }} />
          <Col>
            <Input.Search
              allowClear
              placeholder="搜索缺陷ID、标题及各列文本…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={() => setPage(1)}
              style={{ width: 360, maxWidth: '100%' }}
              enterButton
            />
          </Col>
        </Row>

        <Typography.Text type="secondary">
          缺陷ID～缺陷归属团队为只读列（灰色底）；「是否有效问题」～「完成进度」与「自动化是否覆盖」～「自动化未发现原因」为可编辑两段（浅蓝 / 浅绿底区分）；上述区间内双击进入编辑；「完成进度」为 0～100% 进度条，编辑时调整数字后点确定或按 Enter 保存，取消或 Esc 不保存；其余除「优化措施」为文本外多为下拉。时间按「创建日期」过滤；更多条件请用表头筛选图标。勾选列表行后「导出」「刷新」可用。
        </Typography.Text>

        <Table<MarketDefect>
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={paged}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            columnWidth: 48,
            fixed: true,
          }}
          pagination={{
            current: page,
            pageSize,
            total: filtered.length,
            showSizeChanger: true,
            showTotal: (total, range) => {
              const [start, end] = range;
              return (
                <span>
                  全量 <Typography.Text strong>{rows.length}</Typography.Text> 条 · 筛选结果{' '}
                  <Typography.Text strong>{total}</Typography.Text> 条 · 本页第{' '}
                  <Typography.Text strong>{total === 0 ? 0 : start}</Typography.Text>-
                  <Typography.Text strong>{total === 0 ? 0 : end}</Typography.Text> 条 · 已选{' '}
                  <Typography.Text strong>{selectedRowKeys.length}</Typography.Text> 条
                </span>
              );
            },
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps ?? 10);
            },
          }}
          scroll={{ x: TABLE_SCROLL_X }}
        />
      </Space>

      <Modal
        title="导出（REQ-031 Mock）"
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        onOk={() => {
          message.success(`导出任务已提交（Mock），已选 ${selectedRowKeys.length} 条`);
          setExportOpen(false);
        }}
      >
        <p>默认 Excel，UTF-8（占位，对齐 REQ-031）。</p>
        <p>当前已选缺陷：{selectedRowKeys.join('、') || '—'}</p>
      </Modal>

      <Drawer title="列设置（REQ-025 Mock）" open={settingsOpen} onClose={() => setSettingsOpen(false)} width={320}>
        <Typography.Paragraph type="secondary">首版占位：后续按 REQ-025 配置可隐藏列。</Typography.Paragraph>
      </Drawer>

      <Modal title={`RDMS 详情 · ${rdmsId}`} open={rdmsOpen} onCancel={() => setRdmsOpen(false)} footer={null} width={640}>
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#fafafa' }}>
          <Typography.Title level={5}>Mock 结构（首版无 iframe）</Typography.Title>
          <p>缺陷编号：{rdmsId}</p>
          <p>状态、描述、附件等占位区块，对齐 REQ-028 信息架构。</p>
        </div>
      </Modal>
    </Card>
  );
}
