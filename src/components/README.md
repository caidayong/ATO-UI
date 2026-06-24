# components

可复用业务组件目录（如 StatusTag、PageHeader 等，见 `docs/spec/03-组件规范.md`）。

## 布局壳（ato-ui-develop）

| 组件 | 路径 | 说明 |
|------|------|------|
| `ListPageShell` | `src/components/layout/ListPageShell.tsx` | 表格列表页：工具栏 Card + 内容 Card |
| `FilterToolbar` | `src/components/layout/FilterToolbar.tsx` | 左主操作 + 右筛选 |
| `FormModal` | `src/components/layout/FormModal.tsx` | 表单弹窗，默认防误关 |

```tsx
import { ListPageShell, FormModal } from '@/components/layout';
```

参照实现：`src/pages/ProductionPlanList.tsx`。

主框架布局在 `src/layouts/`。

## 其它组件
| `DynamicValueInput` / `DynamicValueTextArea` | 在输入框旁提供「插入动态值」荧光棒（`HighlightOutlined`）；`DynamicValueTextArea` 默认 hover 显示入口；**统一改 `DynamicValueInput.tsx` 即可全站行为一致**。 |

用法：`import { DynamicValueInput } from '@/components/DynamicValueInput'`，按需传入 `globalVariableOptions`（全局变量名列）。
