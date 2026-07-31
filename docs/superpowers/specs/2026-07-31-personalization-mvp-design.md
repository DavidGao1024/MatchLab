# 个人化基础 MVP 设计稿

> 范围：MatchLab 子项目 1 — 球队订阅 + 收藏夹 + iCal 导出
> 工期：7-11 天
> 前置：无后端，纯前端 + localStorage
> 建档日期：2026-07-31

## 一、背景与目标

MatchLab MVP 已完工（Phase 0–6 全部上线），现进入功能扩展期。本子项目服务三类目标用户中的**深度球迷**（有主队），用最小成本（无后端）验证两个核心假设：

1. **用户黏性假设**：死忠球迷需要"快速看到本队赛程/比分/伤情"的入口，订阅主队 + 首页卡片可显著提升回访率
2. **开赛提醒假设**：球迷有"开赛前收到提醒"的刚需，可通过 iCal 导出 + OS 日历订阅实现零后端等价方案

验证后若用户黏性确认，再上后端（CF Workers + D1）做 Tier 1 注册用户，届时 localStorage 数据可平滑迁移到云端，与"未登录游客本地偏好"并存。

## 二、架构

### 数据存储

分两个 localStorage key（清晰、独立读写）：

- `matchlab:subscriptions` — 订阅主队数组
- `matchlab:favorites` — 收藏对象 `{teams: [], players: []}`

**Subscriptions schema**（含 version 字段方便未来迁移）：

```json
{
  "version": 1,
  "items": [
    {
      "league": "eng.1",
      "teamId": 359,
      "teamName": "Arsenal",
      "addedAt": "2026-07-31T10:00:00Z"
    }
  ]
}
```

**Favorites schema**（同样含 version 字段；teams 与 players 都用 `name` 字段统一）：

```json
{
  "version": 1,
  "teams": [
    {"league": "eng.1", "teamId": 359, "name": "Arsenal", "addedAt": "2026-07-31T10:00:00Z"}
  ],
  "players": [
    {"league": "eng.1", "athleteId": 253989, "name": "Haaland", "addedAt": "2026-07-31T10:00:00Z"}
  ]
}
```

### Pinia store

`useUserDataStore`（Pinia store，组件层直接调用）：

- state: `subscriptions: Subscription[]`, `favorites: {teams: Favorite[], players: Favorite[]}`（state 不含 `version`，version 仅在 localStorage 层用于迁移）
- actions: `addSubscription`, `removeSubscription`, `addFavorite`, `removeFavorite`, `toggleFavorite(type, id, name)`, `isSubscribed(teamId)`, `isFavorite(type, id)`, `init()` 初始化时 hydrate + 注册 storage 事件
- 持久化：每次 mutation debounce 200ms 写 localStorage（写时拼上 `version` 字段）
- 多 tab 同步：`init()` 里 `window.addEventListener('storage', ...)`，外部修改时重新 hydrate 整个 state
- 调用方式：组件 `const store = useUserDataStore()`；App.vue 启动时 `store.init()` 调一次

## 三、组件清单

### 新增 composable

（无——store 已封装全部读写 + 持久化 + 多 tab 同步，组件直接 `useUserDataStore()` 即可，无需再封一层）

### 新增组件

| 组件 | 位置 | 功能 |
|---|---|---|
| `SubscribeButton.vue` | 球队详情页头部 | "订阅主队"按钮，已订阅态显示"已订阅 ✓" |
| `FavoriteButton.vue` | 球队/球员详情页头部 | 心形按钮，已收藏态实心 + 动画 |
| `MyTeamCard.vue` | 首页顶部 | 订阅主队的今日赛程/最近 3 场比分/伤情摘要（每个订阅主队一张卡，按 addedAt 排序） |
| `FavoritesDropdown.vue` | 顶部导航栏 | 收藏快速访问下拉（点击跳详情） |
| `EmptyState.vue` | 首页/收藏页 | 无订阅/无收藏时引导卡 |
| `Toast.vue` + `useToast()` composable | 全局 | 临时提示条（成功/错误两种 style，3 秒自动消失）。当前代码无 toast 系统，本子项目自建约 60 行。挂载方式：`App.vue` 根模板顶层挂一次 `<Toast />`，`useToast()` 内部修改 reactive state 驱动渲染 |
| `ConfirmDialog.vue` | 全局 modal | 通用确认弹窗（标题/正文/确认/取消按钮），复用 `MatchModal.vue` 的 modal 模式抽出。取消订阅、批量清空等场景使用 |

### 新增路由

- `/favorites` — 收藏夹页（tabs: 球队 / 球员，点入跳详情）

### 新增 utils

