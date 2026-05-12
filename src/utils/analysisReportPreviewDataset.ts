import type { AnalysisReportTask, MarketDefect, MarketDefectListSnapshot } from '@/types';

/** 从分析报告任务构造列表快照，供 `filterDefectsForReport` 与报表块生成使用 */
export function buildListSnapshotFromAnalysisReportTask(task: AnalysisReportTask): MarketDefectListSnapshot {
  return {
    filters: {
      year: task.scopeYear ?? '全部',
      quarter: task.scopeQuarter ?? '全部',
      month: task.scopeMonth ?? '全部',
      valid: '全部',
      actualTeam: task.scopeActualTeam ?? '全部',
      mainResponsibilityAttribution: '全部',
    },
    search: { text: '' },
    page: 1,
    pageSize: 500,
    updatedAt: new Date().toISOString(),
  };
}

export type DefectHtmlSummaryRow = {
  key: string;
  label: string;
  beta: number | string;
  prod: number | string;
  sys: number | string;
  market: number | string;
};

function bySource(rows: MarketDefect[], source: string): MarketDefect[] {
  return rows.filter((r) => r.defectSource === source);
}

/** 各来源下「主要责任方为测试」的数量（与图 1 PS 对照展示） */
function effectiveTestCount(rows: MarketDefect[]): number {
  return rows.filter((r) => r.mainResponsibilityAttribution === '测试').length;
}

export function computeDefectSummaryForHtmlReport(rows: MarketDefect[]) {
  const beta = bySource(rows, 'beta-bug');
  const prod = bySource(rows, '生产反馈');
  const sys = bySource(rows, '系统验证');
  const market = bySource(rows, '市场缺陷');

  const betaC = beta.length;
  const prodC = prod.length;
  const sysC = sys.length;
  const marketC = market.length;

  const testBugTotal = rows.length > 0 ? rows.length : betaC + prodC + sysC + marketC;

  const leak = (n: number) =>
    testBugTotal > 0 ? `${((n / testBugTotal) * 100).toFixed(2)}%` : '—';

  const defectRows: DefectHtmlSummaryRow[] = [
    { key: 'cnt', label: '缺陷数', beta: betaC, prod: prodC, sys: sysC, market: marketC },
    {
      key: 'eff',
      label: '有效数',
      beta: effectiveTestCount(beta),
      prod: effectiveTestCount(prod),
      sys: effectiveTestCount(sys),
      market: effectiveTestCount(market),
    },
    { key: 'leak', label: '泄漏率', beta: leak(betaC), prod: leak(prodC), sys: leak(sysC), market: leak(marketC) },
  ];

  const totalMarketDefects = marketC;
  const totalEffectiveMarket = effectiveTestCount(market);

  const pendingProduct = rows.filter((r) => r.mainResponsibilityAttribution === '产品').length;
  const pendingDev = rows.filter((r) => r.mainResponsibilityAttribution === '开发').length;

  return {
    testBugTotal,
    totalMarketDefects,
    totalEffectiveMarket,
    defectRows,
    pendingProduct,
    pendingDev,
  };
}

export function formatReportTimeRangeText(task: AnalysisReportTask): string {
  const stripped = task.timeRange?.replace(/\s*·\s*RDMS[\s\S]*$/, '').trim() ?? '';
  if (stripped && !(task.scopeYear || task.scopeQuarter || task.scopeMonth)) {
    return stripped;
  }
  const y = task.scopeYear && task.scopeYear !== '全部' ? `${task.scopeYear}年` : task.scopeYear === '全部' ? '全部(年)' : '';
  const q = task.scopeQuarter ? (task.scopeQuarter === '全部' ? '全部(季)' : task.scopeQuarter) : '';
  const m = task.scopeMonth ? (task.scopeMonth === '全部' ? '全部(月)' : task.scopeMonth) : '';
  const joined = [y, q, m].filter(Boolean).join(' ');
  return joined || stripped || '—';
}
