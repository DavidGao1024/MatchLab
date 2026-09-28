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

  it('leagueTag 联赛标识：不传则底栏无标识（默认零影响）', () => {
    const withoutTag = mount(MatchCard, { props: { match, league: 'eng.1' } })
    expect(withoutTag.find('img[src*="/leagues/"]').exists()).toBe(false)
  })

  it('leagueTag 传入 → 出对应联赛徽标，文字仅作 alt', () => {
    const w = mount(MatchCard, { props: { match, league: 'eng.1', leagueTag: '英超' } })
    const img = w.find('img[src*="/leagues/"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('leagues/eng.1.png')
    expect(img.attributes('alt')).toBe('英超')
  })

  it('leagueTag 传入 + 中超 → 同样出中超徽标', () => {
    const w = mount(MatchCard, { props: { match, league: 'chn.1', leagueTag: '中超' } })
    expect(w.find('img[src*="/leagues/chn.1.png"]').exists()).toBe(true)
  })
})

describe('MatchList 透传 plain', () => {
  it('列表内 plain=true 队名全白', () => {
    const w = mount(MatchList, { props: { matches: [match], league: 'eng.1', plain: true } })
    const names = w.findAll('span.truncate.font-cond')
    expect(names[0].classes()).toContain('text-white')
    expect(names[1].classes()).toContain('text-white')
  })

  it('plain=true 隐藏场次计数', () => {
    const w = mount(MatchList, { props: { matches: [match], league: 'eng.1', plain: true } })
    expect(w.text()).not.toContain('1 场')
  })
})