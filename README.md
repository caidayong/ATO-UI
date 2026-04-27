# ATO-UI 前端项目

基于 `React + TypeScript + Vite` 的前端项目。

## 环境要求

- Node.js 20+（建议 LTS）
- npm 10+

## 本地开发

```bash
npm install
npm run dev
```

默认启动后可通过 `http://localhost:5173` 访问。

## Linux 服务器快速启动

```bash
git clone https://github.com/caidayong/ATO-UI.git
cd ATO-UI
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

然后通过 `http://<服务器IP>:5173` 访问页面。

## 生产构建

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

构建产物在 `dist/` 目录。
