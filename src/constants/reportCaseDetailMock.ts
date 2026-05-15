/**
 * 测试报告·用例运行详情 Mock（多页共用）
 *
 * 使用方：
 *   - src/pages/TestRunDetail.tsx「测试运行 → 测试报告 → 用例详情抽屉」
 *   - src/pages/PlatformAutomationTaskDetail.tsx「平台自动化 → 任务详情 → 测试报告 → 用例详情抽屉」
 *
 * 数据模型直接使用 `DebugStepResult[]`，与「用例管理 → 调试运行」抽屉保持一致；
 * tc-1 覆盖全部 7 种步骤类型（接口请求 / 自定义接口请求 / 调用函数 / 数据库操作 / if 判断 / for 循环 / 等待），便于需求澄清。
 */
import type { DebugStepResult } from '@/constants/caseDebugMockLog';

export type CaseRunDetail = {
  caseName: string;
  tags: string[];
  /** 用例总结果：用例所有步骤是否通过（与表格中「运行结果」一致） */
  caseResult: 'pass' | 'fail';
  steps: DebugStepResult[];
};

/**
 * 简化构造接口请求步骤结果的工具（避免每条 Mock 重复字段）
 * - response.statusCode 默认 200（pass）/ 500（fail）
 * - assertions 接受字符串数组，按 [ PASS ] / [ FAIL ] 自动着色
 */
export function buildApiStep(input: {
  order: number;
  title: string;
  ok: boolean;
  method: string;
  url: string;
  startTime: string;
  durationSec: string;
  headers?: string;
  body?: string;
  responseBody?: string;
  responseStatus?: number;
  extracted?: Array<{ name: string; value: string }>;
  assertions: string[];
}): DebugStepResult {
  return {
    kind: '接口请求',
    order: input.order,
    title: input.title,
    ok: input.ok,
    durationSec: input.durationSec,
    request: {
      method: input.method,
      url: input.url,
      startTime: input.startTime,
      headers: input.headers ?? '',
      body: input.body ?? '',
    },
    response: {
      statusCode: input.responseStatus ?? (input.ok ? 200 : 500),
      body: input.responseBody ?? '',
    },
    extracted: input.extracted ?? [],
    assertions: input.assertions.map((text) => ({
      pass: text.includes('[ PASS ]'),
      text,
    })),
  };
}

