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
  autoType: '接口自动化' | 'UI自动化' | '设备自动化';
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
export type PlanFactory = 'CN' | 'VN';
export type PlanChangeType = 'software_update' | 'software_offline';
export type PlanApprovalStatus = '待审批' | '已通过' | '已驳回';
export type BurnFlag = '是' | '否';
export type BurnStage = '贴片前烧录' | '贴片后烧录';
export type SoftwareStatus = '正常' | '已下架' | '试产';

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
  factory: PlanFactory;
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
  taskNo: string;
  materialCode: string;
  materialDesc: string;
  quantity: number;
  icPartNo: string;
  icModel: string;
  softwareName: string;
  softwareStatus?: SoftwareStatus;
  shouldBurn?: BurnFlag;
  burnStage?: BurnStage;
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

/** 履历表：板卡下单条 IC / 软件信息（可多行） */
export interface ResumeIcInfo {
  chipPartNo?: string;
  chipModel?: string;
  softwareVersion?: string;
  checksumMd5?: string;
  softwareStatus?: SoftwareStatus;
  description?: string;
  publisher?: string;
  remark?: string;
}

/** 履历记录（页面 15） */
export interface ResumeRecord {
  id: string;
  boardPartNo?: string;
  boardModel: string;
  chipPartNo: string;
  chipModel: string;
  softwareVersion: string;
  checksumMd5: string;
  softwareStatus?: SoftwareStatus;
  description?: string;
  publisher: string;
  remark?: string;
  /** 多 IC / 软件行；缺省时页面用 chip/software 顶层字段归一化 */
  icInfos?: ResumeIcInfo[];
}

/** 套件 — 所属模块一行：包含/不包含 + 模块（可多行，行末 + 追加） */
export interface SuiteModuleScopeRow {
  relation: 'include' | 'exclude';
  moduleIds: string[];
}

/** 套件 — 标签一行：等于/包含/不包含 + 标签值（可多行） */
export interface SuiteTagScopeRow {
  relation: 'eq' | 'include' | 'exclude';
  tags: string[];
}

/** 套件管理（V1.0.1-P5）— 用例范围持久化（与测试运行「执行范围」字段语义对齐方向一致，套件侧为验收专用结构） */
export interface SuiteScopePersist {
  moduleRows: SuiteModuleScopeRow[];
  tagRows: SuiteTagScopeRow[];
}

/** 套件（V1.0.1-P5） */
export interface VersionSuite {
  id: string;
  name: string;
  scopeSummary: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  scope?: SuiteScopePersist;
}

/** 市场缺陷列表行（V1.0.1-P5 列表字段对齐验收列） */
export interface MarketDefect {
  id: string;
  defectSource: string;
  title: string;
  createdAt: string;
  defectType: string;
  productLine: string;
  /** 缺陷归属团队（新增只读列） */
  defectOwnerTeam: string;
  /** 是否有效问题（是/否） */
  validIssue: string;
  actualTeam: string;
  mainResponsibilityAttribution: string;
  mainResponsiblePerson: string;
  leakageReason: string;
  improvementMeasure: string;
  improvementOwner: string;
  /** 完成进度 0～100（百分比，列表以进度条展示） */
  completionProgress: number;
  autoCovered: string;
  canCover: string;
  uncoveredReason: string;
  autoMissReason: string;
}

/** RDMS 缺陷详情 · 历史记录条目（列表点击缺陷 ID 弹层 Mock，对齐 RDMS 详情信息架构） */
export interface MarketDefectRdmsHistoryEntry {
  id: string;
  time: string;
  author: string;
  content: string;
}

/** RDMS 缺陷详情 · 附件（Mock） */
export interface MarketDefectRdmsAttachment {
  id: string;
  name: string;
  url?: string;
}

/**
 * 市场缺陷列表行对应的 RDMS 详情展示模型（字段对齐 RDMS 详情页：产品/客户/缺陷信息 + 右侧元数据 + 历史）
 */
