import { describe, expect, it } from 'vitest'
import { applyForm, mergeStandings } from '../../src/utils/standings'
import type { RawStanding, RawXgStanding } from '../../src/types/static'

const raw: RawStanding[] = [
  { rank: 1, teamId: 359, team: 'Arsenal', played: 38, won: 26, drawn: 7, lost: 5, goalsFor: 71, goalsAgainst: 27, goalDiff: 44, points: 85 },
  { rank: 2, teamId: 367, team: 'Tottenham Hotspur', played: 38, won: 10, drawn: 11, lost: 17, goalsFor: 48, goalsAgainst: 57, goalDiff: -9, points: 41 },
]

const xg: RawXgStanding[] = [
  { rank: 1, teamId: '83', team: 'Arsenal', xG: 77.49, xGA: 33.13, xpts: 79.87, history: [] },
  // Understat 叫 Tottenham，映射表转成热刺的 ESPN 名
  { rank: 17, teamId: '89', team: 'Tottenham', xG: 45.1, xGA: 55.2, xpts: 38.0, history: [] },
  // 映射表里没有的队 → 对应行 xG 留空
  { rank: 99, teamId: 'x', team: 'Ghost FC', xG: 1, xGA: 1, xpts: 1 },
]

const map = { Tottenham: 'Tottenham Hotspur' }

describe('mergeStandings', () => {
  it('rank/zone/xG 三合一，映射不上的 xG 留空', () => {
    const rows = mergeStandings(raw, 'eng.1', xg, map)
    expect(rows[0].zone).toBe('ucl')
    expect(rows[0].xG).toBeCloseTo(77.49)
    expect(rows[0].xPts).toBeCloseTo(79.87)
    expect(rows[1].xG).toBeCloseTo(45.1) // 经 Tottenham → Tottenham Hotspur 对上
    expect(rows[0].form).toEqual([])     // form 由 applyForm 填
  })
  it('xG 文件缺失（null）→ 全部留空不报错', () => {
    const rows = mergeStandings(raw, 'eng.1', null, map)
    expect(rows[0].xG).toBeUndefined()
  })
  it('18 队联赛降级区按联赛配置走', () => {
    const two: RawStanding[] = Array.from({ length: 18 }, (_, i) => ({ ...raw[0], rank: i + 1, teamId: i }))
    const rows = mergeStandings(two, 'ger.1', null, {})
    expect(rows[15].zone).toBe('playoff') // 第 16
    expect(rows[16].zone).toBe('rel')
    expect(rows[17].zone).toBe('rel')
  })
})

describe('applyForm', () => {
  it('把 computeForm 结果填进每一行', () => {
    const rows = mergeStandings(raw, 'eng.1', null, {})
    const matches = [{
      eventId: '1', date: '2026-05-24T15:00Z', status: 'post' as const, completed: true, venue: 'X',
      home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: 2, winner: true },
      away: { id: 367, name: 'Tottenham Hotspur', abbreviation: 'TOT', logo: '', score: 1, winner: null },
    }]
    const out = applyForm(rows, matches)
    expect(out[0].form).toEqual(['W'])
    expect(out[1].form).toEqual(['L'])
  })
})
