export type MailMode = '定时' | '手动';
export type DailyProjectStatus = '正常' | '已完成' | '延期' | '暂停';

/** 定时模式：生效日期范围 + 每日发送时刻 */
export interface DailyTimerSchedule {
  rangeStart: string;
  rangeEnd: string;
  dailyTime: string;
}

export type TestPhase = '冒烟测试' | 'SIT 测试' | 'UAT 测试';

export interface DailyTestPlanRow {
  phase: TestPhase;
  startAt?: string;
  endAt?: string;
}

export interface DailyReportConfig {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  productId: string;
  productName: string;
  branch?: string;
  projectVersion: string;
  testOwnerId: string;
  testOwnerName: string;
  devOwnerId?: string;
  devOwnerName?: string;
  mode: MailMode;
  projectStatus: DailyProjectStatus;
  timerEnabled: boolean;
  timerSchedule?: DailyTimerSchedule;
  createdAt: string;
  testPlan: DailyTestPlanRow[];
  senders: string[];
}

export interface DailyReportBody {
  configId: string;
  generatedAt: string;
  progress: string;
  risks?: string;
  tomorrowPlan?: string;
}

export type ProductType = '平台' | '设备';
export type ProjectType = '补丁' | '基线';
export type WeeklyProgress = '正常' | '已发布' | '延期';

export interface WeeklyReportRow {
  id: string;
  teamId: string;
  /** 产品名称（自定义文本） */
  productName: string;
  productType: ProductType;
  projectVersion: string;
  projectType: ProjectType;
  progress: WeeklyProgress;
  publishedAt?: string;
  /** 测试人员（多选，存用户 id 列表） */
  testerIds: string[];
  weeklyProgress: string;
  nextWeekPlan: string;
  remark?: string;
}

export interface StatisticsMetrics {
  baselineVersionCount: number;
  patchVersionCount: number;
  newCaseCount: number;
  submittedBugCount: number;
}

