import { Layout, Breadcrumb, Badge, Button, Space } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { BreadcrumbProps } from 'antd';
import { SPACING } from '@/constants/ui';
import { ROUTES, docsVersionPath } from '@/constants/routes';
import { findDoc, useDocsManifest } from '@/docs/docs-manifest';

const { Header, Content } = Layout;

function DocsLayoutBreadcrumb() {
  const location = useLocation();
  const { manifest } = useDocsManifest();
  const segments = location.pathname.split('/').filter(Boolean);

  const items: BreadcrumbProps['items'] = [
    { title: <Link to={ROUTES.DOCS}>需求文档</Link> },
  ];

  if (segments.length >= 2) {
    const versionId = decodeURIComponent(segments[1]);
    items.push({
      title:
        segments.length === 2 ? (
          versionId
        ) : (
          <Link to={docsVersionPath(versionId)}>{versionId}</Link>
        ),
    });
  }

  if (segments.length >= 3) {
    const versionId = decodeURIComponent(segments[1]);
    const docSlug = decodeURIComponent(segments.slice(2).join('/'));
    const doc = findDoc(manifest, versionId, docSlug);
    items.push({ title: doc?.title ?? docSlug });
  }

  return <Breadcrumb items={items} />;
}

export function DocsLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Space size={SPACING.sm} align="center">
          <Link
            to={ROUTES.DOCS}
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#1677ff',
              textDecoration: 'none',
            }}
          >
            AutoTestOne
          </Link>
          <Badge count="DOCS" style={{ backgroundColor: '#722ed1', fontSize: 12 }} />
        </Space>

        <div style={{ display: 'flex', alignItems: 'center', flex: 1, marginLeft: SPACING.lg }}>
          <DocsLayoutBreadcrumb />
        </div>

        <Button type="link" icon={<ArrowLeftOutlined />} href="/">
          返回原型
        </Button>
      </Header>

      <Content style={{ padding: SPACING.lg, background: '#f5f5f5' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
