/** 项目日报生成预览（Mock 聚合，P6） */

export interface DailyReportProgressRow {
  productName: string;
  phase: string;
  progressPercent: number;
  conclusion: string;
  startAt: string;
  endAt: string;
}

export interface DailyReportDefectSummary {
  cumulative: number;
  newToday: number;
  unclosed: number;
  toVerify: number;
  unresolved: number;
  l1l2Unresolved: number;
  postponed: number;
}

export interface DailyReportCaseSummary {
  total: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  execRate: string;
  passRate: string;
}

export interface DailyReportBugRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  owner: string;
}

export interface DailyReportPieSlice {
  name: string;
  value: number;
}

export interface DailyGeneratedReport {
  generatedAt: string;
  productName: string;
  projectVersion: string;
  branch?: string;
  sitDay: number;
  overallProgressPercent: number;
  /** 开篇问候 */
  openingGreeting: string;
  /** 开篇进度说明（含 SIT 天数、整体进度等） */
  openingProgressText: string;
  summaryText: string;
  /** 文末 @负责人 说明 */
  mentionNote: string;
  mentionUser?: string;
  progressRows: DailyReportProgressRow[];
  defectSummary: DailyReportDefectSummary;
  caseSummary: DailyReportCaseSummary;
  risks: string[];
  l1l2Bugs: DailyReportBugRow[];
  bugsByStatus: DailyReportPieSlice[];
  bugsBySeverity: DailyReportPieSlice[];
}
