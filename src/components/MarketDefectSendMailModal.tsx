import { useEffect, useMemo } from 'react';
import { Col, Form, Input, Modal, Row, Select, Typography } from 'antd';
import { mockTeams, mockUsers } from '@/mocks/data';

const MOCK_SENDER_DISPLAY = '张三 <zhangsan@company.com>';

export type MarketDefectSendMailFormValues = {
  /** mockUsers 的 id 列表 */
  recipientIds: string[];
  /** 团队名称，与 mockTeams.name 一致 */
  teamName: string;
};

type Props = {
  open: boolean;
  title?: string;
  /** 副标题，如当前报告名称 */
  contextText?: string;
  /** 打开时默认选中的团队（若存在于 mockTeams） */
  defaultTeamName?: string;
  onCancel: () => void;
  /** 校验通过后调用；返回 Promise 以便 Modal 等待 */
  onConfirmSend: (values: MarketDefectSendMailFormValues) => void | Promise<void>;
};

export function MarketDefectSendMailModal({
  open,
  title = '发送邮件',
  contextText,
  defaultTeamName,
  onCancel,
  onConfirmSend,
}: Props) {
  const [form] = Form.useForm<MarketDefectSendMailFormValues>();

  const teamNames = useMemo(() => new Set(mockTeams.map((t) => t.name)), []);

  const recipientOptions = useMemo(
    () =>
      mockUsers.map((u) => ({
        value: u.id,
        label: `${u.name} <${u.email}>`,
      })),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const team =
      defaultTeamName && teamNames.has(defaultTeamName) ? defaultTeamName : undefined;
    form.setFieldsValue({ recipientIds: [], teamName: team ?? undefined });
  }, [open, defaultTeamName, teamNames, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onConfirmSend(values);
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      okText="确认发送"
      cancelText="取消"
      destroyOnClose
      width={640}
      styles={{ body: { paddingTop: 8 } }}
    >
      {contextText ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
          {contextText}
        </Typography.Paragraph>
      ) : null}

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item label="发件人">
          <Input readOnly value={MOCK_SENDER_DISPLAY} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} lg={17} xl={18} style={{ minWidth: 0 }}>
            <Form.Item
              label="收件人"
              name="recipientIds"
              rules={[{ required: true, message: '请选择收件人' }]}
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="支持按姓名/邮箱模糊搜索，支持多选"
                options={recipientOptions}
                filterOption={(input, option) => {
                  const id = option?.value as string | undefined;
                  const u = mockUsers.find((x) => x.id === id);
                  if (!u) return false;
                  const q = input.trim().toLowerCase();
                  return (
                    u.name.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    `${u.name} <${u.email}>`.toLowerCase().includes(q) ||
                    u.employeeId.toLowerCase().includes(q)
                  );
                }}
                maxTagCount="responsive"
              />
            </Form.Item>
          </Col>
          <Col xs={24} lg={7} xl={6}>
            <Form.Item label="团队选择" name="teamName" rules={[{ required: true, message: '请选择团队' }]}>
              <Select
                allowClear
                showSearch
                placeholder="单选团队"
                optionFilterProp="label"
                options={mockTeams.map((t) => ({ value: t.name, label: t.name }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
