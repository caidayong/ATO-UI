/**
 * @page 版本详情
 * @version V1.0.0
 * @base ATO_V1.0.0-页面需求与交互规格.md 第 4.3.1 节
 * @changes
 *   - V1.0.0: 初始实现，支持项目版本列表「详情」入口，包含基本信息与发布说明（仅已发布展示）
 */

import { Button, Card, Descriptions, Empty, Tag, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { mockProjects, mockVersions } from '@/mocks/data';
import { projectDetailPath } from '@/constants/routes';

const { Title, Paragraph } = Typography;

function getVersionStatusColor(status: string): string {
  if (status === '已发布') return 'success';
  if (status === '已召回') return 'warning';
  return 'default';
}

export function VersionDetail() {
  const navigate = useNavigate();
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>();

  const project = mockProjects.find((p) => p.id === projectId);
  const version = mockVersions.find((v) => v.id === versionId && v.projectId === projectId);
  const currentProjectPath = projectDetailPath(projectId || '');

  if (!project || !version) {
    return (
      <div style={{ height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' }}>
        <Card>
          <Empty description="版本不存在或已被删除" />
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/automation/projects')}>
              返回项目管理
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(currentProjectPath)}>
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {version.version}
        </Title>
      </div>

      <Card>
        <Title level={5}>基本信息</Title>
        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="所属项目">{project.name}</Descriptions.Item>
          <Descriptions.Item label="版本号">{version.version}</Descriptions.Item>
          <Descriptions.Item label="负责人">{version.owner}</Descriptions.Item>
          <Descriptions.Item label="开始时间">{version.startTime || version.createdAt}</Descriptions.Item>
          <Descriptions.Item label="计划发布时间">{version.planReleaseDate}</Descriptions.Item>
          <Descriptions.Item label="实际发布时间">{version.actualReleaseDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="版本状态">
            <Tag color={getVersionStatusColor(version.status)}>{version.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="用例总数">{version.caseCount}</Descriptions.Item>
          <Descriptions.Item label="成功率">{version.successRate}%</Descriptions.Item>
        </Descriptions>

        {version.status === '已发布' && version.releaseNotes ? (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>发布说明</Title>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="新增功能">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {version.releaseNotes.newFeatures}
                </Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="使用注意事项">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {version.releaseNotes.cautions}
                </Paragraph>
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
