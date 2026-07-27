# Phase 2 实施计划：积分榜 + 赛程前端

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 v1.7 封版规格（`projectDoc/plan/phase2-积分榜与赛程-设计.md`）实现五大联赛积分榜 + 赛程 + 首页，转播图形风视觉，混合数据供给（静态 JSON + ESPN 当月直连）。

**Architecture:** 纯消费层，不动任何数据文件与抓取脚本。Vue 3 `<script setup>` + Pinia 四 store（app/teams/standings/matches）+ 四 composable（useJsonFetch/useEspanFetch/useLeague/useTimezone）；静态数据走 `import.meta.env.BASE_URL` 前缀 + localStorage TTL 缓存（赛季号入键）；当月赛程浏览器直连 ESPN site.api，归一化后存内存 + 有条件轮询。

**Tech Stack:** Vite 6 · Vue 3 · Pinia · Vue Router 4（hash）· TypeScript strict · Tailwind 4（任意值引用 CSS 变量主题色）· vitest（纯函数测试）· Google Fonts（Bebas Neue / Oswald / IBM Plex Sans / IBM Plex Mono，display=swap）

---

## 文件结构（本计划锁定的分解，细化自规格 §四文件树）

```
src/
├── types/
│   ├── models.ts          # 前端归一化模型：LeagueInfo/Team/StandingRow/Match/MatchTeam/XgRow/DayGroup/FormResult
│   ├── static.ts          # public/data 各 JSON 文件的原始结构类型
│   └── espn-site.ts       # ESPN scoreboard 原始响应类型（最小够用）
├── utils/
│   ├── constants.ts       # LEAGUE_SLUGS/isLeagueSlug/ZONE_CONFIG/zoneOf/seasonMonths/defaultMonth/currentMonth/FOCUS_LEAGUE/CACHE_PREFIX
│   ├── i18n.ts            # Lang 类型 + UI 字典 t() + TEAM_ZH 96 队译名 + teamName()
│   ├── format.ts          # 时区与日期：isNextDay/formatKickoff/formatUtcDateLabel/groupMatchesByUtcDate
│   ├── matches.ts         # computeForm/lastCompletedMatchday/selectStripMatches
│   └── standings.ts       # mergeStandings（rank+zone+xG 合并）/ applyForm
├── composables/
│   ├── useJsonFetch.ts    # fetchJsonCached：BASE_URL 前缀 + localStorage TTL + 赛季号入键 + 损坏按未命中
│   ├── useEspanFetch.ts    # fetchLiveScores + normalizeEvent（pre/in/post 归一化，唯一接触 ESPN 原始结构处）
│   └── useLeague.ts       # ensureLeague：幂等 + 在途去重 + 写 appStore
├── stores/
│   ├── app.ts             # currentLeague + lang（持久化 matchlab:lang）+ leagues.json 加载
│   ├── teams.ts           # meta + teams 按联赛缓存，teamById 快查
│   ├── standings.ts       # 正榜 + form + xG（懒加载），load/toggleXg
│   └── matches.ts         # 月份缓存 + 当月直播态 + 60s 有条件轮询 + 快照兜底
├── components/
│   ├── layout/            # AppHeader.vue · LeagueTabs.vue · AppFooter.vue
│   ├── common/            # TeamLogo.vue · DataLoading.vue · DataError.vue
│   ├── standings/         # StandingsTable.vue · StandingsRow.vue · FormDots.vue
│   ├── matches/           # MonthStrip.vue · MatchList.vue · MatchCard.vue
│   └── home/              # MatchdayStrip.vue · LeagueCard.vue · MiniStandings.vue
├── views/                 # HomeView.vue · StandingsView.vue · ScheduleView.vue
├── router/index.ts        # （改）完整路由表 + 联赛参数守卫
├── App.vue                # （改）壳：联赛光晕主题 + AppHeader/AppFooter + router-view
├── style.css              # （改）主题变量、背景三层、字体栈、全局动效与焦点环
└── main.ts                # （不动）

index.html                 # （改）Google Fonts + lang="zh-CN" + title + description
tests/utils/*.test.ts      # 新增：五个纯函数测试
package.json               # （改）+vitest 依赖 + test 脚本
```

**分解说明**：规格文件树列了 i18n/constants/format 三个 utils 文件，本计划把纯数据逻辑拆出 `matches.ts` 与 `standings.ts`——format 只管时间日期格式化，数据计算各归各家，测试好写、职责清晰。

**执行纪律**：
- 每步一动作，每个 Task 以 commit 收尾（commit message 中文，格式 `feat(phase-2): …` / `test(phase-2): …`）
- 纯函数一律先写失败测试再实现（TDD）；Vue 组件不写快照测试，靠 `vue-tsc` + 人工验收
- 界面文案一律走 `t()`，组件里禁止硬编码中文（验收标准 7）
- 静态 fetch 一律 `fetchJsonCached`（BASE_URL 前缀铁律）

---

## Task 1：测试设施 + 联赛/赛季/区带纯函数

**Files:**
- Create: `tests/utils/constants.test.ts`
- Create: `src/utils/constants.ts`
- Modify: `package.json`

- [ ] **Step 1：安装 vitest，配 test 脚本**

```bash
npm install -D vitest
```

package.json 的 scripts 加一行（devDependencies 由 npm 自动写入）：

```json
"test": "vitest run"
```

- [ ] **Step 2：写失败测试 `tests/utils/constants.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  defaultMonth,
  isLeagueSlug,
  seasonMonths,
  zoneOf,
  currentMonth,
} from '../../src/utils/constants'

describe('isLeagueSlug', () => {
  it('五大联赛通过', () => {
    for (const s of ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1']) expect(isLeagueSlug(s)).toBe(true)
  })
  it('其他一律拒绝', () => {
    for (const s of ['fifa.world', 'ENG.1', '', 'eng1']) expect(isLeagueSlug(s)).toBe(false)
  })
})

describe('seasonMonths', () => {
  it('2025 赛季 → 2025-08 至 2026-05 共 10 个月', () => {
    const months = seasonMonths('2025')
    expect(months).toHaveLength(10)
    expect(months[0]).toBe('2025-08')
    expect(months[9]).toBe('2026-05')
  })
})

describe('defaultMonth', () => {
  it('赛季内取当月', () => {
    expect(defaultMonth('2025', new Date('2026-01-15T12:00:00Z'))).toBe('2026-01')
  })
  it('休赛期（6/7 月）落 5 月收官月', () => {
    expect(defaultMonth('2025', new Date('2026-07-27T12:00:00Z'))).toBe('2026-05')
    expect(defaultMonth('2025', new Date('2026-06-10T12:00:00Z'))).toBe('2026-05')
  })
})

describe('currentMonth', () => {
  it('按 UTC 取 YYYY-MM', () => {
    expect(currentMonth(new Date('2026-07-27T23:00:00Z'))).toBe('2026-07')
  })
})

describe('zoneOf', () => {
  it('20 队联赛：前 4 欧冠 / 第 5 欧联 / 后 3 降级 / 中间无区带', () => {
    expect(zoneOf(1, 20, 'eng.1')).toBe('ucl')
    expect(zoneOf(4, 20, 'eng.1')).toBe('ucl')
    expect(zoneOf(5, 20, 'eng.1')).toBe('uel')
    expect(zoneOf(6, 20, 'eng.1')).toBeNull()
    expect(zoneOf(18, 20, 'eng.1')).toBe('rel')
    expect(zoneOf(20, 20, 'eng.1')).toBe('rel')
  })
  it('德甲：第 16 附加赛、17/18 直降', () => {
    expect(zoneOf(16, 18, 'ger.1')).toBe('playoff')
    expect(zoneOf(17, 18, 'ger.1')).toBe('rel')
    expect(zoneOf(18, 18, 'ger.1')).toBe('rel')
  })
  it('法甲：无附加赛，后 2 直降', () => {
    expect(zoneOf(16, 18, 'fra.1')).toBeNull()
    expect(zoneOf(17, 18, 'fra.1')).toBe('rel')
  })
})
```

- [ ] **Step 3：跑测试确认全红**

```bash
npm test
```

预期：FAIL（`Cannot find module '../../src/utils/constants'`）

- [ ] **Step 4：实现 `src/utils/constants.ts`**

```ts
export const LEAGUE_SLUGS = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1'] as const
export type LeagueSlug = (typeof LEAGUE_SLUGS)[number]

export function isLeagueSlug(v: string): v is LeagueSlug {
  return (LEAGUE_SLUGS as readonly string[]).includes(v)
}

/** 首页默认焦点联赛（规格 §四首页） */
export const FOCUS_LEAGUE: LeagueSlug = 'eng.1'

/** localStorage 缓存键前缀，版本升级改这里使全站缓存失效 */
export const CACHE_PREFIX = 'matchlab:v1'

export interface ZoneConfig {
  ucl: number
  uel: number
  /** 降级附加赛名次（仅德甲 18 队制有） */
  playoff?: number
  rel: number
}

/** 每联赛各写一份，规则不通用（规格 §四积分榜页） */
export const ZONE_CONFIG: Record<LeagueSlug, ZoneConfig> = {
  'eng.1': { ucl: 4, uel: 1, rel: 3 },
  'esp.1': { ucl: 4, uel: 1, rel: 3 },
  'ita.1': { ucl: 4, uel: 1, rel: 3 },
  'ger.1': { ucl: 4, uel: 1, playoff: 16, rel: 2 },
  'fra.1': { ucl: 4, uel: 1, rel: 2 },
}

export type Zone = 'ucl' | 'uel' | 'playoff' | 'rel'

/** 名次对应的区带，无区带返回 null */
export function zoneOf(rank: number, total: number, league: LeagueSlug): Zone | null {
  const z = ZONE_CONFIG[league]
  if (rank <= z.ucl) return 'ucl'
  if (rank === z.ucl + z.uel) return 'uel'
  if (z.playoff !== undefined && rank === z.playoff) return 'playoff'
  if (rank > total - z.rel) return 'rel'
  return null
}

/** 赛季号 → 月份清单：'2025' → ['2025-08', …, '2026-05']（规格规则 2） */
export function seasonMonths(season: string): string[] {
  const start = Number(season)
  const months: string[] = []
  for (let i = 0; i < 10; i++) {
    const y = i < 5 ? start : start + 1
    const m = i < 5 ? 8 + i : i - 4
    months.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return months
}

/** 当前 UTC 月份 YYYY-MM（直播/死数据分界用 UTC 口径） */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

/** 默认月份：赛季内当月，休赛期落 5 月（规格规则 3） */
export function defaultMonth(season: string, now: Date = new Date()): string {
  const cur = currentMonth(now)
  const months = seasonMonths(season)
  return months.includes(cur) ? cur : months[months.length - 1]
}
```

- [ ] **Step 5：跑测试确认全绿**

```bash
npm test
```

预期：PASS（constants.test.ts 全过）

- [ ] **Step 6：提交**

```bash
git add package.json package-lock.json tests/utils/constants.test.ts src/utils/constants.ts
git commit -m "feat(phase-2): 测试设施就位 + 联赛/赛季/区带纯函数（TDD）"
```

---

## Task 2：类型层（models / static / espn-site）

**Files:**
- Create: `src/types/models.ts`
- Create: `src/types/static.ts`
- Create: `src/types/espn-site.ts`

- [ ] **Step 1：写 `src/types/models.ts`（前端归一化模型）**

```ts
import type { LeagueSlug, Zone } from '../utils/constants'

export interface LeagueInfo {
  slug: LeagueSlug
  name: string
  nameZh: string
  country: string
  color: string
  understatSlug: string
  season: string
  teams: number
  players: number
}

export interface Team {
  id: number
  name: string
  shortDisplayName: string
  abbreviation: string
  color: string
  alternateColor: string
  logo: string
  logoDark: string
}

export type FormResult = 'W' | 'D' | 'L'

export interface StandingRow {
  rank: number
  teamId: number
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  zone: Zone | null
  /** 近 5 场，时间序，最近一场在最右（规格 FormDots） */
  form: FormResult[]
  xG?: number
  xGA?: number
  xPts?: number
}

export type MatchStatus = 'pre' | 'in' | 'post'

export interface MatchTeam {
  id: number
  name: string
  abbreviation: string
  logo: string
  score: number | null
  winner: boolean | null
}

export interface Match {
  eventId: string
  /** UTC ISO 8601，如 2025-08-16T14:00Z */
  date: string
  status: MatchStatus
  completed: boolean
  clock?: string
  venue: string
  home: MatchTeam
  away: MatchTeam
}

export interface XgRow {
  team: string
  xG: number
  xGA: number
  xpts: number
}

/** 按 UTC 日期分组的比赛日（规格：分组用数据日期，全球一致） */
export interface DayGroup {
  utcDate: string
  matches: Match[]
}
```

- [ ] **Step 2：写 `src/types/static.ts`（public/data 文件原始结构）**

```ts
import type { LeagueInfo, Match } from './models'

export interface LeaguesFile {
  updateTime: string
  season: string
  count: number
  leagues: LeagueInfo[]
}

export interface MetaFile {
  source: string
  updateTime: string
  league: string
  name: string
  displayName: string
  slug: string
  color: string
  nameZh: string
  country: { name: string; flag: string }
  season: { year: number; displayName: string }
}

export interface RawTeam {
  id: number
  displayName: string
  shortDisplayName: string
  abbreviation: string
  color: string
  alternateColor: string
  logo: string
  logoDark: string
  venue: { name: string; city: string; country: string }
}

export interface TeamsFile {
  source: string
  updateTime: string
  league: string
  season: string
  count: number
  teams: RawTeam[]
}

export interface RawStanding {
  rank: number
  teamId: number
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export interface StandingsFile {
  source: string
  updateTime: string
  league: string
  season: string
  matchesCounted: number
  count: number
  standings: RawStanding[]
}

export interface MatchesFile {
  source: string
  updateTime: string
  league: string
  month: string
  count: number
  matches: Match[]
}

/** Understat 原始行——只声明要用的字段，history 等大宗字段不建模（规格规则 7 白名单） */
export interface RawXgStanding {
  rank: number
  teamId: string
  team: string
  xG: number
  xGA: number
  xpts: number
  history?: unknown
}

export interface XgFile {
  source: string
  league: string
  understatLeague: string
  season: string
  updateTime: string
  standings: RawXgStanding[]
}

export interface TeamNameMapFile {
  description: string
  updateTime: string
  count: number
  /** Understat 队名 → ESPN 队名，26 条 */
  map: Record<string, string>
}
```

- [ ] **Step 3：写 `src/types/espn-site.ts`（ESPN scoreboard 最小响应类型）**

```ts
export interface EspnTeamRef {
  id: string
  displayName: string
  abbreviation: string
  logo?: string
}

export interface EspnCompetitor {
  homeAway: 'home' | 'away'
  id: string
  score?: string
  winner?: boolean
  team: EspnTeamRef
}

export interface EspnEvent {
  id: string
  date: string
  status: {
    clock?: number
    displayClock?: string
    type: { id: string; state: 'pre' | 'in' | 'post'; completed?: boolean }
  }
  competitions: {
    venue?: { fullName?: string }
    competitors: EspnCompetitor[]
  }[]
}

export interface EspnScoreboard {
  events?: EspnEvent[]
}
```

- [ ] **Step 4：类型检查过关**

```bash
npx vue-tsc --noEmit
```

预期：无错误输出（0 errors）

- [ ] **Step 5：提交**

```bash
git add src/types/
git commit -m "feat(phase-2): 类型层——models/static/espn-site 三件套"
```

---

## Task 3：i18n——UI 字典 + 96 队译名（全文案，禁硬编码中文）

**Files:**
- Create: `tests/utils/i18n.test.ts`
- Create: `src/utils/i18n.ts`

