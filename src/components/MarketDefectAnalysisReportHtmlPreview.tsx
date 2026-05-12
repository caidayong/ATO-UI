import type { CSSProperties } from 'react';
import { Button, Input, Popconfirm, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AnalysisReportTask } from '@/types';
import {
  type DefectHtmlSummaryRow,
  computeDefectSummaryForHtmlReport,
  formatReportTimeRangeText,
} from '@/utils/analysisReportPreviewDataset';
import type { TestImprovementTableRow } from '@/utils/marketDefectTestImprovementRows';

type HtmlSummary = ReturnType<typeof computeDefectSummaryForHtmlReport>;

const cell: CSSProperties = {
  border: '1px solid #bfbfbf',
  padding: '8px 10px',
  verticalAlign: 'middle',
};

const headCell: CSSProperties = {
  ...cell,
  background: '#e6f4ff',
  fontWeight: 600,
  textAlign: 'center',
};

const titleBar: CSSProperties = {
  background: '#1677ff',
  color: '#fff',
  fontWeight: 700,
  fontSize: 16,
  textAlign: 'center',
  padding: '10px 12px',
};

const noticeBox: CSSProperties = {
  background: '#fffbe6',
  border: '1px solid #ffe58f',
  padding: '10px 12px',
  marginBottom: 10,
  borderRadius: 4,
};

export type MarketDefectAnalysisReportHtmlPreviewProps = {
  task: AnalysisReportTask;
  summary: HtmlSummary;
  /** 为 true 时：测试 bug 总数、共性问题说明、两条待办提示、改进表（含增删行）可编辑 */
  editable?: boolean;
  testBugTotalDisplay: string;
  onTestBugTotalDisplayChange: (value: string) => void;
  commonIssuesIntroText: string;
  onCommonIssuesIntroTextChange: (value: string) => void;
  pendingProductNoticeText: string;
  onPendingProductNoticeTextChange: (value: string) => void;
  pendingDevNoticeText: string;
  onPendingDevNoticeTextChange: (value: string) => void;
  improveRows: TestImprovementTableRow[];
  onImproveRowsChange: (rows: TestImprovementTableRow[]) => void;
};

