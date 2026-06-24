import { Flex, Space } from 'antd';
import type { ReactNode } from 'react';
import { SPACING } from '@/constants/ui';

export interface FilterToolbarProps {
  /** 左侧：主操作（通常 primary Button） */
  left?: ReactNode;
  /** 右侧：筛选、搜索、查询 */
  right?: ReactNode;
}

/**
 * 列表页筛选工具栏：左主操作 + 右筛选区（对齐 ProductionPlanList）。
 */
export function FilterToolbar({ left, right }: FilterToolbarProps) {
  return (
    <Flex justify="space-between" align="center" wrap="wrap" gap={SPACING.sm} style={{ width: '100%' }}>
      <Space wrap>{left}</Space>
      <Space wrap>{right}</Space>
    </Flex>
  );
}
