/**
 * @page 测试运行
 * @version V1.0.20
 * @base docs/spec/04-页面契约.md § 页面 9（测试运行）；PRD 章节待同步，以契约为准
 * @changes
 *   - V1.0.0: 初始实现测试运行页；支持创建自测任务、任务搜索、状态联动运行/停止、任务删除与任务详情跳转（Mock）
 *   - V1.0.1: 工具栏搜索框右对齐；列表增加任务名称、进度列；进度每 10s 刷新（运行中/排队中 Mock 递增）
 *   - V1.0.2: 仅「运行中」进度定时增长；「排队中」进度固定为 0；「已停止」保留停止前最后进度
 *   - V1.0.3: 创建自测任务弹窗双栏布局；执行范围（模块双选+多行标签）；执行限时按分钟、并行数禁用、清空下载目录开关
 *   - V1.0.4: 任务名称改为必填并上移到顶部；并行配置移至执行范围下方，支持分组类型与并行线程数
 *   - V1.0.5: 并行配置改为按模块/按分组单选；串行/并行步骤列表；按模块时一级目录树多选、按分组时分组多选；并行线程数按并行步骤最大选中数自动计算
 *   - V1.0.6: 串行/并行按钮与分组方式同行；前后步骤选项去重并自动裁剪冲突；按分组数据与「标签/分组」分组列表同源（mockTagManagementGroups）；修复 parallelGroupType 误置于 Form.List 内导致的打开弹窗白屏
 *   - V1.0.7: 并行线程数改为可手动编辑，不再随并行步骤自动覆盖
 *   - V1.0.8: 并行步骤行首改为全局序号 1、2、3…；执行范围在所属模块与标签之间增加可选「测试套件」（数据源 mockSuites）
 *   - V1.0.9: 并行线程数随「并行」步骤多选数量自动同步（各并行步选中数取最大，至少为 1），仍可手动改
 *   - V1.0.10: 执行范围「所属模块」改为包含/不包含 + 模块多选；「标签」每行改为等于/包含/不包含 + 标签多选（与图示一致）
 *   - V1.0.11: 创建自测任务弹窗禁止遮罩/ESC/右上角关闭；仅底部「取消」「开始运行」可关闭
 *   - V1.0.12: 并行配置支持模版下拉（mockParallelRunTemplates）、分组方式标题与单选同行、另存为模版（有步骤时可保存至项目 Mock 列表）
 *   - V1.0.13: 创建任务弹窗右侧执行范围+并行配置栅格占 2/3；另存为模版与名称输入、保存同一行（Space.Compact）
 *   - V1.0.14: 并行配置按模块时一级目录 TreeSelect 下拉内增加全选/反选
 *   - V1.0.15: 执行范围增加「自定义 / 选择套件」模式（默认自定义）；自定义仅所属模块+标签，选择套件仅测试套件下拉
 *   - V1.0.16: 并行配置区块抽为共用组件；选择套件时若套件含并行配置则自动回填
 *   - V1.0.17: 创建任务弹窗并行配置移除「选择并行配置模版」与「另存为模版」
 *   - V1.0.18: 创建任务弹窗「自定义/选择套件」上移至执行范围之上；选择套件时仅下拉框并在下方只读回显套件用例范围与并行配置
 *   - V1.0.19: 整机版本开发「运行环境」下拉改为资源管理 · 自动化环境名称
 *   - V1.0.20: 订阅用例管理「调试运行 · 持久」写入的跨页任务（versionRunTasksBridge）
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PARALLEL_FORM_FIELDS,
  ParallelRunConfigFormSection,
} from '@/components/ParallelRunConfigFormSection';
import { SuiteConfigPreview } from '@/components/SuiteConfigPreview';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { InfoCircleOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { CaseModule, SuiteScopePersist, TaskStatus } from '@/types';
import {
  MODULE_ROOT_ALL,
  MODULE_MATCH_OPTIONS,
  TAG_MATCH_OPTIONS,
  collectSubtreeModuleIds,
  type ParallelPlanStepForm,
} from '@/utils/parallelRunWizardShared';
import { mockCaseModules, mockSuites, mockTestCases } from '@/mocks/data';
import { useVersionDevRoutes } from '@/hooks/useVersionDevRoutes';
import { getInitialRunTaskEnvs, useRunEnvironmentOptions } from '@/hooks/useRunEnvironmentOptions';
import {
  getExtraVersionRunTasks,
  subscribeVersionRunTasks,
} from '@/utils/versionRunTasksBridge';

type RunScope = 'all' | 'module' | 'tag' | 'case';

type RunTask = {
  id: string;
  name: string;
  versionId: string;
  env: string;
  scope: RunScope;
  scopeValues: string[];
  /** 标签条件：行间 AND，行内 OR（与模块范围取交集） */
  filterTagRows?: string[][];
  /** 创建时勾选的测试套件（Mock，可选） */
  suiteId?: string;
  triggerTime: string;
  finishTime: string;
  status: TaskStatus;
  /** 0–100；仅「运行中」由定时器推进；「排队中」保持 0；「已停止」保留最后进度；「已完成」为 100 */
  progress: number;
  caseCount: number;
  coverage: number;
  passRate: number;
  duration: string;
};

