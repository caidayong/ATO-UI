/**
 * @page 需求文档 · 版本选择
 * @version V1.0.1-P4
 * @base docs/spec/07-需求文档在线查看-方案设计.md
 * @changes
 *   - V1.0.1-P4: 初始实现 — 按迭代版本浏览 docs/prd 下 Markdown
 */
import { Card, Col, Empty, Result, Row, Spin, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SPACING } from '@/constants/ui';
import { docsVersionPath } from '@/constants/routes';
import { useDocsManifest } from '@/docs/docs-manifest';
import { DOC_CATEGORY_LABEL, type DocCategory } from '@/types/docs';

const { Text } = Typography;

function summarizeCategories(categories: DocCategory[]) {
  const counts = new Map<DocCategory, number>();
  for (const category of categories) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([category, count]) => `${DOC_CATEGORY_LABEL[category]} ${count}`)
    .join(' · ');
}

export function DocsVersionHub() {
  const navigate = useNavigate();
  const { manifest, loading, error } = useDocsManifest();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: SPACING.lg }}>
        <Spin tip="加载文档索引…" />
      </div>
    );
  }

  if (error) {
    return <Result status="error" title="文档索引加载失败" subTitle={error} />;
  }

  if (!manifest?.versions.length) {
    return <Empty description="未找到 docs/prd 下的版本文档，请先运行 npm run docs:manifest" />;
  }

  return (
    <Row gutter={[SPACING.md, SPACING.md]}>
      {manifest.versions.map((version) => (
        <Col key={version.id} xs={24} sm={12} lg={8}>
          <Card
            hoverable
            title={version.id}
            onClick={() => navigate(docsVersionPath(version.id))}
            extra={<Tag color="blue">{version.docs.length} 篇</Tag>}
          >
            <Text type="secondary">
              {summarizeCategories(version.docs.map((doc) => doc.category))}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
