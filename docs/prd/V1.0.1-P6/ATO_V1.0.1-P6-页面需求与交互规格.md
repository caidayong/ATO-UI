# ATO V1.0.1-P6 页面需求与交互规格

> **文档定位**：页面级 PRD / UI 交互规格（供产品与前端阅读；日常开发可短提示词引用本文件章节）  
> **保存路径**：`docs/prd/V1.0.1-P6/ATO_V1.0.1-P6-页面需求与交互规格.md`  
> **技术栈**：React + TypeScript + Ant Design + Vite  
> **迭代版本**：V1.0.1-P6（本稿聚焦 **新增** 页面；存量优化见清单 REQ-002～009，**不** 在本 PRD §3 逐页展开）  
> **状态**：**已验收**（2026-06-03 UI/交互验收通过；相对 2026-05-26 定稿见 **§0.2**）  
> **结构说明**：`docs/prd/V1.0.0/ATO_V1.0.0-页面需求与交互规格.md` **不存在**，本稿按 `template/页面需求与交互规格-模版.md` + `.cursor/rules/prd-from-raw.mdc` 生成。  
> **输入依据**：`prompt/page_design/AutoTestOne-V1.0.1-P6 原始页面需求设计.md`、`docs/prd/V1.0.1-P6/ATO_V1.0.1-P6-需求清单.md`

---

## 0 迭代变更摘要（相对工程基线 → V1.0.1-P6）

### 新增页面

| 页面序号 | 页面名称                   | 路由                                                     | 优先级 | 复杂度 |
| ---- | ---------------------- | ------------------------------------------------------ | --- | --- |
| 1    | 测试工具 / 项目日&周报          | `/tools/project-reports`（Tab：`?tab=daily` \| `weekly`） | P0  | 高   |
| 2    | 测试工具 / 项目日报 — 详情       | `/tools/project-reports/:reportConfigId`               | P0  | 中   |
| 3    | 测试工具 / 项目周报 — 项目数据汇总统计 | `/tools/project-reports/statistics`                    | P1  | 中   |

### 修改页面（本 PRD 不逐页展开）

| 范围                    | 变更类型   | 需求追溯               | 说明                                                   |
| --------------------- | ------ | ------------------ | ---------------------------------------------------- |
| 用例管理 / 测试运行 / 平台自动化报告 | 存量交互优化 | REQ-002～009、清单附录 A | 运行详情 Drawer 等见 **迭代需求清单** 与后续 **SRS**；实现时改既有页面，不新增路由 |

### 废弃/替换

| 原规划            | 处理方式             | 原因            |
| -------------- | ---------------- | ------------- |
| 测试工具 ·「测试日报」入口 | **替代** 为「项目日&周报」 | 清单 §2.2；避免双入口 |

### 状态更新

| 页面             | 原状态    | 新状态        |
| -------------- | ------ | ---------- |
| 项目日&周报（三路由）    | 🔴 未开发 | 🟢 **已验收**（2026-06-03） |
| 用例管理等（002～009） | 🟢 已开发 | 🟣 开发中（增量） |

### UI 验收变更摘要（§0.2，2026-06-03）

相对本稿 2026-05-26 定稿与原始页面需求设计初稿，**以验收通过的可运行原型为准**。实现文件：`ProjectReportsPage.tsx`、`ProjectReportDetailPage.tsx`、`ProjectReportStatisticsPage.tsx`；类型/Mock：`src/types/projectReports.ts`、`src/mocks/projectReports.ts`。

**项目日报 Tab**

- 工具栏左置「新建日报」+「团队」筛选（基础数据团队，含「全部」）；列表增列「所属团队」；创建时间仅显示日期。
- 操作列改为图标：编辑、生成/停止、删除、发送邮件；生成过程行末 Loading、完成 ✅；项目状态「已完成」时生成置灰（不隐藏）。
- 移除列表「启动/停止」定时与 DEV 角色切换器。
- 项目状态枚举：**正常 / 已完成 / 延期 / 暂停**（非「已发布」）；UAT 结束后可自动「已完成」。
- 新建/编辑：所属团队*；邮件模式仅 **手动 / 定时**；`senders[]`；测试计划 **3 阶段**（无「版本发布」），新建时各阶段开始/结束必填；新建弹窗不含项目状态。

**项目日报 — 详情**

