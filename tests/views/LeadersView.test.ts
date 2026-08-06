// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LeadersView from '../../src/views/LeadersView.vue'
import { useLeadersStore } from '../../src/stores/leaders'
import { useTeamsStore } from '../../src/stores/teams'
import { __resetFreshGateForTests } from '../../src/composables/useJsonFetch'

const mockBundle = {
  source: 'espn',
  updateTime: '',
  league: 'eng.1',
  season: '2025',
  categories: [{
    name: 'goalsLeaders',
    displayName: 'Goals',
    abbreviation: 'G',
    entries: [{ rank: 1, value: 14, displayValue: '14', athleteId: 253989, athleteName: 'Erling Haaland', teamId: 503, teamName: 'Manchester City' }],
  }],
}

beforeEach(() => {
  setActivePinia(createPinia())
  __resetFreshGateForTests()
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => mockBundle,
  }))
})

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:league/leaders', component: LeadersView },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
    ],
  })
}

async function setup() {
  const router = makeRouter()
  router.push('/eng.1/leaders')
  await router.isReady()
  const leaders = useLeadersStore()
  const teams = useTeamsStore()
  leaders.bundles['eng.1'] = mockBundle as any
  leaders.loading['eng.1'] = false
  teams.bundles['eng.1'] = {
    meta: { season: '2025' } as any,
    teams: [{ id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI', color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '' }],
    byId: new Map(),
  } as any
  const w = mount(LeadersView, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}

describe('LeadersView 双 DOM', () => {
  it('PC 表格容器 hidden md:block 存在', async () => {
    const { w } = await setup()
    expect(w.find('.hidden.md\\:block').exists()).toBe(true)
  })

  it('移动卡片容器 md:hidden 存在', async () => {
    const { w } = await setup()
    expect(w.find('.md\\:hidden').exists()).toBe(true)
  })

  it('移动端卡片渲染中文译名', async () => {
    const { w } = await setup()
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('曼城')
    expect(w.text()).toContain('进球')
  })
})
