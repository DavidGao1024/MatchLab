# 移动端卡片化 · 方案 B 实施计划（第一批）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 PC 端样式零影响前提下，给 PlayersView / LeadersView / CompareView / AppHeader 四处加移动端卡片化（Tailwind `md:` 断点切换双 DOM）。

**Architecture:** 双 DOM 模式——PC 端原 `<table>` 包 `hidden md:block`，移动端新卡片组件包 `md:hidden`，纯 CSS 断点切换无 JS 设备判断。3 个新移动卡片组件 + AppHeader 搜索图标按钮 + 全屏搜索层（Teleport + 复用 SearchBar）。store / composable / API / 路由 / 数据流完全不动。

**Tech Stack:** Vue 3 `<script setup>` + TS strict + Tailwind 4 + Pinia + Vitest + @vue/test-utils + Playwright（PC 端截图对比）

**前提红线：PC 端零影响**——每个 view 改造完成后必须用 Playwright 在 768/1024/1440 三个宽度截图，与改造前对比无差异（视觉+点击行为）。

**Spec：** `docs/superpowers/specs/2026-08-05-mobile-cards-design.md`

---

## 文件结构

### 新增组件
- `src/components/players/PlayerListCardMobile.vue` — 球员卡（移动端）
- `src/components/players/LeaderRowCardMobile.vue` — 排行卡（移动端）
- `src/components/players/ComparePlayerCardMobile.vue` — 对比卡（移动端）

### 改造 view / 布局
- `src/views/PlayersView.vue` — 包双 DOM
- `src/views/LeadersView.vue` — 包双 DOM
- `src/views/CompareView.vue` — 包双 DOM
- `src/components/layout/AppHeader.vue` — 加搜索图标按钮 + 全屏搜索层

### 新增测试
- `tests/components/PlayerListCardMobile.test.ts`
- `tests/components/LeaderRowCardMobile.test.ts`
- `tests/components/ComparePlayerCardMobile.test.ts`
- `tests/components/AppHeader.test.ts`（如不存在则新增；存在则增例）

### 类型依赖（不动）
- `src/types/models.ts` `PlayerSummary` / `PlayerProfile`
- `src/types/static.ts` `LeaderEntry` / `LeaderCategory`

### i18n 复用（不动）
- `t` / `teamName` / `playerName` / `leadersCatName` 全部已在 `src/utils/i18n.ts` 就位

---

## Task 1: PlayerListCardMobile 组件

**Files:**
- Create: `src/components/players/PlayerListCardMobile.vue`
- Test: `tests/components/PlayerListCardMobile.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/components/PlayerListCardMobile.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlayerListCardMobile from '../../src/components/players/PlayerListCardMobile.vue'
import type { PlayerSummary, Team } from '../../src/types/models'

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
    color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
    ...over,
  }
}

function makePlayer(over: Partial<PlayerSummary> = {}): PlayerSummary {
  return {
    id: 253989, name: 'Erling Haaland', teamId: 503, team: 'Manchester City',
    position: 'F', age: 25, goals: 14, assists: 2,
    ...over,
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('PlayerListCardMobile', () => {
  it('中文模式渲染球员名/球队名/位置/年龄/进球/助攻', () => {
    const w = mount(PlayerListCardMobile, {
      props: { player: makePlayer(), team: makeTeam(), rank: 1, lang: 'zh' },
    })
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('曼城')
    expect(w.text()).toContain('前锋')
    expect(w.text()).toContain('25')
    expect(w.text()).toContain('14')
    expect(w.text()).toContain('2')
  })

  it('英文模式回退英文', () => {
    const w = mount(PlayerListCardMobile, {
      props: { player: makePlayer(), team: makeTeam(), rank: 1, lang: 'en' },
    })
    expect(w.text()).toContain('Haaland')
    expect(w.text()).toContain('Manchester City')
    expect(w.text()).toContain('Forward')
  })

  it('点击触发 click emit', async () => {
    const w = mount(PlayerListCardMobile, {
      props: { player: makePlayer(), team: makeTeam(), rank: 1, lang: 'zh' },
    })
    await w.trigger('click')
    expect(w.emitted('click')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 跑测试看失败**

Run: `npx vitest run tests/components/PlayerListCardMobile.test.ts`
Expected: FAIL — 模块不存在 / 组件未导出

- [ ] **Step 3: 实现组件**

新建 `src/components/players/PlayerListCardMobile.vue`：

```vue
<script setup lang="ts">
import type { PlayerSummary, Team } from '../../types/models'
import type { Lang } from '../../utils/i18n'
import { playerName, teamName, t } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'

const props = defineProps<{
  player: PlayerSummary
  team?: Team
  rank: number
  lang: Lang
}>()

defineEmits<{ click: [] }>()

function posLabel(p: string): string {
  if (p === 'G') return t('players.positionG', props.lang)
  if (p === 'D') return t('players.positionD', props.lang)
  if (p === 'M') return t('players.positionM', props.lang)
  if (p === 'F') return t('players.positionF', props.lang)
  return p
}
</script>

