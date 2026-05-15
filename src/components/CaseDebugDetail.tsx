/**
 * @component 用例「调试 / 运行」单步详情展示
 * @base
 *   - src/pages/CaseManagement.tsx「调试结果右侧抽屉」
 *   - src/pages/TestRunDetail.tsx「测试报告 → 用例详情抽屉」
 *
 * 统一对外暴露的小组件：
 *   - DebugSection：带标签的代码块/普通块（用于「请求地址」「请求头」「请求体」等）
 *   - DebugExtractedTable：变量提取结果列表
 *   - DebugAssertionList：断言执行结果列表（PASS 绿、FAIL 红）
 *   - DebugStepResultHeader：步骤详情顶部标题（通过/失败图标 + 步骤名 + 耗时 + 状态 Tag）
 *   - DebugStepDetailTabs：按步骤类型分 Tab 渲染（实际请求 / 结果 / 变量提取 / 断言）
 */
import { useEffect, useState } from 'react';
import { Empty, Space, Table, Tabs, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type {
  DebugApiRequestResult,
  DebugDbOpResult,
  DebugFunctionCallResult,
  DebugStepResult,
  DebugWaitResult,
} from '@/constants/caseDebugMockLog';

const { Text } = Typography;

export function DebugSection({
  label,
  value,
  mono = true,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Text>
      <pre
        style={{
          margin: '4px 0 0',
          padding: hasValue ? '8px 10px' : 0,
          background: hasValue ? '#fafafa' : 'transparent',
          border: hasValue ? '1px solid #f0f0f0' : 'none',
          borderRadius: 4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          fontSize: 12,
          fontFamily: mono
            ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            : undefined,
          color: hasValue ? '#262626' : '#bfbfbf',
        }}
      >
        {hasValue ? String(value) : '（无）'}
      </pre>
    </div>
  );
}

export function DebugExtractedTable({
  rows,
}: {
  rows: Array<{ name: string; value: string }>;
}) {
  if (!rows.length) return <Empty description="无变量提取" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <Table
      size="small"
      pagination={false}
      rowKey="name"
      dataSource={rows}
      columns={[
        { title: '变量名', dataIndex: 'name', width: 160 },
        {
          title: '实际值',
          dataIndex: 'value',
          render: (v: string) => (
            <Text
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 12,
                wordBreak: 'break-all',
              }}
            >
              {v}
            </Text>
          ),
        },
      ]}
    />
  );
}

