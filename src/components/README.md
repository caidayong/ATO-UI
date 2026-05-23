# components

可复用业务组件目录（如 StatusTag、PageHeader 等，见 `docs/spec/03-组件规范.md`）。

布局组件已迁至 `src/layouts/`。

| 组件 | 说明 |
|------|------|
| `DynamicValueInput` / `DynamicValueTextArea` | 在输入框旁提供「插入动态值」荧光棒（`HighlightOutlined`）；`DynamicValueTextArea` 默认 hover 显示入口；**统一改 `DynamicValueInput.tsx` 即可全站行为一致**。 |

用法：`import { DynamicValueInput } from '@/components/DynamicValueInput'`，按需传入 `globalVariableOptions`（全局变量名列）。
