# 移动端卡片化第二批实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收藏夹页重写为全站统一暗色单行卡风格（含联赛徽章/队徽/紧凑动作钮），其余四页 375px 复查只修真问题。

**Architecture:** 新增收藏行卡组件 FavoriteRowCard（球队/球员两种条目 + 无编号降级渲染），内嵌导出日历按钮的紧凑变体；FavoritesView 单 DOM 整体重写；队徽取数直连球队档案库 `ensure()`（绕开会设置"当前联赛"的 `ensureLeague`），尽力而为 + 首字圆牌兜底。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript strict + Pinia + Tailwind 4 + Vitest + @vue/test-utils（jsdom）

**规格依据:** `docs/superpowers/specs/2026-08-11-mobile-cards-batch2-design.md`（下称 spec）
**样式依据:** `tmp/mockup/favorites-batch2.html`
**红线（总司令面授 + spec §一）:** 不影响现有其他功能——清单外文件字节不改；数据存取/路由/抓取链路不动；不许新增硬编码文案。
**基线提交:** `3befdce`（spec 自查修正）。收尾红线核验用它做 diff 基准。
**提交约定:** 只 `git add` 本计划列明的代码路径，**严禁 `git add public/data/`**（与每日数据工作流撞冲突，见 CLAUDE.md 数据提交约定）。

---

### Task 1: 导出日历按钮紧凑变体 + i18n 短文案键

**Files:**
- Modify: `src/utils/i18n.ts`（`cal.export` 键所在块之后插一行）
- Modify: `src/components/teams/ExportCalendarButton.vue`
- Test: `tests/components/ExportCalendarButton.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/components/ExportCalendarButton.test.ts` 的 `describe('ExportCalendarButton', ...)` 块末尾追加两个用例：

```ts
  it('compact 变体：短文案日历 + 导出逻辑不变', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
    const w = mount(ExportCalendarButton, {
      props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025, compact: true },
    })
    expect(w.text()).toContain('日历')
    expect(w.text()).not.toContain('导出赛程到日历')
    await w.find('button').trigger('click')
    await flushPromises()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
  it('compact 变体英文模式：iCal', async () => {
    localStorage.setItem('matchlab:lang', 'en')
    const w = mount(ExportCalendarButton, {
      props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025, compact: true },
    })
    expect(w.text()).toContain('iCal')
    expect(w.text()).not.toContain('日历')
  })
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/ExportCalendarButton.test.ts`
Expected: FAIL——新用例报 `compact` 未知 prop / 文案不含「日历」（键不存在时 `t()` 原样返回键名 `cal.exportShort`）。原有 4 项仍 PASS。

- [ ] **Step 3: 加 i18n 键**

`src/utils/i18n.ts` 中 `'cal.export'` 那一行（现约 235 行）**之后**插入一行：

```ts
  'cal.exportShort': { zh: '日历', en: 'iCal' },
```

- [ ] **Step 4: 实现紧凑变体**

`src/components/teams/ExportCalendarButton.vue` 改两处：

props 定义换成（新增 `compact`，其余原样）：

```ts
const props = withDefaults(defineProps<{
  league: LeagueSlug
  teamId: number
  teamName: string
  teamSlug: string
  seasonStart: number
  /** 紧凑变体：收藏行等窄行用，短文案 + 紧凑样式；导出逻辑完全一致 */
  compact?: boolean
}>(), { compact: false })
```

按钮模板换成（默认分支的类名字符串与原文件**逐字一致**，球队详情页不受影响）：

```vue
  <button
    type="button"
    :class="compact
      ? 'flex-none rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
      : 'px-3 py-1.5 rounded text-sm bg-slate-700 text-white hover:opacity-80 disabled:opacity-50'"
    :disabled="loading || store.readOnly"
    @click="onExport"
  >
    {{ loading ? (compact ? '…' : t('cal.exporting', app.lang)) : (compact ? t('cal.exportShort', app.lang) : t('cal.export', app.lang)) }}
  </button>
```

