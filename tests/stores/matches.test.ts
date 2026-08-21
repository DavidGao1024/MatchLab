// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMatchesStore } from '../../src/stores/matches'
import { clearScoreCache } from '../../src/composables/useEspanFetch'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const ok = (json: unknown) => Promise.resolve({ ok: true, json: async () => json })

function makeMatch(over: Record<string, unknown> = {}) {
  return {
    eventId: 'e1', date: '2025-08-16T14:00Z', status: 'pre', completed: false,
    venue: 'Stadium',
    home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: null, winner: null },
    away: { id: 100, name: 'Everton', abbreviation: 'EVE', logo: '', score: null, winner: null },
    ...over,
  }
}

/** 让某个月的静态 JSON 返回指定 matches，其余月份返回空 */
function mockMonth(month: string, matches: unknown[]) {
  mockFetch.mockImplementation((input) => {
    const url = String(input)
    if (url.includes(`matches/${month}.json`)) return ok({ matches })
    return ok({ matches: [] })
  })
}

beforeEach(() => {
  localStorage.clear()
  clearScoreCache()
  mockFetch.mockReset()
  setActivePinia(createPinia())
})

describe('loadTeamSchedule', () => {
  it('只保留该队主/客场比赛', async () => {
    const store = useMatchesStore()
    mockMonth('2025-08', [
      makeMatch({ eventId: 'ars-home', home: { id: 359, name: 'Arsenal' } }),
      makeMatch({ eventId: 'ars-away', date: '2025-08-20T14:00Z', home: { id: 100, name: 'Everton' }, away: { id: 359, name: 'Arsenal' } }),
      makeMatch({ eventId: 'other', home: { id: 100, name: 'Everton' }, away: { id: 200, name: 'Chelsea' } }),
    ])
    await store.loadTeamSchedule('eng.1', 359, '2025', 'european')
    const ids = store.teamSchedules['eng.1/359'].map((m) => m.eventId)
    expect(ids).toEqual(['ars-home', 'ars-away'])
  })

  it('按开球时间正序排列', async () => {
    const store = useMatchesStore()
    mockMonth('2025-08', [
      makeMatch({ eventId: 'late', date: '2025-08-30T14:00Z', home: { id: 359, name: 'Arsenal' } }),
      makeMatch({ eventId: 'early', date: '2025-08-10T14:00Z', home: { id: 359, name: 'Arsenal' } }),
    ])
    await store.loadTeamSchedule('eng.1', 359, '2025', 'european')
    const ids = store.teamSchedules['eng.1/359'].map((m) => m.eventId)
    expect(ids).toEqual(['early', 'late'])
  })

  it('单月加载失败不连坐其余月', async () => {
    const store = useMatchesStore()
    mockFetch.mockImplementation((input) => {
      const url = String(input)
      if (url.includes('matches/2025-08.json')) return Promise.reject(new Error('boom'))
      if (url.includes('matches/2025-09.json')) return ok({ matches: [makeMatch({ eventId: 'sep', home: { id: 359, name: 'Arsenal' } })] })
      return ok({ matches: [] })
    })
    await store.loadTeamSchedule('eng.1', 359, '2025', 'european')
    const ids = store.teamSchedules['eng.1/359'].map((m) => m.eventId)
    expect(ids).toEqual(['sep'])
  })
})