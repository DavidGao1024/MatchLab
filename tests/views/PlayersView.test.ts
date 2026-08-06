// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import PlayersView from '../../src/views/PlayersView.vue'
import { usePlayersStore } from '../../src/stores/players'
import { useTeamsStore } from '../../src/stores/teams'

beforeEach(() => setActivePinia(createPinia()))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:league/players', component: PlayersView },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
    ],
  })
}

async function setup() {
  const router = makeRouter()
  router.push('/eng.1/players')
  await router.isReady()
  const players = usePlayersStore()
  const teams = useTeamsStore()
  players.indexes['eng.1'] = [{
    id: 253989, name: 'Erling Haaland', teamId: 503, team: 'Manchester City',
    position: 'F', age: 25, goals: 14, assists: 2,
  }] as any
  teams.bundles['eng.1'] = {
    meta: { season: '2025' } as any,
    teams: [{ id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI', color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '' }],
    byId: new Map(),
  } as any
  const w = mount(PlayersView, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}

describe('PlayersView 双 DOM', () => {
  it('PC 端表格容器 hidden md:block 存在', async () => {
    const { w } = await setup()
    expect(w.find('.hidden.md\\:block').exists()).toBe(true)
  })

  it('移动端卡片容器 md:hidden 存在', async () => {
    const { w } = await setup()
    expect(w.find('.md\\:hidden').exists()).toBe(true)
  })

  it('移动端卡片渲染球员名（中文模式）', async () => {
    const { w } = await setup()
    expect(w.text()).toContain('哈兰德')
  })
})
