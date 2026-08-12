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

/** 以钉死的"现在"为基准取本地某日某点的 ISO 时间，跨时区测试同日判断不漂移 */
function localAt(dayOffset: number, hour: number): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0).toISOString()
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
      date: localAt(0, 23),
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
        date: localAt(0, 9),
        status: { type: { state: 'post' }, displayClock: '90:00' },
      }),
      rawEvent({ id: '99', date: localAt(3, 19) }),
    ])
    const w = await mountCard()
    expect(w.text()).toContain('Next')
    expect(w.text()).not.toContain('Today')
  })

  it('今日进行中 → Live + 大比分 + 时钟', async () => {
    injectStoreData()
    mockEvents([rawEvent({
      date: localAt(0, 23),
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
