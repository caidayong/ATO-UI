import { Typography } from 'antd';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

/** 路由占位：待开发页面 */
export function PlaceholderPage({ title, description = '页面建设中…' }: PlaceholderPageProps) {
  return (
    <div
      style={{
        height: 'calc(100vh - 140px)',
        minHeight: 560,
        overflow: 'auto',
        padding: 24,
        background: '#fff',
        borderRadius: 8,
      }}
    >
      <Typography.Title level={4}>{title}</Typography.Title>
      <Typography.Text type="secondary">{description}</Typography.Text>
    </div>
  );
}
