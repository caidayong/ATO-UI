// 项目类型定义

export interface Team {
  id: string;
  name: string;
  memberCount: number;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  autoType: '接口自动化' | 'UI自动化';
  team: string;
  projectType: '平台项目' | '整机项目';
  region?: '深圳' | '重庆' | '成都';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersion {
  id: string;
  version: string;
  projectId: string;
  projectName?: string;
  inheritVersion?: string;
  owner: string;
  startTime?: string;
  planReleaseDate: string;
  actualReleaseDate?: string | null;
  status: '未发布' | '已发布' | '已召回';
  caseCount: number;
  coverage: number;
  successRate: number;
  createdAt: string;
  releaseNotes?: {
    newFeatures: string;
    cautions: string;
  } | null;
}

export type CaseResult = '通过' | '失败' | '警告' | '未运行';
export type TaskStatus = '排队中' | '运行中' | '已完成' | '已停止' | '失败';
export type PlatformTaskTriggerType = '手动触发' | '定时触发' | '周期触发';
export type PlatformEnvTab = 'test' | 'dev';
export type PlatformSendMailPolicy = '总是发送' | '成功后发送' | '不发送';
export type ProductionPlanStatus = '匹配中' | '匹配失败' | '待确认' | '已提交';
export type PlanChangeType = 'software_update' | 'software_offline';
export type PlanApprovalStatus = '待审批' | '已通过' | '已驳回';
export type BurnFlag = '是' | '否';
export type BurnStage = '贴片前烧录' | '贴片后烧录';

/** 用例所属目录（模块）节点 */
export interface CaseModule {
  id: string;
  versionId: string;
  parentId: string | null;
  name: string;
  /** 同级排序号（越小越靠前） */
  sort: number;
}

/** 自动化用例（与 docs/spec/02-数据模型.md 对齐） */
export interface TestCase {
  id: string;
  versionId: string;
  moduleId: string;
  name: string;
  tags: string[];
  result: CaseResult;
  status: string;
  updatedAt: string;
}

/** 用例步骤类型（与用例管理页 STEP_TYPES 一致） */
export const CASE_STEP_TYPES = [
  '接口请求',
  '自定义接口请求',
  '调用函数',
  '数据库操作',
  'if判断',
  'for循环',
  '等待',
] as const;
export type CaseStepType = (typeof CASE_STEP_TYPES)[number];

/** 用例步骤（简版，占位 editable） */
export interface CaseStep {
  id: string;
  caseId: string;
  order: number;
  title: string;
  detail: string;
  /** Mock/持久化：步骤类型，缺省由前端视为「接口请求」 */
  stepType?: CaseStepType;
}

/** 平台自动化任务（页面 12） */
export interface PlatformAutomationTask {
  taskId: number;
  taskName: string;
  version: string;
  envTab: PlatformEnvTab;
  teamId: string;
  createdBy: string;
  createdAt: string;
  triggeredAt: string;
  durationText: string;
  triggerType: PlatformTaskTriggerType;
  caseCount: number;
  passRateText: string;
  progressText: string;
  status: TaskStatus;
}

export interface PlatformTaskDetailBasicInfo {
  taskId: number;
  version: string;
  projectName: string;
  status: TaskStatus;
  createdAt: string;
  triggerType: PlatformTaskTriggerType;
  sendMailPolicy: PlatformSendMailPolicy;
}

export interface PlatformTaskDetailConfigInfo {
  runEnv: string;
  threadCount?: number;
  retryCount: number;
  durationText: string;
  runScopeText: string;
}

export interface PlatformTaskDetailStats {
  caseCount: number;
  runCaseCount: number;
  totalRunTimes: number;
  coverageRateText: string;
  passRateText: string;
  durationText: string;
}

export interface PlatformAutomationTaskDetail {
  taskId: number;
  basicInfo: PlatformTaskDetailBasicInfo;
  configInfo: PlatformTaskDetailConfigInfo;
  runStats: PlatformTaskDetailStats;
}

/** 产测计划（页面 13） */
export interface ProductionPlan {
  id: string;
  planName: string;
  week: string;
  status: ProductionPlanStatus;
  changeCount: number;
  createdAt: string;
  submittedAt?: string;
  changedAt?: string;
  creator: string;
}

/** 软件烧录表行（页面 14 Tab1） */
export interface BurnRow {
  id: string;
  planId: string;
  boardNo: string;
  workOrder: string;
  boardModel: string;
  quantity: number;
  icPartNo: string;
  softwareVersion: string;
  shouldBurn: BurnFlag;
  burnStage: BurnStage;
}

/** 生产计划表行（页面 14 Tab3） */
export interface PlanSheetRow {
  id: string;
  planId: string;
  week: string;
  taskNo: string;
  materialCode: string;
  name: string;
  quantity: number;
}

/** 计划操作日志（页面 14 Tab2） */
export interface PlanOperationLog {
  id: string;
  planId: string;
  operatedAt: string;
  operator: string;
  actionType: string;
  summary: string;
}

/** 计划变更请求 */
export interface PlanChangeRequest {
  id: string;
  planId: string;
  changeType: PlanChangeType;
  reason: string;
  impactScope: string;
  remark?: string;
  approvalStatus: PlanApprovalStatus;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

/** 履历记录（页面 15） */
export interface ResumeRecord {
  id: string;
  boardPartNo: string;
  boardModel: string;
  chipPartNo: string;
  chipModel: string;
  softwareVersion: string;
  checksumMd5: string;
  description?: string;
  publisher: string;
  remark?: string;
}
