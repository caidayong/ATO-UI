/**
 * 路由常量（与 docs/spec/01-信息架构与路由.md 对齐）
 */
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  /** 项目管理（页面 2） */
  AUTOMATION_PROJECTS: '/automation/projects',
  /** 接口管理（自动化开发） */
  AUTOMATION_API_MANAGEMENT: '/automation/interface-management',
  /** 平台自动化（自动化应用） */
  APPLICATION_PLATFORM: '/application/platform',
  /** 平台自动化任务详情（自动化应用） */
  APPLICATION_PLATFORM_TASK_DETAIL: '/application/platform/tasks',
  /** 设备自动化（自动化应用） */
  APPLICATION_DEVICE: '/application/device',
  /** 资源管理（自动化开发） */
  AUTOMATION_RESOURCES: '/resources',
  /** 基础数据（页面 1） */
  SETTINGS_BASIC: '/settings/basic',
  /** 计划管理（页面 13） */
  PTSW_PLANS: '/ptsw/plans',
  /** 历史计划数据管理（计划管理子页） */
  PTSW_PLAN_HISTORY: '/ptsw/plans/history',
  /** 履历表管理（页面 15） */
  PTSW_RESUME: '/ptsw/resume',
  /** 测试工具 · 卡片入口（V1.0.1-P5） */
  TOOLS: '/tools',
  /** 测试工具 / 项目日&周报（V1.0.1-P6） */
  TOOLS_PROJECT_REPORTS: '/tools/project-reports',
  /** 测试工具 / 项目日&周报 / 数据统计（V1.0.1-P6） */
  TOOLS_PROJECT_REPORTS_STATISTICS: '/tools/project-reports/statistics',
  /** 测试工具 / 市场缺陷分析（V1.0.1-P5） */
  TOOLS_MARKET_DEFECTS: '/tools/market-defects',
  /** 测试工具 / 市场缺陷分析 / 报表（V1.0.1-P5） */
  TOOLS_MARKET_DEFECTS_REPORT: '/tools/market-defects/report',
  /** 需求文档中心（只读 Markdown） */
  DOCS: '/docs',
} as const;

/**
 * 市场缺陷列表 → 报表页：筛选 / 搜索快照（sessionStorage）
 * @see docs/spec/01-信息架构与路由.md §4
 */
export const MARKET_DEFECTS_LIST_SNAPSHOT_STORAGE_KEY =
  'ato:market-defects:list-snapshot' as const;

/** 测试工具 / 市场缺陷分析 / 报告详情（V1.0.1-P5） */
export function toolsMarketDefectReportDetailPath(reportId: string): string {
  return `${ROUTES.TOOLS_MARKET_DEFECTS}/reports/${encodeURIComponent(reportId)}`;
}

/** 测试工具 / 项目日&周报 / 日报详情（V1.0.1-P6） */
export function projectReportDetailPath(reportConfigId: string): string {
  return `${ROUTES.TOOLS_PROJECT_REPORTS}/${encodeURIComponent(reportConfigId)}`;
}

/** 资源管理 / 自动化环境详情 */
export function resourceEnvironmentDetailPath(envId: string): string {
  return `${ROUTES.AUTOMATION_RESOURCES}/environments/${encodeURIComponent(envId)}`;
}

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
  | 'suites'
  | 'runs';

/** 整机（设备）版本用例开发 - 侧栏 segment（与平台路由隔离，菜单可独立演进） */
export type DeviceVersionDevSegment =
  | 'cases'
  | 'variables'
  | 'files'
  | 'functions'
  | 'tags'
  | 'suites'
  | 'runs';

/** 版本用例开发 - 新窗口路由前缀（平台项目） */
export function versionDevBasePath(projectId: string, versionId: string): string {
  return `/version-dev/${projectId}/${versionId}`;
}

/** 整机版本用例开发 - 新窗口路由前缀（整机 / Robot Framework 项目） */
export function deviceVersionDevBasePath(projectId: string, versionId: string): string {
  return `/device-version-dev/${projectId}/${versionId}`;
}

export function versionDevPath(
  projectId: string,
  versionId: string,
  segment: VersionDevSegment
): string {
  return `${versionDevBasePath(projectId, versionId)}/${segment}`;
}

export function deviceVersionDevPath(
  projectId: string,
  versionId: string,
  segment: DeviceVersionDevSegment
): string {
  return `${deviceVersionDevBasePath(projectId, versionId)}/${segment}`;
}

/** 任务详情（页面 10） */
export function versionDevRunDetailPath(
  projectId: string,
  versionId: string,
  runId: string
): string {
  return `${versionDevBasePath(projectId, versionId)}/runs/${runId}`;
}

/** 整机 · 测试运行任务详情 */
export function deviceVersionDevRunDetailPath(
  projectId: string,
  versionId: string,
  runId: string
): string {
  return `${deviceVersionDevBasePath(projectId, versionId)}/runs/${runId}`;
}

/** 计划详情（页面 14） */
export function productionPlanDetailPath(planId: string): string {
  return `${ROUTES.PTSW_PLANS}/${planId}`;
}

/** 需求文档 · 版本列表 */
export function docsVersionPath(version: string): string {
  return `${ROUTES.DOCS}/${encodeURIComponent(version)}`;
}

/** 需求文档 · 阅读页 */
export function docsViewerPath(version: string, docSlug: string): string {
  return `${docsVersionPath(version)}/${encodeURIComponent(docSlug)}`;
}

/** 打开新窗口进入用例管理（平台项目） */
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

/** 打开新窗口进入整机用例管理（整机项目） */
export function openDeviceVersionDevCasesWindow(
  projectId: string,
  versionId: string,
  labels?: { projectName?: string; versionName?: string }
): void {
  const path = deviceVersionDevPath(projectId, versionId, 'cases');
  const q = labels
    ? new URLSearchParams({
        pn: labels.projectName ?? '',
        vn: labels.versionName ?? '',
      }).toString()
    : '';
  const url = `${window.location.origin}${path}${q ? `?${q}` : ''}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
