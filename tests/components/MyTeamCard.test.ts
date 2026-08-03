// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MyTeamCard from '../../src/components/home/MyTeamCard.vue'
import { useUserDataStore } from '../../src/stores/userData'
import { useStandingsStore } from '../../src/stores/standings'
import { useTeamsStore } from '../../src/stores/teams'
import type { StandingRow, Team, Match, MatchStatus } from '../../src/types/models'
import { clearScoreCache, clearInjuryCache } from '../../src/composables/useEspanFetch'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  // MyTeamCard 用 teamName(name, app.lang) i18n；测试断言期望原文 Arsenal/Liverpool，强制英文模式
  localStorage.setItem('matchlab:lang', 'en')
  mockFetch.mockReset()
  __resetToast()
  __resetConfirm()
  clearScoreCache()
  clearInjuryCache()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function mockEmptyEvents() {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
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

describe('MyTeamCard', () => {
  it('传入 subscription 渲染球队名', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    mockEmptyEvents()
    const w = mount(MyTeamCard, { props: { subscription: store.subscriptions[0] } })
    await flushPromises()
    expect(w.text()).toContain('Arsenal')
  })
  it('无任何赛程显示"赛季已结束"', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    mockEmptyEvents()
    const w = mount(MyTeamCard, { props: { subscription: store.subscriptions[0] } })
    await flushPromises()
    expect(w.text()).toContain('赛季已结束')
  })
  it('有今日赛程 → 显示对阵双方', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    const todayISO = new Date().toISOString()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [{
          id: '99',
          date: todayISO,
          status: { type: { state: 'pre' } },
          competitions: [{
            competitors: [
              { homeAway: 'home', team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS' }, score: '0' },
              { homeAway: 'away', team: { id: '25', displayName: 'Liverpool', abbreviation: 'LIV' }, score: '0' },
            ],
            venue: { fullName: 'Emirates' },
          }],
        }],
      }),
    })
    const w = mount(MyTeamCard, { props: { subscription: store.subscriptions[0] } })
    await flushPromises()
    expect(w.text()).toContain('Arsenal')
    expect(w.text()).toContain('Liverpool')
    expect(w.text()).not.toContain('今日无赛')
  })
})

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
    const wdlCells = w.findAll('.wdl-cell')
    expect(wdlCells.length).toBe(3)
    expect(wdlCells[0].text()).toContain('26')
    expect(wdlCells[1].text()).toContain('7')
    expect(wdlCells[2].text()).toContain('5')
    const pointsRow = w.find('.points-row')
    expect(pointsRow.text()).toContain('85')
    const formPills = w.findAll('.form-pills .pill')
    expect(formPills.length).toBe(5)
    const gfGa = w.findAll('.gf-ga-cell')
    expect(gfGa.length).toBe(2)
    expect(gfGa[0].text()).toContain('75')
    expect(gfGa[1].text()).toContain('32')
  })
})

describe('MyTeamCard 多队订阅仍用 wide 模式（每卡拉宽占满）', () => {
  it('2 队订阅渲染 wide 布局（rank badge + WDL）', async () => {
    const userStore = useUserDataStore()
    await userStore.init()
    userStore.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    userStore.addSubscription({ league: 'eng.1', teamId: 362, teamName: 'Aston Villa' })
    injectStoreData()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    const html = w.html()
    expect(html).toMatch(/wide-card/)
    expect(html).toMatch(/rank-badge/)
    expect(html).toMatch(/wdl-cell/)
    expect(w.text()).toContain('Arsenal')
  })

  it('3 队订阅也渲染 wide 布局', async () => {
    const userStore = useUserDataStore()
    await userStore.init()
    userStore.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    userStore.addSubscription({ league: 'eng.1', teamId: 362, teamName: 'Aston Villa' })
    userStore.addSubscription({ league: 'eng.1', teamId: 349, teamName: 'AFC Bournemouth' })
    injectStoreData()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    const html = w.html()
    expect(html).toMatch(/wide-card/)
    expect(html).toMatch(/rank-badge/)
  })
})

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

describe('MyTeamCard vs 行 mine/opp 高亮 + WDL tone', () => {
  it('订阅队名 mine class，对手 opp class，比分按 W/D/L tone', async () => {
    const userStore = useUserDataStore()
    await userStore.init()
    userStore.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    injectStoreData()
    // raw ESPN event（normalizeEvent 能产出 Match）
    const rawEvent = {
      id: 'w1',
      date: '2026-05-12T19:00:00Z',
      status: { type: { state: 'post' } },
      competitions: [{
        competitors: [
          { homeAway: 'home', team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS' }, score: '1', winner: true },
          { homeAway: 'away', team: { id: '39', displayName: 'Burnley', abbreviation: 'BUR' }, score: '0', winner: false },
        ],
        venue: { fullName: 'Emirates Stadium' },
      }],
    }
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [rawEvent] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    // BEM 风格选择器（不依赖 class 属性内顺序）
    const mineEls = w.findAll('.name.mine')
    const oppEls = w.findAll('.name.opp')
    expect(mineEls.length).toBeGreaterThan(0)
    expect(oppEls.length).toBeGreaterThan(0)
    const wScore = w.findAll('.vs-score.w')
    expect(wScore.length).toBeGreaterThan(0)
  })
})

describe('MyTeamCard standings 未加载', () => {
  it('战绩区显示占位"-"不阻塞渲染', async () => {
    const userStore = useUserDataStore()
    await userStore.init()
    userStore.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    injectStoreData({ standing: null })
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    expect(w.text()).toContain('Arsenal')
    expect(w.text()).not.toContain('26')
    const html = w.html()
    expect(html).toMatch(/wdl-skeleton/)
  })
})