- 默认展示 **生成报告全文预览**（多章节 + 图表 Mock），非仅 3 块纯文本。
- 顶栏：返回、标题与产品/版本同行、居中 **报告生成时间**、编辑/保存/取消；**无**详情页手动发送。

**项目周报 Tab**

- 团队：基础数据团队（**无「全部」**），前缀文案「团队」。
- 周切换：默认本周仅「上周」；查看历史周时显示「上周」「下周」「本周」（本周高亮）；相对周偏移导航。
- 历史自然周 Mock 统一 **已提交** 只读；**草稿** 态可编辑（与状态联动，非与是否本周绑定）。
- 产品列：**自定义文本**；测试人员：**多选**。
- 右上角 **统计 / 设置** 图标常显；设置弹窗见下。

**周报设置 Modal**

- 团队及责任人列表：团队、负责人、**钉钉号**；团队不可重复配置。
- 时间配置：周报收集检测时间、周报定期发送时间 — 均为 **每周星期几 + HH:mm:ss**（非仅时刻、非汇总邮件组字段）。

**未改或 P6 仍 Mock**：REQ-021/022 后台扫描与汇总发送、SMTP/钉钉真实对接、RDMS 产品接口。

---

## 1 全局约束

### 1.1 页面清单（本次迭代涉及）

**主框架页面**：

- 项目日&周报（`ProjectReportsPage`，含日报/周报 Tab + 周报设置 Modal）（🟢 已验收）
- 项目日报详情（`ProjectReportDetailPage`）（🟢 已验收）
- 项目数据汇总统计（`ProjectReportStatisticsPage`）（🟢 已验收）

**新窗口页面**：无

**测试工具 Hub**：`/tools` 卡片列表须 **新增**「项目日&周报」卡片（图标、排序与「市场缺陷分析」同级），**移除**代码与文案中「测试日报」残留（已定）。

### 1.2 框架与布局

- **继承** 主框架 `MainLayout`：顶栏面包屑 + 左侧菜单 + 内容区 `Card`。
- **面包屑**（须在 `MainLayout.buildBreadcrumbItems` 登记）：
  - `/tools/project-reports`：测试工具 / 项目日&周报
  - `/tools/project-reports/:id`：测试工具 / 项目日&周报 / 日报详情
  - `/tools/project-reports/statistics`：测试工具 / 项目日&周报 / 数据统计
- **Tab 与 URL 同步**：`?tab=daily` | `weekly`；切换 Tab 时 `replace` 更新 query，避免堆栈膨胀。
- **侧栏选中**：`/tools/project-reports` 及子路径归属「测试工具」菜单高亮（与 `/tools/market-defects` 同级策略，实现时扩展 `mainMenuSelectedKey`）。

### 1.3 组件与视觉规范

- **继承** Ant Design 5 默认主题；状态色与原始稿 0.4 对齐：
  - 项目状态（日报配置）：正常（蓝）/ **已完成**（绿）/ 延期（橙）/ 暂停（灰）
  - 周报状态：草稿（灰）/ 已提交（绿）
- **表格**：日报列表 `Table` + 分页；周报 Tab 大表 `Table` 支持横向滚动（列多）。
- **弹窗**：新建/编辑日报、`Modal` 宽度建议 720px；周报设置 `Modal` 建议 800px；`maskClosable={false}`（与 `docs/spec/03-组件规范` 一致）。
- **周报单元格编辑**：双击进入编辑，**失焦保存**（可用 `Input`/`Select` 覆盖单元格或行内编辑模式）。

### 1.4 状态枚举与颜色映射

| 枚举域        | 取值           | Tag 颜色  | 联动              |
| ---------- | ------------ | ------- | --------------- |
| 项目状态（日报配置） | 正常、**已完成**、延期、暂停 | 蓝/绿/橙/灰 | 删除：正常/延期禁止；生成：已完成置灰 |
| 邮件模式       | 定时、手动  | 默认      | 列表列「模式」；验收稿无「定时+手动」 |
| 周报填写状态（顶栏） | 草稿、已提交       | 灰/绿     | 提交后锁表           |
| 产品类型       | 平台、设备        | 默认      | 周报表下拉           |
| 项目类型       | 补丁、基线        | 默认      | 周报表下拉           |
| 进度         | 正常、已发布、延期    | 蓝/绿/橙   | 周报表下拉           |

### 1.5 通用交互规范

