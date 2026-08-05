# 移动端卡片化设计 · 方案 B（第一批）

> 日期：2026-08-05
> 范围：PlayersView / LeadersView / CompareView / AppHeader 四处移动端适配
> 前提红线：**PC 端样式零影响**——所有改动只在 Tailwind `< md`（< 768px）断点生效
> Mockup 参考：`tmp/mockup/mobile-cards.html`

## 一、目标与约束

**目标**：在不影响 PC 端样式的前提下，尽量优化移动端体验。

**约束**：
1. PC 端（≥ 768px）样式 100% 不变，包括表格结构、间距、字号、配色
2. 所有移动端改造只在 `< md` 断点生效，用 Tailwind `md:` 前缀隔离
3. 不引入 JS 设备判断，纯 CSS 断点切换（PC 与移动端两套 DOM 同时存在，浏览器只渲染可见的）
4. 数据流 / store / 路由 / API 调用全部不动
5. i18n 已修复的翻译函数（`t` / `teamName` / `playerName` / `venueName` / `cityName` / `leadersCatName`）继续在移动端组件复用

## 二、第一批范围（4 处）

| 序号 | 位置 | 改造方式 |
|---|---|---|
| 1 | `src/views/PlayersView.vue` | PC 表格不动，移动端新增卡片列表（`PlayerListCardMobile.vue`） |
| 2 | `src/views/LeadersView.vue` | PC 表格不动，移动端新增卡片列表（`LeaderRowCardMobile.vue`） |
| 3 | `src/views/CompareView.vue` | PC 表格不动，移动端新增卡片堆叠（`ComparePlayerCardMobile.vue`） |
| 4 | `src/components/layout/AppHeader.vue` | 移动端隐藏 SearchBar，加搜索图标按钮，点击弹全屏搜索层（复用 SearchBar） |

第二批（ScheduleView / TeamDetailView / PlayerDetailView / FavoritesView / HomeView 二次优化）不在本 spec 内，验收后另起 spec。

## 三、架构原则

### 双 DOM 切换

每个被改造的 view 模板结构如下：

```vue
<!-- PC 端：保留原表格，外层加 hidden md:block -->
<div class="hidden md:block overflow-x-auto">
  <table>...</table>
</div>

<!-- 移动端：新卡片组件，外层 md:hidden -->
<div class="md:hidden">
  <PlayerListCardMobile
    v-for="p in pageItems"
    :key="p.id"
    :player="p"
    :rank="(page - 1) * 50 + i + 1"
    @click="go(p)"
  />
</div>
```

**为什么双 DOM**：
- 不靠 JS `useMediaQuery()`，避免 SSR / 首屏闪烁
- Tailwind `hidden` / `md:block` 让隐藏的 DOM 不计入布局，PC 端样式 100% 不变
- Vue 渲染成本：列表数据本来就要遍历，多渲染一份卡片虚拟 DOM 增量很小（移动端可见时 PC 端表格不可见，反之亦然，浏览器只 layout 可见那份）

### 断点边界

沿用 Tailwind 默认 `md: 768px`——与子项目 1.7 积分榜移动端兼容保持一致。PC 端定义为 ≥ 768px。

### 数据流

```
原 store / props → view 模板（双 DOM 同时拿同一份数据）→ PC 表格 / 移动卡片
```

store / composable / API 全部不动，移动端卡片直接复用 view 已有的 computed / props。

## 四、组件分解

### 1. `src/components/players/PlayerListCardMobile.vue`（新）

**Props**：
```ts
defineProps<{
  player: Player  // 复用 PlayersView 已有 player 类型
  rank: number
}>()
```

**Emits**：`click`（view 监听后跳详情）

**视觉**（参考 mockup）：
- 卡片背景用队色 alpha 5% 调色（`style="background: rgba(team-color, 0.05)"`）
- 顶部行：`#rank` + 球队徽章（TeamLogo）+ 球员名（playerName）+ 球队名（teamName）
- 底部 4 列 grid：位置 / 年龄 / 进球 / 助攻
- 整卡可点击

### 2. `src/components/players/LeaderRowCardMobile.vue`（新）

**Props**：
```ts
defineProps<{
  entry: LeaderEntry  // 排行条目
  category: string  // 当前分类 name（用于知道 "进球"/"助攻" 等单位）
}>()
```

**Emits**：`click`（跳球员详情）

**视觉**：
- 横向布局：排名大字 + 球队徽章 + 球员名/球队 + 右侧大字号数值
- 单位 label 走 `leadersCatName(category, cat.displayName, lang)` 显示中文

### 3. `src/components/players/ComparePlayerCardMobile.vue`（新）

**Props**：
```ts
defineProps<{
  profile: PlayerProfile  // 单球员对比资料
  rows: CompareRow[]  // 全部对比行（用于算 max）
}>()
```

