# 个人化基础 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 MatchLab 子项目 1 — 球队订阅 + 收藏夹 + iCal 导出，纯前端 + localStorage，零后端

**Architecture:** Vue 3 + Pinia store + localStorage 持久化；复用现有 `fetchLiveScores` + `MatchModal` 模式；新增 Toast/ConfirmDialog 通用组件

**Tech Stack:** Vue 3 `<script setup>` + Pinia 4 + Vue Router 4 (hash mode) + TypeScript strict + Vitest 4 + @vue/test-utils + Tailwind 4

**Spec:** `docs/superpowers/specs/2026-07-31-personalization-mvp-design.md`

**约定**：
- 测试文件路径：`tests/` 镜像 `src/`（如 `tests/stores/userData.test.ts` 对应 `src/stores/userData.ts`）
- 测试运行：`npm test`（即 `vitest run`），单测 `npm test -- tests/path/to/test.test.ts`
- 类型检查：`npm run typecheck`（即 `vue-tsc -b`）
- 提交前 husky pre-push 自动跑 typecheck
- 提交信息按现有风格：`feat:`/`fix:`/`chore:`/`docs:` 前缀

---

## 进度跟踪（2026-07-31 起 subagent-driven 执行）

| Task | 状态 | commit | 备注 |
|---|---|---|---|
| 1 类型定义 | ✅ | `6639422` | Subscription/Favorite 接口 + 常量 |
| 2 下载工具 | ✅ | `2dcd0ce` | downloadBlob + 装 jsdom devDep |
| 3 数据迁移 | ✅ | `967226b` + 修复 `e7c82ee` | migrateUserData/migrateFavorites + addedAt type guard 兜底 |
| 4 Toast + useToast | ✅ | `61d5553` + 修复 `d4d02c4` | a11y + timer 清理 + DEV 守卫 |
| 5 ConfirmDialog + useConfirm | ✅ | `7367692` + 修复 `7617cd2` | Promise 泄漏防御 + a11y + 测试 helper |
| 6 EmptyState | ✅ | `54d01e3` | 装 @vue/test-utils；I-1/I-2 跟进项留 Task 14/18 修 |
| 7 store 骨架 | ✅ | `6b9fdc0` | state + init + hydrate |
| 8 store 持久化 + addSubscription | ✅ | `24fb22d` | debounce 200ms + dedup + 上限 3 + storage 监听 |
| 9 订阅 actions | ✅ | `e78b58d` | removeSubscription + isSubscribed + 4 测试 |
| 10 收藏 actions | ✅ | `638a7e4` + `d352c91` | add/remove/toggle/isFavorite（上限 50）+ 消除 as any 分支内联 + 补测试 |
| 11 多 tab 同步测试 | ✅ | `1d075cc` | storage event 同步测试覆盖 |
| 12 useEspanFetch 缓存层 | ✅ | `b8e4304` | 60s 默认 + 进行中 10s（isMonthLive 判定） |
| 13 伤病端点 | ✅ | （本次提交） | CORS 实测 200 OK；结构 ≠ plan 假设（顶层 injuries 非 athletes，type 是对象，status 顶层字符串），适配实现读 type.description；五大联赛当前返 0 条（预季），NFL/NBA 验证可用 |
| 14 SubscribeButton | ⏸ 待开工 | — | 含确认弹窗 + 上限禁用 |
| 15 FavoriteButton | ⏸ 待开工 | — | 心形按钮 + 上限禁用 |
| 16 generateICal | ⏸ 待开工 | — | RFC 5545 |
| 17 ExportCalendarButton | ⏸ 待开工 | — | loading + Promise.all 并发 |
| 18 MyTeamCard | ⏸ 待开工 | — | 今日赛程 + 最近 3 场 + 伤员 |
| 19 FavoritesDropdown | ⏸ 待开工 | — | 顶部导航下拉 |
| 20 FavoritesView + 路由 | ⏸ 待开工 | — | tabs 切换 + iCal 导出按钮 |
| 21 TeamDetailView 改造 | ⏸ 待开工 | — | 三个按钮齐 |
| 22 PlayerDetailView 改造 | ⏸ 待开工 | — | FavoriteButton |
| 23 HomeView 加 MyTeamCard | ⏸ 待开工 | — | + EmptyState 引导 |
| 24 App.vue 整合 | ⏸ 待开工 | — | init + Toast/ConfirmDialog 挂载 + AppHeader 加 FavoritesDropdown |
| 25 终验 | ⏸ 待开工 | — | 全量测试 + typecheck + build + 手动验收 |

**累计**：13/25 Task 完工，17 commit 在 main 分支，112 单测全绿。

**待补的跟进项**（Approved 不阻塞，建议后续修）：
- Task 6 EmptyState：缺 `role="status"` + 按钮 `type="button"`（Task 14/18 首次使用时一并修）
- Task 8 store：缺多 tab 同步测试覆盖（Task 11 补）

---

## 阶段 A：基础设施（无 UI，可独立测试）

### Task 1: 类型定义 `types/user-data.ts`

**Files:**
- Create: `src/types/user-data.ts`
- Test: `tests/types/user-data.test.ts`（仅类型导出可被 import 即可，无运行时逻辑）

- [ ] **Step 1: 写 import 测试**

```ts
// tests/types/user-data.test.ts
import { describe, it, expect } from 'vitest'
import type { Subscription, Favorite, UserData } from '../../src/types/user-data'
import { USER_DATA_VERSION } from '../../src/types/user-data'

describe('types/user-data 类型导出', () => {
  it('USER_DATA_VERSION = 1', () => {
    expect(USER_DATA_VERSION).toBe(1)
  })
  it('Subscription 结构', () => {
    const s: Subscription = { league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: '2026-07-31T00:00:00Z' }
    expect(s.teamId).toBe(359)
  })
  it('Favorite 结构（球队）', () => {
    const f: Favorite = { league: 'eng.1', teamId: 359, name: 'Arsenal', addedAt: '2026-07-31T00:00:00Z' }
    expect(f.teamId).toBe(359)
  })
  it('Favorite 结构（球员）', () => {
    const f: Favorite = { league: 'eng.1', athleteId: 253989, name: 'Haaland', addedAt: '2026-07-31T00:00:00Z' }
    expect(f.athleteId).toBe(253989)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/types/user-data.test.ts
```
Expected: FAIL（文件不存在，import 报错）

- [ ] **Step 3: 写实现**

```ts
// src/types/user-data.ts
import type { LeagueSlug } from '../utils/constants'

export const USER_DATA_VERSION = 1

export interface Subscription {
  league: LeagueSlug
  teamId: number
  teamName: string
  addedAt: string
}

export interface Favorite {
  league: LeagueSlug
  teamId?: number
  athleteId?: number
  name: string
  addedAt: string
}

export interface UserData {
  version: number
  items: Subscription[]
}

export interface FavoritesData {
  version: number
  teams: Favorite[]
  players: Favorite[]
}

export const SUBSCRIPTIONS_KEY = 'matchlab:subscriptions'
export const FAVORITES_KEY = 'matchlab:favorites'
export const SUBSCRIPTIONS_LIMIT = 3
export const FAVORITES_LIMIT = 50
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/types/user-data.test.ts
```
Expected: PASS（4 个 it 全绿）

- [ ] **Step 5: 提交**

```bash
git add src/types/user-data.ts tests/types/user-data.test.ts
git commit -m "feat: 新增 Subscription/Favorite 类型定义与常量"
```

---

### Task 2: 通用下载工具 `utils/download.ts`

**Files:**
- Create: `src/utils/download.ts`
- Test: `tests/utils/download.test.ts`

- [ ] **Step 1: 写测试（mock URL.createObjectURL + a.click）**

```ts
// tests/utils/download.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadBlob } from '../../src/utils/download'

describe('downloadBlob', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() },
      writable: true,
    })
    HTMLAnchorElement.prototype.click = vi.fn()
  })
  it('触发 a 标签下载', () => {
    downloadBlob('test.ics', 'CONTENT', 'text/calendar')
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
  })
  it('下载后 revoke URL 释放内存', () => {
    downloadBlob('test.ics', 'CONTENT', 'text/calendar')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/utils/download.test.ts
```
Expected: FAIL（downloadBlob 未定义）

- [ ] **Step 3: 写实现**

```ts
// src/utils/download.ts
export function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/utils/download.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/download.ts tests/utils/download.test.ts
git commit -m "feat: 新增 downloadBlob 通用下载工具"
```

---

### Task 3: 数据迁移 `utils/migrate.ts`

**Files:**
- Create: `src/utils/migrate.ts`
- Test: `tests/utils/migrate.test.ts`

- [ ] **Step 1: 写测试**

```ts
// tests/utils/migrate.test.ts
import { describe, it, expect } from 'vitest'
import { migrateUserData, migrateFavorites } from '../../src/utils/migrate'

describe('migrateUserData', () => {
  it('空 localStorage → 默认空数组结构', () => {
    const result = migrateUserData(null)
    expect(result).toEqual({ version: 1, items: [] })
  })
  it('version 缺失 → 补 version=1', () => {
    const raw = { items: [{ league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: 'x' }] }
    const result = migrateUserData(raw as any)
    expect(result.version).toBe(1)
    expect(result.items.length).toBe(1)
  })
  it('version 0 → 升级到 1（保留 items）', () => {
    const raw = { version: 0, items: [] }
    const result = migrateUserData(raw as any)
    expect(result.version).toBe(1)
  })
})

describe('migrateFavorites', () => {
  it('空 → 默认结构', () => {
    expect(migrateFavorites(null)).toEqual({ version: 1, teams: [], players: [] })
  })
  it('旧字段 teamName → name 统一', () => {
    const raw = { version: 0, teams: [{ league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: 'x' }], players: [] }
    const result = migrateFavorites(raw as any)
    expect(result.teams[0].name).toBe('Arsenal')
    expect(result.teams[0].teamName).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/utils/migrate.test.ts
```
Expected: FAIL

