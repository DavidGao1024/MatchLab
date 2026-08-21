# 球队主页 · 赛程页签 设计稿

> 日期：2026-08-21
> 性质：球队详情页新增「我队赛程」功能，只展示该队本赛季比赛
> 样式稿：`tmp/mockup/team-schedule.html`

## 一、背景与动机

球队详情页（`TeamDetailView.vue`）现有：队旗面 → 订阅/收藏/导出按钮 → 战绩格 → 阵容。用户想看「这一支球队」的赛程时无处可看——现有赛程页（`ScheduleView.vue`）按「联赛 + 月」展示整联赛全部比赛，无法只看单队。

本设计在球队主页加一个「赛程」页签，把该队本赛季全部比赛（已赛结果 + 未来赛程）按时间正序列出。

## 二、需求（已与总司令对齐）

1. **范围**：整赛季（已赛结果 + 未来赛程一页看全，英超约 38 场/队）
2. **结构**：球队主页加页签「赛程 / 阵容」，**默认停在「赛程」**
3. **排序**：顶部「上一场结果 + 下一场」双卡置顶，下方完整列表按时间正序
4. **对阵布局**：沿用世界杯项目 `MatchCard` 布局——队徽紧贴中间比分（主队名右对齐、队徽在名字右侧靠中线；客队队徽在名字左侧靠中线、名字左对齐），**对阵双方同行**、带**队徽**
5. **本队标识**：本队名用球队主色（`--accent`）高亮 + 标「主 / 客」角标

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
  /** 加载某队整赛季赛程，按开球时间正序 */
  async loadTeamSchedule(league, teamId, season, seasonType) {
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
      } catch { return [] } // 月文件不存在（如休赛期当月）→ 空
    }))
    this.teamSchedules[k] = results
      .flat()
      .filter((m) => m.home.id === teamId || m.away.id === teamId)
      .sort((a, b) => a.date.localeCompare(b.date))
  },
}
```

### 关键取舍

- **不复用 `loadMonth`**：它内置「切月防过期」的代际计数（模块级 `loadGen`），专为单月串行加载设计，并行调 10 次会互相把对方判为过期而丢数据。`loadTeamSchedule` 独立实现，复用同一个 `fetchLiveScores` / `fetchJsonCached` 抓取函数。
- **实时性**：球队主页赛程**不做 60 秒轮询**。当月有进行中比赛时，拉取时刻的快照即为显示值；每次切进「赛程」页签重新拉取最新。实时赛况仍是赛程页的主战场。
- **数据量**：整联赛 10 个月 ≈ 380 场比赛一次性拉取，每场 `Match` 为小型对象，可接受；且 `fetchJsonCached` 有 TTL 缓存，二次进入更快。

## 四、界面结构

### `TeamDetailView.vue`

- 新增 `tab = ref<'schedule' | 'squad'>('schedule')`
- 战绩格之后插入页签栏（复用 squad-title 的主色下划线视觉语言），下方按 tab 渲染：
  - `schedule` → `<TeamSchedule :league :team-id />`
  - `squad` → 现有阵容区块
- 页签默认「赛程」，故赛程数据在进页时即触发加载

### 新组件：`src/components/teams/TeamSchedule.vue`

Props：`league: LeagueSlug`、`teamId: number`。内部从 `useAppStore` 自行取 `season`（`app.leagueInfo(league)?.season ?? '2025'`）与 `seasonType`（`...?.seasonType ?? 'european'`），不依赖父组件传入——与 `ScheduleView` 取法一致。

- 内部 `onMounted` + `watch([league, teamId, season, seasonType])` 调 `store.loadTeamSchedule(...)`。**必须 watch season/seasonType**：`app.leagues` 由 `App.vue` 启动时异步 `loadLeagues()` 填充，深链/刷新时 `leagueInfo` 可能尚未就绪，`season` 会先取 fallback `'2025'`、就绪后才变 `'2026'`——不 watch 会用错赛季加载赛程。**且旧赛季月度文件仍残留在仓库**（如 `eng.1` 尚存 `2025-08`~`2026-05` 十个文件，2026-08-20 抓取时未清理），season 错配不会报错而是**静默显示上赛季赛程**，危害更大。用局部 `loading/error` ref + seq 过期防护（沿用 `ScheduleView`）
- 数据取 `store.teamSchedules[`${league}/${teamId}`]`
- 渲染三段：
  1. **双卡**（上一场 / 下一场）
  2. **完整列表**（复用 `MatchList`）；完整列表**含双卡那两场**，双卡仅作摘要、不剔除

**双卡提取**（按时间正序后的 schedule）：
- `lastResult` = 最后一场 `status === 'post'`（最近一场已赛）
- `nextMatch` = 第一场 `status !== 'post'`（最近一场未赛；若 `status === 'in'` 则按进行中显示）

**双卡视觉**：
- 上一场卡：标签「上一场 · 已结束」+ 对阵（本队高亮 + 主/客角标 + 队徽）+ 比分 + 日期时间球场
- 下一场卡：标签「下一场」+ 对阵 + VS（或进行中比分）+ 日期时间球场，左侧主色边条强调
- 赛季未开始（无已赛 / 无未赛）时对应卡片隐藏

### `MatchCard.vue` 复用 + 扩展

新增可选 prop `selfTeamId?: number`，仅当传入时：
- 该队名用**球队主题强调色 `var(--accent, var(--league-color))`** 高亮——`TeamDetailView` 的 `themeVars` 已定义 `--accent`（即 bannerTheme 提亮后的球队主色，与战绩格边条 / 页签下划线同源）；兜底 `--league-color`（App.vue 全局联赛色）防复用场景无 `--accent`。注意两者不是一回事：`--league-color` 是联赛色（如英超紫 #3D195B），`--accent` 才是球队主色（如阿森纳亮红）
- 队名旁加「主 / 客」小角标（按 `match.home.id === selfTeamId` / `away` 判主客）
- **高亮优先于胜平负色调**：本队名改用 accent 后不再套既有 `NAME_CLS`（胜白/平灰/负暗），对手名维持原色调
- 不传时行为与现状 100% 一致（赛程页零影响）

### `MatchList.vue` 透传

新增可选 prop `selfTeamId?: number`，透传给内部 `MatchCard`，实现「球队视角列表」复用同样的日期分组（含星期、场次、动画）。

## 五、移动端

- 页签栏：横排两枚，同上
- 双卡：窄屏单列堆叠（`grid-cols-1`），宽屏并排（`md:grid-cols-2`）
- 列表：沿用 `MatchList` 现有响应式（`grid-cols-1` → `xl:grid-cols-2`）
- 对阵行：单行三列（`grid-cols-[1fr_auto_1fr]`），375px 下短队名足够，超长队名 `truncate`

## 六、i18n 文案

新增 key（`src/utils/i18n.ts`，中英双语）：

| key | 中文 | 英文 | 用途 |
|---|---|---|---|
| `team.lastMatch` | 上一场 | Last | 双卡「上一场」标签 |
| `team.nextMatch` | 下一场 | Next | 双卡「下一场」标签 |
| `team.finished` | 已结束 | FT | 上一场卡的完赛标注 |

复用现有 key：

- 页签「赛程」→ `nav.schedule`；「阵容」→ `team.squad`
- 主/客角标 → `match.home` / `match.away`
- 空态 → `schedule.noMatches`（或按球队语境微调文案）

## 七、错误与空态

- 加载失败 → 现有 `DataError` + 重试
- 整季 0 场（数据未生成）→ 复用「暂无比赛」空态文案

## 八、测试

| 范围 | 覆盖点 |
|---|---|
| `matches` store | `loadTeamSchedule` 过滤（仅含该队主/客场）、按日期正序、单月失败不连坐其余月 |
| `TeamSchedule` | 上一场/下一场提取（含赛季未开始、已全打完的边界）、双卡渲染、空态 |
| `TeamDetailView` | 页签「赛程/阵容」切换、默认停赛程 |
| `MatchCard` | `selfTeamId` 高亮本队 + 主/客角标；不传 prop 时布局与现有一致 |

## 九、验收标准

1. 进球队详情页默认显示「赛程」页签，看到该队整赛季比赛按时间正序
2. 顶部双卡正确显示上一场结果与下一场；对阵双方同行、带队徽、本队高亮 + 主/客角标
3. 点「阵容」页签切换到原阵容视图，无回归
4. PC 表格/赛程页字节级零影响（`MatchCard` 不传 `selfTeamId` 时）
5. 375px 移动端无溢出、双卡可读
6. 全部单测通过 + typecheck + build 通过