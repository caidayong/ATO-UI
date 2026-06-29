/* eslint-disable react-refresh/only-export-components -- 文档 Markdown 渲染元素，非页面组件 */
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';

export const DocsVersionContext = createContext('');

interface MermaidApi {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
}

declare global {
  interface Window {
    mermaid?: MermaidApi;
  }
}

export function DocsVersionProvider(props: { version: string; children: ReactNode }) {
  return (
    <DocsVersionContext.Provider value={props.version}>{props.children}</DocsVersionContext.Provider>
  );
}

function useDocsVersion() {
  return useContext(DocsVersionContext);
}

let mermaidInitialized = false;
let mermaidLoading: Promise<MermaidApi> | null = null;

function loadMermaidScript(): Promise<MermaidApi> {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (mermaidLoading) return mermaidLoading;

  mermaidLoading = new Promise<MermaidApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      if (window.mermaid) {
        resolve(window.mermaid);
      } else {
        reject(new Error('mermaid 脚本已加载但未挂载到 window'));
      }
    };
    script.onerror = () => reject(new Error('mermaid 脚本加载失败'));
    document.head.appendChild(script);
  }).finally(() => {
    mermaidLoading = null;
  });

  return mermaidLoading;
}

async function ensureMermaid(): Promise<MermaidApi> {
  const mermaid = await loadMermaidScript();
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

function resolveAssetSrc(src: string, version: string): string {
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src;
  }
  const normalized = src.replace(/^\.\//, '');
  return `/docs-assets/${encodeURIComponent(version)}/${normalized.split('/').map(encodeURIComponent).join('/')}`;
}

function MermaidBlock(props: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const mermaid = await ensureMermaid();
        const elementId = `mermaid-${reactId.replace(/:/g, '')}`;
        const { svg } = await mermaid.render(elementId, props.code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [props.code, reactId]);

  if (failed) {
    return (
      <pre className="docs-mermaid-fallback">
        <code>{props.code}</code>
      </pre>
    );
  }

  return <div ref={containerRef} className="docs-mermaid" />;
}

export function DocsImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const version = useDocsVersion();
  const { src, alt, ...rest } = props;

  if (!src) return null;

  return <img {...rest} src={resolveAssetSrc(src, version)} alt={alt ?? ''} loading="lazy" />;
}

export function DocsCode(
  props: React.HTMLAttributes<HTMLElement> & { className?: string; children?: ReactNode },
) {
  const { className, children, ...rest } = props;
  const match = /language-(\w+)/.exec(className ?? '');
  const language = match?.[1];
  const code = String(children ?? '').replace(/\n$/, '');

  if (language === 'mermaid') {
    return <MermaidBlock code={code} />;
  }

  if (className) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }

  return (
    <code {...rest} className={className}>
      {children}
    </code>
  );
}

export function DocsPre(props: React.HTMLAttributes<HTMLPreElement> & { children?: ReactNode }) {
  const child = props.children;
  if (
    child &&
    typeof child === 'object' &&
    'props' in child &&
    child.props &&
    typeof child.props === 'object' &&
    'className' in child.props &&
    typeof child.props.className === 'string' &&
    child.props.className.includes('language-mermaid')
  ) {
    return <>{child}</>;
  }

  return <pre {...props} />;
}
