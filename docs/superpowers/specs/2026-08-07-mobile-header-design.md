# 移动端首页头部重设计 · 方案 A（双层头部）

> 日期：2026-08-07
> 范围：AppHeader / LeagueTabs / LeagueSubNav / FavoritesDropdown 移动端头部适配 + 新增移动端联赛下拉（LeaguePicker）
> 前提红线：**PC 端样式与交互零影响**——所有改动只在 Tailwind `< md`（< 768px）断点生效
> Mockup 参考：`tmp/mockup/mobile-header.html`（首页/联赛页两层效果）、视觉伴侣 `league-page-compress.html`（方案甲对比）

## 一、背景与决策

**问题**：移动端首页头部把 6 个联赛标签 + 搜索 + 收藏 + 语言切换全塞进一行，外加 logo，窄屏上挤作一团，联赛标签只能横滑露出半个。

**用户诉求**（方案讨论时确认）：手机上最高频操作是**频繁切换联赛**，因此联赛标签必须**常驻可见、一键直达**，不能收进下拉或二级菜单。

**方案选型**：对比了三个方向，用户选定 **方案 A · 双层头部**：

| 方案 | 结论 |
|---|---|
| A · 双层头部（上层 logo + 操作，下层整行联赛标签） | ✅ 选定：联赛一键直达，最稳妥常见 |
| B · 联赛收纳成下拉 | ❌ 切联赛两步，与高频切换习惯相悖 |
| C · 底部联赛栏 | ❌ 拇指友好但长期占底栏、改动最大，暂不做 |

**二次决策（联赛页压层）**：方案 A 落地后联赛相关页移动端为三层（logo 行 + 联赛行 + 页内导航行），用户要求再压。对比两法，选定 **方案甲 · 联赛收进下拉**：

| 办法 | 结论 |
|---|---|
| 甲 · 联赛收进「英超 ▾」下拉，与页内导航同行 | ✅ 选定：页内导航保持一键直达，头部降到两层，改动最小 |
| 乙 · 联赛标签与页内导航并成一条横滑带 | ❌ 两级导航混排、靠滑动找、改动更大 |

**取舍说明**：联赛页内最常点的是页内导航（积分榜/赛程/球员…），故其保持一键直达；切联赛在联赛页退为紧凑下拉。首页不受影响，仍是整行联赛标签一键切换。**最终移动端所有页面统一两层**。

## 二、目标与约束

**目标**：在不影响 PC 端的前提下，把移动端头部从"一行挤爆"改成"分层清晰、联赛一键切换"。

**约束**：
1. PC 端（≥ 768px）**样式与交互 100% 不变**，包括一行布局、间距、字号、配色、收藏 hover 下拉
2. 所有移动端改造只在 `< md` 断点生效，用 Tailwind `md:` 前缀隔离
3. 布局切换纯 CSS 断点，**不引入任何 JS 设备判断**；收藏下拉区分"鼠标悬停 / 手指点按"用**指针事件**（`@pointerenter/@pointerleave` 按 `pointerType === 'mouse'` 过滤 + `@click` 切换），属事件天然属性，非设备探测
4. 联赛标签 LeagueTabs **单实例**渲染（不做双 DOM），靠 flex 换行 + 响应式 order 在移动/桌面各就各位；移动端联赛页把它隐藏、改由新增的 LeaguePicker 下拉承担切联赛——LeaguePicker 是**移动端专属的独立小组件**，不是 LeagueTabs 的重复渲染
5. **PC 端容器保持不换行**：`flex-wrap` 仅在 `< md` 生效（`flex-wrap md:flex-nowrap`），避免 768–920px 窄桌面宽度因内容超宽而折行、破坏现有单行布局
6. LeagueTabs 与 LeaguePicker 的切联赛逻辑抽到**共享 composable**，不重复实现
7. 数据流 / store / 路由 / API 调用全部不动

## 三、布局方案

### 移动端（< 768px）：统一两层

**首页 / 收藏页**（无 league 参数）——联赛整行一键切换：

```
第一层：[● MATCHLAB]                    [🔍] [♥³] [中/EN]
第二层：[英超] [西甲] [意甲] [德甲] [法甲] [中超]  ← 整行横滑、一键直达
```

**联赛相关页**（带 league 参数）——联赛收进下拉、与页内导航同行：

```
第一层：[● MATCHLAB]                    [🔍] [♥³] [中/EN]
第二层：[英超 ▾] ｜ 积分榜 赛程 球员 排行榜 对比  ← 下拉 + 页内导航横滑
```

- **移动端所有页面统一两层**，头部约 **~90px**
- 纵向间距移动端收窄：容器 `py-2 md:py-3`、换行竖距 `gap-y-2`（不换行时竖距不生效，PC 无感）
- 首页联赛标签字号加大、触点加高、横向滚动；联赛页页内导航保持一键直达、仅收窄间距

**两层的两种形态按路由是否带 league 参数划分**（LeagueSubNav 现有 `v-if="active"` 逻辑沿用）：

