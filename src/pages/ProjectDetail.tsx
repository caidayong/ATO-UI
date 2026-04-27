/**
 * @page 项目详情
 * @version V1.0.2
 * @base ATO_V1.0.0-页面需求与交互规格.md 第 4.3 节
 * @changes
 *   - V1.0.0: 初始实现，包含项目版本 Tab（列表/发布/召回/删除/添加版本）和项目信息 Tab
 *   - V1.0.1: 优化版本列表（用例覆盖率/成功率改为纯百分比显示）、搜索框改为回车/按钮触发搜索
 *   - V1.0.2: 点击版本号打开用例管理新窗口时附带 `pn`/`vn` query，供 VersionDevLayout 顶栏展示
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
import { mockProjects, mockVersions, mockUsers } from '@/mocks/data';
import { versionDetailPath } from '@/constants/routes';
import type { ProjectVersion } from '@/types';

const { Title } = Typography;
const { Option } = Select;

// 版本状态映射
const versionStatusMap = {
  '未发布': { color: 'default', action: '发布' },
  '已发布': { color: 'success', action: '召回' },
  '已召回': { color: 'warning', action: '发布' },
};

// 获取版本状态颜色
const getVersionStatusColor = (status: string) => {
  return versionStatusMap[status as keyof typeof versionStatusMap]?.color || 'default';
};

// 获取版本操作按钮文本
const getVersionAction = (status: string) => {
  return versionStatusMap[status as keyof typeof versionStatusMap]?.action || '';
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 项目数据（从 mock 中查找）
  const project = useMemo(() => {
    return mockProjects.find((p) => p.id === id);
  }, [id]);

  // 版本列表状态
  const [versions, setVersions] = useState<ProjectVersion[]>(() => {
    return mockVersions.filter((v) => v.projectId === id);
  });
  const [versionSearch, setVersionSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ProjectVersion | null>(null);
  const [versionForm] = Form.useForm();

  // 过滤版本列表
  const filteredVersions = useMemo(() => {
    const k = versionSearch.trim().toLowerCase();
    if (!k) return versions;
    return versions.filter(
      (v) =>
        v.version.toLowerCase().includes(k) ||
        v.owner.toLowerCase().includes(k)
    );
  }, [versions, versionSearch]);

  // 打开添加版本弹窗
  const openAddVersion = () => {
    setEditingVersion(null);
    versionForm.resetFields();
    setVersionModalOpen(true);
  };

  // 打开编辑版本弹窗
  const openEditVersion = (version: ProjectVersion) => {
    setEditingVersion(version);
    versionForm.setFieldsValue({
      version: version.version,
      owner: version.owner,
      planReleaseDate: version.planReleaseDate ? dayjs(version.planReleaseDate) : undefined,
      inheritVersion: version.inheritVersion,
    });
    setVersionModalOpen(true);
  };

  // 提交版本表单
  const submitVersion = () => {
    versionForm.validateFields().then((values) => {
      const { version, owner, planReleaseDate, inheritVersion } = values as {
        version: string;
        owner: string;
        planReleaseDate: Dayjs;
        inheritVersion?: string;
      };
      const formattedPlanReleaseDate = dayjs(planReleaseDate).format('YYYY-MM-DD');

      // 版本号唯一性校验
      const dup = versions.some(
        (v) => v.version === version && v.id !== editingVersion?.id
      );
      if (dup) {
        message.error('版本号已存在');
        return;
      }

      if (editingVersion) {
        // 编辑
        setVersions((prev) =>
          prev.map((v) =>
            v.id === editingVersion.id
              ? { ...v, version, owner, planReleaseDate: formattedPlanReleaseDate, inheritVersion }
              : v
          )
        );
        message.success('保存成功');
      } else {
        // 新建
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
      setVersionModalOpen(false);
    });
  };

  // 删除版本
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

  // 发布/召回版本
  const handleVersionAction = (version: ProjectVersion) => {
    const action = getVersionAction(version.status);
    Modal.confirm({
      title: `确认${action}版本 ${version.version}？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setVersions((prev) =>
          prev.map((v) => {
            if (v.id !== version.id) return v;
            // 状态流转
            let newStatus: ProjectVersion['status'] = v.status;
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

  // 点击版本号进入用例管理（新开窗口）
  const handleVersionClick = (version: ProjectVersion) => {
    const path = `/version-dev/${id}/${version.id}/cases`;
    const q = new URLSearchParams({
      pn: project?.name ?? '',
      vn: version.version,
    });
    window.open(`${path}?${q.toString()}`, '_blank', 'noopener,noreferrer');
  };

  // 点击详情进入版本详情页（主框架内）
  const handleVersionDetail = (version: ProjectVersion) => {
    if (!id) return;
    navigate(versionDetailPath(id, version.id));
  };

  // 版本列表表格列
  const versionColumns: ColumnsType<ProjectVersion> = [
    {
      title: '版本号',
      dataIndex: 'version',
      width: 120,
      render: (version, record) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 500 }}
          onClick={() => handleVersionClick(record)}
        >
          {version}
        </Button>
      ),
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
      render: (status) => <Tag color={getVersionStatusColor(status)}>{status}</Tag>,
    },
    { title: '发布日期', dataIndex: 'planReleaseDate', width: 120 },
    { title: '创建时间', dataIndex: 'createdAt', width: 150 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
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
            {getVersionAction(record.status)}
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
      ),
    },
  ];

  // 如果没有找到项目，显示空态
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

  // 项目信息 Tab 内容
  const ProjectInfoTab = () => (
    <Card>
      <Descriptions title="基本信息" bordered column={2}>
        <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
        <Descriptions.Item label="自动化类型">
          <Tag color={project.autoType === '接口自动化' ? 'blue' : 'purple'}>
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

  // 项目版本 Tab 内容
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
              placeholder="搜索版本号或负责人"
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
            <Button onClick={() => setVersionSearch(searchInput)}>
              搜索
            </Button>
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

  return (
    <div style={{ height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' }}>
      {/* 返回按钮 + 项目名称 */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/automation/projects')}>
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {project.name}
        </Title>
      </div>

      {/* Tab 切换 */}
      <Tabs defaultActiveKey="versions" items={[
        {
          key: 'versions',
          label: '项目版本',
          children: <ProjectVersionTab />,
        },
        {
          key: 'info',
          label: '项目信息',
          children: <ProjectInfoTab />,
        },
      ]} />

      {/* 添加/编辑版本弹窗 */}
      <Modal
        title={editingVersion ? '编辑版本' : '添加版本'}
        open={versionModalOpen}
        onOk={submitVersion}
        onCancel={() => setVersionModalOpen(false)}
        destroyOnClose
        width={520}
      >
        <Form form={versionForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="version"
            label="版本号"
            rules={[
              { required: true, message: '请输入版本号' },
              { pattern: /^v\d+\.\d+\.\d+$/, message: '版本号格式如 v1.2.0' },
            ]}
          >
            <Input
              placeholder="示例：v1.2.0"
              disabled={Boolean(editingVersion)}
            />
          </Form.Item>

          <Form.Item name="inheritVersion" label="继承版本">
            <Select
              placeholder="请选择（可选）"
              allowClear
              disabled={Boolean(editingVersion)}
            >
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
            <Select placeholder="请选择" showSearch>
              {mockUsers.map((u) => (
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
        </Form>
      </Modal>
    </div>
  );
}
