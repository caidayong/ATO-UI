import type { MarketDefect } from '@/types';
import { mockMarketDefects } from '@/mocks/data';

export type TestImprovementTableRow = {
  key: string;
  item: string;
  measure: string;
  owner: string;
  planDate: string;
};

const PLAN_DATES = ['2026/3/30', '2026/4/15', '2026/5/30', '2026/6/30'];

/** 筛选结果无「测试」责任缺陷时的示例行（与图 1 改进表风格一致） */
const STATIC_TEST_IMPROVEMENT_FILLERS: TestImprovementTableRow[] = [
  {
    key: 'mock-tpl-1',
    item: '通信模组与定位模组版本由供应商提供不一致，导致定位漂移',
    measure:
      '1）与供应商对齐版本基线，形成《模组版本矩阵》并纳入准入评审；\n' +
      '2）在 RDMS 建立版本字段校验规则，发布前自动比对；\n' +
      '3）补充弱网+冷启动组合用例纳入回归。',
    owner: '陈晓青',
    planDate: '2026/3/30',
  },
  {
    key: 'mock-tpl-2',
    item: '夜间压测脚本调度缺失，导致性能回归覆盖不足',
    measure:
      '1）在 CI 增加夜间调度与失败告警；\n' +
      '2）梳理核心接口 SLA 与压测阈值；\n' +
      '3）对关键链路补充并发阶梯场景。',
    owner: '周九',
    planDate: '2026/4/15',
  },
  {
    key: 'mock-tpl-3',
    item: '视觉回归未覆盖支付结果弹窗多状态',
    measure:
      '1）补齐弹窗状态快照用例；\n' +
      '2）与产品确认文案/动效验收点；\n' +
      '3）纳入发布前必跑清单。',
    owner: '吴十',
    planDate: '2026/5/30',
  },
];

function mapDefectToRow(r: MarketDefect, index: number): TestImprovementTableRow {
  const m = r.improvementMeasure?.trim();
  const measure =
    m && m !== '—'
      ? m
      : `结合流出原因「${r.leakageReason || '—'}」由测试侧牵头补充改进措施（Mock）`;
  const title = r.title.length > 64 ? `${r.title.slice(0, 64)}…` : r.title;
  return {
    key: r.id,
    item: title,
    measure,
    owner: r.improvementOwner?.trim() || r.mainResponsiblePerson?.trim() || '—',
    planDate: PLAN_DATES[index % PLAN_DATES.length],
  };
}

/**
 * 「改进项-测试」表：优先取当前筛选集中「主要责任归属 = 测试」的缺陷措施；
 * 若为空则回退到全量 Mock 缺陷列表中的测试责任项；仍不足时拼接静态示例行。
 */
export function buildTestImprovementTableRows(filtered: MarketDefect[]): TestImprovementTableRow[] {
  const isTestResp = (r: MarketDefect) => r.mainResponsibilityAttribution === '测试';

  const fromPool = (pool: MarketDefect[]) => {
    const withMeasure = pool.filter(isTestResp).filter((r) => {
      const m = r.improvementMeasure?.trim();
      return Boolean(m && m !== '—');
    });
    const testOnly = pool.filter(isTestResp);
    const use = withMeasure.length > 0 ? withMeasure : testOnly;
    return use.slice(0, 8).map((r, i) => mapDefectToRow(r, i));
  };

  let rows = fromPool(filtered);
  if (rows.length === 0) {
    rows = fromPool(mockMarketDefects);
  }

  if (rows.length < 4) {
    const keys = new Set(rows.map((r) => r.key));
    for (const s of STATIC_TEST_IMPROVEMENT_FILLERS) {
      if (rows.length >= 6) break;
      if (!keys.has(s.key)) {
        rows.push(s);
        keys.add(s.key);
      }
    }
  }

  return rows.slice(0, 8);
}
