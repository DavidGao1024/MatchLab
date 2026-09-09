// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import TeamSquad from '../../../src/components/teams/TeamSquad.vue'
import type { PlayerSummary } from '../../../src/types/models'

const player = (over: Partial<PlayerSummary> = {}): PlayerSummary => ({
  id: 1, name: 'Test Player', teamId: 1, team: 'T', position: 'M', age: 20,
  goals: 3, assists: 2, citizenship: 'Germany', flag: 'flags/de.png', jersey: 7, ...over,
})

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:league/player/:id', component: { template: '<div/>' } }],
})

const mountSquad = (players: PlayerSummary[]) =>
  mount(TeamSquad, { props: { players, league: 'eng.1' }, global: { plugins: [router] } })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('matchlab:lang', 'zh')
  setActivePinia(createPinia())
})

describe('TeamSquad 进助攻单位文案', () => {
  it('中文：显示为 N球 N助', () => {
    const w = mountSquad([player()])
    expect(w.text()).toContain('3球')
    expect(w.text()).toContain('2助')
  })
  it('英文：保持 N G / N A', () => {
    localStorage.setItem('matchlab:lang', 'en')
    const w = mountSquad([player()])
    expect(w.text()).toContain('3G')
    expect(w.text()).toContain('2A')
  })
  it('无数据显破折号且不带单位', () => {
    const w = mountSquad([player({ goals: null, assists: null })])
    expect(w.text()).toContain('—')
    expect(w.text()).not.toContain('—球')
    expect(w.text()).not.toContain('—助')
  })
  it('球衣号码：显示为 #N', () => {
    const w = mountSquad([player({ jersey: 7 })])
    expect(w.text()).toContain('#7')
  })
  it('球衣号码：无号码显破折号不出井号', () => {
    const w = mountSquad([player({ jersey: null })])
    expect(w.text()).not.toContain('#')
    expect(w.text()).toContain('—')
  })
})
