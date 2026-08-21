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

describe('MatchCard plain 模式', () => {
  it('默认（非 plain）：队名按胜平负分色，负方用灰', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1' } })
    const names = w.findAll('span.truncate.font-cond')
    expect(names[0].classes()).toContain('text-white')
    expect(names[1].classes()).toContain('text-slate-500')
  })

  it('plain=true：两队名全白，不区分胜平负', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1', plain: true } })
    const names = w.findAll('span.truncate.font-cond')
    expect(names[0].classes()).toContain('text-white')
    expect(names[1].classes()).toContain('text-white')
    expect(names[1].classes()).not.toContain('text-slate-500')
  })
})

describe('MatchList 透传 plain', () => {
  it('列表内 plain=true 队名全白', () => {
    const w = mount(MatchList, { props: { matches: [match], league: 'eng.1', plain: true } })
    const names = w.findAll('span.truncate.font-cond')
    expect(names[0].classes()).toContain('text-white')
    expect(names[1].classes()).toContain('text-white')
  })
})