/**
 * 路由常量（与 docs/spec/01-信息架构与路由.md 对齐）
 */
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  /** 项目管理（页面 2） */
  AUTOMATION_PROJECTS: '/automation/projects',
  /** 平台自动化（自动化应用） */
  APPLICATION_PLATFORM: '/application/platform',
  /** 平台自动化任务详情（自动化应用） */
  APPLICATION_PLATFORM_TASK_DETAIL: '/application/platform/tasks',
  /** 设备自动化（自动化应用） */
  APPLICATION_DEVICE: '/application/device',
  /** 基础数据（页面 1） */
  SETTINGS_BASIC: '/settings/basic',
  /** 计划管理（页面 13） */
  PTSW_PLANS: '/ptsw/plans',
  /** 履历表管理（页面 15） */
  PTSW_RESUME: '/ptsw/resume',
} as const;

/** 项目详情（页面 3） */
export function projectDetailPath(projectId: string): string {
  return `${ROUTES.AUTOMATION_PROJECTS}/${projectId}`;
}

/** 版本详情（页面 3-1） */
export function versionDetailPath(projectId: string, versionId: string): string {
  return `${projectDetailPath(projectId)}/versions/${versionId}`;
}

/** 平台自动化任务详情（页面 12-1） */
export function platformAutomationTaskDetailPath(taskId: string | number): string {
  return `${ROUTES.APPLICATION_PLATFORM_TASK_DETAIL}/${taskId}`;
}

export type VersionDevSegment =
  | 'cases'
  | 'variables'
  | 'files'
  | 'functions'
  | 'tags'
  | 'runs';

/** 版本用例开发 - 新窗口路由前缀 */
export function versionDevBasePath(projectId: string, versionId: string): string {
  return `/version-dev/${projectId}/${versionId}`;
}

export function versionDevPath(
  projectId: string,
  versionId: string,
  segment: VersionDevSegment
): string {
  return `${versionDevBasePath(projectId, versionId)}/${segment}`;
}

/** 任务详情（页面 10） */
export function versionDevRunDetailPath(
  projectId: string,
  versionId: string,
  runId: string
): string {
  return `${versionDevBasePath(projectId, versionId)}/runs/${runId}`;
}

/** 计划详情（页面 14） */
export function productionPlanDetailPath(planId: string): string {
  return `${ROUTES.PTSW_PLANS}/${planId}`;
}

/** 打开新窗口进入用例管理（示例，供项目详情页调用） */
export function openVersionDevCasesWindow(
  projectId: string,
  versionId: string,
  labels?: { projectName?: string; versionName?: string }
): void {
  const path = versionDevPath(projectId, versionId, 'cases');
  const q = labels
    ? new URLSearchParams({
        pn: labels.projectName ?? '',
        vn: labels.versionName ?? '',
      }).toString()
    : '';
  const url = `${window.location.origin}${path}${q ? `?${q}` : ''}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