- [ ] **Step 1：写失败测试 `tests/utils/i18n.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { t, teamName, TEAM_ZH } from '../../src/utils/i18n'

describe('t()', () => {
  it('中英文都能取到', () => {
    expect(t('nav.standings', 'zh')).toBe('积分榜')
    expect(t('nav.standings', 'en')).toBe('Table')
  })
  it('未定义的键原样返回（不炸页）', () => {
    expect(t('no.such.key', 'zh')).toBe('no.such.key')
  })
})

describe('teamName()', () => {
  it('中文模式走译名表', () => {
    expect(teamName('Arsenal', 'zh')).toBe('阿森纳')
    expect(teamName('Tottenham Hotspur', 'zh')).toBe('托特纳姆热刺')
  })
  it('英文模式/未收录队名原样返回', () => {
    expect(teamName('Arsenal', 'en')).toBe('Arsenal')
    expect(teamName('Some Unknown FC', 'zh')).toBe('Some Unknown FC')
  })
})

describe('TEAM_ZH 覆盖 96 队', () => {
  it('五联赛队数 = 20+20+20+18+18', () => {
    expect(Object.keys(TEAM_ZH)).toHaveLength(96)
  })
})
```

- [ ] **Step 2：跑测试确认失败**

```bash
npm test
```

预期：FAIL（找不到 `../../src/utils/i18n`）

- [ ] **Step 3：实现 `src/utils/i18n.ts`**

```ts
export type Lang = 'zh' | 'en'

/** 96 队标准中文译名（键 = teams.json 的 displayName，一个不多一个不少） */
export const TEAM_ZH: Record<string, string> = {
  // 英超 eng.1（20）
  'AFC Bournemouth': '伯恩茅斯',
  'Arsenal': '阿森纳',
  'Aston Villa': '阿斯顿维拉',
  'Brentford': '布伦特福德',
  'Brighton & Hove Albion': '布莱顿',
  'Burnley': '伯恩利',
  'Chelsea': '切尔西',
  'Crystal Palace': '水晶宫',
  'Everton': '埃弗顿',
  'Fulham': '富勒姆',
  'Leeds United': '利兹联',
  'Liverpool': '利物浦',
  'Manchester City': '曼城',
  'Manchester United': '曼联',
  'Newcastle United': '纽卡斯尔联',
  'Nottingham Forest': '诺丁汉森林',
  'Sunderland': '桑德兰',
  'Tottenham Hotspur': '托特纳姆热刺',
  'West Ham United': '西汉姆联',
  'Wolverhampton Wanderers': '狼队',
  // 西甲 esp.1（20）
  'Alavés': '阿拉维斯',
  'Athletic Club': '毕尔巴鄂竞技',
  'Atlético Madrid': '马德里竞技',
  'Barcelona': '巴塞罗那',
  'Celta Vigo': '塞尔塔',
  'Elche': '埃尔切',
  'Espanyol': '西班牙人',
  'Getafe': '赫塔费',
  'Girona': '赫罗纳',
  'Levante': '莱万特',
  'Mallorca': '马略卡',
  'Osasuna': '奥萨苏纳',
  'Rayo Vallecano': '巴列卡诺',
  'Real Betis': '皇家贝蒂斯',
  'Real Madrid': '皇家马德里',
  'Real Oviedo': '皇家奥维耶多',
  'Real Sociedad': '皇家社会',
  'Sevilla': '塞维利亚',
  'Valencia': '瓦伦西亚',
  'Villarreal': '比利亚雷亚尔',
  // 意甲 ita.1（20）
  'AC Milan': 'AC米兰',
  'AS Roma': '罗马',
  'Atalanta': '亚特兰大',
  'Bologna': '博洛尼亚',
  'Cagliari': '卡利亚里',
  'Como': '科莫',
  'Cremonese': '克雷莫纳',
  'Fiorentina': '佛罗伦萨',
  'Genoa': '热那亚',
  'Hellas Verona': '维罗纳',
  'Internazionale': '国际米兰',
  'Juventus': '尤文图斯',
  'Lazio': '拉齐奥',
  'Lecce': '莱切',
  'Napoli': '那不勒斯',
  'Parma': '帕尔马',
  'Pisa': '比萨',
  'Sassuolo': '萨索洛',
  'Torino': '都灵',
  'Udinese': '乌迪内斯',
  // 德甲 ger.1（18）
  '1. FC Heidenheim 1846': '海登海姆',
  '1. FC Union Berlin': '柏林联合',
  'Bayer Leverkusen': '勒沃库森',
  'Bayern Munich': '拜仁慕尼黑',
  'Borussia Dortmund': '多特蒙德',
  'Borussia Mönchengladbach': '门兴格拉德巴赫',
  'Eintracht Frankfurt': '法兰克福',
  'FC Augsburg': '奥格斯堡',
  'FC Cologne': '科隆',
  'Hamburg SV': '汉堡',
  'Mainz': '美因茨',
  'RB Leipzig': 'RB莱比锡',
  'SC Freiburg': '弗赖堡',
  'St. Pauli': '圣保利',
  'TSG Hoffenheim': '霍芬海姆',
  'VfB Stuttgart': '斯图加特',
  'VfL Wolfsburg': '沃尔夫斯堡',
  'Werder Bremen': '云达不莱梅',
  // 法甲 fra.1（18）
  'AJ Auxerre': '欧塞尔',
  'Angers': '昂热',
  'AS Monaco': '摩纳哥',
  'Brest': '布雷斯特',
  'Le Havre AC': '勒阿弗尔',
  'Lens': '朗斯',
  'Lille': '里尔',
  'Lorient': '洛里昂',
  'Lyon': '里昂',
  'Marseille': '马赛',
  'Metz': '梅斯',
  'Nantes': '南特',
  'Nice': '尼斯',
  'Paris FC': '巴黎FC',
  'Paris Saint-Germain': '巴黎圣日耳曼',
  'Stade Rennais': '雷恩',
  'Strasbourg': '斯特拉斯堡',
  'Toulouse': '图卢兹',
}

const UI: Record<string, { zh: string; en: string }> = {
  'nav.standings': { zh: '积分榜', en: 'Table' },
  'nav.schedule': { zh: '赛程', en: 'Fixtures' },
  'home.lastRound': { zh: '上轮战报', en: 'Latest Round' },
  'home.viewFull': { zh: '查看完整赛程', en: 'Full fixtures' },
  'home.featured': { zh: '焦点联赛', en: 'Featured' },
  'home.enter': { zh: '进入', en: 'Enter' },
  'home.teamsUnit': { zh: '队', en: 'teams' },
  'home.playersUnit': { zh: '名球员', en: 'players' },
  'home.playedUnit': { zh: '场已战罢', en: 'matches played' },
  'col.team': { zh: '球队', en: 'Team' },
  'col.played': { zh: '赛', en: 'P' },
  'col.won': { zh: '胜', en: 'W' },
  'col.drawn': { zh: '平', en: 'D' },
  'col.lost': { zh: '负', en: 'L' },
  'col.gf': { zh: '进', en: 'GF' },
  'col.ga': { zh: '失', en: 'GA' },
  'col.gd': { zh: '净', en: 'GD' },
  'col.pts': { zh: '积分', en: 'Pts' },
  'col.form': { zh: '近5场', en: 'Last 5' },
  'legend.ucl': { zh: '欧冠', en: 'Champions League' },
  'legend.uel': { zh: '欧联', en: 'Europa League' },
  'legend.playoff': { zh: '降级附加赛', en: 'Relegation playoff' },
  'legend.rel': { zh: '降级', en: 'Relegation' },
  'standings.xgToggle': { zh: 'xG 数据', en: 'xG data' },
  'standings.updated': { zh: '数据更新', en: 'Updated' },
  'standings.season': { zh: '赛季', en: 'Season' },
  'schedule.live': { zh: '直播', en: 'LIVE' },
  'schedule.noMatches': { zh: '本月暂无联赛比赛', en: 'No league matches this month' },
  'schedule.offseason': { zh: '赛季已收官，展示最终数据', en: 'Season concluded — final data' },
  'schedule.goLatest': { zh: '跳到最近有数据的月份', en: 'Go to latest month with data' },
  'state.loading': { zh: '数据加载中', en: 'Loading' },
  'state.error': { zh: '数据加载失败', en: 'Failed to load' },
  'state.retry': { zh: '重试', en: 'Retry' },
  'state.liveDown': { zh: '直播暂不可用，已退回快照数据', en: 'Live unavailable — showing cached snapshot' },
  'footer.pipeline': { zh: '自动管线每日刷新', en: 'Auto pipeline · refreshed daily' },
  'footer.snapshot': { zh: '数据快照', en: 'Data snapshot' },
  'footer.source': { zh: '来源', en: 'Source' },
  'footer.tagline': { zh: '五大联赛数据查询', en: 'Top-five leagues data hub' },
  'match.vs': { zh: 'VS', en: 'VS' },
  'form.win': { zh: '胜', en: 'Win' },
  'form.draw': { zh: '平', en: 'Draw' },
  'form.loss': { zh: '负', en: 'Loss' },
}

/** 界面文案唯一出口；未定义的键原样返回 */
export function t(key: string, lang: Lang): string {
  return UI[key]?.[lang] ?? key
}

/** 队名：中文查译名表，英文/未收录直接用数据原始 displayName */
export function teamName(name: string, lang: Lang): string {
  return lang === 'zh' ? (TEAM_ZH[name] ?? name) : name
}
```

- [ ] **Step 4：跑测试确认全绿**

```bash
npm test
```

预期：PASS（i18n.test.ts 4 项全过；TEAM_ZH 恰好 96 条）

- [ ] **Step 5：提交**

```bash
git add tests/utils/i18n.test.ts src/utils/i18n.ts
git commit -m "feat(phase-2): i18n 轻量字典 + 96 队中文译名（TDD）"
```

---

## Task 4：时间格式化 + UTC 日期分组（纯函数 TDD）

**Files:**
- Create: `tests/utils/format.test.ts`
- Create: `src/utils/format.ts`

说明：时区换算依赖运行环境时区，测试断言一律**用 Date API 现场推导期望值**，不写死"北京时间几点"，任何时区的 CI 都能过。

- [ ] **Step 1：写失败测试 `tests/utils/format.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  formatKickoff,
  formatUtcDateLabel,
  groupMatchesByUtcDate,
  isNextDay,
} from '../../src/utils/format'
import type { Match } from '../../src/types/models'

const pad = (n: number) => String(n).padStart(2, '0')
/** 用 Date API 推导本地 HH:mm，测试与实现同时区，断言永远自洽 */
const localHM = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

describe('isNextDay', () => {
  it('本地日期与 UTC 日期一致 → false；跨天 → true（期望值现场推导）', () => {
    const iso = '2025-08-16T16:30Z'
    const d = new Date(iso)
    const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    expect(isNextDay(iso)).toBe(localDate !== '2025-08-16')
  })
})

describe('formatKickoff', () => {
  it('不跨天：纯 HH:mm', () => {
    const iso = '2025-08-16T11:30Z'
    expect(formatKickoff(iso, 'zh')).toBe(isNextDay(iso) ? `次日 ${localHM(iso)}` : localHM(iso))
  })
  it('跨天：中文加"次日"前缀，英文加 (+1d)', () => {
    // 构造一个必然跨天的用例：UTC 深夜，东八区必跨天；若本机时区不跨天则期望值自动切换
    const iso = '2025-08-16T16:30Z'
    const out = formatKickoff(iso, 'zh')
    expect(out.endsWith(localHM(iso))).toBe(true)
    if (isNextDay(iso)) expect(out).toBe(`次日 ${localHM(iso)}`)
    else expect(out).toBe(localHM(iso))
  })
})

describe('formatUtcDateLabel', () => {
  it('中文：8月16日 · 周六（UTC 星期推导，与本机时区无关）', () => {
    expect(formatUtcDateLabel('2025-08-16', 'zh')).toBe('8月16日 · 周六')
  })
  it('英文：Aug 16 · Sat', () => {
    expect(formatUtcDateLabel('2025-08-16', 'en')).toBe('Aug 16 · Sat')
  })
})

const mkMatch = (eventId: string, date: string): Match => ({
  eventId,
  date,
  status: 'post',
  completed: true,
  venue: 'X',
  home: { id: 1, name: 'A', abbreviation: 'A', logo: '', score: 1, winner: true },
  away: { id: 2, name: 'B', abbreviation: 'B', logo: '', score: 0, winner: null },
})

describe('groupMatchesByUtcDate', () => {
  it('按 UTC 日期分组并按日期升序，组内按开球时间升序', () => {
    const groups = groupMatchesByUtcDate([
      mkMatch('3', '2025-08-17T13:00Z'),
      mkMatch('1', '2025-08-16T14:00Z'),
      mkMatch('2', '2025-08-16T11:30Z'),
    ])
    expect(groups.map((g) => g.utcDate)).toEqual(['2025-08-16', '2025-08-17'])
    expect(groups[0].matches.map((m) => m.eventId)).toEqual(['2', '1'])
  })
  it('空输入 → 空数组', () => {
    expect(groupMatchesByUtcDate([])).toEqual([])
  })
})
```

- [ ] **Step 2：跑测试确认失败**

```bash
npm test
```

预期：FAIL（找不到 `../../src/utils/format`）

- [ ] **Step 3：实现 `src/utils/format.ts`**

```ts
import type { DayGroup, Match } from '../types/models'
import type { Lang } from './i18n'

const pad = (n: number) => String(n).padStart(2, '0')

const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 本地日期是否越过比赛的 UTC 日期（"次日"判定，规格 v1.4 标准） */
export function isNextDay(iso: string): boolean {
  const d = new Date(iso)
  const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return localDate !== iso.slice(0, 10)
}

/** 本地时区开球时间；跨天加前缀（中"次日"/英 (+1d)） */
export function formatKickoff(iso: string, lang: Lang): string {
  const d = new Date(iso)
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (!isNextDay(iso)) return hm
  return lang === 'zh' ? `次日 ${hm}` : `(+1d) ${hm}`
}

/** UTC 日期组头标签："8月16日 · 周六" / "Aug 16 · Sat"（星期按 UTC 推，全球一致） */
export function formatUtcDateLabel(utcDate: string, lang: Lang): string {
  const d = new Date(`${utcDate}T00:00:00Z`)
  const [y, m, day] = utcDate.split('-').map(Number)
  const wd = d.getUTCDay()
  if (lang === 'zh') return `${m}月${day}日 · ${WEEKDAYS_ZH[wd]}`
  return `${MONTHS_EN[m - 1]} ${day} · ${WEEKDAYS_EN[wd]}`
}

/** 按 UTC 日期分组（组间升序、组内按开球时间升序）——测试纯函数之五 */
export function groupMatchesByUtcDate(matches: Match[]): DayGroup[] {
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))
  const map = new Map<string, Match[]>()
  for (const m of sorted) {
    const key = m.date.slice(0, 10)
    const list = map.get(key)
    if (list) list.push(m)
    else map.set(key, [m])
  }
  return [...map.entries()].map(([utcDate, ms]) => ({ utcDate, matches: ms }))
}

/** 数据更新时间显示：ISO → 本地"YYYY-MM-DD HH:mm"，不裸出 ISO（规格 §四积分榜页头） */
export function formatUpdateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
```

- [ ] **Step 4：跑测试确认全绿**

```bash
npm test
```

预期：PASS

- [ ] **Step 5：提交**

```bash
git add tests/utils/format.test.ts src/utils/format.ts
git commit -m "feat(phase-2): 时区格式化 + UTC 日期分组纯函数（TDD）"
```

---

## Task 5：赛果计算 + 积分榜合并（纯函数 TDD）

**Files:**
- Create: `tests/utils/matches.test.ts`
- Create: `src/utils/matches.ts`
- Create: `tests/utils/standings.test.ts`
- Create: `src/utils/standings.ts`