| 形态 | 页面 | 第二层内容 |
|---|---|---|
| 联赛整行 | 首页 `/`、收藏页 `/favorites`（无 league 参数） | LeagueTabs 整行横滑 |
| 下拉 + 页内导航 | 积分榜 / 赛程 / 球员 / 排行榜 / 对比 / **球队详情** / **球员详情**（均带 `:league` 参数） | LeaguePicker 下拉 + LeagueSubNav |

注意球队详情、球员详情也属联赛相关页，实施与手测不可遗漏。

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
| LeagueTabs（外裹 wrapper div） | **无 league 参数**：wrapper `order-last w-full` → 独占第二行；**有 league 参数**：wrapper `hidden`（切联赛交给 LeaguePicker） | wrapper `order-none w-auto` → 跟在 logo 后（恒显） |
| SearchBar（PC 搜索框） | `hidden` | `ml-auto hidden md:block`（不变） |
| 搜索图标按钮 | `ml-auto md:hidden` → 推到右侧 | `hidden` |
| FavoritesDropdown | 第一行 | 第一行 |
| 语言切换 | 第一行 | 第一行 |

- `ml-auto` 只作用于当前断点可见的那个占位元素（桌面 SearchBar / 移动搜索图标），二者互斥，不冲突
- sticky 定位保持在 `<header>` 上，换行后整体仍吸顶
- LeagueTabs 移动端可见性由路由是否带 league 参数决定（AppHeader 读 route 计算），属**路由状态**、非设备判断；桌面端恒显不变
- LeaguePicker（联赛下拉）挂在 LeagueSubNav 行首，`md:hidden`，仅在联赛相关页的移动端出现

## 四、组件分解

### 1. `src/components/layout/AppHeader.vue`（改）

- 顶行容器改 `flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 px-4 py-2 md:py-3`（原 `py-3 gap-4` → 移动端收窄、桌面保持；**`md:flex-nowrap` 必带**，否则 768–920px 桌面会折行）
- logo 加 `text-xl md:text-2xl`
- 新增 `hasActiveLeague = computed`（读 route.params.league 是否合法 slug）
- **用一个 wrapper `<div>` 包住 `<LeagueTabs/>`**，条件/响应式类全挂在 wrapper 上（**关键**：LeagueTabs 根节点自带 `flex`，若直接给它挂 `hidden` 会与 `flex` 两个 display 类打架、谁赢看 Tailwind 生成顺序，不可靠；套 wrapper 后显隐只作用在 wrapper，组件根 `flex` 不受干扰）：
  - `<div :class="hasActiveLeague ? 'hidden md:block md:order-none md:w-auto md:ml-2' : 'order-last w-full md:order-none md:w-auto md:ml-2'"><LeagueTabs /></div>`
  - 即移动端**首页/收藏页** wrapper `order-last w-full` 独占第二行、**联赛相关页** wrapper `hidden`（切联赛交给 LeaguePicker）；桌面端恒为 logo 右侧内联
  - **`md:order-none` 必带**，否则桌面标签会被排到行尾；wrapper 是普通 div，首页分支无需 display 类（flex 子项自动块化），隐藏分支 `hidden md:block` 为标准 Tailwind 显隐写法、无冲突
- 搜索图标按钮加 `ml-auto`（移动端推右），其余逻辑不动
- 移动端全屏搜索层（Teleport）**完全不动**

### 2. `src/components/layout/LeagueTabs.vue`（改）

- 按钮加大移动端触点：`text-sm px-3.5 py-2 md:text-xs md:px-3 md:py-1.5`
- 容器保持 `flex gap-1 overflow-x-auto`，移动端首页随 AppHeader `order-last w-full` 独占一行
- 把现有 `active` computed、`label(slug)`、`pick(slug)` 抽到新 composable `src/composables/useLeagueSwitch.ts`，本组件改为调用它（行为不变）
- 移动端显隐由 AppHeader 的 wrapper 条件类控制（见上），组件根保持 `flex gap-1 overflow-x-auto` 不受干扰，自身高亮/路由逻辑不动

### 2.5 `src/composables/useLeagueSwitch.ts`（新）

从 LeagueTabs 抽出，供 LeagueTabs 与 LeaguePicker 共用：
- `active: ComputedRef<LeagueSlug>` —— 路由 league 参数优先，首页回落 `app.currentLeague`（沿用现逻辑）
- `label(slug): string` —— 按 `app.lang` 返回中/英联赛名
- `pick(slug)` —— 按当前路由名跳同页类型的目标联赛（沿用现逻辑，不拆路径字符串）
- 纯前端路由逻辑，不碰 store/API

### 3. `src/components/layout/LeagueSubNav.vue`（改）

- 仅移动端收窄间距：链接 `px-3 py-2 md:px-4 md:py-2.5`，容器 `px-2 md:px-4`
- 在 flex 容器内、各 router-link **之前**挂上新组件 LeaguePicker（`md:hidden`，仅移动端可见）
- 页内导航的结构与路由逻辑不动

### 3.5 `src/components/layout/LeaguePicker.vue`（新 · 移动端专属）

