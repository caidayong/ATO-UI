/**
 * @page 基础数据
 * @version V1.0.1
 * @base ATO_V1.0.0-页面需求与交互规格.md 第 4.1 节
 * @changes
 *   - V1.0.0: 团队管理（左右分栏）+ 用户管理（单表）；Mock 数据与弹窗交互
 *   - V1.0.1: 优化团队列表宽度（20%/80%）、操作按钮悬停显示、成员列表新增用户角色和邮箱字段、
 *             删除团队提示优化（有成员时提示"删除团队请先移除团队下的项目数据"）、
 *             删除成员提示优化（显示成员姓名）
 */

import { useState, useMemo } from 'react';
import {
  Tabs,
  Card,
  Button,
  Input,
  Table,
  Modal,
  Form,
  message,
  Typography,
  Empty,
  List,
  Row,
  Col,
  Select,
  Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { Team, User } from '@/types';
import { mockTeams, mockUsers, mockTeamMemberIds } from '@/mocks/data';

const { Text } = Typography;
const { Option } = Select;
const DELETE_CONFIRM = '此操作不可恢复，是否继续？';

function cloneTeams(t: Team[]): Team[] {
  return t.map((x) => ({ ...x }));
}

function cloneUsers(u: User[]): User[] {
  return u.map((x) => ({ ...x }));
}

function cloneMemberMap(m: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, [...v]]));
}

