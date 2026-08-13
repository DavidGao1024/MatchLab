# 球队详情页主副色主题 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 球队详情页（TeamDetailView）页头改为球队主色渐变旗面 + 副色斜纹/细线，战绩格与阵容上主色点缀——与首页订阅卡同一套视觉语言。

**Architecture:** 复用现成纯函数 `bannerTheme()`（`src/utils/teamColor.ts`）从球队主副色算出安全主题（近黑提亮/白主色深字/副色兜底），以 CSS 变量挂到页面根容器；零新增请求（球队包本就由 `ensureLeague` 载入）。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript strict + Tailwind 4 + Vitest + @vue/test-utils（jsdom）

**设计稿：** `docs/superpowers/specs/2026-08-13-team-detail-theme-design.md`

**提交纪律（2026-08-13 总司令立规）：每个 git commit 之前必须先请示总司令获批；git push 一律不主动做，除非总司令明确下令。**

---

## 文件清单

| 动作 | 文件 | 职责 |
|---|---|---|
| 新建 | `tests/views/TeamDetailView.test.ts` | 球队详情页主题测试（该页此前无测试） |
| 修改 | `src/views/TeamDetailView.vue` | 主题计算 + 旗面页头 + 战绩格/阵容点缀 |
| 修改 | `src/components/teams/TeamSquad.vue` | 位置分组小标题改主色（该组件仅详情页使用，已核实无其他引用） |

---

### Task 1：测试 scaffolding + 主题变量断言（红灯）

**Files:**
- Create: `tests/views/TeamDetailView.test.ts`

- [ ] **Step 1: 写测试文件**

```ts
// @vitest-environment jsdom
// 球队详情页主副色主题（旗面式强主题，spec 见 docs/superpowers/specs/2026-08-13-team-detail-theme-design.md）
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import TeamDetailView from '../../src/views/TeamDetailView.vue'
import { useTeamsStore } from '../../src/stores/teams'
import { usePlayersStore } from '../../src/stores/players'
import type { Team, PlayerSummary } from '../../src/types/models'

// 数据全部预注入：发生任何网络请求都算异常
const mockFetch = vi.fn().mockRejectedValue(new Error('no fetch expected'))
globalThis.fetch = mockFetch as any

beforeEach(() => {
  localStorage.clear()
  // 强制英文模式，断言用原文队名
  localStorage.setItem('matchlab:lang', 'en')
  mockFetch.mockClear()
})

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
    color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
    venue: { name: 'Emirates Stadium', city: 'London', country: 'England' },
    record: { wins: 26, draws: 7, losses: 5, played: 38, points: 85, goalDiff: 43, goalsFor: 75, goalsAgainst: 32, summary: '26-7-5' },
    ...over,
  }
}

function makePlayer(over: Partial<PlayerSummary> = {}): PlayerSummary {
  return { id: 11, name: 'Test Striker', teamId: 359, team: 'Arsenal', position: 'F', age: 25, goals: 3, assists: 1, ...over }
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:league/team/:id', component: TeamDetailView },
      { path: '/:league/standings', component: { template: '<div/>' } },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
    ],
  })
}

/** 预注入球队包 + 球员索引，绕开所有网络请求 */
async function setup(team: Team, squad: PlayerSummary[] = []) {
  setActivePinia(createPinia())
  const teams = useTeamsStore()
  teams.bundles['eng.1'] = {
    meta: { season: '2025', seasonType: 'european' } as any,
    teams: [team],
    byId: new Map([[team.id, team]]),
  }
  const players = usePlayersStore()
  players.indexes['eng.1'] = squad
  const router = makeRouter()
  router.push(`/eng.1/team/${team.id}`)
  await router.isReady()
  const w = mount(TeamDetailView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('球队详情页·主题上页', () => {
  it('基本盘：挂载成功、队名出现、无网络请求', async () => {
    const w = await setup(makeTeam())
    expect(w.text()).toContain('Arsenal')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('球队主色上根容器：--flag-from 为主色，--accent 在位', async () => {
    const w = await setup(makeTeam({ color: '#EF0107' }))
    const style = w.find('section').attributes('style') ?? ''
    expect(style).toContain('--flag-from')
    expect(style).toContain('#EF0107')
    expect(style).toContain('--accent')
  })

  it('白主色 → 旗面深字（防白底白字）', async () => {
    const w = await setup(makeTeam({ color: '#FFFFFF', alternateColor: '#132257' }))
    const style = w.find('section').attributes('style') ?? ''
    expect(style).toContain('--flag-text')
    expect(style).toContain('#0f172a')
  })
})
```

