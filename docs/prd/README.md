# docs/prd — 页面需求与交互规格（PRD）

本目录存放 **页面级需求与 UI/交互规格**，作为需求源头；与 `docs/spec/` 工程活文档配合使用。  
首次/重置产出 Spec 时，可配合 `docs/spec/intake/` 四个输入包（见该目录 `README.md`）。

| 文件 | 说明 |
|------|------|
| `ATO_V1.0.0-页面需求与交互规格.md` | V1.0.0 基线（冻结，记录最初设计） |
| `ATO_V1.0.0-变更记录-示例.md` | 【模板】变更记录格式示例 |
| `ATO_V1.0.X-变更记录.md` | 【迭代】每轮仅记录与上一版的变化 |
| `ATO_V1.0.X-当前有效规格.md` | 【聚合】基线+变更合并后的可读完整版 |
| `页面PRD生成与验收清单.md` | 《页面需求与交互规格》生成后人工评审清单（定稿门禁） |
| `SRS生成与验收清单.md` | 《需求规格说明书》生成后双轨验收清单（L2 产品定稿 → L3 spec-coding 就绪） |
| `SRS生成规则-v1.md` | SRS 生成粒度、先图后文、章节与 REQ 对应等规则摘要 |
| `V1.0.1-P5/ATO_V1.0.1-P5-页面需求与交互规格.md` | **V1.0.1-P5** 迭代页面 PRD（已定稿，见清单勾选记录） |

### 两份验收清单（不可互替）

| 清单 | 适用文档 | 典型阶段 |
|------|----------|----------|
| [`页面PRD生成与验收清单.md`](页面PRD生成与验收清单.md) | `ATO_V*-页面需求与交互规格.md` | 原始需求 → 页面交互规格定稿 |
| [`SRS生成与验收清单.md`](SRS生成与验收清单.md) | `ATO_V*-{一级需求}-需求规格说明书.md` | 迭代需求清单 → SRS 定稿（含 L2/L3） |
| [`.cursor/skills/srs-design/`](../.cursor/skills/srs-design/) | 同上 | **Agent Skill**：Phase 0/1/2 编排、三件套门禁、Playwright 先图后文 |

**二者不可互相替代**：页面 PRD 清单通过 ≠ SRS 可定稿；SRS 清单通过也不免除页面 PRD 在「新增」类需求下的验收义务（见 `SRS生成规则-v1.md` §2）。生成规则与自检流程分别见各清单文首说明。

**工程规格（`docs/spec/`）**：与已定稿 PRD 对齐的路由、页面契约与开发计划见 [`../spec/README.md`](../spec/README.md)。

**完整迭代流程（文档驱动）**

```
原始需求 → PRD（页面交互规格） → 代码开发 → 变更记录 → 需求规格说明书（迭代 SRS）→ 全量需求库
    ↑            ↑               ↑           ↑              ↑
    └────────────┴───────────────┴───────────┴──────────────┘
                    所有文档保持一致
```

### Phase 1：PRD 阶段（开发视角）

1. **编写原始需求**：`prompt/page_design/AutoTestOne-V*-原始页面需求设计.md`
2. **生成 PRD + AI 自检**：`prompt/page_design/原始需求转前端PRD提示词.md`
3. **人工验收**：[`页面PRD生成与验收清单.md`](页面PRD生成与验收清单.md) → 定稿

### Phase 2：代码迭代（反向更新）

4. **代码开发**：`src/pages/*.tsx`
5. **写代码注释**：顶部 JSDoc（`@page` / `@version` / `@base` / `@changes`）；Cursor 编辑页面文件时由 `.cursor/rules/page-jsdoc.mdc` 约束
6. **写变更记录**：每迭代新建 `ATO_V1.0.X-变更记录.md`
7. **定期聚合**（3-5 迭代）：`prompt/prompt_prd_writer/聚合生成当前有效规格.md`

### Phase 3：迭代《需求规格说明书》（与根目录「闭合主流程」步骤 7 一致）

8. **生成《需求规格说明书》（SRS / 迭代 PRD）**
   - **工具**：`prompt/prompt_prd_writer/需求规格说明书-生成提示词.md`
   - **规则**：`.cursor/rules/srs-from-iteration-backlog.mdc`
   - **输入**：已定稿迭代需求清单 +（按门禁）已定稿页面需求与交互规格 + 可选代码/Mock
   - **输出**：`docs/prd/V{X.Y.Z}/ATO_V{X.Y.Z}-{一级需求描述}-需求规格说明书.md`（**一份文件仅一个一级需求**）
   - **模版 / 范例**：`template/需求规格说明书-模版.md`、`template/ATO_V1.0.1-P5-需求规格说明书-范例-市场缺陷分析.md`
   - **与页面交互规格区别**：`docs/prd/` 下 **页面交互规格** 服务 HTML 原型；**需求规格说明书** 服务研发/测试验收与 spec-coding；冲突时以已定稿 SRS 为准（见范例文首）
   - **人工验收**：[`SRS生成与验收清单.md`](SRS生成与验收清单.md)（L2 → L3，不可与页面 PRD 清单混用）
   - **REQ 条文节字段**：每个 `###` / `####` 须含 **需求类型**（新增/优化，与清单一致）、优先级、原型、需求描述等，见 [`SRS生成规则-v1.md`](SRS生成规则-v1.md) §5

**迭代《需求规格说明书》（交付研发 / 测试，非页面 PRD）**

- **提示词**：`prompt/prompt_prd_writer/需求规格说明书-生成提示词.md`（目录说明见 `prompt/prompt_prd_writer/README.md`、总索引 `prompt/README.md`）
- **Cursor 规则**：`.cursor/rules/srs-from-iteration-backlog.mdc`
- **模版 / 黄金范例**：`template/需求规格说明书-模版.md`、`template/ATO_V1.0.1-P5-需求规格说明书-范例-市场缺陷分析.md`
- **输出路径示例**：`V1.0.1-P5/ATO_V1.0.1-P5-{一级需求描述}-需求规格说明书.md`（命名见根目录 `使用指导.md`）

**模板与示例**
- 变更记录模板：`ATO_V1.0.0-变更记录-示例.md`
- PRD 模板：`template/页面需求与交互规格-模版.md`
- 产品需求模板：`template/产品业务需求规格说明书-模版.md`
- 产品需求规则：`.cursor/rules/prd-to-requirements.mdc`
