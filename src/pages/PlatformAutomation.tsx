/**
 * @page 平台自动化
 * @version V1.0.1
 * @base ATO_V1.0.1-页面需求与交互规格.md 第 3.12 节
 * @changes
 *   - V1.0.1: 按定稿实现单栏布局 + 双环境Tab + 团队下拉（默认全部团队）+ 我创建的过滤。
 *   - V1.0.1: 创建/编辑统一三步向导，编辑模式仅第一步可修改（任务名称/触发方式/发送邮件）。
 *   - V1.0.1: 点击任务名称进入主框架任务详情页，并保留列表筛选参数。
 */

import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Radio,
  Select,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  TimePicker,
  TreeSelect,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { platformAutomationTaskDetailPath } from '@/constants/routes';
import { mockPlatformTasks, mockPlatformTeams, mockUsers } from '@/mocks/data';
import type {
  PlatformAutomationTask,
  PlatformEnvTab,
  PlatformSendMailPolicy,
  PlatformTaskTriggerType,
  TaskStatus,
} from '@/types';

const { Text } = Typography;
const ALL_TEAM_VALUE = 'all';
const DEFAULT_PAGE_SIZE = 10;
const STEP_ITEMS = [{ title: '任务信息' }, { title: '环境变量确认' }, { title: '用例运行配置确认' }];
const MAIL_TEAM_MEMBER_IDS: Record<string, string[]> = {
  'pt-1': ['1', '2', '4', '5'],
  'pt-2': ['3', '6', '9', '10'],
  'pt-3': ['7', '8', '11', '12'],
};
const WEEKDAY_OPTIONS = [
  { label: '周一', value: '周一' },
  { label: '周二', value: '周二' },
  { label: '周三', value: '周三' },
  { label: '周四', value: '周四' },
  { label: '周五', value: '周五' },
  { label: '周六', value: '周六' },
  { label: '周日', value: '周日' },
];
const MODULE_TREE_OPTIONS = [
  {
    title: '根目录',
    value: '根目录',
    children: [
      { title: '主机回收', value: '主机回收' },
      { title: '登录', value: '登录' },
      { title: '用户管理', value: '用户管理' },
      { title: '环境管理', value: '环境管理' },
      { title: '团队管理', value: '团队管理' },
      { title: '变更管理', value: '变更管理' },
      { title: '环境操作', value: '环境操作' },
      { title: '数据清理', value: '数据清理' },
      { title: '其他接口（慎用）', value: '其他接口（慎用）' },
    ],
  },
];
const TAG_SCOPE_OPTIONS = [
  { label: 'smoke', value: 'smoke' },
  { label: 'LTT', value: 'LTT' },
  { label: 'Ops', value: 'Ops' },
];

const STATUS_COLOR_MAP: Record<TaskStatus, string> = {
  排队中: 'default',
  运行中: 'processing',
  已完成: 'success',
  已停止: 'warning',
  失败: 'error',
};

type RoleType = '测试' | '开发' | '其他';

type TaskWizardValues = {
  taskName: string;
  teamId: string;
  projectName: string;
  version: string;
  triggerType: PlatformTaskTriggerType;
  scheduleAt?: Dayjs;
  cycleTime?: Dayjs;
  cycleType?: '每天' | '每周';
  cycleWeekdays?: string[];
  sendMailPolicy: PlatformSendMailPolicy;
  sender?: string;
  receivers?: string[];
  mailTeamId?: string;
  modulePath: string[];
  moduleMatchType: '包含' | '不包含';
  tagRules: Array<{
    matchType?: '等于' | '包含' | '不包含';
    tag?: string;
  }>;
  parallelGroupMode: '按一级模块分组' | '自定义模块分组' | '按分组标签分组';
  singleCaseTimeoutSec: number;
  tags?: string[];
  retryCount: number;
  cleanDownloadDir: boolean;
};

type EnvConfigGroupKey = 'customEnv' | 'headers' | 'device' | 'middleware';
type EnvVariableGroupKey = 'customEnv' | 'headers';
type EnvServerProtocol = 'http' | 'https' | 'ws' | 'wss';

type EnvServerConfig = {
  key: string;
  serverName: string;
  protocol: EnvServerProtocol;
  host: string;
  port: string;
};

type EnvVarConfig = {
  key: string;
  name: string;
  value: string;
  description: string;
};

type DeviceConfigRow = {
  key: string;
  deviceName: string;
  protocol: EnvServerProtocol;
  ip: string;
  port: string;
  devsn: string;
  phone: string;
  plateNo: string;
  plateColor: string;
  remark: string;
};

type DeviceFormValues = Omit<DeviceConfigRow, 'key'>;

const MIDDLEWARE_PRESET_IDS = ['mysql', 'clickhouse', 'kafka'] as const;
type MiddlewarePresetId = (typeof MIDDLEWARE_PRESET_IDS)[number];

const MIDDLEWARE_PRESETS: Record<
  MiddlewarePresetId,
  { label: string; rows: { key: string; description: string }[] }
> = {
  mysql: {
    label: 'Mysql',
    rows: [
      { key: 'ip', description: 'MySQL服务器地址' },
      { key: 'port', description: 'MySQL端口' },
      { key: 'user', description: 'MySQL用户名' },
      { key: 'pwd', description: 'MySQL密码' },
    ],
  },
  clickhouse: {
    label: 'Clickhouse',
    rows: [
      { key: 'ip', description: 'Clickhouse服务器地址' },
      { key: 'port', description: 'Clickhouse端口' },
      { key: 'user', description: 'Clickhouse用户名' },
      { key: 'pwd', description: 'Clickhouse密码' },
    ],
  },
  kafka: {
    label: 'Kafka',
    rows: [
      { key: 'ip', description: 'Kafka服务器地址' },
      { key: 'port', description: 'Kafka端口' },
    ],
  },
};

type MiddlewareValues = Record<MiddlewarePresetId, Record<string, string>>;

function createEmptyMiddlewareValues(): MiddlewareValues {
  return {
    mysql: Object.fromEntries(MIDDLEWARE_PRESETS.mysql.rows.map((r) => [r.key, ''])),
    clickhouse: Object.fromEntries(MIDDLEWARE_PRESETS.clickhouse.rows.map((r) => [r.key, ''])),
    kafka: Object.fromEntries(MIDDLEWARE_PRESETS.kafka.rows.map((r) => [r.key, ''])),
  };
}

