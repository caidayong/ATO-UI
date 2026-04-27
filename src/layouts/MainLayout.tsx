import { Layout, Menu, Badge, Avatar, Dropdown, Breadcrumb } from 'antd';
import {
  DashboardOutlined,
  CodeOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  ToolOutlined,
  FunctionOutlined,
  SettingOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Link, useLocation, Outlet } from 'react-router-dom';
import type { MenuProps, BreadcrumbProps } from 'antd';
import { ROUTES } from '@/constants/routes';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function mainMenuSelectedKey(pathname: string): string {
  if (pathname.startsWith(ROUTES.AUTOMATION_PROJECTS)) {
    return ROUTES.AUTOMATION_PROJECTS;
  }
  if (pathname.startsWith('/application/')) {
    if (pathname.startsWith(ROUTES.APPLICATION_PLATFORM)) {
      return ROUTES.APPLICATION_PLATFORM;
    }
    if (pathname.startsWith(ROUTES.APPLICATION_DEVICE)) {
      return ROUTES.APPLICATION_DEVICE;
    }
    return '/application';
  }
  if (pathname.startsWith(ROUTES.SETTINGS_BASIC)) {
    return ROUTES.SETTINGS_BASIC;
  }
  if (pathname.startsWith(ROUTES.PTSW_PLANS)) {
    return ROUTES.PTSW_PLANS;
  }
  if (pathname.startsWith(ROUTES.PTSW_RESUME)) {
    return ROUTES.PTSW_RESUME;
  }
  return pathname;
}

const menuItems: MenuItem[] = [
  {
    key: ROUTES.DASHBOARD,
    icon: <DashboardOutlined />,
    label: <Link to={ROUTES.DASHBOARD}>仪表盘</Link>,
  },
  {
    key: '/automation',
    icon: <CodeOutlined />,
    label: '自动化开发',
    children: [
      {
        key: ROUTES.AUTOMATION_PROJECTS,
        label: <Link to={ROUTES.AUTOMATION_PROJECTS}>项目管理</Link>,
      },
    ],
  },
  {
    key: '/application',
    icon: <AppstoreOutlined />,
    label: '自动化应用',
    children: [
      {
        key: ROUTES.APPLICATION_PLATFORM,
        label: <Link to={ROUTES.APPLICATION_PLATFORM}>平台自动化</Link>,
      },
      {
        key: ROUTES.APPLICATION_DEVICE,
        label: <Link to={ROUTES.APPLICATION_DEVICE}>设备自动化</Link>,
      },
    ],
  },
  {
    key: '/ptsw',
    icon: <AppstoreOutlined />,
    label: '产测软件管理',
    children: [
      {
        key: ROUTES.PTSW_PLANS,
        label: <Link to={ROUTES.PTSW_PLANS}>计划管理</Link>,
      },
      {
        key: ROUTES.PTSW_RESUME,
        label: <Link to={ROUTES.PTSW_RESUME}>履历表管理</Link>,
      },
    ],
  },
  {
    key: '/resources',
    icon: <DatabaseOutlined />,
    label: '资源管理',
  },
  {
    key: '/tools',
    icon: <ToolOutlined />,
    label: '测试工具',
  },
  {
    key: '/functions',
    icon: <FunctionOutlined />,
    label: '公共函数',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      {
        key: ROUTES.SETTINGS_BASIC,
        label: <Link to={ROUTES.SETTINGS_BASIC}>基础数据</Link>,
      },
    ],
  },
];

const userDropdownItems: MenuProps['items'] = [
  { key: 'profile', label: '个人中心' },
  { key: 'settings', label: '账号设置' },
  { type: 'divider' },
  { key: 'logout', label: '退出登录' },
];

function buildBreadcrumbItems(pathname: string): BreadcrumbProps['items'] {
  if (pathname === ROUTES.SETTINGS_BASIC) {
    return [
      { title: '系统设置' },
      { title: '基础数据' },
    ];
  }

  if (pathname === ROUTES.AUTOMATION_PROJECTS) {
    return [
      { title: '自动化开发' },
      { title: '项目管理' },
    ];
  }

  if (pathname === ROUTES.APPLICATION_PLATFORM) {
    return [{ title: '自动化应用' }, { title: '平台自动化' }];
  }

  if (/^\/application\/platform\/tasks\/[^/]+$/.test(pathname)) {
    return [
      { title: '自动化应用' },
      { title: <Link to={ROUTES.APPLICATION_PLATFORM}>平台自动化</Link> },
      { title: '任务详情' },
    ];
  }

  if (pathname === ROUTES.APPLICATION_DEVICE) {
    return [{ title: '自动化应用' }, { title: '设备自动化' }];
  }

  if (/^\/ptsw\/plans\/[^/]+$/.test(pathname)) {
    return [
      { title: '产测软件管理' },
      { title: <Link to={ROUTES.PTSW_PLANS}>计划管理</Link> },
      { title: '计划详情' },
    ];
  }

  if (pathname === ROUTES.PTSW_PLANS) {
    return [{ title: '产测软件管理' }, { title: '计划管理' }];
  }

  if (pathname === ROUTES.PTSW_RESUME) {
    return [{ title: '产测软件管理' }, { title: '履历表管理' }];
  }

  if (/^\/automation\/projects\/[^/]+\/versions\/[^/]+$/.test(pathname)) {
    return [
      { title: '自动化开发' },
      { title: <Link to={ROUTES.AUTOMATION_PROJECTS}>项目管理</Link> },
      { title: '项目详情' },
      { title: '版本详情' },
    ];
  }

  if (/^\/automation\/projects\/[^/]+$/.test(pathname)) {
    return [
      { title: '自动化开发' },
      { title: <Link to={ROUTES.AUTOMATION_PROJECTS}>项目管理</Link> },
      { title: '项目详情' },
    ];
  }

  if (pathname === ROUTES.DASHBOARD) {
    return [{ title: '仪表盘' }];
  }

  return [];
}

export function MainLayout() {
  const location = useLocation();
  const selectedKey = mainMenuSelectedKey(location.pathname);
  const breadcrumbItems = buildBreadcrumbItems(location.pathname);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#1677ff',
            }}
          >
            AutoTestOne
          </div>
          <Badge
            count="DEV"
            style={{ backgroundColor: '#52c41a', fontSize: 12 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flex: 1, marginLeft: 24 }}>
          <Breadcrumb items={breadcrumbItems} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginLeft: 24 }}>
          <Badge count={5} size="small">
            <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
          </Badge>
          <QuestionCircleOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
          <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <DownOutlined style={{ fontSize: 12 }} />
            </div>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        <Sider
          width={200}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            defaultOpenKeys={['/automation', '/application', '/ptsw', '/settings']}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>

        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
