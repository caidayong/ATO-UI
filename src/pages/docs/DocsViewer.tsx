/**
 * @page 需求文档 · 阅读器
 * @version V1.0.1-P4
 * @base docs/spec/07-需求文档在线查看-方案设计.md
 * @changes
 *   - V1.0.1-P4: 初始实现 — Markdown 渲染、TOC、mermaid、复制链接
 */
import { useEffect, useMemo, useState } from 'react';
import { Anchor, Button, Card, Layout, Result, Space, Spin, message } from 'antd';
import { CopyOutlined, ExportOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { Link, useLocation, useParams } from 'react-router-dom';
import { SPACING } from '@/constants/ui';
import { docsVersionPath } from '@/constants/routes';
import { findDoc, useDocsManifest } from '@/docs/docs-manifest';
import { extractHeadings } from '@/docs/extractHeadings';
import { loadDocContent } from '@/docs/loadDoc';
import { createMarkdownComponents, DocsVersionProvider } from '@/docs/markdownComponents';
import type { DocManifestEntry } from '@/types/docs';
import '@/docs/docs-markdown.css';

const { Sider, Content } = Layout;

function DocsViewerBody(props: { doc: DocManifestEntry; versionId: string }) {
  const location = useLocation();
  const { doc, versionId } = props;
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const markdownComponents = useMemo(() => createMarkdownComponents(), []);
  const headings = useMemo(() => (content ? extractHeadings(content) : []), [content]);

  const anchorItems = useMemo(
    () =>
      headings.map((heading) => ({
        key: heading.id,
        href: `#${heading.id}`,
        title: heading.text,
      })),
    [headings],
  );

  useEffect(() => {
    let cancelled = false;

    loadDocContent(doc.relativePath)
      .then((markdown) => {
        if (!cancelled) setContent(markdown);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : '文档加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doc.relativePath]);

  useEffect(() => {
    if (!content || !location.hash) return;

    const id = decodeURIComponent(location.hash.slice(1));
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [content, location.hash]);

  async function handleCopyLink() {
    const url = `${window.location.origin}${location.pathname}${location.hash}`;
    try {
      await navigator.clipboard.writeText(url);
      void message.success('链接已复制');
    } catch {
      void message.error('复制失败，请手动复制地址栏链接');
    }
  }

  function handleOpenNewWindow() {
    window.open(`${location.pathname}${location.hash}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <Layout style={{ background: 'transparent', alignItems: 'flex-start' }} hasSider>
      <Sider
        width={240}
        theme="light"
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: SPACING.md,
          position: 'sticky',
          top: 88,
          maxHeight: 'calc(100vh - 112px)',
          overflow: 'auto',
        }}
        breakpoint="lg"
        collapsedWidth={0}
      >
        <div style={{ marginBottom: SPACING.sm, fontWeight: 600 }}>本文目录</div>
        {headings.length ? (
          <Anchor
            affix={false}
            items={anchorItems}
            getContainer={() =>
              (document.querySelector('.docs-viewer-scroll') as HTMLElement | null) ?? window
            }
            onClick={(event, link) => {
              event.preventDefault();
              const id = link.href.replace('#', '');
              window.history.replaceState(null, '', `#${id}`);
              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        ) : (
          <Spin size="small" />
        )}
      </Sider>

      <Content style={{ marginLeft: SPACING.md, minWidth: 0, flex: 1 }}>
        <Card
          className="docs-viewer-scroll"
          styles={{ body: { padding: SPACING.lg } }}
          title={doc.title}
          extra={
            <Space>
              <Button icon={<CopyOutlined />} onClick={() => void handleCopyLink()}>
                复制链接
              </Button>
              <Button icon={<ExportOutlined />} onClick={handleOpenNewWindow}>
                新窗口
              </Button>
            </Space>
          }
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: SPACING.lg }}>
              <Spin tip="加载文档中…" />
            </div>
          ) : loadError ? (
            <Result status="error" title="文档加载失败" subTitle={loadError} />
          ) : (
            <DocsVersionProvider version={versionId}>
              <article className="docs-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug]}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </article>
            </DocsVersionProvider>
          )}
        </Card>
      </Content>
    </Layout>
  );
}

export function DocsViewer() {
  const { version: versionParam, docSlug: docSlugParam } = useParams();
  const { manifest, loading: manifestLoading, error: manifestError } = useDocsManifest();
  const versionId = decodeURIComponent(versionParam ?? '');
  const docSlug = decodeURIComponent(docSlugParam ?? '');
  const doc = findDoc(manifest, versionId, docSlug);

  if (manifestLoading) {
    return (
      <div style={{ textAlign: 'center', padding: SPACING.lg }}>
        <Spin tip="加载文档索引…" />
      </div>
    );
  }

  if (manifestError) {
    return <Result status="error" title="文档索引加载失败" subTitle={manifestError} />;
  }

  if (!doc) {
    return (
      <Result
        status="404"
        title="文档不存在"
        subTitle={`未找到 ${versionId} / ${docSlug}`}
        extra={
          <Link to={docsVersionPath(versionId)}>
            <Button type="primary">返回文档列表</Button>
          </Link>
        }
      />
    );
  }

  return <DocsViewerBody key={doc.relativePath} doc={doc} versionId={versionId} />;
}
