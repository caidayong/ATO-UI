/**
 * @page 产测软件管理 / 计划管理
 * @version V1.0.1-P4
 * @base ATO_V1.0.1-P4-页面需求与交互规格.md 第 4.1 节
 * @changes
 *   - V1.0.1-P4: 初始实现，包含计划列表、筛选搜索、新建计划、编辑/变更/删除入口
 */

import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import type { TableProps, UploadFile } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SwapOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { mockProductionPlans } from '@/mocks/data';
import { productionPlanDetailPath } from '@/constants/routes';
import type { ProductionPlan, ProductionPlanStatus } from '@/types';

const DEFAULT_PAGE_SIZE = 10;

const STATUS_COLOR_MAP: Record<ProductionPlanStatus, string> = {
  匹配中: 'processing',
  匹配失败: 'error',
  待确认: 'warning',
  已提交: 'success',
};

type NewPlanFormValues = {
  planName: string;
};

type EditPlanFormValues = {
  planName: string;
};

type PlanFilters = {
  week: string;
  status: 'ALL' | ProductionPlanStatus;
};

export function ProductionPlanList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<ProductionPlan[]>(mockProductionPlans);
  const [filters, setFilters] = useState<PlanFilters>({
    week: 'ALL',
    status: 'ALL',
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [queryKeyword, setQueryKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [newPlanModalOpen, setNewPlanModalOpen] = useState(false);
  const [editPlanModalOpen, setEditPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string>('');
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [editUploadFiles, setEditUploadFiles] = useState<UploadFile[]>([]);
  const [newPlanForm] = Form.useForm<NewPlanFormValues>();
  const [editPlanForm] = Form.useForm<EditPlanFormValues>();

  const weekOptions = useMemo(() => {
    const uniqWeeks = Array.from(new Set(plans.map((item) => item.week)));
    return uniqWeeks.map((week) => ({ label: week, value: week }));
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const keyword = queryKeyword.trim().toLowerCase();
    return plans.filter((plan) => {
      const matchWeek = filters.week === 'ALL' || plan.week === filters.week;
      const matchStatus = filters.status === 'ALL' || plan.status === filters.status;
      const matchKeyword = !keyword || plan.id.toLowerCase().includes(keyword) || plan.planName.toLowerCase().includes(keyword);
      return matchWeek && matchStatus && matchKeyword;
    });
  }, [filters.status, filters.week, plans, queryKeyword]);

  const pagedPlans = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, page, pageSize]);

  const handleDelete = (plan: ProductionPlan) => {
    if (plan.status === '已提交') {
      message.warning('已提交计划不允许删除');
      return;
    }
    Modal.confirm({
      title: '删除计划',
      content: '此操作不可恢复，是否继续？',
      okButtonProps: { danger: true },
      onOk: () => {
        setPlans((prev) => prev.filter((item) => item.id !== plan.id));
        message.success('删除成功');
      },
    });
  };

  const handleQuery = () => {
    setQueryKeyword(keywordInput);
    setPage(1);
  };

  const handleOpenChange = (planId: string) => {
    const query = new URLSearchParams({
      mode: 'changeEdit',
    }).toString();
    navigate(`${productionPlanDetailPath(planId)}?${query}`);
  };

  const handleOpenEdit = (plan: ProductionPlan) => {
    if (plan.status === '已提交') {
      message.warning('已提交计划不可编辑');
      return;
    }
    setEditingPlanId(plan.id);
    setEditUploadFiles([]);
    editPlanForm.setFieldsValue({ planName: plan.planName });
    setEditPlanModalOpen(true);
  };

  const handleRefreshMatch = (plan: ProductionPlan) => {
    if (plan.status === '已提交') {
      message.warning('已提交计划不可刷新匹配');
      return;
    }
    if (!['匹配失败', '待确认'].includes(plan.status)) {
      message.info('当前状态不可刷新匹配');
      return;
    }

    setPlans((prev) =>
      prev.map((item) => (item.id === plan.id ? { ...item, status: '匹配中' } : item))
    );
    message.loading({ content: '已开始重新匹配（Mock）', key: `refresh-${plan.id}` });

    window.setTimeout(() => {
      setPlans((prev) =>
        prev.map((item) =>
          item.id === plan.id ? { ...item, status: '待确认' } : item
        )
      );
      message.success({ content: '重新匹配成功，状态已更新为待确认', key: `refresh-${plan.id}` });
    }, 800);
  };

  const handleCreatePlan = async () => {
    const values = await newPlanForm.validateFields();
    if (!uploadFiles.length) {
      message.error('请上传生产计划 Excel 文件');
      return;
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newId = `PLN-${String(Date.now()).slice(-8)}`;
    const newPlan: ProductionPlan = {
      id: newId,
      planName: values.planName,
      week: weekOptions[0]?.value ?? '2026-W17',
      status: '匹配中',
      changeCount: 0,
      createdAt: now,
      submittedAt: '',
      changedAt: '',
      creator: '当前用户',
    };
    setPlans((prev) => [newPlan, ...prev]);
    setNewPlanModalOpen(false);
    setUploadFiles([]);
    newPlanForm.resetFields();
    message.success('新建计划成功，状态已置为匹配中');
  };

  const handleEditPlan = async () => {
    const values = await editPlanForm.validateFields();
    if (!editUploadFiles.length) {
      message.error('请重新上传生产计划 Excel 文件');
      return;
    }
    if (!editingPlanId) {
      setEditPlanModalOpen(false);
      return;
    }

    setPlans((prev) =>
      prev.map((item) =>
        item.id === editingPlanId
          ? {
              ...item,
              planName: values.planName,
              status: '匹配中',
            }
          : item
      )
    );
    setEditPlanModalOpen(false);
    message.loading({ content: '已开始重新匹配（Mock）', key: `edit-${editingPlanId}` });

    window.setTimeout(() => {
      setPlans((prev) =>
        prev.map((item) =>
          item.id === editingPlanId
            ? {
                ...item,
                status: '待确认',
              }
            : item
        )
      );
      message.success({ content: '编辑保存成功，已完成重新匹配', key: `edit-${editingPlanId}` });
    }, 800);
  };

  const columns: TableProps<ProductionPlan>['columns'] = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 160 },
    {
      title: '计划名称',
      dataIndex: 'planName',
      key: 'planName',
      width: 220,
      render: (value: string, record) => (
        <a onClick={() => navigate(productionPlanDetailPath(record.id))}>{value}</a>
      ),
    },
    { title: '周次', dataIndex: 'week', key: 'week', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: ProductionPlanStatus) => <Tag color={STATUS_COLOR_MAP[status]}>{status}</Tag>,
    },
    { title: '变更次数', dataIndex: 'changeCount', key: 'changeCount', width: 100 },
    { title: '创建日期', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
    {
      title: '提交日期',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 160,
      render: (value?: string) => value || '-',
    },
    {
      title: '变更日期',
      dataIndex: 'changedAt',
      key: 'changedAt',
      width: 160,
      render: (value?: string) => value || '-',
    },
    { title: '创建人', dataIndex: 'creator', key: 'creator', width: 110 },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 220,
      render: (_, record) => {
        const submitted = record.status === '已提交';
        const canRefresh = ['匹配失败', '待确认'].includes(record.status) && !submitted;
        return (
          <Space size={4}>
            <Tooltip title={submitted ? '已提交不可编辑' : '编辑计划'}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                disabled={submitted}
                onClick={() => handleOpenEdit(record)}
              />
            </Tooltip>
            <Tooltip title="计划变更">
              <Button type="text" size="small" icon={<SwapOutlined />} onClick={() => handleOpenChange(record.id)} />
            </Tooltip>
            <Tooltip title={submitted ? '已提交不可删除' : '删除计划'}>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={submitted}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
            <Tooltip title={submitted ? '已提交不可刷新' : canRefresh ? '重新匹配' : '当前状态不可刷新'}>
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => handleRefreshMatch(record)} disabled={!canRefresh} />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 140px)' }}>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewPlanModalOpen(true)}>
            新建计划
          </Button>
          <Space>
            <Select
              style={{ width: 140 }}
              value={filters.week}
              options={[{ label: '全部周次', value: 'ALL' }, ...weekOptions]}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, week: value }));
                setPage(1);
              }}
            />
            <Select
              style={{ width: 140 }}
              value={filters.status}
              options={[
                { label: '全部状态', value: 'ALL' },
                { label: '匹配中', value: '匹配中' },
                { label: '匹配失败', value: '匹配失败' },
                { label: '待确认', value: '待确认' },
                { label: '已提交', value: '已提交' },
              ]}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, status: value }));
                setPage(1);
              }}
            />
            <Input
              style={{ width: 260 }}
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索 ID / 计划名称"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onPressEnter={handleQuery}
            />
            <Button onClick={handleQuery}>查询</Button>
          </Space>
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={pagedPlans}
          pagination={false}
          scroll={{ x: 1450 }}
          locale={{
            emptyText: (
              <Empty description="暂无计划">
                <Button type="primary" onClick={() => setNewPlanModalOpen(true)}>
                  去新建计划
                </Button>
              </Empty>
            ),
          }}
        />
        <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>共 {filteredPlans.length} 条</span>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredPlans.length}
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
        title="新建计划"
        open={newPlanModalOpen}
        onCancel={() => setNewPlanModalOpen(false)}
        onOk={() => void handleCreatePlan()}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        <Form<NewPlanFormValues> layout="vertical" form={newPlanForm}>
          <Form.Item name="planName" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
            <Input placeholder="例如：2026年第16周主板产测计划" />
          </Form.Item>
          <Form.Item label="生产计划 Excel" required>
            <Upload
              accept=".xlsx,.xls"
              beforeUpload={() => false}
              fileList={uploadFiles}
              onChange={({ fileList }) => setUploadFiles(fileList.slice(-1))}
            >
              <Button icon={<UploadOutlined />}>上传文件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑计划"
        open={editPlanModalOpen}
        onCancel={() => setEditPlanModalOpen(false)}
        onOk={() => void handleEditPlan()}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form<EditPlanFormValues> layout="vertical" form={editPlanForm}>
          <Form.Item name="planName" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
            <Input placeholder="请输入计划名称" />
          </Form.Item>
          <Form.Item label="生产计划 Excel" required>
            <Upload
              accept=".xlsx,.xls"
              beforeUpload={() => false}
              fileList={editUploadFiles}
              onChange={({ fileList }) => setEditUploadFiles(fileList.slice(-1))}
            >
              <Button icon={<UploadOutlined />}>重新上传附件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
