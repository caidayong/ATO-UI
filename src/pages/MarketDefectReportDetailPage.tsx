/**
 * @page 市场缺陷分析 · 报告详情
 * @version V1.0.1-P5
 * @base docs/prd/V1.0.1-P5/ATO_V1.0.1-P5-页面需求与交互规格.md §3.5
 * @changes
 *   - V1.0.1-P5: 顶栏「返回」置于标题前且文案为「返回」；右侧导出/编辑/发送邮件；编辑态可改测试 bug 总数、共性问题说明、两条待办提示、改进表（含增删行）；导出 Word（.doc）；发送邮件与列表共用 `MarketDefectSendMailModal`（Mock）
 */
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Space, Typography, message } from 'antd';
import type { AnalysisReportTask, MarketDefect } from '@/types';
import { mockAnalysisReportTasks, mockMarketDefects } from '@/mocks/data';
import { ROUTES } from '@/constants/routes';
import {
  MARKET_DEFECT_REPORT_COMMON_ISSUES_INTRO,
  buildDefaultPendingDevNotice,
  buildDefaultPendingProductNotice,
} from '@/constants/marketDefectReportDetailCopy';
import { MarketDefectAnalysisReportHtmlPreview } from '@/components/MarketDefectAnalysisReportHtmlPreview';
import {
  MarketDefectSendMailModal,
  type MarketDefectSendMailFormValues,
} from '@/components/MarketDefectSendMailModal';
import { ReportBlocksGrid } from '@/components/MarketDefectReportCharts';
import { MARKET_DEFECT_ANALYSIS_REPORT_FIXED_TYPES } from '@/constants/marketDefectMockOptions';
import {
  buildListSnapshotFromAnalysisReportTask,
  computeDefectSummaryForHtmlReport,
  formatReportTimeRangeText,
} from '@/utils/analysisReportPreviewDataset';
import { buildReportBlocks, filterDefectsForReport, type BuiltReportBlock } from '@/utils/marketDefectReportDataset';
import {
  buildFallbackPreviewBlocks,
  mergeReportBlocksWithMockFallback,
} from '@/utils/marketDefectReportPreviewMockBlocks';
import {
  type TestImprovementTableRow,
  buildTestImprovementTableRows,
} from '@/utils/marketDefectTestImprovementRows';
import {
  buildMarketDefectReportExportHtml,
  downloadMarketDefectReportWordFile,
} from '@/utils/marketDefectReportExportHtml';

const REPORT_DATA_NOTE =
  '注：统计报表的数据来源于列表页面的检索结果，生成统计报表前请先在列表页面进行检索。比如列表页面我们检索的是未关闭 Bug，那么报表就是基于之前检索的未关闭 Bug 的结果集进行统计。';

const CHART_SECTION_TITLE: CSSProperties = {
  background: '#10239e',
  color: '#fff',
  fontWeight: 600,
  fontSize: 15,
  padding: '8px 12px',
  marginTop: 8,
  marginBottom: 0,
};

const CHART_SCROLL: CSSProperties = {
  maxHeight: 'calc(100vh - 220px)',
  overflowY: 'auto',
  paddingRight: 4,
  marginTop: 12,
};

type Summary = ReturnType<typeof computeDefectSummaryForHtmlReport>;

type ReportDraft = {
  testBugTotal: string;
  commonIssuesIntro: string;
  pendingProductNotice: string;
  pendingDevNotice: string;
  improveRows: TestImprovementTableRow[];
};

function buildInitialDraft(base: AnalysisReportTask, filtered: MarketDefect[], summary: Summary): ReportDraft {
  return {
    testBugTotal: String(summary.testBugTotal),
    commonIssuesIntro: MARKET_DEFECT_REPORT_COMMON_ISSUES_INTRO,
    pendingProductNotice: buildDefaultPendingProductNotice(base, summary.pendingProduct),
    pendingDevNotice: buildDefaultPendingDevNotice(base, summary.pendingDev),
    improveRows: buildTestImprovementTableRows(filtered),
  };
}

