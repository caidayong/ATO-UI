/** if 判断步骤：单块条件配置（If / Else If / Else 各占一个根步骤块） */
export type IfBranchKind = 'if' | 'elseif' | 'else';

export type IfCombineLogic = '或' | '且';

export type IfConditionClause = {
  id: string;
  expr: string;
  op: string;
  value: string;
};

export type IfStepConfig = {
  branchKind: IfBranchKind;
  /** 兼容旧数据；读写请通过 getIfConditions */
  expr?: string;
  op?: string;
  value?: string;
  conditions?: IfConditionClause[];
  combineLogic?: IfCombineLogic;
  expanded?: boolean;
};

/** 兼容旧版多分支结构 */
type LegacyIfStepConfig = {
  branches?: Array<{
    kind: IfBranchKind;
    expr: string;
    op: string;
    value: string;
  }>;
  expanded?: boolean;
};

export const IF_COND_OP_OPTIONS = [
  '等于',
  '不等于',
  '大于',
  '小于',
  '大于等于',
  '小于等于',
  '包含',
  '不为空',
  '为空',
] as const;

export const IF_COMBINE_LOGIC_OPTIONS: IfCombineLogic[] = ['或', '且'];

export function ifBranchKindLabel(kind: IfBranchKind): string {
  if (kind === 'if') return 'If 判断';
  if (kind === 'elseif') return 'Else If';
  return 'Else';
}

export function createIfConditionClause(
  patch?: Partial<Omit<IfConditionClause, 'id'>>
): IfConditionClause {
  return {
    id: `ifc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    expr: '',
    op: '等于',
    value: '',
    ...patch,
  };
}

export function getIfConditions(config: IfStepConfig): IfConditionClause[] {
  if (config.conditions && config.conditions.length > 0) {
    return config.conditions.slice(0, 2);
  }
  return [
    {
      ...createIfConditionClause(),
      id: 'ifc-legacy-0',
      expr: config.expr ?? '',
      op: config.op ?? '等于',
      value: config.value ?? '',
    },
  ];
}

export function withIfConditions(
  config: IfStepConfig,
  conditions: IfConditionClause[],
  combineLogic?: IfCombineLogic
): IfStepConfig {
  const first = conditions[0];
  return {
    ...config,
    conditions: conditions.slice(0, 2),
    combineLogic: conditions.length > 1 ? combineLogic ?? config.combineLogic ?? '或' : undefined,
    expr: first?.expr ?? '',
    op: first?.op ?? '等于',
    value: first?.value ?? '',
  };
}

export function defaultIfStepConfig(_stepId: string, kind: IfBranchKind = 'if'): IfStepConfig {
  const clause = createIfConditionClause({
    op: kind === 'else' ? '' : '等于',
    value: kind === 'else' ? '' : 'null',
  });
  return {
    expanded: true,
    branchKind: kind,
    conditions: [clause],
    combineLogic: '或',
    expr: clause.expr,
    op: clause.op,
    value: clause.value,
  };
}

export function normalizeIfStepConfig(stepId: string, raw?: IfStepConfig | LegacyIfStepConfig): IfStepConfig {
  if (!raw) return defaultIfStepConfig(stepId);
  if ('branchKind' in raw && raw.branchKind) {
    const base: IfStepConfig = {
      expanded: raw.expanded,
      branchKind: raw.branchKind,
      expr: raw.expr,
      op: raw.op,
      value: raw.value,
      conditions: raw.conditions,
      combineLogic: raw.combineLogic,
    };
    return withIfConditions(base, getIfConditions(base), base.combineLogic);
  }
  const legacy = raw as LegacyIfStepConfig;
  const first = legacy.branches?.[0];
  if (first) {
    return defaultIfStepConfig(stepId, first.kind);
  }
  return defaultIfStepConfig(stepId);
}

function formatOneClause(clause: IfConditionClause): string {
  const expr = clause.expr.trim();
  const op = clause.op.trim();
  const value = clause.value.trim();
  if (expr && op) return value ? `${expr} ${op} ${value}` : `${expr} ${op}`;
  if (op && value) return `${op} ${value}`;
  if (expr) return expr;
  return '';
}

export function formatIfConditionSummary(config: IfStepConfig): string {
  if (config.branchKind === 'else') return 'Else';
  const list = getIfConditions(config).map(formatOneClause).filter(Boolean);
  if (list.length === 0) return '点击配置条件';
  if (list.length === 1) return list[0];
  const logic = config.combineLogic ?? '或';
  return `(${list[0]}) ${logic} (${list[1]})`;
}

export function syncIfStepTitle(config: IfStepConfig, fallback: string): string {
  const summary = formatIfConditionSummary(config);
  if (summary === '点击配置条件') return fallback;
  return `[${ifBranchKindLabel(config.branchKind)}] ${summary}`;
}

/** 扁平步骤列表中，在 afterStepId 之后插入时跳过其所有子孙步骤 */
export function findInsertIndexAfterStep<T extends { id: string }>(
  all: T[],
  afterStepId: string,
  parentById: Record<string, string>
): number {
  const idx = all.findIndex((s) => s.id === afterStepId);
  if (idx < 0) return all.length;
  const descendantIds = new Set<string>();
  const walk = (parentId: string) => {
    all.forEach((s) => {
      if (parentById[s.id] === parentId) {
        descendantIds.add(s.id);
        walk(s.id);
      }
    });
  };
  walk(afterStepId);
  let insertAt = idx + 1;
  while (insertAt < all.length && descendantIds.has(all[insertAt].id)) {
    insertAt += 1;
  }
  return insertAt;
}
