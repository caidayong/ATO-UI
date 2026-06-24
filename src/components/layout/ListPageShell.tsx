import { Card, Tabs } from 'antd';
import type { ReactNode } from 'react';
import type { TabsProps } from 'antd';
import { PAGE_MIN_HEIGHT, SPACING } from '@/constants/ui';
import { FilterToolbar } from './FilterToolbar';

export interface ListPageShellProps {
  /** 表格 / 列表主内容 */
  children: ReactNode;
  /** 工具栏左侧（主操作） */
  toolbarLeft?: ReactNode;
  /** 工具栏右侧（筛选） */
  toolbarRight?: ReactNode;
  /** Card 内 Tabs（可选，如工厂切换） */
  tabs?: TabsProps;
  /** 内容 Card 底部（如分页 + 条数） */
  footer?: ReactNode;
  /** 不渲染工具栏 Card（仅内容 Card） */
  hideToolbar?: boolean;
  /** 内容与工具栏合并为单 Card（默认 false：双 Card，对齐 ProductionPlanList） */
  singleCard?: boolean;
}

/**
 * 标准表格列表页壳：外层 minHeight → 工具栏 Card → 内容 Card。
 * @see src/pages/ProductionPlanList.tsx
 */
export function ListPageShell({
  children,
  toolbarLeft,
  toolbarRight,
  tabs,
  footer,
  hideToolbar = false,
  singleCard = false,
}: ListPageShellProps) {
  const hasToolbar = !hideToolbar && (toolbarLeft || toolbarRight || tabs);
  const toolbarBlock = hasToolbar ? (
    <>
      {tabs ? <Tabs {...tabs} style={{ marginBottom: SPACING.xs, ...tabs.style }} /> : null}
      {toolbarLeft || toolbarRight ? (
        <FilterToolbar left={toolbarLeft} right={toolbarRight} />
      ) : null}
    </>
  ) : null;

  if (singleCard) {
    return (
      <div style={{ minHeight: PAGE_MIN_HEIGHT }}>
        <Card>
          {toolbarBlock}
          {children}
          {footer}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: PAGE_MIN_HEIGHT }}>
      {hasToolbar ? <Card style={{ marginBottom: SPACING.md }}>{toolbarBlock}</Card> : null}
      <Card>
        {children}
        {footer}
      </Card>
    </div>
  );
}
