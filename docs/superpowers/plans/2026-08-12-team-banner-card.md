# 子项目 2.0「主队队旗卡」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页订阅球队卡重做成"队旗卡"——上半卡球队主色旗面、信息砍到下场对阵+排名积分两块、电脑端订阅区永远占满一整行。

**Architecture:** 单组件双形态——MyTeamCard 用容器宽度查询在竖向卡（2/3 队并排、手机）与横向卡（单卡通栏、左旗右数）间自动切换；颜色兜底抽成纯函数 bannerTheme 独立可测；赛程抓取从 23 请求砍到按需顺序扫描。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript strict + Tailwind 4 + Pinia + vitest/jsdom

**设计稿：** `docs/superpowers/specs/2026-08-12-team-banner-card-design.md`（动手前必读，视觉规格与状态表都在里面）

**项目铁律提醒：**
- 交流全程中文；commit message 中文
- 提交只 add 本计划列出的路径，**永远不许 `git add public/data/`**
- 测试命令 `npm run test`，类型检查 `npm run typecheck`，构建 `npm run build`
- 本计划不碰抓取脚本、数据文件、其他页面

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/utils/teamColor.ts` | 新建 | 旗面颜色兜底纯函数：明度计算、混色、bannerTheme |
| `tests/utils/teamColor.test.ts` | 新建 | 颜色函数单测（阈值边界 + 四类真实球队色） |
| `src/components/home/MyTeamCard.vue` | 整卡重写 | 队旗卡：旗面+数据区两段、宽窄双形态、顺序扫赛程 |
| `tests/components/MyTeamCard.test.ts` | 整文件重写 | 新结构的 8 项单测 |
| `src/utils/i18n.ts` | 增删词条 | 新增 card.finalRank；删 card.tag / card.recent5 / card.injured / card.noNext |
| `src/views/HomeView.vue` | 小改 | 订阅区网格列数按订阅数映射（1/2/3 列） |

---

### Task 1: 旗面颜色兜底纯函数（先写测试）

**Files:**
- Create: `src/utils/teamColor.ts`
- Test: `tests/utils/teamColor.test.ts`

- [ ] **Step 1: 写失败测试**

写入 `tests/utils/teamColor.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { bannerTheme, hexToRgb, luminance, mix } from '../../src/utils/teamColor'

describe('luminance / mix 基础', () => {
  it('纯黑明度 0，纯白明度 1', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 5)
    expect(luminance('#ffffff')).toBeCloseTo(1, 5)
  })
  it('mix 比例 0 原色、1 目标色、0.5 正中点', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mix('#000000', '#ffffff', 0.5).toLowerCase()).toBe('#808080')
  })
})

describe('bannerTheme 明度阈值边界（设计稿 §3.3：0.16 / 0.85）', () => {
  it('#262626 明度 0.149 < 0.16 → 提亮到约 0.20，灰调不变', () => {
    const th = bannerTheme('#262626', '')
    expect(luminance(th.from)).toBeGreaterThanOrEqual(0.18)
    expect(luminance(th.from)).toBeLessThanOrEqual(0.25)
    const [r, g, b] = hexToRgb(th.from)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })
  it('#2b2b2b 明度 0.169 ≥ 0.16 → 原色直上', () => {
    expect(bannerTheme('#2b2b2b', '').from).toBe('#2b2b2b')
  })
  it('#d6d6d6 明度 0.839 ≤ 0.85 → 白字模式', () => {
    expect(bannerTheme('#d6d6d6', '').darkText).toBe(false)
  })
  it('#ffffff 明度 1 > 0.85 → 深字模式、底色不变', () => {
    const th = bannerTheme('#ffffff', '#1a1a1a')
    expect(th.darkText).toBe(true)
    expect(th.from).toBe('#ffffff')
  })
})