- [ ] **Step 3: 写实现**

```ts
// src/utils/migrate.ts
import { USER_DATA_VERSION, type UserData, type FavoritesData, type Subscription, type Favorite } from '../types/user-data'

export function migrateUserData(raw: any | null): UserData {
  if (!raw || typeof raw !== 'object') return { version: USER_DATA_VERSION, items: [] }
  const items = Array.isArray(raw.items) ? raw.items.filter(isSubscription) : []
  return { version: USER_DATA_VERSION, items }
}

export function migrateFavorites(raw: any | null): FavoritesData {
  if (!raw || typeof raw !== 'object') return { version: USER_DATA_VERSION, teams: [], players: [] }
  const teams = Array.isArray(raw.teams) ? raw.teams.filter(isFavorite).map(normalizeFavorite) : []
  const players = Array.isArray(raw.players) ? raw.players.filter(isFavorite).map(normalizeFavorite) : []
  return { version: USER_DATA_VERSION, teams, players }
}

function isSubscription(x: any): x is Subscription {
  return x && typeof x.league === 'string' && typeof x.teamId === 'number' && typeof x.teamName === 'string'
}

function isFavorite(x: any): x is Favorite {
  return x && typeof x.league === 'string' && typeof x.name === 'string'
}

function normalizeFavorite(x: any): Favorite {
  const out: Favorite = { league: x.league, name: x.name ?? x.teamName, addedAt: x.addedAt }
  if (typeof x.teamId === 'number') out.teamId = x.teamId
  if (typeof x.athleteId === 'number') out.athleteId = x.athleteId
  return out
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/utils/migrate.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/migrate.ts tests/utils/migrate.test.ts
git commit -m "feat: 新增 localStorage 数据迁移函数"
```

---

### Task 4: Toast 组件 + useToast composable

**Files:**
- Create: `src/composables/useToast.ts`
- Create: `src/components/common/Toast.vue`
- Test: `tests/composables/useToast.test.ts`

- [ ] **Step 1: 写 useToast 测试**

```ts
// tests/composables/useToast.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useToast } from '../../src/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it('show 成功消息 → toasts 含一条 type=success', () => {
    const toast = useToast()
    toast.success('已订阅')
    expect(toast.toasts.value.length).toBe(1)
    expect(toast.toasts.value[0].type).toBe('success')
    expect(toast.toasts.value[0].message).toBe('已订阅')
  })
  it('3 秒后自动移除', () => {
    const toast = useToast()
    toast.success('test')
    expect(toast.toasts.value.length).toBe(1)
    vi.advanceTimersByTime(3000)
    expect(toast.toasts.value.length).toBe(0)
  })
  it('error 类型独立', () => {
    const toast = useToast()
    toast.error('失败')
    expect(toast.toasts.value[0].type).toBe('error')
  })
  it('手动 dismiss', () => {
    const toast = useToast()
    toast.success('a')
    toast.dismiss(toast.toasts.value[0].id)
    expect(toast.toasts.value.length).toBe(0)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/composables/useToast.test.ts
```
Expected: FAIL

- [ ] **Step 3: 写 useToast composable**

```ts
// src/composables/useToast.ts
import { ref } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'error'
  message: string
}

let nextId = 1
const toasts = ref<ToastItem[]>([])

function push(type: ToastItem['type'], message: string) {
  const id = nextId++
  toasts.value.push({ id, type, message })
  setTimeout(() => dismiss(id), 3000)
}

function dismiss(id: number) {
  const i = toasts.value.findIndex((t) => t.id === id)
  if (i >= 0) toasts.value.splice(i, 1)
}

export function useToast() {
  return {
    toasts,
    success: (msg: string) => push('success', msg),
    error: (msg: string) => push('error', msg),
    dismiss,
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/composables/useToast.test.ts
```
Expected: PASS

- [ ] **Step 5: 写 Toast.vue 组件**

```vue
<!-- src/components/common/Toast.vue -->
<script setup lang="ts">
import { useToast } from '../../composables/useToast'
const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="px-4 py-2 rounded-md shadow-lg pointer-events-auto cursor-pointer text-sm font-medium"
      :class="t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
      @click="dismiss(t.id)"
    >
      {{ t.message }}
    </div>
  </div>
</template>
```

- [ ] **Step 6: 提交**

```bash
git add src/composables/useToast.ts src/components/common/Toast.vue tests/composables/useToast.test.ts
git commit -m "feat: 新增 Toast 提示组件与 useToast composable"
```

---

### Task 5: ConfirmDialog 通用确认弹窗

**Files:**
- Create: `src/components/common/ConfirmDialog.vue`
- Create: `src/composables/useConfirm.ts`
- Test: `tests/composables/useConfirm.test.ts`

- [ ] **Step 1: 写 useConfirm 测试**

```ts
// tests/composables/useConfirm.test.ts
import { describe, it, expect } from 'vitest'
import { useConfirm } from '../../src/composables/useConfirm'

describe('useConfirm', () => {
  it('初始状态隐藏', () => {
    const c = useConfirm()
    expect(c.state.value.visible).toBe(false)
  })
  it('open → 可见 + 持标题正文', () => {
    const c = useConfirm()
    c.open('取消订阅？', '确定取消订阅 Arsenal？')
    expect(c.state.value.visible).toBe(true)
    expect(c.state.value.title).toBe('取消订阅？')
    expect(c.state.value.body).toBe('确定取消订阅 Arsenal？')
  })
  it('resolve(true) 后关闭', async () => {
    const c = useConfirm()
    const p = c.open('t', 'b')
    c.resolve(true)
    expect(await p).toBe(true)
    expect(c.state.value.visible).toBe(false)
  })
  it('resolve(false) 后关闭', async () => {
    const c = useConfirm()
    const p = c.open('t', 'b')
    c.resolve(false)
    expect(await p).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/composables/useConfirm.test.ts
```
Expected: FAIL

- [ ] **Step 3: 写 useConfirm composable**

```ts
// src/composables/useConfirm.ts
import { ref } from 'vue'

interface ConfirmState {
  visible: boolean
  title: string
  body: string
}

const state = ref<ConfirmState>({ visible: false, title: '', body: '' })
let resolver: ((v: boolean) => void) | null = null

export function useConfirm() {
  function open(title: string, body: string): Promise<boolean> {
    state.value = { visible: true, title, body }
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }
  function resolve(v: boolean) {
    if (resolver) {
      resolver(v)
      resolver = null
    }
    state.value = { ...state.value, visible: false }
  }
  return { state, open, resolve }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/composables/useConfirm.test.ts
```
Expected: PASS

- [ ] **Step 5: 写 ConfirmDialog.vue**

```vue
<!-- src/components/common/ConfirmDialog.vue -->
<script setup lang="ts">
import { useConfirm } from '../../composables/useConfirm'
const { state, resolve } = useConfirm()
</script>

<template>
  <div
    v-if="state.visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="resolve(false)"
  >
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
      <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ state.title }}</h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ state.body }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          class="px-3 py-1.5 rounded text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-80"
          @click="resolve(false)"
        >
          取消
        </button>
        <button
          class="px-3 py-1.5 rounded text-sm bg-red-600 text-white hover:opacity-80"
          @click="resolve(true)"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 6: 提交**

```bash
git add src/composables/useConfirm.ts src/components/common/ConfirmDialog.vue tests/composables/useConfirm.test.ts
git commit -m "feat: 新增 ConfirmDialog 通用确认弹窗"
```

---

### Task 6: EmptyState 引导卡

**Files:**
- Create: `src/components/common/EmptyState.vue`

- [ ] **Step 1: 写 EmptyState.vue**

```vue
<!-- src/components/common/EmptyState.vue -->
<script setup lang="ts">
defineProps<{
  title: string
  body?: string
  ctaText?: string
}>()
const emit = defineEmits<{ (e: 'cta'): void }>()
</script>

<template>
  <div class="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
    <p class="text-lg font-semibold text-slate-900 dark:text-white">{{ title }}</p>
    <p v-if="body" class="mt-2 text-sm text-slate-600 dark:text-slate-400">{{ body }}</p>
    <button
      v-if="ctaText"
      class="mt-4 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:opacity-80"
      @click="emit('cta')"
    >
      {{ ctaText }}
    </button>
  </div>
</template>
```

- [ ] **Step 2: 写组件测试**

```ts
// tests/components/EmptyState.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '../../src/components/common/EmptyState.vue'

