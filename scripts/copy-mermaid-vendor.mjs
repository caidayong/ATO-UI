/**
 * 复制 mermaid 到 public/vendor，避免 Rolldown 打包含 Unicode 的 mermaid 产物导致 panic
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(REPO_ROOT, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
const DEST_DIR = path.join(REPO_ROOT, 'public', 'vendor');
const DEST = path.join(DEST_DIR, 'mermaid.min.js');

if (!fs.existsSync(SRC)) {
  console.warn('mermaid.min.js 不存在，请先 npm install mermaid');
  process.exit(0);
}

fs.mkdirSync(DEST_DIR, { recursive: true });
fs.copyFileSync(SRC, DEST);
console.log(`copied mermaid → ${DEST}`);
