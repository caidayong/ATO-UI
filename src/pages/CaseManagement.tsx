/**
 * @page 用例管理
 * @version V1.0.21
 * @base docs/spec/04-页面契约.md § 页面 5（用例管理）；ATO_V1.0.0-页面需求与交互规格.md 第 4.5 节（用例管理）
 * @changes
 *   - V1.0.0: 新窗口内 3:7 分栏；目录树（右键菜单占位）；用例列表；用例详情多 Tab；步骤简版编辑器（Mock 状态）
 *   - V1.0.1: 树节点 hover 三点操作入口、目录/用例图标区分、左侧搜索与添加菜单、列表批量按钮、左右分栏拖拽
 *   - V1.0.2: 左侧标题调整为根目录；搜索区下置；目录与用例支持启用/禁用并置灰；目录菜单新增调试运行；列表状态改为滑块
 *   - V1.0.3: 用例列表区增加用例搜索；列表顶部增加目录/模块/标签分组 tab 导航
 *   - V1.0.4: 步骤类型与 types 中 CASE_STEP_TYPES 对齐；mock 数据按 stepType 初始化（验收用例详情各类型步骤）
 *   - V1.0.5: 用例详情步骤栏优化（接口请求标签统一、序号前置、标题截断、长按拖拽排序、步骤菜单复制/添加/删除）
 *   - V1.0.6: 步骤操作入口 hover 显示；删除二次确认；新增“复制到”批量用例；步骤菜单“添加”改为类型选择
 *   - V1.0.7: 接口请求步骤详情细化 Params/Headers/Body/Cookies/变量提取/断言分区，并保留第一行步骤描述
 *   - V1.0.8: 接口请求 URL 组装区调整为协议+方法+IP端口+接口路径，移除重复描述输入行
 *   - V1.0.9: 详情页环境选择与请求主机地址联动，切换环境自动填充对应默认地址
 *   - V1.0.10: 协议下拉“默认”与当前环境协议联动（默认项动态显示并随环境切换）
 *   - V1.0.11: 接口请求 Params 支持请求参数新增、行内编辑与删除（Path/Query）
 *   - V1.0.12: Params 交互重构（Path 参数规则化只读、Query 双击逐行新增、参数值接入动态变量输入）
 *   - V1.0.13: Headers 交互对齐 Params（双击逐行新增、行内编辑删除、参数值支持动态变量）
 *   - V1.0.14: 删除类操作统一补充二次确认（参数行/头部行/批量删除入口）
 *   - V1.0.15: 接口请求 Body 区改造（none/form-data/urlencoded/json 四模式与交互）
 *   - V1.0.16: form-data 参数类型为 file 时，参数值切换为文件树下拉（复用文件管理数据源）
 *   - V1.0.17: 接口请求断言区改造为可交互多条断言，断言逻辑扩展为完整选项集
 *   - V1.0.18: 调用函数步骤详情重做（函数选择弹窗、函数调用列表、变量提取与断言交互对齐）
 *   - V1.0.19: 选择函数改为复用自定义函数树数据；调用函数断言区补充列表头字段
 *   - V1.0.20: 导出测试用例：弹窗多选目录树（仅目录）、生成 YAML 浏览器下载
 *   - V1.0.21: 导出默认「根目录」表示全量；选根目录时 YAML 的 directories 仅记根目录一条
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  TreeSelect,
  Tree,
  Upload,
  Typography,
  Switch,
  Tooltip,
  Segmented,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode, TreeProps } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import {
  DownloadOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HolderOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  SwapOutlined,
  UploadOutlined,
  DownOutlined,
} from '@ant-design/icons';
import {
  mockCaseModules,
  mockCaseSteps,
  mockFileFolders,
  mockFunctionFiles,
  mockManagedFiles,
  mockTestCases,
  mockVersions,
} from '@/mocks/data';
import type { CaseModule, CaseResult, CaseStep, CaseStepType, TestCase } from '@/types';
import { CASE_STEP_TYPES } from '@/types';
import { DynamicValueInput } from '@/components/DynamicValueInput';
import { stringify as stringifyYaml } from 'yaml';

const { Text } = Typography;

const resultTagProps: Record<CaseResult, { color: string }> = {
  通过: { color: 'success' },
  失败: { color: 'error' },
  警告: { color: 'warning' },
  未运行: { color: 'default' },
};

const STEP_TYPES = CASE_STEP_TYPES;
type StepType = CaseStepType;
type RequestParamRow = {
  id: string;
  name: string;
  value: string;
  required?: '是' | '否';
  desc: string;
};
type BodyMode = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json';
type BodyParamRow = {
  id: string;
  name: string;
  value: string;
  desc: string;
  paramType?: 'string' | 'file';
};
type ExtractRow = {
  id: string;
  name: string;
  desc: string;
  variableType: '全局变量' | '临时变量' | '';
  valueType: '默认' | '字符串' | '整型' | '浮点型' | '布尔型' | '';
  source: '响应体' | '响应头' | '请求头' | '请求体' | '请求参数' | '';
  expr: string;
};
type AssertRow = {
  id: string;
  desc: string;
  source: '响应体' | '响应头' | '请求头' | '请求体' | '请求参数' | '响应状态码' | '接口耗时(ms)';
  target: string;
  op:
    | '等于'
    | '不等于'
    | '列表包含'
    | '包含键'
    | '包含值'
    | '包含键值对'
    | '列表不为空'
    | '大于'
    | '小于'
    | '大于等于'
    | '小于等于'
    | '长度等于';
  negate: boolean;
  expected: string;
};
type FunctionCallRow = {
  id: string;
  functionName: string;
  args: string;
};
type FunctionExtractRow = {
  id: string;
  name: string;
  variableType: '全局变量' | '临时变量' | '';
  valueType: '默认' | '字符串' | '整型' | '浮点型' | '布尔型' | '';
  source: string;
  expr: string;
};
type FunctionAssertRow = {
  id: string;
  desc: string;
  source: string;
  target: string;
  op:
    | '等于'
    | '不等于'
    | '列表包含'
    | '包含键'
    | '包含值'
    | '包含键值对'
    | '列表不为空'
    | '大于'
    | '小于'
    | '大于等于'
    | '小于等于'
    | '长度等于';
  negate: boolean;
  expected: string;
};
type DbType = 'MariaDb' | 'ClickHouse';
const ENV_DEFAULT_HOST: Record<string, string> = {
  DEV: '10.10.10.10:18080',
  SIT: '192.168.143.134:21250',
  UAT: '172.16.20.21:28080',
  PRD: 'api.example.com:443',
};
const ENV_DEFAULT_PROTOCOL: Record<string, 'http' | 'https'> = {
  DEV: 'http',
  SIT: 'http',
  UAT: 'http',
  PRD: 'https',
};
const DEFAULT_PATH_PARAMS: RequestParamRow[] = [
  {
    id: 'path-server-ip',
    name: 'server_ip',
    value: '',
    required: '否',
    desc: '',
  },
  {
    id: 'path-server-port',
    name: 'server_port',
    value: '',
    required: '否',
    desc: '',
  },
];

function modKey(id: string) {
  return `mod-${id}`;
}

function caseKey(id: string) {
  return `case-${id}`;
}

function parseTreeKey(key: string): { kind: 'module' | 'case'; id: string } | null {
  if (key.startsWith('case-')) return { kind: 'case', id: key.slice(5) };
  if (key.startsWith('mod-')) return { kind: 'module', id: key.slice(4) };
  return null;
}

function collectDescendantModuleIds(rootId: string, modules: CaseModule[]): Set<string> {
  const set = new Set<string>([rootId]);
  const walk = (pid: string) => {
    modules
      .filter((m) => m.parentId === pid)
      .forEach((m) => {
        set.add(m.id);
        walk(m.id);
      });
  };
  walk(rootId);
  return set;
}

function filterCasesInModuleTree(
  moduleId: string,
  modules: CaseModule[],
  cases: TestCase[]
): TestCase[] {
  const ids = collectDescendantModuleIds(moduleId, modules);
  return cases.filter((c) => ids.has(c.moduleId));
}

function buildTreeData(modules: CaseModule[], cases: TestCase[], versionId: string): DataNode[] {
  const vmods = modules.filter((m) => m.versionId === versionId);
  const vcases = cases.filter((c) => c.versionId === versionId);

  const build = (parentId: string | null): DataNode[] => {
    const childMods = vmods
      .filter((m) => m.parentId === parentId)
      .sort((a, b) => a.sort - b.sort)
      .map((m) => ({
        key: modKey(m.id),
        title: m.name,
        children: [
          ...build(m.id),
          ...vcases
            .filter((c) => c.moduleId === m.id)
            .map(
              (c): DataNode => ({
                key: caseKey(c.id),
                title: c.name,
                isLeaf: true,
              })
            ),
        ],
      }));
    return childMods;
  };

  return build(null);
}

function firstModuleIdFromTree(nodes: DataNode[]): string | null {
  for (const n of nodes) {
    if (typeof n.key === 'string' && n.key.startsWith('mod-')) return n.key.slice(4);
    if (n.children?.length) {
      const inner = firstModuleIdFromTree(n.children);
      if (inner) return inner;
    }
  }
  return null;
}

function filterTreeByKeyword(nodes: DataNode[], keyword: string): DataNode[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return nodes;
  const walk = (items: DataNode[]): DataNode[] =>
    items
      .map((n) => {
        const children = n.children ? walk(n.children) : undefined;
        const title = typeof n.title === 'string' ? n.title.toLowerCase() : '';
        if (title.includes(q) || (children && children.length > 0)) {
          return { ...n, children };
        }
        return null;
      })
      .filter(Boolean) as DataNode[];
  return walk(nodes);
}

type ModuleTreeSelectNode = { title: string; value: string; key: string; children?: ModuleTreeSelectNode[] };

/** 导出：选中此项表示当前版本全部用例；YAML 中 directories 只写根目录，不展开子目录列表 */
const EXPORT_ALL_ROOT_VALUE = '__EXPORT_ALL__';

/** 仅目录（不含用例叶子），供导出多选 TreeSelect */
function buildModuleOnlyTreeData(modules: CaseModule[], versionId: string): ModuleTreeSelectNode[] {
  const vmods = modules.filter((m) => m.versionId === versionId);
  const build = (parentId: string | null): ModuleTreeSelectNode[] =>
    vmods
      .filter((m) => m.parentId === parentId)
      .sort((a, b) => a.sort - b.sort)
      .map((m) => {
        const children = build(m.id);
        return {
          title: m.name,
          value: m.id,
          key: m.id,
          children: children.length ? children : undefined,
        };
      });
  return build(null);
}