**Emits**：`remove`（移除该球员）/ `click`（跳详情）

**视觉**：
- 卡片头部：球队徽章 + 球员名 + 移除按钮
- 卡内统计项纵向列表（label 左 / 数值右）
- 每项数值若为该统计项全场最大值，加 `stat-max` 类（绿色）+ `(max)` 标签

**max 计算**：复用 CompareView 已有 `isMax(i, row.values)` 逻辑，传入卡片时预算好该球员各项是否为 max。

### 4. `src/components/layout/AppHeader.vue`（改）

**改造点**：
- SearchBar 由 `hidden md:block` 改为 `hidden md:block`（PC 端不动）
- 移动端新增搜索图标按钮（`md:hidden`），点击触发 `searchOpen = ref(true)`
- 全屏搜索层：`v-if="searchOpen"`，背景遮罩 + 居中输入框 + 结果列表
- 复用现有 SearchBar 组件（或直接复用其 props/composable），不重复实现搜索逻辑

```vue
<header>
  ... MATCHLAB logo
  <LeagueTabs class="ml-2" />
  <!-- PC 端搜索框：不动 -->
  <SearchBar class="ml-auto w-full max-w-xs hidden md:block" />
  <!-- 移动端搜索图标 -->
  <button class="md:hidden ..." @click="searchOpen = true">🔍</button>
  <FavoritesDropdown />
  <button lang-toggle />
</header>

<!-- 全屏搜索层（移动端） -->
<Teleport to="body">
  <div v-if="searchOpen" class="md:hidden fixed inset-0 z-50 bg-[#0c101b] ...">
    <SearchBar autofocus @blur="searchOpen = false" />
  </div>
</Teleport>
```

## 五、错误处理 / 数据流 / 状态管理

**不变**——所有改造都在模板层。store / composable / API 完全不动。

## 六、测试策略

### 新增单测

1. `tests/components/PlayerListCardMobile.test.ts`
   - 渲染：球员名（中文模式）/ 球队名（中文模式）/ 4 字段都显示
   - 点击触发 emit('click')

2. `tests/components/LeaderRowCardMobile.test.ts`
   - 渲染：排名 / 球员名 / 球队名 / 数值
   - 分类名走 leadersCatName

3. `tests/components/ComparePlayerCardMobile.test.ts`
   - 渲染：球员名 / 各统计项 label + value
   - max 项标 `(max)` + stat-max 类

4. `tests/components/AppHeader.test.ts`（如不存在则新增）
   - PC 端（宽度 ≥ 768）：搜索框可见、图标按钮不可见
   - 移动端（宽度 < 768）：搜索框不可见、图标按钮可见、点击图标弹全屏层

### 现有测试

- `tests/views/PlayersView.test.ts` / `LeadersView.test.ts` / `CompareView.test.ts` 现有测试都默认 jsdom 不带断点（视作 PC），不会受影响；如担心可加 `mockMatchMedia` 但建议跳过。

### 浏览器手测清单

- 375px 宽度（iPhone 12 / 微信浏览器）逐页验证 4 处
- 768px 边界宽度：PC 端表格恢复，移动卡片消失
- 1024px / 1440px：PC 端完全不变

## 七、验收标准

1. **PC 端零影响**：在 ≥ 768px 任意宽度下，4 处页面的视觉与点击行为与改造前完全一致（截图对比）
2. **移动端卡片可用**：375px 宽度下 4 处页面都能正常浏览、点击、跳转，无横滑
3. **i18n 不退化**：移动端卡片在中/英文模式下文案正确（队名 / 球员名 / 场馆 / 城市等都走翻译函数）
4. **单测全绿**：148 现有 + 新增 4 类单测全绿
5. **typecheck / build 通过**
6. **mockup 视觉风格与最终实现一致**：颜色 / 间距 / 层次参考 `tmp/mockup/mobile-cards.html`

## 八、风险与备选

1. **CompareView 卡片堆叠削弱"对比"语义**：mockup 已用 `(max)` badge 弥补，若用户反馈仍不够，可在卡片头部加"全场最高 X 项"汇总条（备选，不在本批实施）
2. **双 DOM 渲染成本**：列表数据量大时（PlayersView 默认 50 项 / 页）移动端卡片虚拟 DOM 增量约 +50 节点，可接受；如发现卡顿再考虑 v-if + useMediaQuery 优化
3. **AppHeader 全屏搜索层与 SearchBar 组件耦合**：SearchBar 现有 props/emit 待审，可能需要小幅扩展（如 autofocus prop）；如改动过大则只复用其搜索逻辑 composable

## 九、不在本批范围

- ScheduleView / TeamDetailView / PlayerDetailView / FavoritesView / HomeView 的二次移动端优化
- 移动端抽屉式导航 / 底部 Tab Bar / 手势返回
- 移动端专属交互（如下拉刷新、长按收藏）

这些验收后另起 spec。
