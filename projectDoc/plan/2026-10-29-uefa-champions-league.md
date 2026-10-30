# 欧冠（UEFA Champions League）接入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把欧冠（ESPN slug `uefa.champions`）作为第七个联赛接入 MatchLab，与现有六联赛同规则提供页签、积分榜、赛程、球员、排行榜、对比、详情、订阅收藏、iCal 与首页卡片。

**Architecture:** 沿用现有「Actions 静态 JSON + 浏览器直连 site.api」两段式数据流。欧冠只把 `league-phase` 计入积分榜，淘汰赛只进赛程；`Match` 增加可选 `stage` 字段且仅欧冠静态数据写入，六联赛数据零变化。前端沿用 `LEAGUE_SLUGS` 驱动全部页面与导航。

**Tech Stack:** Vite 6 + Vue 3 `<script setup>` + Pinia + Vue Router 4 hash + TypeScript strict + Tailwind 4；数据脚本零依赖 Node；Vitest。

**Spec:** 本文件「设计与实测结论」章节（项目约定计划文档放 `projectDoc/plan/`，不单列 spec）。

## 进度总览

**执行顺序：** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8。Task 3 依赖 Task 1/2 的字段与配置；Task 7 依赖全部代码任务。

| # | Task | 状态 | 提交 | 完成日期 |
|---|---|---|---|---|
| 1 | 欧冠联赛配置与开幕月 | 已完成 | 5ac5445f | 2026-10-29 |
| 2 | 赛程阶段字段与积分榜过滤（脚本层） | 已完成 | 2311f2e0 | 2026-10-29 |
| 3 | 前端接入第七联赛 | 已完成 | bf3fc85f | 2026-10-29 |
| 4 | 欧冠积分榜图例与移动端下拉 | 已完成 | 4c0f7251 | 2026-10-29 |
| 5 | 体检脚本跳过欧冠淘汰赛 | 已完成 | 983d916b | 2026-10-29 |
| 6 | 数据管线接入与本地冒烟 | 已完成 | 00d85b54 | 2026-10-29 |
| 7 | 全量数据与全站验收 | 已完成 | 250e9a45、d84d903a | 2026-10-29 |
| 8 | 汇报与项目档案更新 | 进行中（待总司令验收） | — | — |

**当前状态（2026-10-30）：** 代码已全部上线（`d84d903a`，GH Pages 部署成功）；线上欧冠静态数据尚未生成（仓库无 `public/data/uefa.champions/`，`leagues.json` 仍 6 联赛），欧冠页面暂显示「数据加载失败」。计划待 2026-10-31 07:00（北京）定时 Fetch Data 生成数据后完成线上验收，再走 Task 8 汇报与档案更新。

**状态图例：** 未开始 / 进行中 / 已完成 / 阻塞。每完成一个 Task，同步勾选该 Task 的步骤复选框并更新本表。

## 设计与实测结论

### 需求

- 欧冠与现有六联赛同等对待：联赛页签、积分榜、赛程、球员、排行榜、对比、球队/球员详情、订阅/收藏/iCal、首页联赛卡与昨日战报。
- 其余交互与视觉全部沿用项目既有规则。

### 2026-10-29 实测（ESPN `uefa.champions`）

| 项 | 结论 |
|---|---|
| site.api 月令牌 | `202609` 18 场、`202610` 36 场、`202611` 36 场，均正常 |
| 赛事阶段 | 每场带 `season.slug`：`league-phase` / `round-of-16` / `semifinals` / `final` |
| 开幕月 | 7 月、8 月均 0 场，联赛阶段 9 月开打 → 赛季探测必须用 9 月 |
| core 球队 | `seasons/2026/teams` = 36 队 |
| core 战绩 | `seasons/2026/types/1/teams/{id}/record` 可用（联赛阶段） |
| core 排行榜 | `seasons/2026/types/1/leaders` 12 项、每项 25 条 |
| core 球员统计 | `seasons/2026/types/1/athletes/{id}/statistics/0` 4 分类可用 |
| 单季聚合端点 | 去掉 `types/1` 的统计/排行榜均 404 → 球员与排行榜按联赛阶段统计 |
| 联赛徽标 | ESPN `https://a.espncdn.com/i/leaguelogos/soccer/500/2.png` 可用 |
| 中文队名 | 36 队中 9 队未收录（Shakhtar Donetsk / Galatasaray / LASK Linz / Sabah FK / Bodo/Glimt / AEK Athens / Slavia Prague / Viking FK / Slovan Bratislava） |

### 关键决策