type EnvTemplate = {
  envKey: string;
  envName: string;
  servers: EnvServerConfig[];
  customEnv: EnvVarConfig[];
  headers: EnvVarConfig[];
  devices: DeviceConfigRow[];
  middleware: { values: MiddlewareValues };
};

const ENV_TEMPLATES_BY_PROJECT_VERSION: Record<string, EnvTemplate[]> = {
  'CICD-V2.0::V2.0.2': [
    {
      envKey: 'sit',
      envName: 'SIT测试环境',
      servers: [
        { key: 'svr-1', serverName: '默认服务器', protocol: 'https', host: '192.168.132.134', port: '28008' },
      ],
      customEnv: [
        { key: 'ev-1', name: 'passwd', value: '6711ea95-ea2b-4a3a-9b0e-195dc73d4ade', description: '-' },
        { key: 'ev-2', name: 'hostIP_Standalone', value: '192.168.146.40', description: '主机IP' },
      ],
      headers: [
        { key: 'hd-1', name: 'Authorization', value: 'Bearer xxx', description: '认证令牌' },
        { key: 'hd-2', name: 'x-trace-id', value: 'trace-20260422', description: '链路追踪' },
      ],
      devices: [
        {
          key: 'dv-1',
          deviceName: '生成测试镜-A',
          protocol: 'https',
          ip: '10.8.9.50',
          port: '8443',
          devsn: 'SITSN20240088',
          phone: '13900139000',
          plateNo: '浙A·9X888',
          plateColor: '黄色',
          remark: 'SIT 自动化回归专用',
        },
      ],
      middleware: {
        values: {
          ...createEmptyMiddlewareValues(),
          mysql: { ip: '10.8.1.20', port: '3306', user: 'ato_sit', pwd: '***' },
          clickhouse: { ip: '10.8.1.30', port: '9000', user: 'default', pwd: '***' },
          kafka: { ip: '10.8.1.40', port: '9092' },
        },
      },
    },
    {
      envKey: 'uat',
      envName: 'UAT验证环境',
      servers: [
        { key: 'svr-2', serverName: '默认服务器', protocol: 'https', host: '192.168.140.200', port: '28008' },
      ],
      customEnv: [
        { key: 'ev-3', name: 'passwd', value: 'uat-6a95-ea2b-4a3a', description: '-' },
        { key: 'ev-4', name: 'hostIP_Standalone', value: '192.168.150.88', description: '主机IP' },
      ],
      headers: [{ key: 'hd-3', name: 'Authorization', value: 'Bearer uat-token', description: '认证令牌' }],
      devices: [
        {
          key: 'dv-3',
          deviceName: 'UAT主检终端',
          protocol: 'https',
          ip: '10.10.20.33',
          port: '8443',
          devsn: 'UATSN0001',
          phone: '13800000001',
          plateNo: '渝A·12345',
          plateColor: '蓝色',
          remark: 'UAT 核验设备',
        },
      ],
      middleware: {
        values: {
          ...createEmptyMiddlewareValues(),
          mysql: { ip: '192.168.2.20', port: '3306', user: 'ato_uat', pwd: '***' },
          clickhouse: { ip: '192.168.2.30', port: '9000', user: 'default', pwd: '***' },
          kafka: { ip: '192.168.2.40', port: '9092' },
        },
      },
    },
  ],
  'CICD-V2.0::V2.0.1-P1': [
    {
      envKey: 'dev',
      envName: 'DEV开发环境',
      servers: [{ key: 'svr-4', serverName: '默认服务器', protocol: 'http', host: '10.1.10.23', port: '18080' }],
      customEnv: [{ key: 'ev-5', name: 'passwd', value: 'dev-passwd', description: '-' }],
      headers: [{ key: 'hd-4', name: 'Authorization', value: 'Bearer dev-token', description: '认证令牌' }],
      devices: [
        {
          key: 'dv-4',
          deviceName: 'DEV调试机',
          protocol: 'http',
          ip: '10.2.1.12',
          port: '8080',
          devsn: 'DEVSN001',
          phone: '13700000000',
          plateNo: '粤B·ATO01',
          plateColor: '白色',
          remark: '开发联调用',
        },
      ],
      middleware: {
        values: {
          ...createEmptyMiddlewareValues(),
          mysql: { ip: '10.3.1.100', port: '3306', user: 'ato_dev', pwd: '***' },
          clickhouse: { ip: '10.3.1.101', port: '9000', user: 'default', pwd: '' },
          kafka: { ip: '10.3.1.102', port: '9092' },
        },
      },
    },
  ],
};

function cloneEnvTemplate(template: EnvTemplate): EnvTemplate {
  return {
    envKey: template.envKey,
    envName: template.envName,
    servers: template.servers.map((item) => ({ ...item })),
    customEnv: template.customEnv.map((item) => ({ ...item })),
    headers: template.headers.map((item) => ({ ...item })),
    devices: template.devices.map((item) => ({ ...item })),
    middleware: {
      values: {
        mysql: { ...template.middleware.values.mysql },
        clickhouse: { ...template.middleware.values.clickhouse },
        kafka: { ...template.middleware.values.kafka },
      },
    },
  };
}

