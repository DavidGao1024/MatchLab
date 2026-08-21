# 球队主页赛程页签 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 球队详情页新增「赛程」页签，展示该队整赛季比赛（上一场/下一场双卡 + 时间正序完整列表），本队名高亮 + 主/客角标。

**Architecture:** 复用现有赛程数据（按「联赛+月」存 JSON），在 matches store 新增 `loadTeamSchedule` 跨 10 个月过滤出单队赛程；`TeamSchedule` 组件渲染双卡 + 复用 `MatchList`；`MatchCard`/`MatchList` 加可选 `selfTeamId` 高亮本队。

**Tech Stack:** Vue 3 `<script setup>` + Pinia + TypeScript strict + Tailwind 4 + Vitest（`@vue/test-utils` + jsdom）。

**Spec:** `docs/superpowers/specs/2026-08-21-team-schedule-design.md`

**测试命令：**
- 单测：`npm test`（= `vitest run`）
- 类型：`npm run typecheck`（= `vue-tsc -b`）
- 构建：`npm run build`

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/stores/matches.ts` | 改 | 新增 `teamSchedules` 状态 + `loadTeamSchedule` action |
| `src/components/matches/MatchCard.vue` | 改 | 加可选 `selfTeamId`，本队高亮 + 主/客角标 |
| `src/components/matches/MatchList.vue` | 改 | 透传 `selfTeamId` |
| `src/components/teams/TeamSchedule.vue` | 新建 | 赛程页签内容：双卡 + 完整列表 |
| `src/views/TeamDetailView.vue` | 改 | 加页签栏 + 条件渲染赛程/阵容 |
| `src/utils/i18n.ts` | 改 | 新增 4 个 key |
| `tests/stores/matches.test.ts` | 新建 | store 测试 |
| `tests/components/matches/MatchCard.test.ts` | 新建 | MatchCard + MatchList 测试 |
| `tests/components/teams/TeamSchedule.test.ts` | 新建 | TeamSchedule 测试 |
| `tests/views/TeamDetailView.test.ts` | 改 | 放行 matches 请求 + 阵容测试切 tab + 新增 tab 测试 |

---

## Task 1: matches store 新增 `loadTeamSchedule`

**Files:**
- Create: `tests/stores/matches.test.ts`
- Modify: `src/stores/matches.ts`

- [ ] **Step 1: 写失败测试**

Create `tests/stores/matches.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMatchesStore } from '../../src/stores/matches'
import { clearScoreCache } from '../../src/composables/useEspanFetch'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const ok = (json: unknown) => Promise.resolve({ ok: true, json: async () => json })

function makeMatch(over: Record<string, unknown> = {}) {
  return {
    eventId: 'e1', date: '2025-08-16T14:00Z', status: 'pre', completed: false,
    venue: 'Stadium',
    home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: null, winner: null },
    away: { id: 100, name: 'Everton', abbreviation: 'EVE', logo: '', score: null, winner: null },
    ...over,
  }
}

/** 让某个月的静态 JSON 返回指定 matches，其余月份返回空 */
function mockMonth(month: string, matches: unknown[]) {
  mockFetch.mockImplementation((input) => {
    const url = String(input)
    if (url.includes(`matches/${month}.json`)) return ok({ matches })
    return ok({ matches: [] })
  })
}

beforeEach(() => {
  localStorage.clear()
  clearScoreCache()
  mockFetch.mockReset()
  setActivePinia(createPinia())
})