1. **积分榜只算联赛阶段**：`league-phase` 之外（含淘汰赛、点球平局）一律不进积分榜；淘汰赛仍出现在赛程页。
2. **字段扩展最小化**：`Match` 增加可选 `stage?: string`。抓取脚本仅对配置了 `hasStages: true` 的联赛写入该字段（当前只有欧冠），现有六联赛月文件字节不变。前端直播归一化始终映射 `season.slug → stage`。
3. **排序规则**：沿用通用链 积分 → 净胜球 → 进球 → 队名；不实现 UEFA 的客场进球/胜场等细则。
4. **区带**：欧冠前 8 名高亮为晋级区（`ZONE_CONFIG['uefa.champions'] = { ucl: 8, uel: 0, rel: 0 }`）；积分榜页对欧冠显示专用图例，不再显示「欧冠/欧联/降级」。
5. **联赛顺位**：追加在最后 → 英超、西甲、意甲、德甲、法甲、中超、欧冠。
6. **联赛徽标**：下载 ESPN 500px 徽标到 `public/leagues/uefa.champions.png`（与队徽本地化同策略）。若总司令后续提供 FM2024 图包路径，可替换为 FM 赛事 ID `1301394`。
7. **球员/排行榜口径**：按 ESPN `types/1`（联赛阶段）统计；淘汰赛数据暂不累计，属数据源限制。
8. **中文名**：把上述 9 支未收录球队补进 `TEAM_ZH`；球员译名不扩，沿用既有覆盖率规则。
9. **欧冠月窗口**：前端 `seasonMonths` / `defaultMonth` 为欧冠追加次年 6 月（决赛月），共 11 个月（Aug–Jun）；六联赛窗口保持 10 个月不变。
10. **体检口径**：体检脚本对欧冠淘汰赛只跳过「平局标胜者」检查（点球大战记平局 + winner 会永久误报），`post` 未完成与 0-0 幽灵场检查对淘汰赛照常生效。

## Global Constraints

- 交流语言永远中文；代码注释与文档中文为主，技术名词可保留英文。
- 数据结构只许「新增可选字段」，不得改动现有字段语义；六联赛 JSON 不得因本计划变化。
- 抓取脚本零依赖（仅 Node 内置模块），请求间隔 ≥200ms；site.api 服务端抓取一律 `{ ua: UA_CURL }`；禁用 ESPN 日期区间语法，只用单日或整月令牌。
- 本地跑抓取脚本只用于验证，**不要 `git add public/data/`**；提交只显式添加代码、测试、资源、文档路径。
- 合并门禁：`npm test`、`npm run typecheck`、`npm run build` 全绿。
- Actions 预算：欧冠使 core 请求约 +2300（全量约 8600），单次耗时预计 75–85 分钟；仍沿用现有工作流频率，暂不新增任务。
- 前端静态资源一律 `import.meta.env.BASE_URL` 前缀。

## Review Focus

1. **欧冠淘汰赛点球平局**（比分平 + `winner=true`）：不得进积分榜，也不得被体检脚本误报 `tied-but-winner`。
2. **7/8 月无欧冠赛事**：赛季探测必须回落到上赛季而不是把 2026-27 误判成 2025-26 或反之。
3. **直播当月**：`normalizeEvent` 必须映射 `season.slug`，否则当月欧冠比赛会被阶段过滤全部丢掉。
4. **六联赛零影响**：新增 `stage` 字段与 UCL 配置后，既有六联赛月文件、积分榜、图例、战报带行为不变。
5. **窄屏与中英文**：7 个页签、长英文联赛名、36 行积分榜在 375px 不破相；徽标缺失不裂图。

---

## File Structure

- `scripts/lib/espn-endpoints.js` — 联赛配置、开幕月、积分榜阶段过滤纯函数
- `scripts/fetch-espn-scores.js` — 欧冠月文件写入 `stage`、积分榜按阶段过滤
- `scripts/fetch-transfers.js` — 转会抓取纳入欧冠
- `scripts/check-suspicious-matches.js`、`scripts/lib/suspicious-checks.js` — 跳过欧冠淘汰赛体检
- `src/utils/constants.ts` — `LEAGUE_SLUGS`、`ZONE_CONFIG`、`STANDINGS_STAGE`
- `src/types/models.ts` — `Match.stage`
- `src/composables/useEspanFetch.ts` — `season.slug → stage`
- `src/utils/standings.ts`、`src/stores/standings.ts` — 阶段过滤后算榜
- `src/utils/leagueLogo.ts`、`public/leagues/uefa.champions.png` — 联赛徽标
- `src/utils/i18n.ts` — 中文队名与欧冠图例
- `src/components/standings/StandingsTable.vue` — 欧冠专用图例
- `src/components/layout/LeaguePicker.vue` — 移动端下拉宽度
- 测试：`tests/scripts/espn-endpoints.test.ts`、`tests/scripts/check-suspicious-matches.test.ts`、`tests/utils/constants.test.ts`、`tests/utils/standings.test.ts`、`tests/stores/standings.test.ts`、`tests/composables/useEspanFetch.test.ts`、`tests/components/StandingsTable.test.ts`、`tests/components/LeagueTabs.test.ts`、`tests/components/LeaguePicker.test.ts`、`tests/components/LeagueSubNav.test.ts`、`tests/views/HomeView.test.ts`、`tests/utils/i18n.test.ts`

