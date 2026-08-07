// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LeagueSubNav from '../../src/components/layout/LeagueSubNav.vue'
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

async function setup(path: string) {
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
  const w = mount(LeagueSubNav, { global: { plugins: [router, pinia] } })
  return { w }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('LeagueSubNav', () => {
  it('无 league 参数（首页）不渲染', async () => {
    const { w } = await setup('/')
    expect(w.find('nav').exists()).toBe(false)
  })

  it('联赛页渲染 LeaguePicker + 5 个页内导航链接', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.find('nav').exists()).toBe(true)
    expect(w.findAll('a').length).toBe(5)
    expect(w.text()).toContain('英超') // LeaguePicker 触发按钮
  })

  it('当前板块链接高亮', async () => {
    const { w } = await setup('/eng.1/standings')
    const links = w.findAll('a')
    expect(links[0].classes()).toContain('text-white') // 积分榜
    expect(links[1].classes()).not.toContain('text-white')
  })
})
