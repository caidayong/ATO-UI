/**
 * @page 资源管理
 * @version V1.0.13
 * @base 历史页面补充，参考资源管理截图
 * @changes
 *   - V1.0.0: 初始实现设备资源 Tab（左侧团队筛选 + 设备列表 + 添加/编辑/删除）；添加设备弹窗含设备机型/所属团队/客户编码及必填校验
 *   - V1.0.1: 「添加设备」移至内容区右上角；左右分栏对齐并增加竖向分隔边界
 *   - V1.0.2: 工具栏左「添加设备」、右搜索框；搜索从 Tab 栏移至内容区
 *   - V1.0.3: 左侧团队树默认选中「团队」展示全部；点击具体团队筛选对应数据
 *   - V1.0.4: 具体团队列表相对「团队」根节点增加缩进，区分层级
 *   - V1.0.5: 编辑设备弹窗新增「上市状态」下拉（正常 / 待退市 / 已退市）
 *   - V1.0.6: 实现自动化环境 Tab（列表 / 团队筛选 / 添加编辑 / 检测 / 释放）
 *   - V1.0.7: 「添加整机自动化环境」完整表单；未选所属团队时使用人/设备型号/控制盒版本下拉为空
 *   - V1.0.8: 添加整机自动化环境弹窗加宽并改为两列布局
 *   - V1.0.9: 编辑环境弹窗与新增字段/两列布局一致；变更所属团队时清空使用人与设备信息
 *   - V1.0.10: 环境名称跳转环境详情页
 *   - V1.0.11: 释放环境确认文案更新
 *   - V1.0.12: Tab 状态同步 URL；从环境详情返回时定位自动化环境 Tab
 *   - V1.0.13: 环境检测异常感叹号支持 Tooltip 展示失败原因
 */

import { useMemo, useState, type ReactNode, useCallback } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tooltip,
  message,
} from 'antd';
import type { TableProps, TabsProps } from 'antd';
import { ExclamationCircleOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FormModal, FilterToolbar } from '@/components/layout';
import { FILTER_CONTROL_WIDTH, PAGE_MIN_HEIGHT, SPACING } from '@/constants/ui';
import { resourceEnvironmentDetailPath, ROUTES } from '@/constants/routes';
import {
  mockAutomationEnvironments,
  mockControlBoxVersions,
  mockDeviceModels,
  mockDeviceResources,
  mockTeamMemberIds,
  mockTeams,
  mockUsers,
} from '@/mocks/data';
import type {
  AutomationEnvironment,
  AutomationEnvStatus,
  DeviceMarketStatus,
  DeviceResource,
} from '@/types';

const DEFAULT_PAGE_SIZE = 20;

const SIDEBAR_WIDTH = 200;

const PANEL_BORDER = '1px solid #f0f0f0';

const WARN_ICON_COLOR = '#ff4d4f';

/** 左侧团队树「全部」节点 */
const TEAM_FILTER_ALL = '__ALL__';

const MARKET_STATUS_COLOR: Record<DeviceMarketStatus, 'success' | 'warning' | 'error'> = {
  正常: 'success',
  待退市: 'warning',
  已退市: 'error',
};

const ENV_STATUS_COLOR: Record<AutomationEnvStatus, 'success' | 'error'> = {
  正常: 'success',
  异常: 'error',
};

const MARKET_STATUS_OPTIONS: { value: DeviceMarketStatus; label: DeviceMarketStatus }[] = [
  { value: '正常', label: '正常' },
  { value: '待退市', label: '待退市' },
  { value: '已退市', label: '已退市' },
];

type DeviceFormValues = {
  modelId: string;
  team: string;
  customerCode?: string;
  marketStatus?: DeviceMarketStatus;
};

const EXECUTOR_OS_OPTIONS = [
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
] as const;

type EnvironmentFormValues = {
  name: string;
  team: string;
  userId?: string;
  user?: string;
  executorIp: string;
  executorOs?: 'windows' | 'linux';
  executorUsername?: string;
  executorPassword?: string;
  modelId?: string;
  modelName?: string;
  deviceIp: string;
  deviceUsername?: string;
  devicePassword?: string;
  deviceSerialNo?: string;
  devicePlateNo?: string;
  devicePhone?: string;
  controlBoxVersion: string;
};