- [ ] **Step 1：写失败测试 `tests/utils/matches.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { computeForm, lastCompletedMatchday, selectStripMatches } from '../../src/utils/matches'
import type { Match } from '../../src/types/models'

/** 构造一场已完赛比赛：homeId a - b awayId */
const mk = (eventId: string, date: string, homeId: number, hs: number, awayId: number, as: number): Match => ({
  eventId,
  date,
  status: 'post',
  completed: true,
  venue: 'X',
  home: { id: homeId, name: `T${homeId}`, abbreviation: `T${homeId}`, logo: '', score: hs, winner: hs > as ? true : null },
  away: { id: awayId, name: `T${awayId}`, abbreviation: `T${awayId}`, logo: '', score: as, winner: as > hs ? true : null },
})

describe('computeForm', () => {
  const matches = [
    mk('1', '2026-05-01T14:00Z', 10, 2, 11, 0), // T10 胜
    mk('2', '2026-05-08T14:00Z', 12, 1, 10, 1), // T10 平
    mk('3', '2026-05-15T14:00Z', 10, 0, 13, 3), // T10 负
    mk('4', '2026-05-24T14:00Z', 14, 1, 10, 2), // T10 客场胜
  ]
  it('时间序输出，最近一场在最右', () => {
    expect(computeForm(matches, 10)).toEqual(['W', 'D', 'L', 'W'])
  })
  it('最多取 5 场', () => {
    expect(computeForm([...matches, mk('0', '2026-04-20T14:00Z', 10, 5, 15, 0)], 10)).toEqual(['W', 'W', 'D', 'L', 'W'])
  })
  it('无该队比赛 → 空数组（占位短横线由组件画）', () => {
    expect(computeForm(matches, 999)).toEqual([])
  })
  it('未完赛的比赛不计入', () => {
    const pre: Match = { ...mk('9', '2026-06-01T14:00Z', 10, 0, 11, 0), status: 'pre', completed: false }
    expect(computeForm([pre], 10)).toEqual([])
  })
})

describe('lastCompletedMatchday', () => {
  it('取完赛比赛里最晚的 UTC 日期', () => {
    const ms = [
      mk('1', '2026-05-24T15:00Z', 1, 1, 2, 0),
      mk('2', '2026-05-23T15:00Z', 3, 1, 4, 0),
    ]
    expect(lastCompletedMatchday(ms)).toBe('2026-05-24')
  })
  it('没有完赛比赛 → null', () => {
    expect(lastCompletedMatchday([])).toBeNull()
  })
})

describe('selectStripMatches（战报带选场，规格 v1.4 确定性规则）', () => {
  const standings = [
    { rank: 1, teamId: 100 },
    { rank: 2, teamId: 200 },
    { rank: 3, teamId: 300 },
  ]
  const day = [
    mk('a', '2026-05-24T15:00Z', 300, 1, 400, 0), // 无关前二，早场
    mk('b', '2026-05-24T15:00Z', 100, 2, 500, 1), // 榜首参与
    mk('c', '2026-05-24T15:00Z', 600, 0, 200, 0), // 榜二参与
    mk('d', '2026-05-24T15:00Z', 700, 1, 800, 1), // 无关，晚场
    mk('e', '2026-05-24T15:00Z', 900, 3, 901, 2), // 无关
  ]
  it('榜首榜二优先，其余按开球时间补满 4 场且去重', () => {
    const picked = selectStripMatches(day, standings)
    expect(picked.map((m) => m.eventId)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('不足 4 场全取', () => {
    expect(selectStripMatches(day.slice(0, 2), standings)).toHaveLength(2)
  })
})
```

- [ ] **Step 2：写失败测试 `tests/utils/standings.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { applyForm, mergeStandings } from '../../src/utils/standings'
import type { RawStanding, RawXgStanding } from '../../src/types/static'

const raw: RawStanding[] = [
  { rank: 1, teamId: 359, team: 'Arsenal', played: 38, won: 26, drawn: 7, lost: 5, goalsFor: 71, goalsAgainst: 27, goalDiff: 44, points: 85 },
  { rank: 2, teamId: 367, team: 'Tottenham Hotspur', played: 38, won: 10, drawn: 11, lost: 17, goalsFor: 48, goalsAgainst: 57, goalDiff: -9, points: 41 },
]

const xg: RawXgStanding[] = [
  { rank: 1, teamId: '83', team: 'Arsenal', xG: 77.49, xGA: 33.13, xpts: 79.87, history: [] },
  // Understat 叫 Tottenham，映射表转成热刺的 ESPN 名
  { rank: 17, teamId: '89', team: 'Tottenham', xG: 45.1, xGA: 55.2, xpts: 38.0, history: [] },
  // 映射表里没有的队 → 对应行 xG 留空
  { rank: 99, teamId: 'x', team: 'Ghost FC', xG: 1, xGA: 1, xpts: 1 },
]

const map = { Tottenham: 'Tottenham Hotspur' }

describe('mergeStandings', () => {
  it('rank/zone/xG 三合一，映射不上的 xG 留空', () => {
    const rows = mergeStandings(raw, 'eng.1', xg, map)
    expect(rows[0].zone).toBe('ucl')
    expect(rows[0].xG).toBeCloseTo(77.49)
    expect(rows[0].xPts).toBeCloseTo(79.87)
    expect(rows[1].xG).toBeCloseTo(45.1) // 经 Tottenham → Tottenham Hotspur 对上
    expect(rows[0].form).toEqual([])     // form 由 applyForm 填
  })
  it('xG 文件缺失（null）→ 全部留空不报错', () => {
    const rows = mergeStandings(raw, 'eng.1', null, map)
    expect(rows[0].xG).toBeUndefined()
  })
  it('18 队联赛降级区按联赛配置走', () => {
    const two: RawStanding[] = Array.from({ length: 18 }, (_, i) => ({ ...raw[0], rank: i + 1, teamId: i }))
    const rows = mergeStandings(two, 'ger.1', null, {})
    expect(rows[15].zone).toBe('playoff') // 第 16
    expect(rows[16].zone).toBe('rel')
    expect(rows[17].zone).toBe('rel')
  })
})

describe('applyForm', () => {
  it('把 computeForm 结果填进每一行', () => {
    const rows = mergeStandings(raw, 'eng.1', null, {})
    const matches = [{
      eventId: '1', date: '2026-05-24T15:00Z', status: 'post' as const, completed: true, venue: 'X',
      home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: 2, winner: true },
      away: { id: 367, name: 'Tottenham Hotspur', abbreviation: 'TOT', logo: '', score: 1, winner: null },
    }]
    const out = applyForm(rows, matches)
    expect(out[0].form).toEqual(['W'])
    expect(out[1].form).toEqual(['L'])
  })
})
```

- [ ] **Step 3：跑测试确认失败**

```bash
npm test
```

预期：FAIL（找不到 matches/standings 两个模块）

- [ ] **Step 4：实现 `src/utils/matches.ts`**

```ts
import type { FormResult, Match } from '../types/models'

/** 某队近 limit 场形势：时间序，最近一场在最右（规格 FormDots） */
export function computeForm(matches: Match[], teamId: number, limit = 5): FormResult[] {
  const involved = matches.filter((m) => m.completed && (m.home.id === teamId || m.away.id === teamId))
  involved.sort((a, b) => b.date.localeCompare(a.date))
  const latest = involved.slice(0, limit).map((m): FormResult => {
    const isHome = m.home.id === teamId
    const gf = (isHome ? m.home.score : m.away.score) ?? 0
    const ga = (isHome ? m.away.score : m.home.score) ?? 0
    return gf > ga ? 'W' : gf < ga ? 'L' : 'D'
  })
  return latest.reverse()
}

/** 最近一个有完赛的比赛日（UTC 日期）；没有则 null（战报带回扫用） */
export function lastCompletedMatchday(matches: Match[]): string | null {
  let best: string | null = null
  for (const m of matches) {
    if (!m.completed) continue
    const d = m.date.slice(0, 10)
    if (!best || d > best) best = d
  }
  return best
}

/** 战报带选场：① 榜首参与 ② 榜二参与 ③ 剩余按开球时间从早到晚补满 4 场（规格 v1.4） */
export function selectStripMatches(dayMatches: Match[], ranked: { rank: number; teamId: number }[]): Match[] {
  const top1 = ranked.find((r) => r.rank === 1)?.teamId
  const top2 = ranked.find((r) => r.rank === 2)?.teamId
  const involves = (m: Match, id: number | undefined) => id !== undefined && (m.home.id === id || m.away.id === id)
  const picked: Match[] = []
  const take = (m: Match | undefined) => {
    if (m && !picked.includes(m)) picked.push(m)
  }
  take(dayMatches.find((m) => involves(m, top1)))
  take(dayMatches.find((m) => involves(m, top2)))
  const rest = [...dayMatches].filter((m) => !picked.includes(m)).sort((a, b) => a.date.localeCompare(b.date))
  for (const m of rest) {
    if (picked.length >= 4) break
    picked.push(m)
  }
  return picked.slice(0, 4)
}
```

- [ ] **Step 5：实现 `src/utils/standings.ts`**

```ts
import type { Match, StandingRow, XgRow } from '../types/models'
import type { RawStanding, RawXgStanding } from '../types/static'
import { zoneOf, type LeagueSlug } from './constants'
import { computeForm } from './matches'

/**
 * 正榜 + zone + xG 三合一。
 * xG 行经 Understat→ESPN 队名映射对行；对不上的留空（规格规则 7：只取 team/xG/xGA/xpts，history 不碰）
 */
export function mergeStandings(
  raw: RawStanding[],
  league: LeagueSlug,
  xg: RawXgStanding[] | null,
  teamNameMap: Record<string, string>,
): StandingRow[] {
  const xgByEpsnName = new Map<string, XgRow>()
  if (xg) {
    for (const r of xg) {
      xgByEpsnName.set(teamNameMap[r.team] ?? r.team, { team: r.team, xG: r.xG, xGA: r.xGA, xpts: r.xpts })
    }
  }
  return raw.map((s) => {
    const x = xgByEpsnName.get(s.team)
    return {
      ...s,
      zone: zoneOf(s.rank, raw.length, league),
      form: [],
      xG: x?.xG,
      xGA: x?.xGA,
      xPts: x?.xpts,
    }
  })
}

/** 把近 5 场形势填进每一行（赛程数据另取，不混进合并函数） */
export function applyForm(rows: StandingRow[], matches: Match[]): StandingRow[] {
  return rows.map((r) => ({ ...r, form: computeForm(matches, r.teamId) }))
}
```

- [ ] **Step 6：跑测试确认全绿**

```bash
npm test
```

预期：PASS（五个纯函数测试全部就位：constants / format / matches / standings / i18n）

- [ ] **Step 7：提交**

```bash
git add tests/utils/matches.test.ts src/utils/matches.ts tests/utils/standings.test.ts src/utils/standings.ts
git commit -m "feat(phase-2): 形势计算/选场规则/积分榜合并纯函数（TDD）"
```

---

## Task 6：useJsonFetch——静态数据唯一入口

**Files:**
- Create: `src/composables/useJsonFetch.ts`

测试策略说明：composable/store 层不在五个纯函数 TDD 清单内（规格 §九），靠 `vue-tsc` + 人工验收把关；本 Task 起不再写单元测试。

- [ ] **Step 1：实现 `src/composables/useJsonFetch.ts`**

```ts
import { CACHE_PREFIX } from '../utils/constants'

interface CacheEntry<T> {
  data: T
  ts: number
}

/**
 * 静态 JSON 唯一入口（铁律：BASE_URL 前缀，禁绝对路径）。
 * 缓存键带赛季号——八月赛季更替时旧缓存自动作废（规格 v1.6）。
 * 缓存读写、解析全部容错：损坏按未命中，隐私模式降级内存直取（规格风险表）。
 */
export async function fetchJsonCached<T>(path: string, ttlMs: number, season = 'na'): Promise<T> {
  const key = `${CACHE_PREFIX}:${season}:${path}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry<T>
      if (typeof entry.ts === 'number' && Date.now() - entry.ts < ttlMs) return entry.data
    }
  } catch {
    // 缓存损坏或 localStorage 不可用 → 当未命中
  }
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  const data = (await res.json()) as T
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() } satisfies CacheEntry<T>))
  } catch {
    // 隐私模式/配额满 → 本次降级为直取，功能不受影响
  }
  return data
}
```

- [ ] **Step 2：类型检查**

```bash
npx vue-tsc --noEmit
```

预期：无错误

- [ ] **Step 3：提交**

```bash
git add src/composables/useJsonFetch.ts
git commit -m "feat(phase-2): useJsonFetch——BASE_URL + TTL 缓存 + 赛季号入键"
```

---

## Task 7：useEspanFetch——直播通道 + 归一化（唯一接触 ESPN 原始结构处）

**Files:**
- Create: `tests/utils/espn.test.ts`
- Create: `src/composables/useEspanFetch.ts`

- [ ] **Step 1：写失败测试 `tests/utils/espn.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { monthDateRange, normalizeEvent } from '../../src/composables/useEspanFetch'
import type { EspnEvent } from '../../src/types/espn-site'

describe('monthDateRange', () => {
  it('平月：2026-01 → 20260101-20260131', () => {
    expect(monthDateRange('2026-01')).toBe('20260101-20260131')
  })
  it('闰月：2028-02 → 20280201-20280229', () => {
    expect(monthDateRange('2028-02')).toBe('20280201-20280229')
  })
})

