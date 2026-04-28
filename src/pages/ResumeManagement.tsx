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
  Divider,
} from 'antd';
import type { TableProps } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons';
import { mockResumeRecords } from '@/mocks/data';
import type { ResumeRecord, SoftwareStatus } from '@/types';

const DEFAULT_PAGE_SIZE = 10;

type ResumeIcPair = {
  chipPartNo?: string;
  chipModel?: string;
  softwareVersion?: string;
  checksumMd5?: string;
  softwareStatus?: SoftwareStatus;
  description?: string;
  publisher?: string;
  remark?: string;
};
type ResumeFormValues = Omit<ResumeRecord, 'id' | 'checksumMd5' | 'chipPartNo' | 'chipModel'> & {
  chipPartNo?: string;
  chipModel?: string;
  icInfos?: ResumeIcPair[];
};
type BatchReplaceFormValues = {
  findSoftwareVersion: string;
  findChecksumMd5?: string;
  findPath?: string;
  replaceSoftwareVersion: string;
  replaceChecksumMd5: string;
  replacePath: string;
};
type ResumeBoardRow = ResumeRecord & {
  groupIds: string[];
  icInfos: ResumeIcPair[];
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
  const [editingGroupIds, setEditingGroupIds] = useState<string[]>([]);
  const [editForm] = Form.useForm<ResumeFormValues>();
  const [batchForm] = Form.useForm<BatchReplaceFormValues>();
  const buildChecksum = (softwareVersion?: string) =>
    softwareVersion?.trim() ? Math.random().toString(16).slice(2, 13) : '';
  const lookupSoftwareMeta = (softwareVersion?: string): { checksumMd5?: string; path?: string } => {
    const target = softwareVersion?.trim();
    if (!target) {
      return {};
    }
    for (const record of records) {
      const infos = record.icInfos?.length
        ? record.icInfos
        : [
            {
              softwareVersion: record.softwareVersion,
              checksumMd5: record.checksumMd5,
              description: record.description,
            },
          ];
      const matched = infos.find((info) => info.softwareVersion?.trim() === target);
      if (matched) {
        return {
          checksumMd5: matched.checksumMd5,
          path: matched.description,
        };
      }
    }
    return {};
  };

  const groupedRecords = useMemo<ResumeBoardRow[]>(() => {
    const groupMap = new Map<string, ResumeBoardRow>();
    records.forEach((item) => {
      const key = `${item.boardPartNo ?? ''}|${item.boardModel}`;
      const normalizedInfos: ResumeIcPair[] = item.icInfos?.length
        ? item.icInfos
        : [
            {
              chipPartNo: item.chipPartNo,
              chipModel: item.chipModel,
              softwareVersion: item.softwareVersion,
              checksumMd5: item.checksumMd5,
              softwareStatus: item.softwareStatus,
              description: item.description,
              publisher: item.publisher,
              remark: item.remark,
            },
          ];
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          ...item,
          groupIds: [item.id],
          icInfos: [...normalizedInfos],
        });
        return;
      }
      const grouped = groupMap.get(key)!;
      grouped.groupIds.push(item.id);
      grouped.icInfos.push(...normalizedInfos);
    });
    return Array.from(groupMap.values());
  }, [records]);

  const filteredRecords = useMemo(() => {
    const target = keyword.trim().toLowerCase();
    if (!target) {
      return groupedRecords;
    }
    return groupedRecords.filter((item) =>
      [
        item.boardPartNo ?? '',
        item.boardModel,
        ...item.icInfos.flatMap((info) => [
          info.chipPartNo ?? '',
          info.chipModel ?? '',
          info.softwareVersion ?? '',
          info.softwareStatus ?? '',
          info.description ?? '',
          info.publisher ?? '',
          info.remark ?? '',
        ]),
      ].some((field) => field.toLowerCase().includes(target))
    );
  }, [groupedRecords, keyword]);

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const getIcInfos = (record: ResumeBoardRow): ResumeIcPair[] => record.icInfos ?? [];
  const renderIcCellLines = (record: ResumeBoardRow, pick: (info: ResumeIcPair) => string | undefined) =>
    getIcInfos(record).map((info, index, arr) => (
      <div
        key={`${record.id}-line-${index}`}
        style={{
          padding: '4px 0',
          borderBottom: index === arr.length - 1 ? 'none' : '1px solid #f0f0f0',
        }}
      >
        {pick(info) || '-'}
      </div>
    ));

  const handleOpenAdd = () => {
    setEditingId(null);
    setEditingGroupIds([]);
    editForm.resetFields();
    editForm.setFieldsValue({
      icInfos: [{ chipPartNo: '', chipModel: '', softwareStatus: '正常' }],
    });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (record: ResumeBoardRow) => {
    setEditingId(record.id);
    setEditingGroupIds(record.groupIds);
    editForm.setFieldsValue({
      boardPartNo: record.boardPartNo,
      boardModel: record.boardModel,
      icInfos: getIcInfos(record),
    });
    setEditModalOpen(true);
  };

  const handleDelete = (record: ResumeBoardRow) => {
    Modal.confirm({
      title: '删除履历记录',
      content: '此操作不可恢复，是否继续？',
      okButtonProps: { danger: true },
      onOk: () => {
        setRecords((prev) => prev.filter((item) => !record.groupIds.includes(item.id)));
        setSelectedRowKeys((prev) => prev.filter((key) => key !== record.id));
        message.success('删除成功');
      },
    });
  };

  const handleSubmitEdit = async () => {
    const values = await editForm.validateFields();
    if (editingId) {
      const icInfos = values.icInfos?.length ? values.icInfos : [{}];
      setRecords((prev) => {
        const replacementRows: ResumeRecord[] = icInfos.map((info, index) => ({
          id: editingGroupIds[index] ?? `RS-${Date.now()}-${index}`,
          boardPartNo: values.boardPartNo,
          boardModel: values.boardModel,
          chipPartNo: info.chipPartNo?.trim() ?? '',
          chipModel: info.chipModel?.trim() ?? '',
          softwareVersion: info.softwareVersion?.trim() ?? '',
          checksumMd5: info.checksumMd5 || buildChecksum(info.softwareVersion),
          softwareStatus: info.softwareStatus,
          description: info.description,
          publisher: info.publisher?.trim() ?? '',
          remark: info.remark,
          icInfos: [
            {
              ...info,
              checksumMd5: info.checksumMd5 || buildChecksum(info.softwareVersion),
            },
          ],
        }));
        return [...prev.filter((item) => !editingGroupIds.includes(item.id)), ...replacementRows];
      });
      message.success('编辑成功');
    } else {
      const icInfos = values.icInfos?.length ? values.icInfos : [{}];
      const firstInfo = icInfos[0] ?? {};
      const newRecord: ResumeRecord = {
        id: `RS-${Date.now()}`,
        boardPartNo: values.boardPartNo,
        boardModel: values.boardModel,
        chipPartNo: firstInfo.chipPartNo?.trim() ?? '',
        chipModel: firstInfo.chipModel?.trim() ?? '',
        softwareVersion: firstInfo.softwareVersion?.trim() ?? '',
        checksumMd5: firstInfo.checksumMd5 || buildChecksum(firstInfo.softwareVersion),
        softwareStatus: firstInfo.softwareStatus,
        description: firstInfo.description,
        publisher: firstInfo.publisher?.trim() ?? '',
        remark: firstInfo.remark,
        icInfos: icInfos.map((info) => ({
          ...info,
          checksumMd5: info.checksumMd5 || buildChecksum(info.softwareVersion),
        })),
      };
      setRecords((prev) => [newRecord, ...prev]);
      message.success(`新增成功（1个板卡，${icInfos.length}组IC信息）`);
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
    const targetIds = new Set<string>(
      filteredRecords
        .filter((row) => selectedRowKeys.includes(row.id))
        .flatMap((row) => row.groupIds)
    );
    setRecords((prev) =>
      prev.map((item) =>
        targetIds.has(item.id)
          ? (() => {
              const nextIcInfos = (item.icInfos?.length
                ? item.icInfos
                : [
                    {
                      chipPartNo: item.chipPartNo,
                      chipModel: item.chipModel,
                      softwareVersion: item.softwareVersion,
                      checksumMd5: item.checksumMd5,
                      softwareStatus: item.softwareStatus,
                      description: item.description,
                      publisher: item.publisher,
                      remark: item.remark,
                    },
                  ]
              ).map((info) =>
                info.softwareVersion?.trim() === values.findSoftwareVersion.trim()
                  ? {
                      ...info,
                      softwareVersion: values.replaceSoftwareVersion.trim(),
                      checksumMd5: values.replaceChecksumMd5.trim(),
                      description: values.replacePath.trim(),
                    }
                  : info
              );
              const first = nextIcInfos[0] ?? {};
              return {
                ...item,
                softwareVersion: first.softwareVersion?.trim() ?? '',
                checksumMd5: first.checksumMd5?.trim() ?? '',
                description: first.description,
                icInfos: nextIcInfos,
              };
            })()
          : item
      )
    );
    setBatchModalOpen(false);
    batchForm.resetFields();
    message.success(`已完成 ${selectedRowKeys.length} 个板卡的批量软件信息替换`);
  };

  const columns: TableProps<ResumeBoardRow>['columns'] = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '板卡料号',
      dataIndex: 'boardPartNo',
      key: 'boardPartNo',
      width: 150,
      render: (value?: string) => value || '-',
    },
    {
      title: '物料描述',
      dataIndex: 'boardModel',
      key: 'boardModel',
      width: 220,
    },
    {
      title: 'IC料号',
      dataIndex: 'chipPartNo',
      key: 'chipPartNo',
      width: 180,
      render: (_, record) => renderIcCellLines(record, (info) => info.chipPartNo),
    },
    {
      title: 'IC型号',
      dataIndex: 'chipModel',
      key: 'chipModel',
      width: 180,
      render: (_, record) => renderIcCellLines(record, (info) => info.chipModel),
    },
    {
      title: '软件版本',
      dataIndex: 'softwareVersion',
      key: 'softwareVersion',
      width: 260,
      render: (_, record) => renderIcCellLines(record, (info) => info.softwareVersion),
    },
    {
      title: 'Checksum值',
      dataIndex: 'checksumMd5',
      key: 'checksumMd5',
      width: 180,
      render: (_, record) => renderIcCellLines(record, (info) => (info.softwareVersion?.trim() ? info.checksumMd5 : '')),
    },
    {
      title: '软件状态',
      dataIndex: 'softwareStatus',
      key: 'softwareStatus',
      width: 120,
      render: (_, record) => renderIcCellLines(record, (info) => info.softwareStatus),
    },
    {
      title: '存放路径',
      dataIndex: 'description',
      key: 'description',
      width: 240,
      render: (_, record) => renderIcCellLines(record, (info) => info.description),
    },
    {
      title: '发布人',
      dataIndex: 'publisher',
      key: 'publisher',
      width: 120,
      render: (_, record) => renderIcCellLines(record, (info) => info.publisher),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 180,
      render: (_, record) => renderIcCellLines(record, (info) => info.remark),
    },
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
          scroll={{ x: 2100 }}
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
        width={1180}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => void handleSubmitEdit()}
        destroyOnClose
      >
        <Form<ResumeFormValues> form={editForm} layout="vertical">
          <>
            <Divider style={{ margin: '0 0 14px' }}>板卡信息</Divider>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <Form.Item name="boardPartNo" label="板卡料号" style={{ marginBottom: 0 }}>
                <Input />
              </Form.Item>
              <Form.Item
                name="boardModel"
                label="物料描述"
                rules={[{ required: true, message: '请输入物料描述' }]}
                style={{ marginBottom: 0 }}
              >
                <Input />
              </Form.Item>
            </div>
            <Divider style={{ margin: '16px 0 14px' }}>IC信息</Divider>
            <Form.List name="icInfos" initialValue={[{ chipPartNo: '', chipModel: '', softwareStatus: '正常' }]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <div
                      key={field.key}
                      style={{
                        border: '1px solid #f0f0f0',
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 10,
                        background: '#fafafa',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.1fr 1.1fr 1.7fr 0.9fr 1.5fr 1fr 1.2fr auto',
                          gap: 8,
                          alignItems: 'end',
                        }}
                      >
                        <Form.Item name={[field.name, 'chipPartNo']} label={index === 0 ? 'IC料号' : undefined} style={{ marginBottom: 0 }}>
                          <Input placeholder="IC料号" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'chipModel']} label={index === 0 ? 'IC型号' : undefined} style={{ marginBottom: 0 }}>
                          <Input placeholder="IC型号" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'softwareVersion']}
                          label={index === 0 ? '软件版本' : undefined}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="软件版本" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'softwareStatus']}
                          label={index === 0 ? '软件状态' : undefined}
                          initialValue="正常"
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            options={[
                              { label: '正常', value: '正常' },
                              { label: '已下架', value: '已下架' },
                              { label: '试产', value: '试产' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item name={[field.name, 'description']} label={index === 0 ? '存放路径' : undefined} style={{ marginBottom: 0 }}>
                          <Input placeholder="存放路径" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'publisher']} label={index === 0 ? '发布人' : undefined} style={{ marginBottom: 0 }}>
                          <Input placeholder="发布人" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'remark']} label={index === 0 ? '备注' : undefined} style={{ marginBottom: 0 }}>
                          <Input placeholder="备注" />
                        </Form.Item>
                        <Button danger type="link" disabled={fields.length === 1} onClick={() => remove(field.name)}>
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="dashed" block onClick={() => add({ chipPartNo: '', chipModel: '', softwareStatus: '正常' })}>
                    + 添加一组IC信息
                  </Button>
                </>
              )}
            </Form.List>
          </>
        </Form>
      </Modal>

      <Modal
        title="批量替换"
        open={batchModalOpen}
        onCancel={() => {
          setBatchModalOpen(false);
          batchForm.resetFields();
        }}
        onOk={() => void handleBatchReplace()}
      >
        <Form<BatchReplaceFormValues> form={batchForm} layout="vertical">
          <Form.Item
            name="findSoftwareVersion"
            label="查找内容-软件版本"
            rules={[{ required: true, message: '请输入要查找的软件版本' }]}
          >
            <Input
              placeholder="输入后自动回填 MD5 / 存放路径"
              onChange={(e) => {
                const softwareVersion = e.target.value;
                const meta = lookupSoftwareMeta(softwareVersion);
                batchForm.setFieldsValue({
                  findChecksumMd5: meta.checksumMd5 ?? '',
                  findPath: meta.path ?? '',
                });
              }}
            />
          </Form.Item>
          <Form.Item name="findChecksumMd5" label="查找内容-MD5">
            <Input disabled placeholder="自动带出" />
          </Form.Item>
          <Form.Item name="findPath" label="查找内容-存放路径">
            <Input disabled placeholder="自动带出" />
          </Form.Item>
          <Divider style={{ margin: '12px 0' }} />
          <Form.Item
            name="replaceSoftwareVersion"
            label="替换为-软件版本"
            rules={[{ required: true, message: '请输入替换后的软件版本' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="replaceChecksumMd5"
            label="替换为-MD5"
            rules={[{ required: true, message: '请输入替换后的MD5' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="replacePath"
            label="替换为-存放路径"
            rules={[{ required: true, message: '请输入替换后的存放路径' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
