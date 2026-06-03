import { useMemo } from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Popover,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { DynamicValueInput } from '@/components/DynamicValueInput';
import type { MenuProps } from 'antd';
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { CaseStep, CaseStepType } from '@/types';
import { CASE_STEP_TYPES } from '@/types';
import {
  FOR_BREAK_COMBINE_LOGIC_OPTIONS,
  FOR_BREAK_OP_OPTIONS,
  createForBreakCondition,
  formatForStepSummary,
  type ForBreakCombineLogic,
  type ForBreakCondition,
  type ForStepConfig,
} from '@/utils/caseForStep';

const { Text } = Typography;

type StepType = CaseStepType;

export type CaseForStepBlockProps = {
  step: CaseStep;
  selected: boolean;
  config: ForStepConfig;
  childSteps: CaseStep[];
  stepTypeById: Record<string, StepType>;
  activeStepId: string;
  configPopoverOpen: boolean;
  onToggleExpand: () => void;
  onOpenConfigPopover: () => void;
  onCloseConfigPopover: () => void;
  onUpdateConfig: (config: ForStepConfig) => void;
  onSelectStep: () => void;
  onCopyStep: () => void;
  onDeleteStep: () => void;
  onAddChildStep: (stepType: StepType) => void;
  onAddSiblingStep: (stepType: StepType) => void;
  onSelectChildStep: (childId: string) => void;
  onCopyChildStep: (childId: string) => void;
  onDeleteChildStep: (childId: string) => void;
  onOpenDbStepCreate: (afterChildId?: string) => void;
  onOpenDbStepCreateSibling: () => void;
  stepCopyChecked: boolean;
  onStepCopyCheckChange: (checked: boolean) => void;
  isChildCopyChecked: (childId: string) => boolean;
  onChildCopyCheckChange: (childId: string, checked: boolean) => void;
};

const FOR_CONFIG_POPOVER_WIDTH = 520;
const FOR_BREAK_ROW_COLUMNS = 'minmax(0, 1fr) 108px minmax(0, 1fr) 28px';

function buildForStepAddMenuItems(): MenuProps['items'] {
  const typeChildren = (scope: 'child' | 'sibling') =>
    CASE_STEP_TYPES.map((t) => ({
      key: `${scope}:${t}`,
      label: t,
    }));
  return [
    { key: 'add-child', label: '添加子步骤', children: typeChildren('child') },
    { key: 'add-sibling', label: '添加同级步骤', children: typeChildren('sibling') },
  ];
}

function handleForStepAddMenuClick(
  key: string,
  handlers: {
    onAddChildStep: (stepType: StepType) => void;
    onAddSiblingStep: (stepType: StepType) => void;
    onOpenDbStepCreate: (afterChildId?: string) => void;
    onOpenDbStepCreateSibling: () => void;
  }
) {
  const sep = key.indexOf(':');
  if (sep < 0) return;
  const scope = key.slice(0, sep) as 'child' | 'sibling';
  const stepType = key.slice(sep + 1) as StepType;
  if (scope !== 'child' && scope !== 'sibling') return;
  if (stepType === '数据库操作') {
    if (scope === 'child') handlers.onOpenDbStepCreate();
    else handlers.onOpenDbStepCreateSibling();
    return;
  }
  if (scope === 'child') handlers.onAddChildStep(stepType);
  else handlers.onAddSiblingStep(stepType);
}

