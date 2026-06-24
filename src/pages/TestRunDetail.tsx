/**
 * @page 任务详情
 * @version V1.0.5
 * @base docs/spec/04-页面契约.md § 页面 10（测试运行 / 任务详情）；PRD 章节待同步，以契约为准
 * @changes
 *   - V1.0.0: 初始实现任务详情页；支持任务详情/运行日志/测试报告三 Tab；测试报告中运行记录与汇总模块默认折叠并可展开
 *   - V1.0.1: 测试报告用例列表右上方展示当前选中一级模块的运行耗时（秒）
 *   - V1.0.2: 去掉目录树「全部」节点；选中根目录时展示运行总耗时（秒）
 *   - V1.0.3: 测试报告「用例详情」抽屉重构——改为左右两栏：左侧步骤列表（通过 ✅ / 失败 ❌ 前缀 + 高亮选中），右侧步骤详情按步骤类型分 Tab（实际请求 / 接口响应 / 变量提取 / 断言），与「调试运行」抽屉复用 src/components/CaseDebugDetail.tsx 一套渲染。
 *   - V1.0.4: 抽屉宽度收敛至 `min(900px, 60vw)`（80vw 会盖住用例表导致无法切换用例）；左侧步骤栏宽度收紧到 220px，把空间留给右侧详情 Tab。
 *   - V1.0.5: 抽屉标题在「用例详情：xxx」后补充用例总结果 Tag（通过 ✅ / 失败 ❌）；用例 mock 与「用例管理」对齐——tc-1 改为「创建订单-正常流」并补齐 7 种步骤类型（接口请求 / 自定义接口请求 / 调用函数 / 数据库操作 / if 判断 / for 循环 / 等待），便于需求澄清；mock 数据模型直接采用 `DebugStepResult[]`，移除内部转换层。
 *   - V1.0.6: 抽取用例详情 mock 至 `src/constants/reportCaseDetailMock.ts`，与「平台自动化任务详情」复用同一份数据。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  List,
  Space,
  Tree,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  ArrowLeftOutlined,
  CaretDownOutlined,
  CaretLeftOutlined,
  CaretRightOutlined,
  CaretUpOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useVersionDevRoutes } from '@/hooks/useVersionDevRoutes';
import type { CaseModule } from '@/types';
import { mockCaseModules, mockTestCases } from '@/mocks/data';
import {
  DebugStepDetailTabs,
  DebugStepResultHeader,
} from '@/components/CaseDebugDetail';
import {
  REPORT_CASE_DETAIL_BY_ID,
  type CaseRunDetail,
} from '@/constants/reportCaseDetailMock';

type RunRecord = {
  id: string;
  time: string;
  status: '成功' | '失败' | '停止';
  passRate: number;
  duration: string;
};

type ReportCaseRow = {
  id: string;
  name: string;
  tags: string[];
  module: string;
  result: '成功' | '失败' | '异常' | '跳过';
  bugId?: string;
};

const MOCK_RUN_RECORDS: RunRecord[] = [
  { id: '#5', time: '2026-03-16 19:10:18', status: '失败', passRate: 99.37, duration: '4029.0382 秒' },
  { id: '#4', time: '2026-03-16 17:53:04', status: '成功', passRate: 98.51, duration: '3950.9271 秒' },
  { id: '#3', time: '2026-03-16 15:58:33', status: '成功', passRate: 97.82, duration: '3860.2011 秒' },
  { id: '#2', time: '2026-03-16 10:28:38', status: '停止', passRate: 65.2, duration: '1290.4000 秒' },
  { id: '#1', time: '2026-03-14 16:16:23', status: '成功', passRate: 96.73, duration: '3750.0300 秒' },
];

const MOCK_LOG_LINES = [
  '2026-03-16 18:03:05 [ClickHouse HTTP连接测试失败]: Invalid URL ...',
  '2026-03-16 18:03:05 [未发现初始化完成]',
  '2026-03-16 18:03:07 [开始执行 456868 - 主机回收hostIP_Standalone]',
  '2026-03-16 18:03:24 [开始执行 456755 - 前端完整计算-成功计算概率]',
  '2026-03-16 18:03:25 [开始执行 456749 - 登录-账号密码登录缺失account参数]',
  '2026-03-16 18:03:25 [开始执行 456750 - 登录-账号密码登录缺失password参数]',
  '2026-03-16 18:03:25 [开始执行 456751 - 登录-密码登录账号与密码都错误]',
  '2026-03-16 18:03:25 [开始执行 456753 - 登录-账号登录参数authCode参数]',
];

type ReportSummary = {
  total: number;
  success: number;
  failed: number;
  abnormal: number;
  skipped: number;
  durationSec: number;
  avgPerRequestSec: number;
  coverage: number;
  endpointCount: number;
  endpointExecCount: number;
  env: string;
};

/** 测试报告：各一级模块运行耗时（秒），与运行记录 Mock 对齐；对接接口后可改为按 runId+moduleId 查询 */
const REPORT_TOP_LEVEL_MODULE_DURATION_SEC: Record<string, number> = {
  'mod-pay-order': 300,
  'mod-pay-refund': 186,
  'mod-pay-coupon': 92,
  'mod-pay-risk': 245,
  'mod-pay-recon': 154,
};

