# MyTeamCard 重设计 Spec

> **日期**：2026-08-03
> **背景**：子项目 1（个人化基础）已完工，首页 MyTeamCard 现版本用 `bg-white dark:bg-slate-800` + `border-slate-200` 的浅色 Tailwind 默认样式，与项目"转播图形风"暗色 + 联赛品牌色基调（参考 `MatchdayStrip` / `LeagueCard`）完全脱节，视觉割裂。
> **目标**：重设计 MyTeamCard 视觉，对齐项目基调；1 队订阅时拉宽占满宽度 + 信息丰富，2-3 队订阅时用紧凑窄卡 grid。

## 一、设计目标

1. **视觉一致**：与 `MatchdayStrip` / `LeagueCard` 同款——暗背景渐变 + 球队品牌色驱动 + Bebas Neue 大字 + JetBrains Mono 标签
2. **球队主色驱动**：每张卡用订阅球队的 `team.color` 作 `--team-color` CSS 变量，背景渐变 / 边框 / 标签 / 排名 badge / 倒计时 / form pills 都基于这个色
3. **1 队拉宽信息丰富**：单订阅时不再居中堆窄卡，而是占满容器宽度，3 列主体 grid + 顶 header + 底 footer，多塞战绩 WDL / 积分 / form pills / GF/GA / 排名 / 下场预告
4. **2-3 队紧凑**：多订阅时窄卡纵向 grid（2 列 / 3 列响应），保留核心信息（今日赛 + 最近 3 场 + 伤员），不挤占战绩区
5. **vs 格式定稿**：最近 3 场统一用 mini MatchCard 风格——3 列网格（1fr-auto-1fr），主队名右对齐 + 比分居中 + 客队名左对齐；订阅主队名字白色加粗（`.mine`），对手灰显（`.opp`）；比分 W 绿 / D 灰 / L 红
6. **空状态保留**：0 订阅时显示 EmptyState 引导去积分榜（已有，不动）

## 二、布局规则

| 订阅数 | 布局 | 卡片宽度 |
|---|---|---|
| 0 | EmptyState | 居中引导 |
| 1 | 单卡拉宽 + 3 列主体 grid | 占满容器（HomeView 订阅区 wrapper 改为 `max-w-7xl` 或不限宽，让单卡有横向空间） |
| 2 | grid 2 列 | 各 1/2 |
| 3 | grid 3 列 | 各 1/3 |

**HomeView wrapper 改动**（最小）：当前 `<section class="max-w-5xl mx-auto px-4 mb-4">` 改为 `max-w-7xl`，给单卡更多横向空间。多卡 grid 内卡宽自动收缩。

**响应式**：
- 桌面 ≥980px：1 队 3 列横向，2-3 队按 grid 列数
- 平板 760-980px：1 队塌缩为纵向堆叠（hero / recent / stats）
- 手机 <760px：所有订阅数都 1 列纵向

## 三、1 队拉宽卡结构

```
┌─────────────────────────────────────────────────────────────────┐
│ [crest] [tag] [league] TEAM NAME ............... [rank badge] │  ← header
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│ │ TODAY HERO   │ │ RECENT 3 (vs)│ │ STATS                    │ │
│ │              │ │              │ │ ┌──┬──┬──┐ WDL            │ │
│ │ ARS  vs  LIV │ │ CRY 1-2 ARS  │ │ │26│7 │5 │                │ │
│ │ [crest] [cr] │ │ ARS 1-0 BUR  │ │ └──┴──┴──┘                │ │
│ │              │ │ WHU 0-1 ARS  │ │ 积分 85                    │ │
│ │ 02:00 北京    │ │              │ │                            │ │
│ │ 02D 14H 30M  │ │              │ │ 最近 5 场                  │ │
│ │ ◉ EMIRATES   │ │              │ │ [W][W][D][W][L]           │ │
│ │              │ │              │ │                            │ │
│ │              │ │              │ │ GF 75 │ GA 32              │ │
│ └──────────────┘ └──────────────┘ └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ [INJ Saka · Ødegaard · Saliba]            [NEXT: ARS vs TOT 8/28]│  ← footer
└─────────────────────────────────────────────────────────────────┘
```

### Header
- **crest**：36px 圆角队徽（用 `TeamLogo` 组件）
- **tag**："订阅主队" mono 标签，边框色 = `team.color`
- **league**：联赛名 mono 字（如 `英超 · PREMIER LEAGUE`）
- **team-name**：Bebas Neue 32px 大字号
- **rank-badge**：右上角，背景 = `color-mix(team.color 18%, transparent)` + 边框 = `team.color 45%`，格式 "1 / 20"

### 列 1 今日赛英雄区（1.5fr）
- 边框 = `team.color 35%`，背景 = `rgba(0,0,0,0.32)`
- 顶 meta：`◉ 今日 · 02:00 北京`（绿色 live dot + UTC/北京换算）
- matchup：3 列 grid（1fr-auto-1fr）
  - 左侧 home：队名（Bebas Neue 22px）+ 36px crest
  - 中：VS（Bebas Neue 14px slate-500）
  - 右侧 away：36px crest + 队名