describe('bannerTheme 四类真实球队色', () => {
  it('阿森纳红 #EF0107：原色直上 + 白字 + 强调色提亮', () => {
    const th = bannerTheme('#EF0107', '#9C1B1B')
    expect(th.from).toBe('#EF0107')
    expect(th.darkText).toBe(false)
    expect(luminance(th.accent)).toBeGreaterThan(0.5)
    expect(luminance(th.to)).toBeLessThan(luminance(th.from))
  })
  it('切尔西藏青 #144992：原色直上（粗大白字 3:1 足够，不提亮）', () => {
    expect(bannerTheme('#144992', '#f0c75e').from).toBe('#144992')
  })
  it('昂热近黑 #1a1a1a：提亮脱离卡底', () => {
    const th = bannerTheme('#1a1a1a', '#ffffff')
    expect(luminance(th.from)).toBeGreaterThan(0.16)
  })
  it('欧塞尔白 #ffffff：深字模式', () => {
    expect(bannerTheme('#ffffff', '#1a1a1a').darkText).toBe(true)
  })
})

describe('bannerTheme 斜纹与细线兜底', () => {
  it('副色缺失 → 黑纹降级', () => {
    expect(bannerTheme('#EF0107', '').stripe).toBe('rgba(0,0,0,0.12)')
  })
  it('副色与主色相同 → 黑纹降级', () => {
    expect(bannerTheme('#EF0107', '#EF0107').stripe).toBe('rgba(0,0,0,0.12)')
  })
  it('副色有效 → 斜纹带副色', () => {
    expect(bannerTheme('#EF0107', '#003399').stripe).toBe('rgba(0,51,153,0.15)')
  })
  it('白底旗副色缺失 → 深主色纹', () => {
    expect(bannerTheme('#ffffff', '').stripe).toBe('rgba(102,102,102,0.15)')
  })
  it('细线起点：副色有效用副色，缺失退回强调色', () => {
    expect(bannerTheme('#EF0107', '#003399').pinFrom).toBe('#003399')
    const th = bannerTheme('#EF0107', '')
    expect(th.pinFrom).toBe(th.accent)
    expect(th.pinTo).toBe(th.from)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run test -- tests/utils/teamColor.test.ts`
Expected: FAIL，报 `Cannot find module '../../src/utils/teamColor'`

- [ ] **Step 3: 写实现**

写入 `src/utils/teamColor.ts`：

```ts
// 旗面颜色兜底（子项目 2.0 设计稿 §3.3）
// 近黑主色（明度<0.16）会与深蓝卡底融为一体、旗子丢轮廓 → 提亮到约 0.20；
// 白主色（明度>0.85）→ 深字模式；其余原色直上。
// 阈值依据：粗大白字只需 3:1 对比，提亮不是为文字可读而是为旗子轮廓，见设计稿。

export interface BannerTheme {
  /** 旗面渐变起点（主色或调整后） */
  from: string
  /** 渐变终点（起点混 30% 黑） */
  to: string
  /** 斜纹 rgba 色 */
  stripe: string
  /** 下缘细线起点（副色，缺失退回强调色） */
  pinFrom: string
  /** 下缘细线终点 */
  pinTo: string
  /** 白底旗 → 深字模式 */
  darkText: boolean
  /** 深色数据区用的亮主色（比赛块左条 / 积分格） */
  accent: string
}

const DARK_FLOOR = 0.16
const LIGHT_CEIL = 0.85
const DARK_TARGET = 0.2

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** 混色：t=0 全 a，t=1 全 b */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

/** 副色与主色是否可分辨（最大通道差 ≥ 24） */
function altDistinct(main: string, alt: string): boolean {
  if (!alt) return false
  const [r1, g1, b1] = hexToRgb(main)
  const [r2, g2, b2] = hexToRgb(alt)
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2)) >= 24
}

export function bannerTheme(color: string, altColor: string): BannerTheme {
  const lum = luminance(color)
  let from = color
  if (lum < DARK_FLOOR) {
    // 明度对混色比例是线性的，一步解出混白比例
    from = mix(color, '#ffffff', (DARK_TARGET - lum) / (1 - lum))
  }
  const darkText = lum > LIGHT_CEIL
  const accent = lum >= 0.45 || darkText
    ? color
    : mix(color, '#ffffff', (0.6 - lum) / (1 - lum))
  const stripe = altDistinct(color, altColor)
    ? rgba(altColor, 0.15)
    : darkText ? rgba(mix(color, '#000000', 0.6), 0.15) : 'rgba(0,0,0,0.12)'
  return {
    from,
    to: mix(from, '#000000', 0.3),
    stripe,
    pinFrom: altDistinct(color, altColor) ? altColor : accent,
    pinTo: from,
    darkText,
    accent,
  }
}
```

- [ ] **Step 4: 跑测试确认全绿**

Run: `npm run test -- tests/utils/teamColor.test.ts`
Expected: PASS，13 项全过

- [ ] **Step 5: 提交**

```bash
git add src/utils/teamColor.ts tests/utils/teamColor.test.ts
git commit -m "feat: 旗面颜色兜底纯函数 bannerTheme——近黑提亮/白底换深字/副色斜纹降级，13 项单测钉死阈值边界"
```

---

### Task 2: MyTeamCard 整卡重写（测试先行）

**Files:**
- Modify（重写）: `tests/components/MyTeamCard.test.ts`
- Modify（重写）: `src/components/home/MyTeamCard.vue`
- Modify: `src/utils/i18n.ts`（新增 card.finalRank，删 4 个孤儿词条）

- [ ] **Step 1: 整文件重写测试（此时对旧组件是红的）**

用以下内容**整体替换** `tests/components/MyTeamCard.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MyTeamCard from '../../src/components/home/MyTeamCard.vue'
import { useUserDataStore } from '../../src/stores/userData'
import { useStandingsStore } from '../../src/stores/standings'
import { useTeamsStore } from '../../src/stores/teams'
import type { StandingRow, Team } from '../../src/types/models'
import { clearScoreCache } from '../../src/composables/useEspanFetch'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any
const pushSpy = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push: pushSpy }) }))

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  // 强制英文模式，断言用原文队名
  localStorage.setItem('matchlab:lang', 'en')
  mockFetch.mockReset()
  pushSpy.mockReset()
  __resetToast()
  __resetConfirm()
  clearScoreCache()
  vi.useFakeTimers()
  // 钉死"现在"，赛程今日/未来判断可复现
  vi.setSystemTime(new Date('2026-08-12T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

function mockEmptyEvents() {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
}

function mockEvents(events: unknown[]) {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events }) })
}

