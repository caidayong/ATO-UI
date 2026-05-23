import { useMemo } from 'react';
import {
  Button,
  Dropdown,
  Popover,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { DynamicValueTextArea } from '@/components/DynamicValueInput';
import type { MenuProps } from 'antd';
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { CaseStep, CaseStepType } from '@/types';
import { CASE_STEP_TYPES } from '@/types';
import {
  IF_COMBINE_LOGIC_OPTIONS,
  IF_COND_OP_OPTIONS,
  createIfConditionClause,
  getIfConditions,
  type IfConditionClause,
  type IfCombineLogic,
  type IfStepConfig,
  formatIfConditionSummary,
  ifBranchKindLabel,
  withIfConditions,
} from '@/utils/caseIfStep';

const { Text } = Typography;

type StepType = CaseStepType;

export type CaseIfStepBlockProps = {
  caseId: string;
  step: CaseStep;
  selected: boolean;
  config: IfStepConfig;
  childSteps: CaseStep[];
  stepTypeById: Record<string, StepType>;
  activeStepId: string;
  conditionPopoverOpen: boolean;
  canAddElseIf: boolean;
  canAddElse: boolean;
  onToggleExpand: () => void;
  onOpenConditionPopover: () => void;
  onCloseConditionPopover: () => void;
  onUpdateConfig: (config: IfStepConfig) => void;
  onAddSiblingBranch: (kind: 'elseif' | 'else') => void;
  onSelectStep: () => void;
  onCopyStep: () => void;
  onDeleteStep: () => void;
  onAddChildStep: (stepType: StepType) => void;
  onSelectChildStep: (childId: string) => void;
  onCopyChildStep: (childId: string) => void;
  onDeleteChildStep: (childId: string) => void;
  onOpenDbStepCreate: (afterChildId?: string) => void;
};

const IF_COND_POPOVER_WIDTH_SINGLE = 360;
const IF_COND_POPOVER_WIDTH_DUAL = 780;
const IF_COND_COLUMN_MIN_WIDTH = 320;

function IfConditionFields({
  clause,
  showRemove,
  onPatch,
  onRemove,
}: {
  clause: IfConditionClause;
  showRemove?: boolean;
  onPatch: (patch: Partial<IfConditionClause>) => void;
  onRemove?: () => void;
}) {
  return (
    <div style={{ flex: 1, minWidth: IF_COND_COLUMN_MIN_WIDTH }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <DynamicValueTextArea
          rows={2}
          placeholder="请输入表达式"
          value={clause.expr}
          onChange={(e) => onPatch({ expr: e.target.value })}
          hideGlowUntilHover
        />
        <Select
          style={{ width: '100%' }}
          value={clause.op || '等于'}
          options={IF_COND_OP_OPTIONS.map((x) => ({ label: x, value: x }))}
          onChange={(v) => onPatch({ op: String(v) })}
        />
        <DynamicValueTextArea
          rows={2}
          placeholder="预期值"
          value={clause.value}
          onChange={(e) => onPatch({ value: e.target.value })}
          hideGlowUntilHover
        />
      </Space>
      {showRemove && onRemove ? (
        <Button type="link" size="small" danger style={{ paddingInline: 0, marginTop: 4 }} onClick={onRemove}>
          删除条件
        </Button>
      ) : null}
    </div>
  );
}

function IfConditionEditor({
  config,
  canAddElseIf,
  canAddElse,
  onChange,
  onAddSiblingBranch,
}: {
  config: IfStepConfig;
  canAddElseIf: boolean;
  canAddElse: boolean;
  onChange: (next: IfStepConfig) => void;
  onAddSiblingBranch: (kind: 'elseif' | 'else') => void;
}) {
  const isElse = config.branchKind === 'else';
  const conditions = getIfConditions(config);
  const isDual = conditions.length >= 2;
  const combineLogic = config.combineLogic ?? '或';

  const patchConditions = (nextList: IfConditionClause[], logic?: IfCombineLogic) => {
    onChange(withIfConditions(config, nextList, logic ?? combineLogic));
  };

  const updateClause = (id: string, patch: Partial<IfConditionClause>) => {
    patchConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      combineLogic
    );
  };

  const addSecondCondition = () => {
    if (conditions.length >= 2) return;
    patchConditions([conditions[0], createIfConditionClause()], '或');
  };

  const removeSecondCondition = () => {
    if (conditions.length < 2) return;
    patchConditions([conditions[0]]);
  };

  return (
    <div style={{ width: isDual ? IF_COND_POPOVER_WIDTH_DUAL : IF_COND_POPOVER_WIDTH_SINGLE }}>
      <div style={{ marginBottom: 12, fontWeight: 600 }}>条件分支</div>
      {isElse ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Else 分支无需配置条件，不满足以上分支时执行其下子步骤。
        </Text>
      ) : isDual ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <IfConditionFields clause={conditions[0]} onPatch={(p) => updateClause(conditions[0].id, p)} />
          <Select
            style={{ width: 64, flex: '0 0 auto', marginTop: 32 }}
            value={combineLogic}
            options={IF_COMBINE_LOGIC_OPTIONS.map((x) => ({ label: x, value: x }))}
            onChange={(v) => patchConditions(conditions, v as IfCombineLogic)}
          />
          <IfConditionFields
            clause={conditions[1]}
            showRemove
            onPatch={(p) => updateClause(conditions[1].id, p)}
            onRemove={removeSecondCondition}
          />
        </div>
      ) : (
        <IfConditionFields
          clause={conditions[0]}
          onPatch={(p) => updateClause(conditions[0].id, p)}
        />
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Space size={8} wrap>
          <Button
            size="small"
            disabled={!canAddElseIf}
            onClick={() => onAddSiblingBranch('elseif')}
          >
            + Else If
          </Button>
          <Button size="small" disabled={!canAddElse} onClick={() => onAddSiblingBranch('else')}>
            + Else
          </Button>
        </Space>
        {!isElse ? (
          <Button
            type="primary"
            size="small"
            disabled={isDual}
            onClick={addSecondCondition}
          >
            +判断条件
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function CaseIfStepBlock({
  step: _step,
  selected,
  config,
  childSteps,
  stepTypeById,
  activeStepId,
  conditionPopoverOpen,
  canAddElseIf,
  canAddElse,
  onToggleExpand,
  onOpenConditionPopover,
  onCloseConditionPopover,
  onUpdateConfig,
  onAddSiblingBranch,
  onSelectStep,
  onCopyStep,
  onDeleteStep,
  onAddChildStep,
  onSelectChildStep,
  onCopyChildStep,
  onDeleteChildStep,
  onOpenDbStepCreate,
}: CaseIfStepBlockProps) {
  const expanded = config.expanded !== false;
  const summary = useMemo(() => formatIfConditionSummary(config), [config]);
  const kindLabel = ifBranchKindLabel(config.branchKind);

  const addMenuItems: MenuProps['items'] = CASE_STEP_TYPES.map((t) => ({ key: t, label: t }));

  const renderChildRow = (child: CaseStep) => {
    const childType = stepTypeById[child.id] ?? '接口请求';
    const typeLabel = childType === '自定义接口请求' ? '接口请求' : childType;
    const isSelected = activeStepId === child.id;
    return (
      <div
        key={child.id}
        className="case-if-child-row"
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
      className="case-if-step-block"
      style={{
        marginBottom: 8,
        borderRadius: 6,
        border: selected ? '1px solid #1677ff' : '1px solid #e8e8e8',
        background: selected ? '#f0f7ff' : '#fff',
        overflow: 'hidden',
      }}
    >
      <Popover
        open={conditionPopoverOpen}
        onOpenChange={(open) => {
          if (!open) onCloseConditionPopover();
        }}
        trigger="click"
        placement="rightTop"
        content={
          <IfConditionEditor
            config={config}
            canAddElseIf={canAddElseIf}
            canAddElse={canAddElse}
            onChange={onUpdateConfig}
            onAddSiblingBranch={(kind) => {
              onAddSiblingBranch(kind);
              onCloseConditionPopover();
            }}
          />
        }
      >
        <div
          className="case-if-step-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 8px',
            cursor: 'pointer',
            background: selected ? '#bae0ff' : '#f5f9ff',
            borderBottom: expanded ? '1px solid #e8e8e8' : undefined,
          }}
          onClick={() => {
            onSelectStep();
            onOpenConditionPopover();
          }}
        >
          <Button
            type="text"
            size="small"
            icon={expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          />
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {kindLabel}
          </Tag>
          <Text ellipsis={{ tooltip: summary }} style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
            {summary}
          </Text>
          <Space size={0} className="case-if-step-header-actions" onClick={(e) => e.stopPropagation()}>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={onCopyStep} />
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onDeleteStep} />
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => onAddChildStep('接口请求')} />
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
              className="case-if-add-child-zone"
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
