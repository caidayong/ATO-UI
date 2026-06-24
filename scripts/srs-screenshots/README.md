# SRS 原型截图（Playwright）

为迭代《需求规格说明书》自动截取 UI 原型图。规则见 **`docs/prd/SRS生成规则-v1.md`**。

## 目录

| 文件 | 说明 |
|------|------|
| `config.yaml` | 端口、视口、超时等（换环境改此文件） |
| `fixtures.json` | 全库统一 Mock 夹具（projectId、taskId 等） |
| `capture.mjs` | 执行器 |

各迭代场景：`docs/prd/V{X.Y.Z}/srs-screenshot-scenarios.yaml`

## 首次安装

```bash
npm install
npx playwright install chromium
```

## 运行

```bash
# 全量（本迭代 yaml 内所有 REQ）
npm run srs:screenshots -- --version V1.0.1-P6

# 单个 REQ（smoke）
npm run srs:screenshots -- --version V1.0.1-P6 --req REQ-V1.0.1-P6-010

# dev 已手动 npm run dev 时
npm run srs:screenshots -- --version V1.0.1-P6 --no-dev
```

产出：

- `docs/prd/V1.0.1-P6/assets/srs-screenshots/*.png`
- `docs/prd/V1.0.1-P6/assets/srs-screenshots/manifest.json`（Agent 嵌 Markdown 用）

## 场景 YAML 步骤类型

| step | 示例 |
|------|------|
| `goto` | `/tools/project-reports?tab=daily` 或带 `{fixture.platformTaskId}` |
| `waitMs` | `500` |
| `clickText` | `新建日报` |
| `clickSelector` | `.report-case-name-link` |
| `clickRole` | `{ role: tab, name: 测试报告 }` |

每个 REQ 最多 **2** 个 `shots`（见 `config.yaml` 的 `maxShotsPerReq`）。

## SRS 嵌入

在每个 `####` 的 **需求描述** 之前：

```markdown
• **原型：**

![REQ-010 新建日报](assets/srs-screenshots/REQ-V1.0.1-P6-010.png)
```

`是否涉及UI=否` 时写 **无**。
