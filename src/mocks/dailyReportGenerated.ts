import dayjs from 'dayjs';
import type { DailyReportBody, DailyReportConfig, DailyTestPlanRow } from '@/types/projectReports';
import type { DailyGeneratedReport, DailyReportProgressRow } from '@/types/dailyReportGenerated';
import { DAILY_TEST_PLAN_PHASES } from '@/constants/dailyReport';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(iso?: string): string {
  return iso ? dayjs(iso).format('YYYY-MM-DD') : '—';
}

function calcSitDay(testPlan: DailyTestPlanRow[]): number {
  const sit = testPlan.find((r) => r.phase === 'SIT 测试');
  if (!sit?.startAt) return 1;
  const start = dayjs(sit.startAt).startOf('day');
  const today = dayjs().startOf('day');
  return Math.max(1, today.diff(start, 'day') + 1);
}

function buildProgressRows(config: DailyReportConfig): DailyReportProgressRow[] {
  const progressByPhase: Record<string, { pct: number; conclusion: string }> = {
    冒烟测试: { pct: 100, conclusion: '自动化通过' },
    'SIT 测试': { pct: 25, conclusion: '正常' },
    'UAT 测试': { pct: 0, conclusion: '未开始' },
  };

  return config.testPlan
    .filter((row) => DAILY_TEST_PLAN_PHASES.includes(row.phase))
    .map((row) => {
      const meta = progressByPhase[row.phase] ?? { pct: 0, conclusion: '—' };
      return {
        productName: config.productName,
        phase: row.phase,
        progressPercent: meta.pct,
        conclusion: meta.conclusion,
        startAt: formatDate(row.startAt),
        endAt: formatDate(row.endAt),
      };
    });
}

function mockForConfig(config: DailyReportConfig, body: DailyReportBody | null): DailyGeneratedReport {
  const sitDay = calcSitDay(config.testPlan);
  const overallPct = 25;
  const risksRaw = body?.risks?.trim();
  const risks = risksRaw && risksRaw !== '无' ? risksRaw.split('\n').filter(Boolean) : [];

  const mentionUser = config.testOwnerName ? `@${config.testOwnerName}` : undefined;
  const branchSuffix = config.branch ? `，分支「${config.branch}」` : '';

  return {
    generatedAt: body?.generatedAt ?? dayjs().toISOString(),
    productName: config.productName,
    projectVersion: config.projectVersion,
    branch: config.branch,
    sitDay,
    overallProgressPercent: overallPct,
    openingGreeting: '各位同事，大家好！',
    openingProgressText: `今日为项目「${config.productName}」版本「${config.projectVersion}」${branchSuffix} SIT 测试第 ${sitDay} 天，整体测试进度约为：${overallPct}%。`,
    summaryText: body?.progress?.trim()
      ? body.progress.trim()
      : '今日测试按计划推进，详见下方各章节数据。',
    mentionNote: mentionUser
      ? `请各位同事关注；${mentionUser} 请协助按优先级安排开发处理缺陷。`
      : '',
    mentionUser,
    progressRows: buildProgressRows(config),
    defectSummary: {
      cumulative: 65,
      newToday: 29,
      unclosed: 65,
      toVerify: 10,
      unresolved: 55,
      l1l2Unresolved: 0,
      postponed: 0,
    },
    caseSummary: {
      total: 1280,
      executed: 320,
      passed: 298,
      failed: 12,
      blocked: 10,
      execRate: '25.0%',
      passRate: '93.1%',
    },
    risks: risks.length ? risks : ['无'],
    l1l2Bugs: [],
    bugsByStatus: [
      { name: '激活', value: 55 },
      { name: '待验证', value: 10 },
    ],
    bugsBySeverity: [
      { name: '一般', value: 63 },
      { name: '提示', value: 2 },
    ],
  };
}

function ensureIntroFields(report: DailyGeneratedReport): DailyGeneratedReport {
  if (report.openingGreeting) return report;
  const branchSuffix = report.branch ? `，分支「${report.branch}」` : '';
  return {
    ...report,
    openingGreeting: '各位同事，大家好！',
    openingProgressText: `今日为项目「${report.productName}」版本「${report.projectVersion}」${branchSuffix} SIT 测试第 ${report.sitDay} 天，整体测试进度约为：${report.overallProgressPercent}%。`,
    mentionNote:
      report.mentionUser
        ? `请各位同事关注；${report.mentionUser} 请协助按优先级安排开发处理缺陷。`
        : '',
  };
}

const reportSnapshots = new Map<string, DailyGeneratedReport>();

export async function getGeneratedDailyReport(
  config: DailyReportConfig,
  body: DailyReportBody | null
): Promise<DailyGeneratedReport> {
  await delay(180);
  const saved = reportSnapshots.get(config.id);
  if (saved) return ensureIntroFields(saved);
  return ensureIntroFields(mockForConfig(config, body));
}

export async function saveGeneratedDailyReport(
  configId: string,
  report: DailyGeneratedReport
): Promise<DailyGeneratedReport> {
  await delay(200);
  const next: DailyGeneratedReport = {
    ...report,
    generatedAt: dayjs().toISOString(),
  };
  reportSnapshots.set(configId, next);
  return next;
}
