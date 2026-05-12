import type { AnalysisReportTask } from '@/types';
import type { BuiltReportBlock } from '@/utils/marketDefectReportDataset';
import type { DefectHtmlSummaryRow } from '@/utils/analysisReportPreviewDataset';
import type { TestImprovementTableRow } from '@/utils/marketDefectTestImprovementRows';
import { builtReportBlockChartToDataUrl } from '@/utils/marketDefectReportExportCharts';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>');
}

const cell =
  'border:1px solid #bfbfbf;padding:8px 10px;vertical-align:middle;';
const headCell = `${cell}background:#e6f4ff;font-weight:600;text-align:center;`;
const titleBar =
  'background:#1677ff;color:#fff;font-weight:700;font-size:16px;text-align:center;padding:10px 12px;';

export type ReportExportPayload = {
  task: AnalysisReportTask;
  timeText: string;
  defectRows: DefectHtmlSummaryRow[];
  testBugTotalDisplay: string;
  totalMarketDefects: number;
  totalEffectiveMarket: number;
  /** 待产品分析问题提示条全文（可含换行） */
  pendingProductNotice: string;
  /** 待开发分析问题提示条全文 */
  pendingDevNotice: string;
  commonIssuesIntro: string;
  improveRows: TestImprovementTableRow[];
  blocks: BuiltReportBlock[] | null;
};

function buildBlocksHtml(blocks: BuiltReportBlock[] | null): string {
  if (!blocks?.length) {
    return `<p style="font-size:12px;color:#666;">缺陷数据分布图：无数据块。</p>`;
  }
  const parts = blocks.map((b) => {
    const rowsHtml = b.rows
      .map(
        (r) =>
          `<tr><td style="${cell}">${escapeHtml(r.name)}</td><td style="${cell};text-align:center">${escapeHtml(String(r.value))}</td></tr>`,
      )
      .join('');
    const sub = b.subtitle ? `<p style="margin:4px 0 8px;font-size:12px;color:#666;">${escapeHtml(b.subtitle)}</p>` : '';
    const chartUrl = builtReportBlockChartToDataUrl(b);
    const chartBlock = chartUrl
      ? `<p style="text-align:center;margin:8px 0 14px;"><img src="${chartUrl}" alt="${escapeHtml(b.typeLabel)}" style="max-width:560px;width:100%;height:auto;border:1px solid #f0f0f0;"/></p>`
      : `<p style="font-size:12px;color:#999;margin:8px 0;">（当前环境无法生成图表位图，已保留数据表）</p>`;
    return `<h3 style="font-size:15px;margin:16px 0 8px;background:#10239e;color:#fff;padding:8px 12px;">${escapeHtml(b.typeLabel)}</h3>${sub}${chartBlock}<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:12px;"><tbody>${rowsHtml}</tbody></table><p style="font-size:12px;color:#666;">合计：${b.totalCount}</p>`;
  });
  return `<h2 style="font-size:15px;margin:20px 0 8px;">缺陷数据分布图（含与页面一致的饼图/条形图示意）</h2>${parts.join('')}`;
}

