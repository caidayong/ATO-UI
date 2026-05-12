import { MARKET_DEFECT_ANALYSIS_REPORT_FIXED_TYPES } from '@/constants/marketDefectMockOptions';
import type { BuiltReportBlock } from '@/utils/marketDefectReportDataset';
import { buildReportBlocks } from '@/utils/marketDefectReportDataset';
import { mockMarketDefects } from '@/mocks/data';

/** 预览用：与图 2 接近的演示总量 */
const MOCK_PREVIEW_TOTAL = 1007;

type Row = { name: string; value: number };

const MOCK_ROWS_BY_TYPE: Record<string, { rows: Row[]; subtitle?: string }> = {
  总缺陷数: {
    subtitle: '按产品线构成（总缺陷数分布）',
    rows: [
      { name: '国内货运', value: 268 },
      { name: '出租', value: 195 },
      { name: '公交', value: 142 },
      { name: '创新工业', value: 128 },
      { name: '海外货运', value: 96 },
      { name: '轨交', value: 88 },
      { name: '其他', value: 90 },
    ],
  },
  按是否有效: {
    rows: [
      { name: '是', value: 510 },
      { name: '否', value: 497 },
    ],
  },
  按实际归属团队: {
    rows: [
      { name: 'S17', value: 168 },
      { name: '中台', value: 156 },
      { name: 'FT', value: 142 },
      { name: '出租', value: 128 },
      { name: '校车', value: 115 },
      { name: '公交', value: 102 },
      { name: '前装', value: 96 },
    ],
  },
  按缺陷类型: {
    rows: [
      { name: '功能问题', value: 122 },
      { name: '性能问题', value: 98 },
      { name: '兼容问题', value: 76 },
      { name: '安全问题', value: 65 },
      { name: '需求问题', value: 54 },
      { name: '重复问题', value: 38 },
    ],
  },
  按责任归属: {
    rows: [
      { name: '测试', value: 412 },
      { name: '开发', value: 314 },
      { name: '产品', value: 189 },
      { name: '运维', value: 92 },
    ],
  },
  按流出原因: {
    rows: [
      { name: '用例设计缺失或错误', value: 156 },
      { name: '设计实现缺失或错误', value: 134 },
      { name: '需求导入缺失或错误', value: 112 },
      { name: '验证方案缺失或错误', value: 98 },
      { name: '环境配置问题', value: 76 },
      { name: '其他', value: 431 },
    ],
  },
  按是否自动化覆盖: {
    rows: [
      { name: '是', value: 602 },
      { name: '否', value: 405 },
    ],
  },
  按自动化未覆盖原因: {
    rows: [
      { name: '—', value: 210 },
      { name: '现网证书链差异不可在测试环境完全模拟', value: 88 },
      { name: '历史版本字段与现网不一致', value: 64 },
      { name: '无', value: 43 },
    ],
  },
  按自动化未发现原因: {
    rows: [
      { name: '脚本未调度夜间压测', value: 95 },
      { name: '视觉回归未包含该弹窗状态', value: 82 },
      { name: '安全扫描规则未覆盖该接口', value: 71 },
      { name: '—', value: 157 },
    ],
  },
  按自动化不可覆盖原因: {
    rows: [
      { name: '现网证书链差异不可在测试环境完全模拟', value: 56 },
      { name: '历史版本字段与现网不一致', value: 41 },
      { name: '—', value: 33 },
    ],
  },
};

/** 当某统计维度无数据或全为 0 时，用 Mock 行替换，避免图表区空白 */
export function mergeReportBlocksWithMockFallback(blocks: BuiltReportBlock[]): BuiltReportBlock[] {
  return blocks.map((b) => {
    const sum = b.rows.reduce((s, r) => s + r.value, 0);
    if (sum > 0) return b;
    const m = MOCK_ROWS_BY_TYPE[b.typeLabel];
    if (!m) return b;
    return {
      ...b,
      rows: m.rows,
      subtitle: m.subtitle ?? b.subtitle,
      totalCount: MOCK_PREVIEW_TOTAL,
    };
  });
}

/** 在筛选结果为空等极端情况下，仍生成与固定报表类型一致的块列表 */
export function buildFallbackPreviewBlocks(): BuiltReportBlock[] {
  const seed = mockMarketDefects.slice(0, 3);
  const base = buildReportBlocks(seed, [...MARKET_DEFECT_ANALYSIS_REPORT_FIXED_TYPES]);
  return mergeReportBlocksWithMockFallback(base);
}
