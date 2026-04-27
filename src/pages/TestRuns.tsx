/**
 * @page 测试运行
 * @version V1.0.4
 * @base docs/spec/04-页面契约.md § 页面 9（测试运行）；PRD 章节待同步，以契约为准
 * @changes
 *   - V1.0.0: 初始实现测试运行页；支持创建自测任务、任务搜索、状态联动运行/停止、任务删除与任务详情跳转（Mock）
 *   - V1.0.1: 工具栏搜索框右对齐；列表增加任务名称、进度列；进度每 10s 刷新（运行中/排队中 Mock 递增）
 *   - V1.0.2: 仅「运行中」进度定时增长；「排队中」进度固定为 0；「已停止」保留停止前最后进度
 *   - V1.0.3: 创建自测任务弹窗双栏布局；执行范围（模块双选+多行标签）；执行限时按分钟、并行数禁用、清空下载目录开关
 *   - V1.0.4: 任务名称改为必填并上移到顶部；并行配置移至执行范围下方，支持分组类型与并行线程数
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
import type { CaseModule, TaskStatus } from '@/types';
import { mockCaseModules, mockTestCases } from '@/mocks/data';
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
  tagLeft?: string;
  tags?: string[];
};

type CreateRunForm = {
  name: string;
  env: string;
  runTimes: number;
  retryTimes: number;
  timeoutMinutes: number;
  clearDownloadAfterDone: boolean;
  moduleLeft: string;
  moduleIds: string[];
  tagRows: TagRowForm[];
  parallelGroupType: 'module' | 'tag';
  parallelThreadCount: number;
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  排队中: 'processing',
  运行中: 'blue',
  已完成: 'success',
  已停止: 'default',
  失败: 'error',
};

/** 选择「根目录」表示当前版本下全部模块（子树） */
const MODULE_ROOT_ALL = '__root_all__';

const ENV_OPTIONS_UI = [
  { value: 'DEV', label: 'DEV 测试环境' },
  { value: 'SIT', label: 'SIT测试环境' },
  { value: 'UAT', label: 'UAT 测试环境' },
  { value: 'PRD', label: 'PRD 测试环境' },
  { value: 'PRE', label: 'PRE 测试环境' },
] as const;

const MODULE_LEFT_OPTIONS = [{ value: 'catalog', label: '目录' }];
const TAG_LEFT_OPTIONS = [{ value: 'by_tag', label: '标签' }];
const PARALLEL_GROUP_OPTIONS = [
  { value: 'module', label: '按模块' },
  { value: 'tag', label: '按分组标签' },
];

function collectSubtreeModuleIds(moduleId: string, modules: CaseModule[]): Set<string> {
  const set = new Set<string>([moduleId]);
  const walk = (pid: string) => {
    modules
      .filter((m) => m.parentId === pid)
      .forEach((m) => {
        set.add(m.id);
        walk(m.id);
      });
  };
  walk(moduleId);
  return set;
}

function computeExecutionCaseCount(
  cases: { moduleId: string; tags: string[] }[],
  modules: CaseModule[],
  moduleIds: string[],
  tagRows: { tags?: string[] }[]
): number {
  let list = cases;
  const useAllModules = moduleIds.includes(MODULE_ROOT_ALL);
  if (!useAllModules) {
    const allowed = new Set<string>();
    moduleIds
      .filter((id) => id !== MODULE_ROOT_ALL)
      .forEach((id) => {
        collectSubtreeModuleIds(id, modules).forEach((mid) => allowed.add(mid));
      });
    list = list.filter((c) => allowed.has(c.moduleId));
  }
  const activeTagRows = tagRows.filter((r) => r.tags && r.tags.length);
  if (activeTagRows.length) {
    list = list.filter((c) =>
      activeTagRows.every((row) => row.tags!.some((t) => c.tags.includes(t)))
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
    const tagRows = values.tagRows || [];
    const count = computeExecutionCaseCount(versionCases, versionModules, moduleIds, tagRows);
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
              moduleLeft: 'catalog',
              moduleIds: [MODULE_ROOT_ALL],
              tagRows: [{ tagLeft: 'by_tag', tags: [] }],
              parallelGroupType: 'module',
              parallelThreadCount: 1,
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
        okText="开始运行"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" colon={false}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
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
            <Col xs={24} md={12}>
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
                  <Row gutter={8}>
                    <Col flex="108px">
                      <Form.Item
                        name="moduleLeft"
                        noStyle
                        rules={[{ required: true, message: '请选择' }]}
                      >
                        <Select placeholder="请选择" options={MODULE_LEFT_OPTIONS} />
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
                <Form.Item label="标签">
                  <Form.List name="tagRows">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        {fields.map((field) => (
                          <Row key={field.key} gutter={8} wrap={false} align="middle">
                            <Col flex="108px">
                              <Form.Item
                                name={[field.name, 'tagLeft']}
                                rules={[{ required: false }]}
                                style={{ marginBottom: 0 }}
                              >
                                <Select placeholder="请选择" options={TAG_LEFT_OPTIONS} />
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
                                    onClick={() => add({ tagLeft: 'by_tag', tags: [] })}
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
                <Form.Item
                  name="parallelGroupType"
                  label="分组类型"
                  rules={[{ required: true, message: '请选择分组类型' }]}
                >
                  <Select options={PARALLEL_GROUP_OPTIONS} />
                </Form.Item>
                <Form.Item
                  name="parallelThreadCount"
                  label="并行线程数"
                  rules={[{ required: true, message: '请输入并行线程数' }]}
                >
                  <InputNumber min={1} max={99} style={{ width: '100%' }} />
                </Form.Item>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}
