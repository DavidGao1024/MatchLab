# 移动端首页头部重设计实施计划（方案 A + 方案甲）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不影响 PC 端的前提下，把移动端头部从"一行挤爆"改成"统一两层"——首页/收藏页联赛整行一键切换，联赛相关页联赛收进「英超 ▾」下拉与页内导航同行，并修复手机点不开收藏下拉的 bug。

**Architecture:** 纯 CSS 断点（Tailwind `md:`）切换布局，不引入 JS 设备判断。AppHeader 顶行容器改 `flex-wrap md:flex-nowrap` + wrapper 条件显隐承载 LeagueTabs；新增移动端专属 LeaguePicker 下拉挂在 LeagueSubNav 行首；切联赛逻辑抽到共享 composable `useLeagueSwitch`；FavoritesDropdown 交互改指针事件以同时支持桌面 hover 与触屏点按。数据流 / store / 路由 / API 全部不动。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript strict + Vue Router 4 + Pinia + Tailwind 4 + Vitest(@vue/test-utils, jsdom)

**规格依据:** `docs/superpowers/specs/2026-08-07-mobile-header-design.md`
**Mockup:** `tmp/mockup/mobile-header.html`

---

## 文件清单

| 动作 | 文件 | 职责 |
|---|---|---|
| 新建 | `src/composables/useLeagueSwitch.ts` | 切联赛共享逻辑（active/label/pick） |
| 新建 | `src/components/layout/LeaguePicker.vue` | 移动端专属联赛下拉 |
| 改 | `src/components/layout/LeagueTabs.vue` | 改用 composable + 移动端加大触点 |
| 改 | `src/components/layout/LeagueSubNav.vue` | 行首挂 LeaguePicker + 移动端收窄间距 |
| 改 | `src/components/layout/AppHeader.vue` | 容器 flex-wrap、wrapper 条件显隐、logo/搜索图标移动端调整 |
| 改 | `src/components/layout/FavoritesDropdown.vue` | 指针事件 + 移动端图标角标 + 点外关闭 |
| 新建测试 | `tests/composables/useLeagueSwitch.test.ts` | composable 逻辑 |
| 新建测试 | `tests/components/LeaguePicker.test.ts` | 下拉开合/跳转/点外关闭 |
| 改测试 | `tests/components/AppHeader.test.ts` | 容器类 + wrapper 条件类 |
| 改测试 | `tests/components/FavoritesDropdown.test.ts` | 指针事件 + 角标 |

**测试约定**（现有代码如此，务必沿用）：无全局 vitest 配置、无 setup 文件；组件测试文件首行写 `// @vitest-environment jsdom`；`describe/it/expect/vi` 从 `vitest` 显式导入；运行 `npm test`（= `vitest run`）。

**提交约定**（CLAUDE.md 铁律）：只 `git add` 代码与文档路径（`src/ tests/ docs/ tmp/`），**绝不 `git add public/data/`**。

---

## Task 1: useLeagueSwitch composable（切联赛共享逻辑）

