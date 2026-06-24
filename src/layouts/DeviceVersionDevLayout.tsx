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
import {
  deviceVersionDevPath,
  type DeviceVersionDevSegment,
} from '@/constants/routes';

const { Header, Sider, Content } = Layout;

/** 整机项目侧栏菜单（与平台 VersionDevLayout 独立维护，菜单项与平台对齐） */
const SEGMENTS: { key: DeviceVersionDevSegment; label: string }[] = [
  { key: 'cases', label: '用例管理' },
  { key: 'variables', label: '变量管理' },
  { key: 'files', label: '文件管理' },
  { key: 'functions', label: '自定义函数' },
  { key: 'tags', label: '标签/分组' },
  { key: 'suites', label: '套件管理' },
  { key: 'runs', label: '测试运行' },
];

/**
 * 整机版本用例开发 - 新窗口布局（与平台 /version-dev 路由隔离）
 * 路由：/device-version-dev/:projectId/:versionId/*
 */
export function DeviceVersionDevLayout() {
  const { projectId = '', versionId = '' } = useParams<{
    projectId: string;
    versionId: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSegment = (() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('device-version-dev');
    const seg = parts[idx + 3];
    if (seg === 'runs' && parts[idx + 4]) return 'runs';
    return (SEGMENTS.some((s) => s.key === seg) ? seg : 'cases') as DeviceVersionDevSegment;
  })();

  const menuItems: MenuProps['items'] = SEGMENTS.map(({ key, label }) => ({
    key,
    label: (
      <Link
        to={{
          pathname: deviceVersionDevPath(projectId, versionId, key),
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
          整机用例开发
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
