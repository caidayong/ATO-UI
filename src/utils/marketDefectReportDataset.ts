import { MARKET_DEFECT_REPORT_TYPE_OPTIONS } from '@/constants/marketDefectMockOptions';
import type { MarketDefect, MarketDefectListSnapshot } from '@/types';

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

/** 与列表页同一套过滤：快照时间 + 表头三筛 + 搜索；报表页「实际归属团队 / 是否有效」非「全部」时在对应维度上覆盖快照 */
export function filterDefectsForReport(
  rows: MarketDefect[],
  snap: MarketDefectListSnapshot | null,
  scopeTeam: string,
  scopeValid: string,
): MarketDefect[] {
  const year = snap?.filters.year ?? '全部';
  const quarter = snap?.filters.quarter ?? '全部';
  const month = snap?.filters.month ?? '全部';
  const validSnap = snap?.filters.valid ?? '全部';
  const teamSnap = snap?.filters.actualTeam ?? '全部';
  const mainResp = snap?.filters.mainResponsibilityAttribution ?? '全部';
  const searchText = snap?.search?.text?.trim() ?? '';

  const effValid = scopeValid !== '全部' ? scopeValid : validSnap;
  const effTeam = scopeTeam !== '全部' ? scopeTeam : teamSnap;

  return rows.filter((r) => {
    if (!rowMatchesTimeFilter(r.createdAt, year, quarter, month)) return false;
    if (effValid !== '全部' && r.validIssue !== effValid) return false;
    if (effTeam !== '全部' && r.actualTeam !== effTeam) return false;
    if (mainResp !== '全部' && r.mainResponsibilityAttribution !== mainResp) return false;
    if (searchText) {
      const k = searchText.toLowerCase();
      const blob = [
        r.id,
        r.defectSource,
        r.title,
        r.defectType,
        r.productLine,
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
}

export type ChartKind = 'pie' | 'bar';

export type ReportAggRow = { name: string; value: number };

function normLabel(v: string | undefined): string {
  const t = v?.trim();
  return t ? t : '（空）';
}

function countByField(rows: MarketDefect[], pick: (r: MarketDefect) => string): ReportAggRow[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = normLabel(pick(r));
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** 扇形过多时合并为「其他」 */
export function capAggRows(rows: ReportAggRow[], maxSlices = 8): ReportAggRow[] {
  if (rows.length <= maxSlices) return rows;
  const head = rows.slice(0, maxSlices - 1);
  const rest = rows.slice(maxSlices - 1);
  const other = rest.reduce((s, x) => s + x.value, 0);
  return [...head, { name: '其他', value: other }];
}

/** 各报表类型默认图表形态（产品约定） */
export const REPORT_TYPE_DEFAULT_CHART: Record<string, ChartKind> = {
  总缺陷数: 'pie',
  按是否有效: 'pie',
  按产品线: 'bar',
  按实际归属团队: 'bar',
  按缺陷类型: 'bar',
  按责任归属: 'pie',
  按流出原因: 'bar',
  按是否自动化覆盖: 'pie',
  按自动化未覆盖原因: 'bar',
  按自动化未发现原因: 'bar',
  按自动化不可覆盖原因: 'bar',
};

export type BuiltReportBlock = {
  typeLabel: string;
  chart: ChartKind;
  /** 总缺陷数饼图按产品线构成展示「总数」分布 */
  subtitle?: string;
  rows: ReportAggRow[];
  totalCount: number;
};

export function buildReportBlocks(filtered: MarketDefect[], selectedTypes: string[]): BuiltReportBlock[] {
  const totalCount = filtered.length;
  const blocks: BuiltReportBlock[] = [];
  /** 与左侧 Checkbox 列表顺序一致（不随勾选先后变化） */
  const canon = MARKET_DEFECT_REPORT_TYPE_OPTIONS as readonly string[];
  const orderedLabels = canon.filter((label) => selectedTypes.includes(label));
  const extras = selectedTypes.filter((t) => !canon.includes(t));

  for (const typeLabel of [...orderedLabels, ...extras]) {
    const chart = REPORT_TYPE_DEFAULT_CHART[typeLabel];
    if (!chart) continue;

    let rows: ReportAggRow[];
    let subtitle: string | undefined;

    switch (typeLabel) {
      case '总缺陷数':
        rows = capAggRows(countByField(filtered, (r) => r.productLine));
        subtitle = '按产品线构成（总缺陷数分布）';
        break;
      case '按是否有效':
        rows = capAggRows(countByField(filtered, (r) => r.validIssue));
        break;
      case '按产品线':
        rows = capAggRows(countByField(filtered, (r) => r.productLine));
        break;
      case '按实际归属团队':
        rows = capAggRows(countByField(filtered, (r) => r.actualTeam));
        break;
      case '按缺陷类型':
        rows = capAggRows(countByField(filtered, (r) => r.defectType));
        break;
      case '按责任归属':
        rows = capAggRows(countByField(filtered, (r) => r.mainResponsibilityAttribution));
        break;
      case '按流出原因':
        rows = capAggRows(countByField(filtered, (r) => r.leakageReason));
        break;
      case '按是否自动化覆盖':
        rows = capAggRows(countByField(filtered, (r) => r.autoCovered));
        break;
      case '按自动化未覆盖原因':
        rows = capAggRows(countByField(filtered, (r) => r.uncoveredReason));
        break;
      case '按自动化未发现原因':
        rows = capAggRows(countByField(filtered, (r) => r.autoMissReason));
        break;
      case '按自动化不可覆盖原因':
        rows = capAggRows(
          countByField(
            filtered.filter((r) => r.canCover === '否'),
            (r) => r.uncoveredReason,
          ),
        );
        break;
      default:
        continue;
    }

    blocks.push({ typeLabel, chart, subtitle, rows, totalCount });
  }

  return blocks;
}