export function buildMarketDefectReportExportHtml(p: ReportExportPayload): string {
  const { task, timeText, defectRows, testBugTotalDisplay } = p;
  const productTitle = escapeHtml(task.reportName.trim() || '—');

  const rowCells = (r: DefectHtmlSummaryRow) =>
    `<td style="${cell};font-weight:600">${escapeHtml(r.label)}</td>` +
    `<td style="${cell};text-align:center">${escapeHtml(String(r.beta))}</td>` +
    `<td style="${cell};text-align:center">${escapeHtml(String(r.prod))}</td>` +
    `<td style="${cell};text-align:center">${escapeHtml(String(r.sys))}</td>` +
    `<td style="${cell};text-align:center">${escapeHtml(String(r.market))}</td>`;

  const impRows = p.improveRows
    .map(
      (r) =>
        `<tr><td style="${cell}">${escapeHtml(r.item)}</td><td style="${cell}">${nl2br(r.measure)}</td><td style="${cell}">${escapeHtml(r.owner)}</td><td style="${cell}">${escapeHtml(r.planDate)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="zh-CN"><head><meta charset="utf-8"/><title>${productTitle}</title></head><body style="font-family:Segoe UI,Microsoft YaHei,sans-serif;font-size:14px;">
<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:16px;">
<tbody>
<tr><td colspan="6" style="${titleBar}">${productTitle}</td></tr>
<tr><td style="${cell};width:12%;font-weight:600">产品名称</td><td style="${cell};width:22%">${escapeHtml(task.teamName)}</td><td style="${cell};width:12%;font-weight:600">起止时间</td><td style="${cell}" colspan="3">${escapeHtml(timeText)}</td></tr>
<tr><td style="${headCell}"></td><td style="${headCell}">Beta-Bug数</td><td style="${headCell}">生产反馈</td><td style="${headCell}">系统验证数</td><td style="${headCell}">市场缺陷数</td><td style="${headCell}">测试bug总数</td></tr>
<tr>${rowCells(defectRows[0])}<td style="${cell};text-align:center;vertical-align:middle" rowspan="3"><strong style="font-size:18px">${escapeHtml(String(testBugTotalDisplay))}</strong></td></tr>
<tr>${rowCells(defectRows[1])}</tr>
<tr>${rowCells(defectRows[2])}</tr>
<tr><td style="${cell};font-weight:600;background:#fffbe6">市场缺陷总数</td><td style="${cell};text-align:center;background:#fffbe6" colspan="2">${escapeHtml(String(p.totalMarketDefects))}</td><td style="${cell};font-weight:600;background:#fffbe6">有效市场缺陷总数</td><td style="${cell};text-align:center;background:#fffbe6" colspan="2">${escapeHtml(String(p.totalEffectiveMarket))}</td></tr>
<tr><td style="${cell};font-weight:600">产品市场缺陷泄露率</td><td style="${cell};text-align:center" colspan="2">${escapeHtml(task.productDefectLeakRate || '—')}</td><td style="${cell};font-weight:600">测试缺陷泄漏率</td><td style="${cell};text-align:center" colspan="2">${escapeHtml(task.leakRate || '—')}</td></tr>
<tr><td style="${cell};font-weight:600">产品负责人</td><td style="${cell}">${escapeHtml(task.productOwner || '—')}</td><td style="${cell};font-weight:600">开发负责人</td><td style="${cell}">${escapeHtml(task.devOwner || '—')}</td><td style="${cell};font-weight:600">测试负责人</td><td style="${cell}">${escapeHtml(task.testOwner || '—')}</td></tr>
</tbody></table>
<p style="color:#ff4d4f;font-size:12px;margin:8px 0 20px;">PS：有效数指 市场缺陷主要责任方为「测试」缺陷数。表格各来源「有效数」列为该来源下主要责任方为测试的条数。</p>
<h2 style="font-size:16px;margin-bottom:8px;">【共性问题改进措施】</h2>
<p style="color:#666;font-size:12px;margin-bottom:12px;">${nl2br(p.commonIssuesIntro)}</p>
<div style="background:#fffbe6;border:1px solid #ffe58f;padding:10px 12px;margin-bottom:10px;">${nl2br(p.pendingProductNotice)}</div>
<div style="background:#fffbe6;border:1px solid #ffe58f;padding:10px 12px;margin-bottom:16px;">${nl2br(p.pendingDevNotice)}</div>
<table style="width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #d9d9d9;font-size:13px;">
<thead><tr><th style="${headCell}">改进项-测试</th><th style="${headCell}">改进措施</th><th style="${headCell}">责任人</th><th style="${headCell}">计划完成日期</th></tr></thead>
<tbody>${impRows}</tbody></table>
${buildBlocksHtml(p.blocks)}
</body></html>`;
}

export function downloadMarketDefectReportWordFile(html: string, fileBaseName: string): void {
  const safe = fileBaseName.replace(/[/\\?%*:|"<>]/g, '_').trim() || '市场缺陷报告';
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