---

### Task 1: 欧冠联赛配置与开幕月

**Files:**
- Modify: `scripts/lib/espn-endpoints.js:23-33`（LEAGUES）、`:122-160`（开幕月/赛季探测）、`:162`（exports）
- Modify: `docs/data-site-mvp-plan.md`（追加 2026-10-29 欧冠调研结论）
- Test: `tests/scripts/espn-endpoints.test.ts`

**Interfaces:**
- Produces: `openMonthOf(league: object): number`
- Produces: `LEAGUES` 新增条目 `{ slug: 'uefa.champions', name: 'UEFA Champions League', nameZh: '欧冠', understatSlug: null, country: 'Europe', teams: 36, color: '#0B1E5C', season: '2026', seasonType: 'european', openMonth: 9, hasStages: true, standingsStage: 'league-phase' }`

- [x] **Step 1: 写失败测试**

在 `tests/scripts/espn-endpoints.test.ts` 顶部导入补 `LEAGUES, openMonthOf`，新增：

```ts
describe('openMonthOf（赛季开幕月）', () => {
  it('默认：欧洲制 8 月、自然年制 3 月', () => {
    expect(openMonthOf({ seasonType: 'european' })).toBe(8)
    expect(openMonthOf({ seasonType: 'calendar' })).toBe(3)
  })
  it('欧冠用 openMonth 覆盖为 9 月', () => {
    expect(openMonthOf({ seasonType: 'european', openMonth: 9 })).toBe(9)
  })
})

describe('欧冠联赛配置', () => {
  it('uefa.champions 在册：36 队、9 月开幕、联赛阶段计入积分榜', () => {
    const ucl = LEAGUES.find((l) => l.slug === 'uefa.champions')
    expect(ucl).toMatchObject({
      nameZh: '欧冠', teams: 36, openMonth: 9, hasStages: true, standingsStage: 'league-phase',
    })
  })
})
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/scripts/espn-endpoints.test.ts`
Expected: FAIL，`openMonthOf is not a function`，且找不到 `uefa.champions`。

- [x] **Step 3: 实现**

`scripts/lib/espn-endpoints.js`：

```js
function openMonthOf(league) {
  return league.openMonth ?? seasonOpenMonth(league.seasonType || 'european');
}
```

`resolveSeasonsInPlace` 中把 `const m = seasonOpenMonth(type)` 改为 `const m = openMonthOf(league)`。
`LEAGUES` 末尾追加欧冠配置（值照 Interfaces 块）。
`module.exports` 增加 `openMonthOf`。
在 `docs/data-site-mvp-plan.md` 追加一节「2026-10-29 — 欧冠（uefa.champions）接入调研」，记录实测表与「7/8 月无赛事、9 月开幕」结论。

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/scripts/espn-endpoints.test.ts`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add scripts/lib/espn-endpoints.js tests/scripts/espn-endpoints.test.ts docs/data-site-mvp-plan.md
git commit -m "feat(ucl): 欧冠联赛配置与 9 月开幕月探测"
```

---

### Task 2: 赛程阶段字段与积分榜过滤（脚本层）