type TagRowForm = {
  /** 等于 / 包含 / 不包含 */
  tagMatchType?: '等于' | '包含' | '不包含';
  tags?: string[];
};

type ScopeMode = 'custom' | 'suite';

type CreateRunForm = {
  name: string;
  env: string;
  runTimes: number;
  retryTimes: number;
  timeoutMinutes: number;
  clearDownloadAfterDone: boolean;
  /** 执行范围配置模式：自定义（模块+标签）或选择套件 */
  scopeMode: ScopeMode;
  /** 所属模块与目录范围的关系 */
  moduleMatchType: '包含' | '不包含';
  moduleIds: string[];
  /** 测试套件（scopeMode 为 suite 时必填） */
  suiteId?: string;
  tagRows: TagRowForm[];
  /** 按模块：一级目录多选；按分组：分组多选 */
  parallelGroupType: 'module' | 'group';
  /** 已选并行配置模版（Mock），默认空 */
  parallelPlanSteps: ParallelPlanStepForm[];
  parallelThreadCount: number;
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  排队中: 'processing',
  运行中: 'blue',
  已完成: 'success',
  已停止: 'default',
  失败: 'error',
};

const ENV_OPTIONS_UI = [
  { value: 'DEV', label: 'DEV 测试环境' },
  { value: 'SIT', label: 'SIT测试环境' },
  { value: 'UAT', label: 'UAT 测试环境' },
  { value: 'PRD', label: 'PRD 测试环境' },
  { value: 'PRE', label: 'PRE 测试环境' },
] as const;

function sameSortedTagKey(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((t, i) => t === y[i]);
}

function computeExecutionCaseCount(
  cases: { moduleId: string; tags: string[] }[],
  modules: CaseModule[],
  moduleIds: string[],
  moduleMatchType: '包含' | '不包含',
  tagRows: TagRowForm[]
): number {
  let list = cases;
  const useAllModules = moduleIds.includes(MODULE_ROOT_ALL);

  if (useAllModules) {
    if (moduleMatchType === '不包含') {
      const excluded = new Set<string>();
      const root = modules.find((m) => m.parentId === null);
      if (root) {
        collectSubtreeModuleIds(root.id, modules).forEach((id) => excluded.add(id));
      }
      list = list.filter((c) => !excluded.has(c.moduleId));
    }
  } else {
    const boundary = new Set<string>();
    moduleIds
      .filter((id) => id !== MODULE_ROOT_ALL)
      .forEach((id) => {
        collectSubtreeModuleIds(id, modules).forEach((mid) => boundary.add(mid));
      });
    if (moduleMatchType === '包含') {
      list = list.filter((c) => boundary.has(c.moduleId));
    } else {
      list = list.filter((c) => !boundary.has(c.moduleId));
    }
  }

  const activeTagRows = tagRows.filter((r) => r.tags && r.tags.length);
  if (activeTagRows.length) {
    list = list.filter((c) =>
      activeTagRows.every((row) => {
        const sel = row.tags as string[];
        const op = row.tagMatchType ?? '包含';
        if (op === '包含') return sel.some((t) => c.tags.includes(t));
        if (op === '不包含') return !sel.some((t) => c.tags.includes(t));
        return sameSortedTagKey(sel, c.tags);
      })
    );
  }
  return list.length;
}

