// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TeamSchedule from '../../../src/components/teams/TeamSchedule.vue'
import { clearScoreCache } from '../../../src/composables/useEspanFetch'

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

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('matchlab:lang', 'zh')
  clearScoreCache()
  setActivePinia(createPinia())
})

function mockAug(matches: unknown[]) {
  mockFetch.mockImplementation((input) => {
    const url = String(input)
    if (url.includes('matches/2025-08.json')) return ok({ matches })
    return ok({ matches: [] })
  })
}

async function setup(matches: unknown[]) {
  mockAug(matches)
  const w = mount(TeamSchedule, { props: { league: 'eng.1', teamId: 359 } })
  await flushPromises()
  return w
}

describe('TeamSchedule', () => {
  it('显示全部赛程：含已赛与未来，有下一场卡', async () => {
    const w = await setup([
      makeMatch({ eventId: 'last', date: '2025-08-10T14:00Z', status: 'post', completed: true, home: { id: 359, name: 'Arsenal', score: 2, winner: true }, away: { id: 100, name: 'Everton', score: 0, winner: false } }),
      makeMatch({ eventId: 'next', date: '2025-08-20T14:00Z', home: { id: 100, name: 'Everton' }, away: { id: 359, name: 'Arsenal' } }),
    ])
    expect(w.text()).toContain('下一场')
    // 下一场卡 1 个 MatchCard + 列表 2 场（已赛与未来都在）
    expect(w.findAll('.group').length).toBe(3)
  })

  it('整季空赛程显示空态文案', async () => {
    const w = await setup([])
    expect(w.text()).toContain('暂无')
  })

  it('全已赛：无下一场卡，列表仍显示已赛', async () => {
    const w = await setup([
      makeMatch({ eventId: 'only', status: 'post', completed: true, home: { id: 359, name: 'Arsenal', score: 1, winner: true }, away: { id: 100, name: 'Everton', score: 0, winner: false } }),
    ])
    expect(w.text()).not.toContain('下一场')
    expect(w.findAll('.group').length).toBe(1)
  })
})