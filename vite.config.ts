import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRD_ROOT = path.resolve(__dirname, 'docs/prd');

const MIME_TYPES: Record<string, string> = {
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function docsAssetsPlugin(): Plugin {
  return {
    name: 'docs-assets',
    configureServer(server) {
      server.middlewares.use('/docs-assets', (req, res, next) => {
        const rawUrl = req.url?.split('?')[0] ?? '';
        const relative = decodeURIComponent(rawUrl.replace(/^\//, ''));
        if (!relative) {
          next();
          return;
        }

        const filePath = path.resolve(PRD_ROOT, relative);
        if (!filePath.startsWith(PRD_ROOT)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      const distAssetsRoot = path.resolve(__dirname, 'dist/docs-assets');
      fs.mkdirSync(distAssetsRoot, { recursive: true });

      if (!fs.existsSync(PRD_ROOT)) return;

      for (const ent of fs.readdirSync(PRD_ROOT, { withFileTypes: true })) {
        if (!ent.isDirectory() || !ent.name.startsWith('V')) continue;

        copyVersionDocs(path.join(PRD_ROOT, ent.name), path.join(distAssetsRoot, ent.name));
      }
    },
  };
}

function copyDirectory(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });

  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, ent.name);
    const destPath = path.join(dest, ent.name);

    if (ent.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const SKIP_EXTENSIONS = new Set(['.xlsx', '.xls', '.yaml', '.yml']);

function copyVersionDocs(srcVersionDir: string, destVersionDir: string) {
  fs.mkdirSync(destVersionDir, { recursive: true });

  for (const ent of fs.readdirSync(srcVersionDir, { withFileTypes: true })) {
    const srcPath = path.join(srcVersionDir, ent.name);
    const destPath = path.join(destVersionDir, ent.name);

    if (ent.isDirectory()) {
      if (ent.name === 'assets') {
        copyDirectory(srcPath, destPath);
      }
      continue;
    }

    const ext = path.extname(ent.name).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) continue;

    if (
      ext === '.md' ||
      ext === '.png' ||
      ext === '.jpg' ||
      ext === '.jpeg' ||
      ext === '.webp' ||
      ext === '.gif' ||
      ext === '.svg' ||
      ext === '.json'
    ) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), docsAssetsPlugin()],
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
