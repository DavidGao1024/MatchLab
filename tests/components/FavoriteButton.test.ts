// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FavoriteButton from '../../src/components/common/FavoriteButton.vue'
import { useUserDataStore } from '../../src/stores/userData'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.useFakeTimers()
  __resetToast()
  __resetConfirm()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('FavoriteButton', () => {
  it('未收藏态显示空心心形', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoriteButton, { props: { type: 'team', id: 359, name: 'Arsenal', league: 'eng.1' } })
    expect(w.find('button').text()).toContain('☆')
  })
  it('点击切换收藏态', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoriteButton, { props: { type: 'team', id: 359, name: 'Arsenal', league: 'eng.1' } })
    await w.find('button').trigger('click')
    expect(w.find('button').text()).toContain('★')
    expect(store.isFavorite('team', 359)).toBe(true)
    await w.find('button').trigger('click')
    expect(w.find('button').text()).toContain('☆')
  })
  it('达到上限 disabled', async () => {
    const store = useUserDataStore()
    await store.init()
    for (let i = 0; i < 50; i++) {
      store.addFavorite('team', { league: 'eng.1', teamId: i, name: `T${i}` })
    }
    const w = mount(FavoriteButton, { props: { type: 'team', id: 999, name: 'X', league: 'eng.1' } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })
})
