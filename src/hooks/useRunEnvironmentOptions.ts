import { useCallback, useMemo } from 'react';
import { mockAutomationEnvironments } from '@/mocks/data';
import { useVersionDevRoutes } from '@/hooks/useVersionDevRoutes';

const PLATFORM_ENV_OPTIONS = ['DEV', 'SIT', 'UAT', 'PRD'].map((e) => ({
  label: e,
  value: e,
}));

const PLATFORM_ENV_DEFAULT_HOST: Record<string, string> = {
  DEV: '10.10.10.10:18080',
  SIT: '192.168.143.134:21250',
  UAT: '172.16.20.21:28080',
  PRD: 'api.example.com:443',
};

const PLATFORM_ENV_DEFAULT_PROTOCOL: Record<string, 'http' | 'https'> = {
  DEV: 'http',
  SIT: 'http',
  UAT: 'http',
  PRD: 'https',
};

/**
 * 运行环境下拉：平台项目用 DEV/SIT/UAT/PRD；整机项目用资源管理 · 自动化环境名称。
 */
export function useRunEnvironmentOptions() {
  const { isDeviceVersionDev } = useVersionDevRoutes();

  const options = useMemo(() => {
    if (isDeviceVersionDev) {
      return mockAutomationEnvironments.map((e) => ({
        label: e.name,
        value: e.name,
      }));
    }
    return PLATFORM_ENV_OPTIONS;
  }, [isDeviceVersionDev]);

  const defaultEnv = useMemo(() => {
    if (isDeviceVersionDev) {
      return mockAutomationEnvironments[0]?.name ?? '';
    }
    return 'SIT';
  }, [isDeviceVersionDev]);

  const resolveEnvHost = useCallback(
    (envKey: string) => {
      if (isDeviceVersionDev) {
        const matched = mockAutomationEnvironments.find((e) => e.name === envKey);
        return matched?.executorIp ?? mockAutomationEnvironments[0]?.executorIp ?? '';
      }
      return PLATFORM_ENV_DEFAULT_HOST[envKey] ?? PLATFORM_ENV_DEFAULT_HOST.SIT;
    },
    [isDeviceVersionDev]
  );

  const resolveEnvProtocol = useCallback(
    (envKey: string): 'http' | 'https' => {
      if (isDeviceVersionDev) return 'http';
      return PLATFORM_ENV_DEFAULT_PROTOCOL[envKey] ?? 'http';
    },
    [isDeviceVersionDev]
  );

  return {
    isDeviceVersionDev,
    options,
    defaultEnv,
    resolveEnvHost,
    resolveEnvProtocol,
  };
}

/** 测试运行 Mock 任务初始环境（按路由区分，避免 useState 早于 hook） */
export function getInitialRunTaskEnvs(): [string, string] {
  const isDevice =
    typeof window !== 'undefined' &&
    window.location.pathname.includes('/device-version-dev/');
  if (isDevice) {
    const names = mockAutomationEnvironments.map((e) => e.name);
    return [names[0] ?? '', names[1] ?? names[0] ?? ''];
  }
  return ['SIT', 'DEV'];
}