<template>
  <div
    class="card mb-2 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
    :style="{ background: team ? `${team.color}0d` : 'rgba(255,255,255,0.02)' }"
    @click="$emit('click')"
  >
    <div class="flex items-center gap-2 mb-2">
      <span class="text-slate-500 font-mono-d text-xs w-5">{{ rank }}</span>
      <TeamLogo :team="team" :size="20" />
      <span class="text-white font-cond text-sm flex-1 truncate">{{ playerName(player.name, lang) }}</span>
      <span class="text-slate-500 text-xs truncate max-w-[100px]">{{ teamName(player.team, lang) }}</span>
    </div>
    <div class="grid grid-cols-4 gap-2 text-xs">
      <div>
        <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ t('col.pos', lang) }}</div>
        <div class="text-slate-300 font-mono-d mt-0.5">{{ posLabel(player.position) }}</div>
      </div>
      <div>
        <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ t('col.age', lang) }}</div>
        <div class="text-slate-300 font-mono-d mt-0.5">{{ player.age ?? '—' }}</div>
      </div>
      <div>
        <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ t('col.goals', lang) }}</div>
        <div class="text-white font-mono-d mt-0.5 font-semibold">{{ player.goals ?? '—' }}</div>
      </div>
      <div>
        <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ t('col.assists', lang) }}</div>
        <div class="text-white font-mono-d mt-0.5 font-semibold">{{ player.assists ?? '—' }}</div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 跑测试看通过**

Run: `npx vitest run tests/components/PlayerListCardMobile.test.ts`
Expected: PASS — 3/3

- [ ] **Step 5: typecheck + commit**

```bash
npm run typecheck
git add src/components/players/PlayerListCardMobile.vue tests/components/PlayerListCardMobile.test.ts
git commit -m "feat: PlayerListCardMobile 球员卡片组件（移动端）"
```

---

## Task 2: LeaderRowCardMobile 组件

**Files:**
- Create: `src/components/players/LeaderRowCardMobile.vue`
- Test: `tests/components/LeaderRowCardMobile.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/components/LeaderRowCardMobile.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LeaderRowCardMobile from '../../src/components/players/LeaderRowCardMobile.vue'
import type { LeaderEntry, Team } from '../../src/types'

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI',
    color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '',
    ...over,
  }
}

function makeEntry(over: Partial<LeaderEntry> = {}): LeaderEntry {
  return {
    rank: 1, value: 14, displayValue: '14', athleteId: 253989, athleteName: 'Erling Haaland',
    teamId: 503, teamName: 'Manchester City',
    ...over,
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('LeaderRowCardMobile', () => {
  it('中文模式渲染排名/球员名/球队名/数值', () => {
    const w = mount(LeaderRowCardMobile, {
      props: { entry: makeEntry(), team: makeTeam(), category: 'goalsLeaders', catDisplayName: 'Goals', lang: 'zh' },
    })
    expect(w.text()).toContain('1')
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('曼城')
    expect(w.text()).toContain('14')
    expect(w.text()).toContain('进球')
  })

  it('英文模式走 displayName', () => {
    const w = mount(LeaderRowCardMobile, {
      props: { entry: makeEntry(), team: makeTeam(), category: 'goalsLeaders', catDisplayName: 'Goals', lang: 'en' },
    })
    expect(w.text()).toContain('Haaland')
    expect(w.text()).toContain('Goals')
  })

  it('点击触发 click emit', async () => {
    const w = mount(LeaderRowCardMobile, {
      props: { entry: makeEntry(), team: makeTeam(), category: 'goalsLeaders', catDisplayName: 'Goals', lang: 'zh' },
    })
    await w.trigger('click')
    expect(w.emitted('click')).toBeTruthy()
  })
})
```

注：`LeaderEntry` / `Team` 从 `../../src/types` 导出（`types/index.ts` 应当 re-export `static.ts` 和 `models.ts`，若不导出则直接 `from '../../src/types/static'` 和 `from '../../src/types/models'`——执行时按现有约定选）。

- [ ] **Step 2: 跑测试看失败**

Run: `npx vitest run tests/components/LeaderRowCardMobile.test.ts`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现组件**

新建 `src/components/players/LeaderRowCardMobile.vue`：

```vue
<script setup lang="ts">
import type { LeaderEntry } from '../../types/static'
import type { Team } from '../../types/models'
import type { Lang } from '../../utils/i18n'
import { leadersCatName, playerName, teamName } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'

const props = defineProps<{
  entry: LeaderEntry
  team?: Team
  category: string
  catDisplayName: string
  lang: Lang
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <div
    class="card mb-2 rounded-lg border border-white/10 p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
    :style="{ background: team ? `${team.color}0d` : 'rgba(255,255,255,0.02)' }"
    @click="$emit('click')"
  >
    <span class="text-slate-500 font-mono-d text-lg w-6 text-center">{{ entry.rank }}</span>
    <TeamLogo :team="team" :size="24" />
    <div class="flex-1 min-w-0">
      <div class="text-white font-cond text-sm truncate">{{ playerName(entry.athleteName, lang) }}</div>
      <div class="text-slate-500 text-xs truncate">{{ teamName(entry.teamName, lang) }}</div>
    </div>
    <div class="text-right shrink-0">
      <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ leadersCatName(category, catDisplayName, lang) }}</div>
      <div class="text-white font-mono-d text-xl font-semibold leading-tight">{{ entry.displayValue }}</div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 跑测试看通过**

Run: `npx vitest run tests/components/LeaderRowCardMobile.test.ts`
Expected: PASS — 3/3

- [ ] **Step 5: typecheck + commit**

```bash
npm run typecheck
git add src/components/players/LeaderRowCardMobile.vue tests/components/LeaderRowCardMobile.test.ts
git commit -m "feat: LeaderRowCardMobile 排行卡组件（移动端）"
```

---

## Task 3: ComparePlayerCardMobile 组件

**Files:**
- Create: `src/components/players/ComparePlayerCardMobile.vue`
- Test: `tests/components/ComparePlayerCardMobile.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/components/ComparePlayerCardMobile.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ComparePlayerCardMobile from '../../src/components/players/ComparePlayerCardMobile.vue'
import type { PlayerProfile, Team } from '../../src/types/models'

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI',
    color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '',
    ...over,
  }
}

