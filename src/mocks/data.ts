import type {
  Team,
  User,
  Project,
  ProjectVersion,
  CaseModule,
  TestCase,
  CaseStep,
  PlatformAutomationTask,
  PlatformAutomationTaskDetail,
  ProductionPlan,
  BurnRow,
  PlanSheetRow,
  PlanOperationLog,
  PlanChangeRequest,
  ResumeRecord,
} from '../types';

export const mockTeams: Team[] = [
  { id: '1', name: '支付组', memberCount: 8 },
  { id: '2', name: '订单组', memberCount: 4 },
  { id: '3', name: '用户组', memberCount: 2 },
  { id: '4', name: '风控组', memberCount: 2 },
];

/** 团队 → 成员 userId 列表（与 mockUsers 对齐，供基础数据页团队管理） */
export const mockTeamMemberIds: Record<string, string[]> = {
  '1': ['1', '2', '3', '4', '5', '6', '7', '8'],
  '2': ['9', '10', '11', '12'],
  '3': ['2', '5'],
  '4': ['3', '4'],
};

export const mockUsers: User[] = [
  { id: '1', employeeId: 'A12345', name: '张三', role: '测试工程师', email: 'zhangsan@company.com' },
  { id: '2', employeeId: 'A12346', name: '李四', role: '测试负责人', email: 'lisi@company.com' },
  { id: '3', employeeId: 'A12347', name: '王五', role: '测试工程师', email: 'wangwu@company.com' },
  { id: '4', employeeId: 'A12348', name: '赵六', role: '开发工程师', email: 'zhaoliu@company.com' },
  { id: '5', employeeId: 'A12349', name: '钱七', role: '测试经理', email: 'qianqi@company.com' },
  { id: '6', employeeId: 'A12350', name: '孙八', role: '测试工程师', email: 'sunba@company.com' },
  { id: '7', employeeId: 'A12351', name: '周九', role: '测试工程师', email: 'zhoujiu@company.com' },
  { id: '8', employeeId: 'A12352', name: '吴十', role: '开发工程师', email: 'wushi@company.com' },
  { id: '9', employeeId: 'B20001', name: '郑一', role: '测试工程师', email: 'zhengyi@company.com' },
  { id: '10', employeeId: 'B20002', name: '王二', role: '测试负责人', email: 'wanger@company.com' },
  { id: '11', employeeId: 'B20003', name: '冯三', role: '测试工程师', email: 'fengsan@company.com' },
  { id: '12', employeeId: 'B20004', name: '陈四', role: '开发工程师', email: 'chensi@company.com' },
  { id: '13', employeeId: 'B20005', name: '褚五', role: '测试工程师', email: 'chuwu@company.com' },
  { id: '14', employeeId: 'B20006', name: '卫六', role: '测试经理', email: 'weiliu@company.com' },
  { id: '15', employeeId: 'B20007', name: '蒋七', role: '测试工程师', email: 'jiangqi@company.com' },
];

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'ATO-支付回归',
    autoType: '接口自动化',
    team: '支付组',
    projectType: '平台项目',
    region: '深圳',
    createdAt: '2024-01-15 10:30',
    updatedAt: '2024-03-10 14:20',
  },
  {
    id: '2',
    name: 'ATO-订单回归',
    autoType: 'UI自动化',
    team: '订单组',
    projectType: '平台项目',
    region: '重庆',
    createdAt: '2024-02-01 09:15',
    updatedAt: '2024-03-15 16:45',
  },
  {
    id: '3',
    name: 'ATO-用户中心',
    autoType: '接口自动化',
    team: '用户组',
    projectType: '整机项目',
    region: '成都',
    createdAt: '2024-01-20 11:00',
    updatedAt: '2024-03-08 10:30',
  },
  {
    id: '4',
    name: 'ATO-风控核心',
    autoType: '接口自动化',
    team: '风控组',
    projectType: '整机项目',
    region: '深圳',
    createdAt: '2024-02-10 14:20',
    updatedAt: '2024-03-12 09:45',
  },
  {
    id: '5',
    name: 'ATO-支付国际化',
    autoType: 'UI自动化',
    team: '支付组',
    projectType: '平台项目',
    region: '重庆',
    createdAt: '2024-03-01 10:00',
    updatedAt: '2024-03-18 15:30',
  },
];