**Files:**
- Create: `src/composables/useLeagueSwitch.ts`
- Test: `tests/composables/useLeagueSwitch.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/composables/useLeagueSwitch.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useLeagueSwitch } from '../../src/composables/useLeagueSwitch'
import { useAppStore } from '../../src/stores/app'

// useLeagueSwitch 依赖 useRoute/useRouter，必须在组件 setup 内调用，故用宿主组件暴露返回值
const Host = defineComponent({
  setup() {
    const { active, label, pick } = useLeagueSwitch()
    return { active, label, pick }
  },
  render() {
    return h('div')
  },
})

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/:league/standings', name: 'standings', component: { template: '<div/>' } },
      { path: '/:league/schedule', name: 'schedule', component: { template: '<div/>' } },
      { path: '/:league/players', name: 'players', component: { template: '<div/>' } },
      { path: '/:league/player/:id', name: 'player-detail', component: { template: '<div/>' } },
      { path: '/:league/leaders', name: 'leaders', component: { template: '<div/>' } },
      { path: '/:league/team/:id', name: 'team-detail', component: { template: '<div/>' } },
      { path: '/:league/compare', name: 'compare', component: { template: '<div/>' } },
    ],
  })
}

async function setup(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = makeRouter()
  router.push(path)
  await router.isReady()
  const w = mount(Host, { global: { plugins: [router, pinia] } })
  return { w, router, app: useAppStore() }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('useLeagueSwitch', () => {
  it('active：联赛页取路由 league 参数', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.vm.active).toBe('eng.1')
  })

  it('active：首页回落 app.currentLeague', async () => {
    const { w, app } = await setup('/')
    app.setLeague('esp.1')
    await nextTick()
    expect(w.vm.active).toBe('esp.1')
  })

  it('label：加载 leagues 后按中文返回 nameZh', async () => {
    const { w, app } = await setup('/eng.1/standings')
    app.leagues = [
      { slug: 'eng.1', name: 'Premier League', nameZh: '英超', country: 'England', color: '#38003b', understatSlug: 'EPL', season: '2025', teams: 20, players: 500 },
    ]
    expect(w.vm.label('eng.1')).toBe('英超')
  })

  it('label：未加载 leagues 回落 slug', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.vm.label('eng.1')).toBe('eng.1')
  })

  it('pick：积分榜页切联赛留在积分榜', async () => {
    const { w, router } = await setup('/eng.1/standings')
    w.vm.pick('esp.1')
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/esp.1/standings')
  })

  it('pick：球员页切联赛留在球员页', async () => {
    const { w, router } = await setup('/eng.1/players')
    w.vm.pick('ita.1')
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/ita.1/players')
  })

  it('pick：球队详情页切联赛回该联赛积分榜', async () => {
    const { w, router } = await setup('/eng.1/team/359')
    w.vm.pick('ger.1')
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/ger.1/standings')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/composables/useLeagueSwitch.test.ts`
Expected: FAIL，报 `Cannot find module '../../src/composables/useLeagueSwitch'`

- [ ] **Step 3: 实现 composable**

新建 `src/composables/useLeagueSwitch.ts`：

```ts
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { isLeagueSlug, type LeagueSlug } from '../utils/constants'

/**
 * 切联赛共享逻辑（LeagueTabs 与 LeaguePicker 共用）。
 * 由 LeagueTabs.vue 原有逻辑抽出，行为不变：纯前端路由，不碰 store 数据/API。
 */
export function useLeagueSwitch() {
  const app = useAppStore()
  const route = useRoute()
  const router = useRouter()

  // 高亮跟随路由；首页（无 league 参数）回落到焦点联赛
  const active = computed<LeagueSlug>(() => {
    const p = route.params.league
    return typeof p === 'string' && isLeagueSlug(p) ? p : app.currentLeague
  })

  function label(slug: LeagueSlug): string {
    const info = app.leagueInfo(slug)
    if (!info) return slug
    return app.lang === 'zh' ? info.nameZh : info.name
  }

  // 切联赛留在当前页面类型（按路由名判断，不拆路径字符串）
  function pick(slug: LeagueSlug) {
    const n = String(route.name ?? '')
    if (n === 'schedule' || n === 'schedule-month') router.push(`/${slug}/schedule`)
    else if (n === 'players' || n === 'player-detail') router.push(`/${slug}/players`)
    else if (n === 'leaders') router.push(`/${slug}/leaders`)
    else if (n === 'compare') router.push(`/${slug}/compare`)
    else router.push(`/${slug}/standings`)
  }

  return { active, label, pick }
}
```

注：原 LeagueTabs 里 `team-detail` 分支与兜底 `else` 都 push `standings`，等价合并进 `else`，行为不变。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/composables/useLeagueSwitch.test.ts`
Expected: PASS（7 项全绿）

- [ ] **Step 5: 提交**

```bash
git add src/composables/useLeagueSwitch.ts tests/composables/useLeagueSwitch.test.ts
git commit -m "feat: 抽出 useLeagueSwitch 切联赛共享 composable（供 LeagueTabs/LeaguePicker 复用）"
```

---

## Task 2: LeagueTabs 改用 composable + 移动端加大触点

**Files:**
- Modify: `src/components/layout/LeagueTabs.vue`（整体替换）
- Test: `tests/components/LeagueTabs.test.ts`（新建）

- [ ] **Step 1: 写失败测试**

新建 `tests/components/LeagueTabs.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LeagueTabs from '../../src/components/layout/LeagueTabs.vue'
import { useAppStore } from '../../src/stores/app'
import { LEAGUE_SLUGS } from '../../src/utils/constants'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/:league/standings', name: 'standings', component: { template: '<div/>' } },
    ],
  })
}

