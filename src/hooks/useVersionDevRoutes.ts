import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  versionDevPath,
  deviceVersionDevPath,
  versionDevRunDetailPath,
  deviceVersionDevRunDetailPath,
  type VersionDevSegment,
  type DeviceVersionDevSegment,
} from '@/constants/routes';

/**
 * 根据当前 URL 判断平台 / 整机版本开发路由，生成正确的 segment 与任务详情路径。
 */
export function useVersionDevRoutes() {
  const location = useLocation();
  const isDeviceVersionDev = location.pathname.includes('/device-version-dev/');

  return useMemo(() => {
    const toSegmentPath = (
      projectId: string,
      versionId: string,
      segment: VersionDevSegment | DeviceVersionDevSegment
    ) =>
      isDeviceVersionDev
        ? deviceVersionDevPath(projectId, versionId, segment as DeviceVersionDevSegment)
        : versionDevPath(projectId, versionId, segment as VersionDevSegment);

    const toRunDetailPath = (projectId: string, versionId: string, runId: string) =>
      isDeviceVersionDev
        ? deviceVersionDevRunDetailPath(projectId, versionId, runId)
        : versionDevRunDetailPath(projectId, versionId, runId);

    return { isDeviceVersionDev, toSegmentPath, toRunDetailPath };
  }, [isDeviceVersionDev]);
}