const rawEvent: EspnEvent = {
  id: '740596',
  date: '2025-08-15T19:00Z',
  status: { displayClock: "90'+7'", type: { id: '28', state: 'post', completed: true } },
  competitions: [{
    venue: { fullName: 'Anfield' },
    competitors: [
      { homeAway: 'home', id: '364', score: '4', winner: true, team: { id: '364', displayName: 'Liverpool', abbreviation: 'LIV', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png' } },
      { homeAway: 'away', id: '349', score: '2', winner: false, team: { id: '349', displayName: 'AFC Bournemouth', abbreviation: 'BOU', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/349.png' } },
    ],
  }],
}

describe('normalizeEvent', () => {
  it('主客/比分/状态收敛为 Match 模型，与静态文件口径一致', () => {
    const m = normalizeEvent(rawEvent)
    expect(m).not.toBeNull()
    expect(m!.home.name).toBe('Liverpool')
    expect(m!.home.score).toBe(4)
    expect(m!.away.score).toBe(2)
    expect(m!.status).toBe('post')
    expect(m!.completed).toBe(true)
    expect(m!.venue).toBe('Anfield')
  })
  it('未开赛：score 为 null，状态 pre', () => {
    const pre = JSON.parse(JSON.stringify(rawEvent)) as EspnEvent
    pre.status = { type: { id: '1', state: 'pre' } }
    delete pre.competitions[0].competitors[0].score
    const m = normalizeEvent(pre)
    expect(m!.status).toBe('pre')
    expect(m!.home.score).toBeNull()
  })
  it('残缺事件（无 competitors）→ null，不炸', () => {
    expect(normalizeEvent({ ...rawEvent, competitions: [] })).toBeNull()
  })
})
```

- [ ] **Step 2：跑测试确认失败**

```bash
npm test
```

预期：FAIL（找不到 useEspanFetch）

- [ ] **Step 3：实现 `src/composables/useEspanFetch.ts`**

```ts
import type { EspnCompetitor, EspnEvent, EspnScoreboard } from '../types/espn-site'
import type { Match, MatchTeam } from '../types/models'
import type { LeagueSlug } from '../utils/constants'

const SITE_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer'

/** 'YYYY-MM' → ESPN dates 参数 YYYYMM01-YYYYMMDD（月末按 UTC 日历推） */
export function monthDateRange(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate() // 下月 0 号 = 本月最后一天
  const mm = String(m).padStart(2, '0')
  return `${y}${mm}01-${y}${mm}${String(last).padStart(2, '0')}`
}

/** ESPN 事件 → Match 模型。页面层永不接触 ESPN 原始结构，接口变脸只改这个文件（规格 §五） */
export function normalizeEvent(e: EspnEvent): Match | null {
  const comp = e.competitions?.[0]
  if (!comp) return null
  const homeC = comp.competitors.find((c) => c.homeAway === 'home')
  const awayC = comp.competitors.find((c) => c.homeAway === 'away')
  if (!homeC || !awayC) return null
  const toTeam = (c: EspnCompetitor): MatchTeam => ({
    id: Number(c.team.id),
    name: c.team.displayName,
    abbreviation: c.team.abbreviation ?? '',
    logo: c.team.logo ?? '',
    score: c.score != null ? Number(c.score) : null,
    winner: c.winner ?? null,
  })
  const state = e.status?.type?.state ?? 'pre'
  return {
    eventId: e.id,
    date: e.date,
    status: state,
    completed: state === 'post',
    clock: e.status?.displayClock,
    venue: comp.venue?.fullName ?? '',
    home: toTeam(homeC),
    away: toTeam(awayC),
  }
}

/** 当月直播比分（limit=200 防分页截断，蓝图 §6.3 / 规格 v1.5） */
export async function fetchLiveScores(league: LeagueSlug, month: string): Promise<Match[]> {
  const res = await fetch(`${SITE_API}/${league}/scoreboard?dates=${monthDateRange(month)}&limit=200`)
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  const sb = (await res.json()) as EspnScoreboard
  return (sb.events ?? [])
    .map(normalizeEvent)
    .filter((m): m is Match => m !== null)
}
```

- [ ] **Step 4：跑测试确认全绿**

```bash
npm test
```

预期：PASS

- [ ] **Step 5：提交**

```bash
git add tests/utils/espn.test.ts src/composables/useEspanFetch.ts
git commit -m "feat(phase-2): useEspanFetch——直播通道 + pre/in/post 归一化（TDD）"
```

---

## Task 8：app / teams 状态仓库 + useLeague / useTimezone

**Files:**
- Create: `src/stores/app.ts`
- Create: `src/stores/teams.ts`
- Create: `src/composables/useLeague.ts`
- Create: `src/composables/useTimezone.ts`

- [ ] **Step 1：实现 `src/stores/app.ts`**

```ts
import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import type { LeagueInfo } from '../types/models'
import type { LeaguesFile } from '../types/static'
import { FOCUS_LEAGUE, type LeagueSlug } from '../utils/constants'
import type { Lang } from '../utils/i18n'

const LANG_KEY = 'matchlab:lang'

function savedLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    currentLeague: FOCUS_LEAGUE as LeagueSlug,
    lang: savedLang(),
    leagues: [] as LeagueInfo[],
    leaguesUpdateTime: '',
  }),
  getters: {
    leagueInfo: (s) => (slug: LeagueSlug): LeagueInfo | undefined => s.leagues.find((l) => l.slug === slug),
  },
  actions: {
    async loadLeagues() {
      if (this.leagues.length) return
      const f = await fetchJsonCached<LeaguesFile>('data/leagues.json', 60 * 60 * 1000, 'boot')
      this.leagues = f.leagues
      this.leaguesUpdateTime = f.updateTime
    },
    setLeague(l: LeagueSlug) {
      this.currentLeague = l
    },
    toggleLang() {
      this.lang = this.lang === 'zh' ? 'en' : 'zh'
      try {
        localStorage.setItem(LANG_KEY, this.lang)
      } catch {
        // 隐私模式：语言仅存会话内
      }
    },
  },
})
```

- [ ] **Step 2：实现 `src/stores/teams.ts`**

```ts
import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import type { Team } from '../types/models'
import type { MetaFile, TeamsFile } from '../types/static'
import type { LeagueSlug } from '../utils/constants'

const TTL = 24 * 60 * 60 * 1000 // Actions 每日刷新，24h 缓存足够

export interface LeagueBundle {
  meta: MetaFile
  teams: Team[]
  byId: Map<number, Team>
}

export const useTeamsStore = defineStore('teams', {
  state: () => ({
    bundles: {} as Partial<Record<LeagueSlug, LeagueBundle>>,
  }),
  actions: {
    async ensure(league: LeagueSlug): Promise<LeagueBundle> {
      const hit = this.bundles[league]
      if (hit) return hit
      const [metaF, teamsF] = await Promise.all([
        fetchJsonCached<MetaFile>(`data/${league}/meta.json`, TTL),
        fetchJsonCached<TeamsFile>(`data/${league}/teams.json`, TTL),
      ])
      const teams: Team[] = teamsF.teams.map((t) => ({
        id: t.id,
        name: t.displayName,
        shortDisplayName: t.shortDisplayName,
        abbreviation: t.abbreviation,
        color: t.color,
        alternateColor: t.alternateColor,
        logo: t.logo,
        logoDark: t.logoDark,
      }))
      const bundle: LeagueBundle = { meta: metaF, teams, byId: new Map(teams.map((t) => [t.id, t])) }
      this.bundles[league] = bundle
      return bundle
    },
    teamById(league: LeagueSlug, id: number): Team | undefined {
      return this.bundles[league]?.byId.get(id)
    },
  },
})
```

- [ ] **Step 3：实现 `src/composables/useLeague.ts`（幂等 + 在途去重，规格 v1.3/v1.4 契约）**

```ts
import { useAppStore } from '../stores/app'
import { useTeamsStore } from '../stores/teams'
import { isLeagueSlug, type LeagueSlug } from '../utils/constants'

const inFlight = new Map<LeagueSlug, Promise<void>>()

/**
 * 加载顺序契约核心：幂等 + 同一联赛并发调用复用在途请求。
 * App.vue 与各页面视图 setup 里都先 await 它（深链安全，规格 §五）。
 */
export async function ensureLeague(slug: string): Promise<LeagueSlug> {
  if (!isLeagueSlug(slug)) throw new Error(`invalid league slug: ${slug}`)
  useAppStore().setLeague(slug)
  let p = inFlight.get(slug)
  if (!p) {
    p = useTeamsStore()
      .ensure(slug)
      .then(() => undefined)
      .finally(() => inFlight.delete(slug))
    inFlight.set(slug, p)
  }
  await p
  return slug
}
```

- [ ] **Step 4：实现 `src/composables/useTimezone.ts`**

```ts
import { useAppStore } from '../stores/app'
import { formatKickoff, formatUtcDateLabel, formatUpdateTime } from '../utils/format'

/** 时区格式化统一出口，语言跟随 appStore.lang */
export function useTimezone() {
  const app = useAppStore()
  return {
    /** 开球时间（本地时区，跨天自动加"次日"/(+1d)） */
    kickoff: (iso: string) => formatKickoff(iso, app.lang),
    /** 日期组头标签（UTC 日期，全球一致） */
    dayLabel: (utcDate: string) => formatUtcDateLabel(utcDate, app.lang),
    /** 数据更新时间（本地 YYYY-MM-DD HH:mm，不裸出 ISO） */
    updated: (iso: string) => formatUpdateTime(iso),
  }
}
```

- [ ] **Step 5：类型检查**

```bash
npx vue-tsc --noEmit
```

预期：无错误

- [ ] **Step 6：提交**

```bash
git add src/stores/app.ts src/stores/teams.ts src/composables/useLeague.ts src/composables/useTimezone.ts
git commit -m "feat(phase-2): app/teams 仓库 + useLeague 幂等契约 + useTimezone"
```

---

## Task 9：standings 仓库（正榜 + 形势 + xG 懒加载）

**Files:**
- Create: `tests/stores/standings.test.ts`
- Create: `src/stores/standings.ts`

- [ ] **Step 1：写失败测试 `tests/stores/standings.test.ts`（仅测纯函数 formMonths）**

```ts
import { describe, expect, it } from 'vitest'
import { formMonths } from '../../src/stores/standings'

describe('formMonths（形势列回看窗口，规格规则 5）', () => {
  it('休赛期（7 月）→ 赛季最后两个月 4/5 月', () => {
    expect(formMonths('2025', new Date('2026-07-27T00:00:00Z'))).toEqual(['2026-04', '2026-05'])
  })
  it('赛季中（1 月）→ 12/1 月', () => {
    expect(formMonths('2025', new Date('2026-01-15T00:00:00Z'))).toEqual(['2025-12', '2026-01'])
  })
  it('赛季初（8 月）只有一个月 → 单月窗口', () => {
    expect(formMonths('2025', new Date('2025-08-20T00:00:00Z'))).toEqual(['2025-08'])
  })
})
```

- [ ] **Step 2：跑测试确认失败**

```bash
npm test
```

预期：FAIL（找不到 formMonths）

- [ ] **Step 3：实现 `src/stores/standings.ts`**

```ts
import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import type { Match, StandingRow } from '../types/models'
import type { MatchesFile, RawStanding, StandingsFile, TeamNameMapFile, XgFile } from '../types/static'
import { applyForm, mergeStandings } from '../utils/standings'
import { currentMonth, seasonMonths, type LeagueSlug } from '../utils/constants'

const STANDINGS_TTL = 60 * 60 * 1000
const XG_TTL = 24 * 60 * 60 * 1000

/** 形势列回看窗口：当前月之前（含当月）的最后两个月份文件；赛季初不足两个用实际数量 */
export function formMonths(season: string, now: Date = new Date()): string[] {
  const months = seasonMonths(season)
  const cur = currentMonth(now)
  const past = months.filter((m) => m <= cur)
  const list = past.length ? past : months
  return list.slice(-2)
}

export const useStandingsStore = defineStore('standings', {
  state: () => ({
    rows: {} as Partial<Record<LeagueSlug, StandingRow[]>>,
    updateTime: {} as Partial<Record<LeagueSlug, string>>,
    xgOn: {} as Partial<Record<LeagueSlug, boolean>>, // 只存会话内，刷新归关（规格 v1.3）
    loading: {} as Partial<Record<LeagueSlug, boolean>>,
    xgError: {} as Partial<Record<LeagueSlug, boolean>>,
    // 中间料，供 xG 开关切换时重合并，不重复拉正榜
    raw: {} as Partial<Record<LeagueSlug, RawStanding[]>>,
    formMatches: {} as Partial<Record<LeagueSlug, Match[]>>,
    teamNameMap: {} as Record<string, string>,
  }),
  actions: {
    async ensureMap() {
      if (Object.keys(this.teamNameMap).length) return
      const f = await fetchJsonCached<TeamNameMapFile>('data/mappings/team-name-map.json', XG_TTL)
      this.teamNameMap = f.map
    },
    rebuild(league: LeagueSlug, xg: XgFile | null) {
      const raw = this.raw[league]
      if (!raw) return
      const merged = mergeStandings(raw, league, xg?.standings ?? null, this.teamNameMap)
      this.rows[league] = applyForm(merged, this.formMatches[league] ?? [])
    },
    async load(league: LeagueSlug, season: string) {
      this.loading[league] = true
      try {
        const sf = await fetchJsonCached<StandingsFile>(`data/${league}/standings.json`, STANDINGS_TTL, season)
        const months = formMonths(season)
        // 两个月份文件并行拉，单个失败容错（该窗口缺一月仍算得出形势）
        const files = await Promise.all(
          months.map((m) =>
            fetchJsonCached<MatchesFile>(`data/${league}/matches/${m}.json`, STANDINGS_TTL, season).catch(() => null),
          ),
        )
        this.raw[league] = sf.standings
        this.formMatches[league] = files.flatMap((f) => f?.matches ?? [])
        this.updateTime[league] = sf.updateTime
        this.rebuild(league, null)
        if (this.xgOn[league]) {
          // 刷新后保持开关状态；xG 失败则开关自动关（规格 §七）
          try {
            await this.loadXg(league, season)
          } catch {
            this.xgOn[league] = false
            this.xgError[league] = true
          }
        }
      } finally {
        this.loading[league] = false
      }
    },
    async loadXg(league: LeagueSlug, season: string) {
      await this.ensureMap()
      const xf = await fetchJsonCached<XgFile>(`data/${league}/xg/standings.json`, XG_TTL, season)
      this.rebuild(league, xf)
      this.xgError[league] = false
    },
    /** 开关 xG。失败时抛给视图层提示，开关保持关（规格验收 3） */
    async toggleXg(league: LeagueSlug, season: string) {
      if (this.xgOn[league]) {
        this.xgOn[league] = false
        this.rebuild(league, null)
        return
      }
      try {
        await this.loadXg(league, season)
        this.xgOn[league] = true
      } catch (e) {
        this.xgOn[league] = false
        this.xgError[league] = true
        throw e
      }
    },
  },
})
```

- [ ] **Step 4：跑测试 + 类型检查**

```bash
npm test && npx vue-tsc --noEmit
```

预期：均通过

- [ ] **Step 5：提交**

```bash
git add tests/stores/standings.test.ts src/stores/standings.ts
git commit -m "feat(phase-2): standings 仓库——正榜/形势/xG 懒加载与降级"
```

---

## Task 10：matches 仓库（月份缓存 + 直播态 + 有条件轮询 + 快照兜底）

**Files:**
- Create: `src/stores/matches.ts`

- [ ] **Step 1：实现 `src/stores/matches.ts`**

```ts
import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import { fetchLiveScores } from '../composables/useEspanFetch'
import type { Match } from '../types/models'
import type { MatchesFile } from '../types/static'
import { currentMonth, type LeagueSlug } from '../utils/constants'

const STATIC_TTL = 60 * 60 * 1000
const POLL_MS = 60 * 1000 // 有进行中比赛时每 60s 刷新（规格规则 1）

export const useMatchesStore = defineStore('matches', {
  state: () => ({
    months: {} as Record<string, Match[]>, // key: `${league}/${month}`
    live: false,       // 当前月份数据来自直播通道
    fallback: false,   // 直播断线已退回快照（挂提示用）
    empty: false,      // 当月/该月无联赛比赛（空场/休赛期状态用）
    timer: null as ReturnType<typeof setInterval> | null,
  }),
  actions: {
    key(league: LeagueSlug, month: string) {
      return `${league}/${month}`
    },
    hasInProgress(league: LeagueSlug, month: string): boolean {
      return (this.months[this.key(league, month)] ?? []).some((m) => m.status === 'in')
    },
    /**
     * 加载某月赛程。活/死分界 = 自然月（规格规则 1）：
     * 当月 → ESPN 直连（内存态，不落缓存）；断线 → 同月静态快照；快照也缺 → 空场态（规格规则 4）
     */
    async loadMonth(league: LeagueSlug, month: string, season: string) {
      this.stopPolling()
      this.live = false
      this.fallback = false
      this.empty = false
      const k = this.key(league, month)
      if (month === currentMonth()) {
        try {
          this.months[k] = await fetchLiveScores(league, month)
          this.live = true
          this.empty = this.months[k].length === 0
          if (this.hasInProgress(league, month)) this.startPolling(league, month)
          return
        } catch {
          this.fallback = true // 直连失败 → 掉到下面的静态快照
        }
      }
      try {
        const f = await fetchJsonCached<MatchesFile>(`data/${league}/matches/${month}.json`, STATIC_TTL, season)
        this.months[k] = f.matches
        this.empty = f.matches.length === 0
      } catch {
        this.months[k] = []
        this.empty = true // 文件不存在（如休赛期当月）→ 空场提示 + 引导跳月
      }
    },
    /** 手动刷新：直播态才生效（MonthStrip 的刷新按钮用） */
    async refresh(league: LeagueSlug, month: string) {
      if (!this.live) return
      try {
        this.months[this.key(league, month)] = await fetchLiveScores(league, month)
      } catch {
        // 本次失败保留上一份直播数据
      }
    },
    startPolling(league: LeagueSlug, month: string) {
      this.stopPolling()
      const tick = async () => {
        try {
          this.months[this.key(league, month)] = await fetchLiveScores(league, month)
        } catch {
          // 本 tick 静默失败，下个 tick 再试
        }
        // 数据刷新后重新评估续停（规格 v1.3）
        if (!this.hasInProgress(league, month)) this.stopPolling()
      }
      this.timer = setInterval(tick, POLL_MS)
    },
    stopPolling() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
  },
})
```

- [ ] **Step 2：类型检查**

```bash
npx vue-tsc --noEmit
```

预期：无错误

- [ ] **Step 3：提交**

```bash
git add src/stores/matches.ts
git commit -m "feat(phase-2): matches 仓库——当月直播 + 60s 有条件轮询 + 快照兜底"
```

---

## Task 11：视觉底子——index.html + style.css（主题变量 / 背景三层 / 字体 / 无障碍基线）

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`