- [ ] **Step 2: 运行确认红灯**

Run: `npx vitest run tests/views/TeamDetailView.test.ts`
Expected: 「基本盘」PASS；后两项 FAIL（`section` 上没有任何 `--flag-*` 变量）。若「基本盘」也挂，先修挂载（预注入是否生效、路由是否匹配），再进 Task 2。

---

### Task 2：旗面页头实现（绿灯）

**Files:**
- Modify: `src/views/TeamDetailView.vue`（script + template + 新增 scoped style）

- [ ] **Step 1: script 增加主题计算**

在 `src/views/TeamDetailView.vue` 的 import 区加一行（紧跟现有 import）：

```ts
import { bannerTheme } from '../utils/teamColor'
```

在 `const seasonStart = computed(...)` 之后加：

```ts
// 主副色主题（与订阅卡同一套 bannerTheme：近黑提亮/白主色深字/副色兜底全在函数里）
const theme = computed(() => {
  const tm = team.value
  if (!tm) return null
  const main = tm.color || app.leagueInfo(league.value)?.color || '#3D195B'
  return bannerTheme(main, tm.alternateColor || '')
})
const themeVars = computed<Record<string, string>>(() => {
  const th = theme.value
  if (!th) return {}
  return {
    '--flag-from': th.from,
    '--flag-to': th.to,
    '--flag-stripe': th.stripe,
    '--pin-from': th.pinFrom,
    '--pin-to': th.pinTo,
    '--accent': th.accent,
    '--flag-text': th.darkText ? '#0f172a' : '#ffffff',
  }
})
```

- [ ] **Step 2: template 改造**

`<section class="py-6">` 开标签加 `:style`：

```html
<section class="py-6" :style="themeVars">
```

把现有页头块（从 `<!-- 头部：队徽 + 名字 + 简称 -->` 到三按钮 `</div>` 闭合）整体替换为：

```html
      <!-- 页头：队旗面（主色渐变 + 副色斜纹，与订阅卡同一视觉语言，spec §3.2） -->
      <div class="team-banner">
        <div class="team-flag" :class="{ 'is-light': theme?.darkText }">
          <TeamLogo :team="team" :size="64" />
          <div class="flag-id">
            <h1 class="flag-name">{{ displayName }}</h1>
            <p class="flag-sub">
              {{ team.abbreviation }}<template v-if="team.venue?.name"> · {{ venueName(team.venue.name, app.lang) }}</template><template v-if="team.venue?.city"> · {{ cityName(team.venue.city, app.lang) }}</template>
            </p>
          </div>
        </div>
        <div class="pin"></div>
      </div>
      <div class="flex items-center gap-3 mt-3 mb-6">
        <SubscribeButton :league="league" :team-id="teamId" :team-name="displayName" />
        <FavoriteButton type="team" :id="teamId" :name="displayName" :league="league" />
        <ExportCalendarButton
          :league="league"
          :team-id="teamId"
          :team-name="displayName"
          :team-slug="teamSlug"
          :season-start="seasonStart"
        />
      </div>
```

- [ ] **Step 3: 新增 scoped style**

文件末尾（`</template>` 之后）加：

```vue
<style scoped>
/* ===== 队旗面（主题变量挂 section 根，视觉语言同订阅卡）===== */
.team-banner { border-radius: 14px; overflow: hidden; }
.team-flag {
  position: relative;
  display: flex; align-items: center; gap: 16px;
  padding: 20px;
  background: linear-gradient(112deg, var(--flag-from), var(--flag-to));
  color: var(--flag-text);
}
.team-flag::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(115deg, transparent 0 26px, var(--flag-stripe) 26px 50px);
}
.team-flag > * { position: relative; }
.flag-id { flex: 1; min-width: 0; }
.flag-name {
  font-family: var(--font-cond, sans-serif);
  font-size: 28px; font-weight: 800; letter-spacing: 0.05em;
  margin: 0; color: var(--flag-text);
  text-shadow: 0 1px 4px rgba(0,0,0,0.35);
  overflow-wrap: anywhere;
}
.flag-sub { font-size: 12px; letter-spacing: 0.12em; opacity: 0.85; margin-top: 3px; }
.team-flag.is-light .flag-name { text-shadow: none; }
.pin { height: 3px; background: linear-gradient(90deg, var(--pin-from), var(--pin-to)); }
</style>
```