async function setup(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = useAppStore()
  app.leagues = LEAGUE_SLUGS.map((slug) => ({
    slug, name: slug, nameZh: { 'eng.1': '英超', 'esp.1': '西甲', 'ita.1': '意甲', 'ger.1': '德甲', 'fra.1': '法甲', 'chn.1': '中超' }[slug] ?? slug,
    country: '', color: '#000', understatSlug: null, season: '2025', teams: 20, players: 500,
  }))
  const router = makeRouter()
  router.push(path)
  await router.isReady()
  const w = mount(LeagueTabs, { global: { plugins: [router, pinia] } })
  return { w, router }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('LeagueTabs', () => {
  it('渲染 6 个联赛按钮（中文模式）', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.findAll('button').length).toBe(6)
    expect(w.text()).toContain('英超')
    expect(w.text()).toContain('中超')
  })

  it('当前联赛按钮高亮（含 bg-white/10 类）', async () => {
    const { w } = await setup('/eng.1/standings')
    const btns = w.findAll('button')
    expect(btns[0].classes()).toContain('bg-white/10')
    expect(btns[1].classes()).not.toContain('bg-white/10')
  })

  it('点击其他联赛跳转同页类型', async () => {
    const { w, router } = await setup('/eng.1/standings')
    await w.findAll('button')[1].trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/esp.1/standings')
  })

  it('移动端加大触点（含 text-sm px-3.5 py-2 类）', async () => {
    const { w } = await setup('/eng.1/standings')
    const cls = w.findAll('button')[0].classes()
    expect(cls).toContain('text-sm')
    expect(cls).toContain('px-3.5')
    expect(cls).toContain('py-2')
    expect(cls).toContain('md:text-xs')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/LeagueTabs.test.ts`
Expected: FAIL（现 LeagueTabs 按钮是 `text-xs px-3 py-1.5`，"移动端加大触点"用例不通过；其余或可通过）

- [ ] **Step 3: 重写 LeagueTabs.vue**

整体替换 `src/components/layout/LeagueTabs.vue`：

```vue
<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { useLeagueSwitch } from '../../composables/useLeagueSwitch'
import { LEAGUE_SLUGS } from '../../utils/constants'

const app = useAppStore()
const { active, label, pick } = useLeagueSwitch()
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto" :aria-label="app.lang === 'zh' ? '联赛切换' : 'League switch'">
    <button
      v-for="slug in LEAGUE_SLUGS"
      :key="slug"
      type="button"
      @click="pick(slug)"
      class="font-cond tracking-wider whitespace-nowrap rounded transition-colors text-sm px-3.5 py-2 md:text-xs md:px-3 md:py-1.5"
      :class="
        slug === active
          ? 'text-white bg-white/10 shadow-[inset_0_-2px_0_var(--league-color)]'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      "
    >
      {{ label(slug) }}
    </button>
  </nav>
</template>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/LeagueTabs.test.ts`
Expected: PASS（4 项全绿）

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/LeagueTabs.vue tests/components/LeagueTabs.test.ts
git commit -m "refactor: LeagueTabs 改用 useLeagueSwitch 并加大移动端触点（行为不变）"
```

---

## Task 3: LeaguePicker 移动端联赛下拉组件

**Files:**
- Create: `src/components/layout/LeaguePicker.vue`
- Test: `tests/components/LeaguePicker.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/components/LeaguePicker.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LeaguePicker from '../../src/components/layout/LeaguePicker.vue'
import { useAppStore } from '../../src/stores/app'
import { LEAGUE_SLUGS } from '../../src/utils/constants'

const ZH: Record<string, string> = { 'eng.1': '英超', 'esp.1': '西甲', 'ita.1': '意甲', 'ger.1': '德甲', 'fra.1': '法甲', 'chn.1': '中超' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/:league/standings', name: 'standings', component: { template: '<div/>' } },
    ],
  })
}

async function setup(path = '/eng.1/standings') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = useAppStore()
  app.leagues = LEAGUE_SLUGS.map((slug) => ({
    slug, name: slug, nameZh: ZH[slug] ?? slug,
    country: '', color: '#000', understatSlug: null, season: '2025', teams: 20, players: 500,
  }))
  const router = makeRouter()
  router.push(path)
  await router.isReady()
  const w = mount(LeaguePicker, { global: { plugins: [router, pinia] } })
  return { w, router }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('LeaguePicker', () => {
  it('触发按钮显示当前联赛中文名', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.find('button').text()).toContain('英超')
  })

  it('默认收起，点击展开列出 6 联赛并高亮当前', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.findAll('button').length).toBe(1) // 仅触发按钮
    await w.find('button').trigger('click')
    const btns = w.findAll('button')
    expect(btns.length).toBe(1 + 6)
    expect(w.text()).toContain('中超')
    expect(btns[1].classes()).toContain('bg-white/10') // 英超高亮
  })

  it('点击某联赛跳转并收起', async () => {
    const { w, router } = await setup('/eng.1/standings')
    await w.find('button').trigger('click')
    await w.findAll('button')[2].trigger('click') // 西甲
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/esp.1/standings')
    expect(w.findAll('button').length).toBe(1) // 已收起
  })

  it('点击组件外部关闭面板', async () => {
    const { w } = await setup('/eng.1/standings')
    await w.find('button').trigger('click')
    expect(w.findAll('button').length).toBe(7)
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(w.findAll('button').length).toBe(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/LeaguePicker.test.ts`
Expected: FAIL，报 `Cannot find module '../../src/components/layout/LeaguePicker.vue'`

- [ ] **Step 3: 实现 LeaguePicker.vue**

新建 `src/components/layout/LeaguePicker.vue`：

```vue
<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useLeagueSwitch } from '../../composables/useLeagueSwitch'
import { LEAGUE_SLUGS, type LeagueSlug } from '../../utils/constants'

const { active, label, pick } = useLeagueSwitch()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function choose(slug: LeagueSlug) {
  open.value = false
  pick(slug)
}

// 点外关闭：仅在打开时挂 document click，点在组件外则收起
function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
watch(open, (v) => {
  if (v) document.addEventListener('click', onDocClick)
  else document.removeEventListener('click', onDocClick)
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative md:hidden self-center shrink-0">
    <button
      type="button"
      class="flex items-center gap-1 whitespace-nowrap rounded border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white"
      :aria-label="label(active)"
      @click.stop="toggle"
    >
      {{ label(active) }}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <div
      v-if="open"
      class="absolute left-0 top-full z-50 mt-1 w-40 rounded-md border border-slate-700 bg-slate-800 shadow-lg"
    >
      <button
        v-for="slug in LEAGUE_SLUGS"
        :key="slug"
        type="button"
        class="block w-full text-left px-3 py-2 text-sm whitespace-nowrap"
        :class="slug === active ? 'text-white bg-white/10' : 'text-slate-300 hover:bg-slate-700'"
        @click.stop="choose(slug)"
      >
        {{ label(slug) }}
      </button>
    </div>
  </div>
</template>
```

说明：面板用 `absolute top-full`，因 LeaguePicker 会挂在 LeagueSubNav 的 overflow 容器**之外**（见 Task 4），不会被 `overflow-x-auto` 裁掉。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/LeaguePicker.test.ts`
Expected: PASS（4 项全绿）

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/LeaguePicker.vue tests/components/LeaguePicker.test.ts
git commit -m "feat: 新增 LeaguePicker 移动端联赛下拉（点按开合/点外关闭/复用 useLeagueSwitch）"
```

---

## Task 4: LeagueSubNav 挂载 LeaguePicker + 移动端收窄间距

**Files:**
- Modify: `src/components/layout/LeagueSubNav.vue`（整体替换）
- Test: `tests/components/LeagueSubNav.test.ts`（新建）

说明：把 LeaguePicker 放到 overflow 容器**外层**的 flex 行里（picker 与滚动区是兄弟），避免下拉面板被 `overflow-x-auto` 裁掉。这是对规格"挂在行首"意图的等价实现（视觉仍在行首），规避裁切。桌面无影响（LeaguePicker 是 `md:hidden`）。

- [ ] **Step 1: 写失败测试**

新建 `tests/components/LeagueSubNav.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LeagueSubNav from '../../src/components/layout/LeagueSubNav.vue'
import { useAppStore } from '../../src/stores/app'
import { LEAGUE_SLUGS } from '../../src/utils/constants'

const ZH: Record<string, string> = { 'eng.1': '英超', 'esp.1': '西甲', 'ita.1': '意甲', 'ger.1': '德甲', 'fra.1': '法甲', 'chn.1': '中超' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/:league/standings', name: 'standings', component: { template: '<div/>' } },
    ],
  })
}

async function setup(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = useAppStore()
  app.leagues = LEAGUE_SLUGS.map((slug) => ({
    slug, name: slug, nameZh: ZH[slug] ?? slug,
    country: '', color: '#000', understatSlug: null, season: '2025', teams: 20, players: 500,
  }))
  const router = makeRouter()
  router.push(path)
  await router.isReady()
  const w = mount(LeagueSubNav, { global: { plugins: [router, pinia] } })
  return { w }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('LeagueSubNav', () => {
  it('无 league 参数（首页）不渲染', async () => {
    const { w } = await setup('/')
    expect(w.find('nav').exists()).toBe(false)
  })

  it('联赛页渲染 LeaguePicker + 5 个页内导航链接', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.find('nav').exists()).toBe(true)
    expect(w.findAll('a').length).toBe(5)
    expect(w.text()).toContain('英超') // LeaguePicker 触发按钮
  })

  it('当前板块链接高亮', async () => {
    const { w } = await setup('/eng.1/standings')
    const links = w.findAll('a')
    expect(links[0].classes()).toContain('text-white') // 积分榜
    expect(links[1].classes()).not.toContain('text-white')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/LeagueSubNav.test.ts`
Expected: FAIL（现 LeagueSubNav 无 LeaguePicker，"渲染 LeaguePicker"用例文本不含『英超』）

- [ ] **Step 3: 整体替换 LeagueSubNav.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { isLeagueSlug, type LeagueSlug } from '../../utils/constants'
import LeaguePicker from './LeaguePicker.vue'

const app = useAppStore()
const route = useRoute()

const active = computed<LeagueSlug | null>(() => {
  const p = route.params.league
  return typeof p === 'string' && isLeagueSlug(p) ? p : null
})

interface SubTab {
  routeName: string
  path: (slug: LeagueSlug) => string
  labelZh: string
  labelEn: string
}

const TABS: SubTab[] = [
  { routeName: 'standings', path: (s) => `/${s}/standings`, labelZh: '积分榜', labelEn: 'Table' },
  { routeName: 'schedule', path: (s) => `/${s}/schedule`, labelZh: '赛程', labelEn: 'Fixtures' },
  { routeName: 'players', path: (s) => `/${s}/players`, labelZh: '球员', labelEn: 'Players' },
  { routeName: 'leaders', path: (s) => `/${s}/leaders`, labelZh: '排行榜', labelEn: 'Leaders' },
  { routeName: 'compare', path: (s) => `/${s}/compare`, labelZh: '对比', labelEn: 'Compare' },
]

function isActive(name: string): boolean {
  const cur = String(route.name ?? '')
  if (name === 'schedule') return cur === 'schedule' || cur === 'schedule-month'
  if (name === 'players') return cur === 'players' || cur === 'player-detail'
  return cur === name
}
</script>

<template>
  <nav v-if="active" class="border-b border-white/10 bg-[#0c101b]/60">
    <div class="max-w-[1600px] mx-auto px-2 md:px-4 flex items-center gap-1">
      <!-- 移动端联赛下拉（md:hidden，桌面不渲染）；放在 overflow 容器外，面板不被裁 -->
      <LeaguePicker />
      <div class="flex gap-1 overflow-x-auto">
        <router-link
          v-for="tab in TABS"
          :key="tab.routeName"
          :to="tab.path(active)"
          class="font-cond text-sm tracking-wider whitespace-nowrap border-b-2 transition-colors px-3 py-2 md:px-4 md:py-2.5"
          :class="
            isActive(tab.routeName)
              ? 'text-white border-[var(--league-color)]'
              : 'text-slate-400 hover:text-white border-transparent'
          "
        >
          {{ app.lang === 'zh' ? tab.labelZh : tab.labelEn }}
        </router-link>
      </div>
    </div>
  </nav>
</template>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/LeagueSubNav.test.ts`
Expected: PASS（3 项全绿）

- [ ] **Step 5: typecheck 确认模板类型无误**

Run: `npm run typecheck`
Expected: 通过（LeaguePicker 引入无类型错误）

- [ ] **Step 6: 提交**

```bash
git add src/components/layout/LeagueSubNav.vue tests/components/LeagueSubNav.test.ts
git commit -m "feat: LeagueSubNav 行首挂 LeaguePicker 并收窄移动端间距（桌面不变）"
```

---

## Task 5: AppHeader 布局重构（容器 flex-wrap + wrapper 条件显隐）

**Files:**
- Modify: `src/components/layout/AppHeader.vue`（整体替换）
- Test: `tests/components/AppHeader.test.ts`（在现有 4 项基础上新增）

说明：这是布局验证关键步（规格风险 #1）。改完先跑 AppHeader 测试，再进入 Task 6。wrapper 承载条件显隐类，避免 `hidden` 与 LeagueTabs 根 `flex` 冲突。

- [ ] **Step 1: 在 AppHeader.test.ts 追加失败测试**

现有 `tests/components/AppHeader.test.ts` 的 `makeRouter()` 只有 `'/'` 路由，需补联赛路由；并在 `describe` 内追加用例。把 `makeRouter` 替换为：

```ts
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/:league/standings', name: 'standings', component: { template: '<div/>' } },
    ],
  })
}
```

并在 `describe('AppHeader', ...)` 内追加：

```ts
  it('顶行容器带 flex-wrap 与 md:flex-nowrap', () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const container = w.find('header > div')
    expect(container.classes()).toContain('flex-wrap')
    expect(container.classes()).toContain('md:flex-nowrap')
  })

  it('首页路由：LeagueTabs wrapper 带 order-last w-full（移动端整行）', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()
    const w = mount(AppHeader, { global: { plugins: [router] } })
    const nav = w.find('nav.overflow-x-auto') // LeagueTabs 根
    const wrapper = nav.element.parentElement as HTMLElement
    expect(wrapper.className).toContain('order-last')
    expect(wrapper.className).toContain('w-full')
  })

  it('联赛路由：LeagueTabs wrapper 带 hidden（移动端交给 LeaguePicker）', async () => {
    const router = makeRouter()
    router.push('/eng.1/standings')
    await router.isReady()
    const w = mount(AppHeader, { global: { plugins: [router] } })
    const nav = w.find('nav.overflow-x-auto')
    const wrapper = nav.element.parentElement as HTMLElement
    expect(wrapper.className).toContain('hidden')
  })
