import type { MarketDefectListSnapshot } from '@/types';
import { MARKET_DEFECTS_LIST_SNAPSHOT_STORAGE_KEY } from '@/constants/routes';

export function saveMarketDefectListSnapshot(snapshot: MarketDefectListSnapshot): void {
  try {
    sessionStorage.setItem(MARKET_DEFECTS_LIST_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // 私密模式或配额满时静默失败，报表页以无快照处理
  }
}

export function loadMarketDefectListSnapshot(): MarketDefectListSnapshot | null {
  try {
    const raw = sessionStorage.getItem(MARKET_DEFECTS_LIST_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MarketDefectListSnapshot;
  } catch {
    return null;
  }
}
