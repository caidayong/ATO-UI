/**
 * ATO UI Design Token（间距、布局常量）
 * @see docs/spec/03-组件规范.md
 * @see .cursor/skills/ato-ui-develop/references/token-cheatsheet.md
 */

/** 垂直/水平间距阶梯（8pt 体系子集） */
export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
} as const;

/** 列表页外层最小高度（MainLayout Content 含 24px 上下 padding 时使用） */
export const PAGE_MIN_HEIGHT = 'calc(100vh - 140px)';

/** 全 bleed 页高度（margin:-24 抵消 Content padding 时，仅需减去顶栏 64px） */
export const PAGE_BLEED_HEIGHT = 'calc(100vh - 64px)';

/** 筛选区控件宽度 */
export const FILTER_CONTROL_WIDTH = {
  select: 140,
  search: 260,
  searchWide: 320,
} as const;

/** PRD 主色，与 App.tsx ConfigProvider 一致 */
export const COLOR_PRIMARY = '#1677FF';