- [ ] **Step 1：改 `index.html`（Google Fonts + lang + 门面 meta）**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="MatchLab——英超/西甲/意甲/德甲/法甲五大联赛积分榜、赛程与数据查询" />
    <title>MatchLab · 五大联赛数据查询</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Oswald:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

（`display=swap` 已含在 URL 里，字体不阻塞渲染——规格 §六性能预算。）

- [ ] **Step 2：重写 `src/style.css`**

```css
@import "tailwindcss";

:root {
  /* 联赛主题色：App.vue 切联赛时写入（默认英超紫） */
  --league-color: #3D195B;
  --base: #0c101b;
}

html {
  color-scheme: dark;
}

body {
  background-color: var(--base);
  color: #e8ecf5;
  font-family: 'IBM Plex Sans', 'Microsoft YaHei', 'PingFang SC', system-ui, sans-serif;
}

/* 字体两副面孔：记分牌数字体 + 压缩标题体（中文走系统粗体兜底，规格 §六） */
.font-score { font-family: 'Bebas Neue', 'Oswald', 'Microsoft YaHei', sans-serif; }
.font-cond { font-family: 'Oswald', 'Microsoft YaHei', 'PingFang SC', sans-serif; }
.font-mono-d { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
.tabular { font-variant-numeric: tabular-nums; }

/* 背景三层之二：极淡球场标线纹理（中圈 + 中线） */
.pitch-texture {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cpath d='M130 0v260M0 130h260' stroke='%23ffffff' stroke-width='1'/%3E%3Ccircle cx='130' cy='130' r='82' fill='none' stroke='%23ffffff'/%3E%3Ccircle cx='130' cy='130' r='4' fill='%23ffffff'/%3E%3C/svg%3E");
}

/* 背景三层之三：顶部联赛光晕。用 background-color + 静态 mask，
   切联赛时颜色能真正 transition 平滑过渡（gradient 本身不可过渡） */
.league-glow {
  position: fixed;
  top: -25vh;
  left: 50%;
  translate: -50% 0;
  width: 140vw;
  height: 60vh;
  z-index: 0;
  pointer-events: none;
  background-color: var(--league-color);
  opacity: 0.22;
  filter: blur(70px);
  mask-image: radial-gradient(closest-side, black, transparent);
  transition: background-color 0.8s ease;
}

/* 无障碍基线：焦点环走联赛色（规格 §七） */
:focus-visible {
  outline: 2px solid var(--league-color);
  outline-offset: 2px;
}

/* LIVE 心跳点 */
@keyframes live-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, #ef4444 55%, transparent); }
  60% { box-shadow: 0 0 0 6px transparent; }
}
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: #ef4444;
  animation: live-pulse 1.6s infinite;
}

/* 管线心跳灯（页脚，绿色慢脉冲） */
@keyframes pipe-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, #4ade80 50%, transparent); }
  60% { box-shadow: 0 0 0 5px transparent; }
}
.pipe-dot {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: #4ade80;
  animation: pipe-pulse 2.2s infinite;
}

/* 比分刷新弹跳（直播进球时给 score 元素加 .score-pop） */
@keyframes score-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); color: #c4b5fd; }
  100% { transform: scale(1); }
}
.score-pop { animation: score-pop 0.6s ease; }

/* 卡片滚动错落浮现（赛程卡用 .reveal + 少量 JS 观察器，见 MatchList） */
@keyframes rise-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.rise-in { animation: rise-in 0.45s ease both; }

/* 尊重系统"减少动态效果"（规格 §六） */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3：`npm run dev` 目检**

```bash
npm run dev
```

打开 http://localhost:5173/MatchLab/（本地 base 路径）：占位首页应能打开、深底、光晕与纹理可见（光晕颜色此刻还是默认英超紫）。

- [ ] **Step 4：提交**

```bash
git add index.html src/style.css
git commit -m "feat(phase-2): 视觉底子——字体/主题变量/背景三层/焦点环/动效基线"
```

---

## Task 12：布局三件套 + App.vue 壳 + 完整路由

**Files:**
- Create: `src/components/layout/LeagueTabs.vue`
- Create: `src/components/layout/AppHeader.vue`
- Create: `src/components/layout/AppFooter.vue`
- Modify: `src/App.vue`
- Modify: `src/router/index.ts`

- [ ] **Step 1：`src/components/layout/LeagueTabs.vue`**

导航行为：切联赛留在当前页面类型；首页点页签 → 进该联赛积分榜（规格 v1.7）。选中态用品牌色下划线（不铺底色，规避法甲近白色底的对比度坑）。

```vue
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { LEAGUE_SLUGS, type LeagueSlug } from '../../utils/constants'

const app = useAppStore()
const route = useRoute()
const router = useRouter()

function label(slug: LeagueSlug): string {
  const info = app.leagueInfo(slug)
  if (!info) return slug
  return app.lang === 'zh' ? info.nameZh : info.name
}

function pick(slug: LeagueSlug) {
  const seg = String(route.path).split('/')[2] // /eng.1/standings → standings
  if (seg === 'standings' || seg === 'schedule') router.push(`/${slug}/${seg}`)
  else router.push(`/${slug}/standings`)
}
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto" :aria-label="app.lang === 'zh' ? '联赛切换' : 'League switch'">
    <button
      v-for="slug in LEAGUE_SLUGS"
      :key="slug"
      type="button"
      @click="pick(slug)"
      class="font-cond text-xs tracking-wider px-3 py-1.5 whitespace-nowrap rounded transition-colors"
      :class="
        slug === app.currentLeague
          ? 'text-white bg-white/10 shadow-[inset_0_-2px_0_var(--league-color)]'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      "
    >
      {{ label(slug) }}
    </button>
  </nav>
</template>
```

- [ ] **Step 2：`src/components/layout/AppHeader.vue`**

```vue
<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import LeagueTabs from './LeagueTabs.vue'

const app = useAppStore()
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#0c101b]/80 backdrop-blur border-b border-white/10">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
      <router-link
        to="/"
        class="font-score text-2xl tracking-[0.14em] text-white flex items-center gap-2 shrink-0"
      >
        <span
          class="w-2.5 h-2.5 rounded-full transition-colors duration-700"
          style="background: var(--league-color); box-shadow: 0 0 12px var(--league-color)"
        ></span>
        MATCHLAB
      </router-link>
      <LeagueTabs class="ml-auto" />
      <button
        type="button"
        @click="app.toggleLang()"
        class="shrink-0 text-[11px] font-mono-d border border-white/15 rounded-full px-2.5 py-1 text-slate-300 hover:text-white transition-colors"
      >
        {{ app.lang === 'zh' ? '中 / EN' : 'EN / 中' }}
      </button>
    </div>
  </header>
</template>
```

- [ ] **Step 3：`src/components/layout/AppFooter.vue`**

```vue
<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { useTimezone } from '../../composables/useTimezone'
import { t } from '../../utils/i18n'

const app = useAppStore()
const tz = useTimezone()
</script>

<template>
  <footer class="relative z-10 border-t border-white/10 mt-12">
    <div class="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono-d text-slate-500">
      <span class="pipe-dot" aria-hidden="true"></span>
      <span>{{ t('footer.pipeline', app.lang) }}</span>
      <span aria-hidden="true">·</span>
      <span>{{ t('footer.snapshot', app.lang) }} {{ app.leaguesUpdateTime ? tz.updated(app.leaguesUpdateTime) : '—' }}</span>
      <span aria-hidden="true">·</span>
      <span>{{ t('footer.source', app.lang) }} ESPN / Understat</span>
      <span class="ml-auto">MATCHLAB · {{ t('footer.tagline', app.lang) }}</span>
    </div>
  </footer>
</template>
```

- [ ] **Step 4：重写 `src/App.vue`（壳 + 联赛光晕主题）**

```vue
<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import AppFooter from './components/layout/AppFooter.vue'
import AppHeader from './components/layout/AppHeader.vue'
import { useAppStore } from './stores/app'
import { isLeagueSlug } from './utils/constants'

const app = useAppStore()
const route = useRoute()

// 启动即拉联赛列表（1.4KB，首页板块与页脚都靠它）
app.loadLeagues().catch(() => {
  /* 失败不阻塞壳渲染，首页会各自挂错误态 */
})

// 联赛光晕：路由 league 优先，否则用当前焦点联赛；颜色写根节点 CSS 变量
watchEffect(() => {
  const param = route.params.league
  const slug = typeof param === 'string' && isLeagueSlug(param) ? param : app.currentLeague
  const color = app.leagueInfo(slug)?.color ?? '#3D195B'
  document.documentElement.style.setProperty('--league-color', color)
})
</script>

<template>
  <div class="relative min-h-screen flex flex-col">
    <div class="pitch-texture" aria-hidden="true"></div>
    <div class="league-glow" aria-hidden="true"></div>
    <AppHeader />
    <main class="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4">
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>
```

- [ ] **Step 5：重写 `src/router/index.ts`（完整路由表 + 联赛守卫）**

```ts
import { createRouter, createWebHashHistory } from 'vue-router'
import { isLeagueSlug } from '../utils/constants'

// GitHub Pages 无服务端回退，统一 hash mode（图纸 §7 决策）
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    // 裸 /:league → 该联赛积分榜（规格 v1.2）
    { path: '/:league', redirect: (to) => `/${to.params.league}/standings` },
    { path: '/:league/standings', name: 'standings', component: () => import('../views/StandingsView.vue') },
    { path: '/:league/schedule', name: 'schedule', component: () => import('../views/ScheduleView.vue') },
    { path: '/:league/schedule/:month', name: 'schedule-month', component: () => import('../views/ScheduleView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 联赛参数非法 → 打回首页（规格规则 6）。月份格式校验在 ScheduleView 内做（回落默认月份）
router.beforeEach((to) => {
  const league = to.params.league
  if (typeof league === 'string' && !isLeagueSlug(league)) return '/'
  return true
})

export default router
```

- [ ] **Step 6：临时占位视图（路由 import 需要，后续 Task 会重写）**

创建 `src/views/StandingsView.vue`：

```vue
<template>
  <p class="py-10 text-slate-500 text-sm">StandingsView 占位（Task 14 重写）</p>
</template>
```

创建 `src/views/ScheduleView.vue`：

```vue
<template>
  <p class="py-10 text-slate-500 text-sm">ScheduleView 占位（Task 15 重写）</p>
</template>
```

- [ ] **Step 7：类型检查 + 起开发服务器冒烟**

```bash
npx vue-tsc --noEmit && npm run dev
```

手动验证：
- 打开 http://localhost:5173/MatchLab/ —— HomeView 占位页渲染，顶栏 MATCHLAB + 五联赛页签 + 中/EN 按钮可见
- 地址栏手打 `/#/xxx.9/standings` → 被打回首页
- 手打 `/#/eng.1` → 重定向到 `/#/eng.1/standings` 显示占位文字

- [ ] **Step 8：类型检查 + 冒烟 + 提交**

```bash
npx vue-tsc --noEmit && npm run dev
```

确认 Step 6 三条手动验证全部通过后提交：

```bash
git add src/components/layout/ src/App.vue src/router/index.ts src/views/StandingsView.vue src/views/ScheduleView.vue
git commit -m "feat(phase-2): 布局三件套 + App 壳（联赛光晕主题）+ 完整路由与守卫"
```

---

## Task 13：公共件——TeamLogo / DataLoading / DataError

**Files:**
- Create: `src/components/common/TeamLogo.vue`
- Create: `src/components/common/DataLoading.vue`
- Create: `src/components/common/DataError.vue`

- [ ] **Step 1：`src/components/common/TeamLogo.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Team } from '../../types/models'

const props = withDefaults(defineProps<{ team?: Team; size?: number }>(), { size: 20 })

const failed = ref(false)
// 深底优先深色版队徽（规格 v1.5）；logoDark 缺失退回普通版
const src = computed(() => {
  if (!props.team || failed.value) return ''
  return props.team.logoDark || props.team.logo
})
</script>

<template>
  <img
    v-if="team && src"
    :src="src"
    :alt="team.name"
    loading="lazy"
    :width="size"
    :height="size"
    class="rounded-full object-contain shrink-0"
    @error="failed = true"
  />
  <!-- 加载失败 → 主色圆牌 + 首字母（规格 §七） -->
  <span
    v-else-if="team"
    class="inline-flex items-center justify-center rounded-full font-cond text-white shrink-0"
    :style="{ width: `${size}px`, height: `${size}px`, background: team.color, fontSize: `${Math.round(size * 0.55)}px` }"
    :aria-label="team.name"
  >{{ team.name.charAt(0) }}</span>
</template>
```

- [ ] **Step 2：`src/components/common/DataLoading.vue`**

```vue
<script setup lang="ts">
defineProps<{ kind: 'table' | 'cards' }>()
</script>

<template>
  <!-- 骨架屏：绝不白屏（规格 §七） -->
  <div v-if="kind === 'table'" role="status" class="animate-pulse space-y-2 py-4">
    <div v-for="i in 12" :key="i" class="h-9 rounded bg-white/5"></div>
    <span class="sr-only">Loading</span>
  </div>
  <div v-else role="status" class="animate-pulse space-y-3 py-4">
    <div v-for="i in 4" :key="i" class="h-20 rounded-lg bg-white/5"></div>
    <span class="sr-only">Loading</span>
  </div>
</template>
```

- [ ] **Step 3：`src/components/common/DataError.vue`**

```vue
<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'

defineProps<{ message?: string }>()
defineEmits<{ retry: [] }>()
const app = useAppStore()
</script>

<template>
  <div role="alert" class="my-8 rounded-lg border border-red-500/30 bg-red-500/5 px-5 py-6 text-center">
    <p class="text-sm text-slate-200">
      {{ t('state.error', app.lang) }}
      <span v-if="message" class="font-mono-d text-xs text-slate-500"> · {{ message }}</span>
    </p>
    <button
      type="button"
      class="mt-3 rounded bg-white/10 px-4 py-1.5 font-cond text-xs tracking-wider text-white transition-colors hover:bg-white/20"
      @click="$emit('retry')"
    >{{ t('state.retry', app.lang) }}</button>
  </div>
</template>
```

- [ ] **Step 4：类型检查 + 提交**

```bash
npx vue-tsc --noEmit
git add src/components/common/
git commit -m "feat(phase-2): 公共件——队徽降级/骨架屏/错误重试卡"
```

---

## Task 14：积分榜全链——形势细节函数 → FormDots → StandingsRow → StandingsTable → StandingsView

**Files:**
- Modify: `src/utils/matches.ts`（加 formDetails，computeForm 改委托）
- Modify: `tests/utils/matches.test.ts`（补 formDetails 用例）
- Create: `src/components/standings/FormDots.vue`
- Create: `src/components/standings/StandingRow.vue`（文件名用单数：一行一个组件实例）
- Create: `src/components/standings/StandingsTable.vue`
- Modify: `src/views/StandingsView.vue`（替换 Task 12 占位）

- [ ] **Step 1：`src/utils/matches.ts` 增加 formDetails（悬停显示对手 + 比分用）**

在 computeForm 之前插入，并把 computeForm 改为委托（既有测试不用动）：

```ts
export interface FormDetail {
  result: FormResult
  opponentId: number
  gf: number
  ga: number
}

/** 近 limit 场形势带对手与比分（时间序，最近一场在最右）——FormDots 悬停提示用 */
export function formDetails(matches: Match[], teamId: number, limit = 5): FormDetail[] {
  const involved = matches.filter((m) => m.completed && (m.home.id === teamId || m.away.id === teamId))
  involved.sort((a, b) => b.date.localeCompare(a.date))
  const latest = involved.slice(0, limit).map((m): FormDetail => {
    const isHome = m.home.id === teamId
    const gf = (isHome ? m.home.score : m.away.score) ?? 0
    const ga = (isHome ? m.away.score : m.home.score) ?? 0
    return { result: gf > ga ? 'W' : gf < ga ? 'L' : 'D', opponentId: isHome ? m.away.id : m.home.id, gf, ga }
  })
  return latest.reverse()
}
```

同时把原 computeForm 函数体替换为：

```ts
export function computeForm(matches: Match[], teamId: number, limit = 5): FormResult[] {
  return formDetails(matches, teamId, limit).map((d) => d.result)
}
```

- [ ] **Step 2：`tests/utils/matches.test.ts` 补用例**

在文件末尾追加：

```ts
import { formDetails } from '../../src/utils/matches'

describe('formDetails', () => {
  it('带对手 ID 与比分，时间序输出', () => {
    const ms = [
      mk('1', '2026-05-01T14:00Z', 10, 2, 11, 0),
      mk('2', '2026-05-08T14:00Z', 12, 1, 10, 1),
    ]
    expect(formDetails(ms, 10)).toEqual([
      { result: 'W', opponentId: 11, gf: 2, ga: 0 },
      { result: 'D', opponentId: 12, gf: 1, ga: 1 },
    ])
  })
})
```

（注意：import 语句要合并到文件顶部已有的 matches 导入行，不要在文件中间写第二个 import。）

- [ ] **Step 3：跑测试确认重构没破坏既有行为**

```bash
npm test
```

预期：PASS（computeForm 旧用例 + formDetails 新用例全过）

- [ ] **Step 4：`src/components/standings/FormDots.vue`**

```vue
<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { t, type Lang } from '../../utils/i18n'
import type { FormResult } from '../../types/models'

export interface DotDetail {
  result: FormResult
  opponent: string
  score: string
}

const props = defineProps<{ details: DotDetail[] }>()
const app = useAppStore()

const COLOR: Record<FormResult, string> = {
  W: 'bg-emerald-400',
  D: 'bg-slate-500',
  L: 'bg-red-400',
}

function aria(d: DotDetail, lang: Lang): string {
  const r = d.result === 'W' ? t('form.win', lang) : d.result === 'D' ? t('form.draw', lang) : t('form.loss', lang)
  return `${r} ${d.opponent} ${d.score}`
}
</script>

<template>
  <!-- 不足 5 场按实际出点；零场出占位短横线（规格 v1.3） -->
  <span v-if="props.details.length === 0" class="text-slate-600">–</span>
  <span v-else class="inline-flex gap-1" role="img" :aria-label="props.details.map((d) => aria(d, app.lang)).join('，')">
    <span
      v-for="(d, i) in props.details"
      :key="i"
      class="inline-block h-2 w-2 rounded-full transition-transform hover:scale-150"
      :class="COLOR[d.result]"
      :title="`${d.opponent} ${d.score}`"
    ></span>
  </span>
</template>
```

（SFC 里 `export interface` 合法；FormResult 从 matches.ts 导出——Task 5 已定义。）

- [ ] **Step 5：`src/components/standings/StandingRow.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { StandingRow } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useStandingsStore } from '../../stores/standings'
import { useTeamsStore } from '../../stores/teams'
import { formDetails } from '../../utils/matches'
import { teamName } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'
import FormDots from './FormDots.vue'

const props = defineProps<{ row: StandingRow; league: LeagueSlug; showXg: boolean }>()
const app = useAppStore()
const teams = useTeamsStore()
const store = useStandingsStore()

const team = computed(() => teams.teamById(props.league, props.row.teamId))

const dots = computed(() =>
  formDetails(store.formMatches[props.league] ?? [], props.row.teamId).map((d) => {
    const opp = teams.teamById(props.league, d.opponentId)
    return {
      result: d.result,
      opponent: opp ? teamName(opp.name, app.lang) : `#${d.opponentId}`,
      score: `${d.gf}-${d.ga}`,
    }
  }),
)

