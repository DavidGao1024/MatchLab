// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MatchCard from '../../../src/components/matches/MatchCard.vue'

const match = {
  eventId: 'e1', date: '2025-08-16T14:00Z', status: 'post', completed: true,
  venue: 'Emirates Stadium',
  home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: 2, winner: true },
  away: { id: 100, name: 'Everton', abbreviation: 'EVE', logo: '', score: 0, winner: false },
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('matchlab:lang', 'zh') // 中文角标"主/客"
  setActivePinia(createPinia())
})

describe('MatchCard selfTeamId', () => {
  it('不传 selfTeamId：无主客角标', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1' } })
    expect(w.text()).not.toContain('主')
    expect(w.text()).not.toContain('客')
  })

  it('selfTeamId=主队：本队名旁有"主"角标，无"客"', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1', selfTeamId: 359 } })
    expect(w.text()).toContain('主')
    expect(w.text()).not.toContain('客')
  })

  it('selfTeamId=客队：本队名旁有"客"角标，无"主"', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1', selfTeamId: 100 } })
    expect(w.text()).toContain('客')
    expect(w.text()).not.toContain('主')
  })
})