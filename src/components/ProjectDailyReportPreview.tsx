import { Card, Col, Empty, Row, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  DailyGeneratedReport,
  DailyReportBugRow,
  DailyReportPieSlice,
  DailyReportProgressRow,
} from '@/types/dailyReportGenerated';

const { Title, Text, Paragraph } = Typography;

const PIE_COLORS = ['#1677ff', '#faad14', '#52c41a', '#f5222d', '#722ed1', '#13c2c2'];

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, percent))}%`,
            height: '100%',
            background: '#1677ff',
            borderRadius: 4,
          }}
        />
      </div>
      <Text strong style={{ color: '#1677ff', flexShrink: 0 }}>
        {percent}%
      </Text>
    </div>
  );
}

function ReportPie({ title, data }: { title: string; data: DailyReportPieSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) {
    return (
      <Card size="small" title={title}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无数据" />
      </Card>
    );
  }

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;
  let angle = -Math.PI / 2;
  const slices = data.map((item, i) => {
    const sweep = (2 * Math.PI * item.value) / total;
    const pct = (item.value / total) * 100;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const end = angle + sweep;
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const slice = { d, color: PIE_COLORS[i % PIE_COLORS.length], name: item.name, value: item.value, pct };
    angle = end;
    return slice;
  });

  return (
    <Card size="small" title={title}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
          {slices.map((s, idx) => (
            <path key={idx} d={s.d} fill={s.color} stroke="#fff" strokeWidth={1} />
          ))}
        </svg>
        <div style={{ minWidth: 160 }}>
          {slices.map((s, idx) => (
            <div key={idx} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                <Text>{s.name}</Text>
                <Text strong>{s.pct % 1 === 0 ? s.pct.toFixed(0) : s.pct.toFixed(1)}%</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 18 }}>
                数量 {s.value}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

const progressColumns: ColumnsType<DailyReportProgressRow> = [
  { title: '项目', dataIndex: 'productName', width: 120 },
  { title: '测试阶段', dataIndex: 'phase', width: 100 },
  {
    title: '测试进度',
    dataIndex: 'progressPercent',
    width: 160,
    render: (v: number) => <ProgressBar percent={v} />,
  },
  { title: '测试结论', dataIndex: 'conclusion', width: 100 },
  { title: '开始时间', dataIndex: 'startAt', width: 110 },
  { title: '结束时间', dataIndex: 'endAt', width: 110 },
];

const bugColumns: ColumnsType<DailyReportBugRow> = [
  { title: '编号', dataIndex: 'id', width: 100 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '严重程度', dataIndex: 'severity', width: 90 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
];

export function ProjectDailyReportPreview({
  report,
  sectionsOnly,
}: {
  report: DailyGeneratedReport;
  /** 仅展示不可编辑的尾部章节（五、六） */
  sectionsOnly?: boolean;
}) {
  const d = report.defectSummary;
  const c = report.caseSummary;

  if (sectionsOnly) {
    return (
      <>
        <Title level={5} style={{ marginTop: 24 }}>
          五、L1&amp;L2 Bug 清单
        </Title>
        {report.l1l2Bugs.length ? (
          <Table
            size="small"
            columns={bugColumns}
            dataSource={report.l1l2Bugs}
            pagination={false}
            bordered
            rowKey="id"
          />
        ) : (
          <Text type="secondary">无</Text>
        )}
        <Title level={5} style={{ marginTop: 24 }}>
          六、缺陷分布图
        </Title>
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <ReportPie title="按 Bug 状态统计" data={report.bugsByStatus} />
          </Col>
          <Col xs={24} lg={12}>
            <ReportPie title="按 Bug 严重程度统计" data={report.bugsBySeverity} />
          </Col>
        </Row>
      </>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: '24px 28px',
      }}
    >
      <Paragraph style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>
        {report.openingGreeting}
      </Paragraph>
      <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{report.openingProgressText}</Paragraph>
      <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{report.summaryText}</Paragraph>
      {report.mentionNote ? <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{report.mentionNote}</Paragraph> : null}

      <Title level={5} style={{ marginTop: 24 }}>
        一、测试进度
      </Title>
      <Table
        size="small"
        rowKey="phase"
        columns={progressColumns}
        dataSource={report.progressRows}
        pagination={false}
        bordered
      />

      <Title level={5} style={{ marginTop: 24 }}>
        二、缺陷情况
      </Title>
      <Table
        size="small"
        pagination={false}
        bordered
        columns={[
          { title: '累计 Bug 数', dataIndex: 'cumulative' },
          { title: '今日新增', dataIndex: 'newToday' },
          { title: '未关闭', dataIndex: 'unclosed' },
          { title: '待验证', dataIndex: 'toVerify' },
          {
            title: '未解决',
            dataIndex: 'unresolved',
            render: (v: number) => <Text type="danger">{v}</Text>,
          },
          {
            title: 'L1/L2 未解决',
            dataIndex: 'l1l2Unresolved',
            render: (v: number) => <Text type="danger">{v}</Text>,
          },
          { title: '延期', dataIndex: 'postponed' },
        ]}
        dataSource={[d]}
        rowKey="cumulative"
      />

      <Title level={5} style={{ marginTop: 24 }}>
        三、用例情况
      </Title>
      <Table
        size="small"
        pagination={false}
        bordered
        columns={[
          { title: '用例总数', dataIndex: 'total' },
          { title: '累计执行', dataIndex: 'executed' },
          { title: '通过', dataIndex: 'passed' },
          { title: '失败', dataIndex: 'failed', render: (v: number) => <Text type="danger">{v}</Text> },
          { title: '阻塞', dataIndex: 'blocked', render: (v: number) => <Text type="danger">{v}</Text> },
          { title: '执行率', dataIndex: 'execRate' },
          { title: '通过率', dataIndex: 'passRate' },
        ]}
        dataSource={[c]}
        rowKey="total"
      />

      <Title level={5} style={{ marginTop: 24 }}>
        四、测试风险
      </Title>
      {report.risks.length === 1 && report.risks[0] === '无' ? (
        <Text type="secondary">无</Text>
      ) : (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {report.risks.map((line, i) => (
            <div
              key={i}
              style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4, whiteSpace: 'pre-wrap' }}
            >
              {line}
            </div>
          ))}
        </Space>
      )}

      <Title level={5} style={{ marginTop: 24 }}>
        五、L1&amp;L2 Bug 清单
      </Title>
      {report.l1l2Bugs.length ? (
        <Table size="small" columns={bugColumns} dataSource={report.l1l2Bugs} pagination={false} bordered rowKey="id" />
      ) : (
        <Text type="secondary">无</Text>
      )}

      <Title level={5} style={{ marginTop: 24 }}>
        六、缺陷分布图
      </Title>
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <ReportPie title="按 Bug 状态统计" data={report.bugsByStatus} />
        </Col>
        <Col xs={24} lg={12}>
          <ReportPie title="按 Bug 严重程度统计" data={report.bugsBySeverity} />
        </Col>
      </Row>
    </div>
  );
}