- kickoff-row：开球时间（mono 13px white bold）+ 倒计时（Bebas Neue 22px team-color）
- venue-row：`◉ EMIRATES STADIUM`（mono 10px slate-500）
- **进行中比赛**（`match.status === 'in'`）：标签变"进行中" + 红色 live dot + `match.clock` 替代开球时间，倒计时位置改显当前比分
- **无今日赛时**：英雄区显示"今日无赛"标签 + 下场预告（next match 取 `teamMatches.find(m => new Date(m.date) > now)` 的第一场，含对阵 + 开球时间 + 倒计时 + 球场），把"今日"标签改为"下场"。无下场（赛季已结束）则显示"赛季已结束"+ 上赛季最终排名

### 列 2 最近 3 场（1fr）
- section-label：`最近 3 场`（mono 9px slate-500 uppercase 0.22em）
- 3 行 vs-row：3 列 grid（1fr-auto-1fr）
  - 主队侧（home，右对齐）：name + 16px crest
  - 比分居中：score（mono 13px W绿/D灰/L红）+ 下方月日戳（mono 9px slate-600）
  - 客队侧（away，左对齐）：16px crest + name
- 主队（订阅的 Arsenal）name 白色加粗（`.mine`），对手灰显（`.opp`）
- 按时间倒序，最近一场在最上

### 列 3 战绩区（1.1fr）
- section-label：`赛季战绩`
- **WDL 三宫格**：3 列 grid，每格 `bg-white/3`，标签 W/D/L（mono 9px slate-500）+ 数值（mono 16px，W 绿 / D slate-300 / L 红）
- **积分行**：`bg-team.color/10`，左 "积分" 标签 + 右数值（Bebas Neue 22px team-color）
- **最近 5 场 form pills**：5 个 22×22px 圆角方块，W 绿 / D 灰 / L 红，从 standings row.form 取
- **GF/GA 双格**：2 列 grid，每格 `bg-white/3`，标签 + 数值

### Footer（双列）
- 左：红条伤员（INJ-label + 球员名列表）
- 右：下场预告（NEXT label + `ARS vs TOT` Bebas Neue 16px + `8/28 · 周六 22:00` mono 10px）
  - 数据源逻辑树（避免与列 1 hero 的下场预告重复）：
    - 有今日赛 → footer 显示**下一场**（today 之后的第一个 future match）
    - 无今日赛 → 列 1 hero 已显示下场预告，footer 显**再下一场**（future match 索引 [1]）；若只有一场 future，footer 显"无再下场"占位
    - 赛季已结束（无 future） → footer 显"赛季已结束"

## 四、2-3 队紧凑卡结构

```
┌────────────────────┐
│ [tag] [league] NAME│  ← 紧凑 header
├────────────────────┤
│ ┌────────────────┐ │
│ │ TODAY MINI     │ │  ← 今日赛迷你框
│ │ ARS  vs  LIV   │ │
│ │ 19:00 UTC      │ │
│ └────────────────┘ │
│ 最近 3 场          │
│ CRY 1-2 ARS       │
│ ARS 1-0 BUR       │
│ WHU 0-1 ARS       │
│ ┌──────────────┐  │
│ │ INJ Saka ·..│  │  ← 红条伤员
│ └──────────────┘  │
└────────────────────┘
```

- 卡宽：grid 列宽（2 队 1/2，3 队 1/3）
- padding：`12px 14px`
- header：tag + league + team-name（Bebas Neue 22px，右对齐，`margin-left: auto`）
- today：迷你框，**迷你队徽 16-18px**（不是 1 队的 36px 大队徽）+ 对阵 + 开球时间，无倒计时 / 球场
- recent 3 场：vs 格式同 1 队（3 列 grid + mine/opp 高亮 + W/D/L tone），字号略小（13px → 12px）
- 伤员：红条一行（不占底栏，放卡尾）

## 五、组件结构

**单文件**：`src/components/home/MyTeamCard.vue` 重写，不拆子组件（避免过度抽象）。

**Props**：
- `subscription: Subscription`（已有，含 league / teamId / teamName）

**布局判定**：组件内读 `useUserDataStore().subscriptions.length` 决定 1 队拉宽 vs 2-3 队紧凑。1 队 → `layoutMode = 'wide'`，2-3 队 → `layoutMode = 'narrow'`。模板内 `<article :class="layoutMode === 'wide' ? 'wide-card-classes' : 'narrow-card-classes'">` 切换。

**新依赖**（已有 store）：
- `useStandingsStore`：读 `rows[league]` 找 `teamId === subscription.teamId` 的 StandingRow → rank / points / won / drawn / lost / goalsFor / goalsAgainst / form
- `useTeamsStore`：`teamById(league, teamId)` → 拿 `team.color` + `team.shortDisplayName` 等
- `useAppStore`：`app.lang` 用于 `teamName()` i18n 本地化球队名显示

