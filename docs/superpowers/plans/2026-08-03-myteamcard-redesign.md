# MyTeamCard 重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写 `src/components/home/MyTeamCard.vue`，对齐项目"转播图形风"暗色 + 球队主色基调；1 队订阅时拉宽 3 列信息丰富布局，2-3 队用紧凑窄卡 grid；最近 3 场统一 mini MatchCard vs 格式。

**Architecture:** 单文件重写（不拆子组件）；通过 `useUserDataStore().subscriptions.length` 判定 wide/narrow 布局；用 `team.color` 驱动 `--team-color` CSS 变量；复用现有 `useStandingsStore` / `useTeamsStore` / `fetchLiveScores` / `fetchTeamInjuries`。

**Tech Stack:** Vue 3 `<script setup>` + Pinia + TypeScript strict + Tailwind 4 + Vitest 4 + @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-08-03-myteamcard-redesign-design.md`

**约定**：
- 测试文件：`tests/components/MyTeamCard.test.ts`（已存在 3 个测试，本计划保留并新增）
- 测试运行：`npm test -- tests/components/MyTeamCard.test.ts`
- 类型检查：`npm run typecheck`（即 `vue-tsc -b`）
- 提交前 husky pre-push 自动跑 typecheck
- 提交信息按现有风格：`feat:`/`fix:`/`refactor:`/`docs:` 前缀

---

## 文件结构

| 文件 | 操作 | 责任 |
|---|---|---|
| `src/components/home/MyTeamCard.vue` | 重写 | 单组件，含 wide + narrow 两种布局模式 + 球队主色 CSS 变量 |
| `tests/components/MyTeamCard.test.ts` | 扩展 | 新增 6 测试覆盖新行为；保留旧 3 测试 |
| `src/views/HomeView.vue` | 改 1 行 | 订阅区 wrapper `max-w-5xl → max-w-7xl` |

---

## Task 1: 扩展测试套件覆盖新行为（TDD - 先写失败测试）

**Files:**
- Modify: `tests/components/MyTeamCard.test.ts`

- [ ] **Step 1: 读现有测试文件确认结构**

```bash
# 用 Read 工具查看 tests/components/MyTeamCard.test.ts
```

确认现有 3 测试（"传入 subscription 渲染球队名"、"今日无赛显示今日无赛"、"有今日赛程显示对阵双方"），beforeEach 含 `setActivePinia(createPinia())` + `localStorage.clear()` + `vi.useFakeTimers()` + `__resetToast/__resetConfirm/clearScoreCache/clearInjuryCache`。

- [ ] **Step 2: 加 store + 测试数据 helper import**

在文件顶部 import 段加：

```ts
import { useStandingsStore } from '../../src/stores/standings'
import { useTeamsStore } from '../../src/stores/teams'
import type { StandingRow, Team, Match, MatchStatus } from '../../src/types/models'
```

- [ ] **Step 3: 加 mock 数据 helper 函数**

在 `beforeEach` 后追加：

```ts
function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
    color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
    ...over,
  }
}

function makeStanding(over: Partial<StandingRow> = {}): StandingRow {
  return {
    rank: 1, teamId: 359, team: 'Arsenal', played: 38,
    won: 26, drawn: 7, lost: 5, goalsFor: 75, goalsAgainst: 32, goalDiff: 43,
    points: 85, zone: null, form: ['W','W','D','W','L'],
    ...over,
  }
}

function makeMatch(over: Partial<Match> = {}): Match {
  return {
    eventId: 'e1',
    date: '2026-08-21T19:00:00Z',
    status: 'pre' as MatchStatus,
    completed: false,
    venue: 'Emirates Stadium',
    home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: null, winner: null },
    away: { id: 25, name: 'Liverpool', abbreviation: 'LIV', logo: '', score: null, winner: null },
    ...over,
  }
}

