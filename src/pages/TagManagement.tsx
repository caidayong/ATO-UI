/**
 * @page 标签/分组
 * @version V1.0.5
 * @base docs/prd/ATO_V1.0.0-页面需求与交互规格.md §4.9；docs/spec/04-页面契约.md §页面 9
 * @changes
 *   - V1.0.0: 初始实现标签管理页；支持标签新增、搜索、编辑（颜色/说明）与删除（Mock）
 *   - V1.0.1: 工具栏搜索框靠右对齐；新增/编辑弹窗「标签颜色」改为 ColorPicker 点选
 *   - V1.0.2: 验收后 `@base` 对齐 PRD §4.9 / `04-页面契约` §页面 9
 *   - V1.0.3: 内容区增加「标签 / 分组」Tab；分组页布局与标签一致（添加、搜索、表格、编辑/删除 Mock）
 *   - V1.0.4: 分组 Tab 初始数据改为引用 `mockTagManagementGroups`（与测试运行并行配置「按分组」同源）
 *   - V1.0.5: 标签与分组表格增加「创建人」列；Mock 分组记录含 `createdBy`，新增行写入「当前用户（Mock）」
 */
import { useMemo, useState } from 'react';
import { Button, Card, ColorPicker, Form, Input, Modal, Popconfirm, Space, Table, Tabs, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AggregationColor } from 'antd/es/color-picker/color';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { mockTagManagementGroups, type TagManagementGroupRecord } from '@/mocks/data';

type TagRecord = {
  id: string;
  name: string;
  color: string;
  description: string;
  createdAt: string;
  createdBy: string;
};

type TagFormValue = {
  name: string;
  color: string;
  description?: string;
};

type GroupRecord = TagManagementGroupRecord;

type GroupFormValue = {
  name: string;
  description?: string;
};