function MarketDefectReportDetailBody({
  base,
  filtered,
  summary,
  blocks,
}: {
  base: AnalysisReportTask;
  filtered: MarketDefect[];
  summary: Summary;
  blocks: BuiltReportBlock[];
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ReportDraft>(() => buildInitialDraft(base, filtered, summary));
  const [isEditing, setIsEditing] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const timeText = useMemo(() => formatReportTimeRangeText(base), [base]);

  const goBack = () => navigate(`${ROUTES.TOOLS_MARKET_DEFECTS}?tab=analysis`);

  const handleExport = () => {
    const html = buildMarketDefectReportExportHtml({
      task: base,
      timeText,
      defectRows: summary.defectRows,
      testBugTotalDisplay: draft.testBugTotal,
      totalMarketDefects: summary.totalMarketDefects,
      totalEffectiveMarket: summary.totalEffectiveMarket,
      pendingProductNotice: draft.pendingProductNotice,
      pendingDevNotice: draft.pendingDevNotice,
      commonIssuesIntro: draft.commonIssuesIntro,
      improveRows: draft.improveRows,
      blocks,
    });
    downloadMarketDefectReportWordFile(html, `报告-${base.reportName}`);
    message.success('已开始下载 Word（.doc）');
  };

  const openEmailModal = () => setEmailOpen(true);

  const handleConfirmSendMail = async (_values: MarketDefectSendMailFormValues) => {
    message.success('邮件已发送（Mock）');
    setEmailOpen(false);
  };

  return (
    <>
      <Card
        size="small"
        title={
          <Space align="center" size={12}>
            <Button onClick={goBack}>返回</Button>
            <Typography.Text strong style={{ fontSize: 16 }}>
              报告详情-{base.reportName}
            </Typography.Text>
          </Space>
        }
        extra={
          <Space wrap>
            <Button onClick={handleExport}>导出</Button>
            <Button
              type={isEditing ? 'primary' : 'default'}
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                  message.success('已保存');
                } else {
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? '保存' : '编辑'}
            </Button>
            <Button onClick={openEmailModal}>发送邮件</Button>
          </Space>
        }
      >
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          {isEditing ? '报告编辑' : '报告预览'}
        </Typography.Title>
        <MarketDefectAnalysisReportHtmlPreview
          task={base}
          summary={summary}
          editable={isEditing}
          testBugTotalDisplay={draft.testBugTotal}
          onTestBugTotalDisplayChange={(v) => setDraft((d) => ({ ...d, testBugTotal: v }))}
          commonIssuesIntroText={draft.commonIssuesIntro}
          onCommonIssuesIntroTextChange={(v) => setDraft((d) => ({ ...d, commonIssuesIntro: v }))}
          improveRows={draft.improveRows}
          onImproveRowsChange={(rows) => setDraft((d) => ({ ...d, improveRows: rows }))}
          pendingProductNoticeText={draft.pendingProductNotice}
          onPendingProductNoticeTextChange={(v) => setDraft((d) => ({ ...d, pendingProductNotice: v }))}
          pendingDevNoticeText={draft.pendingDevNotice}
          onPendingDevNoticeTextChange={(v) => setDraft((d) => ({ ...d, pendingDevNotice: v }))}
        />

        <div style={CHART_SECTION_TITLE}>缺陷数据分布图</div>
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
          计数项：缺陷 ID
        </Typography.Text>
        <Alert type="info" showIcon message={REPORT_DATA_NOTE} style={{ marginTop: 8, marginBottom: 0 }} />
        <div style={CHART_SCROLL}>
          <ReportBlocksGrid blocks={blocks} />
        </div>
      </Card>

      <MarketDefectSendMailModal
        open={emailOpen}
        contextText={`报告：${base.reportName}`}
        defaultTeamName={base.teamName}
        onCancel={() => setEmailOpen(false)}
        onConfirmSend={handleConfirmSendMail}
      />
    </>
  );
}

export function MarketDefectReportDetailPage() {
  const { reportId = '' } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const base = useMemo(
    () => mockAnalysisReportTasks.find((t) => t.reportId === reportId),
    [reportId],
  );

  const { filtered, blocks, summary } = useMemo(() => {
    if (!base) {
      return { filtered: [] as MarketDefect[], blocks: [] as BuiltReportBlock[], summary: null as Summary | null };
    }
    const snap = buildListSnapshotFromAnalysisReportTask(base);
    const filtered = filterDefectsForReport(mockMarketDefects, snap, '全部', '全部');
    const rawBlocks = buildReportBlocks(filtered, [...MARKET_DEFECT_ANALYSIS_REPORT_FIXED_TYPES]);
    const merged = mergeReportBlocksWithMockFallback(rawBlocks);
    const blocks = merged.length > 0 ? merged : buildFallbackPreviewBlocks();
    const summary = computeDefectSummaryForHtmlReport(filtered);
    return { filtered, blocks, summary };
  }, [base]);

  if (!base || !summary) {
    return (
      <Card
        size="small"
        title={
          <Space align="center" size={12}>
            <Button onClick={() => navigate(`${ROUTES.TOOLS_MARKET_DEFECTS}?tab=analysis`)}>返回</Button>
            <Typography.Text strong style={{ fontSize: 16 }}>
              报告详情
            </Typography.Text>
          </Space>
        }
      >
        <Typography.Text type="danger">未找到报告 ID：{reportId}</Typography.Text>
      </Card>
    );
  }

  return (
    <MarketDefectReportDetailBody
      key={reportId}
      base={base}
      filtered={filtered}
      summary={summary}
      blocks={blocks}
    />
  );
}
