// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import FavoritesView from '../../src/views/FavoritesView.vue'
import { useUserDataStore } from '../../src/stores/userData'
import { clearScoreCache, clearInjuryCache } from '../../src/composables/useEspanFetch'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  clearScoreCache()
  clearInjuryCache()
  __resetToast()
  __resetConfirm()
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
})
