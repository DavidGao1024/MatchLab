// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import FavoritesDropdown from '../../src/components/layout/FavoritesDropdown.vue'
import { useUserDataStore } from '../../src/stores/userData'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div/>' } }],
})

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  __resetToast()
  __resetConfirm()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('FavoritesDropdown', () => {
  it('空收藏不显示下拉', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    expect(w.text()).toContain('收藏 (0)')
    await w.find('.relative').trigger('mouseenter')
    expect(w.find('.absolute').exists()).toBe(false)
  })
  it('有收藏 hover 后显示列表', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    await w.find('.relative').trigger('mouseenter')
    expect(w.text()).toContain('Arsenal')
  })
})
