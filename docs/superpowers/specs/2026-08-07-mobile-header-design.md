# 移动端首页头部重设计 · 方案 A（双层头部）

> 日期：2026-08-07
> 范围：AppHeader / LeagueTabs / LeagueSubNav / FavoritesDropdown 四处移动端头部适配
> 前提红线：**PC 端样式与交互零影响**——所有改动只在 Tailwind `< md`（< 768px）断点生效
> Mockup 参考：`tmp/mockup/mobile-header.html`

## 一、背景与决策

**问题**：移动端首页头部把 6 个联赛标签 + 搜索 + 收藏 + 语言切换全塞进一行，外加 logo，窄屏上挤作一团，联赛标签只能横滑露出半个。

**用户诉求**（方案讨论时确认）：手机上最高频操作是**频繁切换联赛**，因此联赛标签必须**常驻可见、一键直达**，不能收进下拉或二级菜单。

**方案选型**：对比了三个方向，用户选定 **方案 A · 双层头部**：

| 方案 | 结论 |
|---|---|
| A · 双层头部（上层 logo + 操作，下层整行联赛标签） | ✅ 选定：联赛一键直达，最稳妥常见 |
| B · 联赛收纳成下拉 | ❌ 切联赛两步，与高频切换习惯相悖 |
| C · 底部联赛栏 | ❌ 拇指友好但长期占底栏、改动最大，暂不做 |

## 二、目标与约束

**目标**：在不影响 PC 端的前提下，把移动端头部从"一行挤爆"改成"分层清晰、联赛一键切换"。

**约束**：
1. PC 端（≥ 768px）**样式与交互 100% 不变**，包括一行布局、间距、字号、配色、收藏 hover 下拉
2. 所有移动端改造只在 `< md` 断点生效，用 Tailwind `md:` 前缀隔离
3. 布局切换纯 CSS 断点，**不引入任何 JS 设备判断**；收藏下拉区分"鼠标悬停 / 手指点按"用**指针事件**（`@pointerenter/@pointerleave` 按 `pointerType === 'mouse'` 过滤 + `@click` 切换），属事件天然属性，非设备探测
4. 联赛标签**单实例**渲染（不做双 DOM），靠 flex 换行 + 响应式 order 在移动/桌面各就各位
5. **PC 端容器保持不换行**：`flex-wrap` 仅在 `< md` 生效（`flex-wrap md:flex-nowrap`），避免 768–920px 窄桌面宽度因内容超宽而折行、破坏现有单行布局
6. 数据流 / store / 路由 / API 调用全部不动

## 三、布局方案

### 移动端（< 768px）：分层

```
第一层：[● MATCHLAB]                    [🔍] [♥³] [中/EN]
第二层：[英超] [西甲] [意甲] [德甲] [法甲] [中超]  ← 整行横滑
（联赛页追加）第三层：积分榜 赛程 球员 排行榜 对比  ← 现有页内导航，仅收窄间距
```

- 首页头部约两层（**~90px**），联赛页约三层（**~127px**）
- 纵向间距移动端收窄：容器 `py-2 md:py-3`、换行竖距 `gap-y-2`（不换行时竖距不生效，PC 无感）
- 联赛标签字号加大、触点加高，横向滚动

**两/三层按路由是否带 league 参数划分**（LeagueSubNav 现有 `v-if="active"` 逻辑，不改）：

| 层数 | 页面 |
|---|---|
| 两层 | 首页 `/`、收藏页 `/favorites`（无 league 参数） |
| 三层 | 积分榜 / 赛程 / 球员 / 排行榜 / 对比 / **球队详情** / **球员详情**（均带 `:league` 参数） |

注意球队详情、球员详情也在三层之列，实施与手测不可遗漏。

### 桌面端（≥ 768px）：保持现状一行

```
[● MATCHLAB] [英超 西甲 意甲 德甲 法甲 中超]   [搜索框] [收藏(N)] [中/EN]
```

字节级不变。

### 实现要点（flex 换行 + order）

AppHeader 顶行容器改为 `flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 px-4 py-2 md:py-3`（`md:flex-nowrap` 保证桌面任何宽度不折行，`gap-y-2` 只作用于移动端换行竖距），子元素 DOM 顺序与响应式控制：

| 子元素 | 移动端（< md） | 桌面端（≥ md） |
|---|---|---|
| logo | 第一行，`text-xl` | `text-2xl` |
| LeagueTabs | `order-last w-full` → 独占第二行 | `order-none w-auto` → 跟在 logo 后 |
| SearchBar（PC 搜索框） | `hidden` | `ml-auto hidden md:block`（不变） |
| 搜索图标按钮 | `ml-auto md:hidden` → 推到右侧 | `hidden` |
| FavoritesDropdown | 第一行 | 第一行 |
| 语言切换 | 第一行 | 第一行 |

- `ml-auto` 只作用于当前断点可见的那个占位元素（桌面 SearchBar / 移动搜索图标），二者互斥，不冲突
- sticky 定位保持在 `<header>` 上，换行后整体仍吸顶

## 四、组件分解

### 1. `src/components/layout/AppHeader.vue`（改）

- 顶行容器改 `flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 px-4 py-2 md:py-3`（原 `py-3 gap-4` → 移动端收窄、桌面保持；**`md:flex-nowrap` 必带**，否则 768–920px 桌面会折行）
- logo 加 `text-xl md:text-2xl`
- `<LeagueTabs class="ml-2">` 改为 `<LeagueTabs class="order-last w-full md:order-none md:w-auto md:ml-2">`（移动端独占一行，桌面端回到 logo 右侧；**`md:order-none` 必带**，否则桌面标签会被排到行尾）
- 搜索图标按钮加 `ml-auto`（移动端推右），其余逻辑不动
- 移动端全屏搜索层（Teleport）**完全不动**