- **必填**：表单项 label 带 `*`；提交前 `Form` 校验，失败 `message.error` 首条或字段下提示。
- **删除二次确认**（默认）：`Modal.confirm`，文案 **「此操作不可恢复，是否继续？」**（REQ-016）。
- **日报名称唯一**：同 **产品** 下不可重复；保存 API/Mock 返回冲突时阻断并提示（REQ-010）。
- **Toast**：成功 `message.success`；失败 `message.error`；批量标签类汇总 Toast（本迭代无）。
- **空态**：`Empty` + 说明文案；日报详情无生成快照：「报告生成中，请稍后刷新」。
- **加载**：列表/查询 `loading`；统计页查询中表格/卡片区 Skeleton 或 Spin。
- **P6 边界**：邮件发送、钉钉提醒、汇总发送 **Mock**；不对接真实 SMTP（清单 §2.4）。

---

## 2 数据流与状态机（本次迭代涉及）

### 2.1 数据获取（Mock 占位）

| 页面              | 时机          | API 占位                                              | 说明         |
| --------------- | ----------- | --------------------------------------------------- | ---------- |
| 项目日&周报 · 日报 Tab | 进入 Tab / 刷新 | `GET /api/tools/project-reports/daily-configs`      | 列表         |
| 新建/编辑日报         | 打开弹窗        | `GET /api/rdms/products`（Mock）                      | 产品下拉       |
| 保存日报配置          | 确认          | `POST/PUT /api/tools/project-reports/daily-configs` | 含测试计划 4 行  |
| 生成日报            | 列表图标生成/停止  | `POST .../generate`（Mock）                         | 更新 latest-body |
| 手动发送            | 列表/详情       | `POST .../send`                                     | Mock 成功/失败 |
| 项目周报 Tab        | 切换团队/周      | `GET .../weekly-rows?team&week`                     | 含状态草稿/已提交  |
| 周报行             | 失焦保存        | `PATCH .../weekly-rows/:id`                         | 单元格级       |
| 周报提交            | 提交          | `POST .../weekly-submit`                            | 校验必填列      |
| 周报设置            | 打开 Modal    | `GET/PUT .../weekly-settings`                       | 管理员        |
| 日报详情            | 进入页         | `GET .../daily-configs/:id` + `GET .../latest-body` | 无历史则空态     |
| 统计页             | 查询          | `GET .../statistics?team&product&from&to`           | 返回 4 指标    |
| 团队/用户           | 各下拉         | `GET /api/settings/teams`、`GET /api/users`          | 团队含「全部」    |

### 2.2 全局状态变更

无新增 Redux/Context 要求；页面级 `useState` + `react-router` query 即可。

### 2.3 页面级状态建议

**ProjectReportsPage**：

```typescript
{
  activeTab: 'daily' | 'weekly';
  // 日报
  dailyList: DailyReportConfig[];
  dailyModal: { open: boolean; mode: 'create' | 'edit'; recordId?: string };
  // 周报
  selectedTeamId: string;
  weekRange: { start: string; end: string }; // 自然周 Mon-Sun
  weeklyWeekOffset: number; // 0=本周，负数=历史周
  weeklyStatus: 'draft' | 'submitted';
  weeklyRows: WeeklyReportRow[];
  settingsOpen: boolean;
}
```

**ProjectReportDetailPage**：

```typescript
{
  viewMode: 'preview' | 'edit';
  config: DailyReportConfig;
  generated: DailyGeneratedReport | null; // 生成报告快照（预览/编辑）
}
```

**ProjectReportStatisticsPage**：

```typescript
{
  filters: { teamId: string; productId: string; dateRange: [Dayjs, Dayjs] };
  metrics: StatisticsMetrics | null;
  loading: boolean;
}
```

### 2.4 关键状态机

**日报 · 项目状态 × 操作**（清单附录 D.1）：

```
正常/延期 ──[删除]──→ 禁止（提示原因）
已完成/暂停 ──[删除]──→ 确认后删除

列表 ──[生成/停止]──→ Mock 生成日报正文；已完成配置生成按钮置灰
```

**周报 · 填写状态**：

```
草稿 ──[提交]──→ 已提交（校验必填列；不可撤回；仅本周可提交）
已提交 ──[编辑/删除行/添加行]──→ 禁止
历史自然周（Mock）──→ 强制已提交只读
```

**周报 · 可编辑性**：

```
状态 = 草稿 ──→ 可编辑（含失焦保存）
状态 = 已提交 ──→ 只读（与是否本周无关）
```

---

## 3 页面详细设计