export const REPORT_CASE_DETAIL_BY_ID: Record<string, CaseRunDetail> = {
  // 创建订单-正常流：覆盖全部 7 种步骤类型，便于需求澄清
  'tc-1': {
    caseName: '创建订单-正常流',
    tags: ['smoke', 'P0'],
    caseResult: 'pass',
    steps: [
      buildApiStep({
        order: 1,
        title: '第一步：[接口请求] 查询用户与商品前置数据',
        ok: true,
        method: 'GET',
        url: 'http://129.204.45.218:8099/api/sku/SKU-001?userId=U-1001',
        startTime: '2026-03-16 18:03:07',
        durationSec: '0.069 s',
        headers: `{
  "host": "129.204.45.218:8099",
  "accept": "*/*",
  "user-agent": "python-httpx/0.28.1",
  "content-type": "application/json"
}`,
        body: '',
        responseBody: `{
  "code": 200,
  "data": {
    "userId": "U-1001",
    "skuId": "SKU-001",
    "stock": 12,
    "price": 199.00
  }
}`,
        extracted: [
          { name: 'userId', value: 'U-1001' },
          { name: 'skuId', value: 'SKU-001' },
          { name: 'stock', value: '12' },
        ],
        assertions: [
          "[ PASS ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
          "[ PASS ] 预期结果: data.stock => greater_than => 0 <class 'int'> 实际结果: 12 <class 'int'>",
        ],
      }),
      buildApiStep({
        order: 2,
        title: '第二步：[自定义接口请求] 模拟渠道网关签名回调',
        ok: true,
        method: 'POST',
        url: 'http://gateway.mock/cb/channel/sign',
        startTime: '2026-03-16 18:03:08',
        durationSec: '0.082 s',
        headers: `{
  "X-Gateway-Sign": "6f1ed002ab5595859014ebf0951522d9",
  "X-Timestamp": "1742125388000",
  "Content-Type": "application/json"
}`,
        body: `{
  "channelId": "WeChatPay",
  "encrypted": "AES256/CBC/PKCS7Padding base64..."
}`,
        responseBody: `{ "code": 200, "channelToken": "CH-TK-49281", "expiresIn": 1800 }`,
        extracted: [{ name: 'channelToken', value: 'CH-TK-49281' }],
        assertions: [
          "[ PASS ] 预期结果: channelToken => not_empty => True <class 'bool'> 实际结果: True <class 'bool'>",
        ],
      }),
      {
        kind: '调用函数',
        order: 3,
        title: '第三步：[调用函数] 生成幂等键与随机订单号',
        ok: true,
        durationSec: '0.012 s',
        call: {
          functionName: 'uuid(len=32)',
          args: '',
          startTime: '2026-03-16 18:03:08',
        },
        returnValue: '"f4a2b9c1d6e84a3e8b27c5f1a9d0e6b3"',
        extracted: [
          { name: 'idempotencyKey', value: 'f4a2b9c1d6e84a3e8b27c5f1a9d0e6b3' },
          { name: 'orderNo', value: 'PAY20260316180308124' },
        ],
        assertions: [
          {
            pass: true,
            text: "[ PASS ] 预期结果: len(idempotencyKey) => equal_to => 32 <class 'int'> 实际结果: 32 <class 'int'>",
          },
        ],
      },
      {
        kind: '数据库操作',
        order: 4,
        title: '第四步：[数据库操作] 插入待支付订单行',
        ok: true,
        durationSec: '0.045 s',
        query: {
          sql: `INSERT INTO t_order (order_no, user_id, sku_id, qty, status, idempotency_key, created_at)
VALUES ('PAY20260316180308124', 'U-1001', 'SKU-001', 1, 'CREATED', 'f4a2b9c1d6e84a3e8b27c5f1a9d0e6b3', NOW());`,
          startTime: '2026-03-16 18:03:08',
        },
        queryResult: '1 row affected',
        extracted: [{ name: 'orderId', value: '88231' }],
        assertions: [
          {
            pass: true,
            text: "[ PASS ] 预期结果: rowCount => equal_to => 1 <class 'int'> 实际结果: 1 <class 'int'>",
          },
        ],
      },
      {
        kind: '其他',
        order: 5,
        title: '第五步：[if 判断] 分支：库存是否充足',
        ok: true,
        durationSec: '0.001 s',
        stepType: 'if判断',
        info: [
          { label: '条件表达式', value: '${stock} >= ${buyQty}', mono: true },
          { label: '实际值', value: 'stock=12, buyQty=1 → True', mono: false },
          { label: '命中分支', value: '真分支：继续下单接口', mono: false },
          { label: '执行时间', value: '2026-03-16 18:03:08', mono: false },
        ],
      },
      {
        kind: '其他',
        order: 6,
        title: '第六步：[for 循环] 轮询支付结果',
        ok: true,
        durationSec: '2.130 s',
        stepType: 'for循环',
        info: [
          { label: '循环变量', value: 'i', mono: true },
          { label: '迭代范围', value: '1 → 10', mono: false },
          { label: '间隔', value: '500 ms', mono: false },
          {
            label: '退出条件',
            value: "${payStatus} in ('SUCCESS', 'FAIL')",
            mono: true,
          },
          { label: '实际迭代次数', value: '5 次', mono: false },
          { label: '退出原因', value: '命中退出条件：payStatus = SUCCESS', mono: false },
          { label: '开始时间', value: '2026-03-16 18:03:09', mono: false },
        ],
      },
      {
        kind: '等待',
        order: 7,
        title: '第七步：[等待] 等待异步账务落库',
        ok: true,
        durationSec: '2.000 s',
        seconds: 2,
      },
    ],
  },
  'tc-2': {
    caseName: '创建订单-库存不足',
    tags: ['异常'],
    caseResult: 'fail',
    steps: [
      buildApiStep({
        order: 1,
        title: '第一步：[接口请求] POST /api/orders',
        ok: true,
        method: 'POST',
        url: 'http://129.204.45.218:8099/api/orders',
        startTime: '2026-03-16 18:05:11',
        durationSec: '0.121 s',
        headers: '{"content-type":"application/json"}',
        body: '{ "sku": "SKU-001", "count": 9999 }',
        responseBody: '{ "code": 400, "message": "库存不足" }',
        responseStatus: 400,
        assertions: [
          "[ PASS ] 预期结果: code => equal_to => 400 <class 'int'> 实际结果: 400 <class 'int'>",
        ],
      }),
      buildApiStep({
        order: 2,
        title: '第二步：[断言] 订单创建应成功',
        ok: false,
        method: '',
        url: '-',
        startTime: '2026-03-16 18:05:11',
        durationSec: '0.001 s',
        responseStatus: 400,
        assertions: [
          "[ FAIL ] 预期结果: success => equal_to => true <class 'bool'> 实际结果: false <class 'bool'>",
        ],
      }),
    ],
  },
  'tc-5': {
    caseName: '优惠券核销-正常流',
    tags: ['coupon', 'P1'],
    caseResult: 'pass',
    steps: [
      buildApiStep({
        order: 1,
        title: '第一步：[接口请求] POST /coupon/verify',
        ok: true,
        method: 'POST',
        url: 'http://129.204.45.218:8099/coupon/verify',
        startTime: '2026-03-16 18:06:02',
        durationSec: '0.054 s',
        body: '{ "couponCode": "CPN-123" }',
        assertions: [
          "[ PASS ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
        ],
      }),
      buildApiStep({
        order: 2,
        title: '第二步：[接口请求] POST /coupon/redeem',
        ok: true,
        method: 'POST',
        url: 'http://129.204.45.218:8099/coupon/redeem',
        startTime: '2026-03-16 18:06:03',
        durationSec: '0.088 s',
        body: '{ "couponCode": "CPN-123", "orderId": "OD-888" }',
        assertions: [
          "[ PASS ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
        ],
      }),
    ],
  },
  'tc-6': {
    caseName: '风控拦截-高风险用户',
    tags: ['risk'],
    caseResult: 'pass',
    steps: [
      buildApiStep({
        order: 1,
        title: '第一步：[接口请求] GET /risk/score',
        ok: true,
        method: 'GET',
        url: 'http://129.204.45.218:8099/risk/score?userId=U-1001',
        startTime: '2026-03-16 18:07:20',
        durationSec: '0.041 s',
        assertions: [
          "[ PASS ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
          "[ PASS ] 预期结果: data.score => greater_than => 80 <class 'int'> 实际结果: 92 <class 'int'>",
        ],
      }),
      buildApiStep({
        order: 2,
        title: '第二步：[接口请求] POST /orders/create',
        ok: true,
        method: 'POST',
        url: 'http://129.204.45.218:8099/orders/create',
        startTime: '2026-03-16 18:07:21',
        durationSec: '0.067 s',
        responseBody: '{ "code": 403, "message": "风控拦截" }',
        responseStatus: 403,
        assertions: [
          "[ PASS ] 预期结果: code => equal_to => 403 <class 'int'> 实际结果: 403 <class 'int'>",
        ],
      }),
    ],
  },
  'tc-7': {
    caseName: '日终对账-差异检测',
    tags: ['recon'],
    caseResult: 'fail',
    steps: [
      buildApiStep({
        order: 1,
        title: '第一步：[接口请求] POST /recon/start',
        ok: true,
        method: 'POST',
        url: 'http://129.204.45.218:8099/recon/start',
        startTime: '2026-03-16 18:08:10',
        durationSec: '0.093 s',
        assertions: [
          "[ PASS ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
        ],
      }),
      buildApiStep({
        order: 2,
        title: '第二步：[接口请求] GET /recon/result',
        ok: false,
        method: 'GET',
        url: 'http://129.204.45.218:8099/recon/result?batchId=RB-1',
        startTime: '2026-03-16 18:08:22',
        durationSec: '0.120 s',
        responseBody: '{ "code": 500, "message": "对账服务异常" }',
        responseStatus: 500,
        assertions: [
          "[ FAIL ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 500 <class 'int'>",
        ],
      }),
    ],
  },
};
