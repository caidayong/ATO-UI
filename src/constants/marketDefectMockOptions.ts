/**
 * 市场缺陷列表 Mock 与筛选下拉可选项（V1.0.1-P5）
 */

export const MARKET_DEFECT_SOURCE_OPTIONS = ['市场缺陷', '生产反馈', '系统验证', 'beta-bug'] as const;

export const MARKET_DEFECT_TYPE_OPTIONS = [
  '功能问题',
  '性能问题',
  '兼容问题',
  '安全问题',
  '需求问题',
  '重复问题',
] as const;

/** 与「基础数据」团队管理 `mockTeams.name` 一致（实际团队 Mock） */
export const MARKET_DEFECT_ACTUAL_TEAM_OPTIONS = [
  'S17',
  '中台',
  'FT',
  '出租',
  '校车',
  '公交',
  '前装',
] as const;

export const MARKET_DEFECT_PRODUCT_LINE_OPTIONS = [
  '出租',
  '创新工业',
  '公交',
  '轨交',
  '国内货运',
  '海外货运',
] as const;

/** 缺陷归属团队（新增只读列筛选项） */
export const MARKET_DEFECT_DEFECT_OWNER_TEAM_OPTIONS = [
  '中台',
  '业务软件部-出租组',
  '业务软件部-海外货运组',
  '业务软件部-公交组',
  'S17',
  '产品研发中心-整机硬件与结构部',
  '客户端问题',
] as const;

export const MARKET_DEFECT_MAIN_RESP_ATTRIBUTION_OPTIONS = ['产品', '开发', '测试', '运维'] as const;

export const MARKET_DEFECT_LEAKAGE_REASON_OPTIONS = [
  '需求导入缺失或错误',
  '设计实现缺失或错误',
  '用例设计缺失或错误',
  '验证方案缺失或错误',
  '环境配置问题',
  '产品使用问题',
  '升级部署执行异常',
] as const;

/** 是 / 否（是否有效问题、自动化是否覆盖、是否可覆盖） */
export const MARKET_DEFECT_YES_NO_OPTIONS = ['是', '否'] as const;

/** 主要责任人 / 优化责任人（列表格与 Mock 对齐） */
export const MARKET_DEFECT_OWNER_PERSON_OPTIONS = [
  '张三',
  '李四',
  '王五',
  '赵六',
  '钱七',
  '孙八',
  '周九',
  '吴十',
] as const;

/** 不可覆盖原因（下拉 Mock） */
export const MARKET_DEFECT_UNCOVERED_REASON_OPTIONS = [
  '—',
  '无',
  '现网证书链差异不可在测试环境完全模拟',
  '历史版本字段与现网不一致',
] as const;

/** 自动化未发现原因（下拉 Mock） */
export const MARKET_DEFECT_AUTO_MISS_REASON_OPTIONS = [
  '—',
  '无',
  '脚本未调度夜间压测',
  '视觉回归未包含该弹窗状态',
  '安全扫描规则未覆盖该接口',
  '未覆盖弱网双击提交',
  '实车路测样本不足',
] as const;

export function selectWithAll(values: readonly string[]) {
  return ['全部', ...values].map((v) => ({ value: v, label: v }));
}

export function selectOptions(values: readonly string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

/** 与列表页「创建日期」筛选一致：年 / 季 / 月（含「全部」），用于分析报告创建弹窗「数据范围」 */
export const MARKET_DEFECT_DATA_RANGE_YEAR_OPTIONS = ['全部', '2024', '2025', '2026', '2027', '2028'].map((v) =>
  v === '全部' ? { value: v, label: v } : { value: v, label: `${v}年` },
);
export const MARKET_DEFECT_DATA_RANGE_QUARTER_OPTIONS = ['全部', 'Q1', 'Q2', 'Q3', 'Q4'].map((v) => ({
  value: v,
  label: v,
}));

/**
 * 按「季度」联动月份可选值：季度为「全部」时 1～12 月；否则仅该季三个月（均含「全部」）。
 * 市场缺陷列表时间筛选与「创建缺陷分析报告」数据范围共用。
 */
export function getMarketDefectDataRangeMonthOptionsByQuarter(quarter: string): { value: string; label: string }[] {
  const allOption = { value: '全部', label: '全部' };
  if (quarter === '全部') {
    return [allOption, ...Array.from({ length: 12 }, (_, i) => ({ value: `${i + 1}月`, label: `${i + 1}月` }))];
  }
  const quarterMonthMap: Record<string, number[]> = {
    Q1: [1, 2, 3],
    Q2: [4, 5, 6],
    Q3: [7, 8, 9],
    Q4: [10, 11, 12],
  };
  const months = quarterMonthMap[quarter] ?? [];
  return [allOption, ...months.map((m) => ({ value: `${m}月`, label: `${m}月` }))];
}

/** 季度为「全部」时的完整月份列表（与其它入口调用 {@link getMarketDefectDataRangeMonthOptionsByQuarter}('全部') 等价） */
export const MARKET_DEFECT_DATA_RANGE_MONTH_OPTIONS = getMarketDefectDataRangeMonthOptionsByQuarter('全部');

/** RDMS 产品 ID（Mock，多选） */
export const MARKET_DEFECT_RDMS_PRODUCT_ID_OPTIONS = [
  'RDMS-P-782301',
  'RDMS-P-901122',
  'RDMS-P-334455',
  'RDMS-P-556677',
  'RDMS-P-889900',
] as const;

/**
 * REQ-V1.0.1-P5-030「市场缺陷数据统计及报表展示」— 报表类型枚举
 * @see docs/prd/V1.0.1-P5/ATO_V1.0.1-P5迭代需求清单.md §3 表格该行「需求说明」全文
 */
export const MARKET_DEFECT_REPORT_TYPE_OPTIONS = [
  '总缺陷数',
  '按是否有效',
  '按产品线',
  '按实际归属团队',
  '按缺陷类型',
  '按责任归属',
  '按流出原因',
  '按是否自动化覆盖',
  '按自动化未覆盖原因',
  '按自动化未发现原因',
  '按自动化不可覆盖原因',
] as const;

/**
 * 「缺陷分析报告」由后台固定的统计维度（创建弹窗不再展示勾选；与报表页部分维度重合）。
 */
export const MARKET_DEFECT_ANALYSIS_REPORT_FIXED_TYPES = [
  '总缺陷数',
  '按是否有效',
  '按缺陷类型',
  '按责任归属',
  '按流出原因',
  '按是否自动化覆盖',
  '按自动化未覆盖原因',
  '按自动化未发现原因',
  '按自动化不可覆盖原因',
] as const satisfies Readonly<Array<(typeof MARKET_DEFECT_REPORT_TYPE_OPTIONS)[number]>>;
