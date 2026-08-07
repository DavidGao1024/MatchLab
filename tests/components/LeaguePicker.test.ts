// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LeaguePicker from '../../src/components/layout/LeaguePicker.vue'
import { useAppStore } from '../../src/stores/app'
import { LEAGUE_SLUGS } from '../../src/utils/constants'

const ZH: Record<string, string> = { 'eng.1': '英超', 'esp.1': '西甲', 'ita.1': '意甲', 'ger.1': '德甲', 'fra.1': '法甲', 'chn.1': '中超' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/:league/standings', name: 'standings', component: { template: '<div/>' } },
    ],
  })
}

async function setup(path = '/eng.1/standings') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = useAppStore()
  app.leagues = LEAGUE_SLUGS.map((slug) => ({
    slug, name: slug, nameZh: ZH[slug] ?? slug,
    country: '', color: '#000', understatSlug: null, season: '2025', teams: 20, players: 500,
  }))
  const router = makeRouter()
  router.push(path)
  await router.isReady()
  const w = mount(LeaguePicker, { global: { plugins: [router, pinia] } })
  return { w, router }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('LeaguePicker', () => {
  it('触发按钮显示当前联赛中文名', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.find('button').text()).toContain('英超')
  })

  it('默认收起，点击展开列出 6 联赛并高亮当前', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.findAll('button').length).toBe(1) // 仅触发按钮
    await w.find('button').trigger('click')
    const btns = w.findAll('button')
    expect(btns.length).toBe(1 + 6)
    expect(w.text()).toContain('中超')
    expect(btns[1].classes()).toContain('bg-white/10') // 英超高亮
  })

  it('点击某联赛跳转并收起', async () => {
    const { w, router } = await setup('/eng.1/standings')
    await w.find('button').trigger('click')
    await w.findAll('button')[2].trigger('click') // 西甲
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/esp.1/standings')
    expect(w.findAll('button').length).toBe(1) // 已收起
  })

  it('点击组件外部关闭面板', async () => {
    const { w } = await setup('/eng.1/standings')
    await w.find('button').trigger('click')
    expect(w.findAll('button').length).toBe(7)
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(w.findAll('button').length).toBe(1)
  })
})