/** 注入 teamsStore + standingsStore 测试数据 */
function injectStoreData(opts: { team?: Team; standing?: StandingRow | null } = {}) {
  const teams = useTeamsStore()
  const standings = useStandingsStore()
  const team = opts.team ?? makeTeam()
  teams.bundles['eng.1'] = {
    meta: { season: '2025', seasonType: 'european' } as any,
    teams: [team],
    byId: new Map([[team.id, team]]),
  }
  if (opts.standing === null) {
    standings.rows['eng.1'] = []
  } else {
    standings.rows['eng.1'] = [opts.standing ?? makeStanding()]
  }
  return { team, standing: opts.standing }
}
```

- [ ] **Step 4: 加 wide 模式测试（1 队订阅渲染 rank badge + WDL + form pills + GF/GA）**

追加新 describe block（或在现有 describe 内追加 it）：

```ts
describe('MyTeamCard wide 模式（1 队订阅）', () => {
  it('渲染 rank badge + WDL + form pills + GF/GA', async () => {
    const userStore = useUserDataStore()
    await userStore.init()
    userStore.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    injectStoreData()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    const html = w.html()
    expect(html).toContain('订阅主队')
    expect(html).toMatch(/rank-badge/)
    // WDL 三宫格 class-based 定位（避免 w.text() 误命中）
    const wdlCells = w.findAll('.wdl-cell')
    expect(wdlCells.length).toBe(3)
    expect(wdlCells[0].text()).toContain('26') // W
    expect(wdlCells[1].text()).toContain('7')  // D
    expect(wdlCells[2].text()).toContain('5')  // L
    // 积分行
    const pointsRow = w.find('.points-row')
    expect(pointsRow.text()).toContain('85')
    // form pills
    const formPills = w.findAll('.form-pills .pill')
    expect(formPills.length).toBe(5)
    // GF/GA 双格
    const gfGa = w.findAll('.gf-ga-cell')
    expect(gfGa.length).toBe(2)
    expect(gfGa[0].text()).toContain('75') // GF
    expect(gfGa[1].text()).toContain('32') // GA
  })
})
```

注意：`useUserDataStore` 需要 import。如果文件顶部没 import，加：
```ts
import { useUserDataStore } from '../../src/stores/userData'
```

- [ ] **Step 5: 加 narrow 模式测试（2 队订阅不渲染 rank badge / WDL）**

```ts
describe('MyTeamCard narrow 模式（2-3 队订阅）', () => {
  it('不渲染 rank badge + 不渲染 WDL 三宫格', async () => {
    const userStore = useUserDataStore()
    await userStore.init()
    userStore.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    userStore.addSubscription({ league: 'eng.1', teamId: 25, teamName: 'Liverpool' })
    injectStoreData()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    const html = w.html()
    expect(html).not.toMatch(/rank-badge/)
    expect(html).not.toMatch(/wdl-cell/)
    expect(w.text()).toContain('Arsenal') // 仍渲染球队名
  })
})
```

- [ ] **Step 6: 加 CSS 变量测试（--team-color 含 team.color 值）**

```ts
describe('MyTeamCard 球队主色 CSS 变量', () => {
  it('--team-color 含 team.color', async () => {
    const userStore = useUserDataStore()
    await userStore.init()
    userStore.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    injectStoreData({ team: makeTeam({ color: '#EF0107' }) })
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    const root = w.find('article')
    const style = root.attributes('style') ?? ''
    expect(style).toContain('--team-color')
    expect(style).toContain('#EF0107')
  })
})
```

- [ ] **Step 7: 加 mine/opp class + WDL tone 测试**

```ts
describe('MyTeamCard vs 行 mine/opp 高亮 + WDL tone', () => {
  it('订阅队名 mine class，对手 opp class，比分按 W/D/L tone', async () => {
    const userStore = useUserDataStore()
    await userStore.init()
    userStore.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    injectStoreData()
    // 一场 Arsenal 主场赢 1-0（W tone 绿）
    const winMatch = makeMatch({
      eventId: 'w1', date: '2026-05-12T19:00:00Z', status: 'post', completed: true,
      home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: 1, winner: true },
      away: { id: 39, name: 'Burnley', abbreviation: 'BUR', logo: '', score: 0, winner: false },
    })
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [winMatch] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    const html = w.html()
    // Arsenal mine (white bold), Burnley opp (slate)
    expect(html).toMatch(/class="[^"]*mine[^"]*"/)
    expect(html).toMatch(/class="[^"]*opp[^"]*"/)
    // W tone score (green)
    expect(html).toMatch(/vs-score w/)
  })
})
```

- [ ] **Step 8: 加 standings 未加载时骨架占位测试**

```ts
describe('MyTeamCard standings 未加载', () => {
  it('战绩区显示占位"-"不阻塞渲染', async () => {
    const userStore = useUserDataStore()
    await userStore.init()
    userStore.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    injectStoreData({ standing: null }) // 显式注入空 standings
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    // 战绩区显示占位（不抛错），球队名仍渲染
    expect(w.text()).toContain('Arsenal')
    // WDL 数字 26/7/5 不应渲染（无 standings）
    expect(w.text()).not.toContain('26')
  })
})
```

- [ ] **Step 9: 跑测试确认 fail**

```bash
npm test -- tests/components/MyTeamCard.test.ts
```

Expected: 旧 3 测试 PASS，新 6 测试 FAIL（因 MyTeamCard.vue 尚未重写，缺少 `rank-badge` / `wdl-cell` / `form-pills` / `vs-score` / `mine` / `opp` class + `--team-color` style）。

- [ ] **Step 10: 提交失败测试**

```bash
git add tests/components/MyTeamCard.test.ts
git commit -m "test: 加 MyTeamCard 重设计 6 个测试（wide/narrow/CSS-var/mine-opp/WDL-tone/骨架占位）"
```

---

## Task 2: 重写 MyTeamCard.vue script setup（state + computed + load 函数）

**Files:**
- Modify: `src/components/home/MyTeamCard.vue`

- [ ] **Step 1: 读现有 MyTeamCard.vue 全文**

```bash
# Read 工具查看 src/components/home/MyTeamCard.vue
```

确认现有 load 函数逻辑（23 月窗口 + 伤员 + todayMatch + recentMatches）+ template 结构（旧 light 主题）。

- [ ] **Step 2: 重写 `<script setup lang="ts">` 全段**

替换整个 `<script setup>` 块为：

```ts
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchLiveScores, fetchTeamInjuries } from '../../composables/useEspanFetch'
import { useUserDataStore } from '../../stores/userData'
import { useStandingsStore } from '../../stores/standings'
import { useTeamsStore } from '../../stores/teams'
import { useAppStore } from '../../stores/app'
import { teamName } from '../../utils/i18n'
import type { Subscription } from '../../types/user-data'
import type { Match, StandingRow, Team } from '../../types/models'

