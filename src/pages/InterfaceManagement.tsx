/**
 * @page 接口管理
 * @version V1.0.8
 * @base 需求文档待补充，按截图实现
 * @changes
 *   - V1.0.0: 初始实现接口管理页面；左侧树形目录、右侧接口列表、支持搜索/批量操作/右键菜单
 *   - V1.0.1: 左右分栏中间分隔条支持鼠标拖动调整左侧宽度
 *   - V1.0.2: 左侧默认宽度为视口约 25%（与截图左右约 1:3 比例一致），仍受最小/最大像素约束
 *   - V1.0.3: 点击树接口自动展开场景子节点（紫色齿轮）；右侧「接口预览」默认只读、「接口定义」可编辑并保存写回 Mock
 *   - V1.0.4: 左侧顶部「搜索框 + 加号按钮」合并到同一行（按钮在右）；搜索框按「接口名称」做模糊匹配并自动展开命中接口所在目录
 *   - V1.0.5: 顶部新增「团队 / 项目」两个下拉（用户已加入的团队，默认第一团队第一项目；localStorage 持久化）；
 *             接口数据按 `ApiCategory.projectId` 与当前项目绑定，切换项目时左侧目录与右侧列表/详情同步刷新；
 *             新建/移动目录的父目录候选只显示当前项目下的目录 + root
 *   - V1.0.6: 左侧树点击「接口场景（用例）」节点时，右侧展示 Postman 式场景调试详情（环境、完整 URL、 Params/Body/Headers 等、底部响应区占位）；
 *             `ApiInterfaceScenario` 支持场景级 path/query 参数表（缺省继承父接口）；Mock「查询环境列表」与原型示例对齐
 *   - V1.0.7: 场景 Params 表列宽均分；Path 区去掉「添加」；Query 表底行「添加」增行、操作列启用/禁用开关（默认开）；
 *             点击「发送」自动弹出底部响应抽屉，支持展开/收起；抽屉挂载于右侧详情区容器内，宽度与详情页一致；
 *             右侧列表「接口名称」可点击，与左侧树选中接口一致进入「接口预览」详情
 *   - V1.0.8: 修正全屏 Card 高度计算（margin:-24 抵消 padding 后应用 PAGE_BLEED_HEIGHT），消除页面底部大块空白
 */
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Card,
  Tree,
  Table,
  Input,
  Button,
  Select,
  Space,
  Dropdown,
  Menu,
  Tag,
  Modal,
  Form,
  message,
  Empty,
  Tabs,
  Typography,
  Descriptions,
  Divider,
  Badge,
  Switch,
  Drawer,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  ApiOutlined,
  ImportOutlined,
  FolderAddOutlined,
  ArrowRightOutlined,
  SettingOutlined,
  MoreOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type {
  ApiCategory,
  ApiDefinition,
  ApiEnvironment,
  ApiInterfaceScenario,
  ApiMethod,
  ApiParamRow,
  Project,
  Team,
} from '@/types';
import {
  mockApiCategories,
  mockApiDefinitions,
  mockApiEnvironments,
  mockCurrentUserTeamIds,
  mockProjects,
  mockTeams,
} from '@/mocks/data';
import { PAGE_BLEED_HEIGHT } from '@/constants/ui';

const { Option } = Select;

/** 左侧目录区宽度（px）：最小 / 最大；默认按视口比例（约 1:3） */
const LEFT_PANEL_MIN = 200;
const LEFT_PANEL_MAX = 640;
/** 左侧默认占视口宽度（与截图侧栏约 25%、列表约 75% 对齐） */
const LEFT_PANEL_VIEWPORT_RATIO = 0.25;

function getInitialLeftPanelWidth(): number {
  if (typeof window === 'undefined') {
    return 360;
  }
  const raw = Math.floor(window.innerWidth * LEFT_PANEL_VIEWPORT_RATIO);
  return Math.min(LEFT_PANEL_MAX, Math.max(LEFT_PANEL_MIN, raw));
}

const API_TREE_PREFIX = 'api-';
const SCENARIO_TREE_PREFIX = 'scenario-';

/** localStorage 键名（页面级偏好：当前团队 / 当前项目） */
const LS_KEY_TEAM = 'interfaceMgmt:currentTeamId';
const LS_KEY_PROJECT = 'interfaceMgmt:currentProjectId';

/** 当前用户已加入的团队列表（按 mockCurrentUserTeamIds 过滤 mockTeams） */
function getUserTeams(): Team[] {
  const allow = new Set(mockCurrentUserTeamIds);
  return mockTeams.filter((t) => allow.has(t.id));
}

/** 给定团队 id，返回该团队下的项目列表（按 Project.team === Team.name 匹配） */
function getProjectsByTeam(teamId: string): Project[] {
  const team = mockTeams.find((t) => t.id === teamId);
  if (!team) return [];
  return mockProjects.filter((p) => p.team === team.name);
}

/** 读取持久化的「团队 + 项目」，并兜底校验有效性 */
function readPersistedScope(): { teamId: string; projectId: string } {
  const userTeams = getUserTeams();
  let teamId = userTeams[0]?.id ?? '';
  let projectId = getProjectsByTeam(teamId)[0]?.id ?? '';

  if (typeof window === 'undefined') {
    return { teamId, projectId };
  }
  try {
    const savedTeam = window.localStorage.getItem(LS_KEY_TEAM);
    const savedProject = window.localStorage.getItem(LS_KEY_PROJECT);
    if (savedTeam && userTeams.some((t) => t.id === savedTeam)) {
      teamId = savedTeam;
    }
    const projectsForTeam = getProjectsByTeam(teamId);
    if (savedProject && projectsForTeam.some((p) => p.id === savedProject)) {
      projectId = savedProject;
    } else {
      projectId = projectsForTeam[0]?.id ?? '';
    }
  } catch {
    /* 隐私模式 / 容量受限：保持兜底默认值 */
  }
  return { teamId, projectId };
}

/** HTTP 方法对应的 Tag 颜色（POST 与参考图一致用橙色） */
const METHOD_TAG_COLORS: Record<ApiMethod, string> = {
  GET: 'green',
  POST: 'orange',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'purple',
  HEAD: 'cyan',
  OPTIONS: 'default',
};

/** 工具栏样式 */
const TOOLBAR_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
  gap: 12,
};

function parseSelectedApiId(selectedTreeKey: string, apis: ApiDefinition[]): string | null {
  if (selectedTreeKey.startsWith(API_TREE_PREFIX)) {
    return selectedTreeKey.slice(API_TREE_PREFIX.length);
  }
  if (selectedTreeKey.startsWith(SCENARIO_TREE_PREFIX)) {
    const sid = selectedTreeKey.slice(SCENARIO_TREE_PREFIX.length);
    for (const a of apis) {
      if (a.scenarios?.some((s) => s.id === sid)) return a.id;
    }
  }
  return null;
}

/** 树 key 为 `scenario-*` 时解析场景 id；否则 null */
function parseScenarioNodeKey(selectedTreeKey: string): string | null {
  if (!selectedTreeKey.startsWith(SCENARIO_TREE_PREFIX)) return null;
  return selectedTreeKey.slice(SCENARIO_TREE_PREFIX.length);
}

function buildFullUrl(baseUrl: string, pathPart: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const p = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  return `${base}${p}`;
}

/** 场景级 path/query 表优先，缺省继承父接口；Query 行默认启用 */
function resolveScenarioParams(api: ApiDefinition, scenario: ApiInterfaceScenario): {
  pathParams: ApiParamRow[];
  queryParams: ApiParamRow[];
} {
  const queryParams = (scenario.queryParams ?? api.queryParams ?? []).map((row) => ({
    ...row,
    enabled: row.enabled !== false,
  }));
  return {
    pathParams: scenario.pathParams ?? api.pathParams ?? [],
    queryParams,
  };
}

