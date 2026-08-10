// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LeagueTabs from '../../src/components/layout/LeagueTabs.vue'
import { useAppStore } from '../../src/stores/app'
import { LEAGUE_SLUGS } from '../../src/utils/constants'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/:league/standings', name: 'standings', component: { template: '<div/>' } },
    ],
  })
}

async function setup(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = useAppStore()
  app.leagues = LEAGUE_SLUGS.map((slug) => ({
    slug, name: slug, nameZh: { 'eng.1': '英超', 'esp.1': '西甲', 'ita.1': '意甲', 'ger.1': '德甲', 'fra.1': '法甲', 'chn.1': '中超' }[slug] ?? slug,
    country: '', color: '#000', understatSlug: null, season: '2025', teams: 20, players: 500,
  }))
  const router = makeRouter()
  router.push(path)
  await router.isReady()
  const w = mount(LeagueTabs, { global: { plugins: [router, pinia] } })
  return { w, router }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('LeagueTabs', () => {
  it('渲染 6 个联赛按钮（中文模式）', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.findAll('button').length).toBe(6)
    expect(w.text()).toContain('英超')
    expect(w.text()).toContain('中超')
  })

  it('当前联赛按钮高亮（含 bg-white/10 类）', async () => {
    const { w } = await setup('/eng.1/standings')
    const btns = w.findAll('button')
    expect(btns[0].classes()).toContain('bg-white/10')
    expect(btns[1].classes()).not.toContain('bg-white/10')
  })

  it('点击其他联赛跳转同页类型', async () => {
    const { w, router } = await setup('/eng.1/standings')
    await w.findAll('button')[1].trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/esp.1/standings')
  })

  it('滚动区隐藏滚动条——窄桌面被压缩时滚动条不占行高', async () => {
    const { w } = await setup('/eng.1/standings')
    // html 上的 scrollbar-width: thin 不继承到内部滚动区（实测 computed auto），
    // Windows 经典滚动条 15px 会把窄桌面顶行撑高；此处显式隐藏（可滚不可见）
    expect(w.find('nav').classes()).toContain('scrollbar-none')
  })

  it('移动端加大触点（含 text-sm px-3.5 py-2 类）', async () => {
    const { w } = await setup('/eng.1/standings')
    const cls = w.findAll('button')[0].classes()
    expect(cls).toContain('text-sm')
    expect(cls).toContain('px-3.5')
    expect(cls).toContain('py-2')
    expect(cls).toContain('md:text-xs')
  })
})