export const mockVersions: ProjectVersion[] = [
  {
    id: '1',
    version: 'v1.0.0',
    projectId: '1',
    projectName: 'ATO-支付回归',
    owner: '张三',
    startTime: '2024-02-01 10:00',
    planReleaseDate: '2024-03-20',
    actualReleaseDate: '2024-03-20 14:30',
    status: '已发布',
    caseCount: 156,
    coverage: 85,
    successRate: 92,
    createdAt: '2024-02-01 10:00',
    releaseNotes: {
      newFeatures:
        '- 新增支付渠道：支持微信支付、支付宝\n- 新增退款自动化用例\n- 优化订单查询接口',
      cautions:
        '- 运行前请确保测试环境配置正确\n- 涉及资金操作请在测试环境执行',
    },
  },
  {
    id: '2',
    version: 'v1.2.0',
    projectId: '1',
    projectName: 'ATO-支付回归',
    inheritVersion: 'v1.0.0',
    owner: '李四',
    startTime: '2024-03-01 14:30',
    planReleaseDate: '2024-04-15',
    actualReleaseDate: null,
    status: '未发布',
    caseCount: 189,
    coverage: 88,
    successRate: 0,
    createdAt: '2024-03-01 14:30',
    releaseNotes: null,
  },
  {
    id: '3',
    version: 'v2.0.0',
    projectId: '2',
    projectName: 'ATO-订单回归',
    owner: '王五',
    startTime: '2024-02-15 09:00',
    planReleaseDate: '2024-03-25',
    actualReleaseDate: null,
    status: '已召回',
    caseCount: 234,
    coverage: 76,
    successRate: 78,
    createdAt: '2024-02-15 09:00',
    releaseNotes: null,
  },
];

/** 用例目录树（按版本隔离，供用例管理页） */
export const mockCaseModules: CaseModule[] = [
  { id: 'mod-pay-root', versionId: '1', parentId: null, name: '根目录', sort: 10 },
  { id: 'mod-pay-order', versionId: '1', parentId: 'mod-pay-root', name: '下单流程', sort: 10 },
  { id: 'mod-pay-refund', versionId: '1', parentId: 'mod-pay-root', name: '退款流程', sort: 20 },
  { id: 'mod-pay-coupon', versionId: '1', parentId: 'mod-pay-root', name: '优惠券流程', sort: 30 },
  { id: 'mod-pay-risk', versionId: '1', parentId: 'mod-pay-root', name: '风控校验', sort: 40 },
  { id: 'mod-pay-recon', versionId: '1', parentId: 'mod-pay-root', name: '对账流程', sort: 50 },
  { id: 'mod-v2-root', versionId: '2', parentId: null, name: 'v1.2.0 模块', sort: 10 },
  { id: 'mod-v3-root', versionId: '3', parentId: null, name: '订单回归', sort: 10 },
];