```

注：联赛路由下 AppHeader 会渲染 LeagueSubNav → LeaguePicker，均为现有组件，无碍。

- [ ] **Step 2: 跑测试确认新增项失败**

Run: `npx vitest run tests/components/AppHeader.test.ts`
Expected: 新增 3 项 FAIL（容器无 flex-wrap、无 wrapper），原 4 项 PASS

- [ ] **Step 3: 整体替换 AppHeader.vue**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { isLeagueSlug } from '../../utils/constants'
import FavoritesDropdown from './FavoritesDropdown.vue'
import LeagueTabs from './LeagueTabs.vue'
import LeagueSubNav from './LeagueSubNav.vue'
import SearchBar from '../common/SearchBar.vue'

const app = useAppStore()
const route = useRoute()
const searchOpen = ref(false)

// 路由是否带合法 league 参数：决定移动端 LeagueTabs 整行显示还是隐藏（路由状态，非设备判断）
const hasActiveLeague = computed(() => {
  const p = route.params.league
  return typeof p === 'string' && isLeagueSlug(p)
})
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#0c101b]/80 backdrop-blur border-b border-white/10">
    <div class="max-w-[1600px] mx-auto px-4 py-2 md:py-3 flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2">
      <router-link
        to="/"
        class="font-score text-xl md:text-2xl tracking-[0.14em] text-white flex items-center gap-2 shrink-0"
      >
        <span
          class="w-2.5 h-2.5 rounded-full transition-colors duration-700"
          :style="{ background: 'var(--league-color)', boxShadow: '0 0 12px var(--league-color)' }"
        ></span>
        MATCHLAB
      </router-link>
      <!-- LeagueTabs 外裹 wrapper：显隐类挂 wrapper，避免 hidden 与组件根 flex 打架 -->
      <div
        :class="
          hasActiveLeague
            ? 'hidden md:block md:order-none md:w-auto md:ml-2'
            : 'order-last w-full md:order-none md:w-auto md:ml-2'
        "
      >
        <LeagueTabs />
      </div>
      <!-- PC 端搜索框：完全不动 -->
      <SearchBar class="ml-auto w-full max-w-xs hidden md:block" />
      <!-- 移动端搜索图标按钮 -->
      <button
        type="button"
        class="ml-auto md:hidden shrink-0 text-slate-300 hover:text-white p-1.5 rounded border border-white/15"
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

- [ ] **Step 4: 跑测试确认全部通过**

Run: `npx vitest run tests/components/AppHeader.test.ts`
Expected: PASS（原 4 项 + 新增 3 项全绿）

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/AppHeader.vue tests/components/AppHeader.test.ts
git commit -m "feat: AppHeader 移动端两层布局——容器 flex-wrap + LeagueTabs wrapper 条件显隐 + logo/搜索图标收窄"
```

