# components

可复用业务组件目录（如 StatusTag、PageHeader 等，见 `docs/spec/03-组件规范.md`）。

布局组件已迁至 `src/layouts/`。

| 组件 | 说明 |
|------|------|
| `DynamicValueInput` | 在「变量值 / 参数值 / 配置值」等输入框右侧提供「插入动态值」（全局变量占位 `{{name}}`、数据生成表达式）；**统一改此文件即可全站入口行为一致**。 |

用法：`import { DynamicValueInput } from '@/components/DynamicValueInput'`，按需传入 `globalVariableOptions`（全局变量名列）。