export const mockTestCases: TestCase[] = [
  {
    id: 'tc-1',
    versionId: '1',
    moduleId: 'mod-pay-order',
    name: '创建订单-正常流',
    tags: ['smoke', 'P0'],
    result: '通过',
    status: '正常',
    updatedAt: '2024-03-18 10:20',
  },
  {
    id: 'tc-5',
    versionId: '1',
    moduleId: 'mod-pay-coupon',
    name: '优惠券核销-正常流',
    tags: ['coupon', 'P1'],
    result: '通过',
    status: '正常',
    updatedAt: '2024-03-14 18:10',
  },
  {
    id: 'tc-6',
    versionId: '1',
    moduleId: 'mod-pay-risk',
    name: '风控拦截-高风险用户',
    tags: ['risk'],
    result: '未运行',
    status: '草稿',
    updatedAt: '2024-03-13 09:05',
  },
  {
    id: 'tc-7',
    versionId: '1',
    moduleId: 'mod-pay-recon',
    name: '日终对账-差异检测',
    tags: ['recon'],
    result: '警告',
    status: '正常',
    updatedAt: '2024-03-12 20:30',
  },
  {
    id: 'tc-2',
    versionId: '1',
    moduleId: 'mod-pay-order',
    name: '创建订单-库存不足',
    tags: ['异常'],
    result: '失败',
    status: '正常',
    updatedAt: '2024-03-17 16:05',
  },
  {
    id: 'tc-3',
    versionId: '1',
    moduleId: 'mod-pay-refund',
    name: '发起退款-审核中',
    tags: ['退款'],
    result: '警告',
    status: '草稿',
    updatedAt: '2024-03-16 09:40',
  },
  {
    id: 'tc-4',
    versionId: '1',
    moduleId: 'mod-pay-refund',
    name: '退款完成回调',
    tags: ['smoke'],
    result: '未运行',
    status: '正常',
    updatedAt: '2024-03-15 11:00',
  },
  {
    id: 'tc-v2-1',
    versionId: '2',
    moduleId: 'mod-v2-root',
    name: '新版本占位用例',
    tags: [],
    result: '未运行',
    status: '草稿',
    updatedAt: '2024-03-20 12:00',
  },
  {
    id: 'tc-v3-1',
    versionId: '3',
    moduleId: 'mod-v3-root',
    name: '订单列表查询',
    tags: ['UI'],
    result: '通过',
    status: '正常',
    updatedAt: '2024-03-10 14:30',
  },
];

/** tc-1：每种步骤类型各一条，供用例详情页验收（类型不重复） */
export const mockCaseSteps: CaseStep[] = [
  {
    id: 'st-1',
    caseId: 'tc-1',
    order: 1,
    stepType: '接口请求',
    title: '查询用户与商品前置数据',
    detail:
      'GET /api/users/{id}、GET /api/skus/{skuId}\nParams: id、skuId\n断言：HTTP 200，库存字段 stock > 0',
  },
  {
    id: 'st-2',
    caseId: 'tc-1',
    order: 2,
    stepType: '自定义接口请求',
    title: '模拟渠道网关签名回调',
    detail:
      '自定义 Host/签名头：X-Gateway-Sign、X-Timestamp\nBody 为渠道密文，需先解密再校验业务字段',
  },
  {
    id: 'st-3',
    caseId: 'tc-1',
    order: 3,
    stepType: '调用函数',
    title: '生成幂等键与随机订单号',
    detail: '调用内置函数 uuid()、orderNo(prefix="PAY")，写入上下文变量 idempotencyKey、orderNo',
  },
  {
    id: 'st-4',
    caseId: 'tc-1',
    order: 4,
    stepType: '数据库操作',
    title: '插入待支付订单行',
    detail:
      '数据源：order_ds\nSQL：INSERT INTO t_order (order_no, status) VALUES (?, \'CREATED\')\n参数绑定：${orderNo}',
  },
  {
    id: 'st-5',
    caseId: 'tc-1',
    order: 5,
    stepType: 'if判断',
    title: '分支：库存是否充足',
    detail: '条件：${stock} >= ${buyQty}\n真：继续下单接口；假：断言失败并终止用例',
  },
  {
    id: 'st-6',
    caseId: 'tc-1',
    order: 6,
    stepType: 'for循环',
    title: '轮询支付结果',
    detail: '循环变量 i 从 1 到 10，间隔 500ms\n退出条件：${payStatus} in (\'SUCCESS\',\'FAIL\')',
  },
  {
    id: 'st-7',
    caseId: 'tc-1',
    order: 7,
    stepType: '等待',
    title: '等待异步账务落库',
    detail: '固定等待 2000 ms，再查询订单状态为终态',
  },
  {
    id: 'st-8',
    caseId: 'tc-2',
    order: 1,
    title: '前置：库存设为 0',
    detail: '通过管理接口或 Mock 将库存置零。',
  },
  {
    id: 'st-9',
    caseId: 'tc-v3-1',
    order: 1,
    title: '打开订单列表页',
    detail: '路由 /orders，等待表格渲染完成。',
  },
  {
    id: 'st-10',
    caseId: 'tc-5',
    order: 1,
    title: '准备优惠券',
    detail: '创建一张可用优惠券，绑定到用户。',
  },
  {
    id: 'st-11',
    caseId: 'tc-6',
    order: 1,
    title: '构造高风险画像',
    detail: '模拟风控命中：设备指纹异常/异地登录等。',
  },
  {
    id: 'st-12',
    caseId: 'tc-7',
    order: 1,
    title: '拉取账单数据',
    detail: '按日期拉取支付渠道账单，准备对账数据。',
  },
];