---

## Task 6: FavoritesDropdown 指针事件 + 移动端图标角标 + 点外关闭

**Files:**
- Modify: `src/components/layout/FavoritesDropdown.vue`（整体替换）
- Test: `tests/components/FavoritesDropdown.test.ts`（更新）

说明：修复"手机点不开下拉"bug。外层 `@mouseenter/@mouseleave` 改 `@pointerenter/@pointerleave` 且仅 `pointerType === 'mouse'` 生效（桌面 hover 不变）；按钮 `@click.stop` 切换（触屏点按）；打开时点外关闭；移动端 ♥ 图标 + 角标（total=0 不渲染角标），桌面保留文字；补 aria-label。

- [ ] **Step 1: 整体替换测试文件 FavoritesDropdown.test.ts**

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import FavoritesDropdown from '../../src/components/layout/FavoritesDropdown.vue'
import { useUserDataStore } from '../../src/stores/userData'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div/>' } }],
})

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  __resetToast()
  __resetConfirm()
  vi.useFakeTimers()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.useRealTimers()
})

function firePointer(el: Element, type: string, pointerType: string) {
  const ev = new Event(type, { bubbles: true })
  ;(ev as any).pointerType = pointerType
  el.dispatchEvent(ev)
}

describe('FavoritesDropdown', () => {
  it('空收藏：鼠标悬停不显示下拉', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    expect(w.text()).toContain('收藏 (0)')
    firePointer(w.find('.relative').element, 'pointerenter', 'mouse')
    await nextTick()
    expect(w.find('.absolute').exists()).toBe(false)
  })

  it('有收藏：鼠标悬停显示列表（中文）', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    firePointer(w.find('.relative').element, 'pointerenter', 'mouse')
    await nextTick()
    expect(w.text()).toContain('阿森纳')
  })

  it('触屏 pointerenter（pointerType=touch）不展开', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    firePointer(w.find('.relative').element, 'pointerenter', 'touch')
    expect(w.find('.absolute').exists()).toBe(false)
  })

  it('点击按钮开合（触屏路径）', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    await w.find('button').trigger('click')
    expect(w.find('.absolute').exists()).toBe(true)
    await w.find('button').trigger('click')
    expect(w.find('.absolute').exists()).toBe(false)
  })

  it('打开后点击组件外部关闭', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    await w.find('button').trigger('click')
    expect(w.find('.absolute').exists()).toBe(true)
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    expect(w.find('.absolute').exists()).toBe(false)
  })

  it('total=0 移动端无角标；按钮有 aria-label', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    expect(w.find('.fav-badge').exists()).toBe(false)
    expect(w.find('button').attributes('aria-label')).toBe('收藏')
  })
})
```

注：jsdom 对 PointerEvent/`pointerType` 支持不稳，这里用 `firePointer` 手工构造事件赋 `pointerType` 再 dispatch，规避 `trigger` 塞不进属性的问题。

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/FavoritesDropdown.test.ts`
Expected: FAIL（现组件仍是 mouseenter，且无 fav-badge/aria-label/click 开合）