注意：`<script setup>` 其余部分（onExport 全部逻辑、store、toast）**一行不动**。原模板里 `props.` 前缀若原本没写就不要引入——保持原风格。

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run tests/components/ExportCalendarButton.test.ts`
Expected: PASS，6 项全绿（原 4 + 新 2）。

- [ ] **Step 6: 提交**

```bash
git add src/utils/i18n.ts src/components/teams/ExportCalendarButton.vue tests/components/ExportCalendarButton.test.ts
git commit -m "feat: 导出日历按钮紧凑变体——短文案日历/iCal，默认外观与导出逻辑不变"
```

---

### Task 2: 收藏行卡组件 FavoriteRowCard

**Files:**
- Create: `src/components/favorites/FavoriteRowCard.vue`
- Test: `tests/components/FavoriteRowCard.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/components/FavoriteRowCard.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FavoriteRowCard from '../../src/components/favorites/FavoriteRowCard.vue'
import { useAppStore } from '../../src/stores/app'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'
import type { LeagueInfo, Team } from '../../src/types/models'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  __resetToast()
  __resetConfirm()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeInfo(over: Partial<LeagueInfo> = {}): LeagueInfo {
  return {
    slug: 'eng.1', name: 'Premier League', nameZh: '英超', country: 'England',
    color: '#3D195B', understatSlug: 'EPL', season: '2025', teams: 20, players: 500,
    ...over,
  }
}

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
    color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
    ...over,
  }
}

describe('FavoriteRowCard', () => {
  it('球队行：名字/联赛徽章/日历钮/删除钮齐全', () => {
    useAppStore().leagues = [makeInfo()]
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1', teamId: 359, team: makeTeam() },
    })
    expect(w.text()).toContain('阿森纳')
    expect(w.text()).toContain('英超')
    expect(w.text()).toContain('日历')
    expect(w.text()).toContain('删除')
  })
  it('球队行：名字点击 emit go，删除点击 emit remove', async () => {
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1', teamId: 359 },
    })
    await w.findAll('button').find((b) => b.text().includes('阿森纳'))!.trigger('click')
    expect(w.emitted('go')).toHaveLength(1)
    await w.findAll('button').find((b) => b.text().includes('删除'))!.trigger('click')
    expect(w.emitted('remove')).toHaveLength(1)
  })
  it('球员行：星标圆牌 + 译名，无日历钮', () => {
    const w = mount(FavoriteRowCard, {
      props: { kind: 'player', name: 'Erling Haaland', league: 'eng.1', athleteId: 253989 },
    })
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('★')
    expect(w.text()).toContain('删除')
    expect(w.text()).not.toContain('日历')
  })
  it('无编号遗留条目：无按钮、名字纯文本', () => {
    useAppStore().leagues = [makeInfo()]
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1' },
    })
    expect(w.findAll('button')).toHaveLength(0)
    expect(w.text()).toContain('阿森纳')
    expect(w.text()).toContain('英超')
  })
  it('球队无档案：联赛色首字圆牌兜底', () => {
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1', teamId: 359 },
    })
    // 未传 team → 兜底圆牌显示译名首字「阿」
    expect(w.text()).toContain('阿')
  })
  it('英文模式：全无中文残留', () => {
    localStorage.setItem('matchlab:lang', 'en')
    useAppStore().leagues = [makeInfo()]
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1', teamId: 359, team: makeTeam() },
    })
    expect(w.text()).toContain('Arsenal')
    expect(w.text()).toContain('Premier League')
    expect(w.text()).toContain('iCal')
    expect(w.text()).toContain('Remove')
    expect(w.text()).not.toContain('阿森纳')
    expect(w.text()).not.toContain('英超')
    expect(w.text()).not.toContain('日历')
    expect(w.text()).not.toContain('删除')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/FavoriteRowCard.test.ts`
Expected: FAIL——组件文件不存在，导入报错。

- [ ] **Step 3: 实现组件**

新建 `src/components/favorites/FavoriteRowCard.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../../stores/app'
import { playerName, teamName, t } from '../../utils/i18n'
import type { LeagueSlug } from '../../utils/constants'
import type { Team } from '../../types/models'
import TeamLogo from '../common/TeamLogo.vue'
import ExportCalendarButton from '../teams/ExportCalendarButton.vue'