export function DebugAssertionList({
  rows,
}: {
  rows: Array<{ pass: boolean; text: string }>;
}) {
  if (!rows.length) return <Empty description="无断言" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <div>
      {rows.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
            wordBreak: 'break-all',
            color: line.pass ? '#237804' : '#cf1322',
            marginBottom: 6,
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}

/** 步骤详情顶部标题（不含关闭按钮等容器级控件） */
export function DebugStepResultHeader({ result }: { result: DebugStepResult | null }) {
  if (!result) {
    return <Text strong>步骤运行详情</Text>;
  }
  return (
    <Space size={8} wrap>
      {result.ok ? (
        <CheckCircleOutlined style={{ color: '#52c41a', flex: '0 0 auto' }} />
      ) : (
        <CloseCircleOutlined style={{ color: '#ff4d4f', flex: '0 0 auto' }} />
      )}
      <Text strong>{`步骤 ${result.order} · ${result.title}`}</Text>
      <Tag color={result.ok ? 'success' : 'error'} style={{ marginInlineEnd: 0 }}>
        {result.ok ? '通过' : '失败'}
      </Tag>
      <Text type="secondary" style={{ fontSize: 12 }}>
        耗时 {result.durationSec}
      </Text>
    </Space>
  );
}

/** 按步骤类型渲染 Tab 内容；统一顺序：实际请求 → 结果 → 变量提取 → 断言 */
export function DebugStepDetailTabs({ result }: { result: DebugStepResult | null }) {
  type TabKey = 'actual' | 'extract' | 'response' | 'assert' | 'return' | 'result';
  const [activeTab, setActiveTab] = useState<TabKey>('actual');

  useEffect(() => {
    setActiveTab('actual');
  }, [result?.order, result?.kind]);

  if (!result) return <Empty description="暂无运行结果" />;

  const apiTabKeys = new Set<TabKey>(['actual', 'response', 'extract', 'assert']);
  const fnTabKeys = new Set<TabKey>(['actual', 'return', 'extract', 'assert']);
  const dbTabKeys = new Set<TabKey>(['actual', 'result', 'extract', 'assert']);

  if (result.kind === '接口请求') {
    const r = result as DebugApiRequestResult;
    return (
      <Tabs
        activeKey={apiTabKeys.has(activeTab) ? activeTab : 'actual'}
        onChange={(k) => setActiveTab(k as TabKey)}
        items={[
          {
            key: 'actual',
            label: '实际请求',
            children: (
              <div>
                <DebugSection label="请求地址" value={`${r.request.method} ${r.request.url}`} />
                <DebugSection label="请求开始时间" value={r.request.startTime} mono={false} />
                <DebugSection label="请求头" value={r.request.headers} />
                <DebugSection label="请求体" value={r.request.body} />
              </div>
            ),
          },
          {
            key: 'response',
            label: '接口响应',
            children: (
              <div>
                <DebugSection label="响应状态码" value={String(r.response.statusCode)} mono={false} />
                <DebugSection label="响应体" value={r.response.body} />
              </div>
            ),
          },
          { key: 'extract', label: '变量提取', children: <DebugExtractedTable rows={r.extracted} /> },
          { key: 'assert', label: '断言', children: <DebugAssertionList rows={r.assertions} /> },
        ]}
      />
    );
  }

  if (result.kind === '调用函数') {
    const r = result as DebugFunctionCallResult;
    const expression = (() => {
      const name = (r.call.functionName ?? '').trim();
      const args = (r.call.args ?? '').trim();
      if (!name) return '（无）';
      if (name.includes('(')) return name;
      return `${name}(${args})`;
    })();
    return (
      <Tabs
        activeKey={fnTabKeys.has(activeTab) ? activeTab : 'actual'}
        onChange={(k) => setActiveTab(k as TabKey)}
        items={[
          {
            key: 'actual',
            label: '实际请求',
            children: (
              <div>
                <DebugSection label="函数调用" value={expression} />
                <DebugSection label="调用时间" value={r.call.startTime} mono={false} />
              </div>
            ),
          },
          {
            key: 'return',
            label: '函数返回',
            children: <DebugSection label="返回值" value={r.returnValue} />,
          },
          { key: 'extract', label: '变量提取', children: <DebugExtractedTable rows={r.extracted} /> },
          { key: 'assert', label: '断言', children: <DebugAssertionList rows={r.assertions} /> },
        ]}
      />
    );
  }

  if (result.kind === '数据库操作') {
    const r = result as DebugDbOpResult;
    return (
      <Tabs
        activeKey={dbTabKeys.has(activeTab) ? activeTab : 'actual'}
        onChange={(k) => setActiveTab(k as TabKey)}
        items={[
          {
            key: 'actual',
            label: '实际请求',
            children: (
              <div>
                <DebugSection label="SQL 语句" value={r.query.sql} />
                <DebugSection label="调用时间" value={r.query.startTime} mono={false} />
              </div>
            ),
          },
          {
            key: 'result',
            label: '查询结果',
            children: <DebugSection label="结果集" value={r.queryResult} />,
          },
          { key: 'extract', label: '变量提取', children: <DebugExtractedTable rows={r.extracted} /> },
          { key: 'assert', label: '断言', children: <DebugAssertionList rows={r.assertions} /> },
        ]}
      />
    );
  }

  if (result.kind === '等待') {
    const r = result as DebugWaitResult;
    return <DebugSection label="等待时长" value={`${r.seconds} 秒`} mono={false} />;
  }

  // '其他' 兜底类型（含 if 判断 / for 循环）：若提供了 info 则按键-值列展示
  if (result.info?.length) {
    return (
      <div>
        {result.info.map((entry, i) => (
          <DebugSection
            key={`${entry.label}-${i}`}
            label={entry.label}
            value={entry.value}
            mono={entry.mono ?? false}
          />
        ))}
      </div>
    );
  }
  return (
    <Empty
      description={`暂不支持「${result.stepType}」类型步骤详情`}
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    />
  );
}
