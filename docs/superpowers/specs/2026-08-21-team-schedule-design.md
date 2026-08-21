# 球队主页 · 赛程页签 设计稿

> 日期：2026-08-21（含后续多轮迭代修订，本稿反映最终实现）
> 性质：球队详情页新增「我队赛程」功能，只展示该队本赛季比赛
> 样式稿：`tmp/mockup/team-schedule.html`（早期双卡方案，最终已简化为纯列表 plain）

## 一、背景与动机

球队详情页（`TeamDetailView.vue`）现有：队旗面 → 订阅/收藏/导出按钮 → 战绩格 → 阵容。用户想看「这一支球队」的赛程时无处可看——现有赛程页（`ScheduleView.vue`）按「联赛 + 月」展示整联赛全部比赛，无法只看单队。

本设计在球队主页加一个「赛程」页签，把该队本赛季全部比赛（已赛结果 + 未来赛程）按时间正序列出。

## 二、需求（最终，经多轮迭代对齐）

1. **范围**：整赛季（已赛 + 未来），英超约 38 场/队
2. **结构**：球队主页加页签「赛程 / 阵容」，**默认停在「赛程」**
3. **赛程呈现**：纯列表（全部比赛按时间正序，复用 `MatchList` 的日期分组），**无独立双卡置顶、无锚点滚动**
4. **对阵朴素（plain）**：沿用世界杯项目 `MatchCard` 布局（队徽紧贴中间比分，对阵双方同行带队徽），但**队名统一白字、不加粗、不标主客、不按胜平负分色**——球队视角无需在对阵内特殊标记本队
5. **战绩格**：去掉「已赛」格，由 7 格改为 **6 格**（胜/平/负/进/失/积分）
6. **旗面总身价**：从缩写/球场那一行拆出，**另起一行**显示

> 迭代备注：早期方案为「上一场/下一场双卡置顶 + 本队主色高亮 + 主客角标」，经多轮收敛为「纯列表 + 对阵朴素」；`selfTeamId` 高亮机制与 `team.ha.*`/`team.lastMatch`/`team.nextMatch` i18n 已随之废弃删除。

## 三、数据流（store 层）

赛程按「联赛 + 月」存储（`public/data/{league}/matches/{YYYY-MM}.json`，每月一个文件含整联赛当月全部比赛），不按队存。要凑出单队整赛季，需跨赛季 10 个月过滤。

### 改动：`src/stores/matches.ts`

新增状态与方法：

```ts
state: {
  // ...现有字段
  teamSchedules: {} as Record<string, Match[]>, // key: `${league}/${teamId}`
}

actions: {
  /** 加载某队整赛季赛程，按开球时间正序。内置代际防护防并发旧请求覆盖 */
  async loadTeamSchedule(league, teamId, season, seasonType) {
    const gen = ++teamLoadGen
    const k = `${league}/${teamId}`
    const months = seasonMonths(season, seasonType)
    const results = await Promise.all(months.map(async (m) => {
      if (m === currentMonth()) {
        try { return await fetchLiveScores(league, m) }
        catch { /* 直播失败回落静态快照 */ }
      }
      try {
        const f = await fetchJsonCached<MatchesFile>(`data/${league}/matches/${m}.json`, STATIC_TTL, season)
        return f.matches
      } catch { return [] } // 月文件不存在（休赛期当月）→ 空
    }))
    if (gen !== teamLoadGen) return // 过期请求丢弃
    this.teamSchedules[k] = results
      .flat()
      .filter((m) => m.home.id === teamId || m.away.id === teamId)
      .sort((a, b) => a.date.localeCompare(b.date))
  },
}
```

### 关键取舍

- **不复用 `loadMonth`**：它内置「切月防过期」的代际计数（模块级 `loadGen`），专为单月串行加载设计，并行调 10 次会互相把对方判为过期而丢数据。`loadTeamSchedule` 独立实现 + 自己的 `teamLoadGen` 代际防护，复用同一套 `fetchLiveScores`/`fetchJsonCached` 抓取函数。
- **实时性**：球队主页赛程**不做 60 秒轮询**，每次切进「赛程」页签重新拉取最新。实时赛况仍是赛程页主战场。
- **数据量**：整联赛 10 个月 ≈ 380 场一次性拉取，`Match` 为小型对象，`fetchJsonCached` 有 TTL 缓存。