const REPORT_SUMMARY_BY_RECORD: Record<string, ReportSummary> = {
  '#5': {
    total: 476,
    success: 473,
    failed: 3,
    abnormal: 0,
    skipped: 0,
    durationSec: 4029.0382,
    avgPerRequestSec: 0.0689,
    coverage: 191.89,
    endpointCount: 74,
    endpointExecCount: 142,
    env: 'SIT测试环境',
  },
  '#4': {
    total: 476,
    success: 469,
    failed: 5,
    abnormal: 1,
    skipped: 1,
    durationSec: 3950.9271,
    avgPerRequestSec: 0.0721,
    coverage: 188.14,
    endpointCount: 74,
    endpointExecCount: 139,
    env: 'SIT测试环境',
  },
  '#3': {
    total: 476,
    success: 466,
    failed: 8,
    abnormal: 1,
    skipped: 1,
    durationSec: 3860.2011,
    avgPerRequestSec: 0.0749,
    coverage: 185.02,
    endpointCount: 74,
    endpointExecCount: 136,
    env: 'SIT测试环境',
  },
  '#2': {
    total: 476,
    success: 301,
    failed: 22,
    abnormal: 9,
    skipped: 144,
    durationSec: 1290.4,
    avgPerRequestSec: 0.0812,
    coverage: 102.61,
    endpointCount: 74,
    endpointExecCount: 81,
    env: 'SIT测试环境',
  },
  '#1': {
    total: 476,
    success: 461,
    failed: 11,
    abnormal: 2,
    skipped: 2,
    durationSec: 3750.03,
    avgPerRequestSec: 0.0766,
    coverage: 180.22,
    endpointCount: 74,
    endpointExecCount: 132,
    env: 'SIT测试环境',
  },
};

type ReportStatusFilter = 'all' | 'success' | 'failed' | 'abnormal' | 'skipped';

type StatusCounts = {
  total: number;
  success: number;
  failed: number;
  abnormal: number;
  skipped: number;
};

const STATUS_FILTER_META: Record<
  Exclude<ReportStatusFilter, 'all'>,
  { color: string; label: string }
> = {
  success: { color: '#52c41a', label: '成功' },
  failed: { color: '#ff4d4f', label: '失败' },
  abnormal: { color: '#faad14', label: '异常' },
  skipped: { color: '#d9d9d9', label: '跳过' },
};

function mapCaseResultToReportResult(r: string): ReportCaseRow['result'] {
  if (r === '通过') return '成功';
  if (r === '失败') return '失败';
  if (r === '警告') return '异常';
  return '跳过';
}

function collectDescendantModuleIds(rootId: string, modules: CaseModule[]): Set<string> {
  const set = new Set<string>([rootId]);
  const walk = (pid: string) => {
    modules
      .filter((m) => m.parentId === pid)
      .forEach((m) => {
        set.add(m.id);
        walk(m.id);
      });
  };
  walk(rootId);
  return set;
}

