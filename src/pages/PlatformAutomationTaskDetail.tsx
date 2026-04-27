/**
 * @page 平台自动化任务详情
 * @version V1.0.1
 * @base ATO_V1.0.1-页面需求与交互规格.md 第 3.12.6 节
 * @changes
 *   - V1.0.1: 新增主框架任务详情页，支持任务详情/测试报告双 Tab 与返回保留列表筛选参数。
 *   - V1.0.1: 测试报告 Tab 对齐 V1.0.0 测试运行页（运行记录折叠、汇总折叠、目录树筛选、用例抽屉详情）。
 */

import { useMemo } from 'react';
import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tree,
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
  CheckCircleTwoTone,
  CloseCircleTwoTone,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { mockCaseModules, mockPlatformTaskDetails, mockTestCases } from '@/mocks/data';
import { ROUTES } from '@/constants/routes';
import type { CaseModule } from '@/types';

const { Title } = Typography;

type RunRecord = {
  id: string;
  time: string;
  status: '成功' | '失败' | '停止';
  passRate: number;
  duration: string;
};

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

type ReportCaseRow = {
  id: string;
  name: string;
  tags: string[];
  module: string;
  result: '成功' | '失败' | '异常' | '跳过';
  bugId?: string;
};

type CaseStepDetail = {
  status: 'pass' | 'fail';
  title: string;
  requestUrl: string;
  startedAt: string;
  requestHeaders?: string;
  requestBody?: string;
  responseHeaders?: string;
  responseBody?: string;
  variableExtract?: string;
  assertions: string[];
  duration: string;
};

type CaseRunDetail = {
  caseName: string;
  tags: string[];
  steps: CaseStepDetail[];
};

type ReportStatusFilter = 'all' | 'success' | 'failed' | 'abnormal' | 'skipped';

type StatusCounts = {
  total: number;
  success: number;
  failed: number;
  abnormal: number;
  skipped: number;
};

const MOCK_RUN_RECORDS: RunRecord[] = [
  { id: '#5', time: '2026-03-16 19:10:18', status: '失败', passRate: 99.37, duration: '4029.0382 秒' },
  { id: '#4', time: '2026-03-16 17:53:04', status: '成功', passRate: 98.51, duration: '3950.9271 秒' },
  { id: '#3', time: '2026-03-16 15:58:33', status: '成功', passRate: 97.82, duration: '3860.2011 秒' },
  { id: '#2', time: '2026-03-16 10:28:38', status: '停止', passRate: 65.2, duration: '1290.4000 秒' },
  { id: '#1', time: '2026-03-14 16:16:23', status: '成功', passRate: 96.73, duration: '3750.0300 秒' },
];

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

const REPORT_CASE_DETAIL_BY_ID: Record<string, CaseRunDetail> = {
  'tc-1': {
    caseName: '主机回收hostIP_Standalone',
    tags: [],
    steps: [
      {
        status: 'pass',
        title: '第一步：[接口请求]/cicd/userInfo/getCommonToken',
        requestUrl: 'GET http://129.204.45.218:8099/cicd/userInfo/getCommonToken?userAccount=admin',
        startedAt: '2026-03-16 18:03:07',
        requestHeaders: '{ "content-type": "application/json" }',
        requestBody: '{ "userAccount": "admin" }',
        responseHeaders: '{ "content-type": "application/json" }',
        responseBody: '{ "code": 200, "success": true }',
        variableExtract: 'token, cicd',
        assertions: ['[ PASS ] code => 200', '[ PASS ] success => true'],
        duration: '0.069 s',
      },
      {
        status: 'pass',
        title: '第二步：[接口请求]/cicd/host/add',
        requestUrl: 'POST http://129.204.45.218:8099/cicd/host/add',
        startedAt: '2026-03-16 18:03:07',
        assertions: ['[ PASS ] code => 200'],
        duration: '0.059 s',
      },
    ],
  },
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

function renderMonoBlock(text: string) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 10,
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      {text}
    </pre>
  );
}

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