## 四、界面结构

### `TeamDetailView.vue`

- 新增 `tab = ref<'schedule' | 'squad'>('schedule')`，战绩格之后插页签栏（`data-tab` 属性 + 复用 squad-title 主色下划线视觉），下方按 tab 渲染 `TeamSchedule` 或原阵容区块
- 战绩格由 7 格改 6 格（去掉「已赛」），桌面 `repeat(6,1fr)` 列
- 旗面 `flag-sub` 拆两行：缩写/球场/城市一行，总身价独立一行（`flag-value` 加粗）

### 新组件：`src/components/teams/TeamSchedule.vue`

Props：`league: LeagueSlug`、`teamId: number`。内部从 `useAppStore` 取 `season`/`seasonType`（fallback `'2025'`/`'european'`）。

- `onMounted` + `watch([league, teamId, season, seasonType])` 调 `store.loadTeamSchedule(...)`，局部 `loading/error` ref + seq 过期防护。**必须 watch season/seasonType**：`app.leagues` 由 `App.vue` 异步 `loadLeagues()` 填充，深链时 `leagueInfo` 未就绪会先取 fallback `'2025'` 再修正——不 watch 会用错赛季；且旧赛季月度文件残留仓库（`eng.1` 尚存 `2025-08`~`2026-05`），错配会静默显示上赛季
- 数据取 `store.teamSchedules[`${league}/${teamId}`]`，整季 0 场显示空态「本赛季暂无赛程」
- 渲染：`<MatchList :matches="schedule" :league="league" plain />`——**纯列表，无卡片置顶、无锚点滚动**

### `MatchCard.vue` 加 `plain` prop

新增可选 `plain?: boolean`（默认 false）。`plain=true` 时队名固定 `text-white`（不套 `NAME_CLS` 胜平负色调、不加粗）；默认（非 plain，赛程页场景）维持原胜平负分色。`MatchCard` 根 `article` 挂 `:id="match-${eventId}"`（预留锚点定位，当前未启用滚动）。

### `MatchList.vue` 加 `plain` 透传

加可选 `plain?: boolean` 透传给 `MatchCard`；**plain 时隐藏日期组头的「N 场」场次计数**（球队赛程一天恒 1 场，计数冗余）。

## 五、移动端

- 页签栏横排两枚；列表沿用 `MatchList` 响应式（`grid-cols-1` → `xl:grid-cols-2`）；对阵行单行三列，超长队名 `truncate`

## 六、i18n 文案

新增 key（`src/utils/i18n.ts`）：

| key | 中文 | 英文 | 用途 |
|---|---|---|---|
| `team.scheduleEmpty` | 本赛季暂无赛程 | No matches this season | 整季 0 场空态 |

复用：页签「赛程」→ `nav.schedule`；「阵容」→ `team.squad`。

## 七、错误与空态

- 加载失败 → `DataError` + 重试
- 整季 0 场 → `team.scheduleEmpty`

## 八、测试

| 范围 | 覆盖点 |
|---|---|
| `matches` store | `loadTeamSchedule` 过滤（仅该队主/客场）、按日期正序、单月失败隔离、直播分支与回落、并发代际防护 |
| `TeamSchedule` | 显示全部（已赛+未来不裁剪）、空态 |
| `MatchCard` | `plain` 队名全白不区分胜平负；非 plain 维持分色；根带 `match-` id |
| `MatchList` | `plain` 透传 + 隐藏场次计数 |
| `TeamDetailView` | 页签切换、默认赛程、战绩 6 格、总身价另起行 |

## 九、验收标准

1. 进球队详情页默认「赛程」页签，该队整赛季比赛按时间正序
2. 对阵双方同行带队徽、队名白字朴素（无高亮/加粗/角标），已赛显比分、未赛显 VS
3. 点「阵容」页签切回原阵容；战绩格 6 格；总身价另起一行
4. 赛程页（`ScheduleView`）与 PC 表格零影响（`plain` 不传时）
5. 375px 移动端无溢出
6. 全部单测通过 + typecheck + build 通过