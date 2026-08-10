// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SubscribeButton from '../../src/components/teams/SubscribeButton.vue'
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

describe('SubscribeButton', () => {
  it('未订阅态显示"订阅主队"', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal' } })
    expect(w.text()).toContain('订阅主队')
  })
  it('点击订阅后变"已订阅 ✓"', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal' } })
    await w.find('button').trigger('click')
    expect(w.text()).toContain('已订阅')
    expect(store.isSubscribed(359)).toBe(true)
  })
  it('已订阅态点击触发确认弹窗（不直接取消）', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal' } })
    await w.find('button').trigger('click')
    // 弹窗由 useConfirm 控制 state.visible，未点确认/取消前订阅仍存在
    expect(store.isSubscribed(359)).toBe(true)
  })
  it('英文模式：按钮文案英文', async () => {
    localStorage.setItem('matchlab:lang', 'en')
    const store = useUserDataStore()
    await store.init()
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal' } })
    expect(w.text()).toContain('Subscribe')
    expect(w.text()).not.toContain('订阅主队')
  })
  it('达到上限 3 队时按钮 disabled', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addSubscription({ league: 'eng.1', teamId: 1, teamName: 'A' })
    store.addSubscription({ league: 'eng.1', teamId: 2, teamName: 'B' })
    store.addSubscription({ league: 'eng.1', teamId: 3, teamName: 'C' })
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 4, teamName: 'D' } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })
  it('store.readOnly → 按钮 disabled（隐私模式）', async () => {
    const store = useUserDataStore()
    await store.init()
    store.readOnly = true
    const w = mount(SubscribeButton, { props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal' } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })
})
