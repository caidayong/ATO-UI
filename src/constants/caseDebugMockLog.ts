/**
 * 用例详情「调试」Mock：每个步骤运行详情（按步骤类型区分）
 *
 * - V1.0.0：底部「调试结果」抽屉日志（已废弃，保留类型导出供过渡引用）
 * - V1.0.1：改为右侧抽屉，按步骤类型生成结构化 Mock，并支持单条步骤结果查询
 */
import type { CaseStep, CaseStepType } from '@/types';

/** 单条断言执行结果（Mock） */
export interface DebugAssertionLine {
  pass: boolean;
  /** 已格式化好的整行文本（与 Python 风格日志一致），便于直接渲染 */
  text: string;
}

interface DebugStepResultBase {
  /** 步骤序号（同 CaseStep.order） */
  order: number;
  /** 步骤标题（与左侧步骤栏一致） */
  title: string;
  ok: boolean;
  durationSec: string;
}

/** 接口请求 / 自定义接口请求 步骤运行详情 */
export interface DebugApiRequestResult extends DebugStepResultBase {
  kind: '接口请求';
  request: {
    method: string;
    url: string;
    startTime: string;
    headers: string;
    body: string;
  };
  response: {
    statusCode: number;
    body: string;
  };
  extracted: Array<{ name: string; value: string }>;
  assertions: DebugAssertionLine[];
}

/** 调用函数 步骤运行详情 */
export interface DebugFunctionCallResult extends DebugStepResultBase {
  kind: '调用函数';
  call: {
    functionName: string;
    args: string;
    startTime: string;
  };
  returnValue: string;
  extracted: Array<{ name: string; value: string }>;
  assertions: DebugAssertionLine[];
}

/** 数据库操作 步骤运行详情 */
export interface DebugDbOpResult extends DebugStepResultBase {
  kind: '数据库操作';
  query: {
    sql: string;
    startTime: string;
  };
  queryResult: string;
  extracted: Array<{ name: string; value: string }>;
  assertions: DebugAssertionLine[];
}

/** 等待 步骤运行详情 */
export interface DebugWaitResult extends DebugStepResultBase {
  kind: '等待';
  seconds: number;
}

/**
 * 其他类型步骤（if 判断、for 循环等）：以自由「键-值」列表展示运行时上下文
 * 仅展示通过/失败 + 可选 info 列表
 */
export interface DebugGenericResult extends DebugStepResultBase {
  kind: '其他';
  stepType: CaseStepType;
  /** 可选：以「键-值」形式自定义展示（用于 if 判断、for 循环等无标准 tab 的步骤） */
  info?: Array<{ label: string; value: string; mono?: boolean }>;
}

export type DebugStepResult =
  | DebugApiRequestResult
  | DebugFunctionCallResult
  | DebugDbOpResult
  | DebugWaitResult
  | DebugGenericResult;