**Files:**
- Modify: `scripts/lib/espn-endpoints.js`（新增 `matchesForStandings` 并导出）
- Modify: `scripts/fetch-espn-scores.js:71-89`（mapEvent）、`:158-205`（processLeague）
- Test: `tests/scripts/espn-endpoints.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `LEAGUES`（`hasStages`、`standingsStage`）
- Produces: `matchesForStandings(matches: object[], league: { standingsStage?: string }): object[]`（无 `standingsStage` 时返回原数组）
- Produces: 欧冠月文件每条 match 含 `stage: string | null`；其他联赛无该字段

- [x] **Step 1: 写失败测试**

`tests/scripts/espn-endpoints.test.ts` 导入补 `matchesForStandings`，新增：

```ts
describe('matchesForStandings（积分榜阶段过滤）', () => {
  it('欧冠只保留 league-phase', () => {
    const ms = [{ stage: 'league-phase' }, { stage: 'round-of-16' }, { stage: 'final' }]
    expect(matchesForStandings(ms, { standingsStage: 'league-phase' })).toEqual([{ stage: 'league-phase' }])
  })
  it('没有 standingsStage 的联赛原样返回同一数组', () => {
    const ms = [{ stage: 'x' }]
    expect(matchesForStandings(ms, {})).toBe(ms)
  })
})
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/scripts/espn-endpoints.test.ts`
Expected: FAIL，`matchesForStandings is not a function`。

- [x] **Step 3: 实现**

```js
function matchesForStandings(matches, league) {
  const stage = league && league.standingsStage;
  return stage ? matches.filter((m) => m.stage === stage) : matches;
}
```

`scripts/fetch-espn-scores.js`：

- `mapEvent(ev)` → `mapEvent(ev, league)`，返回对象末尾加：
  `...(league && league.hasStages ? { stage: ev.season?.slug ?? null } : {})`
- 调用点改为 `events.map((ev) => mapEvent(ev, league))`
- `processLeague` 中在算榜前加：
  ```js
  const counted = matchesForStandings(allMatches, league);
  const standings = computeStandings(counted, league.pointDeductions || {});
  ```
  `matchesCounted` 改为 `counted.filter((m) => m.completed).length`。
- 导入处补 `matchesForStandings`。

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/scripts/espn-endpoints.test.ts`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add scripts/lib/espn-endpoints.js scripts/fetch-espn-scores.js tests/scripts/espn-endpoints.test.ts
git commit -m "feat(ucl): 赛程写入阶段字段，积分榜只计联赛阶段"
```

---

### Task 3: 前端接入第七联赛

**Files:**
- Modify: `src/utils/constants.ts:1-33`（`LEAGUE_SLUGS`、`ZONE_CONFIG`、新增 `STANDINGS_STAGE`）
- Modify: `src/types/models.ts:73-83`（`Match.stage?`）
- Modify: `src/types/espn-site.ts:16-28`（`EspnEvent.season?: { slug?: string }`）
- Modify: `src/composables/useEspanFetch.ts:55-82`（`normalizeEvent`）
- Modify: `src/utils/standings.ts`（新增 `standingsMatches`）
- Modify: `src/stores/standings.ts:51-77`（过滤后算榜）
- Modify: `src/utils/leagueLogo.ts:10-17`
- Create: `public/leagues/uefa.champions.png`
- Modify: `src/utils/i18n.ts`（`TEAM_ZH` 补 9 队）
- Test: `tests/utils/constants.test.ts`、`tests/utils/standings.test.ts`、`tests/stores/standings.test.ts`、`tests/composables/useEspanFetch.test.ts`、`tests/components/LeagueTabs.test.ts`、`tests/components/LeaguePicker.test.ts`、`tests/components/LeagueSubNav.test.ts`、`tests/views/HomeView.test.ts`、`tests/utils/i18n.test.ts`

**Interfaces:**
- Produces: `LEAGUE_SLUGS` 末尾增加 `'uefa.champions'`
- Produces: `STANDINGS_STAGE: Partial<Record<LeagueSlug, string>> = { 'uefa.champions': 'league-phase' }`
- Produces: `ZONE_CONFIG['uefa.champions'] = { ucl: 8, uel: 0, rel: 0 }`
- Produces: `standingsMatches(league: LeagueSlug, matches: Match[]): Match[]`
- Produces: `Match.stage?: string`
- Produces: `EspnEvent.season?: { slug?: string }`
- Produces: `leagueLogoPath('uefa.champions') === BASE + 'leagues/uefa.champions.png'`

- [x] **Step 1: 写失败测试**

`tests/utils/constants.test.ts`：
```ts
it('七联赛通过', () => {
  for (const s of ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'chn.1', 'uefa.champions']) expect(isLeagueSlug(s)).toBe(true)
})
it('欧冠：前 8 为晋级区，其余无区带', () => {
  expect(zoneOf(1, 36, 'uefa.champions')).toBe('ucl')
  expect(zoneOf(8, 36, 'uefa.champions')).toBe('ucl')
  expect(zoneOf(9, 36, 'uefa.champions')).toBeNull()
  expect(zoneOf(36, 36, 'uefa.champions')).toBeNull()
})
```

`tests/utils/standings.test.ts` 导入 `standingsMatches`，新增：
```ts
describe('standingsMatches', () => {
  it('欧冠只保留联赛阶段', () => {
    const lp = makeMatch({ eventId: 'lp', stage: 'league-phase' })
    const ko = makeMatch({ eventId: 'ko', stage: 'round-of-16' })
    expect(standingsMatches('uefa.champions', [lp, ko])).toEqual([lp])
  })
  it('六联赛不过滤（返回同一数组）', () => {
    const ms = [makeMatch({ stage: 'x' }), makeMatch()]
    expect(standingsMatches('eng.1', ms)).toBe(ms)
  })
})
```

`tests/stores/standings.test.ts` 新增：
```ts
it('欧冠积分榜只算联赛阶段，淘汰赛不污染', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T00:00:00Z'))
  const lp = { ...staticMatch(1, 2), eventId: 'lp', stage: 'league-phase' }
  const ko = { ...staticMatch(3, 4), eventId: 'ko', stage: 'round-of-16' }
  mockFetch.mockImplementation((input) => {
    const url = String(input)
    if (url.includes('site.api.espn.com')) return ok({ events: [] })
    if (url.includes('uefa.champions/matches/2026-09.json')) return ok({ matches: [lp, ko] })
    return Promise.resolve({ ok: false, status: 404 })
  })
  const store = useStandingsStore()
  await store.load('uefa.champions', '2026', { seasonType: 'european', forceFresh: true })
  expect(store.rows['uefa.champions']!.map((r) => r.teamId).sort()).toEqual([1, 2])
})
```

`tests/composables/useEspanFetch.test.ts` 导入 `normalizeEvent`，新增：
```ts
it('season.slug 映射为 stage（欧冠阶段过滤依赖）', () => {
  const m = normalizeEvent({
    id: 'e1', date: '2026-09-15T19:00Z', season: { slug: 'league-phase' },
    status: { type: { state: 'post', completed: true } },
    competitions: [{
      competitors: [
        { homeAway: 'home', team: { id: '1', displayName: 'A' }, score: '2' },
        { homeAway: 'away', team: { id: '2', displayName: 'B' }, score: '0' },
      ],
    }],
  } as any)
  expect(m?.stage).toBe('league-phase')
})
```

枚举相关测试同步改：
- `tests/components/LeagueTabs.test.ts`：中文名映射加 `'uefa.champions': '欧冠'`；按钮数 `6 → 7`；断言含「欧冠」。
- `tests/components/LeaguePicker.test.ts`：`ZH` 加 `'uefa.champions': '欧冠'`；展开后按钮数 `1 + 6 → 1 + 7`；断言含「欧冠」。
- `tests/components/LeagueSubNav.test.ts`：`ZH` 加 `'uefa.champions': '欧冠'`。
- `tests/views/HomeView.test.ts`：期望 bundle 列表加 `'uefa.champions'`；描述「六联赛」改「七联赛」。
- `tests/utils/i18n.test.ts`：`TEAM_ZH` 数量 `212 → 221`，新增 3 条抽查（Shakhtar Donetsk / Galatasaray / Slavia Prague）。

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/utils/constants.test.ts tests/utils/standings.test.ts tests/stores/standings.test.ts tests/composables/useEspanFetch.test.ts`
Expected: FAIL（`uefa.champions` 不合法、`standingsMatches` 未定义、`stage` 未映射）。

