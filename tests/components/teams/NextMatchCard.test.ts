// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import NextMatchCard from '../../../src/components/teams/NextMatchCard.vue'

const match = {
  eventId: 'e1', date: '2025-08-16T14:00Z', status: 'pre', completed: false,
  venue: 'Emirates Stadium',
  home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: null, winner: null },
  away: { id: 100, name: 'Everton', abbreviation: 'EVE', logo: '', score: null, winner: null },
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('matchlab:lang', 'zh')
  setActivePinia(createPinia())
})

describe('NextMatchCard', () => {
  it('渲染下一场标签、主客队名与 VS', () => {
    const w = mount(NextMatchCard, { props: { match, league: 'eng.1' } })
    expect(w.text()).toContain('下一场')
    expect(w.text()).toContain('阿森纳')
    expect(w.text()).toContain('埃弗顿')
    expect(w.text()).toContain('VS')
  })

  it('无 venue 时隐藏球场行', () => {
    const w = mount(NextMatchCard, { props: { match: { ...match, venue: '' }, league: 'eng.1' } })
    expect(w.find('.next-foot').exists()).toBe(false)
  })
})