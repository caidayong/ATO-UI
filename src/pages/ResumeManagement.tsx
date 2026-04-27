/**
 * @page 产测软件管理 / 履历表管理
 * @version V1.0.1-P4
 * @base ATO_V1.0.1-P4-页面需求与交互规格.md 第 4.3 节
 * @changes
 *   - V1.0.1-P4: 初始实现，包含履历表列表、查询、新增/编辑/删除、批量替换能力（Mock）
 */

import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Pagination,
  Space,
  Table,
  Tag,
  message,
  Select,
} from 'antd';
import type { TableProps } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons';
import { mockResumeRecords } from '@/mocks/data';
import type { ResumeRecord } from '@/types';

const DEFAULT_PAGE_SIZE = 10;

type ResumeFormValues = Omit<ResumeRecord, 'id' | 'checksumMd5'>;
type BatchReplaceFormValues = {
  field: keyof ResumeFormValues;
  value: string;
};

export function ResumeManagement() {
  const [records, setRecords] = useState<ResumeRecord[]>(mockResumeRecords);
  const [keyword, setKeyword] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm] = Form.useForm<ResumeFormValues>();
  const [batchForm] = Form.useForm<BatchReplaceFormValues>();

  const filteredRecords = useMemo(() => {
    const target = keyword.trim().toLowerCase();
    if (!target) {
      return records;
    }
    return records.filter((item) =>
      [
        item.boardPartNo,
        item.boardModel,
        item.chipPartNo,
        item.chipModel,
        item.softwareVersion,
        item.publisher,
        item.remark ?? '',
        item.description ?? '',
      ].some((field) => field.toLowerCase().includes(target))
    );
  }, [keyword, records]);

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const handleOpenAdd = () => {
    setEditingId(null);
    editForm.resetFields();
    setEditModalOpen(true);
  };

  const handleOpenEdit = (record: ResumeRecord) => {
    setEditingId(record.id);
    editForm.setFieldsValue({
      boardPartNo: record.boardPartNo,
      boardModel: record.boardModel,
      chipPartNo: record.chipPartNo,
      chipModel: record.chipModel,
      softwareVersion: record.softwareVersion,
      description: record.description,
      publisher: record.publisher,
      remark: record.remark,
    });
    setEditModalOpen(true);
  };

  const handleDelete = (record: ResumeRecord) => {
    Modal.confirm({
      title: '删除履历记录',
      content: '此操作不可恢复，是否继续？',
      okButtonProps: { danger: true },
      onOk: () => {
        setRecords((prev) => prev.filter((item) => item.id !== record.id));
        setSelectedRowKeys((prev) => prev.filter((key) => key !== record.id));
        message.success('删除成功');
      },
    });
  };

  const handleSubmitEdit = async () => {
    const values = await editForm.validateFields();
    if (editingId) {
      setRecords((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...values,
              }
            : item
        )
      );
      message.success('编辑成功');
    } else {
      const nextId = `RS-${Date.now()}`;
      const newRecord: ResumeRecord = {
        id: nextId,
        ...values,
        checksumMd5: Math.random().toString(16).slice(2, 13),
      };
      setRecords((prev) => [newRecord, ...prev]);
      message.success('新增成功');
    }
    setEditModalOpen(false);
    editForm.resetFields();
  };

  const handleBatchReplace = async () => {
    if (!selectedRowKeys.length) {
      message.warning('请先勾选要批量替换的记录');
      return;
    }
    const values = await batchForm.validateFields();
    setRecords((prev) =>
      prev.map((item) =>
        selectedRowKeys.includes(item.id)
          ? {
              ...item,
              [values.field]: values.value,
            }
          : item
      )
    );
    setBatchModalOpen(false);
    batchForm.resetFields();
    message.success(`已完成 ${selectedRowKeys.length} 条记录批量替换`);
  };

  const columns: TableProps<ResumeRecord>['columns'] = [
    { title: '板卡料号', dataIndex: 'boardPartNo', key: 'boardPartNo', width: 150 },
    { title: '板卡型号', dataIndex: 'boardModel', key: 'boardModel', width: 200 },
    { title: '芯片料号', dataIndex: 'chipPartNo', key: 'chipPartNo', width: 180 },
    { title: '芯片型号', dataIndex: 'chipModel', key: 'chipModel', width: 180 },
    { title: '软件版本', dataIndex: 'softwareVersion', key: 'softwareVersion', width: 260 },
    {
      title: 'checksum值(MD5值)(生成)',
      dataIndex: 'checksumMd5',
      key: 'checksumMd5',
      width: 180,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    { title: '描述', dataIndex: 'description', key: 'description', width: 220 },
    { title: '发布人', dataIndex: 'publisher', key: 'publisher', width: 100 },
    { title: '备注', dataIndex: 'remark', key: 'remark', width: 180 },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 140px)' }}>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              新增板卡
            </Button>
            <Button icon={<SwapOutlined />} onClick={() => setBatchModalOpen(true)}>
              批量替换
            </Button>
          </Space>
          <Input
            allowClear
            style={{ width: 320 }}
            prefix={<SearchOutlined />}
            placeholder="搜索板卡/芯片/软件版本/发布人"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={pagedRecords}
          pagination={false}
          scroll={{ x: 1900 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
        />
        <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>共 {filteredRecords.length} 条</span>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredRecords.length}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            onChange={(nextPage, nextPageSize) => {
              setPage(nextPage);
              if (nextPageSize !== pageSize) {
                setPageSize(nextPageSize);
              }
            }}
          />
        </Space>
      </Card>

      <Modal
        title={editingId ? '编辑板卡信息' : '新增板卡信息'}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => void handleSubmitEdit()}
        destroyOnClose
      >
        <Form<ResumeFormValues> form={editForm} layout="vertical">
          <Form.Item name="boardPartNo" label="板卡料号" rules={[{ required: true, message: '请输入板卡料号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="boardModel" label="板卡型号" rules={[{ required: true, message: '请输入板卡型号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="chipPartNo" label="芯片料号" rules={[{ required: true, message: '请输入芯片料号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="chipModel" label="芯片型号" rules={[{ required: true, message: '请输入芯片型号' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="softwareVersion"
            label="软件版本"
            rules={[{ required: true, message: '请输入软件版本' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input />
          </Form.Item>
          <Form.Item name="publisher" label="发布人" rules={[{ required: true, message: '请输入发布人' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量替换"
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        onOk={() => void handleBatchReplace()}
      >
        <Form<BatchReplaceFormValues> form={batchForm} layout="vertical">
          <Form.Item name="field" label="替换字段" rules={[{ required: true, message: '请选择替换字段' }]}>
            <Select
              options={[
                { label: '板卡型号', value: 'boardModel' },
                { label: '芯片型号', value: 'chipModel' },
                { label: '软件版本', value: 'softwareVersion' },
                { label: '描述', value: 'description' },
                { label: '发布人', value: 'publisher' },
                { label: '备注', value: 'remark' },
              ]}
            />
          </Form.Item>
          <Form.Item name="value" label="替换值" rules={[{ required: true, message: '请输入替换值' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
