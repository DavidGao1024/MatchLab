// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createRouter } from 'vue-router'
import StandingRow from '../../src/components/standings/StandingRow.vue'
import { useStandingsStore } from '../../src/stores/standings'
import { useTeamsStore } from '../../src/stores/teams'
import type { StandingRow as StandingRowData, Team } from '../../src/types/models'

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
    color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
    ...over,
  }
}

function makeRow(over: Partial<StandingRowData> = {}): StandingRowData {
  return {
    rank: 1, teamId: 359, team: 'Arsenal', played: 38,
    won: 26, drawn: 7, lost: 5, goalsFor: 71, goalsAgainst: 27, goalDiff: 44,
    points: 85, zone: 'ucl', form: ['W', 'W', 'D', 'W', 'L'],
    ...over,
  }
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:league/team/:id', name: 'team-detail', component: { template: '<div/>' } }],
  })
}

function setup() {
  setActivePinia(createPinia())
  const teams = useTeamsStore()
  const standings = useStandingsStore()
  const team = makeTeam()
  teams.bundles['eng.1'] = {
    meta: { season: '2025', seasonType: 'european' } as any,
    teams: [team],
    byId: new Map([[team.id, team]]),
  }
  return { team, standings }
}

describe('StandingRow 移动端展开行为', () => {
  it('初始未展开，不渲染次要数据展开行', () => {
    const { standings } = setup()
    const row = makeRow()
    const wrapper = mount(StandingRow, {
      props: { row, league: 'eng.1', showXg: false },
      global: { plugins: [makeRouter()] },
    })
    // 展开行存在但 v-if=false 不渲染（注意：Vue3 多根节点，根级可能是注释节点）
    expect(wrapper.text()).not.toContain('赛')
    expect(wrapper.text()).not.toContain('净')
  })

  it('点击行后展开，渲染次要数据 grid', async () => {
    const { standings } = setup()
    const row = makeRow()
    const wrapper = mount(StandingRow, {
      props: { row, league: 'eng.1', showXg: false },
      global: { plugins: [makeRouter()] },
    })
    // 点击 tr（不点 router-link，避免路由跳转）
    const trs = wrapper.findAll('tr')
    await trs[0].trigger('click')
    // 展开行渲染了次要数据
    const text = wrapper.text()
    expect(text).toContain('赛')
    expect(text).toContain('26') // won
    expect(text).toContain('71') // goalsFor
    expect(text).toContain('44') // goalDiff
  })

  it('再次点击行收起，次要数据消失', async () => {
    const { standings } = setup()
    const row = makeRow()
    const wrapper = mount(StandingRow, {
      props: { row, league: 'eng.1', showXg: false },
      global: { plugins: [makeRouter()] },
    })
    const trs = wrapper.findAll('tr')
    await trs[0].trigger('click') // 展开
    await trs[0].trigger('click') // 收起
    expect(wrapper.text()).not.toContain('净')
  })

  it('点击 router-link 不触发展开（@click.stop 阻断）', async () => {
    const { standings } = setup()
    const row = makeRow()
    const wrapper = mount(StandingRow, {
      props: { row, league: 'eng.1', showXg: false },
      global: { plugins: [makeRouter()] },
    })
    const link = wrapper.find('a')
    await link.trigger('click')
    // 未展开
    expect(wrapper.text()).not.toContain('净')
  })

  it('showXg=true 时展开行含 xG/xGA', async () => {
    const { standings } = setup()
    const row = makeRow({ xG: 28.8, xGA: 5.51, xPts: 30.2 })
    const wrapper = mount(StandingRow, {
      props: { row, league: 'eng.1', showXg: true },
      global: { plugins: [makeRouter()] },
    })
    const trs = wrapper.findAll('tr')
    await trs[0].trigger('click')
    const text = wrapper.text()
    expect(text).toContain('xG')
    expect(text).toContain('xGA')
    expect(text).toContain('28.8')
    expect(text).toContain('5.5')
  })
})
