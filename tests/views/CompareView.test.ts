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
  source: 'sports.core.api.espn.com',
  updateTime: '2026-08-17T06:00:00Z',
  league: 'eng.1',
  season: '2025',
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
  citizenship: 'Norway',
  flag: 'https://a.espncdn.com/i/teamlogos/countries/500/nor.png',
  stats: {
    general: { appearances: 20, starts: 18, minutes: 1600, yellowCards: 1, redCards: 0 },
    offensive: { totalGoals: 14, shotsOnTarget: 30, totalShots: 50, accuratePasses: 200, goalAssists: 2 },
    defensive: { totalTackles: 5, interceptions: 3, totalClearance: 2 },
    goalKeeping: {},
  },
}

const mockIndex = {
  source: 'sports.core.api.espn.com',
  updateTime: '2026-08-17T06:00:00Z',
  league: 'eng.1',
  season: '2025',
  count: 0,
  players: [],
}

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

  it('移动端渲染球员名 + 最高标记', async () => {
    const { w } = await setup()
    expect(w.text()).toContain('哈兰德')
    // 单人对比，所有项都是最高
    expect(w.text()).toContain('最高')
  })

  it('英文模式：统计标签英文（无中文残留）', async () => {
    localStorage.setItem('matchlab:lang', 'en')
    const { w } = await setup()
    expect(w.text()).toContain('Appearances')
    expect(w.text()).toContain('Haaland')
    expect(w.text()).not.toContain('出场')
  })

  it('已选球员名前渲染国旗（PC 表头 + 移动卡双 DOM）', async () => {
    const { w } = await setup()
    const imgs = w.findAll('img[src*="nor.png"]')
    expect(imgs.length).toBe(2)
    expect(imgs[0].attributes('title')).toBe('Norway')
  })
})