const props = defineProps<{
  kind: 'team' | 'player'
  name: string
  league: LeagueSlug
  teamId?: number      // 缺 → 无编号遗留条目，降级渲染（无按钮、不可跳转）
  athleteId?: number   // 同上（球员）
  team?: Team          // 已解析的球队档案；缺省 → 首字圆牌兜底
}>()
const emit = defineEmits<{ go: []; remove: [] }>()

const app = useAppStore()

// 编号有无决定按钮与跳转能力（spec §三「无编号遗留条目」）
const hasId = computed(() =>
  props.kind === 'team' ? props.teamId !== undefined : props.athleteId !== undefined,
)
const display = computed(() =>
  props.kind === 'team' ? teamName(props.name, app.lang) : playerName(props.name, app.lang),
)
const info = computed(() => app.leagueInfo(props.league))
const leagueColor = computed(() => info.value?.color ?? '#3D195B')
const leagueLabel = computed(() =>
  app.lang === 'zh' ? (info.value?.nameZh ?? props.league) : (info.value?.name ?? props.league),
)
const initials = computed(() => teamName(props.name, app.lang).charAt(0) || '?')
const chipStyle = computed(() => ({
  background: `color-mix(in srgb, ${leagueColor.value} 30%, transparent)`,
  color: `color-mix(in srgb, ${leagueColor.value} 60%, white)`,
}))

// 紧凑导出钮需要的两个小工具（原 FavoritesView 移入，逻辑不变）
function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}
const seasonStart = computed(() => {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
})
</script>

<template>
  <div class="flex items-center gap-2 rounded-lg border border-white/10 bg-[#131a2b] px-3 py-2.5">
    <!-- 图标：球队队徽（无档案 → 联赛色首字圆牌）/ 球员黄星 -->
    <template v-if="kind === 'team'">
      <TeamLogo v-if="team" :team="team" :size="24" />
      <span
        v-else
        class="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full font-cond text-xs text-white"
        :style="{ background: leagueColor }"
        aria-hidden="true"
      >{{ initials }}</span>
    </template>
    <span
      v-else
      class="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-yellow-400/15 text-sm text-yellow-400"
      aria-hidden="true"
    >★</span>

    <!-- 名字：有编号 → 按钮可跳详情；无编号 → 纯文本（布局规则：flex-1 truncate，徽章按钮优先） -->
    <button
      v-if="hasId"
      type="button"
      class="min-w-0 flex-1 truncate text-left text-sm font-medium text-white hover:underline"
      @click="emit('go')"
    >{{ display }}</button>
    <span v-else class="min-w-0 flex-1 truncate text-sm text-slate-200">{{ display }}</span>

    <!-- 联赛徽章 -->
    <span class="flex-none rounded-full px-2 py-0.5 text-[10px]" :style="chipStyle">{{ leagueLabel }}</span>

    <!-- 动作区：仅有编号条目渲染；日历钮内嵌导出按钮紧凑变体（整链闭环，不发事件） -->
    <template v-if="hasId">
      <ExportCalendarButton
        v-if="kind === 'team' && teamId !== undefined"
        compact
        :league="league"
        :team-id="teamId"
        :team-name="name"
        :team-slug="slugify(name)"
        :season-start="seasonStart"
      />
      <button
        type="button"
        class="flex-none rounded-md border border-rose-400/25 px-2.5 py-1 text-xs text-rose-400 transition-colors hover:bg-rose-400/10"
        @click="emit('remove')"
      >{{ t('fav.remove', app.lang) }}</button>
    </template>
  </div>
