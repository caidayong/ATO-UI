/**
 * @page 项目详情
 * @version V1.0.6
 * @base ATO_V1.0.0-页面需求与交互规格.md 第 4.3 节
 * @changes
 *   - V1.0.0: 初始实现，包含项目版本 Tab（列表/发布/召回/删除/添加版本）和项目信息 Tab
 *   - V1.0.1: 优化版本列表（用例覆盖率/成功率改为纯百分比显示）、搜索框改为回车/按钮触发搜索
 *   - V1.0.2: 点击版本号打开用例管理新窗口时附带 `pn`/`vn` query，供 VersionDevLayout 顶栏展示
 *   - V1.0.3: 整机项目差异化「添加版本」弹窗与版本列表列（适配机型/版本计划/继承版本级联等）
 *   - V1.0.4: 整机版本列表列顺序调整（含创建时间）；操作栏与平台项目一致（详情/发布/召回/编辑/删除）
 *   - V1.0.5: 整机项目点击版本号进入 /device-version-dev 独立窗口，与平台 /version-dev 隔离
 *   - V1.0.6: 整机「继承版本」去掉选机型下拉，直接选当前项目已有版本
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Card,
  Button,
  Input,
  Table,
  Modal,
  Form,
  message,
  Typography,
  Tag,
  Space,
  Tabs,
  Descriptions,
  DatePicker,
  Select,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import {
  PlusOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  mockProjects,
  mockVersions,
  mockUsers,
  mockTeams,
  mockTeamMemberIds,
  mockDeviceModels,
} from '@/mocks/data';
import { versionDetailPath, versionDevPath, deviceVersionDevPath } from '@/constants/routes';
import { FormModal } from '@/components/layout';
import type { ProjectVersion, WholeMachineVersionStatus } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

/** 整机项目版本号：首字母大写 V + 英文字母/数字/中划线/下划线/点号 */
const WHOLE_MACHINE_VERSION_PATTERN = /^V[A-Za-z0-9._-]+$/;
const WHOLE_MACHINE_VERSION_MAX_BYTES = 20;

const platformVersionStatusMap = {
  未发布: { color: 'default', action: '发布' },
  已发布: { color: 'success', action: '召回' },
  已召回: { color: 'warning', action: '发布' },
} as const;

const wholeMachineVersionStatusMap: Record<
  WholeMachineVersionStatus,
  { color: string; action: string }
> = {
  开发中: { color: 'processing', action: '发布' },
  已延期: { color: 'error', action: '发布' },
  已发布: { color: 'success', action: '召回' },
};

function getVersionActionText(
  status: ProjectVersion['status'],
  isWholeMachine: boolean
): string {
  if (isWholeMachine) {
    return (
      wholeMachineVersionStatusMap[status as WholeMachineVersionStatus]?.action ?? ''
    );
  }
  return (
    platformVersionStatusMap[status as keyof typeof platformVersionStatusMap]?.action ?? ''
  );
}