// 区带色条：ucl 吃联赛品牌色，其余功能色（规格 §四）
const zoneBar = computed(() => {
  switch (props.row.zone) {
    case 'ucl': return 'var(--league-color)'
    case 'uel': return '#f59e0b'
    case 'playoff': return '#fb923c'
    case 'rel': return '#ef4444'
    default: return 'transparent'
  }
})

const stat = 'tabular px-1 py-2.5 text-center text-xs text-slate-300'
</script>

<template>
  <tr
    class="group border-b border-white/5 transition-colors hover:bg-white/[0.04]"
    :style="{ boxShadow: `inset 3px 0 0 ${zoneBar}` }"
  >
    <th scope="row" class="sticky left-0 z-[1] bg-[#0c101b] px-2 py-2.5 text-left font-normal transition-colors group-hover:bg-[#131a2b]">
      <span class="inline-flex min-w-44 items-center gap-2.5">
        <span class="font-score w-5 text-right text-base" :class="row.rank === 1 ? 'text-white' : 'text-slate-400'">{{ row.rank }}</span>
        <TeamLogo :team="team" :size="20" />
        <span class="truncate font-cond text-[13px]" :class="row.zone === 'ucl' ? 'text-slate-100' : 'text-slate-300'">
          {{ teamName(row.team, app.lang) }}
        </span>
      </span>
    </th>
    <td :class="stat">{{ row.played }}</td>
    <td :class="stat">{{ row.won }}</td>
    <td :class="stat">{{ row.drawn }}</td>
    <td :class="stat">{{ row.lost }}</td>
    <td :class="stat">{{ row.goalsFor }}</td>
    <td :class="stat">{{ row.goalsAgainst }}</td>
    <td
      class="tabular px-1 py-2.5 text-center text-xs"
      :class="row.goalDiff > 0 ? 'text-emerald-300/80' : row.goalDiff < 0 ? 'text-red-300/70' : 'text-slate-300'"
    >{{ row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff }}</td>
    <td class="px-2 py-2.5 text-center">
      <span class="font-score text-lg text-white">{{ row.points }}</span>
    </td>
    <td class="px-2 py-2.5 text-center"><FormDots :details="dots" /></td>
    <template v-if="showXg">
      <td class="tabular px-1 py-2.5 text-center text-xs text-emerald-300/80">{{ row.xG?.toFixed(1) ?? '–' }}</td>
      <td class="tabular px-1 py-2.5 text-center text-xs text-emerald-300/80">{{ row.xGA?.toFixed(1) ?? '–' }}</td>
      <td class="tabular px-1 py-2.5 text-center text-xs text-emerald-300/80">{{ row.xPts?.toFixed(1) ?? '–' }}</td>
    </template>
  </tr>
</template>
```

- [ ] **Step 6：`src/components/standings/StandingsTable.vue`**

```vue
<script setup lang="ts">
import type { StandingRow } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
import StandingRow from './StandingRow.vue'

defineProps<{ rows: StandingRow[]; league: LeagueSlug; showXg: boolean }>()
const app = useAppStore()

const STAT_COLS = ['col.played', 'col.won', 'col.drawn', 'col.lost', 'col.gf', 'col.ga', 'col.gd', 'col.pts'] as const
const th = 'px-1 py-2 text-center font-cond text-[10px] font-medium uppercase tracking-[0.14em]'
</script>

<template>
  <!-- 语义表格 + 窄视口整体横滑（规格 §四交互 / §七无障碍） -->
  <div class="overflow-x-auto rounded-lg border border-white/10">
    <table class="w-full min-w-[760px] border-collapse">
      <thead class="bg-[#0e1424] text-slate-500">
        <tr>
          <th scope="col" class="sticky left-0 z-[2] bg-[#0e1424] px-2 py-2 text-left font-cond text-[10px] font-medium uppercase tracking-[0.14em]">
            # / {{ t('col.team', app.lang) }}
          </th>
          <th v-for="c in STAT_COLS" :key="c" scope="col" :class="th">{{ t(c, app.lang) }}</th>
          <th scope="col" :class="th">{{ t('col.form', app.lang) }}</th>
          <template v-if="showXg">
            <th v-for="c in ['xG', 'xGA', 'xPts']" :key="c" scope="col" :class="`${th} normal-case text-emerald-300/70`">{{ c }}</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <!-- 数据按 rank 直出，不做客户端排序（规格 v1.6） -->
        <StandingRow v-for="row in rows" :key="row.teamId" :row="row" :league="league" :show-xg="showXg" />
      </tbody>
    </table>
  </div>

  <!-- 表尾小图例（规格 §四） -->
  <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-500">
    <span class="inline-flex items-center gap-1.5">
      <i class="inline-block h-2 w-2 rounded-sm" style="background: var(--league-color)"></i>{{ t('legend.ucl', app.lang) }}
    </span>
    <span class="inline-flex items-center gap-1.5">
      <i class="inline-block h-2 w-2 rounded-sm bg-amber-500"></i>{{ t('legend.uel', app.lang) }}
    </span>
    <span v-if="league === 'ger.1'" class="inline-flex items-center gap-1.5">
      <i class="inline-block h-2 w-2 rounded-sm bg-orange-400"></i>{{ t('legend.playoff', app.lang) }}
    </span>
    <span class="inline-flex items-center gap-1.5">
      <i class="inline-block h-2 w-2 rounded-sm bg-red-500"></i>{{ t('legend.rel', app.lang) }}
    </span>
  </div>
</template>
```

- [ ] **Step 7：重写 `src/views/StandingsView.vue`（替换占位）**

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import StandingsTable from '../components/standings/StandingsTable.vue'
import { ensureLeague } from '../composables/useLeague'
import { useTimezone } from '../composables/useTimezone'
import { useAppStore } from '../stores/app'
import { useStandingsStore } from '../stores/standings'
import { useTeamsStore } from '../stores/teams'
import { t } from '../utils/i18n'
import type { LeagueSlug } from '../utils/constants'

const route = useRoute()
const app = useAppStore()
const store = useStandingsStore()
const teams = useTeamsStore()
const tz = useTimezone()

const league = computed(() => route.params.league as LeagueSlug)
const season = computed(() => app.leagueInfo(league.value)?.season ?? '2025')
const seasonLabel = computed(() => `${season.value}-${String(Number(season.value) + 1).slice(2)}`)

const seq = ref(0) // 过期响应防护（规格 v1.5）
const error = ref('')
const xgNotice = ref(false)

async function load() {
  const my = ++seq.value
  error.value = ''
  xgNotice.value = false
  try {
    await ensureLeague(league.value) // 加载顺序契约：队徽/主色先就位
    await store.load(league.value, season.value)
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function onToggleXg() {
  try {
    xgNotice.value = false
    await store.toggleXg(league.value, season.value)
  } catch {
    xgNotice.value = true // 开关保持关 + 提示，主表不受影响（验收 3）
  }
}

onMounted(load)
watch(league, load)

const rows = computed(() => store.rows[league.value] ?? [])
const meta = computed(() => teams.bundles[league.value]?.meta)
const ready = computed(() => !store.loading[league.value] && rows.value.length > 0)
</script>

<template>
  <section class="py-6">
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <h1 class="font-cond text-2xl font-semibold text-white">
        {{ app.lang === 'zh' ? meta?.nameZh : meta?.displayName }}
        <span class="text-base text-slate-500">{{ t('standings.season', app.lang) }} {{ seasonLabel }}</span>
      </h1>
      <p class="font-mono-d text-[10px] text-slate-500">
        {{ t('standings.updated', app.lang) }} {{ store.updateTime[league] ? tz.updated(store.updateTime[league]!) : '—' }}
      </p>
      <label class="ml-auto inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
        <input type="checkbox" class="accent-[var(--league-color)]" :checked="!!store.xgOn[league]" @change="onToggleXg" />
        {{ t('standings.xgToggle', app.lang) }}
      </label>
    </div>

    <p v-if="xgNotice" class="mt-2 text-[11px] text-amber-400/90">xG · {{ t('state.error', app.lang) }}</p>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="!ready" kind="table" />
    <StandingsTable v-else :rows="rows" :league="league" :show-xg="!!store.xgOn[league]" />
  </section>
</template>
```

- [ ] **Step 8：类型检查 + 浏览器验收 + 提交**

```bash
npx vue-tsc --noEmit && npm run dev
```

浏览器打开 `http://localhost:5173/MatchLab/#/eng.1/standings`，逐项核对：
- 20 队按 rank 直出、队徽显示、阿森纳 85 分榜首
- 前 4 行左侧紫条（联赛色）、第 5 名橙条、18-20 名红条；表尾图例齐全
- 近 5 场形势圆点正确（赛季末数据：各队最后 5 轮）；悬停显示"对手 + 比分"
- 勾上 xG 开关 → xG/xGA/xPts 三列出现（阿森纳 xG 77.5 / xPts 79.9）；断开网络再勾 → 开关保持关、出提示、主表正常
- 切到 `/#/ger.1/standings`：18 队、第 16 名附加赛橙红条、17/18 红条
- 切到 `/#/fra.1/standings`：18 队、**无附加赛条**、仅 17/18 红条
- 顶栏切"中 / EN"：队名变英文，表头 P/W/D/L
- 窗口窄于 760px：表格横向滑动，"名次 + 队名"列钉住
- 断网刷新页面（清缓存后）：出错误卡 + 重试按钮

```bash
git add src/utils/matches.ts tests/utils/matches.test.ts src/components/standings/ src/views/StandingsView.vue
git commit -m "feat(phase-2): 积分榜全链——形势圆点/区带色条/xG 开关/深浅链安全"
```

---

## Task 15：赛程全链——MatchCard → MatchList → MonthStrip → ScheduleView

**Files:**
- Modify: `src/utils/i18n.ts`（补 'schedule.refresh' 键）
- Create: `src/components/matches/MatchCard.vue`
- Create: `src/components/matches/MatchList.vue`
- Create: `src/components/matches/MonthStrip.vue`
- Modify: `src/views/ScheduleView.vue`（替换 Task 12 占位）

- [ ] **Step 1：i18n 补刷新文案**

`src/utils/i18n.ts` 的 UI 字典里 `'schedule.goLatest'` 一行之后插入：

```ts
  'schedule.refresh': { zh: '刷新', en: 'Refresh' },
```

