import type { TaskStatus } from '@/types';

/** 跨页面追加的持久化测试运行任务（Mock：用例管理 · 调试运行「持久」写入，测试运行页订阅展示） */
export type VersionRunTaskRecord = {
  id: string;
  name: string;
  versionId: string;
  env: string;
  scope: 'all' | 'module' | 'tag' | 'case';
  scopeValues: string[];
  filterTagRows?: string[][];
  suiteId?: string;
  triggerTime: string;
  finishTime: string;
  status: TaskStatus;
  progress: number;
  caseCount: number;
  coverage: number;
  passRate: number;
  duration: string;
};

const extraTasks: VersionRunTaskRecord[] = [];
const listeners = new Set<() => void>();

export function appendVersionRunTask(task: VersionRunTaskRecord): void {
  extraTasks.unshift(task);
  listeners.forEach((fn) => fn());
}

export function getExtraVersionRunTasks(versionId: string): VersionRunTaskRecord[] {
  return extraTasks.filter((t) => t.versionId === versionId);
}

export function subscribeVersionRunTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