function newImprovementRowKey(): string {
  return `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function MarketDefectAnalysisReportHtmlPreview({
  task,
  summary,
  editable = false,
  testBugTotalDisplay,
  onTestBugTotalDisplayChange,
  commonIssuesIntroText,
  onCommonIssuesIntroTextChange,
  pendingProductNoticeText,
  onPendingProductNoticeTextChange,
  pendingDevNoticeText,
  onPendingDevNoticeTextChange,
  improveRows,
  onImproveRowsChange,
}: MarketDefectAnalysisReportHtmlPreviewProps) {
  const productTitle = task.reportName.trim() || '—';
  const timeText = formatReportTimeRangeText(task);

  const patchImproveRow = (index: number, patch: Partial<TestImprovementTableRow>) => {
    const next = improveRows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onImproveRowsChange(next);
  };

  const addImproveRow = () => {
    onImproveRowsChange([
      ...improveRows,
      { key: newImprovementRowKey(), item: '', measure: '', owner: '', planDate: '' },
    ]);
  };

  const removeImproveRow = (index: number) => {
    onImproveRowsChange(improveRows.filter((_, i) => i !== index));
  };

  const baseImpColumns: ColumnsType<TestImprovementTableRow> = [
    {
      title: '改进项-测试',
      dataIndex: 'item',
      width: editable ? '24%' : '28%',
      ellipsis: !editable,
      render: (text: string, record, index) =>
        editable ? (
          <Input
            value={record.item}
            onChange={(e) => patchImproveRow(index, { item: e.target.value })}
            size="small"
          />
        ) : (
          text
        ),
    },
    {
      title: '改进措施',
      dataIndex: 'measure',
      ellipsis: !editable,
      render: (text: string, record, index) =>
        editable ? (
          <Input.TextArea
            value={record.measure}
            onChange={(e) => patchImproveRow(index, { measure: e.target.value })}
            autoSize={{ minRows: 2, maxRows: 8 }}
            style={{ fontSize: 13 }}
          />
        ) : (
          <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
            {text}
          </Typography.Paragraph>
        ),
    },
    {
      title: '责任人',
      dataIndex: 'owner',
      width: 100,
      render: (text: string, record, index) =>
        editable ? (
          <Input
            value={record.owner}
            onChange={(e) => patchImproveRow(index, { owner: e.target.value })}
            size="small"
          />
        ) : (
          text
        ),
    },
    {
      title: '计划完成日期',
      dataIndex: 'planDate',
      width: 120,
      render: (text: string, record, index) =>
        editable ? (
          <Input
            value={record.planDate}
            onChange={(e) => patchImproveRow(index, { planDate: e.target.value })}
            size="small"
          />
        ) : (
          text
        ),
    },
  ];

  const impColumns: ColumnsType<TestImprovementTableRow> = editable
    ? [
        ...baseImpColumns,
        {
          title: '操作',
          key: 'rowActions',
          width: 72,
          render: (_: unknown, __: TestImprovementTableRow, index: number) => (
            <Popconfirm title="确认删除该行？" okText="删除" cancelText="取消" onConfirm={() => removeImproveRow(index)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          ),
        },
      ]
    : baseImpColumns;

  const defectRows: DefectHtmlSummaryRow[] = summary.defectRows;

  const testBugCell = editable ? (
    <Input
      value={testBugTotalDisplay}
      onChange={(e) => onTestBugTotalDisplayChange(e.target.value)}
      size="small"
      style={{ textAlign: 'center', fontWeight: 600, fontSize: 16 }}
    />
  ) : (
    <Typography.Text strong style={{ fontSize: 18 }}>
      {testBugTotalDisplay}
    </Typography.Text>
  );

  return (
    <div style={{ marginBottom: 24 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td colSpan={6} style={titleBar}>
              {productTitle}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, width: '12%', fontWeight: 600 }}>产品名称</td>
            <td style={{ ...cell, width: '22%' }}>{task.teamName}</td>
            <td style={{ ...cell, width: '12%', fontWeight: 600 }}>起止时间</td>
            <td style={{ ...cell }} colSpan={3}>
              {timeText}
            </td>
          </tr>
          <tr>
            <td style={headCell} />
            <td style={headCell}>Beta-Bug数</td>
            <td style={headCell}>生产反馈</td>
            <td style={headCell}>系统验证数</td>
            <td style={headCell}>市场缺陷数</td>
            <td style={headCell}>测试bug总数</td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 600 }}>{defectRows[0].label}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[0].beta}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[0].prod}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[0].sys}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[0].market}</td>
            <td style={{ ...cell, textAlign: 'center', verticalAlign: 'middle' }} rowSpan={3}>
              {testBugCell}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 600 }}>{defectRows[1].label}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[1].beta}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[1].prod}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[1].sys}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[1].market}</td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 600 }}>{defectRows[2].label}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[2].beta}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[2].prod}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[2].sys}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{defectRows[2].market}</td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 600, background: '#fffbe6' }}>市场缺陷总数</td>
            <td style={{ ...cell, textAlign: 'center', background: '#fffbe6' }} colSpan={2}>
              {summary.totalMarketDefects}
            </td>
            <td style={{ ...cell, fontWeight: 600, background: '#fffbe6' }}>有效市场缺陷总数</td>
            <td style={{ ...cell, textAlign: 'center', background: '#fffbe6' }} colSpan={2}>
              {summary.totalEffectiveMarket}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 600 }}>产品市场缺陷泄露率</td>
            <td style={{ ...cell, textAlign: 'center' }} colSpan={2}>
              {task.productDefectLeakRate || '—'}
            </td>
            <td style={{ ...cell, fontWeight: 600 }}>测试缺陷泄漏率</td>
            <td style={{ ...cell, textAlign: 'center' }} colSpan={2}>
              {task.leakRate || '—'}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 600 }}>产品负责人</td>
            <td style={cell}>{task.productOwner || '—'}</td>
            <td style={{ ...cell, fontWeight: 600 }}>开发负责人</td>
            <td style={cell}>{task.devOwner || '—'}</td>
            <td style={{ ...cell, fontWeight: 600 }}>测试负责人</td>
            <td style={cell}>{task.testOwner || '—'}</td>
          </tr>
        </tbody>
      </table>

      <Typography.Paragraph style={{ color: '#ff4d4f', marginTop: 8, marginBottom: 20, fontSize: 12 }}>
        PS：有效数指 市场缺陷主要责任方为「测试」缺陷数。表格各来源「有效数」列为该来源下主要责任方为测试的条数。
      </Typography.Paragraph>

      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        【共性问题改进措施】
      </Typography.Title>
      {editable ? (
        <Input.TextArea
          value={commonIssuesIntroText}
          onChange={(e) => onCommonIssuesIntroTextChange(e.target.value)}
          autoSize={{ minRows: 3, maxRows: 10 }}
          style={{ fontSize: 12, marginBottom: 12 }}
        />
      ) : (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
          {commonIssuesIntroText}
        </Typography.Paragraph>
      )}

      <div style={noticeBox}>
        {editable ? (
          <Input.TextArea
            value={pendingProductNoticeText}
            onChange={(e) => onPendingProductNoticeTextChange(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 8 }}
            variant="borderless"
            style={{ padding: 0, fontSize: 14 }}
          />
        ) : (
          <Typography.Text>{pendingProductNoticeText}</Typography.Text>
        )}
      </div>
      <div style={{ ...noticeBox, marginBottom: 16 }}>
        {editable ? (
          <Input.TextArea
            value={pendingDevNoticeText}
            onChange={(e) => onPendingDevNoticeTextChange(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 8 }}
            variant="borderless"
            style={{ padding: 0, fontSize: 14 }}
          />
        ) : (
          <Typography.Text>{pendingDevNoticeText}</Typography.Text>
        )}
      </div>

      {editable ? (
        <div style={{ marginBottom: 8 }}>
          <Button type="dashed" size="small" onClick={addImproveRow}>
            新增一行
          </Button>
        </div>
      ) : null}

      <Table<TestImprovementTableRow>
        size="small"
        bordered
        pagination={false}
        rowKey="key"
        columns={impColumns}
        dataSource={improveRows}
      />
    </div>
  );
}
