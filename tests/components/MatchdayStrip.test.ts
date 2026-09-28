// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MatchdayStrip from '../../src/components/home/MatchdayStrip.vue'
import type { StripPick } from '../../src/utils/matches'
import type { Match } from '../../src/types/models'

const match = (id: string): Match => ({
  eventId: id, date: '2026-09-07T16:00:00Z', status: 'post', completed: true, venue: 'X',
  home: { id: 1, name: 'A', abbreviation: 'A', logo: '', score: 2, winner: true },
  away: { id: 2, name: 'B', abbreviation: 'B', logo: '', score: 1, winner: null },
})
const pick = (id: string, league: StripPick['league'], featured = false): StripPick => ({
  match: match(id), league, featured,
})

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('matchlab:lang', 'zh')
  setActivePinia(createPinia())
})

describe('MatchdayStrip v2（跨联赛）', () => {
  it('渲染日期标题 + 每卡联赛标识 + 比分', () => {
    const w = mount(MatchdayStrip, {
      props: { day: '2026-09-07', picks: [pick('a', 'eng.1', true), pick('b', 'chn.1')] },
    })
    expect(w.text()).toContain('9月7日')
    expect(w.text()).toContain('昨日战报')
    // 2026-09-28 起联赛标识一律出徽标（六大联赛齐全），不再用文字角标
    const logos = w.findAll('img[src*="/leagues/"]')
    expect(logos).toHaveLength(2)
    expect(logos[0].attributes('src')).toContain('leagues/eng.1.png')
    expect(logos[1].attributes('src')).toContain('leagues/chn.1.png')
    expect(w.text()).toContain('2')
  })
})
