import { useEffect, useState } from 'react';
import type { DocsManifest } from '@/types/docs';

let cachedManifest: DocsManifest | null = null;
let loadingPromise: Promise<DocsManifest> | null = null;

async function fetchDocsManifest(): Promise<DocsManifest> {
  if (cachedManifest) return cachedManifest;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch('/docs-manifest.json', { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('docs-manifest.json 加载失败，请先运行 npm run docs:manifest');
      }
      return response.json() as Promise<DocsManifest>;
    })
    .then((manifest) => {
      cachedManifest = manifest;
      return manifest;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

export function useDocsManifest() {
  const [manifest, setManifest] = useState<DocsManifest | null>(cachedManifest);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cachedManifest);

  useEffect(() => {
    if (cachedManifest) return;

    let cancelled = false;

    fetchDocsManifest()
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '文档索引加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { manifest, loading, error };
}

export function findVersion(manifest: DocsManifest | null, versionId: string) {
  return manifest?.versions.find((version) => version.id === versionId);
}

export function findDoc(
  manifest: DocsManifest | null,
  versionId: string,
  docSlug: string,
) {
  const version = findVersion(manifest, versionId);
  if (!version) return undefined;
  return version.docs.find((doc) => doc.slug === docSlug);
}