- [x] **Step 3: 实现**

`src/utils/constants.ts`：
```ts
export const LEAGUE_SLUGS = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'chn.1', 'uefa.champions'] as const
export const STANDINGS_STAGE: Partial<Record<LeagueSlug, string>> = { 'uefa.champions': 'league-phase' }
```
`ZONE_CONFIG` 加 `'uefa.champions': { ucl: 8, uel: 0, rel: 0 }`。

`src/types/models.ts` 的 `Match` 增加 `stage?: string`。
`src/types/espn-site.ts` 的 `EspnEvent` 增加 `season?: { slug?: string }`。

`src/composables/useEspanFetch.ts` 的 `normalizeEvent` 返回对象增加 `stage: e.season?.slug`。

`src/utils/standings.ts`：
```ts
import { STANDINGS_STAGE, zoneOf, type LeagueSlug } from './constants'

export function standingsMatches(league: LeagueSlug, matches: Match[]): Match[] {
  const stage = STANDINGS_STAGE[league]
  return stage ? matches.filter((m) => m.stage === stage) : matches
}
```

`src/stores/standings.ts`：
```ts
const allMatches = standingsMatches(league, applyMatchFixes(files.flat()))
```
后续 `formMatches` 与 `computeStandings` 都用 `allMatches`。

`src/utils/leagueLogo.ts` 加 `'uefa.champions': `${BASE}leagues/uefa.champions.png``。

下载徽标：
```bash
curl -sL -o public/leagues/uefa.champions.png "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png"
```
确认文件 >10KB。

`src/utils/i18n.ts` 的 `TEAM_ZH` 补：
```ts
'Shakhtar Donetsk': '顿涅茨克矿工',
'Galatasaray': '加拉塔萨雷',
'LASK Linz': '林茨',
'Sabah FK': '萨巴赫',
'Bodo/Glimt': '博多格林特',
'AEK Athens': 'AEK雅典',
'Slavia Prague': '布拉格斯拉维亚',
'Viking FK': '维京',
'Slovan Bratislava': '布拉迪斯拉发斯拉夫人',
```
若本地生成的 `teams.json` 队名与上表不一致，以 `teams.json` 的 `displayName` 为准改键，并同步 `TEAM_ZH` 数量测试。

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/utils/constants.test.ts tests/utils/standings.test.ts tests/stores/standings.test.ts tests/composables/useEspanFetch.test.ts tests/components/LeagueTabs.test.ts tests/components/LeaguePicker.test.ts tests/components/LeagueSubNav.test.ts tests/components/LeagueLogo.test.ts tests/views/HomeView.test.ts tests/utils/i18n.test.ts`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/utils/constants.ts src/types/models.ts src/types/espn-site.ts src/composables/useEspanFetch.ts src/utils/standings.ts src/stores/standings.ts src/utils/leagueLogo.ts src/utils/i18n.ts public/leagues/uefa.champions.png tests/utils/constants.test.ts tests/utils/standings.test.ts tests/stores/standings.test.ts tests/composables/useEspanFetch.test.ts tests/components/LeagueTabs.test.ts tests/components/LeaguePicker.test.ts tests/components/LeagueSubNav.test.ts tests/views/HomeView.test.ts tests/utils/i18n.test.ts
git commit -m "feat(ucl): 前端接入第七联赛与联赛阶段积分榜"
```