export function CaseManagement() {
  const { versionId = '' } = useParams<{ projectId: string; versionId: string }>();
  const location = useLocation();

  const [modules, setModules] = useState<CaseModule[]>(() => [...mockCaseModules]);
  const [cases, setCases] = useState<TestCase[]>(() => [...mockTestCases]);
  const [steps, setSteps] = useState<CaseStep[]>(() => [...mockCaseSteps]);

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const [rightView, setRightView] = useState<'list' | 'detail'>('list');
  type OpenTab = { key: string; caseId: string; title: string };
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectedEnvByCase, setSelectedEnvByCase] = useState<Record<string, string>>({});
  const [activeStepByCase, setActiveStepByCase] = useState<Record<string, string>>({});
  const [stepTypeById, setStepTypeById] = useState<Record<string, StepType>>({});
  const [requestMethodByStepId, setRequestMethodByStepId] = useState<Record<string, string>>({});
  const [requestProtocolByStepId, setRequestProtocolByStepId] = useState<Record<string, string>>({});
  const [requestHostByStepId, setRequestHostByStepId] = useState<Record<string, string>>({});
  const [requestUrlByStepId, setRequestUrlByStepId] = useState<Record<string, string>>({});
  const [requestPathParamsByStepId, setRequestPathParamsByStepId] = useState<Record<string, RequestParamRow[]>>({});
  const [requestQueryParamsByStepId, setRequestQueryParamsByStepId] = useState<Record<string, RequestParamRow[]>>({});
  const [requestHeadersByStepId, setRequestHeadersByStepId] = useState<Record<string, RequestParamRow[]>>({});
  const [editingQueryRowByStepId, setEditingQueryRowByStepId] = useState<Record<string, string>>({});
  const [editingHeaderRowByStepId, setEditingHeaderRowByStepId] = useState<Record<string, string>>({});
  const [bodyModeByStepId, setBodyModeByStepId] = useState<Record<string, BodyMode>>({});
  const [bodyFormDataByStepId, setBodyFormDataByStepId] = useState<Record<string, BodyParamRow[]>>({});
  const [bodyUrlEncodedByStepId, setBodyUrlEncodedByStepId] = useState<Record<string, BodyParamRow[]>>({});
  const [bodyJsonByStepId, setBodyJsonByStepId] = useState<Record<string, string>>({});
  const [bodyJsonErrorByStepId, setBodyJsonErrorByStepId] = useState<Record<string, string>>({});
  const [extractRowsByStepId, setExtractRowsByStepId] = useState<Record<string, ExtractRow[]>>({});
  const [editingExtractRowByStepId, setEditingExtractRowByStepId] = useState<Record<string, string>>({});
  const [assertRowsByStepId, setAssertRowsByStepId] = useState<Record<string, AssertRow[]>>({});
  const [functionCallsByStepId, setFunctionCallsByStepId] = useState<Record<string, FunctionCallRow[]>>({});
  const [functionExtractRowsByStepId, setFunctionExtractRowsByStepId] = useState<Record<string, FunctionExtractRow[]>>({});
  const [editingFunctionExtractRowByStepId, setEditingFunctionExtractRowByStepId] = useState<Record<string, string>>({});
  const [functionAssertRowsByStepId, setFunctionAssertRowsByStepId] = useState<Record<string, FunctionAssertRow[]>>({});
  const [chooseFunctionModalOpen, setChooseFunctionModalOpen] = useState(false);
  const [chooseFunctionStepId, setChooseFunctionStepId] = useState<string>('');
  const [chooseFunctionRowId, setChooseFunctionRowId] = useState<string>('');
  const [chooseFunctionValue, setChooseFunctionValue] = useState<string>('');
  const [dbStepCreateOpen, setDbStepCreateOpen] = useState(false);
  const [dbStepCreateCaseId, setDbStepCreateCaseId] = useState('');
  const [dbStepCreateAfterStepId, setDbStepCreateAfterStepId] = useState<string | undefined>(undefined);
  const [dbStepCreateType, setDbStepCreateType] = useState<DbType>('MariaDb');
  const [dbStepCreateName, setDbStepCreateName] = useState('');
  const [dbTypeByStepId, setDbTypeByStepId] = useState<Record<string, DbType>>({});
  const [dbTabByStepId, setDbTabByStepId] = useState<Record<string, 'SQL命令' | '变量提取' | '断言'>>({});
  const [dbSqlByStepId, setDbSqlByStepId] = useState<Record<string, string>>({});
  const [dbExtractRowsByStepId, setDbExtractRowsByStepId] = useState<Record<string, FunctionExtractRow[]>>({});
  const [editingDbExtractRowByStepId, setEditingDbExtractRowByStepId] = useState<Record<string, string>>({});
  const [dbAssertRowsByStepId, setDbAssertRowsByStepId] = useState<Record<string, FunctionAssertRow[]>>({});
  const [waitSecondsByStepId, setWaitSecondsByStepId] = useState<Record<string, number>>({});
  const [editingBodyFormRowByStepId, setEditingBodyFormRowByStepId] = useState<Record<string, string>>({});
  const [editingBodyUrlRowByStepId, setEditingBodyUrlRowByStepId] = useState<Record<string, string>>({});
  const [requestTabByStepId, setRequestTabByStepId] = useState<Record<string, string>>({});
  const [funcTabByStepId, setFuncTabByStepId] = useState<Record<string, string>>({});
  const [treeKeyword, setTreeKeyword] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [caseSearch, setCaseSearch] = useState('');
  const [caseListTab, setCaseListTab] = useState<'dir' | 'module' | 'tagGroup'>('dir');
  const [leftPaneWidth, setLeftPaneWidth] = useState(22);
  const [isResizing, setIsResizing] = useState(false);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [dragReadyModuleId, setDragReadyModuleId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const dragPressTimerRef = useRef<number | null>(null);
  const [dragReadyStepByCase, setDragReadyStepByCase] = useState<Record<string, string | null>>({});
  const [dragOverStepByCase, setDragOverStepByCase] = useState<Record<string, string | null>>({});
  const stepDragPressTimerRef = useRef<number | null>(null);
  const headersPanelRef = useRef<HTMLDivElement | null>(null);
  const bodyJsonDynamicHostRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [copyStepToOpen, setCopyStepToOpen] = useState(false);
  const [copyToCaseIdsInput, setCopyToCaseIdsInput] = useState('');
  const [copySourceStep, setCopySourceStep] = useState<{ caseId: string; stepId: string } | null>(null);
  const [copyAssertToOpen, setCopyAssertToOpen] = useState(false);
  const [copyAssertCaseIdsInput, setCopyAssertCaseIdsInput] = useState('');
  const [copyAssertSource, setCopyAssertSource] = useState<{ caseId: string; stepId: string } | null>(null);
  const [exportCasesOpen, setExportCasesOpen] = useState(false);
  const [exportModuleIds, setExportModuleIds] = useState<string[]>([]);
  const [moduleEnabledMap, setModuleEnabledMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(mockCaseModules.map((m) => [m.id, true]))
  );
  const [caseEnabledMap, setCaseEnabledMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(mockTestCases.map((c) => [c.id, true]))
  );

  const treeData = useMemo(
    () => buildTreeData(modules, cases, versionId),
    [modules, cases, versionId]
  );
  const filteredTreeData = useMemo(
    () => filterTreeByKeyword(treeData, treeKeyword),
    [treeData, treeKeyword]
  );
  const exportModuleTreeData = useMemo((): ModuleTreeSelectNode[] => {
    const inner = buildModuleOnlyTreeData(modules, versionId);
    return [
      {
        title: '根目录（全部用例）',
        value: EXPORT_ALL_ROOT_VALUE,
        key: EXPORT_ALL_ROOT_VALUE,
        children: inner.length ? inner : undefined,
      },
    ];
  }, [modules, versionId]);
  const fileTreeSelectData = useMemo(() => {
    type FileTreeNode = { title: string; value: string; key: string; children?: FileTreeNode[]; isLeaf?: boolean };
    const build = (parentId: string | null): FileTreeNode[] =>
      mockFileFolders
        .filter((f) => f.parentId === parentId)
        .map((folder) => {
          const childFolders = build(folder.id);
          const childFiles = mockManagedFiles
            .filter((file) => file.folderId === folder.id)
            .map((file) => ({
              title: file.name,
              value: file.path ? `${file.path}/${file.name}` : file.name,
              key: `file-${file.id}`,
              isLeaf: true,
            }));
          return {
            title: folder.name,
            value: `folder-${folder.id}`,
            key: `folder-${folder.id}`,
            children: [...childFolders, ...childFiles],
          };
        });
    return build(null);
  }, []);
  const functionTreeData = useMemo(() => {
    const fileNodes = mockFunctionFiles.map((file) => {
      const fnRe = /^\s*def\s+([a-zA-Z_]\w*\s*\([^)]*\))/gm;
      const matches: Array<{ title: string; value: string; key: string; isLeaf: true }> = [];
      let m: RegExpExecArray | null = fnRe.exec(file.content);
      while (m) {
        const signature = String(m[1] ?? '').trim();
        matches.push({
          title: signature,
          value: signature,
          key: `fn-${file.id}-${signature}`,
          isLeaf: true,
        });
        m = fnRe.exec(file.content);
      }
      return {
        title: file.fileName,
        value: `file-${file.id}`,
        key: `file-${file.id}`,
        children: matches,
      };
    });
    return [{ title: '根节点', value: 'root', key: 'root', children: fileNodes }];
  }, []);

  const listRows = useMemo(() => {
    if (!selectedModuleId) return [];
    return filterCasesInModuleTree(selectedModuleId, modules, cases);
  }, [selectedModuleId, modules, cases]);

  const searchedRows = useMemo(() => {
    const rows = [...listRows];
    const q = caseSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const inBasic =
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.moduleId.toLowerCase().includes(q);
      if (inBasic) return true;
      return (r.tags ?? []).some((t) => t.toLowerCase().includes(q));
    });
  }, [listRows, caseSearch]);

  const selectedModuleName = useMemo(() => {
    if (!selectedModuleId) return '根目录';
    return modules.find((m) => m.id === selectedModuleId)?.name ?? '根目录';
  }, [modules, selectedModuleId]);

  const envOptions = ['DEV', 'SIT', 'UAT', 'PRD'].map((e) => ({ label: e, value: e }));
  const versionTitle = useMemo(() => {
    const q = new URLSearchParams(location.search);
    const vn = q.get('vn')?.trim();
    if (vn) return vn.toUpperCase();
    const version = mockVersions.find((v) => v.id === versionId)?.version;
    if (version) return version.toUpperCase();
    return `V${versionId}`;
  }, [location.search, versionId]);

  // 默认只展开：根目录本身（一级目录可见，但默认折叠）
  useEffect(() => {
    const vmods = modules.filter((m) => m.versionId === versionId);
    const roots = vmods.filter((m) => m.parentId === null).map((m) => m.id);
    setExpandedKeys(roots.map(modKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  // 初始化步骤类型：优先 mock 数据中的 stepType，否则默认接口请求
  useEffect(() => {
    setStepTypeById((prev) => {
      const next = { ...prev };
      steps.forEach((s) => {
        if (!next[s.id]) next[s.id] = s.stepType ?? '接口请求';
      });
      return next;
    });
  }, [steps]);

  useEffect(() => {
    const first = firstModuleIdFromTree(treeData);
    if (first) {
      setSelectedModuleId(first);
      setSelectedKeys([modKey(first)]);
    } else {
      setSelectedModuleId(null);
      setSelectedKeys([]);
    }
    setRightView('list');
    setOpenTabs([]);
    setActiveTab('');
    setSelectedCaseIds([]);
    setCaseSearch('');
    setCaseListTab('dir');
  }, [versionId]);

  useEffect(() => {
    setSelectedCaseIds([]);
    setCaseSearch('');
    setCaseListTab('dir');
  }, [selectedModuleId]);

  useEffect(() => {
    if (!isResizing) return undefined;
    const onMove = (e: globalThis.MouseEvent) => {
      const container = splitRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const raw = ((e.clientX - rect.left) / rect.width) * 100;
      // 至少容纳搜索框 + 间距 + 添加按钮，避免控件换行/挤压
      const minPercent = (340 / rect.width) * 100;
      const clamped = Math.max(minPercent, Math.min(45, raw));
      setLeftPaneWidth(clamped);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const onDocMouseDown = (e: globalThis.MouseEvent) => {
      const target = e.target as Node | null;
      const panel = headersPanelRef.current;
      if (!panel || (target && panel.contains(target))) return;
      setEditingHeaderRowByStepId({});
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
    };
  }, []);

  const getCase = useCallback(
    (id: string) => cases.find((c) => c.id === id),
    [cases]
  );
  const isModuleEnabled = useCallback(
    (id: string) => moduleEnabledMap[id] !== false,
    [moduleEnabledMap]
  );
  const isCaseEnabled = useCallback(
    (id: string) => caseEnabledMap[id] !== false,
    [caseEnabledMap]
  );
  const isRootModule = useCallback(
    (id: string) => modules.find((m) => m.id === id)?.parentId === null,
    [modules]
  );

  const getSteps = useCallback(
    (caseId: string) =>
      steps
        .filter((s) => s.caseId === caseId)
        .sort((a, b) => a.order - b.order),
    [steps]
  );

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const targetCaseId = q.get('caseId')?.trim();
    if (!targetCaseId) return;
    const tc = cases.find((c) => c.id === targetCaseId);
    if (!tc) return;
    setSelectedModuleId(tc.moduleId);
    setSelectedKeys([caseKey(tc.id)]);
    setOpenTabs((prev) => {
      if (prev.some((t) => t.caseId === tc.id)) return prev;
      return [...prev, { key: tc.id, caseId: tc.id, title: tc.name }];
    });
    setActiveTab(tc.id);
    setRightView('detail');
  }, [location.search, cases]);

  const openCaseTab = (tc: TestCase) => {
    setOpenTabs((prev) => {
      if (prev.some((t) => t.caseId === tc.id)) return prev;
      return [...prev, { key: tc.id, caseId: tc.id, title: tc.name }];
    });
    setActiveTab(tc.id);
    setRightView('detail');
    setSelectedKeys([caseKey(tc.id)]);
  };

  const onTreeSelect = (keys: React.Key[]) => {
    const k = keys[0];
    if (!k || typeof k !== 'string') return;
    const parsed = parseTreeKey(k);
    if (!parsed) return;
    if (parsed.kind === 'module') {
      setSelectedModuleId(parsed.id);
      setRightView('list');
      setSelectedKeys([k]);
      setSelectedCaseIds([]);
      return;
    }
    const tc = getCase(parsed.id);
    if (tc) openCaseTab(tc);
  };

  const [addCaseOpen, setAddCaseOpen] = useState(false);
  const [addCaseMode, setAddCaseMode] = useState<'custom' | 'api' | 'yaml'>('custom');
  const [addCaseForm] = Form.useForm<{ name: string; tags: string[]; moduleId: string }>();
  const [apiImportForm] = Form.useForm<{ moduleId: string; tags: string[] }>();
  const [apiSceneSelectedKeys, setApiSceneSelectedKeys] = useState<string[]>([]);
  const [yamlFiles, setYamlFiles] = useState<Array<{ uid: string; name: string }>>([]);

  const [addSubOpen, setAddSubOpen] = useState(false);
  const [addSubParentId, setAddSubParentId] = useState<string | null>(null);
  const [addSubForm] = Form.useForm<{ name: string }>();

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    kind: 'module' | 'case';
    id: string;
  } | null>(null);
  const [renameForm] = Form.useForm<{ name: string }>();

  const openAddCase = (moduleId: string) => {
    setAddCaseMode('custom');
    addCaseForm.resetFields();
    addCaseForm.setFieldsValue({ moduleId, tags: [] });
    apiImportForm.resetFields();
    apiImportForm.setFieldsValue({ moduleId, tags: [] });
    setApiSceneSelectedKeys([]);
    setYamlFiles([]);
    setAddCaseOpen(true);
  };

  const appendCase = (payload: { name: string; moduleId: string; tags?: string[] }) => {
    const id = `tc-${Date.now()}`;
    const row: TestCase = {
      id,
      versionId,
      moduleId: payload.moduleId,
      name: payload.name.trim(),
      tags: payload.tags?.length ? payload.tags : [],
      result: '未运行',
      status: '草稿',
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setCases((prev) => [...prev, row]);
    setCaseEnabledMap((prev) => ({ ...prev, [id]: true }));
    setSteps((prev) => [
      ...prev,
      {
        id: `st-${Date.now()}`,
        caseId: id,
        order: 1,
        title: '新步骤',
        detail: '在此编辑步骤说明（占位）。',
      },
    ]);
  };

  const submitAddCase = () => {
    if (addCaseMode === 'custom') {
      addCaseForm.validateFields().then(({ name, moduleId, tags }) => {
        appendCase({ name, moduleId, tags });
        message.success('已添加测试用例');
        setAddCaseOpen(false);
      });
      return;
    }

    if (addCaseMode === 'api') {
      apiImportForm.validateFields().then(({ moduleId, tags }) => {
        if (!apiSceneSelectedKeys.length) {
          message.warning('请选择接口场景');
          return;
        }
        const sceneName = apiSceneSelectedKeys[0].replace('scene-', '');
        appendCase({ name: `接口导入-${sceneName}`, moduleId, tags });
        message.success('已从接口场景导入测试用例');
        setAddCaseOpen(false);
      });
      return;
    }

    if (!yamlFiles.length) {
      message.warning('请上传 YAML 文件');
      return;
    }
    // 按验收要求：仅提示成功，不落地新增用例数据
    message.success('导入成功');
    setAddCaseOpen(false);
  };

  const openAddSub = (parentId: string | null) => {
    setAddSubParentId(parentId);
    addSubForm.resetFields();
    setAddSubOpen(true);
  };

  const submitAddSub = () => {
    addSubForm.validateFields().then(({ name }) => {
      const id = `mod-${Date.now()}`;
      const nextSort =
        Math.max(
          0,
          ...modules
            .filter((m) => m.versionId === versionId && m.parentId === addSubParentId)
            .map((m) => m.sort ?? 0)
        ) + 10;
      setModules((prev) => [
        ...prev,
        { id, versionId, parentId: addSubParentId, name: name.trim(), sort: nextSort },
      ]);
      setModuleEnabledMap((prev) => ({ ...prev, [id]: true }));
      message.success('已添加子目录');
      setAddSubOpen(false);
    });
  };

  const openRename = (kind: 'module' | 'case', id: string) => {
    setRenameTarget({ kind, id });
    if (kind === 'module') {
      const m = modules.find((x) => x.id === id);
      renameForm.setFieldsValue({ name: m?.name || '' });
    } else {
      const c = cases.find((x) => x.id === id);
      renameForm.setFieldsValue({ name: c?.name || '' });
    }
    setRenameOpen(true);
  };

  const submitRename = () => {
    renameForm.validateFields().then(({ name }) => {
      if (!renameTarget) return;
      const n = name.trim();
      if (renameTarget.kind === 'module') {
        setModules((prev) =>
          prev.map((m) => (m.id === renameTarget.id ? { ...m, name: n } : m))
        );
      } else {
        setCases((prev) =>
          prev.map((c) => (c.id === renameTarget.id ? { ...c, name: n } : c))
        );
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.caseId === renameTarget!.id ? { ...t, title: n, key: t.key } : t
          )
        );
      }
      message.success('已重命名');
      setRenameOpen(false);
    });
  };

  const deleteModule = (id: string) => {
    const hasChildMod = modules.some((m) => m.parentId === id);
    const hasCase = cases.some((c) => c.moduleId === id);
    if (hasChildMod || hasCase) {
      message.warning('请先清空子目录与用例后再删除');
      return;
    }
    Modal.confirm({
      title: '删除目录？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const nextMods = modules.filter((m) => m.id !== id);
        setModules(nextMods);
        setModuleEnabledMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (selectedModuleId === id) {
          const first = firstModuleIdFromTree(buildTreeData(nextMods, cases, versionId));
          setSelectedModuleId(first);
          setSelectedKeys(first ? [modKey(first)] : []);
        }
        message.success('已删除目录');
      },
    });
  };

  const deleteCaseById = (id: string) => {
    Modal.confirm({
      title: '删除用例？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setCases((prev) => prev.filter((c) => c.id !== id));
        setCaseEnabledMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setSelectedCaseIds((prev) => prev.filter((x) => x !== id));
        setSteps((prev) => prev.filter((s) => s.caseId !== id));
        setOpenTabs((prev) => {
          const next = prev.filter((t) => t.caseId !== id);
          if (activeTab === id) {
            setActiveTab(next[0]?.key ?? '');
            if (next.length === 0) setRightView('list');
          }
          return next;
        });
        message.success('已删除用例');
      },
    });
  };

  const copyCase = (id: string) => {
    const src = cases.find((c) => c.id === id);
    if (!src) return;
    const newId = `tc-${Date.now()}`;
    const copy: TestCase = {
      ...src,
      id: newId,
      name: `${src.name}（副本）`,
      result: '未运行',
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setCases((prev) => [...prev, copy]);
    setCaseEnabledMap((prev) => ({ ...prev, [newId]: true }));
    const srcSteps = getSteps(id);
    setSteps((prev) => [
      ...prev,
      ...srcSteps.map((s, i) => ({
        ...s,
        id: `st-${Date.now()}-${i}`,
        caseId: newId,
      })),
    ]);
    message.success('已复制用例');
  };

  const onModuleMenuClick = (moduleId: string, key: string) => {
    if (key === 'add-case') openAddCase(moduleId);
    if (key === 'add-sub') openAddSub(moduleId);
    if (key === 'rename') openRename('module', moduleId);
    if (key === 'move') message.info('移动到：后续对接目录选择器');
    if (key === 'del') deleteModule(moduleId);
    if (key === 'debug-run') message.info('目录调试运行（Mock）');
    if (key === 'toggle') {
      const enabled = isModuleEnabled(moduleId);
      setModuleEnabledMap((prev) => ({ ...prev, [moduleId]: !enabled }));
      message.success(enabled ? '已禁用目录' : '已启用目录');
    }
  };

  const onCaseMenuClick = (caseId: string, key: string) => {
    const src = cases.find((c) => c.id === caseId);
    if (key === 'insert' && src) openAddCase(src.moduleId);
    if (key === 'rename') openRename('case', caseId);
    if (key === 'move') message.info('移动到：后续对接目录选择器');
    if (key === 'copy') copyCase(caseId);
    if (key === 'del') deleteCaseById(caseId);
    if (key === 'toggle') {
      const enabled = isCaseEnabled(caseId);
      setCaseEnabledMap((prev) => ({ ...prev, [caseId]: !enabled }));
      message.success(enabled ? '已禁用用例' : '已启用用例');
    }
  };

  const onTopAddMenuClick = (key: string) => {
    if (key === 'add-case') {
      if (!selectedModuleId) {
        message.warning('请先在左侧选择目录');
        return;
      }
      openAddCase(selectedModuleId);
    }
    if (key === 'add-dir') {
      openAddSub(selectedModuleId ?? null);
    }
    if (key === 'export-case') {
      setExportModuleIds([EXPORT_ALL_ROOT_VALUE]);
      setExportCasesOpen(true);
    }
  };

  const normalizeTreeSelectCheckedValues = (v: unknown): string[] => {
    if (v == null) return [];
    const toStr = (x: unknown) =>
      typeof x === 'object' && x !== null && 'value' in x ? String((x as { value: unknown }).value) : String(x);
    if (Array.isArray(v)) return v.map(toStr);
    return [toStr(v)];
  };

  const onExportModuleIdsChange = (v: unknown) => {
    const arr = normalizeTreeSelectCheckedValues(v);
    if (arr.includes(EXPORT_ALL_ROOT_VALUE)) {
      setExportModuleIds([EXPORT_ALL_ROOT_VALUE]);
      return;
    }
    setExportModuleIds(arr);
  };

  const getExportModuleIdSet = useCallback(
    (selectedIds: string[]) => {
      const all = new Set<string>();
      const collect = (moduleId: string) => {
        if (all.has(moduleId)) return;
        all.add(moduleId);
        modules
          .filter((m) => m.versionId === versionId && m.parentId === moduleId)
          .forEach((m) => collect(m.id));
      };
      selectedIds.forEach((id) => collect(id));
      return all;
    },
    [modules, versionId]
  );

  const submitExportTestCases = () => {
    if (exportModuleIds.length === 0) {
      message.warning('请选择要导出的目录');
      return;
    }
    const exportAll = exportModuleIds.includes(EXPORT_ALL_ROOT_VALUE);
    const moduleIdSet = exportAll
      ? new Set(modules.filter((m) => m.versionId === versionId).map((m) => m.id))
      : getExportModuleIdSet(exportModuleIds);
    const dirModules = modules.filter((m) => m.versionId === versionId && moduleIdSet.has(m.id));
    const exportedCases = cases
      .filter((c) => c.versionId === versionId && moduleIdSet.has(c.moduleId))
      .sort((a, b) => a.id.localeCompare(b.id));

    const directoriesPayload = exportAll
      ? [{ id: EXPORT_ALL_ROOT_VALUE, name: '根目录', parentId: null, sort: 0 }]
      : dirModules
          .sort((a, b) => a.sort - b.sort)
          .map((m) => ({
            id: m.id,
            name: m.name,
            parentId: m.parentId,
            sort: m.sort,
          }));

    const payload = {
      exportMeta: {
        generator: 'AutoTestOneUI',
        exportedAt: new Date().toISOString(),
        versionId,
      },
      directories: directoriesPayload,
      cases: exportedCases.map((tc) => {
        const caseSteps = steps
          .filter((s) => s.caseId === tc.id)
          .sort((a, b) => a.order - b.order)
          .map((s) => ({
            id: s.id,
            order: s.order,
            title: s.title,
            detail: s.detail,
            stepType: (stepTypeById[s.id] ?? s.stepType ?? '接口请求') as CaseStepType,
          }));
        return {
          id: tc.id,
          name: tc.name,
          moduleId: tc.moduleId,
          tags: tc.tags,
          result: tc.result,
          status: tc.status,
          updatedAt: tc.updatedAt,
          steps: caseSteps,
        };
      }),
    };

    const yamlText = stringifyYaml(payload, { indent: 2 });
    const blob = new Blob([yamlText], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-cases-${versionId || 'export'}-${new Date().toISOString().slice(0, 10)}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${exportedCases.length} 条用例（YAML）`);
    setExportCasesOpen(false);
  };

  const clearDragPressTimer = () => {
    if (dragPressTimerRef.current !== null) {
      window.clearTimeout(dragPressTimerRef.current);
      dragPressTimerRef.current = null;
    }
  };

  const startDragLongPress = (moduleId: string) => {
    clearDragPressTimer();
    dragPressTimerRef.current = window.setTimeout(() => {
      setDragReadyModuleId(moduleId);
      dragPressTimerRef.current = null;
    }, 1000);
  };

  const clearStepDragPressTimer = () => {
    if (stepDragPressTimerRef.current !== null) {
      window.clearTimeout(stepDragPressTimerRef.current);
      stepDragPressTimerRef.current = null;
    }
  };

  const startStepDragLongPress = (caseId: string, stepId: string) => {
    clearStepDragPressTimer();
    stepDragPressTimerRef.current = window.setTimeout(() => {
      setDragReadyStepByCase((prev) => ({ ...prev, [caseId]: stepId }));
      stepDragPressTimerRef.current = null;
    }, 1000);
  };

  const addStepAt = (
    caseId: string,
    stepType: StepType,
    afterStepId?: string,
    payload?: { title?: string; detail?: string; onCreated?: (sid: string) => void }
  ) => {
    const sid = `st-${Date.now()}`;
    const baseList = getSteps(caseId);
    const insertIndex = afterStepId ? baseList.findIndex((s) => s.id === afterStepId) + 1 : baseList.length;
    const normalizedIndex = insertIndex < 0 ? baseList.length : insertIndex;
    const nextList = [...baseList];
    nextList.splice(normalizedIndex, 0, {
      id: sid,
      caseId,
      order: normalizedIndex + 1,
      title: payload?.title ?? `${stepType}步骤`,
      detail: payload?.detail ?? '',
    });
    const normalized = nextList.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSteps((prev) => [...prev.filter((s) => s.caseId !== caseId), ...normalized]);
    setStepTypeById((prev) => ({ ...prev, [sid]: stepType }));
    setActiveStepByCase((prev) => ({ ...prev, [caseId]: sid }));
    payload?.onCreated?.(sid);
  };

  const copyStep = (caseId: string, stepId: string) => {
    const source = getSteps(caseId).find((s) => s.id === stepId);
    if (!source) return;
    const sid = `st-${Date.now()}`;
    const baseList = getSteps(caseId);
    const insertIndex = baseList.findIndex((s) => s.id === stepId) + 1;
    const nextList = [...baseList];
    nextList.splice(insertIndex, 0, {
      ...source,
      id: sid,
      title: `${source.title}-副本`,
      order: insertIndex + 1,
    });
    const normalized = nextList.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSteps((prev) => [...prev.filter((s) => s.caseId !== caseId), ...normalized]);
    const sourceType = stepTypeById[stepId] ?? '接口请求';
    setStepTypeById((prev) => ({ ...prev, [sid]: sourceType }));
    setActiveStepByCase((prev) => ({ ...prev, [caseId]: sid }));
  };

  const deleteStep = (caseId: string, stepId: string) => {
    const baseList = getSteps(caseId);
    const nextList = baseList.filter((s) => s.id !== stepId).map((s, idx) => ({ ...s, order: idx + 1 }));
    setSteps((prev) => [...prev.filter((s) => s.caseId !== caseId), ...nextList]);
    setStepTypeById((prev) => {
      const next = { ...prev };
      delete next[stepId];
      return next;
    });
    setActiveStepByCase((prev) => {
      const nextActive = nextList[0]?.id ?? '';
      return { ...prev, [caseId]: nextActive };
    });
  };

  const confirmDeleteStep = (caseId: string, stepId: string) => {
    Modal.confirm({
      title: '确认删除该步骤吗？',
      content: '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteStep(caseId, stepId),
    });
  };

  const openCopyStepToDialog = (caseId: string, stepId: string) => {
    setCopySourceStep({ caseId, stepId });
    setCopyToCaseIdsInput('');
    setCopyStepToOpen(true);
  };

  const submitCopyStepToCases = () => {
    if (!copySourceStep) return;
    const ids = copyToCaseIdsInput
      .split(/[，,]/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      message.warning('请输入目标用例ID');
      return;
    }
    const source = getSteps(copySourceStep.caseId).find((s) => s.id === copySourceStep.stepId);
    if (!source) {
      message.error('源步骤不存在');
      return;
    }
    const validCaseIdSet = new Set(cases.map((c) => c.id));
    const invalid = ids.filter((id) => !validCaseIdSet.has(id));
    const targets = ids.filter((id) => validCaseIdSet.has(id));
    if (targets.length === 0) {
      message.warning(`目标用例不存在：${invalid.join('、')}`);
      return;
    }

    const sourceType = stepTypeById[copySourceStep.stepId] ?? '接口请求';
    const typePairs: Array<{ id: string; stepType: StepType }> = [];
    setSteps((prev) => {
      const next = [...prev];
      targets.forEach((targetCaseId) => {
        const maxOrder = next
          .filter((s) => s.caseId === targetCaseId)
          .reduce((m, s) => Math.max(m, s.order), 0);
        const newId = `st-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        next.push({
          ...source,
          id: newId,
          caseId: targetCaseId,
          order: maxOrder + 1,
          title: source.title,
        });
        typePairs.push({ id: newId, stepType: sourceType });
      });
      return next;
    });
    if (typePairs.length > 0) {
      setStepTypeById((prev) => {
        const next = { ...prev };
        typePairs.forEach((p) => {
          next[p.id] = p.stepType;
        });
        return next;
      });
    }
    const msg = invalid.length
      ? `已复制到 ${targets.length} 个用例，以下ID不存在：${invalid.join('、')}`
      : `已复制到 ${targets.length} 个用例`;
    message.success(msg);
    setCopyStepToOpen(false);
  };
  const openCopyAssertToDialog = (caseId: string, stepId: string) => {
    setCopyAssertSource({ caseId, stepId });
    setCopyAssertCaseIdsInput('');
    setCopyAssertToOpen(true);
  };
  const submitCopyAssertToCases = () => {
    if (!copyAssertSource) return;
    const ids = copyAssertCaseIdsInput
      .split(/[，,]/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      message.warning('请输入目标用例ID');
      return;
    }
    const sourceRows = getAssertRows(copyAssertSource.stepId);
    if (sourceRows.length === 0) {
      message.warning('当前步骤暂无可复制断言');
      return;
    }
    const sourceStep = getSteps(copyAssertSource.caseId).find((s) => s.id === copyAssertSource.stepId);
    if (!sourceStep) return;
    const sourceType = stepTypeById[copyAssertSource.stepId] ?? '接口请求';
    const targetCaseSet = new Set(cases.map((c) => c.id));
    const missCaseIds: string[] = [];
    let appendedCaseCount = 0;
    let appendedAssertCount = 0;
    setAssertRowsByStepId((prev) => {
      const next = { ...prev };
      ids.forEach((targetCaseId) => {
        if (!targetCaseSet.has(targetCaseId)) {
          missCaseIds.push(targetCaseId);
          return;
        }
        const targetSteps = getSteps(targetCaseId);
        const targetStep =
          targetSteps.find((s) => s.order === sourceStep.order && (stepTypeById[s.id] ?? '接口请求') === sourceType) ??
          targetSteps.find((s) => (stepTypeById[s.id] ?? '接口请求') === sourceType) ??
          null;
        if (!targetStep) return;
        const baseRows = next[targetStep.id] ?? getAssertRows(targetStep.id);
        const clonedRows = sourceRows.map((r) => ({
          ...r,
          id: `as-${Date.now()}-${Math.floor(Math.random() * 1000)}-${Math.random().toString(36).slice(2, 6)}`,
        }));
        next[targetStep.id] = [...baseRows, ...clonedRows];
        appendedCaseCount += 1;
        appendedAssertCount += clonedRows.length;
      });
      return next;
    });
    if (appendedCaseCount === 0) {
      message.warning('未找到可追加断言的目标步骤');
      return;
    }
    if (missCaseIds.length > 0) {
      message.success(
        `已向 ${appendedCaseCount} 个用例追加 ${appendedAssertCount} 条断言；未找到用例ID：${missCaseIds.join(', ')}`
      );
    } else {
      message.success(`已向 ${appendedCaseCount} 个用例追加 ${appendedAssertCount} 条断言`);
    }
    setCopyAssertToOpen(false);
  };

  const reorderSteps = (caseId: string, dragId: string, dropId: string, before: boolean) => {
    const list = getSteps(caseId);
    const fromIndex = list.findIndex((s) => s.id === dragId);
    const toIndex = list.findIndex((s) => s.id === dropId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    const insertAt = before ? (fromIndex < toIndex ? toIndex - 1 : toIndex) : fromIndex < toIndex ? toIndex : toIndex + 1;
    next.splice(insertAt, 0, moved);
    const normalized = next.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSteps((prev) => [...prev.filter((s) => s.caseId !== caseId), ...normalized]);
  };

  const parsePathParamNames = (pathValue: string) => {
    const names: string[] = [];
    const re = /\{([^{}\/]+)\}/g;
    let m: RegExpExecArray | null = re.exec(pathValue);
    while (m) {
      const name = String(m[1] ?? '').trim();
      if (name && !names.includes(name)) names.push(name);
      m = re.exec(pathValue);
    }
    return names;
  };

  const getPathParams = (stepId: string) => {
    const path = requestUrlByStepId[stepId] ?? '/dcs/v1/protocol/upload';
    const dynamicNames = parsePathParamNames(path);
    const existed = requestPathParamsByStepId[stepId] ?? DEFAULT_PATH_PARAMS;
    const byName = new Map(existed.map((r) => [r.name, r]));
    const orderedNames = ['server_ip', 'server_port', ...dynamicNames.filter((n) => n !== 'server_ip' && n !== 'server_port')];
    return orderedNames.map((name) => {
      const old = byName.get(name);
      return {
        id: `path-${name}`,
        name,
        value: old?.value ?? '',
        required: name === 'server_ip' || name === 'server_port' ? '否' : '是',
        desc: old?.desc ?? '',
      } as RequestParamRow;
    });
  };

  const getQueryParams = (stepId: string) => requestQueryParamsByStepId[stepId] ?? [];
  const getHeaders = (stepId: string) =>
    requestHeadersByStepId[stepId] ?? [
      { id: 'h-1', name: '_tenantId', value: '2', desc: '' },
      { id: 'h-2', name: '_appId', value: '1', desc: '' },
      { id: 'h-3', name: 'Content-Type', value: 'application/json', desc: '' },
    ];
  const getQueryRowsForView = (stepId: string) => [
    ...getQueryParams(stepId),
    { id: '__query_draft__', name: '', value: '', desc: '' } as RequestParamRow,
  ];
  const getHeaderRowsForView = (stepId: string) => [
    ...getHeaders(stepId),
    { id: '__header_draft__', name: '', value: '', desc: '' } as RequestParamRow,
  ];

  const updateRequestParamRow = (
    stepId: string,
    rowId: string,
    field: keyof RequestParamRow,
    value: string,
    kind: 'path' | 'query'
  ) => {
    const setter = kind === 'path' ? setRequestPathParamsByStepId : setRequestQueryParamsByStepId;
    const getter = kind === 'path' ? getPathParams : getQueryParams;
    setter((prev) => {
      const base = getter(stepId);
      const target = base.find((row) => row.id === rowId);
      if (!target) return prev;
      const nextRows = base.map((row) => (row.id === rowId ? { ...row, [field]: value } : row));
      return { ...prev, [stepId]: nextRows };
    });
  };

  const deleteRequestParamRow = (stepId: string, rowId: string, kind: 'path' | 'query') => {
    const setter = kind === 'path' ? setRequestPathParamsByStepId : setRequestQueryParamsByStepId;
    const getter = kind === 'path' ? getPathParams : getQueryParams;
    setter((prev) => ({
      ...prev,
      [stepId]: getter(stepId).filter((row) => row.id !== rowId),
    }));
  };
  const confirmDeleteRequestParamRow = (
    stepId: string,
    rowId: string,
    kind: 'path' | 'query',
    label?: string
  ) => {
    Modal.confirm({
      title: '确认删除该参数吗？',
      content: label ? `将删除参数「${label}」，删除后不可恢复。` : '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteRequestParamRow(stepId, rowId, kind),
    });
  };

  const updateHeaderRow = (stepId: string, rowId: string, field: keyof RequestParamRow, value: string) => {
    setRequestHeadersByStepId((prev) => ({
      ...prev,
      [stepId]: getHeaders(stepId).map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };

  const deleteHeaderRow = (stepId: string, rowId: string) => {
    setRequestHeadersByStepId((prev) => ({
      ...prev,
      [stepId]: getHeaders(stepId).filter((row) => row.id !== rowId),
    }));
  };
  const confirmDeleteHeaderRow = (stepId: string, rowId: string, label?: string) => {
    Modal.confirm({
      title: '确认删除该 Header 吗？',
      content: label ? `将删除 Header「${label}」，删除后不可恢复。` : '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteHeaderRow(stepId, rowId),
    });
  };

  const addHeaderRowAndEdit = (stepId: string) => {
    const newId = `h-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setRequestHeadersByStepId((prev) => ({
      ...prev,
      [stepId]: [...getHeaders(stepId), { id: newId, name: '', value: '', desc: '' }],
    }));
    setEditingHeaderRowByStepId((prev) => ({ ...prev, [stepId]: newId }));
  };

  const getBodyMode = (stepId: string): BodyMode => bodyModeByStepId[stepId] ?? 'json';
  const getBodyFormData = (stepId: string) => bodyFormDataByStepId[stepId] ?? [];
  const getBodyUrlEncoded = (stepId: string) => bodyUrlEncodedByStepId[stepId] ?? [];
  const getBodyFormRowsForView = (stepId: string) => [
    ...getBodyFormData(stepId),
    { id: '__body_form_draft__', name: '', value: '', desc: '', paramType: 'string' as const },
  ];
  const getBodyUrlRowsForView = (stepId: string) => [
    ...getBodyUrlEncoded(stepId),
    { id: '__body_url_draft__', name: '', value: '', desc: '' },
  ];

  const updateBodyRow = (
    stepId: string,
    rowId: string,
    field: keyof BodyParamRow,
    value: string,
    kind: 'form' | 'url'
  ) => {
    const getter = kind === 'form' ? getBodyFormData : getBodyUrlEncoded;
    const setter = kind === 'form' ? setBodyFormDataByStepId : setBodyUrlEncodedByStepId;
    setter((prev) => ({
      ...prev,
      [stepId]: getter(stepId).map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };

  const addBodyRowAndEdit = (stepId: string, kind: 'form' | 'url') => {
    const newId = `b-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (kind === 'form') {
      setBodyFormDataByStepId((prev) => ({
        ...prev,
        [stepId]: [...getBodyFormData(stepId), { id: newId, name: '', value: '', desc: '', paramType: 'string' }],
      }));
      setEditingBodyFormRowByStepId((prev) => ({ ...prev, [stepId]: newId }));
      return;
    }
    setBodyUrlEncodedByStepId((prev) => ({
      ...prev,
      [stepId]: [...getBodyUrlEncoded(stepId), { id: newId, name: '', value: '', desc: '' }],
    }));
    setEditingBodyUrlRowByStepId((prev) => ({ ...prev, [stepId]: newId }));
  };

  const deleteBodyRow = (stepId: string, rowId: string, kind: 'form' | 'url') => {
    if (kind === 'form') {
      setBodyFormDataByStepId((prev) => ({
        ...prev,
        [stepId]: getBodyFormData(stepId).filter((row) => row.id !== rowId),
      }));
      return;
    }
    setBodyUrlEncodedByStepId((prev) => ({
      ...prev,
      [stepId]: getBodyUrlEncoded(stepId).filter((row) => row.id !== rowId),
    }));
  };

  const confirmDeleteBodyRow = (stepId: string, rowId: string, kind: 'form' | 'url', label?: string) => {
    Modal.confirm({
      title: '确认删除该参数吗？',
      content: label ? `将删除参数「${label}」，删除后不可恢复。` : '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteBodyRow(stepId, rowId, kind),
    });
  };

  const getExtractRows = (stepId: string) => extractRowsByStepId[stepId] ?? [];
  const getExtractRowsForView = (stepId: string): ExtractRow[] => [
    ...getExtractRows(stepId),
    {
      id: '__extract_draft__',
      name: '',
      desc: '',
      variableType: '全局变量',
      valueType: '字符串',
      source: '',
      expr: '',
    },
  ];
  const updateExtractRow = (stepId: string, rowId: string, field: keyof ExtractRow, value: string) => {
    setExtractRowsByStepId((prev) => ({
      ...prev,
      [stepId]: getExtractRows(stepId).map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };
  const addExtractRowAndEdit = (stepId: string) => {
    const newId = `ex-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setExtractRowsByStepId((prev) => ({
      ...prev,
      [stepId]: [
        ...getExtractRows(stepId),
        {
          id: newId,
          name: '',
          desc: '',
          variableType: '全局变量',
          valueType: '字符串',
          source: '',
          expr: '',
        },
      ],
    }));
    setEditingExtractRowByStepId((prev) => ({ ...prev, [stepId]: newId }));
  };
  const deleteExtractRow = (stepId: string, rowId: string) => {
    setExtractRowsByStepId((prev) => ({
      ...prev,
      [stepId]: getExtractRows(stepId).filter((row) => row.id !== rowId),
    }));
  };
  const confirmDeleteExtractRow = (stepId: string, rowId: string, label?: string) => {
    Modal.confirm({
      title: '确认删除该变量提取规则吗？',
      content: label ? `将删除变量「${label}」，删除后不可恢复。` : '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteExtractRow(stepId, rowId),
    });
  };

  const getAssertRows = (stepId: string): AssertRow[] =>
    assertRowsByStepId[stepId] ?? [
      {
        id: `as-init-${stepId}`,
        desc: 'code=200',
        source: '响应体',
        target: 'code',
        op: '等于',
        negate: false,
        expected: '200',
      },
    ];
  const updateAssertRow = (stepId: string, rowId: string, patch: Partial<AssertRow>) => {
    setAssertRowsByStepId((prev) => ({
      ...prev,
      [stepId]: getAssertRows(stepId).map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));
  };
  const addAssertRow = (stepId: string) => {
    const newRow: AssertRow = {
      id: `as-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      desc: '',
      source: '响应体',
      target: '',
      op: '等于',
      negate: false,
      expected: '',
    };
    setAssertRowsByStepId((prev) => ({ ...prev, [stepId]: [...getAssertRows(stepId), newRow] }));
  };
  const deleteAssertRow = (stepId: string, rowId: string) => {
    setAssertRowsByStepId((prev) => ({ ...prev, [stepId]: getAssertRows(stepId).filter((r) => r.id !== rowId) }));
  };
  const confirmDeleteAssertRow = (stepId: string, rowId: string) => {
    Modal.confirm({
      title: '确认删除该断言吗？',
      content: '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteAssertRow(stepId, rowId),
    });
  };

  const getRequestTabCount = (
    stepId: string,
    tab: 'Params' | 'Headers' | 'Body' | 'Cookies' | '变量提取' | '断言'
  ) => {
    if (tab === 'Params') return getPathParams(stepId).length + getQueryParams(stepId).length;
    if (tab === 'Headers') return getHeaders(stepId).length;
    if (tab === 'Body') {
      const mode = getBodyMode(stepId);
      if (mode === 'none') return 0;
      if (mode === 'json') return (bodyJsonByStepId[stepId] ?? '{}').trim() ? 1 : 0;
      if (mode === 'form-data') return getBodyFormData(stepId).length;
      return getBodyUrlEncoded(stepId).length;
    }
    if (tab === 'Cookies') return 0;
    if (tab === '变量提取') return getExtractRows(stepId).length;
    return getAssertRows(stepId).length;
  };

  const buildRequestTabLabel = (
    stepId: string,
    tab: 'Params' | 'Headers' | 'Body' | 'Cookies' | '变量提取' | '断言'
  ) => {
    const count = getRequestTabCount(stepId, tab);
    return (
      <Space size={6}>
        <span>{tab}</span>
        <span
          style={{
            fontSize: 12,
            lineHeight: '16px',
            minWidth: 16,
            textAlign: 'center',
            padding: '0 4px',
            borderRadius: 3,
            background: '#e6f4ff',
            color: '#1677ff',
          }}
        >
          {count}
        </span>
      </Space>
    );
  };

  const getFunctionCalls = (stepId: string): FunctionCallRow[] =>
    functionCallsByStepId[stepId] ?? [{ id: `fc-init-${stepId}`, functionName: '', args: '' }];
  const addFunctionCall = (stepId: string) => {
    const next: FunctionCallRow = { id: `fc-${Date.now()}-${Math.floor(Math.random() * 1000)}`, functionName: '', args: '' };
    setFunctionCallsByStepId((prev) => ({ ...prev, [stepId]: [...getFunctionCalls(stepId), next] }));
  };
  const updateFunctionCall = (stepId: string, rowId: string, patch: Partial<FunctionCallRow>) => {
    setFunctionCallsByStepId((prev) => ({
      ...prev,
      [stepId]: getFunctionCalls(stepId).map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));
  };
  const deleteFunctionCall = (stepId: string, rowId: string) => {
    setFunctionCallsByStepId((prev) => ({ ...prev, [stepId]: getFunctionCalls(stepId).filter((r) => r.id !== rowId) }));
  };
  const confirmDeleteFunctionCall = (stepId: string, rowId: string) => {
    Modal.confirm({
      title: '确认删除该函数调用吗？',
      content: '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteFunctionCall(stepId, rowId),
    });
  };
  const openChooseFunctionModal = (stepId: string, rowId: string) => {
    const row = getFunctionCalls(stepId).find((r) => r.id === rowId);
    setChooseFunctionStepId(stepId);
    setChooseFunctionRowId(rowId);
    setChooseFunctionValue(row?.functionName ?? '');
    setChooseFunctionModalOpen(true);
  };
  const submitChooseFunction = () => {
    if (!chooseFunctionStepId || !chooseFunctionRowId || !chooseFunctionValue) return;
    updateFunctionCall(chooseFunctionStepId, chooseFunctionRowId, { functionName: chooseFunctionValue });
    setChooseFunctionModalOpen(false);
    setChooseFunctionValue('');
  };
  const openDbStepCreate = (caseId: string, afterStepId?: string) => {
    setDbStepCreateCaseId(caseId);
    setDbStepCreateAfterStepId(afterStepId);
    setDbStepCreateType('MariaDb');
    setDbStepCreateName('');
    setDbStepCreateOpen(true);
  };
  const submitDbStepCreate = () => {
    const name = dbStepCreateName.trim();
    if (!name) {
      message.warning('请输入步骤名称');
      return;
    }
    addStepAt(dbStepCreateCaseId, '数据库操作', dbStepCreateAfterStepId, {
      title: name,
      onCreated: (sid) => {
        setDbTypeByStepId((prev) => ({ ...prev, [sid]: dbStepCreateType }));
        setDbTabByStepId((prev) => ({ ...prev, [sid]: 'SQL命令' }));
      },
    });
    setDbStepCreateOpen(false);
  };

  const getFunctionSourceOptions = (stepId: string) =>
    getFunctionCalls(stepId).map((_, idx) => ({ label: `#${idx + 1}`, value: `#${idx + 1}` }));

  const getFunctionExtractRows = (stepId: string): FunctionExtractRow[] => functionExtractRowsByStepId[stepId] ?? [];
  const getFunctionExtractRowsForView = (stepId: string): FunctionExtractRow[] => [
    ...getFunctionExtractRows(stepId),
    { id: '__func_extract_draft__', name: '', variableType: '全局变量', valueType: '字符串', source: '#1', expr: '' },
  ];
  const addFunctionExtractRow = (stepId: string) => {
    const id = `fx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const source = getFunctionSourceOptions(stepId)[0]?.value ?? '#1';
    setFunctionExtractRowsByStepId((prev) => ({
      ...prev,
      [stepId]: [...getFunctionExtractRows(stepId), { id, name: '', variableType: '全局变量', valueType: '字符串', source, expr: '' }],
    }));
    setEditingFunctionExtractRowByStepId((prev) => ({ ...prev, [stepId]: id }));
  };
  const updateFunctionExtractRow = (stepId: string, rowId: string, patch: Partial<FunctionExtractRow>) => {
    setFunctionExtractRowsByStepId((prev) => ({
      ...prev,
      [stepId]: getFunctionExtractRows(stepId).map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));
  };
  const deleteFunctionExtractRow = (stepId: string, rowId: string) => {
    setFunctionExtractRowsByStepId((prev) => ({ ...prev, [stepId]: getFunctionExtractRows(stepId).filter((r) => r.id !== rowId) }));
  };

  const getFunctionAssertRows = (stepId: string): FunctionAssertRow[] =>
    functionAssertRowsByStepId[stepId] ?? [
      {
        id: `fa-init-${stepId}`,
        desc: '',
        source: '#1',
        target: '',
        op: '等于',
        negate: false,
        expected: '',
      },
    ];
  const addFunctionAssertRow = (stepId: string) => {
    const source = getFunctionSourceOptions(stepId)[0]?.value ?? '#1';
    const row: FunctionAssertRow = {
      id: `fa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      desc: '',
      source,
      target: '',
      op: '等于',
      negate: false,
      expected: '',
    };
    setFunctionAssertRowsByStepId((prev) => ({ ...prev, [stepId]: [...getFunctionAssertRows(stepId), row] }));
  };
  const updateFunctionAssertRow = (stepId: string, rowId: string, patch: Partial<FunctionAssertRow>) => {
    setFunctionAssertRowsByStepId((prev) => ({
      ...prev,
      [stepId]: getFunctionAssertRows(stepId).map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));
  };
  const deleteFunctionAssertRow = (stepId: string, rowId: string) => {
    setFunctionAssertRowsByStepId((prev) => ({ ...prev, [stepId]: getFunctionAssertRows(stepId).filter((r) => r.id !== rowId) }));
  };
  const confirmDeleteFunctionAssertRow = (stepId: string, rowId: string) => {
    Modal.confirm({
      title: '确认删除该断言吗？',
      content: '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteFunctionAssertRow(stepId, rowId),
    });
  };
  const getFuncTabCount = (stepId: string, tab: '函数调用' | '变量提取' | '断言') => {
    if (tab === '函数调用') return getFunctionCalls(stepId).length;
    if (tab === '变量提取') return getFunctionExtractRows(stepId).length;
    return getFunctionAssertRows(stepId).length;
  };
  const getDbExtractRows = (stepId: string): FunctionExtractRow[] => dbExtractRowsByStepId[stepId] ?? [];
  const getDbExtractRowsForView = (stepId: string): FunctionExtractRow[] => [
    ...getDbExtractRows(stepId),
    { id: '__db_extract_draft__', name: '', variableType: '全局变量', valueType: '字符串', source: 'SQL查询', expr: '' },
  ];
  const addDbExtractRow = (stepId: string) => {
    const id = `dbx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setDbExtractRowsByStepId((prev) => ({
      ...prev,
      [stepId]: [...getDbExtractRows(stepId), { id, name: '', variableType: '全局变量', valueType: '字符串', source: 'SQL查询', expr: '' }],
    }));
    setEditingDbExtractRowByStepId((prev) => ({ ...prev, [stepId]: id }));
  };
  const updateDbExtractRow = (stepId: string, rowId: string, patch: Partial<FunctionExtractRow>) => {
    setDbExtractRowsByStepId((prev) => ({
      ...prev,
      [stepId]: getDbExtractRows(stepId).map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));
  };
  const deleteDbExtractRow = (stepId: string, rowId: string) => {
    setDbExtractRowsByStepId((prev) => ({ ...prev, [stepId]: getDbExtractRows(stepId).filter((r) => r.id !== rowId) }));
  };
  const hasMissingExtractRequiredForCase = (steps: CaseStep[]) =>
    steps.some((step) => {
      const requestMissing = getExtractRows(step.id).some((row) => !row.name.trim());
      const functionMissing = getFunctionExtractRows(step.id).some((row) => !row.name.trim());
      const dbMissing = getDbExtractRows(step.id).some((row) => !row.name.trim());
      return requestMissing || functionMissing || dbMissing;
    });
  const confirmDeleteDbExtractRow = (stepId: string, rowId: string) => {
    Modal.confirm({
      title: '确认删除该变量提取吗？',
      content: '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteDbExtractRow(stepId, rowId),
    });
  };
  const getDbAssertRows = (stepId: string): FunctionAssertRow[] =>
    dbAssertRowsByStepId[stepId] ?? [
      { id: `dba-init-${stepId}`, desc: '', source: 'SQL查询', target: '', op: '等于', negate: false, expected: '' },
    ];
  const addDbAssertRow = (stepId: string) => {
    const row: FunctionAssertRow = {
      id: `dba-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      desc: '',
      source: 'SQL查询',
      target: '',
      op: '等于',
      negate: false,
      expected: '',
    };
    setDbAssertRowsByStepId((prev) => ({ ...prev, [stepId]: [...getDbAssertRows(stepId), row] }));
  };
  const updateDbAssertRow = (stepId: string, rowId: string, patch: Partial<FunctionAssertRow>) => {
    setDbAssertRowsByStepId((prev) => ({
      ...prev,
      [stepId]: getDbAssertRows(stepId).map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));
  };
  const deleteDbAssertRow = (stepId: string, rowId: string) => {
    setDbAssertRowsByStepId((prev) => ({ ...prev, [stepId]: getDbAssertRows(stepId).filter((r) => r.id !== rowId) }));
  };
  const confirmDeleteDbAssertRow = (stepId: string, rowId: string) => {
    Modal.confirm({
      title: '确认删除该断言吗？',
      content: '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteDbAssertRow(stepId, rowId),
    });
  };

  const openBodyJsonDynamicValue = (stepId: string) => {
    const host = bodyJsonDynamicHostRef.current[stepId];
    const triggerBtn = host?.querySelector('button[aria-label="插入动态值"]') as HTMLButtonElement | null;
    triggerBtn?.click();
  };

  const formatBodyJson = (stepId: string) => {
    const raw = bodyJsonByStepId[stepId] ?? '{}';
    try {
      const parsed = JSON.parse(raw);
      setBodyJsonByStepId((prev) => ({ ...prev, [stepId]: JSON.stringify(parsed, null, 2) }));
      setBodyJsonErrorByStepId((prev) => ({ ...prev, [stepId]: '' }));
      message.success('JSON 已格式化');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'JSON 格式错误';
      const posMatch = msg.match(/position\s+(\d+)/i);
      let hint = msg;
      if (posMatch) {
        const pos = Number(posMatch[1]);
        const head = raw.slice(0, Math.max(0, pos));
        const line = head.split('\n').length;
        const col = head.length - head.lastIndexOf('\n');
        hint = `第 ${line} 行，第 ${col} 列附近格式错误：${msg}`;
      }
      setBodyJsonErrorByStepId((prev) => ({ ...prev, [stepId]: hint }));
      message.error('JSON 格式错误，请按红色提示修正');
    }
  };

  const addQueryRowAndEdit = (stepId: string) => {
    const newId = `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setRequestQueryParamsByStepId((prev) => ({
      ...prev,
      [stepId]: [...(prev[stepId] ?? []), { id: newId, name: '', value: '', desc: '' }],
    }));
    setEditingQueryRowByStepId((prev) => ({ ...prev, [stepId]: newId }));
  };

  const onTreeDrop: TreeProps['onDrop'] = (info) => {
    const dragKey = String(info.dragNode.key);
    const dropKey = String(info.node.key);
    const dragParsed = parseTreeKey(dragKey);
    const dropParsed = parseTreeKey(dropKey);

    setDragReadyModuleId(null);
    setDragOverKey(null);
    clearDragPressTimer();

    if (!dragParsed || dragParsed.kind !== 'module') return;
    if (!dropParsed) return;
    if (isRootModule(dragParsed.id)) {
      message.warning('根目录不支持拖动');
      return;
    }
    let targetModuleId: string | null = null;
    if (dropParsed.kind === 'module') {
      targetModuleId = dropParsed.id;
    } else {
      // 拖到用例行时，按该用例所属目录处理，避免“拖了没反应”
      const targetCase = cases.find((c) => c.id === dropParsed.id);
      targetModuleId = targetCase?.moduleId ?? null;
    }
    if (!targetModuleId) return;
    if (dragParsed.id === targetModuleId) return;

    const descendants = collectDescendantModuleIds(dragParsed.id, modules);
    if (descendants.has(targetModuleId)) {
      message.warning('不能拖入当前目录的子目录');
      return;
    }

    const targetModule = modules.find((m) => m.id === targetModuleId);
    if (!targetModule) return;

    let nextParentId: string | null = null;
    if (info.dropToGap || dropParsed.kind === 'case') {
      nextParentId = targetModule.parentId;
    } else {
      nextParentId = targetModuleId;
    }
    if (nextParentId && descendants.has(nextParentId)) {
      message.warning('不能拖入当前目录的子目录');
      return;
    }
    if (nextParentId === null) {
      message.warning('不支持拖出根目录');
      return;
    }

    setModules((prev) => {
      const dragMod = prev.find((m) => m.id === dragParsed.id);
      const dropMod = prev.find((m) => m.id === targetModuleId);
      if (!dragMod || !dropMod) return prev;

      const oldParentId = dragMod.parentId;
      const newParentId = nextParentId;
      const vid = dragMod.versionId;

      // 移出拖拽节点
      let next = prev.filter((m) => m.id !== dragMod.id);

      const renumberByOrder = (mods: CaseModule[], orderedIds: string[]) => {
        const orderMap = new Map(orderedIds.map((id, idx) => [id, (idx + 1) * 10]));
        return mods.map((m) => (orderMap.has(m.id) ? { ...m, sort: orderMap.get(m.id)! } : m));
      };

      // 目标父级下同级列表（不含拖拽节点）
      const siblingIds = next
        .filter((m) => m.versionId === vid && m.parentId === newParentId)
        .sort((a, b) => a.sort - b.sort)
        .map((m) => m.id);

      let insertIndex = siblingIds.length;
      if (info.dropToGap || dropParsed.kind === 'case') {
        const idx = siblingIds.indexOf(dropMod.id);
        const before = info.dropPosition < 0;
        insertIndex = idx >= 0 ? idx + (before ? 0 : 1) : siblingIds.length;
      }

      // 先把拖拽节点放入 next（parentId + sort 占位）
      const moved: CaseModule = { ...dragMod, parentId: newParentId, sort: 9999 };
      next = [...next, moved];

      // 生成目标父级下的新顺序并重排 sort
      const nextSiblingIds = [...siblingIds];
      nextSiblingIds.splice(insertIndex, 0, moved.id);
      next = renumberByOrder(next, nextSiblingIds);

      // 原父级也需要重排（如果发生跨父级移动）
      if (oldParentId !== newParentId) {
        const oldSiblingIds = next
          .filter((m) => m.versionId === vid && m.parentId === oldParentId)
          .sort((a, b) => a.sort - b.sort)
          .map((m) => m.id);
        next = renumberByOrder(next, oldSiblingIds);
      }

      return next;
    });
    message.success('目录已移动');
  };

  const titleRender = (node: DataNode) => {
    const key = String(node.key);
    const parsed = parseTreeKey(key);
    if (!parsed) return <span>{node.title as React.ReactNode}</span>;
    const enabled = parsed.kind === 'module' ? isModuleEnabled(parsed.id) : isCaseEnabled(parsed.id);
    const moduleMenuItems: MenuProps['items'] = [
      { key: 'add-case', label: '添加测试用例', icon: <PlusOutlined /> },
      { key: 'add-sub', label: '添加子目录', icon: <PlusOutlined /> },
      { key: 'debug-run', label: '调试运行', icon: <CheckCircleOutlined /> },
      { key: 'rename', label: '重命名', icon: <EditOutlined /> },
      {
        key: 'move',
        label: '移动到',
        icon: <EditOutlined />,
      },
      {
        key: 'toggle',
        label: isModuleEnabled(parsed.id) ? '禁用' : '启用',
        icon: isModuleEnabled(parsed.id) ? <StopOutlined /> : <CheckCircleOutlined />,
      },
      { type: 'divider' },
      { key: 'del', label: '删除', danger: true, icon: <DeleteOutlined /> },
    ];
    const caseMenuItems: MenuProps['items'] = [
      { key: 'insert', label: '插入测试用例', icon: <PlusOutlined /> },
      { key: 'rename', label: '重命名', icon: <EditOutlined /> },
      { key: 'move', label: '移动到' },
      { key: 'copy', label: '复制', icon: <CopyOutlined /> },
      {
        key: 'toggle',
        label: isCaseEnabled(parsed.id) ? '禁用' : '启用',
        icon: isCaseEnabled(parsed.id) ? <StopOutlined /> : <CheckCircleOutlined />,
      },
      { type: 'divider' },
      { key: 'del', label: '删除', danger: true, icon: <DeleteOutlined /> },
    ];
    const menu: MenuProps = parsed.kind === 'module'
      ? {
          items: moduleMenuItems,
          onClick: ({ key: k }) => onModuleMenuClick(parsed.id, String(k)),
        }
      : {
          items: caseMenuItems,
          onClick: ({ key: k }) => onCaseMenuClick(parsed.id, String(k)),
        };
    return (
      <div className={`case-tree-row ${enabled ? '' : 'is-disabled'}`}>
        <Space size={6} style={{ minWidth: 0 }}>
          {parsed.kind === 'module' ? (
            <FolderOpenOutlined style={{ color: enabled ? '#1677ff' : '#bfbfbf' }} />
          ) : (
            <FileTextOutlined style={{ color: enabled ? '#52c41a' : '#bfbfbf' }} />
          )}
          <span style={{ userSelect: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span
              onMouseDown={() => {
                if (parsed.kind !== 'module') return;
                if (isRootModule(parsed.id)) return;
                startDragLongPress(parsed.id);
              }}
              onMouseUp={clearDragPressTimer}
              onMouseLeave={clearDragPressTimer}
              style={{
                cursor:
                  parsed.kind === 'module' && !isRootModule(parsed.id)
                    ? dragReadyModuleId === parsed.id
                      ? 'grab'
                      : 'default'
                    : 'default',
              }}
            >
              <Tooltip
                title={
                  parsed.kind === 'module' && !isRootModule(parsed.id)
                    ? '长按 1 秒后可拖动'
                    : undefined
                }
                mouseEnterDelay={0.3}
              >
                <span>{node.title as React.ReactNode}</span>
              </Tooltip>
            </span>
          </span>
        </Space>
        <Dropdown trigger={['click']} menu={menu}>
          <Button
            className="case-tree-row-action"
            type="text"
            size="small"
            icon={<MoreOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
        {dragOverKey === key ? (
          <ArrowDownOutlined style={{ color: '#1677ff', fontSize: 12 }} />
        ) : null}
      </div>
    );
  };

  const baseColumns: ColumnsType<TestCase> = [
    { title: '用例ID', dataIndex: 'id', width: 120, ellipsis: true },
    {
      title: '用例名称',
      dataIndex: 'name',
      ellipsis: true,
      render: (name: string, row) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => openCaseTab(row)}>
          {name}
        </Button>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 160,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '所属模块',
      key: 'module',
      width: 120,
      ellipsis: true,
      render: (_, row) => modules.find((m) => m.id === row.moduleId)?.name ?? '-',
    },
    {
      title: '运行结果',
      dataIndex: 'result',
      width: 96,
      render: (r: CaseResult) => <Tag {...resultTagProps[r]}>{r}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (_, row) => (
        <Switch
          size="small"
          checked={isCaseEnabled(row.id)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => {
            setCaseEnabledMap((prev) => ({ ...prev, [row.id]: checked }));
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" onClick={() => copyCase(row.id)}>
            复制
          </Button>
          <Button type="link" size="small" onClick={() => openRename('case', row.id)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => deleteCaseById(row.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const tableColumns = baseColumns;

  const onTabEdit = (
    targetKey: string | MouseEvent | KeyboardEvent,
    action: 'add' | 'remove'
  ) => {
    if (action === 'remove' && typeof targetKey === 'string') {
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.key !== targetKey);
        if (activeTab === targetKey) {
          const fallback = next[0]?.key ?? '';
          setActiveTab(fallback);
          if (next.length === 0) {
            setRightView('list');
            if (selectedModuleId) setSelectedKeys([modKey(selectedModuleId)]);
          }
        }
        return next;
      });
    }
  };

  const renderDetailPane = (caseId: string) => {
    const tc = getCase(caseId);
    if (!tc) return null;
    const list = getSteps(caseId);
    const stepId = activeStepByCase[caseId] || list[0]?.id || '';
    const step = list.find((s) => s.id === stepId);
    const stepType: StepType = step ? stepTypeById[step.id] ?? '接口请求' : '接口请求';

    return (
      <div
        className="case-detail-pane"
        style={{
          display: activeTab === caseId ? 'flex' : 'none',
          flexDirection: 'column',
          flex: 1,
          height: '100%',
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <Text strong style={{ flex: 1, minWidth: 160 }}>
            {tc.name}
          </Text>
          <Select
            value={selectedEnvByCase[caseId] ?? 'SIT'}
            onChange={(v) => {
              const nextEnv = String(v);
              const prevEnv = selectedEnvByCase[caseId] ?? 'SIT';
              const prevDefaultHost = ENV_DEFAULT_HOST[prevEnv] ?? ENV_DEFAULT_HOST.SIT;
              const nextDefaultHost = ENV_DEFAULT_HOST[nextEnv] ?? ENV_DEFAULT_HOST.SIT;
              setSelectedEnvByCase((prev) => ({ ...prev, [caseId]: nextEnv }));
              setRequestHostByStepId((prev) => {
                const next = { ...prev };
                list.forEach((s) => {
                  const host = next[s.id];
                  // 仅覆盖默认值或尚未填写，避免覆盖用户手工改过的地址
                  if (!host || host === prevDefaultHost) next[s.id] = nextDefaultHost;
                });
                return next;
              });
              setRequestProtocolByStepId((prev) => {
                const next = { ...prev };
                list.forEach((s) => {
                  const protocol = next[s.id];
                  // 仅当协议是“默认”或为空时随环境切换
                  if (!protocol || protocol === '默认') next[s.id] = '默认';
                });
                return next;
              });
            }}
            options={envOptions}
            style={{ width: 120 }}
            placeholder="环境"
          />
          <Button
            type="primary"
            onClick={() => {
              if (hasMissingExtractRequiredForCase(list)) {
                message.error('缺失变量提取必填参数');
                return;
              }
              message.success('保存成功（Mock）');
            }}
          >
            保存
          </Button>
          <Button onClick={() => message.info('调试请求已发送（Mock）')}>调试</Button>
        </div>
        <div
          className="case-detail-main-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 16,
            flex: 1,
            minHeight: 0,
          }}
        >
          <Card
            size="small"
            title="步骤"
            style={{ height: '100%' }}
            styles={{ body: { padding: 8, height: '100%', overflow: 'auto' } }}
          >
            <List
              size="small"
              dataSource={list}
              renderItem={(item) => (
                <List.Item
                  className="case-step-row"
                  style={{
                    cursor:
                      dragReadyStepByCase[caseId] === item.id ? 'grab' : 'pointer',
                    background:
                      item.id === stepId
                        ? '#e6f4ff'
                        : dragOverStepByCase[caseId] === item.id
                          ? '#f0f5ff'
                          : undefined,
                    padding: '6px 8px',
                    borderRadius: 4,
                  }}
                  draggable={dragReadyStepByCase[caseId] === item.id}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    startStepDragLongPress(caseId, item.id);
                  }}
                  onMouseUp={clearStepDragPressTimer}
                  onMouseLeave={clearStepDragPressTimer}
                  onDragStart={() => {
                    setDragReadyStepByCase((prev) => ({ ...prev, [caseId]: item.id }));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStepByCase((prev) => ({ ...prev, [caseId]: item.id }));
                  }}
                  onDragEnd={() => {
                    clearStepDragPressTimer();
                    setDragReadyStepByCase((prev) => ({ ...prev, [caseId]: null }));
                    setDragOverStepByCase((prev) => ({ ...prev, [caseId]: null }));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragId = dragReadyStepByCase[caseId];
                    if (!dragId || dragId === item.id) return;
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const before = e.clientY < rect.top + rect.height / 2;
                    reorderSteps(caseId, dragId, item.id, before);
                    setDragReadyStepByCase((prev) => ({ ...prev, [caseId]: null }));
                    setDragOverStepByCase((prev) => ({ ...prev, [caseId]: null }));
                  }}
                  onClick={() =>
                    setActiveStepByCase((prev) => ({ ...prev, [caseId]: item.id }))
                  }
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      gap: 6,
                      minWidth: 0,
                    }}
                  >
                    <Text style={{ flex: '0 0 auto' }}>{item.order}.</Text>
                    <Tag color={stepTypeById[item.id] === '调用函数' ? 'purple' : 'blue'} style={{ marginInlineEnd: 0 }}>
                      {(stepTypeById[item.id] ?? '接口请求') === '自定义接口请求' ? '接口请求' : (stepTypeById[item.id] ?? '接口请求')}
                    </Tag>
                    <Text
                      ellipsis={{ tooltip: item.title }}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      {item.title}
                    </Text>
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: [
                          { key: 'copy', label: '复制', icon: <CopyOutlined /> },
                          {
                            key: 'copyTo',
                            label: '复制到',
                            icon: <CopyOutlined />,
                          },
                          {
                            key: 'add',
                            label: '添加',
                            icon: <PlusOutlined />,
                            children: STEP_TYPES.map((t) => ({ key: `add-${t}`, label: t })),
                          },
                          { key: 'delete', label: '删除', icon: <DeleteOutlined /> },
                        ],
                        onClick: ({ key }) => {
                          if (key === 'copy') copyStep(caseId, item.id);
                          if (key === 'copyTo') openCopyStepToDialog(caseId, item.id);
                          if (String(key).startsWith('add-')) {
                            const chosen = String(key).slice(4) as StepType;
                            if (chosen === '数据库操作') {
                              openDbStepCreate(caseId, item.id);
                            } else {
                              addStepAt(caseId, chosen, item.id);
                            }
                          }
                          if (key === 'delete') confirmDeleteStep(caseId, item.id);
                        },
                      }}
                    >
                      <Button
                        className="case-step-row-action"
                        type="text"
                        size="small"
                        icon={<MoreOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  </div>
                </List.Item>
              )}
            />
            <Dropdown
              trigger={['hover', 'click']}
              menu={{
                items: STEP_TYPES.map((t) => ({ key: t, label: t })),
                onClick: ({ key }) => {
                  const chosen = String(key) as StepType;
                  if (chosen === '数据库操作') {
                    openDbStepCreate(caseId);
                  } else {
                    addStepAt(caseId, chosen);
                  }
                },
              }}
            >
              <Button type="dashed" block size="small" style={{ marginTop: 8 }}>
                添加步骤 <DownOutlined />
              </Button>
            </Dropdown>
          </Card>
          <Card
            size="small"
            title={step ? `步骤 ${step.order}` : '步骤详情'}
            style={{ height: '100%' }}
            styles={{ body: { height: '100%', overflow: 'auto' } }}
          >
            {step ? (
              <>
                <Input
                  value={step.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSteps((prev) =>
                      prev.map((s) => (s.id === step.id ? { ...s, title: v } : s))
                    );
                  }}
                  style={{ marginBottom: 12 }}
                  placeholder="步骤标题"
                />

                {stepType === '接口请求' || stepType === '自定义接口请求' ? (
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <Select
                        value={requestProtocolByStepId[step.id] ?? '默认'}
                        onChange={(v) =>
                          setRequestProtocolByStepId((prev) => ({ ...prev, [step.id]: v }))
                        }
                        options={[
                          {
                            label: `默认（${ENV_DEFAULT_PROTOCOL[selectedEnvByCase[caseId] ?? 'SIT']}）`,
                            value: '默认',
                          },
                          { label: 'http', value: 'http' },
                          { label: 'https', value: 'https' },
                        ]}
                        style={{ width: 96 }}
                      />
                      <Select
                        value={requestMethodByStepId[step.id] ?? 'GET'}
                        onChange={(v) =>
                          setRequestMethodByStepId((prev) => ({ ...prev, [step.id]: v }))
                        }
                        options={['GET', 'POST', 'PUT', 'DELETE'].map((m) => ({ label: m, value: m }))}
                        style={{ width: 100 }}
                      />
                      <Input
                        value={
                          requestHostByStepId[step.id] ??
                          ENV_DEFAULT_HOST[selectedEnvByCase[caseId] ?? 'SIT'] ??
                          ENV_DEFAULT_HOST.SIT
                        }
                        onChange={(e) =>
                          setRequestHostByStepId((prev) => ({ ...prev, [step.id]: e.target.value }))
                        }
                        placeholder="请输入 IP+端口"
                        style={{ width: 240 }}
                      />
                      <Input
                        value={requestUrlByStepId[step.id] ?? '/dcs/v1/protocol/upload'}
                        onChange={(e) =>
                          setRequestUrlByStepId((prev) => ({ ...prev, [step.id]: e.target.value }))
                        }
                        placeholder="请输入接口路径"
                      />
                    </div>
                    <Segmented
                      value={requestTabByStepId[step.id] ?? 'Params'}
                      onChange={(v) =>
                        setRequestTabByStepId((prev) => ({ ...prev, [step.id]: String(v) }))
                      }
                      options={[
                        { label: buildRequestTabLabel(step.id, 'Params'), value: 'Params' },
                        { label: buildRequestTabLabel(step.id, 'Headers'), value: 'Headers' },
                        { label: buildRequestTabLabel(step.id, 'Body'), value: 'Body' },
                        { label: buildRequestTabLabel(step.id, 'Cookies'), value: 'Cookies' },
                        { label: buildRequestTabLabel(step.id, '变量提取'), value: '变量提取' },
                        { label: buildRequestTabLabel(step.id, '断言'), value: '断言' },
                      ]}
                      style={{ marginBottom: 10 }}
                    />
                    {(requestTabByStepId[step.id] ?? 'Params') === 'Params' ? (
                      <div>
                        <Text type="secondary">Path 参数</Text>
                        <Table
                          size="small"
                          pagination={false}
                          style={{ marginTop: 8, marginBottom: 10 }}
                          rowKey="id"
                          columns={[
                            {
                              title: '参数名',
                              dataIndex: 'name',
                              render: (_, row: RequestParamRow) => <Text>{row.name}</Text>,
                            },
                            {
                              title: '参数值',
                              dataIndex: 'value',
                              render: (_, row: RequestParamRow) => (
                                <DynamicValueInput
                                  value={row.value}
                                  onChange={(e) => updateRequestParamRow(step.id, row.id, 'value', e.target.value, 'path')}
                                  placeholder={
                                    row.name === 'server_ip'
                                      ? '默认为环境的服务器地址'
                                      : row.name === 'server_port'
                                        ? '默认为环境的服务器端口'
                                        : '请输入参数值'
                                  }
                                />
                              ),
                            },
                            {
                              title: '是否必填',
                              dataIndex: 'required',
                              width: 120,
                              render: (_, row: RequestParamRow) => <Text>{row.required ?? '否'}</Text>,
                            },
                            {
                              title: '说明',
                              dataIndex: 'desc',
                              render: (_, row: RequestParamRow) => (
                                <Input
                                  value={row.desc}
                                  onChange={(e) => updateRequestParamRow(step.id, row.id, 'desc', e.target.value, 'path')}
                                  placeholder="请输入说明"
                                />
                              ),
                            },
                          ]}
                          dataSource={getPathParams(step.id)}
                        />
                        <Text type="secondary">Query 参数</Text>
                        <Table
                          size="small"
                          pagination={false}
                          style={{ marginTop: 8 }}
                          rowKey="id"
                          columns={[
                            {
                              title: '参数名',
                              dataIndex: 'name',
                              render: (_, row: RequestParamRow) =>
                                row.id === '__query_draft__' ? (
                                  <Text type="secondary">请输入参数名</Text>
                                ) : editingQueryRowByStepId[step.id] === row.id ? (
                                  <Input
                                    value={row.name}
                                    onChange={(e) => updateRequestParamRow(step.id, row.id, 'name', e.target.value, 'query')}
                                    placeholder="请输入参数名"
                                  />
                                ) : (
                                  <Text>{row.name || '-'}</Text>
                                ),
                            },
                            {
                              title: '参数值',
                              dataIndex: 'value',
                              render: (_, row: RequestParamRow) =>
                                row.id === '__query_draft__' ? (
                                  <Text type="secondary">请输入参数值</Text>
                                ) : editingQueryRowByStepId[step.id] === row.id ? (
                                  <DynamicValueInput
                                    value={row.value}
                                    onChange={(e) => updateRequestParamRow(step.id, row.id, 'value', e.target.value, 'query')}
                                    placeholder="请输入参数值"
                                  />
                                ) : (
                                  <Text>{row.value || '-'}</Text>
                                ),
                            },
                            {
                              title: '说明',
                              dataIndex: 'desc',
                              render: (_, row: RequestParamRow) =>
                                row.id === '__query_draft__' ? (
                                  <Text type="secondary">请输入说明</Text>
                                ) : editingQueryRowByStepId[step.id] === row.id ? (
                                  <Input
                                    value={row.desc}
                                    onChange={(e) => updateRequestParamRow(step.id, row.id, 'desc', e.target.value, 'query')}
                                    placeholder="请输入说明"
                                  />
                                ) : (
                                  <Text>{row.desc || '-'}</Text>
                                ),
                            },
                            {
                              title: '操作',
                              dataIndex: 'op',
                              width: 80,
                              render: (_, row: RequestParamRow) => (
                                row.id === '__query_draft__' ? null : (
                                  <Button
                                    type="link"
                                    size="small"
                                    danger
                                  onClick={() =>
                                    confirmDeleteRequestParamRow(step.id, row.id, 'query', row.name)
                                  }
                                  >
                                    删除
                                  </Button>
                                )
                              ),
                            },
                          ]}
                          onRow={(row) => ({
                            onDoubleClick: () => {
                              if (row.id === '__query_draft__') {
                                addQueryRowAndEdit(step.id);
                                return;
                              }
                              setEditingQueryRowByStepId((prev) => ({ ...prev, [step.id]: row.id }));
                            },
                          })}
                          dataSource={getQueryRowsForView(step.id)}
                        />
                      </div>
                    ) : null}
                    {(requestTabByStepId[step.id] ?? 'Params') === 'Headers' ? (
                      <div
                        ref={headersPanelRef}
                        onMouseDownCapture={(e) => {
                          const target = e.target as HTMLElement | null;
                          if (target?.closest('.headers-editing-row')) return;
                          setEditingHeaderRowByStepId((prev) => ({ ...prev, [step.id]: '' }));
                        }}
                      >
                        <Table
                          size="small"
                          pagination={false}
                          rowKey="id"
                          rowClassName={(row: RequestParamRow) =>
                            editingHeaderRowByStepId[step.id] === row.id ? 'headers-editing-row' : ''
                          }
                          columns={[
                          {
                            title: '参数名',
                            dataIndex: 'name',
                            render: (_, row: RequestParamRow) =>
                              row.id === '__header_draft__' ? (
                                <Text type="secondary">请输入参数名</Text>
                              ) : editingHeaderRowByStepId[step.id] === row.id ? (
                                <Input
                                  value={row.name}
                                  onChange={(e) => updateHeaderRow(step.id, row.id, 'name', e.target.value)}
                                  placeholder="请输入参数名"
                                />
                              ) : (
                                <Text>{row.name || '-'}</Text>
                              ),
                          },
                          {
                            title: '参数值',
                            dataIndex: 'value',
                            render: (_, row: RequestParamRow) =>
                              row.id === '__header_draft__' ? (
                                <Text type="secondary">请输入参数值</Text>
                              ) : editingHeaderRowByStepId[step.id] === row.id ? (
                                <DynamicValueInput
                                  value={row.value}
                                  onChange={(e) => updateHeaderRow(step.id, row.id, 'value', e.target.value)}
                                  placeholder="请输入参数值"
                                />
                              ) : (
                                <Text>{row.value || '-'}</Text>
                              ),
                          },
                          {
                            title: '说明',
                            dataIndex: 'desc',
                            render: (_, row: RequestParamRow) =>
                              row.id === '__header_draft__' ? (
                                <Text type="secondary">请输入说明</Text>
                              ) : editingHeaderRowByStepId[step.id] === row.id ? (
                                <Input
                                  value={row.desc}
                                  onChange={(e) => updateHeaderRow(step.id, row.id, 'desc', e.target.value)}
                                  placeholder="请输入说明"
                                />
                              ) : (
                                <Text>{row.desc || '-'}</Text>
                              ),
                          },
                          {
                            title: '操作',
                            dataIndex: 'op',
                            width: 80,
                            render: (_, row: RequestParamRow) =>
                              row.id === '__header_draft__' ? null : (
                                <Button
                                  type="link"
                                  size="small"
                                  danger
                                  onClick={() => confirmDeleteHeaderRow(step.id, row.id, row.name)}
                                >
                                  删除
                                </Button>
                              ),
                          },
                          ]}
                          onRow={(row) => ({
                            onDoubleClick: () => {
                              if (row.id === '__header_draft__') {
                                addHeaderRowAndEdit(step.id);
                                return;
                              }
                              setEditingHeaderRowByStepId((prev) => ({ ...prev, [step.id]: row.id }));
                            },
                          })}
                          dataSource={getHeaderRowsForView(step.id)}
                        />
                      </div>
                    ) : null}
                    {(requestTabByStepId[step.id] ?? 'Params') === 'Body' ? (
                      <div>
                        <Segmented
                          value={getBodyMode(step.id)}
                          onChange={(v) => setBodyModeByStepId((prev) => ({ ...prev, [step.id]: v as BodyMode }))}
                          options={['none', 'form-data', 'x-www-form-urlencoded', 'json']}
                          style={{ marginBottom: 10 }}
                        />
                        {getBodyMode(step.id) === 'none' ? (
                          <Empty description="不发送请求体" style={{ margin: '28px 0' }} />
                        ) : null}
                        {getBodyMode(step.id) === 'json' ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              height: '100%',
                              minHeight: 0,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <Button
                                size="small"
                                style={{ width: 'auto', alignSelf: 'flex-start' }}
                                onClick={() => openBodyJsonDynamicValue(step.id)}
                              >
                                插入动态值
                              </Button>
                              <Button
                                size="small"
                                style={{ width: 'auto', alignSelf: 'flex-start' }}
                                onClick={() => formatBodyJson(step.id)}
                              >
                                格式化
                              </Button>
                              <div
                                ref={(el) => {
                                  bodyJsonDynamicHostRef.current[step.id] = el;
                                }}
                                style={{
                                  position: 'absolute',
                                  width: 1,
                                  height: 1,
                                  overflow: 'hidden',
                                  opacity: 0,
                                  pointerEvents: 'none',
                                }}
                              >
                                <DynamicValueInput
                                  value={bodyJsonByStepId[step.id] ?? '{}'}
                                  onChange={(e) =>
                                    setBodyJsonByStepId((prev) => ({ ...prev, [step.id]: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                            <Input.TextArea
                              rows={14}
                              value={bodyJsonByStepId[step.id] ?? '{}'}
                              status={bodyJsonErrorByStepId[step.id] ? 'error' : undefined}
                              onChange={(e) =>
                                setBodyJsonByStepId((prev) => ({ ...prev, [step.id]: e.target.value }))
                              }
                              style={{ flex: 1, minHeight: 260 }}
                            />
                            {bodyJsonErrorByStepId[step.id] ? (
                              <Text type="danger" style={{ marginTop: 6 }}>
                                {bodyJsonErrorByStepId[step.id]}
                              </Text>
                            ) : null}
                          </div>
                        ) : null}
                        {getBodyMode(step.id) === 'x-www-form-urlencoded' ? (
                          <Table
                            size="small"
                            pagination={false}
                            rowKey="id"
                            columns={[
                              {
                                title: '参数名',
                                dataIndex: 'name',
                                render: (_, row: BodyParamRow) =>
                                  row.id === '__body_url_draft__' ? (
                                    <Text type="secondary">添加</Text>
                                  ) : editingBodyUrlRowByStepId[step.id] === row.id ? (
                                    <Input
                                      value={row.name}
                                      onChange={(e) => updateBodyRow(step.id, row.id, 'name', e.target.value, 'url')}
                                      placeholder="请输入参数名"
                                    />
                                  ) : (
                                    <Text>{row.name || '-'}</Text>
                                  ),
                              },
                              {
                                title: '参数值',
                                dataIndex: 'value',
                                render: (_, row: BodyParamRow) =>
                                  row.id === '__body_url_draft__' ? (
                                    <Text type="secondary"> </Text>
                                  ) : editingBodyUrlRowByStepId[step.id] === row.id ? (
                                    <DynamicValueInput
                                      value={row.value}
                                      onChange={(e) => updateBodyRow(step.id, row.id, 'value', e.target.value, 'url')}
                                      placeholder="请输入参数值"
                                    />
                                  ) : (
                                    <Text>{row.value || '-'}</Text>
                                  ),
                              },
                              {
                                title: '说明',
                                dataIndex: 'desc',
                                render: (_, row: BodyParamRow) =>
                                  row.id === '__body_url_draft__' ? (
                                    <Text type="secondary"> </Text>
                                  ) : editingBodyUrlRowByStepId[step.id] === row.id ? (
                                    <Input
                                      value={row.desc}
                                      onChange={(e) => updateBodyRow(step.id, row.id, 'desc', e.target.value, 'url')}
                                      placeholder="请输入说明"
                                    />
                                  ) : (
                                    <Text>{row.desc || '-'}</Text>
                                  ),
                              },
                              {
                                title: '操作',
                                dataIndex: 'op',
                                width: 80,
                                render: (_, row: BodyParamRow) =>
                                  row.id === '__body_url_draft__' ? null : (
                                    <Button
                                      type="link"
                                      size="small"
                                      danger
                                      onClick={() => confirmDeleteBodyRow(step.id, row.id, 'url', row.name)}
                                    >
                                      删除
                                    </Button>
                                  ),
                              },
                            ]}
                            onRow={(row) => ({
                              onDoubleClick: () => {
                                if (row.id === '__body_url_draft__') {
                                  addBodyRowAndEdit(step.id, 'url');
                                  return;
                                }
                                setEditingBodyUrlRowByStepId((prev) => ({ ...prev, [step.id]: row.id }));
                              },
                            })}
                            dataSource={getBodyUrlRowsForView(step.id)}
                          />
                        ) : null}
                        {getBodyMode(step.id) === 'form-data' ? (
                          <Table
                            size="small"
                            pagination={false}
                            rowKey="id"
                            columns={[
                              {
                                title: '参数名',
                                dataIndex: 'name',
                                render: (_, row: BodyParamRow) =>
                                  row.id === '__body_form_draft__' ? (
                                    <Text type="secondary">添加</Text>
                                  ) : editingBodyFormRowByStepId[step.id] === row.id ? (
                                    <Input
                                      value={row.name}
                                      onChange={(e) => updateBodyRow(step.id, row.id, 'name', e.target.value, 'form')}
                                      placeholder="请输入参数名"
                                    />
                                  ) : (
                                    <Text>{row.name || '-'}</Text>
                                  ),
                              },
                              {
                                title: '参数类型',
                                dataIndex: 'paramType',
                                width: 120,
                                render: (_, row: BodyParamRow) =>
                                  row.id === '__body_form_draft__' ? null : editingBodyFormRowByStepId[step.id] === row.id ? (
                                    <Select
                                      value={row.paramType ?? 'string'}
                                      options={[
                                        { label: 'string', value: 'string' },
                                        { label: 'file', value: 'file' },
                                      ]}
                                      onChange={(v) => updateBodyRow(step.id, row.id, 'paramType', v, 'form')}
                                    />
                                  ) : (
                                    <Text>{row.paramType ?? 'string'}</Text>
                                  ),
                              },
                              {
                                title: '参数值',
                                dataIndex: 'value',
                                render: (_, row: BodyParamRow) =>
                                  row.id === '__body_form_draft__' ? null : editingBodyFormRowByStepId[step.id] === row.id ? (
                                    row.paramType === 'file' ? (
                                      <TreeSelect
                                        value={row.value || undefined}
                                        treeData={fileTreeSelectData}
                                        treeDefaultExpandAll
                                        showSearch
                                        allowClear
                                        style={{ width: '100%' }}
                                        placeholder="请选择文件"
                                        onChange={(v) =>
                                          updateBodyRow(step.id, row.id, 'value', String(v ?? ''), 'form')
                                        }
                                        treeNodeFilterProp="title"
                                      />
                                    ) : (
                                      <DynamicValueInput
                                        value={row.value}
                                        onChange={(e) => updateBodyRow(step.id, row.id, 'value', e.target.value, 'form')}
                                        placeholder="请输入参数值"
                                      />
                                    )
                                  ) : (
                                    <Text>{row.value || '-'}</Text>
                                  ),
                              },
                              {
                                title: '说明',
                                dataIndex: 'desc',
                                render: (_, row: BodyParamRow) =>
                                  row.id === '__body_form_draft__' ? null : editingBodyFormRowByStepId[step.id] === row.id ? (
                                    <Input
                                      value={row.desc}
                                      onChange={(e) => updateBodyRow(step.id, row.id, 'desc', e.target.value, 'form')}
                                      placeholder="请输入说明"
                                    />
                                  ) : (
                                    <Text>{row.desc || '-'}</Text>
                                  ),
                              },
                              {
                                title: '操作',
                                dataIndex: 'op',
                                width: 80,
                                render: (_, row: BodyParamRow) =>
                                  row.id === '__body_form_draft__' ? null : (
                                    <Button
                                      type="link"
                                      size="small"
                                      danger
                                      onClick={() => confirmDeleteBodyRow(step.id, row.id, 'form', row.name)}
                                    >
                                      删除
                                    </Button>
                                  ),
                              },
                            ]}
                            onRow={(row) => ({
                              onDoubleClick: () => {
                                if (row.id === '__body_form_draft__') {
                                  addBodyRowAndEdit(step.id, 'form');
                                  return;
                                }
                                setEditingBodyFormRowByStepId((prev) => ({ ...prev, [step.id]: row.id }));
                              },
                            })}
                            dataSource={getBodyFormRowsForView(step.id)}
                          />
                        ) : null}
                      </div>
                    ) : null}
                    {(requestTabByStepId[step.id] ?? 'Params') === 'Cookies' ? (
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        columns={[
                          { title: '参数名', dataIndex: 'name' },
                          { title: '参数值', dataIndex: 'value' },
                          { title: '说明', dataIndex: 'desc' },
                          { title: '操作', dataIndex: 'op', width: 80 },
                        ]}
                        dataSource={[{ id: 'cookie-add', name: '添加', value: '', desc: '', op: '' }]}
                      />
                    ) : null}
                    {(requestTabByStepId[step.id] ?? 'Params') === '变量提取' ? (
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        onRow={(row: ExtractRow) => ({
                          onDoubleClick: () => {
                            if (row.id === '__extract_draft__') {
                              addExtractRowAndEdit(step.id);
                              return;
                            }
                            setEditingExtractRowByStepId((prev) => ({ ...prev, [step.id]: row.id }));
                          },
                        })}
                        dataSource={getExtractRowsForView(step.id)}
                        columns={[
                          {
                            title: '变量名',
                            dataIndex: 'name',
                            render: (_, row: ExtractRow) =>
                              row.id === '__extract_draft__' ? (
                                <Text type="secondary">添加</Text>
                              ) : editingExtractRowByStepId[step.id] === row.id ? (
                                <div>
                                  <Input
                                    value={row.name}
                                    status={row.name.trim() ? undefined : 'error'}
                                    onChange={(e) => updateExtractRow(step.id, row.id, 'name', e.target.value)}
                                    placeholder="请输入变量名（必填）"
                                  />
                                </div>
                              ) : (
                                row.name.trim() ? <Text>{row.name}</Text> : <Text>-</Text>
                              ),
                          },
                          {
                            title: '变量说明',
                            dataIndex: 'desc',
                            render: (_, row: ExtractRow) =>
                              row.id === '__extract_draft__' ? null : editingExtractRowByStepId[step.id] === row.id ? (
                                <Input
                                  value={row.desc}
                                  onChange={(e) => updateExtractRow(step.id, row.id, 'desc', e.target.value)}
                                  placeholder="请输入变量说明（非必填）"
                                />
                              ) : (
                                <Text>{row.desc || '-'}</Text>
                              ),
                          },
                          {
                            title: '变量类型',
                            dataIndex: 'variableType',
                            render: (_, row: ExtractRow) =>
                              row.id === '__extract_draft__' ? null : editingExtractRowByStepId[step.id] === row.id ? (
                                <Select
                                  value={row.variableType || undefined}
                                  placeholder="请选择"
                                  options={[
                                    { label: '全局变量', value: '全局变量' },
                                    { label: '临时变量', value: '临时变量' },
                                  ]}
                                  onChange={(v) => updateExtractRow(step.id, row.id, 'variableType', String(v))}
                                />
                              ) : (
                                <Text>{row.variableType || '-'}</Text>
                              ),
                          },
                          {
                            title: '值类型',
                            dataIndex: 'valueType',
                            render: (_, row: ExtractRow) =>
                              row.id === '__extract_draft__' ? null : editingExtractRowByStepId[step.id] === row.id ? (
                                <Select
                                  value={row.valueType || undefined}
                                  placeholder="请选择"
                                  options={[
                                    { label: '默认', value: '默认' },
                                    { label: '字符串', value: '字符串' },
                                    { label: '整型', value: '整型' },
                                    { label: '浮点型', value: '浮点型' },
                                    { label: '布尔型', value: '布尔型' },
                                  ]}
                                  onChange={(v) => updateExtractRow(step.id, row.id, 'valueType', String(v))}
                                />
                              ) : (
                                <Text>{row.valueType || '-'}</Text>
                              ),
                          },
                          {
                            title: '提取来源',
                            dataIndex: 'source',
                            render: (_, row: ExtractRow) =>
                              row.id === '__extract_draft__' ? null : editingExtractRowByStepId[step.id] === row.id ? (
                                <Select
                                  value={row.source || undefined}
                                  placeholder="请选择"
                                  options={[
                                    { label: '响应体', value: '响应体' },
                                    { label: '响应头', value: '响应头' },
                                    { label: '请求头', value: '请求头' },
                                    { label: '请求体', value: '请求体' },
                                    { label: '请求参数', value: '请求参数' },
                                  ]}
                                  onChange={(v) => updateExtractRow(step.id, row.id, 'source', String(v))}
                                />
                              ) : (
                                <Text>{row.source || '-'}</Text>
                              ),
                          },
                          {
                            title: '提取表达式',
                            dataIndex: 'expr',
                            width: 220,
                            render: (_, row: ExtractRow) =>
                              row.id === '__extract_draft__' ? null : editingExtractRowByStepId[step.id] === row.id ? (
                                <Input
                                  value={row.expr}
                                  onChange={(e) => updateExtractRow(step.id, row.id, 'expr', e.target.value)}
                                  placeholder="请输入jmespath表达式"
                                />
                              ) : (
                                <Text>{row.expr || '-'}</Text>
                              ),
                          },
                          {
                            title: '操作',
                            dataIndex: 'op',
                            width: 80,
                            render: (_, row: ExtractRow) =>
                              row.id === '__extract_draft__' ? null : (
                                <Button
                                  type="link"
                                  size="small"
                                  danger
                                  onClick={() => confirmDeleteExtractRow(step.id, row.id, row.name)}
                                >
                                  删除
                                </Button>
                              ),
                          },
                        ]}
                      />
                    ) : null}
                    {(requestTabByStepId[step.id] ?? 'Params') === '断言' ? (
                      <div
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 120px 1fr 140px 80px 1fr 30px',
                            gap: 8,
                            alignItems: 'center',
                            marginBottom: 8,
                            color: '#262626',
                            fontWeight: 500,
                          }}
                        >
                          <span>断言描述:</span>
                          <span>提取来源:</span>
                          <span>断言对象:</span>
                          <span>断言逻辑:</span>
                          <span>取反:</span>
                          <span>预期结果:</span>
                          <span />
                        </div>
                        {getAssertRows(step.id).map((row) => (
                          <div
                            key={row.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 120px 1fr 140px 80px 1fr 30px',
                              gap: 8,
                              alignItems: 'center',
                              marginBottom: 8,
                            }}
                          >
                            <Input
                              placeholder="断言描述"
                              value={row.desc}
                              onChange={(e) => updateAssertRow(step.id, row.id, { desc: e.target.value })}
                            />
                            <Select
                              value={row.source}
                              onChange={(v) => updateAssertRow(step.id, row.id, { source: v })}
                              options={[
                                { label: '响应体', value: '响应体' },
                                { label: '响应头', value: '响应头' },
                                { label: '请求头', value: '请求头' },
                                { label: '请求体', value: '请求体' },
                                { label: '请求参数', value: '请求参数' },
                                { label: '响应状态码', value: '响应状态码' },
                                { label: '接口耗时(ms)', value: '接口耗时(ms)' },
                              ]}
                            />
                            <Input
                              placeholder="断言对象"
                              value={row.target}
                              onChange={(e) => updateAssertRow(step.id, row.id, { target: e.target.value })}
                            />
                            <Select
                              value={row.op}
                              onChange={(v) => updateAssertRow(step.id, row.id, { op: v })}
                              showSearch
                              optionFilterProp="label"
                              filterOption={(input, option) =>
                                String(option?.label ?? '')
                                  .toLowerCase()
                                  .includes(input.trim().toLowerCase())
                              }
                              options={[
                                '等于',
                                '不等于',
                                '列表包含',
                                '包含键',
                                '包含值',
                                '包含键值对',
                                '列表不为空',
                                '大于',
                                '小于',
                                '大于等于',
                                '小于等于',
                                '长度等于',
                              ].map((x) => ({ label: x, value: x }))}
                            />
                            <Checkbox
                              checked={row.negate}
                              onChange={(e) => updateAssertRow(step.id, row.id, { negate: e.target.checked })}
                            >
                              取反
                            </Checkbox>
                            <Input
                              placeholder="预期结果"
                              value={row.expected}
                              onChange={(e) => updateAssertRow(step.id, row.id, { expected: e.target.value })}
                            />
                            <Button type="text" danger onClick={() => confirmDeleteAssertRow(step.id, row.id)}>
                              ×
                            </Button>
                          </div>
                        ))}
                        <Space size={16} style={{ marginTop: 4 }}>
                          <Button type="link" style={{ paddingInline: 0 }} onClick={() => addAssertRow(step.id)}>
                            + 点击添加
                          </Button>
                          <Button type="link" style={{ paddingInline: 0 }} onClick={() => openCopyAssertToDialog(caseId, step.id)}>
                            复制到
                          </Button>
                        </Space>
                      </div>
                    ) : null}
                  </div>
                ) : stepType === '调用函数' ? (
                  <div>
                    <Segmented
                      value={funcTabByStepId[step.id] ?? '函数调用'}
                      onChange={(v) => setFuncTabByStepId((prev) => ({ ...prev, [step.id]: String(v) }))}
                      options={[
                        { label: `函数调用 ${getFuncTabCount(step.id, '函数调用')}`, value: '函数调用' },
                        { label: `变量提取 ${getFuncTabCount(step.id, '变量提取')}`, value: '变量提取' },
                        { label: `断言 ${getFuncTabCount(step.id, '断言')}`, value: '断言' },
                      ]}
                      style={{ marginBottom: 10 }}
                    />
                    {(funcTabByStepId[step.id] ?? '函数调用') === '函数调用' ? (
                      <div>
                        {getFunctionCalls(step.id).map((row, idx) => (
                          <div
                            key={row.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '24px 120px 1fr 40px 30px',
                              gap: 8,
                              alignItems: 'center',
                              marginBottom: 8,
                              border: '1px solid #f0f0f0',
                              borderRadius: 6,
                              padding: 8,
                            }}
                          >
                            <HolderOutlined style={{ color: '#bfbfbf' }} />
                            <Button onClick={() => openChooseFunctionModal(step.id, row.id)}>选择函数</Button>
                            <Input
                              value={row.args}
                              placeholder="请输入"
                              onChange={(e) => updateFunctionCall(step.id, row.id, { args: e.target.value })}
                            />
                            <Text>#{idx + 1}</Text>
                            <Button type="text" danger onClick={() => confirmDeleteFunctionCall(step.id, row.id)}>
                              <DeleteOutlined />
                            </Button>
                          </div>
                        ))}
                        <Button
                          block
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => addFunctionCall(step.id)}
                        >
                          添加函数
                        </Button>
                      </div>
                    ) : null}
                    {(funcTabByStepId[step.id] ?? '函数调用') === '变量提取' ? (
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        onRow={(row: FunctionExtractRow) => ({
                          onDoubleClick: () => {
                            if (row.id === '__func_extract_draft__') {
                              addFunctionExtractRow(step.id);
                              return;
                            }
                            setEditingFunctionExtractRowByStepId((prev) => ({ ...prev, [step.id]: row.id }));
                          },
                        })}
                        dataSource={getFunctionExtractRowsForView(step.id)}
                        columns={[
                          {
                            title: '变量名',
                            dataIndex: 'name',
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__func_extract_draft__' ? (
                                <Text type="secondary">添加</Text>
                              ) : editingFunctionExtractRowByStepId[step.id] === row.id ? (
                                <Input
                                  value={row.name}
                                  onChange={(e) => updateFunctionExtractRow(step.id, row.id, { name: e.target.value })}
                                />
                              ) : (
                                <Text>{row.name || '-'}</Text>
                              ),
                          },
                          {
                            title: '变量类型',
                            dataIndex: 'variableType',
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__func_extract_draft__' ? null : (
                                <Select
                                  value={row.variableType || undefined}
                                  options={[
                                    { label: '全局变量', value: '全局变量' },
                                    { label: '临时变量', value: '临时变量' },
                                  ]}
                                  onChange={(v) => updateFunctionExtractRow(step.id, row.id, { variableType: String(v) as any })}
                                />
                              ),
                          },
                          {
                            title: '值类型',
                            dataIndex: 'valueType',
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__func_extract_draft__' ? null : (
                                <Select
                                  value={row.valueType || undefined}
                                  options={['默认', '字符串', '整型', '浮点型', '布尔型'].map((x) => ({ label: x, value: x }))}
                                  onChange={(v) => updateFunctionExtractRow(step.id, row.id, { valueType: String(v) as any })}
                                />
                              ),
                          },
                          {
                            title: '提取来源',
                            dataIndex: 'source',
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__func_extract_draft__' ? null : (
                                <Select
                                  value={row.source || undefined}
                                  options={getFunctionSourceOptions(step.id)}
                                  onChange={(v) => updateFunctionExtractRow(step.id, row.id, { source: String(v) })}
                                />
                              ),
                          },
                          {
                            title: '提取表达式',
                            dataIndex: 'expr',
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__func_extract_draft__' ? null : (
                                <Input
                                  value={row.expr}
                                  placeholder="示例: data.name"
                                  onChange={(e) => updateFunctionExtractRow(step.id, row.id, { expr: e.target.value })}
                                />
                              ),
                          },
                          {
                            title: '操作',
                            dataIndex: 'op',
                            width: 70,
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__func_extract_draft__' ? null : (
                                <Button
                                  type="text"
                                  danger
                                  onClick={() => deleteFunctionExtractRow(step.id, row.id)}
                                >
                                  <DeleteOutlined />
                                </Button>
                              ),
                          },
                        ]}
                      />
                    ) : null}
                    {(funcTabByStepId[step.id] ?? '函数调用') === '断言' ? (
                      <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 110px 1fr 120px 80px 1fr 30px',
                            gap: 8,
                            alignItems: 'center',
                            marginBottom: 8,
                            color: '#262626',
                            fontWeight: 500,
                          }}
                        >
                          <span>断言描述:</span>
                          <span>提取来源:</span>
                          <span>断言对象:</span>
                          <span>断言逻辑:</span>
                          <span>取反:</span>
                          <span>预期结果:</span>
                          <span />
                        </div>
                        {getFunctionAssertRows(step.id).map((row) => (
                          <div
                            key={row.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 110px 1fr 120px 80px 1fr 30px',
                              gap: 8,
                              alignItems: 'center',
                              marginBottom: 8,
                            }}
                          >
                            <Input
                              placeholder="请输入"
                              value={row.desc}
                              onChange={(e) => updateFunctionAssertRow(step.id, row.id, { desc: e.target.value })}
                            />
                            <Select
                              value={row.source}
                              options={getFunctionSourceOptions(step.id)}
                              onChange={(v) => updateFunctionAssertRow(step.id, row.id, { source: String(v) })}
                            />
                            <Input
                              placeholder="示例: data.name"
                              value={row.target}
                              onChange={(e) => updateFunctionAssertRow(step.id, row.id, { target: e.target.value })}
                            />
                            <Select
                              value={row.op}
                              onChange={(v) => updateFunctionAssertRow(step.id, row.id, { op: v as any })}
                              showSearch
                              optionFilterProp="label"
                              filterOption={(input, option) =>
                                String(option?.label ?? '')
                                  .toLowerCase()
                                  .includes(input.trim().toLowerCase())
                              }
                              options={[
                                '等于',
                                '不等于',
                                '列表包含',
                                '包含键',
                                '包含值',
                                '包含键值对',
                                '列表不为空',
                                '大于',
                                '小于',
                                '大于等于',
                                '小于等于',
                                '长度等于',
                              ].map((x) => ({ label: x, value: x }))}
                            />
                            <Checkbox
                              checked={row.negate}
                              onChange={(e) => updateFunctionAssertRow(step.id, row.id, { negate: e.target.checked })}
                            >
                              取反
                            </Checkbox>
                            <Input
                              placeholder="请输入"
                              value={row.expected}
                              onChange={(e) => updateFunctionAssertRow(step.id, row.id, { expected: e.target.value })}
                            />
                            <Button type="text" danger onClick={() => confirmDeleteFunctionAssertRow(step.id, row.id)}>
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button type="link" style={{ paddingInline: 0 }} onClick={() => addFunctionAssertRow(step.id)}>
                          + 点击添加
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : stepType === '数据库操作' ? (
                  <div>
                    <Segmented
                      value={dbTabByStepId[step.id] ?? 'SQL命令'}
                      onChange={(v) =>
                        setDbTabByStepId((prev) => ({
                          ...prev,
                          [step.id]: v as 'SQL命令' | '变量提取' | '断言',
                        }))
                      }
                      options={['SQL命令', '变量提取', '断言']}
                      style={{ marginBottom: 10 }}
                    />
                    {(dbTabByStepId[step.id] ?? 'SQL命令') === 'SQL命令' ? (
                      <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 10 }}>
                        <div style={{ marginBottom: 8 }}>
                          <Text type="secondary">数据库类型：{dbTypeByStepId[step.id] ?? 'MariaDb'}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text>* SQL命令：</Text>
                          <Button size="small">插入动态值</Button>
                        </div>
                        <Input.TextArea
                          rows={10}
                          value={dbSqlByStepId[step.id] ?? ''}
                          onChange={(e) => setDbSqlByStepId((prev) => ({ ...prev, [step.id]: e.target.value }))}
                          placeholder="请输入SQL语句..."
                        />
                      </div>
                    ) : null}
                    {(dbTabByStepId[step.id] ?? 'SQL命令') === '变量提取' ? (
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        onRow={(row: FunctionExtractRow) => ({
                          onDoubleClick: () => {
                            if (row.id === '__db_extract_draft__') {
                              addDbExtractRow(step.id);
                              return;
                            }
                            setEditingDbExtractRowByStepId((prev) => ({ ...prev, [step.id]: row.id }));
                          },
                        })}
                        dataSource={getDbExtractRowsForView(step.id)}
                        columns={[
                          {
                            title: '变量名',
                            dataIndex: 'name',
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__db_extract_draft__' ? (
                                <Text type="secondary">添加</Text>
                              ) : editingDbExtractRowByStepId[step.id] === row.id ? (
                                <Input value={row.name} onChange={(e) => updateDbExtractRow(step.id, row.id, { name: e.target.value })} />
                              ) : (
                                <Text>{row.name || '-'}</Text>
                              ),
                          },
                          {
                            title: '变量类型',
                            dataIndex: 'variableType',
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__db_extract_draft__' ? null : (
                                <Select
                                  value={row.variableType || undefined}
                                  options={[
                                    { label: '全局变量', value: '全局变量' },
                                    { label: '临时变量', value: '临时变量' },
                                  ]}
                                  onChange={(v) => updateDbExtractRow(step.id, row.id, { variableType: String(v) as any })}
                                />
                              ),
                          },
                          {
                            title: '值类型',
                            dataIndex: 'valueType',
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__db_extract_draft__' ? null : (
                                <Select
                                  value={row.valueType || undefined}
                                  options={['默认', '字符串', '整型', '浮点型', '布尔型'].map((x) => ({ label: x, value: x }))}
                                  onChange={(v) => updateDbExtractRow(step.id, row.id, { valueType: String(v) as any })}
                                />
                              ),
                          },
                          {
                            title: '提取表达式',
                            dataIndex: 'expr',
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__db_extract_draft__' ? null : (
                                <Input
                                  value={row.expr}
                                  placeholder="请输入jmespath表达式"
                                  onChange={(e) => updateDbExtractRow(step.id, row.id, { expr: e.target.value })}
                                />
                              ),
                          },
                          {
                            title: '操作',
                            dataIndex: 'op',
                            width: 70,
                            render: (_, row: FunctionExtractRow) =>
                              row.id === '__db_extract_draft__' ? null : (
                                <Button type="text" danger onClick={() => confirmDeleteDbExtractRow(step.id, row.id)}>
                                  <DeleteOutlined />
                                </Button>
                              ),
                          },
                        ]}
                      />
                    ) : null}
                    {(dbTabByStepId[step.id] ?? 'SQL命令') === '断言' ? (
                      <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 110px 1fr 120px 80px 1fr 30px',
                            gap: 8,
                            alignItems: 'center',
                            marginBottom: 8,
                            color: '#262626',
                            fontWeight: 500,
                          }}
                        >
                          <span>断言描述:</span>
                          <span>提取来源:</span>
                          <span>断言对象:</span>
                          <span>断言逻辑:</span>
                          <span>取反:</span>
                          <span>预期结果:</span>
                          <span />
                        </div>
                        {getDbAssertRows(step.id).map((row) => (
                          <div
                            key={row.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 110px 1fr 120px 80px 1fr 30px',
                              gap: 8,
                              alignItems: 'center',
                              marginBottom: 8,
                            }}
                          >
                            <Input
                              placeholder="请输入"
                              value={row.desc}
                              onChange={(e) => updateDbAssertRow(step.id, row.id, { desc: e.target.value })}
                            />
                            <Select
                              value={row.source}
                              options={[{ label: 'SQL查询', value: 'SQL查询' }]}
                              onChange={(v) => updateDbAssertRow(step.id, row.id, { source: String(v) })}
                            />
                            <Input
                              placeholder="示例: data.name"
                              value={row.target}
                              onChange={(e) => updateDbAssertRow(step.id, row.id, { target: e.target.value })}
                            />
                            <Select
                              value={row.op}
                              onChange={(v) => updateDbAssertRow(step.id, row.id, { op: v as any })}
                              showSearch
                              optionFilterProp="label"
                              filterOption={(input, option) =>
                                String(option?.label ?? '')
                                  .toLowerCase()
                                  .includes(input.trim().toLowerCase())
                              }
                              options={[
                                '等于',
                                '不等于',
                                '列表包含',
                                '包含键',
                                '包含值',
                                '包含键值对',
                                '列表不为空',
                                '大于',
                                '小于',
                                '大于等于',
                                '小于等于',
                                '长度等于',
                              ].map((x) => ({ label: x, value: x }))}
                            />
                            <Checkbox
                              checked={row.negate}
                              onChange={(e) => updateDbAssertRow(step.id, row.id, { negate: e.target.checked })}
                            >
                              取反
                            </Checkbox>
                            <Input
                              placeholder="请输入"
                              value={row.expected}
                              onChange={(e) => updateDbAssertRow(step.id, row.id, { expected: e.target.value })}
                            />
                            <Button type="text" danger onClick={() => confirmDeleteDbAssertRow(step.id, row.id)}>
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button type="link" style={{ paddingInline: 0 }} onClick={() => addDbAssertRow(step.id)}>
                          + 点击添加
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : stepType === '等待' ? (
                  <div
                    style={{
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      maxWidth: 360,
                    }}
                  >
                    <Text>*等待时间：</Text>
                    <InputNumber
                      min={0}
                      precision={0}
                      style={{ width: 90 }}
                      value={waitSecondsByStepId[step.id] ?? 1}
                      onChange={(v) => {
                        const sec = Number(v ?? 0);
                        setWaitSecondsByStepId((prev) => ({ ...prev, [step.id]: sec }));
                        setSteps((prev) =>
                          prev.map((s) => (s.id === step.id ? { ...s, detail: `等待 ${sec} 秒` } : s))
                        );
                      }}
                    />
                    <Text>秒</Text>
                  </div>
                ) : (
                  <Input.TextArea
                    rows={10}
                    value={step.detail}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSteps((prev) =>
                        prev.map((s) => (s.id === step.id ? { ...s, detail: v } : s))
                      );
                    }}
                    placeholder={`${stepType}步骤详情（待实现）`}
                  />
                )}
              </>
            ) : (
              <Empty description="暂无步骤" />
            )}
          </Card>
        </div>
      </div>
    );
  };

  const toggleCasesEnabled = (enabled: boolean) => {
    if (selectedCaseIds.length === 0) return;
    setCaseEnabledMap((prev) => {
      const next = { ...prev };
      selectedCaseIds.forEach((id) => {
        next[id] = enabled;
      });
      return next;
    });
    message.success(enabled ? '已批量启用' : '已批量禁用');
  };

  const moduleOptions = modules
    .filter((m) => m.versionId === versionId)
    .map((m) => ({ label: m.name, value: m.id }));
  const sceneTreeData: DataNode[] = [
    {
      key: 'scene-root',
      title: 'root',
      children: [
        { key: 'scene-接入-用户登录', title: '接入-用户登录', isLeaf: true },
        { key: 'scene-接入-订单创建', title: '接入-订单创建', isLeaf: true },
        { key: 'scene-支付-下单', title: '支付-下单', isLeaf: true },
      ],
    },
  ];

  const toolbar = (
    <Space>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        disabled={!selectedModuleId}
        onClick={() => selectedModuleId && openAddCase(selectedModuleId)}
      >
        添加测试用例
      </Button>
      <Button
        icon={<DeleteOutlined />}
        disabled={selectedCaseIds.length === 0}
        onClick={() =>
          Modal.confirm({
            title: '确认批量删除选中用例吗？',
            content: `当前选中 ${selectedCaseIds.length} 条用例，删除后不可恢复。`,
            okText: '删除',
            okButtonProps: { danger: true },
            cancelText: '取消',
            onOk: () => message.info(`批量删除 ${selectedCaseIds.length} 条（待接后端）`),
          })
        }
      >
        删除
      </Button>
      <Button
        icon={<SwapOutlined />}
        disabled={selectedCaseIds.length === 0}
        onClick={() => message.info(`批量移动 ${selectedCaseIds.length} 条（待接后端）`)}
      >
        移动到
      </Button>
      <Button
        icon={<CheckCircleOutlined />}
        disabled={selectedCaseIds.length === 0}
        onClick={() => toggleCasesEnabled(true)}
      >
        启用
      </Button>
      <Button
        icon={<StopOutlined />}
        disabled={selectedCaseIds.length === 0}
        onClick={() => toggleCasesEnabled(false)}
      >
        禁用
      </Button>
      <Button
        icon={<CheckCircleOutlined />}
        disabled={selectedCaseIds.length === 0}
        onClick={() => message.success(`已触发 ${selectedCaseIds.length} 条用例调试运行（Mock）`)}
      >
        调试运行
      </Button>
    </Space>
  );

  return (
    <div
      ref={splitRef}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: 'calc(100vh - 140px)',
        minHeight: 560,
      }}
    >
      <style>
        {`
          .case-tree-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            min-width: 0;
            gap: 6px;
          }
          .case-tree-row .case-tree-row-action {
            opacity: 0;
            pointer-events: none;
            transition: opacity .15s ease;
          }
          .case-tree-row:hover .case-tree-row-action {
            opacity: 1;
            pointer-events: auto;
          }
          .case-tree-row.is-disabled {
            opacity: 0.45;
          }
          .case-step-row .case-step-row-action {
            opacity: 0;
            pointer-events: none;
            transition: opacity .15s ease;
          }
          .case-step-row:hover .case-step-row-action {
            opacity: 1;
            pointer-events: auto;
          }
          .case-detail-tabs,
          .case-detail-tabs .ant-tabs-content,
          .case-detail-tabs .ant-tabs-tabpane {
            height: 100%;
          }
          .case-detail-tabs {
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
          .case-detail-tabs .ant-tabs-nav {
            flex: 0 0 auto;
            margin-bottom: 0;
          }
          .case-detail-tabs .ant-tabs-content-holder {
            flex: 1;
            min-height: 0;
          }
          .case-detail-tabs .ant-tabs-content {
            height: 100%;
            min-height: 0;
          }
          .case-detail-tabs .ant-tabs-tabpane {
            height: 100%;
            min-height: 0;
          }
          .case-detail-pane {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
          }
          .case-detail-main-grid {
            display: grid;
            flex: 1;
            min-height: 0;
          }
        `}
      </style>
      <Card
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>{versionTitle}</span>
          </Space>
        }
        size="small"
        styles={{ body: { padding: 12, minHeight: 560 } }}
        style={{ flex: `0 0 ${leftPaneWidth}%`, minWidth: 340 }}
      >
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, width: 'fit-content' }}>
          <Input
            allowClear
            placeholder="搜索目录/用例"
            value={treeKeyword}
            onChange={(e) => setTreeKeyword(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 280, maxWidth: 280, minWidth: 280 }}
          />
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'add-case', label: '添加测试用例', icon: <PlusOutlined /> },
                { key: 'add-dir', label: '添加目录', icon: <PlusOutlined /> },
                { key: 'export-case', label: '导出测试用例', icon: <ExportOutlined /> },
              ],
              onClick: ({ key }) => onTopAddMenuClick(String(key)),
            }}
          >
            <Button type="primary" icon={<PlusOutlined />} />
          </Dropdown>
        </div>
        {filteredTreeData.length ? (
          <Tree
            showLine
            draggable={{
              icon: false,
              nodeDraggable: (node) => {
                const parsed = parseTreeKey(String(node.key));
                return !!(
                  parsed &&
                  parsed.kind === 'module' &&
                  !isRootModule(parsed.id) &&
                  dragReadyModuleId === parsed.id
                );
              },
            }}
            expandedKeys={expandedKeys}
            selectedKeys={selectedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
            onSelect={onTreeSelect}
            onDrop={onTreeDrop}
            onDragEnter={(info) => setDragOverKey(String(info.node.key))}
            onDragEnd={() => {
              setDragReadyModuleId(null);
              setDragOverKey(null);
              clearDragPressTimer();
            }}
            treeData={filteredTreeData}
            titleRender={titleRender}
          />
        ) : (
          <Empty description={treeKeyword ? '未找到匹配结果' : '暂无目录'}>
            <Button type="primary" onClick={() => openAddSub(null)}>
              新建根目录
            </Button>
          </Empty>
        )}
      </Card>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={() => setIsResizing(true)}
        style={{
          width: 10,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#bfbfbf',
          userSelect: 'none',
        }}
      >
        <HolderOutlined />
      </div>

      <Card
        size="small"
        styles={{ body: { padding: '16px 16px 0', height: '100%', minHeight: 560, display: 'flex', flexDirection: 'column' } }}
        style={{ flex: 1, minWidth: 0, marginLeft: 8, height: '100%' }}
      >
        {rightView === 'list' &&
          (selectedModuleId ? (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <style>
                  {`
                    .case-list-tabs .ant-tabs-nav {
                      margin: 0;
                    }
                    .case-list-tabs .ant-tabs-tab {
                      padding: 10px 14px;
                      font-size: 14px;
                    }
                    .case-list-tabs .ant-tabs-tab-btn {
                      font-weight: 600;
                    }
                  `}
                </style>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tabs
                    className="case-list-tabs"
                    size="middle"
                    type="line"
                    activeKey={caseListTab}
                    onChange={(k) => setCaseListTab(k as 'dir' | 'module' | 'tagGroup')}
                    items={[
                      { key: 'dir', label: selectedModuleName },
                      { key: 'module', label: '模块前置' },
                      { key: 'tagGroup', label: '标签/分组' },
                    ]}
                  />
                  <span />
                </div>

                {caseListTab === 'dir' ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    {toolbar}
                    <Input
                      allowClear
                      placeholder="搜索用例ID/名称/标签"
                      value={caseSearch}
                      onChange={(e) => setCaseSearch(e.target.value)}
                      prefix={<SearchOutlined />}
                      style={{ width: 300 }}
                    />
                  </div>
                ) : null}
              </div>

              {caseListTab === 'dir' ? (
                <>
                  <Table
                    size="small"
                    rowKey="id"
                    rowSelection={{
                      selectedRowKeys: selectedCaseIds,
                      onChange: (keys) => setSelectedCaseIds(keys as string[]),
                    }}
                    columns={tableColumns}
                    dataSource={searchedRows}
                    pagination={{ pageSize: 8, showSizeChanger: true }}
                  />
                </>
              ) : (
                <Empty
                  description="该 Tab 需求待澄清，暂不展示内容"
                  style={{ marginTop: 64 }}
                />
              )}
            </>
          ) : (
            <Empty description="请选择用例或新建用例" style={{ marginTop: 48 }} />
          ))}

        {rightView === 'detail' && openTabs.length > 0 && (
          <Tabs
            className="case-detail-tabs"
            type="editable-card"
            hideAdd
            activeKey={activeTab}
            onChange={setActiveTab}
            onEdit={onTabEdit}
            style={{ flex: 1, minHeight: 0 }}
            items={openTabs.map((t) => ({
              key: t.key,
              label: t.title,
              closable: true,
              children: renderDetailPane(t.caseId),
            }))}
          />
        )}
      </Card>

      <Modal
        title="复制步骤到用例"
        open={copyStepToOpen}
        onOk={submitCopyStepToCases}
        onCancel={() => setCopyStepToOpen(false)}
        okText="确定复制"
        cancelText="取消"
        destroyOnClose
      >
        <Input.TextArea
          rows={4}
          value={copyToCaseIdsInput}
          onChange={(e) => setCopyToCaseIdsInput(e.target.value)}
          placeholder="请输入目标用例ID，支持批量，使用逗号分隔，例如：tc-2,tc-3"
        />
      </Modal>
      <Modal
        title="复制断言到用例"
        open={copyAssertToOpen}
        onOk={submitCopyAssertToCases}
        onCancel={() => setCopyAssertToOpen(false)}
        okText="确定复制"
        cancelText="取消"
        destroyOnClose
      >
        <Input.TextArea
          rows={4}
          value={copyAssertCaseIdsInput}
          onChange={(e) => setCopyAssertCaseIdsInput(e.target.value)}
          placeholder="请输入目标用例ID，支持批量，使用逗号分隔，例如：tc-2,tc-3"
        />
      </Modal>

      <Modal
        title="导出测试用例"
        open={exportCasesOpen}
        onOk={submitExportTestCases}
        onCancel={() => setExportCasesOpen(false)}
        okText="确定导出"
        cancelText="取消"
        destroyOnClose
        width={520}
        maskClosable={false}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Text type="secondary">
            默认「根目录（全部用例）」导出当前版本全部用例；选择根目录时 YAML 中仅记录根目录一条，不展开列出所有子目录。可展开后多选子目录做部分导出（子目录导出时会列出涉及目录明细）。
          </Text>
          <TreeSelect
            treeData={exportModuleTreeData}
            value={exportModuleIds}
            onChange={(v) => onExportModuleIdsChange(v)}
            treeCheckable
            treeCheckStrictly
            allowClear
            showSearch
            treeNodeFilterProp="title"
            placeholder="默认根目录全部用例；可展开选择子目录"
            style={{ width: '100%' }}
            maxTagCount="responsive"
          />
        </Space>
      </Modal>

      <Modal
        title="选择函数"
        open={chooseFunctionModalOpen}
        onOk={submitChooseFunction}
        onCancel={() => setChooseFunctionModalOpen(false)}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Text>选择函数</Text>
          <TreeSelect
            style={{ width: '100%' }}
            treeData={functionTreeData}
            value={chooseFunctionValue || undefined}
            onChange={(v) => setChooseFunctionValue(String(v ?? ''))}
            treeDefaultExpandAll
            showSearch
            placeholder="请选择函数"
            treeNodeFilterProp="title"
          />
        </Space>
      </Modal>
      <Modal
        title="添加数据库操作步骤"
        open={dbStepCreateOpen}
        onOk={submitDbStepCreate}
        onCancel={() => setDbStepCreateOpen(false)}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <div>
            <Text>* 数据库类型：</Text>
            <Select
              style={{ width: '100%', marginTop: 6 }}
              value={dbStepCreateType}
              options={[
                { label: 'MariaDb', value: 'MariaDb' },
                { label: 'ClickHouse', value: 'ClickHouse' },
              ]}
              onChange={(v) => setDbStepCreateType(v as DbType)}
            />
          </div>
          <div>
            <Text>* 步骤名称：</Text>
            <Input
              style={{ marginTop: 6 }}
              value={dbStepCreateName}
              maxLength={30}
              showCount
              onChange={(e) => setDbStepCreateName(e.target.value)}
              placeholder="请输入步骤名称"
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title="添加测试用例"
        open={addCaseOpen}
        onOk={submitAddCase}
        onCancel={() => setAddCaseOpen(false)}
        destroyOnClose
        width={860}
      >
        <Tabs
          activeKey={addCaseMode}
          onChange={(k) => setAddCaseMode(k as 'custom' | 'api' | 'yaml')}
          items={[
            { key: 'custom', label: '自定义添加' },
            { key: 'api', label: '从接口场景添加' },
            { key: 'yaml', label: 'yaml用例导入' },
          ]}
        />

        {addCaseMode === 'custom' && (
          <Form form={addCaseForm} layout="vertical">
            <Form.Item name="name" label="测试用例名称" rules={[{ required: true }]}>
              <Input placeholder="请输入" />
            </Form.Item>
            <Form.Item name="moduleId" label="所属模块" rules={[{ required: true }]}>
              <Select options={moduleOptions} placeholder="请选择所属模块" />
            </Form.Item>
            <Form.Item name="tags" label="标签">
              <Select mode="tags" placeholder="请选择标签" />
            </Form.Item>
          </Form>
        )}

        {addCaseMode === 'api' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                * 选择接口场景
              </Text>
              <Input prefix={<SearchOutlined />} placeholder="搜索" style={{ marginBottom: 8 }} />
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 8, minHeight: 280 }}>
                <Tree
                  treeData={sceneTreeData}
                  selectedKeys={apiSceneSelectedKeys}
                  onSelect={(keys) => setApiSceneSelectedKeys(keys as string[])}
                />
              </div>
            </div>
            <Form form={apiImportForm} layout="vertical">
              <Form.Item name="moduleId" label="* 所属模块" rules={[{ required: true }]}>
                <Select options={moduleOptions} placeholder="请选择所属模块" />
              </Form.Item>
              <Form.Item name="tags" label="标签">
                <Select mode="tags" placeholder="请选择标签" />
              </Form.Item>
            </Form>
          </div>
        )}

        {addCaseMode === 'yaml' && (
          <div>
            <Alert
              type="info"
              showIcon
              message="用例会根据YAML中的路径导入到对应目录中，如果系统中没有对应目录则会按YAML路径自动新建目录。"
              style={{ marginBottom: 12 }}
            />
            <Button
              type="link"
              icon={<DownloadOutlined />}
              style={{ paddingInline: 0, marginBottom: 8 }}
              onClick={() => message.info('下载YAML模板（Mock）')}
            >
              下载YAML模板
            </Button>
            <Upload.Dragger
              accept=".yaml,.yml"
              multiple
              maxCount={10}
              beforeUpload={() => false}
              fileList={yamlFiles as any}
              onChange={(info) => {
                const list = info.fileList.slice(0, 10);
                if (info.fileList.length > 10) {
                  message.warning('最多支持上传 10 个 YAML 文件');
                }
                setYamlFiles(list.map((f) => ({ uid: f.uid, name: f.name })));
              }}
              style={{ marginBottom: 12 }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p>点击或拖拽文件到此区域上传</p>
              <p style={{ color: '#999' }}>支持批量上传（最多 10 个），仅支持 .yaml 或 .yml 格式</p>
            </Upload.Dragger>
          </div>
        )}
      </Modal>

      <Modal
        title="添加子目录"
        open={addSubOpen}
        onOk={submitAddSub}
        onCancel={() => setAddSubOpen(false)}
        destroyOnClose
      >
        <Form form={addSubForm} layout="vertical">
          <Form.Item name="name" label="目录名称" rules={[{ required: true }]}>
            <Input placeholder="请输入" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重命名"
        open={renameOpen}
        onOk={submitRename}
        onCancel={() => setRenameOpen(false)}
        destroyOnClose
      >
        <Form form={renameForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