/** 文件管理：目录（供文件管理页与用例步骤 file 选择复用） */
/** 文件管理：仅一级目录（与 PRD §4.7 / 页面实现一致；用例步骤 file 树同源） */
export const mockFileFolders = [
  { id: 'root-api', name: '接口文件', parentId: null as string | null },
  { id: 'root-ui', name: '页面资源', parentId: null as string | null },
];

/** 文件管理：文件（供文件管理页与用例步骤 file 选择复用） */
export const mockManagedFiles = [
  {
    id: 'f-1',
    folderId: 'root-api',
    name: 'login-request.json',
    type: 'json',
    path: '/接口文件',
    description: '登录接口入参模板',
    updatedAt: '2026-03-30 10:30',
  },
  {
    id: 'f-2',
    folderId: 'root-ui',
    name: 'login-banner.png',
    type: 'png',
    path: '/页面资源',
    description: '登录页顶部横幅',
    updatedAt: '2026-03-30 10:45',
  },
];

/** 自定义函数：文件（供自定义函数页与调用函数步骤选择函数复用） */
export const mockFunctionFiles = [
  {
    id: 'func-1',
    fileName: 'common_assertions.py',
    language: 'python' as const,
    updatedAt: '2026-03-30 11:20',
    author: 'AI',
    content: `def assert_status_code(response, expected_code):
    assert response.status_code == expected_code

def assert_contains_key(payload: dict, key: str):
    return key in payload
`,
  },
  {
    id: 'func-2',
    fileName: 'data_parameterization.py',
    language: 'python' as const,
    updatedAt: '2026-03-30 11:35',
    author: 'AI',
    content: `def time_load(data: str, form="%Y-%m-%d %H:%M:%S"):
    return data

def api(data: str):
    return data

def yaml_value(value, sub=None, index=0):
    return value
`,
  },
];

/** 平台自动化：团队（页面 12） */
export const mockPlatformTeams: Team[] = [
  { id: 'pt-1', name: 'CICD', memberCount: 12 },
  { id: 'pt-2', name: 'SIT', memberCount: 8 },
  { id: 'pt-3', name: '交付保障组', memberCount: 6 },
];

