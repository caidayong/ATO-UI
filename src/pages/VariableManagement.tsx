/**
 * @page 变量管理
 * @version V1.0.12
 * @base docs/prd/ATO_V1.0.0-页面需求与交互规格.md §4.6；docs/spec/04-页面契约.md §页面 6
 * @changes
 *   - V1.0.0: 初始实现变量管理页；支持全局变量/全局参数、固定与自定义环境、环境服务器配置、分组变量增删查与保存 Mock
 *   - V1.0.1: 对齐变量管理视觉与操作区；变量列表字段统一为“变量值”，补充导入/导出入口（Mock）
 *   - V1.0.2: 环境列表支持复制；全局变量导入导出与 Tab 同行；动态变量仅组合筛选；动态列表增加用例名称、备注说明，变量类型默认全局变量
 *   - V1.0.3: 动态变量去掉保存按钮；备注说明 Mock 文案（非必填说明）
 *   - V1.0.4: 环境变量各 Tab 添加按钮文案；设备信息独立列表字段与编辑弹窗
 *   - V1.0.5: 中间件配置改为 Mysql/Clickhouse/Kafka 子 Tab + 固定配置项表（配置项/配置值/配置说明）
 *   - V1.0.6: 自定义环境支持侧栏「重命名」与详情「编辑」；内置 DEV/SIT/UAT/PRD 不可改名
 *   - V1.0.7: 环境列表操作收敛为「…」悬停下拉；详情标题旁编辑改为图标
 *   - V1.0.8: PRD §4.6 与页面契约 §6 与当前实现对齐（验收后文档同步）
 *   - V1.0.9: variables / 参数值 / 中间件配置值使用通用 DynamicValueInput（插入动态值）
 *   - V1.0.10: 内置环境 DEV/SIT/UAT/PRD 补充差异化 Mock 数据
 *   - V1.0.11: 全局变量导入/导出改为 YAML（导入弹窗与浏览器下载）
 *   - V1.0.12: 动态变量组合筛选增加「用例名称」模糊匹配
 */
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import type { MenuProps, UploadFile, UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { DynamicValueInput } from '@/components/DynamicValueInput';
import { mockCaseModules, mockTestCases } from '@/mocks/data';
import type { CaseModule, TestCase } from '@/types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { versionDevPath } from '@/constants/routes';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

type LeftNode =
  | { kind: 'global'; key: 'global-vars' | 'global-params'; label: string }
  | { kind: 'env'; key: string; label: string };

type VariableRow = {
  id: string;
  name: string;
  value: string;
  description: string;
};

type ServerRow = {
  id: string;
  name: string;
  protocol: 'http' | 'https' | 'wss' | 'ws';
  host: string;
  port: string;
};

type EnvVariableTab = 'custom' | 'header' | 'device' | 'middleware';
type GlobalVariableMode = 'dynamic' | 'static';
type GlobalParamTab = 'headers' | 'cookies';

type DynamicVariableRow = {
  id: string;
  caseId: string;
  caseName: string;
  name: string;
  value: string;
  remark: string;
  moduleName: string;
  variableType: '全局变量';
};

/** 环境变量 · 设备信息（与变量表结构不同） */
type DeviceRow = {
  id: string;
  deviceName: string;
  protocol: string;
  ip: string;
  port: string;
  devsn: string;
  phone: string;
  plateNo: string;
  plateColor: string;
  remark: string;
};

type DeviceFormValues = Omit<DeviceRow, 'id'>;

const MIDDLEWARE_PRESET_IDS = ['mysql', 'clickhouse', 'kafka'] as const;
type MiddlewarePresetId = (typeof MIDDLEWARE_PRESET_IDS)[number];

const MIDDLEWARE_PRESETS: Record<
  MiddlewarePresetId,
  { label: string; rows: { key: string; description: string }[] }
> = {
  mysql: {
    label: 'Mysql',
    rows: [
      { key: 'ip', description: 'MySQL服务器地址' },
      { key: 'port', description: 'MySQL端口' },
      { key: 'user', description: 'MySQL用户名' },
      { key: 'pwd', description: 'MySQL密码' },
    ],
  },
  clickhouse: {
    label: 'Clickhouse',
    rows: [
      { key: 'ip', description: 'Clickhouse服务器地址' },
      { key: 'port', description: 'Clickhouse端口' },
      { key: 'user', description: 'Clickhouse用户名' },
      { key: 'pwd', description: 'Clickhouse密码' },
    ],
  },
  kafka: {
    label: 'Kafka',
    rows: [
      { key: 'ip', description: 'Kafka服务器地址' },
      { key: 'port', description: 'Kafka端口' },
    ],
  },
};

function createEmptyMiddlewareValues(): Record<MiddlewarePresetId, Record<string, string>> {
  return {
    mysql: Object.fromEntries(MIDDLEWARE_PRESETS.mysql.rows.map((r) => [r.key, ''])),
    clickhouse: Object.fromEntries(MIDDLEWARE_PRESETS.clickhouse.rows.map((r) => [r.key, ''])),
    kafka: Object.fromEntries(MIDDLEWARE_PRESETS.kafka.rows.map((r) => [r.key, ''])),
  };
}

type EnvVariableRowsKey = 'custom' | 'header';

type EnvConfig = {
  key: string;
  name: string;
  builtin: boolean;
  servers: ServerRow[];
  variables: Record<EnvVariableRowsKey, VariableRow[]>;
  /** 中间件：各预设固定配置项，仅存可编辑的配置值 */
  middleware: { values: Record<MiddlewarePresetId, Record<string, string>> };
  devices: DeviceRow[];
};

type MiddlewareTableRow = {
  key: string;
  itemKey: string;
  description: string;
  value: string;
};

const GLOBAL_NAVS: LeftNode[] = [
  { kind: 'global', key: 'global-vars', label: '全局变量' },
  { kind: 'global', key: 'global-params', label: '全局参数' },
];

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function VariableManagement() {
  const { projectId = '', versionId = '' } = useParams<{ projectId: string; versionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [globalVars, setGlobalVars] = useState<VariableRow[]>([
    { id: 'g-1', name: 'token', value: 'mock-token', description: '登录令牌' },
    { id: 'g-2', name: 'timeout', value: '30000', description: '请求超时（ms）' },
  ]);
  const [globalParamTab, setGlobalParamTab] = useState<GlobalParamTab>('headers');
  const [globalParamsByTab, setGlobalParamsByTab] = useState<Record<GlobalParamTab, VariableRow[]>>({
    headers: [{ id: 'gp-h-1', name: 'traceId', value: '', description: '链路追踪标识' }],
    cookies: [{ id: 'gp-c-1', name: 'sessionId', value: '', description: '会话标识' }],
  });

  const [envs, setEnvs] = useState<EnvConfig[]>(() => {
    const mwEmpty = createEmptyMiddlewareValues();
    return [
      {
        key: 'DEV',
        name: 'DEV',
        builtin: true,
        servers: [{ id: 's-DEV', name: 'DEV-GW', protocol: 'http', host: 'dev.api.local', port: '8080' }],
        variables: {
          custom: [
            { id: 'dev-c1', name: 'basePath', value: '/api/dev', description: '接口前缀' },
            { id: 'dev-c2', name: 'appId', value: 'ATO-DEV-001', description: '联调应用 ID' },
          ],
          header: [
            { id: 'dev-h1', name: 'X-Env', value: 'DEV', description: '环境标识' },
            { id: 'dev-h2', name: 'X-Debug', value: '1', description: '调试标记' },
          ],
        },
        middleware: {
          values: {
            ...mwEmpty,
            mysql: { ip: 'dev-mysql.internal', port: '3306', user: 'ato_dev', pwd: '***' },
            clickhouse: { ip: 'dev-ch.internal', port: '9000', user: 'default', pwd: '' },
            kafka: { ip: 'dev-kafka.internal', port: '9092' },
          },
        },
        devices: [
          {
            id: 'dev-d1',
            deviceName: '路测终端-01',
            protocol: 'http',
            ip: '192.168.1.100',
            port: '8080',
            devsn: 'DEVSN20240001',
            phone: '13800138000',
            plateNo: '粤B·12345',
            plateColor: '白色',
            remark: 'DEV 环境示例设备',
          },
        ],
      },
      {
        key: 'SIT',
        name: 'SIT',
        builtin: true,
        servers: [{ id: 's-SIT', name: 'SIT-GW', protocol: 'https', host: 'sit-api.example.com', port: '443' }],
        variables: {
          custom: [
            { id: 'sit-c1', name: 'basePath', value: '/api/sit', description: 'SIT 接口前缀' },
            { id: 'sit-c2', name: 'orderMock', value: 'true', description: '是否启用订单 Mock' },
          ],
          header: [
            { id: 'sit-h1', name: 'X-Env', value: 'SIT', description: '环境标识' },
            { id: 'sit-h2', name: 'X-Tenant', value: 'qa-team', description: '租户/团队' },
          ],
        },
        middleware: {
          values: {
            ...mwEmpty,
            mysql: { ip: '10.8.1.20', port: '3306', user: 'ato_sit', pwd: '***' },
            clickhouse: { ip: '10.8.1.21', port: '9000', user: 'ato_sit', pwd: '***' },
            kafka: { ip: '10.8.1.22', port: '9092' },
          },
        },
        devices: [
          {
            id: 'sit-d1',
            deviceName: '集成测试盒-A',
            protocol: 'https',
            ip: '10.8.9.50',
            port: '8443',
            devsn: 'SITSN20240088',
            phone: '13900139000',
            plateNo: '浙A·9X888',
            plateColor: '黄色',
            remark: 'SIT 自动化回归专用',
          },
        ],
      },
      {
        key: 'UAT',
        name: 'UAT',
        builtin: true,
        servers: [{ id: 's-UAT', name: 'UAT-GW', protocol: 'https', host: 'uat-api.example.com', port: '443' }],
        variables: {
          custom: [
            { id: 'uat-c1', name: 'basePath', value: '/api/uat', description: 'UAT 接口前缀' },
            { id: 'uat-c2', name: 'featureFlag', value: 'billing-v2', description: '验收特性开关' },
          ],
          header: [
            { id: 'uat-h1', name: 'X-Env', value: 'UAT', description: '环境标识' },
            { id: 'uat-h2', name: 'Authorization', value: 'Bearer {{token}}', description: '鉴权（示例占位）' },
          ],
        },
        middleware: {
          values: {
            ...mwEmpty,
            mysql: { ip: 'uat-mysql.cluster.local', port: '3306', user: 'ato_uat', pwd: '***' },
            clickhouse: { ip: 'uat-ch.cluster.local', port: '9000', user: 'ato_uat', pwd: '***' },
            kafka: { ip: 'uat-kafka.cluster.local', port: '9093' },
          },
        },
        devices: [
          {
            id: 'uat-d1',
            deviceName: '业务验收终端',
            protocol: 'http',
            ip: '172.20.3.10',
            port: '9000',
            devsn: 'UATSN20240102',
            phone: '13700137000',
            plateNo: '苏E·D5566',
            plateColor: '蓝色',
            remark: 'UAT 用户验收代表设备',
          },
        ],
      },
      {
        key: 'PRD',
        name: 'PRD',
        builtin: true,
        servers: [{ id: 's-PRD', name: 'PRD-GW', protocol: 'https', host: 'api.prod.example.com', port: '443' }],
        variables: {
          custom: [
            { id: 'prd-c1', name: 'basePath', value: '/api/v1', description: '生产接口前缀' },
            { id: 'prd-c2', name: 'rateLimit', value: '500', description: '每分钟调用上限（示例）' },
          ],
          header: [
            { id: 'prd-h1', name: 'X-Env', value: 'PRD', description: '环境标识' },
            { id: 'prd-h2', name: 'X-Request-From', value: 'AutoTestOne', description: '调用来源' },
          ],
        },
        middleware: {
          values: {
            ...mwEmpty,
            mysql: { ip: 'prd-mysql-vip.internal', port: '3306', user: 'ato_prd_ro', pwd: '***' },
            clickhouse: { ip: 'prd-analytics-ch.internal', port: '9000', user: 'ato_readonly', pwd: '***' },
            kafka: { ip: 'prd-bus.internal', port: '9092' },
          },
        },
        devices: [
          {
            id: 'prd-d1',
            deviceName: '生产探针-华东',
            protocol: 'tcp',
            ip: '10.0.0.88',
            port: '5600',
            devsn: 'PRDSNHZ2024',
            phone: '13600001111',
            plateNo: '沪A·K0123',
            plateColor: '绿色',
            remark: '生产拨测/健康检查（Mock 文案）',
          },
        ],
      },
    ];
  });

  const [selectedKey, setSelectedKey] = useState<'global-vars' | 'global-params' | string>('global-vars');
  const [searchText, setSearchText] = useState('');
  const [dynamicFilters, setDynamicFilters] = useState<{
    caseId: string;
    caseName: string;
    name: string;
    moduleName: string;
  }>({
    caseId: '',
    caseName: '',
    name: '',
    moduleName: '',
  });
  const [envTab, setEnvTab] = useState<EnvVariableTab>('custom');
  const [middlewareSubTab, setMiddlewareSubTab] = useState<MiddlewarePresetId>('mysql');
  const [globalMode, setGlobalMode] = useState<GlobalVariableMode>('static');

  const [createMode, setCreateMode] = useState(false);
  const [createForm] = Form.useForm<{ name: string }>();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameEnvKey, setRenameEnvKey] = useState<string | null>(null);
  const [renameForm] = Form.useForm<{ name: string }>();
  const [importOpen, setImportOpen] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);

  const [nameValidationTriggered, setNameValidationTriggered] = useState(false);
  const [paramNameValidationTriggered, setParamNameValidationTriggered] = useState(false);

  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceEditingId, setDeviceEditingId] = useState<string | null>(null);
  const [deviceForm] = Form.useForm<DeviceFormValues>();

  const activeEnv = useMemo(
    () => envs.find((env) => env.key === selectedKey) ?? null,
    [envs, selectedKey]
  );
  const isGlobalVar = selectedKey === 'global-vars';
  const isGlobalParam = selectedKey === 'global-params';

  const filteredGlobalRows = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return globalVars;
    return globalVars.filter(
      (row) =>
        row.name.toLowerCase().includes(kw) ||
        row.value.toLowerCase().includes(kw) ||
        row.description.toLowerCase().includes(kw)
    );
  }, [globalVars, searchText]);
  const currentGlobalParamRows = globalParamsByTab[globalParamTab];

  const filteredEnvVariableRows = useMemo(() => {
    if (!activeEnv || envTab === 'device' || envTab === 'middleware') return [];
    const rows = activeEnv.variables[envTab];
    const kw = searchText.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(kw) ||
        row.value.toLowerCase().includes(kw) ||
        row.description.toLowerCase().includes(kw)
    );
  }, [activeEnv, envTab, searchText]);

  const filteredDeviceRows = useMemo(() => {
    if (!activeEnv || envTab !== 'device') return [];
    const kw = searchText.trim().toLowerCase();
    const rows = activeEnv.devices;
    if (!kw) return rows;
    return rows.filter((row) =>
      [
        row.deviceName,
        row.protocol,
        row.ip,
        row.port,
        row.devsn,
        row.phone,
        row.plateNo,
        row.plateColor,
        row.remark,
      ].some((f) => f.toLowerCase().includes(kw))
    );
  }, [activeEnv, envTab, searchText]);

  const isEnvHeader = envTab === 'header';

  const middlewareTableRows = useMemo<MiddlewareTableRow[]>(() => {
    if (!activeEnv) return [];
    const preset = MIDDLEWARE_PRESETS[middlewareSubTab];
    const store = activeEnv.middleware.values[middlewareSubTab];
    return preset.rows.map((r) => ({
      key: `${middlewareSubTab}-${r.key}`,
      itemKey: r.key,
      description: r.description,
      value: store[r.key] ?? '',
    }));
  }, [activeEnv, middlewareSubTab]);

  const envAddButtonLabel =
    envTab === 'custom'
      ? '添加变量'
      : envTab === 'header'
        ? '添加参数'
        : envTab === 'device'
          ? '添加设备'
          : '添加行';

  const envSearchPlaceholder =
    envTab === 'device'
      ? '搜索设备名称 / 协议 / IP / 端口 / devsn / 手机号 / 车牌号 / 车牌颜色 / 备注'
      : '搜索变量名 / 值 / 说明';

  const globalNodes: LeftNode[] = [...GLOBAL_NAVS];
  const envNodes: LeftNode[] = envs.map((env) => ({ kind: 'env' as const, key: env.key, label: env.name }));

  /** 供「插入全局变量」列表：当前静态全局变量名 */
  const globalVariableNameOptions = useMemo(
    () => globalVars.map((v) => v.name.trim()).filter(Boolean),
    [globalVars]
  );
  const importUploadProps: UploadProps = {
    accept: '.yaml,.yml',
    maxCount: 1,
    fileList: importFileList,
    beforeUpload: (file) => {
      const lower = file.name.toLowerCase();
      const ok = lower.endsWith('.yaml') || lower.endsWith('.yml');
      if (!ok) {
        message.error('仅支持 .yaml / .yml 文件');
        return Upload.LIST_IGNORE;
      }
      setImportFileList([
        {
          uid: file.uid,
          name: file.name,
          status: 'done',
          originFileObj: file,
        },
      ]);
      return false;
    },
    onRemove: () => {
      setImportFileList([]);
    },
  };

  const dynamicVariableRows = useMemo<DynamicVariableRow[]>(() => {
    const moduleMap = new Map<string, CaseModule>(mockCaseModules.map((m) => [m.id, m]));
    const versionCases = mockTestCases.filter((c: TestCase) => c.versionId === '1');
    const remarkByField = (field: 'token' | 'orderId') =>
      field === 'token'
        ? '从接口响应体提取鉴权令牌，后续步骤请求头可引用'
        : '保存下单接口返回的订单 ID，供查询状态、发起退款等步骤串联使用';
    return versionCases.map((c, idx) => {
      const moduleName = moduleMap.get(c.moduleId)?.name ?? '-';
      const field = idx % 2 === 0 ? 'token' : 'orderId';
      return {
        id: `dyn-${c.id}`,
        caseId: c.id,
        caseName: c.name,
        name: `${field}_${c.id.replace('tc-', '')}`,
        value: `response.data.${field}`,
        remark: remarkByField(field),
        moduleName,
        variableType: '全局变量',
      };
    });
  }, []);
  const filteredDynamicRows = useMemo(() => {
    const caseIdKw = dynamicFilters.caseId.trim().toLowerCase();
    const caseNameKw = dynamicFilters.caseName.trim().toLowerCase();
    const nameKw = dynamicFilters.name.trim().toLowerCase();
    const moduleKw = dynamicFilters.moduleName.trim().toLowerCase();
    if (!caseIdKw && !caseNameKw && !nameKw && !moduleKw) return dynamicVariableRows;
    return dynamicVariableRows.filter((row) => {
      const dimCaseId = row.caseId.toLowerCase();
      const dimCaseName = row.caseName.toLowerCase();
      const dimName = row.name.toLowerCase();
      const dimModule = row.moduleName.toLowerCase();
      if (caseIdKw && !dimCaseId.includes(caseIdKw)) return false;
      if (caseNameKw && !dimCaseName.includes(caseNameKw)) return false;
      if (nameKw && !dimName.includes(nameKw)) return false;
      if (moduleKw && !dimModule.includes(moduleKw)) return false;
      return true;
    });
  }, [dynamicVariableRows, dynamicFilters]);

  const addGlobalRow = () => {
    const newRow: VariableRow = { id: nowId('g'), name: '', value: '', description: '' };
    setGlobalVars((prev) => [newRow, ...prev]);
  };

  const handleImport = () => {
    setImportFileList([]);
    setImportOpen(true);
  };

  const submitImportYaml = async () => {
    const file = importFileList[0]?.originFileObj;
    if (!file) {
      message.warning('请先选择 YAML 文件');
      return;
    }
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.yaml') && !fileName.endsWith('.yml')) {
      message.error('仅支持导入 .yaml / .yml 文件');
      return;
    }
    try {
      const text = await file.text();
      const doc = parseYaml(text) as
        | {
            staticVariables?: Array<{ name?: string; value?: string | number; description?: string }>;
            dynamicVariables?: unknown[];
          }
        | null
        | undefined;
      const staticRows = Array.isArray(doc?.staticVariables) ? doc?.staticVariables : [];
      const nextRows: VariableRow[] = staticRows
        .filter((it) => (it?.name ?? '').toString().trim())
        .map((it, idx) => ({
          id: nowId(`import-${idx}`),
          name: String(it?.name ?? '').trim(),
          value: String(it?.value ?? ''),
          description: String(it?.description ?? ''),
        }));
      if (!nextRows.length) {
        message.warning('YAML 中未找到可导入的静态变量（staticVariables）');
        return;
      }
      setGlobalVars(nextRows);
      setGlobalMode('static');
      setImportOpen(false);
      setImportFileList([]);
      message.success(`导入成功：${nextRows.length} 条静态变量`);
    } catch (e) {
      console.error(e);
      message.error('YAML 解析失败，请检查文件格式');
    }
  };

  const handleExport = () => {
    const payload = {
      staticVariables: globalVars.map((row) => ({
        name: row.name,
        value: row.value,
        description: row.description,
      })),
      dynamicVariables: dynamicVariableRows.map((row) => ({
        caseId: row.caseId,
        caseName: row.caseName,
        name: row.name,
        value: row.value,
        remark: row.remark,
        moduleName: row.moduleName,
        variableType: row.variableType,
      })),
    };
    const yamlText = stringifyYaml(payload);
    const blob = new Blob([yamlText], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `global-variables-${stamp}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('已导出 YAML 文件');
  };

  const handleSaveGlobal = () => {
    if (globalMode === 'static') {
      setNameValidationTriggered(true);
      const hasEmptyName = globalVars.some((row) => !row.name.trim());
      if (hasEmptyName) {
        message.error('缺失必填参数，请确认');
        return;
      }
    }
    message.success('保存成功（Mock）');
  };

  const updateGlobalRow = (id: string, patch: Partial<VariableRow>) => {
    setGlobalVars((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const deleteGlobalRow = (id: string) => {
    setGlobalVars((prev) => prev.filter((row) => row.id !== id));
    message.success('已删除变量');
  };
  const addGlobalParamRow = () => {
    const row: VariableRow = { id: nowId('gp'), name: '', value: '', description: '' };
    setGlobalParamsByTab((prev) => ({ ...prev, [globalParamTab]: [row, ...prev[globalParamTab]] }));
  };
  const updateGlobalParamRow = (id: string, patch: Partial<VariableRow>) => {
    setGlobalParamsByTab((prev) => ({
      ...prev,
      [globalParamTab]: prev[globalParamTab].map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  };
  const deleteGlobalParamRow = (id: string) => {
    setGlobalParamsByTab((prev) => ({
      ...prev,
      [globalParamTab]: prev[globalParamTab].filter((row) => row.id !== id),
    }));
    message.success('已删除参数');
  };
  const handleSaveGlobalParams = () => {
    setParamNameValidationTriggered(true);
    const hasEmptyName = currentGlobalParamRows.some((row) => !row.name.trim());
    if (hasEmptyName) {
      message.error('缺失必填参数，请确认');
      return;
    }
    message.success('保存成功（Mock）');
  };

  const addEnvVariable = () => {
    if (!activeEnv) return;
    if (envTab === 'middleware') return;
    if (envTab === 'device') {
      setDeviceEditingId(null);
      deviceForm.resetFields();
      deviceForm.setFieldsValue({
        deviceName: '',
        protocol: 'http',
        ip: '',
        port: '',
        devsn: '',
        phone: '',
        plateNo: '',
        plateColor: '',
        remark: '',
      });
      setDeviceModalOpen(true);
      return;
    }
    const row: VariableRow = { id: nowId('ev'), name: '', value: '', description: '' };
    setEnvs((prev) =>
      prev.map((env) =>
        env.key === activeEnv.key
          ? { ...env, variables: { ...env.variables, [envTab]: [row, ...env.variables[envTab]] } }
          : env
      )
    );
  };

  const updateMiddlewareValue = (preset: MiddlewarePresetId, itemKey: string, value: string) => {
    if (!activeEnv) return;
    setEnvs((prev) =>
      prev.map((env) =>
        env.key === activeEnv.key
          ? {
              ...env,
              middleware: {
                values: {
                  ...env.middleware.values,
                  [preset]: {
                    ...env.middleware.values[preset],
                    [itemKey]: value,
                  },
                },
              },
            }
          : env
      )
    );
  };

  const updateEnvVariable = (id: string, patch: Partial<VariableRow>) => {
    if (!activeEnv || envTab === 'device' || envTab === 'middleware') return;
    setEnvs((prev) =>
      prev.map((env) =>
        env.key === activeEnv.key
          ? {
              ...env,
              variables: {
                ...env.variables,
                [envTab]: env.variables[envTab].map((row) => (row.id === id ? { ...row, ...patch } : row)),
              },
            }
          : env
      )
    );
  };

  const deleteEnvVariable = (id: string) => {
    if (!activeEnv || envTab === 'device' || envTab === 'middleware') return;
    setEnvs((prev) =>
      prev.map((env) =>
        env.key === activeEnv.key
          ? {
              ...env,
              variables: {
                ...env.variables,
                [envTab]: env.variables[envTab].filter((row) => row.id !== id),
              },
            }
          : env
      )
    );
    message.success('已删除变量');
  };

  const openDeviceEdit = (row: DeviceRow) => {
    setDeviceEditingId(row.id);
    const { id: _omit, ...rest } = row;
    deviceForm.setFieldsValue(rest);
    setDeviceModalOpen(true);
  };

  const submitDevice = () => {
    deviceForm.validateFields().then((values) => {
      if (!activeEnv) return;
      const payload: DeviceFormValues = {
        deviceName: values.deviceName.trim(),
        protocol: values.protocol,
        ip: values.ip.trim(),
        port: values.port.trim(),
        devsn: values.devsn.trim(),
        phone: values.phone.trim(),
        plateNo: values.plateNo.trim(),
        plateColor: values.plateColor.trim(),
        remark: (values.remark ?? '').trim(),
      };
      if (deviceEditingId) {
        setEnvs((prev) =>
          prev.map((env) =>
            env.key === activeEnv.key
              ? {
                  ...env,
                  devices: env.devices.map((d) =>
                    d.id === deviceEditingId ? { ...d, ...payload } : d
                  ),
                }
              : env
          )
        );
        message.success('已保存');
      } else {
        setEnvs((prev) =>
          prev.map((env) =>
            env.key === activeEnv.key
              ? { ...env, devices: [{ id: nowId('dev'), ...payload }, ...env.devices] }
              : env
          )
        );
        message.success('已添加设备');
      }
      setDeviceModalOpen(false);
      setDeviceEditingId(null);
    });
  };

  const deleteDevice = (id: string) => {
    if (!activeEnv) return;
    setEnvs((prev) =>
      prev.map((env) =>
        env.key === activeEnv.key
          ? { ...env, devices: env.devices.filter((d) => d.id !== id) }
          : env
      )
    );
    message.success('已删除设备');
  };

  const openCreateEnv = () => {
    createForm.resetFields();
    setCreateMode(true);
    setSelectedKey('__new_env__');
    setSearchText('');
  };

  const saveCreateEnv = async () => {
    const values = await createForm.validateFields();
    const name = values.name.trim();
    if (envs.some((env) => env.name.toLowerCase() === name.toLowerCase())) {
      message.warning('环境名称已存在');
      return;
    }
    const key = `ENV_${name}`;
    const env: EnvConfig = {
      key,
      name,
      builtin: false,
      servers: [{ id: nowId('s'), name, protocol: 'http', host: '', port: '' }],
      variables: { custom: [], header: [] },
      middleware: { values: createEmptyMiddlewareValues() },
      devices: [],
    };
    setEnvs((prev) => [...prev, env]);
    setCreateMode(false);
    setSelectedKey(key);
    message.success('已新增环境');
  };

  const deleteEnv = (key: string) => {
    const env = envs.find((item) => item.key === key);
    if (!env || env.builtin) return;
    setEnvs((prev) => prev.filter((item) => item.key !== key));
    setSelectedKey('global-vars');
    message.success('已删除环境');
  };

  const copyEnv = (key: string) => {
    const env = envs.find((item) => item.key === key);
    if (!env) return;
    const baseName = env.name;
    let newName = `${baseName}_副本`;
    let n = 2;
    while (envs.some((e) => e.name === newName)) {
      newName = `${baseName}_副本${n}`;
      n += 1;
    }
    const newKey = `ENV_${nowId('copy')}`;
    const cloneVars = (rows: VariableRow[]) =>
      rows.map((r) => ({ ...r, id: nowId('ev') }));
    const cloned: EnvConfig = {
      key: newKey,
      name: newName,
      builtin: false,
      servers: env.servers.map((s) => ({ ...s, id: nowId('s'), name: newName })),
      variables: {
        custom: cloneVars(env.variables.custom),
        header: cloneVars(env.variables.header),
      },
      middleware: {
        values: {
          mysql: { ...env.middleware.values.mysql },
          clickhouse: { ...env.middleware.values.clickhouse },
          kafka: { ...env.middleware.values.kafka },
        },
      },
      devices: env.devices.map((d) => ({ ...d, id: nowId('dev') })),
    };
    setEnvs((prev) => [...prev, cloned]);
    setSelectedKey(newKey);
    message.success('已复制环境');
  };

  const openRenameEnv = (envKey: string) => {
    const env = envs.find((e) => e.key === envKey);
    if (!env || env.builtin) return;
    setRenameEnvKey(envKey);
    renameForm.setFieldsValue({ name: env.name });
    setRenameOpen(true);
  };

  const submitRenameEnv = async () => {
    if (!renameEnvKey) return;
    const env = envs.find((e) => e.key === renameEnvKey);
    if (!env || env.builtin) return;
    const values = await renameForm.validateFields();
    const name = values.name.trim();
    if (!name) {
      message.error('请输入环境名称');
      return Promise.reject();
    }
    if (envs.some((e) => e.key !== renameEnvKey && e.name.toLowerCase() === name.toLowerCase())) {
      message.warning('环境名称已存在');
      return Promise.reject();
    }
    const newKey = `ENV_${name}`;
    if (envs.some((e) => e.key !== renameEnvKey && e.key === newKey)) {
      message.warning('环境标识冲突');
      return Promise.reject();
    }
    setEnvs((prev) =>
      prev.map((e) =>
        e.key === renameEnvKey
          ? {
              ...e,
              key: newKey,
              name,
              servers: e.servers.map((s) => ({ ...s, name })),
            }
          : e
      )
    );
    if (selectedKey === renameEnvKey) setSelectedKey(newKey);
    setRenameOpen(false);
    setRenameEnvKey(null);
    message.success('已重命名');
  };

  const updateServer = (serverId: string, patch: Partial<ServerRow>) => {
    if (!activeEnv) return;
    setEnvs((prev) =>
      prev.map((env) =>
        env.key === activeEnv.key
          ? {
              ...env,
              servers: env.servers.map((s) => (s.id === serverId ? { ...s, ...patch } : s)),
            }
          : env
      )
    );
  };

  const varColumns: ColumnsType<VariableRow> = [
    {
      title: '变量名',
      dataIndex: 'name',
      width: 220,
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入变量名"
          onChange={(e) => {
            const patch = { name: e.target.value };
            if (isGlobalVar) updateGlobalRow(row.id, patch);
            else updateEnvVariable(row.id, patch);
          }}
          status={
            nameValidationTriggered && isGlobalVar && globalMode === 'static' && !value.trim()
              ? 'error'
              : undefined
          }
        />
      ),
    },
    {
      title: '变量值',
      dataIndex: 'value',
      render: (value: string, row) => (
        <DynamicValueInput
          globalVariableOptions={globalVariableNameOptions}
          value={value}
          placeholder="请输入变量值"
          onChange={(e) => {
            const patch = { value: e.target.value };
            if (isGlobalVar) updateGlobalRow(row.id, patch);
            else updateEnvVariable(row.id, patch);
          }}
        />
      ),
    },
    {
      title: '变量描述',
      dataIndex: 'description',
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入变量描述"
          onChange={(e) => {
            const patch = { description: e.target.value };
            if (isGlobalVar) updateGlobalRow(row.id, patch);
            else updateEnvVariable(row.id, patch);
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 88,
      render: (_, row) => (
        <Popconfirm
          title="确认删除该变量？"
          onConfirm={() => (isGlobalVar ? deleteGlobalRow(row.id) : deleteEnvVariable(row.id))}
        >
          <Button type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const envVarColumns: ColumnsType<VariableRow> = [
    {
      title: isEnvHeader ? '参数名' : '变量名',
      dataIndex: 'name',
      width: 220,
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder={isEnvHeader ? '请输入参数名' : '请输入变量名'}
          onChange={(e) => updateEnvVariable(row.id, { name: e.target.value })}
        />
      ),
    },
    {
      title: isEnvHeader ? '参数值' : '变量值',
      dataIndex: 'value',
      render: (value: string, row) => (
        <DynamicValueInput
          globalVariableOptions={globalVariableNameOptions}
          value={value}
          placeholder={isEnvHeader ? '请输入参数值' : '请输入变量值'}
          onChange={(e) => updateEnvVariable(row.id, { value: e.target.value })}
        />
      ),
    },
    {
      title: '变量描述',
      dataIndex: 'description',
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入变量描述"
          onChange={(e) => updateEnvVariable(row.id, { description: e.target.value })}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 88,
      render: (_, row) => (
        <Popconfirm title={isEnvHeader ? '确认删除该参数？' : '确认删除该变量？'} onConfirm={() => deleteEnvVariable(row.id)}>
          <Button type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const globalParamColumns: ColumnsType<VariableRow> = [
    {
      title: '参数名',
      dataIndex: 'name',
      width: 240,
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入参数名"
          onChange={(e) => updateGlobalParamRow(row.id, { name: e.target.value })}
          status={paramNameValidationTriggered && !value.trim() ? 'error' : undefined}
        />
      ),
    },
    {
      title: (
        <Space size={4}>
          参数值
          <Tooltip title="支持固定值或表达式">
            <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'value',
      render: (value: string, row) => (
        <DynamicValueInput
          globalVariableOptions={globalVariableNameOptions}
          value={value}
          placeholder="请输入参数值"
          onChange={(e) => updateGlobalParamRow(row.id, { value: e.target.value })}
        />
      ),
    },
    {
      title: '参数描述',
      dataIndex: 'description',
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入参数描述"
          onChange={(e) => updateGlobalParamRow(row.id, { description: e.target.value })}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 88,
      render: (_, row) => (
        <Popconfirm title="确认删除该参数？" onConfirm={() => deleteGlobalParamRow(row.id)}>
          <Button type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const serverColumns: ColumnsType<ServerRow> = [
    {
      title: '服务器名称',
      dataIndex: 'name',
      width: 220,
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入服务器名称"
          onChange={(e) => updateServer(row.id, { name: e.target.value })}
        />
      ),
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      width: 160,
      render: (value: ServerRow['protocol'], row) => (
        <Select
          value={value}
          onChange={(v) => updateServer(row.id, { protocol: v as ServerRow['protocol'] })}
          options={[
            { label: 'http', value: 'http' },
            { label: 'https', value: 'https' },
            { label: 'wss', value: 'wss' },
            { label: 'ws', value: 'ws' },
          ]}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'IP/域名',
      dataIndex: 'host',
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入 IP/域名"
          onChange={(e) => updateServer(row.id, { host: e.target.value })}
        />
      ),
    },
    {
      title: '端口',
      dataIndex: 'port',
      width: 160,
      render: (value: string, row) => (
        <Input
          value={value}
          placeholder="请输入端口"
          onChange={(e) => updateServer(row.id, { port: e.target.value })}
        />
      ),
    },
  ];

  const deviceProtocolOptions = [
    { label: 'http', value: 'http' },
    { label: 'https', value: 'https' },
    { label: 'wss', value: 'wss' },
    { label: 'ws', value: 'ws' },
    { label: 'tcp', value: 'tcp' },
    { label: 'udp', value: 'udp' },
  ];

  const deviceColumns: ColumnsType<DeviceRow> = [
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      width: 130,
      ellipsis: true,
      render: (t: string) => <Typography.Text ellipsis={{ tooltip: t }}>{t}</Typography.Text>,
    },
    { title: '协议', dataIndex: 'protocol', width: 72 },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 120,
      ellipsis: true,
      render: (t: string) => <Typography.Text ellipsis={{ tooltip: t }}>{t}</Typography.Text>,
    },
    { title: '端口', dataIndex: 'port', width: 72 },
    {
      title: 'devsn',
      dataIndex: 'devsn',
      width: 120,
      ellipsis: true,
      render: (t: string) => <Typography.Text ellipsis={{ tooltip: t }}>{t}</Typography.Text>,
    },
    { title: '手机号', dataIndex: 'phone', width: 112 },
    {
      title: '车牌号',
      dataIndex: 'plateNo',
      width: 112,
      ellipsis: true,
      render: (t: string) => <Typography.Text ellipsis={{ tooltip: t }}>{t}</Typography.Text>,
    },
    {
      title: '车牌颜色',
      dataIndex: 'plateColor',
      width: 88,
      ellipsis: true,
      render: (t: string) => <Typography.Text ellipsis={{ tooltip: t }}>{t || '-'}</Typography.Text>,
    },
    {
      title: '备注说明',
      dataIndex: 'remark',
      ellipsis: true,
      render: (t: string) => <Typography.Text ellipsis={{ tooltip: t }}>{t || '-'}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openDeviceEdit(row)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该设备？" onConfirm={() => deleteDevice(row.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const middlewareColumns: ColumnsType<MiddlewareTableRow> = [
    {
      title: '配置项',
      dataIndex: 'itemKey',
      width: 140,
      render: (t: string) => <Typography.Text code>{t}</Typography.Text>,
    },
    {
      title: '配置值',
      dataIndex: 'value',
      render: (value: string, row) => (
        <DynamicValueInput
          globalVariableOptions={globalVariableNameOptions}
          value={value}
          placeholder="请输入配置值"
          onChange={(e) => updateMiddlewareValue(middlewareSubTab, row.itemKey, e.target.value)}
        />
      ),
    },
    {
      title: '配置说明',
      dataIndex: 'description',
      ellipsis: true,
      render: (t: string) => <Typography.Text ellipsis={{ tooltip: t }}>{t}</Typography.Text>,
    },
  ];

  const dynamicColumns: ColumnsType<DynamicVariableRow> = [
    {
      title: '用例ID',
      dataIndex: 'caseId',
      width: 140,
      render: (caseId: string) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() =>
            navigate({
              pathname: versionDevPath(projectId, versionId, 'cases'),
              search: (() => {
                const q = new URLSearchParams(location.search);
                q.set('caseId', caseId);
                return `?${q.toString()}`;
              })(),
            })
          }
        >
          {caseId}
        </Button>
      ),
    },
    { title: '用例名称', dataIndex: 'caseName', width: 200, ellipsis: true },
    { title: '变量名', dataIndex: 'name', width: 180 },
    { title: '变量值', dataIndex: 'value', ellipsis: true },
    {
      title: (
        <Space size={4}>
          备注说明
          <Tooltip title="非必填，用于说明该变量在用例中的作用">
            <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'remark',
      width: 220,
      ellipsis: true,
    },
    { title: '所属模块', dataIndex: 'moduleName', width: 160 },
    { title: '变量类型', dataIndex: 'variableType', width: 110 },
  ];

  return (
    <>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: 16,
        height: 'calc(100vh - 140px)',
        minHeight: 560,
      }}
    >
      <Card
        size="small"
        title={null}
        styles={{ body: { padding: 8, display: 'flex', flexDirection: 'column', height: '100%' } }}
      >
        <Typography.Text
          type="secondary"
          style={{ fontSize: 13, fontWeight: 500, padding: '2px 8px 8px', display: 'block' }}
        >
          全局变量
        </Typography.Text>
        <List
          size="small"
          dataSource={globalNodes}
          renderItem={(item) => {
            const selected = selectedKey === item.key;
            return (
              <List.Item
                onClick={() => {
                  setCreateMode(false);
                  setSelectedKey(item.key);
                  setSearchText('');
                }}
                style={{
                  cursor: 'pointer',
                  background: selected ? '#e6f4ff' : undefined,
                  borderRadius: 6,
                  paddingInline: 20,
                }}
              >
                <Typography.Text>{item.label}</Typography.Text>
              </List.Item>
            );
          }}
        />
        <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 13, fontWeight: 500, padding: '0 8px 8px', display: 'block' }}
          >
            环境变量
          </Typography.Text>
          <List
            size="small"
            dataSource={envNodes}
            renderItem={(item) => {
              const selected = selectedKey === item.key;
              const env = envs.find((x) => x.key === item.key) ?? null;
              const canDelete = Boolean(env && !env.builtin);
              const canRename = Boolean(env && !env.builtin);
              const envMoreMenu: MenuProps = {
                items: [
                  {
                    key: 'rename',
                    label: '重命名',
                    disabled: !canRename,
                    title: !canRename ? '内置环境不可重命名' : undefined,
                  },
                  { key: 'copy', label: '复制', icon: <CopyOutlined /> },
                  { type: 'divider' },
                  {
                    key: 'delete',
                    label: '删除',
                    danger: true,
                    disabled: !canDelete,
                    icon: <DeleteOutlined />,
                    title: !canDelete ? '内置环境不可删除' : undefined,
                  },
                ],
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  if (key === 'rename' && canRename) openRenameEnv(item.key);
                  if (key === 'copy') copyEnv(item.key);
                  if (key === 'delete' && canDelete) {
                    Modal.confirm({
                      title: `确认删除环境「${item.label}」？`,
                      okText: '删除',
                      okType: 'danger',
                      cancelText: '取消',
                      onOk: () => deleteEnv(item.key),
                    });
                  }
                },
              };
              const moreTrigger = (
                <Dropdown menu={envMoreMenu} trigger={['hover']} placement="bottomRight">
                  <Button
                    type="text"
                    size="small"
                    icon={<EllipsisOutlined style={{ fontSize: 16 }} />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              );
              return (
                <List.Item
                  onClick={() => {
                    setCreateMode(false);
                    setSelectedKey(item.key);
                    setSearchText('');
                  }}
                  style={{
                    cursor: 'pointer',
                    background: selected ? '#e6f4ff' : undefined,
                    borderRadius: 6,
                    paddingInline: 20,
                  }}
                  actions={[moreTrigger]}
                >
                  <Typography.Text>{item.label}</Typography.Text>
                </List.Item>
              );
            }}
          />
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <Button block icon={<PlusOutlined />} onClick={openCreateEnv}>
            添加环境
          </Button>
        </div>
      </Card>

      <Card size="small" styles={{ body: { padding: 16 } }}>
        {createMode ? (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                新建环境
              </Typography.Title>
              <Button type="primary" onClick={saveCreateEnv}>
                保存
              </Button>
              <Button
                onClick={() => {
                  setCreateMode(false);
                  setSelectedKey('global-vars');
                }}
              >
                取消
              </Button>
            </Space>
            <Form form={createForm} layout="vertical" style={{ maxWidth: 420 }}>
              <Form.Item
                label="环境名称"
                name="name"
                rules={[
                  { required: true, message: '请输入环境名称' },
                  { max: 32, message: '长度不能超过 32' },
                ]}
              >
                <Input placeholder="例如：PRE" />
              </Form.Item>
            </Form>
          </div>
        ) : isGlobalVar ? (
          <>
            <Typography.Title level={5} style={{ margin: '0 0 8px 0' }}>
              全局变量
            </Typography.Title>
            <Tabs
              activeKey={globalMode}
              onChange={(k) => setGlobalMode(k as GlobalVariableMode)}
              tabBarExtraContent={
                <Space>
                  <Button onClick={handleExport}>导出</Button>
                  <Button onClick={handleImport}>导入</Button>
                </Space>
              }
              items={[
                {
                  key: 'dynamic',
                  label: (
                    <Tooltip title="自动管理用例步骤中提取的变量">
                      <Space size={4}>
                        动态变量
                        <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                      </Space>
                    </Tooltip>
                  ),
                },
                {
                  key: 'static',
                  label: (
                    <Tooltip title="由用户自定义生成的变量">
                      <Space size={4}>
                        静态变量
                        <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                      </Space>
                    </Tooltip>
                  ),
                },
              ]}
              style={{ marginBottom: 12 }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 12,
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              {globalMode === 'static' ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={addGlobalRow}>
                  添加变量
                </Button>
              ) : null}
              {globalMode === 'static' ? (
                <Button type="primary" onClick={handleSaveGlobal}>
                  保存
                </Button>
              ) : null}
              {globalMode === 'dynamic' ? (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Input
                    allowClear
                    placeholder="用例ID"
                    value={dynamicFilters.caseId}
                    onChange={(e) =>
                      setDynamicFilters((prev) => ({ ...prev, caseId: e.target.value }))
                    }
                    style={{ width: 140 }}
                  />
                  <Input
                    allowClear
                    placeholder="用例名称"
                    value={dynamicFilters.caseName}
                    onChange={(e) =>
                      setDynamicFilters((prev) => ({ ...prev, caseName: e.target.value }))
                    }
                    style={{ width: 160 }}
                  />
                  <Input
                    allowClear
                    placeholder="变量名"
                    value={dynamicFilters.name}
                    onChange={(e) =>
                      setDynamicFilters((prev) => ({ ...prev, name: e.target.value }))
                    }
                    style={{ width: 140 }}
                  />
                  <Input
                    allowClear
                    placeholder="所属模块"
                    value={dynamicFilters.moduleName}
                    onChange={(e) =>
                      setDynamicFilters((prev) => ({ ...prev, moduleName: e.target.value }))
                    }
                    style={{ width: 140 }}
                  />
                  <Button
                    onClick={() =>
                      setDynamicFilters({
                        caseId: '',
                        caseName: '',
                        name: '',
                        moduleName: '',
                      })
                    }
                  >
                    重置
                  </Button>
                </div>
              ) : (
                <Input.Search
                  allowClear
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="搜索变量名 / 值 / 描述"
                  style={{ width: 320, marginLeft: 'auto' }}
                />
              )}
            </div>
            {globalMode === 'dynamic' ? (
              <Table
                size="small"
                rowKey="id"
                columns={dynamicColumns}
                dataSource={filteredDynamicRows}
                pagination={{ pageSize: 8, showSizeChanger: true }}
              />
            ) : (
              <Table
                size="small"
                rowKey="id"
                columns={varColumns}
                dataSource={filteredGlobalRows}
                pagination={{ pageSize: 8, showSizeChanger: true }}
              />
            )}
          </>
        ) : isGlobalParam ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Typography.Title level={5} style={{ margin: 0 }}>
                全局参数
              </Typography.Title>
            </div>
            <Tabs
              activeKey={globalParamTab}
              onChange={(k) => setGlobalParamTab(k as GlobalParamTab)}
              items={[
                { key: 'headers', label: 'Headers' },
                { key: 'cookies', label: 'Cookies' },
              ]}
              style={{ marginBottom: 4 }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Button type="primary" onClick={addGlobalParamRow}>
                添加
              </Button>
              <Button type="primary" onClick={handleSaveGlobalParams}>
                保存
              </Button>
            </div>
            <Table
              size="small"
              rowKey="id"
              columns={globalParamColumns}
              dataSource={currentGlobalParamRows}
              pagination={{ pageSize: 8, showSizeChanger: true }}
            />
          </>
        ) : activeEnv ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Space align="center" size={4}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  {activeEnv.name}
                </Typography.Title>
                {activeEnv.builtin ? (
                  <Tooltip title="内置环境不可修改名称">
                    <Button type="text" size="small" disabled icon={<EditOutlined />} />
                  </Tooltip>
                ) : (
                  <Tooltip title="编辑环境名称">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openRenameEnv(activeEnv.key)}
                    />
                  </Tooltip>
                )}
              </Space>
              <Button type="primary" onClick={() => message.success('保存成功（Mock）')}>
                保存
              </Button>
            </div>

            <Card
              size="small"
              title="应用服务器"
              style={{ marginBottom: 12 }}
            >
              {activeEnv.servers.length ? (
                <Table
                  size="small"
                  rowKey="id"
                  columns={serverColumns}
                  dataSource={activeEnv.servers}
                  pagination={false}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无服务器" />
              )}
            </Card>

            <Tabs
              activeKey={envTab}
              onChange={(k) => setEnvTab(k as EnvVariableTab)}
              items={[
                { key: 'custom', label: '自定义环境变量' },
                { key: 'header', label: 'Headers' },
                { key: 'device', label: '设备配置' },
                { key: 'middleware', label: '中间件配置' },
              ]}
            />

            {envTab !== 'middleware' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={addEnvVariable}>
                  {envAddButtonLabel}
                </Button>
                <Input.Search
                  allowClear
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={envSearchPlaceholder}
                  style={{ width: 360 }}
                />
              </div>
            ) : null}
            {envTab === 'middleware' ? (
              <>
                <Tabs
                  size="small"
                  type="card"
                  activeKey={middlewareSubTab}
                  onChange={(k) => setMiddlewareSubTab(k as MiddlewarePresetId)}
                  items={MIDDLEWARE_PRESET_IDS.map((id) => ({
                    key: id,
                    label: MIDDLEWARE_PRESETS[id].label,
                  }))}
                  style={{ marginBottom: 12 }}
                />
                <Table<MiddlewareTableRow>
                  size="small"
                  rowKey="key"
                  columns={middlewareColumns}
                  dataSource={middlewareTableRows}
                  pagination={false}
                />
              </>
            ) : envTab === 'device' ? (
              <Table<DeviceRow>
                size="small"
                rowKey="id"
                columns={deviceColumns}
                dataSource={filteredDeviceRows}
                pagination={{ pageSize: 8, showSizeChanger: true }}
                scroll={{ x: 1200 }}
              />
            ) : (
              <Table<VariableRow>
                size="small"
                rowKey="id"
                columns={envVarColumns}
                dataSource={filteredEnvVariableRows}
                pagination={{ pageSize: 8, showSizeChanger: true }}
              />
            )}

            <Modal
              title={deviceEditingId ? '编辑设备' : '添加设备'}
              open={deviceModalOpen}
              destroyOnClose
              onCancel={() => {
                setDeviceModalOpen(false);
                setDeviceEditingId(null);
              }}
              onOk={submitDevice}
              okText="确定"
              cancelText="取消"
              width={560}
            >
              <Form form={deviceForm} layout="vertical">
                <Form.Item
                  name="deviceName"
                  label="设备名称"
                  rules={[{ required: true, message: '请输入设备名称' }]}
                >
                  <Input placeholder="请输入设备名称" />
                </Form.Item>
                <Form.Item name="protocol" label="协议" rules={[{ required: true, message: '请选择协议' }]}>
                  <Select options={deviceProtocolOptions} placeholder="请选择协议" />
                </Form.Item>
                <Form.Item name="ip" label="IP" rules={[{ required: true, message: '请输入 IP' }]}>
                  <Input placeholder="请输入 IP" />
                </Form.Item>
                <Form.Item name="port" label="端口" rules={[{ required: true, message: '请输入端口' }]}>
                  <Input placeholder="请输入端口" />
                </Form.Item>
                <Form.Item name="devsn" label="devsn">
                  <Input placeholder="请输入 devsn" />
                </Form.Item>
                <Form.Item name="phone" label="手机号">
                  <Input placeholder="请输入手机号" />
                </Form.Item>
                <Form.Item name="plateNo" label="车牌号">
                  <Input placeholder="例如 粤A12345" />
                </Form.Item>
                <Form.Item name="plateColor" label="车牌颜色">
                  <Input placeholder="例如 蓝、白色" />
                </Form.Item>
                <Form.Item name="remark" label="备注说明">
                  <Input.TextArea rows={2} placeholder="选填" />
                </Form.Item>
              </Form>
            </Modal>
          </>
        ) : (
          <Empty description="请选择变量域" />
        )}
      </Card>
    </div>

    <Modal
      title="导入 YAML"
      open={importOpen}
      destroyOnClose
      onCancel={() => {
        setImportOpen(false);
        setImportFileList([]);
      }}
      onOk={submitImportYaml}
      okText="导入"
      cancelText="取消"
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        请选择本地 YAML 文件（仅支持 .yaml / .yml）。
      </Typography.Paragraph>
      <Upload.Dragger {...importUploadProps}>
        <Typography.Text>点击或拖拽文件到此区域上传</Typography.Text>
      </Upload.Dragger>
    </Modal>

    <Modal
      title="重命名环境"
      open={renameOpen}
      destroyOnClose
      onCancel={() => {
        setRenameOpen(false);
        setRenameEnvKey(null);
      }}
      onOk={submitRenameEnv}
      okText="确定"
      cancelText="取消"
    >
      <Form form={renameForm} layout="vertical">
        <Form.Item
          label="环境名称"
          name="name"
          rules={[
            { required: true, message: '请输入环境名称' },
            { max: 32, message: '长度不能超过 32' },
          ]}
        >
          <Input placeholder="请输入环境名称" />
        </Form.Item>
      </Form>
    </Modal>
    </>
  );
}
