import { describe, expect, it } from 'vitest'
import { applyForm, computeStandings, mergeStandings } from '../../src/utils/standings'
import type { RawStanding, RawXgStanding } from '../../src/types/static'
import type { Match } from '../../src/types/models'

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
  it('xG 重复映射同一队名时保留先出现的行', () => {
    const dup: RawXgStanding[] = [
      { rank: 1, teamId: '83', team: 'Arsenal', xG: 11.1, xGA: 1.1, xpts: 10.0, history: [] },
      { rank: 1, teamId: '83b', team: 'Arsenal', xG: 99.9, xGA: 9.9, xpts: 90.0, history: [] },
    ]
    const rows = mergeStandings(raw, 'eng.1', dup, map)
    expect(rows[0].xG).toBeCloseTo(11.1)
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

describe('computeStandings', () => {
  function makeMatch(over: Partial<Match> = {}): Match {
    return {
      eventId: 'e1',
      date: '2026-08-15T14:00Z',
      status: 'post',
      completed: true,
      venue: 'Stadium',
      home: { id: 1, name: 'Team A', abbreviation: 'A', logo: '', score: 0, winner: null },
      away: { id: 2, name: 'Team B', abbreviation: 'B', logo: '', score: 0, winner: null },
      ...over,
    }
  }

  it('空输入返回空数组', () => {
    expect(computeStandings([])).toEqual([])
  })

  it('胜平负/进失球/积分累积正确', () => {
    const matches = [
      makeMatch({ eventId: '1', home: { id: 1, name: 'A', abbreviation: 'A', logo: '', score: 3, winner: true }, away: { id: 2, name: 'B', abbreviation: 'B', logo: '', score: 0, winner: null } }),
    ]
    const rows = computeStandings(matches)
    const a = rows.find((r) => r.teamId === 1)!
    const b = rows.find((r) => r.teamId === 2)!
    expect(a).toMatchObject({ played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 3, goalsAgainst: 0, goalDiff: 3, points: 3 })
    expect(b).toMatchObject({ played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 3, goalDiff: -3, points: 0 })
  })

  it('平局各 1 分', () => {
    const matches = [
      makeMatch({ home: { id: 1, name: 'A', abbreviation: 'A', logo: '', score: 1, winner: null }, away: { id: 2, name: 'B', abbreviation: 'B', logo: '', score: 1, winner: null } }),
    ]
    const rows = computeStandings(matches)
    expect(rows.find((r) => r.teamId === 1)!.points).toBe(1)
    expect(rows.find((r) => r.teamId === 2)!.points).toBe(1)
  })

  it('扣分从积分中减去', () => {
    const matches = [
      makeMatch({ home: { id: 1, name: 'A', abbreviation: 'A', logo: '', score: 2, winner: true }, away: { id: 2, name: 'B', abbreviation: 'B', logo: '', score: 0, winner: null } }),
    ]
    const rows = computeStandings(matches, { 1: 3 })
    expect(rows.find((r) => r.teamId === 1)!.points).toBe(0) // 3 - 3
    expect(rows.find((r) => r.teamId === 1)!.deduction).toBe(3)
  })

  it('同一对手两回合累积后按积分排', () => {
    const rows = computeStandings([
      // A 2-0 X、A 3-1 X → A 6 分 gd+4；X 0 分
      makeMatch({ eventId: '1', home: { id: 11, name: 'A', abbreviation: 'A', logo: '', score: 2, winner: true }, away: { id: 22, name: 'X', abbreviation: 'X', logo: '', score: 0, winner: null } }),
      makeMatch({ eventId: '2', home: { id: 22, name: 'X', abbreviation: 'X', logo: '', score: 1, winner: null }, away: { id: 11, name: 'A', abbreviation: 'A', logo: '', score: 3, winner: true } }),
    ])
    const ids = rows.map((r) => r.teamId)
    expect(ids).toEqual([11, 22])
    expect(rows[0].points).toBe(6)
    expect(rows[0].goalDiff).toBe(4)
  })

  it('积分相同按净胜球，再按进球，再按队名字母', () => {
    const mk2 = (id: number, name: string) => (score: number) =>
      makeMatch({ home: { id, name, abbreviation: name, logo: '', score, winner: score > 0 ? true : null }, away: { id: 999, name: 'Fodder', abbreviation: 'F', logo: '', score: 0, winner: null } })
    // 三队各胜 Fodder 一场：积分都 3，靠净胜球（=进球）区分
    const rows = computeStandings([
      mk2(3, 'Beta')(1),   // gd +1
      mk2(1, 'Alpha')(3),  // gd +3
      mk2(2, 'Alpha2')(2), // gd +2
    ])
    const ids = rows.map((r) => r.teamId)
    expect(ids.slice(0, 3)).toEqual([1, 2, 3]) // Alpha(+3) > Alpha2(+2) > Beta(+1)；Fodder 0 分垫底
  })

  it('未完赛比赛也收录球队（played=0 保留完整榜单）', () => {
    const rows = computeStandings([
      makeMatch({ status: 'pre', completed: false, home: { id: 5, name: 'C', abbreviation: 'C', logo: '', score: null, winner: null }, away: { id: 6, name: 'D', abbreviation: 'D', logo: '', score: null, winner: null } }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.teamId === 5)).toMatchObject({ played: 0, points: 0 })
    expect(rows.find((r) => r.teamId === 6)).toMatchObject({ played: 0, points: 0 })
  })
})