/** ESPN 原始事件形状（normalizeEvent 的输入） */
function rawEvent(over: Record<string, unknown> = {}) {
  return {
    id: '99',
    date: '2026-08-15T19:00:00Z',
    status: { type: { state: 'pre' }, displayClock: '0:00' },
    competitions: [{
      competitors: [
        { homeAway: 'home', team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS' }, score: '0' },
        { homeAway: 'away', team: { id: '25', displayName: 'Liverpool', abbreviation: 'LIV' }, score: '0' },
      ],
      venue: { fullName: 'Emirates Stadium' },
    }],
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

function makeStanding(over: Partial<StandingRow> = {}): StandingRow {
  return {
    rank: 1, teamId: 359, team: 'Arsenal', played: 38,
    won: 26, drawn: 7, lost: 5, goalsFor: 75, goalsAgainst: 32, goalDiff: 43,
    points: 85, zone: null, form: ['W', 'W', 'D', 'W', 'L'],
    ...over,
  }
}

function injectStoreData(opts: { team?: Team; standing?: StandingRow | null } = {}) {
  const teams = useTeamsStore()
  const standings = useStandingsStore()
  const team = opts.team ?? makeTeam()
  teams.bundles['eng.1'] = {
    meta: { season: '2025', seasonType: 'european' } as any,
    teams: [team],
    byId: new Map([[team.id, team]]),
  }
  standings.rows['eng.1'] = opts.standing === null ? [] : [opts.standing ?? makeStanding()]
}

async function mountCard() {
  const store = useUserDataStore()
  await store.init()
  store.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
  const w = mount(MyTeamCard, { props: { subscription: store.subscriptions[0] } })
  await flushPromises()
  return w
}

describe('队旗卡·结构', () => {
  it('渲染队名 + 旗面 + 四格数据', async () => {
    injectStoreData()
    mockEmptyEvents()
    const w = await mountCard()
    expect(w.text()).toContain('Arsenal')
    expect(w.find('.flag').exists()).toBe(true)
    expect(w.findAll('.stat-cell').length).toBe(4)
  })

  it('球队主色上根节点：--flag-from 含 team.color，--accent 在位', async () => {
    injectStoreData({ team: makeTeam({ color: '#EF0107' }) })
    mockEmptyEvents()
    const w = await mountCard()
    const style = w.find('article').attributes('style') ?? ''
    expect(style).toContain('--flag-from')
    expect(style).toContain('#EF0107')
    expect(style).toContain('--accent')
  })
})

describe('队旗卡·比赛状态', () => {
  it('无任何赛程 → 赛季已结束 + 最终名次', async () => {
    injectStoreData()
    mockEmptyEvents()
    const w = await mountCard()
    expect(w.text()).toContain('Season ended')
    expect(w.text()).toContain('Finished #1')
  })

  it('今日未开球 → Today 标签 + 对阵双方', async () => {
    injectStoreData()
    mockEvents([rawEvent({
      date: '2026-08-12T19:00:00Z',
      status: { type: { state: 'pre' }, displayClock: '0:00' },
    })])
    const w = await mountCard()
    expect(w.text()).toContain('Today')
    expect(w.text()).toContain('Arsenal')
    expect(w.text()).toContain('Liverpool')
  })

  it('今日已完赛 → 按无今日赛处理，显示下场', async () => {
    injectStoreData()
    mockEvents([
      rawEvent({
        id: '98',
        date: '2026-08-12T09:00:00Z',
        status: { type: { state: 'post' }, displayClock: '90:00' },
      }),
      rawEvent({ id: '99', date: '2026-08-15T19:00:00Z' }),
    ])
    const w = await mountCard()
    expect(w.text()).toContain('Next')
    expect(w.text()).not.toContain('Today')
  })

  it('今日进行中 → Live + 大比分 + 时钟', async () => {
    injectStoreData()
    mockEvents([rawEvent({
      date: '2026-08-12T11:00:00Z',
      status: { type: { state: 'in' }, displayClock: '67:00' },
      competitions: [{
        competitors: [
          { homeAway: 'home', team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS' }, score: '2' },
          { homeAway: 'away', team: { id: '25', displayName: 'Liverpool', abbreviation: 'LIV' }, score: '1' },
        ],
        venue: { fullName: 'Emirates Stadium' },
      }],
    })])
    const w = await mountCard()
    expect(w.text()).toContain('Live')
    expect(w.text()).toContain('2 - 1')
    expect(w.text()).toContain('67:00')
  })
})

describe('队旗卡·交互与降级', () => {
  it('点旗面 → 跳球队详情页', async () => {
    injectStoreData()
    mockEmptyEvents()
    const w = await mountCard()
    await w.find('.flag').trigger('click')
    expect(pushSpy).toHaveBeenCalledWith('/eng.1/team/359')
  })

  it('standings 未加载 → 四格占位不阻塞、无排名徽章', async () => {
    injectStoreData({ standing: null })
    mockEmptyEvents()
    const w = await mountCard()
    expect(w.text()).toContain('Arsenal')
    expect(w.text()).not.toContain('26')
    expect(w.find('.flag-rank').exists()).toBe(false)
    const vals = w.findAll('.stat-val')
    expect(vals.length).toBe(4)
    for (const v of vals) expect(v.text()).toBe('–')
  })
})
```

- [ ] **Step 2: 跑测试确认红**

Run: `npm run test -- tests/components/MyTeamCard.test.ts`
Expected: FAIL（旧组件没有 .flag / .stat-cell / finalRank 等新结构，多项失败）

- [ ] **Step 3: 增删 i18n 词条**

`src/utils/i18n.ts` 三处改动：

（a）在 `'card.seOver'` 一行后面插入：

```ts
  'card.finalRank': { zh: '最终第 {n} 名', en: 'Finished #{n}' },
```

（b）删除这四行（全部只被旧 MyTeamCard 使用，已逐一用搜索核实）：

```ts
  'card.tag': { zh: '订阅主队', en: 'My Team' },
  'card.recent5': { zh: '最近 5 场', en: 'Last 5' },
  'card.injured': { zh: '伤员', en: 'Injuries' },
  'card.noNext': { zh: '无再下场', en: 'No more fixtures' },
```

- [ ] **Step 4: 整卡重写 MyTeamCard.vue**

用以下内容**整体替换** `src/components/home/MyTeamCard.vue`：

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchLiveScores } from '../../composables/useEspanFetch'
import { useStandingsStore } from '../../stores/standings'
import { useTeamsStore } from '../../stores/teams'
import { useAppStore } from '../../stores/app'
import { teamName, t, venueName } from '../../utils/i18n'
import { bannerTheme } from '../../utils/teamColor'
import TeamLogo from '../common/TeamLogo.vue'
import type { Subscription } from '../../types/user-data'
import type { Match, StandingRow, Team } from '../../types/models'

const props = defineProps<{ subscription: Subscription }>()
const router = useRouter()
const standings = useStandingsStore()
const teams = useTeamsStore()
const app = useAppStore()

const todayMatch = ref<Match | null>(null)
const nextMatch = ref<Match | null>(null)
const loading = ref(true)
const error = ref('')

const team = computed<Team | undefined>(() => teams.teamById(props.subscription.league, props.subscription.teamId))
// 球队数据未加载时的兜底身（队徽圆牌与旗色用联赛色顶着）
const flagTeam = computed<Team>(() => team.value ?? {
  id: props.subscription.teamId,
  name: props.subscription.teamName,
  shortDisplayName: props.subscription.teamName,
  abbreviation: '',
  color: app.leagueInfo(props.subscription.league)?.color || '#3D195B',
  alternateColor: '',
  logo: '',
  logoDark: '',
})
const theme = computed(() => bannerTheme(flagTeam.value.color, flagTeam.value.alternateColor))
const themeVars = computed(() => ({
  '--flag-from': theme.value.from,
  '--flag-to': theme.value.to,
  '--flag-stripe': theme.value.stripe,
  '--pin-from': theme.value.pinFrom,
  '--pin-to': theme.value.pinTo,
  '--accent': theme.value.accent,
  '--flag-text': theme.value.darkText ? '#0f172a' : '#ffffff',
}))
const standing = computed<StandingRow | undefined>(() => {
  const rows = standings.rows[props.subscription.league] ?? []
  return rows.find((r) => r.teamId === props.subscription.teamId)
})
const leagueLabel = computed(() => {
  const info = app.leagueInfo(props.subscription.league)
  const zh = info?.nameZh
  const en = info?.name ?? props.subscription.league.toUpperCase()
  return app.lang === 'zh' && zh ? `${zh} · ${en}` : en
})

const live = computed<Match | null>(() =>
  todayMatch.value && todayMatch.value.status === 'in' ? todayMatch.value : null)
const heroMatch = computed<Match | null>(() => live.value ?? todayMatch.value ?? nextMatch.value)
const finalRankText = computed(() => standing.value
  ? t('card.finalRank', app.lang).replace('{n}', String(standing.value.rank))
  : '')

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

// 只需今日赛 + 下场：从当月起逐月向后扫、找到下场即停（设计稿 §五）
async function load() {
  loading.value = true
  error.value = ''
  try {
    const now = new Date()
    let today: Match | null = null
    let next: Match | null = null
    for (let i = 0; i <= 10 && !next; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const matches = await fetchLiveScores(props.subscription.league, month)
      const mine = matches.filter((m) =>
        m.home.id === props.subscription.teamId || m.away.id === props.subscription.teamId)
      if (i === 0) {
        today = mine.find((m) => isToday(m.date) && !m.completed) ?? null
      }
      const future = mine
        .filter((m) => new Date(m.date).getTime() > now.getTime())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      if (future.length) next = future[0]
    }
    todayMatch.value = today
    nextMatch.value = next
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

function formatDateLong(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const zh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const wd = app.lang === 'zh' ? zh[d.getDay()] : en[d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()} · ${wd} ${hh}:${mm}`
}
</script>

<template>
  <article class="banner-card" :style="themeVars">
    <div v-if="loading" class="state-pad">{{ t('card.loading', app.lang) }}</div>
    <div v-else-if="error" class="state-pad state-err">{{ error }}</div>
    <div v-else class="card-inner">
      <div
        class="flag"
        :class="{ 'is-light': theme.darkText }"
        role="button"
        tabindex="0"
        :aria-label="displayName(subscription.teamName)"
        @click="goTeam"
        @keydown.enter="goTeam"
        @keydown.space.prevent="goTeam"
      >
        <TeamLogo :team="flagTeam" :size="52" />
        <div class="flag-id">
          <h3 class="flag-name">{{ displayName(subscription.teamName) }}</h3>
          <div class="flag-sub">{{ leagueLabel }}</div>
        </div>
        <div v-if="standing" class="flag-rank">
          <span class="num">{{ standing.rank }}</span>
          <span class="of">/ {{ (standings.rows[subscription.league] ?? []).length || 20 }}</span>
        </div>
      </div>
      <div class="pin"></div>
      <div class="data">
        <section v-if="live" class="match-block">
          <div class="match-label"><span class="live-dot"></span>{{ t('card.live', app.lang) }} · {{ live.clock ?? '—' }}</div>
          <div class="score-line">
            <span class="score-side">{{ displayName(live.home.name) }}</span>
            <span class="score-num">{{ live.home.score ?? 0 }} - {{ live.away.score ?? 0 }}</span>
            <span class="score-side">{{ displayName(live.away.name) }}</span>
          </div>
          <div class="match-venue">◉ {{ venueName(live.venue || '', app.lang) || '—' }}</div>
        </section>
        <section v-else-if="heroMatch" class="match-block">
          <div class="match-label">{{ todayMatch ? t('card.today', app.lang) : t('card.next', app.lang) }} · {{ formatDateLong(heroMatch.date) }}</div>
          <div class="matchup">
            <span class="matchup-side">{{ displayName(heroMatch.home.name) }}</span>
            <span class="matchup-vs">VS</span>
            <span class="matchup-side">{{ displayName(heroMatch.away.name) }}</span>
          </div>
          <div class="match-venue">◉ {{ venueName(heroMatch.venue || '', app.lang) || '—' }}</div>
        </section>
        <section v-else class="match-block">
          <div class="se-line">{{ t('card.seOver', app.lang) }}<template v-if="finalRankText"> · {{ finalRankText }}</template></div>
        </section>
        <div class="stat-row">
          <div class="stat-cell"><div class="stat-label">{{ t('col.won', app.lang) }}</div><div class="stat-val val-w">{{ standing ? standing.won : '–' }}</div></div>
          <div class="stat-cell"><div class="stat-label">{{ t('col.drawn', app.lang) }}</div><div class="stat-val val-d">{{ standing ? standing.drawn : '–' }}</div></div>
          <div class="stat-cell"><div class="stat-label">{{ t('col.lost', app.lang) }}</div><div class="stat-val val-l">{{ standing ? standing.lost : '–' }}</div></div>
          <div class="stat-cell stat-pts"><div class="stat-label">{{ t('col.pts', app.lang) }}</div><div class="stat-val val-pts">{{ standing ? standing.points : '–' }}</div></div>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.banner-card {
  container-type: inline-size;
  border-radius: 14px;
  overflow: hidden;
  background: #10152a;
  border: 1px solid rgba(255,255,255,0.07);
}
.state-pad { padding: 16px; font-size: 14px; color: #64748b; }
.state-err { color: #f87171; }

.card-inner { display: flex; flex-direction: column; }

/* ===== 旗面 ===== */
.flag {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 16px;
  background: linear-gradient(112deg, var(--flag-from), var(--flag-to));
  color: var(--flag-text);
  cursor: pointer;
}
.flag::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(115deg, transparent 0 26px, var(--flag-stripe) 26px 50px);
}
.flag > * { position: relative; }
.flag-id { flex: 1; min-width: 0; }
.flag-name {
  font-family: var(--font-cond, sans-serif);
  font-size: 22px; font-weight: 800; letter-spacing: 0.05em;
  margin: 0; color: var(--flag-text);
  text-shadow: 0 1px 4px rgba(0,0,0,0.35);
  overflow-wrap: anywhere;
}
.flag-sub { font-size: 11px; letter-spacing: 0.14em; opacity: 0.85; margin-top: 2px; }
.flag.is-light .flag-name { text-shadow: none; }
.flag-rank {
  background: rgba(0,0,0,0.34);
  border: 1px solid rgba(255,255,255,0.28);
  border-radius: 9px; padding: 5px 11px;
  font-family: var(--font-cond, sans-serif);
  display: flex; align-items: baseline; gap: 4px;
}
.flag-rank .num { font-size: 18px; font-weight: 800; color: #fff; }
.flag-rank .of { font-size: 10px; color: rgba(255,255,255,0.75); }
.flag.is-light .flag-rank { background: rgba(15,23,42,0.08); border-color: rgba(15,23,42,0.35); }
.flag.is-light .flag-rank .num,
.flag.is-light .flag-rank .of { color: #0f172a; }

.pin { height: 3px; background: linear-gradient(90deg, var(--pin-from), var(--pin-to)); }

/* ===== 数据区 ===== */
.data { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; }
.match-block {
  background: rgba(255,255,255,0.045);
  border-left: 3px solid var(--accent);
  border-radius: 8px; padding: 10px 13px;
}
.match-label {
  font-family: var(--font-mono-d, monospace);
  font-size: 10px; letter-spacing: 0.26em; text-transform: uppercase;
  color: #94a3b8;
  display: flex; align-items: center; gap: 6px;
}
.live-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: #ef4444; box-shadow: 0 0 8px #ef4444;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.matchup { display: flex; align-items: center; gap: 9px; margin-top: 5px; flex-wrap: wrap; }
.matchup-side {
  font-family: var(--font-cond, sans-serif);
  font-size: 17px; font-weight: 800; color: #fff;
  overflow-wrap: anywhere;
}
.matchup-vs { font-size: 11px; color: #64748b; }
.match-venue {
  margin-top: 4px;
  font-family: var(--font-mono-d, monospace);
  font-size: 10px; letter-spacing: 0.12em; color: #64748b;
}
.score-line { display: flex; align-items: baseline; gap: 10px; margin-top: 5px; flex-wrap: wrap; }
.score-side { font-family: var(--font-cond, sans-serif); font-size: 15px; font-weight: 700; color: #fff; }
.score-num { font-family: var(--font-cond, sans-serif); font-size: 26px; font-weight: 800; color: var(--accent); }
.se-line { font-family: var(--font-cond, sans-serif); font-size: 15px; color: #cbd5e1; }

.stat-row { display: flex; gap: 6px; }
.stat-cell {
  flex: 1; background: rgba(255,255,255,0.045);
  border-radius: 8px; padding: 7px 4px; text-align: center;
}
.stat-label { font-family: var(--font-mono-d, monospace); font-size: 9px; letter-spacing: 0.2em; color: #64748b; }
.stat-val { font-family: var(--font-mono-d, monospace); font-size: 17px; font-weight: 800; color: #fff; margin-top: 1px; }
.val-w { color: #10b981; }
.val-d { color: #cbd5e1; }
.val-l { color: #ef4444; }
.stat-pts {
  background: color-mix(in srgb, var(--accent) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
}
.val-pts { color: var(--accent); }

/* ===== 宽形态：单卡通栏，左旗右数（设计稿 §3.2，断点 640px）===== */
@container (min-width: 640px) {
  .card-inner { flex-direction: row; align-items: stretch; }
  .flag {
    width: 34%; min-width: 180px; max-width: 280px;
    flex-direction: column; justify-content: center; text-align: center;
    padding: 20px 16px;
  }
  .flag-id { flex: none; width: 100%; }
  .flag-rank { margin: 8px auto 0; }
  .pin { width: 3px; height: auto; background: linear-gradient(180deg, var(--pin-from), var(--pin-to)); }
  .data { flex: 1; justify-content: center; padding: 16px 20px; }
}
</style>
```

- [ ] **Step 5: 跑本文件测试确认全绿**

Run: `npm run test -- tests/components/MyTeamCard.test.ts`
Expected: PASS，8 项全过

- [ ] **Step 6: 全量回归**

Run: `npm run test && npm run typecheck`
Expected: 全绿（若 i18n.test.ts 等文件引用了被删词条，按报错把引用一并清掉，再跑一遍）

- [ ] **Step 7: 提交**

```bash
git add src/components/home/MyTeamCard.vue tests/components/MyTeamCard.test.ts src/utils/i18n.ts
git commit -m "feat: 首页订阅卡重写为队旗卡——上半旗面主色+斜纹+队徽排名，数据区只留下场对阵与胜平负积分；赛程抓取砍到按需顺序扫，伤员/近5场/下下场移除"
```

---

### Task 3: 首页订阅区永远占满一行

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: 加列数映射 computed**

在 `const others = LEAGUE_SLUGS.filter((l) => l !== focus)` 一行后面插入：

```ts
// 订阅区网格列数：电脑端永远占满一行——1 队通栏、2 队对半、3 队三分（设计稿 §六）；
// 三个类名均为静态字面量，保证 Tailwind 按需编译能扫到
const subGridCols = computed(() => {
  const n = userStore.subscriptions.length
  if (n <= 1) return 'md:grid-cols-1'
  return n === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
})
```

- [ ] **Step 2: 模板换动态列数**

把订阅区网格这行：

```html
        <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
```

改成：

```html
        <div class="grid gap-3" :class="subGridCols">
```

- [ ] **Step 3: 验证**

Run: `npm run typecheck && npm run test`
Expected: 全绿（本改动无专属单测，视觉靠手测清单覆盖）

- [ ] **Step 4: 提交**

```bash
git add src/views/HomeView.vue
git commit -m "feat: 首页订阅区电脑端永远占满一行——网格列数随订阅数 1/2/3 映射"
```

---

### Task 4: 总验收关卡

- [ ] **Step 1: 三件套全跑**

Run: `npm run typecheck && npm run test && npm run build`
Expected: 类型检查无错、单测全绿（总数应为 234 + 13 = 247 项：旧 MyTeamCard 8 项被新 8 项等量替换，净增 teamColor 13 项）、构建成功

- [ ] **Step 2: 自查 diff 无越界**

Run: `git diff HEAD~3 --stat`
Expected: 改动只涉及本计划文件结构表列出的 6 个文件，无 `public/data/` 路径

- [ ] **Step 3: 汇报总司令，申请浏览器手测**

无 commit（纯验证）。手测清单见下节，需总司令批准开浏览器。

---

## 手测清单（待总司令批准浏览器）

- [ ] 桌面 1024 / 1440 两档：订阅 1 队（单卡通栏横排、左旗右数）/ 2 队（对半分）/ 3 队（三分占满一行）
- [ ] 手机 375 像素：单列竖排，中英双语无溢出；英文长队名（如 `1. FC Heidenheim 1846`）换行不截断
- [ ] 特殊颜色球队各订一队目检：阿森纳红（原色上旗）、切尔西蓝（原色上旗）、欧塞尔白（黑字模式）、昂热近黑（自动提亮）
- [ ] 当天有比赛则目检今日/实时状态；无则跳过（单测已覆盖）
- [ ] 测完恢复浏览器窗口到 1024 以上（约定）
