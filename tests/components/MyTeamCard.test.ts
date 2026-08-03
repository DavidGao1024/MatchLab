// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MyTeamCard from '../../src/components/home/MyTeamCard.vue'
import { useUserDataStore } from '../../src/stores/userData'
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