function calcStatusCounts(cases: { result: string }[]): StatusCounts {
  const counts: StatusCounts = { total: cases.length, success: 0, failed: 0, abnormal: 0, skipped: 0 };
  cases.forEach((c) => {
    const rs = mapCaseResultToReportResult(c.result);
    if (rs === '成功') counts.success += 1;
    else if (rs === '失败') counts.failed += 1;
    else if (rs === '异常') counts.abnormal += 1;
    else counts.skipped += 1;
  });
  return counts;
}

export function TestRunDetail() {
  const { projectId = '', versionId = '', runId = '' } = useParams<{
    projectId: string;
    versionId: string;
    runId: string;
  }>();
  const navigate = useNavigate();
  const { toSegmentPath } = useVersionDevRoutes();

  const [activeTab, setActiveTab] = useState('detail');
  const [selectedRecordId, setSelectedRecordId] = useState(MOCK_RUN_RECORDS[0]?.id ?? '');

  // 测试报告要求：默认折叠
  const [reportRecordsExpanded, setReportRecordsExpanded] = useState(false);
  const [reportSummaryExpanded, setReportSummaryExpanded] = useState(false);

  const selectedRecord = useMemo(
    () => MOCK_RUN_RECORDS.find((item) => item.id === selectedRecordId) ?? null,
    [selectedRecordId]
  );
  const reportSummary = useMemo(
    () => REPORT_SUMMARY_BY_RECORD[selectedRecordId] ?? REPORT_SUMMARY_BY_RECORD['#5'],
    [selectedRecordId]
  );

  const versionCases = useMemo(
    () => mockTestCases.filter((c) => c.versionId === versionId),
    [versionId]
  );

  const moduleNameById = useMemo(() => {
    const map: Record<string, string> = {};
    mockCaseModules.forEach((m) => {
      map[m.id] = m.name;
    });
    return map;
  }, []);

  const [reportSelectedModuleKey, setReportSelectedModuleKey] = useState<string>('');
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatusFilter>('all');
  const [selectedReportCaseId, setSelectedReportCaseId] = useState<string>('');
  const [caseDrawerOpen, setCaseDrawerOpen] = useState(false);
  /** 用例详情抽屉中：当前激活的步骤序号（与左侧步骤列表联动） */
  const [drawerActiveStepIdx, setDrawerActiveStepIdx] = useState(0);

  useEffect(() => {
    // 切换到新用例或重新打开抽屉时回到第一个步骤
    setDrawerActiveStepIdx(0);
  }, [selectedReportCaseId, caseDrawerOpen]);

  const versionModules = useMemo(
    () => mockCaseModules.filter((m) => m.versionId === versionId).slice().sort((a, b) => a.sort - b.sort),
    [versionId]
  );

  const versionRootModuleId = useMemo(() => {
    const roots = versionModules.filter((m) => m.parentId === null).sort((a, b) => a.sort - b.sort);
    return roots[0]?.id ?? '';
  }, [versionModules]);

  useEffect(() => {
    setReportSelectedModuleKey(versionRootModuleId);
  }, [versionRootModuleId]);

  const effectiveReportModuleKey = reportSelectedModuleKey || versionRootModuleId;

  const allowedModuleIds = useMemo(() => {
    if (!effectiveReportModuleKey) return new Set<string>();
    return collectDescendantModuleIds(effectiveReportModuleKey, versionModules);
  }, [effectiveReportModuleKey, versionModules]);

  const selectedModuleCases = useMemo(
    () => versionCases.filter((c) => allowedModuleIds.has(c.moduleId)),
    [versionCases, allowedModuleIds]
  );

  const selectedModuleCounts = useMemo(() => calcStatusCounts(selectedModuleCases), [selectedModuleCases]);

  const filteredCases = useMemo(() => {
    if (reportStatusFilter === 'all') return selectedModuleCases;
    const target: ReportCaseRow['result'] =
      reportStatusFilter === 'success'
        ? '成功'
        : reportStatusFilter === 'failed'
          ? '失败'
          : reportStatusFilter === 'abnormal'
            ? '异常'
            : '跳过';
    return selectedModuleCases.filter((c) => mapCaseResultToReportResult(c.result) === target);
  }, [reportStatusFilter, selectedModuleCases]);

  const reportFilteredRows = useMemo(
    () =>
      filteredCases.map((c) => ({
        id: c.id,
        name: REPORT_CASE_DETAIL_BY_ID[c.id]?.caseName ?? c.name,
        tags: c.tags,
        module: moduleNameById[c.moduleId] ?? '-',
        result: mapCaseResultToReportResult(c.result),
        bugId: '-',
      })),
    [filteredCases, moduleNameById]
  );

  const moduleCountsByKey = useMemo(() => {
    const map: Record<string, StatusCounts> = {};
    versionModules.forEach((m) => {
      const allowed = collectDescendantModuleIds(m.id, versionModules);
      const cases = versionCases.filter((c) => allowed.has(c.moduleId));
      map[m.id] = calcStatusCounts(cases);
    });
    return map;
  }, [versionModules, versionCases]);

  /** 挂在版本根目录下的直接子节点（如「下单流程」），用于仅在这些节点展示模块耗时 */
  const firstLevelModuleIdSet = useMemo(() => {
    const rootIds = new Set(versionModules.filter((m) => m.parentId === null).map((m) => m.id));
    return new Set(
      versionModules.filter((m) => m.parentId !== null && rootIds.has(m.parentId)).map((m) => m.id)
    );
  }, [versionModules]);

  const reportDurationRibbon = useMemo(() => {
    const key = effectiveReportModuleKey;
    if (!key) return null;
    const mod = versionModules.find((m) => m.id === key);
    if (mod?.parentId === null) {
      return {
        prefix: '运行总耗时',
        value: `${Math.round(reportSummary.durationSec)}s`,
      };
    }
    if (firstLevelModuleIdSet.has(key)) {
      const sec = REPORT_TOP_LEVEL_MODULE_DURATION_SEC[key];
      if (sec === undefined) return null;
      return {
        prefix: '模块运行耗时',
        value: `${Math.round(sec)}s`,
      };
    }
    return null;
  }, [
    effectiveReportModuleKey,
    versionModules,
    reportSummary.durationSec,
    firstLevelModuleIdSet,
  ]);

  const renderModuleTitle = (name: string, counts: StatusCounts) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Typography.Text
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 150,
        }}
      >
        {name}
      </Typography.Text>
      <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}>
        (
        <span style={{ color: '#52c41a' }}>{counts.success}</span>/
        <span style={{ color: '#ff4d4f' }}>{counts.failed}</span>/
        <span style={{ color: '#faad14' }}>{counts.abnormal}</span>/
        <span style={{ color: '#d9d9d9' }}>{counts.skipped}</span>
        )
      </Typography.Text>
    </div>
  );

  const reportTreeData = useMemo(() => {
    const build = (parentId: string | null): DataNode[] => {
      const children = versionModules
        .filter((m) => m.parentId === parentId)
        .slice()
        .sort((a, b) => a.sort - b.sort);
      return children.map((m) => ({
        key: m.id,
        title: renderModuleTitle(m.name, moduleCountsByKey[m.id]),
        children: build(m.id),
      }));
    };
    return build(null);
  }, [moduleCountsByKey, renderModuleTitle, versionModules]);

  const reportExpandedKeys = useMemo(() => versionModules.map((m) => m.id), [versionModules]);

  const reportColumns: ColumnsType<ReportCaseRow> = [
    {
      title: '用例ID',
      dataIndex: 'id',
      width: 110,
      render: (id: string) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => {
            const q = new URLSearchParams({ caseId: id }).toString();
            navigate({
              pathname: toSegmentPath(projectId, versionId, 'cases'),
              search: `?${q}`,
            });
          }}
        >
          {id}
        </Button>
      ),
    },
    {
      title: '用例名称',
      dataIndex: 'name',
      render: (name: string, row) => (
        <Typography.Link
          className="report-case-name-link"
          onClick={(e) => {
            e.preventDefault();
            setSelectedReportCaseId(row.id);
            setCaseDrawerOpen(true);
          }}
          title="点击查看用例运行详情"
          style={{ display: 'inline-block', maxWidth: 260, color: '#1677ff' }}
        >
          <span
            style={{
              display: 'inline-block',
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              verticalAlign: 'middle',
              color: 'inherit',
            }}
          >
            {name}
          </span>
        </Typography.Link>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 120,
      render: (tags: string[]) => (
        <Space size={4} wrap>
          {tags.length ? tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '-'}
        </Space>
      ),
    },
    { title: '所属模块', dataIndex: 'module', width: 130 },
    {
      title: '运行结果',
      dataIndex: 'result',
      width: 90,
      render: (result: ReportCaseRow['result']) => (
        <Tag
          color={
            result === '成功'
              ? 'success'
              : result === '失败'
                ? 'error'
                : result === '异常'
                  ? 'orange'
                  : 'default'
          }
        >
          {result}
        </Tag>
      ),
    },
    { title: '关联Bug Id', dataIndex: 'bugId', width: 110, render: (v?: string) => v || '-' },
  ];

  const renderRecordList = () => (
    <Card size="small" title="运行记录" styles={{ body: { padding: 8 } }}>
      <div style={{ maxHeight: 420, overflow: 'auto' }}>
        {MOCK_RUN_RECORDS.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedRecordId(item.id)}
            style={{
              cursor: 'pointer',
              padding: '8px 10px',
              borderRadius: 6,
              marginBottom: 6,
              background: selectedRecordId === item.id ? '#e6f4ff' : undefined,
            }}
          >
            <Typography.Text style={{ display: 'block' }}>{item.id} {item.time}</Typography.Text>
          </div>
        ))}
      </div>
    </Card>
  );

  const detailTab = (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title="基本信息">
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="任务ID">{runId}</Descriptions.Item>
          <Descriptions.Item label="所属项目">CICD V2.0</Descriptions.Item>
          <Descriptions.Item label="项目版本">V2.0.1 P1</Descriptions.Item>
          <Descriptions.Item label="任务状态"><Tag color="success">已完成</Tag></Descriptions.Item>
          <Descriptions.Item label="创建人">梁双</Descriptions.Item>
          <Descriptions.Item label="创建时间">2026-03-14 15:10:05</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card size="small" title="配置信息">
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="运行环境">https://192.168.132.134:28008</Descriptions.Item>
          <Descriptions.Item label="运行次数">1</Descriptions.Item>
          <Descriptions.Item label="并行线程数">1</Descriptions.Item>
          <Descriptions.Item label="用例失败重试次数">1</Descriptions.Item>
          <Descriptions.Item label="执行限时">30 分钟</Descriptions.Item>
          <Descriptions.Item label="执行范围">[包含] 模块范围（im）</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card size="small" title="运行统计">
        <Descriptions size="small" column={4}>
          <Descriptions.Item label="用例总数">476</Descriptions.Item>
          <Descriptions.Item label="总运行次数">5</Descriptions.Item>
          <Descriptions.Item label="最近一次运行时间">2026-03-16 18:03:04</Descriptions.Item>
          <Descriptions.Item label="运行平均耗时">67 分钟 9 秒</Descriptions.Item>
          <Descriptions.Item label="最近1次运行成功统计">91.01%</Descriptions.Item>
          <Descriptions.Item label="成功率">99.37%</Descriptions.Item>
          <Descriptions.Item label="最近1次失败数">3</Descriptions.Item>
          <Descriptions.Item label="最近1次异常数">0</Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );

  const logsTab = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: 12,
        minHeight: 460,
      }}
    >
      {renderRecordList()}
      <Card size="small" title={selectedRecord ? `${selectedRecord.id} | ${selectedRecord.time}` : '运行日志'}>
        <div
          style={{
            background: '#111',
            color: '#ddd',
            borderRadius: 6,
            padding: 12,
            height: 420,
            overflow: 'auto',
            fontFamily: 'Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          {MOCK_LOG_LINES.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </Card>
    </div>
  );

  const reportTab = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${reportRecordsExpanded ? 260 : 0}px 16px 1fr`,
        gap: 0,
        minHeight: 460,
      }}
    >
      <div style={{ overflow: 'hidden', paddingRight: reportRecordsExpanded ? 12 : 0 }}>
        {reportRecordsExpanded ? renderRecordList() : null}
      </div>
      <div
        style={{
          position: 'relative',
          borderLeft: '1px solid #f0f0f0',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <Button
          size="small"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            paddingInline: 4,
            minWidth: 18,
          }}
          icon={reportRecordsExpanded ? <CaretLeftOutlined /> : <CaretRightOutlined />}
          onClick={() => setReportRecordsExpanded((v) => !v)}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: reportSummaryExpanded ? 'auto 28px 1fr' : '28px 1fr',
          gap: 10,
          paddingLeft: 12,
        }}
      >
        {reportSummaryExpanded ? (
          <Card size="small">
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: `conic-gradient(
                      #52c41a 0% ${(reportSummary.success / reportSummary.total) * 100}%,
                      #ff4d4f ${(reportSummary.success / reportSummary.total) * 100}% ${((reportSummary.success + reportSummary.failed) / reportSummary.total) * 100}%,
                      #faad14 ${((reportSummary.success + reportSummary.failed) / reportSummary.total) * 100}% ${((reportSummary.success + reportSummary.failed + reportSummary.abnormal) / reportSummary.total) * 100}%,
                      #d9d9d9 ${((reportSummary.success + reportSummary.failed + reportSummary.abnormal) / reportSummary.total) * 100}% 100%
                    )`,
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      共
                    </Typography.Text>
                    <Typography.Text strong>{reportSummary.total}</Typography.Text>
                  </div>
                </div>
                <div style={{ minWidth: 150 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 70px 40px', rowGap: 6 }}>
                    <Space size={6} align="center">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#52c41a' }} />
                      <Typography.Text type="secondary">成功</Typography.Text>
                    </Space>
                    <Typography.Text>{((reportSummary.success / reportSummary.total) * 100).toFixed(2)}%</Typography.Text>
                    <Typography.Text>{reportSummary.success}</Typography.Text>
                    <Space size={6} align="center">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f' }} />
                      <Typography.Text type="secondary">失败</Typography.Text>
                    </Space>
                    <Typography.Text>{((reportSummary.failed / reportSummary.total) * 100).toFixed(2)}%</Typography.Text>
                    <Typography.Text>{reportSummary.failed}</Typography.Text>
                    <Space size={6} align="center">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#faad14' }} />
                      <Typography.Text type="secondary">异常</Typography.Text>
                    </Space>
                    <Typography.Text>{((reportSummary.abnormal / reportSummary.total) * 100).toFixed(2)}%</Typography.Text>
                    <Typography.Text>{reportSummary.abnormal}</Typography.Text>
                    <Space size={6} align="center">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d9d9d9' }} />
                      <Typography.Text type="secondary">跳过</Typography.Text>
                    </Space>
                    <Typography.Text>{((reportSummary.skipped / reportSummary.total) * 100).toFixed(2)}%</Typography.Text>
                    <Typography.Text>{reportSummary.skipped}</Typography.Text>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <Typography.Text type="secondary">运行总耗时</Typography.Text>
                  <div>{reportSummary.durationSec} 秒</div>
                </div>
                <div>
                  <Typography.Text type="secondary">按口平均请求耗时</Typography.Text>
                  <div>{reportSummary.avgPerRequestSec} 秒</div>
                </div>
                <div>
                  <Typography.Text type="secondary">覆盖率</Typography.Text>
                  <div>{reportSummary.coverage} %</div>
                </div>
                <div>
                  <Typography.Text type="secondary">测试环境</Typography.Text>
                  <div>{reportSummary.env}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">接口总数</Typography.Text>
                  <div>{reportSummary.endpointCount}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">按口执行数</Typography.Text>
                  <div>{reportSummary.endpointExecCount}</div>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: '1px solid #f0f0f0',
            borderBottom: '1px solid #f0f0f0',
            marginInline: -12,
          }}
        >
          <Button
            size="small"
            type="text"
            icon={reportSummaryExpanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
            onClick={() => setReportSummaryExpanded((v) => !v)}
          />
        </div>

        <Card size="small" title="测试报告">
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12 }}>
            <div style={{ overflow: 'hidden' }}>
              <Tree
                blockNode
                selectedKeys={effectiveReportModuleKey ? [effectiveReportModuleKey] : []}
                defaultExpandedKeys={reportExpandedKeys}
                treeData={reportTreeData}
                onSelect={(keys) => {
                  const k = keys[0];
                  if (typeof k === 'string') setReportSelectedModuleKey(k);
                  else if (keys.length === 0 && versionRootModuleId) setReportSelectedModuleKey(versionRootModuleId);
                }}
                height={420}
              />
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  {(['all', 'success', 'failed', 'abnormal', 'skipped'] as ReportStatusFilter[]).map((key) => {
                    const meta =
                      key === 'all'
                        ? { color: '#1677ff', label: '全部' }
                        : STATUS_FILTER_META[key as Exclude<ReportStatusFilter, 'all'>];
                    const count =
                      key === 'all'
                        ? selectedModuleCounts.total
                        : key === 'success'
                          ? selectedModuleCounts.success
                          : key === 'failed'
                            ? selectedModuleCounts.failed
                            : key === 'abnormal'
                              ? selectedModuleCounts.abnormal
                              : selectedModuleCounts.skipped;
                    return (
                      <Button
                        key={key}
                        type={reportStatusFilter === key ? 'primary' : 'default'}
                        size="small"
                        onClick={() => setReportStatusFilter(key)}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: meta.color,
                            marginRight: 6,
                            verticalAlign: 'middle',
                          }}
                        />
                        {meta.label} {count}
                      </Button>
                    );
                  })}
                </div>
                {reportDurationRibbon ? (
                  <Typography.Text type="secondary" style={{ flexShrink: 0 }}>
                    {reportDurationRibbon.prefix}{' '}
                    <Typography.Text strong>{reportDurationRibbon.value}</Typography.Text>
                  </Typography.Text>
                ) : null}
              </div>

              <Table
                size="small"
                rowKey="id"
                columns={reportColumns}
                dataSource={reportFilteredRows}
                rowClassName={(record) =>
                  record.id === selectedReportCaseId ? 'report-case-selected-row' : ''
                }
                onRow={(record) => ({
                  onClick: () => setSelectedReportCaseId(record.id),
                })}
                pagination={{ pageSize: 5, showSizeChanger: true }}
                locale={{ emptyText: <Empty description="暂无报告数据" /> }}
              />
            </div>
          </div>
        </Card>
      </div>
      <style>
        {`
          .report-case-selected-row td {
            background: #e6f4ff !important;
          }
          .report-case-name-link {
            color: #1677ff !important;
            cursor: pointer;
            text-decoration: none;
          }
          .report-case-name-link:hover {
            text-decoration: underline;
          }
        `}
      </style>
    </div>
  );

  const drawerDetail = useMemo(() => {
    if (!selectedReportCaseId) return null;
    const builtin = REPORT_CASE_DETAIL_BY_ID[selectedReportCaseId];
    if (builtin) return builtin;
    const row = reportFilteredRows.find((r) => r.id === selectedReportCaseId);
    if (!row) return null;
    return {
      caseName: row.name,
      tags: row.tags,
      caseResult: row.result === '成功' ? 'pass' : 'fail',
      steps: [],
    } as CaseRunDetail;
  }, [reportFilteredRows, selectedReportCaseId]);

  return (
    <Card
      size="small"
      styles={{ body: { padding: 16, height: 'calc(100vh - 140px)', overflow: 'auto' } }}
      title={
        <Space>
          <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回
          </Button>
          <Typography.Text strong>自测任务：{runId}</Typography.Text>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'detail', label: '任务详情', children: detailTab },
          { key: 'logs', label: '运行日志', children: logsTab },
          { key: 'report', label: '测试报告', children: reportTab },
        ]}
      />
      <Drawer
        title={
          drawerDetail ? (
            <Space size={8} wrap>
              <Typography.Text strong style={{ fontSize: 14 }}>
                用例详情：{drawerDetail.caseName}
              </Typography.Text>
              <Tag
                color={drawerDetail.caseResult === 'pass' ? 'success' : 'error'}
                icon={
                  drawerDetail.caseResult === 'pass' ? (
                    <CheckCircleOutlined />
                  ) : (
                    <CloseCircleOutlined />
                  )
                }
                style={{ marginInlineEnd: 0 }}
              >
                {drawerDetail.caseResult === 'pass' ? '通过' : '失败'}
              </Tag>
              {drawerDetail.tags.length ? (
                <Space size={4} wrap>
                  {drawerDetail.tags.map((t) => (
                    <Tag key={t} style={{ marginInlineEnd: 0 }}>
                      {t}
                    </Tag>
                  ))}
                </Space>
              ) : null}
            </Space>
          ) : (
            '用例详情'
          )
        }
        placement="right"
        width="min(900px, 60vw)"
        open={caseDrawerOpen}
        onClose={() => setCaseDrawerOpen(false)}
        mask={false}
        zIndex={1200}
        styles={{
          body: { padding: 0, height: '100%', overflow: 'hidden' },
        }}
      >
        {drawerDetail && drawerDetail.steps.length ? (
          (() => {
            const safeIdx = Math.min(
              Math.max(drawerActiveStepIdx, 0),
              drawerDetail.steps.length - 1
            );
            const activeResult = drawerDetail.steps[safeIdx];
            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 1fr',
                  gap: 0,
                  height: '100%',
                  minHeight: 0,
                }}
              >
                <Card
                  size="small"
                  title="步骤"
                  style={{
                    height: '100%',
                    borderRight: '1px solid #f0f0f0',
                    borderRadius: 0,
                  }}
                  styles={{ body: { padding: 8, height: '100%', overflow: 'auto' } }}
                >
                  <List
                    size="small"
                    dataSource={drawerDetail.steps}
                    renderItem={(item, idx) => {
                      const active = idx === safeIdx;
                      const ok = item.ok;
                      return (
                        <List.Item
                          onClick={() => setDrawerActiveStepIdx(idx)}
                          style={{
                            cursor: 'pointer',
                            background: active ? '#bae0ff' : undefined,
                            borderLeft: active
                              ? '3px solid #1677ff'
                              : '3px solid transparent',
                            padding: '6px 8px',
                            borderRadius: 4,
                            transition: 'background 0.15s ease, border-color 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              width: '100%',
                              minWidth: 0,
                            }}
                          >
                            {ok ? (
                              <CheckCircleOutlined
                                style={{ color: '#52c41a', fontSize: 14, flex: '0 0 auto' }}
                              />
                            ) : (
                              <CloseCircleOutlined
                                style={{ color: '#ff4d4f', fontSize: 14, flex: '0 0 auto' }}
                              />
                            )}
                            <Typography.Text style={{ flex: '0 0 auto' }}>
                              {item.order}.
                            </Typography.Text>
                            <Typography.Text
                              ellipsis={{ tooltip: item.title }}
                              style={{ flex: 1, minWidth: 0 }}
                            >
                              {item.title}
                            </Typography.Text>
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                </Card>
                <Card
                  size="small"
                  title={<DebugStepResultHeader result={activeResult} />}
                  style={{ height: '100%', borderRadius: 0 }}
                  styles={{
                    body: { height: '100%', overflow: 'auto', padding: 16 },
                    header: { padding: '8px 16px' },
                  }}
                >
                  <DebugStepDetailTabs result={activeResult} />
                </Card>
              </div>
            );
          })()
        ) : (
          <div style={{ padding: 24 }}>
            <Empty description={drawerDetail ? '暂无步骤详情（Mock）' : '暂无详情'} />
          </div>
        )}
      </Drawer>
    </Card>
  );
}