### 3.1 项目日&周报（页面 1）

**基本信息**：

- 状态：🟢 已验收
- 框架：主框架
- 路由：`/tools/project-reports`；`?tab=daily` | `?tab=weekly`
- 路由常量建议：`ROUTES.TOOLS_PROJECT_REPORTS = '/tools/project-reports'`
- 入口参数：`tab`（query，可选，默认 `daily`）
- 入口来源：测试工具卡片列表；菜单「测试工具」

**权限（验收稿 2026-06-03）**：

- **统计**、**设置**：周报 Tab 右上角 **图标入口常显**（不再按角色隐藏；统计页能力仍可按 SRS 扩展）
- 周报团队默认：当前用户所属第一团队（`mockCurrentUserTeamIds`）

**技术实现提示**：

- 单文件 `ProjectReportsPage.tsx`，内 `Tabs` + 两个 `items` 子面板，或拆 `DailyReportTab` / `WeeklyReportTab` 子组件
- 日报：`Table` + `Modal` + 内嵌 `Table`（测试计划 4 行）
- 周报：`Select`（团队）+ `Table` 可编辑列 + 表尾「添加」
- 设置：`WeeklySettingsModal.tsx`

**布局结构**：

```
┌─ MainLayout 面包屑：测试工具 / 项目日&周报 ─────────────────┐
│ Card + Tabs [项目日报] [项目周报]                            │
│  ┌─ 项目日报 ───────────────────────────────────────────┐  │
│  │ [新建日报] [团队▼]  Table + 分页                      │  │
│  │ 操作列：图标 编辑|生成/停止|删除|发送邮件 + 生成状态指示  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌─ 项目周报 ───────────────────────────────────────────┐  │
│  │ 行1：团队|状态|日期     [提交] [统计图标][设置图标]    │  │
│  │ 行2（居中）：[上周] [下周?] [本周?]                   │  │
│  │ Table + 表尾[添加]                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Tab — 项目日报**

**操作栏**：`新建日报`；`团队` 筛选（基础数据，含「全部」）

**列表列**：日报名称（链详情）、产品、**所属团队**、项目版本、测试负责人、创建时间（**YYYY-MM-DD**）、模式 Tag、项目状态 Tag

**操作列（图标）**：编辑；生成/停止（已完成置灰；生成中 Loading、完成 ✅）；删除；发送邮件

**删除规则**：正常/延期 **禁止**；已完成/暂停 确认后删除（REQ-016）

**Modal — 新建**：日报名称*、所属团队*、产品*、分支、项目版本*、测试计划 **3 行**（冒烟/SIT/UAT，新建开始/结束必填）、测试负责人*、版本开发负责人、邮件模式（手动/定时）、定时生效日期+每日时刻、`senders[]`；**无**项目状态

**Modal — 编辑**：名称/产品/分支/版本只读；可改团队、测试计划、负责人、邮件、项目状态（正常/已完成/延期/暂停）

**Tab — 项目周报**

**顶栏行 1**：`团队` + Select（基础数据，**无全部**）| 草稿/已提交 Tag | 周起止日期 |（本周草稿）[提交] | 统计图标 | 设置图标

**顶栏行 2（居中）**：默认本周仅 `[上周]`；历史周 `[上周][下周][本周↑]`（weekOffset 导航）

**表格列**：产品 **Input 文本**、产品类型、项目版本、项目类型、进度、发布时间、测试人员 **多选**、本周进展、下周计划、备注；失焦保存

**可编辑**：**已提交** 只读（历史周 Mock 强制已提交）；**草稿** 可编辑

**设置 Modal — 周报设置**：团队及责任人列表（团队/负责人/钉钉号，团队不重复）；收集检测时间、定期发送时间（各：**星期 + HH:mm:ss**）

**关键交互**：

1. **新建/编辑日报**：同产品日报名称唯一；UAT 结束后可自动「已完成」（REQ-010～012）
2. **生成日报**：列表 Mock 生成正文；停止可取消（验收增强）
3. **发送邮件**：列表图标；Mock Toast（REQ-015）
4. **删除日报**：正常/延期禁止；已完成/暂停允许（REQ-016）
5. **周报提交**：仅本周草稿；校验产品名、版本、测试人员≥1、进展与计划（REQ-020）
6. **周报周切换**：相对偏移；历史周已提交只读（REQ-023）
7. **设置保存**：团队去重 + 双时间配置（REQ-025）；021/022 后台 Mock

**REQ 追溯**：010～012、015～016、017～020、023、025

---

### 3.2 项目日报 — 详情（页面 2）

**基本信息**：

- 状态：🟢 已验收
- 框架：主框架
- 路由：`/tools/project-reports/:reportConfigId`
- 建议函数：`projectReportDetailPath(id: string) => '/tools/project-reports/${id}'`
- 入口参数：`reportConfigId`（路径参数，= 日报配置 ID）
- 入口来源：日报列表日报名称链接；外链直达

**技术实现提示**：

- `ProjectReportDetailPage.tsx`
- 预览态：`Typography.Paragraph` 或只读 `Input.TextArea`（borderless）
- 编辑态：`Form` + 3 个 `Input.TextArea`
- 顶栏 `PageHeader` 或 `Space`：标题 + 按钮组

**布局结构**：

```
┌─ 面包屑：测试工具 / 项目日&周报 / 日报详情 ────────────────┐
│ [返回] 日报名称 + 产品/版本  |  报告生成时间（居中）  | 编辑/保存/取消 │
│ ─────────────────────────────────────────────────────────── │
│ 预览态：完整生成报告（多章节 + 图表 Mock）                    │
│ 编辑态：结构化报告编辑（进度/结论/缺陷/用例/风险等）          │
│ 无快照 → Empty「报告生成中，请稍后刷新」                      │
└────────────────────────────────────────────────────────────┘
```

**关键交互**：

1. 默认 **预览态**；展示 `DailyGeneratedReport`（REQ-013，验收扩展为多章节报告）
2. **编辑** → `ProjectDailyReportEditor`；**保存** → 回预览态（REQ-014）
3. **取消**：丢弃未保存，回预览态
4. **无**详情页手动发送（发送在列表「发送邮件」图标）
5. **返回**：`navigate('/tools/project-reports?tab=daily')`

**REQ 追溯**：013、014、015

---

### 3.3 项目数据汇总统计（页面 3）

**基本信息**：

- 状态：🟢 已验收
- 框架：主框架
- 路由：`/tools/project-reports/statistics`
- 路由常量建议：`ROUTES.TOOLS_PROJECT_REPORTS_STATISTICS`
- 入口来源：周报 Tab「统计」；直达 URL

**权限**：周报 Tab「统计」图标常显（验收稿）；统计页筛选逻辑可按角色扩展（D.3 / SRS）

**技术实现提示**：

- `ProjectReportStatisticsPage.tsx`
- 筛选：`Form` inline + `RangePicker`（默认最近一个自然季度）
- 结果：`Row` + 4×`Card`/`Statistic` 展示指标（P6 不强制图表）

**布局结构**：

```
┌─ 面包屑：测试工具 / 项目日&周报 / 数据统计 ─────────────────┐
│ [返回] 回到 ?tab=weekly                                      │
│ 筛选：团队 | 产品 | 时间范围 [查询]                          │
│ 结果区：4 指标卡片（同一次查询结果集）                        │
│   基线版本数量 | 补丁版本数量 | 新增用例数量 | 提交 Bug 数量   │
└────────────────────────────────────────────────────────────┘
```

**筛选区**：

| 字段   | 控件          | 必填  | 默认                 |
| ---- | ----------- | --- | ------------------ |
| 团队   | Select      | 是   | 含「全部」              |
| 产品   | Select RDMS | 是   | 含「全部」              |
| 时间范围 | RangePicker | 是   | **最近一个季度**（自然季度起止） |

**结果区**（附录 E.2）：

- 基线版本数量
- 补丁版本数量
- 新增用例数量
- 提交 Bug 数量

**关键交互**：

1. 进入页预填默认季度（REQ-024、E.3）
2. **查询**：Loading → 展示 4 项；无数据 `Empty`
3. P6 **Mock** 聚合；统计口径与 RDMS/API 映射下放实现阶段
4. **返回**：`/tools/project-reports?tab=weekly`

**REQ 追溯**：024

---

## 4 示例数据（本次迭代新增）

### 4.1 日报配置 `DailyReportConfig`

```typescript
export interface DailyReportConfig {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  productId: string;
  productName: string;
  branch?: string;
  projectVersion: string;
  testOwnerId: string;
  testOwnerName: string;
  devOwnerId?: string;
  devOwnerName?: string;
  mode: '定时' | '手动';
  projectStatus: '正常' | '已完成' | '延期' | '暂停';
  timerEnabled: boolean;
  timerSchedule?: { rangeStart: string; rangeEnd: string; dailyTime: string };
  createdAt: string;
  testPlan: Array<{
    phase: '冒烟测试' | 'SIT 测试' | 'UAT 测试';
    startAt?: string;
    endAt?: string;
  }>;
  senders: string[];
}
```

### 4.2 日报正文 `DailyReportBody`

```typescript
export interface DailyReportBody {
  configId: string;
  generatedAt: string;
  progress: string;
  risks?: string;
  tomorrowPlan?: string;
}
```

### 4.3 周报行 `WeeklyReportRow`

```typescript
export interface WeeklyReportRow {
  id: string;
  teamId: string;
  productName: string;
  productType: '平台' | '设备';
  projectVersion: string;
  projectType: '补丁' | '基线';
  progress: '正常' | '已发布' | '延期';
  publishedAt?: string;
  testerIds: string[];
  weeklyProgress: string;
  nextWeekPlan: string;
  remark?: string;
}