function makeProfile(over: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    id: 253989, displayName: 'Erling Haaland', shortName: 'Haaland',
    firstName: 'Erling', lastName: 'Haaland', age: 25, height: 194, weight: 88,
    jersey: 9, position: 'F', positionLabel: 'Forward', teamId: 503,
    stats: { general: {}, offensive: {}, defensive: {}, goalKeeping: {} } as any,
    ...over,
  }
}

interface Row { category: string; field: string; label: string; values: (number | null)[]; isMaxFlags?: boolean[] }

beforeEach(() => setActivePinia(createPinia()))

describe('ComparePlayerCardMobile', () => {
  it('中文模式渲染球员名 + 各统计项 + max 标记', () => {
    const rows: Row[] = [
      { category: 'offensive', field: 'totalGoals', label: '进球', values: [14, 12, 8], isMaxFlags: [true, false, false] },
      { category: 'offensive', field: 'goalAssists', label: '助攻', values: [2, 7, 5], isMaxFlags: [false, true, false] },
    ]
    const w = mount(ComparePlayerCardMobile, {
      props: {
        profile: makeProfile(),
        team: makeTeam(),
        rows,
        playerIndex: 0,
        lang: 'zh',
      },
    })
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('进球')
    expect(w.text()).toContain('14')
    expect(w.text()).toContain('max')
    expect(w.text()).toContain('助攻')
    // 卡片显示该球员的助攻值（index 0 → 2，不是 max）
    expect(w.text()).toContain('2')
  })

  it('英文模式回退英文', () => {
    const rows: Row[] = [
      { category: 'offensive', field: 'totalGoals', label: 'Goals', values: [14, 12], isMaxFlags: [true, false] },
    ]
    const w = mount(ComparePlayerCardMobile, {
      props: { profile: makeProfile(), team: makeTeam(), rows, playerIndex: 0, lang: 'en' },
    })
    expect(w.text()).toContain('Haaland')
    expect(w.text()).toContain('Goals')
  })

  it('点击移除按钮触发 remove emit', async () => {
    const rows: Row[] = []
    const w = mount(ComparePlayerCardMobile, {
      props: { profile: makeProfile(), team: makeTeam(), rows, playerIndex: 0, lang: 'zh' },
    })
    const btn = w.find('button')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(w.emitted('remove')).toBeTruthy()
  })

  it('点击卡片头部触发 click emit', async () => {
    const rows: Row[] = []
    const w = mount(ComparePlayerCardMobile, {
      props: { profile: makeProfile(), team: makeTeam(), rows, playerIndex: 0, lang: 'zh' },
    })
    // 卡片头部可点击区域（球员名按钮）
    const buttons = w.findAll('button')
    // 找到"球员名"按钮（不是移除按钮）
    const nameBtn = buttons.find((b) => b.text().includes('哈兰德'))
    expect(nameBtn).toBeTruthy()
    await nameBtn!.trigger('click')
    expect(w.emitted('click')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 跑测试看失败**

Run: `npx vitest run tests/components/ComparePlayerCardMobile.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现组件**

新建 `src/components/players/ComparePlayerCardMobile.vue`：

```vue
<script setup lang="ts">
import type { PlayerProfile, Team } from '../../types/models'
import type { Lang } from '../../utils/i18n'
import { playerName, teamName, t } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'

interface Row {
  category: string
  field: string
  label: string
  values: (number | null)[]
  isMaxFlags?: boolean[]
}

const props = defineProps<{
  profile: PlayerProfile
  team?: Team
  rows: Row[]
  playerIndex: number
  lang: Lang
}>()

defineEmits<{ remove: []; click: [] }>()

function fmtVal(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') {
    if (v > 0 && v <= 1) return `${(v * 100).toFixed(1)}%`
    if (Number.isInteger(v)) return String(v)
    return v.toFixed(2)
  }
  return String(v)
}

function isMax(row: Row): boolean {
  return row.isMaxFlags?.[props.playerIndex] ?? false
}

function rowValue(row: Row): number | null {
  return row.values[props.playerIndex] ?? null
}
</script>

<template>
  <div
    class="card mb-3 rounded-lg border border-white/10 p-3"
    :style="{ background: team ? `${team.color}0d` : 'rgba(255,255,255,0.02)' }"
  >
    <div class="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
      <TeamLogo :team="team" :size="28" />
      <button
        type="button"
        class="text-white font-cond text-sm flex-1 truncate text-left hover:underline"
        @click="$emit('click')"
      >
        {{ playerName(profile.displayName, lang) }}
      </button>
      <button
        type="button"
        class="text-[9px] text-slate-500 hover:text-red-400 shrink-0"
        @click="$emit('remove')"
      >
        {{ t('compare.remove', lang) }} ×
      </button>
    </div>
    <div class="space-y-1.5 text-xs">
      <div v-for="row in rows" :key="row.category + row.field" class="flex justify-between">
        <span class="text-slate-400">{{ row.label }}</span>
        <span :class="['font-mono-d', isMax(row) ? 'text-emerald-300 font-semibold' : 'text-slate-300']">
          {{ fmtVal(rowValue(row)) }}<span v-if="isMax(row)" class="ml-1 text-[10px]">(max)</span>
        </span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 跑测试看通过**

Run: `npx vitest run tests/components/ComparePlayerCardMobile.test.ts`
Expected: PASS — 4/4

- [ ] **Step 5: typecheck + commit**

```bash
npm run typecheck
git add src/components/players/ComparePlayerCardMobile.vue tests/components/ComparePlayerCardMobile.test.ts
git commit -m "feat: ComparePlayerCardMobile 对比卡组件（移动端）"
```

---

## Task 4: AppHeader 移动端搜索图标按钮 + 全屏搜索层

**Files:**
- Modify: `src/components/layout/AppHeader.vue`
- Test: `tests/components/AppHeader.test.ts`（新建或扩展）

- [ ] **Step 1: 写失败测试**

新建 `tests/components/AppHeader.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppHeader from '../../src/components/layout/AppHeader.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div/>' } }],
  })
}

beforeEach(() => setActivePinia(createPinia()))

describe('AppHeader', () => {
  it('PC 端搜索框可见（hidden md:block 类）', () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const search = w.find('.hidden.md\\:block')
    expect(search.exists()).toBe(true)
  })

  it('移动端搜索图标按钮存在（md:hidden 类）', () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const btns = w.findAll('button.md\\:hidden')
    expect(btns.length).toBeGreaterThan(0)
  })

  it('点击搜索图标触发全屏搜索层', async () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const searchBtn = w.find('button.md\\:hidden')
    await searchBtn.trigger('click')
    // 全屏层应该挂到 body（Teleport），用 querySelector 找
    const overlay = document.querySelector('.mobile-search-overlay')
    expect(overlay).not.toBeNull()
  })

  it('全屏层取消按钮关闭层', async () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const searchBtn = w.find('button.md\\:hidden')
    await searchBtn.trigger('click')
    const cancelBtn = document.querySelector('.mobile-search-overlay .cancel-btn') as HTMLElement
    expect(cancelBtn).not.toBeNull()
    cancelBtn.click()
    await new Promise((r) => setTimeout(r, 0))
    expect(document.querySelector('.mobile-search-overlay')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试看失败**

Run: `npx vitest run tests/components/AppHeader.test.ts`
Expected: FAIL

- [ ] **Step 3: 改造 AppHeader**

修改 `src/components/layout/AppHeader.vue` 全文：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../../stores/app'
import FavoritesDropdown from './FavoritesDropdown.vue'
import LeagueTabs from './LeagueTabs.vue'
import LeagueSubNav from './LeagueSubNav.vue'
import SearchBar from '../common/SearchBar.vue'

const app = useAppStore()
const searchOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#0c101b]/80 backdrop-blur border-b border-white/10">
    <div class="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
      <router-link
        to="/"
        class="font-score text-2xl tracking-[0.14em] text-white flex items-center gap-2 shrink-0"
      >
        <span
          class="w-2.5 h-2.5 rounded-full transition-colors duration-700"
          :style="{ background: 'var(--league-color)', boxShadow: '0 0 12px var(--league-color)' }"
        ></span>
        MATCHLAB
      </router-link>
      <LeagueTabs class="ml-2" />
      <!-- PC 端搜索框：完全不动 -->
      <SearchBar class="ml-auto w-full max-w-xs hidden md:block" />
      <!-- 移动端搜索图标按钮 -->
      <button
        type="button"
        class="md:hidden shrink-0 text-slate-300 hover:text-white p-1.5 rounded border border-white/15"
        :aria-label="app.lang === 'zh' ? '搜索' : 'Search'"
        @click="searchOpen = true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>
      <FavoritesDropdown />
      <button
        type="button"
        @click="app.toggleLang()"
        class="shrink-0 text-[11px] font-mono-d border border-white/15 rounded-full px-2.5 py-1 text-slate-300 hover:text-white transition-colors"
      >
        {{ app.lang === 'zh' ? '中 / EN' : 'EN / 中' }}
      </button>
    </div>
    <LeagueSubNav />
    <!-- 移动端全屏搜索层 -->
    <Teleport to="body">
      <div
        v-if="searchOpen"
        class="mobile-search-overlay md:hidden fixed inset-0 z-50 bg-[#0c101b] flex flex-col"
      >
        <div class="p-3 flex items-center gap-2 border-b border-white/10">
          <div class="flex-1">
            <SearchBar />
          </div>
          <button
            type="button"
            class="cancel-btn shrink-0 text-xs text-slate-400 hover:text-white px-2 py-1"
            @click="searchOpen = false"
          >
            {{ app.lang === 'zh' ? '取消' : 'Cancel' }}
          </button>
        </div>
      </div>
    </Teleport>
  </header>
</template>
```

- [ ] **Step 4: 跑测试看通过**

Run: `npx vitest run tests/components/AppHeader.test.ts`
Expected: PASS — 4/4

- [ ] **Step 5: typecheck + commit**

```bash
npm run typecheck
git add src/components/layout/AppHeader.vue tests/components/AppHeader.test.ts
git commit -m "feat: AppHeader 移动端搜索图标 + 全屏搜索层"
```

---

## Task 5: PlayersView 接入双 DOM

**Files:**
- Modify: `src/views/PlayersView.vue`
- Test: `tests/views/PlayersView.test.ts`（如已存在增例，否则新增）

- [ ] **Step 1: 写失败测试**

新建或追加 `tests/views/PlayersView.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import PlayersView from '../../src/views/PlayersView.vue'
import { usePlayersStore } from '../../src/stores/players'
import { useTeamsStore } from '../../src/stores/teams'

beforeEach(() => setActivePinia(createPinia()))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:league/players', component: PlayersView },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
    ],
  })
}

async function setup() {
  const router = makeRouter()
  router.push('/eng.1/players')
  await router.isReady()
  const players = usePlayersStore()
  const teams = useTeamsStore()
  players.indexes['eng.1'] = [{
    id: 253989, name: 'Erling Haaland', teamId: 503, team: 'Manchester City',
    position: 'F', age: 25, goals: 14, assists: 2,
  }] as any
  teams.bundles['eng.1'] = {
    meta: { season: '2025' } as any,
    teams: [{ id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI', color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '' }],
    byId: new Map(),
  } as any
  const w = mount(PlayersView, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}

describe('PlayersView 双 DOM', () => {
  it('PC 端表格容器 hidden md:block 存在', async () => {
    const { w } = await setup()
    expect(w.find('.hidden.md\\:block').exists()).toBe(true)
  })

  it('移动端卡片容器 md:hidden 存在', async () => {
    const { w } = await setup()
    expect(w.find('.md\\:hidden').exists()).toBe(true)
  })

  it('移动端卡片渲染球员名（中文模式）', async () => {
    const { w } = await setup()
    // 移动端容器内的文本应该含中文译名
    expect(w.text()).toContain('哈兰德')
  })
})
```

- [ ] **Step 2: 跑测试看失败**

Run: `npx vitest run tests/views/PlayersView.test.ts`
Expected: FAIL（PC 表格原 `<div class="overflow-x-auto">` 没有 `hidden md:block`）

- [ ] **Step 3: 改造 PlayersView 模板**

修改 `src/views/PlayersView.vue`——只改 template 内的表格区，script 不动。

找到（约 L128-L159）：
```vue
<div v-else class="overflow-x-auto">
  <table class="w-full text-sm">
    ...
  </table>
</div>
```

替换为：
```vue
<!-- PC 端表格（≥768px，完全不动） -->
<div v-else class="hidden md:block overflow-x-auto">
  <table class="w-full text-sm">
    <thead class="text-[10px] uppercase tracking-wider text-slate-500 font-mono-d border-b border-white/10">
      <tr>
        <th class="py-2 px-2 text-left w-8">#</th>
        <th class="py-2 px-2 text-left">{{ t('col.player', app.lang) }}</th>
        <th class="py-2 px-2 text-left w-12">{{ t('col.pos', app.lang) }}</th>
        <th class="py-2 px-2 text-right w-12">{{ t('col.age', app.lang) }}</th>
        <th class="py-2 px-2 text-right w-12">{{ t('col.goals', app.lang) }}</th>
        <th class="py-2 px-2 text-right w-12">{{ t('col.assists', app.lang) }}</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(p, i) in pageItems"
        :key="p.id"
        class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
        @click="go(p)"
      >
        <td class="py-2 px-2 text-slate-500 font-mono-d">{{ (page - 1) * 50 + i + 1 }}</td>
        <td class="py-2 px-2">
          <span class="text-white">{{ playerName(p.name, app.lang) }}</span>
          <span class="text-slate-500 text-xs ml-2">{{ teamName(p.team, app.lang) }}</span>
        </td>
        <td class="py-2 px-2 text-slate-400">{{ posLabel(p.position) }}</td>
        <td class="py-2 px-2 text-right text-slate-300 font-mono-d">{{ p.age ?? '—' }}</td>
        <td class="py-2 px-2 text-right text-white font-mono-d">{{ p.goals ?? '—' }}</td>
        <td class="py-2 px-2 text-right text-white font-mono-d">{{ p.assists ?? '—' }}</td>
      </tr>
    </tbody>
  </table>
</div>
<!-- 移动端卡片（<768px） -->
<div v-else class="md:hidden">
  <PlayerListCardMobile
    v-for="(p, i) in pageItems"
    :key="p.id"
    :player="p"
    :team="teamFor(p.teamId)"
    :rank="(page - 1) * 50 + i + 1"
    :lang="app.lang"
    @click="go(p)"
  />
</div>
```

`<script setup>` 顶部增加 import 与 `teamFor` 函数：

```ts
import PlayerListCardMobile from '../components/players/PlayerListCardMobile.vue'

function teamFor(id: number) {
  return teams.teamById(league.value, id)
}
```

- [ ] **Step 4: 跑测试看通过**

Run: `npx vitest run tests/views/PlayersView.test.ts`
Expected: PASS — 3/3

- [ ] **Step 5: 全量单测 + typecheck + build**

```bash
npm test
npm run typecheck
npm run build
```
Expected: 148 + 3 新 = 151 单测全绿，typecheck/build 通过

- [ ] **Step 6: PC 端零影响验证（Playwright 截图对比）**

启 dev server：`npm run dev`（后台）。用 Playwright 在 768/1024/1440 三宽度截图 `/eng.1/players` 页面，与 git 历史中改造前版本对比。视觉应一致。

如无 git 对比工具，至少手动验证：3 宽度下表格结构、列、间距、点击跳详情行为完全一致。

- [ ] **Step 7: commit**

```bash
git add src/views/PlayersView.vue tests/views/PlayersView.test.ts
git commit -m "feat: PlayersView 接入移动端卡片双 DOM"
```

---

## Task 6: LeadersView 接入双 DOM

**Files:**
- Modify: `src/views/LeadersView.vue`
- Test: `tests/views/LeadersView.test.ts`（新增）

- [ ] **Step 1: 写失败测试**

新建 `tests/views/LeadersView.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LeadersView from '../../src/views/LeadersView.vue'
import { useLeadersStore } from '../../src/stores/leaders'
import { useTeamsStore } from '../../src/stores/teams'

beforeEach(() => setActivePinia(createPinia()))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:league/leaders', component: LeadersView },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
    ],
  })
}

async function setup() {
  const router = makeRouter()
  router.push('/eng.1/leaders')
  await router.isReady()
  const leaders = useLeadersStore()
  const teams = useTeamsStore()
  leaders.bundles['eng.1'] = {
    source: 'espn', updateTime: '', league: 'eng.1', season: '2025',
    categories: [{
      name: 'goalsLeaders', displayName: 'Goals', abbreviation: 'G',
      entries: [{ rank: 1, value: 14, displayValue: '14', athleteId: 253989, athleteName: 'Erling Haaland', teamId: 503, teamName: 'Manchester City' }],
    }],
  } as any
  leaders.loading['eng.1'] = false
  teams.bundles['eng.1'] = {
    meta: { season: '2025' } as any,
    teams: [{ id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI', color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '' }],
    byId: new Map(),
  } as any
  const w = mount(LeadersView, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}

describe('LeadersView 双 DOM', () => {
  it('PC 表格容器 hidden md:block 存在', async () => {
    const { w } = await setup()
    expect(w.find('.hidden.md\\:block').exists()).toBe(true)
  })

  it('移动卡片容器 md:hidden 存在', async () => {
    const { w } = await setup()
    expect(w.find('.md\\:hidden').exists()).toBe(true)
  })

  it('移动端卡片渲染中文译名', async () => {
    const { w } = await setup()
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('曼城')
    expect(w.text()).toContain('进球')
  })
})
```

- [ ] **Step 2: 跑测试看失败**

Run: `npx vitest run tests/views/LeadersView.test.ts`
Expected: FAIL

- [ ] **Step 3: 改造 LeadersView 模板**

修改 `src/views/LeadersView.vue`——script 顶部加 import + teamFor，模板双 DOM：

script 加：
```ts
import LeaderRowCardMobile from '../components/players/LeaderRowCardMobile.vue'
```

模板找到（约 L84-L112）：
```vue
<div v-if="current" class="overflow-x-auto">
  <table class="w-full text-sm">
    ...
  </table>
</div>
```

替换为：
```vue
<!-- PC 端表格 -->
<div v-if="current" class="hidden md:block overflow-x-auto">
  <table class="w-full text-sm">
    <thead class="text-[10px] uppercase tracking-wider text-slate-500 font-mono-d border-b border-white/10">
      <tr>
        <th class="py-2 px-2 text-left w-8">{{ t('leaders.rank', app.lang) }}</th>
        <th class="py-2 px-2 text-left">{{ t('col.player', app.lang) }}</th>
        <th class="py-2 px-2 text-right w-20">{{ t('leaders.value', app.lang) }}</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="e in current.entries"
        :key="e.athleteId"
        class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
        @click="go(e.athleteId)"
      >
        <td class="py-2 px-2 text-slate-500 font-mono-d">{{ e.rank }}</td>
        <td class="py-2 px-2">
          <div class="flex items-center gap-2">
            <TeamLogo :team="teamFor(e.teamId)" :size="18" />
            <span class="text-white">{{ playerName(e.athleteName, app.lang) }}</span>
            <span class="text-slate-500 text-xs">{{ teamName(e.teamName, app.lang) }}</span>
          </div>
        </td>
        <td class="py-2 px-2 text-right text-white font-mono-d">{{ e.value }}</td>
      </tr>
    </tbody>
  </table>
</div>
<!-- 移动端卡片 -->
<div v-if="current" class="md:hidden">
  <LeaderRowCardMobile
    v-for="e in current.entries"
    :key="e.athleteId"
    :entry="e"
    :team="teamFor(e.teamId)"
    :category="current.name"
    :cat-display-name="current.displayName"
    :lang="app.lang"
    @click="go(e.athleteId)"
  />
</div>
```

注：`teamFor` 函数 LeadersView 已有（L55-L57），不需要新增。

- [ ] **Step 4: 跑测试看通过**

Run: `npx vitest run tests/views/LeadersView.test.ts`
Expected: PASS — 3/3

- [ ] **Step 5: 全量单测 + typecheck + build**

```bash
npm test && npm run typecheck && npm run build
```

- [ ] **Step 6: PC 端零影响验证**

启 dev server，768/1024/1440 三宽度截图 `/eng.1/leaders` 对比。

- [ ] **Step 7: commit**

```bash
git add src/views/LeadersView.vue tests/views/LeadersView.test.ts
git commit -m "feat: LeadersView 接入移动端卡片双 DOM"
```

---

## Task 7: CompareView 接入双 DOM

**Files:**
- Modify: `src/views/CompareView.vue`
- Test: `tests/views/CompareView.test.ts`（新增）

- [ ] **Step 1: 写失败测试**

新建 `tests/views/CompareView.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import CompareView from '../../src/views/CompareView.vue'
import { useCompareStore } from '../../src/stores/compare'
import { usePlayersStore } from '../../src/stores/players'
import { useTeamsStore } from '../../src/stores/teams'

beforeEach(() => setActivePinia(createPinia()))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:league/compare', component: CompareView },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
    ],
  })
}

async function setup() {
  const router = makeRouter()
  router.push('/eng.1/compare')
  await router.isReady()
  const compare = useCompareStore()
  const players = usePlayersStore()
  const teams = useTeamsStore()
  compare.ids = [253989, 253989]  // 任意（仅测渲染）
  compare.ids = [253989]
  players.indexes['eng.1'] = [] as any
  players.profiles['eng.1'] = {
    253989: {
      id: 253989, displayName: 'Erling Haaland', shortName: 'Haaland',
      firstName: 'Erling', lastName: 'Haaland', age: 25, height: 194, weight: 88,
      jersey: 9, position: 'F', positionLabel: 'Forward', teamId: 503,
      stats: {
        general: { appearances: 20, starts: 18, minutes: 1600, yellowCards: 1, redCards: 0 },
        offensive: { totalGoals: 14, shotsOnTarget: 30, totalShots: 50, accuratePasses: 200, goalAssists: 2 },
        defensive: { totalTackles: 5, interceptions: 3, totalClearance: 2 },
        goalKeeping: {},
      } as any,
    },
  } as any
  players.loadingIdx['eng.1'] = false
  teams.bundles['eng.1'] = {
    meta: { season: '2025' } as any,
    teams: [{ id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI', color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '' }],
    byId: new Map(),
  } as any
  const w = mount(CompareView, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}

describe('CompareView 双 DOM', () => {
  it('PC 表格容器 hidden md:block 存在', async () => {
    const { w } = await setup()
    expect(w.find('.hidden.md\\:block').exists()).toBe(true)
  })

  it('移动卡片容器 md:hidden 存在', async () => {
    const { w } = await setup()
    expect(w.find('.md\\:hidden').exists()).toBe(true)
  })

  it('移动端渲染球员名 + max 标记', async () => {
    const { w } = await setup()
    expect(w.text()).toContain('哈兰德')
    // 单人对比，所有项都是 max
    expect(w.text()).toContain('max')
  })
})
```

- [ ] **Step 2: 跑测试看失败**

Run: `npx vitest run tests/views/CompareView.test.ts`
Expected: FAIL

- [ ] **Step 3: 改造 CompareView 模板**

修改 `src/views/CompareView.vue`：

script 加：
```ts
import ComparePlayerCardMobile from '../components/players/ComparePlayerCardMobile.vue'
```

`rows` computed 改造，预计算 isMaxFlags：

找到（约 L78-L87）：
```ts
const rows = computed<Row[]>(() => {
  return ROWS_DEF.map(({ category, field, label }) => {
    const values = profiles.value.map((p) => {
      const cat = p.stats?.[category]
      if (!cat) return null
      return (cat as Record<string, number | null>)[field] ?? null
    })
    return { category, field, label, values }
  })
})
```

替换为：
```ts
const rows = computed<Row[]>(() => {
  return ROWS_DEF.map(({ category, field, label }) => {
    const values = profiles.value.map((p) => {
      const cat = p.stats?.[category]
      if (!cat) return null
      return (cat as Record<string, number | null>)[field] ?? null
    })
    const max = Math.max(...values.filter((x): x is number => x !== null))
    const isMaxFlags = values.map((v) => v !== null && v === max)
    return { category, field, label, values, isMaxFlags }
  })
})
```

`Row` interface 扩展 isMaxFlags（找到 L55-L60）：
```ts
interface Row {
  category: string
  field: string
  label: string
  values: (number | null)[]
  isMaxFlags?: boolean[]
}
```

模板找到（约 L184-L211）：
```vue
<div v-else class="overflow-x-auto">
  <table class="w-full text-sm">
    ...
  </table>
</div>
```

替换为：
```vue
<!-- PC 端对比表 -->
<div v-else class="hidden md:block overflow-x-auto">
  <table class="w-full text-sm">
    <thead class="text-[10px] uppercase tracking-wider text-slate-500 font-mono-d border-b border-white/10">
      <tr>
        <th class="py-2 px-2 text-left w-32">{{ t('col.player', app.lang) }}</th>
        <th v-for="p in profiles" :key="p.id" class="py-2 px-3 text-center min-w-[120px]">
          <div class="flex flex-col items-center gap-1">
            <TeamLogo :team="teamFor(p.teamId)" :size="32" />
            <button class="text-xs text-white hover:underline truncate max-w-[100px]" @click="goDetail(p.id)">
              {{ playerName(p.displayName, app.lang) }}
            </button>
            <button class="text-[9px] text-slate-500 hover:text-red-400" @click="removePlayer(p.id)">
              {{ t('compare.remove', app.lang) }} ×
            </button>
          </div>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.category + row.field" class="border-b border-white/5">
        <td class="py-2 px-2 text-slate-400 text-xs">{{ row.label }}</td>
        <td v-for="(v, i) in row.values" :key="i" class="py-2 px-3 text-center font-mono-d" :class="isMax(i, row.values) ? 'text-emerald-300' : 'text-slate-300'">
          {{ fmtVal(v) }}
        </td>
      </tr>
    </tbody>
  </table>
</div>
<!-- 移动端卡片堆叠 -->
<div v-else class="md:hidden">
  <ComparePlayerCardMobile
    v-for="(p, idx) in profiles"
    :key="p.id"
    :profile="p"
    :team="teamFor(p.teamId)"
    :rows="rows"
    :player-index="idx"
    :lang="app.lang"
    @remove="removePlayer"
    @click="goDetail(p.id)"
  />
</div>
```

- [ ] **Step 4: 跑测试看通过**

Run: `npx vitest run tests/views/CompareView.test.ts`
Expected: PASS — 3/3

- [ ] **Step 5: 全量单测 + typecheck + build**

```bash
npm test && npm run typecheck && npm run build
```

- [ ] **Step 6: PC 端零影响验证**

启 dev server，768/1024/1440 三宽度截图 `/eng.1/compare` 对比。注意：`isMax` 函数和 `rows` 已有，PC 端表格逻辑完全保留。

- [ ] **Step 7: commit**

```bash
git add src/views/CompareView.vue tests/views/CompareView.test.ts
git commit -m "feat: CompareView 接入移动端卡片双 DOM"
```

---

## Task 8: 全量回归 + 验收清单

**Files:** 无修改

- [ ] **Step 1: 跑全量单测**

```bash
npm test
```
Expected: 148 原有 + 新增（PlayerListCardMobile 3 + LeaderRowCardMobile 3 + ComparePlayerCardMobile 4 + AppHeader 4 + PlayersView 3 + LeadersView 3 + CompareView 3 = 23 新）= 171 单测全绿

- [ ] **Step 2: typecheck + build**

```bash
npm run typecheck && npm run build
```
Expected: 通过，无报错

- [ ] **Step 3: PC 端零影响手测（必做）**

启 dev server：`npm run dev`，浏览器访问下列路径，分别在 768 / 1024 / 1440 三宽度截图对比改造前（用 git stash 或 git log 切回旧版）：

1. `/eng.1/players` — 球员列表
2. `/eng.1/leaders` — 排行榜
3. `/eng.1/compare` — 球员对比
4. AppHeader — 任意页头

验收：4 处 × 3 宽度 = 12 张截图，每张与改造前视觉一致（表格结构、列、间距、点击行为）。允许的差异：无。

- [ ] **Step 4: 移动端体验手测**

375px 宽度（Chrome DevTools iPhone 12 / 微信浏览器模拟）逐页验证：

1. `/eng.1/players` — 卡片正常显示，点击跳详情，无横滑
2. `/eng.1/leaders` — 卡片正常显示，点击跳详情，分类 tab 横滑正常
3. `/eng.1/compare` — 卡片堆叠正常，max 标记显示，移除按钮可用，添加球员正常
4. AppHeader 搜索图标按钮可见，点击弹全屏层，输入搜索，回车跳详情，取消关闭层

- [ ] **Step 5: i18n 不退化手测**

中文模式：所有移动端卡片文案正确（球员中文名 / 球队中文名 / 排行分类中文名 / "移除"按钮 / "取消"按钮）
英文模式：所有移动端卡片回退英文

- [ ] **Step 6: 写完工记录到 CLAUDE.md**

在 CLAUDE.md「军衔记录」表新增一行（待总司令亲批），并在「项目画像」段更新当前阶段。

- [ ] **Step 7: 最终 commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 加移动端卡片化方案 B 完工记录"
```

---

## 验收标准回顾（来自 spec）

1. PC 端零影响 ✅（Task 5/6/7 各 Step 6 + Task 8 Step 3）
2. 移动端卡片可用 ✅（Task 8 Step 4）
3. i18n 不退化 ✅（Task 8 Step 5）
4. 单测全绿 ✅（Task 8 Step 1）
5. typecheck/build 通过 ✅（Task 8 Step 2）
6. mockup 视觉一致 ✅（Task 1-3 实现按 mockup 风格）

---

## 自审

**Spec 覆盖**：
- ✅ PlayerListCardMobile（Task 1）
- ✅ LeaderRowCardMobile（Task 2）
- ✅ ComparePlayerCardMobile（Task 3）
- ✅ AppHeader 搜索图标 + 全屏层（Task 4）
- ✅ PlayersView 双 DOM（Task 5）
- ✅ LeadersView 双 DOM（Task 6）
- ✅ CompareView 双 DOM（Task 7）
- ✅ 验收（Task 8）

**类型一致性**：PlayerSummary / LeaderEntry / PlayerProfile / Team / Lang 全部从现有 types 引用；新组件 props 命名与 view 调用一致（player/team/rank/lang；entry/team/category/catDisplayName/lang；profile/team/rows/playerIndex/lang）。

**无占位**：每个 Task 都有完整代码块、明确测试期望、commit 命令。
