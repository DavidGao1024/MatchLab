// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import AppHeader from '../../src/components/layout/AppHeader.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/:league/standings', name: 'standings', component: { template: '<div/>' } },
    ],
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  document.body.innerHTML = ''
})

describe('AppHeader', () => {
  it('PC 端搜索框可见（hidden md:block 类）', () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const search = w.find('.hidden.md\\:block')
    expect(search.exists()).toBe(true)
  })

  it('移动端搜索图标按钮存在（md:hidden 类）', () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const btns = w.findAll('button.md\\:hidden')
    expect(btns.length).toBeGreaterThan(0)
  })

  it('点击搜索图标触发全屏搜索层', async () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const searchBtn = w.find('button.md\\:hidden')
    await searchBtn.trigger('click')
    await nextTick()
    const overlay = document.querySelector('.mobile-search-overlay')
    expect(overlay).not.toBeNull()
  })

  it('全屏层取消按钮关闭层', async () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const searchBtn = w.find('button.md\\:hidden')
    await searchBtn.trigger('click')
    await nextTick()
    const cancelBtn = document.querySelector('.mobile-search-overlay .cancel-btn') as HTMLElement
    expect(cancelBtn).not.toBeNull()
    cancelBtn.click()
    await nextTick()
    await new Promise((r) => setTimeout(r, 10))
    expect(document.querySelector('.mobile-search-overlay')).toBeNull()
  })

  it('顶行容器带 flex-wrap 与 md:flex-nowrap', () => {
    const w = mount(AppHeader, { global: { plugins: [makeRouter()] } })
    const container = w.find('header > div')
    expect(container.classes()).toContain('flex-wrap')
    expect(container.classes()).toContain('md:flex-nowrap')
  })

  it('首页路由：LeagueTabs wrapper 带 order-last w-full（移动端整行）', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()
    const w = mount(AppHeader, { global: { plugins: [router] } })
    const nav = w.find('nav.overflow-x-auto') // LeagueTabs 根
    const wrapper = nav.element.parentElement as HTMLElement
    expect(wrapper.className).toContain('order-last')
    expect(wrapper.className).toContain('w-full')
    expect(wrapper.className).toContain('md:min-w-0')
  })

  it('联赛路由：LeagueTabs wrapper 带 hidden（移动端交给 LeaguePicker）', async () => {
    const router = makeRouter()
    router.push('/eng.1/standings')
    await router.isReady()
    const w = mount(AppHeader, { global: { plugins: [router] } })
    const nav = w.find('nav.overflow-x-auto')
    const wrapper = nav.element.parentElement as HTMLElement
    expect(wrapper.className).toContain('hidden')
    expect(wrapper.className).toContain('md:min-w-0')
  })
})