export function BasicData() {
  const [teams, setTeams] = useState<Team[]>(() => cloneTeams(mockTeams));
  const [teamMemberIds, setTeamMemberIds] = useState<Record<string, string[]>>(
    () => cloneMemberMap(mockTeamMemberIds)
  );
  const [users, setUsers] = useState<User[]>(() => cloneUsers(mockUsers));

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>('1');
  const [teamSearch, setTeamSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm] = Form.useForm();

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberForm] = Form.useForm();

  const [userEditOpen, setUserEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm] = Form.useForm();

  const [syncLoading, setSyncLoading] = useState(false);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);

  const memberCount = (teamId: string) => teamMemberIds[teamId]?.length ?? 0;

  const filteredTeams = useMemo(() => {
    const k = teamSearch.trim().toLowerCase();
    if (!k) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(k));
  }, [teams, teamSearch]);

  const selectedMembers = useMemo(() => {
    if (!selectedTeamId) return [];
    const ids = teamMemberIds[selectedTeamId] ?? [];
    const ms = ids
      .map((id) => users.find((u) => u.id === id))
      .filter(Boolean) as User[];
    const k = memberSearch.trim().toLowerCase();
    if (!k) return ms;
    return ms.filter(
      (u) =>
        u.name.toLowerCase().includes(k) || u.employeeId.toLowerCase().includes(k)
    );
  }, [selectedTeamId, teamMemberIds, users, memberSearch]);

  const filteredUsersForTable = useMemo(() => {
    const k = userSearch.trim().toLowerCase();
    if (!k) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(k) ||
        u.employeeId.toLowerCase().includes(k) ||
        u.email.toLowerCase().includes(k)
    );
  }, [users, userSearch]);

  const availableUserIdsForTeam = useMemo(() => {
    if (!selectedTeamId) return [];
    const inTeam = new Set(teamMemberIds[selectedTeamId] ?? []);
    return users.filter((u) => !inTeam.has(u.id)).map((u) => u.id);
  }, [selectedTeamId, teamMemberIds, users]);

  const openAddTeam = () => {
    setEditingTeam(null);
    teamForm.resetFields();
    setTeamModalOpen(true);
  };

  const openEditTeam = (team: Team) => {
    setEditingTeam(team);
    teamForm.setFieldsValue({ name: team.name });
    setTeamModalOpen(true);
  };

  const submitTeam = () => {
    teamForm.validateFields().then(({ name }: { name: string }) => {
      const trimmed = name.trim();
      const dup = teams.some(
        (t) => t.name === trimmed && t.id !== editingTeam?.id
      );
      if (dup) {
        message.error('团队名称已存在');
        return;
      }
      if (editingTeam) {
        setTeams((prev) =>
          prev.map((t) => (t.id === editingTeam.id ? { ...t, name: trimmed } : t))
        );
        message.success('保存成功');
      } else {
        const id = String(Date.now());
        setTeams((prev) => [...prev, { id, name: trimmed, memberCount: 0 }]);
        setTeamMemberIds((prev) => ({ ...prev, [id]: [] }));
        setSelectedTeamId(id);
        message.success('创建成功');
      }
      setTeamModalOpen(false);
    });
  };

  const confirmDeleteTeam = (team: Team) => {
    const n = memberCount(team.id);
    if (n > 0) {
      Modal.warning({
        title: '提示',
        content: '删除团队请先移除团队下的项目数据！',
        okText: '确定',
      });
      return;
    }
    Modal.confirm({
      title: DELETE_CONFIRM,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setTeams((prev) => prev.filter((t) => t.id !== team.id));
        setTeamMemberIds((prev) => {
          const next = { ...prev };
          delete next[team.id];
          return next;
        });
        if (selectedTeamId === team.id) {
          setSelectedTeamId(null);
        }
        message.success('已删除');
      },
    });
  };

  const openAddMembers = () => {
    if (!selectedTeamId) {
      message.info('请先选择团队');
      return;
    }
    addMemberForm.resetFields();
    setAddMemberOpen(true);
  };

  const submitAddMembers = () => {
    addMemberForm.validateFields().then(({ userIds }: { userIds: string[] }) => {
      if (!selectedTeamId || !userIds?.length) {
        setAddMemberOpen(false);
        return;
      }
      setTeamMemberIds((prev) => {
        const cur = new Set(prev[selectedTeamId] ?? []);
        userIds.forEach((id) => cur.add(id));
        return { ...prev, [selectedTeamId]: [...cur] };
      });
      message.success('添加成功');
      setAddMemberOpen(false);
    });
  };

  const confirmRemoveMember = (user: User) => {
    if (!selectedTeamId) return;
    Modal.confirm({
      title: `确认删除${user.name}成员？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setTeamMemberIds((prev) => ({
          ...prev,
          [selectedTeamId]: (prev[selectedTeamId] ?? []).filter((id) => id !== user.id),
        }));
        message.success('已移除');
      },
    });
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    userForm.setFieldsValue({
      name: user.name,
      role: user.role,
      email: user.email,
    });
    setUserEditOpen(true);
  };

  const submitUserEdit = () => {
    userForm.validateFields().then((values: { name: string; role: string; email: string }) => {
      if (!editingUser) return;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: values.name, role: values.role, email: values.email }
            : u
        )
      );
      message.success('保存成功');
      setUserEditOpen(false);
    });
  };

  const handleSyncUsers = () => {
    setSyncLoading(true);
    window.setTimeout(() => {
      setSyncLoading(false);
      message.success('同步完成');
    }, 1200);
  };

  const memberColumns: ColumnsType<User> = [
    { title: '工号', dataIndex: 'employeeId', width: 120 },
    { title: '姓名', dataIndex: 'name', width: 120 },
    { title: '用户角色', dataIndex: 'role', width: 140 },
    { title: '邮箱', dataIndex: 'email', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" danger size="small" onClick={() => confirmRemoveMember(record)}>
          删除
        </Button>
      ),
    },
  ];

  const userColumns: ColumnsType<User> = [
    { title: '工号', dataIndex: 'employeeId', width: 120 },
    { title: '姓名', dataIndex: 'name', width: 120 },
    { title: '角色', dataIndex: 'role', width: 140 },
    { title: '邮箱', dataIndex: 'email', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditUser(record)}>
          编辑
        </Button>
      ),
    },
  ];

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <div style={{ height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' }}>
      <Tabs
        defaultActiveKey="teams"
        items={[
          {
            key: 'teams',
            label: '团队管理',
            children: (
              <Row gutter={16}>
                <Col xs={24} md={5}>
                  <Card
                    title="团队列表"
                    extra={
                      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddTeam}>
                        添加团队
                      </Button>
                    }
                  >
                    <Input
                      allowClear
                      placeholder="搜索团队名称"
                      prefix={<SearchOutlined />}
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      style={{ marginBottom: 12 }}
                    />
                    {filteredTeams.length === 0 ? (
                      <Empty description="暂无团队" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openAddTeam}>
                          添加团队
                        </Button>
                      </Empty>
                    ) : (
                      <List
                        style={{ maxHeight: 560, overflow: 'auto' }}
                        dataSource={filteredTeams}
                        renderItem={(team) => (
                          <List.Item
                            style={{
                              cursor: 'pointer',
                              padding: '12px 8px',
                              borderRadius: 6,
                              marginBottom: 4,
                              background:
                                selectedTeamId === team.id ? '#e6f4ff' : undefined,
                              border:
                                selectedTeamId === team.id ? '1px solid #91caff' : '1px solid transparent',
                              transition: 'background 0.2s',
                            }}
                            onClick={() => setSelectedTeamId(team.id)}
                            onMouseEnter={() => setHoveredTeamId(team.id)}
                            onMouseLeave={() => setHoveredTeamId(null)}
                            actions={
                              hoveredTeamId === team.id
                                ? [
                                    <Space key="actions" size={4}>
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditTeam(team);
                                        }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          confirmDeleteTeam(team);
                                        }}
                                      />
                                    </Space>,
                                  ]
                                : []
                            }
                          >
                            <List.Item.Meta
                              avatar={<TeamOutlined style={{ fontSize: 20, color: '#1677ff' }} />}
                              title={team.name}
                              description={`${memberCount(team.id)} 人`}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                </Col>
                <Col xs={24} md={19}>
                  <Card
                    title={
                      selectedTeam ? (
                        <span>
                          成员列表 — <Text strong>{selectedTeam.name}</Text>
                        </span>
                      ) : (
                        '成员列表'
                      )
                    }
                    extra={
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        disabled={!selectedTeamId}
                        onClick={openAddMembers}
                      >
                        添加成员
                      </Button>
                    }
                  >
                    {!selectedTeamId ? (
                      <Empty description="请先选择左侧团队" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <>
                        <Input
                          allowClear
                          placeholder="搜索工号或姓名"
                          prefix={<SearchOutlined />}
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          style={{ marginBottom: 12 }}
                        />
                        <Table<User>
                          rowKey="id"
                          size="small"
                          columns={memberColumns}
                          dataSource={selectedMembers}
                          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
                          locale={{
                            emptyText: (
                              <Empty
                                description="暂无成员"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                              >
                                <Button type="primary" size="small" onClick={openAddMembers}>
                                  添加成员
                                </Button>
                              </Empty>
                            ),
                          }}
                        />
                      </>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'users',
            label: '用户管理',
            children: (
              <Card>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    loading={syncLoading}
                    onClick={handleSyncUsers}
                  >
                    同步
                  </Button>
                  <Input
                    allowClear
                    placeholder="搜索工号、姓名或邮箱"
                    prefix={<SearchOutlined />}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{ width: 280 }}
                  />
                </div>
                <Table<User>
                  rowKey="id"
                  columns={userColumns}
                  dataSource={filteredUsersForTable}
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={editingTeam ? '编辑团队' : '添加团队'}
        open={teamModalOpen}
        onOk={submitTeam}
        onCancel={() => setTeamModalOpen(false)}
        destroyOnClose
      >
        <Form form={teamForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="name"
            label="团队名称"
            rules={[
              { required: true, message: '请输入团队名称' },
              { max: 50, message: '最多 50 个字符' },
            ]}
          >
            <Input placeholder="请输入团队名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加成员"
        open={addMemberOpen}
        onOk={submitAddMembers}
        onCancel={() => setAddMemberOpen(false)}
        width={520}
        destroyOnClose
      >
        <Form form={addMemberForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="userIds"
            label="选择用户"
            rules={[{ required: true, message: '请至少选择一名用户' }]}
          >
            <Select
              mode="multiple"
              placeholder="支持搜索、多选"
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {availableUserIdsForTeam.map((uid) => {
                const u = users.find((x) => x.id === uid);
                if (!u) return null;
                return (
                  <Option key={uid} value={uid}>
                    {u.name}（{u.employeeId}）
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
          {availableUserIdsForTeam.length === 0 && (
            <Text type="secondary">当前团队已包含全部用户，或用户目录为空。</Text>
          )}
        </Form>
      </Modal>

      <Modal
        title="编辑用户"
        open={userEditOpen}
        onOk={submitUserEdit}
        onCancel={() => setUserEditOpen(false)}
        destroyOnClose
      >
        <Form form={userForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请输入角色' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
