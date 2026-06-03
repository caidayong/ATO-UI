import type { TestPhase } from '@/types/projectReports';

/** 日报测试计划固定阶段（不含版本发布） */
export const DAILY_TEST_PLAN_PHASES: TestPhase[] = ['冒烟测试', 'SIT 测试', 'UAT 测试'];

export function getTestConclusionOptions(phase: string): { value: string; label: string }[] {
  if (phase === '冒烟测试') {
    return [
      { value: '自动化通过', label: '自动化通过' },
      { value: '冒烟通过', label: '冒烟通过' },
      { value: '冒烟未通过', label: '冒烟未通过' },
    ];
  }
  if (phase === 'SIT 测试' || phase === 'UAT 测试') {
    return [
      { value: '未开始', label: '未开始' },
      { value: '正常', label: '正常' },
      { value: '通过', label: '通过' },
      { value: '延期', label: '延期' },
      { value: '未通过', label: '未通过' },
    ];
  }
  return [];
}
