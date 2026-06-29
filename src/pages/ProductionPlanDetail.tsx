/**
 * @page 产测软件管理 / 计划管理 / 计划详情
 * @version V1.0.1-P4
 * @base ATO_V1.0.1-P4-页面需求与交互规格.md 第 4.2 节
 * @changes
 *   - V1.0.1-P4: 初始实现，交付三 Tab（软件烧录表/操作日志/生产计划表）及保存、提交、变更态基础交互
 *   - V1.0.1-P4: REQ-036 履历表匹配 UI 标记（程序名称：有更新橙色/找不到红色，红色空值阻断提交）
 *   - V1.0.1-P4: REQ-037 计划状态优化（匹配异常/匹配失败分流，BOM 异常整行标红，禁止提交）
 *   - V1.0.1-P4: REQ-038 提交弹窗 Mock 预览邮件标记板卡清单
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  mockBurnRows,
  mockPlanOperationLogs,
  mockPlanSubmitContacts,
  mockPlanSheetRows,
  mockProductionPlans,
  mockTeamMemberIds,
  mockTeams,
  mockUsers,
} from '@/mocks/data';
import { ROUTES } from '@/constants/routes';
import { FILTER_CONTROL_WIDTH, PAGE_MIN_HEIGHT, SPACING } from '@/constants/ui';
import type { BurnRow, PlanOperationLog, PlanSheetRow, ProductionPlan, ProductionPlanStatus } from '@/types';

const STATUS_COLOR_MAP: Record<ProductionPlanStatus, string> = {
  匹配中: 'processing',
  匹配失败: 'error',
  匹配异常: 'volcano',
  待确认: 'warning',
  已提交: 'success',
};

const BOM_FAILED_ROW_BG = '#fff1f0';

type EmailMarkedBurnRow = {
  key: string;
  markLabel: string;
  markColor: 'warning' | 'error';
  taskNo: string;
  materialCode: string;
  materialName: string;
  icPartNo: string;
  icModel: string;
  programName: string;
  previousProgramName?: string;
};

function getProgramMatchMarkLabel(row: BurnRow): string | null {
  if (row.bomMatchFailed) {
    return null;
  }
  if (row.programMatchStatus === 'updated') {
    return row.previousProgramName?.trim() ? '软件有更新（旧→新）' : '软件有更新（空→有）';
  }
  if (row.programMatchStatus === 'not_found') {
    return row.programName.trim() ? '找不到软件（已人工补齐）' : '找不到软件';
  }
  return null;
}

function buildEmailMarkedBurnRows(rows: BurnRow[]): EmailMarkedBurnRow[] {
  return rows
    .flatMap((row) => {
      const markLabel = getProgramMatchMarkLabel(row);
      if (!markLabel) {
        return [];
      }
      return [
        {
          key: row.id,
          markLabel,
          markColor: row.programMatchStatus === 'updated' ? ('warning' as const) : ('error' as const),
          taskNo: row.taskNo,
          materialCode: row.materialCode,
          materialName: row.materialName,
          icPartNo: row.icPartNo || '-',
          icModel: row.icModel || '-',
          programName: row.programName.trim() || '-',
          previousProgramName: row.previousProgramName?.trim() || undefined,
        },
      ];
    })
    .sort((a, b) => {
      const order = (label: string) => (label.startsWith('软件有更新') ? 0 : 1);
      return order(a.markLabel) - order(b.markLabel);
    });
}

const EMAIL_MARK_PREVIEW_COLUMNS: TableProps<EmailMarkedBurnRow>['columns'] = [
  {
    title: '标记类型',
    dataIndex: 'markLabel',
    key: 'markLabel',
    width: 168,
    render: (label: string, record) => <Tag color={record.markColor}>{label}</Tag>,
  },
  { title: '生产任务单编号', dataIndex: 'taskNo', key: 'taskNo', width: 130 },
  { title: '物料代码', dataIndex: 'materialCode', key: 'materialCode', width: 140 },
  { title: '物料名称', dataIndex: 'materialName', key: 'materialName', width: 180, ellipsis: true },
  { title: 'IC料号', dataIndex: 'icPartNo', key: 'icPartNo', width: 120 },
  { title: 'IC型号', dataIndex: 'icModel', key: 'icModel', width: 120, ellipsis: true },
  {
    title: '程序名称',
    dataIndex: 'programName',
    key: 'programName',
    width: 200,
    ellipsis: true,
    render: (value: string, record) =>
      record.previousProgramName ? (
        <Space direction="vertical" size={0}>
          <Typography.Text type="secondary">原：{record.previousProgramName}</Typography.Text>
          <Typography.Text>新：{value}</Typography.Text>
        </Space>
      ) : (
        value
      ),
  },
];

type ChangeDetailFormValues = {
  reason: string;
  impactScope: string;
  remark?: string;
};

type SubmitConfirmFormValues = {
  senderIds: string[];
  ccIds?: string[];
  ccTeamId?: string;
  includeExcelAttachment: boolean;
};

const DEFAULT_CHANGE_REASONS = ['迭代更新', 'bug修复'];
const CHANGE_REASON_STORAGE_KEY = 'ptsw-change-reasons';
const SUBMIT_CONTACTS_STORAGE_KEY = 'ptsw-submit-contacts-by-plan';

type SubmitContactsDraft = {
  senderIds: string[];
  ccIds?: string[];
  ccTeamId?: string;
  includeExcelAttachment: boolean;
};

export function ProductionPlanDetail() {
  const navigate = useNavigate();
  const { planId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const factory = searchParams.get('factory');
  const [activeTab, setActiveTab] = useState<'burn' | 'log' | 'production'>('burn');
  const mode = searchParams.get('mode');
  const isChangeEdit = mode === 'changeEdit';
  const [burnKeywordInput, setBurnKeywordInput] = useState('');
  const [burnKeyword, setBurnKeyword] = useState('');
  const [productionKeywordInput, setProductionKeywordInput] = useState('');
  const [productionKeyword, setProductionKeyword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [changeForm] = Form.useForm<ChangeDetailFormValues>();
  const [submitForm] = Form.useForm<SubmitConfirmFormValues>();
  const [changeReasonOptions, setChangeReasonOptions] = useState<string[]>(DEFAULT_CHANGE_REASONS);
  const [newChangeReason, setNewChangeReason] = useState('');
  const [submitContactsByPlan, setSubmitContactsByPlan] = useState<Record<string, SubmitContactsDraft>>({});
  const plansPathWithFactory = factory === 'VN' ? `${ROUTES.PTSW_PLANS}?factory=VN` : `${ROUTES.PTSW_PLANS}?factory=CN`;

  const plan = useMemo<ProductionPlan | undefined>(() => {
    return mockProductionPlans.find((item) => item.id === planId);
  }, [planId]);
  const [currentStatus, setCurrentStatus] = useState<ProductionPlanStatus | undefined>(plan?.status);

  const initialBurnRows = useMemo<BurnRow[]>(() => mockBurnRows.filter((item) => item.planId === planId), [planId]);
  const [burnRows, setBurnRows] = useState<BurnRow[]>(() => initialBurnRows);
  const [logRows, setLogRows] = useState<PlanOperationLog[]>(() => mockPlanOperationLogs.filter((item) => item.planId === planId));
  const productionRows = useMemo<PlanSheetRow[]>(() => mockPlanSheetRows.filter((item) => item.planId === planId), [planId]);
  const initialBurnRowsMap = useMemo<Record<string, BurnRow>>(
    () => Object.fromEntries(initialBurnRows.map((row) => [row.id, row])),
    [initialBurnRows]
  );
  const [changedBurnRowIds, setChangedBurnRowIds] = useState<Set<string>>(() => new Set());
  const [editingChecksumRowId, setEditingChecksumRowId] = useState<string | null>(null);

  const filteredBurnRows = useMemo(() => {
    const keyword = burnKeyword.trim().toLowerCase();
    if (!keyword) {
      return burnRows;
    }
    return burnRows.filter((row) =>
      [row.taskNo, row.materialCode, row.materialName, row.icPartNo, row.icModel, row.programName, row.checksum, row.softwarePath].some(
        (field) => (field ?? '').toLowerCase().includes(keyword)
      )
    );
  }, [burnKeyword, burnRows]);

  const filteredProductionRows = useMemo(() => {
    const keyword = productionKeyword.trim().toLowerCase();
    if (!keyword) {
      return productionRows;
    }
    return productionRows.filter((row) =>
      [row.week, row.taskNo, row.materialCode, row.name].some((field) => field.toLowerCase().includes(keyword))
    );
  }, [productionKeyword, productionRows]);

  const burnRowSpanMap = useMemo(() => {
    const spanMap: Record<string, number> = {};
    let start = 0;
    while (start < filteredBurnRows.length) {
      const current = filteredBurnRows[start];
      const groupKey = `${current.taskNo}|${current.materialCode}|${current.materialName}|${current.quantity}`;
      let end = start + 1;
      while (end < filteredBurnRows.length) {
        const next = filteredBurnRows[end];
        const nextKey = `${next.taskNo}|${next.materialCode}|${next.materialName}|${next.quantity}`;
        if (nextKey !== groupKey) {
          break;
        }
        end += 1;
      }
      const span = end - start;
      spanMap[current.id] = span;
      for (let i = start + 1; i < end; i += 1) {
        spanMap[filteredBurnRows[i].id] = 0;
      }
      start = end;
    }
    return spanMap;
  }, [filteredBurnRows]);

  const editable = isChangeEdit ? true : currentStatus !== '已提交';

  const showBurnTablePreview =
    currentStatus === '待确认' || currentStatus === '已提交' || currentStatus === '匹配异常';

  const canSubmit =
    !['匹配异常', '匹配失败', '匹配中'].includes(currentStatus ?? '') &&
    ((currentStatus === '待确认' && !isChangeEdit) || (isChangeEdit && currentStatus === '已提交'));

  const userOptions = useMemo(
    () => mockUsers.map((user) => ({ label: `${user.name}（${user.employeeId}）`, value: user.id })),
    []
  );
  const teamOptions = useMemo(
    () => mockTeams.map((team) => ({ label: team.name, value: team.id })),
    []
  );

  const emailMarkedRows = useMemo(() => buildEmailMarkedBurnRows(burnRows), [burnRows]);
  const includeExcelAttachment = Form.useWatch('includeExcelAttachment', submitForm) ?? true;

  const handleBurnQuery = () => {
    setBurnKeyword(burnKeywordInput);
  };

  const handleProductionQuery = () => {
    setProductionKeyword(productionKeywordInput);
  };

  const updateBurnRow = (id: string, patch: Partial<BurnRow>) => {
    setBurnRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const next = { ...item, ...patch };
        const baseline = initialBurnRowsMap[id];
        const isChanged = baseline
          ? JSON.stringify(next) !== JSON.stringify(baseline)
          : true;
        setChangedBurnRowIds((prevIds) => {
          const nextIds = new Set(prevIds);
          if (isChanged) {
            nextIds.add(id);
          } else {
            nextIds.delete(id);
          }
          return nextIds;
        });
        return next;
      })
    );
  };
  const hasProgramName = (row: BurnRow) => row.programName.trim().length > 0;

  const shouldShowBurnDetailFields = (row: BurnRow) =>
    hasProgramName(row) || row.programMatchStatus === 'not_found';

  const getProgramNameInputStatus = (row: BurnRow): 'error' | 'warning' | undefined => {
    if (row.shouldBurn !== '是' && row.programMatchStatus !== 'updated' && row.programMatchStatus !== 'not_found') {
      return undefined;
    }
    if (row.programMatchStatus === 'not_found' && !row.programName.trim()) {
      return 'error';
    }
    if (row.programMatchStatus === 'updated') {
      return 'warning';
    }
    return undefined;
  };

  useEffect(() => {
    setBurnRows(initialBurnRows);
    setChangedBurnRowIds(new Set());
  }, [initialBurnRows]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHANGE_REASON_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      const valid = parsed
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      if (valid.length) {
        setChangeReasonOptions(Array.from(new Set([...DEFAULT_CHANGE_REASONS, ...valid])));
      }
    } catch {
      // ignore invalid localStorage payload
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SUBMIT_CONTACTS_STORAGE_KEY);
      if (!raw) {
        setSubmitContactsByPlan(mockPlanSubmitContacts);
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, SubmitContactsDraft>;
      setSubmitContactsByPlan({ ...mockPlanSubmitContacts, ...parsed });
    } catch {
      setSubmitContactsByPlan(mockPlanSubmitContacts);
    }
  }, []);

  const handleAddChangeReason = () => {
    const next = newChangeReason.trim();
    if (!next) {
      message.warning('请先输入要添加的变更原因');
      return;
    }
    if (changeReasonOptions.includes(next)) {
      message.info('该变更原因已存在');
      setNewChangeReason('');
      return;
    }
    const nextOptions = [...changeReasonOptions, next];
    setChangeReasonOptions(nextOptions);
    setNewChangeReason('');
    window.localStorage.setItem(CHANGE_REASON_STORAGE_KEY, JSON.stringify(nextOptions));
    changeForm.setFieldValue('reason', next);
    message.success('变更原因已添加并保存');
  };

  const validateSubmit = () => {
    if (currentStatus === '匹配异常') {
      Modal.error({
        title: '提交校验失败',
        content: '当前计划存在 BOM 匹配异常，不允许提交。请修正数据源后重新匹配。',
      });
      return false;
    }
    const notFoundEmptyRows = burnRows.filter(
      (row) => row.programMatchStatus === 'not_found' && !row.programName.trim()
    );
    if (notFoundEmptyRows.length) {
      Modal.error({
        title: '提交校验失败',
        content: `存在 ${notFoundEmptyRows.length} 条履历表未匹配到软件且程序名称为空的记录，请先补齐程序名称。`,
      });
      return false;
    }
    const invalidRows = burnRows.filter((row) => row.shouldBurn === '是' && !row.programName.trim());
    if (invalidRows.length) {
      Modal.error({
        title: '提交校验失败',
        content: `存在 ${invalidRows.length} 条“需烧录但无程序名称”的记录，请先补齐程序名称。`,
      });
      return false;
    }
    return true;
  };

  const runSubmit = (submitValues: SubmitConfirmFormValues) => {
    setSubmitting(true);
    window.setTimeout(() => {
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const target = mockProductionPlans.find((item) => item.id === planId);
      if (target) {
        target.status = '已提交';
        target.submittedAt = now;
      }
      setCurrentStatus('已提交');
      const changeDetails = changeForm.getFieldsValue();
      const markSummary =
        emailMarkedRows.length > 0
          ? `；邮件正文含 ${emailMarkedRows.length} 条标记板卡（橙/红）`
          : '；邮件正文无标记板卡';
      const submitLog: PlanOperationLog = {
        id: `LOG-${Date.now()}`,
        planId,
        operatedAt: now,
        operator: '当前用户',
        actionType: isChangeEdit ? '变更' : '提交',
        summary: isChangeEdit
          ? `变更内容：原因=${changeDetails.reason ?? '-'}；影响范围=${changeDetails.impactScope ?? '-'}；备注=${changeDetails.remark || '-'}${markSummary}`
          : submitValues.includeExcelAttachment
            ? `提交计划并发送通知邮件（含Excel附件）${markSummary}`
            : `提交计划并发送通知邮件（仅正文，不含Excel附件）${markSummary}`,
      };
      setLogRows((prev) => [submitLog, ...prev]);
      mockPlanOperationLogs.unshift(submitLog);
      setSubmitting(false);
      setSubmitModalOpen(false);
      const savedContacts: SubmitContactsDraft = {
        senderIds: submitValues.senderIds,
        ccIds: submitValues.ccIds,
        ccTeamId: submitValues.ccTeamId,
        includeExcelAttachment: submitValues.includeExcelAttachment,
      };
      setSubmitContactsByPlan((prev) => {
        const next = { ...prev, [planId]: savedContacts };
        window.localStorage.setItem(SUBMIT_CONTACTS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      submitForm.setFieldsValue(savedContacts);
      message.success(
        isChangeEdit
          ? '变更提交成功，已进入审批流程（Mock）'
          : submitValues.includeExcelAttachment
            ? '提交成功，邮件将携带Excel附件（Mock）'
            : '提交成功，邮件仅发送正文（Mock）'
      );
    }, 500);
  };

  const appendUsersByTeam = (fieldName: 'senderIds' | 'ccIds', teamId?: string) => {
    if (!teamId) {
      return;
    }
    const teamMemberIds = mockTeamMemberIds[teamId] ?? [];
    const current = submitForm.getFieldValue(fieldName) ?? [];
    const merged = Array.from(new Set([...current, ...teamMemberIds]));
    submitForm.setFieldsValue({ [fieldName]: merged });
  };

  const handleConfirmSubmit = async () => {
    const submitValues = await submitForm.validateFields();
    runSubmit(submitValues);
  };

  const handleSubmit = async () => {
    if (!plan) {
      message.warning('计划不存在，无法提交');
      return;
    }
    if (!editable) {
      message.warning('已提交计划不可再次提交');
      return;
    }
    if (!isChangeEdit && currentStatus !== '待确认') {
      message.warning('当前状态不可提交，请在待确认状态下提交');
      return;
    }
    if (!validateSubmit()) {
      return;
    }
    if (isChangeEdit) {
      await changeForm.validateFields();
    }
    const cachedContacts = submitContactsByPlan[planId];
    submitForm.setFieldsValue({
      senderIds: cachedContacts?.senderIds ?? [],
      ccIds: cachedContacts?.ccIds ?? [],
      ccTeamId: cachedContacts?.ccTeamId,
      includeExcelAttachment: cachedContacts?.includeExcelAttachment ?? true,
    });
    setSubmitModalOpen(true);
  };

  const handleSave = async () => {
    if (!editable) {
      message.warning('已提交计划不可修改');
      return;
    }
    if (isChangeEdit) {
      await changeForm.validateFields();
    }
    message.success('保存成功');
  };

  const burnColumns: TableProps<BurnRow>['columns'] = [
    {
      title: '生产任务单编号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 170,
      onCell: (record) => ({ rowSpan: burnRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '物料代码',
      dataIndex: 'materialCode',
      key: 'materialCode',
      width: 160,
      onCell: (record) => ({ rowSpan: burnRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '物料名称',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 220,
      onCell: (record) => ({ rowSpan: burnRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      onCell: (record) => ({ rowSpan: burnRowSpanMap[record.id] ?? 1 }),
    },
    {
      title: 'IC料号',
      dataIndex: 'icPartNo',
      key: 'icPartNo',
      width: 150,
      render: (value: string, record) => (record.bomMatchFailed ? '-' : value),
    },
    {
      title: 'IC型号',
      dataIndex: 'icModel',
      key: 'icModel',
      width: 150,
      render: (value: string, record) => (record.bomMatchFailed ? '-' : value),
    },
    {
      title: '程序名称',
      dataIndex: 'programName',
      key: 'programName',
      width: 220,
      render: (value: string, record) => {
        if (record.bomMatchFailed) {
          return <Typography.Text type="danger">BOM 未匹配</Typography.Text>;
        }
        return (
          <Input
            value={value}
            disabled={!editable}
            placeholder="请输入程序名称"
            status={getProgramNameInputStatus(record)}
            onChange={(e) => {
              const nextName = e.target.value;
              if (!nextName.trim()) {
                updateBurnRow(record.id, {
                  programName: nextName,
                  checksum: undefined,
                  shouldBurn: record.programMatchStatus === 'not_found' ? '是' : undefined,
                  softwarePath: undefined,
                });
                return;
              }
              updateBurnRow(record.id, { programName: nextName });
            }}
          />
        );
      },
    },
    {
      title: 'checksum值',
      dataIndex: 'checksum',
      key: 'checksum',
      width: 180,
      render: (value: string | undefined, record) => {
        if (!hasProgramName(record)) {
          return '';
        }
        if (editable && editingChecksumRowId === record.id) {
          return (
            <Input
              autoFocus
              value={value ?? ''}
              placeholder="请输入 checksum 值"
              onChange={(e) => updateBurnRow(record.id, { checksum: e.target.value })}
              onBlur={() => setEditingChecksumRowId(null)}
              onPressEnter={() => setEditingChecksumRowId(null)}
            />
          );
        }
        return (
          <span
            title={editable ? '双击编辑' : undefined}
            onDoubleClick={() => {
              if (editable) {
                setEditingChecksumRowId(record.id);
              }
            }}
            style={{ cursor: editable ? 'text' : 'default', display: 'block', minHeight: 32, lineHeight: '32px' }}
          >
            {value ?? ''}
          </span>
        );
      },
    },
    {
      title: '是否烧录',
      dataIndex: 'shouldBurn',
      key: 'shouldBurn',
      width: 120,
      render: (value, record) =>
        shouldShowBurnDetailFields(record) ? (
          <Select
            style={{ width: 90 }}
            value={value}
            disabled={!editable}
            options={[
              { label: '是', value: '是' },
              { label: '否', value: '否' },
            ]}
            onChange={(nextValue) => updateBurnRow(record.id, { shouldBurn: nextValue })}
          />
        ) : (
          ''
        ),
    },
    {
      title: '软件存放路径',
      dataIndex: 'softwarePath',
      key: 'softwarePath',
      width: 280,
      ellipsis: true,
      render: (value: string | undefined, record) => (hasProgramName(record) ? value ?? '' : ''),
    },
  ];

  const logColumns: TableProps<PlanOperationLog>['columns'] = [
    { title: '时间', dataIndex: 'operatedAt', key: 'operatedAt', width: 170 },
    { title: '操作人', dataIndex: 'operator', key: 'operator', width: 120 },
    { title: '动作类型', dataIndex: 'actionType', key: 'actionType', width: 120 },
    { title: '摘要', dataIndex: 'summary', key: 'summary' },
  ];

  const productionColumns: TableProps<PlanSheetRow>['columns'] = [
    { title: '周次', dataIndex: 'week', key: 'week', width: 100 },
    { title: '生产任务单编号', dataIndex: 'taskNo', key: 'taskNo', width: 170 },
    { title: '物料代码', dataIndex: 'materialCode', key: 'materialCode', width: 160 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 100 },
  ];

  if (!plan) {
    return (
      <Card>
        <Empty description="计划不存在或已被删除">
          <Button onClick={() => navigate(plansPathWithFactory)}>返回计划列表</Button>
        </Empty>
      </Card>
    );
  }

  return (
    <div style={{ minHeight: PAGE_MIN_HEIGHT }}>
      <Card style={{ marginBottom: SPACING.md }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(plansPathWithFactory)}>
              返回
            </Button>
            <strong>{plan.planName}</strong>
            {currentStatus ? <Tag color={STATUS_COLOR_MAP[currentStatus]}>{currentStatus}</Tag> : null}
            {isChangeEdit && <Tag color="purple">变更编辑态</Tag>}
          </Space>
          <Space>
            <Button icon={<SaveOutlined />} onClick={() => void handleSave()} disabled={!editable}>
              保存
            </Button>
            <Button type="primary" loading={submitting} onClick={() => void handleSubmit()} disabled={!canSubmit}>
              {isChangeEdit ? '提交变更' : '提交'}
            </Button>
          </Space>
        </Space>
      </Card>

      {isChangeEdit ? (
        <Card style={{ marginBottom: SPACING.md }}>
          <Form<ChangeDetailFormValues> form={changeForm} layout="vertical">
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <Form.Item
                style={{ width: 280 }}
                name="reason"
                label="变更原因"
                rules={[{ required: true, message: '请输入变更原因' }]}
              >
                <Select
                  showSearch
                  placeholder="请选择变更原因"
                  options={changeReasonOptions.map((item) => ({ label: item, value: item }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 8px', width: '100%' }}>
                        <Input
                          placeholder="输入自定义变更原因"
                          value={newChangeReason}
                          onChange={(e) => setNewChangeReason(e.target.value)}
                          onPressEnter={handleAddChangeReason}
                        />
                        <Button type="primary" onClick={handleAddChangeReason}>
                          添加
                        </Button>
                      </Space>
                    </>
                  )}
                />
              </Form.Item>
              <Form.Item
                style={{ flex: 1, minWidth: 0 }}
                name="impactScope"
                label="影响范围"
                rules={[{ required: true, message: '请输入影响范围' }]}
              >
                <Input placeholder="请输入影响范围（板卡/工单等）" />
              </Form.Item>
            </div>
            <Form.Item name="remark" label="备注">
              <Input placeholder="可选填写" />
            </Form.Item>
          </Form>
        </Card>
      ) : null}

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'burn' | 'log' | 'production')}
          items={[
            {
              key: 'burn',
              label: '软件烧录表',
              children: (
                <>
                  {currentStatus === '匹配异常' ? (
                    <Typography.Text type="danger" style={{ display: 'block', marginBottom: SPACING.sm }}>
                      存在 BOM 匹配异常行（整行标红），当前计划不允许提交，请修正 Oracle BOM 数据后重新匹配。
                    </Typography.Text>
                  ) : null}
                  {!showBurnTablePreview ? (
                    <Empty
                      description={
                        currentStatus === '匹配失败'
                          ? '匹配失败，暂无软件烧录表数据（环境异常导致匹配中断）'
                          : '匹配进行中，请稍后刷新查看软件烧录表'
                      }
                    />
                  ) : (
                    <>
                      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: SPACING.sm }}>
                        <Button icon={<DownloadOutlined />} onClick={() => message.success('导出成功（Mock）')}>
                          导出
                        </Button>
                        <Space>
                          <Input
                            allowClear
                            style={{ width: FILTER_CONTROL_WIDTH.searchWide }}
                            prefix={<SearchOutlined />}
                            placeholder="搜索任务单/物料代码/物料名称/IC料号/程序名称"
                            value={burnKeywordInput}
                            onChange={(e) => setBurnKeywordInput(e.target.value)}
                            onPressEnter={handleBurnQuery}
                          />
                          <Button onClick={handleBurnQuery}>查询</Button>
                        </Space>
                      </Space>
                      <Table
                        rowKey="id"
                        columns={burnColumns}
                        dataSource={filteredBurnRows}
                        pagination={false}
                        scroll={{ x: 1800 }}
                        onRow={(record) => {
                          if (record.bomMatchFailed) {
                            return { style: { backgroundColor: BOM_FAILED_ROW_BG } };
                          }
                          if (isChangeEdit && changedBurnRowIds.has(record.id)) {
                            return { style: { backgroundColor: '#fff7e6' } };
                          }
                          return {};
                        }}
                      />
                    </>
                  )}
                </>
              ),
            },
            {
              key: 'log',
              label: '操作日志',
              children: <Table rowKey="id" columns={logColumns} dataSource={logRows} pagination={false} scroll={{ x: 900 }} />,
            },
            {
              key: 'production',
              label: '生产计划表',
              children: (
                <>
                  <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: SPACING.sm }}>
                    <Button icon={<DownloadOutlined />} onClick={() => message.success('导出成功（Mock）')}>
                      导出
                    </Button>
                    <Space>
                      <Input
                        allowClear
                        style={{ width: FILTER_CONTROL_WIDTH.searchWide }}
                        prefix={<SearchOutlined />}
                        placeholder="搜索周次/任务单/物料代码/名称"
                        value={productionKeywordInput}
                        onChange={(e) => setProductionKeywordInput(e.target.value)}
                        onPressEnter={handleProductionQuery}
                      />
                      <Button onClick={handleProductionQuery}>查询</Button>
                    </Space>
                  </Space>
                  <Table
                    rowKey="id"
                    columns={productionColumns}
                    dataSource={filteredProductionRows}
                    pagination={false}
                    scroll={{ x: 900 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="提交确认"
        open={submitModalOpen}
        width={1080}
        onCancel={() => setSubmitModalOpen(false)}
        onOk={() => void handleConfirmSubmit()}
        okText="确认提交"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form<SubmitConfirmFormValues> form={submitForm} layout="vertical">
          <Form.Item
            label="发送人"
            name="senderIds"
            rules={[{ required: true, type: 'array', min: 1, message: '请至少选择一个发送人' }]}
            style={{ marginBottom: 12 }}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="支持输入人名模糊搜索，可多选"
              options={userOptions}
            />
          </Form.Item>

          <Form.Item label="抄送" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="ccIds" noStyle>
                <Select
                  mode="multiple"
                  showSearch
                  optionFilterProp="label"
                  style={{ flex: 1, minWidth: 0 }}
                  placeholder="支持输入人名模糊搜索，可多选"
                  options={userOptions}
                />
              </Form.Item>
              <Form.Item name="ccTeamId" noStyle>
                <Select
                  allowClear
                  style={{ width: 220 }}
                  placeholder="选择团队带出成员"
                  options={teamOptions}
                  onChange={(teamId) => appendUsersByTeam('ccIds', teamId)}
                />
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item
            label="是否带Excel附件"
            name="includeExcelAttachment"
            initialValue={true}
            style={{ marginTop: 12, marginBottom: 0 }}
          >
            <Radio.Group
              options={[
                { label: '是', value: true },
                { label: '否', value: false },
              ]}
            />
          </Form.Item>

          <Divider style={{ margin: `${SPACING.md}px 0` }} />

          <Typography.Text strong>邮件正文预览 · 标记板卡明细</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginTop: SPACING.xs, marginBottom: SPACING.sm }}>
            计划：{plan.planName}（{plan.week}）
            {includeExcelAttachment ? '；附件含完整软件烧录表 Excel' : '；仅发送正文，不含 Excel 附件'}
          </Typography.Paragraph>
          {emailMarkedRows.length ? (
            <Table
              size="small"
              rowKey="key"
              columns={EMAIL_MARK_PREVIEW_COLUMNS}
              dataSource={emailMarkedRows}
              pagination={false}
              scroll={{ x: 980, y: 220 }}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本计划无橙色/红色标记板卡" />
          )}
        </Form>
      </Modal>
    </div>
  );
}