export function PlatformAutomation() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [teams] = useState(mockPlatformTeams);
  const [tasks, setTasks] = useState<PlatformAutomationTask[]>(mockPlatformTasks);
  const [activeTab, setActiveTab] = useState<PlatformEnvTab>(
    searchParams.get('tab') === 'dev' ? 'dev' : 'test'
  );
  const [selectedTeamId, setSelectedTeamId] = useState(searchParams.get('team') ?? ALL_TEAM_VALUE);
  const [onlyCreatedByMe, setOnlyCreatedByMe] = useState(searchParams.get('mine') === '1');
  const [taskKeyword, setTaskKeyword] = useState(searchParams.get('keyword') ?? '');
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') ?? '');
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') ?? '1')));
  const [pageSize, setPageSize] = useState(
    Math.max(10, Number(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE)))
  );
  const [wizardMode, setWizardMode] = useState<'create' | 'edit' | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [wizardEnvOptions, setWizardEnvOptions] = useState<EnvTemplate[]>([]);
  const [wizardEnvData, setWizardEnvData] = useState<EnvTemplate | null>(null);
  const [wizardEnvTab, setWizardEnvTab] = useState<EnvConfigGroupKey>('customEnv');
  const [wizardMiddlewareTab, setWizardMiddlewareTab] = useState<MiddlewarePresetId>('mysql');
  const [wizardEnvSearch, setWizardEnvSearch] = useState('');
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceEditingKey, setDeviceEditingKey] = useState<string | null>(null);
  const [form] = Form.useForm<TaskWizardValues>();
  const [deviceForm] = Form.useForm<DeviceFormValues>();

  const currentUser = mockUsers[0];

  const roleType: RoleType = useMemo(() => {
    const role = currentUser?.role ?? '';
    if (role.includes('开发')) {
      return '开发';
    }
    if (role.includes('测试')) {
      return '测试';
    }
    return '其他';
  }, [currentUser?.role]);

  const canEditCurrentTab = useMemo(() => {
    if (roleType === '测试') {
      return activeTab === 'test';
    }
    if (roleType === '开发') {
      return activeTab === 'dev';
    }
    return false;
  }, [activeTab, roleType]);

  const writeQuery = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    setSearchParams(next, { replace: true });
  };

  const syncWizardEnvByProjectVersion = (projectName: string, version: string, preferEnvKey?: string) => {
    const templates =
      ENV_TEMPLATES_BY_PROJECT_VERSION[`${projectName}::${version}`] ??
      ENV_TEMPLATES_BY_PROJECT_VERSION['CICD-V2.0::V2.0.2'];
    setWizardEnvOptions(templates);
    const target = templates.find((item) => item.envKey === preferEnvKey) ?? templates[0];
    setWizardEnvData(cloneEnvTemplate(target));
    setWizardEnvTab('customEnv');
    setWizardMiddlewareTab('mysql');
    setWizardEnvSearch('');
  };

  const openCreateWizard = () => {
    setWizardMode('create');
    setWizardStep(1);
    setEditingTaskId(null);
    form.setFieldsValue({
      taskName: '',
      teamId: selectedTeamId === ALL_TEAM_VALUE ? teams[0]?.id : selectedTeamId,
      projectName: 'CICD-V2.0',
      version: 'V2.0.2',
      triggerType: '手动触发',
      scheduleAt: undefined,
      cycleTime: undefined,
      cycleType: undefined,
      cycleWeekdays: undefined,
      sendMailPolicy: '总是发送',
      sender: `${currentUser?.name ?? ''} <${currentUser?.email ?? ''}>`,
      receivers: [],
      mailTeamId: undefined,
      moduleMatchType: '包含',
      modulePath: [],
      tagRules: [{ matchType: '等于' }],
      parallelGroupMode: '按分组标签分组',
      tags: [],
      singleCaseTimeoutSec: 600,
      retryCount: 0,
      cleanDownloadDir: false,
    });
    syncWizardEnvByProjectVersion('CICD-V2.0', 'V2.0.2');
  };

  const openEditWizard = (task: PlatformAutomationTask) => {
    setWizardMode('edit');
    setWizardStep(1);
    setEditingTaskId(task.taskId);
    form.setFieldsValue({
      taskName: task.taskName,
      teamId: task.teamId,
      projectName: 'CICD-V2.0',
      version: task.version,
      triggerType: task.triggerType,
      scheduleAt: task.triggerType === '定时触发' ? dayjs() : undefined,
      cycleTime: task.triggerType === '周期触发' ? dayjs('09:00:00', 'HH:mm:ss') : undefined,
      cycleType: task.triggerType === '周期触发' ? '每天' : undefined,
      cycleWeekdays: undefined,
      sendMailPolicy: '不发送',
      sender: `${currentUser?.name ?? ''} <${currentUser?.email ?? ''}>`,
      receivers: [],
      mailTeamId: undefined,
      moduleMatchType: '包含',
      modulePath: [],
      tagRules: [{ matchType: '等于', tag: 'smoke' }],
      parallelGroupMode: '按分组标签分组',
      tags: ['冒烟场景'],
      singleCaseTimeoutSec: 600,
      retryCount: 0,
      cleanDownloadDir: false,
    });
    syncWizardEnvByProjectVersion('CICD-V2.0', task.version);
  };

  const filteredTasks = useMemo(() => {
    const keyword = taskKeyword.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchTab = task.envTab === activeTab;
      const matchTeam = selectedTeamId === ALL_TEAM_VALUE || task.teamId === selectedTeamId;
      const matchMine = !onlyCreatedByMe || task.createdBy === currentUser?.id;
      const matchKeyword = !keyword || task.taskName.toLowerCase().includes(keyword);
      return matchTab && matchTeam && matchMine && matchKeyword;
    });
  }, [activeTab, currentUser?.id, onlyCreatedByMe, selectedTeamId, taskKeyword, tasks]);

  const pagedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, page, pageSize]);

  const handleDeleteTask = (task: PlatformAutomationTask) => {
    Modal.confirm({
      title: '删除任务',
      content: '此操作不可恢复，是否继续？',
      okButtonProps: { danger: true },
      onOk: () => {
        setTasks((prev) => prev.filter((item) => item.taskId !== task.taskId));
        message.success('删除成功');
      },
    });
  };

  const handleToggleRunStatus = (task: PlatformAutomationTask) => {
    if (task.status === '运行中') {
      setTasks((prev) =>
        prev.map((item) =>
          item.taskId === task.taskId
            ? {
                ...item,
                status: '已停止',
                progressText: item.progressText === '100%' ? '99%' : item.progressText,
              }
            : item
        )
      );
      message.success('任务已停止');
      return;
    }

    setTasks((prev) =>
      prev.map((item) =>
        item.taskId === task.taskId
          ? {
              ...item,
              status: '运行中',
              triggeredAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
              progressText: item.progressText === '100%' ? '0%' : item.progressText,
            }
          : item
      )
    );
    message.success('任务已开始运行');
  };

  const validateCurrentStep = async () => {
    if (wizardStep === 1) {
      const fields: (keyof TaskWizardValues)[] = [
        'taskName',
        'teamId',
        'projectName',
        'version',
        'triggerType',
        'sendMailPolicy',
      ];
      const triggerType = form.getFieldValue('triggerType');
      if (triggerType === '定时触发') {
        fields.push('scheduleAt');
      }
      if (triggerType === '周期触发') {
        fields.push('cycleType');
        const cycleType = form.getFieldValue('cycleType');
        if (cycleType === '每天') {
          fields.push('cycleTime');
        }
        if (cycleType === '每周') {
          fields.push('cycleWeekdays');
          fields.push('cycleTime');
        }
      }
      await form.validateFields(fields);
      return;
    }
    if (wizardStep === 2) {
      if (!wizardEnvData) {
        message.error('请先选择环境配置');
        throw new Error('missing env config');
      }
      const invalidServer = wizardEnvData.servers.some((item) => !item.protocol || !item.host.trim() || !item.port.trim());
      if (invalidServer) {
        message.error('请完善应用服务器的协议、IP/域名和端口');
        throw new Error('invalid server config');
      }
      return;
    }
    if (wizardMode === 'create' && wizardStep === 3) {
      await form.validateFields(['moduleMatchType', 'retryCount', 'singleCaseTimeoutSec', 'parallelGroupMode']);
    }
  };

  const handleSubmitWizard = async () => {
    const values = await form.validateFields();
    if (wizardMode === 'create') {
      const newTask: PlatformAutomationTask = {
        taskId: Math.max(0, ...tasks.map((item) => item.taskId)) + 1,
        taskName: values.taskName,
        version: values.version,
        envTab: activeTab,
        teamId: values.teamId,
        createdBy: currentUser?.id ?? '',
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        triggeredAt: '-',
        durationText: '-',
        triggerType: values.triggerType,
        caseCount: 0,
        passRateText: '0.00%',
        progressText: '0%',
        status: '排队中',
      };
      setTasks((prev) => [newTask, ...prev]);
      message.success('创建任务成功');
    } else if (wizardMode === 'edit' && editingTaskId) {
      setTasks((prev) =>
        prev.map((item) =>
          item.taskId === editingTaskId
            ? {
                ...item,
                taskName: values.taskName,
                triggerType: values.triggerType,
              }
            : item
        )
      );
      message.success('更新成功');
    }

    setWizardMode(null);
    setWizardStep(1);
    setEditingTaskId(null);
    setWizardEnvData(null);
    setWizardEnvOptions([]);
    setWizardEnvTab('customEnv');
    setWizardMiddlewareTab('mysql');
    setWizardEnvSearch('');
    setDeviceModalOpen(false);
    setDeviceEditingKey(null);
    form.resetFields();
  };

  const toTaskDetail = (taskId: number) => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    params.set('team', selectedTeamId);
    if (taskKeyword) {
      params.set('keyword', taskKeyword);
    }
    if (onlyCreatedByMe) {
      params.set('mine', '1');
    }
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    navigate(`${platformAutomationTaskDetailPath(taskId)}?${params.toString()}`);
  };

  const columns: TableProps<PlatformAutomationTask>['columns'] = [
    { title: '任务ID', dataIndex: 'taskId', key: 'taskId', width: 90 },
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
      render: (value: string, record) => <a onClick={() => toTaskDetail(record.taskId)}>{value}</a>,
      ellipsis: true,
      width: 180,
    },
    { title: '版本', dataIndex: 'version', key: 'version', width: 120 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
    { title: '触发时间', dataIndex: 'triggeredAt', key: 'triggeredAt', width: 170 },
    { title: '耗时', dataIndex: 'durationText', key: 'durationText', width: 120 },
    { title: '触发方式', dataIndex: 'triggerType', key: 'triggerType', width: 130 },
    { title: '用例数', dataIndex: 'caseCount', key: 'caseCount', width: 90 },
    { title: '通过率', dataIndex: 'passRateText', key: 'passRateText', width: 100 },
    { title: '进度', dataIndex: 'progressText', key: 'progressText', width: 90 },
    {
      title: '运行状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: TaskStatus) => (
        <Tag color={STATUS_COLOR_MAP[status]}>
          <Space size={4}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {status}
          </Space>
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={!canEditCurrentTab}
            onClick={() => openEditWizard(record)}
          />
          <Button
            type="text"
            size="small"
            icon={record.status === '运行中' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            disabled={!canEditCurrentTab}
            onClick={() => handleToggleRunStatus(record)}
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            disabled={!canEditCurrentTab}
            onClick={() => handleDeleteTask(record)}
          />
        </Space>
      ),
    },
  ];

  const wizardTitle = wizardMode === 'edit' ? '任务信息-编辑' : '任务信息-创建';
  const triggerTypeWatch = Form.useWatch('triggerType', form);
  const cycleTypeWatch = Form.useWatch('cycleType', form);
  const mailMemberOptions = useMemo(
    () =>
      mockUsers.map((u) => ({
        label: `${u.name} <${u.email}>`,
        value: u.email,
      })),
    []
  );
  const envOptionItems = useMemo(
    () => wizardEnvOptions.map((item) => ({ label: item.envName, value: item.envKey })),
    [wizardEnvOptions]
  );

  const updateServerField = (serverKey: string, field: keyof EnvServerConfig, value: string) => {
    setWizardEnvData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        servers: prev.servers.map((item) => (item.key === serverKey ? { ...item, [field]: value } : item)),
      };
    });
  };

  const updateEnvVarValue = (groupKey: EnvVariableGroupKey, varKey: string, value: string) => {
    setWizardEnvData((prev) => {
      if (!prev) return prev;
      const groupRows = prev[groupKey].map((item) => (item.key === varKey ? { ...item, value } : item));
      return {
        ...prev,
        [groupKey]: groupRows,
      };
    });
  };

  const updateMiddlewareValue = (presetId: MiddlewarePresetId, itemKey: string, value: string) => {
    setWizardEnvData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        middleware: {
          values: {
            ...prev.middleware.values,
            [presetId]: {
              ...prev.middleware.values[presetId],
              [itemKey]: value,
            },
          },
        },
      };
    });
  };

  const upsertDevice = (device: DeviceConfigRow) => {
    setWizardEnvData((prev) => {
      if (!prev) return prev;
      const exists = prev.devices.some((item) => item.key === device.key);
      return {
        ...prev,
        devices: exists
          ? prev.devices.map((item) => (item.key === device.key ? device : item))
          : [device, ...prev.devices],
      };
    });
  };

  const removeDevice = (deviceKey: string) => {
    setWizardEnvData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        devices: prev.devices.filter((item) => item.key !== deviceKey),
      };
    });
  };

  const openAddDevice = () => {
    setDeviceEditingKey(null);
    deviceForm.setFieldsValue({
      deviceName: '',
      protocol: 'https',
      ip: '',
      port: '',
      devsn: '',
      phone: '',
      plateNo: '',
      plateColor: '',
      remark: '',
    });
    setDeviceModalOpen(true);
  };

  const openEditDevice = (row: DeviceConfigRow) => {
    setDeviceEditingKey(row.key);
    deviceForm.setFieldsValue({
      deviceName: row.deviceName,
      protocol: row.protocol,
      ip: row.ip,
      port: row.port,
      devsn: row.devsn,
      phone: row.phone,
      plateNo: row.plateNo,
      plateColor: row.plateColor,
      remark: row.remark,
    });
    setDeviceModalOpen(true);
  };

  const submitDevice = async () => {
    const values = await deviceForm.validateFields();
    const nextKey = deviceEditingKey ?? `dv-${Date.now()}`;
    upsertDevice({ key: nextKey, ...values });
    setDeviceModalOpen(false);
    setDeviceEditingKey(null);
    message.success(deviceEditingKey ? '设备已更新' : '设备已添加');
  };

  const filteredWizardVarRows = useMemo(() => {
    if (!wizardEnvData || (wizardEnvTab !== 'customEnv' && wizardEnvTab !== 'headers')) return [];
    const rows = wizardEnvData[wizardEnvTab];
    const keyword = wizardEnvSearch.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) =>
      [row.name, row.value, row.description].some((field) => field.toLowerCase().includes(keyword))
    );
  }, [wizardEnvData, wizardEnvSearch, wizardEnvTab]);

  const filteredWizardDeviceRows = useMemo(() => {
    if (!wizardEnvData) return [];
    const keyword = wizardEnvSearch.trim().toLowerCase();
    if (!keyword) return wizardEnvData.devices;
    return wizardEnvData.devices.filter((row) =>
      [
        row.deviceName,
        row.protocol,
        row.ip,
        row.port,
        row.devsn,
        row.phone,
        row.plateNo,
        row.plateColor,
        row.remark,
      ].some((field) => field.toLowerCase().includes(keyword))
    );
  }, [wizardEnvData, wizardEnvSearch]);

  const middlewareRows = useMemo(() => {
    if (!wizardEnvData) return [];
    const preset = MIDDLEWARE_PRESETS[wizardMiddlewareTab];
    const values = wizardEnvData.middleware.values[wizardMiddlewareTab];
    return preset.rows.map((item) => ({
      key: item.key,
      itemKey: item.key,
      description: item.description,
      value: values[item.key] ?? '',
    }));
  }, [wizardEnvData, wizardMiddlewareTab]);

  if (wizardMode) {
    const isEditMode = wizardMode === 'edit';

    return (
      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>{wizardTitle}</Text>
            <Space>
              <Button
                onClick={() => {
                  setWizardMode(null);
                  setWizardStep(1);
                  setWizardEnvData(null);
                  setWizardEnvOptions([]);
                  setWizardEnvTab('customEnv');
                  setWizardMiddlewareTab('mysql');
                  setWizardEnvSearch('');
                  setDeviceModalOpen(false);
                  setDeviceEditingKey(null);
                }}
              >
                取消
              </Button>
              <Button disabled={wizardStep === 1} onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}>
                上一步
              </Button>
              {wizardStep < 3 ? (
                <Button
                  type="primary"
                  onClick={async () => {
                    await validateCurrentStep();
                    if (wizardStep === 1) {
                      const projectName = form.getFieldValue('projectName');
                      const version = form.getFieldValue('version');
                      syncWizardEnvByProjectVersion(projectName, version, wizardEnvData?.envKey);
                    }
                    setWizardStep((prev) => Math.min(3, prev + 1));
                  }}
                >
                  下一步
                </Button>
              ) : (
                <Button type="primary" onClick={async () => void handleSubmitWizard()}>
                  提交
                </Button>
              )}
            </Space>
          </Space>

          <Steps current={wizardStep - 1} items={STEP_ITEMS} />

          {!canEditCurrentTab && (
            <Alert
              type="warning"
              showIcon
              message="当前环境为只读权限"
              description="根据角色权限，当前环境仅支持查看，不允许创建/编辑/删除。"
            />
          )}

          <Form<TaskWizardValues>
            form={form}
            layout="vertical"
            initialValues={{
              triggerType: '手动触发',
              sendMailPolicy: '总是发送',
              retryCount: 0,
              singleCaseTimeoutSec: 600,
              moduleMatchType: '包含',
              modulePath: [],
              tagRules: [{ matchType: '等于' }],
              parallelGroupMode: '按分组标签分组',
            }}
          >
            {wizardStep === 1 && (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                    alignItems: 'start',
                  }}
                >
                  <Form.Item
                    name="taskName"
                    label="任务名称"
                    rules={[{ required: true, message: '请输入任务名称' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="请输入任务名称" />
                  </Form.Item>
                  <Form.Item
                    name="teamId"
                    label="所属团队"
                    rules={[{ required: true, message: '请选择所属团队' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select options={teams.map((team) => ({ label: team.name, value: team.id }))} disabled={isEditMode} />
                  </Form.Item>
                  <Form.Item
                    name="projectName"
                    label="所属项目"
                    rules={[{ required: true, message: '请选择所属项目' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select options={[{ label: 'CICD-V2.0', value: 'CICD-V2.0' }]} disabled={isEditMode} />
                  </Form.Item>
                  <Form.Item
                    name="version"
                    label="用例版本"
                    rules={[{ required: true, message: '请选择用例版本' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select options={[{ label: 'V2.0.2', value: 'V2.0.2' }, { label: 'V2.0.1-P1', value: 'V2.0.1-P1' }]} disabled={isEditMode} />
                  </Form.Item>
                </div>

                <Form.Item name="triggerType" label="触发方式" rules={[{ required: true, message: '请选择触发方式' }]}>
                  <Radio.Group
                    options={[
                      { label: '手动触发', value: '手动触发' },
                      { label: '定时触发', value: '定时触发' },
                      { label: '周期触发', value: '周期触发' },
                    ]}
                    onChange={() => {
                      form.setFieldsValue({
                        scheduleAt: undefined,
                        cycleTime: undefined,
                        cycleType: undefined,
                        cycleWeekdays: undefined,
                      });
                    }}
                  />
                </Form.Item>
                {triggerTypeWatch === '定时触发' && (
                  <Form.Item
                    name="scheduleAt"
                    label="触发时间"
                    rules={[{ required: true, message: '请选择定时触发时间' }]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm:ss' }}
                      format="YYYY-MM-DD HH:mm:ss"
                      style={{ width: 320 }}
                      placeholder="请选择年月日时分秒"
                    />
                  </Form.Item>
                )}
                {triggerTypeWatch === '周期触发' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        cycleTypeWatch === '每周' ? '200px minmax(260px, 1fr) 240px' : '200px 240px',
                      gap: 12,
                      alignItems: 'start',
                    }}
                  >
                    <Form.Item
                      name="cycleType"
                      label="触发周期"
                      rules={[{ required: true, message: '请选择触发周期' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        placeholder="请选择"
                        options={[
                          { label: '每天', value: '每天' },
                          { label: '每周', value: '每周' },
                        ]}
                        onChange={(value) => {
                          form.setFieldsValue({
                            cycleTime: undefined,
                            cycleWeekdays: value === '每周' ? form.getFieldValue('cycleWeekdays') : undefined,
                          });
                        }}
                      />
                    </Form.Item>
                    {cycleTypeWatch === '每周' ? (
                      <Form.Item
                        name="cycleWeekdays"
                        label="触发星期"
                        rules={[{ required: true, message: '请选择每周触发的星期' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          mode="multiple"
                          maxTagCount="responsive"
                          placeholder="请选择星期几（可多选）"
                          options={WEEKDAY_OPTIONS}
                        />
                      </Form.Item>
                    ) : null}
                    <Form.Item
                      name="cycleTime"
                      label="时间"
                      rules={[{ required: true, message: '请选择时分秒' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <TimePicker format="HH:mm:ss" style={{ width: '100%' }} placeholder="请选择时分秒" />
                    </Form.Item>
                  </div>
                )}
                <Form.Item name="sendMailPolicy" label="发送邮件" rules={[{ required: true, message: '请选择发送策略' }]}>
                  <Radio.Group
                    options={[
                      { label: '总是发送', value: '总是发送' },
                      { label: '成功后发送', value: '成功后发送' },
                      { label: '不发送', value: '不发送' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="sender" label="发件人">
                  <Input disabled={isEditMode} placeholder="请输入发件人（可选）" />
                </Form.Item>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 220px',
                    gap: 12,
                    alignItems: 'start',
                  }}
                >
                  <Form.Item name="receivers" label="收件人" style={{ marginBottom: 0 }}>
                    <Select
                      mode="tags"
                      showSearch
                      allowClear
                      style={{ width: '100%', minHeight: 72 }}
                      placeholder="支持按姓名/邮箱模糊搜索，支持多选"
                      options={mailMemberOptions}
                      filterOption={(input, option) =>
                        `${option?.label ?? ''}`.toLowerCase().includes(input.toLowerCase())
                      }
                      tokenSeparators={[',', ';', ' ']}
                      maxTagCount="responsive"
                    />
                  </Form.Item>
                  <Form.Item name="mailTeamId" label="团队选择" style={{ marginBottom: 0 }}>
                    <Select
                      allowClear
                      placeholder="单选团队"
                      options={teams.map((team) => ({ label: team.name, value: team.id }))}
                      onChange={(teamId) => {
                        if (!teamId) {
                          form.setFieldValue('receivers', []);
                          return;
                        }
                        const memberIds = MAIL_TEAM_MEMBER_IDS[teamId as string] ?? [];
                        const memberEmails = memberIds
                          .map((id) => mockUsers.find((u) => u.id === id)?.email)
                          .filter((email): email is string => Boolean(email));
                        form.setFieldValue('receivers', memberEmails);
                      }}
                    />
                  </Form.Item>
                </div>
              </Space>
            )}

            {wizardStep === 2 && (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Card
                  size="small"
                  styles={{
                    body: {
                      background: '#f6faff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    },
                  }}
                >
                  <Text strong>当前环境配置：</Text>
                  <Select
                    style={{ width: 240 }}
                    value={wizardEnvData?.envKey}
                    options={envOptionItems}
                    placeholder="请选择环境"
                    onChange={(envKey) => {
                      const target = wizardEnvOptions.find((item) => item.envKey === envKey);
                      if (!target) return;
                      setWizardEnvData(cloneEnvTemplate(target));
                    }}
                  />
                </Card>

                <Card size="small" title="应用服务器配置">
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="key"
                    dataSource={wizardEnvData?.servers ?? []}
                    columns={[
                      { title: '服务器名称', dataIndex: 'serverName' },
                      {
                        title: '协议',
                        dataIndex: 'protocol',
                        width: 160,
                        render: (value: EnvServerProtocol, row: EnvServerConfig) => (
                          <Select
                            value={value}
                            options={[
                              { label: 'http', value: 'http' },
                              { label: 'https', value: 'https' },
                              { label: 'ws', value: 'ws' },
                              { label: 'wss', value: 'wss' },
                            ]}
                            onChange={(next) => updateServerField(row.key, 'protocol', next)}
                          />
                        ),
                      },
                      {
                        title: 'IP/域名',
                        dataIndex: 'host',
                        render: (value: string, row: EnvServerConfig) => (
                          <Input
                            value={value}
                            placeholder="请输入IP或域名"
                            onChange={(e) => updateServerField(row.key, 'host', e.target.value)}
                          />
                        ),
                      },
                      {
                        title: '端口',
                        dataIndex: 'port',
                        width: 160,
                        render: (value: string, row: EnvServerConfig) => (
                          <Input
                            value={value}
                            placeholder="端口"
                            onChange={(e) => updateServerField(row.key, 'port', e.target.value)}
                          />
                        ),
                      },
                    ]}
                  />
                </Card>

                <Card
                  size="small"
                  tabList={[
                    { key: 'customEnv', tab: '自定义环境变量' },
                    { key: 'headers', tab: 'Headers' },
                    { key: 'device', tab: '设备配置' },
                    { key: 'middleware', tab: '中间件配置' },
                  ]}
                  activeTabKey={wizardEnvTab}
                  onTabChange={(key) => {
                    setWizardEnvTab(key as EnvConfigGroupKey);
                    setWizardEnvSearch('');
                  }}
                >
                  {wizardEnvTab === 'middleware' ? (
                    <>
                      <Tabs
                        size="small"
                        type="card"
                        activeKey={wizardMiddlewareTab}
                        onChange={(key) => setWizardMiddlewareTab(key as MiddlewarePresetId)}
                        items={MIDDLEWARE_PRESET_IDS.map((id) => ({ key: id, label: MIDDLEWARE_PRESETS[id].label }))}
                        style={{ marginBottom: 12 }}
                      />
                      <Table
                        size="small"
                        rowKey="key"
                        pagination={false}
                        dataSource={middlewareRows}
                        columns={[
                          { title: '配置项', dataIndex: 'itemKey', width: 180 },
                          {
                            title: '配置值',
                            dataIndex: 'value',
                            render: (value: string, row: { itemKey: string; value: string }) => (
                              <Input
                                value={value}
                                placeholder="请输入配置值"
                                onChange={(e) => updateMiddlewareValue(wizardMiddlewareTab, row.itemKey, e.target.value)}
                              />
                            ),
                          },
                          { title: '配置说明', dataIndex: 'description', width: 240 },
                        ]}
                        locale={{ emptyText: <Empty description="暂无中间件配置" /> }}
                      />
                    </>
                  ) : wizardEnvTab === 'device' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openAddDevice}>
                          添加设备
                        </Button>
                        <Input.Search
                          allowClear
                          value={wizardEnvSearch}
                          onChange={(e) => setWizardEnvSearch(e.target.value)}
                          placeholder="搜索设备名称 / 协议 / IP / 端口 / devsn / 手机号"
                          style={{ width: 360 }}
                        />
                      </div>
                      <Table
                        size="small"
                        rowKey="key"
                        dataSource={filteredWizardDeviceRows}
                        pagination={{ pageSize: 8, showSizeChanger: true }}
                        scroll={{ x: 1200 }}
                        columns={[
                          { title: '设备名称', dataIndex: 'deviceName', width: 140 },
                          { title: '协议', dataIndex: 'protocol', width: 90 },
                          { title: 'IP', dataIndex: 'ip', width: 130 },
                          { title: '端口', dataIndex: 'port', width: 90 },
                          { title: 'devsn', dataIndex: 'devsn', width: 130 },
                          { title: '手机号', dataIndex: 'phone', width: 120 },
                          { title: '车牌号', dataIndex: 'plateNo', width: 120 },
                          { title: '车牌颜色', dataIndex: 'plateColor', width: 90 },
                          { title: '备注说明', dataIndex: 'remark', width: 180 },
                          {
                            title: '操作',
                            key: 'actions',
                            width: 120,
                            render: (_, row: DeviceConfigRow) => (
                              <Space size={4}>
                                <Button type="link" onClick={() => openEditDevice(row)} style={{ padding: 0 }}>
                                  编辑
                                </Button>
                                <Button
                                  type="link"
                                  danger
                                  style={{ padding: 0 }}
                                  onClick={() =>
                                    Modal.confirm({
                                      title: '删除设备',
                                      content: '删除后不可恢复，确认继续？',
                                      okButtonProps: { danger: true },
                                      onOk: () => removeDevice(row.key),
                                    })
                                  }
                                >
                                  删除
                                </Button>
                              </Space>
                            ),
                          },
                        ]}
                        locale={{ emptyText: <Empty description="暂无设备配置" /> }}
                      />
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        <Input.Search
                          allowClear
                          value={wizardEnvSearch}
                          onChange={(e) => setWizardEnvSearch(e.target.value)}
                          placeholder={wizardEnvTab === 'headers' ? '搜索参数名/值/说明' : '搜索变量名/值/说明'}
                          style={{ width: 320 }}
                        />
                      </div>
                      <Table
                        size="small"
                        rowKey="key"
                        pagination={false}
                        dataSource={filteredWizardVarRows}
                        columns={[
                          {
                            title: wizardEnvTab === 'headers' ? '参数名' : '变量名',
                            dataIndex: 'name',
                          },
                          {
                            title: '变量值',
                            dataIndex: 'value',
                            render: (value: string, row: EnvVarConfig) => (
                              <Input
                                value={value}
                                placeholder="请输入变量值"
                                onChange={(e) =>
                                  updateEnvVarValue(wizardEnvTab as EnvVariableGroupKey, row.key, e.target.value)
                                }
                              />
                            ),
                          },
                          { title: '变量说明', dataIndex: 'description' },
                        ]}
                        locale={{ emptyText: <Empty description="当前环境暂无配置项" /> }}
                      />
                    </>
                  )}
                </Card>
                <Modal
                  title={deviceEditingKey ? '编辑设备' : '添加设备'}
                  open={deviceModalOpen}
                  destroyOnClose
                  onCancel={() => {
                    setDeviceModalOpen(false);
                    setDeviceEditingKey(null);
                  }}
                  onOk={submitDevice}
                  okText="确定"
                  cancelText="取消"
                  width={560}
                >
                  <Form form={deviceForm} layout="vertical">
                    <Form.Item
                      name="deviceName"
                      label="设备名称"
                      rules={[{ required: true, message: '请输入设备名称' }]}
                    >
                      <Input placeholder="请输入设备名称" />
                    </Form.Item>
                    <Form.Item name="protocol" label="协议" rules={[{ required: true, message: '请选择协议' }]}>
                      <Select
                        options={[
                          { label: 'http', value: 'http' },
                          { label: 'https', value: 'https' },
                          { label: 'ws', value: 'ws' },
                          { label: 'wss', value: 'wss' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="ip" label="IP" rules={[{ required: true, message: '请输入 IP' }]}>
                      <Input placeholder="请输入 IP" />
                    </Form.Item>
                    <Form.Item name="port" label="端口" rules={[{ required: true, message: '请输入端口' }]}>
                      <Input placeholder="请输入端口" />
                    </Form.Item>
                    <Form.Item name="devsn" label="devsn">
                      <Input placeholder="请输入 devsn" />
                    </Form.Item>
                    <Form.Item name="phone" label="手机号">
                      <Input placeholder="请输入手机号" />
                    </Form.Item>
                    <Form.Item name="plateNo" label="车牌号">
                      <Input placeholder="例如 浙A·12345" />
                    </Form.Item>
                    <Form.Item name="plateColor" label="车牌颜色">
                      <Input placeholder="例如 蓝色" />
                    </Form.Item>
                    <Form.Item name="remark" label="备注说明">
                      <Input.TextArea rows={2} placeholder="选填" />
                    </Form.Item>
                  </Form>
                </Modal>
              </Space>
            )}

            {wizardStep === 3 && (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Card size="small" title="执行范围" styles={{ body: { background: '#fafafa' } }}>
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Form.Item label="所属模块" required style={{ marginBottom: 0 }}>
                      <Space.Compact style={{ width: '100%' }}>
                        <Form.Item
                          name="moduleMatchType"
                          noStyle
                          rules={[{ required: true, message: '请选择模块匹配方式' }]}
                        >
                          <Select
                            disabled={isEditMode}
                            placeholder="请选择"
                            style={{ width: 120 }}
                            options={[
                              { label: '包含', value: '包含' },
                              { label: '不包含', value: '不包含' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item name="modulePath" noStyle>
                          <TreeSelect
                            disabled={isEditMode}
                            placeholder="所有用例（默认）"
                            style={{ width: 'calc(100% - 120px)' }}
                            treeData={MODULE_TREE_OPTIONS}
                            treeCheckable
                            showSearch
                            maxTagCount="responsive"
                            allowClear
                          />
                        </Form.Item>
                      </Space.Compact>
                    </Form.Item>

                    <Form.List name="tagRules">
                      {(fields, { add, remove }) => (
                        <Form.Item label="标签" style={{ marginBottom: 0 }}>
                          <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            {fields.map((field) => (
                              <div
                                key={field.key}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '120px 1fr 28px 28px',
                                  gap: 8,
                                  alignItems: 'center',
                                }}
                              >
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'matchType']}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Select
                                    disabled={isEditMode}
                                    placeholder="请选择"
                                    options={[
                                      { label: '等于', value: '等于' },
                                      { label: '包含', value: '包含' },
                                      { label: '不包含', value: '不包含' },
                                    ]}
                                  />
                                </Form.Item>
                                <Form.Item {...field} name={[field.name, 'tag']} style={{ marginBottom: 0 }}>
                                  <Select
                                    disabled={isEditMode}
                                    placeholder="请选择标签"
                                    showSearch
                                    options={TAG_SCOPE_OPTIONS}
                                  />
                                </Form.Item>
                                <Button
                                  type="text"
                                  icon={<PlusOutlined />}
                                  disabled={isEditMode}
                                  onClick={() => add({ matchType: '等于' })}
                                />
                                <Button
                                  type="text"
                                  icon={<CloseOutlined />}
                                  disabled={isEditMode || fields.length <= 1}
                                  onClick={() => remove(field.name)}
                                />
                              </div>
                            ))}
                          </Space>
                        </Form.Item>
                      )}
                    </Form.List>

                  </Space>
                </Card>
                <Card size="small" title="并行配置">
                  <Form.Item
                    name="parallelGroupMode"
                    label="分组"
                    rules={[{ required: true, message: '请选择分组方式' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      disabled={isEditMode}
                      placeholder="请选择分组方式"
                      options={[
                        { label: '按一级模块分组', value: '按一级模块分组' },
                        { label: '自定义模块分组', value: '自定义模块分组' },
                        { label: '按分组标签分组', value: '按分组标签分组' },
                      ]}
                    />
                  </Form.Item>
                </Card>
                <Form.Item
                  name="retryCount"
                  label="失败重试次数"
                  rules={[{ required: true, message: '请输入失败重试次数' }]}
                >
                  <InputNumber min={0} style={{ width: 240 }} disabled={isEditMode} />
                </Form.Item>
                <Form.Item
                  label="单用例最大执行超时时长"
                  required
                  style={{ marginBottom: 24 }}
                >
                  <Space>
                    <Form.Item
                      name="singleCaseTimeoutSec"
                      noStyle
                      rules={[{ required: true, message: '请输入单用例最大执行超时时长' }]}
                    >
                      <InputNumber min={1} style={{ width: 200 }} disabled={isEditMode} />
                    </Form.Item>
                    <Text type="secondary">秒</Text>
                  </Space>
                </Form.Item>
                <Form.Item name="cleanDownloadDir" valuePropName="checked">
                  <Checkbox disabled={isEditMode}>运行完成后清理下载文件夹</Checkbox>
                </Form.Item>
                {isEditMode && <Text type="secondary">编辑模式下，步骤3仅查看，不允许修改。</Text>}
              </Space>
            )}
          </Form>
        </Space>
      </Card>
    );
  }

  return (
    <Card>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(nextTab) => {
            const tab = nextTab as PlatformEnvTab;
            setActiveTab(tab);
            setPage(1);
            writeQuery({ tab, page: '1' });
          }}
          items={[
            { key: 'test', label: '测试环境' },
            { key: 'dev', label: '开发环境' },
          ]}
        />

        <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button type="primary" icon={<PlusOutlined />} disabled={!canEditCurrentTab} onClick={openCreateWizard}>
            创建测试任务
          </Button>
          <Space>
            <Select
              value={selectedTeamId}
              style={{ width: 180 }}
              options={[
                { label: '全部团队', value: ALL_TEAM_VALUE },
                ...teams.map((team) => ({ label: team.name, value: team.id })),
              ]}
              onChange={(teamId) => {
                setSelectedTeamId(teamId);
                setPage(1);
                writeQuery({ team: teamId, page: '1' });
              }}
            />
            <Input
              allowClear
              value={keywordInput}
              prefix={<SearchOutlined />}
              placeholder="请输入任务名称"
              onChange={(e) => {
                const value = e.target.value;
                setKeywordInput(value);
                if (!value) {
                  setTaskKeyword('');
                  setPage(1);
                  writeQuery({ keyword: '', page: '1' });
                }
              }}
              onPressEnter={() => {
                setTaskKeyword(keywordInput.trim());
                setPage(1);
                writeQuery({ keyword: keywordInput.trim(), page: '1' });
              }}
              style={{ width: 260 }}
            />
            <Button
              type={onlyCreatedByMe ? 'primary' : 'default'}
              onClick={() => {
                const next = !onlyCreatedByMe;
                setOnlyCreatedByMe(next);
                setPage(1);
                writeQuery({ mine: next ? '1' : '', page: '1' });
              }}
            >
              我创建的
            </Button>
          </Space>
        </Space>

        {!canEditCurrentTab && (
          <Alert
            type="warning"
            showIcon
            message="当前环境仅支持查看"
            description="根据用户角色权限，当前环境不具备编辑能力。"
          />
        )}

        <Table
          rowKey="taskId"
          columns={columns}
          dataSource={pagedTasks}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无任务，去创建一条任务吧" /> }}
          scroll={{ x: 1300 }}
        />

        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Text type="secondary">共 {filteredTasks.length} 条</Text>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredTasks.length}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            onChange={(nextPage, nextSize) => {
              setPage(nextPage);
              if (nextSize !== pageSize) {
                setPageSize(nextSize);
              }
              writeQuery({ page: String(nextPage), pageSize: String(nextSize ?? pageSize) });
            }}
          />
        </Space>
      </Space>
    </Card>
  );
}
