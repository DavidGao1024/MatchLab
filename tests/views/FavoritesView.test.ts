// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import FavoritesView from '../../src/views/FavoritesView.vue'
import { useUserDataStore } from '../../src/stores/userData'
import { useAppStore } from '../../src/stores/app'
import { useTeamsStore } from '../../src/stores/teams'
import type { LeagueInfo, Team } from '../../src/types/models'
import { clearScoreCache, clearInjuryCache } from '../../src/composables/useEspanFetch'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  clearScoreCache()
  clearInjuryCache()
  __resetToast()
  __resetConfirm()
  mockFetch.mockReset()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function mountWithRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/favorites', component: FavoritesView },
      { path: '/:league/standings', component: { template: '<div/>' } },
      { path: '/:league/team/:id', component: { template: '<div/>' } },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
    ],
  })
  return { router, w: mount(FavoritesView, { global: { plugins: [router] } }) }
}

describe('FavoritesView', () => {
  it('空收藏显示 EmptyState', async () => {
    const store = useUserDataStore()
    await store.init()
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('暂无收藏')
  })
  it('英文模式：标题与空态全英文（无中文残留）', async () => {
    localStorage.setItem('matchlab:lang', 'en')
    const store = useUserDataStore()
    await store.init()
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('My Favorites')
    expect(w.text()).toContain('No Favorites Yet')
    expect(w.text()).not.toContain('暂无收藏')
    expect(w.text()).not.toContain('我的收藏')
  })
  it('英文模式：tab 与删除按钮英文', async () => {
    localStorage.setItem('matchlab:lang', 'en')
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('Teams')
    expect(w.text()).toContain('Remove')
    expect(w.text()).not.toContain('删除')
  })
  it('有收藏渲染列表', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    store.addFavorite('player', { league: 'eng.1', athleteId: 253989, name: 'Haaland' })
    const { w } = mountWithRouter()
    await flushPromises()
    // 默认 tab=teams → lang=zh 显示中文队名
    expect(w.text()).toContain('阿森纳')
    // 切到球员 tab → 显示 Haaland 中文译名
    const playersTab = w.findAll('button').find((b) => b.text().includes('球员'))
    expect(playersTab).toBeTruthy()
    await playersTab!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('哈兰德')
  })

  function makeInfo(over: Partial<LeagueInfo> = {}): LeagueInfo {
    return {
      slug: 'eng.1', name: 'Premier League', nameZh: '英超', country: 'England',
      color: '#3D195B', understatSlug: 'EPL', season: '2025', teams: 20, players: 500,
      ...over,
    }
  }

  function injectTeam(team: Team, league = 'eng.1') {
    useTeamsStore().bundles[league as 'eng.1'] = {
      meta: { season: '2025', seasonType: 'european' } as any,
      teams: [team],
      byId: new Map([[team.id, team]]),
    }
  }

  function makeTeam(over: Partial<Team> = {}): Team {
    return {
      id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
      color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
      ...over,
    }
  }

  it('联赛徽章与队徽：档案就位时渲染', async () => {
    useAppStore().leagues = [makeInfo()]
    injectTeam(makeTeam())
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('英超')
    // TeamLogo 无 logo url → 自身首字圆牌兜底；默认中文模式，aria-label 为中文译名
    expect(w.find('span[aria-label="阿森纳"]').exists()).toBe(true)
  })
  it('档案拉取失败：尽力而为，首字圆牌兜底，列表照常渲染', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    useAppStore().leagues = [makeInfo()]
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('阿森纳')
    expect(w.text()).toContain('英超')
    expect(w.text()).toContain('阿') // 兜底首字圆牌
    expect(w.text()).toContain('删除') // 按钮不受影响
  })
  it('无编号遗留条目：只有名字和徽章，无任何按钮', async () => {
    useAppStore().leagues = [makeInfo()]
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', name: 'Legacy Club' })
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('Legacy Club')
    expect(w.text()).not.toContain('删除')
    expect(w.text()).not.toContain('日历')
  })
  it('删除：即删 + 列表即时更新', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const { w } = mountWithRouter()
    await flushPromises()
    expect(w.text()).toContain('阿森纳')
    await w.findAll('button').find((b) => b.text().includes('删除'))!.trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('阿森纳')
    expect(store.favorites.teams).toHaveLength(0)
  })
  it('名字点击跳详情页', async () => {
    vi.useRealTimers()
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const { w, router } = mountWithRouter()
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('阿森纳'))!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/eng.1/team/359')
    vi.useFakeTimers()
  })
})
