import { IF_COND_OP_OPTIONS } from '@/utils/caseIfStep';

export { IF_COND_OP_OPTIONS as FOR_BREAK_OP_OPTIONS };

export type ForBreakCombineLogic = '且' | '或';

export const FOR_BREAK_COMBINE_LOGIC_OPTIONS: ForBreakCombineLogic[] = ['且', '或'];

export type ForBreakCondition = {
  id: string;
  expr: string;
  op: string;
  value: string;
};

export type ForStepConfig = {
  /** 待循环的数组表达式 */
  loopArray: string;
  /** 循环变量名 */
  loopVariable: string;
  /** 中断条件，默认空 */
  breakConditions: ForBreakCondition[];
  /** 多条中断条件之间的逻辑关系，默认且 */
  breakCombineLogic?: ForBreakCombineLogic;
  expanded?: boolean;
};

export function createForBreakCondition(
  patch?: Partial<Omit<ForBreakCondition, 'id'>>
): ForBreakCondition {
  return {
    id: `forc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    expr: '',
    op: '等于',
    value: '',
    ...patch,
  };
}

export function defaultForStepConfig(): ForStepConfig {
  return {
    loopArray: '',
    loopVariable: '',
    breakConditions: [],
    breakCombineLogic: '且',
    expanded: true,
  };
}

export function normalizeForStepConfig(raw?: ForStepConfig): ForStepConfig {
  if (!raw) return defaultForStepConfig();
  return {
    loopArray: raw.loopArray ?? '',
    loopVariable: raw.loopVariable ?? '',
    breakConditions: (raw.breakConditions ?? []).map((c) => ({
      id: c.id || createForBreakCondition().id,
      expr: c.expr ?? '',
      op: c.op ?? '等于',
      value: c.value ?? '',
    })),
    breakCombineLogic: raw.breakCombineLogic === '或' ? '或' : '且',
    expanded: raw.expanded,
  };
}

function formatOneBreak(clause: ForBreakCondition): string {
  const expr = clause.expr.trim();
  const op = clause.op.trim();
  const value = clause.value.trim();
  if (expr && op) return value ? `${expr} ${op} ${value}` : `${expr} ${op}`;
  if (op && value) return `${op} ${value}`;
  if (expr) return expr;
  return '';
}

export function formatForStepSummary(config: ForStepConfig): string {
  const parts: string[] = [];
  const arr = config.loopArray.trim();
  const v = config.loopVariable.trim();
  if (arr) parts.push(arr);
  if (v) parts.push(v);
  const breaks = config.breakConditions.map(formatOneBreak).filter(Boolean);
  if (breaks.length > 0) {
    const logic = config.breakCombineLogic ?? '且';
    const breakText =
      breaks.length > 1 ? breaks.map((b) => `(${b})`).join(` ${logic} `) : breaks[0];
    parts.push(`中断: ${breakText}`);
  }
  return parts.join(' · ');
}

export function syncForStepTitle(config: ForStepConfig, fallback: string): string {
  const summary = formatForStepSummary(config);
  if (!summary) return fallback;
  return `[For 循环] ${summary}`;
}
