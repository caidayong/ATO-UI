/**
 * 创建自测任务 / 套件管理 等表单内共用的「并行配置」区块
 */
import { useEffect, useMemo } from 'react';
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Tooltip,
  TreeSelect,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { InfoCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { CaseModule } from '@/types';
import {
  buildFirstLevelModuleTreeData,
  collectSelectableFirstLevelLeafIds,
  invertFirstLevelSelection,
  maxParallelSelectionCount,
  parallelPlanSelectionsEqual,
  pruneParallelPlanStepSelections,
  selectionUsedInStepsBefore,
  type ParallelPlanStepForm,
} from '@/utils/parallelRunWizardShared';
import { mockTagManagementGroups } from '@/mocks/data';

export const DEFAULT_PARALLEL_FORM_FIELDS = {
  parallelGroupType: 'module' as const,
  parallelPlanSteps: [] as ParallelPlanStepForm[],
  parallelThreadCount: 1,
};

type Props = {
  versionModules: CaseModule[];
  /** 外层是否已包灰色卡片；为 false 时仅输出表单项 */
  bordered?: boolean;
  showSectionTitle?: boolean;
  /** 平台自动化编辑模式等只读场景 */
  disabled?: boolean;
};

export function useParallelRunConfigFormSync(form: FormInstance) {
  const watchedParallelSteps = Form.useWatch('parallelPlanSteps', form);

  useEffect(() => {
    const steps = watchedParallelSteps as ParallelPlanStepForm[] | undefined;
    if (!steps?.length) return;
    const pruned = pruneParallelPlanStepSelections(steps);
    if (!parallelPlanSelectionsEqual(steps, pruned)) {
      form.setFieldValue('parallelPlanSteps', pruned);
    }
  }, [watchedParallelSteps, form]);

  useEffect(() => {
    const maxSel = maxParallelSelectionCount(watchedParallelSteps as ParallelPlanStepForm[] | undefined);
    const next = Math.max(1, maxSel);
    const cur = form.getFieldValue('parallelThreadCount');
    if (cur !== next) {
      form.setFieldValue('parallelThreadCount', next);
    }
  }, [watchedParallelSteps, form]);
}

export function ParallelRunConfigFormSection({
  versionModules,
  bordered = true,
  showSectionTitle = true,
  disabled = false,
}: Props) {
  const form = Form.useFormInstance();
  useParallelRunConfigFormSync(form);

  const watchedParallelSteps = Form.useWatch('parallelPlanSteps', form);
  const watchedParallelGroupType = Form.useWatch('parallelGroupType', form);

  const tagManagementGroupSelectOptions = useMemo(
    () => mockTagManagementGroups.map((g) => ({ label: g.name, value: g.id })),
    []
  );

  const hasFirstLevelModuleNodes = useMemo(
    () => buildFirstLevelModuleTreeData(versionModules).length > 0,
    [versionModules]
  );

  const appendParallelPlanStep = (step: ParallelPlanStepForm) => {
    const cur = (form.getFieldValue('parallelPlanSteps') as ParallelPlanStepForm[] | undefined) ?? [];
    form.setFieldValue('parallelPlanSteps', [...cur, step]);
  };

  const inner = (
    <>
      {showSectionTitle ? (
        <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
          并行配置
        </Typography.Text>
      ) : null}
      <div style={{ marginBottom: 12 }}>
        <Row align="middle" gutter={12} wrap>
          <Col flex="none">
            <Typography.Text>
              <Typography.Text type="danger">*</Typography.Text> 分组方式
            </Typography.Text>
          </Col>
          <Col flex="auto">
            <Form.Item
              name="parallelGroupType"
              noStyle
              rules={[{ required: true, message: '请选择分组方式' }]}
            >
              <Radio.Group
                disabled={disabled}
                onChange={() => {
                  if (disabled) return;
                  form.setFieldsValue({
                    parallelPlanSteps: [],
                    parallelThreadCount: 1,
                  });
                }}
              >
                <Radio value="module">按模块</Radio>
                <Radio value="group">按分组</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button
          type="default"
          disabled={disabled}
          onClick={() => appendParallelPlanStep({ stepKind: 'serial', selection: [] })}
        >
          添加串行步骤
        </Button>
        <Button
          type="default"
          disabled={disabled}
          onClick={() => appendParallelPlanStep({ stepKind: 'parallel', selection: [] })}
        >
          添加并行步骤
        </Button>
      </Space>
      <Form.List name="parallelPlanSteps">
        {(fields, { remove }) => {
          const mode = watchedParallelGroupType ?? 'module';
          const steps = watchedParallelSteps as ParallelPlanStepForm[] | undefined;
          return (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {fields.length === 0 ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  可选：添加串行/并行步骤以配置执行顺序与并行度；前序步骤已选模块/分组在后续步骤中不可再选。
                </Typography.Text>
              ) : null}
              {fields.map((field) => {
                const blocked = selectionUsedInStepsBefore(steps, field.name);
                const curSel = steps?.[field.name]?.selection ?? [];
                const rowTreeData = buildFirstLevelModuleTreeData(
                  versionModules,
                  (leafId) => blocked.has(leafId) && !curSel.includes(leafId)
                );
                const selectableModuleIds = collectSelectableFirstLevelLeafIds(rowTreeData);
                const parallelToolbarDisabled = disabled || selectableModuleIds.length === 0;
                return (
                  <Row key={field.key} gutter={8} wrap={false} align="middle">
                    <Col flex="none" style={{ minWidth: 88 }}>
                      <Space size={6} align="center">
                        <Typography.Text strong>{Number(field.name) + 1}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {steps?.[field.name]?.stepKind === 'parallel' ? '并行' : '串行'}
                        </Typography.Text>
                      </Space>
                    </Col>
                    <Col flex="auto">
                      <Form.Item name={[field.name, 'stepKind']} hidden>
                        <Input type="hidden" />
                      </Form.Item>
                      {mode === 'group' ? (
                        <Form.Item
                          name={[field.name, 'selection']}
                          style={{ marginBottom: 0 }}
                          rules={[
                            {
                              validator: async (_, v) => {
                                if (Array.isArray(v) && v.length) return;
                                throw new Error('请选择分组');
                              },
                            },
                          ]}
                        >
                          <Select
                            mode="multiple"
                            placeholder="请选择分组"
                            disabled={disabled}
                            options={tagManagementGroupSelectOptions.map((o) => ({
                              ...o,
                              disabled: blocked.has(o.value) && !curSel.includes(o.value),
                            }))}
                            allowClear
                            maxTagCount="responsive"
                            showSearch
                            optionFilterProp="label"
                          />
                        </Form.Item>
                      ) : (
                        <Form.Item
                          name={[field.name, 'selection']}
                          style={{ marginBottom: 0 }}
                          rules={[
                            {
                              validator: async (_, v) => {
                                if (Array.isArray(v) && v.length) return;
                                throw new Error('请选择一级目录');
                              },
                            },
                          ]}
                        >
                          <TreeSelect
                            treeData={rowTreeData}
                            treeCheckable
                            showCheckedStrategy={TreeSelect.SHOW_CHILD}
                            multiple
                            allowClear
                            showSearch
                            treeNodeFilterProp="title"
                            placeholder="请从用例目录树中选择一级目录"
                            style={{ width: '100%' }}
                            treeDefaultExpandAll
                            disabled={disabled}
                            notFoundContent={
                              hasFirstLevelModuleNodes ? undefined : '当前版本暂无一级子目录'
                            }
                            dropdownRender={(menu) => (
                              <div>
                                <div
                                  style={{
                                    padding: '6px 12px',
                                    borderBottom: '1px solid #f0f0f0',
                                    display: 'flex',
                                    gap: 4,
                                    flexWrap: 'wrap',
                                  }}
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  <Button
                                    type="link"
                                    size="small"
                                    style={{ padding: 0, height: 'auto' }}
                                    disabled={parallelToolbarDisabled}
                                    onClick={() => {
                                      form.setFieldValue(
                                        ['parallelPlanSteps', field.name, 'selection'],
                                        [...selectableModuleIds]
                                      );
                                    }}
                                  >
                                    全选
                                  </Button>
                                  <Button
                                    type="link"
                                    size="small"
                                    style={{ padding: 0, height: 'auto' }}
                                    disabled={parallelToolbarDisabled}
                                    onClick={() => {
                                      const stepsVal = form.getFieldValue(
                                        'parallelPlanSteps'
                                      ) as ParallelPlanStepForm[] | undefined;
                                      const cur = stepsVal?.[field.name]?.selection;
                                      form.setFieldValue(
                                        ['parallelPlanSteps', field.name, 'selection'],
                                        invertFirstLevelSelection(cur, selectableModuleIds)
                                      );
                                    }}
                                  >
                                    反选
                                  </Button>
                                </div>
                                {menu}
                              </div>
                            )}
                          />
                        </Form.Item>
                      )}
                    </Col>
                    <Col flex="none">
                      <Button
                        type="text"
                        danger
                        disabled={disabled}
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                        aria-label="删除该步骤"
                      />
                    </Col>
                  </Row>
                );
              })}
            </Space>
          );
        }}
      </Form.List>
      <Form.Item
        name="parallelThreadCount"
        label={
          <Space size={4}>
            并行线程数
            <Tooltip title="随各「并行」步骤中单步多选数量自动同步（多步取最大，至少为 1），也可手动修改">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
        rules={[{ required: true, message: '请输入并行线程数' }]}
      >
        <InputNumber min={1} max={99} style={{ width: '100%' }} disabled={disabled} />
      </Form.Item>
    </>
  );

  if (!bordered) return inner;

  return (
    <div
      style={{
        background: '#fafafa',
        borderRadius: 8,
        padding: 16,
        border: '1px solid #f0f0f0',
        marginBottom: 16,
      }}
    >
      {inner}
    </div>
  );
}

export function parallelConfigFromForm(values: {
  parallelGroupType?: 'module' | 'group';
  parallelPlanSteps?: ParallelPlanStepForm[];
  parallelThreadCount?: number;
}) {
  const steps = (values.parallelPlanSteps as ParallelPlanStepForm[] | undefined) ?? [];
  if (!steps.length) return undefined;
  return {
    parallelGroupType: (values.parallelGroupType as 'module' | 'group') ?? 'module',
    parallelPlanSteps: steps.map((s) => ({
      stepKind: s.stepKind,
      selection: [...(s.selection ?? [])],
    })),
    parallelThreadCount: Number(values.parallelThreadCount) || 1,
  };
}

export function parallelConfigToFormFields(
  parallel?: { parallelGroupType: 'module' | 'group'; parallelPlanSteps: ParallelPlanStepForm[]; parallelThreadCount: number }
) {
  if (!parallel?.parallelPlanSteps?.length) {
    return { ...DEFAULT_PARALLEL_FORM_FIELDS };
  }
  return {
    parallelGroupType: parallel.parallelGroupType,
    parallelPlanSteps: parallel.parallelPlanSteps.map((s) => ({
      stepKind: s.stepKind,
      selection: [...(s.selection ?? [])],
    })),
    parallelThreadCount: parallel.parallelThreadCount,
  };
}
