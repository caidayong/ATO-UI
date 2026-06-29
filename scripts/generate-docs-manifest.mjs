/**
 * 扫描 docs/prd 下各版本目录中的 .md 文件，生成 src/generated/docs-manifest.json
 *
 * 用法：npm run docs:manifest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PRD_ROOT = path.join(REPO_ROOT, 'docs', 'prd');
const OUT_FILE = path.join(REPO_ROOT, 'public', 'docs-manifest.json');

function categorize(fileName) {
  if (fileName.includes('-需求规格说明书')) return 'SRS';
  if (fileName.includes('-页面需求与交互规格')) return 'PAGE_PRD';
  if (fileName.includes('迭代需求清单') || fileName.includes('-需求清单')) return 'BACKLOG';
  if (
    fileName.includes('-新增') ||
    fileName.includes('-优化') ||
    fileName.endsWith('_需求文档.md')
  ) {
    return 'MODULE';
  }
  return 'OTHER';
}

function titleFromFileName(fileName) {
  let base = fileName.replace(/\.md$/, '');
  base = base.replace(/^ATO[_-]V[\d.]+(?:-P\d+)?[-_]?/i, '');

  if (base.endsWith('-需求规格说明书')) {
    const moduleName = base.replace(/-需求规格说明书$/, '');
    return `${moduleName} · 需求规格说明书`;
  }
  if (base.endsWith('-页面需求与交互规格')) {
    const moduleName = base.replace(/-页面需求与交互规格$/, '');
    return `${moduleName} · 页面需求与交互规格`;
  }
  if (base.includes('迭代需求清单')) return '迭代需求清单';
  if (base.endsWith('-需求清单')) return base;

  if (base.endsWith('-新增优化')) {
    return `${base.replace(/-新增优化$/, '')}（新增/优化）`;
  }
  if (base.endsWith('-新增')) {
    return `${base.replace(/-新增$/, '')}（新增）`;
  }
  if (base.endsWith('-优化')) {
    return `${base.replace(/-优化$/, '')}（优化）`;
  }

  return base.replace(/_/g, ' ');
}

const GENERIC_HEADING = /^(文档说明|1\s+需求说明)$/;

function extractTitle(content, fileName, category) {
  const fromFileName = titleFromFileName(fileName);
  const match = content.match(/^#\s+(.+)$/m);
  const heading = match?.[1]?.trim();

  if (!heading || GENERIC_HEADING.test(heading)) {
    return fromFileName;
  }

  if (category === 'PAGE_PRD' || category === 'BACKLOG' || category === 'OTHER') {
    return heading;
  }

  if (category === 'SRS' && heading.includes('需求规格说明书')) {
    return heading;
  }

  if (category === 'MODULE' && heading.startsWith('ATO ')) {
    return heading;
  }

  return fromFileName;
}

function collectMarkdownFiles(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'assets') continue;
      collectMarkdownFiles(full, files);
    } else if (ent.name.endsWith('.md')) {
      const relativePath = path
        .relative(REPO_ROOT, full)
        .split(path.sep)
        .join('/');
      if (relativePath.includes('/assets/')) continue;
      files.push({ full, relativePath });
    }
  }
  return files;
}

function main() {
  if (!fs.existsSync(PRD_ROOT)) {
    console.error(`docs/prd 目录不存在: ${PRD_ROOT}`);
    process.exit(1);
  }

  const versions = [];

  for (const ent of fs.readdirSync(PRD_ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory() || !ent.name.startsWith('V')) continue;

    const versionDir = path.join(PRD_ROOT, ent.name);
    const mdFiles = collectMarkdownFiles(versionDir);

    const docs = mdFiles
      .map(({ full, relativePath }) => {
        const fileName = path.basename(full);
        const content = fs.readFileSync(full, 'utf8');
        return {
          slug: fileName.replace(/\.md$/, ''),
          fileName,
          category: categorize(fileName),
          title: extractTitle(content, fileName, categorize(fileName)),
          relativePath,
        };
      })
      .sort((a, b) => a.fileName.localeCompare(b.fileName, 'zh-CN'));

    versions.push({ id: ent.name, docs });
  }

  versions.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));

  const manifest = {
    generatedAt: new Date().toISOString(),
    versions,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const docCount = versions.reduce((sum, v) => sum + v.docs.length, 0);
  console.log(`docs manifest: ${versions.length} versions, ${docCount} documents → ${OUT_FILE}`);
}

main();