const TOOLBAR_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
  gap: 16,
};

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function formatNow(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function colorToFormString(color: AggregationColor | string | null | undefined): string {
  if (color == null) return '';
  if (typeof color === 'string') return color;
  return color.toHexString();
}

function TagsTabPanel() {
  const [rows, setRows] = useState<TagRecord[]>([
    {
      id: 'tag-1',
      name: 'smoke',
      color: '#1677FF',
      description: '冒烟用例',
      createdAt: '2026-03-30 09:30',
      createdBy: 'A12345（张三）',
    },
    {
      id: 'tag-2',
      name: 'P0',
      color: '#FF4D4F',
      description: '高优先级',
      createdAt: '2026-03-30 09:45',
      createdBy: 'A12346（李四）',
    },
    {
      id: 'tag-3',
      name: 'UI',
      color: '#722ED1',
      description: 'UI 自动化相关',
      createdAt: '2026-03-30 10:10',
      createdBy: 'A12345（张三）',
    },
  ]);
  const [keyword, setKeyword] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TagRecord | null>(null);
  const [addForm] = Form.useForm<TagFormValue>();
  const [editForm] = Form.useForm<Pick<TagFormValue, 'color' | 'description'>>();

  const filteredRows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter(
      (item) =>
        item.name.toLowerCase().includes(kw) ||
        item.color.toLowerCase().includes(kw) ||
        item.description.toLowerCase().includes(kw) ||
        item.createdBy.toLowerCase().includes(kw)
    );
  }, [rows, keyword]);

  const openAddModal = () => {
    addForm.setFieldsValue({ name: '', color: '#1677FF', description: '' });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await addForm.validateFields();
    const name = values.name.trim();
    if (rows.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      message.warning('标签名称已存在');
      return;
    }
    const newRow: TagRecord = {
      id: makeId('tag'),
      name,
      color: colorToFormString(values.color as AggregationColor | string).trim(),
      description: values.description?.trim() || '',
      createdAt: formatNow(),
      createdBy: '当前用户（Mock）',
    };
    setRows((prev) => [newRow, ...prev]);
    setAddOpen(false);
    message.success('标签已添加');
  };

  const openEditModal = (row: TagRecord) => {
    setEditingRow(row);
    editForm.setFieldsValue({ color: row.color, description: row.description });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editingRow) return;
    const values = await editForm.validateFields();
    setRows((prev) =>
      prev.map((item) =>
        item.id === editingRow.id
          ? {
              ...item,
              color: colorToFormString(values.color as AggregationColor | string).trim(),
              description: values.description?.trim() || '',
            }
          : item
      )
    );
    setEditOpen(false);
    setEditingRow(null);
    message.success('标签已更新');
  };

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((item) => item.id !== id));
    message.success('标签已删除');
  };

  const columns: ColumnsType<TagRecord> = [
    { title: '标签名称', dataIndex: 'name', width: 220 },
    {
      title: '标签预览',
      dataIndex: 'color',
      width: 180,
      render: (color: string, row) => <Tag color={color || '#1677FF'}>{row.name}</Tag>,
    },
    { title: '标签说明', dataIndex: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    { title: '创建人', dataIndex: 'createdBy', width: 140, ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, row) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(row)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该标签？" onConfirm={() => deleteRow(row.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={TOOLBAR_ROW_STYLE}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          添加标签
        </Button>
        <Input.Search
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="请输入标签名称/颜色/说明/创建人"
          style={{ width: 320 }}
        />
      </div>

      <Table
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={filteredRows}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <Modal
        title="添加标签"
        open={addOpen}
        onOk={submitAdd}
        onCancel={() => setAddOpen(false)}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical">
          <Form.Item
            label="标签名称"
            name="name"
            rules={[
              { required: true, message: '请输入标签名称' },
              { max: 32, message: '长度不能超过 32' },
            ]}
          >
            <Input placeholder="例如：smoke" />
          </Form.Item>
          <Form.Item
            label="标签颜色"
            name="color"
            rules={[{ required: true, message: '请选择标签颜色' }]}
            getValueFromEvent={(color) => colorToFormString(color)}
          >
            <ColorPicker showText format="hex" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="标签说明" name="description" rules={[{ max: 120, message: '长度不能超过 120' }]}>
            <Input.TextArea rows={3} placeholder="可选，填写标签说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑标签"
        open={editOpen}
        onOk={submitEdit}
        onCancel={() => {
          setEditOpen(false);
          setEditingRow(null);
        }}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="标签名称">
            <Input value={editingRow?.name} disabled />
          </Form.Item>
          <Form.Item
            label="标签颜色"
            name="color"
            rules={[{ required: true, message: '请选择标签颜色' }]}
            getValueFromEvent={(color) => colorToFormString(color)}
          >
            <ColorPicker showText format="hex" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="标签说明" name="description" rules={[{ max: 120, message: '长度不能超过 120' }]}>
            <Input.TextArea rows={3} placeholder="可选，填写标签说明" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function GroupsTabPanel() {
  const [rows, setRows] = useState<GroupRecord[]>(() => mockTagManagementGroups.map((g) => ({ ...g })));
  const [keyword, setKeyword] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<GroupRecord | null>(null);
  const [addForm] = Form.useForm<GroupFormValue>();
  const [editForm] = Form.useForm<Pick<GroupFormValue, 'description'>>();

  const filteredRows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter(
      (item) =>
        item.name.toLowerCase().includes(kw) ||
        item.description.toLowerCase().includes(kw) ||
        item.createdBy.toLowerCase().includes(kw)
    );
  }, [rows, keyword]);

  const openAddModal = () => {
    addForm.setFieldsValue({ name: '', description: '' });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await addForm.validateFields();
    const name = values.name.trim();
    if (rows.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      message.warning('分组名称已存在');
      return;
    }
    const newRow: GroupRecord = {
      id: makeId('grp'),
      name,
      description: values.description?.trim() || '',
      createdAt: formatNow(),
      createdBy: '当前用户（Mock）',
    };
    setRows((prev) => [newRow, ...prev]);
    setAddOpen(false);
    message.success('分组已添加');
  };

  const openEditModal = (row: GroupRecord) => {
    setEditingRow(row);
    editForm.setFieldsValue({ description: row.description });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editingRow) return;
    const values = await editForm.validateFields();
    setRows((prev) =>
      prev.map((item) =>
        item.id === editingRow.id ? { ...item, description: values.description?.trim() || '' } : item
      )
    );
    setEditOpen(false);
    setEditingRow(null);
    message.success('分组已更新');
  };

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((item) => item.id !== id));
    message.success('分组已删除');
  };

  const columns: ColumnsType<GroupRecord> = [
    { title: '分组名称', dataIndex: 'name', width: 220 },
    { title: '分组说明', dataIndex: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    { title: '创建人', dataIndex: 'createdBy', width: 140, ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, row) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(row)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该分组？" onConfirm={() => deleteRow(row.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={TOOLBAR_ROW_STYLE}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          添加分组
        </Button>
        <Input.Search
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="请输入分组名称/说明/创建人"
          style={{ width: 320 }}
        />
      </div>

      <Table
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={filteredRows}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <Modal
        title="添加分组"
        open={addOpen}
        onOk={submitAdd}
        onCancel={() => setAddOpen(false)}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical">
          <Form.Item
            label="分组名称"
            name="name"
            rules={[
              { required: true, message: '请输入分组名称' },
              { max: 32, message: '长度不能超过 32' },
            ]}
          >
            <Input placeholder="例如：核心流程" />
          </Form.Item>
          <Form.Item label="分组说明" name="description" rules={[{ max: 120, message: '长度不能超过 120' }]}>
            <Input.TextArea rows={3} placeholder="可选，填写分组说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑分组"
        open={editOpen}
        onOk={submitEdit}
        onCancel={() => {
          setEditOpen(false);
          setEditingRow(null);
        }}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="分组名称">
            <Input value={editingRow?.name} disabled />
          </Form.Item>
          <Form.Item label="分组说明" name="description" rules={[{ max: 120, message: '长度不能超过 120' }]}>
            <Input.TextArea rows={3} placeholder="可选，填写分组说明" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function TagManagement() {
  return (
    <Card size="small" styles={{ body: { height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' } }}>
      <Tabs
        defaultActiveKey="tags"
        items={[
          { key: 'tags', label: '标签', children: <TagsTabPanel /> },
          { key: 'groups', label: '分组', children: <GroupsTabPanel /> },
        ]}
      />
    </Card>
  );
}