- [ ] **Step 3: 整体替换 FavoritesDropdown.vue**

```vue
<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useUserDataStore } from '../../stores/userData'
import { useAppStore } from '../../stores/app'
import { playerName, t, teamName } from '../../utils/i18n'

const store = useUserDataStore()
const app = useAppStore()
const router = useRouter()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const total = computed(() => store.favorites.teams.length + store.favorites.players.length)

// 仅鼠标指针触发悬停开合（桌面行为不变）；触屏 pointerType=touch 不触发
function onPointerEnter(e: PointerEvent) {
  if (e.pointerType === 'mouse') open.value = true
}
function onPointerLeave(e: PointerEvent) {
  if (e.pointerType === 'mouse') open.value = false
}
// 点按切换（触屏主路径；桌面点按只会收起已悬停展开的下拉，无副作用）
function toggle() {
  open.value = !open.value
}

// 点外关闭：仅打开时挂 document click，点在组件外则收起
function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
watch(open, (v) => {
  if (v) document.addEventListener('click', onDocClick)
  else document.removeEventListener('click', onDocClick)
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

function goTeam(league: string, id: number) {
  open.value = false
  router.push(`/${league}/team/${id}`)
}
function goPlayer(league: string, id: number) {
  open.value = false
  router.push(`/${league}/player/${id}`)
}
function goFavorites() {
  open.value = false
  router.push('/favorites')
}
</script>

<template>
  <div
    ref="root"
    class="relative"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <button
      type="button"
      :aria-label="t('nav.favorites', app.lang)"
      class="relative px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:opacity-80"
      @click.stop="toggle"
    >
      <!-- 移动端：♥ 图标 + 角标（total=0 不渲染角标） -->
      <span class="fav-icon md:hidden relative inline-flex items-center" aria-hidden="true">
        ♥
        <span
          v-if="total > 0"
          class="fav-badge absolute -top-1.5 -right-2 bg-blue-500 text-white text-[9px] rounded-full px-1 leading-4"
        >{{ total }}</span>
      </span>
      <!-- 桌面端：文字（不变） -->
      <span class="hidden md:inline">{{ t('nav.favorites', app.lang) }} ({{ total }})</span>
    </button>
    <div
      v-if="open && total > 0"
      class="absolute right-0 mt-2 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-40"
    >
      <button
        type="button"
        class="block w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="goFavorites"
      >
        {{ t('fav.viewAll', app.lang) }}
      </button>
      <div v-if="store.favorites.teams.length" class="px-3 py-1 text-xs text-slate-400">球队</div>
      <button
        v-for="tm in store.favorites.teams"
        :key="`t${tm.teamId}`"
        type="button"
        class="block w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="tm.teamId && goTeam(tm.league, tm.teamId)"
      >
        {{ teamName(tm.name, app.lang) }}
      </button>
      <div v-if="store.favorites.players.length" class="px-3 py-1 text-xs text-slate-400">球员</div>
      <button
        v-for="p in store.favorites.players"
        :key="`p${p.athleteId}`"
        type="button"
        class="block w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="p.athleteId && goPlayer(p.league, p.athleteId)"
      >
        {{ playerName(p.name, app.lang) }}
      </button>
    </div>
  </div>
</template>
```

