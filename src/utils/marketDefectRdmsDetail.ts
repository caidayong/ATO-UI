import type { MarketDefect, MarketDefectRdmsAttachment, MarketDefectRdmsDetail, MarketDefectRdmsHistoryEntry } from '@/types';

function numericIdFromMarketId(id: string): string {
  const digits = id.replace(/\D/g, '');
  return digits || id;
}

function pick<T>(seed: number, opts: readonly T[]): T {
  return opts[Math.abs(seed) % opts.length]!;
}

/** 由列表行合成 RDMS 详情 Mock（首版不接真实 RDMS API） */
export function buildMarketDefectRdmsDetailFromRow(row: MarketDefect): MarketDefectRdmsDetail {
  const numeric = numericIdFromMarketId(row.id);
  const seed = numeric.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  const regions = ['华东大区', 'MENA大区', '亚太大区', '北美大区'] as const;
  const statuses = ['技能验证', '分析中', '待指派', '已关闭'] as const;
  const severities = ['轻微', '一般', '严重', '致命'] as const;
  const rates = ['偶现', '必现', '难复现'] as const;
  const impacts = ['小范围（不良台数 < 50）', '中范围（50～200）', '大范围（不良台数 > 200）'] as const;
  const priorities = ['低', '中', '高', '紧急'] as const;
  const rdmsDefectTypes = ['设备软件', '平台软件', '应用问题', '需求问题'] as const;

  const region = pick(seed, regions);
  const status = pick(seed + 5, statuses);
  const customerCode = String(4000 + (Number(numeric.slice(-4)) % 900 || 54));

  const supportName = row.mainResponsiblePerson;

  const description = [
    `【关联列表】缺陷来源「${row.defectSource}」，实际归属「${row.actualTeam}」，主要责任方「${row.mainResponsibilityAttribution}」。`,
    '',
    `${row.title}：请结合版本主干与交付分支核对复现路径；若涉及环境差异请补充硬件与固件版本。`,
    '',
    row.leakageReason ? `已知流出归类：${row.leakageReason}。改进方向：${row.improvementMeasure || '—'}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const attachments: MarketDefectRdmsAttachment[] = [
    { id: `att-${row.id}-1`, name: `现场截图-${row.id}.png` },
    { id: `att-${row.id}-2`, name: `日志片段-${numeric}.txt` },
  ];

  const hist1: MarketDefectRdmsHistoryEntry = {
    id: `h-${row.id}-1`,
    time: row.createdAt.slice(0, 16),
    author: supportName,
    content: `已创建工单并同步产品线「${row.productLine}」，请指派分析负责人。`,
  };

  const hist2: MarketDefectRdmsHistoryEntry = {
    id: `h-${row.id}-2`,
    time: row.createdAt.length >= 19 ? incrementTimeMock(row.createdAt, 25) : row.createdAt,
    author: '系统',
    content: `状态更新为「${status}」，归属团队同步为「${row.defectOwnerTeam}」。`,
  };

  return {
    defectId: row.id,
    rdmsNumericId: numeric,
    title: row.title,
    product: {
      productLine: row.productLine,
      belongingProduct: `SDK-${row.productLine.replace(/\s/g, '')}-Core`,
      issueProductVersion: '主干',
      productSystemDomain: row.productLine.toLowerCase(),
    },
    customer: {
      region,
      customerCode,
      customerName: pick(seed + 3, ['', `客户-${customerCode}`, '待定'] as const),
      expectedSolutionAt: `${row.createdAt.slice(0, 10)} 23:59`,
    },
    defectBlock: {
      issueLevel: pick(seed + 2, ['A', 'B', 'C'] as const),
      frontlineTechSupport: supportName,
      description,
    },
    solution:
      row.completionProgress >= 100 ? '已通过版本修复并回归验证闭环。' : '—',
    defectAttributionText: '',
    basic: {
      status,
      defectType: pick(seed + 6, rdmsDefectTypes),
      defectAttribution: '',
      severity: pick(seed + 7, severities),
      occurrenceRate: pick(seed + 8, rates),
      impactScope: pick(seed + 9, impacts),
      problemLevel: pick(seed + 2, ['A', 'B', 'C'] as const),
      priority: pick(seed + 11, priorities),
      ownerTeam: row.defectOwnerTeam,
      isCommonIssue: pick(seed + 12, ['是', '否'] as const),
    },
    lifecycle: {
      createdBy: supportName,
      createdAt: row.createdAt.slice(0, 19),
      solutionBrief:
        row.completionProgress >= 100 ? '已闭环' : '排期中',
      assignedTo: row.mainResponsiblePerson,
      communication: '',
    },
    history: [hist1, hist2],
    attachments,
  };
}

/** 在原时间字符串上偏移若干分钟（仅 Mock 展示用） */
function incrementTimeMock(isoLike: string, minutes: number): string {
  const d = new Date(isoLike.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return isoLike;
  d.setMinutes(d.getMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