</template>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/FavoriteRowCard.test.ts`
Expected: PASS，6 项全绿。

- [ ] **Step 5: 提交**

```bash
git add src/components/favorites/FavoriteRowCard.vue tests/components/FavoriteRowCard.test.ts
git commit -m "feat: 收藏行卡组件 FavoriteRowCard——队徽/星标+联赛徽章+紧凑动作钮，无编号条目降级渲染"
```

---

### Task 3: FavoritesView 暗色卡片化重写

**Files:**
- Modify: `src/views/FavoritesView.vue`（整体重写）
- Test: `tests/views/FavoritesView.test.ts`（适配 + 新增用例）

- [ ] **Step 1: 先写新增测试用例**

改 `tests/views/FavoritesView.test.ts`：

(a) 顶部 import 区补三行：

```ts
import { useAppStore } from '../../src/stores/app'
import { useTeamsStore } from '../../src/stores/teams'
import type { LeagueInfo, Team } from '../../src/types/models'
```

(b) `mockFetch`——该文件现有用例不 mock fetch，新增用例需要。在 `beforeEach` 之前加：

```ts
const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any
```

并在 `beforeEach` 里 `vi.useFakeTimers()` 之前加 `mockFetch.mockReset()`。

(c) `mountWithRouter()` 的路由表补两条（原有两条不动）：

```ts
      { path: '/:league/team/:id', component: { template: '<div/>' } },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
```

(d) 在文件末尾 `describe` 块内追加辅助函数与新用例：

```ts
function makeInfo(over: Partial<LeagueInfo> = {}): LeagueInfo {
  return {
    slug: 'eng.1', name: 'Premier League', nameZh: '英超', country: 'England',
    color: '#3D195B', understatSlug: 'EPL', season: '2025', teams: 20, players: 500,
    ...over,
  }
}

function injectTeam(team: Team, league = 'eng.1') {
  useTeamsStore().bundles[league as 'eng.1'] = {
    meta: { season: '2025', seasonType: 'european' } as any,
    teams: [team],
    byId: new Map([[team.id, team]]),
  }
}

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
    color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
    ...over,
  }
}
```

```ts
  it('联赛徽章与队徽：档案就位时渲染', async () => {
    useAppStore().leagues = [makeInfo()]
    injectTeam(makeTeam())
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('英超')
    // TeamLogo 无 logo URL → 自身首字圆牌兜底；默认中文模式，aria-label 为中文译名
    expect(w.find('span[aria-label="阿森纳"]').exists()).toBe(true)
  })
  it('档案拉取失败：尽力而为，首字圆牌兜底，列表照常渲染', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    useAppStore().leagues = [makeInfo()]
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('阿森纳')
    expect(w.text()).toContain('英超')
    expect(w.text()).toContain('阿') // 兜底首字圆牌
    expect(w.text()).toContain('删除') // 按钮不受影响
  })
  it('无编号遗留条目：只有名字和徽章，无任何按钮', async () => {
    useAppStore().leagues = [makeInfo()]
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', name: 'Legacy Club' })
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('Legacy Club')
    expect(w.text()).not.toContain('删除')
    expect(w.text()).not.toContain('日历')
  })
  it('删除：即删 + 列表即时更新', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('阿森纳')
    await w.findAll('button').find((b) => b.text().includes('删除'))!.trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('阿森纳')
    expect(store.favorites.teams).toHaveLength(0)
  })
  it('名字点击跳详情页', async () => {
    vi.useRealTimers()
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const { w, router } = mountWithRouter()
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('阿森纳'))!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/eng.1/team/359')
    vi.useFakeTimers()
  })