**球队名本地化**：所有显示给用户的队名都用 `teamName(name, app.lang)` 转换（中文模式命中译名表显示中文，英文模式显示 ESPN 原名）。包括 hero 大字号、vs 行 mine/opp 队名。

**CSS 变量**：
- 组件根 `<article>` 上 `:style="{ '--team-color': teamColor }"`，`teamColor = computed(() => team.value?.color || app.leagueInfo(league)?.color || '#3D195B')`
- 所有品牌色相关样式用 `var(--team-color)` + `color-mix(in srgb, var(--team-color) N%, ...)`

## 六、数据流

```
HomeView
  └─ <MyTeamCard v-for sub in userStore.subscriptions :subscription="sub" />
       │
       ├─ useTeamsStore → team.color → CSS var --team-color
       ├─ useStandingsStore → StandingRow → rank/points/WDL/GF/GA/form
       ├─ fetchLiveScores (过去 12 月 + 未来 10 月) → teamMatches[] → todayMatch / recentMatches
       └─ fetchTeamInjuries → injuries[]
```

**加载顺序**（load 函数）：
1. 先读 team.color 设 CSS 变量（同步，立即可用）
2. 并行：`Promise.all([fetchLiveScores..., fetchTeamInjuries])`
3. standingsStore 已被 HomeView 加载（LeagueCard 触发），无需重新拉

## 七、视觉设计 token

| Token | 值 | 出处 |
|---|---|---|
| 背景 | `linear-gradient(180deg, color-mix(team.color 16%, #10152a), #10152a)` | MatchdayStrip 同款 |
| 边框 | `1px solid color-mix(team.color 35%, transparent)` | 同上 |
| 圆角 | 14px（1 队）/ 12px（2-3 队） | |
| Display 字体 | Bebas Neue（`font-cond`） | 项目既有 |
| Mono 字体 | JetBrains Mono（`font-mono-d`） | 项目既有 |
| 标签样式 | mono 9px `tracking-[0.22em] uppercase` | LeagueCard 同款 |
| 主色高亮 | `color: #fff; font-weight: 600` | Mine 队名 |
| 对手灰 | `color: var(--slate-400)` | Opp 队名 |
| 比分 W | `color: var(--green)` `#10b981` | |
| 比分 D | `color: var(--slate-300)` `#cbd5e1` | |
| 比分 L | `color: var(--red)` `#ef4444` | |
| 红条伤员 | `border-left: 2-3px solid var(--red)` + `bg-red/6` | MatchdayStrip 风格 |

## 八、错误处理

- **standingsStore 该联赛未加载** → 战绩区显示骨架（"-" 占位），不阻塞渲染
- **fetchLiveScores 失败** → 整卡显示错误态（沿用 `DataError` 组件，需在 MyTeamCard 新增 import）
- **fetchTeamInjuries 失败** → 伤员红条静默不显示（已有 try/catch）
- **team.color 为空** → fallback 联赛色 `app.leagueInfo(league)?.color`，再 fallback `#3D195B`
- **teamsStore 该队未加载** → team-name fallback 用 `subscription.teamName`（订阅时存的本地化名）；team.color fallback 走联赛色

## 九、测试

`tests/components/MyTeamCard.test.ts` 已有 3 测试，重写后需补：

**保留**：
- 传入 subscription 渲染球队名
- 今日无赛显示"今日无赛"
- 有今日赛程显示对阵双方

**新增**：
- 1 队订阅渲染拉宽布局（含 rank badge / WDL / form pills / GF/GA）
- 2 队订阅渲染紧凑布局（无 rank badge / WDL）
- 球队品牌色写入 CSS 变量 `--team-color`（`wrapper.attributes('style')` 含 `--team-color:`）
- standings 数据未加载时战绩区显示占位
- 比分 W 绿 / D 灰 / L 红 tone 验证
- mine / opp class 验证（订阅队名 white，对手 slate-400）

## 十、范围外

- 不动 EmptyState / ConfirmDialog / Toast 通用组件
- 不动 HomeView 顶部订阅区 wrapper（只改 `max-w-5xl → max-w-7xl` 一处让单卡有横向空间，其他不改）
- 不动 store / composable 层
- 不动其他 Phase 0-6 视图
- 不引入新 npm 依赖

## 十一、风险与权衡

- **standings 数据依赖**：MyTeamCard 读 `standingsStore.rows[league]`，该数据由 HomeView 加载（LeagueCard 触发 `standings.load()`）。HomeView 加载失败时 MyTeamCard 战绩区显骨架，不阻塞整卡——可接受。
- **多卡同时 fetch**：3 队订阅 × 23 个月 fetchLiveScores = 69 次并行 fetch（但有共享缓存层，重复 league+month 命中缓存，实际 ≤30 次）。Task 12 缓存层足够覆盖。
- **`team.color` 数据完整性**：ESPN core 抓取的 team 档案含 `color`/`alternateColor`，部分小联赛球队可能为空字符串——已用联赛色 fallback 兜底。
- **1 队拉宽在 4K 屏过宽**：max-w-7xl = 1280px，4K 屏（3840px）下仍居中合理留白，不会拉到全屏宽。
