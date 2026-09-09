// @vitest-environment jsdom
// 首页队徽预载回归：load 后六联赛 teams 档案全部就位（不只焦点英超）。
// 背景：MiniStandings 用 teams.teamById 取队徽，非焦点联赛 bundle 未载入 → 队徽空白，
// 点进积分榜页 ensure 后才补上（bug）。首页应并行预热全部联赛 teams。
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import HomeView from '../../src/views/HomeView.vue'
import { useTeamsStore } from '../../src/stores/teams'
import { __resetFreshGateForTests } from '../../src/composables/useJsonFetch'
import { clearScoreCache } from '../../src/composables/useEspanFetch'
import { LEAGUE_SLUGS } from '../../src/utils/constants'

const ok = (json: unknown) => Promise.resolve({ ok: true, json: async () => json })
const notFound = () => Promise.resolve({ ok: false, status: 404 })

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const leagues = LEAGUE_SLUGS.map((slug) => ({
  slug,
  name: slug,
  nameZh: slug,
  country: 'X',
  color: '#123456',
  understatSlug: null,
  season: '2026',
  seasonType: 'european',
  teams: 20,
  players: 500,
}))

function mockData() {
  mockFetch.mockImplementation((input) => {
    const url = String(input)
    if (url.includes('leagues.json')) return ok({ leagues })
    if (url.includes('meta.json')) return ok({ season: '2026', seasonType: 'european' })
    if (url.includes('teams.json')) {
      return ok({ teams: [
        { id: 1, displayName: 'Team', shortDisplayName: 'Team', abbreviation: 'T', color: '#123456', alternateColor: '#FFFFFF', logo: '', logoDark: '' },
        { id: 2, displayName: 'Rival', shortDisplayName: 'Rival', abbreviation: 'R', color: '#654321', alternateColor: '#FFFFFF', logo: '', logoDark: '' },
      ] })
    }
    // （战报带请求：site.api scoreboard → 两队完赛；26 小时前恒落在回看窗内且不属今天）
    // 良性副作用：积分榜当月直播比分（fetchLiveScores）同 URL 也拿到这场 2:1，空榜变一行榜，不影响既有断言
    if (url.includes('scoreboard')) {
      return ok({
        events: [{
          id: 'x1', date: new Date(Date.now() - 26 * 3600_000).toISOString(),
          status: { type: { state: 'post', completed: true } },
          competitions: [{ competitors: [
            { homeAway: 'home', team: { id: '1', displayName: 'Team' }, score: '2' },
            { homeAway: 'away', team: { id: '2', displayName: 'Rival' }, score: '1' },
          ] }],
        }],
      })
    }
    // 积分榜各月份赛程（历史月静态文件）→ 404 出空即可
    return notFound()
  })
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/:league/standings', component: { template: '<div/>' } },
    ],
  })
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  __resetFreshGateForTests()
  clearScoreCache()
  mockFetch.mockReset()
  mockData()
})

describe('首页 load — 六联赛 teams 档案预热', () => {
  it('load 后六个联赛的 teams bundle 全部就位（不只焦点英超）', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()
    mount(HomeView, { global: { plugins: [router] } })
    await flushPromises()

    const teams = useTeamsStore()
    expect(Object.keys(teams.bundles).sort()).toEqual(
      ['chn.1', 'eng.1', 'esp.1', 'fra.1', 'ger.1', 'ita.1'],
    )
  })

  it('非焦点联赛的球队档案可按 teamId 查到（队徽数据可用）', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()
    mount(HomeView, { global: { plugins: [router] } })
    await flushPromises()

    const teams = useTeamsStore()
    // 西甲（非焦点）也有球队档案，MiniStandings 的 teamById 不再返回 undefined
    expect(teams.teamById('esp.1', 1)?.name).toBe('Team')
  })
})

describe('首页昨日战报带（v2：六联赛混合·实时区间取数）', () => {
  it('昨日有完赛 → 战报带渲染且卡片带联赛徽标', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()
    const w = mount(HomeView, { global: { plugins: [router] } })
    await flushPromises()

    expect(w.find('.league-tag').exists()).toBe(true)
    expect(w.text()).toContain('昨日战报')
  })
})