type ResourceTabKey = 'device' | 'environment';

function renderWarnCell(value: string, checkError?: string) {
  return (
    <Space size={SPACING.xs / 2}>
      <span>{value}</span>
      {checkError ? (
        <Tooltip title={checkError}>
          <ExclamationCircleOutlined style={{ color: WARN_ICON_COLOR, cursor: 'help' }} />
        </Tooltip>
      ) : null}
    </Space>
  );
}

export function ResourceManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = useMemo<ResourceTabKey>(() => {
    return searchParams.get('tab') === 'environment' ? 'environment' : 'device';
  }, [searchParams]);
  const [selectedTeam, setSelectedTeam] = useState<string>(TEAM_FILTER_ALL);

  const [devices, setDevices] = useState<DeviceResource[]>(mockDeviceResources);
  const [deviceKeywordInput, setDeviceKeywordInput] = useState('');
  const [deviceQueryKeyword, setDeviceQueryKeyword] = useState('');
  const [devicePage, setDevicePage] = useState(1);
  const [devicePageSize, setDevicePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceResource | null>(null);
  const [deviceForm] = Form.useForm<DeviceFormValues>();

  const [environments, setEnvironments] = useState<AutomationEnvironment[]>(mockAutomationEnvironments);
  const [envKeywordInput, setEnvKeywordInput] = useState('');
  const [envQueryKeyword, setEnvQueryKeyword] = useState('');
  const [envPage, setEnvPage] = useState(1);
  const [envPageSize, setEnvPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [envModalOpen, setEnvModalOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<AutomationEnvironment | null>(null);
  const [envEditingOriginalTeam, setEnvEditingOriginalTeam] = useState<string | null>(null);
  const [envForm] = Form.useForm<EnvironmentFormValues>();
  const watchedEnvTeam = Form.useWatch('team', envForm);

  const selectedEnvTeamId = useMemo(
    () => mockTeams.find((t) => t.name === watchedEnvTeam)?.id,
    [watchedEnvTeam]
  );

  const envTeamMemberOptions = useMemo(() => {
    if (!selectedEnvTeamId) return [];
    const memberIds = mockTeamMemberIds[selectedEnvTeamId] ?? [];
    return mockUsers
      .filter((u) => memberIds.includes(u.id))
      .map((u) => ({ value: u.id, label: u.name }));
  }, [selectedEnvTeamId]);

  const envDeviceModelOptions = useMemo(() => {
    if (!watchedEnvTeam) return [];
    return mockDeviceModels.map((m) => ({ value: m.id, label: m.name }));
  }, [watchedEnvTeam]);

  const envControlBoxOptions = useMemo(() => {
    if (!watchedEnvTeam) return [];
    return mockControlBoxVersions.map((v) => ({ value: v, label: v }));
  }, [watchedEnvTeam]);

  const modelOptions = useMemo(
    () => mockDeviceModels.map((m) => ({ value: m.id, label: m.name })),
    []
  );

  const teamOptions = useMemo(
    () => mockTeams.map((t) => ({ value: t.name, label: t.name })),
    []
  );

  const filteredDevices = useMemo(() => {
    const keyword = deviceQueryKeyword.trim().toLowerCase();
    return devices.filter((item) => {
      const matchTeam = selectedTeam === TEAM_FILTER_ALL || item.team === selectedTeam;
      const matchKeyword =
        !keyword ||
        item.modelName.toLowerCase().includes(keyword) ||
        (item.customerCode ?? '').toLowerCase().includes(keyword);
      return matchTeam && matchKeyword;
    });
  }, [devices, deviceQueryKeyword, selectedTeam]);

  const pagedDevices = useMemo(() => {
    const start = (devicePage - 1) * devicePageSize;
    return filteredDevices.slice(start, start + devicePageSize);
  }, [filteredDevices, devicePage, devicePageSize]);

  const filteredEnvironments = useMemo(() => {
    const keyword = envQueryKeyword.trim().toLowerCase();
    return environments.filter((item) => {
      const matchTeam = selectedTeam === TEAM_FILTER_ALL || item.team === selectedTeam;
      const matchKeyword =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.executorIp.toLowerCase().includes(keyword) ||
        item.deviceIp.toLowerCase().includes(keyword);
      return matchTeam && matchKeyword;
    });
  }, [environments, envQueryKeyword, selectedTeam]);

  const pagedEnvironments = useMemo(() => {
    const start = (envPage - 1) * envPageSize;
    return filteredEnvironments.slice(start, start + envPageSize);
  }, [filteredEnvironments, envPage, envPageSize]);

  const handleTabChange = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams);
      if (key === 'environment') {
        next.set('tab', 'environment');
      } else {
        next.delete('tab');
      }
      const query = next.toString();
      navigate({ pathname: ROUTES.AUTOMATION_RESOURCES, search: query ? `?${query}` : '' }, { replace: true });
    },
    [navigate, searchParams]
  );

  const handleDeviceSearch = () => {
    setDeviceQueryKeyword(deviceKeywordInput);
    setDevicePage(1);
  };

  const handleEnvSearch = () => {
    setEnvQueryKeyword(envKeywordInput);
    setEnvPage(1);
  };

  const handleOpenAddDevice = () => {
    setEditingDevice(null);
    deviceForm.resetFields();
    setDeviceModalOpen(true);
  };

  const handleOpenEditDevice = (record: DeviceResource) => {
    setEditingDevice(record);
    deviceForm.setFieldsValue({
      modelId: record.modelId,
      team: record.team,
      customerCode: record.customerCode,
      marketStatus: record.marketStatus ?? '正常',
    });
    setDeviceModalOpen(true);
  };

  const handleDeleteDevice = (record: DeviceResource) => {
    Modal.confirm({
      title: '删除设备',
      content: `确定删除设备「${record.modelName}」吗？此操作不可恢复。`,
      okButtonProps: { danger: true },
      onOk: () => {
        setDevices((prev) => prev.filter((item) => item.id !== record.id));
        message.success('删除成功');
      },
    });
  };

  const handleSubmitDevice = async () => {
    try {
      const values = await deviceForm.validateFields();
      const model = mockDeviceModels.find((m) => m.id === values.modelId);
      if (!model) {
        message.error('设备机型无效');
        return;
      }

      if (editingDevice) {
        setDevices((prev) =>
          prev.map((item) =>
            item.id === editingDevice.id
              ? {
                  ...item,
                  modelId: model.id,
                  modelName: model.name,
                  team: values.team,
                  customerCode: values.customerCode?.trim() || undefined,
                  marketStatus: values.marketStatus,
                }
              : item
          )
        );
        message.success('编辑成功');
      } else {
        const newDevice: DeviceResource = {
          id: `dr-${Date.now()}`,
          modelId: model.id,
          modelName: model.name,
          team: values.team,
          customerCode: values.customerCode?.trim() || undefined,
          marketStatus: '正常',
        };
        setDevices((prev) => [newDevice, ...prev]);
        message.success('添加成功');
      }
      setDeviceModalOpen(false);
      deviceForm.resetFields();
    } catch {
      /* 表单校验失败时 Ant Design 会在字段下展示「XXX未填写」 */
    }
  };

  const handleOpenAddEnv = () => {
    setEditingEnv(null);
    setEnvEditingOriginalTeam(null);
    envForm.resetFields();
    envForm.setFieldsValue({ executorOs: 'windows' });
    setEnvModalOpen(true);
  };

  const clearEnvTeamDependentFields = () => {
    envForm.setFieldsValue({
      userId: undefined,
      modelId: undefined,
      controlBoxVersion: undefined,
      deviceIp: undefined,
      deviceUsername: undefined,
      devicePassword: undefined,
      deviceSerialNo: undefined,
      devicePlateNo: undefined,
      devicePhone: undefined,
    });
  };

  const handleEnvTeamChange = (newTeam: string) => {
    const shouldClear = !editingEnv || newTeam !== envEditingOriginalTeam;
    if (shouldClear) {
      clearEnvTeamDependentFields();
    }
  };

  const mapEnvRecordToForm = (record: AutomationEnvironment): EnvironmentFormValues => ({
    name: record.name,
    team: record.team,
    userId: record.userId ?? mockUsers.find((u) => u.name === record.user)?.id,
    executorIp: record.executorIp,
    executorOs: record.executorOs ?? 'windows',
    executorUsername: record.executorUsername,
    executorPassword: record.executorPassword,
    modelId: record.modelId ?? mockDeviceModels.find((m) => m.name === record.modelName)?.id,
    deviceIp: record.deviceIp,
    deviceUsername: record.deviceUsername,
    devicePassword: record.devicePassword,
    deviceSerialNo: record.deviceSerialNo,
    devicePlateNo: record.devicePlateNo,
    devicePhone: record.devicePhone,
    controlBoxVersion: record.controlBoxVersion,
  });

  const buildEnvFromFormValues = (
    values: EnvironmentFormValues,
    existing?: AutomationEnvironment
  ): AutomationEnvironment => {
    const model = mockDeviceModels.find((m) => m.id === values.modelId);
    const member = mockUsers.find((u) => u.id === values.userId);
    return {
      id: existing?.id ?? `ae-${Date.now()}`,
      name: values.name.trim(),
      team: values.team,
      executorIp: values.executorIp.trim(),
      executorOs: values.executorOs ?? 'windows',
      executorUsername: values.executorUsername?.trim(),
      executorPassword: values.executorPassword,
      modelId: values.modelId,
      modelName: model?.name ?? existing?.modelName ?? '',
      deviceIp: values.deviceIp.trim(),
      deviceUsername: values.deviceUsername?.trim(),
      devicePassword: values.devicePassword,
      deviceSerialNo: values.deviceSerialNo?.trim() || undefined,
      devicePlateNo: values.devicePlateNo?.trim() || undefined,
      devicePhone: values.devicePhone?.trim() || undefined,
      controlBoxVersion: values.controlBoxVersion,
      userId: values.userId,
      user: member?.name ?? '-',
      status: existing?.status ?? '正常',
      executorCheckError: existing?.executorCheckError,
      deviceCheckError: existing?.deviceCheckError,
      controlBoxCheckError: existing?.controlBoxCheckError,
    };
  };

  const handleOpenEditEnv = (record: AutomationEnvironment) => {
    setEditingEnv(record);
    setEnvEditingOriginalTeam(record.team);
    envForm.setFieldsValue(mapEnvRecordToForm(record));
    setEnvModalOpen(true);
  };

  const handleSubmitEnv = async () => {
    try {
      const values = await envForm.validateFields();
      const payload = buildEnvFromFormValues(values, editingEnv ?? undefined);

      if (editingEnv) {
        setEnvironments((prev) =>
          prev.map((item) => (item.id === editingEnv.id ? payload : item))
        );
        message.success('编辑成功');
      } else {
        setEnvironments((prev) => [payload, ...prev]);
        message.success('添加成功');
      }
      setEnvModalOpen(false);
      setEditingEnv(null);
      setEnvEditingOriginalTeam(null);
      envForm.resetFields();
    } catch {
      /* 校验失败 */
    }
  };

  const handleCheckEnv = (record: AutomationEnvironment) => {
    message.loading({ content: '正在检测环境…', key: `check-${record.id}` });
    window.setTimeout(() => {
      setEnvironments((prev) =>
        prev.map((item) =>
          item.id === record.id
            ? {
                ...item,
                status: '正常',
                deviceStatus: '正常',
                executorStatus: '正常',
                controlBoxStatus: '正常',
                executorCheckError: undefined,
                deviceCheckError: undefined,
                controlBoxCheckError: undefined,
              }
            : item
        )
      );
      message.success({ content: '检测完成，环境状态已更新为正常', key: `check-${record.id}` });
    }, 800);
  };

  const handleReleaseEnv = (record: AutomationEnvironment) => {
    Modal.confirm({
      title: '释放环境',
      content: '释放环境后会影响自动化用例运行，请谨慎操作，确认释放吗？',
      onOk: () => {
        setEnvironments((prev) =>
          prev.map((item) =>
            item.id === record.id
              ? {
                  ...item,
                  user: '-',
                }
              : item
          )
        );
        message.success('释放成功');
      },
    });
  };

  const deviceColumns: TableProps<DeviceResource>['columns'] = [
    {
      title: '设备型号',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 180,
      render: (value: string) => <a>{value}</a>,
    },
    {
      title: '客户编码',
      dataIndex: 'customerCode',
      key: 'customerCode',
      width: 180,
      render: (value?: string) => value || '-',
    },
    {
      title: '所属团队',
      dataIndex: 'team',
      key: 'team',
      width: 120,
    },
    {
      title: '上市状态',
      dataIndex: 'marketStatus',
      key: 'marketStatus',
      width: 120,
      render: (status?: DeviceMarketStatus) =>
        status ? <Badge status={MARKET_STATUS_COLOR[status]} text={status} /> : '-',
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size={SPACING.xs}>
          <Button type="link" size="small" onClick={() => handleOpenEditDevice(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDeleteDevice(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const envColumns: TableProps<AutomationEnvironment>['columns'] = [
    {
      title: '环境名称',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      fixed: 'left',
      render: (value: string, record) => (
        <Link to={resourceEnvironmentDetailPath(record.id)}>{value}</Link>
      ),
    },
    {
      title: '所属团队',
      dataIndex: 'team',
      key: 'team',
      width: 100,
    },
    {
      title: '执行机',
      dataIndex: 'executorIp',
      key: 'executorIp',
      width: 160,
      render: (value: string, record) => renderWarnCell(value, record.executorCheckError),
    },
    {
      title: '机型',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 120,
    },
    {
      title: '设备IP',
      dataIndex: 'deviceIp',
      key: 'deviceIp',
      width: 160,
      render: (value: string, record) => renderWarnCell(value, record.deviceCheckError),
    },
    {
      title: '控制盒',
      dataIndex: 'controlBoxVersion',
      key: 'controlBoxVersion',
      width: 100,
      render: (value: string, record) => renderWarnCell(value, record.controlBoxCheckError),
    },
    {
      title: '使用人',
      dataIndex: 'user',
      key: 'user',
      width: 100,
      render: (value: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AutomationEnvStatus) => (
        <Badge status={ENV_STATUS_COLOR[status]} text={status} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Space size={SPACING.xs}>
          <Button type="link" size="small" onClick={() => handleOpenEditEnv(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => handleCheckEnv(record)}>
            检测
          </Button>
          <Button type="link" size="small" onClick={() => handleReleaseEnv(record)}>
            释放
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems: TabsProps['items'] = [
    { key: 'device', label: '设备资源' },
    { key: 'environment', label: '自动化环境' },
  ];

  const handleSelectTeam = (teamKey: string) => {
    setSelectedTeam(teamKey);
    setDevicePage(1);
    setEnvPage(1);
  };

  const renderTeamItem = (key: string, label: string, teamKey: string, indented = false) => {
    const active = selectedTeam === teamKey;
    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        onClick={() => handleSelectTeam(teamKey)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleSelectTeam(teamKey);
          }
        }}
        style={{
          padding: `${SPACING.xs / 2}px ${SPACING.xs}px`,
          paddingLeft: indented ? SPACING.lg : SPACING.xs,
          borderRadius: 4,
          cursor: 'pointer',
          background: active ? 'rgba(22, 119, 255, 0.08)' : undefined,
          color: active ? '#1677FF' : undefined,
        }}
      >
        {label}
      </div>
    );
  };

  const renderTeamSidebar = () => (
    <aside
      style={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        paddingTop: SPACING.md,
        paddingRight: SPACING.md,
        borderRight: PANEL_BORDER,
      }}
    >
      <div>
        {renderTeamItem('team-all', '团队', TEAM_FILTER_ALL)}
        {mockTeams.map((team) => renderTeamItem(team.id, team.name, team.name, true))}
      </div>
    </aside>
  );

  const renderPagination = (
    page: number,
    pageSize: number,
    total: number,
    onChange: (nextPage: number, nextSize: number) => void
  ) => (
    <Flex justify="flex-end" style={{ marginTop: SPACING.md }}>
      <Pagination
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger
        showQuickJumper
        pageSizeOptions={['10', '20', '50', '100']}
        showTotal={(count) => `共 ${count} 条`}
        onChange={onChange}
      />
    </Flex>
  );

  const renderSplitContent = (table: ReactNode, pagination: ReactNode) => (
    <Flex align="stretch" style={{ borderTop: PANEL_BORDER, marginTop: SPACING.md }}>
      {renderTeamSidebar()}
      <div style={{ flex: 1, minWidth: 0, paddingTop: SPACING.md, paddingLeft: SPACING.md }}>
        {table}
        {pagination}
      </div>
    </Flex>
  );

  const renderDeviceTab = () => (
    <>
      <FilterToolbar
        left={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddDevice}>
            添加设备
          </Button>
        }
        right={
          <Input
            allowClear
            placeholder="请输入设备IP或型号"
            prefix={<SearchOutlined />}
            style={{ width: FILTER_CONTROL_WIDTH.searchWide }}
            value={deviceKeywordInput}
            onChange={(e) => setDeviceKeywordInput(e.target.value)}
            onPressEnter={handleDeviceSearch}
          />
        }
      />
      {renderSplitContent(
        <Table<DeviceResource>
          rowKey="id"
          columns={deviceColumns}
          dataSource={pagedDevices}
          pagination={false}
          scroll={{ x: 720 }}
          locale={{ emptyText: <Empty description="暂无设备资源" /> }}
        />,
        renderPagination(devicePage, devicePageSize, filteredDevices.length, (nextPage, nextSize) => {
          setDevicePage(nextPage);
          setDevicePageSize(nextSize);
        })
      )}
    </>
  );

  const renderEnvironmentTab = () => (
    <>
      <FilterToolbar
        left={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddEnv}>
            添加整机自动化环境
          </Button>
        }
        right={
          <Input
            allowClear
            placeholder="请输入环境名称或IP进行查询"
            prefix={<SearchOutlined />}
            style={{ width: FILTER_CONTROL_WIDTH.searchWide }}
            value={envKeywordInput}
            onChange={(e) => setEnvKeywordInput(e.target.value)}
            onPressEnter={handleEnvSearch}
          />
        }
      />
      {renderSplitContent(
        <Table<AutomationEnvironment>
          rowKey="id"
          columns={envColumns}
          dataSource={pagedEnvironments}
          pagination={false}
          scroll={{ x: 1200 }}
          locale={{ emptyText: <Empty description="暂无自动化环境" /> }}
        />,
        renderPagination(envPage, envPageSize, filteredEnvironments.length, (nextPage, nextSize) => {
          setEnvPage(nextPage);
          setEnvPageSize(nextSize);
        })
      )}
    </>
  );

  const renderEnvironmentFormFields = () => (
    <Row gutter={SPACING.md}>
      <Col span={12}>
        <Form.Item
          name="name"
          label="环境名称"
          rules={[{ required: true, message: '环境名称未填写' }]}
        >
          <Input placeholder="请输入环境名称" allowClear />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="team"
          label="所属团队"
          rules={[{ required: true, message: '所属团队未填写' }]}
        >
          <Select
            placeholder="请选择所属团队"
            options={teamOptions}
            showSearch
            optionFilterProp="label"
            onChange={handleEnvTeamChange}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="userId"
          label="使用人"
          rules={[{ required: true, message: '使用人未填写' }]}
        >
          <Select
            placeholder={watchedEnvTeam ? '请选择使用人' : '请先选择所属团队'}
            options={envTeamMemberOptions}
            showSearch
            optionFilterProp="label"
            disabled={!watchedEnvTeam}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="executorIp"
          label="执行机IP"
          rules={[{ required: true, message: '执行机IP未填写' }]}
        >
          <Input placeholder="请输入执行机 IP" allowClear />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="executorOs"
          label="执行机操作系统"
          rules={[{ required: true, message: '执行机操作系统未填写' }]}
        >
          <Select placeholder="请选择操作系统" options={[...EXECUTOR_OS_OPTIONS]} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="executorUsername"
          label="执行机登录用户名"
          rules={[{ required: true, message: '执行机登录用户名未填写' }]}
        >
          <Input placeholder="请输入执行机登录用户名" allowClear />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="executorPassword"
          label="执行机登录密码"
          rules={[{ required: true, message: '执行机登录密码未填写' }]}
        >
          <Input.Password placeholder="请输入执行机登录密码" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="modelId"
          label="设备型号"
          rules={[{ required: true, message: '设备型号未填写' }]}
        >
          <Select
            placeholder={watchedEnvTeam ? '请选择设备型号' : '请先选择所属团队'}
            options={envDeviceModelOptions}
            showSearch
            optionFilterProp="label"
            disabled={!watchedEnvTeam}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="deviceIp"
          label="设备IP"
          rules={[{ required: true, message: '设备IP未填写' }]}
        >
          <Input placeholder="请输入设备 IP" allowClear />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="deviceUsername"
          label="设备登录用户名"
          rules={[{ required: true, message: '设备登录用户名未填写' }]}
        >
          <Input placeholder="请输入设备登录用户名" allowClear />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="devicePassword"
          label="设备登录密码"
          rules={[{ required: true, message: '设备登录密码未填写' }]}
        >
          <Input.Password placeholder="请输入设备登录密码" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="controlBoxVersion"
          label="控制盒版本"
          rules={[{ required: true, message: '控制盒版本未填写' }]}
        >
          <Select
            placeholder={watchedEnvTeam ? '请选择控制盒版本' : '请先选择所属团队'}
            options={envControlBoxOptions}
            disabled={!watchedEnvTeam}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="deviceSerialNo" label="设备序列号">
          <Input placeholder="请输入设备序列号" allowClear />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="devicePlateNo" label="设备车牌号">
          <Input placeholder="请输入设备车牌号" allowClear />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="devicePhone" label="设备手机号">
          <Input placeholder="请输入设备手机号" allowClear />
        </Form.Item>
      </Col>
    </Row>
  );

  return (
    <>
      <div style={{ minHeight: PAGE_MIN_HEIGHT }}>
        <Card>
          <Tabs
            activeKey={activeTab}
            items={tabItems}
            onChange={handleTabChange}
            style={{ marginBottom: SPACING.md }}
          />
          {activeTab === 'device' ? renderDeviceTab() : renderEnvironmentTab()}
        </Card>
      </div>

      <FormModal
        title={editingDevice ? '编辑设备' : '添加设备'}
        open={deviceModalOpen}
        onOk={handleSubmitDevice}
        onCancel={() => {
          setDeviceModalOpen(false);
          deviceForm.resetFields();
        }}
        okText="确定"
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        <Form form={deviceForm} layout="vertical" style={{ marginTop: SPACING.md }}>
          <Form.Item
            name="modelId"
            label="设备机型"
            rules={[{ required: true, message: '设备机型未填写' }]}
          >
            <Select placeholder="请选择设备机型" options={modelOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item
            name="team"
            label="所属团队"
            rules={[{ required: true, message: '所属团队未填写' }]}
          >
            <Select placeholder="请选择所属团队" options={teamOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="customerCode" label="客户编码">
            <Input placeholder="请输入客户编码" allowClear />
          </Form.Item>
          {editingDevice ? (
            <Form.Item
              name="marketStatus"
              label="上市状态"
              rules={[{ required: true, message: '上市状态未填写' }]}
            >
              <Select placeholder="请选择上市状态" options={MARKET_STATUS_OPTIONS} />
            </Form.Item>
          ) : null}
        </Form>
      </FormModal>

      <FormModal
        title={editingEnv ? '编辑整机自动化环境' : '添加整机自动化环境'}
        open={envModalOpen}
        onOk={handleSubmitEnv}
        onCancel={() => {
          setEnvModalOpen(false);
          setEditingEnv(null);
          setEnvEditingOriginalTeam(null);
          envForm.resetFields();
        }}
        okText="确定"
        cancelText="取消"
        width={880}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={envForm}
          layout="vertical"
          style={{ marginTop: SPACING.md }}
          initialValues={{ executorOs: 'windows' }}
        >
          {renderEnvironmentFormFields()}
        </Form>
      </FormModal>
    </>
  );
}
