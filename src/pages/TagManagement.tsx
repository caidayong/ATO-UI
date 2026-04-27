/**
 * @page 标签管理
 * @version V1.0.2
 * @base docs/prd/ATO_V1.0.0-页面需求与交互规格.md §4.9；docs/spec/04-页面契约.md §页面 9
 * @changes
 *   - V1.0.0: 初始实现标签管理页；支持标签新增、搜索、编辑（颜色/说明）与删除（Mock）
 *   - V1.0.1: 工具栏搜索框靠右对齐；新增/编辑弹窗「标签颜色」改为 ColorPicker 点选
 *   - V1.0.2: 验收后 `@base` 对齐 PRD §4.9 / `04-页面契约` §页面 9
 */
import { useMemo, useState } from 'react';
import { Button, Card, ColorPicker, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AggregationColor } from 'antd/es/color-picker/color';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

type TagRecord = {
  id: string;
  name: string;
  color: string;
  description: string;
  createdAt: string;
};

type TagFormValue = {
  name: string;
  color: string;
  description?: string;
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

export function TagManagement() {
  const [rows, setRows] = useState<TagRecord[]>([
    { id: 'tag-1', name: 'smoke', color: '#1677FF', description: '冒烟用例', createdAt: '2026-03-30 09:30' },
    { id: 'tag-2', name: 'P0', color: '#FF4D4F', description: '高优先级', createdAt: '2026-03-30 09:45' },
    { id: 'tag-3', name: 'UI', color: '#722ED1', description: 'UI 自动化相关', createdAt: '2026-03-30 10:10' },
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
        item.description.toLowerCase().includes(kw)
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
    <Card size="small" styles={{ body: { height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' } }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          gap: 16,
        }}
      >
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          添加标签
        </Button>
        <Input.Search
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="请输入标签名称/颜色/说明"
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
    </Card>
  );
}
