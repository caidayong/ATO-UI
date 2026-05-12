/**
 * 「测试运行」与「平台自动化 · 用例运行配置确认」共用的并行计划与一级目录树工具（Mock 表单同构）
 */
import type { TreeSelectProps } from 'antd';
import type { CaseModule } from '@/types';

export const MODULE_ROOT_ALL = '__root_all__';

export const MODULE_MATCH_OPTIONS: { value: '包含' | '不包含'; label: string }[] = [
  { value: '包含', label: '包含' },
  { value: '不包含', label: '不包含' },
];

export const TAG_MATCH_OPTIONS: { value: '等于' | '包含' | '不包含'; label: string }[] = [
  { value: '等于', label: '等于' },
  { value: '包含', label: '包含' },
  { value: '不包含', label: '不包含' },
];

export type ParallelPlanStepForm = {
  stepKind: 'serial' | 'parallel';
  selection: string[];
};

export type ParallelModuleTreeData = NonNullable<TreeSelectProps['treeData']>;

export function buildFirstLevelModuleTreeData(
  modules: CaseModule[],
  isLeafDisabled?: (leafModuleId: string) => boolean
): ParallelModuleTreeData {
  const roots = modules
    .filter((m) => m.parentId === null)
    .slice()
    .sort((a, b) => a.sort - b.sort);
  return roots
    .map((root) => {
      const children = modules
        .filter((m) => m.parentId === root.id)
        .slice()
        .sort((a, b) => a.sort - b.sort)
        .map((m) => ({
          title: m.name,
          key: m.id,
          value: m.id,
          disabled: isLeafDisabled?.(m.id) ?? false,
        }));
      if (!children.length) return null;
      return {
        title: root.name,
        key: `root-${root.id}`,
        value: `root-${root.id}`,
        disabled: true,
        checkable: false,
        selectable: false,
        children,
      };
    })
    .filter(Boolean) as ParallelModuleTreeData;
}

/** 从并行配置一级目录树中收集当前可选（未禁用）的一级模块 id */
export function collectSelectableFirstLevelLeafIds(treeData: ParallelModuleTreeData): string[] {
  const out: string[] = [];
  for (const root of treeData) {
    const children = root.children as ParallelModuleTreeData | undefined;
    if (!children?.length) continue;
    for (const leaf of children) {
      const node = leaf as { value?: string; disabled?: boolean };
      if (typeof node.value === 'string' && !node.disabled) {
        out.push(node.value);
      }
    }
  }
  return out;
}

/** 在一级候选集合内反选：未选变已选、已选变未选 */
export function invertFirstLevelSelection(current: string[] | undefined, selectableIds: string[]): string[] {
  const cur = new Set(current ?? []);
  return selectableIds.filter((id) => !cur.has(id));
}

export function selectionUsedInStepsBefore(
  steps: ParallelPlanStepForm[] | undefined,
  beforeIndex: number
): Set<string> {
  const set = new Set<string>();
  const list = steps ?? [];
  for (let i = 0; i < beforeIndex && i < list.length; i++) {
    (list[i].selection ?? []).forEach((id) => set.add(id));
  }
  return set;
}

export function pruneParallelPlanStepSelections(steps: ParallelPlanStepForm[]): ParallelPlanStepForm[] {
  const used = new Set<string>();
  return steps.map((step) => {
    const sel = step.selection ?? [];
    const filtered = sel.filter((id) => !used.has(id));
    filtered.forEach((id) => used.add(id));
    return { ...step, selection: filtered };
  });
}

export function parallelPlanSelectionsEqual(a: ParallelPlanStepForm[], b: ParallelPlanStepForm[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((step, i) => {
    const x = step.selection ?? [];
    const y = b[i]?.selection ?? [];
    return x.length === y.length && x.every((id, j) => id === y[j]);
  });
}

export function maxParallelSelectionCount(steps: ParallelPlanStepForm[] | undefined): number {
  const list = steps ?? [];
  return list
    .filter((s) => s.stepKind === 'parallel')
    .reduce((acc, s) => Math.max(acc, s.selection?.length ?? 0), 0);
}

export function collectSubtreeModuleIds(moduleId: string, modules: CaseModule[]): Set<string> {
  const set = new Set<string>([moduleId]);
  const walk = (pid: string) => {
    modules
      .filter((m) => m.parentId === pid)
      .forEach((m) => {
        set.add(m.id);
        walk(m.id);
      });
  };
  walk(moduleId);
  return set;
}