联赛相关页移动端承担切联赛（替代被隐藏的 LeagueTabs 整行）：
- 触发按钮：当前联赛名 + `▾`，紧凑 pill 样式，`md:hidden`（桌面不渲染）
- 点按切换开合；面板 `absolute` 列出 6 联赛（`label()`），高亮 `active`，点某联赛调 `pick(slug)` 跳转并收起
- `@click.stop` + document click 监听实现"点外关闭"，`onUnmounted` 移除监听防泄漏
- 仅点按交互（移动端无 hover 需求），比 FavoritesDropdown 简单
- 全程复用 `useLeagueSwitch()`，不新写切联赛逻辑

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

**不变**——所有改造在模板与交互层。store / API / 数据请求完全不动。新增的 `useLeagueSwitch` 只是把 LeagueTabs 既有的"读 route + router.push"逻辑挪进 composable，无任何数据层改动。收藏角标数字复用现有 `total` computed。

## 六、测试策略

### 新增 / 更新单测

1. `tests/components/AppHeader.test.ts`（更新）
   - 现有 4 项（PC 搜索框、移动搜索图标、全屏层开/关）保持通过
   - 新增：顶行容器含 `flex-wrap` 与 `md:flex-nowrap`
   - 新增：首页路由（`/`）下 LeagueTabs 的 wrapper 带 `order-last w-full`；联赛路由（如 `/eng.1/standings`，需在测试 router 补该路由）下 wrapper 带 `hidden`
2. `tests/components/LeaguePicker.test.ts`（新）
   - 触发按钮显示当前联赛名（中文模式）
   - 点击开合面板；面板列 6 联赛、高亮当前
   - 点某联赛触发 router 跳转（mock）、面板收起；点外部关闭
3. `tests/components/FavoritesDropdown.test.ts`（更新）
   - 现有 hover 用例改为 `trigger('pointerenter', { pointerType: 'mouse' })` 后保持通过
   - 新增：`pointerType: 'touch'` 的 pointerenter 不展开；点击按钮开合、点外部关闭、`total === 0` 无角标
   - 注意：jsdom 对 PointerEvent / `pointerType` 支持不稳，若 `trigger` 塞不进属性，改用手工构造事件（如 `new Event('pointerenter')` 后赋 `pointerType`）再 `dispatchEvent`

### 现有测试

- LeagueTabs 既有用例（若有）在抽取 `useLeagueSwitch` 后行为不变；其余视图/组件测试不受影响

### 浏览器手测清单（待批准执行）

- 375px 首页/收藏页：两层，联赛整行一键切换
- 375px 联赛相关页（积分榜/赛程/球员/排行榜/对比/球队详情/球员详情）：两层，「英超 ▾」下拉切联赛 + 页内导航一键直达，下拉点外关闭
- 收藏点按开合 + 点外关闭、收藏角标（有数显数 / 为 0 不显）、搜索图标、语言切换
- 768px 边界：恢复一行布局，联赛标签内联、LeaguePicker 消失、收藏回到 hover 下拉
- 768–920px 窄桌面：确认**不折行**、联赛标签横滚（验证 `md:flex-nowrap`）
- ≥1024px：与改造前一致
- 中 / EN 双模式文案正确

## 七、验收标准

1. **PC 端零影响**：≥ 768px 任意宽度下，头部视觉与交互（含收藏 hover 下拉、联赛标签内联、LeagueSubNav 不带下拉）与改造前完全一致
2. **移动端统一两层**：375px 首页/收藏页联赛整行一键切换；联赛相关页「联赛 ▾」下拉 + 页内导航同行、页内导航一键直达，无一行挤爆
3. **收藏手机可点**：触屏点按开合、点外关闭，角标数字正确
4. **i18n 不退化**：中 / EN 文案正确
5. **单测全绿 + typecheck / build 通过**

## 八、风险与备选

1. **flex-wrap + order + 条件显隐布局未经真实渲染验证**：这是推演方案，**实施第一步先在真实 AppHeader 上验证移动端两种形态（首页联赛整行 / 联赛页下拉+导航）与桌面端单行都成立**，再继续其余改动；若极端窄屏（< 320px）换行错乱，降级为双 DOM（移动/桌面各一份 LeagueTabs），与项目既有模式对齐（备选，不在本批默认实施）
2. **联赛相关页切联赛退为下拉（约两步）**：为压两层的既定取舍，用户已选方案甲；首页仍保持整行一键。若后续嫌联赛页切换繁琐，可恢复联赛页整行联赛标签（回到三层）（备选）
3. **指针事件兼容性**：`pointerenter/pointerleave + pointerType` 现代浏览器全支持（含微信内核）；极旧内核若不支持，退化为"仅点按开合"，不影响可用性
4. **桌面点按收藏按钮会收起已悬停展开的下拉**：预期内的无害行为，不改"悬停展开"的主路径
5. **路由分支增多**：LeagueTabs 条件显隐 + LeaguePicker + useLeagueSwitch 引入少量路由判断，回归时要逐页核对首页/收藏页/各联赛页/详情页形态，勿遗漏

## 九、不在本范围

- 底部 Tab Bar / 抽屉导航 / 手势交互
- 搜索图标以外的搜索体验改造
- HomeView 主体内容的移动端二次优化

验收后如需另起 spec。