注：原模板 `v-for="t in store.favorites.teams"` 的迭代变量 `t` 与 i18n 函数 `t` 同名会遮蔽，此处改名 `tm` 规避（行为不变）。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/FavoritesDropdown.test.ts`
Expected: PASS（6 项全绿）

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/FavoritesDropdown.vue tests/components/FavoritesDropdown.test.ts
git commit -m "fix: 收藏下拉改指针事件支持触屏点按——移动端图标角标+点外关闭+aria-label，桌面 hover 不变"
```

---

## Task 7: 全量回归 + typecheck + build

**Files:** 无新增改动，仅验证。

- [ ] **Step 1: 全量单测**

Run: `npm test`
Expected: 全绿（原有全部用例 + 本批新增/更新；若有红，定位回对应 Task 修复，不得跳过）

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 通过

- [ ] **Step 3: build**

Run: `npm run build`
Expected: 通过（vue-tsc + vite build 无错误）

- [ ] **Step 4: 浏览器手测（待总司令批准后执行；未批准则列入待回归清单）**

对照规格 §六手测清单逐项验证（375px 首页/收藏页两层、联赛相关页两层 + 下拉、768px 边界、768–920px 窄桌面不折行、≥1024px 与改造前一致、中/EN 双模式）。**项目约定：未经允许不开浏览器**——若无批准，把本清单原样记入交付说明待回归，不擅自开浏览器。

- [ ] **Step 5: 如有修复则提交**

```bash
git add src/ tests/
git commit -m "fix: 移动端头部重设计回归修复"
```

---

## 验收对照（规格 §七）

1. PC 端零影响：Task 5 容器 `md:flex-nowrap` + 桌面类保持；Task 6 桌面 hover 不变；Task 4 LeaguePicker `md:hidden`
2. 移动端统一两层：Task 5（首页联赛整行）+ Task 4/5（联赛页下拉 + 页内导航）
3. 收藏手机可点：Task 6
4. i18n 不退化：各组件沿用 `label/t/teamName/playerName`，Task 7 双模式手测
5. 单测全绿 + typecheck/build：Task 7
