/**
 * 市场缺陷列表 · RDMS 缺陷详情弹层（字段布局对齐 RDMS 详情：左主栏 + 右侧元数据）
 */
import type { CSSProperties } from 'react';
import { Button, Card, Col, List, Modal, Row, Space, Timeline, Typography, message } from 'antd';
import type { MarketDefectRdmsDetail } from '@/types';

const sectionTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 12,
};

function FieldGrid(props: { items: { label: string; value: string }[] }) {
  return (
    <Row gutter={[16, 12]}>
      {props.items.map((it) => (
        <Col span={12} key={it.label}>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
            {it.label}
          </Typography.Text>
          <Typography.Text>{it.value.trim() ? it.value : '—'}</Typography.Text>
        </Col>
      ))}
    </Row>
  );
}

function MetaList(props: { items: { label: string; value: string }[] }) {
  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      {props.items.map((it) => (
        <div key={it.label}>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 2 }}>
            {it.label}
          </Typography.Text>
          <Typography.Text>{it.value.trim() ? it.value : '—'}</Typography.Text>
        </div>
      ))}
    </Space>
  );
}

export type MarketDefectRdmsDetailModalProps = {
  open: boolean;
  detail: MarketDefectRdmsDetail | null;
  onClose: () => void;
};

export function MarketDefectRdmsDetailModal({ open, detail, onClose }: MarketDefectRdmsDetailModalProps) {
  if (!detail) return null;

  const headerBar = (
    <Row align="middle" gutter={12} wrap={false} style={{ marginBottom: 16 }}>
      <Col flex="none">
        <Button type="link" style={{ paddingLeft: 0 }} onClick={onClose}>
          返回
        </Button>
      </Col>
      <Col flex="auto" style={{ minWidth: 0 }}>
        <Space align="center" size={8} wrap style={{ width: '100%', justifyContent: 'center' }}>
          <Typography.Text strong style={{ color: '#1677ff' }}>
            {detail.rdmsNumericId}
          </Typography.Text>
          <Typography.Text ellipsis strong style={{ flex: 1, minWidth: 120 }} title={detail.title}>
            {detail.title}
          </Typography.Text>
        </Space>
      </Col>
      <Col flex="none">
        <Button type="primary" onClick={() => message.info('查看流程图（Mock）')}>
          查看流程图
        </Button>
      </Col>
    </Row>
  );

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1120}
      styles={{ body: { maxHeight: 'min(85vh, 900px)', overflow: 'auto', paddingTop: 16 } }}
      destroyOnClose
    >
      {headerBar}

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small" styles={{ body: { padding: 12 } }}>
              <div style={sectionTitleStyle}>产品信息</div>
              <FieldGrid
                items={[
                  { label: '产品线', value: detail.product.productLine },
                  { label: '所属产品', value: detail.product.belongingProduct },
                  { label: '产品问题版本号', value: detail.product.issueProductVersion },
                  { label: '产品系统/领域', value: detail.product.productSystemDomain },
                ]}
              />
            </Card>

            <Card size="small" styles={{ body: { padding: 12 } }}>
              <div style={sectionTitleStyle}>客户信息</div>
              <FieldGrid
                items={[
                  { label: '所属大区', value: detail.customer.region },
                  { label: '客户代码', value: detail.customer.customerCode },
                  { label: '客户名称', value: detail.customer.customerName },
                  { label: '期望解决日期', value: detail.customer.expectedSolutionAt },
                ]}
              />
            </Card>

            <Card size="small" styles={{ body: { padding: 12 } }}>
              <div style={sectionTitleStyle}>缺陷信息</div>
              <Row gutter={[16, 12]} style={{ marginBottom: 12 }}>
                <Col span={12}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    问题级别
                  </Typography.Text>
                  <Typography.Text>{detail.defectBlock.issueLevel}</Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    前方技术支持
                  </Typography.Text>
                  <Typography.Text>{detail.defectBlock.frontlineTechSupport}</Typography.Text>
                </Col>
              </Row>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                缺陷描述
              </Typography.Text>
              <Typography.Paragraph
                style={{
                  marginBottom: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  padding: 12,
                }}
              >
                {detail.defectBlock.description}
              </Typography.Paragraph>
            </Card>

            <Card size="small" styles={{ body: { padding: 12 } }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={sectionTitleStyle}>解决方案</div>
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {detail.solution.trim() ? detail.solution : '—'}
                  </Typography.Paragraph>
                </Col>
                <Col span={12}>
                  <div style={sectionTitleStyle}>缺陷归属</div>
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {detail.defectAttributionText.trim() ? detail.defectAttributionText : '—'}
                  </Typography.Paragraph>
                </Col>
              </Row>
            </Card>

            <Card size="small" styles={{ body: { padding: 12 } }}>
              <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                <Col>
                  <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>历史记录</div>
                </Col>
                <Col>
                  <Button size="small" onClick={() => message.info('添加备注（Mock）')}>
                    添加备注
                  </Button>
                </Col>
              </Row>
              <Timeline
                items={detail.history.map((h) => ({
                  children: (
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {h.time} · {h.author}
                      </Typography.Text>
                      <Typography.Paragraph style={{ marginTop: 4, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {h.content}
                      </Typography.Paragraph>
                    </div>
                  ),
                }))}
              />
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={8}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small" styles={{ body: { padding: 12 } }}>
              <div style={sectionTitleStyle}>基本信息</div>
              <MetaList
                items={[
                  { label: '缺陷状态', value: detail.basic.status },
                  { label: '缺陷类型', value: detail.basic.defectType },
                  { label: '缺陷归属', value: detail.basic.defectAttribution },
                  { label: '严重程度', value: detail.basic.severity },
                  { label: '发生概率', value: detail.basic.occurrenceRate },
                  { label: '影响范围', value: detail.basic.impactScope },
                  { label: '问题级别', value: detail.basic.problemLevel },
                  { label: '优先级', value: detail.basic.priority },
                  { label: '问题归属团队', value: detail.basic.ownerTeam },
                  { label: '是否共性问题', value: detail.basic.isCommonIssue },
                ]}
              />
            </Card>

            <Card size="small" styles={{ body: { padding: 12 } }}>
              <div style={sectionTitleStyle}>缺陷的一生</div>
              <MetaList
                items={[
                  { label: '由谁创建', value: `${detail.lifecycle.createdBy} ${detail.lifecycle.createdAt}` },
                  { label: '解决方案', value: detail.lifecycle.solutionBrief },
                  { label: '指派给', value: detail.lifecycle.assignedTo },
                  { label: '沟通', value: detail.lifecycle.communication },
                ]}
              />
            </Card>

            <Card size="small" styles={{ body: { padding: 12 } }}>
              <div style={sectionTitleStyle}>附件</div>
              {detail.attachments.length === 0 ? (
                <Typography.Text type="secondary">暂无附件</Typography.Text>
              ) : (
                <List
                  size="small"
                  dataSource={detail.attachments}
                  renderItem={(item) => (
                    <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
                      <Typography.Link
                        onClick={() => message.success(`Mock 下载：${item.name}`)}
                        style={{ wordBreak: 'break-all' }}
                      >
                        {item.name}
                      </Typography.Link>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </Modal>
  );
}