### 2. `src/components/layout/LeagueTabs.vue`（改）

- 按钮加大移动端触点：`text-sm px-3.5 py-2 md:text-xs md:px-3 md:py-1.5`
- 容器保持 `flex gap-1 overflow-x-auto`，移动端随 AppHeader `order-last w-full` 独占一行
- 高亮/路由逻辑不动

### 3. `src/components/layout/LeagueSubNav.vue`（改）

- 仅移动端收窄间距：链接 `px-3 py-2 md:px-4 md:py-2.5`，容器 `px-2 md:px-4`
- 结构与路由逻辑不动

### 4. `src/components/layout/FavoritesDropdown.vue`（改 · 含 bug 修复）

**现状 bug**：下拉只绑定了 `@mouseenter/@mouseleave`，触屏设备无 hover，手机上点不开。

**改造**：
- 按钮内容响应式：移动端显示 `♥` 图标 + 右上角角标数字（`md:hidden`），桌面端保留文字 `收藏 (N)`（`hidden md:inline`）
- **交互改指针事件**（不用 `matchMedia`，避免触屏笔记本误判 + jsdom 无 matchMedia）：
  - 外层容器 `@mouseenter/@mouseleave` 换成 `@pointerenter/@pointerleave`，且仅当 `event.pointerType === 'mouse'` 时开合 → 桌面 hover 行为**不变**，触屏不触发
  - 按钮 `@click.stop` 切换开合（触屏点按生效；桌面点按只会把已悬停展开的下拉收起，无副作用）
  - 打开时监听 document click，点在组件外则关闭；**`onUnmounted` 移除监听器**防泄漏
- **可访问性**：文字在移动端被隐藏，按钮补 `:aria-label="t('nav.favorites', lang)"`，保证读屏始终有名
- **角标**：`total === 0` 时移动端不渲染角标（桌面文字"收藏 (0)"照旧）
- 下拉列表面板样式不动（`w-56` 在窄屏可用）

## 五、数据流 / 状态管理

**不变**——所有改造在模板与交互层。store / composable / API / 路由完全不动。收藏角标数字复用现有 `total` computed。

## 六、测试策略

### 新增 / 更新单测

1. `tests/components/AppHeader.test.ts`（更新）
   - 现有 4 项（PC 搜索框、移动搜索图标、全屏层开/关）保持通过
   - 新增：顶行容器含 `flex-wrap` 与 `md:flex-nowrap`；LeagueTabs 带 `order-last w-full`（移动）类
2. `tests/components/FavoritesDropdown.test.ts`（更新）
   - 现有 hover 用例改为 `trigger('pointerenter', { pointerType: 'mouse' })` 后保持通过
   - 新增：`pointerType: 'touch'` 的 pointerenter 不展开；点击按钮开合、点外部关闭、`total === 0` 无角标
   - 注意：jsdom 对 PointerEvent / `pointerType` 支持不稳，若 `trigger` 塞不进属性，改用手工构造事件（如 `new Event('pointerenter')` 后赋 `pointerType`）再 `dispatchEvent`

### 现有测试

- 其余视图/组件测试不受影响

### 浏览器手测清单（待批准执行）

- 375px：首页两层、联赛页三层、联赛一键切换、收藏点按开合 + 点外关闭、收藏角标（有数显数 / 为 0 不显）、搜索图标、语言切换
- 768px 边界：恢复一行布局，收藏回到 hover 下拉
- 768–920px 窄桌面：确认**不折行**、联赛标签横滚（验证 `md:flex-nowrap`）
- ≥1024px：与改造前一致
- 中 / EN 双模式文案正确

## 七、验收标准

1. **PC 端零影响**：≥ 768px 任意宽度下，头部视觉与交互（含收藏 hover 下拉）与改造前完全一致
2. **移动端分层可用**：375px 首页两层、联赛页三层，联赛标签一键切换，无一行挤爆
3. **收藏手机可点**：触屏点按开合、点外关闭，角标数字正确
4. **i18n 不退化**：中 / EN 文案正确
5. **单测全绿 + typecheck / build 通过**

## 八、风险与备选

1. **flex-wrap + order 布局未经真实渲染验证**：这是推演方案，**实施第一步先用最小样例（或在真实 AppHeader 上）验证移动端两层 / 桌面端单行都成立**，再继续其余改动；若极端窄屏（< 320px）换行错乱，降级为双 DOM（移动/桌面各一份 LeagueTabs），与项目既有模式对齐（备选，不在本批默认实施）
2. **联赛页三层头部占高 ~132px**：为"联赛一键直达"的既定取舍，用户已认可；若后续嫌高，可考虑滚动时收起联赛行（备选）
3. **指针事件兼容性**：`pointerenter/pointerleave + pointerType` 现代浏览器全支持（含微信内核）；极旧内核若不支持，退化为"仅点按开合"，不影响可用性
4. **桌面点按收藏按钮会收起已悬停展开的下拉**：预期内的无害行为，不改"悬停展开"的主路径

## 九、不在本范围

- 底部 Tab Bar / 抽屉导航 / 手势交互
- 搜索图标以外的搜索体验改造
- HomeView 主体内容的移动端二次优化

验收后如需另起 spec。
