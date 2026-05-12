import type { BuiltReportBlock, ReportAggRow } from '@/utils/marketDefectReportDataset';

const COLORS = [
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

function createCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

/** 将统计块渲染为 PNG data URL，供 Word（HTML）嵌入；仅浏览器环境可用 */
export function builtReportBlockChartToDataUrl(block: BuiltReportBlock): string | null {
  if (block.chart === 'pie') return pieBlockToDataUrl(block.rows);
  return barBlockToDataUrl(block.rows);
}

function pieBlockToDataUrl(rows: ReportAggRow[]): string | null {
  const total = rows.reduce((s, d) => s + d.value, 0);
  const W = 520;
  const H = Math.max(220, 40 + rows.length * 26);
  const g = createCanvas(W, H);
  if (!g) return null;
  const { ctx } = g;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  const cx = 100;
  const cy = Math.min(H * 0.5, 110);
  const r = 72;

  if (total <= 0) {
    ctx.fillStyle = '#999';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillText('无数据', cx - 24, cy);
    return g.canvas.toDataURL('image/png');
  }

  if (rows.length === 1 && rows[0].value >= total) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[0];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    let angle = -Math.PI / 2;
    rows.forEach((slice, i) => {
      const sweep = (2 * Math.PI * slice.value) / total;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + sweep, false);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      angle += sweep;
    });
  }

  const legendX = 210;
  let ly = Math.max(28, cy - (rows.length * 13));
  ctx.font = '12px "Microsoft YaHei", sans-serif';
  rows.forEach((row, i) => {
    const pct = total > 0 ? (row.value / total) * 100 : 0;
    const pctText = pct % 1 < 0.05 ? pct.toFixed(0) : pct.toFixed(1);
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fillRect(legendX, ly - 8, 10, 10);
    ctx.fillStyle = '#333';
    const name = row.name.length > 18 ? `${row.name.slice(0, 18)}…` : row.name;
    ctx.fillText(`${name}  ${pctText}%  (${row.value})`, legendX + 16, ly);
    ly += 26;
  });

  return g.canvas.toDataURL('image/png');
}

function barBlockToDataUrl(rows: ReportAggRow[]): string | null {
  const max = Math.max(1, ...rows.map((d) => d.value));
  const rowH = 34;
  const W = 480;
  const H = Math.min(420, Math.max(100, 24 + rows.length * rowH));
  const g = createCanvas(W, H);
  if (!g) return null;
  const { ctx } = g;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  if (rows.length === 0) {
    ctx.fillStyle = '#999';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillText('无数据', 16, H / 2);
    return g.canvas.toDataURL('image/png');
  }

  const labelW = 160;
  const barLeft = labelW + 8;
  const barMaxW = W - barLeft - 56;

  rows.forEach((row, i) => {
    const y = 12 + i * rowH;
    ctx.fillStyle = '#333';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    const label = row.name.length > 14 ? `${row.name.slice(0, 14)}…` : row.name;
    ctx.fillText(label, 8, y + 16);

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(barLeft, y + 6, barMaxW, 10);

    const w = max > 0 ? (row.value / max) * barMaxW : 0;
    ctx.fillStyle = COLORS[i % COLORS.length];
    if (w > 0) {
      ctx.fillRect(barLeft, y + 6, Math.max(w, row.value > 0 ? 3 : 0), 10);
    }
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText(String(row.value), W - 8, y + 16);
    ctx.textAlign = 'left';
  });

  return g.canvas.toDataURL('image/png');
}