- `lib/iCal.ts` — `generateICal(team, matches[]): string` 生成 RFC 5545 格式字符串
- `lib/download.ts` — `downloadBlob(filename, content, mime)` 通用下载工具
- `lib/migrate.ts` — `migrateUserData(subscriptions, favorites): {subscriptions, favorites}` localStorage 版本阶梯升级函数，被 `store.init()` 调用

### 新增类型定义

`types/user-data.ts` 新文件，定义 `Subscription` 与 `Favorite` 接口：

```ts
export interface Subscription {
  league: LeagueSlug
  teamId: number
  teamName: string
  addedAt: string
}
export interface Favorite {
  league: LeagueSlug
  teamId?: number       // 球队收藏时有
  athleteId?: number    // 球员收藏时有
  name: string
  addedAt: string
}
```

### 订阅上限

- subscriptions 上限 **3 队**（防滥用 + UI 简洁，避免首页卡片堆爆）
- favorites 上限 50 项（球队+球员合计）
- 超限 store action 抛错，按钮态禁用 + toast 提示

### iCal 导出按钮位置

- 球队详情页：旁"订阅主队"按钮
- 收藏夹页球队 tab：每行右侧"导出日历"按钮

## 四、数据流

### 订阅流程

1. 用户在球队详情页点"订阅主队"
2. 组件 `const store = useUserDataStore()` 后调 `store.addSubscription({league, teamId, teamName})` → 写 localStorage
3. 首页 `MyTeamCard` 响应式更新
4. toast 提示"已订阅 Arsenal，首页将显示该队今日赛程"

### 取消订阅流程

1. 球队详情页"已订阅 ✓"按钮再点 → 弹出确认弹窗（复用现有 `MatchModal.vue` 的 modal 模式，新写一个轻量 `ConfirmDialog.vue` 通用确认弹窗组件）
2. 用户确认后 `store.removeSubscription(teamId)` → 写 localStorage
3. 首页卡片消失，若无其他订阅显示 `EmptyState`

### 收藏流程

- 详情页心形按钮 click → `toggleFavorite(type, id, name)`
- 已收藏显示实心 + 弹跳动画，未收藏显示空心
- 收藏夹页 `/favorites` 列出全部，支持删除

### 首页 MyTeamCard 数据来源

- 订阅主队确定后，前端调用 `fetchLiveScores(league, month)`（现有 `useEspanFetch.ts` 已实现）逐月拉 scoreboard，按 `home.team.id` 或 `away.team.id` 等于订阅 `teamId` 过滤出该队本赛季赛程
- **缓存策略**（在 `useEspanFetch.ts` 内加共享缓存层，所有调用方受益）：内存 Map `<cacheKey, {data, ts}>`，key = `${league}:${month}`
  - 当月数据：默认 60s TTL；若该月有进行中比赛（state = "in"），降为 10s TTL，保证比分近实时
  - 历史月数据：永久缓存（赛季内不会变），切换 tab 离开首页再回命中即不重发
  - EPL 整赛季 12 月 × 200 事件 ≈ 2400 条记录，内存占用可接受
- 过滤出今日赛程（若有，按用户浏览器本地时区判定 "今日"）+ 最近 3 场已赛（含比分）
- 若 ESPN 伤病端点返回非空（`/sports/soccer/{league}/injuries?team={teamId}`），显示伤员名字（最多 3 个），5 分钟内缓存。**注意：此端点本项目未用过，需先在浏览器手动验证 CORS 与返回结构，验证通过再接入**
- 全部客户端完成，无后端

### iCal 导出流程

1. 用户点"导出赛程到日历"，按钮立即变 loading 态（spinner + "正在生成..."禁用点击）
2. 前端复用 `fetchLiveScores` 按月并行拉本赛季所有月份 scoreboard（Promise.all，并发上限 4），过滤该队全部赛程
3. `generateICal` 生成 VCALENDAR 字符串（每个 VEVENT 含对手/开赛 UTC 时间/场地/摘要/UID）
4. Blob + `URL.createObjectURL` + `<a download>` 触发下载，按钮恢复常态，toast 提示"已导出 N 场赛程"
5. 文件名：`matchlab-{teamNameSlug}-{seasonStart}.ics`（如 `matchlab-arsenal-2025.ics`，teamNameSlug = team.displayName 转小写 + 空格转连字符；seasonStart = 赛季起始年，如 2025 表示 2025–26 赛季）

### 跨 tab 同步

- A tab 订阅 → B tab 监听 `window.storage` 事件 → 重新 hydrate store
- A tab 关闭后重开 → 启动时从 localStorage 读初始值

## 五、错误处理

