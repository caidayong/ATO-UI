import type { AnalysisReportTask } from '@/types';

/** 报告详情页「共性问题改进措施」说明段默认文案（与 HTML 预览一致） */
export const MARKET_DEFECT_REPORT_COMMON_ISSUES_INTRO =
  '改进项、改进措施需符合 SMART 原则。下表优先取当前数据范围内「主要责任归属 = 测试」的缺陷之「改进措施」等信息；不足时回退全量 Mock 列表并补充示例行（Mock）。';

/** 黄色提示条「待产品分析问题」默认全文 */
export function buildDefaultPendingProductNotice(task: AnalysisReportTask, pendingProduct: number): string {
  return `待产品分析问题数：@${task.productOwner || '产品负责人'}，共 ${pendingProduct} 条，请产品侧评审并输出改进计划（Mock）。`;
}

/** 黄色提示条「待开发分析问题」默认全文 */
export function buildDefaultPendingDevNotice(task: AnalysisReportTask, pendingDev: number): string {
  return `待开发分析问题数：@${task.devOwner || '开发负责人'}，共 ${pendingDev} 条，请开发侧评审（Mock）。`;
}