function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function validateWholeMachineVersion(_: unknown, value: string) {
  if (!value) return Promise.resolve();
  if (getUtf8ByteLength(value) > WHOLE_MACHINE_VERSION_MAX_BYTES) {
    return Promise.reject(new Error('版本号不能超过20字节'));
  }
  if (!WHOLE_MACHINE_VERSION_PATTERN.test(value)) {
    return Promise.reject(new Error('版本号格式错误'));
  }
  return Promise.resolve();
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const project = useMemo(() => mockProjects.find((p) => p.id === id), [id]);
  const isWholeMachineProject = project?.projectType === '整机项目';

  const projectMembers = useMemo(() => {
    if (!project) return mockUsers;
    const team = mockTeams.find((t) => t.name === project.team);
    if (!team) return mockUsers;
    const memberIds = mockTeamMemberIds[team.id] ?? [];
    return mockUsers.filter((u) => memberIds.includes(u.id));
  }, [project]);

  const [versions, setVersions] = useState<ProjectVersion[]>(() =>
    mockVersions.filter((v) => v.projectId === id)
  );
  const [versionSearch, setVersionSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ProjectVersion | null>(null);
  const [versionForm] = Form.useForm();

  const filteredVersions = useMemo(() => {
    const k = versionSearch.trim().toLowerCase();
    if (!k) return versions;
    return versions.filter(
      (v) =>
        v.version.toLowerCase().includes(k) ||
        v.owner.toLowerCase().includes(k) ||
        (v.adaptedModels?.join(' ') ?? '').toLowerCase().includes(k)
    );
  }, [versions, versionSearch]);

  /** 整机项目 · 继承版本可选列表（当前项目下已有版本，排除自身） */
  const wholeMachineInheritVersionOptions = useMemo(
    () => versions.filter((v) => v.id !== editingVersion?.id),
    [versions, editingVersion?.id]
  );

  const openAddVersion = () => {
    setEditingVersion(null);
    versionForm.resetFields();
    setVersionModalOpen(true);
  };

  const openEditVersion = (version: ProjectVersion) => {
    setEditingVersion(version);
    if (isWholeMachineProject) {
      versionForm.setFieldsValue({
        version: version.version,
        inheritVersion: version.inheritVersion,
        owner: version.owner,
        customerCode: version.customerCode,
        planReleaseDate: version.planReleaseDate
          ? dayjs(version.planReleaseDate)
          : undefined,
        adaptedModels: version.adaptedModels,
      });
    } else {
      versionForm.setFieldsValue({
        version: version.version,
        owner: version.owner,
        planReleaseDate: version.planReleaseDate
          ? dayjs(version.planReleaseDate)
          : undefined,
        inheritVersion: version.inheritVersion,
      });
    }
    setVersionModalOpen(true);
  };

  const checkWholeMachineVersionDuplicate = (
    version: string,
    adaptedModels: string[],
    excludeId?: string
  ) => {
    return versions.some((v) => {
      if (v.id === excludeId) return false;
      if (v.version !== version) return false;
      const otherModels = v.adaptedModels ?? [];
      return adaptedModels.some((m) => otherModels.includes(m));
    });
  };

  const submitVersion = () => {
    versionForm.validateFields().then((values) => {
      if (isWholeMachineProject) {
        const {
          version,
          owner,
          planReleaseDate,
          inheritVersion,
          customerCode,
          adaptedModels,
        } = values as {
          version: string;
          owner: string;
          planReleaseDate: Dayjs;
          inheritVersion?: string;
          customerCode?: string;
          adaptedModels: string[];
        };

        if (
          checkWholeMachineVersionDuplicate(
            version,
            adaptedModels,
            editingVersion?.id
          )
        ) {
          message.error('相同机型下版本号不能相同');
          return;
        }

        const formattedPlanReleaseDate = dayjs(planReleaseDate).format(
          'YYYY-MM-DD HH:mm'
        );

        if (editingVersion) {
          setVersions((prev) =>
            prev.map((v) =>
              v.id === editingVersion.id
                ? {
                    ...v,
                    owner,
                    planReleaseDate: formattedPlanReleaseDate,
                    inheritVersion,
                    customerCode: customerCode?.trim() || undefined,
                    adaptedModels,
                  }
                : v
            )
          );
          message.success('保存成功');
        } else {
          const newVersion: ProjectVersion = {
            id: String(Date.now()),
            projectId: id || '',
            version,
            owner,
            planReleaseDate: formattedPlanReleaseDate,
            inheritVersion,
            customerCode: customerCode?.trim() || undefined,
            adaptedModels,
            status: '开发中',
            caseCount: 0,
            coverage: 0,
            successRate: 0,
            createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          };
          setVersions((prev) => [newVersion, ...prev]);
          message.success('创建成功');
        }
      } else {
        const { version, owner, planReleaseDate, inheritVersion } = values as {
          version: string;
          owner: string;
          planReleaseDate: Dayjs;
          inheritVersion?: string;
        };
        const formattedPlanReleaseDate = dayjs(planReleaseDate).format('YYYY-MM-DD');

        const dup = versions.some(
          (v) => v.version === version && v.id !== editingVersion?.id
        );
        if (dup) {
          message.error('版本号已存在');
          return;
        }

        if (editingVersion) {
          setVersions((prev) =>
            prev.map((v) =>
              v.id === editingVersion.id
                ? {
                    ...v,
                    owner,
                    planReleaseDate: formattedPlanReleaseDate,
                    inheritVersion,
                  }
                : v
            )
          );
          message.success('保存成功');
        } else {
          const newVersion: ProjectVersion = {
            id: String(Date.now()),
            projectId: id || '',
            version,
            owner,
            planReleaseDate: formattedPlanReleaseDate,
            inheritVersion,
            status: '未发布',
            caseCount: 0,
            coverage: 0,
            successRate: 0,
            createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          };
          setVersions((prev) => [newVersion, ...prev]);
          message.success('创建成功');
        }
      }
      setVersionModalOpen(false);
    });
  };

  const confirmDeleteVersion = (version: ProjectVersion) => {
    Modal.confirm({
      title: '此操作不可恢复，是否继续？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setVersions((prev) => prev.filter((v) => v.id !== version.id));
        message.success('已删除');
      },
    });
  };

  const handleVersionAction = (version: ProjectVersion) => {
    const action = getVersionActionText(version.status, isWholeMachineProject);
    if (!action) return;

    Modal.confirm({
      title: `确认${action}版本 ${version.version}？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setVersions((prev) =>
          prev.map((v) => {
            if (v.id !== version.id) return v;
            if (isWholeMachineProject) {
              let newStatus = v.status as WholeMachineVersionStatus;
              if (v.status === '开发中' || v.status === '已延期') {
                newStatus = '已发布';
                return {
                  ...v,
                  status: newStatus,
                  actualReleaseDate: new Date()
                    .toISOString()
                    .slice(0, 16)
                    .replace('T', ' '),
                };
              }
              if (v.status === '已发布') {
                return { ...v, status: '开发中', actualReleaseDate: null };
              }
              return v;
            }
            let newStatus = v.status;
            if (v.status === '未发布') newStatus = '已发布';
            else if (v.status === '已发布') newStatus = '已召回';
            else if (v.status === '已召回') newStatus = '已发布';
            return { ...v, status: newStatus };
          })
        );
        message.success(`${action}成功`);
      },
    });
  };

  const handleVersionClick = (version: ProjectVersion) => {
    const path = isWholeMachineProject
      ? deviceVersionDevPath(id!, version.id, 'cases')
      : versionDevPath(id!, version.id, 'cases');
    const q = new URLSearchParams({
      pn: project?.name ?? '',
      vn: version.version,
    });
    window.open(`${path}?${q.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleVersionDetail = (version: ProjectVersion) => {
    if (!id) return;
    navigate(versionDetailPath(id, version.id));
  };

  const renderVersionLink = (version: string, record: ProjectVersion) => (
    <Button
      type="link"
      style={{ padding: 0, fontWeight: 500 }}
      onClick={() => handleVersionClick(record)}
    >
      {version}
    </Button>
  );

  const renderActionColumn = (record: ProjectVersion) => (
    <Space size="small">
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        onClick={() => handleVersionDetail(record)}
      >
        详情
      </Button>
      <Button
        type="link"
        size="small"
        onClick={() => handleVersionAction(record)}
      >
        {getVersionActionText(record.status, isWholeMachineProject)}
      </Button>
      <Button
        type="link"
        size="small"
        icon={<EditOutlined />}
        onClick={() => openEditVersion(record)}
      >
        编辑
      </Button>
      <Button
        type="link"
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={() => confirmDeleteVersion(record)}
      >
        删除
      </Button>
    </Space>
  );

  const platformVersionColumns: ColumnsType<ProjectVersion> = [
    {
      title: '版本号',
      dataIndex: 'version',
      width: 120,
      render: (version, record) => renderVersionLink(version, record),
    },
    { title: '用例总数', dataIndex: 'caseCount', width: 100, align: 'center' },
    {
      title: '用例覆盖率',
      dataIndex: 'coverage',
      width: 100,
      align: 'center',
      render: (coverage) => <span>{coverage}%</span>,
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      width: 100,
      align: 'center',
      render: (successRate) => <span>{successRate}%</span>,
    },
    { title: '负责人', dataIndex: 'owner', width: 120 },
    {
      title: '版本状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => (
        <Tag
          color={
            platformVersionStatusMap[
              status as keyof typeof platformVersionStatusMap
            ]?.color || 'default'
          }
        >
          {status}
        </Tag>
      ),
    },
    { title: '发布日期', dataIndex: 'planReleaseDate', width: 120 },
    { title: '创建时间', dataIndex: 'createdAt', width: 150 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => renderActionColumn(record),
    },
  ];

  const wholeMachineVersionColumns: ColumnsType<ProjectVersion> = [
    {
      title: '版本号',
      dataIndex: 'version',
      width: 140,
      render: (version, record) => renderVersionLink(version, record),
    },
    { title: '用例总数', dataIndex: 'caseCount', width: 100, align: 'center' },
    {
      title: '覆盖率',
      dataIndex: 'coverage',
      width: 90,
      align: 'center',
      render: (coverage) => <span>{coverage}%</span>,
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      width: 90,
      align: 'center',
      render: (successRate) => <span>{successRate}%</span>,
    },
    {
      title: '适配机型',
      dataIndex: 'adaptedModels',
      width: 180,
      render: (models: string[] | undefined) =>
        models?.length ? (
          <Space size={[0, 4]} wrap>
            {models.map((m) => (
              <Tag key={m}>{m}</Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 150 },
    {
      title: '发布时间',
      dataIndex: 'actualReleaseDate',
      width: 150,
      render: (_, record) =>
        record.status === '已发布' && record.actualReleaseDate
          ? record.actualReleaseDate
          : '-',
    },
    {
      title: '版本状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => (
        <Tag
          color={
            wholeMachineVersionStatusMap[
              status as WholeMachineVersionStatus
            ]?.color || 'default'
          }
        >
          {status}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => renderActionColumn(record),
    },
  ];

  const versionColumns = isWholeMachineProject
    ? wholeMachineVersionColumns
    : platformVersionColumns;

  if (!project) {
    return (
      <div>
        <Card>
          <Empty description="项目不存在或已被删除" />
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/automation/projects')}>
              返回项目管理
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const ProjectInfoTab = () => (
    <Card>
      <Descriptions title="基本信息" bordered column={2}>
        <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
        <Descriptions.Item label="自动化类型">
          <Tag
            color={
              project.autoType === '接口自动化'
                ? 'blue'
                : project.autoType === 'UI自动化'
                  ? 'purple'
                  : project.autoType === '设备自动化'
                    ? 'cyan'
                    : 'orange'
            }
          >
            {project.autoType}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="所属团队">{project.team}</Descriptions.Item>
        <Descriptions.Item label="项目类型">{project.projectType}</Descriptions.Item>
        <Descriptions.Item label="所在区域">{project.region || '-'}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{project.createdAt}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{project.updatedAt}</Descriptions.Item>
      </Descriptions>
    </Card>
  );

  const ProjectVersionTab = () => (
    <>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddVersion}>
            添加项目版本
          </Button>
          <Space>
            <Input
              allowClear
              placeholder={
                isWholeMachineProject
                  ? '搜索版本号、负责人或机型'
                  : '搜索版本号或负责人'
              }
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => setVersionSearch(searchInput)}
              onClear={() => {
                setSearchInput('');
                setVersionSearch('');
              }}
              style={{ width: 240 }}
            />
            <Button onClick={() => setVersionSearch(searchInput)}>搜索</Button>
          </Space>
        </div>
      </Card>
      <Table<ProjectVersion>
        rowKey="id"
        columns={versionColumns}
        dataSource={filteredVersions}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: (
            <Empty description="暂无版本" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button type="primary" onClick={openAddVersion}>
                添加版本
              </Button>
            </Empty>
          ),
        }}
      />
    </>
  );

  const platformVersionForm = (
    <>
      <Form.Item
        name="version"
        label="版本号"
        rules={[
          { required: true, message: '请输入版本号' },
          { pattern: /^v\d+\.\d+\.\d+$/, message: '版本号格式如 v1.2.0' },
        ]}
      >
        <Input placeholder="示例：v1.2.0" disabled={Boolean(editingVersion)} />
      </Form.Item>

      <Form.Item name="inheritVersion" label="继承版本">
        <Select placeholder="请选择（可选）" allowClear disabled={Boolean(editingVersion)}>
          {versions.map((v) => (
            <Option key={v.id} value={v.version}>
              {v.version}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="owner"
        label="负责人"
        rules={[{ required: true, message: '请选择负责人' }]}
      >
        <Select placeholder="请选择" showSearch optionFilterProp="children">
          {projectMembers.map((u) => (
            <Option key={u.id} value={u.name}>
              {u.name}（{u.employeeId}）
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="planReleaseDate"
        label="计划发布日期"
        rules={[{ required: true, message: '请选择计划发布日期' }]}
      >
        <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
      </Form.Item>
    </>
  );

  const wholeMachineVersionForm = (
    <>
      <Form.Item
        name="version"
        label="版本号"
        rules={[
          { required: true, message: '请输入版本号' },
          { validator: validateWholeMachineVersion },
        ]}
        extra={
          <Text type="secondary">
            格式 V+大版本+火车版本+次版本+扩展；仅含字母、数字、中划线、下划线、点号，最多20字节
          </Text>
        }
      >
        <Input placeholder="示例：V10101-alpha" disabled={Boolean(editingVersion)} />
      </Form.Item>

      <Form.Item name="inheritVersion" label="继承版本">
        <Select
          placeholder="请选择（可选，默认不继承）"
          allowClear
          disabled={Boolean(editingVersion)}
        >
          {wholeMachineInheritVersionOptions.map((v) => (
            <Option key={v.id} value={v.version}>
              {v.version}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="owner"
        label="负责人"
        rules={[{ required: true, message: '请选择负责人' }]}
      >
        <Select placeholder="请选择" showSearch optionFilterProp="children">
          {projectMembers.map((u) => (
            <Option key={u.id} value={u.name}>
              {u.name}（{u.employeeId}）
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="customerCode" label="客户编码">
        <Input placeholder="请输入客户编码（可选）" maxLength={50} />
      </Form.Item>

      <Form.Item
        name="planReleaseDate"
        label="版本计划"
        rules={[{ required: true, message: '请选择版本计划时间' }]}
      >
        <DatePicker
          showTime
          format="YYYY-MM-DD HH:mm"
          style={{ width: '100%' }}
          placeholder="请选择日期时间"
          disabledDate={(current) =>
            Boolean(current && current < dayjs().startOf('day'))
          }
          disabledTime={(current) => {
            if (!current || !current.isSame(dayjs(), 'day')) {
              return {};
            }
            const now = dayjs();
            return {
              disabledHours: () =>
                Array.from({ length: now.hour() }, (_, i) => i),
              disabledMinutes: (selectedHour: number) => {
                if (selectedHour !== now.hour()) return [];
                return Array.from({ length: now.minute() }, (_, i) => i);
              },
            };
          }}
        />
      </Form.Item>

      <Form.Item
        name="adaptedModels"
        label="适配机型"
        rules={[{ required: true, message: '请选择适配机型' }]}
      >
        <Select
          mode="multiple"
          placeholder="请选择适配机型"
          optionFilterProp="children"
        >
          {mockDeviceModels.map((d) => (
            <Option key={d.id} value={d.name}>
              {d.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </>
  );

  return (
    <div style={{ height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/automation/projects')}>
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {project.name}
        </Title>
      </div>

      <Tabs
        defaultActiveKey="versions"
        items={[
          { key: 'versions', label: '项目版本', children: <ProjectVersionTab /> },
          { key: 'info', label: '项目信息', children: <ProjectInfoTab /> },
        ]}
      />

      <FormModal
        title={editingVersion ? '编辑版本' : '添加版本'}
        open={versionModalOpen}
        onOk={submitVersion}
        onCancel={() => setVersionModalOpen(false)}
        width={isWholeMachineProject ? 560 : 520}
      >
        <Form form={versionForm} layout="vertical" style={{ marginTop: 16 }}>
          {isWholeMachineProject ? wholeMachineVersionForm : platformVersionForm}
        </Form>
      </FormModal>
    </div>
  );
}