```

注意：`mountWithRouter()` 现返回 `{ router, w }`，新用例沿用。原有 4 项用例**一字不改**——新视图必须让它们继续通过（英文断言 Teams / Remove、中文 暂无收藏 / 阿森纳 / 哈兰德 都是规格验收点）。

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/views/FavoritesView.test.ts`
Expected: FAIL——新用例失败（旧视图无徽章/兜底圆牌等）；原 4 项仍 PASS。

- [ ] **Step 3: 重写 FavoritesView**

`src/views/FavoritesView.vue` 全文替换为：

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserDataStore } from '../stores/userData'
import { useTeamsStore } from '../stores/teams'
import { useToast } from '../composables/useToast'
import EmptyState from '../components/common/EmptyState.vue'
import FavoriteRowCard from '../components/favorites/FavoriteRowCard.vue'
import { useRouter } from 'vue-router'
import type { LeagueSlug } from '../utils/constants'
import { useAppStore } from '../stores/app'
import { t as tr } from '../utils/i18n'
import type { Favorite } from '../types/user-data'

const store = useUserDataStore()
const teams = useTeamsStore()
const app = useAppStore()
const toast = useToast()
const router = useRouter()
const tab = ref<'teams' | 'players'>('teams')

// 队徽预载（spec §四-3）：只走档案库 ensure()（仅拉数据、无副作用），
// 不用 ensureLeague——它会把入参联赛设为"当前联赛"，收藏夹是跨联赛页，会搅乱联赛上下文。
// 只为有球队收藏的联赛预载；尽力而为，失败落首字圆牌兜底。
const teamLeagues = computed<LeagueSlug[]>(() =>
  [...new Set(store.favorites.teams.filter((f) => f.teamId !== undefined).map((f) => f.league))],
)
onMounted(() => {
  Promise.allSettled(teamLeagues.value.map((l) => teams.ensure(l))).catch(() => { /* 尽力而为 */ })
})

const teamOf = (f: Favorite) =>
  f.teamId !== undefined ? teams.teamById(f.league, f.teamId) : undefined

function goTeam(league: LeagueSlug, id: number) { router.push(`/${league}/team/${id}`) }
function goPlayer(league: LeagueSlug, id: number) { router.push(`/${league}/player/${id}`) }
function onTeamGo(f: Favorite) { if (f.teamId !== undefined) goTeam(f.league, f.teamId) }
function onPlayerGo(f: Favorite) { if (f.athleteId !== undefined) goPlayer(f.league, f.athleteId) }

function removeTeam(id: number) {
  store.removeFavorite('team', id)
  toast.success(tr('fav.removed', app.lang))
}
function removePlayer(id: number) {
  store.removeFavorite('player', id)
  toast.success(tr('fav.removed', app.lang))
}
</script>

