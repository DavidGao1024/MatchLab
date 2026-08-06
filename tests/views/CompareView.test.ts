// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import CompareView from '../../src/views/CompareView.vue'
import { useCompareStore } from '../../src/stores/compare'
import { usePlayersStore } from '../../src/stores/players'
import { useTeamsStore } from '../../src/stores/teams'
import { __resetFreshGateForTests } from '../../src/composables/useJsonFetch'

const mockProfile = {
  id: 253989,
  displayName: 'Erling Haaland',
  shortName: 'Haaland',
  firstName: 'Erling',
  lastName: 'Haaland',
  age: 25,
  height: 194,
  weight: 88,
  jersey: 9,
  position: 'F',
  positionLabel: 'Forward',
  teamId: 503,
  stats: {
    general: { appearances: 20, starts: 18, minutes: 1600, yellowCards: 1, redCards: 0 },
    offensive: { totalGoals: 14, shotsOnTarget: 30, totalShots: 50, accuratePasses: 200, goalAssists: 2 },
    defensive: { totalTackles: 5, interceptions: 3, totalClearance: 2 },
    goalKeeping: {},
  },
}

const mockIndex = { players: [] }

beforeEach(() => {
  setActivePinia(createPinia())
  __resetFreshGateForTests()
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('players/index.json')) {
        return Promise.resolve({ ok: true, json: async () => mockIndex })
      }
      if (url.includes('players/253989.json')) {
        return Promise.resolve({ ok: true, json: async () => mockProfile })
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
    }),
  )
})

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:league/compare', component: CompareView },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
    ],
  })
}

async function setup() {
  const router = makeRouter()
  router.push('/eng.1/compare')
  await router.isReady()
  const compare = useCompareStore()
  const players = usePlayersStore()
  const teams = useTeamsStore()
  compare.ids = [253989]
  players.indexes['eng.1'] = [] as any
  players.loadingIdx['eng.1'] = false
  teams.bundles['eng.1'] = {
    meta: { season: '2025' } as any,
    teams: [{ id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI', color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '' }],
    byId: new Map(),
  } as any
  const w = mount(CompareView, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}

describe('CompareView 双 DOM', () => {
  it('PC 表格容器 hidden md:block 存在', async () => {
    const { w } = await setup()
    expect(w.find('.hidden.md\\:block').exists()).toBe(true)
  })

  it('移动卡片容器 md:hidden 存在', async () => {
    const { w } = await setup()
    expect(w.find('.md\\:hidden').exists()).toBe(true)
  })

  it('移动端渲染球员名 + max 标记', async () => {
    const { w } = await setup()
    expect(w.text()).toContain('哈兰德')
    // 单人对比，所有项都是 max
    expect(w.text()).toContain('max')
  })
})
