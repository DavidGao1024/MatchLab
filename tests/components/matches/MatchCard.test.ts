// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MatchCard from '../../../src/components/matches/MatchCard.vue'
import MatchList from '../../../src/components/matches/MatchList.vue'

const match = {
  eventId: 'e1', date: '2025-08-16T14:00Z', status: 'post', completed: true,
  venue: 'Emirates Stadium',
  home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: 2, winner: true },
  away: { id: 100, name: 'Everton', abbreviation: 'EVE', logo: '', score: 0, winner: false },
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('matchlab:lang', 'zh')
  setActivePinia(createPinia())
})

describe('MatchCard selfTeamId', () => {
  it('不传 selfTeamId：本队名不高亮', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1' } })
    expect(w.findAll('span.font-bold').length).toBe(0)
  })

  it('selfTeamId=主队：主队名加粗 + accent 高亮', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1', selfTeamId: 359 } })
    const bold = w.findAll('span.font-bold')
    expect(bold.length).toBe(1)
    expect(bold[0].attributes('style')).toBeUndefined()
  })

  it('selfTeamId=客队：客队名加粗 + accent 高亮', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1', selfTeamId: 100 } })
    const bold = w.findAll('span.font-bold')
    expect(bold.length).toBe(1)
    expect(bold[0].attributes('style')).toBeUndefined()
  })
})

describe('MatchList 透传 selfTeamId', () => {
  it('列表内本队名加粗高亮', () => {
    const w = mount(MatchList, { props: { matches: [match], league: 'eng.1', selfTeamId: 359 } })
    expect(w.findAll('span.font-bold').length).toBe(1)
  })
})