/** 平台自动化：任务（页面 12） */
export const mockPlatformTasks: PlatformAutomationTask[] = [
  {
    taskId: 15,
    taskName: 'FT-xx回归-132',
    version: 'V2.0.2',
    envTab: 'test',
    teamId: 'pt-1',
    createdBy: '1',
    createdAt: '2026-04-01 17:00:24',
    triggeredAt: '2026-04-01 17:00:37',
    durationText: '0时00分12秒',
    triggerType: '手动触发',
    caseCount: 10,
    passRateText: '100.00%',
    progressText: '100%',
    status: '已完成',
  },
  {
    taskId: 13,
    taskName: 'V202 DEV 产测',
    version: 'V2.0.1-P1',
    envTab: 'dev',
    teamId: 'pt-1',
    createdBy: '4',
    createdAt: '2026-03-25 22:56:58',
    triggeredAt: '2026-04-01 04:00:00',
    durationText: '0时20分41秒',
    triggerType: '定时触发',
    caseCount: 476,
    passRateText: '92.44%',
    progressText: '100%',
    status: '已完成',
  },
  {
    taskId: 10,
    taskName: 'V202-DEV',
    version: 'V2.0.1-P1',
    envTab: 'dev',
    teamId: 'pt-2',
    createdBy: '4',
    createdAt: '2026-03-24 10:11:23',
    triggeredAt: '2026-03-26 14:45:26',
    durationText: '0时05分57秒',
    triggerType: '手动触发',
    caseCount: 416,
    passRateText: '99.76%',
    progressText: '100%',
    status: '已完成',
  },
  {
    taskId: 9,
    taskName: 'OCD-V2.0.X5FT',
    version: 'V2.0.1-P1',
    envTab: 'test',
    teamId: 'pt-3',
    createdBy: '2',
    createdAt: '2026-03-23 21:52:25',
    triggeredAt: '2026-04-01 07:00:00',
    durationText: '0时19分48秒',
    triggerType: '定时触发',
    caseCount: 476,
    passRateText: '92.65%',
    progressText: '100%',
    status: '已完成',
  },
];

/** 平台自动化：任务详情（页面 12-1） */
export const mockPlatformTaskDetails: PlatformAutomationTaskDetail[] = [
  {
    taskId: 15,
    basicInfo: {
      taskId: 15,
      version: 'V2.0.2',
      projectName: 'CICD-V2.0',
      status: '已完成',
      createdAt: '2026-04-01 17:00:24',
      triggerType: '手动触发',
      sendMailPolicy: '不发送',
    },
    configInfo: {
      runEnv: 'https://192.168.132.134:28008',
      threadCount: 1,
      retryCount: 1,
      durationText: '30 分钟',
      runScopeText: '模块前置测试-登录、全系统测试FT-单机',
    },
    runStats: {
      caseCount: 10,
      runCaseCount: 10,
      totalRunTimes: 1,
      coverageRateText: '1.86%',
      passRateText: '100%',
      durationText: '0时0分0秒',
    },
  },
];

/** 产测软件管理：计划列表（页面 13） */
export const mockProductionPlans: ProductionPlan[] = [
  {
    id: 'PLN-2026W16-001',
    planName: '2026年第16周主板产测计划',
    week: '2026-W16',
    status: '待确认',
    changeCount: 0,
    createdAt: '2026-04-16 11:20',
    submittedAt: '',
    changedAt: '',
    creator: '张三',
  },
  {
    id: 'PLN-2026W15-002',
    planName: '2026年第15周主板产测计划',
    week: '2026-W15',
    status: '已提交',
    changeCount: 1,
    createdAt: '2026-04-09 09:10',
    submittedAt: '2026-04-10 16:35',
    changedAt: '2026-04-12 14:20',
    creator: '李四',
  },
  {
    id: 'PLN-2026W17-003',
    planName: '2026年第17周主板产测计划',
    week: '2026-W17',
    status: '匹配失败',
    changeCount: 0,
    createdAt: '2026-04-17 08:45',
    submittedAt: '',
    changedAt: '',
    creator: '王五',
  },
];

/** 产测软件管理：软件烧录表（页面 14 Tab1） */
export const mockBurnRows: BurnRow[] = [
  {
    id: 'BR-1',
    planId: 'PLN-2026W16-001',
    boardNo: 'SN20260417001',
    workOrder: 'WO-2026W16-0001',
    boardModel: 'BK-ATX-001',
    quantity: 300,
    icPartNo: 'IC-ATX-001',
    softwareVersion: 'SW-P4-CORE-1.0.3',
    shouldBurn: '是',
    burnStage: '贴片前烧录',
  },
  {
    id: 'BR-2',
    planId: 'PLN-2026W16-001',
    boardNo: 'SN20260417002',
    workOrder: 'WO-2026W16-0002',
    boardModel: 'BK-ATX-002',
    quantity: 120,
    icPartNo: 'IC-ATX-002',
    softwareVersion: 'SW-P4-DRV-2.1.0',
    shouldBurn: '是',
    burnStage: '贴片后烧录',
  },
  {
    id: 'BR-3',
    planId: 'PLN-2026W15-002',
    boardNo: 'SN20260410003',
    workOrder: 'WO-2026W15-0010',
    boardModel: 'BK-ATX-003',
    quantity: 80,
    icPartNo: 'IC-ATX-005',
    softwareVersion: 'SW-P4-BASE-1.2.0',
    shouldBurn: '否',
    burnStage: '贴片后烧录',
  },
];

