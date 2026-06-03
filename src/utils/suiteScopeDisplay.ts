import type {
  CaseModule,
  SuiteModuleScopeRow,
  SuiteParallelConfigPersist,
  SuiteScopePersist,
  SuiteTagScopeRow,
  VersionSuite,
} from '@/types';
import { MODULE_ROOT_ALL } from '@/utils/parallelRunWizardShared';

function collectSubtreeModuleIds(moduleId: string, modules: CaseModule[]): Set<string> {
  const set = new Set<string>([moduleId]);
  const walk = (pid: string) => {
    modules.filter((m) => m.parentId === pid).forEach((m) => {
      set.add(m.id);
      walk(m.id);
    });
  };
  walk(moduleId);
  return set;
}

export function formatSuiteScopeSummaryLines(
  scope: SuiteScopePersist,
  modules: CaseModule[]
): { moduleLine: string; tagLine: string } {
  const idToName = new Map(modules.map((m) => [m.id, m.name]));
  const root = modules.find((m) => m.parentId === null);
  const rootLabel = root?.name ?? '根目录';

  const relModuleCn = (r: SuiteModuleScopeRow['relation']) => (r === 'exclude' ? '不包含' : '包含');
  const relTagCn = (r: SuiteTagScopeRow['relation']) => {
    if (r === 'eq') return '等于';
    if (r === 'exclude') return '不包含';
    return '包含';
  };

  const moduleParts = (scope.moduleRows ?? []).map((row) => {
    const mids = row.moduleIds ?? [];
    const names = mids.map((id) => (id === MODULE_ROOT_ALL ? rootLabel : idToName.get(id) ?? id));
    const modLabel =
      names.length === 0
        ? '（未选模块）'
        : mids.includes(MODULE_ROOT_ALL) ||
            (root &&
              mids.length > 0 &&
              mids.every((id) => collectSubtreeModuleIds(root.id, modules).has(id)))
          ? `${rootLabel}（全部子模块）`
          : `「${names.join('、')}」`;
    return `${relModuleCn(row.relation)}${modLabel}`;
  });

  const tagParts = (scope.tagRows ?? [])
    .map((row) => {
      const tags = (row.tags ?? []).filter(Boolean);
      if (!tags.length) return null;
      return `${relTagCn(row.relation)}「${tags.join('、')}」`;
    })
    .filter(Boolean);

  const moduleLine = moduleParts.length ? `模块：${moduleParts.join('；')}。` : '模块：未配置。';
  const tagLine = tagParts.length ? `标签条件：${tagParts.join('；')}。` : '标签条件：无。';
  return { moduleLine, tagLine };
}

export function formatSuiteParallelSummaryLines(
  parallel: SuiteParallelConfigPersist | undefined,
  modules: CaseModule[],
  groupIdToName: Map<string, string>
): string[] {
  if (!parallel?.parallelPlanSteps?.length) {
    return ['未配置并行步骤'];
  }
  const idToModuleName = new Map(modules.map((m) => [m.id, m.name]));
  const groupTypeLabel = parallel.parallelGroupType === 'group' ? '按分组' : '按模块';
  const lines: string[] = [`分组方式：${groupTypeLabel}`];
  parallel.parallelPlanSteps.forEach((step, index) => {
    const labels = (step.selection ?? []).map((id) =>
      parallel.parallelGroupType === 'group'
        ? groupIdToName.get(id) ?? id
        : idToModuleName.get(id) ?? id
    );
    const selText = labels.length ? labels.join('、') : '（未选择）';
    const kind = step.stepKind === 'parallel' ? '并行' : '串行';
    lines.push(`${index + 1}. ${kind}：${selText}`);
  });
  lines.push(`并行线程数：${parallel.parallelThreadCount}`);
  return lines;
}

export function getSuiteConfigPreviewLines(
  suite: VersionSuite,
  modules: CaseModule[],
  groupIdToName: Map<string, string>
): { scopeLines: [string, string]; parallelLines: string[] } {
  const scope = suite.scope;
  const scopeLines = scope
    ? formatSuiteScopeSummaryLines(scope, modules)
    : { moduleLine: '模块：未配置。', tagLine: '标签条件：无。' };
  const parallelLines = formatSuiteParallelSummaryLines(suite.parallel, modules, groupIdToName);
  return {
    scopeLines: [scopeLines.moduleLine, scopeLines.tagLine],
    parallelLines,
  };
}
