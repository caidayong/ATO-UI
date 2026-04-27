import { Layout, Menu, Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import type { MenuProps } from 'antd';
import { versionDevPath, type VersionDevSegment } from '@/constants/routes';

const { Header, Sider, Content } = Layout;

const SEGMENTS: { key: VersionDevSegment; label: string }[] = [
  { key: 'cases', label: '用例管理' },
  { key: 'variables', label: '变量管理' },
  { key: 'files', label: '文件管理' },
  { key: 'functions', label: '自定义函数' },
  { key: 'tags', label: '标签管理' },
  { key: 'runs', label: '测试运行' },
];

/**
 * 版本用例开发 - 新窗口布局（无主框架顶栏与主菜单）
 * 路由：/version-dev/:projectId/:versionId/*
 */
export function VersionDevLayout() {
  const { projectId = '', versionId = '' } = useParams<{
    projectId: string;
    versionId: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSegment = (() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('version-dev');
    const seg = parts[idx + 3];
    if (seg === 'runs' && parts[idx + 4]) return 'runs'; // 任务详情仍高亮「测试运行」
    return (SEGMENTS.some((s) => s.key === seg) ? seg : 'cases') as VersionDevSegment;
  })();

  const menuItems: MenuProps['items'] = SEGMENTS.map(({ key, label }) => ({
    key,
    label: (
      <Link
        to={{
          pathname: versionDevPath(projectId, versionId, key),
          search: location.search,
        }}
        replace
      >
        {label}
      </Link>
    ),
  }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            navigate(`/automation/projects/${projectId}`);
          }}
        >
          返回
        </Button>
        <Typography.Text strong>
          {location.search
            ? (() => {
                const q = new URLSearchParams(location.search);
                const pn = q.get('pn');
                const vn = q.get('vn');
                if (pn && vn) return `${pn} · ${vn}`;
                if (pn) return `${pn} · 版本 ${versionId}`;
                if (vn) return `项目 ${projectId} · ${vn}`;
                return `项目 ${projectId} · 版本 ${versionId}`;
              })()
            : `项目 ${projectId} · 版本 ${versionId}`}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          版本用例开发
        </Typography.Text>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Menu
            mode="inline"
            selectedKeys={[activeSegment]}
            items={menuItems}
            style={{ borderRight: 0 }}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
