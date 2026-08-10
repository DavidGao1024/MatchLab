// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
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
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.useRealTimers()
})

function firePointer(el: Element, type: string, pointerType: string) {
  const ev = new Event(type, { bubbles: true })
  ;(ev as any).pointerType = pointerType
  el.dispatchEvent(ev)
}

describe('FavoritesDropdown', () => {
  it('空收藏：鼠标悬停不显示下拉', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    expect(w.text()).toContain('收藏 (0)')
    firePointer(w.find('.relative').element, 'pointerenter', 'mouse')
    await nextTick()
    expect(w.find('div.absolute').exists()).toBe(false)
  })

  it('有收藏：鼠标悬停显示列表（中文）', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    firePointer(w.find('.relative').element, 'pointerenter', 'mouse')
    await nextTick()
    expect(w.text()).toContain('阿森纳')
  })

  it('触屏 pointerenter（pointerType=touch）不展开', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    firePointer(w.find('.relative').element, 'pointerenter', 'touch')
    expect(w.find('div.absolute').exists()).toBe(false)
  })

  it('点击按钮开合（触屏路径）', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    await w.find('button').trigger('click')
    expect(w.find('div.absolute').exists()).toBe(true)
    await w.find('button').trigger('click')
    expect(w.find('div.absolute').exists()).toBe(false)
  })

  it('打开后点击组件外部关闭', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    await w.find('button').trigger('click')
    expect(w.find('div.absolute').exists()).toBe(true)
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    expect(w.find('div.absolute').exists()).toBe(false)
  })

  it('面板间隙由面板自身 padding 承担（悬停桥）——防鼠标穿过间隙误关', async () => {
    const store = useUserDataStore()
    await store.init()
    store.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    firePointer(w.find('.relative').element, 'pointerenter', 'mouse')
    await nextTick()
    const panel = w.find('div.absolute')
    expect(panel.exists()).toBe(true)
    // 间隙若是 mt-* 则不属于面板元素，鼠标经过即触发 pointerleave 误关；
    // 必须收进面板自身做 pt-*，悬停区域才连续（桌面 hover 主路径）
    const cls = panel.classes()
    expect(cls.some((c) => c.startsWith('mt-'))).toBe(false)
    expect(cls).toContain('pt-2')
  })

  it('按钮文字 nowrap——窄桌面 flex 压缩时不折行撑高顶行', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    // 窄桌面（约 768–950px）单行头部宽度不足时 flex 压缩各子项，
    // 无 nowrap 的文字会被压成竖排撑高整行（2026-08-10 实测 96px）
    expect(w.find('button').classes()).toContain('whitespace-nowrap')
  })

  it('total=0 移动端无角标；按钮有 aria-label', async () => {
    const store = useUserDataStore()
    await store.init()
    const w = mount(FavoritesDropdown, { global: { plugins: [router] } })
    expect(w.find('.fav-badge').exists()).toBe(false)
    expect(w.find('button').attributes('aria-label')).toBe('收藏')
  })
})