<template>
  <section class="mx-auto max-w-3xl p-4">
    <h1 class="font-cond text-2xl font-semibold text-white">{{ tr('fav.title', app.lang) }}</h1>

    <div v-if="store.favorites.teams.length === 0 && store.favorites.players.length === 0" class="mt-4">
      <EmptyState
        :title="tr('fav.emptyTitle', app.lang)"
        :body="tr('fav.emptyBody', app.lang)"
        :cta-text="tr('fav.emptyCta', app.lang)"
        @cta="router.push('/eng.1/standings')"
      />
    </div>
    <template v-else>
      <!-- 页签：暗色圆角钮 + 中性浅色下划线（本页无联赛上下文，不用联赛色） -->
      <div class="mt-4 flex gap-2">
        <button
          type="button"
          class="rounded-lg px-3.5 py-1.5 text-sm transition-colors"
          :class="tab === 'teams'
            ? 'bg-white/10 text-white shadow-[inset_0_-2px_0_rgba(255,255,255,0.45)]'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'"
          @click="tab = 'teams'"
        >{{ tr('fav.teams', app.lang) }} ({{ store.favorites.teams.length }})</button>
        <button
          type="button"
          class="rounded-lg px-3.5 py-1.5 text-sm transition-colors"
          :class="tab === 'players'
            ? 'bg-white/10 text-white shadow-[inset_0_-2px_0_rgba(255,255,255,0.45)]'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'"
          @click="tab = 'players'"
        >{{ tr('fav.players', app.lang) }} ({{ store.favorites.players.length }})</button>
      </div>

      <div v-if="tab === 'teams'" class="mt-3 space-y-2">
        <FavoriteRowCard
          v-for="f in store.favorites.teams"
          :key="f.teamId ?? `name:${f.name}`"
          kind="team"
          :name="f.name"
          :league="f.league"
          :team-id="f.teamId"
          :team="teamOf(f)"
          @go="onTeamGo(f)"
          @remove="f.teamId !== undefined && removeTeam(f.teamId)"
        />
      </div>
      <div v-if="tab === 'players'" class="mt-3 space-y-2">
        <FavoriteRowCard
          v-for="f in store.favorites.players"
          :key="f.athleteId ?? `name:${f.name}`"
          kind="player"
          :name="f.name"
          :league="f.league"
          :athlete-id="f.athleteId"
          @go="onPlayerGo(f)"
          @remove="f.athleteId !== undefined && removePlayer(f.athleteId)"
        />
      </div>
    </template>
  </section>
</template>
```

重写检查点（与旧文件对照）：页签计数、空态、跳转、删除 + toast 行为全部保留；`slugify` / `seasonStart` 已移入行卡组件，视图不再需要；旧样式类（bg-blue-600 / text-red-500 / dark: 双主题）全部清除。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/views/FavoritesView.test.ts`
Expected: PASS，9 项全绿（原 4 + 新 5）。若原有 4 项有失败，说明重写破坏了规格保留项，先修视图再谈别的。

- [ ] **Step 5: 提交**

```bash
git add src/views/FavoritesView.vue tests/views/FavoritesView.test.ts
git commit -m "feat: 收藏夹页重写为暗色卡片风——单行卡+联赛徽章+队徽兜底，页签中性下划线，行为不变"
```

---

### Task 4: 全量验证 + 红线核验

**Files:** 无新增改动（纯验证）

- [ ] **Step 1: 全量单测**

Run: `npx vitest run`
Expected: 全部 PASS。数量 ≈ 185（基线 172 + Task 1 加 2 + Task 2 加 6 + Task 3 加 5），以实际输出为准；任何红项必须修复。

- [ ] **Step 2: 类型检查 + 构建**

Run: `npm run typecheck && npm run build`
Expected: 两条均零报错，dist 产物正常生成。

- [ ] **Step 3: 红线核验——diff 只含清单内文件**

Run: `git diff --name-only 3befdce..HEAD`
Expected: 输出**有且仅有**以下 8 个文件（顺序不限）：

```
docs/superpowers/plans/2026-08-11-mobile-cards-batch2.md
src/components/favorites/FavoriteRowCard.vue
src/components/teams/ExportCalendarButton.vue
src/utils/i18n.ts
src/views/FavoritesView.vue
tests/components/ExportCalendarButton.test.ts
tests/components/FavoriteRowCard.test.ts
tests/views/FavoritesView.test.ts
```

出现任何其他文件 = 红线失守，必须回退该文件的改动再继续。

- [ ] **Step 4: 确认没碰数据文件**

Run: `git status --short public/data/`
Expected: 无输出（数据由 Actions 管，本地不碰）。

- [ ] **Step 5: 工作区清洁检查**

Run: `git status --short`
Expected: 无未提交的已跟踪文件改动（untracked 的 tmp/scan-zh.cjs 是历史遗留，不管它）。

---

### Task 5: 手测与四页复查（需浏览器许可，或总司令亲测）