- [ ] **Step 2：`src/components/matches/MatchCard.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useTimezone } from '../../composables/useTimezone'
import { useTeamsStore } from '../../stores/teams'
import { t, teamName } from '../../utils/i18n'
import type { Team } from '../../types/models'
import TeamLogo from '../common/TeamLogo.vue'

const props = defineProps<{ match: Match; league: LeagueSlug }>()
const app = useAppStore()
const tz = useTimezone()
const teams = useTeamsStore()

// 比赛自带 logo URL；档案里有就用档案（含 logoDark/主色），没有就现场拼一个
const homeTeam = computed<Team | undefined>(() =>
  teams.teamById(props.league, props.match.home.id) ??
  { id: props.match.home.id, name: props.match.home.name, shortDisplayName: props.match.home.name, abbreviation: props.match.home.abbreviation, color: '#1f2937', alternateColor: '', logo: props.match.home.logo, logoDark: '' },
)
const awayTeam = computed<Team | undefined>(() =>
  teams.teamById(props.league, props.match.away.id) ??
  { id: props.match.away.id, name: props.match.away.name, shortDisplayName: props.match.away.name, abbreviation: props.match.away.abbreviation, color: '#1f2937', alternateColor: '', logo: props.match.away.logo, logoDark: '' },
)

type Tone = 'win' | 'draw' | 'lose'
const tone = computed<{ home: Tone; away: Tone }>(() => {
  const h = props.match.home.score
  const a = props.match.away.score
  if (props.match.status !== 'post' || h === null || a === null) return { home: 'draw', away: 'draw' }
  if (h > a) return { home: 'win', away: 'lose' }
  if (h < a) return { home: 'lose', away: 'win' }
  return { home: 'draw', away: 'draw' }
})
const NAME_CLS: Record<Tone, string> = { win: 'text-white', draw: 'text-slate-300', lose: 'text-slate-500' }
const scoreCls = computed(() => (tone.value.home === 'draw' && props.match.status === 'post' ? 'text-slate-400' : 'text-white'))
</script>

<template>
  <article
    class="group cursor-pointer rounded-lg border border-white/10 bg-[#131a2b] px-4 py-2.5 transition-all hover:translate-x-1 hover:border-[var(--league-color)] hover:bg-[#171f33]"
  >
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <!-- 主队（右对齐） -->
      <div class="flex min-w-0 items-center justify-end gap-2.5">
        <span class="truncate font-cond text-[13px]" :class="NAME_CLS[tone.home]">{{ teamName(match.home.name, app.lang) }}</span>
        <TeamLogo :team="homeTeam" :size="18" />
      </div>

      <!-- 比分压中：完赛显比分 / 未开赛显 VS / 进行中显分钟 + 心跳点 -->
      <div class="min-w-[86px] text-center">
        <template v-if="match.status === 'post'">
          <span class="font-score text-2xl tracking-wide" :class="scoreCls">
            {{ match.home.score }}<span class="text-slate-500"> - </span>{{ match.away.score }}
          </span>
        </template>
        <template v-else-if="match.status === 'in'">
          <span class="inline-flex items-center gap-1.5">
            <span class="live-dot" aria-hidden="true"></span>
            <span class="font-score text-xl text-red-300">{{ match.clock ?? '—' }}</span>
          </span>
          <div class="font-score text-base text-slate-300">{{ match.home.score }} - {{ match.away.score }}</div>
        </template>
        <template v-else>
          <span class="font-score text-lg text-slate-400">{{ t('match.vs', app.lang) }}</span>
        </template>
      </div>

      <!-- 客队 -->
      <div class="flex min-w-0 items-center gap-2.5">
        <TeamLogo :team="awayTeam" :size="18" />
        <span class="truncate font-cond text-[13px]" :class="NAME_CLS[tone.away]">{{ teamName(match.away.name, app.lang) }}</span>
      </div>
    </div>

    <!-- 底栏：本地开球时间（跨天自动"次日"）· 英文球场名（规格 v1.6） -->
    <div class="mt-2 flex items-center justify-between gap-3 border-t border-dashed border-white/10 pt-1.5 font-mono-d text-[9px] text-slate-500">
      <span class="shrink-0">{{ tz.kickoff(match.date) }}</span>
      <span class="truncate">{{ match.venue }}</span>
    </div>
  </article>
</template>
```

- [ ] **Step 3：`src/components/matches/MatchList.vue`（UTC 日期分组 + 错落浮现）**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { groupMatchesByUtcDate } from '../../utils/format'
import MatchCard from './MatchCard.vue'

const props = defineProps<{ matches: Match[]; league: LeagueSlug }>()
const app = useAppStore()

// 分组用数据日期（UTC），全球用户看到的一致、可分享（规格 v1.2）
const groups = computed(() => groupMatchesByUtcDate(props.matches))

const weekday = (utcDate: string) => {
  const d = new Date(`${utcDate}T00:00:00Z`)
  const names = app.lang === 'zh' ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return names[d.getUTCDay()]
}
</script>

<template>
  <div v-for="(g, gi) in groups" :key="g.utcDate" class="mb-6">
    <div class="mb-2.5 flex items-baseline gap-2.5">
      <!-- 组头：联赛色日期徽章（format 的 dayLabel 已含星期，这里再加场次） -->
      <span
        class="border-l-[3px] bg-white/[0.04] px-2.5 py-1 font-cond text-xs font-semibold uppercase tracking-[0.12em] text-slate-200"
        style="border-color: var(--league-color)"
      >{{ g.utcDate }} · {{ weekday(g.utcDate) }}</span>
      <span class="text-[11px] text-slate-500">{{ g.matches.length }} {{ app.lang === 'zh' ? '场' : 'matches' }}</span>
    </div>
    <div class="space-y-2">
      <MatchCard
        v-for="(m, mi) in g.matches"
        :key="m.eventId"
        :match="m"
        :league="league"
        class="rise-in"
        :style="{ animationDelay: `${Math.min(gi * 60 + mi * 40, 400)}ms` }"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 4：`src/components/matches/MonthStrip.vue`**

```vue
<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'

const props = defineProps<{
  months: string[]
  current: string
  liveMonth: string
  showLive: boolean // 仅赛季内挂 LIVE 红点（规格 v1.2）
  isLive: boolean    // 当前数据来自直播通道 → 显示手动刷新钮
}>()
defineEmits<{ pick: [month: string]; refresh: [] }>()
const app = useAppStore()

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const label = (m: string) => {
  const [y, mm] = m.split('-').map(Number)
  return app.lang === 'zh' ? `${mm}月` : `${MONTHS_EN[mm - 1]} '${String(y).slice(2)}`
}
</script>

<template>
  <div class="flex items-center gap-1 overflow-x-auto pb-1">
    <button
      v-for="m in months"
      :key="m"
      type="button"
      class="relative whitespace-nowrap rounded px-3 py-1.5 font-cond text-xs tracking-wider transition-colors"
      :class="m === current ? 'bg-white/10 text-white shadow-[inset_0_-2px_0_var(--league-color)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'"
      @click="$emit('pick', m)"
    >
      {{ label(m) }}
      <span
        v-if="showLive && m === liveMonth"
        class="live-dot absolute -right-0.5 -top-0.5"
        :title="t('schedule.live', app.lang)"
        aria-hidden="true"
      ></span>
    </button>
    <button
      v-if="isLive"
      type="button"
      class="ml-1 shrink-0 rounded border border-white/15 px-2.5 py-1 font-cond text-[10px] tracking-wider text-slate-300 transition-colors hover:text-white"
      @click="$emit('refresh')"
    >⟳ {{ t('schedule.refresh', app.lang) }}</button>
  </div>
</template>
```

- [ ] **Step 5：重写 `src/views/ScheduleView.vue`（替换占位）**

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import MatchList from '../components/matches/MatchList.vue'
import MonthStrip from '../components/matches/MonthStrip.vue'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { useMatchesStore } from '../stores/matches'
import { currentMonth, defaultMonth, seasonMonths, type LeagueSlug } from '../utils/constants'
import { t } from '../utils/i18n'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const store = useMatchesStore()

const league = computed(() => route.params.league as LeagueSlug)
const season = computed(() => app.leagueInfo(league.value)?.season ?? '2025')
const months = computed(() => seasonMonths(season.value))

// 月份参数校验：YYYY-MM 且在赛季清单内，否则回落默认月份（规格规则 6）
const MONTH_RE = /^\d{4}-\d{2}$/
const month = computed(() => {
  const p = route.params.month
  return typeof p === 'string' && MONTH_RE.test(p) && months.value.includes(p)
    ? p
    : defaultMonth(season.value)
})

const seq = ref(0) // 过期响应防护（规格 v1.5）
const error = ref('')
const loading = ref(false)

async function load() {
  const my = ++seq.value
  error.value = ''
  loading.value = true
  try {
    await ensureLeague(league.value)
    await store.loadMonth(league.value, month.value, season.value)
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq.value === my) loading.value = false
  }
}

function pick(m: string) {
  if (m === month.value) return
  router.push(`/${league.value}/schedule/${m}`) // 路由变化 → watch 触发 load
}

// 空场引导：跳赛季收官月（规格风险表"上赛季数据不在仓库"）
function goLatest() {
  pick(months.value[months.value.length - 1])
}

watch([league, month], load)
onMounted(load)
onUnmounted(() => store.stopPolling()) // 人走轮询停（规格规则 1）

const matches = computed(() => store.months[store.key(league.value, month.value)] ?? [])
const inSeason = computed(() => months.value.includes(currentMonth()))
const offSeason = computed(() => !inSeason.value)
</script>

<template>
  <section class="py-6">
    <h1 class="font-cond text-2xl font-semibold text-white">
      {{ app.lang === 'zh' ? app.leagueInfo(league)?.nameZh : app.leagueInfo(league)?.name }}
      <span class="text-base text-slate-500">{{ t('nav.schedule', app.lang) }}</span>
    </h1>

    <MonthStrip
      class="mt-4"
      :months="months"
      :current="month"
      :live-month="currentMonth()"
      :show-live="inSeason"
      :is-live="store.live"
      @pick="pick"
      @refresh="store.refresh(league, month)"
    />

    <!-- 直播断线 → 快照提示（规格规则 4） -->
    <p v-if="store.fallback" class="mt-2 text-[11px] text-amber-400/90">{{ t('state.liveDown', app.lang) }}</p>
    <!-- 休赛期横幅（规格 §七） -->
    <p v-if="offSeason" class="mt-3 rounded border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400">
      {{ t('schedule.offseason', app.lang) }}
    </p>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="loading" kind="cards" />
    <div v-else-if="store.empty" class="my-12 text-center text-sm text-slate-500">
      {{ t('schedule.noMatches', app.lang) }}
      <button
        v-if="month !== months[months.length - 1]"
        type="button"
        class="mx-auto mt-4 block font-cond text-xs tracking-wider hover:underline"
        style="color: var(--league-color)"
        @click="goLatest"
      >{{ t('schedule.goLatest', app.lang) }}</button>
    </div>
    <MatchList v-else :matches="matches" :league="league" />
  </section>
</template>
```

- [ ] **Step 6：类型检查 + 浏览器验收 + 提交**

```bash
npx vue-tsc --noEmit && npm run dev
```

浏览器打开 `http://localhost:5173/MatchLab/#/eng.1/schedule`，逐项核对：
- 默认落在 2026-05（当前 2026-07 休赛期，规则 3）；休赛期横幅出现；10 个月份页签可跳，当前月（7 月）**不挂** LIVE 红点
- 2025-08：按 UTC 日期分组（8月15日/16日/17日/18日），组内按开球时间升序；时间是本机时区（东八区 19:30/22:00/次日 00:30——16:30 UTC 的狼队比赛显示"次日 00:30"）
- 完赛显比分、胜者白色高亮负者灰；未开赛月份（若存在）显 VS + 开球时间
- 点 7 月页签：空场提示 + "跳到最近有数据的月份"按钮，点击回到 5 月
- 顶栏切 EN：组头变 "Aug 16 · Sat"、VS 保留、队名英文
- 深链 `/#/eng.1/schedule/2025-12` 直达正常；`/#/eng.1/schedule/2025-13`（非法）回落默认月份
- 断网刷新：错误卡 + 重试

```bash
git add src/utils/i18n.ts src/components/matches/ src/views/ScheduleView.vue
git commit -m "feat(phase-2): 赛程全链——UTC 分组/次日前缀/月份页签/休赛期与空场态"
```

---

## Task 16：首页全链——MiniStandings → LeagueCard → MatchdayStrip → HomeView

**Files:**
- Modify: `src/utils/i18n.ts`（补 'home.focus' 键）
- Modify: `src/stores/standings.ts`（load 加 withForm 选项，守住首页 53KB 首访账本）
- Modify: `src/components/matches/MatchCard.vue`（加 featured 焦点标记）
- Create: `src/components/home/MiniStandings.vue`
- Create: `src/components/home/LeagueCard.vue`
- Create: `src/components/home/MatchdayStrip.vue`
- Modify: `src/views/HomeView.vue`（整体重写）

- [ ] **Step 1：i18n 补焦点文案**

`src/utils/i18n.ts` 的 UI 字典里 `'home.playedUnit'` 一行之后插入：

```ts
  'home.focus': { zh: '焦点', en: 'Focus' },
```

- [ ] **Step 2：`src/stores/standings.ts` 的 load() 加 withForm 选项**

首页要并行拉 5 联赛正榜，不能每联赛再捎带两个月份赛程文件（否则首访从 53KB 涨到 ~300KB）。把 Task 9 的 `load` 动作签名与函数体按下面替换（仅列改动段落）：

签名：

```ts
    async load(league: LeagueSlug, season: string, opts: { withForm?: boolean } = {}) {
      const withForm = opts.withForm ?? true
```

函数体里"拉两个月份文件"整段改为：

```ts
        this.raw[league] = sf.standings
        if (withForm) {
          const months = formMonths(season)
          const files = await Promise.all(
            months.map((m) =>
              fetchJsonCached<MatchesFile>(`data/${league}/matches/${m}.json`, STANDINGS_TTL, season).catch(() => null),
            ),
          )
          this.formMatches[league] = files.flatMap((f) => f?.matches ?? [])
        } else {
          this.formMatches[league] = []
        }
```

其余不动（rebuild 对空 formMatches 天然兼容，form 列输出空数组）。

跑一遍测试确认 formMonths 用例仍绿：

```bash
npm test
```

- [ ] **Step 3：`src/components/matches/MatchCard.vue` 加 featured 焦点标记（规格 v1.4：涉及榜首即焦点）**

props 定义替换为：

```ts
const props = withDefaults(defineProps<{ match: Match; league: LeagueSlug; featured?: boolean }>(), { featured: false })
```

article 元素加焦点态样式与徽章——`<article>` 改为（注意背景色全部进 :class 分支，避免两个 bg 工具类打架）：

```vue
  <article
    class="group cursor-pointer rounded-lg border px-4 py-2.5 transition-all hover:translate-x-1"
    :class="featured ? 'border-[var(--league-color)] bg-[#191036]' : 'border-white/10 bg-[#131a2b] hover:border-[var(--league-color)] hover:bg-[#171f33]'"
  >
    <span
      v-if="featured"
      class="mb-1.5 inline-block rounded px-1.5 py-0.5 font-cond text-[9px] font-semibold tracking-[0.14em] text-[#0b0f1a]"
      style="background: var(--league-color)"
    >{{ t('home.focus', app.lang) }}</span>
```

（徽章用品牌色实底 + 深字，法甲近白色底上深字对比度也够——规格风险表口径。）