export interface MarketDefectRdmsDetail {
  defectId: string;
  /** RDMS 内数字编号展示（可与业务 ID 并存） */
  rdmsNumericId: string;
  title: string;
  product: {
    productLine: string;
    belongingProduct: string;
    issueProductVersion: string;
    productSystemDomain: string;
  };
  customer: {
    region: string;
    customerCode: string;
    customerName: string;
    expectedSolutionAt: string;
  };
  defectBlock: {
    issueLevel: string;
    frontlineTechSupport: string;
    description: string;
  };
  /** 解决方案（正文可为空占位） */
  solution: string;
  /** 缺陷归属（正文可为空占位） */
  defectAttributionText: string;
  basic: {
    status: string;
    defectType: string;
    defectAttribution: string;
    severity: string;
    occurrenceRate: string;
    impactScope: string;
    problemLevel: string;
    priority: string;
    ownerTeam: string;
    isCommonIssue: string;
  };
  lifecycle: {
    createdBy: string;
    createdAt: string;
    solutionBrief: string;
    assignedTo: string;
    communication: string;
  };
  history: MarketDefectRdmsHistoryEntry[];
  attachments: MarketDefectRdmsAttachment[];
}

/** 分析报告状态（V1.0.1-P5） */
export type AnalysisReportTaskStatus = '进行中' | '已完成' | '异常';

/** 「分析报告」Tab 列表行（Mock，V1.0.1-P5） */
export interface AnalysisReportTask {
  reportId: string;
  reportName: string;
  teamName: string;
  timeRange: string;
  creator: string;
  createdAt: string;
  /** 有效缺陷总数（展示） */
  validDefectTotal: string;
  /** 产品缺陷泄露率（展示） */
  productDefectLeakRate: string;
  leakRate: string;
  status: AnalysisReportTaskStatus;
  /** 以下字段用于编辑弹窗回填（与创建表单一致） */
  scopeYear?: string;
  scopeQuarter?: string;
  scopeMonth?: string;
  scopeActualTeam?: string;
  rdmsProductIds?: string[];
  productOwner?: string;
  devOwner?: string;
  testOwner?: string;
}

/** 列表 → 报表 sessionStorage 快照（V1.0.1-P5） */
export interface MarketDefectListSnapshot {
  filters: {
    /** 创建日期维度：年（值如 `2026` 或 `全部`） */
    year?: string;
    /** 季度：`Q1`…`Q4` 或 `全部` */
    quarter?: string;
    /** 月份：`5月` 或 `全部` */
    month?: string;
    /** 表头列筛选（是否有效问题 / 实际归属团队 / 主要责任归属） */
    valid?: string;
    actualTeam?: string;
    mainResponsibilityAttribution?: string;
    /** 缺陷归属团队 */
    defectOwnerTeam?: string;
  };
  /** 单一搜索框文案 */
  search: { text?: string };
  page: number;
  pageSize: number;
  updatedAt: string;
}

/** 接口管理：HTTP 请求方法 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/** 接口管理：接口类型 */
export type ApiType = 'API' | 'WebSocket' | 'gRPC' | 'GraphQL';

/** 接口管理：接口目录节点 */
export interface ApiCategory {
  id: string;
  parentId: string | null;
  name: string;
  sort: number;
  description?: string;
  createdAt: string;
  createdBy: string;
  /** 所属项目 ID（root 全局共享时可缺省；项目级目录必须设置） */
  projectId?: string;
}

/** 接口管理：Path / Query 等参数行（预览与编辑共用结构） */
export interface ApiParamRow {
  name: string;
  defaultValue?: string;
  /** 是否必须 */
  required: boolean;
  description?: string;
  /**
   * 场景调试 Query 行：是否参与请求（默认 true / 未设置视为启用）
   * Path 参数不使用此字段
   */
  enabled?: boolean;
}

/** 接口管理：接口场景（同一接口下不同参数组合） */
export interface ApiInterfaceScenario {
  id: string;
  apiId: string;
  name: string;
  description?: string;
  /** 场景级 Path 参数表（缺省时继承父接口 pathParams） */
  pathParams?: ApiParamRow[];
  /** 场景级 Query 参数表（缺省时继承父接口 queryParams） */
  queryParams?: ApiParamRow[];
}

/** 接口管理：接口定义 */
export interface ApiDefinition {
  id: string;
  categoryId: string;
  name: string;
  method: ApiMethod;
  path: string;
  type: ApiType;
  description?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  /** 备注（详情区） */
  remark?: string;
  /** 请求协议展示，如 HTTP */
  requestProtocol?: string;
  pathParams?: ApiParamRow[];
  queryParams?: ApiParamRow[];
  /** 接口场景列表（树中挂在接口下） */
  scenarios?: ApiInterfaceScenario[];
}

/** 接口管理：环境配置 */
export interface ApiEnvironment {
  id: string;
  name: string;
  baseUrl: string;
  isDefault?: boolean;
}