> ⚠️ 本任务要开浏览器。执行会话若未获浏览器许可（项目约定：未经允许不开浏览器），跳过并标记「待回归」，不得自作主张开浏览器。
> 手测用过 375px 移动视口后，**必须把浏览器窗口恢复到 ≥1024px**（总司令抱怨过窗口被改小）。

**前置：** `npm run dev` 起本地服务，浏览器开 `http://localhost:5173/#/favorites`。

- [ ] **Step 1: 收藏夹页手测（375px 视口，DevTools 设备模拟）**

先造数据：DevTools 控制台对 `localStorage` 写入（或用界面 ☆ 按钮攒）：订阅若干球队/球员收藏，覆盖英超 + 至少一个其他联赛；再造一条无编号遗留条目验证降级：

```js
localStorage.setItem('matchlab:favorites', JSON.stringify({
  version: 1,
  teams: [
    { league: 'eng.1', teamId: 359, name: 'Arsenal', addedAt: '2026-08-11T00:00:00.000Z' },
    { league: 'ger.1', teamId: 456, name: 'Borussia Dortmund', addedAt: '2026-08-11T00:01:00.000Z' },
    { league: 'eng.1', name: 'Legacy Club', addedAt: '2026-08-11T00:02:00.000Z' }
  ],
  players: [
    { league: 'eng.1', athleteId: 253989, name: 'Erling Haaland', addedAt: '2026-08-11T00:03:00.000Z' }
  ],
}))
```

（注：456 未必是多特真实 ID，队徽落兜底圆牌即算验证通过；真实 ID 可从积分榜页点进球队详情看 URL。）

逐项过：

| # | 项目 | 预期 |
|---|---|---|
| 1 | 整体观感 | 暗色卡片，与全站风格一致，无蓝色按钮/红色刺眼字 |
| 2 | 球队行 | 队徽（或首字圆牌）+ 名字 + 联赛徽章 +「日历」「删除」一行排开，无横滑 |
| 3 | 无编号条目 | 只有名字 + 徽章，无按钮 |
| 4 | 名字点击 | 跳对应联赛球队详情页 |
| 5 | 日历钮 | 点击生成 .ics 下载 + toast |
| 6 | 删除钮 | 即删 + toast，列表即时少一行 |
| 7 | 球员页签 | 星标 + 名字 + 徽章 + 删除；名字跳球员详情 |
| 8 | 页签切换 | 计数正确，下划线为中性浅色 |
| 9 | 空收藏 | 空态引导出现，CTA 可点去积分榜 |
| 10 | 英文模式 | 切 EN 全页无中文残留（长名截断、徽章按钮完整属预期） |

- [ ] **Step 2: 桌面复查（1024 / 1440）**

收藏夹页样式与全站统一、无破相；顺带确认球队详情页的导出按钮仍是旧文案旧样式（回归 Task 1 默认分支未变）。

- [ ] **Step 3: 其余四页 375px 复查（含英文模式）**

按 spec §九清单逐页过：

- 赛程页：月份条横滑、比赛卡三态（未开赛 / 进行中 / 完赛）、日期组头
- 球队详情页：返回钮、头部三按钮、战绩块、阵容分组列表
- 球员详情页：基础信息块、xG 数据块、两张趋势图、统计四分类折叠
- 首页：订阅卡片、上轮战报带、联赛板块

判定标准（spec §一）：溢出、横滑、点按打架、内容看不见、样式破碎才算真问题；末行不对齐等美观问题记录即可、不修。

- [ ] **Step 4: 记录结论**

- 全部通过 → 向总司令汇报完工，附复查结论
- 发现真问题 → 记入汇报，按 spec 风险表另起 followup（一行可修的除外，修了要单独说明）
- 未获浏览器许可 → 汇报「代码完工待回归」，清单原样移交

- [ ] **Step 5: 恢复窗口**

浏览器窗口 ≥1024px，关闭 DevTools 移动模拟。