---

### Task 4: 欧冠积分榜图例与移动端下拉

**Files:**
- Modify: `src/components/standings/StandingsTable.vue:38-52`
- Modify: `src/utils/i18n.ts:263-266`（legend 键）
- Modify: `src/components/layout/LeaguePicker.vue:44`（`w-40 → w-56`）
- Create: `tests/components/StandingsTable.test.ts`

**Interfaces:**
- Produces: i18n 键 `legend.uclTop8` / `legend.uclPlayoff` / `legend.uclOut`

- [x] **Step 1: 写失败测试**

新建 `tests/components/StandingsTable.test.ts`：
```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StandingsTable from '../../src/components/standings/StandingsTable.vue'

beforeEach(() => setActivePinia(createPinia()))

describe('StandingsTable 图例', () => {
  it('欧冠显示专用图例，不显示欧联/降级', () => {
    const w = mount(StandingsTable, { props: { rows: [], league: 'uefa.champions', showXg: false } })
    expect(w.text()).toContain('前 8 直接晋级')
    expect(w.text()).toContain('9–24')
    expect(w.text()).toContain('25–36')
    expect(w.text()).not.toContain('欧联')
    expect(w.text()).not.toContain('降级')
  })
  it('英超保留原图例', () => {
    const w = mount(StandingsTable, { props: { rows: [], league: 'eng.1', showXg: false } })
    expect(w.text()).toContain('欧联')
    expect(w.text()).toContain('降级')
  })
})
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/StandingsTable.test.ts`
Expected: FAIL，欧冠仍显示「欧联/降级」。

- [x] **Step 3: 实现**

`src/utils/i18n.ts` 新增：
```ts
'legend.uclTop8': { zh: '前 8 直接晋级 16 强', en: 'Top 8 advance to R16' },
'legend.uclPlayoff': { zh: '9–24 名附加赛', en: '9–24 play-offs' },
'legend.uclOut': { zh: '25–36 名淘汰', en: '25–36 eliminated' },
```

`StandingsTable.vue` 图例区改为：
```vue
<template v-if="league === 'uefa.champions'">
  <span ...><i style="background: var(--league-color)"></i>{{ t('legend.uclTop8', app.lang) }}</span>
  <span ...><i class="bg-amber-500"></i>{{ t('legend.uclPlayoff', app.lang) }}</span>
  <span ...><i class="bg-red-500"></i>{{ t('legend.uclOut', app.lang) }}</span>
</template>
<template v-else>
  <!-- 现有 4 段图例原样保留 -->
</template>
```

`LeaguePicker.vue` 面板宽度 `w-40` → `w-56`，避免英文「UEFA Champions League」溢出。

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/StandingsTable.test.ts`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/components/standings/StandingsTable.vue src/utils/i18n.ts src/components/layout/LeaguePicker.vue tests/components/StandingsTable.test.ts
git commit -m "feat(ucl): 积分榜欧冠图例与移动端下拉宽度"
```

---

### Task 5: 体检脚本跳过欧冠淘汰赛

**Files:**
- Modify: `scripts/lib/suspicious-checks.js`（新增 `isKnockoutMatch` 并导出）
- Modify: `scripts/check-suspicious-matches.js:54-89`（按联赛对象过滤）
- Test: `tests/scripts/check-suspicious-matches.test.ts`

**Interfaces:**
- Consumes: Task 1 `LEAGUES` 的 `standingsStage`
- Produces: `isKnockoutMatch(league: { standingsStage?: string }, match: { stage?: string }): boolean`

- [x] **Step 1: 写失败测试**

`tests/scripts/check-suspicious-matches.test.ts` 导入补 `isKnockoutMatch`，新增：
```ts
describe('isKnockoutMatch（欧冠淘汰赛跳过体检）', () => {
  const ucl = { standingsStage: 'league-phase' }
  it('非联赛阶段 → true', () => {
    expect(isKnockoutMatch(ucl, { stage: 'round-of-16' })).toBe(true)
    expect(isKnockoutMatch(ucl, { stage: 'final' })).toBe(true)
  })
  it('联赛阶段/无 stage/非欧冠 → false', () => {
    expect(isKnockoutMatch(ucl, { stage: 'league-phase' })).toBe(false)
    expect(isKnockoutMatch(ucl, {})).toBe(false)
    expect(isKnockoutMatch({}, { stage: 'round-of-16' })).toBe(false)
  })
})
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/scripts/check-suspicious-matches.test.ts`
Expected: FAIL，`isKnockoutMatch is not a function`。

- [x] **Step 3: 实现**