function caseMatchesModuleScopeRow(
  moduleId: string,
  modules: CaseModule[],
  relation: 'include' | 'exclude',
  moduleIds: string[]
): boolean {
  const useAllModules = moduleIds.includes(MODULE_ROOT_ALL);
  if (useAllModules) {
    if (relation === 'exclude') {
      const excluded = new Set<string>();
      const root = modules.find((m) => m.parentId === null);
      if (root) {
        collectSubtreeModuleIds(root.id, modules).forEach((id) => excluded.add(id));
      }
      return !excluded.has(moduleId);
    }
    return true;
  }
  const boundary = new Set<string>();
  moduleIds
    .filter((id) => id !== MODULE_ROOT_ALL)
    .forEach((id) => {
      collectSubtreeModuleIds(id, modules).forEach((mid) => boundary.add(mid));
    });
  if (relation === 'include') {
    return boundary.has(moduleId);
  }
  return !boundary.has(moduleId);
}

function caseMatchesTagScopeRow(
  caseTags: string[],
  relation: 'eq' | 'include' | 'exclude',
  selectedTags: string[]
): boolean {
  if (relation === 'include') return selectedTags.some((t) => caseTags.includes(t));
  if (relation === 'exclude') return !selectedTags.some((t) => caseTags.includes(t));
  return sameSortedTagKey(selectedTags, caseTags);
}

function computeExecutionCaseCountFromSuiteScope(
  cases: { moduleId: string; tags: string[] }[],
  modules: CaseModule[],
  scope: SuiteScopePersist
): number {
  const moduleRows = (scope.moduleRows ?? []).filter((r) => (r.moduleIds?.length ?? 0) > 0);
  const tagRows = (scope.tagRows ?? []).filter((r) => (r.tags?.length ?? 0) > 0);
  return cases.filter((c) => {
    const moduleOk =
      moduleRows.length === 0 ||
      moduleRows.every((row) =>
        caseMatchesModuleScopeRow(c.moduleId, modules, row.relation, row.moduleIds ?? [])
      );
    if (!moduleOk) return false;
    return (
      tagRows.length === 0 ||
      tagRows.every((row) => caseMatchesTagScopeRow(c.tags, row.relation, row.tags ?? []))
    );
  }).length;
}

function nowText(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
}

function taskId(): string {
  return `RUN-${Date.now()}`;
}

