// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useLeagueSwitch } from '../../src/composables/useLeagueSwitch'
import { useAppStore } from '../../src/stores/app'

// useLeagueSwitch 依赖 useRoute/useRouter，必须在组件 setup 内调用，故用宿主组件暴露返回值
const Host = defineComponent({
  setup() {
    const { active, label, pick } = useLeagueSwitch()
    return { active, label, pick }
  },
  render() {
    return h('div')
  },
})

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/:league/standings', name: 'standings', component: { template: '<div/>' } },
      { path: '/:league/schedule', name: 'schedule', component: { template: '<div/>' } },
      { path: '/:league/players', name: 'players', component: { template: '<div/>' } },
      { path: '/:league/player/:id', name: 'player-detail', component: { template: '<div/>' } },
      { path: '/:league/leaders', name: 'leaders', component: { template: '<div/>' } },
      { path: '/:league/team/:id', name: 'team-detail', component: { template: '<div/>' } },
      { path: '/:league/compare', name: 'compare', component: { template: '<div/>' } },
    ],
  })
}

async function setup(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = makeRouter()
  router.push(path)
  await router.isReady()
  const w = mount(Host, { global: { plugins: [router, pinia] } })
  return { w, router, app: useAppStore() }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('useLeagueSwitch', () => {
  it('active：联赛页取路由 league 参数', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.vm.active).toBe('eng.1')
  })

  it('active：首页回落 app.currentLeague', async () => {
    const { w, app } = await setup('/')
    app.setLeague('esp.1')
    await nextTick()
    expect(w.vm.active).toBe('esp.1')
  })

  it('label：加载 leagues 后按中文返回 nameZh', async () => {
    const { w, app } = await setup('/eng.1/standings')
    app.leagues = [
      { slug: 'eng.1', name: 'Premier League', nameZh: '英超', country: 'England', color: '#38003b', understatSlug: 'EPL', season: '2025', teams: 20, players: 500 },
    ]
    expect(w.vm.label('eng.1')).toBe('英超')
  })

  it('label：未加载 leagues 回落 slug', async () => {
    const { w } = await setup('/eng.1/standings')
    expect(w.vm.label('eng.1')).toBe('eng.1')
  })

  it('pick：积分榜页切联赛留在积分榜', async () => {
    const { w, router } = await setup('/eng.1/standings')
    w.vm.pick('esp.1')
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/esp.1/standings')
  })

  it('pick：球员页切联赛留在球员页', async () => {
    const { w, router } = await setup('/eng.1/players')
    w.vm.pick('ita.1')
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/ita.1/players')
  })

  it('pick：球队详情页切联赛回该联赛积分榜', async () => {
    const { w, router } = await setup('/eng.1/team/359')
    w.vm.pick('ger.1')
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/ger.1/standings')
  })
})
