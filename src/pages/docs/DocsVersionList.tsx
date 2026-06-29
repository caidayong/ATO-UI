/**
 * @page 需求文档 · 文档列表
 * @version V1.0.1-P4
 * @base docs/spec/07-需求文档在线查看-方案设计.md
 * @changes
 *   - V1.0.1-P4: 初始实现 — 按文档类型分组展示指定版本 MD 列表
 *   - V1.0.1-P4: 列表主链接改为可读标题，文件名降为辅助信息，避免「文档说明」误导
 */
import { Card, Empty, List, Result, Spin, Tag, Typography } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SPACING } from '@/constants/ui';
import { docsViewerPath } from '@/constants/routes';
import { findVersion, useDocsManifest } from '@/docs/docs-manifest';
import {
  DOC_CATEGORY_LABEL,
  DOC_CATEGORY_ORDER,
  type DocCategory,
  type DocManifestEntry,
} from '@/types/docs';

const { Text } = Typography;

const CATEGORY_COLOR: Record<DocCategory, string> = {
  SRS: 'purple',
  PAGE_PRD: 'blue',
  BACKLOG: 'green',
  MODULE: 'orange',
  OTHER: 'default',
};

function groupDocsByCategory(docs: DocManifestEntry[]) {
  const groups = new Map<DocCategory, DocManifestEntry[]>();

  for (const category of DOC_CATEGORY_ORDER) {
    groups.set(category, []);
  }

  for (const doc of docs) {
    const list = groups.get(doc.category) ?? [];
    list.push(doc);
    groups.set(doc.category, list);
  }

  return DOC_CATEGORY_ORDER.map((category) => ({
    category,
    docs: groups.get(category) ?? [],
  })).filter((group) => group.docs.length > 0);
}

function DocListItem(props: { doc: DocManifestEntry; versionId: string; category: DocCategory }) {
  const navigate = useNavigate();
  const { doc, versionId, category } = props;
  const href = docsViewerPath(versionId, doc.slug);

  return (
    <List.Item
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(href)}
      extra={
        <Tag color={CATEGORY_COLOR[category]}>{DOC_CATEGORY_LABEL[category]}</Tag>
      }
    >
      <List.Item.Meta
        title={
          <Link to={href} onClick={(event) => event.stopPropagation()}>
            {doc.title}
          </Link>
        }
        description={
          <Text type="secondary" copyable={{ text: doc.fileName }} onClick={(e) => e.stopPropagation()}>
            {doc.fileName}
          </Text>
        }
      />
    </List.Item>
  );
}

export function DocsVersionList() {
  const { version: versionParam } = useParams();
  const versionId = decodeURIComponent(versionParam ?? '');
  const { manifest, loading, error } = useDocsManifest();
  const version = findVersion(manifest, versionId);

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

  if (!version) {
    return <Result status="404" title="版本不存在" subTitle={`未找到版本 ${versionId}`} />;
  }

  const groups = groupDocsByCategory(version.docs);

  if (!groups.length) {
    return <Empty description={`${versionId} 下暂无 Markdown 文档`} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
      {groups.map((group) => (
        <Card
          key={group.category}
          title={DOC_CATEGORY_LABEL[group.category]}
          styles={{ body: { paddingTop: SPACING.sm } }}
        >
          <List
            dataSource={group.docs}
            renderItem={(doc) => (
              <DocListItem doc={doc} versionId={versionId} category={group.category} />
            )}
          />
        </Card>
      ))}
    </div>
  );
}