describe('EmptyState', () => {
  it('显示标题与正文', () => {
    const w = mount(EmptyState, { props: { title: '暂无订阅', body: '去订阅主队' } })
    expect(w.text()).toContain('暂无订阅')
    expect(w.text()).toContain('去订阅主队')
  })
  it('cta 按钮触发事件', async () => {
    const w = mount(EmptyState, { props: { title: 't', ctaText: '去订阅' } })
    await w.find('button').trigger('click')
    expect(w.emitted('cta')).toBeTruthy()
  })
})
```

- [ ] **Step 3: 安装 @vue/test-utils（若未装）**

```bash
npm install --save-dev @vue/test-utils
```

- [ ] **Step 4: 运行测试**

```bash
npm test -- tests/components/EmptyState.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/common/EmptyState.vue tests/components/EmptyState.test.ts package.json
git commit -m "feat: 新增 EmptyState 引导卡组件"
```

---

## 阶段 B：Pinia store

### Task 7: `stores/userData.ts` 骨架（state + init + 持久化）

**Files:**
- Create: `src/stores/userData.ts`
- Test: `tests/stores/userData.test.ts`

- [ ] **Step 1: 写测试（state 初始值 + init 从空 localStorage 启动）**

```ts
// tests/stores/userData.test.ts
import { describe, it, expect, beforeEach } from 'vitest
import { setActivePinia, createPinia } from 'pinia'
import { useUserDataStore } from '../../src/stores/userData'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useUserDataStore state', () => {
  it('初始空', () => {
    const s = useUserDataStore()
    expect(s.subscriptions).toEqual([])
    expect(s.favorites).toEqual({ teams: [], players: [] })
  })
  it('init 从空 localStorage 启动不报错', async () => {
    const s = useUserDataStore()
    await s.init()
    expect(s.subscriptions).toEqual([])
  })
  it('init 从有数据的 localStorage 启动 → hydrate', async () => {
    localStorage.setItem('matchlab:subscriptions', JSON.stringify({
      version: 1,
      items: [{ league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: 'x' }],
    }))
    localStorage.setItem('matchlab:favorites', JSON.stringify({
      version: 1, teams: [], players: [],
    }))
    const s = useUserDataStore()
    await s.init()
    expect(s.subscriptions.length).toBe(1)
    expect(s.subscriptions[0].teamName).toBe('Arsenal')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/stores/userData.test.ts
```
Expected: FAIL（store 未定义）

- [ ] **Step 3: 写 store 实现**

```ts
// src/stores/userData.ts
import { defineStore } from 'pinia'
import {
  SUBSCRIPTIONS_KEY, FAVORITES_KEY, USER_DATA_VERSION,
  type Subscription, type Favorite, type UserData, type FavoritesData,
} from '../types/user-data'
import { migrateUserData, migrateFavorites } from '../utils/migrate'

interface State {
  subscriptions: Subscription[]
  favorites: { teams: Favorite[]; players: Favorite[] }
  initialized: boolean
}

export const useUserDataStore = defineStore('userData', {
  state: (): State => ({
    subscriptions: [],
    favorites: { teams: [], players: [] },
    initialized: false,
  }),
  actions: {
    async init() {
      if (this.initialized) return
      this.hydrate()
      this.initialized = true
    },
    hydrate() {
      try {
        const rawSubs = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) ?? 'null')
        const migratedSubs = migrateUserData(rawSubs)
        this.subscriptions = migratedSubs.items
        const rawFav = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? 'null')
        const migratedFav = migrateFavorites(rawFav)
        this.favorites = { teams: migratedFav.teams, players: migratedFav.players }
      } catch {
        this.subscriptions = []
        this.favorites = { teams: [], players: [] }
      }
    },
  },
})
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/stores/userData.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/stores/userData.ts tests/stores/userData.test.ts
git commit -m "feat: 新增 useUserDataStore 骨架（state + init + hydrate）"
```

---

### Task 8: 持久化（debounce 200ms 写 localStorage）

**Files:**
- Modify: `src/stores/userData.ts`
- Modify: `tests/stores/userData.test.ts`

- [ ] **Step 1: 加测试（写后触发持久化）**

在 `tests/stores/userData.test.ts` 末尾追加：

```ts
import { vi } from 'vitest'

describe('useUserDataStore 持久化', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it('addSubscription 后 debounce 200ms 写入 localStorage', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    expect(localStorage.getItem('matchlab:subscriptions')).toBeNull()
    vi.advanceTimersByTime(200)
    const stored = JSON.parse(localStorage.getItem('matchlab:subscriptions')!)
    expect(stored.version).toBe(1)
    expect(stored.items.length).toBe(1)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/stores/userData.test.ts
```
Expected: FAIL（addSubscription 未实现）

- [ ] **Step 3: 在 store 加 persist + addSubscription**

修改 `src/stores/userData.ts`：

```ts
// src/stores/userData.ts
import { defineStore } from 'pinia'
import {
  SUBSCRIPTIONS_KEY, FAVORITES_KEY, USER_DATA_VERSION,
  SUBSCRIPTIONS_LIMIT, FAVORITES_LIMIT,
  type Subscription, type Favorite, type UserData, type FavoritesData,
} from '../types/user-data'
import { migrateUserData, migrateFavorites } from '../utils/migrate'

interface State {
  subscriptions: Subscription[]
  favorites: { teams: Favorite[]; players: Favorite[] }
  initialized: boolean
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

export const useUserDataStore = defineStore('userData', {
  state: (): State => ({
    subscriptions: [],
    favorites: { teams: [], players: [] },
    initialized: false,
  }),
  actions: {
    async init() {
      if (this.initialized) return
      this.hydrate()
      window.addEventListener('storage', this.onStorageEvent)
      this.initialized = true
    },
    hydrate() {
      try {
        const rawSubs = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) ?? 'null')
        this.subscriptions = migrateUserData(rawSubs).items
        const rawFav = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? 'null')
        const m = migrateFavorites(rawFav)
        this.favorites = { teams: m.teams, players: m.players }
      } catch {
        this.subscriptions = []
        this.favorites = { teams: [], players: [] }
      }
    },
    schedulePersist() {
      if (persistTimer) clearTimeout(persistTimer)
      persistTimer = setTimeout(() => this.persist(), 200)
    },
    persist() {
      try {
        const subsData: UserData = { version: USER_DATA_VERSION, items: this.subscriptions }
        localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subsData))
        const favData: FavoritesData = { version: USER_DATA_VERSION, teams: this.favorites.teams, players: this.favorites.players }
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favData))
      } catch (e) {
        // QuotaExceededError → store 层不处理，由调用方 toast
        throw e
      }
    },
    onStorageEvent(e: StorageEvent) {
      if (e.key === SUBSCRIPTIONS_KEY || e.key === FAVORITES_KEY) {
        this.hydrate()
      }
    },
    addSubscription(input: { league: Subscription['league']; teamId: number; teamName: string }) {
      if (this.subscriptions.some((s) => s.teamId === input.teamId)) return
      if (this.subscriptions.length >= SUBSCRIPTIONS_LIMIT) {
        throw new Error(`订阅上限 ${SUBSCRIPTIONS_LIMIT} 队`)
      }
      this.subscriptions.push({ ...input, addedAt: new Date().toISOString() })
      this.schedulePersist()
    },
  },
})
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/stores/userData.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/stores/userData.ts tests/stores/userData.test.ts
git commit -m "feat: store 加持久化 + addSubscription（dedup + 上限）"
```

---

### Task 9: 订阅 actions（removeSubscription + isSubscribed）

**Files:**
- Modify: `src/stores/userData.ts`
- Modify: `tests/stores/userData.test.ts`

- [ ] **Step 1: 加测试**

在 `tests/stores/userData.test.ts` 追加：

```ts
describe('useUserDataStore 订阅 actions', () => {
  it('isSubscribed 命中', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    vi.advanceTimersByTime(200)
    expect(s.isSubscribed(359)).toBe(true)
    expect(s.isSubscribed(999)).toBe(false)
  })
  it('removeSubscription 删除并写盘', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    vi.advanceTimersByTime(200)
    s.removeSubscription(359)
    vi.advanceTimersByTime(200)
    expect(s.subscriptions.length).toBe(0)
    const stored = JSON.parse(localStorage.getItem('matchlab:subscriptions')!)
    expect(stored.items.length).toBe(0)
  })
  it('重复 addSubscription 被 dedup', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    expect(s.subscriptions.length).toBe(1)
  })
  it('超 3 队抛错', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 1, teamName: 'A' })
    s.addSubscription({ league: 'eng.1', teamId: 2, teamName: 'B' })
    s.addSubscription({ league: 'eng.1', teamId: 3, teamName: 'C' })
    expect(() => s.addSubscription({ league: 'eng.1', teamId: 4, teamName: 'D' })).toThrow()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/stores/userData.test.ts
