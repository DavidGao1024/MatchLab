// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStandingsStore } from '../../src/stores/standings'
import { clearScoreCache } from '../../src/composables/useEspanFetch'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const ok = (json: unknown) => Promise.resolve({ ok: true, json: async () => json })

/** ESPN 实时 scoreboard 事件：Arsenal 3-0 Everton（已完赛） */
function espnEvent(id: string) {
  return {
    id,
    date: '2026-08-22T14:00Z',
    status: { type: { state: 'post', completed: true }, displayClock: 'FT' },
    competitions: [{
      competitors: [
        { homeAway: 'home', team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS', logo: '' }, score: '3', winner: true },
        { homeAway: 'away', team: { id: '100', displayName: 'Everton', abbreviation: 'EVE', logo: '' }, score: '0', winner: false },
      ],
      venue: { fullName: 'Emirates Stadium' },
    }],
  }
}

/** 静态月份赛程：主队 2-0 客队（已完赛） */
function staticMatch(homeId: number, awayId: number) {
  return {
    eventId: 'static', date: '2026-08-10T14:00Z', status: 'post', completed: true, venue: 'X',
    home: { id: homeId, name: 'Home', abbreviation: 'H', logo: '', score: 2, winner: true },
    away: { id: awayId, name: 'Away', abbreviation: 'A', logo: '', score: 0, winner: null },
  }
}

beforeEach(() => {
  localStorage.clear()
  clearScoreCache()
  mockFetch.mockReset()
  setActivePinia(createPinia())
})
afterEach(() => { vi.useRealTimers() })

describe('standings.load 实时算榜', () => {
  it('当月实时 + 历史月静态拼出积分榜', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T00:00:00Z')) // currentMonth = 2026-08
    mockFetch.mockImplementation((input) => {
      const url = String(input)
      if (url.includes('site.api.espn.com')) return ok({ events: [espnEvent('live')] })
      if (url.includes('matches/2026-09.json')) return ok({ matches: [staticMatch(200, 201)] }) // 历史月（9 月）
      return Promise.resolve({ ok: false, status: 404 })
    })
    const store = useStandingsStore()
    await store.load('eng.1', '2026', { seasonType: 'european', forceFresh: true })
    const rows = store.rows['eng.1']!
    expect(rows).toHaveLength(4) // Arsenal/Everton + Home/Away
    const ars = rows.find((r) => r.teamId === 359)!
    expect(ars).toMatchObject({ played: 1, won: 1, points: 3, goalsFor: 3, goalsAgainst: 0 })
    const historical = rows.find((r) => r.teamId === 200)!
    expect(historical).toMatchObject({ points: 3, goalsFor: 2 })
  })

  it('当月实时失败回落静态快照', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T00:00:00Z'))
    mockFetch.mockImplementation((input) => {
      const url = String(input)
      if (url.includes('site.api.espn.com')) return Promise.reject(new Error('espn down'))
      if (url.includes('matches/2026-08.json')) return ok({ matches: [staticMatch(359, 100)] })
      return Promise.resolve({ ok: false, status: 404 })
    })
    const store = useStandingsStore()
    await store.load('eng.1', '2026', { seasonType: 'european' })
    expect(store.rows['eng.1']!.find((r) => r.teamId === 359)!.points).toBe(3)
  })

  it('历史月文件缺失不报错，照样出榜', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T00:00:00Z'))
    mockFetch.mockImplementation((input) => {
      const url = String(input)
      if (url.includes('site.api.espn.com')) return ok({ events: [espnEvent('live')] })
      return Promise.resolve({ ok: false, status: 404 })
    })
    const store = useStandingsStore()
    await store.load('eng.1', '2026', { seasonType: 'european' })
    expect(store.rows['eng.1']).toHaveLength(2)
  })

  it('withForm=false 时不算形势（form 为空）', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T00:00:00Z'))
    mockFetch.mockImplementation((input) => {
      const url = String(input)
      if (url.includes('site.api.espn.com')) return ok({ events: [espnEvent('live')] })
      return Promise.resolve({ ok: false, status: 404 })
    })
    const store = useStandingsStore()
    await store.load('eng.1', '2026', { seasonType: 'european', withForm: false })
    const ars = store.rows['eng.1']!.find((r) => r.teamId === 359)!
    expect(ars.form).toEqual([])
  })
})