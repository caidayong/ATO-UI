/**
 * @page 整机变量管理
 * @version V1.0.2
 * @base docs/requirements/版本用例开发/设备用例开发/版本用例开发-设备用例开发-变量管理_需求文档.md §4.5.5.1.1
 * @changes
 *   - V1.0.0: 整机版本开发独立路由占位
 *   - V1.0.1: 复用平台 VariableManagement 实现
 *   - V1.0.2: 整机仅保留「全局变量」；无环境变量侧栏；内联表格 + 值类型 + 插入动态值
 */

import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { DynamicValueInput } from '@/components/DynamicValueInput';
import { FILTER_CONTROL_WIDTH, SPACING } from '@/constants/ui';
import { useParams } from 'react-router-dom';

const VALUE_TYPES = ['string', 'int', 'float', 'bool', 'list', 'dict', 'tuple'] as const;
type ValueType = (typeof VALUE_TYPES)[number];

type GlobalVariableRow = {
  id: string;
  name: string;
  valueType: ValueType;
  value: string;
  description: string;
};

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

const INITIAL_ROWS: GlobalVariableRow[] = [
  {
    id: 'gv-wm-1',
    name: 'user_name',
    valueType: 'string',
    value: '{start_time}',
    description: '名称',
  },
  {
    id: 'gv-wm-2',
    name: 'user_id',
    valueType: 'string',
    value: '{"key":"value"}',
    description: 'ID编号',
  },
  {
    id: 'gv-wm-3',
    name: 'device_token',
    valueType: 'string',
    value: '$uuid()',
    description: '设备令牌',
  },
];

export function DeviceVariableManagement() {
  const { versionId = '' } = useParams<{ projectId: string; versionId: string }>();
  const [rows, setRows] = useState<GlobalVariableRow[]>(() => [...INITIAL_ROWS]);
  const [searchText, setSearchText] = useState('');
  const [validationTriggered, setValidationTriggered] = useState(false);

  const globalVariableNameOptions = useMemo(
    () => rows.map((r) => r.name.trim()).filter(Boolean),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(kw));
  }, [rows, searchText]);

  const updateRow = (id: string, patch: Partial<GlobalVariableRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: nowId('gv'),
        name: '',
        valueType: 'string',
        value: '',
        description: '',
      },
    ]);
  };

  const deleteRow = (id: string, name: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
    message.success(name.trim() ? `已删除 ${name}` : '已删除变量');
  };

  const validateRows = (): boolean => {
    setValidationTriggered(true);

    for (const row of rows) {
      if (!row.name.trim()) {
        message.error('变量名为必填项');
        return false;
      }
      if (!row.value.trim()) {
        message.error('变量值为必填项');
        return false;
      }
    }

    const names = rows.map((r) => r.name.trim());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) {
      message.error(`变量名「${dup}」重复，请重新输入`);
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateRows()) return;
    message.success('保存成功（Mock）');
    setValidationTriggered(false);
  };

  const rowInvalid = (row: GlobalVariableRow) => {
    if (!validationTriggered) return { name: false, value: false };
    return {
      name: !row.name.trim(),
      value: !row.value.trim(),
    };
  };

  const columns: ColumnsType<GlobalVariableRow> = [
    {
      title: '变量名',
      dataIndex: 'name',
      width: 200,
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入变量名"
          status={rowInvalid(row).name ? 'error' : undefined}
          onChange={(e) => updateRow(row.id, { name: e.target.value })}
        />
      ),
    },
    {
      title: '值类型',
      dataIndex: 'valueType',
      width: 140,
      render: (value: ValueType, row) => (
        <Select
          value={value}
          style={{ width: '100%' }}
          options={VALUE_TYPES.map((t) => ({ label: t, value: t }))}
          onChange={(v) => updateRow(row.id, { valueType: v as ValueType })}
        />
      ),
    },
    {
      title: '变量值',
      dataIndex: 'value',
      render: (value: string, row) => (
        <DynamicValueInput
          globalVariableOptions={globalVariableNameOptions}
          value={value}
          placeholder="请输入变量值"
          status={rowInvalid(row).value ? 'error' : undefined}
          onChange={(e) => updateRow(row.id, { value: e.target.value })}
        />
      ),
    },
    {
      title: '变量描述',
      dataIndex: 'description',
      width: 200,
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入变量描述"
          onChange={(e) => updateRow(row.id, { description: e.target.value })}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 72,
      fixed: 'right',
      render: (_, row) => (
        <Popconfirm
          title={`确认删除${row.name.trim() ? row.name : '该变量'}？`}
          onConfirm={() => deleteRow(row.id, row.name)}
        >
          <Button type="link" danger icon={<DeleteOutlined />} aria-label="删除" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card styles={{ body: { padding: SPACING.md } }}>
      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: SPACING.md }}>
        全局变量
      </Typography.Title>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: SPACING.sm,
          marginBottom: SPACING.md,
        }}
      >
        <Button type="primary" icon={<PlusOutlined />} onClick={addRow}>
          添加一行
        </Button>
        <Space wrap>
          <Input
            allowClear
            placeholder="输入变量名查询"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: FILTER_CONTROL_WIDTH.search }}
          />
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </Space>
      </div>

      <Table<GlobalVariableRow>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filteredRows}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 960 }}
        locale={{
          emptyText: versionId ? '暂无变量，点击「添加一行」创建' : '暂无变量',
        }}
      />

      <Typography.Text type="secondary" style={{ display: 'block', marginTop: SPACING.sm }}>
        整机环境变量请在「资源管理」中维护；本页仅管理版本全局变量。变量值可通过「插入动态值」选用公共数据函数或表达式。
      </Typography.Text>
    </Card>
  );
}
