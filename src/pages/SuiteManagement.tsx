/**
 * @page 套件管理
 * @version V1.0.1-P6
 * @base docs/prd/V1.0.1-P5/ATO_V1.0.1-P5-页面需求与交互规格.md 第 3.1 节（P6 并行配置待 PRD 同步）
 * @changes
 *   - V1.0.1-P5: 列表/新建编辑/删除；用例范围与测试运行「执行范围」同构（无并行配置）；Mock `mockSuites`
 *   - V1.0.1-P5: 验收 — 新建按钮文案「新建测试套件」；弹窗内「所属模块」为 包含/不包含+模块 可多行（无行内标签）；「标签」为 等于/包含/不包含+标签值 可多行
 *   - V1.0.1-P5: 列表「用例范围」列两行展示（模块 / 标签条件），单行省略，悬停 Tooltip 展示全文
 *   - V1.0.1-P6: 新建/编辑弹窗增加「并行配置」区块，组件与交互与测试运行「创建自测任务」同构（分组方式、串并行步骤、线程数；不含模版选择与另存为模版）
 */
import { useMemo, useState, type CSSProperties } from 'react';
import {
  DEFAULT_PARALLEL_FORM_FIELDS,
  ParallelRunConfigFormSection,
  parallelConfigFromForm,
  parallelConfigToFormFields,
} from '@/components/ParallelRunConfigFormSection';
import { useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Col,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type {
  CaseModule,
  SuiteModuleScopeRow,
  SuiteParallelConfigPersist,
  SuiteScopePersist,
  SuiteTagScopeRow,
  VersionSuite,
} from '@/types';
import type { ParallelPlanStepForm } from '@/utils/parallelRunWizardShared';
import { formatSuiteScopeSummaryLines } from '@/utils/suiteScopeDisplay';
import { mockCaseModules, mockSuites, mockTestCases } from '@/mocks/data';

const MODULE_ROOT_ALL = '__root_all__';

const MODULE_RELATION_OPTIONS = [
  { value: 'include' as const, label: '包含' },
  { value: 'exclude' as const, label: '不包含' },
];

const TAG_RELATION_OPTIONS = [
  { value: 'eq' as const, label: '等于' },
  { value: 'include' as const, label: '包含' },
  { value: 'exclude' as const, label: '不包含' },
];

type SuiteFormValues = {
  name: string;
  description?: string;
  moduleRows: SuiteModuleScopeRow[];
  tagRows: SuiteTagScopeRow[];
  parallelGroupType: 'module' | 'group';
  parallelPlanSteps: ParallelPlanStepForm[];
  parallelThreadCount: number;
};

function formatScopeSummary(scope: SuiteScopePersist, modules: CaseModule[]): string {
  const { moduleLine, tagLine } = formatSuiteScopeSummaryLines(scope, modules);
  return `${moduleLine}${tagLine}`;
}

function makeId(): string {
  return `suite-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function cloneParallel(par?: SuiteParallelConfigPersist): SuiteParallelConfigPersist | undefined {
  if (!par?.parallelPlanSteps?.length) return undefined;
  return {
    parallelGroupType: par.parallelGroupType,
    parallelPlanSteps: par.parallelPlanSteps.map((s) => ({
      stepKind: s.stepKind,
      selection: [...(s.selection ?? [])],
    })),
    parallelThreadCount: par.parallelThreadCount,
  };
}

function cloneScope(sc?: SuiteScopePersist): SuiteScopePersist {
  if (!sc?.moduleRows?.length) {
    return {
      moduleRows: [{ relation: 'include', moduleIds: [] }],
      tagRows: [{ relation: 'eq', tags: [] }],
    };
  }
  return {
    moduleRows: sc.moduleRows.map((r) => ({
      relation: r.relation,
      moduleIds: [...(r.moduleIds ?? [])],
    })),
    tagRows: (sc.tagRows?.length ? sc.tagRows : [{ relation: 'eq' as const, tags: [] }]).map((r) => ({
      relation: r.relation,
      tags: [...(r.tags ?? [])],
    })),
  };
}

export function SuiteManagement() {
  const { projectId = '', versionId = '' } = useParams<{ projectId: string; versionId: string }>();
  const modules = useMemo(
    () => mockCaseModules.filter((m) => m.versionId === versionId),
    [versionId]
  );
  const moduleSelectOptions = useMemo(() => {
    const root = modules.find((m) => m.parentId === null);
    const opts: { value: string; label: string }[] = [];
    if (root) {
      opts.push({ value: MODULE_ROOT_ALL, label: root.name });
    }
    modules
      .filter((m) => m.id !== root?.id)
      .forEach((m) => opts.push({ value: m.id, label: m.name }));
    return opts;
  }, [modules]);

  const tagSelectOptions = useMemo(() => {
    const s = new Set<string>();
    mockTestCases.filter((c) => c.versionId === versionId).forEach((c) => c.tags.forEach((t) => s.add(t)));
    ['smoke', 'P0', 'P1', 'UI', 'risk', 'recon', 'coupon', '退款', '异常'].forEach((t) => s.add(t));
    return [...s].sort().map((t) => ({ value: t, label: t }));
  }, [versionId]);

  const [rows, setRows] = useState<VersionSuite[]>(() =>
    mockSuites.map((s) => ({
      ...s,
      scope: s.scope ? cloneScope(s.scope) : undefined,
      parallel: cloneParallel(s.parallel),
    }))
  );
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VersionSuite | null>(null);
  const [form] = Form.useForm<SuiteFormValues>();

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(k));
  }, [rows, keyword]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      name: '',
      description: '',
      moduleRows: [{ relation: 'include', moduleIds: [] }],
      tagRows: [{ relation: 'eq', tags: [] }],
      ...DEFAULT_PARALLEL_FORM_FIELDS,
    });
    setModalOpen(true);
  };

  const openEdit = (row: VersionSuite) => {
    setEditing(row);
    const sc = cloneScope(row.scope);
    form.setFieldsValue({
      name: row.name,
      description: row.description,
      moduleRows: sc.moduleRows,
      tagRows: sc.tagRows?.length ? sc.tagRows : [{ relation: 'eq', tags: [] }],
      ...parallelConfigToFormFields(row.parallel),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    try {
      const v = await form.validateFields();
      if (rows.some((r) => r.name === v.name && r.id !== editing?.id)) {
        message.error('套件名称已存在');
        return;
      }
      const tagRowsClean = (v.tagRows ?? []).filter((r) => (r.tags?.length ?? 0) > 0);
      const scope: SuiteScopePersist = {
        moduleRows: v.moduleRows ?? [],
        tagRows: tagRowsClean.length ? tagRowsClean : [],
      };
      const scopeSummary = formatScopeSummary(scope, modules);
      const parallel = parallelConfigFromForm(v);
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      if (editing) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === editing.id
              ? {
                  ...r,
                  name: v.name,
                  description: v.description,
                  scope,
                  scopeSummary,
                  parallel,
                }
              : r
          )
        );
        message.success('已保存');
      } else {
        setRows((prev) => [
          {
            id: makeId(),
            name: v.name,
            description: v.description,
            scope,
            scopeSummary,
            parallel,
            createdAt: now,
            createdBy: '当前用户（Mock）',
          },
          ...prev,
        ]);
        message.success('已创建测试套件');
      }
      setModalOpen(false);
    } catch {
      /* validate */
    }
  };

  const removeRow = (row: VersionSuite) => {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除${row.name}套件？`,
      onOk: () => {
        setRows((p) => p.filter((r) => r.id !== row.id));
        message.success('已删除');
      },
    });
  };

  const columns: ColumnsType<VersionSuite> = useMemo(
    () => [
      { title: '套件名称', dataIndex: 'name', ellipsis: true },
      {
        title: '用例范围',
        key: 'scopeDisplay',
        render: (_, r) => <ScopeSummaryCell record={r} modules={modules} />,
      },
      { title: '套件说明', dataIndex: 'description', ellipsis: true },
      { title: '创建时间', dataIndex: 'createdAt', width: 160 },
      { title: '创建人', dataIndex: 'createdBy', width: 140 },
      {
        title: '操作',
        key: 'op',
        width: 120,
        render: (_, r) => (
          <Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
              编辑
            </Button>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(r)}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [modules]
  );

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建测试套件
          </Button>
          <Input.Search
            placeholder="套件名称"
            allowClear
            style={{ maxWidth: 280 }}
            onSearch={setKeyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterButton
          />
        </Space>
        {filtered.length ? (
          <Table rowKey="id" size="small" columns={columns} dataSource={filtered} pagination={{ pageSize: 8 }} />
        ) : (
          <Empty description="暂无套件，点击「新建测试套件」开始" />
        )}
        <SuiteMetaHint projectId={projectId} versionId={versionId} />
      </Space>

      <Modal
        title={editing ? '编辑套件' : '新建测试套件'}
        open={modalOpen}
        onOk={submit}
        onCancel={() => setModalOpen(false)}
        width={800}
        destroyOnClose
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="套件名称" rules={[{ required: true, message: '请输入套件名称' }]}>
            <Input placeholder="唯一名称" />
          </Form.Item>
          <div
            style={{
              background: '#fafafa',
              borderRadius: 8,
              padding: 16,
              border: '1px solid #f0f0f0',
              marginBottom: 16,
            }}
          >
            <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
              用例范围
            </Typography.Text>
            <Form.Item label="所属模块" required>
              <Form.List name="moduleRows">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    {fields.map((field) => (
                      <Row key={field.key} gutter={8} wrap={false} align="middle">
                        <Col flex="108px">
                          <Form.Item
                            name={[field.name, 'relation']}
                            rules={[{ required: true, message: '请选择' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Select placeholder="请选择" options={MODULE_RELATION_OPTIONS} />
                          </Form.Item>
                        </Col>
                        <Col flex="auto">
                          <Form.Item
                            name={[field.name, 'moduleIds']}
                            rules={[
                              { required: true, message: '请选择模块' },
                              { type: 'array', min: 1, message: '请选择模块' },
                            ]}
                            style={{ marginBottom: 0 }}
                          >
                            <Select
                              mode="multiple"
                              placeholder="请选择模块"
                              options={moduleSelectOptions}
                              maxTagCount="responsive"
                            />
                          </Form.Item>
                        </Col>
                        <Col flex="none">
                          <Space size={4}>
                            {fields.length > 1 ? (
                              <Button
                                type="text"
                                danger
                                icon={<MinusCircleOutlined />}
                                onClick={() => remove(field.name)}
                                aria-label="删除所属模块行"
                              />
                            ) : null}
                            {field.name === fields[fields.length - 1]?.name ? (
                              <Button
                                type="text"
                                icon={<PlusOutlined />}
                                onClick={() => add({ relation: 'include', moduleIds: [] })}
                                aria-label="添加所属模块行"
                              />
                            ) : null}
                          </Space>
                        </Col>
                      </Row>
                    ))}
                  </Space>
                )}
              </Form.List>
            </Form.Item>

            <Form.Item label="标签">
              <Form.List name="tagRows">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    {fields.map((field) => (
                      <Row key={field.key} gutter={8} wrap={false} align="middle">
                        <Col flex="108px">
                          <Form.Item
                            name={[field.name, 'relation']}
                            rules={[{ required: true, message: '请选择' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Select placeholder="请选择" options={TAG_RELATION_OPTIONS} />
                          </Form.Item>
                        </Col>
                        <Col flex="auto">
                          <Form.Item name={[field.name, 'tags']} style={{ marginBottom: 0 }}>
                            <Select
                              mode="multiple"
                              placeholder="请选择标签"
                              options={tagSelectOptions}
                              allowClear
                              maxTagCount="responsive"
                            />
                          </Form.Item>
                        </Col>
                        <Col flex="none">
                          <Space size={4}>
                            {fields.length > 1 ? (
                              <Button
                                type="text"
                                danger
                                icon={<MinusCircleOutlined />}
                                onClick={() => remove(field.name)}
                                aria-label="删除标签行"
                              />
                            ) : null}
                            {field.name === fields[fields.length - 1]?.name ? (
                              <Button
                                type="text"
                                icon={<PlusOutlined />}
                                onClick={() => add({ relation: 'eq', tags: [] })}
                                aria-label="添加标签行"
                              />
                            ) : null}
                          </Space>
                        </Col>
                      </Row>
                    ))}
                  </Space>
                )}
              </Form.List>
            </Form.Item>
          </div>
          <ParallelRunConfigFormSection versionModules={modules} />
          <Form.Item name="description" label="套件说明">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

function ScopeSummaryCell({ record, modules }: { record: VersionSuite; modules: CaseModule[] }) {
  const { moduleLine, tagLine, tooltipTitle } = useMemo(() => {
    if (record.scope) {
      const lines = formatSuiteScopeSummaryLines(record.scope, modules);
      return {
        moduleLine: lines.moduleLine,
        tagLine: lines.tagLine,
        tooltipTitle: (
          <div>
            <div>{lines.moduleLine}</div>
            <div>{lines.tagLine}</div>
          </div>
        ),
      };
    }
    const raw = record.scopeSummary ?? '—';
    const splitIdx = raw.indexOf('标签条件：');
    if (splitIdx >= 0) {
      return {
        moduleLine: raw.slice(0, splitIdx),
        tagLine: raw.slice(splitIdx),
        tooltipTitle: (
          <div>
            <div>{raw.slice(0, splitIdx)}</div>
            <div>{raw.slice(splitIdx)}</div>
          </div>
        ),
      };
    }
    return {
      moduleLine: raw,
      tagLine: '',
      tooltipTitle: raw,
    };
  }, [record.scope, record.scopeSummary, modules]);

  const textStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    marginBottom: 0,
    lineHeight: 1.35,
  };

  const inner = (
    <div style={{ minWidth: 0, maxWidth: '100%' }}>
      <Typography.Text ellipsis style={textStyle}>
        {moduleLine}
      </Typography.Text>
      {tagLine ? (
        <Typography.Text type="secondary" ellipsis style={textStyle}>
          {tagLine}
        </Typography.Text>
      ) : null}
    </div>
  );

  return (
    <Tooltip title={tooltipTitle} placement="topLeft" styles={{ root: { maxWidth: 560 } }}>
      {inner}
    </Tooltip>
  );
}

function SuiteMetaHint({ projectId, versionId }: { projectId: string; versionId: string }) {
  return (
    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
      Mock 数据 · 项目 {projectId} · 版本 {versionId}（与 `mockCaseModules` / `mockTestCases` 对齐）
    </span>
  );
}