| 场景 | 处理 |
|---|---|
| localStorage 满（QuotaExceededError） | try/catch + toast"本地存储已满，请删除部分收藏" |
| 浏览器禁用 localStorage（隐私模式） | 启动时探测，订阅/收藏按钮 disabled + 提示"浏览器禁用了本地存储" |
| 订阅重复（同 teamId） | store 层 dedup，按钮态直接显示已订阅 |
| 收藏重复 | 同上 |
| iCal 生成时赛程 fetch 失败 | toast"赛程数据获取失败，请稍后重试" |
| 多 tab 写冲突 | storage 事件同步，最后写入为准 |
| 数据迁移（未来上后端时） | schema 含 `version` 字段，`store.init()` 内部调用 `migrateUserData()` 检查 localStorage version，缺则补默认值，旧则按版本阶梯升级后再 hydrate state |

## 六、测试策略

| 层 | 工具 | 范围 |
|---|---|---|
| Store 单测 | Vitest | `useUserDataStore` add/remove/dedup/persist/init/上限拦截，目标 100% 覆盖 |
| Utils 单测 | Vitest | `generateICal` 输出符合 RFC 5545（VCALENDAR/VEVENT/DT_START/UID 字段）；`migrateUserData` 各版本阶梯升级路径；`downloadBlob` 触发 a 标签下载（mock URL.createObjectURL）；`fetchLiveScores` 缓存命中/失效/实时比赛 10s TTL 降级 |
| 组件测试 | Vitest + @vue/test-utils | `SubscribeButton`/`FavoriteButton`/`Toast`/`ConfirmDialog` 在订阅/未订阅/成功/错误/确认/取消态的渲染 |
| 多 tab 同步 | 手动测试 | 浏览器开两 tab，A 操作 B 同步 |
| 现有单测 | Vitest | 不退化，CI 卡死 |
| E2E | 不引入 | MVP 阶段靠单测覆盖 |

## 七、不包含（Out of Scope）

明确不在本子项目范围内的项，避免范围蔓延：

- 用户注册/登录（属于子项目"后端基建"，未来 Tier 1 时上）
- 跨设备同步（需后端，localStorage 只在本机）
- 推送通知（iCal 已替代，零后端路径已足够）
- 收藏夹按标签分组（YAGNI，先平铺）
- 收藏夹搜索/排序（YAGNI，量小不需要）
- 球员数据收藏的"生涯统计快照"（已有球员详情页，复用即可）
- 队徽缓存优化（与子项目无关，单独处理）

## 八、上线验收标准

- [ ] 球队详情页有"订阅主队"按钮，点击后变成"已订阅 ✓"，再点取消
- [ ] 球员/球队详情页有心形收藏按钮，点击切换态
- [ ] 首页顶部 `MyTeamCard` 显示订阅主队的今日赛程/最近 3 场比分
- [ ] 无订阅时首页 `EmptyState` 引导用户去球队详情页订阅
- [ ] 收藏夹页 `/favorites` 显示所有收藏，支持 tab 切换球队/球员
- [ ] 球队详情页和收藏夹有"导出赛程到日历"按钮，下载 .ics 文件
- [ ] .ics 文件可在 Apple Calendar / Google Calendar / Outlook 正常导入并显示开赛提醒
- [ ] 浏览器开两 tab，A 订阅 B 同步可见
- [ ] 隐私模式下订阅/收藏按钮 disabled，提示"浏览器禁用了本地存储"
- [ ] localStorage 写满时 toast 提示
- [ ] 订阅第 4 队时 `SubscribeButton` disabled，toast 提示"已达上限 3 队，请先取消旧订阅"
- [ ] 收藏达 50 项时 `FavoriteButton` disabled，toast 提示
- [ ] toast 成功显示绿色样式、错误显示红色样式，3 秒自动消失
- [ ] ESPN 伤病端点 CORS 与字段结构已先验证（浏览器手动 fetch 一次确认通后再实现 `MyTeamCard` 伤员展示）
- [ ] 现有单测全绿不退化
- [ ] 新增 store/utils/组件单测全绿（含 `useToast`）
- [ ] husky pre-push typecheck 通过

## 九、后续衔接

本子项目落地后，子项目 2（H2H + 近期状态卡）和子项目 3（PWA + 实时刷新 + 多语言）可独立推进。子项目 1 的 localStorage 基建（订阅/收藏 schema、`useUserDataStore` store、`FavoriteButton` 组件）将被 2/3 复用。

未来上后端（CF Workers + D1）时，`useUserDataStore` 的 actions 改为调用 API，state 不变，组件层零改动；localStorage 数据通过迁移函数上传到 D1 用户表，与"未登录游客本地偏好"并存。