/** 产测软件管理：生产计划表（页面 14 Tab3） */
export const mockPlanSheetRows: PlanSheetRow[] = [
  {
    id: 'PS-1',
    planId: 'PLN-2026W16-001',
    week: '14周',
    taskNo: 'BM26030206',
    materialCode: '3020021100061',
    name: '主板|D5X-XSM|通用',
    quantity: 1800,
  },
  {
    id: 'PS-2',
    planId: 'PLN-2026W16-001',
    week: '14周',
    taskNo: 'BM26030207',
    materialCode: '3020021100062',
    name: '主板|D5X-XSM|扩展',
    quantity: 1200,
  },
];

/** 产测软件管理：计划操作日志（页面 14 Tab2） */
export const mockPlanOperationLogs: PlanOperationLog[] = [
  {
    id: 'LOG-1',
    planId: 'PLN-2026W16-001',
    operatedAt: '2026-04-16 11:20:11',
    operator: '张三',
    actionType: '创建',
    summary: '创建计划并上传生产计划Excel',
  },
  {
    id: 'LOG-2',
    planId: 'PLN-2026W16-001',
    operatedAt: '2026-04-16 16:02:18',
    operator: '张三',
    actionType: '提交',
    summary: '提交计划并发送通知邮件',
  },
  {
    id: 'LOG-3',
    planId: 'PLN-2026W15-002',
    operatedAt: '2026-04-12 14:20:00',
    operator: '李四',
    actionType: '变更',
    summary: '变更内容：原因=修复驱动兼容问题；影响范围=BK-ATX-003；备注=需同步更新产线工位说明',
  },
];

/** 产测软件管理：变更请求（占位） */
export const mockPlanChangeRequests: PlanChangeRequest[] = [
  {
    id: 'CR-1',
    planId: 'PLN-2026W15-002',
    changeType: 'software_update',
    reason: '修复驱动兼容问题',
    impactScope: 'BK-ATX-003',
    remark: '需同步更新产线工位说明',
    approvalStatus: '待审批',
    submittedBy: '李四',
    submittedAt: '2026-04-12 14:20:00',
  },
];

/** 产测软件管理：履历表（页面 15） */
export const mockResumeRecords: ResumeRecord[] = [
  {
    id: 'RS-1',
    boardPartNo: '3020010000491',
    boardModel: '主板[AS-VGA]主屏资源板',
    chipPartNo: '10G/X25FL256SAGMFIG01',
    chipModel: 'MX25L25635FMI-06G',
    softwareVersion: 'Firmware_ASH_V262B107_T240219.02_C0010_TEST_FS5.zip',
    checksumMd5: '12368263b5h',
    description: 'VGA业内内容与STREAMAX主板版本测试通过',
    publisher: '张某',
    remark: 'checklist已上传2024-3-11',
  },
  {
    id: 'RS-2',
    boardPartNo: '3020010000491',
    boardModel: '主板[AS-VGA]主屏资源板',
    chipPartNo: '10G/X25FL128SAGMFIG02',
    chipModel: 'MX25L12835FMI-06G',
    softwareVersion: 'Firmware_ASH_V262B108_T240320.01_C0012_TEST_FS6.zip',
    checksumMd5: '7a89211f09a',
    description: '兼容性补丁版本',
    publisher: '李某',
    remark: '',
  },
];