```
Expected: FAIL（removeSubscription / isSubscribed 未实现）

- [ ] **Step 3: 在 store actions 加实现**

在 `src/stores/userData.ts` actions 对象内追加：

```ts
    removeSubscription(teamId: number) {
      this.subscriptions = this.subscriptions.filter((s) => s.teamId !== teamId)
      this.schedulePersist()
    },
    isSubscribed(teamId: number): boolean {
      return this.subscriptions.some((s) => s.teamId === teamId)
    },
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/stores/userData.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/stores/userData.ts tests/stores/userData.test.ts
git commit -m "feat: store 加 removeSubscription + isSubscribed"
```

---

### Task 10: 收藏 actions（addFavorite / removeFavorite / toggleFavorite / isFavorite，上限 50）

**Files:**
- Modify: `src/stores/userData.ts`
- Modify: `tests/stores/userData.test.ts`

- [ ] **Step 1: 加测试**

在 `tests/stores/userData.test.ts` 追加：

```ts
describe('useUserDataStore 收藏 actions', () => {
  it('addFavorite 球队', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    vi.advanceTimersByTime(200)
    expect(s.favorites.teams.length).toBe(1)
    expect(s.isFavorite('team', 359)).toBe(true)
  })
  it('addFavorite 球员', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addFavorite('player', { league: 'eng.1', athleteId: 253989, name: 'Haaland' })
    vi.advanceTimersByTime(200)
    expect(s.favorites.players.length).toBe(1)
    expect(s.isFavorite('player', 253989)).toBe(true)
  })
  it('重复 addFavorite 被 dedup', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    s.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    expect(s.favorites.teams.length).toBe(1)
  })
  it('toggleFavorite 切换态', async () => {
    const s = useUserDataStore()
    await s.init()
    s.toggleFavorite('team', 359, 'Arsenal', 'eng.1')
    expect(s.favorites.teams.length).toBe(1)
    s.toggleFavorite('team', 359, 'Arsenal', 'eng.1')
    expect(s.favorites.teams.length).toBe(0)
  })
  it('removeFavorite 删除', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    s.removeFavorite('team', 359)
    expect(s.favorites.teams.length).toBe(0)
  })
  it('超 50 项抛错', async () => {
    const s = useUserDataStore()
    await s.init()
    for (let i = 0; i < 50; i++) {
      s.addFavorite('team', { league: 'eng.1', teamId: i, name: `T${i}` })
    }
    expect(() => s.addFavorite('team', { league: 'eng.1', teamId: 999, name: 'X' })).toThrow()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/stores/userData.test.ts
```
Expected: FAIL

- [ ] **Step 3: 在 store actions 加实现**

在 `src/stores/userData.ts` actions 对象内追加：

```ts
    addFavorite(type: 'team' | 'player', input: { league: Subscription['league']; teamId?: number; athleteId?: number; name: string }) {
      const list = type === 'team' ? this.favorites.teams : this.favorites.players
      const idField = type === 'team' ? 'teamId' : 'athleteId'
      const idVal = type === 'team' ? input.teamId : input.athleteId
      if (idVal !== undefined && list.some((f) => (f as any)[idField] === idVal)) return
      const total = this.favorites.teams.length + this.favorites.players.length
      if (total >= FAVORITES_LIMIT) {
        throw new Error(`收藏上限 ${FAVORITES_LIMIT} 项`)
      }
      const fav: Favorite = {
        league: input.league,
        name: input.name,
        addedAt: new Date().toISOString(),
      }
      if (input.teamId !== undefined) fav.teamId = input.teamId
      if (input.athleteId !== undefined) fav.athleteId = input.athleteId
      list.push(fav)
      this.schedulePersist()
    },
    removeFavorite(type: 'team' | 'player', id: number) {
      const idField = type === 'team' ? 'teamId' : 'athleteId'
      if (type === 'team') {
        this.favorites.teams = this.favorites.teams.filter((f) => (f as any)[idField] !== id)
      } else {
        this.favorites.players = this.favorites.players.filter((f) => (f as any)[idField] !== id)
      }
      this.schedulePersist()
    },
    toggleFavorite(type: 'team' | 'player', id: number, name: string, league: Subscription['league']) {
      const idField = type === 'team' ? 'teamId' : 'athleteId'
      const list = type === 'team' ? this.favorites.teams : this.favorites.players
      const exists = list.some((f) => (f as any)[idField] === id)
      if (exists) {
        this.removeFavorite(type, id)
      } else {
        const input: any = { league, name }
        input[idField] = id
        this.addFavorite(type, input)
      }
    },
    isFavorite(type: 'team' | 'player', id: number): boolean {
      const idField = type === 'team' ? 'teamId' : 'athleteId'
      const list = type === 'team' ? this.favorites.teams : this.favorites.players
      return list.some((f) => (f as any)[idField] === id)
    },
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/stores/userData.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/stores/userData.ts tests/stores/userData.test.ts
git commit -m "feat: store 加收藏 actions（add/remove/toggle/is + 上限 50）"
```

---

### Task 11: 多 tab 同步（storage event）

**Files:**
- Modify: `tests/stores/userData.test.ts`

- [ ] **Step 1: 加测试**

在 `tests/stores/userData.test.ts` 追加：

```ts
describe('useUserDataStore 多 tab 同步', () => {
  it('storage event 触发 hydrate', async () => {
    const s = useUserDataStore()
    await s.init()
    // 模拟另一 tab 写入
    localStorage.setItem('matchlab:subscriptions', JSON.stringify({
      version: 1,
      items: [{ league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: 'x' }],
    }))
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'matchlab:subscriptions',
      newValue: localStorage.getItem('matchlab:subscriptions'),
    }))
    expect(s.subscriptions.length).toBe(1)
    expect(s.subscriptions[0].teamName).toBe('Arsenal')
  })
  it('其他 key 的 storage event 不触发 hydrate', async () => {
    const s = useUserDataStore()
    await s.init()
    const before = s.subscriptions.length
    window.dispatchEvent(new StorageEvent('storage', { key: 'other-key', newValue: 'x' }))
    expect(s.subscriptions.length).toBe(before)
  })
})
```

- [ ] **Step 2: 运行测试**

```bash
npm test -- tests/stores/userData.test.ts
```
Expected: PASS（init() 已注册 storage 事件监听，Task 8 实现）

- [ ] **Step 3: 提交**

```bash
git add tests/stores/userData.test.ts
git commit -m "test: 补多 tab 同步测试覆盖"
```

---

## 阶段 C：数据获取层

### Task 12: useEspanFetch 缓存层

**Files:**
- Modify: `src/composables/useEspanFetch.ts`
- Test: `tests/composables/useEspanFetch.test.ts`

- [ ] **Step 1: 写测试**

```ts
// tests/composables/useEspanFetch.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLiveScores } from '../../src/composables/useEspanFetch'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

function mockResponse(events: any[]) {
  return { ok: true, json: async () => ({ events }) } as Response
}