- [ ] **Step 4：`src/components/home/MiniStandings.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { StandingRow } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useTeamsStore } from '../../stores/teams'
import { t, teamName } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'

const props = withDefaults(
  defineProps<{ rows: StandingRow[]; league: LeagueSlug; limit?: number; header?: boolean }>(),
  { limit: 5, header: false },
)
const app = useAppStore()
const teams = useTeamsStore()
const shown = computed(() => props.rows.slice(0, props.limit))
</script>

<template>
  <div>
    <!-- 列与确认稿 mockup 一致：名次 / 队名 / 胜 / 平 / 负 / 积分（规格 v1.6） -->
    <div
      v-if="header"
      class="grid grid-cols-[1.4rem_1fr_1.6rem_1.6rem_1.6rem_2.2rem] items-center gap-2 border-b border-white/10 px-2 pb-1.5 text-[9px] uppercase tracking-[0.14em] text-slate-500"
    >
      <span>#</span><span>{{ t('col.team', app.lang) }}</span>
      <span class="text-center">{{ t('col.won', app.lang) }}</span>
      <span class="text-center">{{ t('col.drawn', app.lang) }}</span>
      <span class="text-center">{{ t('col.lost', app.lang) }}</span>
      <span class="text-right">{{ t('col.pts', app.lang) }}</span>
    </div>
    <div
      v-for="row in shown"
      :key="row.teamId"
      class="grid grid-cols-[1.4rem_1fr_1.6rem_1.6rem_1.6rem_2.2rem] items-center gap-2 border-l-2 px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
      :style="{ borderColor: row.zone === 'ucl' ? 'var(--league-color)' : 'transparent' }"
    >
      <span class="font-score text-sm" :class="row.rank === 1 ? 'text-white' : 'text-slate-400'">{{ row.rank }}</span>
      <span class="flex min-w-0 items-center gap-2">
        <TeamLogo :team="teams.teamById(league, row.teamId)" :size="16" />
        <span class="truncate font-cond text-xs" :class="row.zone === 'ucl' ? 'text-slate-100' : 'text-slate-300'">{{ teamName(row.team, app.lang) }}</span>
      </span>
      <span class="tabular text-center text-[11px] text-slate-400">{{ row.won }}</span>
      <span class="tabular text-center text-[11px] text-slate-400">{{ row.drawn }}</span>
      <span class="tabular text-center text-[11px] text-slate-400">{{ row.lost }}</span>
      <span class="font-score text-right text-base text-white">{{ row.points }}</span>
    </div>
  </div>
</template>
```

- [ ] **Step 5：`src/components/home/LeagueCard.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { useStandingsStore } from '../../stores/standings'
import { t } from '../../utils/i18n'
import type { LeagueSlug } from '../../utils/constants'
import MiniStandings from './MiniStandings.vue'

const props = withDefaults(defineProps<{ league: LeagueSlug; featured?: boolean }>(), { featured: false })
const app = useAppStore()
const store = useStandingsStore()
const router = useRouter()

const info = computed(() => app.leagueInfo(props.league))
const rows = computed(() => store.rows[props.league] ?? [])
const color = computed(() => info.value?.color ?? '#3D195B')
const name = computed(() => (app.lang === 'zh' ? info.value?.nameZh : info.value?.name) ?? props.league)

function enter() {
  router.push(`/${props.league}/standings`)
}
</script>

<template>
  <article
    role="link"
    tabindex="0"
    class="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#111726] transition-all hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.9)]"
    @click="enter"
    @keydown.enter="enter"
  >
    <!-- 品牌色顶条（切联赛时焦点卡随主题色过渡） -->
    <div
      class="h-1 transition-colors duration-700"
      :style="{ background: featured ? `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 35%, white))` : color }"
    ></div>
    <div class="p-4">
      <p v-if="featured" class="font-mono-d text-[9px] tracking-[0.24em]" :style="{ color }">
        {{ t('home.featured', app.lang).toUpperCase() }}
      </p>
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="font-cond text-lg font-semibold text-white">{{ name }}</h3>
        <span class="text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-white">→</span>
      </div>
      <p class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ info?.name }}</p>

      <MiniStandings :rows="rows" :league="league" :limit="featured ? 5 : 2" :header="featured" class="mt-3" />

      <p class="mt-3 font-mono-d text-[9px] text-slate-600">
        {{ info?.teams }} {{ t('home.teamsUnit', app.lang) }} · {{ info?.players }} {{ t('home.playersUnit', app.lang) }}
      </p>
      <p v-if="featured" class="mt-3 font-cond text-xs tracking-[0.1em]" :style="{ color }">
        {{ t('home.enter', app.lang) }}{{ name }} →
      </p>
    </div>
  </article>
</template>
```

- [ ] **Step 6：`src/components/home/MatchdayStrip.vue`**

```vue
<script setup lang="ts">
import type { Match } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useTimezone } from '../../composables/useTimezone'
import { t } from '../../utils/i18n'
import MatchCard from '../matches/MatchCard.vue'

const props = defineProps<{
  league: LeagueSlug
  utcDate: string  // 战报所在比赛日（UTC 日期）
  month: string    // 战报所在月份（"查看完整赛程"链接用）
  matches: Match[] // 已按选场规则挑好的 ≤4 场
  featuredId: string // 涉及榜首的那场 eventId（焦点标记，规格 v1.4）
}>()
const app = useAppStore()
const tz = useTimezone()

const leagueName = () => {
  const info = app.leagueInfo(props.league)
  return (app.lang === 'zh' ? info?.nameZh : info?.name) ?? props.league
}
</script>

<template>
  <!-- 开场即比赛日：上轮战报转播带（首页第一段，规格 §四） -->
  <section
    class="relative overflow-hidden rounded-xl border border-white/10 p-5"
    style="background: linear-gradient(180deg, color-mix(in srgb, var(--league-color) 18%, #10152a), #10152a)"
  >
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <span class="rounded border px-2 py-0.5 font-mono-d text-[10px] tracking-[0.22em]" style="border-color: color-mix(in srgb, var(--league-color) 60%, transparent); color: color-mix(in srgb, var(--league-color) 70%, white)">
        {{ t('home.lastRound', app.lang) }}
      </span>
      <h2 class="font-cond text-lg font-semibold text-white">{{ leagueName() }} · {{ tz.dayLabel(utcDate) }}</h2>
      <router-link
        :to="`/${league}/schedule/${month}`"
        class="ml-auto text-xs text-slate-400 transition-colors hover:text-white"
      >{{ t('home.viewFull', app.lang) }} →</router-link>
    </div>
    <div class="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <MatchCard
        v-for="m in matches"
        :key="m.eventId"
        :match="m"
        :league="league"
        :featured="m.eventId === featuredId"
        class="rise-in"
      />
    </div>
  </section>
</template>
```

- [ ] **Step 7：重写 `src/views/HomeView.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import LeagueCard from '../components/home/LeagueCard.vue'
import MatchdayStrip from '../components/home/MatchdayStrip.vue'
import { fetchJsonCached } from '../composables/useJsonFetch'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { useStandingsStore } from '../stores/standings'
import type { Match } from '../types/models'
import type { MatchesFile } from '../types/static'
import { FOCUS_LEAGUE, LEAGUE_SLUGS, defaultMonth, seasonMonths } from '../utils/constants'
import { lastCompletedMatchday, selectStripMatches } from '../utils/matches'

const app = useAppStore()
const standings = useStandingsStore()

const focus = FOCUS_LEAGUE
const others = LEAGUE_SLUGS.filter((l) => l !== focus)

const seq = ref(0)
const error = ref('')
const loading = ref(true)

interface Strip {
  matches: Match[] // 该比赛日全部比赛（未筛选）
  utcDate: string
  month: string
}
const strip = ref<Strip | null>(null)

async function load() {
  const my = ++seq.value
  error.value = ''
  loading.value = true
  try {
    await app.loadLeagues()
    const season = app.leagueInfo(focus)?.season ?? '2025'
    // 并行：焦点联赛档案 + 五联赛正榜（首页不带形势列，守 53KB 首访账本）
    await Promise.all([
      ensureLeague(focus),
      ...LEAGUE_SLUGS.map((l) => standings.load(l, season, { withForm: false }).catch(() => null)),
    ])
    // "上轮" = 最近一个有完赛的比赛日，从默认月份往前最多回看 2 个月份文件（规格 v1.2）
    const months = seasonMonths(season)
    const from = months.indexOf(defaultMonth(season))
    const scan = months.slice(Math.max(0, from - 1), from + 1).reverse()
    let found: Strip | null = null
    for (const m of scan) {
      let matches: Match[]
      try {
        matches = (await fetchJsonCached<MatchesFile>(`data/${focus}/matches/${m}.json`, 60 * 60 * 1000, season)).matches
      } catch {
        continue // 该月文件缺失 → 继续回看
      }
      const d = lastCompletedMatchday(matches)
      if (d) {
        found = { matches: matches.filter((x) => x.date.slice(0, 10) === d), utcDate: d, month: m }
        break
      }
    }
    if (seq.value !== my) return
    strip.value = found
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq.value === my) loading.value = false
  }
}

onMounted(load)

// 选场：榜首/榜二优先 + 开球时间补足 4 场（规格 v1.4 确定性规则）
const stripMatches = computed(() =>
  strip.value ? selectStripMatches(strip.value.matches, standings.rows[focus] ?? []) : [],
)
const topTeamId = computed(() => (standings.rows[focus] ?? []).find((r) => r.rank === 1)?.teamId)
const featuredId = computed(() => {
  const id = topTeamId.value
  if (id === undefined) return ''
  return stripMatches.value.find((m) => m.home.id === id || m.away.id === id)?.eventId ?? ''
})
</script>

<template>
  <div class="py-6">
    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="loading && !standings.rows[focus]" kind="cards" />
    <template v-else>
      <!-- ① 上轮战报转播带（查不到完赛比赛日则不出，规格 v1.2） -->
      <MatchdayStrip
        v-if="strip && stripMatches.length"
        :league="focus"
        :utc-date="strip.utcDate"
        :month="strip.month"
        :matches="stripMatches"
        :featured-id="featuredId"
      />

      <!-- ② 联赛板块：焦点大卡 + 2×2 小卡（不对称布局，规格 §四） -->
      <div class="mt-6 grid gap-4 lg:grid-cols-12">
        <LeagueCard :league="focus" featured class="lg:col-span-7" />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">
          <LeagueCard v-for="l in others" :key="l" :league="l" />
        </div>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 8：类型检查 + 浏览器验收 + 提交**

```bash
npx vue-tsc --noEmit && npm run dev
```

浏览器打开 `http://localhost:5173/MatchLab/`，逐项核对：
- 开场是上轮战报转播带（英超 · 5月24日）：4 张卡片，其中涉及榜首阿森纳的"水晶宫 1-2 阿森纳"带"焦点"徽章（若阿森纳不在所选 4 场则无徽章——规则使然，不是 bug）
- 英超焦点大卡在左（7 成宽、带 5 行迷你榜 + 表头 + 色带边），右侧 2×2 四联赛小卡（各带榜首两队：西甲巴萨 94、意甲国米 87、德甲拜仁 89、法甲巴黎 76）
- 点任意联赛卡 → 直进该联赛积分榜；点页签行为同理（赛程页切页签留在赛程页）
- 网络面板核对首页首访：5 份 standings + leagues + meta/teams + 1 个月程文件，**没有** xg 文件、没有多余的月份文件（withForm:false 生效）
- 切 EN：卡片名变英文，迷你榜数字不变
- 断网刷新：错误卡 + 重试

```bash
git add src/utils/i18n.ts src/stores/standings.ts src/components/matches/MatchCard.vue src/components/home/ src/views/HomeView.vue
git commit -m "feat(phase-2): 首页全链——战报带/焦点卡/2×2 联赛板块/并行抓取守账本"
```

---

## Task 17：全量验收 + 性能实测 + 部署 + 文档同步

**Files:**
- Modify: `CLAUDE.md`（当前阶段状态行 ×2）
- Modify: `docs/implementation-plan.md`（Phase 2 验收勾选）

- [ ] **Step 1：十三条验收标准逐条过（规格 §八）**

`npm run dev` 起着，按下表逐条人工核验，每条过了在实施计划对应位置打勾：

| # | 验收项 | 验法 |
|---|---|---|
| 1 | 首页选联赛直进积分榜 | 点五张联赛卡各一遍 |
| 2 | 积分榜排序/队徽/色带/形势列 | 英超（20 队 + 后 3 红条）、德甲（16 附加赛）、法甲（无附加赛）各看一遍 |
| 3 | xG 开关 + 失败降级 | 正常开关一次；DevTools 断网再开 → 开关保持关、出提示、主表正常 |
| 4 | 切联赛联动 + 二次进入 <100ms | 切联赛观察刷新；DevTools Network 面板看二次进入无网络请求（缓存命中） |
| 5 | 赛程默认月份 / 10 月可跳 / 完赛与未开赛显示 | 默认落 2026-05；跳到 2025-08 看完赛比分；非法月份参数回落 |
| 6 | 轮询 + 断线退快照 | **休赛期用 mock 验**：临时把 `useEspanFetch.ts` 的 SITE_API 指向一个本地假响应（或 DevTools 覆盖响应），构造 status=in 的比赛 → 观察每 60s 请求；把直连改成必失败 → 出"已退回快照"提示。验完还原代码（不提交 mock） |
| 7 | 中英文全站无死角 + 次日前缀 | 逐页切 EN 扫一遍：页签/表头/错误卡/空场/横幅/页脚全变英文；狼队 16:30 UTC 场次中文显"次日 00:30" |
| 8 | 四态可见 | 骨架屏（慢网速模拟）、错误重试（断网）、空场（7 月）、休赛期横幅 |
| 9 | 移动端全流程 | DevTools 375px 宽：积分榜左列钉住右列横滑、卡片竖排、页签横滑 |
| 10 | Pages 部署 + 线上实测 | 见 Step 3 |
| 11 | 无障碍 | DevTools Lighthouse accessibility 跑一遍 ≥ 90 分；Tab 键走一遍焦点环；形势圆点悬停/读屏出"胜/平/负 + 对手比分" |
| 12 | 性能预算 | 见 Step 2 |
| 13 | 深链 + 竞态 | 新标签直达 `/#/ita.1/standings` 正常渲染；积分榜页快速连点五个联赛页签，最终页面 = 最后一次点的联赛、无串数据 |

- [ ] **Step 2：性能预算实测（验收 12）**

```bash
npm run build
node -e "
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const dir='dist/assets';
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.js'))){
  const raw=fs.readFileSync(path.join(dir,f));
  console.log(f, 'raw', (raw.length/1024).toFixed(1)+'KB', 'gzip', (zlib.gzipSync(raw).length/1024).toFixed(1)+'KB');
}
"
```

预期：主 JS gzip ≤ 150KB（Vue+Pinia+Router+本站代码，无新运行时依赖）。超标 → 查依赖误引，不许砍功能凑数。

队徽体积：DevTools Network 面板开 `/#/eng.1/standings`，按 Img 过滤，记录 20 张队徽总传输量写进验收记录；超标再研究 ESPN 小尺寸路径（规格风险表）。

- [ ] **Step 3：推送 + 线上实测（验收 10）**

```bash
git push origin main
```

等 deploy.yml 跑完（Actions 页面看绿），线上核验：
- https://davidgao1024.github.io/MatchLab/ 首页正常，战报带出数据
- `/#/eng.1/standings`、`/#/ger.1/schedule/2025-08` 深链正常
- 所有静态 JSON 走 `/MatchLab/data/...` 前缀无 404（铁律复验）
- 线上切一次 EN 再切回

- [ ] **Step 4：文档同步**

`CLAUDE.md` 两处状态行更新（其余一字不动）：

「一、项目画像」：

```
- **当前阶段**：Phase 2 完成（积分榜 + 赛程 + 首页前端上线，2026-07-27），待令开 Phase 3（比赛详情弹窗）；施工图纸见 `docs/implementation-plan.md`
```

「四、项目工作流」末行：

```
- 开工须先获总司令明确指令，当前状态：🟡 施工中（Phase 0–2 ✅，待令开 Phase 3）
```

`docs/implementation-plan.md` 的 Phase 2 验收清单 7 项 `- [ ]` 全部勾为 `- [x]`。

- [ ] **Step 5：收尾提交**

```bash
git add CLAUDE.md docs/implementation-plan.md
git commit -m "docs(phase-2): Phase 2 验收完成——状态行与蓝图勾选同步"
```

全部完成后向总司令汇报：13 条验收结果、性能实测数字、线上 URL，请求检阅。