/** 场景调试参数表：四列均分宽度 */
const SCENARIO_PARAM_TABLE_LAYOUT: React.CSSProperties = { tableLayout: 'fixed', width: '100%' };
const SCENARIO_PARAM_COL_WIDTH = '25%';

function isQueryParamEnabled(row: ApiParamRow): boolean {
  return row.enabled !== false;
}

/** 构建树形数据（目录展开后挂接口；接口可展开挂「接口场景」子节点） */
function buildTreeData(
  categories: ApiCategory[],
  apis: ApiDefinition[],
  parentId: string | null = null,
  expandedKeys: string[] = [],
  selectedTreeKey: string = '',
  searchKeyword: string = ''
): DataNode[] {
  const kw = searchKeyword.trim().toLowerCase();
  const isSearching = kw.length > 0;

  /** 该目录（含所有后代目录）下是否存在名称命中关键词的接口 */
  const categoryHasMatch = (catId: string): boolean => {
    if (apis.some((a) => a.categoryId === catId && a.name.toLowerCase().includes(kw))) {
      return true;
    }
    return categories.some((c) => c.parentId === catId && categoryHasMatch(c.id));
  };

  const nodes = categories
    .filter((cat) => cat.parentId === parentId)
    .filter((cat) => !isSearching || categoryHasMatch(cat.id))
    .sort((a, b) => a.sort - b.sort);

  return nodes.map((node) => {
    const childrenCategories = buildTreeData(categories, apis, node.id, expandedKeys, selectedTreeKey, searchKeyword);
    // 搜索时强制展开命中目录，便于直接看到匹配的接口
    const isExpanded = isSearching ? true : expandedKeys.includes(node.id);
    const isSelected = selectedTreeKey === node.id;
    const isRoot = node.parentId === null;

    let apiChildren: DataNode[] = [];
    if (isExpanded) {
      let categoryApis = apis.filter((api) => api.categoryId === node.id);
      if (isSearching) {
        categoryApis = categoryApis.filter((api) => api.name.toLowerCase().includes(kw));
      }
      apiChildren = categoryApis.map((api) => {
        const apiKey = `${API_TREE_PREFIX}${api.id}`;
        const scenarios = api.scenarios ?? [];
        const hasScenarios = scenarios.length > 0;
        const scenarioChildren: DataNode[] = hasScenarios
          ? scenarios.map((sc) => ({
              key: `${SCENARIO_TREE_PREFIX}${sc.id}`,
              title: (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 4px',
                    borderRadius: 4,
                    backgroundColor:
                      selectedTreeKey === `${SCENARIO_TREE_PREFIX}${sc.id}` ? '#e6f4ff' : 'transparent',
                  }}
                >
                  <SettingOutlined style={{ color: '#722ED1', fontSize: 14 }} />
                  <span style={{ fontSize: 13 }}>{sc.name}</span>
                </div>
              ),
              isLeaf: true,
              selectable: true,
            }))
          : [];
        const isApiSelected =
          selectedTreeKey === apiKey ||
          scenarios.some((s) => selectedTreeKey === `${SCENARIO_TREE_PREFIX}${s.id}`);

        return {
          key: apiKey,
          title: (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '2px 4px',
                borderRadius: 4,
                backgroundColor: isApiSelected ? '#e6f4ff' : 'transparent',
              }}
            >
              <Tag color={METHOD_TAG_COLORS[api.method]} style={{ margin: 0, fontSize: 12 }}>
                {api.method}
              </Tag>
              <span style={{ fontSize: 13 }}>{api.name}</span>
            </div>
          ),
          children: hasScenarios ? scenarioChildren : undefined,
          isLeaf: !hasScenarios,
        };
      });
    }

    const children = [...childrenCategories, ...apiChildren];
    const titleMatch = searchKeyword && node.name.toLowerCase().includes(searchKeyword.toLowerCase());
    const apiCount = apis.filter((api) => api.categoryId === node.id).length;

    const title = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: isSelected ? '#e6f4ff' : 'transparent',
          padding: '2px 4px',
          borderRadius: 4,
        }}
      >
        {isRoot ? (
          <FolderOutlined style={{ color: '#1677ff' }} />
        ) : isExpanded ? (
          <FolderOpenOutlined style={{ color: '#faad14' }} />
        ) : (
          <FolderOutlined style={{ color: '#faad14' }} />
        )}
        <span style={{ fontWeight: titleMatch ? 600 : 400 }}>{node.name}</span>
        {apiCount > 0 && !isExpanded && <span style={{ color: '#999', fontSize: 12 }}>({apiCount})</span>}
      </div>
    );

    return {
      key: node.id,
      title,
      children: children.length > 0 ? children : undefined,
      isLeaf: children.length === 0 && apiCount === 0,
    };
  });
}

const REQUIRED_CN = (r: boolean) => (r ? '是' : '否');

function paramColumnsReadonly(): ColumnsType<ApiParamRow> {
  return [
    { title: '参数名', dataIndex: 'name', width: 140, ellipsis: true },
    { title: '默认值', dataIndex: 'defaultValue', ellipsis: true, render: (v) => v ?? '—' },
    { title: '是否必须', dataIndex: 'required', width: 96, render: (v: boolean) => REQUIRED_CN(!!v) },
    { title: '说明', dataIndex: 'description', ellipsis: true, render: (v) => v ?? '—' },
  ];
}

function makeParamFormColumns(
  field: 'pathParams' | 'queryParams',
  isPreview: boolean
): ColumnsType<{ index: number }> {
  return [
    {
      title: '参数名',
      key: 'name',
      render: (_, r) => (
        <Form.Item name={[field, r.index, 'name']} noStyle rules={[{ required: true, message: '必填' }]}>
          <Input size="small" disabled={isPreview} />
        </Form.Item>
      ),
    },
    {
      title: '默认值',
      key: 'def',
      render: (_, r) => (
        <Form.Item name={[field, r.index, 'defaultValue']} noStyle>
          <Input size="small" disabled={isPreview} />
        </Form.Item>
      ),
    },
    {
      title: '是否必须',
      key: 'req',
      width: 100,
      render: (_, r) => (
        <Form.Item name={[field, r.index, 'required']} noStyle>
          <Select
            size="small"
            disabled={isPreview}
            options={[
              { value: true, label: '是' },
              { value: false, label: '否' },
            ]}
          />
        </Form.Item>
      ),
    },
    {
      title: '说明',
      key: 'desc',
      render: (_, r) => (
        <Form.Item name={[field, r.index, 'description']} noStyle>
          <Input size="small" disabled={isPreview} />
        </Form.Item>
      ),
    },
  ];
}

type ApiScenarioCasePaneProps = {
  api: ApiDefinition;
  scenario: ApiInterfaceScenario;
  moduleName: string;
  environments: ApiEnvironment[];
  envId: string;
  onEnvChange: (id: string) => void;
};