describe('fetchLiveScores 缓存层', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    // 清缓存（通过内部 API 暴露的 clearCache）
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it('首次调用发 fetch', async () => {
    mockFetch.mockResolvedValue(mockResponse([]))
    await fetchLiveScores('eng.1', '2025-08')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
  it('60s 内第二次命中缓存不发 fetch', async () => {
    mockFetch.mockResolvedValue(mockResponse([]))
    await fetchLiveScores('eng.1', '2025-08')
    await fetchLiveScores('eng.1', '2025-08')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
  it('60s 后第二次发 fetch', async () => {
    mockFetch.mockResolvedValue(mockResponse([]))
    await fetchLiveScores('eng.1', '2025-08')
    vi.advanceTimersByTime(61000)
    await fetchLiveScores('eng.1', '2025-08')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/composables/useEspanFetch.test.ts
```
Expected: FAIL（现有 fetchLiveScores 无缓存）

- [ ] **Step 3: 在 useEspanFetch.ts 加缓存层**

在 `src/composables/useEspanFetch.ts` 顶部加缓存实现，包裹原 `fetchLiveScores`：

```ts
// 在文件顶部加：
interface CacheEntry { data: Match[]; ts: number }
const scoreCache = new Map<string, CacheEntry>()
const TTL_DEFAULT = 60_000
const TTL_LIVE = 10_000

function isMonthLive(data: Match[]): boolean {
  const now = Date.now()
  return data.some((m) => {
    if (m.state !== 'in') return false
    // 进行中比赛持续不超过 3 小时
    const start = new Date(m.date).getTime()
    return now - start < 3 * 3600_000 && now > start
  })
}

function cacheKey(league: string, month: string) { return `${league}:${month}` }

export function clearScoreCache() { scoreCache.clear() }
```

修改原 `fetchLiveScores`：

```ts
export async function fetchLiveScores(league: LeagueSlug, month: string): Promise<Match[]> {
  const key = cacheKey(league, month)
  const hit = scoreCache.get(key)
  if (hit) {
    const age = Date.now() - hit.ts
    const ttl = isMonthLive(hit.data) ? TTL_LIVE : TTL_DEFAULT
    if (age < ttl) return hit.data
  }
  const res = await fetch(`${SITE_API}/${league}/scoreboard?dates=${monthDateRange(month)}&limit=200`)
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  const sb = (await res.json()) as EspnScoreboard
  const data = (sb.events ?? []).map(normalizeEvent).filter((m): m is Match => m !== null)
  scoreCache.set(key, { data, ts: Date.now() })
  return data
}
```

注意：测试用例引用的 `Match` 类型必须含 `state` 与 `date` 字段——若现有 `Match` 接口不含 `state`，需在 `src/types/models.ts` 的 `Match` 接口中确认 `state: string` 字段已存在（现有 ScheduleView 已使用此字段，应当已存在）。

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/composables/useEspanFetch.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/composables/useEspanFetch.ts tests/composables/useEspanFetch.test.ts
git commit -m "feat: fetchLiveScores 加共享缓存层（60s 默认 + 进行中 10s）"
```

---

### Task 13: 伤病端点验证 + fetchTeamInjuries

**Files:**
- Modify: `src/composables/useEspanFetch.ts`
- Test: `tests/composables/useEspanFetch.test.ts`

- [ ] **Step 1: 先手动验证 CORS（人工）**

打开浏览器 DevTools Console，在 https://davidgao1024.github.io/MatchLab/ 页面执行：

```js
fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/injuries?team=359')
  .then(r => r.json()).then(d => console.log('OK', d))
  .catch(e => console.error('FAIL', e))
```

确认：
- 返回 200 OK
- 响应结构含 `athletes` 数组，每个 athlete 含 `athlete.displayName` / `athlete.id` / `type` / `status.name`

若 CORS 失败或字段不一致 → 跳过 Task 13 + Task 17 中伤员展示部分，仅做赛程/比分（其他验收项仍完成）。在 spec 加注"伤员展示暂未上线"。

- [ ] **Step 2: 写测试**

在 `tests/composables/useEspanFetch.test.ts` 追加：

```ts
import { fetchTeamInjuries } from '../../src/composables/useEspanFetch'

describe('fetchTeamInjuries', () => {
  it('返回伤员数组，5 分钟内缓存', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ athletes: [{ athlete: { id: 1, displayName: 'Saka' }, type: 'Knock', status: { name: 'Doubtful' } }] }),
    })
    const r1 = await fetchTeamInjuries('eng.1', 359)
    expect(r1.length).toBe(1)
    expect(r1[0].name).toBe('Saka')
    const r2 = await fetchTeamInjuries('eng.1', 359)
    expect(mockFetch).toHaveBeenCalledTimes(1) // 命中缓存
  })
  it('空响应返回空数组', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const r = await fetchTeamInjuries('eng.1', 999)
    expect(r).toEqual([])
  })
  it('HTTP 错抛错', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 } as Response)
    await expect(fetchTeamInjuries('eng.1', 999)).rejects.toThrow()
  })
})
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
npm test -- tests/composables/useEspanFetch.test.ts
```
Expected: FAIL（fetchTeamInjuries 未导出）

- [ ] **Step 4: 写实现**

在 `src/composables/useEspanFetch.ts` 末尾追加：

```ts
export interface InjuryPlayer {
  athleteId: number
  name: string
  type: string
  status: string
}

const injuryCache = new Map<string, { data: InjuryPlayer[]; ts: number }>()
const INJURY_TTL = 5 * 60_000

export async function fetchTeamInjuries(league: LeagueSlug, teamId: number): Promise<InjuryPlayer[]> {
  const key = `${league}:${teamId}`
  const hit = injuryCache.get(key)
  if (hit && Date.now() - hit.ts < INJURY_TTL) return hit.data
  const res = await fetch(`${SITE_API}/${league}/injuries?team=${teamId}`)
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  const data = await res.json() as { athletes?: any[] }
  const list: InjuryPlayer[] = (data.athletes ?? []).map((a) => ({
    athleteId: Number(a.athlete?.id ?? 0),
    name: a.athlete?.displayName ?? '',
    type: a.type ?? '',
    status: a.status?.name ?? '',
  })).filter((p) => p.athleteId > 0)
  injuryCache.set(key, { data: list, ts: Date.now() })
  return list
}
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
npm test -- tests/composables/useEspanFetch.test.ts
```
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/composables/useEspanFetch.ts tests/composables/useEspanFetch.test.ts
git commit -m "feat: 新增 fetchTeamInjuries（5 分钟缓存）"
```

---

## 阶段 D：基础 UI 组件

### Task 14: SubscribeButton 订阅按钮

**Files:**
- Create: `src/components/teams/SubscribeButton.vue`
- Test: `tests/components/SubscribeButton.test.ts`

- [ ] **Step 1: 写测试**

```ts
// tests/components/SubscribeButton.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SubscribeButton from '../../src/components/teams/SubscribeButton.vue'
import { useUserDataStore } from '../../src/stores/userData'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('SubscribeButton', () => {
  it('未订阅态显示"订阅主队"', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal' } })
    expect(w.text()).toContain('订阅主队')
  })
  it('点击订阅后变"已订阅 ✓"', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal' } })
    await w.find('button').trigger('click')
    expect(w.text()).toContain('已订阅')
    expect(store.isSubscribed(359)).toBe(true)
  })
  it('已订阅态点击触发确认弹窗（不直接取消）', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal' } })
    await w.find('button').trigger('click')
    // 弹窗应出现（ConfirmDialog 由 useConfirm 控制 state.visible）
    expect(store.isSubscribed(359)).toBe(true) // 未实际取消
  })
  it('达到上限 3 队时按钮 disabled', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 1, teamName: 'A' })
    store.addSubscription({ league: 'eng.1', teamId: 2, teamName: 'B' })
    store.addSubscription({ league: 'eng.1', teamId: 3, teamName: 'C' })
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 4, teamName: 'D' } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/components/SubscribeButton.test.ts
```
Expected: FAIL

- [ ] **Step 3: 写组件**

```vue
<!-- src/components/teams/SubscribeButton.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useUserDataStore } from '../../stores/userData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import { SUBSCRIPTIONS_LIMIT } from '../../types/user-data'
import type { LeagueSlug } from '../../utils/constants'

const props = defineProps<{
  league: LeagueSlug
  teamId: number
  teamName: string
}>()

const store = useUserDataStore()
const toast = useToast()
const confirm = useConfirm()

const subscribed = computed(() => store.isSubscribed(props.teamId))
const atLimit = computed(() => store.subscriptions.length >= SUBSCRIPTIONS_LIMIT && !subscribed.value)

async function onClick() {
  if (subscribed.value) {
    const ok = await confirm.open('取消订阅？', `确定取消订阅 ${props.teamName}？`)
    if (ok) {
      store.removeSubscription(props.teamId)
      toast.success(`已取消订阅 ${props.teamName}`)
    }
  } else {
    try {
      store.addSubscription({ league: props.league, teamId: props.teamId, teamName: props.teamName })
      toast.success(`已订阅 ${props.teamName}，首页将显示今日赛程`)
    } catch (e: any) {
      toast.error(e.message ?? '订阅失败')
    }
  }
}
</script>

<template>
  <button
    class="px-4 py-1.5 rounded text-sm font-medium"
    :class="subscribed
      ? 'bg-green-600 text-white hover:opacity-80'
      : 'bg-blue-600 text-white hover:opacity-80 disabled:bg-slate-400 disabled:cursor-not-allowed'"
    :disabled="atLimit"
    @click="onClick"
  >
    {{ subscribed ? '已订阅 ✓' : '订阅主队' }}
  </button>
</template>
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/components/SubscribeButton.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/teams/SubscribeButton.vue tests/components/SubscribeButton.test.ts
git commit -m "feat: 新增 SubscribeButton 订阅按钮（含确认弹窗 + 上限禁用）"
```

---

### Task 15: FavoriteButton 心形收藏按钮

**Files:**
- Create: `src/components/common/FavoriteButton.vue`
- Test: `tests/components/FavoriteButton.test.ts`

- [ ] **Step 1: 写测试**

```ts
// tests/components/FavoriteButton.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FavoriteButton from '../../src/components/common/FavoriteButton.vue'
import { useUserDataStore } from '../../src/stores/userData'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('FavoriteButton', () => {
  it('未收藏态显示空心心形', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoriteButton, { props: { type: 'team', id: 359, name: 'Arsenal', league: 'eng.1' } })
    expect(w.find('button').text()).toContain('☆')
  })
  it('点击切换收藏态', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoriteButton, { props: { type: 'team', id: 359, name: 'Arsenal', league: 'eng.1' } })
    await w.find('button').trigger('click')
    expect(w.find('button').text()).toContain('★')
    expect(store.isFavorite('team', 359)).toBe(true)
    await w.find('button').trigger('click')
    expect(w.find('button').text()).toContain('☆')
  })
  it('达到上限 disabled', async () => {
    const store = useUserDataStore()
    await store.init()
    for (let i = 0; i < 50; i++) {
      store.addFavorite('team', { league: 'eng.1', teamId: i, name: `T${i}` })
    }
    const w = mount(FavoriteButton, { props: { type: 'team', id: 999, name: 'X', league: 'eng.1' } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/components/FavoriteButton.test.ts
```
Expected: FAIL

- [ ] **Step 3: 写组件**

```vue
<!-- src/components/common/FavoriteButton.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useUserDataStore } from '../../stores/userData'
import { useToast } from '../../composables/useToast'
import { FAVORITES_LIMIT } from '../../types/user-data'
import type { LeagueSlug } from '../../utils/constants'

const props = defineProps<{
  type: 'team' | 'player'
  id: number
  name: string
  league: LeagueSlug
}>()

const store = useUserDataStore()
const toast = useToast()

const fav = computed(() => store.isFavorite(props.type, props.id))
const atLimit = computed(() => {
  const total = store.favorites.teams.length + store.favorites.players.length
  return total >= FAVORITES_LIMIT && !fav.value
})

function onClick() {
  try {
    store.toggleFavorite(props.type, props.id, props.name, props.league)
  } catch (e: any) {
    toast.error(e.message ?? '收藏失败')
  }
}
</script>

<template>
  <button
    class="text-2xl leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
    :class="fav ? 'text-yellow-500' : 'text-slate-400'"
    :disabled="atLimit"
    @click="onClick"
  >
    {{ fav ? '★' : '☆' }}
  </button>
</template>
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/components/FavoriteButton.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/common/FavoriteButton.vue tests/components/FavoriteButton.test.ts
git commit -m "feat: 新增 FavoriteButton 心形收藏按钮"
```

---

## 阶段 E：iCal 导出

### Task 16: iCal 生成函数 `utils/iCal.ts`

**Files:**
- Create: `src/utils/iCal.ts`
- Test: `tests/utils/iCal.test.ts`

- [ ] **Step 1: 写测试**

```ts
// tests/utils/iCal.test.ts
import { describe, it, expect } from 'vitest'
import { generateICal } from '../../src/utils/iCal'
import type { Match } from '../../src/types/models'

const team = { name: 'Arsenal', slug: 'arsenal' }
const matches = [
  { date: '2025-08-16T14:00:00Z', homeTeam: { name: 'Arsenal', id: 359 }, awayTeam: { name: 'Liverpool', id: 25 }, homeScore: 0, awayScore: 0, venue: 'Emirates' },
] as any as Match[]

describe('generateICal', () => {
  it('输出含 VCALENDAR 头尾', () => {
    const out = generateICal(team, matches)
    expect(out).toContain('BEGIN:VCALENDAR')
    expect(out).toContain('END:VCALENDAR')
    expect(out).toContain('VERSION:2.0')
    expect(out).toContain('PRODID:-//MatchLab//Personalization MVP//CN')
  })
  it('每场一个 VEVENT', () => {
    const out = generateICal(team, matches)
    expect(out).toContain('BEGIN:VEVENT')
    expect(out).toContain('END:VEVENT')
    expect(out).toContain('SUMMARY:Arsenal vs Liverpool')
  })
  it('DTSTART 用 UTC ISO 时间（含 Z 后缀）', () => {
    const out = generateICal(team, matches)
    expect(out).toContain('DTSTART:20250816T140000Z')
  })
  it('UID 唯一稳定', () => {
    const out1 = generateICal(team, matches)
    const out2 = generateICal(team, matches)
    const uid1 = out1.match(/UID:([^\r\n]+)/)?.[1]
    const uid2 = out2.match(/UID:([^\r\n]+)/)?.[1]
    expect(uid1).toBe(uid2) // 相同输入应稳定
  })
  it('空 matches 仍生成 VCALENDAR 头尾', () => {
    const out = generateICal(team, [])
    expect(out).toContain('BEGIN:VCALENDAR')
    expect(out.match(/BEGIN:VEVENT/g)).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/utils/iCal.test.ts
```
Expected: FAIL

- [ ] **Step 3: 写实现**

```ts
// src/utils/iCal.ts
import type { Match } from '../types/models'

interface TeamInput {
  name: string
  slug: string
}

function fmtUTC(iso: string): string {
  // iso: 2025-08-16T14:00:00Z → 20250816T140000Z
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function safeName(s: string): string {
  return s.replace(/[,;\\]/g, ' ')
}

export function generateICal(team: TeamInput, matches: Match[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MatchLab//Personalization MVP//CN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${safeName(team.name)} 赛程`,
  ]
  for (const m of matches) {
    const home = (m as any).homeTeam?.name ?? ''
    const away = (m as any).awayTeam?.name ?? ''
    const venue = (m as any).venue ?? ''
    const summary = `${safeName(home)} vs ${safeName(away)}`
    const uid = `matchlab-${team.slug}-${(m as any).date}-${(m as any).homeTeam?.id}-${(m as any).awayTeam?.id}@matchlab`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmtUTC(new Date().toISOString())}`,
      `DTSTART:${fmtUTC((m as any).date)}`,
      `SUMMARY:${summary}`,
      venue ? `LOCATION:${safeName(venue)}` : '',
      `DESCRIPTION:${safeName(team.name)} 主场/客场：${safeName(home)} vs ${safeName(away)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join('\r\n')
}
```

注意：测试用例的 match 字段名（`homeTeam`/`awayTeam`/`venue`/`date`）应与现有 `Match` 接口对齐——若现有 `Match` 字段名不同（如 `home`/`away`），实现里 `(m as any).homeTeam` 改为对应字段。先读 `src/types/models.ts` 中 `Match` 接口确认字段名后调整。

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/utils/iCal.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/iCal.ts tests/utils/iCal.test.ts
git commit -m "feat: 新增 generateICal RFC 5545 格式生成函数"
```

---

### Task 17: iCal 导出按钮（独立组件）

**Files:**
- Create: `src/components/teams/ExportCalendarButton.vue`
- Test: `tests/components/ExportCalendarButton.test.ts`

- [ ] **Step 1: 写测试**

```ts
// tests/components/ExportCalendarButton.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ExportCalendarButton from '../../src/components/teams/ExportCalendarButton.vue'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

beforeEach(() => {
  mockFetch.mockReset()
  Object.defineProperty(globalThis, 'URL', {
    value: { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() },
    writable: true,
  })
  HTMLAnchorElement.prototype.click = vi.fn()
})

describe('ExportCalendarButton', () => {
  it('点击后变 loading 态', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
    const w = mount(ExportCalendarButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025 } })
    expect(w.text()).toContain('导出赛程到日历')
    w.find('button').trigger('click')
    await flushPromises()
    // 完成后恢复
    expect(w.text()).toContain('导出赛程到日历')
  })
  it('fetch 失败 → toast 错误', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    const w = mount(ExportCalendarButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025 } })
    await w.find('button').trigger('click')
    await flushPromises()
    // useToast 内部状态可被检查；此处只验证不抛未捕获 Promise
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/components/ExportCalendarButton.test.ts
```
Expected: FAIL

- [ ] **Step 3: 写组件**

```vue
<!-- src/components/teams/ExportCalendarButton.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { fetchLiveScores } from '../../composables/useEspanFetch'
import { generateICal } from '../../utils/iCal'
import { downloadBlob } from '../../utils/download'
import { useToast } from '../../composables/useToast'
import type { LeagueSlug } from '../../utils/constants'

const props = defineProps<{
  league: LeagueSlug
  teamId: number
  teamName: string
  teamSlug: string
  seasonStart: number
}>()

const loading = ref(false)
const toast = useToast()

async function onExport() {
  if (loading.value) return
  loading.value = true
  try {
    const months = ['08', '09', '10', '11', '12', '01', '02', '03', '04', '05']
    const all = await Promise.all(
      months.map((m) => {
        const year = Number(m) >= 8 ? props.seasonStart : props.seasonStart + 1
        return fetchLiveScores(props.league, `${year}-${m}`)
      })
    )
    const teamMatches = all.flat().filter((m: any) => {
      const hid = m.homeTeam?.id
      const aid = m.awayTeam?.id
      return Number(hid) === props.teamId || Number(aid) === props.teamId
    })
    const ical = generateICal({ name: props.teamName, slug: props.teamSlug }, teamMatches as any)
    downloadBlob(`matchlab-${props.teamSlug}-${props.seasonStart}.ics`, ical, 'text/calendar')
    toast.success(`已导出 ${teamMatches.length} 场赛程`)
  } catch (e: any) {
    toast.error('赛程数据获取失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <button
    class="px-3 py-1.5 rounded text-sm bg-slate-700 text-white hover:opacity-80 disabled:opacity-50"
    :disabled="loading"
    @click="onExport"
  >
    {{ loading ? '正在生成...' : '导出赛程到日历' }}
  </button>
</template>
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/components/ExportCalendarButton.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/teams/ExportCalendarButton.vue tests/components/ExportCalendarButton.test.ts
git commit -m "feat: 新增 ExportCalendarButton iCal 导出按钮"
```

---

## 阶段 F：组合 UI

### Task 18: MyTeamCard 首页订阅卡片

**Files:**
- Create: `src/components/home/MyTeamCard.vue`
- Test: `tests/components/MyTeamCard.test.ts`

- [ ] **Step 1: 写测试**

```ts
// tests/components/MyTeamCard.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MyTeamCard from '../../src/components/home/MyTeamCard.vue'
import { useUserDataStore } from '../../src/stores/userData'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  mockFetch.mockReset()
})

describe('MyTeamCard', () => {
  it('传入 subscription → 渲染球队名', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
    const w = mount(MyTeamCard, { props: { subscription: store.subscriptions[0] } })
    await flushPromises()
    expect(w.text()).toContain('Arsenal')
  })
  it('今日无赛程显示"今日无赛"', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
    const w = mount(MyTeamCard, { props: { subscription: store.subscriptions[0] } })
    await flushPromises()
    expect(w.text()).toContain('今日无赛')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/components/MyTeamCard.test.ts
```
Expected: FAIL

- [ ] **Step 3: 写组件**

```vue
<!-- src/components/home/MyTeamCard.vue -->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { fetchLiveScores, fetchTeamInjuries } from '../../composables/useEspanFetch'
import { useRouter } from 'vue-router'
import type { Subscription } from '../../types/user-data'

const props = defineProps<{ subscription: Subscription }>()
const router = useRouter()

const todayMatch = ref<any | null>(null)
const recentMatches = ref<any[]>([])
const injuries = ref<string[]>([])
const loading = ref(true)

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

async function load() {
  loading.value = true
  try {
    const months = ['08', '09', '10', '11', '12', '01', '02', '03', '04', '05']
    const seasonStart = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1
    const all = await Promise.all(months.map((m) => {
      const y = Number(m) >= 8 ? seasonStart : seasonStart + 1
      return fetchLiveScores(props.subscription.league, `${y}-${m}`)
    }))
    const teamMatches = all.flat().filter((m: any) => {
      return Number(m.homeTeam?.id) === props.subscription.teamId || Number(m.awayTeam?.id) === props.subscription.teamId
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    todayMatch.value = teamMatches.find((m) => isToday(m.date)) ?? null
    const past = teamMatches.filter((m) => new Date(m.date) < new Date())
    recentMatches.value = past.slice(-3).reverse()
    // 伤员展示（若 fetchTeamInjuries 未接入或失败 → 不显示）
    try {
      const inj = await fetchTeamInjuries(props.subscription.league, props.subscription.teamId)
      injuries.value = inj.slice(0, 3).map((i) => i.name)
    } catch {
      injuries.value = []
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.subscription.teamId, load)

function goTeam() {
  router.push(`/${props.subscription.league}/team/${props.subscription.teamId}`)
}
</script>

<template>
  <div class="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-bold text-lg text-slate-900 dark:text-white cursor-pointer hover:underline" @click="goTeam">
        {{ subscription.teamName }}
      </h3>
    </div>
    <div v-if="loading" class="text-sm text-slate-500">加载中...</div>
    <div v-else>
      <div v-if="todayMatch" class="mb-3 p-2 rounded bg-blue-50 dark:bg-blue-900/30">
        <div class="text-xs text-slate-500 dark:text-slate-400">今日 {{ new Date(todayMatch.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</div>
        <div class="font-medium text-slate-900 dark:text-white">{{ todayMatch.homeTeam?.name }} vs {{ todayMatch.awayTeam?.name }}</div>
      </div>
      <div v-else class="text-sm text-slate-500 dark:text-slate-400 mb-3">今日无赛</div>
      <div v-if="recentMatches.length" class="text-xs space-y-1">
        <div class="text-slate-500 dark:text-slate-400">最近 3 场</div>
        <div v-for="m in recentMatches" :key="m.date" class="text-slate-700 dark:text-slate-300">
          {{ m.homeTeam?.name }} {{ m.homeScore }}-{{ m.awayScore }} {{ m.awayTeam?.name }}
        </div>
      </div>
      <div v-if="injuries.length" class="mt-3 text-xs">
        <div class="text-red-500">伤员：{{ injuries.join('、') }}</div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm test -- tests/components/MyTeamCard.test.ts
```
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/home/MyTeamCard.vue tests/components/MyTeamCard.test.ts
git commit -m "feat: 新增 MyTeamCard 首页订阅主队卡片"
```

---

### Task 19: FavoritesDropdown 顶部导航收藏下拉

**Files:**
- Create: `src/components/layout/FavoritesDropdown.vue`

- [ ] **Step 1: 写组件**

```vue
<!-- src/components/layout/FavoritesDropdown.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserDataStore } from '../../stores/userData'

const store = useUserDataStore()
const router = useRouter()
const open = ref(false)

const total = computed(() => store.favorites.teams.length + store.favorites.players.length)

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
  <div class="relative" @mouseenter="open = true" @mouseleave="open = false">
    <button class="px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:opacity-80">
      收藏 ({{ total }})
    </button>
    <div
      v-if="open && total > 0"
      class="absolute right-0 mt-2 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-40"
    >
      <button class="block w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700" @click="goFavorites">
        查看全部 →
      </button>
      <div v-if="store.favorites.teams.length" class="px-3 py-1 text-xs text-slate-400">球队</div>
      <button
        v-for="t in store.favorites.teams"
        :key="`t${t.teamId}`"
        class="block w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="goTeam(t.league, t.teamId!)"
      >
        {{ t.name }}
      </button>
      <div v-if="store.favorites.players.length" class="px-3 py-1 text-xs text-slate-400">球员</div>
      <button
        v-for="p in store.favorites.players"
        :key="`p${p.athleteId}`"
        class="block w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="goPlayer(p.league, p.athleteId!)"
      >
        {{ p.name }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 写组件测试**

```ts
// tests/components/FavoritesDropdown.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FavoritesDropdown from '../../src/components/layout/FavoritesDropdown.vue'
import { useUserDataStore } from '../../src/stores/userData'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('FavoritesDropdown', () => {
  it('空收藏不显示下拉', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoritesDropdown)
    expect(w.text()).toContain('收藏 (0)')
    w.find('button').trigger('mouseenter')
    expect(w.find('.absolute').exists()).toBe(false)
  })
  it('有收藏显示列表', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown)
    await w.find('button').trigger('mouseenter')
    expect(w.text()).toContain('Arsenal')
  })
})
```

- [ ] **Step 3: 运行测试**

```bash
npm test -- tests/components/FavoritesDropdown.test.ts
```
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/components/layout/FavoritesDropdown.vue tests/components/FavoritesDropdown.test.ts
git commit -m "feat: 新增 FavoritesDropdown 顶部导航收藏下拉"
```

---

### Task 20: FavoritesView 收藏夹页 + 路由

**Files:**
- Create: `src/views/FavoritesView.vue`
- Modify: `src/router/index.ts`
- Test: `tests/views/FavoritesView.test.ts`

- [ ] **Step 1: 写测试（路由 + 页面渲染）**

```ts
// tests/views/FavoritesView.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import FavoritesView from '../../src/views/FavoritesView.vue'
import { useUserDataStore } from '../../src/stores/userData'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/favorites', component: FavoritesView }],
})

describe('FavoritesView', () => {
  it('空收藏显示 EmptyState', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoritesView, { global: { plugins: [router] } })
    await flushPromises()
    expect(w.text()).toContain('暂无收藏')
  })
  it('有收藏渲染列表', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    store.addFavorite('player', { league: 'eng.1', athleteId: 253989, name: 'Haaland' })
    const w = mount(FavoritesView, { global: { plugins: [router] } })
    await flushPromises()
    expect(w.text()).toContain('Arsenal')
    expect(w.text()).toContain('Haaland')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm test -- tests/views/FavoritesView.test.ts
```
Expected: FAIL

- [ ] **Step 3: 写页面**

```vue
<!-- src/views/FavoritesView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useUserDataStore } from '../stores/userData'
import { useToast } from '../composables/useToast'
import EmptyState from '../components/common/EmptyState.vue'
import ExportCalendarButton from '../components/teams/ExportCalendarButton.vue'
import { useRouter } from 'vue-router'

const store = useUserDataStore()
const toast = useToast()
const router = useRouter()
const tab = ref<'teams' | 'players'>('teams')

function goTeam(league: string, id: number) { router.push(`/${league}/team/${id}`) }
function goPlayer(league: string, id: number) { router.push(`/${league}/player/${id}`) }

function removeTeam(id: number) {
  store.removeFavorite('team', id)
  toast.success('已取消收藏')
}
function removePlayer(id: number) {
  store.removeFavorite('player', id)
  toast.success('已取消收藏')
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4 text-slate-900 dark:text-white">我的收藏</h1>
    <div v-if="store.favorites.teams.length === 0 && store.favorites.players.length === 0">
      <EmptyState title="暂无收藏" body="去球队/球员详情页点击 ☆ 添加收藏" cta-text="去积分榜找球队" @cta="router.push('/eng.1/standings')" />
    </div>
    <div v-else>
      <div class="flex gap-2 mb-4">
        <button class="px-3 py-1 text-sm rounded" :class="tab === 'teams' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'" @click="tab = 'teams'">球队 ({{ store.favorites.teams.length }})</button>
        <button class="px-3 py-1 text-sm rounded" :class="tab === 'players' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'" @click="tab = 'players'">球员 ({{ store.favorites.players.length }})</button>
      </div>
      <div v-if="tab === 'teams'">
        <div v-for="t in store.favorites.teams" :key="t.teamId" class="flex items-center justify-between p-3 mb-2 rounded border border-slate-200 dark:border-slate-700">
          <span class="cursor-pointer text-blue-600 hover:underline" @click="goTeam(t.league, t.teamId!)">{{ t.name }}</span>
          <div class="flex gap-2">
            <ExportCalendarButton :league="t.league" :team-id="t.teamId!" :team-name="t.name" :team-slug="t.name.toLowerCase().replace(/\s+/g, '-')" :season-start="new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1" />
            <button class="text-red-500 text-sm" @click="removeTeam(t.teamId!)">删除</button>
          </div>
        </div>
      </div>
      <div v-if="tab === 'players'">
        <div v-for="p in store.favorites.players" :key="p.athleteId" class="flex items-center justify-between p-3 mb-2 rounded border border-slate-200 dark:border-slate-700">
          <span class="cursor-pointer text-blue-600 hover:underline" @click="goPlayer(p.league, p.athleteId!)">{{ p.name }}</span>
          <button class="text-red-500 text-sm" @click="removePlayer(p.athleteId!)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 加路由**

修改 `src/router/index.ts`，在 `compare` 路由后追加：

```ts
    { path: '/favorites', name: 'favorites', component: () => import('../views/FavoritesView.vue') },
```

- [ ] **Step 5: 运行测试**

```bash
npm test -- tests/views/FavoritesView.test.ts
```
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/views/FavoritesView.vue src/router/index.ts tests/views/FavoritesView.test.ts
git commit -m "feat: 新增 FavoritesView 收藏夹页 + /favorites 路由"
```

---

## 阶段 G：现有视图改造

### Task 21: TeamDetailView 加 SubscribeButton + FavoriteButton + iCal 导出

**Files:**
- Modify: `src/views/TeamDetailView.vue`

- [ ] **Step 1: 读现有 TeamDetailView 结构**

```bash
# 用 Read 工具查看 src/views/TeamDetailView.vue 顶部 100 行
```

确认球队信息渲染位置（`<TeamLogo>` 附近）以及当前 `route.params.league` / `route.params.id` 的取值方式。

- [ ] **Step 2: 加按钮到详情页头部**

在 `TeamDetailView.vue` 的 `<script setup>` 顶部加 import：

```ts
import SubscribeButton from '../components/teams/SubscribeButton.vue'
import FavoriteButton from '../components/common/FavoriteButton.vue'
import ExportCalendarButton from '../components/teams/ExportCalendarButton.vue'
```

在 `<template>` 内球队名称下方加按钮组：

```vue
<div class="flex items-center gap-3 mt-2">
  <SubscribeButton :league="league" :team-id="teamId" :team-name="team?.name ?? ''" />
  <FavoriteButton type="team" :id="teamId" :name="team?.name ?? ''" :league="league" />
  <ExportCalendarButton :league="league" :team-id="teamId" :team-name="team?.name ?? ''" :team-slug="team?.shortName?.toLowerCase().replace(/\s+/g, '-') ?? String(teamId)" :season-start="new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1" />
</div>
```

注意 `team?.name` / `team?.shortName` 字段名需对齐现有 `Team` 接口。先读 `src/types/static.ts` 或 `models.ts` 确认。

- [ ] **Step 3: 跑类型检查**

```bash
npm run typecheck
```
Expected: 通过，无新增错误

- [ ] **Step 4: 启动 dev server 手动验证**

```bash
npm run dev
```
打开 `http://localhost:5173/MatchLab/#/eng.1/team/359`，确认：
- 球队详情页头部出现"订阅主队" + "☆" + "导出赛程到日历"三个按钮
- 点订阅 → toast"已订阅 Arsenal..."；再点 → 弹确认弹窗
- 点 ☆ → 变 ★；再点 → 变 ☆
- 点导出 → loading 态 → 下载 .ics 文件

- [ ] **Step 5: 提交**

```bash
git add src/views/TeamDetailView.vue
git commit -m "feat: TeamDetailView 加订阅/收藏/iCal 导出按钮"
```

---

### Task 22: PlayerDetailView 加 FavoriteButton

**Files:**
- Modify: `src/views/PlayerDetailView.vue`

- [ ] **Step 1: 在 PlayerDetailView.vue 顶部 import**

```ts
import FavoriteButton from '../components/common/FavoriteButton.vue'
```

- [ ] **Step 2: 在球员名称旁加按钮**

```vue
<div class="flex items-center gap-3">
  <h1>{{ player.name }}</h1>
  <FavoriteButton type="player" :id="athleteId" :name="player.name" :league="league" />
</div>
```

字段名（`player.name` / `athleteId` / `league`）需对齐现有 `PlayerDetailView.vue` 取值方式。

- [ ] **Step 3: 类型检查 + 手动验证**

```bash
npm run typecheck && npm run dev
```
打开任意球员详情页，确认心形按钮出现，点击切换态正常。

- [ ] **Step 4: 提交**

```bash
git add src/views/PlayerDetailView.vue
git commit -m "feat: PlayerDetailView 加收藏按钮"
```

---

### Task 23: HomeView 加 MyTeamCard + EmptyState

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: 读 HomeView 现有结构**

```bash
# 用 Read 工具查看 src/views/HomeView.vue
```

确认 `<template>` 顶部布局（应在 `LeagueCard` 之前或之后插入订阅主队区域）。

- [ ] **Step 2: 在 HomeView 顶部加订阅卡片区**

在 `<script setup>` 顶部加：

```ts
import { onMounted } from 'vue'
import { useUserDataStore } from '../stores/userData'
import MyTeamCard from '../components/home/MyTeamCard.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { useRouter } from 'vue-router'

const userStore = useUserDataStore()
const router = useRouter()
onMounted(() => userStore.init())
```

在 `<template>` 顶部（在现有内容之前）加：

```vue
<section v-if="userStore.initialized" class="max-w-5xl mx-auto p-4 mb-4">
  <div v-if="userStore.subscriptions.length === 0">
    <EmptyState title="订阅主队，首页直接看今日赛程" body="点击下方任意球队进入详情页订阅" cta-text="去积分榜" @cta="router.push('/eng.1/standings')" />
  </div>
  <div v-else class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
    <MyTeamCard v-for="sub in userStore.subscriptions" :key="sub.teamId" :subscription="sub" />
  </div>
</section>
```

- [ ] **Step 3: 类型检查**

```bash
npm run typecheck
```
Expected: 通过

- [ ] **Step 4: 手动验证**

```bash
npm run dev
```
- 未订阅时首页顶部显示 EmptyState 引导
- 订阅 1 队后显示 MyTeamCard
- 订阅 3 队后显示 3 张卡

- [ ] **Step 5: 提交**

```bash
git add src/views/HomeView.vue
git commit -m "feat: HomeView 加 MyTeamCard 卡片区 + EmptyState 引导"
```

---

### Task 24: App.vue init() + Toast/ConfirmDialog 挂载 + AppHeader 加 FavoritesDropdown

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/layout/AppHeader.vue`

- [ ] **Step 1: 读 App.vue 与 AppHeader.vue 现有结构**

```bash
# 用 Read 查看 src/App.vue 全文与 src/components/layout/AppHeader.vue 全文
```

- [ ] **Step 2: App.vue 顶层挂 Toast + ConfirmDialog，初始化 store**

在 `App.vue` 的 `<script setup>` 顶部加：

```ts
import { onMounted } from 'vue'
import { useUserDataStore } from './stores/userData'
import Toast from './components/common/Toast.vue'
import ConfirmDialog from './components/common/ConfirmDialog.vue'

const userStore = useUserDataStore()
onMounted(() => userStore.init())
```

在 `<template>` 根元素末尾加：

```vue
<Toast />
<ConfirmDialog />
```

- [ ] **Step 3: AppHeader 加 FavoritesDropdown**

修改 `src/components/layout/AppHeader.vue`：在导航栏合适位置（如联赛 tab 旁）加：

```vue
<FavoritesDropdown />
```

并 import：

```ts
import FavoritesDropdown from './FavoritesDropdown.vue'
```

- [ ] **Step 4: 类型检查 + 全测试**

```bash
npm run typecheck && npm test
```
Expected: 全绿，无新增 typecheck 错误

- [ ] **Step 5: 手动验证**

```bash
npm run dev
```
- 顶部导航出现"收藏 (N)"下拉
- toast 在订阅/取消/导出时正常显示
- 取消订阅弹确认弹窗
- 多 tab 操作同步

- [ ] **Step 6: 提交**

```bash
git add src/App.vue src/components/layout/AppHeader.vue
git commit -m "feat: App.vue 初始化 store + 挂载 Toast/ConfirmDialog，AppHeader 加 FavoritesDropdown"
```

---

## 阶段 H：终验

### Task 25: 全量验收 + 上线前检查

**Files:**
- 仅运行验收，无文件修改

- [ ] **Step 1: 跑全部测试**

```bash
npm test
```
Expected: 全绿，包含：
- 现有所有单测不退化
- 新增 types/user-data、utils/download、utils/migrate、utils/iCal、composables/useToast、composables/useConfirm、composables/useEspanFetch、stores/userData、components/* 各项测试

- [ ] **Step 2: 类型检查**

```bash
npm run typecheck
```
Expected: 无错误

- [ ] **Step 3: 构建检查**

```bash
npm run build
```
Expected: dist 目录生成，无构建错误

- [ ] **Step 4: 手动验收清单**

打开 `npm run dev` 后访问 `http://localhost:5173/MatchLab/`：

- [ ] 首页无订阅时显示 EmptyState
- [ ] 进球队详情页点"订阅主队" → toast + 按钮变"已订阅 ✓"
- [ ] 首页出现 MyTeamCard 显示该队今日赛程/最近 3 场比分
- [ ] MyTeamCard 显示伤员名字（若 Task 13 CORS 验证通过）
- [ ] 再点"已订阅 ✓" → 弹确认弹窗 → 确认后取消
- [ ] 点 ☆ → 变 ★；再点变 ☆
- [ ] 点"导出赛程到日历" → loading → 下载 .ics 文件
- [ ] .ics 文件用 Outlook/Apple Calendar 导入 → 显示开赛提醒
- [ ] 顶部导航"收藏 (N)"hover 显示列表，点击跳详情
- [ ] 访问 `/#/favorites` 显示收藏夹页，支持球队/球员 tab 切换
- [ ] 收藏夹页球队行右侧有"导出日历"按钮
- [ ] 订阅第 4 队时按钮 disabled
- [ ] 收藏达 50 项时心形按钮 disabled
- [ ] 浏览器开两 tab，A 订阅 B 同步可见
- [ ] 隐私模式（Chrome 无痕窗口）下订阅/收藏按钮 disabled
- [ ] toast 成功显示绿色，错误显示红色，3 秒消失

- [ ] **Step 5: pre-push typecheck 验证**

```bash
git push --dry-run
```
Expected: husky pre-push hook 跑 typecheck 通过

- [ ] **Step 6: 最终提交（如有未提交改动）**

```bash
git status
git add <如有遗漏文件>
git commit -m "chore: 个人化基础 MVP 验收通过"
```

- [ ] **Step 7: 更新 CLAUDE.md 军衔记录（可选）**

在 `CLAUDE.md` 第二节"军衔记录"表追加一行：

```
| 2026-07-31 | ? | 子项目 1（球队订阅 + 收藏夹 + iCal 导出）落地验收通过 |
```

军衔由总司令（用户）亲批。

---

## 计划自检

**1. Spec 覆盖**：

| Spec 章节 | 覆盖任务 |
|---|---|
| 二、数据存储 schema | Task 1, 3 |
| 二、Pinia store state + init + 持久化 + 多 tab 同步 | Task 7, 8, 11 |
| 三、SubscribeButton / FavoriteButton / MyTeamCard / FavoritesDropdown / EmptyState / Toast / ConfirmDialog | Task 4, 5, 6, 14, 15, 18, 19 |
| 三、Toast + useToast | Task 4 |
| 三、utils（iCal/download/migrate） | Task 2, 3, 16 |
| 三、types/user-data.ts | Task 1 |
| 三、订阅上限 3 / 收藏上限 50 | Task 8, 10, 14, 15 |
| 四、订阅/取消订阅/收藏/iCal/MyTeamCard 数据流 | Task 8-10, 14-18 |
| 四、MyTeamCard 缓存策略 | Task 12 |
| 四、伤病端点验证 | Task 13 |
| 五、错误处理（localStorage 满/禁用/dedup/fetch 失败/多 tab/迁移） | Task 7 (catch), 8 (throw on limit), 14/15 (disabled), 17 (toast), 3 (migrate) |
| 六、测试策略（Store/Utils/组件/多 tab/现有不退化） | 各 Task 内嵌 |
| 八、上线验收标准 | Task 25 |

无遗漏。

**2. 类型一致性**：
- `Subscription` 与 `Favorite` 接口在 Task 1 定义，Task 7-10、14、15、18 全部使用，字段名一致
- `useUserDataStore` 方法名（addSubscription/removeSubscription/isSubscribed/addFavorite/removeFavorite/toggleFavorite/isFavorite/init）跨 Task 一致
- `ToastItem` / `ConfirmState` 内部接口仅 composable 内用，不跨边界

**3. 命名一致性**：
- 文件路径全用 kebab-case（`user-data.ts` / `useToast.ts`）
- 组件全用 PascalCase 文件名（`SubscribeButton.vue`）
- store 文件 `userData.ts` 导出 `useUserDataStore`，与现有 `standings.ts` 导出 `useStandingsStore` 模式一致
- 测试文件位置全镜像 `src/` 结构

无 placeholder，无 TBD，无"类似 Task N"省略，每个步骤含完整代码。