export interface WeeklySettings {
  teamLeads: Array<{ teamId: string; leaderId: string; dingTalkId: string }>;
  collectionCheck: { weekday: number; time: string }; // time: HH:mm:ss
  scheduledSend: { weekday: number; time: string };
}
```

### 4.4 统计结果 `StatisticsMetrics`

```typescript
export interface StatisticsMetrics {
  baselineVersionCount: number;
  patchVersionCount: number;
  newCaseCount: number;
  submittedBugCount: number;
}
```

### 4.5 Mock 片段示例

```typescript
export const mockDailyConfigs: DailyReportConfig[] = [
  {
    id: 'dr-001',
    name: '支付线-SIT-日报',
    productId: 'p-pay',
    productName: '支付核心',
    projectVersion: 'v2.3.1',
    testOwnerName: '张三',
    mode: '定时+手动',
    projectStatus: '正常',
    timerEnabled: true,
    createdAt: '2026-05-20T10:00:00Z',
    testPlan: [
      { phase: '冒烟测试', startAt: '2026-05-01T09:00:00Z' },
      { phase: 'SIT 测试' },
      { phase: 'UAT 测试' },
      { phase: '版本发布' },
    ],
    mailGroup: 'qa-daily@company.com',
  },
];
```

---

## 5 开发计划（建议）

### 5.1 页面开发优先级

| 优先级 | 页面         | 依赖            | 说明              |
| --- | ---------- | ------------- | --------------- |
| P0  | 3.1 项目日&周报 | 路由/面包屑/工具卡片   | 含日报+周报+设置 Modal |
| P0  | 3.2 日报详情   | 3.1 列表跳转      |                 |
| P1  | 3.3 统计     | 3.1 周报 Tab 入口 |                 |

### 5.2 技术风险点

| 风险           | 影响   | 建议                                                                       |
| ------------ | ---- | ------------------------------------------------------------------------ |
| 周报大表单元格编辑    | 3.1  | 先用行内 Form + 受控组件；复杂再抽 `EditableTable`                                    |
| 路由未登记        | 全局   | 同步 `routes.ts`、`App.tsx`、`MainLayout` 面包屑                                |
| RDMS 产品接口未就绪 | 下拉   | P6 全 Mock，类型预留 `productId`                                               |
| 角色权限 Mock    | 按钮显隐 | **已定**：开发环境提供 `member` / `lead` / `admin` 切换（如顶栏调试 Select），用于验收设置/统计按钮显隐 |

---

## 6 输出要求

### 6.1 单页交付清单

1. `src/pages/ProjectReportsPage.tsx`（及子组件可选）
2. `src/pages/ProjectReportDetailPage.tsx`
3. `src/pages/ProjectReportStatisticsPage.tsx`
4. `src/types/projectReports.ts`（或并入 `index.ts`）
5. `src/mocks/projectReports.ts`
6. `src/constants/routes.ts` — 新增 `TOOLS_PROJECT_REPORTS` 等
7. `src/App.tsx` — 注册路由
8. `src/layouts/MainLayout.tsx` — 面包屑 + 菜单卡片/选中态
9. 测试工具 Hub 页 — 新增「项目日&周报」卡片，移除「测试日报」残留
10. 定稿后更新 `docs/spec/01-信息架构与路由.md`（登记 3 条路由）、`04-页面契约.md`、`06-开发进度.md`（若存在）
11. （开发期）角色 Mock 切换器：仅 dev 构建可见，用于验收设置/统计按钮显隐

### 6.2 代码规范

继承基线：PascalCase 页面组件；API `try/catch` + `message.error`；危险操作 `Modal.confirm`。

---

## 7 附录：快速参考

- 状态标记：🟢 已开发 / 🟡 待开发 / 🔴 未开发 / 🟣 开发中
- 本迭代 **3** 个新路由页面，**16** 条新增 REQ（010～025）中 **14** 条落 UI（021/022 后台）

---

**文档版本**：V1.0.1-P6  
**文档类型**：页面需求与交互规格（PRD）  
**基线版本**：工程已实现页 + 清单 V1.0.1-P6  
**最后更新**：2026-05-26  
**迭代目标**：交付「项目日&周报」替代测试日报，含日报配置/详情、周报填写与统计

---

## 《相对原始需求的差异与取舍》

| 项            | 取舍说明                                                                             |
| ------------ | -------------------------------------------------------------------------------- |
| 结构深度范例       | `ATO_V1.0.0-页面需求与交互规格.md` 不存在，章节按模版与 prd-from-raw 生成，深度以对齐原始稿+清单为准               |
| 组件命名         | PRD 建议 `ProjectReportsPage` 等文件名，最终以 `src/pages` 既有命名为准，须在 Spec 同步               |
| 路由常量         | 原始稿写路径字符串；PRD 补充 `ROUTES.*` 建议，**实现前**须写入 `routes.ts`（当前仓库尚无 project-reports 常量） |
| 统计结果展示       | 原始稿「卡片或并列数值」未定；PRD 默认 **4×Statistic 卡片**，图表下放                                    |
| 周报「取消编辑」     | **已定**：详情编辑态提供「取消」，回预览态且不保存                                                      |
| 信息架构 Spec    | **已定**：定稿后首版同步 `docs/spec/01`（或等价路由文档）；定稿前以本 PRD §0/§3 + 清单 §2.2 为准              |
| RDMS 产品 Mock | **已定**：下拉仅 `productId` + `productName`                                           |
| Hub 卡片       | **已定**：与市场缺陷分析同级图标与排序                                                            |
| 测试日报移除       | **已定**：本迭代移除「测试日报」入口/文案/路由残留                                                     |
| 存量页 002～009  | 不进入 §3，避免与「仅新增原始稿」冲突；改动用例/报告 Drawer 另立变更摘要或 SRS                                  |

---

## 《待评审问题清单》

> **处理结论**（2026-05-26）：产品确认 **全部采用建议默认**；对应条文已写入 §1、§3、§5.2 或《差异与取舍》。

| #   | 问题                                       | 建议默认             | 结论                                       |
| --- | ---------------------------------------- | ---------------- | ---------------------------------------- |
| 1   | `docs/prd/PRD生成与验收清单.md` 是否存在并用于本迭代验收？   | 补文件或等效评审表        | **已关闭**：已用该清单完成 P6 验收                    |
| 2   | `docs/spec/01-信息架构与路由.md` 是否同步登记 3 条新路由？ | 定稿 PRD 后一并改 Spec | **已采纳**：定稿后首版同步 Spec（见 §6.1 #10）         |
| 3   | 测试工具 Hub 卡片：除文案外图标/排序是否有规范？              | 与市场缺陷分析卡片同级      | **已采纳** → §1.1                           |
| 4   | 日报详情编辑态是否需要「取消」？                         | 提供取消回预览态         | **已采纳** → §3.2 关键交互 #4                   |
| 5   | 周报「上周」只读时是否展示历史提交态 Tag？                  | 展示只读状态文案         | **已采纳** → §3.1 周报操作栏                     |
| 6   | 管理员 Mock：开发阶段如何切换角色？                     | 开发环境角色切换器        | **已采纳** → §5.2                           |
| 7   | RDMS 产品 Mock 字段                          | 仅 id + name      | **已采纳** → §4.1 `productId`/`productName` |
| 8   | 统计页「最近一个季度」定义                            | **自然季度**（清单 E.1） | **已采纳** → §3.3 筛选区                       |
| 9   | 邮件组控件形态                                  | Select 预设 + 可扩展  | **已采纳** → §3.1 新建日报/设置 Modal             |
| 10  | 是否移除「测试日报」残留                             | 是，与 §2.2 替代一致    | **已采纳** → §0、§1.1、§6.1                   |
