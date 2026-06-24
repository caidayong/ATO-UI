/**
 * @page 测试工具 / 项目日&周报
 * @version V1.0.1-P6
 * @base docs/prd/V1.0.1-P6/ATO_V1.0.1-P6-页面需求与交互规格.md §3.1；docs/spec/04-页面契约.md § 页面 16
 * @changes
 *   - V1.0.1-P6: 初始实现（日报 Tab + 周报 Tab + 设置 Modal + Mock 权限）
 *   - V1.0.1-P6: 移除 DEV 角色切换器；周报「统计/设置」按基础数据当前用户角色控制
 *   - V1.0.1-P6: 日报工具栏左置「新建日报」+ 团队筛选；列表新增「所属团队」；创建时间仅显示日期
 *   - V1.0.1-P6: 日报弹窗：所属团队/发送人/定时配置；新建无项目状态；邮件模式仅手动与定时
 *   - V1.0.1-P6: 项目状态枚举改为正常/已完成/延期/暂停；版本发布结束后自动已完成
 *   - V1.0.1-P6: 新建日报弹窗测试计划四阶段开始/结束时间必填
 *   - V1.0.1-P6: 日报列表操作栏图标化；生成/停止与行末生成状态指示
 *   - V1.0.1-P6: 周报 Tab 团队标签、周切换第二行居中、统计/设置图标入口
 *   - V1.0.1-P6: 周报周切换改为相对偏移（默认当前周仅「上周」，历史周显示「下周」回退）
 *   - V1.0.1-P6: 查看历史周时增加「本周」按钮，一键回到当前周
 *   - V1.0.1-P6: 周报「产品」改为文本输入；「测试人员」改为多选下拉
 *   - V1.0.1-P6: 周报 Tab 右上角统计/设置图标；设置弹窗团队责任人列表 + 时间配置
 *   - V1.0.1-P6: 周报设置团队去重；检测/发送时间改为每周星期几+时分秒
 *   - V1.0.1-P6: 2026-06-03 UI/交互验收通过（见 PRD §0.2、变更记录）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  MailOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  TimePicker,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES, projectReportDetailPath } from '@/constants/routes';
import { DAILY_TEST_PLAN_PHASES } from '@/constants/dailyReport';
import {
  mockCurrentUserTeamIds,
  mockTeamMemberIds,
  mockTeams,
  mockUsers,
} from '@/mocks/data';
import {
  DAILY_PROJECT_STATUS_OPTIONS,
  resolveDailyProjectStatus,
} from '@/utils/dailyReportStatus';
import type {
  DailyReportConfig,
  DailyTestPlanRow,
  DailyTimerSchedule,
  MailMode,
  WeeklyReportRow,
} from '@/types/projectReports';
import {
  addWeeklyRow,
  createDailyConfig,
  deleteDailyConfig,
  deleteWeeklyRow,
  generateDailyReport,
  listDailyConfigs,
  listMailGroups,
  listRdmsProducts,
  listUsers,
  listWeeklyRows,
  patchWeeklyRow,
  getWeeklySettings,
  saveWeeklySettings,
  sendDailyReport,
  submitWeekly,
  updateDailyConfig,
} from '@/mocks/projectReports';

const { Text } = Typography;
const { RangePicker } = DatePicker;

function normalizeMailMode(mode: string): MailMode {
  return mode === '手动' ? '手动' : '定时';
}

function getSenderEmailsFromTeam(teamId: string): string[] {
  return (mockTeamMemberIds[teamId] ?? [])
    .map((id) => mockUsers.find((u) => u.id === id)?.email)
    .filter((e): e is string => Boolean(e));
}

type TabKey = 'daily' | 'weekly';
type DailyModalMode = 'create' | 'edit';
type DailyGenUiState = 'idle' | 'generating' | 'done';

const TAB_DAILY: TabKey = 'daily';
const TAB_WEEKLY: TabKey = 'weekly';

const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
] as const;

type SettingsTeamLeadFormRow = {
  teamId?: string;
  leaderId?: string;
  dingTalkId?: string;
};

function scheduleTimeToFormValue(schedule: { weekday: number; time: string }) {
  return {
    weekday: schedule.weekday,
    time: dayjs(schedule.time, 'HH:mm:ss'),
  };
}

function tagColorForProjectStatus(status: DailyReportConfig['projectStatus']): string {
  switch (status) {
    case '正常':
      return 'blue';
    case '已完成':
      return 'green';
    case '延期':
      return 'orange';
    case '暂停':
      return 'default';
    default:
      return 'default';
  }
}

function tagColorForWeeklyStatus(status: 'draft' | 'submitted'): string {
  return status === 'submitted' ? 'green' : 'default';
}

function normalizeTab(raw: string | null): TabKey {
  return raw === TAB_WEEKLY ? TAB_WEEKLY : TAB_DAILY;
}

function calcWeekRange(d: Dayjs): { start: Dayjs; end: Dayjs } {
  const day = d.day();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = d.add(mondayOffset, 'day').startOf('day');
  const end = start.add(6, 'day');
  return { start, end };
}

function calcWeekKey(d: Dayjs): string {
  return calcWeekRange(d).start.format('YYYY-MM-DD');
}

function isDeletable(status: DailyReportConfig['projectStatus']): { ok: boolean; reason?: string } {
  if (status === '正常' || status === '延期') return { ok: false, reason: '当前项目状态不允许删除（正常/延期禁止）' };
  return { ok: true };
}

async function validateTestPlanRequired(
  _: unknown,
  rows: Array<{ phase?: string; startAt?: Dayjs; endAt?: Dayjs }> | undefined
): Promise<void> {
  if (!rows?.length) {
    throw new Error('请填写测试计划');
  }
  for (const row of rows) {
    if (!row.startAt) {
      throw new Error(`请填写「${row.phase ?? '该阶段'}」的开始时间`);
    }
    if (!row.endAt) {
      throw new Error(`请填写「${row.phase ?? '该阶段'}」的结束时间`);
    }
    if (dayjs(row.endAt).isBefore(dayjs(row.startAt))) {
      throw new Error(`「${row.phase ?? '该阶段'}」结束时间不能早于开始时间`);
    }
  }
}

export function ProjectReportsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = useMemo(() => normalizeTab(searchParams.get('tab')), [searchParams]);

  // 日报
  const [dailyFilterTeamId, setDailyFilterTeamId] = useState('all');
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyList, setDailyList] = useState<DailyReportConfig[]>([]);
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [dailyModalMode, setDailyModalMode] = useState<DailyModalMode>('create');
  const [dailyEditingId, setDailyEditingId] = useState<string | null>(null);
  const [dailySaving, setDailySaving] = useState(false);
  const [dailyForm] = Form.useForm();
  const dailyMailMode = Form.useWatch('mode', dailyForm) as MailMode | undefined;
  const [dailyGenState, setDailyGenState] = useState<Record<string, DailyGenUiState>>({});
  const dailyGenCancelledRef = useRef<Record<string, boolean>>({});

  const startDailyGenerate = useCallback(async (id: string) => {
    dailyGenCancelledRef.current[id] = false;
    setDailyGenState((prev) => ({ ...prev, [id]: 'generating' }));
    try {
      await generateDailyReport(id);
      if (dailyGenCancelledRef.current[id]) return;
      setDailyGenState((prev) => ({ ...prev, [id]: 'done' }));
      message.success('日报生成完成（Mock）');
    } catch (e) {
      if (dailyGenCancelledRef.current[id]) return;
      message.error((e as Error).message || '日报生成失败');
      setDailyGenState((prev) => ({ ...prev, [id]: 'idle' }));
    }
  }, []);

  const stopDailyGenerate = useCallback((id: string) => {
    dailyGenCancelledRef.current[id] = true;
    setDailyGenState((prev) => ({ ...prev, [id]: 'idle' }));
    message.info('已停止生成');
  }, []);

  // 周报
  const [weeklyTeamId, setWeeklyTeamId] = useState(
    () => mockCurrentUserTeamIds[0] ?? mockTeams[0]?.id ?? '1'
  );
  /** 相对当前自然周的偏移：0=本周，-1=上周，-2=上上周… */
  const [weeklyWeekOffset, setWeeklyWeekOffset] = useState(0);
  const weeklyWeekKey = useMemo(
    () => calcWeekKey(dayjs().add(weeklyWeekOffset, 'week')),
    [weeklyWeekOffset]
  );
  const isWeeklyCurrentWeek = weeklyWeekOffset === 0;
  const [weeklyStatus, setWeeklyStatus] = useState<'draft' | 'submitted'>('draft');
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyReportRow[]>([]);
  const [weeklySettingsOpen, setWeeklySettingsOpen] = useState(false);
  const [weeklySettingsSaving, setWeeklySettingsSaving] = useState(false);
  const [settingsForm] = Form.useForm();
  const settingsTeamLeadsWatch = Form.useWatch('teamLeads', settingsForm) as SettingsTeamLeadFormRow[] | undefined;
  const [weeklySubmitting, setWeeklySubmitting] = useState(false);

  const [productOptions, setProductOptions] = useState<{ value: string; label: string }[]>([]);
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
  const mailGroupOptions = useMemo(() => listMailGroups().map((x) => ({ value: x, label: x })), []);
  const senderSuggestOptions = useMemo(
    () => [
      ...mailGroupOptions,
      ...mockUsers.map((u) => ({ value: u.email, label: `${u.name} <${u.email}>` })),
    ],
    [mailGroupOptions]
  );
  const dailyTeamFormOptions = useMemo(
    () => mockTeams.map((t) => ({ value: t.id, label: t.name })),
    []
  );

  /** 周报团队下拉：与基础数据「团队管理」同源 */
  const weeklyTeamOptions = useMemo(
    () => mockTeams.map((t) => ({ value: t.id, label: t.name })),
    []
  );

  const dailyBasicTeamOptions = useMemo(
    () => [{ value: 'all', label: '全部' }, ...mockTeams.map((t) => ({ value: t.id, label: t.name }))],
    []
  );

  const filteredDailyList = useMemo(() => {
    if (dailyFilterTeamId === 'all') return dailyList;
    return dailyList.filter((r) => r.teamId === dailyFilterTeamId);
  }, [dailyFilterTeamId, dailyList]);

  const refreshDaily = useCallback(async () => {
    setDailyLoading(true);
    try {
      setDailyList(await listDailyConfigs());
    } catch (e) {
      message.error((e as Error).message || '加载日报列表失败');
    } finally {
      setDailyLoading(false);
    }
  }, []);

  const refreshWeekly = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const v = await listWeeklyRows(weeklyTeamId, weeklyWeekKey);
      setWeeklyStatus(v.status);
      setWeeklyRows(v.rows);
    } catch (e) {
      message.error((e as Error).message || '加载周报失败');
    } finally {
      setWeeklyLoading(false);
    }
  }, [weeklyTeamId, weeklyWeekKey]);

  useEffect(() => {
    // 预加载下拉
    setProductOptions(listRdmsProducts().map((p) => ({ value: p.id, label: p.name })));
    setUserOptions(listUsers().map((u) => ({ value: u.id, label: u.name })));
  }, []);

  useEffect(() => {
    refreshDaily();
  }, [refreshDaily]);

  useEffect(() => {
    if (activeTab === TAB_WEEKLY) refreshWeekly();
  }, [activeTab, refreshWeekly]);

  const onTabChange = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams);
      if (key === TAB_DAILY) next.delete('tab');
      else next.set('tab', TAB_WEEKLY);
      navigate({ search: next.toString() ? `?${next.toString()}` : '' }, { replace: true });
    },
    [navigate, searchParams]
  );

  const openCreateDaily = useCallback(() => {
    setDailyModalMode('create');
    setDailyEditingId(null);
    dailyForm.resetFields();
    const defaultTeamId = mockCurrentUserTeamIds[0] ?? mockTeams[0]?.id ?? '';
    dailyForm.setFieldsValue({
      teamId: defaultTeamId,
      mode: '手动',
      senders: [],
      testPlan: DAILY_TEST_PLAN_PHASES.map((phase) => ({ phase })),
    });
    setDailyModalOpen(true);
  }, [dailyForm]);

  const openEditDaily = useCallback(
    (record: DailyReportConfig) => {
      setDailyModalMode('edit');
      setDailyEditingId(record.id);
      dailyForm.resetFields();
      dailyForm.setFieldsValue({
        ...record,
        projectStatus: resolveDailyProjectStatus(record),
        mode: normalizeMailMode(record.mode),
        senders: record.senders?.length ? record.senders : [],
        scheduleDateRange: record.timerSchedule
          ? [dayjs(record.timerSchedule.rangeStart), dayjs(record.timerSchedule.rangeEnd)]
          : undefined,
        scheduleDailyTime: record.timerSchedule?.dailyTime
          ? dayjs(record.timerSchedule.dailyTime, 'HH:mm:ss')
          : undefined,
        testPlan: record.testPlan.map((row) => ({
          ...row,
          startAt: row.startAt ? dayjs(row.startAt) : undefined,
          endAt: row.endAt ? dayjs(row.endAt) : undefined,
        })),
      });
      setDailyModalOpen(true);
    },
    [dailyForm]
  );

  const saveDaily = useCallback(async () => {
    const values = await dailyForm.validateFields();
    setDailySaving(true);
    try {
      const productName =
        (values.productName as string | undefined) ||
        productOptions.find((x) => x.value === values.productId)?.label ||
        '';
      const testOwnerName =
        (values.testOwnerName as string | undefined) ||
        userOptions.find((x) => x.value === values.testOwnerId)?.label ||
        '';
      const devOwnerName = values.devOwnerId
        ? userOptions.find((x) => x.value === values.devOwnerId)?.label
        : undefined;
      const testPlan: DailyTestPlanRow[] = (
        values.testPlan as Array<{ phase: DailyTestPlanRow['phase']; startAt?: Dayjs; endAt?: Dayjs }>
      ).map((row) => ({
        phase: row.phase,
        startAt: row.startAt ? dayjs(row.startAt).toISOString() : undefined,
        endAt: row.endAt ? dayjs(row.endAt).toISOString() : undefined,
      }));
      const teamId = values.teamId as string;
      const teamName = mockTeams.find((t) => t.id === teamId)?.name ?? '';
      const mode = normalizeMailMode(values.mode as string);
      const existing = dailyEditingId ? dailyList.find((x) => x.id === dailyEditingId) : undefined;

      let timerSchedule: DailyTimerSchedule | undefined;
      if (mode === '定时') {
        const [rangeStart, rangeEnd] = values.scheduleDateRange as [Dayjs, Dayjs];
        const dailyTime = values.scheduleDailyTime as Dayjs;
        timerSchedule = {
          rangeStart: rangeStart.format('YYYY-MM-DD'),
          rangeEnd: rangeEnd.format('YYYY-MM-DD'),
          dailyTime: dailyTime.format('HH:mm:ss'),
        };
      }

      const senders = (values.senders as string[] | undefined)?.map((s) => s.trim()).filter(Boolean) ?? [];
      const baseStatus = (dailyModalMode === 'create' ? '正常' : values.projectStatus) as DailyReportConfig['projectStatus'];
      const projectStatus = resolveDailyProjectStatus({ projectStatus: baseStatus, testPlan });

      const payload = {
        name: values.name,
        teamId,
        teamName,
        productId: values.productId,
        productName,
        branch: values.branch,
        projectVersion: values.projectVersion,
        testOwnerId: values.testOwnerId,
        testOwnerName,
        devOwnerId: values.devOwnerId,
        devOwnerName,
        mode,
        projectStatus,
        timerEnabled: mode === '定时' ? (existing?.timerEnabled ?? true) : false,
        timerSchedule,
        senders,
        testPlan,
      };
      if (dailyModalMode === 'create') {
        const ret = await createDailyConfig(payload);
        if (!ret.ok) {
          message.error('日报名称已存在（同产品下需唯一）');
          return;
        }
        message.success('已新建日报配置（Mock）');
      } else {
        if (!dailyEditingId) return;
        const ret = await updateDailyConfig({ ...payload, id: dailyEditingId });
        if (!ret.ok) {
          message.error('日报名称已存在（同产品下需唯一）');
          return;
        }
        message.success('已更新日报配置（Mock）');
      }
      setDailyModalOpen(false);
      await refreshDaily();
    } catch (e) {
      if ((e as Error).name !== 'Error') return;
      message.error((e as Error).message || '保存失败');
    } finally {
      setDailySaving(false);
    }
  }, [dailyEditingId, dailyForm, dailyList, dailyModalMode, productOptions, refreshDaily, userOptions]);

  const dailyColumns: ColumnsType<DailyReportConfig> = useMemo(
    () => [
      {
        title: '日报名称',
        dataIndex: 'name',
        render: (_v, r) => (
          <a
            onClick={() => {
              navigate(projectReportDetailPath(r.id));
            }}
          >
            {r.name}
          </a>
        ),
      },
      { title: '产品', dataIndex: 'productName' },
      { title: '所属团队', dataIndex: 'teamName' },
      { title: '项目版本', dataIndex: 'projectVersion' },
      { title: '测试负责人', dataIndex: 'testOwnerName' },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
      },
      { title: '模式', dataIndex: 'mode', render: (v) => <Tag>{v}</Tag> },
      {
        title: '项目状态',
        dataIndex: 'projectStatus',
        render: (v) => <Tag color={tagColorForProjectStatus(v)}>{v}</Tag>,
      },
      {
        title: '操作',
        key: 'op',
        width: 168,
        render: (_v, r) => {
          const deletable = isDeletable(r.projectStatus);
          const genState = dailyGenState[r.id] ?? 'idle';
          const generateDisabled = r.projectStatus === '已完成' && genState !== 'generating';
          const generateTooltip =
            genState === 'generating'
              ? '停止'
              : generateDisabled
                ? '项目已完成，不可生成'
                : '生成';

          return (
            <Space size={4} align="center">
              <Tooltip title="编辑">
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditDaily(r)} />
              </Tooltip>
              <Tooltip title={generateTooltip}>
                <span>
                  <Button
                    type="text"
                    size="small"
                    icon={genState === 'generating' ? <StopOutlined /> : <PlayCircleOutlined />}
                    disabled={generateDisabled}
                    onClick={() => {
                      if (genState === 'generating') stopDailyGenerate(r.id);
                      else void startDailyGenerate(r.id);
                    }}
                  />
                </span>
              </Tooltip>
              <Tooltip title={deletable.ok ? '删除' : deletable.reason}>
                <span>
                  <Button
                    type="text"
                    size="small"
                    danger
                    disabled={!deletable.ok}
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: '确认删除？',
                        content: '此操作不可恢复，是否继续？',
                        okText: '删除',
                        okButtonProps: { danger: true },
                        cancelText: '取消',
                        async onOk() {
                          await deleteDailyConfig(r.id);
                          message.success('已删除（Mock）');
                          await refreshDaily();
                        },
                      });
                    }}
                  />
                </span>
              </Tooltip>
              <Tooltip title="发送邮件">
                <Button
                  type="text"
                  size="small"
                  icon={<MailOutlined />}
                  onClick={async () => {
                    const ret = await sendDailyReport(r.id);
                    if (ret.ok) message.success('邮件已发送（Mock）');
                    else message.error(ret.message);
                  }}
                />
              </Tooltip>
              {genState === 'generating' ? (
                <Tooltip title="日报生成中">
                  <LoadingOutlined spin style={{ color: '#1677ff', fontSize: 16 }} />
                </Tooltip>
              ) : null}
              {genState === 'done' ? (
                <Tooltip title="日报已生成">
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                </Tooltip>
              ) : null}
            </Space>
          );
        },
      },
    ],
    [dailyGenState, navigate, openEditDaily, refreshDaily, startDailyGenerate, stopDailyGenerate]
  );

  const weeklyEditable = weeklyStatus !== 'submitted';
  const weeklyReadonly = !weeklyEditable;

  const weeklyRangeText = useMemo(() => {
    const { start, end } = calcWeekRange(dayjs(weeklyWeekKey));
    return `${start.format('YYYY-MM-DD')} ~ ${end.format('YYYY-MM-DD')}`;
  }, [weeklyWeekKey]);

  const weeklyStatusLabel = weeklyStatus === 'submitted' ? '已提交' : '草稿';

  const onWeeklySaveCell = useCallback(
    async (rowId: string, patch: Partial<WeeklyReportRow>) => {
      const ret = await patchWeeklyRow(weeklyTeamId, weeklyWeekKey, rowId, patch);
      if (!ret.ok) {
        message.error(ret.message);
        throw new Error(ret.message);
      }
      await refreshWeekly();
    },
    [refreshWeekly, weeklyTeamId, weeklyWeekKey]
  );

  const weeklyColumns: ColumnsType<WeeklyReportRow> = useMemo(() => {
    const cellInput = (r: WeeklyReportRow, key: keyof WeeklyReportRow, placeholder?: string) => {
      const disabled = weeklyReadonly;
      return (
        <Input
          disabled={disabled}
          defaultValue={(r[key] as string) ?? ''}
          placeholder={placeholder}
          onBlur={async (e) => {
            if (disabled) return;
            const next = e.target.value;
            const prev = (r[key] as string) ?? '';
            if (next === prev) return;
            try {
              await onWeeklySaveCell(r.id, { [key]: next } as Partial<WeeklyReportRow>);
              message.success('已保存（Mock）');
            } catch {
              // error toast already shown
            }
          }}
        />
      );
    };

    const cellTextArea = (
      r: WeeklyReportRow,
      key: keyof WeeklyReportRow,
      max: number,
      placeholder?: string
    ) => {
      const disabled = weeklyReadonly;
      return (
        <Input.TextArea
          disabled={disabled}
          autoSize={{ minRows: 2, maxRows: 5 }}
          defaultValue={(r[key] as string) ?? ''}
          placeholder={placeholder}
          maxLength={max}
          onBlur={async (e) => {
            if (disabled) return;
            const next = e.target.value;
            const prev = (r[key] as string) ?? '';
            if (next === prev) return;
            try {
              await onWeeklySaveCell(r.id, { [key]: next } as Partial<WeeklyReportRow>);
              message.success('已保存（Mock）');
            } catch {
              // noop
            }
          }}
        />
      );
    };

    return [
      {
        title: '产品',
        dataIndex: 'productName',
        width: 160,
        render: (_v, r) => cellInput(r, 'productName', '请输入产品'),
      },
      {
        title: '产品类型',
        dataIndex: 'productType',
        width: 120,
        render: (_v, r) => (
          <Select
            style={{ width: '100%' }}
            disabled={weeklyReadonly}
            value={r.productType}
            options={[
              { value: '平台', label: '平台' },
              { value: '设备', label: '设备' },
            ]}
            onChange={async (v) => {
              await onWeeklySaveCell(r.id, { productType: v });
              message.success('已保存（Mock）');
            }}
          />
        ),
      },
      {
        title: '项目版本',
        dataIndex: 'projectVersion',
        width: 160,
        render: (_v, r) => cellInput(r, 'projectVersion', '如 v2.3.1'),
      },
      {
        title: '项目类型',
        dataIndex: 'projectType',
        width: 120,
        render: (_v, r) => (
          <Select
            style={{ width: '100%' }}
            disabled={weeklyReadonly}
            value={r.projectType}
            options={[
              { value: '补丁', label: '补丁' },
              { value: '基线', label: '基线' },
            ]}
            onChange={async (v) => {
              await onWeeklySaveCell(r.id, { projectType: v });
              message.success('已保存（Mock）');
            }}
          />
        ),
      },
      {
        title: '进度',
        dataIndex: 'progress',
        width: 120,
        render: (_v, r) => (
          <Select
            style={{ width: '100%' }}
            disabled={weeklyReadonly}
            value={r.progress}
            options={[
              { value: '正常', label: '正常' },
              { value: '已发布', label: '已发布' },
              { value: '延期', label: '延期' },
            ]}
            onChange={async (v) => {
              await onWeeklySaveCell(r.id, { progress: v });
              message.success('已保存（Mock）');
            }}
          />
        ),
      },
      {
        title: '发布时间',
        dataIndex: 'publishedAt',
        width: 160,
        render: (_v, r) => (
          <DatePicker
            style={{ width: '100%' }}
            disabled={weeklyReadonly}
            value={r.publishedAt ? dayjs(r.publishedAt) : null}
            onChange={async (v) => {
              await onWeeklySaveCell(r.id, { publishedAt: v ? v.toISOString() : undefined });
              message.success('已保存（Mock）');
            }}
          />
        ),
      },
      {
        title: '测试人员',
        dataIndex: 'testerIds',
        width: 220,
        render: (_v, r) => (
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            disabled={weeklyReadonly}
            value={r.testerIds?.length ? r.testerIds : undefined}
            placeholder="选择测试人员"
            options={userOptions}
            maxTagCount="responsive"
            onChange={async (v) => {
              await onWeeklySaveCell(r.id, { testerIds: v });
              message.success('已保存（Mock）');
            }}
          />
        ),
      },
      {
        title: '本周进展',
        dataIndex: 'weeklyProgress',
        width: 320,
        render: (_v, r) => cellTextArea(r, 'weeklyProgress', 2000, '本周进展'),
      },
      {
        title: '下周计划',
        dataIndex: 'nextWeekPlan',
        width: 320,
        render: (_v, r) => cellTextArea(r, 'nextWeekPlan', 2000, '下周计划'),
      },
      {
        title: '备注事项',
        dataIndex: 'remark',
        width: 260,
        render: (_v, r) => cellTextArea(r, 'remark', 1000, '可选'),
      },
      {
        title: '操作',
        key: 'op',
        width: 90,
        fixed: 'right',
        render: (_v, r) => (
          <a
            style={{
              color: weeklyReadonly ? '#999' : undefined,
              pointerEvents: weeklyReadonly ? 'none' : 'auto',
            }}
            onClick={() => {
              Modal.confirm({
                title: '确认删除该行？',
                content: '此操作不可恢复，是否继续？',
                okText: '删除',
                okButtonProps: { danger: true },
                cancelText: '取消',
                async onOk() {
                  await deleteWeeklyRow(weeklyTeamId, weeklyWeekKey, r.id);
                  message.success('已删除（Mock）');
                  await refreshWeekly();
                },
              });
            }}
          >
            删除
          </a>
        ),
      },
    ];
  }, [onWeeklySaveCell, refreshWeekly, userOptions, weeklyReadonly, weeklyTeamId, weeklyWeekKey]);

  const openWeeklySettings = useCallback(async () => {
    const s = await getWeeklySettings();
    settingsForm.setFieldsValue({
      collectionCheck: scheduleTimeToFormValue(s.collectionCheck),
      scheduledSend: scheduleTimeToFormValue(s.scheduledSend),
      teamLeads: s.teamLeads.length
        ? s.teamLeads
        : [{ teamId: undefined, leaderId: undefined, dingTalkId: '' }],
    });
    setWeeklySettingsOpen(true);
  }, [settingsForm]);

  const weeklyHeader = (
    <div style={{ width: '100%' }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <Space wrap size={12} align="center">
          <Space size={8} align="center">
            <Text>团队</Text>
            <Select
              style={{ width: 200 }}
              value={weeklyTeamId}
              options={weeklyTeamOptions}
              onChange={(v) => {
                setWeeklyTeamId(v);
                setWeeklyWeekOffset(0);
              }}
            />
          </Space>
          <Tag color={tagColorForWeeklyStatus(weeklyStatus)}>{weeklyStatusLabel}</Tag>
          <Text type="secondary">{weeklyRangeText}</Text>
        </Space>

        <Space size={8} align="center">
          {isWeeklyCurrentWeek && weeklyStatus === 'draft' ? (
            <Button
              type="primary"
              loading={weeklySubmitting}
              onClick={async () => {
                const missing = weeklyRows.some(
                  (r) =>
                    !r.productName?.trim() ||
                    !r.projectVersion?.trim() ||
                    !r.testerIds?.length ||
                    !r.weeklyProgress?.trim() ||
                    !r.nextWeekPlan?.trim()
                );
                if (missing) {
                  message.error('请先补齐周报必填项后再提交');
                  return;
                }
                setWeeklySubmitting(true);
                try {
                  await submitWeekly(weeklyTeamId, weeklyWeekKey);
                  message.success('已提交（Mock），提交后不可撤回');
                  await refreshWeekly();
                } finally {
                  setWeeklySubmitting(false);
                }
              }}
            >
              提交
            </Button>
          ) : null}
          <Tooltip title="统计">
            <Button
              type="text"
              icon={<BarChartOutlined />}
              onClick={() => navigate(ROUTES.TOOLS_PROJECT_REPORTS_STATISTICS)}
            />
          </Tooltip>
          <Tooltip title="设置">
            <Button type="text" icon={<SettingOutlined />} onClick={() => void openWeeklySettings()} />
          </Tooltip>
        </Space>
      </Flex>

      <Flex justify="center" style={{ marginTop: 12 }}>
        <Space size={8}>
          <Button size="small" onClick={() => setWeeklyWeekOffset((o) => o - 1)}>
            上周
          </Button>
          {!isWeeklyCurrentWeek ? (
            <>
              <Button size="small" onClick={() => setWeeklyWeekOffset((o) => Math.min(o + 1, 0))}>
                下周
              </Button>
              <Button size="small" type="primary" onClick={() => setWeeklyWeekOffset(0)}>
                本周
              </Button>
            </>
          ) : null}
        </Space>
      </Flex>
    </div>
  );

  useEffect(() => {
    // team/week/view 变动刷新
    if (activeTab !== TAB_WEEKLY) return;
    refreshWeekly();
  }, [activeTab, refreshWeekly, weeklyTeamId, weeklyWeekKey]);

  const dailyTab = (
    <Card styles={{ body: { paddingTop: 12 } }}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openCreateDaily}>
          新建日报
        </Button>
        <Select
          style={{ width: 200 }}
          value={dailyFilterTeamId}
          options={dailyBasicTeamOptions}
          onChange={setDailyFilterTeamId}
        />
      </Space>
      <Table
        rowKey="id"
        loading={dailyLoading}
        columns={dailyColumns}
        dataSource={filteredDailyList}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: <Empty description="暂无日报配置，点击「新建日报」创建项目日报" /> }}
      />

      <Modal
        title={dailyModalMode === 'create' ? '新建项目日报' : '编辑项目日报'}
        open={dailyModalOpen}
        onCancel={() => setDailyModalOpen(false)}
        onOk={saveDaily}
        confirmLoading={dailySaving}
        okText="保存"
        cancelText="取消"
        width={dailyMailMode === '定时' ? 1000 : 960}
        maskClosable={false}
      >
        <Form form={dailyForm} layout="vertical">
          <Form.Item label="日报名称" name="name" rules={[{ required: true, message: '请输入日报名称' }]}>
            <Input placeholder="如 支付线-SIT-日报" />
          </Form.Item>

          <Space style={{ width: '100%', display: 'flex' }} size={12} align="start">
            <Form.Item
              style={{ flex: 1, minWidth: 0 }}
              label="所属团队"
              name="teamId"
              rules={[{ required: true, message: '请选择所属团队' }]}
            >
              <Select placeholder="选择团队" options={dailyTeamFormOptions} />
            </Form.Item>
            <Form.Item
              style={{ flex: 1, minWidth: 0 }}
              label="产品"
              name="productId"
              rules={[{ required: true, message: '请选择产品' }]}
            >
              <Select
                placeholder="选择产品"
                options={productOptions}
                disabled={dailyModalMode === 'edit'}
                onChange={(v) => {
                  const label = productOptions.find((x) => x.value === v)?.label;
                  dailyForm.setFieldValue('productName', label);
                }}
              />
            </Form.Item>
            <Form.Item style={{ flex: 1, minWidth: 0 }} label="分支" name="branch">
              <Input placeholder="可选" disabled={dailyModalMode === 'edit'} />
            </Form.Item>
            <Form.Item
              style={{ flex: 1, minWidth: 0 }}
              label="项目版本"
              name="projectVersion"
              rules={[{ required: true, message: '请输入项目版本' }]}
            >
              <Input placeholder="如 v2.3.1" disabled={dailyModalMode === 'edit'} />
            </Form.Item>
            {dailyModalMode === 'edit' ? (
              <Form.Item
                style={{ flex: 1, minWidth: 0 }}
                label="项目状态"
                name="projectStatus"
                rules={[{ required: true, message: '请选择项目状态' }]}
              >
                <Select options={DAILY_PROJECT_STATUS_OPTIONS} />
              </Form.Item>
            ) : null}
          </Space>

          <Space style={{ width: '100%', display: 'flex' }} size={12} align="start">
            <Form.Item
              style={{ flex: 1, minWidth: 0 }}
              label="测试负责人"
              name="testOwnerId"
              rules={[{ required: true, message: '请选择测试负责人' }]}
            >
              <Select
                placeholder="选择"
                options={userOptions}
                onChange={(v) => {
                  const label = userOptions.find((x) => x.value === v)?.label;
                  dailyForm.setFieldValue('testOwnerName', label);
                }}
              />
            </Form.Item>
            <Form.Item style={{ flex: 1, minWidth: 0 }} label="版本开发负责人" name="devOwnerId">
              <Select
                placeholder="可选"
                options={userOptions}
                allowClear
                onChange={(v) => {
                  const label = userOptions.find((x) => x.value === v)?.label;
                  dailyForm.setFieldValue('devOwnerName', label);
                }}
              />
            </Form.Item>
          </Space>

          <Space
            style={{ width: '100%', display: 'flex', marginBottom: 24 }}
            size={12}
            align="start"
            wrap
          >
            <Form.Item
              label="邮件模式"
              name="mode"
              rules={[{ required: true, message: '请选择邮件模式' }]}
              style={{ marginBottom: 0, minWidth: 140 }}
            >
              <Select
                style={{ width: 120 }}
                options={[
                  { value: '手动', label: '手动' },
                  { value: '定时', label: '定时' },
                ]}
              />
            </Form.Item>
            {dailyMailMode === '定时' ? (
              <>
                <Form.Item
                  label="生效日期"
                  name="scheduleDateRange"
                  rules={[{ required: true, message: '请选择生效日期范围' }]}
                  style={{ marginBottom: 0 }}
                >
                  <RangePicker format="YYYY-MM-DD" />
                </Form.Item>
                <Form.Item
                  label="每日定时"
                  name="scheduleDailyTime"
                  rules={[{ required: true, message: '请选择每日发送时刻' }]}
                  style={{ marginBottom: 0 }}
                >
                  <TimePicker format="HH:mm:ss" />
                </Form.Item>
              </>
            ) : null}
          </Space>

          <Form.Item label="发送人" required>
            <div style={{ display: 'flex', gap: 12, width: '100%', alignItems: 'flex-start' }}>
              <Form.Item
                name="senders"
                rules={[
                  {
                    required: true,
                    type: 'array',
                    min: 1,
                    message: '请至少填写一位发送人',
                  },
                ]}
                noStyle
                style={{ flex: 1, minWidth: 0, marginBottom: 0 }}
              >
                <Select
                  mode="tags"
                  tokenSeparators={[',', ';']}
                  placeholder="输入邮箱或选择建议项"
                  options={senderSuggestOptions}
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Select
                allowClear
                placeholder="请选择发送团队"
                options={dailyTeamFormOptions}
                style={{ width: 200, flexShrink: 0 }}
                onChange={(teamId) => {
                  if (!teamId) return;
                  const emails = getSenderEmailsFromTeam(teamId);
                  dailyForm.setFieldValue('senders', emails);
                  message.success(`已回填 ${emails.length} 个发送人邮箱`);
                }}
              />
            </div>
          </Form.Item>

          <Form.Item
            label="测试计划"
            required={dailyModalMode === 'create'}
            style={{ marginBottom: 0 }}
          >
            <Text type="secondary">固定 3 行：冒烟测试、SIT 测试、UAT 测试</Text>
          </Form.Item>
          <Form.List
            name="testPlan"
            rules={
              dailyModalMode === 'create'
                ? [{ validator: validateTestPlanRequired }]
                : undefined
            }
          >
            {(fields) => (
              <Table
                size="small"
                rowKey={(f) => String(f.key)}
                pagination={false}
                columns={[
                  {
                    title: '测试阶段',
                    dataIndex: 'phase',
                    render: (_v, _r, idx) => (
                      <Form.Item name={[fields[idx].name, 'phase']} style={{ marginBottom: 0 }}>
                        <Input disabled />
                      </Form.Item>
                    ),
                  },
                  {
                    title: (
                      <span>
                        开始时间
                        {dailyModalMode === 'create' ? <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span> : null}
                      </span>
                    ),
                    dataIndex: 'startAt',
                    render: (_v, _r, idx) => (
                      <Form.Item
                        name={[fields[idx].name, 'startAt']}
                        style={{ marginBottom: 0 }}
                        rules={
                          dailyModalMode === 'create'
                            ? [{ required: true, message: '请选择开始时间' }]
                            : undefined
                        }
                      >
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    ),
                  },
                  {
                    title: (
                      <span>
                        结束时间
                        {dailyModalMode === 'create' ? <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span> : null}
                      </span>
                    ),
                    dataIndex: 'endAt',
                    render: (_v, _r, idx) => (
                      <Form.Item
                        name={[fields[idx].name, 'endAt']}
                        style={{ marginBottom: 0 }}
                        rules={
                          dailyModalMode === 'create'
                            ? [
                                { required: true, message: '请选择结束时间' },
                                ({ getFieldValue }) => ({
                                  validator: async (_rule, endAt: Dayjs | undefined) => {
                                    const startAt = getFieldValue(['testPlan', fields[idx].name, 'startAt']) as
                                      | Dayjs
                                      | undefined;
                                    if (!startAt || !endAt) return;
                                    if (dayjs(endAt).isBefore(dayjs(startAt))) {
                                      throw new Error('结束时间不能早于开始时间');
                                    }
                                  },
                                }),
                              ]
                            : undefined
                        }
                      >
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    ),
                  },
                ]}
                dataSource={fields}
              />
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );

  const weeklyTab = (
    <Card styles={{ body: { paddingTop: 12 } }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {weeklyHeader}
        <Table
          rowKey="id"
          loading={weeklyLoading}
          columns={weeklyColumns}
          dataSource={weeklyRows}
          pagination={false}
          scroll={{ x: 1600 }}
          locale={{
            emptyText: <Empty description="暂无周报行，可点击下方「添加」插入空行" />,
          }}
          footer={() =>
            weeklyReadonly ? null : (
              <Button
                onClick={async () => {
                  const row = await addWeeklyRow(weeklyTeamId, weeklyWeekKey);
                  setWeeklyRows((prev) => [...prev, row]);
                  message.success('已添加空行（Mock）');
                }}
              >
                添加
              </Button>
            )
          }
        />
      </Space>

      <Modal
        title="周报设置"
        open={weeklySettingsOpen}
        onCancel={() => setWeeklySettingsOpen(false)}
        onOk={async () => {
          const v = await settingsForm.validateFields();
          const teamLeads = (v.teamLeads as Array<{ teamId: string; leaderId: string; dingTalkId: string }>) ?? [];
          const teamIds = teamLeads.map((r) => r.teamId);
          if (new Set(teamIds).size !== teamIds.length) {
            message.error('团队不能重复配置');
            return;
          }
          setWeeklySettingsSaving(true);
          try {
            const collectionCheck = v.collectionCheck as { weekday: number; time: Dayjs };
            const scheduledSend = v.scheduledSend as { weekday: number; time: Dayjs };
            await saveWeeklySettings({
              collectionCheck: {
                weekday: collectionCheck.weekday,
                time: collectionCheck.time.format('HH:mm:ss'),
              },
              scheduledSend: {
                weekday: scheduledSend.weekday,
                time: scheduledSend.time.format('HH:mm:ss'),
              },
              teamLeads,
            });
            message.success('已保存设置（Mock）');
            setWeeklySettingsOpen(false);
          } catch (e) {
            message.error((e as Error).message || '保存失败');
          } finally {
            setWeeklySettingsSaving(false);
          }
        }}
        confirmLoading={weeklySettingsSaving}
        okText="保存"
        cancelText="取消"
        width={720}
        maskClosable={false}
      >
        <Form form={settingsForm} layout="vertical">
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            团队及责任人配置
          </Typography.Title>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 40px',
              gap: 8,
              marginBottom: 8,
              padding: '0 4px',
            }}
          >
            <Text type="secondary">团队</Text>
            <Text type="secondary">负责人</Text>
            <Text type="secondary">钉钉号</Text>
            <span />
          </div>
          <Form.List name="teamLeads">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => {
                  const currentTeamId = settingsTeamLeadsWatch?.[field.name]?.teamId;
                  const usedTeamIds = new Set(
                    (settingsTeamLeadsWatch ?? [])
                      .filter((_, idx) => idx !== field.name)
                      .map((row) => row?.teamId)
                      .filter((id): id is string => Boolean(id))
                  );
                  const rowTeamOptions = weeklyTeamOptions.filter(
                    (opt) => !usedTeamIds.has(opt.value) || opt.value === currentTeamId
                  );
                  return (
                  <div
                    key={field.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 40px',
                      gap: 8,
                      marginBottom: 8,
                      alignItems: 'start',
                    }}
                  >
                    <Form.Item
                      name={[field.name, 'teamId']}
                      rules={[{ required: true, message: '请选择团队' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select placeholder="团队" options={rowTeamOptions} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'leaderId']}
                      rules={[{ required: true, message: '请选择负责人' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select placeholder="负责人" options={userOptions} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'dingTalkId']}
                      rules={[{ required: true, message: '请输入钉钉号' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="钉钉号" />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={fields.length <= 1}
                      onClick={() => remove(field.name)}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                  );
                })}
                <Button
                  type="dashed"
                  disabled={fields.length >= weeklyTeamOptions.length}
                  onClick={() => add({ dingTalkId: '' })}
                  block
                >
                  添加一行
                </Button>
              </>
            )}
          </Form.List>

          <Divider style={{ margin: '20px 0' }} />

          <Typography.Title level={5} style={{ marginTop: 0 }}>
            时间配置
          </Typography.Title>
          <Form.Item label="周报收集检测时间" required style={{ marginBottom: 8 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name={['collectionCheck', 'weekday']}
                noStyle
                rules={[{ required: true, message: '请选择星期' }]}
              >
                <Select style={{ width: '38%' }} placeholder="星期" options={[...WEEKDAY_OPTIONS]} />
              </Form.Item>
              <Form.Item
                name={['collectionCheck', 'time']}
                noStyle
                rules={[{ required: true, message: '请选择时刻' }]}
              >
                <TimePicker
                  style={{ width: '62%' }}
                  format="HH:mm:ss"
                  placeholder="时:分:秒"
                />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          <Form.Item label="周报定期发送时间" required style={{ marginBottom: 0 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name={['scheduledSend', 'weekday']}
                noStyle
                rules={[{ required: true, message: '请选择星期' }]}
              >
                <Select style={{ width: '38%' }} placeholder="星期" options={[...WEEKDAY_OPTIONS]} />
              </Form.Item>
              <Form.Item
                name={['scheduledSend', 'time']}
                noStyle
                rules={[{ required: true, message: '请选择时刻' }]}
              >
                <TimePicker
                  style={{ width: '62%' }}
                  format="HH:mm:ss"
                  placeholder="时:分:秒"
                />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );

  return (
    <Tabs
      activeKey={activeTab}
      onChange={onTabChange}
      items={[
        { key: TAB_DAILY, label: '项目日报', children: dailyTab },
        { key: TAB_WEEKLY, label: '项目周报', children: weeklyTab },
      ]}
    />
  );
}

