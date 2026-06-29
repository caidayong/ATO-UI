export type DocCategory = 'SRS' | 'PAGE_PRD' | 'BACKLOG' | 'MODULE' | 'OTHER';

export interface DocManifestEntry {
  slug: string;
  fileName: string;
  category: DocCategory;
  title: string;
  relativePath: string;
}

export interface DocVersionManifest {
  id: string;
  docs: DocManifestEntry[];
}

export interface DocsManifest {
  generatedAt: string;
  versions: DocVersionManifest[];
}

export interface DocHeading {
  level: number;
  text: string;
  id: string;
}

export const DOC_CATEGORY_LABEL: Record<DocCategory, string> = {
  SRS: '需求规格说明书',
  PAGE_PRD: '页面需求与交互规格',
  BACKLOG: '迭代需求清单',
  MODULE: '模块需求稿',
  OTHER: '其他',
};

export const DOC_CATEGORY_ORDER: DocCategory[] = [
  'SRS',
  'PAGE_PRD',
  'BACKLOG',
  'MODULE',
  'OTHER',
];