`scripts/lib/suspicious-checks.js`：
```js
function isKnockoutMatch(league, match) {
  return Boolean(league && league.standingsStage && match && match.stage && match.stage !== league.standingsStage);
}
```
加入 `module.exports`。

`scripts/check-suspicious-matches.js`：
- 导入 `isKnockoutMatch`。
- 主循环 `for (const { slug } of targets)` 改为 `for (const league of targets)`，循环内所有 `slug` 引用同步改为 `league.slug`（含 `collectEntries`、`site.summary` 与日志）。
- `const entries = collectEntries(league.slug).filter((e) => !isKnockoutMatch(league, e.match))`。

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/scripts/check-suspicious-matches.test.ts`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add scripts/lib/suspicious-checks.js scripts/check-suspicious-matches.js tests/scripts/check-suspicious-matches.test.ts
git commit -m "fix(ucl): 体检跳过欧冠淘汰赛，避免点球平局误报"
```

---

### Task 6: 数据管线接入与本地冒烟

**Files:**
- Modify: `scripts/fetch-transfers.js:69`（联赛列表加 `'uefa.champions'`）
- 数据产物（不提交）：`public/data/uefa.champions/**`

**Interfaces:**
- Produces: `public/data/uefa.champions/{meta,teams,seasons,leaders}.json`、`players/**`、`matches/**`、`transfers.json`、`standings.json`

- [x] **Step 1: 修改转会脚本联赛列表**

`scripts/fetch-transfers.js` 第 69 行数组追加 `'uefa.champions'`。

- [x] **Step 2: core 冒烟**

Run: `PLAYERS_LIMIT=3 node scripts/fetch-espn-core.js uefa.champions`
Expected: exit 0；输出 `uefa.champions` 成功摘要；`public/data/uefa.champions/teams.json` 的 `count` 为 36；`leaders.json` 有 12 个 category。

- [x] **Step 3: 赛程与积分榜冒烟**

Run: `node scripts/fetch-espn-scores.js uefa.champions`
Expected: exit 0；`public/data/uefa.champions/matches/2026-09.json` 每场含 `stage: "league-phase"`；`standings.json` 36 行且 `matchesCounted` 只含联赛阶段场次。

- [x] **Step 4: 转会与体检冒烟**

Run:
```bash
LEAGUE=uefa.champions PLAYERS_LIMIT=5 node scripts/fetch-transfers.js
SKIP_SUMMARY=1 node scripts/check-suspicious-matches.js uefa.champions
```
Expected: 两条命令均 exit 0；生成 `public/data/uefa.champions/transfers.json`。

- [x] **Step 5: 确认数据未进暂存区**

Run: `git status --short`
Expected: `public/data/uefa.champions/` 仅显示为未跟踪；`public/data/leagues.json` 可能因单联赛运行被改写（其他联赛 players 变 null），属本地临时状态，Task 7 全联赛重跑会恢复，**两者都不得 `git add`**。

- [x] **Step 6: 提交（仅代码）**

```bash
git add scripts/fetch-transfers.js
git commit -m "feat(ucl): 转会抓取纳入欧冠"
```

---

### Task 7: 全量数据与全站验收

**Files:** 无代码新增；验证与修复。

- [x] **Step 1: 全联赛 core 数据（恢复 leagues.json 并生成欧冠全量数据）**

Run: `node scripts/fetch-espn-core.js`
Expected: exit 0；欧冠 36 队、球员约 1000+；六联赛数据同步刷新；`leagues.json` 恢复七联赛完整计数。耗时预计 75–85 分钟。数据留在本地，不提交。

- [x] **Step 2: 全量赛程、转会与队徽**

Run:
```bash
node scripts/fetch-espn-scores.js uefa.champions
LEAGUE=uefa.champions node scripts/fetch-transfers.js
node scripts/fetch-logos.js
```
Expected: 三条均 exit 0；欧冠新增球队（如 LASK Linz、Sabah FK）队徽补齐到 `public/logos/`。数据与队徽均不入库，Actions 会自动提交。

- [x] **Step 3: 全量门禁**

Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: 全部通过，无失败用例、无类型错误、构建成功。

- [x] **Step 4: 浏览器实测（本地 dev server）**

Run: `npm run dev`，逐项检查：

1. 首页：出现第 7 张联赛卡「欧冠」，MiniStandings 显示前 8；昨日战报带若有欧冠比赛能显示徽标。
2. 欧冠积分榜：36 行、前 8 高亮、图例为「前 8 直接晋级 / 9–24 附加赛 / 25–36 淘汰」、赛季显示 `2026-27`。
3. 欧冠赛程：10 月 36 场可显示；点击比赛弹出详情；联赛阶段与淘汰赛月（3 月及以后）都能出现。
4. 欧冠球员：列表可加载、点进详情有统计与履历。
5. 欧冠排行榜：12 个分类有数据。
6. 欧冠对比：可选两名球员并出对比。
7. 球队详情：欧冠球队可进、赛程页签可加载、订阅/收藏/导出日历按钮可用。
8. 移动端 375px：7 项联赛下拉不溢出；积分榜仅显核心列、行可展开；英文模式 7 个页签可横滑。
9. 六联赛回归：随便抽查英超积分榜/赛程与改动前一致，无 stage 字段副作用。