/** 调试 Mock 时点，避免每次渲染抖动 */
function nowText(offsetSec: number): string {
  const base = new Date('2026-05-11T10:22:09Z').getTime() + offsetSec * 1000;
  const d = new Date(base);
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours() + 8
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

const SAMPLE_REQUEST_HEADERS = [
  'Content-Type: application/json;charset=UTF-8',
  'Accept: application/json, text/plain, */*',
  'User-Agent: AutoTestOneUI/1.0',
].join('\n');

const SAMPLE_RESPONSE_BODY = JSON.stringify(
  {
    code: 200,
    message: 'success',
    data: { id: 1885, total: 1, success: true },
  },
  null,
  2
);

const SAMPLE_FAIL_RESPONSE_BODY = JSON.stringify(
  {
    code: 1114,
    message: 'host clean failed',
    data: null,
  },
  null,
  2
);

/** 根据当前步骤上下文构造 Mock 运行详情（每个步骤一条） */
export interface BuildCaseDebugContext {
  steps: CaseStep[];
  stepTypeById: Record<string, CaseStepType>;
  /** 接口请求：方法/协议/主机/路径，未填则用占位 */
  requestMethodByStepId?: Record<string, string>;
  requestProtocolByStepId?: Record<string, string>;
  requestHostByStepId?: Record<string, string>;
  requestUrlByStepId?: Record<string, string>;
  requestBodyJsonByStepId?: Record<string, string>;
  /** 调用函数：第一条函数调用记录 */
  functionCallNameByStepId?: Record<string, string>;
  functionCallArgsByStepId?: Record<string, string>;
  /** 数据库操作：SQL */
  dbSqlByStepId?: Record<string, string>;
  /** 等待秒数 */
  waitSecondsByStepId?: Record<string, number>;
}

const SAMPLE_DB_RESULT = JSON.stringify(
  [
    { id: 1885, ip: '192.168.146.40', team_id: 1013 },
  ],
  null,
  2
);

/** 调用函数 Mock 样本（按步骤标题关键字命中优先，否则按索引兜底） */
interface FunctionMockSample {
  expression: string;
  returnValue: string;
  extracted: Array<{ name: string; value: string }>;
  assertions: DebugAssertionLine[];
}

const FUNCTION_MOCK_KEYWORD_SAMPLES: Array<{
  keywords: string[];
  build: () => FunctionMockSample;
}> = [
  {
    keywords: ['幂等', '订单号', 'uuid', 'random', '唯一'],
    build: () => ({
      expression: 'uuid(len=32)',
      returnValue: '"f4a2b9c1d6e84a3e8b27c5f1a9d0e6b3"',
      extracted: [{ name: 'order_no', value: 'f4a2b9c1d6e84a3e8b27c5f1a9d0e6b3' }],
      assertions: [
        { pass: true, text: "[ PASS ] 预期结果: len => equal_to => 32 <class 'int'> 实际结果: 32 <class 'int'>" },
      ],
    }),
  },
  {
    keywords: ['签名', 'sign', 'md5', '加密'],
    build: () => ({
      expression: 'md5(text="user=admin&ts=1747300929")',
      returnValue: '"6f1ed002ab5595859014ebf0951522d9"',
      extracted: [{ name: 'sign', value: '6f1ed002ab5595859014ebf0951522d9' }],
      assertions: [
        { pass: true, text: "[ PASS ] 预期结果: len => equal_to => 32 <class 'int'> 实际结果: 32 <class 'int'>" },
      ],
    }),
  },
  {
    keywords: ['手机', 'phone', '电话'],
    build: () => ({
      expression: 'random_phone(prefix="138")',
      returnValue: '"13898241057"',
      extracted: [{ name: 'phone', value: '13898241057' }],
      assertions: [
        { pass: true, text: "[ PASS ] 预期结果: startswith => equal_to => 138 <class 'str'> 实际结果: 138 <class 'str'>" },
      ],
    }),
  },
  {
    keywords: ['时间', '时间戳', 'timestamp', 'ts'],
    build: () => ({
      expression: 'now_ms()',
      returnValue: '1747300931408',
      extracted: [{ name: 'ts', value: '1747300931408' }],
      assertions: [
        { pass: true, text: "[ PASS ] 预期结果: > => equal_to => True <class 'bool'> 实际结果: True <class 'bool'>" },
      ],
    }),
  },
  {
    keywords: ['金额', '随机金额', 'amount'],
    build: () => ({
      expression: 'random_amount(min=0.01, max=9999.99)',
      returnValue: '7286.43',
      extracted: [{ name: 'amount', value: '7286.43' }],
      assertions: [
        { pass: true, text: "[ PASS ] 预期结果: range => equal_to => True <class 'bool'> 实际结果: True <class 'bool'>" },
      ],
    }),
  },
];

const FUNCTION_MOCK_FALLBACK_SAMPLES: FunctionMockSample[] = [
  {
    expression: 'uuid(len=10)',
    returnValue: '"a3F9zQ7bX2"',
    extracted: [{ name: 'rand_str', value: 'a3F9zQ7bX2' }],
    assertions: [
      { pass: true, text: "[ PASS ] 预期结果: len => equal_to => 10 <class 'int'> 实际结果: 10 <class 'int'>" },
    ],
  },
  {
    expression: 'generate_order_no(prefix="ORD")',
    returnValue: '"ORD20260511182209847"',
    extracted: [{ name: 'order_no', value: 'ORD20260511182209847' }],
    assertions: [
      { pass: true, text: "[ PASS ] 预期结果: startswith => equal_to => ORD <class 'str'> 实际结果: ORD <class 'str'>" },
    ],
  },
  {
    expression: 'now_ms()',
    returnValue: '1747300931408',
    extracted: [{ name: 'ts', value: '1747300931408' }],
    assertions: [
      { pass: true, text: "[ PASS ] 预期结果: > => equal_to => True <class 'bool'> 实际结果: True <class 'bool'>" },
    ],
  },
];

function pickFunctionMockSample(title: string, idx: number): FunctionMockSample {
  const hit = FUNCTION_MOCK_KEYWORD_SAMPLES.find((s) =>
    s.keywords.some((kw) => title.includes(kw))
  );
  if (hit) return hit.build();
  return FUNCTION_MOCK_FALLBACK_SAMPLES[idx % FUNCTION_MOCK_FALLBACK_SAMPLES.length];
}

export function buildCaseDebugResults(
  ctx: BuildCaseDebugContext
): DebugStepResult[] {
  const list = [...ctx.steps].sort((a, b) => a.order - b.order);
  return list.map((step, idx) => {
    const stepType = ctx.stepTypeById[step.id] ?? step.stepType ?? '接口请求';
    // Mock 策略：默认全部通过；当存在 4 个及以上步骤时让最后一个失败，便于演示
    const ok = !(list.length >= 4 && idx === list.length - 1);
    const startTime = nowText(idx);
    const base: DebugStepResultBase = {
      order: step.order,
      title: step.title,
      ok,
      durationSec: `${(0.05 + idx * 0.012).toFixed(3)} s`,
    };

    if (stepType === '接口请求' || stepType === '自定义接口请求') {
      const method = ctx.requestMethodByStepId?.[step.id] ?? 'GET';
      const protocol = ctx.requestProtocolByStepId?.[step.id] ?? 'http';
      const host = ctx.requestHostByStepId?.[step.id] ?? '192.168.143.134:21250';
      const path = ctx.requestUrlByStepId?.[step.id] ?? '/dcs/v1/protocol/upload';
      const proto = protocol === '默认' ? 'http' : protocol;
      const url = `${proto}://${host}${path.startsWith('/') ? '' : '/'}${path}`;
      const body = ctx.requestBodyJsonByStepId?.[step.id] ?? '';
      return {
        ...base,
        kind: '接口请求',
        request: {
          method,
          url,
          startTime,
          headers: SAMPLE_REQUEST_HEADERS,
          body,
        },
        response: {
          statusCode: ok ? 200 : 1114,
          body: ok ? SAMPLE_RESPONSE_BODY : SAMPLE_FAIL_RESPONSE_BODY,
        },
        extracted: ok
          ? [
              { name: 'token_cicd', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              { name: 'hostCleanId', value: '1885' },
            ]
          : [],
        assertions: ok
          ? [
              { pass: true, text: "[ PASS ] 预期结果: None => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>" },
              { pass: true, text: "[ PASS ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>" },
            ]
          : [
              { pass: false, text: "[ FAIL ] 预期结果: data.success => equal_to => True <class 'bool'> 实际结果: None <class 'NoneType'>" },
              { pass: false, text: "[ FAIL ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 1114 <class 'int'>" },
            ],
      };
    }

    if (stepType === '调用函数') {
      const sample = pickFunctionMockSample(step.title, idx);
      const userFn = (ctx.functionCallNameByStepId?.[step.id] ?? '').trim();
      const userArgs = (ctx.functionCallArgsByStepId?.[step.id] ?? '').trim();
      // 优先使用用户选择的函数签名；若没有，则用样本表达式
      const expression = userFn
        ? userFn.includes('(')
          ? userFn
          : `${userFn}(${userArgs})`
        : sample.expression;
      // 将 functionName 字段直接置为最终展示表达式，并把 args 留空，避免抽屉再次拼接
      return {
        ...base,
        kind: '调用函数',
        call: {
          functionName: expression,
          args: '',
          startTime,
        },
        returnValue: ok
          ? sample.returnValue
          : '抛出异常：TypeError: missing 1 required positional argument',
        extracted: ok ? sample.extracted : [],
        assertions: ok
          ? sample.assertions
          : [
              {
                pass: false,
                text: "[ FAIL ] 预期结果: 调用成功 => equal_to => True <class 'bool'> 实际结果: False <class 'bool'>",
              },
            ],
      };
    }

    if (stepType === '数据库操作') {
      const sql = ctx.dbSqlByStepId?.[step.id] ?? 'SELECT id, ip, team_id FROM host WHERE ip = "192.168.146.40";';
      return {
        ...base,
        kind: '数据库操作',
        query: { sql, startTime },
        queryResult: ok ? SAMPLE_DB_RESULT : '查询失败：Timeout after 30s',
        extracted: ok ? [{ name: 'hostId', value: '1885' }] : [],
        assertions: ok
          ? [{ pass: true, text: "[ PASS ] 预期结果: rowCount => equal_to => 1 <class 'int'> 实际结果: 1 <class 'int'>" }]
          : [{ pass: false, text: "[ FAIL ] 预期结果: rowCount => equal_to => 1 <class 'int'> 实际结果: 0 <class 'int'>" }],
      };
    }

    if (stepType === '等待') {
      const seconds = ctx.waitSecondsByStepId?.[step.id] ?? 1;
      return {
        ...base,
        kind: '等待',
        seconds,
        durationSec: `${seconds.toFixed(3)} s`,
      };
    }

    return {
      ...base,
      kind: '其他',
      stepType,
    };
  });
}