function ForLoopConfigEditor({
  config,
  onChange,
  onClose,
}: {
  config: ForStepConfig;
  onChange: (next: ForStepConfig) => void;
  onClose: () => void;
}) {
  const breakConditions = config.breakConditions;
  const breakCombineLogic = config.breakCombineLogic ?? '且';

  const patchConfig = (patch: Partial<ForStepConfig>) => onChange({ ...config, ...patch });

  const updateBreak = (id: string, patch: Partial<ForBreakCondition>) => {
    patchConfig({
      breakConditions: breakConditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const removeBreak = (id: string) => {
    patchConfig({ breakConditions: breakConditions.filter((c) => c.id !== id) });
  };

  const addBreak = () => {
    patchConfig({ breakConditions: [...breakConditions, createForBreakCondition()] });
  };

  return (
    <div style={{ width: FOR_CONFIG_POPOVER_WIDTH }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>For 循环</span>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} aria-label="关闭" />
      </div>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <div style={{ marginBottom: 6, fontSize: 13 }}>待循环的数组</div>
          <Input
            placeholder="例: [1,2,3] 或者 range(0,100)"
            value={config.loopArray}
            onChange={(e) => patchConfig({ loopArray: e.target.value })}
          />
        </div>
        <div>
          <div style={{ marginBottom: 6, fontSize: 13 }}>循环变量</div>
          <Input
            placeholder="例: taskId"
            value={config.loopVariable}
            onChange={(e) => patchConfig({ loopVariable: e.target.value })}
          />
        </div>
        <div>
          <div style={{ marginBottom: 8, fontSize: 13 }}>中断条件</div>
          {breakConditions.length > 0
            ? breakConditions.map((clause, index) => (
                <div key={clause.id}>
                  {index > 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        margin: '4px 0 8px',
                      }}
                    >
                      <Select
                        size="small"
                        style={{ width: 64 }}
                        value={breakCombineLogic}
                        options={FOR_BREAK_COMBINE_LOGIC_OPTIONS.map((x) => ({
                          label: x,
                          value: x,
                        }))}
                        onChange={(v) =>
                          patchConfig({ breakCombineLogic: v as ForBreakCombineLogic })
                        }
                      />
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: FOR_BREAK_ROW_COLUMNS,
                      gap: 8,
                      alignItems: 'center',
                      padding: '8px 10px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      background: '#fafafa',
                    }}
                  >
                    <DynamicValueInput
                      size="small"
                      placeholder="请输入表达式"
                      value={clause.expr}
                      onChange={(e) => updateBreak(clause.id, { expr: e.target.value })}
                      hideGlowUntilHover
                    />
                    <Select
                      size="small"
                      style={{ width: '100%' }}
                      value={clause.op || '等于'}
                      options={FOR_BREAK_OP_OPTIONS.map((x) => ({ label: x, value: x }))}
                      onChange={(v) => updateBreak(clause.id, { op: String(v) })}
                    />
                    <DynamicValueInput
                      size="small"
                      placeholder="请输入预期值"
                      value={clause.value}
                      onChange={(e) => updateBreak(clause.id, { value: e.target.value })}
                      hideGlowUntilHover
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      aria-label="删除中断条件"
                      onClick={() => removeBreak(clause.id)}
                    />
                  </div>
                </div>
              ))
            : null}
          <Button type="link" style={{ paddingInline: 0 }} onClick={addBreak}>
            + 中断条件
          </Button>
        </div>
      </Space>
    </div>
  );
}

