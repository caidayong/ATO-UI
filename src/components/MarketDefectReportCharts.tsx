import { Card, Col, Empty, Row, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BuiltReportBlock, ChartKind, ReportAggRow } from '@/utils/marketDefectReportDataset';

const PIE_COLORS = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16',
  '#2f54eb',
  '#389e0d',
];

function PieSvg({
  data,
  size = 200,
  stackLegend,
}: {
  data: ReportAggRow[];
  size?: number;
  /** 图与表横排时：图例置于饼图下方，收窄横向占位 */
  stackLegend?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无数据" />;
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;
  let angle = -Math.PI / 2;
  const paths: {
    d: string;
    color: string;
    name: string;
    value: number;
    fullCircle: boolean;
    startAngle: number;
    sweep: number;
    pct: number;
  }[] = [];

  data.forEach((slice, i) => {
    const sweep = (2 * Math.PI * slice.value) / total;
    const pct = (slice.value / total) * 100;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const end = angle + sweep;
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    const fullCircle = sweep >= 2 * Math.PI - 1e-6;
    const d = fullCircle ? '' : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    paths.push({
      d,
      color: PIE_COLORS[i % PIE_COLORS.length],
      name: slice.name,
      value: slice.value,
      fullCircle: Boolean(fullCircle),
      startAngle: angle,
      sweep,
      pct,
    });
    angle = end;
  });

  const labelRadius = r * 0.58;
  const showSliceLabel = (p: (typeof paths)[0]) =>
    !p.fullCircle && p.pct >= 4 && p.sweep >= (8 * Math.PI) / 180;

  const legendBlock = (
    <div style={{ width: stackLegend ? '100%' : undefined, minWidth: stackLegend ? undefined : 200, maxWidth: 320 }}>
      {paths.map((p, idx) => (
        <div key={idx} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
            <Typography.Text ellipsis style={{ flex: 1 }} title={p.name}>
              {p.name}
            </Typography.Text>
            <Typography.Text strong style={{ flexShrink: 0 }}>
              {p.pct % 1 === 0 ? p.pct.toFixed(0) : p.pct.toFixed(1)}%
            </Typography.Text>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 18, display: 'block' }}>
            数量 {p.value}
          </Typography.Text>
        </div>
      ))}
    </div>
  );

  const svgBlock = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="饼图">
        {paths.map((p, idx) =>
          p.fullCircle ? (
            <circle key={`c-${idx}`} cx={cx} cy={cy} r={r} fill={p.color} stroke="#fff" strokeWidth={1} />
          ) : (
            <path key={`p-${idx}`} d={p.d} fill={p.color} stroke="#fff" strokeWidth={1} />
          ),
        )}
        {paths.map((p, idx) => {
          if (!showSliceLabel(p)) return null;
          const mid = p.startAngle + p.sweep / 2;
          const tx = cx + labelRadius * Math.cos(mid);
          const ty = cy + labelRadius * Math.sin(mid);
          const pctText = `${p.pct % 1 === 0 ? p.pct.toFixed(0) : p.pct.toFixed(1)}%`;
          return (
            <text
              key={`t-${idx}`}
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize={11}
              fontWeight={600}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={2}
              paintOrder="stroke fill"
            >
              {pctText}
            </text>
          );
        })}
        {paths.some((p) => p.fullCircle) ? (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={14}
            fontWeight={600}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={2}
            paintOrder="stroke fill"
          >
            {`${paths[0].pct % 1 === 0 ? paths[0].pct.toFixed(0) : paths[0].pct.toFixed(1)}%`}
          </text>
        ) : null}
    </svg>
  );

  if (stackLegend) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
        {svgBlock}
        {legendBlock}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
      {svgBlock}
      {legendBlock}
    </div>
  );
}

function BarHoriz({ data, maxHeight }: { data: ReportAggRow[]; maxHeight?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0 || max <= 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无数据" />;
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxHeight: maxHeight ?? undefined,
        overflowY: maxHeight != null ? 'auto' : undefined,
        paddingRight: maxHeight != null ? 4 : undefined,
      }}
    >
      {data.map((row, i) => (
        <div key={row.name + i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Typography.Text ellipsis style={{ maxWidth: '55%' }} title={row.name}>
              {row.name}
            </Typography.Text>
            <Typography.Text type="secondary">{row.value}</Typography.Text>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 4,
              background: '#f0f0f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(row.value / max) * 100}%`,
                height: '100%',
                background: PIE_COLORS[i % PIE_COLORS.length],
                borderRadius: 4,
                minWidth: row.value > 0 ? 4 : 0,
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const statColumns: ColumnsType<ReportAggRow & { ratio: string }> = [
  { title: '分类', dataIndex: 'name', ellipsis: true },
  { title: '数量', dataIndex: 'value', width: 72 },
  { title: '占比', dataIndex: 'ratio', width: 72 },
];

export function ReportStatBlock({
  title,
  subtitle,
  chart,
  rows,
  totalCount,
}: {
  title: string;
  subtitle?: string;
  chart: ChartKind;
  rows: ReportAggRow[];
  totalCount: number;
}) {
  const sum = rows.reduce((s, r) => s + r.value, 0);
  const tableSource = rows.map((r) => ({
    ...r,
    ratio: sum > 0 ? `${((r.value / sum) * 100).toFixed(1)}%` : '—',
  }));

  return (
    <Card size="small" title={title} style={{ marginBottom: 16 }}>
      {subtitle ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
          {subtitle} · 统计条数 {totalCount}
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
          统计条数 {totalCount}
        </Typography.Paragraph>
      )}
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} md={16} lg={16} xl={16} style={{ minWidth: 0 }}>
          <ChartPanel chart={chart} rows={rows} />
        </Col>
        <Col xs={24} md={8} lg={8} xl={8} style={{ minWidth: 0 }}>
          <Table<ReportAggRow & { ratio: string }>
            size="small"
            pagination={false}
            rowKey={(r) => r.name}
            columns={statColumns}
            dataSource={tableSource}
            scroll={{ y: 280 }}
          />
        </Col>
      </Row>
    </Card>
  );
}

function ChartPanel({ chart, rows }: { chart: ChartKind; rows: ReportAggRow[] }) {
  if (chart === 'pie') return <PieSvg data={rows} size={176} stackLegend />;
  return <BarHoriz data={rows} maxHeight={300} />;
}

export function ReportBlocksGrid({ blocks }: { blocks: BuiltReportBlock[] }) {
  return (
    <>
      {blocks.map((b) => (
        <ReportStatBlock
          key={b.typeLabel}
          title={`${b.typeLabel}（${b.chart === 'pie' ? '饼图' : '柱状图'}）`}
          subtitle={b.subtitle}
          chart={b.chart}
          rows={b.rows}
          totalCount={b.totalCount}
        />
      ))}
    </>
  );
}

export function ReportBlocksFiltered({
  blocks,
  chart,
}: {
  blocks: BuiltReportBlock[];
  chart: ChartKind;
}) {
  const filtered = blocks.filter((b) => b.chart === chart);
  if (filtered.length === 0) {
    return <Empty description={`当前所选统计维度中暂无${chart === 'pie' ? '饼图' : '柱状图'}类图表`} style={{ marginTop: 48 }} />;
  }
  return <ReportBlocksGrid blocks={filtered} />;
}
