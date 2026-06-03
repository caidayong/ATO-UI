import dayjs from 'dayjs';
import type { DailyProjectStatus, DailyReportConfig } from '@/types/projectReports';

/** 以 UAT 结束时间作为版本收尾节点（测试计划已移除「版本发布」行） */
const COMPLETE_PHASE = 'UAT 测试' as const;

/** 项目状态选项（日报配置） */
export const DAILY_PROJECT_STATUS_OPTIONS: { value: DailyProjectStatus; label: string }[] = [
  { value: '正常', label: '正常' },
  { value: '已完成', label: '已完成' },
  { value: '延期', label: '延期' },
  { value: '暂停', label: '暂停' },
];

function normalizeStoredStatus(status: string): DailyProjectStatus {
  if (status === '已发布') return '已完成';
  if (status === '正常' || status === '已完成' || status === '延期' || status === '暂停') {
    return status;
  }
  return '正常';
}

/** UAT 阶段结束时间已过则自动为「已完成」 */
export function resolveDailyProjectStatus(
  config: Pick<DailyReportConfig, 'projectStatus' | 'testPlan'>
): DailyProjectStatus {
  const uat = config.testPlan.find((r) => r.phase === COMPLETE_PHASE);
  if (uat?.endAt && dayjs().isAfter(dayjs(uat.endAt))) {
    return '已完成';
  }
  return normalizeStoredStatus(config.projectStatus);
}

export function applyAutoProjectStatus<T extends DailyReportConfig>(config: T): T {
  const projectStatus = resolveDailyProjectStatus(config);
  if (projectStatus === config.projectStatus) return config;
  return { ...config, projectStatus };
}