/** 接口场景（用例）调试详情：对齐 Postman / 接口调试原型 */
function ApiScenarioCasePane({
  api,
  scenario,
  moduleName,
  environments,
  envId,
  onEnvChange,
}: ApiScenarioCasePaneProps) {
  const envBase = environments.find((e) => e.id === envId)?.baseUrl ?? '';
  const fullUrl = useMemo(() => buildFullUrl(envBase, api.path), [envBase, api.path]);

  const resolved = useMemo(() => resolveScenarioParams(api, scenario), [api, scenario]);

  const [pathRows, setPathRows] = useState<ApiParamRow[]>(() => [...resolved.pathParams]);
  const [queryRows, setQueryRows] = useState<ApiParamRow[]>(() => [...resolved.queryParams]);
  const [docTab, setDocTab] = useState<'api' | 'scenario'>('scenario');
  const [reqTab, setReqTab] = useState<string>('params');
  const [respTab, setRespTab] = useState<string>('body');
  const [respDrawerOpen, setRespDrawerOpen] = useState(false);
  const [respDrawerExpanded, setRespDrawerExpanded] = useState(true);
  const [mockRespStatus, setMockRespStatus] = useState<{ code: number; durationMs: number; sizeText: string } | null>(
    null
  );

  useEffect(() => {
    const r = resolveScenarioParams(api, scenario);
    setPathRows([...r.pathParams]);
    setQueryRows([...r.queryParams]);
    setRespDrawerOpen(false);
    setMockRespStatus(null);
  }, [api.id, scenario.id, api.pathParams, api.queryParams, scenario.pathParams, scenario.queryParams]);

  const patchPath = useCallback((index: number, patch: Partial<ApiParamRow>) => {
    setPathRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);
  const patchQuery = useCallback((index: number, patch: Partial<ApiParamRow>) => {
    setQueryRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const removePath = useCallback((index: number) => {
    setPathRows((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const removeQuery = useCallback((index: number) => {
    setQueryRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const appendQueryRow = useCallback(() => {
    setQueryRows((prev) => [
      ...prev,
      { name: '', defaultValue: '', required: false, description: '', enabled: true },
    ]);
  }, []);

  const enabledQueryCount = useMemo(
    () => queryRows.filter((r) => isQueryParamEnabled(r) && r.name.trim()).length,
    [queryRows]
  );
  const paramCount = pathRows.length + enabledQueryCount;

  const pathColumns: ColumnsType<ApiParamRow> = useMemo(
    () => [
      {
        title: '参数名',
        dataIndex: 'name',
        width: SCENARIO_PARAM_COL_WIDTH,
        ellipsis: true,
        render: (_: unknown, row: ApiParamRow, index?: number) => (
          <Input
            size="small"
            value={row.name}
            onChange={(e) => patchPath(index!, { name: e.target.value })}
            placeholder="参数名"
            variant="borderless"
          />
        ),
      },
      {
        title: '参数值',
        dataIndex: 'defaultValue',
        width: SCENARIO_PARAM_COL_WIDTH,
        render: (_: unknown, row: ApiParamRow, index?: number) => (
          <Input
            size="small"
            value={row.defaultValue ?? ''}
            onChange={(e) => patchPath(index!, { defaultValue: e.target.value })}
            placeholder="参数值"
            variant="borderless"
          />
        ),
      },
      {
        title: '说明',
        dataIndex: 'description',
        width: SCENARIO_PARAM_COL_WIDTH,
        ellipsis: true,
        render: (_: unknown, row: ApiParamRow, index?: number) => (
          <Input
            size="small"
            value={row.description ?? ''}
            onChange={(e) => patchPath(index!, { description: e.target.value })}
            placeholder="说明"
            variant="borderless"
          />
        ),
      },
      {
        title: '操作',
        key: 'op',
        width: SCENARIO_PARAM_COL_WIDTH,
        align: 'center',
        render: (_: unknown, __: ApiParamRow, index?: number) => (
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => removePath(index!)} />
        ),
      },
    ],
    [patchPath, removePath]
  );

  const queryColumns: ColumnsType<ApiParamRow> = useMemo(
    () => [
      {
        title: '参数名',
        dataIndex: 'name',
        width: SCENARIO_PARAM_COL_WIDTH,
        ellipsis: true,
        render: (_: unknown, row: ApiParamRow, index?: number) => (
          <Input
            size="small"
            value={row.name}
            onChange={(e) => patchQuery(index!, { name: e.target.value })}
            placeholder="参数名"
            variant="borderless"
            disabled={!isQueryParamEnabled(row)}
          />
        ),
      },
      {
        title: '参数值',
        dataIndex: 'defaultValue',
        width: SCENARIO_PARAM_COL_WIDTH,
        render: (_: unknown, row: ApiParamRow, index?: number) => (
          <Input
            size="small"
            value={row.defaultValue ?? ''}
            onChange={(e) => patchQuery(index!, { defaultValue: e.target.value })}
            placeholder="参数值"
            variant="borderless"
            disabled={!isQueryParamEnabled(row)}
          />
        ),
      },
      {
        title: '说明',
        dataIndex: 'description',
        width: SCENARIO_PARAM_COL_WIDTH,
        ellipsis: true,
        render: (_: unknown, row: ApiParamRow, index?: number) => (
          <Input
            size="small"
            value={row.description ?? ''}
            onChange={(e) => patchQuery(index!, { description: e.target.value })}
            placeholder="说明"
            variant="borderless"
            disabled={!isQueryParamEnabled(row)}
          />
        ),
      },
      {
        title: '操作',
        key: 'op',
        width: SCENARIO_PARAM_COL_WIDTH,
        align: 'center',
        render: (_: unknown, row: ApiParamRow, index?: number) => (
          <Space size={4}>
            <Switch
              size="small"
              checked={isQueryParamEnabled(row)}
              onChange={(checked) => patchQuery(index!, { enabled: checked })}
            />
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeQuery(index!)}
            />
          </Space>
        ),
      },
    ],
    [patchQuery, removeQuery]
  );

  const handleSend = () => {
    const activeQuery = queryRows.filter((r) => isQueryParamEnabled(r) && r.name.trim());
    setMockRespStatus({ code: 200, durationMs: 128, sizeText: '1.2 KB' });
    setRespDrawerOpen(true);
    setRespDrawerExpanded(true);
    message.success(`Mock：已发送（${activeQuery.length} 个 Query 入参）`);
  };

  const handleSaveScenarioParams = () => {
    message.success('Mock：当前场景参数已暂存（刷新后丢失，未接持久化接口）');
  };

  const paramsPanel = (
    <div style={{ padding: '0 16px 16px', overflow: 'auto' }}>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
        Path 参数
      </Typography.Text>
      <Table
        size="small"
        rowKey={(_, i) => `sp-${i}`}
        columns={pathColumns}
        dataSource={pathRows}
        pagination={false}
        locale={{ emptyText: '无 Path 参数' }}
        style={{ marginBottom: 24, ...SCENARIO_PARAM_TABLE_LAYOUT }}
      />
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
        Query 参数
      </Typography.Text>
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
        <Table
          size="small"
          rowKey={(_, i) => `sq-${i}`}
          columns={queryColumns}
          dataSource={queryRows}
          pagination={false}
          locale={{ emptyText: ' ' }}
          style={SCENARIO_PARAM_TABLE_LAYOUT}
          onRow={(row) =>
            !isQueryParamEnabled(row)
              ? { style: { opacity: 0.55, background: '#fafafa' } }
              : {}
          }
        />
        <div
          role="button"
          tabIndex={0}
          onClick={appendQueryRow}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              appendQueryRow();
            }
          }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            alignItems: 'center',
            minHeight: 40,
            cursor: 'pointer',
            background: '#fafafa',
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <span style={{ padding: '8px 12px', color: '#1677ff' }}>添加</span>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );

  const tabLabel = (text: string, count?: number) =>
    count === undefined ? (
      text
    ) : (
      <span>
        {text}{' '}
        <Badge count={count} size="small" color="#1677ff" showZero />
      </span>
    );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {/* 顶部「文档」Tab：父接口 vs 当前场景 */}
      <Tabs
        activeKey={docTab}
        onChange={(k) => setDocTab(k as 'api' | 'scenario')}
        size="small"
        tabBarStyle={{ margin: 0, paddingLeft: 8, paddingRight: 8, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}
        items={[
          {
            key: 'api',
            label: (
              <Space size={6}>
                <Tag color={METHOD_TAG_COLORS[api.method]} style={{ margin: 0 }}>
                  {api.method}
                </Tag>
                <span>{api.name}</span>
              </Space>
            ),
          },
          {
            key: 'scenario',
            label: (
              <Space size={6}>
                <SettingOutlined style={{ color: '#722ED1' }} />
                <span>{scenario.name}</span>
              </Space>
            ),
          },
        ]}
      />

      {docTab === 'scenario' ? (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 16px',
              borderBottom: '1px solid #f0f0f0',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              接口用例 · 所属目录：{moduleName}
            </Typography.Text>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                background: '#f5f5f5',
                borderRadius: 8,
                border: '1px solid #e8e8e8',
              }}
            >
              <Typography.Text strong style={{ fontSize: 14, color: 'rgba(0,0,0,0.88)', whiteSpace: 'nowrap' }}>
                环境
              </Typography.Text>
              <Select
                value={envId}
                onChange={onEnvChange}
                style={{ minWidth: 200 }}
                size="middle"
                options={environments.map((e) => ({ value: e.id, label: e.name }))}
              />
            </div>
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', width: '100%' }}>
              <Select
                size="large"
                value={api.method}
                disabled
                style={{ width: 104, flexShrink: 0 }}
                options={[{ value: api.method, label: api.method }]}
              />
              <Input size="large" value={fullUrl} readOnly style={{ flex: 1, minWidth: 120, borderRadius: 0 }} />
              <Button type="primary" size="large" onClick={handleSend} style={{ flexShrink: 0, borderRadius: 0 }}>
                发送
              </Button>
              <Button size="large" onClick={handleSaveScenarioParams} style={{ flexShrink: 0, borderRadius: 0 }}>
                保存
              </Button>
              <Button size="large" icon={<MoreOutlined />} title="更多" style={{ flexShrink: 0 }} />
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Tabs
              activeKey={reqTab}
              onChange={setReqTab}
              size="small"
              tabBarStyle={{ margin: 0, paddingLeft: 12 }}
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
              items={[
                { key: 'params', label: tabLabel('Params', paramCount), children: paramsPanel },
                {
                  key: 'body',
                  label: 'Body',
                  children: (
                    <div style={{ padding: 16 }}>
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 Body（Mock）" />
                    </div>
                  ),
                },
                { key: 'headers', label: tabLabel('Headers', 1), children: <div style={{ padding: 16 }}><Typography.Text type="secondary">Content-Type: application/json（示例）</Typography.Text></div> },
                { key: 'cookies', label: 'Cookies', children: <div style={{ padding: 16 }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 Cookies" /></div> },
                { key: 'extract', label: tabLabel('变量提取', 1), children: <div style={{ padding: 16 }}><Typography.Text type="secondary">提取规则配置占位</Typography.Text></div> },
                { key: 'assert', label: tabLabel('断言', 1), children: <div style={{ padding: 16 }}><Typography.Text type="secondary">断言规则配置占位</Typography.Text></div> },
              ]}
            />
          </div>

          <Drawer
            getContainer={false}
            rootStyle={{ position: 'absolute' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Space wrap size={12}>
                  <span>响应结果</span>
                  {mockRespStatus ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      状态码：{mockRespStatus.code}　耗时：{mockRespStatus.durationMs} ms　大小：
                      {mockRespStatus.sizeText}
                    </Typography.Text>
                  ) : (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      点击「发送」后展示响应
                    </Typography.Text>
                  )}
                </Space>
                <Button
                  type="text"
                  size="small"
                  icon={respDrawerExpanded ? <DownOutlined /> : <UpOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRespDrawerExpanded((v) => !v);
                  }}
                >
                  {respDrawerExpanded ? '收起' : '展开'}
                </Button>
              </div>
            }
            placement="bottom"
            open={respDrawerOpen}
            onClose={() => setRespDrawerOpen(false)}
            height={respDrawerExpanded ? '45%' : 88}
            mask={false}
            destroyOnClose={false}
            styles={{
              wrapper: { position: 'absolute', width: '100%' },
              body: { padding: 0, overflow: 'hidden' },
              header: { padding: '8px 16px' },
            }}
          >
            {respDrawerExpanded ? (
              <Tabs
                activeKey={respTab}
                onChange={setRespTab}
                size="small"
                tabBarStyle={{ margin: 0, paddingLeft: 12, background: '#fff' }}
                items={[
                  {
                    key: 'body',
                    label: 'Body',
                    children: (
                      <div style={{ padding: 12, minHeight: 120 }}>
                        <Typography.Text type="secondary">
                          {mockRespStatus
                            ? '{"code":0,"message":"success","data":[]}'
                            : '等待发送请求…'}
                        </Typography.Text>
                      </div>
                    ),
                  },
                  {
                    key: 'header',
                    label: 'Header',
                    children: (
                      <div style={{ padding: 12 }}>
                        <Typography.Text type="secondary">Content-Type: application/json</Typography.Text>
                      </div>
                    ),
                  },
                  {
                    key: 'req',
                    label: '实际请求',
                    children: (
                      <div style={{ padding: 12 }}>
                        <Typography.Text code copyable style={{ fontSize: 12 }}>
                          {api.method} {fullUrl}
                        </Typography.Text>
                      </div>
                    ),
                  },
                ]}
              />
            ) : null}
          </Drawer>

        </>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            父接口摘要
          </Typography.Title>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="名称">{api.name}</Descriptions.Item>
            <Descriptions.Item label="方法">{api.method}</Descriptions.Item>
            <Descriptions.Item label="路径">{api.path}</Descriptions.Item>
            <Descriptions.Item label="类型">{api.type}</Descriptions.Item>
            <Descriptions.Item label="说明">{api.description?.trim() ? api.description : '—'}</Descriptions.Item>
          </Descriptions>
          <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
            调试请切换到「{scenario.name}」场景 Tab。
          </Typography.Paragraph>
        </div>
      )}
    </div>
  );
}

type ApiInterfaceDetailPaneProps = {
  api: ApiDefinition;
  moduleName: string;
  envLabel: string;
  detailTab: 'preview' | 'definition';
  onDetailTabChange: (tab: 'preview' | 'definition') => void;
  onSave: (patch: Partial<ApiDefinition>) => void;
};

function ApiInterfaceDetailPane({
  api,
  moduleName,
  envLabel,
  detailTab,
  onDetailTabChange,
  onSave,
}: ApiInterfaceDetailPaneProps) {
  const [form] = Form.useForm<{
    path: string;
    remark: string;
    method: ApiMethod;
    pathParams: ApiParamRow[];
    queryParams: ApiParamRow[];
  }>();

  useEffect(() => {
    form.setFieldsValue({
      path: api.path,
      remark: api.remark ?? '',
      method: api.method,
      pathParams: api.pathParams?.length ? [...api.pathParams] : [],
      queryParams: api.queryParams?.length ? [...api.queryParams] : [],
    });
  }, [api.id, api.path, api.remark, api.method, api.pathParams, api.queryParams, form]);

  const isPreview = detailTab === 'preview';
  const pathParams = api.pathParams ?? [];
  const queryParams = api.queryParams ?? [];
  const pathParamsWatch = Form.useWatch('pathParams', form) ?? [];
  const queryParamsWatch = Form.useWatch('queryParams', form) ?? [];

  const submit = async () => {
    try {
      const v = await form.validateFields();
      onSave({
        path: v.path,
        remark: v.remark,
        method: v.method,
        pathParams: v.pathParams ?? [],
        queryParams: v.queryParams ?? [],
        updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      });
      message.success('已保存');
      onDetailTabChange('preview');
    } catch {
      /* validate */
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space wrap>
          <Tag color={METHOD_TAG_COLORS[api.method]}>{api.method}</Tag>
          <Typography.Text code copyable>
            {api.path}
          </Typography.Text>
          <Typography.Text type="secondary">· {moduleName}</Typography.Text>
        </Space>
        <Space>
          <Typography.Text type="secondary">环境：{envLabel}</Typography.Text>
          {detailTab === 'definition' ? (
            <Button type="primary" onClick={submit}>
              保存
            </Button>
          ) : null}
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <Tabs
          activeKey={detailTab}
          onChange={(k) => onDetailTabChange(k as 'preview' | 'definition')}
          items={[
            {
              key: 'preview',
              label: '接口预览',
              children: (
                <div>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    基本信息
                  </Typography.Title>
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="请求方式">{api.method}</Descriptions.Item>
                    <Descriptions.Item label="请求类型">{api.requestProtocol ?? 'HTTP'}</Descriptions.Item>
                    <Descriptions.Item label="接口路径">{api.path}</Descriptions.Item>
                  </Descriptions>
                  <Divider orientationMargin={8}>备注</Divider>
                  <div
                    style={{
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: 12,
                      minHeight: 48,
                    }}
                  >
                    <Typography.Text type="secondary">{api.remark?.trim() ? api.remark : '—'}</Typography.Text>
                  </div>
                  <Divider orientationMargin={8}>请求参数</Divider>
                  <Tabs
                    size="small"
                    defaultActiveKey="query"
                    items={[
                      {
                        key: 'query',
                        label: 'Query',
                        children: (
                          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <Typography.Text strong>Path 参数</Typography.Text>
                            <Table
                              size="small"
                              rowKey={(_, i) => `p-${i}`}
                              columns={paramColumnsReadonly()}
                              dataSource={pathParams}
                              pagination={false}
                              locale={{ emptyText: '无 Path 参数' }}
                            />
                            <Typography.Text strong>Query 参数</Typography.Text>
                            <Table
                              size="small"
                              rowKey={(_, i) => `q-${i}`}
                              columns={paramColumnsReadonly()}
                              dataSource={queryParams}
                              pagination={false}
                              locale={{ emptyText: '无 Query 参数' }}
                            />
                          </Space>
                        ),
                      },
                      { key: 'headers', label: 'Headers', children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 Headers 配置" /> },
                      { key: 'body', label: 'Body', children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 Body 配置" /> },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'definition',
              label: '接口定义',
              children: (
                <Form form={form} layout="vertical" disabled={false}>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    基本信息
                  </Typography.Title>
                  <Form.Item name="method" label="请求方式" rules={[{ required: true }]}>
                    <Select
                      disabled={isPreview}
                      options={(Object.keys(METHOD_TAG_COLORS) as ApiMethod[]).map((m) => ({
                        value: m,
                        label: m,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="path" label="接口路径" rules={[{ required: true, message: '请输入路径' }]}>
                    <Input disabled={isPreview} placeholder="/oms/..." />
                  </Form.Item>
                  <Form.Item name="remark" label="备注">
                    <Input.TextArea rows={3} disabled={isPreview} placeholder="备注说明" />
                  </Form.Item>
                  <Divider orientationMargin={8}>请求参数</Divider>
                  <Tabs
                    size="small"
                    defaultActiveKey="query"
                    items={[
                      {
                        key: 'query',
                        label: 'Query',
                        children: (
                          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <Typography.Text strong>Path 参数</Typography.Text>
                            <Table
                              size="small"
                              rowKey={(r) => `ep-${r.index}`}
                              columns={makeParamFormColumns('pathParams', isPreview)}
                              dataSource={pathParamsWatch.map((_, index) => ({ index }))}
                              pagination={false}
                              locale={{ emptyText: '无 Path 参数' }}
                            />
                            <Typography.Text strong>Query 参数</Typography.Text>
                            <Table
                              size="small"
                              rowKey={(r) => `eq-${r.index}`}
                              columns={makeParamFormColumns('queryParams', isPreview)}
                              dataSource={queryParamsWatch.map((_, index) => ({ index }))}
                              pagination={false}
                              locale={{ emptyText: '无 Query 参数' }}
                            />
                          </Space>
                        ),
                      },
                      { key: 'headers', label: 'Headers', children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Headers 编辑占位" /> },
                      { key: 'body', label: 'Body', children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Body 编辑占位" /> },
                    ]}
                  />
                </Form>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

export function InterfaceManagement() {
  // === 状态管理 ===
  const [categories, setCategories] = useState<ApiCategory[]>(mockApiCategories);
  const [apis, setApis] = useState<ApiDefinition[]>(mockApiDefinitions);

  /** 当前登录用户已加入的团队（管理员可通过 mockCurrentUserTeamIds 调整） */
  const userTeams = useMemo(() => getUserTeams(), []);
  /** 当前选中团队 / 项目（首次从 localStorage 读取并校验，未命中走兜底默认值） */
  const persistedScope = useMemo(() => readPersistedScope(), []);
  const [currentTeamId, setCurrentTeamId] = useState<string>(persistedScope.teamId);
  const [currentProjectId, setCurrentProjectId] = useState<string>(persistedScope.projectId);

  /** 当前选中团队下可见的项目列表 */
  const availableProjects = useMemo(
    () => getProjectsByTeam(currentTeamId),
    [currentTeamId]
  );

  /** 根据当前项目，求该项目下可见的「目录 + 接口」（root 始终全局可见） */
  const projectCategories = useMemo(() => {
    return categories.filter((c) => c.id === 'root' || c.projectId === currentProjectId);
  }, [categories, currentProjectId]);
  const projectApis = useMemo(() => {
    const ids = new Set(projectCategories.map((c) => c.id));
    return apis.filter((a) => ids.has(a.categoryId));
  }, [apis, projectCategories]);

  /** 求当前项目的「首选默认目录」（root 下第一个 sort 最小的项目级目录） */
  const pickDefaultCategoryId = useCallback(
    (projectId: string): string => {
      const first = categories
        .filter((c) => c.parentId === 'root' && c.projectId === projectId)
        .sort((a, b) => a.sort - b.sort)[0];
      return first?.id ?? 'root';
    },
    [categories]
  );

  /** 树当前选中节点：目录 id、或 `api-*`、或 `scenario-*` */
  const [selectedTreeKey, setSelectedTreeKey] = useState<string>(() =>
    pickDefaultCategoryId(persistedScope.projectId)
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() =>
    pickDefaultCategoryId(persistedScope.projectId)
  );
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => {
    const def = pickDefaultCategoryId(persistedScope.projectId);
    return def === 'root' ? ['root'] : ['root', def];
  });
  const [currentEnv, setCurrentEnv] = useState<string>(mockApiEnvironments[0]?.id || '');
  /** 右侧接口详情：接口预览（只读） / 接口定义（可编辑），默认预览 */
  const [detailTab, setDetailTab] = useState<'preview' | 'definition'>('preview');

  // 搜索关键词
  const [treeSearch, setTreeSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');

  // 选中行
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 右键菜单状态
  const [contextMenuNode, setContextMenuNode] = useState<ApiCategory | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // 弹窗状态
  const [addApiModalOpen, setAddApiModalOpen] = useState(false);
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [editCategoryModalOpen, setEditCategoryModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);

  const [addApiForm] = Form.useForm();
  const [addCategoryForm] = Form.useForm();
  const [editCategoryForm] = Form.useForm();
  const [moveForm] = Form.useForm();

  /** 左侧树区域宽度，可通过中间分隔条拖动调整 */
  const [leftPanelWidth, setLeftPanelWidth] = useState(getInitialLeftPanelWidth);
  const splitDragging = useRef(false);
  const splitStartX = useRef(0);
  const splitStartWidth = useRef(0);

  useEffect(() => {
    const clamp = (w: number) =>
      Math.min(LEFT_PANEL_MAX, Math.max(LEFT_PANEL_MIN, w));

    const onMove = (e: MouseEvent) => {
      if (!splitDragging.current) return;
      const delta = e.clientX - splitStartX.current;
      const maxByViewport = Math.min(LEFT_PANEL_MAX, Math.floor(window.innerWidth * 0.55));
      setLeftPanelWidth(clamp(Math.min(splitStartWidth.current + delta, maxByViewport)));
    };

    const onUp = () => {
      if (!splitDragging.current) return;
      splitDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    splitDragging.current = true;
    splitStartX.current = e.clientX;
    splitStartWidth.current = leftPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftPanelWidth]);

  // === 计算属性 ===
  const treeData = useMemo(() => {
    return buildTreeData(projectCategories, projectApis, null, expandedKeys, selectedTreeKey, treeSearch);
  }, [projectCategories, projectApis, expandedKeys, selectedTreeKey, treeSearch]);

  /** 搜索时把命中接口所在的目录链路自动展开（合并到用户已展开的 keys 上） */
  const displayExpandedKeys = useMemo<React.Key[]>(() => {
    const kw = treeSearch.trim().toLowerCase();
    if (!kw) return expandedKeys;
    const auto = new Set<string>(expandedKeys);
    projectApis.forEach((api) => {
      if (!api.name.toLowerCase().includes(kw)) return;
      let curId: string | null | undefined = api.categoryId;
      while (curId) {
        auto.add(curId);
        const parent = projectCategories.find((c) => c.id === curId);
        curId = parent?.parentId ?? null;
      }
    });
    return Array.from(auto);
  }, [projectApis, projectCategories, expandedKeys, treeSearch]);

  /** 切换项目：刷新左侧选中节点 + 展开链 + 清空批量勾选/搜索，并持久化偏好 */
  const handleProjectChange = useCallback(
    (projectId: string) => {
      setCurrentProjectId(projectId);
      const def = pickDefaultCategoryId(projectId);
      setSelectedTreeKey(def);
      setSelectedCategoryId(def);
      setExpandedKeys(def === 'root' ? ['root'] : ['root', def]);
      setSelectedRowKeys([]);
      setTreeSearch('');
      setTableSearch('');
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LS_KEY_PROJECT, projectId);
        } catch {
          /* 容量受限 */
        }
      }
    },
    [pickDefaultCategoryId]
  );

  /** 切换团队：自动跳到该团队的第一个项目（若不存在则置空） */
  const handleTeamChange = useCallback(
    (teamId: string) => {
      setCurrentTeamId(teamId);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LS_KEY_TEAM, teamId);
        } catch {
          /* 容量受限 */
        }
      }
      const projects = getProjectsByTeam(teamId);
      const nextProjectId = projects[0]?.id ?? '';
      if (nextProjectId !== currentProjectId) {
        handleProjectChange(nextProjectId);
      }
    },
    [currentProjectId, handleProjectChange]
  );

  const selectedApiId = useMemo(() => parseSelectedApiId(selectedTreeKey, apis), [selectedTreeKey, apis]);

  const selectedApi = useMemo(
    () => (selectedApiId ? apis.find((a) => a.id === selectedApiId) ?? null : null),
    [apis, selectedApiId]
  );

  const selectedScenarioNodeId = useMemo(() => parseScenarioNodeKey(selectedTreeKey), [selectedTreeKey]);
  const selectedScenario = useMemo(() => {
    if (!selectedScenarioNodeId || !selectedApi) return null;
    return selectedApi.scenarios?.find((s) => s.id === selectedScenarioNodeId) ?? null;
  }, [selectedScenarioNodeId, selectedApi]);

  const isScenarioCaseDetail = selectedScenario != null && selectedApi != null;

  const isApiDetail = selectedApiId != null && selectedApi != null;

  const currentEnvLabel = useMemo(
    () => mockApiEnvironments.find((e) => e.id === currentEnv)?.name ?? '',
    [currentEnv]
  );

  useEffect(() => {
    setDetailTab('preview');
  }, [selectedApiId]);

  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const filteredApis = useMemo(() => {
    let result = apis.filter((api) => api.categoryId === selectedCategoryId);
    if (tableSearch.trim()) {
      const kw = tableSearch.toLowerCase();
      result = result.filter(
        (api) =>
          api.name.toLowerCase().includes(kw) ||
          api.path.toLowerCase().includes(kw)
      );
    }
    return result;
  }, [apis, selectedCategoryId, tableSearch]);

  const availableParentCategories = useMemo(() => {
    return projectCategories.filter((c) => c.id !== contextMenuNode?.id && c.parentId !== contextMenuNode?.id);
  }, [projectCategories, contextMenuNode]);

  // === 事件处理 ===
  /** 选中某个接口并进入详情（默认「接口预览」Tab），列表与左侧树共用 */
  const handleSelectApi = useCallback((api: ApiDefinition) => {
    const apiKey = `${API_TREE_PREFIX}${api.id}`;
    setSelectedTreeKey(apiKey);
    setSelectedCategoryId(api.categoryId);
    setDetailTab('preview');
    setExpandedKeys((prev) =>
      Array.from(new Set([...prev, 'root', api.categoryId, apiKey]))
    );
  }, []);

  const handleTreeSelect = useCallback(
    (selectedKeys: React.Key[]) => {
      if (selectedKeys.length === 0) return;
      const key = selectedKeys[0] as string;
      setSelectedTreeKey(key);

      if (key.startsWith(API_TREE_PREFIX)) {
        const apiId = key.slice(API_TREE_PREFIX.length);
        const api = apis.find((a) => a.id === apiId);
        if (api) {
          handleSelectApi(api);
        }
        return;
      }

      if (key.startsWith(SCENARIO_TREE_PREFIX)) {
        const sid = key.slice(SCENARIO_TREE_PREFIX.length);
        const api = apis.find((a) => a.scenarios?.some((s) => s.id === sid));
        if (api) {
          setSelectedCategoryId(api.categoryId);
          setExpandedKeys((prev) => Array.from(new Set([...prev, `${API_TREE_PREFIX}${api.id}`])));
        }
        return;
      }

      setSelectedCategoryId(key);
    },
    [apis, handleSelectApi]
  );

  const handleApiDetailSave = useCallback((patch: Partial<ApiDefinition>) => {
    if (!selectedApiId) return;
    setApis((prev) =>
      prev.map((a) => (a.id === selectedApiId ? { ...a, ...patch } : a))
    );
  }, [selectedApiId]);

  const handleTreeExpand = useCallback((expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys as string[]);
  }, []);

  const handleTreeRightClick = useCallback(({ event, node }: { event: React.MouseEvent; node: DataNode }) => {
    const category = categories.find((c) => c.id === node.key);
    if (category) {
      setContextMenuNode(category);
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setContextMenuVisible(true);
    }
  }, [categories]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuNode(null);
  }, []);

  // 添加接口
  const handleAddApi = useCallback(() => {
    if (!contextMenuNode && !selectedCategoryId) {
      message.warning('请先选择一个目录');
      return;
    }
    setAddApiModalOpen(true);
    addApiForm.resetFields();
    addApiForm.setFieldsValue({
      categoryId: contextMenuNode?.id || selectedCategoryId,
      method: 'POST',
      type: 'API',
    });
  }, [contextMenuNode, selectedCategoryId, addApiForm]);

  const submitAddApi = useCallback(async () => {
    try {
      const values = await addApiForm.validateFields();
      const newApi: ApiDefinition = {
        id: `api-${Date.now()}`,
        ...values,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        createdBy: '当前用户（Mock）',
        updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };
      setApis((prev) => [...prev, newApi]);
      message.success('接口添加成功');
      setAddApiModalOpen(false);
    } catch {
      // validate failed
    }
  }, [addApiForm]);

  // 添加目录
  const handleAddCategory = useCallback(() => {
    setAddCategoryModalOpen(true);
    addCategoryForm.resetFields();
    addCategoryForm.setFieldsValue({
      parentId: contextMenuNode?.id || selectedCategoryId || 'root',
    });
  }, [contextMenuNode, selectedCategoryId, addCategoryForm]);

  const submitAddCategory = useCallback(async () => {
    try {
      const values = await addCategoryForm.validateFields();
      const newCategory: ApiCategory = {
        id: `cat-${Date.now()}`,
        ...values,
        projectId: currentProjectId,
        sort: categories.length * 10,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        createdBy: '当前用户（Mock）',
      };
      setCategories((prev) => [...prev, newCategory]);
      message.success('目录添加成功');
      setAddCategoryModalOpen(false);
      setExpandedKeys((prev) => [...new Set([...prev, values.parentId])]);
    } catch {
      // validate failed
    }
  }, [addCategoryForm, categories, currentProjectId]);

  // 重命名目录
  const handleRenameCategory = useCallback(() => {
    if (!contextMenuNode) return;
    setEditCategoryModalOpen(true);
    editCategoryForm.resetFields();
    editCategoryForm.setFieldsValue({
      id: contextMenuNode.id,
      name: contextMenuNode.name,
      description: contextMenuNode.description,
    });
  }, [contextMenuNode, editCategoryForm]);

  const submitEditCategory = useCallback(async () => {
    try {
      const values = await editCategoryForm.validateFields();
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === values.id
            ? { ...cat, name: values.name, description: values.description }
            : cat
        )
      );
      message.success('目录更新成功');
      setEditCategoryModalOpen(false);
    } catch {
      // validate failed
    }
  }, [editCategoryForm]);

  // 删除目录
  const handleDeleteCategory = useCallback(() => {
    if (!contextMenuNode) return;
    if (contextMenuNode.id === 'root') {
      message.error('不能删除根目录');
      return;
    }
    const childCount = categories.filter((c) => c.parentId === contextMenuNode.id).length;
    const apiCount = apis.filter((a) => a.categoryId === contextMenuNode.id).length;
    if (childCount > 0 || apiCount > 0) {
      message.warning('该目录下存在子目录或接口，无法删除');
      return;
    }
    setDeleteModalOpen(true);
  }, [contextMenuNode, categories, apis]);

  const confirmDeleteCategory = useCallback(() => {
    if (!contextMenuNode) return;
    setCategories((prev) => prev.filter((c) => c.id !== contextMenuNode.id));
    message.success('目录删除成功');
    setDeleteModalOpen(false);
    setContextMenuNode(null);
  }, [contextMenuNode]);

  // 移动到
  const handleMoveCategory = useCallback(() => {
    if (!contextMenuNode) return;
    setMoveModalOpen(true);
    moveForm.resetFields();
    moveForm.setFieldsValue({
      sourceId: contextMenuNode.id,
      targetId: undefined,
    });
  }, [contextMenuNode, moveForm]);

  const submitMoveCategory = useCallback(async () => {
    try {
      const values = await moveForm.validateFields();
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === values.sourceId ? { ...cat, parentId: values.targetId } : cat
        )
      );
      message.success('目录移动成功');
      setMoveModalOpen(false);
    } catch {
      // validate failed
    }
  }, [moveForm]);

  // 批量删除接口
  const handleBatchDelete = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的接口');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个接口吗？删除后不可恢复。`,
      onOk: () => {
        setApis((prev) => prev.filter((api) => !selectedRowKeys.includes(api.id)));
        setSelectedRowKeys([]);
        message.success('批量删除成功');
      },
    });
  }, [selectedRowKeys]);

  // 批量移动接口
  const handleBatchMove = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要移动的接口');
      return;
    }
    // 简化处理：移动到当前选中目录
    message.info('批量移动功能待完善');
  }, [selectedRowKeys]);

  // === 表格列定义 ===
  const columns: ColumnsType<ApiDefinition> = useMemo(
    () => [
      {
        title: '接口名称',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: ApiDefinition) => (
          <Typography.Link
            onClick={(e) => {
              e.preventDefault();
              handleSelectApi(record);
            }}
          >
            {text}
          </Typography.Link>
        ),
        ellipsis: true,
      },
      {
        title: '接口类型',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        align: 'center',
      },
      {
        title: '请求类型',
        dataIndex: 'method',
        key: 'method',
        width: 100,
        align: 'center',
        render: (method: ApiMethod) => (
          <Tag color={METHOD_TAG_COLORS[method] || 'default'}>{method}</Tag>
        ),
      },
      {
        title: '接口路径',
        dataIndex: 'path',
        key: 'path',
        ellipsis: true,
      },
      {
        title: '所属模块',
        dataIndex: 'categoryId',
        key: 'categoryId',
        width: 150,
        render: (categoryId: string) => {
          const cat = categories.find((c) => c.id === categoryId);
          return cat?.name || categoryId;
        },
      },
    ],
    [categories, handleSelectApi]
  );

  // === 渲染 ===
  return (
    <Card
      styles={{ body: { padding: 0, height: '100%' } }}
      style={{ margin: -24, borderRadius: 0, height: PAGE_BLEED_HEIGHT, minHeight: 600 }}
    >
      <div style={{ display: 'flex', height: '100%', minWidth: 0 }}>
        {/* 左侧树形目录 */}
        <div
          style={{
            width: leftPanelWidth,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#fafafa',
            minWidth: LEFT_PANEL_MIN,
            maxWidth: LEFT_PANEL_MAX,
            overflow: 'hidden',
          }}
        >
          {/* 左侧顶部：团队 / 项目切换 + 搜索 + 新建 */}
          <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {/* 团队 / 项目选择（接口数据按项目隔离） */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Select
                  value={currentTeamId || undefined}
                  onChange={handleTeamChange}
                  placeholder="团队"
                  style={{ flex: 1, minWidth: 0 }}
                  options={userTeams.map((t) => ({ value: t.id, label: t.name }))}
                  showSearch
                  optionFilterProp="label"
                />
                <Select
                  value={currentProjectId || undefined}
                  onChange={handleProjectChange}
                  placeholder={availableProjects.length ? '项目' : '该团队下暂无项目'}
                  style={{ flex: 1, minWidth: 0 }}
                  disabled={availableProjects.length === 0}
                  options={availableProjects.map((p) => ({ value: p.id, label: p.name }))}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              {/* 接口名称模糊搜索 + 新建按钮 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Input.Search
                  placeholder="按接口名称模糊搜索"
                  allowClear
                  value={treeSearch}
                  onChange={(e) => setTreeSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <Dropdown
                  menu={{
                    items: [
                      { key: 'add-api', label: '添加接口', icon: <ApiOutlined /> },
                      { key: 'add-category', label: '添加接口目录', icon: <FolderAddOutlined /> },
                      { key: 'import', label: '导入接口', icon: <ImportOutlined /> },
                    ],
                    onClick: ({ key }) => {
                      if (key === 'add-api') handleAddApi();
                      if (key === 'add-category') handleAddCategory();
                      if (key === 'import') message.info('导入功能待实现');
                    },
                  }}
                  placement="bottomRight"
                  disabled={!currentProjectId}
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    aria-label="新建"
                    disabled={!currentProjectId}
                  />
                </Dropdown>
              </div>
            </Space>
          </div>

          {/* 树形结构 */}
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            <Tree
              treeData={treeData}
              selectedKeys={[selectedTreeKey]}
              expandedKeys={displayExpandedKeys}
              onSelect={handleTreeSelect}
              onExpand={handleTreeExpand}
              onRightClick={handleTreeRightClick}
              showLine={{ showLeafIcon: false }}
              blockNode
            />
          </div>
        </div>

        {/* 可拖动分隔条：左右调整左侧宽度 */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={leftPanelWidth}
          aria-valuemin={LEFT_PANEL_MIN}
          aria-valuemax={LEFT_PANEL_MAX}
          tabIndex={0}
          onMouseDown={onSplitterMouseDown}
          onKeyDown={(e) => {
            const step = 16;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setLeftPanelWidth((w) => Math.max(LEFT_PANEL_MIN, w - step));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setLeftPanelWidth((w) =>
                Math.min(LEFT_PANEL_MAX, Math.min(w + step, Math.floor(window.innerWidth * 0.55)))
              );
            }
          }}
          style={{
            flexShrink: 0,
            width: 6,
            marginLeft: -1,
            cursor: 'col-resize',
            background: '#f0f0f0',
            borderLeft: '1px solid #e8e8e8',
            borderRight: '1px solid #e8e8e8',
            alignSelf: 'stretch',
            touchAction: 'none',
          }}
          title="拖动调整左侧宽度"
        />

        {/* 右侧内容区 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isScenarioCaseDetail && selectedApi && selectedScenario ? (
            <ApiScenarioCasePane
              api={selectedApi}
              scenario={selectedScenario}
              moduleName={currentCategory?.name ?? '—'}
              environments={mockApiEnvironments}
              envId={currentEnv}
              onEnvChange={setCurrentEnv}
            />
          ) : isApiDetail && selectedApi ? (
            <ApiInterfaceDetailPane
              api={selectedApi}
              moduleName={currentCategory?.name ?? '—'}
              envLabel={currentEnvLabel}
              detailTab={detailTab}
              onDetailTabChange={setDetailTab}
              onSave={handleApiDetailSave}
            />
          ) : (
            <>
              {/* 目录下列表 */}
              <div
                style={{
                  padding: '8px 16px 0',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Tag color="blue">{currentCategory?.name || '—'}</Tag>
                  <span style={{ color: '#666' }}>(共{filteredApis.length}个接口)</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 12px',
                    background: '#f5f5f5',
                    borderRadius: 8,
                    border: '1px solid #e8e8e8',
                  }}
                >
                  <span style={{ color: 'rgba(0,0,0,0.88)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    环境
                  </span>
                  <Select
                    value={currentEnv}
                    onChange={setCurrentEnv}
                    style={{ minWidth: 180 }}
                    size="middle"
                  >
                    {mockApiEnvironments.map((env) => (
                      <Option key={env.id} value={env.id}>
                        {env.name}
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>

              <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
                <div style={TOOLBAR_STYLE}>
                  <Space>
                    <Button
                      icon={<DeleteOutlined />}
                      disabled={selectedRowKeys.length === 0}
                      onClick={handleBatchDelete}
                    >
                      删除
                    </Button>
                    <Button
                      icon={<ArrowRightOutlined />}
                      disabled={selectedRowKeys.length === 0}
                      onClick={handleBatchMove}
                    >
                      移动到
                    </Button>
                  </Space>
                  <Input.Search
                    placeholder="输入接口名称查询"
                    allowClear
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    onSearch={setTableSearch}
                    style={{ width: 280 }}
                    enterButton={<SearchOutlined />}
                  />
                </div>
              </div>

              <div style={{ flex: 1, padding: 12, overflow: 'auto' }}>
                {filteredApis.length > 0 ? (
                  <Table
                    size="small"
                    rowKey="id"
                    columns={columns}
                    dataSource={filteredApis}
                    rowSelection={{
                      selectedRowKeys,
                      onChange: setSelectedRowKeys,
                    }}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      showTotal: (total) => `共${total}条`,
                    }}
                  />
                ) : (
                  <Empty description="暂无接口数据" />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenuVisible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 1000,
            background: '#fff',
            boxShadow: '0 3px 6px -4px rgba(0,0,0,0.12), 0 6px 16px 0 rgba(0,0,0,0.08)',
            borderRadius: 4,
            minWidth: 160,
          }}
        >
          <Menu
            mode="vertical"
            onClick={({ key }) => {
              handleCloseContextMenu();
              switch (key) {
                case 'add-api':
                  handleAddApi();
                  break;
                case 'rename':
                  handleRenameCategory();
                  break;
                case 'move':
                  handleMoveCategory();
                  break;
                case 'add-sub':
                  handleAddCategory();
                  break;
                case 'delete':
                  handleDeleteCategory();
                  break;
              }
            }}
            items={[
              {
                key: 'add-api',
                icon: <ApiOutlined />,
                label: '添加接口',
              },
              {
                key: 'rename',
                icon: <EditOutlined />,
                label: '重命名',
              },
              {
                key: 'move',
                icon: <ArrowRightOutlined />,
                label: '移动到',
              },
              {
                key: 'add-sub',
                icon: <FolderAddOutlined />,
                label: '添加子目录',
              },
              {
                key: 'delete',
                icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
                label: <span style={{ color: '#ff4d4f' }}>删除</span>,
                disabled: contextMenuNode?.id === 'root',
              },
            ]}
          />
        </div>
      )}

      {/* 点击其他地方关闭右键菜单 */}
      {contextMenuVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
          }}
          onClick={handleCloseContextMenu}
        />
      )}

      {/* 添加接口弹窗 */}
      <Modal
        title="添加接口"
        open={addApiModalOpen}
        onOk={submitAddApi}
        onCancel={() => setAddApiModalOpen(false)}
        destroyOnClose
        width={600}
      >
        <Form form={addApiForm} layout="vertical">
          <Form.Item name="categoryId" label="所属目录" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="接口名称"
            rules={[{ required: true, message: '请输入接口名称' }]}
          >
            <Input placeholder="请输入接口名称" />
          </Form.Item>
          <Form.Item
            name="method"
            label="请求方法"
            rules={[{ required: true, message: '请选择请求方法' }]}
          >
            <Select placeholder="请选择请求方法">
              {Object.keys(METHOD_TAG_COLORS).map((method) => (
                <Option key={method} value={method}>
                  <Tag color={METHOD_TAG_COLORS[method as ApiMethod]}>{method}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="path"
            label="接口路径"
            rules={[{ required: true, message: '请输入接口路径' }]}
          >
            <Input placeholder="例如：/api/v1/users" />
          </Form.Item>
          <Form.Item name="type" label="接口类型" rules={[{ required: true }]}>
            <Select placeholder="请选择接口类型">
              <Option value="API">API</Option>
              <Option value="WebSocket">WebSocket</Option>
              <Option value="gRPC">gRPC</Option>
              <Option value="GraphQL">GraphQL</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="接口说明">
            <Input.TextArea rows={3} placeholder="可选，填写接口说明" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加目录弹窗 */}
      <Modal
        title="添加接口目录"
        open={addCategoryModalOpen}
        onOk={submitAddCategory}
        onCancel={() => setAddCategoryModalOpen(false)}
        destroyOnClose
        width={500}
      >
        <Form form={addCategoryForm} layout="vertical">
          <Form.Item
            name="parentId"
            label="父目录"
            rules={[{ required: true, message: '请选择父目录' }]}
          >
            <Select placeholder="请选择父目录">
              {projectCategories.map((cat) => (
                <Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="目录名称"
            rules={[{ required: true, message: '请输入目录名称' }]}
          >
            <Input placeholder="请输入目录名称" />
          </Form.Item>
          <Form.Item name="description" label="目录说明">
            <Input.TextArea rows={3} placeholder="可选，填写目录说明" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑目录弹窗 */}
      <Modal
        title="重命名目录"
        open={editCategoryModalOpen}
        onOk={submitEditCategory}
        onCancel={() => setEditCategoryModalOpen(false)}
        destroyOnClose
        width={500}
      >
        <Form form={editCategoryForm} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="目录名称"
            rules={[{ required: true, message: '请输入目录名称' }]}
          >
            <Input placeholder="请输入目录名称" />
          </Form.Item>
          <Form.Item name="description" label="目录说明">
            <Input.TextArea rows={3} placeholder="可选，填写目录说明" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除目录确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModalOpen}
        onOk={confirmDeleteCategory}
        onCancel={() => setDeleteModalOpen(false)}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要删除目录 <strong>{contextMenuNode?.name}</strong> 吗？
        </p>
        <p style={{ color: '#999', fontSize: 12 }}>删除后不可恢复，请谨慎操作。</p>
      </Modal>

      {/* 移动目录弹窗 */}
      <Modal
        title="移动到"
        open={moveModalOpen}
        onOk={submitMoveCategory}
        onCancel={() => setMoveModalOpen(false)}
        destroyOnClose
        width={500}
      >
        <Form form={moveForm} layout="vertical">
          <Form.Item name="sourceId" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="targetId"
            label="目标目录"
            rules={[{ required: true, message: '请选择目标目录' }]}
          >
            <Select placeholder="请选择目标目录">
              {availableParentCategories.map((cat) => (
                <Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