export function PlatformAutomationTaskDetail() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('detail');
  const [selectedRecordId, setSelectedRecordId] = useState(MOCK_RUN_RECORDS[0]?.id ?? '');
  const [reportRecordsExpanded, setReportRecordsExpanded] = useState(false);
  const [reportSummaryExpanded, setReportSummaryExpanded] = useState(false);
  const [reportSelectedModuleKey, setReportSelectedModuleKey] = useState('__root_all__');
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatusFilter>('all');
  const [selectedReportCaseId, setSelectedReportCaseId] = useState<string>('');
  const [caseDrawerOpen, setCaseDrawerOpen] = useState(false);

  const detail = useMemo(() => {
    if (!taskId) {
      return undefined;
    }
    return mockPlatformTaskDetails.find((item) => String(item.taskId) === taskId);
  }, [taskId]);

  const reportSummary = useMemo(
    () => REPORT_SUMMARY_BY_RECORD[selectedRecordId] ?? REPORT_SUMMARY_BY_RECORD['#5'],
    [selectedRecordId]
  );

  const handleBack = () => {
    const queryString = searchParams.toString();
    navigate(`${ROUTES.APPLICATION_PLATFORM}${queryString ? `?${queryString}` : ''}`);
  };

  if (!detail) {
    return (
      <Card>
        <Space direction="vertical" size={16}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回
          </Button>
          <Empty description="任务不存在或已删除" />
        </Space>
      </Card>
    );
  }

  const versionCases = useMemo(() => mockTestCases.filter((c) => c.versionId === '1'), []);

  const versionModules = useMemo(
    () =>
      mockCaseModules
        .filter((m) => m.versionId === '1')
        .slice()
        .sort((a, b) => a.sort - b.sort),
    []
  );

  const moduleNameById = useMemo(() => {
    const map: Record<string, string> = {};
    mockCaseModules.forEach((m) => {
      map[m.id] = m.name;
    });
    return map;
  }, []);

  const MODULE_ROOT_ALL = '__root_all__';
  const versionModuleIds = useMemo(() => versionModules.map((m) => m.id), [versionModules]);

  const allowedModuleIds = useMemo(() => {
    if (reportSelectedModuleKey === MODULE_ROOT_ALL) return new Set(versionModuleIds);
    return collectDescendantModuleIds(reportSelectedModuleKey, versionModules);
  }, [reportSelectedModuleKey, versionModuleIds, versionModules]);

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
    const map: Record<string, StatusCounts> = {
      [MODULE_ROOT_ALL]: calcStatusCounts(versionCases),
    };
    versionModules.forEach((m) => {
      const allowed = collectDescendantModuleIds(m.id, versionModules);
      const cases = versionCases.filter((c) => allowed.has(c.moduleId));
      map[m.id] = calcStatusCounts(cases);
    });
    return map;
  }, [versionCases, versionModules]);

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
    return [
      {
        key: MODULE_ROOT_ALL,
        title: renderModuleTitle('全部', moduleCountsByKey[MODULE_ROOT_ALL]),
        children: build(null),
      },
    ];
  }, [moduleCountsByKey, versionModules]);

  const reportExpandedKeys = useMemo(
    () => [MODULE_ROOT_ALL, ...versionModules.map((m) => m.id)],
    [versionModules]
  );

  const reportColumns: ColumnsType<ReportCaseRow> = [
    { title: '用例ID', dataIndex: 'id', width: 110 },
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

  const taskDetailContent = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small" title="基本信息">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="任务ID">{detail.basicInfo.taskId}</Descriptions.Item>
          <Descriptions.Item label="版本">{detail.basicInfo.version}</Descriptions.Item>
          <Descriptions.Item label="所属项目">{detail.basicInfo.projectName}</Descriptions.Item>
          <Descriptions.Item label="任务状态">{detail.basicInfo.status}</Descriptions.Item>
          <Descriptions.Item label="触发方式">{detail.basicInfo.triggerType}</Descriptions.Item>
          <Descriptions.Item label="发送邮件">{detail.basicInfo.sendMailPolicy}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{detail.basicInfo.createdAt}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="配置信息">
        <Descriptions column={3} size="small">
          <Descriptions.Item label="运行环境">{detail.configInfo.runEnv}</Descriptions.Item>
          <Descriptions.Item label="并行线程数">{detail.configInfo.threadCount ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="重试次数">{detail.configInfo.retryCount}</Descriptions.Item>
          <Descriptions.Item label="执行耗时">{detail.configInfo.durationText}</Descriptions.Item>
          <Descriptions.Item label="执行范围" span={2}>
            {detail.configInfo.runScopeText}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="运行统计">
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Statistic title="用例总数" value={detail.runStats.caseCount} />
          </Col>
          <Col span={8}>
            <Statistic title="运行用例数" value={detail.runStats.runCaseCount} />
          </Col>
          <Col span={8}>
            <Statistic title="总运行次数" value={detail.runStats.totalRunTimes} />
          </Col>
          <Col span={8}>
            <Statistic title="覆盖率" value={detail.runStats.coverageRateText} />
          </Col>
          <Col span={8}>
            <Statistic title="通过率" value={detail.runStats.passRateText} />
          </Col>
          <Col span={8}>
            <Statistic title="耗时" value={detail.runStats.durationText} />
          </Col>
        </Row>
      </Card>
    </Space>
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
                selectedKeys={[reportSelectedModuleKey]}
                defaultExpandedKeys={reportExpandedKeys}
                treeData={reportTreeData}
                onSelect={(keys) => {
                  const k = keys[0];
                  if (typeof k === 'string') setReportSelectedModuleKey(k);
                }}
                height={420}
              />
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
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
      steps: [],
    } as CaseRunDetail;
  }, [reportFilteredRows, selectedReportCaseId]);

  return (
    <Card>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回
          </Button>
          <Title level={5} style={{ margin: 0 }}>
            测试任务：{detail.taskId}
          </Title>
        </Space>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'detail', label: '任务详情', children: taskDetailContent },
            { key: 'report', label: '测试报告', children: reportTab },
          ]}
        />
      </Space>

      <Drawer
        title={drawerDetail ? `用例详情：${drawerDetail.caseName}` : '用例详情'}
        placement="right"
        width="40vw"
        open={caseDrawerOpen}
        onClose={() => setCaseDrawerOpen(false)}
        mask={false}
        zIndex={1200}
      >
        {drawerDetail ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color="success" style={{ margin: 0 }}>
                成功
              </Tag>
              <Typography.Text strong style={{ fontSize: 16 }}>
                {drawerDetail.caseName}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text type="secondary">标签：</Typography.Text>
              <Typography.Text>{drawerDetail.tags.join(', ') || '-'}</Typography.Text>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <Typography.Text strong>用例执行步骤</Typography.Text>
            {drawerDetail.steps.length ? (
              drawerDetail.steps.map((step) => (
                <Card
                  key={step.title}
                  size="small"
                  title={
                    <Space size={8}>
                      {step.status === 'pass' ? (
                        <CheckCircleTwoTone twoToneColor="#52c41a" />
                      ) : (
                        <CloseCircleTwoTone twoToneColor="#ff4d4f" />
                      )}
                      <span>{step.title}</span>
                    </Space>
                  }
                  styles={{ body: { padding: 12 } }}
                >
                  <Descriptions size="small" column={1} labelStyle={{ width: 100 }}>
                    <Descriptions.Item label="请求地址">
                      <Typography.Text style={{ wordBreak: 'break-word' }}>{step.requestUrl}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="开始时间">{step.startedAt}</Descriptions.Item>
                    <Descriptions.Item label="耗时">{step.duration}</Descriptions.Item>
                  </Descriptions>

                  <Collapse
                    size="small"
                    style={{ marginTop: 8 }}
                    defaultActiveKey={['assertions']}
                    items={[
                      {
                        key: 'requestHeaders',
                        label: '请求头',
                        children: step.requestHeaders ? renderMonoBlock(step.requestHeaders) : <Empty description="无" />,
                      },
                      {
                        key: 'requestBody',
                        label: '请求体',
                        children: step.requestBody ? renderMonoBlock(step.requestBody) : <Empty description="无" />,
                      },
                      {
                        key: 'responseHeaders',
                        label: '响应头',
                        children: step.responseHeaders ? renderMonoBlock(step.responseHeaders) : <Empty description="无" />,
                      },
                      {
                        key: 'responseBody',
                        label: '响应体',
                        children: step.responseBody ? renderMonoBlock(step.responseBody) : <Empty description="无" />,
                      },
                      {
                        key: 'variableExtract',
                        label: '变量提取',
                        children: step.variableExtract ? renderMonoBlock(step.variableExtract) : <Empty description="无" />,
                      },
                      {
                        key: 'assertions',
                        label: '断言',
                        children: (
                          <div>
                            {step.assertions.map((line) => (
                              <Typography.Paragraph key={line} style={{ margin: '2px 0 0 0' }}>
                                {line}
                              </Typography.Paragraph>
                            ))}
                          </div>
                        ),
                      },
                    ]}
                  />
                </Card>
              ))
            ) : (
              <Empty description="暂无步骤详情（Mock）" />
            )}
          </Space>
        ) : (
          <Empty description="暂无详情" />
        )}
      </Drawer>
    </Card>
  );
}