export function CaseForStepBlock({
  step,
  selected,
  config,
  childSteps,
  stepTypeById,
  activeStepId,
  configPopoverOpen,
  onToggleExpand,
  onOpenConfigPopover,
  onCloseConfigPopover,
  onUpdateConfig,
  onSelectStep,
  onCopyStep,
  onDeleteStep,
  onAddChildStep,
  onAddSiblingStep,
  onSelectChildStep,
  onCopyChildStep,
  onDeleteChildStep,
  onOpenDbStepCreate,
  onOpenDbStepCreateSibling,
  stepCopyChecked,
  onStepCopyCheckChange,
  isChildCopyChecked,
  onChildCopyCheckChange,
}: CaseForStepBlockProps) {
  const expanded = config.expanded !== false;
  const configSummary = useMemo(() => formatForStepSummary(config), [config]);
  const headerLabel = configSummary || step.title;
  const addMenuItems: MenuProps['items'] = CASE_STEP_TYPES.map((t) => ({ key: t, label: t }));
  const headerAddMenuItems = useMemo(() => buildForStepAddMenuItems(), []);
  const onHeaderAddMenuClick: MenuProps['onClick'] = ({ key }) =>
    handleForStepAddMenuClick(String(key), {
      onAddChildStep,
      onAddSiblingStep,
      onOpenDbStepCreate,
      onOpenDbStepCreateSibling,
    });

  const renderChildRow = (child: CaseStep) => {
    const childType = stepTypeById[child.id] ?? '接口请求';
    const typeLabel = childType === '自定义接口请求' ? '接口请求' : childType;
    const isSelected = activeStepId === child.id;
    return (
      <div
        key={child.id}
        className="case-for-child-row"
        style={{
          marginBottom: 6,
          padding: '6px 8px',
          borderRadius: 4,
          border: '1px solid #f0f0f0',
          background: isSelected ? '#e6f4ff' : '#fafafa',
          cursor: 'pointer',
        }}
        onClick={() => onSelectChildStep(child.id)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Checkbox
            checked={isChildCopyChecked(child.id)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onChildCopyCheckChange(child.id, e.target.checked)}
          />
          <Tag color={childType === '调用函数' ? 'purple' : 'default'} style={{ marginInlineEnd: 0 }}>
            {typeLabel}
          </Tag>
          <Text ellipsis={{ tooltip: child.title }} style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
            {child.title}
          </Text>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'copy', label: '复制', icon: <CopyOutlined /> },
                { key: 'delete', label: '删除', icon: <DeleteOutlined /> },
              ],
              onClick: ({ key }) => {
                if (key === 'copy') onCopyChildStep(child.id);
                if (key === 'delete') onDeleteChildStep(child.id);
              },
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </div>
    );
  };

  return (
    <div
      className="case-for-step-block"
      style={{
        marginBottom: 8,
        borderRadius: 6,
        border: selected ? '1px solid #1677ff' : '1px solid #e8e8e8',
        background: selected ? '#f0f7ff' : '#fff',
        overflow: 'hidden',
      }}
    >
      <Popover
        open={configPopoverOpen}
        onOpenChange={(open) => {
          if (!open) onCloseConfigPopover();
        }}
        trigger="click"
        placement="rightTop"
        content={
          <ForLoopConfigEditor
            config={config}
            onChange={onUpdateConfig}
            onClose={onCloseConfigPopover}
          />
        }
      >
        <div
          className="case-for-step-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 8px',
            cursor: 'pointer',
            background: selected ? '#bae0ff' : '#fffbe6',
            borderBottom: expanded ? '1px solid #e8e8e8' : undefined,
          }}
          onClick={() => {
            onSelectStep();
            onOpenConfigPopover();
          }}
        >
          <Checkbox
            checked={stepCopyChecked}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onStepCopyCheckChange(e.target.checked)}
          />
          <Button
            type="text"
            size="small"
            icon={expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          />
          <Tag color="gold" style={{ marginInlineEnd: 0 }}>
            For 循环
          </Tag>
          <Text ellipsis={{ tooltip: headerLabel }} style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
            {headerLabel}
          </Text>
          <Space size={0} className="case-for-step-header-actions" onClick={(e) => e.stopPropagation()}>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={onCopyStep} />
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onDeleteStep} />
            <Dropdown
              trigger={['hover']}
              menu={{
                items: headerAddMenuItems,
                onClick: onHeaderAddMenuClick,
                triggerSubMenuAction: 'hover',
              }}
            >
              <Button type="text" size="small" icon={<PlusOutlined />} />
            </Dropdown>
          </Space>
        </div>
      </Popover>
      {expanded ? (
        <div style={{ padding: 8, background: '#fafafa' }}>
          {childSteps.length > 0 ? childSteps.map(renderChildRow) : null}
          <Dropdown
            trigger={['click']}
            menu={{
              items: addMenuItems,
              onClick: ({ key }) => {
                const chosen = String(key) as StepType;
                if (chosen === '数据库操作') {
                  onOpenDbStepCreate();
                } else {
                  onAddChildStep(chosen);
                }
              },
            }}
          >
            <div
              className="case-for-add-child-zone"
              style={{
                marginTop: childSteps.length > 0 ? 4 : 0,
                padding: '10px 8px',
                border: '1px dashed #d9d9d9',
                borderRadius: 4,
                textAlign: 'center',
                color: '#8c8c8c',
                fontSize: 12,
                cursor: 'pointer',
                background: '#fff',
              }}
            >
              + 拖入 或 添加步骤 <DownOutlined style={{ fontSize: 10 }} />
            </div>
          </Dropdown>
        </div>
      ) : null}
    </div>
  );
}
