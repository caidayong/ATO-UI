import type {
  DailyReportBody,
  DailyReportConfig,
  StatisticsMetrics,
  WeeklyReportRow,
} from '@/types/projectReports';
import { applyAutoProjectStatus } from '@/utils/dailyReportStatus';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso(): string {
  return new Date().toISOString();
}

/** 自然周周一日期（YYYY-MM-DD），与页面 `calcWeekKey` 对齐 */
function mondayWeekKey(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function currentMondayWeekKey(): string {
  return mondayWeekKey(new Date());
}

function isPastWeek(week: WeekKey): boolean {
  return week < currentMondayWeekKey();
}

export interface RdmsProductOption {
  id: string;
  name: string;
}

export const mockRdmsProducts: RdmsProductOption[] = [
  { id: 'p-pay', name: '支付核心' },
  { id: 'p-crm', name: '客户中台' },
  { id: 'p-device', name: '设备云' },
];

export interface TeamOption {
  id: string;
  name: string;
}

export const mockTeams: TeamOption[] = [
  { id: 'all', name: '全部' },
  { id: 't-qa-1', name: 'SIT' },
  { id: 't-qa-2', name: 'UAT' },
  { id: 't-qa-3', name: '交付保障组' },
];

export interface UserOption {
  id: string;
  name: string;
}

export const mockUsers: UserOption[] = [
  { id: 'u-zhangsan', name: '张三' },
  { id: 'u-lisi', name: '李四' },
  { id: 'u-wangwu', name: '王五' },
  { id: 'u-zhaoliu', name: '赵六' },
];

const MAIL_GROUP_OPTIONS = ['qa-daily@company.com', 'qa-weekly@company.com', 'qa-leads@company.com'];

type WeekKey = string; // e.g. 2026-W22

const dailyConfigs: DailyReportConfig[] = [
  {
    id: 'dr-001',
    name: '支付线-SIT-日报',
    teamId: '2',
    teamName: '中台',
    productId: 'p-pay',
    productName: '支付核心',
    branch: 'release/v2.3',
    projectVersion: 'v2.3.1',
    testOwnerId: 'u-zhangsan',
    testOwnerName: '张三',
    devOwnerId: 'u-lisi',
    devOwnerName: '李四',
    mode: '定时',
    projectStatus: '正常',
    timerEnabled: true,
    timerSchedule: {
      rangeStart: '2026-05-01',
      rangeEnd: '2026-05-31',
      dailyTime: '09:00:00',
    },
    createdAt: '2026-05-20T10:00:00Z',
    testPlan: [
      { phase: '冒烟测试', startAt: '2026-05-01T09:00:00Z', endAt: '2026-05-01T18:00:00Z' },
      { phase: 'SIT 测试' },
      { phase: 'UAT 测试' },
    ],
    senders: ['zhangsan@company.com', 'lisi@company.com'],
  },
  {
    id: 'dr-002',
    name: '设备云-UAT-日报',
    teamId: '1',
    teamName: 'S17',
    productId: 'p-device',
    productName: '设备云',
    projectVersion: 'v1.8.0',
    testOwnerId: 'u-wangwu',
    testOwnerName: '王五',
    mode: '手动',
    projectStatus: '已完成',
    timerEnabled: false,
    createdAt: '2026-05-22T03:12:00Z',
    testPlan: [
      { phase: '冒烟测试' },
      { phase: 'SIT 测试' },
      { phase: 'UAT 测试', endAt: '2026-05-01T18:00:00Z' },
    ],
    senders: ['wangwu@company.com'],
  },
];

function syncDailyConfigStatuses(): void {
  for (let i = 0; i < dailyConfigs.length; i++) {
    dailyConfigs[i] = applyAutoProjectStatus(dailyConfigs[i]);
  }
}

const latestBodies = new Map<string, DailyReportBody>([
  [
    'dr-001',
    {
      configId: 'dr-001',
      generatedAt: '2026-05-26T09:00:00Z',
      progress: '完成冒烟回归 32 条，用例通过率 100%。SIT 环境联调中。',
      risks: '支付回调链路偶发超时，需开发排查。',
      tomorrowPlan: '继续 SIT 回归；补充异常链路用例。',
    },
  ],
]);

const weeklyByTeamWeek = new Map<string, { status: 'draft' | 'submitted'; rows: WeeklyReportRow[] }>();

function weeklyKey(teamId: string, week: WeekKey): string {
  return `${teamId}__${week}`;
}

function ensureWeekly(teamId: string, week: WeekKey): { status: 'draft' | 'submitted'; rows: WeeklyReportRow[] } {
  const key = weeklyKey(teamId, week);
  const existing = weeklyByTeamWeek.get(key);
  if (existing) return existing;
  const initial: WeeklyReportRow[] = [
    {
      id: `wr-${teamId}-${week}-001`,
      teamId,
      productName: '支付核心',
      productType: '平台',
      projectVersion: 'v2.3.1',
      projectType: '补丁',
      progress: '正常',
      testerIds: ['u-zhangsan'],
      weeklyProgress: '本周完成支付线冒烟回归，推进 SIT 联调。',
      nextWeekPlan: '下周开始 UAT 预演并补齐异常链路用例。',
      remark: '',
    },
  ];
  const seeded = { status: 'draft' as const, rows: initial };
  weeklyByTeamWeek.set(key, seeded);
  return seeded;
}

export function listMailGroups(): string[] {
  return [...MAIL_GROUP_OPTIONS];
}

export function listRdmsProducts(): RdmsProductOption[] {
  return [...mockRdmsProducts];
}

export function listTeams(): TeamOption[] {
  return [...mockTeams];
}

export function listUsers(): UserOption[] {
  return [...mockUsers];
}

export async function listDailyConfigs(): Promise<DailyReportConfig[]> {
  await delay(200);
  syncDailyConfigStatuses();
  return [...dailyConfigs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getDailyConfig(id: string): Promise<DailyReportConfig | null> {
  await delay(160);
  syncDailyConfigStatuses();
  const cfg = dailyConfigs.find((x) => x.id === id);
  return cfg ?? null;
}

export async function getLatestDailyBody(configId: string): Promise<DailyReportBody | null> {
  await delay(160);
  return latestBodies.get(configId) ?? null;
}

export async function updateDailyBody(
  configId: string,
  payload: Pick<DailyReportBody, 'progress' | 'risks' | 'tomorrowPlan'>
): Promise<DailyReportBody> {
  await delay(220);
  const next: DailyReportBody = {
    configId,
    generatedAt: nowIso(),
    progress: payload.progress,
    risks: payload.risks,
    tomorrowPlan: payload.tomorrowPlan,
  };
  latestBodies.set(configId, next);
  return next;
}

export type DailyConfigUpsertPayload = Omit<DailyReportConfig, 'id' | 'createdAt'> & { id?: string };

function hasNameConflict(payload: DailyConfigUpsertPayload): boolean {
  const normalized = payload.name.trim();
  return dailyConfigs.some(
    (x) =>
      x.productId === payload.productId &&
      x.name.trim() === normalized &&
      (payload.id ? x.id !== payload.id : true)
  );
}

export async function createDailyConfig(
  payload: DailyConfigUpsertPayload
): Promise<{ ok: true; id: string } | { ok: false; conflict: true }> {
  await delay(260);
  if (hasNameConflict(payload)) return { ok: false, conflict: true };

  const id = `dr-${String(dailyConfigs.length + 1).padStart(3, '0')}`;
  const created = applyAutoProjectStatus({
    ...(payload as Omit<DailyReportConfig, 'id' | 'createdAt'>),
    id,
    createdAt: nowIso(),
  });
  dailyConfigs.unshift(created);
  return { ok: true, id };
}

export async function updateDailyConfig(
  payload: DailyConfigUpsertPayload & { id: string }
): Promise<{ ok: true } | { ok: false; conflict: true }> {
  await delay(240);
  if (hasNameConflict(payload)) return { ok: false, conflict: true };
  const idx = dailyConfigs.findIndex((x) => x.id === payload.id);
  if (idx < 0) return { ok: true };
  dailyConfigs[idx] = applyAutoProjectStatus({
    ...dailyConfigs[idx],
    ...(payload as Omit<DailyReportConfig, 'createdAt'>),
  });
  return { ok: true };
}

export async function toggleDailyTimer(id: string, enabled: boolean): Promise<void> {
  await delay(180);
  const cfg = dailyConfigs.find((x) => x.id === id);
  if (cfg) cfg.timerEnabled = enabled;
}

export async function deleteDailyConfig(id: string): Promise<void> {
  await delay(200);
  const idx = dailyConfigs.findIndex((x) => x.id === id);
  if (idx >= 0) dailyConfigs.splice(idx, 1);
}

export async function sendDailyReport(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  await delay(260);
  if (id === 'dr-002') return { ok: false, message: 'SMTP 连接失败（Mock）' };
  return { ok: true };
}

/** 模拟日报内容生成（供列表「生成」操作） */
export async function generateDailyReport(configId: string): Promise<void> {
  await delay(2200);
  const cfg = dailyConfigs.find((x) => x.id === configId);
  latestBodies.set(configId, {
    configId,
    generatedAt: nowIso(),
    progress: `【自动生成】${cfg?.productName ?? ''} 测试进展已更新。`,
    risks: '无',
    tomorrowPlan: '按计划推进明日测试任务。',
  });
}

export async function listWeeklyRows(
  teamId: string,
  week: WeekKey
): Promise<{ status: 'draft' | 'submitted'; rows: WeeklyReportRow[] }> {
  await delay(220);
  if (teamId === 'all') return { status: 'draft', rows: [] };
  const v = ensureWeekly(teamId, week);
  if (isPastWeek(week)) v.status = 'submitted';
  const status = isPastWeek(week) ? 'submitted' : v.status;
  return { status, rows: v.rows.map((r) => ({ ...r })) };
}

function isWeeklyPublished(teamId: string, week: WeekKey): boolean {
  if (teamId === 'all') return false;
  if (isPastWeek(week)) return true;
  return ensureWeekly(teamId, week).status === 'submitted';
}

export async function patchWeeklyRow(
  teamId: string,
  week: WeekKey,
  rowId: string,
  patch: Partial<WeeklyReportRow>
): Promise<{ ok: true } | { ok: false; message: string }> {
  await delay(200);
  if (isWeeklyPublished(teamId, week)) return { ok: false, message: '已提交不可编辑' };
  const v = ensureWeekly(teamId, week);
  const idx = v.rows.findIndex((x) => x.id === rowId);
  if (idx < 0) return { ok: true };
  v.rows[idx] = { ...v.rows[idx], ...patch };
  return { ok: true };
}

export async function addWeeklyRow(teamId: string, week: WeekKey): Promise<WeeklyReportRow> {
  await delay(200);
  if (isWeeklyPublished(teamId, week)) {
    throw new Error('已提交不可添加');
  }
  const v = ensureWeekly(teamId, week);
  const id = `wr-${teamId}-${week}-${String(v.rows.length + 1).padStart(3, '0')}`;
  const row: WeeklyReportRow = {
    id,
    teamId,
    productName: '',
    productType: '平台',
    projectVersion: '',
    projectType: '补丁',
    progress: '正常',
    testerIds: [],
    weeklyProgress: '',
    nextWeekPlan: '',
    remark: '',
  };
  v.rows.push(row);
  return { ...row };
}

export async function deleteWeeklyRow(teamId: string, week: WeekKey, rowId: string): Promise<void> {
  await delay(180);
  if (isWeeklyPublished(teamId, week)) throw new Error('已提交不可删除');
  const v = ensureWeekly(teamId, week);
  const idx = v.rows.findIndex((x) => x.id === rowId);
  if (idx >= 0) v.rows.splice(idx, 1);
}

export async function submitWeekly(teamId: string, week: WeekKey): Promise<void> {
  await delay(260);
  const v = ensureWeekly(teamId, week);
  v.status = 'submitted';
}

export interface StatisticsFilters {
  teamId: string;
  productId: string;
  from: string;
  to: string;
}

export async function getStatistics(_filters: StatisticsFilters): Promise<StatisticsMetrics | null> {
  await delay(260);
  return {
    baselineVersionCount: 12,
    patchVersionCount: 38,
    newCaseCount: 241,
    submittedBugCount: 67,
  };
}

export interface WeeklyTeamLeadRow {
  teamId: string;
  leaderId: string;
  dingTalkId: string;
}

/** 每周定时：星期几（1=周一 … 7=周日）+ 时刻 HH:mm:ss */
export interface WeeklyScheduleTime {
  weekday: number;
  time: string;
}

export interface WeeklySettings {
  collectionCheck: WeeklyScheduleTime;
  scheduledSend: WeeklyScheduleTime;
  teamLeads: WeeklyTeamLeadRow[];
}

let weeklySettings: WeeklySettings = {
  collectionCheck: { weekday: 5, time: '09:00:00' },
  scheduledSend: { weekday: 5, time: '17:00:00' },
  teamLeads: [
    { teamId: '1', leaderId: 'u-zhangsan', dingTalkId: 'zhangsan_dd' },
    { teamId: '2', leaderId: 'u-lisi', dingTalkId: 'lisi_dd' },
  ],
};

export async function getWeeklySettings(): Promise<WeeklySettings> {
  await delay(160);
  return {
    ...weeklySettings,
    teamLeads: weeklySettings.teamLeads.map((x) => ({ ...x })),
  };
}

export async function saveWeeklySettings(next: WeeklySettings): Promise<void> {
  await delay(220);
  weeklySettings = {
    ...next,
    teamLeads: next.teamLeads.map((x) => ({ ...x })),
  };
}