- [ ] **Step 4: 运行测试确认绿灯**

Run: `npx vitest run tests/views/TeamDetailView.test.ts`
Expected: 3 项全 PASS。

- [ ] **Step 5: 请示并提交**

向总司令汇报改动并请示提交，获批后：

```bash
git add tests/views/TeamDetailView.test.ts src/views/TeamDetailView.vue
git commit -m "feat: 球队详情页旗面页头——主色渐变+副色斜纹，复用 bannerTheme"
```

---

### Task 3：战绩格与阵容点缀（红灯 → 绿灯）

**Files:**
- Modify: `tests/views/TeamDetailView.test.ts`（补断言）
- Modify: `src/views/TeamDetailView.vue`（战绩格 class 化 + 阵容标题）
- Modify: `src/components/teams/TeamSquad.vue`（分组小标题主色）

- [ ] **Step 1: 补测试（先红）**

在测试文件末尾追加：

```ts
describe('球队详情页·点缀落位', () => {
  it('战绩 7 格 class 化：积分格 stat-pts、胜绿负红语义类', async () => {
    const w = await setup(makeTeam())
    expect(w.findAll('.stat-cell').length).toBe(7)
    expect(w.find('.stat-cell.stat-pts').exists()).toBe(true)
    expect(w.find('.stat-val.val-w').exists()).toBe(true)
    expect(w.find('.stat-val.val-l').exists()).toBe(true)
  })

  it('阵容总标题挂 squad-title（主色下划线由 CSS 变量承接）', async () => {
    const w = await setup(makeTeam(), [makePlayer()])
    expect(w.find('.squad-title').exists()).toBe(true)
  })

  it('位置分组小标题吃到 --accent（CSS 变量自 section 级联）', async () => {
    const w = await setup(makeTeam(), [makePlayer()])
    const h3 = w.find('h3')
    expect(h3.exists()).toBe(true)
    expect(h3.attributes('style') ?? '').toContain('var(--accent')
  })
})
```

Run: `npx vitest run tests/views/TeamDetailView.test.ts`
Expected: 新增 3 项 FAIL（class 尚不存在），原有 3 项 PASS。

- [ ] **Step 2: 战绩格 class 化**

把 TeamDetailView 现有战绩块（`<!-- 球队战绩 -->` 下整个 `<div v-if="record" class="grid grid-cols-3 md:grid-cols-7 gap-2 mb-6">…</div>`）替换为：

```html
      <!-- 球队战绩（主色边条点缀，spec §3.4） -->
      <div v-if="record" class="record-grid">
        <div class="stat-cell"><div class="stat-label">{{ t('team.played', app.lang) }}</div><div class="stat-val">{{ record.played }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.w', app.lang) }}</div><div class="stat-val val-w">{{ record.wins }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.d', app.lang) }}</div><div class="stat-val val-d">{{ record.draws }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.l', app.lang) }}</div><div class="stat-val val-l">{{ record.losses }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.gf', app.lang) }}</div><div class="stat-val">{{ record.goalsFor }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.ga', app.lang) }}</div><div class="stat-val">{{ record.goalsAgainst }}</div></div>
        <div class="stat-cell stat-pts"><div class="stat-label">{{ t('team.col.pts', app.lang) }}</div><div class="stat-val val-pts">{{ record.points }}</div></div>
      </div>
```

- [ ] **Step 3: 阵容标题 class 化**

把阵容区现有 `<h2 class="font-cond text-lg tracking-wider text-white mb-3 pb-1 border-b border-white/10">…</h2>` 替换为：

```html
        <h2 class="squad-title">
          {{ t('team.squad', app.lang) }}
          <span class="squad-count">({{ squad.length }})</span>
        </h2>
```

- [ ] **Step 4: scoped style 追加战绩与阵容段**

在 Task 2 的 `<style scoped>` 内、`.pin` 规则之后追加：