export function TestRuns() {
  const { projectId = '', versionId = '' } = useParams<{ projectId: string; versionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toRunDetailPath } = useVersionDevRoutes();
  const { options: runEnvOptions, defaultEnv, isDeviceVersionDev } = useRunEnvironmentOptions();
  const [initialTaskEnvs] = useState(() => getInitialRunTaskEnvs());

  const envSelectOptions = useMemo(
    () => (isDeviceVersionDev ? runEnvOptions : [...ENV_OPTIONS_UI]),
    [isDeviceVersionDev, runEnvOptions]
  );

  const versionCases = useMemo(
    () => mockTestCases.filter((item) => item.versionId === versionId),
    [versionId]
  );
  const versionModules = useMemo(
    () => mockCaseModules.filter((item) => item.versionId === versionId),
    [versionId]
  );
  const allTags = useMemo(() => {
    const set = new Set<string>();
    versionCases.forEach((item) => item.tags.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [versionCases]);

  const moduleSelectOptions = useMemo(() => {
    const rest = versionModules.map((m) => ({ label: m.name, value: m.id }));
    return [{ label: '根目录', value: MODULE_ROOT_ALL }, ...rest];
  }, [versionModules]);

  const tagSelectOptions = useMemo(
    () => allTags.map((t) => ({ label: t, value: t })),
    [allTags]
  );

  const suiteSelectOptions = useMemo(
    () => mockSuites.map((s) => ({ label: s.name, value: s.id })),
    []
  );

  const [tasks, setTasks] = useState<RunTask[]>([
    {
      id: 'RUN-20260330001',
      name: isDeviceVersionDev ? '整机冒烟回归' : 'SIT 全量自测',
      versionId,
      env: initialTaskEnvs[0],
      scope: 'all',
      scopeValues: [],
      triggerTime: '2026-03-30 10:10:00',
      finishTime: '2026-03-30 10:15:20',
      status: '已完成',
      progress: 100,
      caseCount: Math.max(versionCases.length, 12),
      coverage: 93,
      passRate: 91,
      duration: '320s',
    },
    {
      id: 'RUN-20260330002',
      name: isDeviceVersionDev ? 'ADplus 巡检' : 'DEV smoke 巡检',
      versionId,
      env: initialTaskEnvs[1],
      scope: 'tag',
      scopeValues: ['smoke'],
      triggerTime: '2026-03-30 11:00:00',
      finishTime: '-',
      status: '运行中',
      progress: 32,
      caseCount: Math.max(versionCases.filter((item) => item.tags.includes('smoke')).length, 4),
      coverage: 0,
      passRate: 0,
      duration: '-',
    },
  ]);
  const [searchText, setSearchText] = useState('');

  /** 合并用例管理「调试运行 · 持久」追加的任务 */
  useEffect(() => {
    const mergeExtraTasks = () => {
      const extras = getExtraVersionRunTasks(versionId);
      if (extras.length === 0) return;
      setTasks((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        const newOnes = extras.filter((t) => !ids.has(t.id));
        if (newOnes.length === 0) return prev;
        return [...newOnes, ...prev];
      });
    };
    mergeExtraTasks();
    return subscribeVersionRunTasks(mergeExtraTasks);
  }, [versionId]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateRunForm>();

  const watchedScopeMode = Form.useWatch('scopeMode', createForm) as ScopeMode | undefined;
  const watchedSuiteId = Form.useWatch('suiteId', createForm) as string | undefined;
  const scopeMode: ScopeMode = watchedScopeMode ?? 'custom';

  const selectedSuite = useMemo(
    () => (watchedSuiteId ? mockSuites.find((s) => s.id === watchedSuiteId) : undefined),
    [watchedSuiteId]
  );

  const runningTimerRef = useRef<Record<string, number>>({});

  const filteredTasks = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return tasks;
    return tasks.filter(
      (item) =>
        item.id.toLowerCase().includes(kw) ||
        item.env.toLowerCase().includes(kw) ||
        item.name.toLowerCase().includes(kw)
    );
  }, [searchText, tasks]);

  /** 仅「运行中」：每 10s 更新进度（Mock，上限 99；完成后由 finishTaskMock 置 100） */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.status !== '运行中') return item;
          const delta = 4 + Math.floor(Math.random() * 12);
          const next = Math.min(99, item.progress + delta);
          return { ...item, progress: next };
        })
      );
    }, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const stopTask = (id: string) => {
    if (runningTimerRef.current[id]) {
      window.clearTimeout(runningTimerRef.current[id]);
      delete runningTimerRef.current[id];
    }
    setTasks((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: '已停止',
              finishTime: nowText(),
              duration: item.duration === '-' ? '0s' : item.duration,
            }
          : item
      )
    );
    message.success('任务已停止');
  };

  const finishTaskMock = (id: string) => {
    setTasks((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: '已完成',
              finishTime: nowText(),
              progress: 100,
              coverage: item.caseCount ? 100 : 0,
              passRate: item.caseCount ? 90 : 0,
              duration: `${Math.max(6, item.caseCount * 2)}s`,
            }
          : item
      )
    );
    delete runningTimerRef.current[id];
  };

  const runTask = (id: string) => {
    setTasks((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: '运行中',
              triggerTime: nowText(),
              finishTime: '-',
              progress: 0,
              coverage: 0,
              passRate: 0,
              duration: '-',
            }
          : item
      )
    );
    if (runningTimerRef.current[id]) window.clearTimeout(runningTimerRef.current[id]);
    runningTimerRef.current[id] = window.setTimeout(() => finishTaskMock(id), 2500);
    message.success('任务开始运行（Mock）');
  };

  const createTask = async () => {
    const values = await createForm.validateFields();
    const mode: ScopeMode = values.scopeMode ?? 'custom';
    let count: number;
    let scope: RunScope;
    let scopeValues: string[];
    let filterTagRows: string[][] | undefined;
    let suiteId: string | undefined;

    if (mode === 'suite') {
      const suite = mockSuites.find((s) => s.id === values.suiteId);
      if (!suite?.scope) {
        message.error('所选测试套件无效或未配置用例范围');
        return;
      }
      count = computeExecutionCaseCountFromSuiteScope(versionCases, versionModules, suite.scope);
      scope = 'all';
      scopeValues = [];
      filterTagRows = undefined;
      suiteId = values.suiteId;
    } else {
      const moduleIds = values.moduleIds || [];
      const moduleMatchType = values.moduleMatchType ?? '包含';
      const tagRows = values.tagRows || [];
      count = computeExecutionCaseCount(
        versionCases,
        versionModules,
        moduleIds,
        moduleMatchType,
        tagRows
      );
      const tagRowsFiltered = tagRows
        .filter((r) => r.tags && r.tags.length)
        .map((r) => r.tags as string[]);
      const useAllMods = moduleIds.includes(MODULE_ROOT_ALL);
      const realModuleIds = moduleIds.filter((id) => id !== MODULE_ROOT_ALL);
      if (useAllMods && tagRowsFiltered.length === 0) {
        scope = 'all';
        scopeValues = [];
      } else if (!useAllMods && tagRowsFiltered.length === 0) {
        scope = 'module';
        scopeValues = realModuleIds;
      } else if (useAllMods) {
        scope = 'all';
        scopeValues = [];
      } else {
        scope = 'module';
        scopeValues = realModuleIds;
      }
      filterTagRows = tagRowsFiltered.length ? tagRowsFiltered : undefined;
      suiteId = undefined;
    }

    const newTask: RunTask = {
      id: taskId(),
      name: values.name.trim(),
      versionId,
      env: values.env,
      scope,
      scopeValues,
      filterTagRows,
      suiteId,
      triggerTime: nowText(),
      finishTime: '-',
      status: '排队中',
      progress: 0,
      caseCount: count,
      coverage: 0,
      passRate: 0,
      duration: '-',
    };
    setTasks((prev) => [newTask, ...prev]);
    setCreateOpen(false);
    createForm.resetFields();
    message.success('已创建自测任务');
  };

  const columns: ColumnsType<RunTask> = [
    {
      title: '任务ID',
      dataIndex: 'id',
      width: 180,
      render: (id: string) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() =>
            navigate({
              pathname: toRunDetailPath(projectId, versionId, id),
              search: location.search,
            })
          }
        >
          {id}
        </Button>
      ),
    },
    { title: '任务名称', dataIndex: 'name', width: 160, ellipsis: true },
    { title: '运行环境', dataIndex: 'env', width: 100 },
    { title: '触发时间', dataIndex: 'triggerTime', width: 170 },
    { title: '完成时间', dataIndex: 'finishTime', width: 170 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: TaskStatus) => <Tag color={STATUS_COLOR[status]}>{status}</Tag>,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 140,
      render: (p: number) => <Progress percent={p} size="small" />,
    },
    { title: '用例总数', dataIndex: 'caseCount', width: 96 },
    {
      title: '覆盖率',
      dataIndex: 'coverage',
      width: 90,
      render: (v: number) => `${v}%`,
    },
    {
      title: '通过率',
      dataIndex: 'passRate',
      width: 90,
      render: (v: number) => `${v}%`,
    },
    { title: '耗时', dataIndex: 'duration', width: 90 },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, row) => {
        const canStop = row.status === '排队中' || row.status === '运行中';
        return (
          <Space size={4}>
            {canStop ? (
              <Button type="link" size="small" onClick={() => stopTask(row.id)}>
                停止
              </Button>
            ) : (
              <Button type="link" size="small" onClick={() => runTask(row.id)}>
                运行
              </Button>
            )}
            <Popconfirm
              title="确认删除该任务？"
              onConfirm={() => {
                if (runningTimerRef.current[row.id]) {
                  window.clearTimeout(runningTimerRef.current[row.id]);
                  delete runningTimerRef.current[row.id];
                }
                setTasks((prev) => prev.filter((item) => item.id !== row.id));
                message.success('任务已删除');
              }}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      size="small"
      styles={{ body: { padding: 16, height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' } }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 12,
        }}
      >
        <Button
          type="primary"
          onClick={() => {
            setCreateOpen(true);
            createForm.setFieldsValue({
              name: '',
              env: defaultEnv,
              runTimes: 1,
              retryTimes: 1,
              timeoutMinutes: 5,
              clearDownloadAfterDone: true,
              scopeMode: 'custom',
              moduleMatchType: '包含',
              moduleIds: [MODULE_ROOT_ALL],
              suiteId: undefined,
              tagRows: [{ tagMatchType: '包含', tags: [] }],
              ...DEFAULT_PARALLEL_FORM_FIELDS,
            });
          }}
        >
          创建自测任务
        </Button>
        <Input.Search
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索任务名称/任务ID/运行环境"
          style={{ width: 320 }}
        />
      </div>

      <Table
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={filteredTasks}
        pagination={{ pageSize: 8, showSizeChanger: true }}
      />

      <Modal
        title="创建自测任务"
        width={880}
        open={createOpen}
        onOk={createTask}
        onCancel={() => setCreateOpen(false)}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
        closable={false}
        okText="开始运行"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" colon={false}>
          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="name"
                label="任务名称"
                rules={[
                  { required: true, message: '请输入任务名称' },
                  { max: 64, message: '长度不能超过 64' },
                ]}
              >
                <Input placeholder="例如：SIT 冒烟回归" />
              </Form.Item>
              <Form.Item name="env" label="运行环境" rules={[{ required: true, message: '请选择运行环境' }]}>
                <Select
                  placeholder="请选择"
                  options={envSelectOptions}
                  optionRender={
                    isDeviceVersionDev
                      ? undefined
                      : (opt) => (
                          <Space>
                            <Tag color="processing" style={{ margin: 0 }}>
                              {(opt.value as string).slice(0, 1)}
                            </Tag>
                            {opt.label}
                          </Space>
                        )
                  }
                />
              </Form.Item>
              <Form.Item name="runTimes" label="运行次数" rules={[{ required: true, message: '请输入运行次数' }]}>
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="retryTimes"
                label="用例失败重试次数"
                rules={[{ required: true, message: '请输入重试次数' }]}
              >
                <InputNumber min={0} max={20} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="timeoutMinutes"
                label={
                  <Space size={4}>
                    执行限时
                    <Tooltip title="单次用例或请求允许的最长执行时间，超时将标记失败">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: '请输入执行限时' }]}
              >
                <InputNumber min={1} max={120} addonAfter="分钟" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="clearDownloadAfterDone"
                label="运行完成后是否清空下载目录"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <div
                style={{
                  background: '#fafafa',
                  borderRadius: 8,
                  padding: 16,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Form.Item name="scopeMode" style={{ marginBottom: 12 }}>
                  <Radio.Group
                    onChange={(e) => {
                      const next = e.target.value as ScopeMode;
                      if (next === 'suite') {
                        createForm.setFieldsValue({
                          suiteId: undefined,
                          ...DEFAULT_PARALLEL_FORM_FIELDS,
                        });
                      } else {
                        createForm.setFieldsValue({
                          moduleMatchType: '包含',
                          moduleIds: [MODULE_ROOT_ALL],
                          tagRows: [{ tagMatchType: '包含', tags: [] }],
                          suiteId: undefined,
                          ...DEFAULT_PARALLEL_FORM_FIELDS,
                        });
                      }
                    }}
                  >
                    <Radio value="custom">自定义</Radio>
                    <Radio value="suite">选择套件</Radio>
                  </Radio.Group>
                </Form.Item>
                {scopeMode === 'custom' ? (
                  <>
                    <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
                      执行范围
                    </Typography.Text>
                    <Form.Item label="所属模块" required>
                      <Row gutter={8} wrap={false} align="middle">
                        <Col flex="120px">
                          <Form.Item
                            name="moduleMatchType"
                            noStyle
                            rules={[{ required: true, message: '请选择' }]}
                          >
                            <Select placeholder="请选择" options={MODULE_MATCH_OPTIONS} />
                          </Form.Item>
                        </Col>
                        <Col flex="auto">
                          <Form.Item
                            name="moduleIds"
                            noStyle
                            dependencies={['scopeMode']}
                            rules={[
                              ({ getFieldValue }) => ({
                                validator(_, value) {
                                  if ((getFieldValue('scopeMode') as ScopeMode) !== 'custom') {
                                    return Promise.resolve();
                                  }
                                  if (!value?.length) {
                                    return Promise.reject(new Error('请选择模块'));
                                  }
                                  return Promise.resolve();
                                },
                              }),
                            ]}
                          >
                            <Select
                              mode="multiple"
                              placeholder="请选择"
                              options={moduleSelectOptions}
                              maxTagCount="responsive"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form.Item>
                    <Form.Item label="标签">
                      <Form.List name="tagRows">
                        {(fields, { add, remove }) => (
                          <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            {fields.map((field) => (
                              <Row key={field.key} gutter={8} wrap={false} align="middle">
                                <Col flex="120px">
                                  <Form.Item
                                    name={[field.name, 'tagMatchType']}
                                    rules={[{ required: true, message: '请选择' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Select placeholder="请选择" options={TAG_MATCH_OPTIONS} />
                                  </Form.Item>
                                </Col>
                                <Col flex="auto">
                                  <Form.Item name={[field.name, 'tags']} style={{ marginBottom: 0 }}>
                                    <Select
                                      mode="multiple"
                                      placeholder="请选择标签"
                                      options={tagSelectOptions}
                                      allowClear
                                      maxTagCount="responsive"
                                    />
                                  </Form.Item>
                                </Col>
                                <Col flex="none">
                                  <Space size={4}>
                                    {fields.length > 1 ? (
                                      <Button
                                        type="text"
                                        danger
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => remove(field.name)}
                                        aria-label="删除标签行"
                                      />
                                    ) : null}
                                    {field.name === fields[fields.length - 1]?.name ? (
                                      <Button
                                        type="text"
                                        icon={<PlusOutlined />}
                                        onClick={() => add({ tagMatchType: '包含', tags: [] })}
                                        aria-label="添加标签行"
                                      />
                                    ) : null}
                                  </Space>
                                </Col>
                              </Row>
                            ))}
                          </Space>
                        )}
                      </Form.List>
                    </Form.Item>
                    <ParallelRunConfigFormSection versionModules={versionModules} bordered={false} />
                  </>
                ) : (
                  <>
                    <Form.Item
                      name="suiteId"
                      label="测试套件"
                      rules={[{ required: true, message: '请选择测试套件' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        placeholder="请选择测试套件"
                        options={suiteSelectOptions}
                        showSearch
                        optionFilterProp="label"
                        allowClear
                      />
                    </Form.Item>
                    {selectedSuite ? (
                      <SuiteConfigPreview suite={selectedSuite} versionModules={versionModules} />
                    ) : (
                      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                        请选择测试套件后，将在此展示套件的用例范围与并行配置
                      </Typography.Text>
                    )}
                  </>
                )}
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}
