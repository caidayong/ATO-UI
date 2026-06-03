import { Button, Form, Input, InputNumber, Select, Space, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getTestConclusionOptions } from '@/constants/dailyReport';
import type { DailyGeneratedReport, DailyReportProgressRow } from '@/types/dailyReportGenerated';
import { ProjectDailyReportPreview } from '@/components/ProjectDailyReportPreview';

const { Title } = Typography;

type EditorFormValues = {
  openingGreeting: string;
  openingProgressText: string;
  summaryText: string;
  mentionNote: string;
  progressRows: DailyReportProgressRow[];
  defectSummary: DailyGeneratedReport['defectSummary'];
  caseSummary: DailyGeneratedReport['caseSummary'];
  risks: { text: string }[];
};

function toFormValues(report: DailyGeneratedReport): EditorFormValues {
  return {
    openingGreeting: report.openingGreeting,
    openingProgressText: report.openingProgressText,
    summaryText: report.summaryText,
    mentionNote: report.mentionNote,
    progressRows: report.progressRows.map((r) => ({ ...r })),
    defectSummary: { ...report.defectSummary },
    caseSummary: { ...report.caseSummary },
    risks: report.risks.map((text) => ({ text })),
  };
}

export function reportFromFormValues(
  base: DailyGeneratedReport,
  values: EditorFormValues
): DailyGeneratedReport {
  const risks = values.risks.map((r) => r.text.trim()).filter(Boolean);
  return {
    ...base,
    openingGreeting: values.openingGreeting,
    openingProgressText: values.openingProgressText,
    summaryText: values.summaryText,
    mentionNote: values.mentionNote,
    progressRows: values.progressRows,
    defectSummary: values.defectSummary,
    caseSummary: values.caseSummary,
    risks: risks.length ? risks : ['无'],
  };
}

export function initReportEditForm(form: FormInstance, report: DailyGeneratedReport): void {
  form.setFieldsValue(toFormValues(report));
}

function ProgressRowHiddenFields({ idx }: { idx: number }) {
  return (
    <>
      <Form.Item name={['progressRows', idx, 'productName']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['progressRows', idx, 'phase']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['progressRows', idx, 'startAt']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['progressRows', idx, 'endAt']} hidden>
        <Input />
      </Form.Item>
    </>
  );
}

export function ProjectDailyReportEditor({
  form,
  baseReport,
}: {
  form: FormInstance;
  baseReport: DailyGeneratedReport;
}) {
  const progressRows = Form.useWatch('progressRows', form) as DailyReportProgressRow[] | undefined;
  const progressData = (progressRows ?? baseReport.progressRows).map((row, idx) => ({
    ...baseReport.progressRows[idx],
    ...row,
  }));

  const progressColumns: ColumnsType<DailyReportProgressRow> = [
    {
      title: '项目',
      width: 120,
      render: (_v, record, idx) => (
        <>
          <ProgressRowHiddenFields idx={idx} />
          <span>{record.productName}</span>
        </>
      ),
    },
    {
      title: '测试阶段',
      width: 100,
      render: (_v, record) => <span>{record.phase}</span>,
    },
    {
      title: '测试进度',
      width: 140,
      render: (_v, _r, idx) => (
        <Form.Item
          name={['progressRows', idx, 'progressPercent']}
          rules={[{ required: true, message: '必填' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
        </Form.Item>
      ),
    },
    {
      title: '测试结论',
      width: 160,
      render: (_v, record, idx) => (
        <Form.Item
          name={['progressRows', idx, 'conclusion']}
          rules={[{ required: true, message: '必选' }]}
          style={{ marginBottom: 0 }}
        >
          <Select options={getTestConclusionOptions(record.phase)} />
        </Form.Item>
      ),
    },
    {
      title: '开始时间',
      width: 110,
      render: (_v, record) => <span>{record.startAt}</span>,
    },
    {
      title: '结束时间',
      width: 110,
      render: (_v, record) => <span>{record.endAt}</span>,
    },
  ];

  const defectFields: { key: keyof DailyGeneratedReport['defectSummary']; label: string }[] = [
    { key: 'cumulative', label: '累计 Bug 数' },
    { key: 'newToday', label: '今日新增' },
    { key: 'unclosed', label: '未关闭' },
    { key: 'toVerify', label: '待验证' },
    { key: 'unresolved', label: '未解决' },
    { key: 'l1l2Unresolved', label: 'L1/L2 未解决' },
    { key: 'postponed', label: '延期' },
  ];

  const caseFields: { key: keyof DailyGeneratedReport['caseSummary']; label: string; isText?: boolean }[] = [
    { key: 'total', label: '用例总数' },
    { key: 'executed', label: '累计执行' },
    { key: 'passed', label: '通过' },
    { key: 'failed', label: '失败' },
    { key: 'blocked', label: '阻塞' },
    { key: 'execRate', label: '执行率', isText: true },
    { key: 'passRate', label: '通过率', isText: true },
  ];

  return (
    <Form form={form} layout="vertical" component={false}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: '24px 28px',
        }}
      >
        <Form.Item
          name="openingGreeting"
          label="开篇问候"
          rules={[{ required: true, message: '请填写开篇问候' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="openingProgressText"
          label="开篇进度说明"
          rules={[{ required: true, message: '请填写开篇进度说明' }]}
        >
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>
        <Form.Item name="summaryText" label="正文摘要" rules={[{ required: true, message: '请填写正文摘要' }]}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>
        <Form.Item name="mentionNote" label="负责人提醒（可选）">
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} placeholder="可留空" />
        </Form.Item>

        <Title level={5} style={{ marginTop: 8 }}>
          一、测试进度
        </Title>
        <Table
          size="small"
          rowKey="phase"
          columns={progressColumns}
          dataSource={progressData}
          pagination={false}
          bordered
        />

        <Title level={5} style={{ marginTop: 24 }}>
          二、缺陷情况
        </Title>
        <Space wrap size={12}>
          {defectFields.map((f) => (
            <Form.Item
              key={f.key}
              label={f.label}
              name={['defectSummary', f.key]}
              rules={[{ required: true, message: '必填' }]}
              style={{ width: 120, marginBottom: 8 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          ))}
        </Space>

        <Title level={5} style={{ marginTop: 24 }}>
          三、用例情况
        </Title>
        <Space wrap size={12}>
          {caseFields.map((f) => (
            <Form.Item
              key={f.key}
              label={f.label}
              name={['caseSummary', f.key]}
              rules={[{ required: true, message: '必填' }]}
              style={{ width: 120, marginBottom: 8 }}
            >
              {f.isText ? <Input /> : <InputNumber min={0} style={{ width: '100%' }} />}
            </Form.Item>
          ))}
        </Space>

        <Title level={5} style={{ marginTop: 24 }}>
          四、测试风险
        </Title>
        <Form.List name="risks">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8, width: '100%' }}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'text']}
                    rules={[{ required: true, message: '请填写风险内容' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="风险描述" />
                  </Form.Item>
                  <Button type="link" danger onClick={() => remove(field.name)} disabled={fields.length <= 1}>
                    删除
                  </Button>
                </Space>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ text: '' })} block>
                新增一行
              </Button>
            </>
          )}
        </Form.List>

        <ProjectDailyReportPreview report={baseReport} sectionsOnly />
      </div>
    </Form>
  );
}
