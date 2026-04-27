/**
 * @page 项目管理
 * @version V1.0.0
 * @base ATO_V1.0.0-页面需求与交互规格.md 第 4.2 节
 * @changes
 *   - V1.0.0: 初始实现
 *   - UI 验收：无页面大标题；卡片仅自动化类型 Tag；项目状态（正常/绿）；右上角「…」悬停菜单；删除 Modal.confirm
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Form,
  message,
  Typography,
  Tag,
  Space,
  Empty,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { projectDetailPath } from '@/constants/routes';
import { mockProjects, mockTeams } from '@/mocks/data';
import type { Project } from '@/types';

const { Title } = Typography;
const { Option } = Select;
const STATUS_OK_COLOR = '#52c41a';

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  // 筛选项目
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchTeam = selectedTeam === 'ALL' || project.team === selectedTeam;
      const matchKeyword =
        !searchKeyword ||
        project.name.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchTeam && matchKeyword;
    });
  }, [projects, selectedTeam, searchKeyword]);

  // 打开新建弹窗
  const handleAdd = () => {
    setEditingProject(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProject(project);
    form.setFieldsValue({
      ...project,
      region: project.region || undefined,
    });
    setIsModalOpen(true);
  };

  // 删除项目
  const handleDelete = (projectId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    message.success('删除成功');
  };

  // 提交表单
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingProject) {
        // 编辑
        setProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id
              ? {
                  ...p,
                  ...values,
                  updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
                }
              : p
          )
        );
        message.success('编辑成功');
      } else {
        // 新建
        const newProject: Project = {
          id: String(Date.now()),
          ...values,
          createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };
        setProjects((prev) => [newProject, ...prev]);
        message.success('创建成功');
      }
      setIsModalOpen(false);
    });
  };

  // 获取自动化类型标签颜色
  const getAutoTypeColor = (type: string) => {
    return type === '接口自动化' ? 'blue' : 'purple';
  };

  return (
    <div style={{ height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' }}>
      {/* 筛选操作区 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Select
              value={selectedTeam}
              onChange={setSelectedTeam}
              style={{ width: 160 }}
              placeholder="选择团队"
            >
              <Option value="ALL">全部团队</Option>
              {mockTeams.map((team) => (
                <Option key={team.id} value={team.name}>
                  {team.name}
                </Option>
              ))}
            </Select>
            <Input
              placeholder="搜索项目名称"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={() => {}}
              style={{ width: 240 }}
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加项目
          </Button>
        </div>
      </Card>

      {/* 项目列表 */}
      {filteredProjects.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无项目"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              去创建
            </Button>
          </Empty>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 24,
          }}
        >
          {filteredProjects.map((project) => {
            const cardMenuItems: MenuProps['items'] = [
              {
                key: 'edit',
                label: '编辑',
                icon: <EditOutlined />,
                onClick: () => handleEdit(project),
              },
              {
                key: 'delete',
                label: '删除',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => {
                  Modal.confirm({
                    title: '此操作不可恢复，是否继续？',
                    okText: '确定',
                    cancelText: '取消',
                    onOk: () => handleDelete(project.id),
                  });
                },
              },
            ];

            return (
              <Card
                key={project.id}
                hoverable
                styles={{ body: { position: 'relative' } }}
              >
                <Dropdown menu={{ items: cardMenuItems }} trigger={['hover']} placement="bottomRight">
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined style={{ fontSize: 18 }} />}
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                    onClick={(e) => e.preventDefault()}
                  />
                </Dropdown>
                <Link
                  to={projectDetailPath(project.id)}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', paddingRight: 36 }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
                      {project.name}
                    </Title>
                    <Space size={[0, 8]} wrap>
                      <Tag color={getAutoTypeColor(project.autoType)}>
                        {project.autoType}
                      </Tag>
                    </Space>
                  </div>

                  <div style={{ color: '#666', fontSize: 14 }}>
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircleOutlined style={{ color: STATUS_OK_COLOR }} />
                      <span>
                        项目状态：
                        <span style={{ color: STATUS_OK_COLOR }}>正常</span>
                      </span>
                    </div>
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TeamOutlined />
                      <span>所属团队：{project.team}</span>
                    </div>
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ClockCircleOutlined />
                      <span>创建时间：{project.createdAt}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ReloadOutlined />
                      <span>更新时间：{project.updatedAt}</span>
                    </div>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="autoType"
            label="自动化类型"
            rules={[{ required: true, message: '请选择自动化类型' }]}
          >
            <Select placeholder="请选择">
              <Option value="接口自动化">接口自动化</Option>
              <Option value="UI自动化">UI自动化</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="team"
            label="所属团队"
            rules={[{ required: true, message: '请选择所属团队' }]}
          >
            <Select placeholder="请选择" showSearch>
              {mockTeams.map((team) => (
                <Option key={team.id} value={team.name}>
                  {team.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { max: 50, message: '项目名称最多50个字符' },
            ]}
            extra="同团队内项目名称需唯一"
          >
            <Input placeholder="示例：ATO-支付回归" />
          </Form.Item>

          <Form.Item
            name="projectType"
            label="项目类型"
            rules={[{ required: true, message: '请选择项目类型' }]}
          >
            <Select placeholder="请选择">
              <Option value="平台项目">平台项目</Option>
              <Option value="整机项目">整机项目</Option>
            </Select>
          </Form.Item>

          <Form.Item name="region" label="项目所在区域">
            <Select placeholder="请选择" allowClear>
              <Option value="深圳">深圳</Option>
              <Option value="重庆">重庆</Option>
              <Option value="成都">成都</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
