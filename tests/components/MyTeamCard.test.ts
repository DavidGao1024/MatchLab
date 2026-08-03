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
  it('今日无赛显示"今日无赛"', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    mockEmptyEvents()
    const w = mount(MyTeamCard, { props: { subscription: store.subscriptions[0] } })
    await flushPromises()
    expect(w.text()).toContain('今日无赛')
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
    expect(html).toMatch(/narrow-card/)
    expect(w.text()).toContain('Arsenal')
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
    const winMatch = makeMatch({
      eventId: 'w1', date: '2026-05-12T19:00:00Z', status: 'post', completed: true,
      home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: 1, winner: true },
      away: { id: 39, name: 'Burnley', abbreviation: 'BUR', logo: '', score: 0, winner: false },
    })
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [winMatch] }) })

    const w = mount(MyTeamCard, { props: { subscription: userStore.subscriptions[0] } })
    await flushPromises()

    const html = w.html()
    expect(html).toMatch(/class="[^"]*name[^"]*mine[^"]*"/)
    expect(html).toMatch(/class="[^"]*name[^"]*opp[^"]*"/)
    expect(html).toMatch(/vs-score w/)
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