```css
/* ===== 战绩格：主色边条 + 积分格强调（spec §3.4）===== */
.record-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 24px; }
@media (min-width: 768px) { .record-grid { grid-template-columns: repeat(7, 1fr); } }
.stat-cell {
  border: 1px solid rgba(255,255,255,0.1);
  border-left: 3px solid var(--accent);
  border-radius: 4px; padding: 8px;
  background: rgba(255,255,255,0.02);
}
.stat-label { font-family: var(--font-mono-d, monospace); font-size: 10px; text-transform: uppercase; color: #64748b; }
.stat-val { font-family: var(--font-mono-d, monospace); font-size: 16px; color: #ffffff; }
.val-w { color: #10b981; }
.val-d { color: #cbd5e1; }
.val-l { color: #ef4444; }
.stat-pts {
  background: color-mix(in srgb, var(--accent) 13%, transparent);
  border-color: color-mix(in srgb, var(--accent) 42%, transparent);
  border-left-color: var(--accent);
}
.val-pts { color: var(--accent); }

/* ===== 阵容标题：主色下划线 ===== */
.squad-title {
  font-family: var(--font-cond, sans-serif);
  font-size: 18px; letter-spacing: 0.1em; color: #ffffff;
  margin-bottom: 12px; padding-bottom: 4px;
  border-bottom: 2px solid var(--accent);
}
.squad-count { font-family: var(--font-mono-d, monospace); font-size: 12px; color: #64748b; margin-left: 8px; }
```

- [ ] **Step 5: TeamSquad 分组小标题主色**

`src/components/teams/TeamSquad.vue` 中 h3 开标签：

```html
      <h3 class="font-cond text-sm tracking-wider text-slate-400 mb-2 pb-1 border-b border-white/10">
```

改为（去掉 `text-slate-400`，改吃上层级联的 `--accent`，无变量时退回原灰）：

```html
      <h3 class="font-cond text-sm tracking-wider mb-2 pb-1 border-b border-white/10" :style="{ color: 'var(--accent, #94a3b8)' }">
```

- [ ] **Step 6: 运行测试确认全绿**

Run: `npx vitest run tests/views/TeamDetailView.test.ts`
Expected: 6 项全 PASS。

- [ ] **Step 7: 请示并提交**

向总司令汇报并请示提交，获批后：

```bash
git add tests/views/TeamDetailView.test.ts src/views/TeamDetailView.vue src/components/teams/TeamSquad.vue
git commit -m "feat: 球队详情页主色点缀——战绩边条/积分强调/阵容标题/分组小标题"
```

---

### Task 4：全量回归 + 收尾

**Files:** 无新增修改

- [ ] **Step 1: 全套测试**

Run: `npx vitest run`
Expected: 全部通过（此前 256 项 + 本次新增 6 项 = 262 项）。

- [ ] **Step 2: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: 双双通过。

- [ ] **Step 3: 手测清单呈报（浏览器许可待总司令）**

按设计稿 §六清单列明待手测项，**不擅自开浏览器**：
天津（紫）、阿森纳（红）、热刺（白主色）三队详情页，桌面 + 375px 移动各一遍——旗面渐变与斜纹、战绩边条与积分格、阵容分组主色、深字模式、同联赛换队瞬时变色。

- [ ] **Step 4: 汇报收尾**

向总司令呈报回归结果与手测清单；是否提交/推送、何时手测，均听令。

---

## 自审记录（计划作者自查）

- **spec 覆盖**：§3.1 返回钮不动（Task 2 未触碰）✓；§3.2 旗面页头（Task 2）✓；§3.3 按钮行（Task 2）✓；§3.4 点缀（Task 3）✓；§四 数据流与兜底（Task 2 theme/themeVars，含主色空退回联赛色）✓；§五 测试 4 项（Task 1/3 共 6 项覆盖）✓；§六 手测清单（Task 4）✓；§七 不做项未越界 ✓。
- **占位符扫描**：无 TBD/TODO，所有代码步骤含完整代码。
- **类型一致性**：`theme`/`themeVars` 命名跨 Task 2/3 一致；`bannerTheme` 返回字段（from/to/stripe/pinFrom/pinTo/darkText/accent）与 `src/utils/teamColor.ts` 现有定义一致；`PlayerSummary` 字段与 `src/types/models.ts` 一致。
```
