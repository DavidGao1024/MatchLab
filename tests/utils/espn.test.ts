import { describe, expect, it } from 'vitest'
import { monthToken, normalizeEvent } from '../../src/composables/useEspanFetch'
import type { EspnEvent } from '../../src/types/espn-site'

describe('monthToken', () => {
  // ESPN 已废弃日期区间语法（2026-09 起一律 400），整月令牌仍返回该月全部赛事
  it('YYYY-MM → YYYYMM（个位月补零）', () => {
    expect(monthToken('2026-01')).toBe('202601')
  })
  it('12 月', () => {
    expect(monthToken('2026-12')).toBe('202612')
  })
})

const rawEvent: EspnEvent = {
  id: '740596',
  date: '2025-08-15T19:00Z',
  status: { displayClock: "90'+7'", type: { id: '28', state: 'post', completed: true } },
  competitions: [{
    venue: { fullName: 'Anfield' },
    competitors: [
      { homeAway: 'home', id: '364', score: '4', winner: true, team: { id: '364', displayName: 'Liverpool', abbreviation: 'LIV', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png' } },
      { homeAway: 'away', id: '349', score: '2', winner: false, team: { id: '349', displayName: 'AFC Bournemouth', abbreviation: 'BOU', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/349.png' } },
    ],
  }],
}

describe('normalizeEvent', () => {
  it('主客/比分/状态收敛为 Match 模型，与静态文件口径一致', () => {
    const m = normalizeEvent(rawEvent)
    expect(m).not.toBeNull()
    expect(m!.home.name).toBe('Liverpool')
    expect(m!.home.score).toBe(4)
    expect(m!.away.score).toBe(2)
    expect(m!.status).toBe('post')
    expect(m!.completed).toBe(true)
    expect(m!.venue).toBe('Anfield')
  })
  it('未开赛：score 为 null，状态 pre', () => {
    const pre = JSON.parse(JSON.stringify(rawEvent)) as EspnEvent
    pre.status = { type: { id: '1', state: 'pre' } }
    delete pre.competitions[0].competitors[0].score
    const m = normalizeEvent(pre)
    expect(m!.status).toBe('pre')
    expect(m!.home.score).toBeNull()
  })
  it('延期幽灵场（浙江-三镇 8-8 直播案）：state=post 但 completed=false → 不算完赛', () => {
    const postponed = JSON.parse(JSON.stringify(rawEvent)) as EspnEvent
    postponed.status = { type: { id: '6', state: 'post', completed: false } }
    const m = normalizeEvent(postponed)!
    expect(m.status).toBe('post')
    expect(m.completed).toBe(false) // 判据对齐抓取脚本的 type.completed，根治延期场以 0-0 污染榜单
  })
  it('残缺事件（无 competitors）→ null，不炸', () => {
    expect(normalizeEvent({ ...rawEvent, competitions: [] })).toBeNull()
  })
})