describe('loadTeamSchedule', () => {
  it('只保留该队主/客场比赛', async () => {
    const store = useMatchesStore()
    mockMonth('2025-08', [
      makeMatch({ eventId: 'ars-home', home: { id: 359, name: 'Arsenal' } }),
      makeMatch({ eventId: 'ars-away', date: '2025-08-20T14:00Z', home: { id: 100, name: 'Everton' }, away: { id: 359, name: 'Arsenal' } }),
      makeMatch({ eventId: 'other', home: { id: 100, name: 'Everton' }, away: { id: 200, name: 'Chelsea' } }),
    ])
    await store.loadTeamSchedule('eng.1', 359, '2025', 'european')
    const ids = store.teamSchedules['eng.1/359'].map((m) => m.eventId)
    expect(ids).toEqual(['ars-home', 'ars-away'])
  })

  it('按开球时间正序排列', async () => {
    const store = useMatchesStore()
    mockMonth('2025-08', [
      makeMatch({ eventId: 'late', date: '2025-08-30T14:00Z', home: { id: 359, name: 'Arsenal' } }),
      makeMatch({ eventId: 'early', date: '2025-08-10T14:00Z', home: { id: 359, name: 'Arsenal' } }),
    ])
    await store.loadTeamSchedule('eng.1', 359, '2025', 'european')
    const ids = store.teamSchedules['eng.1/359'].map((m) => m.eventId)
    expect(ids).toEqual(['early', 'late'])
  })

  it('单月加载失败不连坐其余月', async () => {
    const store = useMatchesStore()
    mockFetch.mockImplementation((input) => {
      const url = String(input)
      if (url.includes('matches/2025-08.json')) return Promise.reject(new Error('boom'))
      if (url.includes('matches/2025-09.json')) return ok({ matches: [makeMatch({ eventId: 'sep', home: { id: 359, name: 'Arsenal' } })] })
      return ok({ matches: [] })
    })
    await store.loadTeamSchedule('eng.1', 359, '2025', 'european')
    const ids = store.teamSchedules['eng.1/359'].map((m) => m.eventId)
    expect(ids).toEqual(['sep'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/stores/matches.test.ts`
Expected: FAIL——`store.loadTeamSchedule is not a function`

- [ ] **Step 3: 实现 store**

Modify `src/stores/matches.ts`：

① import 行加 `seasonMonths`（第 6 行）：

```ts
import { currentMonth, seasonMonths, type LeagueSlug } from '../utils/constants'
```

② state 里加 `teamSchedules`：

```ts
    timer: null as ReturnType<typeof setInterval> | null,
    teamSchedules: {} as Record<string, Match[]>, // key: `${league}/${teamId}`
```

③ actions 里，在 `key()` 方法之后加 `loadTeamSchedule`：

```ts
    key(league: LeagueSlug, month: string) {
      return `${league}/${month}`
    },
    /**
     * 加载某队整赛季赛程：跨季度 10 个月并行拉取，过滤出该队主/客场，按开球时间正序。
     * 不复用 loadMonth——它内置单月串行防过期计数（loadGen），并行调 10 次会互相丢数据。
     * 当月走直播直连（失败回落静态快照），其余月走静态 JSON；单月失败不连坐其余月。
     */
    async loadTeamSchedule(league: LeagueSlug, teamId: number, season: string, seasonType: 'european' | 'calendar' = 'european') {
      const k = `${league}/${teamId}`
      const months = seasonMonths(season, seasonType)
      const results = await Promise.all(months.map(async (m) => {
        if (m === currentMonth()) {
          try { return await fetchLiveScores(league, m) }
          catch { /* 直播失败 → 回落下面的静态快照 */ }
        }
        try {
          const f = await fetchJsonCached<MatchesFile>(`data/${league}/matches/${m}.json`, STATIC_TTL, season)
          return f.matches
        } catch { return [] } // 月文件不存在（休赛期当月等）→ 空
      }))
      this.teamSchedules[k] = results
        .flat()
        .filter((m) => m.home.id === teamId || m.away.id === teamId)
        .sort((a, b) => a.date.localeCompare(b.date))
    },
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/stores/matches.test.ts`
Expected: 3 passed

- [ ] **Step 5: 提交**

```bash
git add tests/stores/matches.test.ts src/stores/matches.ts
git commit -m "feat: matches store 新增按队加载整季赛程 loadTeamSchedule"
```

---

## Task 2: `MatchCard` 加 `selfTeamId`

**Files:**
- Create: `tests/components/matches/MatchCard.test.ts`
- Modify: `src/components/matches/MatchCard.vue`

- [ ] **Step 1: 写失败测试**

Create `tests/components/matches/MatchCard.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MatchCard from '../../../src/components/matches/MatchCard.vue'

const match = {
  eventId: 'e1', date: '2025-08-16T14:00Z', status: 'post', completed: true,
  venue: 'Emirates Stadium',
  home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: 2, winner: true },
  away: { id: 100, name: 'Everton', abbreviation: 'EVE', logo: '', score: 0, winner: false },
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('matchlab:lang', 'zh') // 中文角标"主/客"
  setActivePinia(createPinia())
})

describe('MatchCard selfTeamId', () => {
  it('不传 selfTeamId：无主客角标', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1' } })
    expect(w.text()).not.toContain('主')
    expect(w.text()).not.toContain('客')
  })

  it('selfTeamId=主队：本队名旁有"主"角标，无"客"', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1', selfTeamId: 359 } })
    expect(w.text()).toContain('主')
    expect(w.text()).not.toContain('客')
  })

  it('selfTeamId=客队：本队名旁有"客"角标，无"主"', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1', selfTeamId: 100 } })
    expect(w.text()).toContain('客')
    expect(w.text()).not.toContain('主')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/matches/MatchCard.test.ts`
Expected: FAIL——找不到「主/客」角标

- [ ] **Step 3: 实现**

Modify `src/components/matches/MatchCard.vue`：

① props 加 `selfTeamId`（第 13 行）：

```ts
const props = withDefaults(defineProps<{ match: Match; league: LeagueSlug; featured?: boolean; selfTeamId?: number }>(), { featured: false, selfTeamId: undefined })
```

② 加本队判定（`tone` computed 之后）：

```ts
const isSelf = (side: 'home' | 'away') =>
  props.selfTeamId != null && props.match[side].id === props.selfTeamId
const selfColor = 'var(--accent, var(--league-color))'
```

③ 主队名块（template 内，改写主队 flex 内层——在原 `<span ...>{{ teamName(match.home.name, app.lang) }}</span>` 与 `<TeamLogo>` 之间插角标、给名字加高亮）：

```html
      <div class="flex min-w-0 items-center justify-end gap-2.5">
        <span
          class="truncate font-cond text-[13px]"
          :class="isSelf('home') ? 'font-bold' : NAME_CLS[tone.home]"
          :style="isSelf('home') ? { color: selfColor } : undefined"
        >{{ teamName(match.home.name, app.lang) }}</span>
        <span
          v-if="isSelf('home')"
          class="rounded px-1 py-px font-cond text-[9px] font-semibold text-[#0b0f1a]"
          :style="{ background: selfColor }"
        >{{ t('team.ha.home', app.lang) }}</span>
        <TeamLogo :team="homeTeam" :size="18" />
      </div>
```

④ 客队名块：

```html
      <div class="flex min-w-0 items-center gap-2.5">
        <TeamLogo :team="awayTeam" :size="18" />
        <span
          v-if="isSelf('away')"
          class="rounded px-1 py-px font-cond text-[9px] font-semibold text-[#0b0f1a]"
          :style="{ background: selfColor }"
        >{{ t('team.ha.away', app.lang) }}</span>
        <span
          class="truncate font-cond text-[13px]"
          :class="isSelf('away') ? 'font-bold' : NAME_CLS[tone.away]"
          :style="isSelf('away') ? { color: selfColor } : undefined"
        >{{ teamName(match.away.name, app.lang) }}</span>
      </div>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/matches/MatchCard.test.ts`
Expected: 3 passed

- [ ] **Step 5: 提交**

```bash
git add tests/components/matches/MatchCard.test.ts src/components/matches/MatchCard.vue
git commit -m "feat: MatchCard 支持 selfTeamId 本队高亮 + 主客角标"
```

---

## Task 3: `MatchList` 透传 `selfTeamId`

**Files:**
- Modify: `src/components/matches/MatchList.vue`
- Modify: `tests/components/matches/MatchCard.test.ts`（追加透传测试）

- [ ] **Step 1: 写失败测试**

在 `tests/components/matches/MatchCard.test.ts` 顶部 import 加 `MatchList`，并追加 describe：

```ts
import MatchList from '../../../src/components/matches/MatchList.vue'

describe('MatchList 透传 selfTeamId', () => {
  it('列表内本队名带"主"角标', () => {
    const w = mount(MatchList, { props: { matches: [match], league: 'eng.1', selfTeamId: 359 } })
    expect(w.text()).toContain('主')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/matches/MatchCard.test.ts`
Expected: FAIL——MatchList 未透传，无角标

- [ ] **Step 3: 实现**

Modify `src/components/matches/MatchList.vue`：

① props 加 `selfTeamId`（第 10 行）：

```ts
const props = defineProps<{ matches: Match[]; league: LeagueSlug; selfTeamId?: number }>()
```

② MatchCard 传 `self-team-id`（第 33-41 行的 `<MatchCard ...>`）：

```html
      <MatchCard
        v-for="(m, mi) in g.matches"
        :key="m.eventId"
        :match="m"
        :league="league"
        :self-team-id="selfTeamId"
        class="rise-in"
        :style="{ animationDelay: `${Math.min(gi * 60 + mi * 40, 400)}ms` }"
      />
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/matches/MatchCard.test.ts`
Expected: 4 passed

- [ ] **Step 5: 提交**

```bash
git add src/components/matches/MatchList.vue tests/components/matches/MatchCard.test.ts
git commit -m "feat: MatchList 透传 selfTeamId 支持球队视角列表"
```

---

## Task 4: 新组件 `TeamSchedule`

**Files:**
- Create: `tests/components/teams/TeamSchedule.test.ts`
- Create: `src/components/teams/TeamSchedule.vue`

- [ ] **Step 1: 写失败测试**

Create `tests/components/teams/TeamSchedule.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TeamSchedule from '../../../src/components/teams/TeamSchedule.vue'
import { useMatchesStore } from '../../../src/stores/matches'
import { clearScoreCache } from '../../../src/composables/useEspanFetch'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any
const ok = (json: unknown) => Promise.resolve({ ok: true, json: async () => json })

function makeMatch(over: Record<string, unknown> = {}) {
  return {
    eventId: 'e1', date: '2025-08-16T14:00Z', status: 'pre', completed: false,
    venue: 'Stadium',
    home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: null, winner: null },
    away: { id: 100, name: 'Everton', abbreviation: 'EVE', logo: '', score: null, winner: null },
    ...over,
  }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('matchlab:lang', 'zh')
  clearScoreCache()
  setActivePinia(createPinia())
})

function mockAug(matches: unknown[]) {
  mockFetch.mockImplementation((input) => {
    const url = String(input)
    if (url.includes('matches/2025-08.json')) return ok({ matches })
    return ok({ matches: [] })
  })
}

async function setup(matches: unknown[]) {
  mockAug(matches)
  const w = mount(TeamSchedule, { props: { league: 'eng.1', teamId: 359 } })
  await flushPromises()
  return w
}

describe('TeamSchedule', () => {
  it('渲染双卡：上一场结果 + 下一场', async () => {
    const w = await setup([
      makeMatch({ eventId: 'last', date: '2025-08-10T14:00Z', status: 'post', completed: true, home: { id: 359, name: 'Arsenal', score: 2, winner: true }, away: { id: 100, name: 'Everton', score: 0, winner: false } }),
      makeMatch({ eventId: 'next', date: '2025-08-20T14:00Z', home: { id: 100, name: 'Everton' }, away: { id: 359, name: 'Arsenal' } }),
    ])
    expect(w.text()).toContain('上一场')
    expect(w.text()).toContain('下一场')
  })

  it('整季空赛程显示空态文案', async () => {
    const w = await setup([])
    expect(w.text()).toContain('暂无') // schedule.noMatches 中文前缀
  })

  it('单场（仅已赛）不渲染"下一场"卡', async () => {
    const w = await setup([
      makeMatch({ eventId: 'only', status: 'post', completed: true, home: { id: 359, name: 'Arsenal', score: 1, winner: true }, away: { id: 100, name: 'Everton', score: 0, winner: false } }),
    ])
    expect(w.text()).toContain('上一场')
    expect(w.text()).not.toContain('下一场')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/teams/TeamSchedule.test.ts`
Expected: FAIL——`Cannot find module .../TeamSchedule.vue`

- [ ] **Step 3: 实现组件**

Create `src/components/teams/TeamSchedule.vue`：

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import MatchCard from '../matches/MatchCard.vue'
import MatchList from '../matches/MatchList.vue'
import DataError from '../common/DataError.vue'
import DataLoading from '../common/DataLoading.vue'
import { useAppStore } from '../../stores/app'
import { useMatchesStore } from '../../stores/matches'
import type { LeagueSlug } from '../../utils/constants'
import { t } from '../../utils/i18n'

const props = defineProps<{ league: LeagueSlug; teamId: number }>()
const app = useAppStore()
const store = useMatchesStore()

const season = computed(() => app.leagueInfo(props.league)?.season ?? '2025')
const seasonType = computed(() => app.leagueInfo(props.league)?.seasonType ?? 'european')

const seq = ref(0)
const error = ref('')
const loading = ref(false)

async function load() {
  const my = ++seq.value
  error.value = ''
  loading.value = true
  try {
    await store.loadTeamSchedule(props.league, props.teamId, season.value, seasonType.value)
    if (seq.value !== my) return
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq.value === my) loading.value = false
  }
}

onMounted(load)
// 必须 watch season/seasonType：app.leagues 由 App.vue 异步加载，深链时先 fallback 后修正
watch([() => props.league, () => props.teamId, season, seasonType], load)

const schedule = computed(() => store.teamSchedules[`${props.league}/${props.teamId}`] ?? [])

// schedule 已按 date 正序：最后一场已赛 = 上一场；第一场未赛 = 下一场
const lastResult = computed(() => schedule.value.filter((m) => m.status === 'post').slice(-1)[0])
const nextMatch = computed(() => schedule.value.find((m) => m.status !== 'post'))
</script>

<template>
  <DataError v-if="error" :message="error" @retry="load" />
  <DataLoading v-else-if="loading" kind="cards" />
  <div v-else-if="schedule.length === 0" class="my-10 text-center text-sm text-slate-500">
    {{ t('schedule.noMatches', app.lang) }}
  </div>
  <template v-else>
    <!-- 双卡：上一场 / 下一场 -->
    <div class="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div v-if="lastResult" class="rounded-lg border border-white/10 bg-[#131a2b] p-3">
        <div class="mb-2 font-cond text-[10px] uppercase tracking-[0.14em] text-slate-500">
          {{ t('team.lastMatch', app.lang) }}
        </div>
        <MatchCard :match="lastResult" :league="league" :self-team-id="teamId" />
      </div>
      <div
        v-if="nextMatch"
        class="rounded-lg border border-white/10 bg-[#131a2b] p-3"
        :style="{ borderLeftWidth: '3px', borderLeftColor: 'var(--accent, var(--league-color))' }"
      >
        <div
          class="mb-2 font-cond text-[10px] uppercase tracking-[0.14em]"
          :style="{ color: 'var(--accent, var(--league-color))' }"
        >
          {{ t('team.nextMatch', app.lang) }}
        </div>
        <MatchCard :match="nextMatch" :league="league" :self-team-id="teamId" />
      </div>
    </div>

    <!-- 完整列表（含双卡那两场，双卡仅作摘要） -->
    <MatchList :matches="schedule" :league="league" :self-team-id="teamId" />
  </template>
</template>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/teams/TeamSchedule.test.ts`
Expected: 3 passed

- [ ] **Step 5: 提交**

```bash
git add tests/components/teams/TeamSchedule.test.ts src/components/teams/TeamSchedule.vue
git commit -m "feat: 球队赛程组件 TeamSchedule——双卡置顶 + 整季正序列表"
```

---

## Task 5: i18n + `TeamDetailView` 页签集成 + 更新现有测试

**Files:**
- Modify: `src/utils/i18n.ts`
- Modify: `src/views/TeamDetailView.vue`
- Modify: `tests/views/TeamDetailView.test.ts`

- [x] **Step 1: i18n key（已在 Task 2 前提前完成）**

4 个 key（`team.lastMatch` / `team.nextMatch` / `team.ha.home` / `team.ha.away`）已提前加入 `src/utils/i18n.ts`——Task 2/4 的组件与测试依赖这些文案，原计划排在 Task 5 会导致 Task 2 测试断言失败，故执行时前移。本步骤跳过。

- [ ] **Step 2: 改造 `TeamDetailView`**

Modify `src/views/TeamDetailView.vue`：

① import 加 `TeamSchedule`（第 7 行 TeamSquad import 之后）：

```ts
import TeamSchedule from '../components/teams/TeamSchedule.vue'
```

② 加 tab 状态（`squad` computed 之后）：

```ts
const tab = ref<'schedule' | 'squad'>('schedule')
```

③ 战绩格之后、阵容之前，插入页签栏 + 条件渲染（替换原「阵容（按位置分组）」整块）：

```html
      <!-- 页签栏：赛程 / 阵容 -->
      <div class="mt-6 flex gap-6 border-b border-white/10">
        <button
          type="button"
          class="pb-2 font-cond text-lg tracking-[0.05em]"
          :class="tab === 'schedule' ? 'border-b-2 font-bold text-white' : 'text-slate-500'"
          :style="tab === 'schedule' ? { borderColor: 'var(--accent)' } : undefined"
          data-tab="schedule"
          @click="tab = 'schedule'"
        >{{ t('nav.schedule', app.lang) }}</button>
        <button
          type="button"
          class="pb-2 font-cond text-lg tracking-[0.05em]"
          :class="tab === 'squad' ? 'border-b-2 font-bold text-white' : 'text-slate-500'"
          :style="tab === 'squad' ? { borderColor: 'var(--accent)' } : undefined"
          data-tab="squad"
          @click="tab = 'squad'"
        >{{ t('team.squad', app.lang) }} ({{ squad.length }})</button>
      </div>

      <!-- 赛程页签 -->
      <TeamSchedule v-if="tab === 'schedule'" :league="league" :team-id="teamId" />

      <!-- 阵容页签 -->
      <div v-else class="mt-6">
        <h2 class="squad-title">
          {{ t('team.squad', app.lang) }}
          <span class="squad-count">({{ squad.length }})</span>
        </h2>
        <TeamSquad :players="squad" :league="league" />
      </div>
```

- [ ] **Step 3: 更新现有测试（放行赛程请求 + 阵容测试切 tab）**

Modify `tests/views/TeamDetailView.test.ts`：

① mockFetch 放行 `/matches/`：

```ts
const mockFetch = vi.fn((input: unknown) => {
  const url = String(input)
  if (url.includes('team-values.json')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ teams: {} }) })
  }
  if (url.includes('/matches/')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches: [] }) })
  }
  return Promise.reject(new Error('no fetch expected'))
})
```

② 「基本盘」断言放宽：

```ts
    const urls = mockFetch.mock.calls.map((c) => String(c[0]))
    expect(urls.every((u) => u.includes('team-values.json') || u.includes('/matches/'))).toBe(true)
```

③ 三个阵容相关测试切到 squad tab——在断言前加一句点击：

```ts
  it('阵容总标题挂 squad-title', async () => {
    const w = await setup(makeTeam(), [makePlayer()])
    await w.find('[data-tab="squad"]').trigger('click')
    expect(w.find('.squad-title').exists()).toBe(true)
  })

  it('位置分组小标题吃到 --accent', async () => {
    const w = await setup(makeTeam(), [makePlayer()])
    await w.find('[data-tab="squad"]').trigger('click')
    const h3 = w.find('h3')
    expect(h3.exists()).toBe(true)
    expect(h3.attributes('style') ?? '').toContain('var(--accent')
  })

  it('阵容球员有国籍时名字前渲染国旗', async () => {
    const w = await setup(makeTeam(), [makePlayer({ citizenship: 'England', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/eng.png' })])
    await w.find('[data-tab="squad"]').trigger('click')
    const img = w.find('img[src*="eng.png"]')
    ...
  })
```

- [ ] **Step 4: 新增 tab 测试（追加到 TeamDetailView.test.ts）**

```ts
describe('球队详情页·赛程页签', () => {
  it('默认停在赛程页签，赛程空态可见', async () => {
    const w = await setup(makeTeam())
    // 默认 schedule tab：TeamSchedule 空态文案（英文模式）
    expect(w.text()).toContain('No league matches')
  })

  it('点击阵容页签切到阵容，赛程区隐藏', async () => {
    const w = await setup(makeTeam(), [makePlayer()])
    await w.find('[data-tab="squad"]').trigger('click')
    expect(w.find('.squad-title').exists()).toBe(true)
    expect(w.text()).not.toContain('No league matches')
  })
})
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run tests/views/TeamDetailView.test.ts`
Expected: 全部通过（原 7 项 + 新增 2 项）

- [ ] **Step 6: 提交**

```bash
git add src/utils/i18n.ts src/views/TeamDetailView.vue tests/views/TeamDetailView.test.ts
git commit -m "feat: 球队主页赛程页签——tab 切换默认赛程 + i18n + 现有测试回归更新"
```

---

## Task 6: 全量验证

- [ ] **Step 1: 全量单测**

Run: `npm test`
Expected: 全部通过（原约 290 项 + 新增约 13 项）

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck`
Expected: 通过，无类型错误

- [ ] **Step 3: 构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: 手动验证（需浏览器，经总司令许可后执行）**

`npm run dev` 起本地服务，进某队详情页验证：
1. 默认显示「赛程」页签，该队整赛季时间正序
2. 顶部双卡正确显示上一场结果与下一场，对阵双方同行 + 队徽 + 本队高亮 + 主/客角标
3. 点「阵容」页签切回原阵容，无回归
4. 375px 移动端无溢出、双卡可读

---

## Self-Review 记录

- **Spec 覆盖**：需求 5 条 → Task 1（数据）、Task 4（双卡+列表）、Task 2/3（本队高亮+角标）、Task 5（页签默认赛程）；移动端（Task 4 双卡 `md:grid-cols-2`、MatchList 既有响应式）；错误空态（Task 4 DataError/DataLoading/空态）；测试（各 Task 自带）；i18n（Task 5）。全部覆盖。
- **占位符**：无 TBD/TODO，每个步骤含完整代码与命令。
- **类型一致**：`loadTeamSchedule(league, teamId, season, seasonType)` 签名全程一致；store key `${league}/${teamId}` 与 TeamSchedule 取数 `${props.league}/${props.teamId}` 一致；prop 名 `selfTeamId`（模板 `self-team-id`）在 MatchCard/MatchList/TeamSchedule 三处一致。