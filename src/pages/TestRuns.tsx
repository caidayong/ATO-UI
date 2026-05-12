/**
 * @page 测试运行
 * @version V1.0.14
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
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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
  TreeSelect,
  Typography,
  message,
} from 'antd';
import { InfoCircleOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { CaseModule, TaskStatus } from '@/types';
import {
  MODULE_ROOT_ALL,
  MODULE_MATCH_OPTIONS,
  TAG_MATCH_OPTIONS,
  buildFirstLevelModuleTreeData,
  collectSelectableFirstLevelLeafIds,
  collectSubtreeModuleIds,
  invertFirstLevelSelection,
  maxParallelSelectionCount,
  parallelPlanSelectionsEqual,
  pruneParallelPlanStepSelections,
  selectionUsedInStepsBefore,
  type ParallelPlanStepForm,
} from '@/utils/parallelRunWizardShared';
import {
  mockCaseModules,
  mockParallelRunTemplates,
  mockSuites,
  mockTestCases,
  mockTagManagementGroups,
  type ParallelRunTemplateSnapshot,
} from '@/mocks/data';
import { versionDevRunDetailPath } from '@/constants/routes';

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

type CreateRunForm = {
  name: string;
  env: string;
  runTimes: number;
  retryTimes: number;
  timeoutMinutes: number;
  clearDownloadAfterDone: boolean;
  /** 所属模块与目录范围的关系 */
  moduleMatchType: '包含' | '不包含';
  moduleIds: string[];
  /** 测试套件（套件管理 mockSuites），默认空，非必填 */
  suiteId?: string;
  tagRows: TagRowForm[];
  /** 按模块：一级目录多选；按分组：分组多选 */
  parallelGroupType: 'module' | 'group';
  /** 已选并行配置模版（Mock），默认空 */
  parallelTemplateId?: string;
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

  const hasFirstLevelModuleNodes = useMemo(
    () => buildFirstLevelModuleTreeData(versionModules).length > 0,
    [versionModules]
  );

  const tagManagementGroupSelectOptions = useMemo(
    () => mockTagManagementGroups.map((g) => ({ label: g.name, value: g.id })),
    []
  );

  const suiteSelectOptions = useMemo(
    () => mockSuites.map((s) => ({ label: s.name, value: s.id })),
    []
  );

  const [savedParallelTemplates, setSavedParallelTemplates] = useState<ParallelRunTemplateSnapshot[]>([]);
  const [saveParallelTemplateOpen, setSaveParallelTemplateOpen] = useState(false);
  const [parallelTemplateNameDraft, setParallelTemplateNameDraft] = useState('');

  const projectParallelTemplates = useMemo(() => {
    const seed = mockParallelRunTemplates.filter((t) => t.projectId === projectId);
    const local = savedParallelTemplates.filter((t) => t.projectId === projectId);
    const byId = new Map<string, ParallelRunTemplateSnapshot>();
    [...seed, ...local].forEach((t) => byId.set(t.id, t));
    return Array.from(byId.values());
  }, [projectId, savedParallelTemplates]);

  const parallelTemplateSelectOptions = useMemo(
    () => projectParallelTemplates.map((t) => ({ label: t.name, value: t.id })),
    [projectParallelTemplates]
  );

  const [tasks, setTasks] = useState<RunTask[]>([
    {
      id: 'RUN-20260330001',
      name: 'SIT 全量自测',
      versionId,
      env: 'SIT',
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
      name: 'DEV smoke 巡检',
      versionId,
      env: 'DEV',
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

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateRunForm>();

  const appendParallelPlanStep = (step: ParallelPlanStepForm) => {
    const cur =
      (createForm.getFieldValue('parallelPlanSteps') as ParallelPlanStepForm[] | undefined) ?? [];
    createForm.setFieldValue('parallelPlanSteps', [...cur, step]);
  };

  const watchedParallelSteps = Form.useWatch('parallelPlanSteps', createForm);
  const watchedParallelGroupType = Form.useWatch('parallelGroupType', createForm);

  const hasParallelPlanConfiguration =
    ((watchedParallelSteps as ParallelPlanStepForm[] | undefined)?.length ?? 0) > 0;

  const applyParallelTemplateById = (templateId: string) => {
    const tpl = projectParallelTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    createForm.setFieldsValue({
      parallelGroupType: tpl.parallelGroupType,
      parallelPlanSteps: tpl.parallelPlanSteps.map((s) => ({
        stepKind: s.stepKind,
        selection: [...s.selection],
      })),
      parallelThreadCount: tpl.parallelThreadCount,
    });
  };

  const submitSaveParallelTemplate = () => {
    const name = parallelTemplateNameDraft.trim();
    if (!name) {
      message.warning('请输入模版名称');
      return;
    }
    if (name.length > 64) {
      message.warning('模版名称不能超过 64 个字符');
      return;
    }
    if (projectParallelTemplates.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      message.warning('模版名称已存在');
      return;
    }
    const steps = (createForm.getFieldValue('parallelPlanSteps') as ParallelPlanStepForm[] | undefined) ?? [];
    if (!steps.length) {
      message.warning('请先添加并行配置步骤');
      return;
    }
    const tpl: ParallelRunTemplateSnapshot = {
      id: `prt-${Date.now()}`,
      projectId,
      name,
      parallelGroupType: (createForm.getFieldValue('parallelGroupType') as 'module' | 'group') ?? 'module',
      parallelPlanSteps: steps.map((s) => ({
        stepKind: s.stepKind,
        selection: [...(s.selection ?? [])],
      })),
      parallelThreadCount: Number(createForm.getFieldValue('parallelThreadCount')) || 1,
    };
    setSavedParallelTemplates((prev) => [tpl, ...prev]);
    createForm.setFieldValue('parallelTemplateId', tpl.id);
    setSaveParallelTemplateOpen(false);
    setParallelTemplateNameDraft('');
    message.success('模版已保存');
  };

  useEffect(() => {
    const steps = watchedParallelSteps as ParallelPlanStepForm[] | undefined;
    if (!steps?.length) return;
    const pruned = pruneParallelPlanStepSelections(steps);
    if (!parallelPlanSelectionsEqual(steps, pruned)) {
      createForm.setFieldValue('parallelPlanSteps', pruned);
    }
  }, [watchedParallelSteps, createForm]);

  useEffect(() => {
    const maxSel = maxParallelSelectionCount(watchedParallelSteps as ParallelPlanStepForm[] | undefined);
    const next = Math.max(1, maxSel);
    const cur = createForm.getFieldValue('parallelThreadCount');
    if (cur !== next) {
      createForm.setFieldValue('parallelThreadCount', next);
    }
  }, [watchedParallelSteps, createForm]);

  useEffect(() => {
    if (!hasParallelPlanConfiguration) {
      setSaveParallelTemplateOpen(false);
      setParallelTemplateNameDraft('');
    }
  }, [hasParallelPlanConfiguration]);

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
    const moduleIds = values.moduleIds || [];
    const moduleMatchType = values.moduleMatchType ?? '包含';
    const tagRows = values.tagRows || [];
    const count = computeExecutionCaseCount(
      versionCases,
      versionModules,
      moduleIds,
      moduleMatchType,
      tagRows
    );
    const filterTagRows = tagRows
      .filter((r) => r.tags && r.tags.length)
      .map((r) => r.tags as string[]);
    const useAllMods = moduleIds.includes(MODULE_ROOT_ALL);
    const realModuleIds = moduleIds.filter((id) => id !== MODULE_ROOT_ALL);
    let scope: RunScope;
    let scopeValues: string[];
    if (useAllMods && filterTagRows.length === 0) {
      scope = 'all';
      scopeValues = [];
    } else if (!useAllMods && filterTagRows.length === 0) {
      scope = 'module';
      scopeValues = realModuleIds;
    } else if (useAllMods) {
      scope = 'all';
      scopeValues = [];
    } else {
      scope = 'module';
      scopeValues = realModuleIds;
    }
    const newTask: RunTask = {
      id: taskId(),
      name: values.name.trim(),
      versionId,
      env: values.env,
      scope,
      scopeValues,
      filterTagRows: filterTagRows.length ? filterTagRows : undefined,
      suiteId: values.suiteId || undefined,
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
    setSaveParallelTemplateOpen(false);
    setParallelTemplateNameDraft('');
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
              pathname: versionDevRunDetailPath(projectId, versionId, id),
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
              env: 'SIT',
              runTimes: 1,
              retryTimes: 1,
              timeoutMinutes: 5,
              clearDownloadAfterDone: true,
              moduleMatchType: '包含',
              moduleIds: [MODULE_ROOT_ALL],
              suiteId: undefined,
              tagRows: [{ tagMatchType: '包含', tags: [] }],
              parallelGroupType: 'module',
              parallelTemplateId: undefined,
              parallelPlanSteps: [],
              parallelThreadCount: 1,
            });
            setSaveParallelTemplateOpen(false);
            setParallelTemplateNameDraft('');
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
        onCancel={() => {
          setSaveParallelTemplateOpen(false);
          setParallelTemplateNameDraft('');
          setCreateOpen(false);
        }}
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
                  options={[...ENV_OPTIONS_UI]}
                  optionRender={(opt) => (
                    <Space>
                      <Tag color="processing" style={{ margin: 0 }}>
                        {(opt.value as string).slice(0, 1)}
                      </Tag>
                      {opt.label}
                    </Space>
                  )}
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
                <Typography.Text strong style={{ display: 'block', marginBottom: 16 }}>
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
                        rules={[
                          { required: true, message: '请选择模块' },
                          { type: 'array', min: 1, message: '请选择模块' },
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
                <Form.Item name="suiteId" label="测试套件">
                  <Select
                    allowClear
                    placeholder="请选择测试套件（可选）"
                    options={suiteSelectOptions}
                    showSearch
                    optionFilterProp="label"
                  />
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
                <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
                  并行配置
                </Typography.Text>
                <Form.Item name="parallelTemplateId" style={{ marginBottom: 12 }}>
                  <Select
                    allowClear
                    placeholder="请选择并行配置模版"
                    options={parallelTemplateSelectOptions}
                    showSearch
                    optionFilterProp="label"
                    onChange={(value) => {
                      if (value) applyParallelTemplateById(value as string);
                    }}
                  />
                </Form.Item>
                <div style={{ marginBottom: 12 }}>
                  <Row align="middle" gutter={12} wrap>
                    <Col flex="none">
                      <Typography.Text>
                        <Typography.Text type="danger">*</Typography.Text> 分组方式
                      </Typography.Text>
                    </Col>
                    <Col flex="auto">
                      <Form.Item
                        name="parallelGroupType"
                        noStyle
                        rules={[{ required: true, message: '请选择分组方式' }]}
                      >
                        <Radio.Group
                          onChange={() => {
                            createForm.setFieldsValue({
                              parallelPlanSteps: [],
                              parallelThreadCount: 1,
                              parallelTemplateId: undefined,
                            });
                          }}
                        >
                          <Radio value="module">按模块</Radio>
                          <Radio value="group">按分组</Radio>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
                <Space style={{ marginBottom: 12 }} wrap>
                  <Button
                    type="default"
                    onClick={() => appendParallelPlanStep({ stepKind: 'serial', selection: [] })}
                  >
                    添加串行步骤
                  </Button>
                  <Button
                    type="default"
                    onClick={() => appendParallelPlanStep({ stepKind: 'parallel', selection: [] })}
                  >
                    添加并行步骤
                  </Button>
                </Space>
                <Form.List name="parallelPlanSteps">
                  {(fields, { remove }) => {
                    const mode = watchedParallelGroupType ?? 'module';
                    const steps = watchedParallelSteps as ParallelPlanStepForm[] | undefined;
                    return (
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        {fields.length === 0 ? (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            可选：添加串行/并行步骤以配置执行顺序与并行度；前序步骤已选模块/分组在后续步骤中不可再选；未添加时不影响任务创建（Mock）。
                          </Typography.Text>
                        ) : null}
                        {fields.map((field) => {
                          const blocked = selectionUsedInStepsBefore(steps, field.name);
                          const curSel = steps?.[field.name]?.selection ?? [];
                          const rowTreeData = buildFirstLevelModuleTreeData(
                            versionModules,
                            (leafId) => blocked.has(leafId) && !curSel.includes(leafId)
                          );
                          const selectableModuleIds = collectSelectableFirstLevelLeafIds(rowTreeData);
                          const parallelToolbarDisabled = selectableModuleIds.length === 0;
                          return (
                            <Row key={field.key} gutter={8} wrap={false} align="middle">
                              <Col flex="none" style={{ minWidth: 88 }}>
                                <Space size={6} align="center">
                                  <Typography.Text strong>{Number(field.name) + 1}</Typography.Text>
                                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                    {steps?.[field.name]?.stepKind === 'parallel' ? '并行' : '串行'}
                                  </Typography.Text>
                                </Space>
                              </Col>
                              <Col flex="auto">
                                <Form.Item name={[field.name, 'stepKind']} hidden>
                                  <Input type="hidden" />
                                </Form.Item>
                                {mode === 'group' ? (
                                  <Form.Item
                                    name={[field.name, 'selection']}
                                    style={{ marginBottom: 0 }}
                                    rules={[
                                      {
                                        validator: async (_, v) => {
                                          if (Array.isArray(v) && v.length) return;
                                          throw new Error('请选择分组');
                                        },
                                      },
                                    ]}
                                  >
                                    <Select
                                      mode="multiple"
                                      placeholder="请选择分组"
                                      options={tagManagementGroupSelectOptions.map((o) => ({
                                        ...o,
                                        disabled: blocked.has(o.value) && !curSel.includes(o.value),
                                      }))}
                                      allowClear
                                      maxTagCount="responsive"
                                      showSearch
                                      optionFilterProp="label"
                                    />
                                  </Form.Item>
                                ) : (
                                  <Form.Item
                                    name={[field.name, 'selection']}
                                    style={{ marginBottom: 0 }}
                                    rules={[
                                      {
                                        validator: async (_, v) => {
                                          if (Array.isArray(v) && v.length) return;
                                          throw new Error('请选择一级目录');
                                        },
                                      },
                                    ]}
                                  >
                                    <TreeSelect
                                      treeData={rowTreeData}
                                      treeCheckable
                                      showCheckedStrategy={TreeSelect.SHOW_CHILD}
                                      multiple
                                      allowClear
                                      showSearch
                                      treeNodeFilterProp="title"
                                      placeholder="请从用例目录树中选择一级目录"
                                      style={{ width: '100%' }}
                                      treeDefaultExpandAll
                                      notFoundContent={
                                        hasFirstLevelModuleNodes ? undefined : '当前版本暂无一级子目录'
                                      }
                                      dropdownRender={(menu) => (
                                        <div>
                                          <div
                                            style={{
                                              padding: '6px 12px',
                                              borderBottom: '1px solid #f0f0f0',
                                              display: 'flex',
                                              gap: 4,
                                              flexWrap: 'wrap',
                                            }}
                                            onMouseDown={(e) => e.preventDefault()}
                                          >
                                            <Button
                                              type="link"
                                              size="small"
                                              style={{ padding: 0, height: 'auto' }}
                                              disabled={parallelToolbarDisabled}
                                              onClick={() => {
                                                createForm.setFieldValue(
                                                  ['parallelPlanSteps', field.name, 'selection'],
                                                  [...selectableModuleIds]
                                                );
                                              }}
                                            >
                                              全选
                                            </Button>
                                            <Button
                                              type="link"
                                              size="small"
                                              style={{ padding: 0, height: 'auto' }}
                                              disabled={parallelToolbarDisabled}
                                              onClick={() => {
                                                const stepsVal =
                                                  createForm.getFieldValue(
                                                    'parallelPlanSteps'
                                                  ) as ParallelPlanStepForm[] | undefined;
                                                const cur = stepsVal?.[field.name]?.selection;
                                                createForm.setFieldValue(
                                                  ['parallelPlanSteps', field.name, 'selection'],
                                                  invertFirstLevelSelection(cur, selectableModuleIds)
                                                );
                                              }}
                                            >
                                              反选
                                            </Button>
                                          </div>
                                          {menu}
                                        </div>
                                      )}
                                    />
                                  </Form.Item>
                                )}
                              </Col>
                              <Col flex="none">
                                <Button
                                  type="text"
                                  danger
                                  icon={<MinusCircleOutlined />}
                                  onClick={() => remove(field.name)}
                                  aria-label="删除该步骤"
                                />
                              </Col>
                            </Row>
                          );
                        })}
                      </Space>
                    );
                  }}
                </Form.List>
                <Form.Item
                  name="parallelThreadCount"
                  label={
                    <Space size={4}>
                      并行线程数
                      <Tooltip title="随各「并行」步骤中单步多选数量自动同步（多步取最大，至少为 1），也可手动修改">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: true, message: '请输入并行线程数' }]}
                >
                  <InputNumber min={1} max={99} style={{ width: '100%' }} />
                </Form.Item>
                <Row gutter={8} wrap={false} align="middle" style={{ marginBottom: 0 }}>
                  <Col flex="none">
                    <Button
                      type={hasParallelPlanConfiguration ? 'primary' : 'default'}
                      disabled={!hasParallelPlanConfiguration}
                      onClick={() => {
                        setSaveParallelTemplateOpen(true);
                        setParallelTemplateNameDraft('');
                      }}
                    >
                      另存为模版
                    </Button>
                  </Col>
                  {saveParallelTemplateOpen ? (
                    <Col flex="auto" style={{ minWidth: 0 }}>
                      <Space.Compact style={{ maxWidth: 420 }}>
                        <Input
                          placeholder="请输入模版名称"
                          value={parallelTemplateNameDraft}
                          onChange={(e) => setParallelTemplateNameDraft(e.target.value)}
                          maxLength={64}
                          allowClear
                          style={{ width: 260 }}
                        />
                        <Button type="primary" onClick={submitSaveParallelTemplate}>
                          保存
                        </Button>
                      </Space.Compact>
                    </Col>
                  ) : null}
                </Row>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}