const props = defineProps<{ subscription: Subscription }>()
const router = useRouter()
const userStore = useUserDataStore()
const standings = useStandingsStore()
const teams = useTeamsStore()
const app = useAppStore()

const todayMatch = ref<Match | null>(null)
const nextMatch = ref<Match | null>(null)
const recentMatches = ref<Match[]>([])
const injuries = ref<string[]>([])
const loading = ref(true)
const error = ref('')

const team = computed<Team | undefined>(() => teams.teamById(props.subscription.league, props.subscription.teamId))
const teamColor = computed(() => team.value?.color || app.leagueInfo(props.subscription.league)?.color || '#3D195B')
const standing = computed<StandingRow | undefined>(() => {
  const rows = standings.rows[props.subscription.league] ?? []
  return rows.find((r) => r.teamId === props.subscription.teamId)
})
const layoutMode = computed<'wide' | 'narrow'>(() => userStore.subscriptions.length === 1 ? 'wide' : 'narrow')
const isWide = computed(() => layoutMode.value === 'wide')

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const now = new Date()
    const months: string[] = []
    for (let i = -12; i <= 10; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      months.push(`${y}-${m}`)
    }
    const all = await Promise.all(
      months.map((m) => fetchLiveScores(props.subscription.league, m)),
    )
    const teamMatches = all.flat()
      .filter((m) => m.home.id === props.subscription.teamId || m.away.id === props.subscription.teamId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    todayMatch.value = teamMatches.find((m) => isToday(m.date)) ?? null
    const future = teamMatches.filter((m) => new Date(m.date) > now)
    // footer 下场预告 = today 之后的第一个 future（无 today 则第二个 future，避免与 hero 重复）
    const nextIdx = todayMatch.value ? 0 : 1
    nextMatch.value = future[nextIdx] ?? future[0] ?? null
    const past = teamMatches.filter((m) => new Date(m.date) < now)
    recentMatches.value = past.slice(-3).reverse()
    try {
      const inj = await fetchTeamInjuries(props.subscription.league, props.subscription.teamId)
      injuries.value = inj.slice(0, 3).map((i) => i.name)
    } catch {
      injuries.value = []
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.subscription.teamId, load)

function goTeam() {
  router.push(`/${props.subscription.league}/team/${props.subscription.teamId}`)
}

function displayName(name: string): string {
  return teamName(name, app.lang)
}

function scoreLine(m: Match): string {
  if (m.home.score != null && m.away.score != null) {
    return `${m.home.score}-${m.away.score}`
  }
  return 'vs'
}

type Tone = 'w' | 'd' | 'l' | 'none'
function matchTone(m: Match): Tone {
  if (m.status !== 'post' || m.home.score == null || m.away.score == null) return 'none'
  const mine = props.subscription.teamId
  const myHome = m.home.id === mine
  const myScore = myHome ? m.home.score : m.away.score
  const oppScore = myHome ? m.away.score : m.home.score
  if (myScore > oppScore) return 'w'
  if (myScore < oppScore) return 'l'
  return 'd'
}

function formatCountdown(targetIso: string): string {
  const ms = new Date(targetIso).getTime() - Date.now()
  if (ms <= 0) return '00D 00H 00M'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${String(d).padStart(2, '0')}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M`
}
</script>
```

- [ ] **Step 3: 跑测试，确认部分 fail 项已变 pass**

```bash
npm test -- tests/components/MyTeamCard.test.ts
```

Expected: 旧 3 测试可能 FAIL（因 template 还是旧版）；新测试中 CSS var 测试可能 FAIL（template 没绑 `--team-color`）。这是预期——template 还没重写。

- [ ] **Step 4: 暂不提交，进入 Task 3 写 template**

---

## Task 3: 重写 MyTeamCard.vue template — wide 模式 + narrow 模式

**Files:**
- Modify: `src/components/home/MyTeamCard.vue`

- [ ] **Step 1: 替换整个 `<template>` 块**

替换为：

```vue
<template>
  <article
    :style="{ '--team-color': teamColor }"
    :class="isWide ? 'wide-card' : 'narrow-card'"
  >
    <!-- Loading 态 -->
    <div v-if="loading" class="p-4 text-sm text-slate-500">加载中...</div>

    <!-- 错误态 -->
    <div v-else-if="error" class="p-4 text-sm text-red-400">{{ error }}</div>

    <!-- Wide 模式（1 队订阅） -->
    <div v-else-if="isWide" class="wide-body">
      <!-- Header -->
      <header class="wide-header">
        <span class="tag">订阅主队</span>
        <span class="league">{{ subscription.league.toUpperCase() }}</span>
        <h3 class="team-name" @click="goTeam">{{ displayName(subscription.teamName) }}</h3>
        <div v-if="standing" class="rank-badge">
          <span class="num">{{ standing.rank }}</span>
          <span class="of">/ {{ (standings.rows[subscription.league] ?? []).length || 20 }}</span>
        </div>
      </header>

      <!-- Main 3 列 grid -->
      <div class="wide-grid">
        <!-- 列 1：今日赛英雄区 -->
        <section class="hero-block">
          <div v-if="todayMatch?.status === 'in'" class="hero-meta">
            <span class="live-dot live"></span>进行中 · {{ todayMatch.clock ?? '—' }}
          </div>
          <div v-else-if="todayMatch" class="hero-meta">
            <span class="live-dot"></span>今日 · {{ formatKickoff(todayMatch.date) }}
          </div>
          <div v-else-if="nextMatch" class="hero-meta">
            <span class="next-dot"></span>下场 · {{ formatKickoff(nextMatch.date) }}
          </div>
          <div v-else class="hero-meta">赛季已结束</div>

          <div v-if="todayMatch || nextMatch" class="hero-matchup">
            <div class="hero-side left">
              <span class="hero-abbr">{{ displayName((todayMatch ?? nextMatch)!.home.name) }}</span>
            </div>
            <div class="hero-vs">VS</div>
            <div class="hero-side right">
              <span class="hero-abbr">{{ displayName((todayMatch ?? nextMatch)!.away.name) }}</span>
            </div>
          </div>

          <div v-if="todayMatch?.status === 'in'" class="kickoff-row">
            <span>进行中 <span class="kickoff-time">{{ todayMatch.home.score ?? 0 }} - {{ todayMatch.away.score ?? 0 }}</span></span>
            <span class="countdown">{{ todayMatch.clock ?? '—' }}</span>
          </div>
          <div v-else-if="todayMatch || nextMatch" class="kickoff-row">
            <span>开球 <span class="kickoff-time">{{ formatKickoffTime((todayMatch ?? nextMatch)!.date) }}</span></span>
            <span class="countdown">{{ formatCountdown((todayMatch ?? nextMatch)!.date) }}</span>
          </div>
          <div v-if="todayMatch || nextMatch" class="venue-row">◉ {{ (todayMatch ?? nextMatch)!.venue }}</div>
        </section>

        <!-- 列 2：最近 3 场 -->
        <section class="recent-block">
          <div class="section-label">最近 3 场</div>
          <div v-for="m in recentMatches" :key="m.eventId" class="vs-row">
            <div class="vs-side home">
              <span :class="m.home.id === subscription.teamId ? 'name mine' : 'name opp'">{{ displayName(m.home.name) }}</span>
            </div>
            <div>
              <div :class="`vs-score ${matchTone(m)}`">{{ scoreLine(m) }}</div>
              <div class="vs-date">{{ formatDateShort(m.date) }}</div>
            </div>
            <div class="vs-side away">
              <span :class="m.away.id === subscription.teamId ? 'name mine' : 'name opp'">{{ displayName(m.away.name) }}</span>
            </div>
          </div>
        </section>

        <!-- 列 3：战绩区 -->
        <section class="stats-block">
          <div class="section-label">赛季战绩</div>
          <div v-if="standing" class="wdl">
            <div class="wdl-cell wdl-w"><div class="wdl-label">W</div><div class="wdl-val">{{ standing.won }}</div></div>
            <div class="wdl-cell wdl-d"><div class="wdl-label">D</div><div class="wdl-val">{{ standing.drawn }}</div></div>
            <div class="wdl-cell wdl-l"><div class="wdl-label">L</div><div class="wdl-val">{{ standing.lost }}</div></div>
          </div>
          <div v-else class="wdl-skeleton">—</div>
          <div v-if="standing" class="points-row">
            <span class="points-label">积分</span>
            <span class="points-val">{{ standing.points }}</span>
          </div>
          <div v-if="standing && standing.form?.length" class="form-row">
            <div class="section-label">最近 5 场</div>
            <div class="form-pills">
              <span v-for="(f, i) in standing.form" :key="i" :class="`pill ${f.toLowerCase()}`">{{ f }}</span>
            </div>
          </div>
          <div v-if="standing" class="gf-ga">
            <div class="gf-ga-cell"><span class="gf-ga-label">GF</span><span class="gf-ga-val">{{ standing.goalsFor }}</span></div>
            <div class="gf-ga-cell"><span class="gf-ga-label">GA</span><span class="gf-ga-val">{{ standing.goalsAgainst }}</span></div>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <footer class="wide-footer">
        <div v-if="injuries.length" class="inj-block">
          <span class="inj-label">伤员</span>
          <span class="inj-names">{{ injuries.join(' · ') }}</span>
        </div>
        <div v-if="nextMatch" class="next-game">
          <div class="next-label">下场</div>
          <div class="next-match">{{ displayName(nextMatch.home.name) }} vs {{ displayName(nextMatch.away.name) }}</div>
          <div class="next-meta">{{ formatDateLong(nextMatch.date) }}</div>
        </div>
      </footer>
    </div>

    <!-- Narrow 模式（2-3 队订阅） -->
    <div v-else class="narrow-body">
      <header class="narrow-header">
        <span class="tag">订阅主队</span>
        <span class="league">{{ subscription.league.toUpperCase() }}</span>
        <h3 class="team-name" @click="goTeam">{{ displayName(subscription.teamName) }}</h3>
      </header>
      <div v-if="todayMatch" class="today-mini">
        <div class="today-meta">今日 · {{ formatKickoff(todayMatch.date) }}</div>
        <div class="mini-matchup">
          <span class="mini-side left">{{ displayName(todayMatch.home.name) }}</span>
          <span class="vs-text">VS</span>
          <span class="mini-side right">{{ displayName(todayMatch.away.name) }}</span>
        </div>
        <div class="kickoff">{{ formatKickoffTime(todayMatch.date) }}</div>
      </div>
      <div v-else-if="nextMatch" class="today-mini">
        <div class="today-meta">下场 · {{ formatKickoff(nextMatch.date) }}</div>
        <div class="mini-matchup">
          <span class="mini-side left">{{ displayName(nextMatch.home.name) }}</span>
          <span class="vs-text">VS</span>
          <span class="mini-side right">{{ displayName(nextMatch.away.name) }}</span>
        </div>
        <div class="kickoff">{{ formatKickoffTime(nextMatch.date) }}</div>
      </div>
      <div v-else class="today-mini"><div class="today-meta">赛季已结束</div></div>

      <div class="section-label">最近 3 场</div>
      <div v-for="m in recentMatches" :key="m.eventId" class="vs-row">
        <div class="vs-side home">
          <span :class="m.home.id === subscription.teamId ? 'name mine' : 'name opp'">{{ displayName(m.home.name) }}</span>
        </div>
        <div>
          <div :class="`vs-score ${matchTone(m)}`">{{ scoreLine(m) }}</div>
          <div class="vs-date">{{ formatDateShort(m.date) }}</div>
        </div>
        <div class="vs-side away">
          <span :class="m.away.id === subscription.teamId ? 'name mine' : 'name opp'">{{ displayName(m.away.name) }}</span>
        </div>
      </div>

      <div v-if="injuries.length" class="inj-bar">
        <span class="inj-label">伤员</span>{{ injuries.join(' · ') }}
      </div>
    </div>
  </article>
</template>
```

- [ ] **Step 2: 加 helper 函数到 script setup**

在 Task 2 的 script setup 末尾（紧邻 `formatCountdown` 函数后）追加：

```ts
function formatKickoff(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm} 北京`
}

function formatKickoffTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm} UTC`
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatDateLong(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}/${d.getDate()} · ${weekdays[d.getDay()]} ${hh}:${mm}`
}
```

- [ ] **Step 3: 加 `<style scoped>` 块承载所有 class**

在文件末尾追加（`</template>` 后）：

```vue
<style scoped>
.wide-card, .narrow-card {
  background: linear-gradient(180deg, color-mix(in srgb, var(--team-color) 16%, #10152a), #10152a);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.narrow-card { border-radius: 12px; }

/* === Wide === */
.wide-body { display: flex; flex-direction: column; }
.wide-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 24px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--team-color) 25%, transparent);
}
.tag {
  border: 1px solid color-mix(in srgb, var(--team-color) 60%, transparent);
  color: color-mix(in srgb, var(--team-color) 75%, white);
  padding: 3px 10px; border-radius: 4px;
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  letter-spacing: 0.22em; text-transform: uppercase;
}
.league {
  font-family: var(--font-mono-d, monospace); font-size: 11px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.18em;
}
.team-name {
  font-family: var(--font-cond, sans-serif);
  font-size: 32px; letter-spacing: 0.02em;
  color: #fff; cursor: pointer; margin: 0;
}
.narrow-card .team-name { font-size: 22px; margin-left: auto; }
.rank-badge {
  margin-left: auto;
  background: color-mix(in srgb, var(--team-color) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--team-color) 45%, transparent);
  border-radius: 6px; padding: 6px 12px;
  font-family: var(--font-cond, sans-serif);
  display: flex; align-items: baseline; gap: 6px;
}
.rank-badge .num { font-size: 22px; color: #fff; }
.rank-badge .of { font-size: 11px; color: var(--slate-400, #94a3b8); letter-spacing: 0.12em; }

.wide-grid {
  display: grid; grid-template-columns: 1.5fr 1fr 1.1fr;
  gap: 16px; padding: 16px 24px 0;
}
@media (max-width: 980px) { .wide-grid { grid-template-columns: 1fr; } }

.hero-block {
  background: rgba(0,0,0,0.32);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 10px; padding: 14px 16px;
}
.hero-meta {
  font-family: var(--font-mono-d, monospace); font-size: 10px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.22em; text-transform: uppercase;
}
.live-dot, .next-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  margin-right: 6px; vertical-align: middle;
}
.live-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
.live-dot.live { background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: pulse 1.2s ease-in-out infinite; }
.next-dot { background: var(--team-color); }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.hero-matchup {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 10px; margin-top: 10px;
}
.hero-side { display: flex; align-items: center; gap: 10px; }
.hero-side.left { justify-content: flex-end; }
.hero-side.right { justify-content: flex-start; }
.hero-abbr { font-family: var(--font-cond, sans-serif); font-size: 22px; letter-spacing: 0.04em; color: #fff; }
.hero-vs { font-family: var(--font-cond, sans-serif); font-size: 14px; color: var(--slate-500, #64748b); }
.kickoff-row {
  margin-top: 12px; padding-top: 10px;
  border-top: 1px dashed rgba(255,255,255,0.08);
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  font-family: var(--font-mono-d, monospace); font-size: 11px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.12em;
}
.kickoff-time { color: #fff; font-weight: 600; font-size: 13px; }
.countdown {
  font-family: var(--font-cond, sans-serif); font-size: 22px;
  color: var(--team-color); letter-spacing: 0.06em;
}
.venue-row {
  margin-top: 6px;
  font-family: var(--font-mono-d, monospace); font-size: 10px;
  color: var(--slate-500, #64748b); letter-spacing: 0.12em;
}

.section-label {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: var(--slate-500, #64748b); letter-spacing: 0.22em; text-transform: uppercase;
  margin-bottom: 6px;
}

/* === vs row（wide + narrow 共用）=== */
.vs-row {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(255,255,255,0.06);
  font-family: var(--font-cond, sans-serif);
}
.vs-row:last-child { border-bottom: 0; }
.vs-side { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 13px; letter-spacing: 0.04em; }
.vs-side.home { justify-content: flex-end; }
.vs-side.away { justify-content: flex-start; }
.vs-side .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vs-side .name.mine { color: #fff; font-weight: 600; }
.vs-side .name.opp { color: var(--slate-400, #94a3b8); }
.vs-score {
  font-family: var(--font-mono-d, monospace); font-size: 13px; font-weight: 500;
  padding: 0 6px; min-width: 40px; text-align: center;
}
.vs-score.w { color: #10b981; }
.vs-score.d { color: #cbd5e1; }
.vs-score.l { color: #ef4444; }
.vs-score.none { color: var(--slate-400, #94a3b8); }
.vs-date {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: var(--slate-600, #475569); letter-spacing: 0.12em; text-align: center; margin-top: 1px;
}
.narrow-card .vs-side { font-size: 12px; }
.narrow-card .vs-score { font-size: 11px; }

/* === stats === */
.wdl {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
  font-family: var(--font-mono-d, monospace);
}
.wdl-cell {
  background: rgba(255,255,255,0.03); border-radius: 4px; padding: 6px 8px;
  border: 1px solid rgba(255,255,255,0.04);
}
.wdl-label { font-size: 9px; color: var(--slate-500, #64748b); letter-spacing: 0.18em; }
.wdl-val { font-size: 16px; font-weight: 600; margin-top: 2px; color: #fff; }
.wdl-w .wdl-val { color: #10b981; }
.wdl-d .wdl-val { color: #cbd5e1; }
.wdl-l .wdl-val { color: #ef4444; }
.wdl-skeleton { color: var(--slate-600, #475569); padding: 8px; }
.points-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-top: 8px; padding: 6px 8px;
  background: color-mix(in srgb, var(--team-color) 10%, transparent);
  border-radius: 4px;
}
.points-label { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-400, #94a3b8); letter-spacing: 0.18em; text-transform: uppercase; }
.points-val { font-family: var(--font-cond, sans-serif); font-size: 22px; color: var(--team-color); }
.form-row { margin-top: 10px; }
.form-pills { display: flex; gap: 4px; }
.pill {
  width: 22px; height: 22px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono-d, monospace); font-size: 11px; font-weight: 600;
}
.pill.w { background: rgba(16,185,129,0.18); color: #10b981; }
.pill.d { background: rgba(148,163,184,0.15); color: #cbd5e1; }
.pill.l { background: rgba(239,68,68,0.18); color: #ef4444; }
.gf-ga {
  margin-top: 10px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  font-family: var(--font-mono-d, monospace); font-size: 11px;
}
.gf-ga-cell {
  background: rgba(255,255,255,0.03); padding: 6px 8px; border-radius: 4px;
  display: flex; justify-content: space-between; align-items: baseline;
}
.gf-ga-label { color: var(--slate-500, #64748b); font-size: 9px; letter-spacing: 0.18em; }
.gf-ga-val { color: #fff; font-weight: 600; font-size: 14px; }

/* === wide footer === */
.wide-footer {
  margin: 14px 24px 18px; padding: 10px 14px;
  background: rgba(0,0,0,0.22); border-radius: 8px;
  display: grid; grid-template-columns: 1fr auto;
  gap: 12px; align-items: center;
  border: 1px solid rgba(255,255,255,0.05);
}
.inj-block {
  border-left: 3px solid #ef4444; padding-left: 10px;
  font-size: 12px; color: #fca5a5;
  display: flex; align-items: center; gap: 10px;
}
.inj-label {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: #ef4444; letter-spacing: 0.22em; text-transform: uppercase;
}
.next-game { text-align: right; font-family: var(--font-mono-d, monospace); }
.next-label { font-size: 9px; color: var(--slate-500, #64748b); letter-spacing: 0.22em; text-transform: uppercase; }
.next-match { font-family: var(--font-cond, sans-serif); font-size: 16px; color: #fff; letter-spacing: 0.04em; margin-top: 2px; }
.next-meta { font-size: 10px; color: var(--slate-400, #94a3b8); margin-top: 2px; letter-spacing: 0.12em; }

/* === narrow === */
.narrow-body { padding: 12px 14px 10px; display: flex; flex-direction: column; gap: 8px; }
.narrow-header { display: flex; align-items: center; gap: 8px; }
.today-mini {
  padding: 8px 10px;
  background: rgba(0,0,0,0.30);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 6px;
}
.today-meta { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-400, #94a3b8); letter-spacing: 0.18em; text-transform: uppercase; }
.mini-matchup { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 6px; margin-top: 4px; }
.mini-side { font-family: var(--font-cond, sans-serif); font-size: 14px; color: #fff; }
.mini-side.left { text-align: right; }
.vs-text { color: var(--slate-500, #64748b); font-size: 10px; font-family: var(--font-mono-d, monospace); text-align: center; }
.kickoff { font-family: var(--font-cond, sans-serif); font-size: 14px; color: var(--team-color); text-align: center; margin-top: 2px; }
.inj-bar {
  padding: 5px 8px;
  border-left: 2px solid #ef4444;
  background: rgba(239,68,68,0.06);
  font-size: 10px; color: #fca5a5;
}
</style>
```

- [ ] **Step 4: 跑测试确认全部 pass**

```bash
npm test -- tests/components/MyTeamCard.test.ts
```

Expected: 9 测试全 PASS（旧 3 + 新 6）。

如果有 fail，根据 fail 信息修：常见是 `font-cond` / `font-mono-d` CSS var 未在测试环境定义（不影响测试），或 `app.leagueInfo` 未 mock（注入 teamsStore 后 `team` computed 不为空，`teamColor` 用 `team.color`，不依赖 leagueInfo）。

- [ ] **Step 5: 提交**

```bash
git add src/components/home/MyTeamCard.vue
git commit -m "feat: 重写 MyTeamCard—球队主色 + 1 队 wide 3 列 + 2-3 队 narrow + vs 格式"
```

---

## Task 4: HomeView 订阅区 wrapper 改 max-w-7xl

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: 找到订阅区 section**

```bash
# Grep "max-w-5xl mx-auto px-4 mb-4" src/views/HomeView.vue
```

定位 line。

- [ ] **Step 2: 改 `max-w-5xl` → `max-w-7xl`**

```vue
<!-- 改前 -->
<section v-if="userStore.initialized" class="max-w-5xl mx-auto px-4 mb-4">

<!-- 改后 -->
<section v-if="userStore.initialized" class="max-w-7xl mx-auto px-4 mb-4">
```

- [ ] **Step 3: 跑全量测试 + typecheck**

```bash
npm test && npm run typecheck
```

Expected: 138 单测全绿（无回归），typecheck 通过。

- [ ] **Step 4: 提交**

```bash
git add src/views/HomeView.vue
git commit -m "feat: HomeView 订阅区 max-w-5xl → max-w-7xl，给单卡更多横向空间"
```

---

## Task 5: 全量验收 + 浏览器手动复验

**Files:**
- 无文件修改

- [ ] **Step 1: 跑全量测试**

```bash
npm test
```

Expected: 138 单测全绿。

- [ ] **Step 2: 类型检查**

```bash
npm run typecheck
```

Expected: 无错误。

- [ ] **Step 3: 构建检查**

```bash
npm run build
```

Expected: dist 目录生成，无构建错误。

- [ ] **Step 4: 启动 dev server 手动验证**

```bash
npm run dev
```

打开 `http://localhost:5173/MatchLab/#/`，验证：

- [ ] 0 队订阅：显示 EmptyState 引导
- [ ] 1 队订阅（Arsenal）：wide 模式 3 列布局，含 rank badge + WDL + form pills + GF/GA
- [ ] 1 队订阅时卡片占满 `max-w-7xl` 宽度（不再居中堆窄）
- [ ] 2 队订阅：narrow 模式 2 列 grid，无 rank badge / WDL
- [ ] 3 队订阅：narrow 模式 3 列 grid
- [ ] 卡片背景渐变 = 球队品牌色（Arsenal 红 / Liverpool 暗红 / City 天蓝）
- [ ] 最近 3 场 vs 格式：主队（mine）白名加粗，对手（opp）灰显
- [ ] 比分 W 绿 / D 灰 / L 红
- [ ] 今日赛英雄区含开球时间 + 倒计时 + 球场
- [ ] footer 含伤员红条 + 下场预告
- [ ] 切换中/英语言：队名正确本地化
- [ ] 移动端（<980px）：1 队 wide 塌缩为纵向堆叠

- [ ] **Step 5: 关 dev server + 提交验收记录**

无文件改动需提交，跳过。

---

## 计划自检

**Spec 覆盖**：
- 设计目标 1 视觉一致 → Task 3 template + style
- 设计目标 2 球队主色驱动 → Task 2 `teamColor` computed + Task 3 `:style="{ '--team-color': teamColor }"`
- 设计目标 3 1 队拉宽信息丰富 → Task 3 wide-grid + stats-block
- 设计目标 4 2-3 队紧凑 → Task 3 narrow-body
- 设计目标 5 vs 格式定稿 → Task 3 vs-row + mine/opp class + score tone
- 设计目标 6 EmptyState 保留 → 不动（HomeView 现有 EmptyState 不变）
- 布局规则 1/2/3 列响应 → Task 3 wide-grid + narrow-body + Task 4 HomeView wrapper
- Header / 列 1 hero / 列 2 recent / 列 3 stats / Footer → Task 3 各 section
- 进行中比赛处理 → Task 2 `matchTone` 含 status='in' 逻辑（实际仅 post 算 tone，in/none 同）；Task 3 hero-meta 含 live-dot
- 球队名 i18n → Task 2 `displayName()` + Task 3 模板用 `displayName(...)`
- footer 下场预告数据树 → Task 2 `nextMatch` computed 含 today/无 today/赛季结束 分支
- 错误处理 → Task 2 try/catch + Task 3 v-if error 骨架
- 测试 9 项 → Task 1

**Placeholder 扫描**：无 TBD / TODO / "类似 Task N" / 未定义类型。

**类型一致性**：`teamColor` / `standing` / `layoutMode` / `isWide` / `matchTone` / `scoreLine` / `formatCountdown` 等命名一致；`StandingRow.form` 类型为 `FormResult[]`（'W'|'D'|'L'），Task 3 模板 `f.toLowerCase()` 输出 'w'/'d'/'l' 对应 `.pill.w/.d/.l` class。