Expected: 9 项全过；发现真问题则修复并补测试，回到 Step 3。

- [x] **Step 5: 提交剩余修复**

```bash
git add <具体代码路径>
git commit -m "fix(ucl): <问题描述>"
```

---

### Task 8: 汇报与项目档案更新

**Files:**
- Modify: `CLAUDE.md`（项目画像 / 工作流当前状态 / 军衔记录）

- [ ] **Step 1: 向总司令汇报**

汇报内容：欧冠第七联赛上线情况、实测数据口径（联赛阶段积分榜、淘汰赛仅赛程）、Actions 时长变化、已知限制（球员/排行榜为联赛阶段统计、徽标暂时用 ESPN 自托管）、测试与浏览器验收结果。说明线上数据需在代码 push 后到 Actions 手动触发一次 Fetch Data 才会生成（本地数据不入库）。

- [ ] **Step 2: 等待验收后再更新 CLAUDE.md**

按项目铁律「先汇报后更新」：总司令验收通过后，再更新 `CLAUDE.md` 的项目画像、当前状态与军衔记录；未验收不写。

- [ ] **Step 3: 提交文档**

```bash
git add CLAUDE.md
git commit -m "docs: 欧冠第七联赛完工记录"
```

---

## 自检

- **Spec 覆盖**：需求（页签/积分榜/赛程/球员/排行榜/对比/详情/个人化/首页）→ Task 3（枚举与页面接入）、Task 4（图例）、Task 7（全站验收）；数据源结论 → Task 1/2/6；徽标与中文名 → Task 3；体检 → Task 5；Actions/限制 → Global Constraints 与 Task 8 汇报。
- **步骤可执行**：每个签名、文件、测试断言、命令与预期输出均已写明；未留 TBD。
- **类型一致**：`stage`、`standingsStage`、`hasStages`、`STANDINGS_STAGE`、`standingsMatches`、`isKnockoutMatch` 在各任务间命名一致。
- **Review Focus 覆盖**：淘汰赛点球 → Task 2/3/5 测试；7/8 月探测 → Task 1 测试；直播 stage → Task 3 `normalizeEvent` 测试 + Task 7 实测；六联赛零影响 → Task 3/7 回归；窄屏中英文 → Task 4/7 实测。
- **比例**：本计划以决策与接口为主，代码块只保留签名、断言和关键算法。

---

## 进度日志

| 日期 | 事项 | 结果 |
|---|---|---|
| 2026-10-29 | 完成 ESPN 欧冠端点实测与计划编写 | 计划文档落盘；8 个 Task 待执行 |
| 2026-10-29 | 补进度总览与日志 | 顶部进度表可逐 Task 更新 |
| 2026-10-29 | Task 1–7 执行完成：全量 core 数据、赛程/转会/队徽、浏览器验收与终审收口 | Task 1–7 已完成（提交 5ac5445f、2311f2e0、bf3fc85f、4c0f7251、983d916b、00d85b54、250e9a45、本次收口代码提交）；Task 8 待总司令验收 |
| 2026-10-30 | 收口修复落库：体检仅跳过淘汰赛「平局标胜者」、阶段过滤空榜告警、stage 空串归一、图例配色与分享文案 | 428/428 单测、typecheck、build 全绿；Task 7 剩余浏览器四项待验收 |
| 2026-10-30 | Task 7 浏览器四项全过（对比/球队详情与个人化/375px/六联赛回归）+ 整分支终审与 Important 修复（iCal 补欧冠 6 月、阶段过滤空榜改抛错） | 433/433 单测、typecheck、build 全绿；代码改动待提交；Task 8 待总司令验收 |
| 2026-10-30 | 收口代码提交并推送 `d84d903a`（11 文件，+773/−24），GH Pages Deploy 成功 | 线上代码已更新为七联赛版本 |
| 2026-10-30 | 线上验收（Cloudflare `matchlab-c2o.pages.dev`）欧冠积分榜报「数据加载失败 · Unexpected token '<'」 | 取证：`/data/uefa.champions/meta.json` 返回 200 但 content-type 为 text/html（SPA 回退 index.html），`/data/leagues.json` 仍 6 联赛 → 根因是欧冠静态数据尚未生成，非前端 bug |
| 2026-10-30 | 决定不本地提交数据，等 2026-10-31 07:00（北京）定时 Fetch Data 生成；体检可能因西甲 Rayo Vallecano vs Athletic Club（10-10，post 未完成）红灯 | 数据提交在体检步骤之前，红灯不阻塞数据落库与部署；欧冠页在数据生成前维持报错属预期 |