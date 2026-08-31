import { describe, expect, it } from 'vitest'
import { applyForm, applyMatchFixes, computeStandings, ESPN_MATCH_FIXES, HEAD_TO_HEAD_TIEBREAK, mergeStandings } from '../../src/utils/standings'
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
      makeMatch({ status: 'pre', completed: false, home: { id: 5, name: 'C', abbreviation: 'C', logo: '', score: null, winner: null }, away: { id: 6, name: 'D', abbreviation: 'D', logo: '', score: null, winner: null }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.teamId === 5)).toMatchObject({ played: 0, points: 0 })
    expect(rows.find((r) => r.teamId === 6)).toMatchObject({ played: 0, points: 0 })
  })
})

describe('applyMatchFixes（ESPN 源数据勘误表）', () => {
  const fix = makeMatch // 复用工厂

  it('score 勘误：按 eventId 改写比分并重算 winner/completed', () => {
    const bad = fix({
      eventId: '401861543',
      home: { id: 131705, name: 'Liaoning Tieren', abbreviation: 'LIA', logo: '', score: 0, winner: null },
      away: { id: 15515, name: 'Shanghai Port', abbreviation: 'SIPG', logo: '', score: 0, winner: null },
      completed: true,
    })
    const [m] = applyMatchFixes([bad])
    expect(m.home.score).toBe(3)
    expect(m.away.score).toBe(2)
    expect(m.home.winner).toBe(true)
    expect(m.away.winner).toBe(false)
    expect(m.completed).toBe(true)
  })

  it('void 勘误：整场剔除（通用逃生舱，合成条目验证）', () => {
    ;(ESPN_MATCH_FIXES as Record<string, unknown>)['test-void'] = { void: true }
    try {
      const bad = fix({ eventId: 'test-void' })
      expect(applyMatchFixes([bad])).toEqual([])
      // 两队另有未完赛场次时仍收录榜单（played=0）
      const pre = fix({ eventId: 'future-x', status: 'pre', completed: false, home: { id: 18203, name: 'Zhejiang Professional FC', abbreviation: 'ZHE', logo: '', score: null, winner: null }, away: { id: 21506, name: 'Wuhan Three Towns', abbreviation: 'WTT', logo: '', score: null, winner: null } })
      const rows = computeStandings(applyMatchFixes([bad, pre]))
      expect(rows).toHaveLength(2)
      expect(rows.every((r) => r.played === 0)).toBe(true)
    } finally {
      delete (ESPN_MATCH_FIXES as Record<string, unknown>)['test-void']
    }
  })

  it('score 勘误：平局比分 winner 双方置 null', () => {
    ;(ESPN_MATCH_FIXES as Record<string, unknown>)['test-draw'] = { score: { home: 1, away: 1 } }
    try {
      const m = applyMatchFixes([fix({ eventId: 'test-draw' })])[0]
      expect(m.home.winner).toBe(null)
      expect(m.away.winner).toBe(null)
    } finally {
      delete (ESPN_MATCH_FIXES as Record<string, unknown>)['test-draw']
    }
  })

  it('未命中勘误的场次原样透传（同一引用）', () => {
    const m = fix({ eventId: 'normal-1', home: { id: 1, name: 'A', abbreviation: 'A', logo: '', score: 2, winner: true }, away: { id: 2, name: 'B', abbreviation: 'B', logo: '', score: 0, winner: null } })
    expect(applyMatchFixes([m])[0]).toBe(m)
  })

  it('中超实锤案：勘误后辽宁/海港积分与官方一致', () => {
    // ESPN 误记：401861543 辽宁 0-0 海港（实际 3-2 辽宁胜）。浙江-三镇延期场已由 completed 判据根治，不在此列
    const lia = fix({ eventId: '401861543', home: { id: 131705, name: 'Liaoning Tieren', abbreviation: 'LIA', logo: '', score: 0, winner: true }, away: { id: 15515, name: 'Shanghai Port', abbreviation: 'SIPG', logo: '', score: 0, winner: null } })
    const rowsBefore = computeStandings([lia])
    expect(rowsBefore.find((r) => r.teamId === 131705)!.points).toBe(1) // 错账：各 1 分
    const rows = computeStandings(applyMatchFixes([lia]))
    expect(rows.find((r) => r.teamId === 131705)!.points).toBe(3) // 勘误后：辽宁 3 分、海港 0 分
    expect(rows.find((r) => r.teamId === 15515)!.points).toBe(0)
    expect(rows.find((r) => r.teamId === 131705)!.goalsFor).toBe(3)
  })
})

describe('中超同分排序（官方规则：积分→相互积分→相互净胜球→相互进球→总净胜球→总进球）', () => {
  const t = (id: number, name: string, score: number, win: boolean | null) =>
    ({ id, name, abbreviation: name[0], logo: '', score, winner: win })
  const m = (eid: string, hid: number, hn: string, hs: number, aid: number, an: string, as: number) =>
    makeMatch({
      eventId: eid,
      home: t(hid, hn, hs, hs > as ? true : hs < as ? false : null),
      away: t(aid, an, as, as > hs ? true : as < hs ? false : null),
    })

  // A、B 同 6 分：总净胜球 A(+7) > B(+4)；相互净胜球 B(+2) > A(-2)
  const fixture = [
    m('h1', 2, 'B', 3, 1, 'A', 0),
    m('h2', 1, 'A', 1, 2, 'B', 0),
    m('h3', 1, 'A', 9, 3, 'Y', 0),
    m('h4', 2, 'B', 2, 3, 'Y', 0),
  ]

  it('相互比赛全部结束 → 按相互战绩压过总净胜球', () => {
    const ids = computeStandings(fixture, {}, { headToHead: true }).map((r) => r.teamId)
    expect(ids).toEqual([2, 1, 3]) // B 靠相互净胜球上位，Y 0 分垫底
  })

  it('开关关闭（五大联赛默认）→ 仍按总净胜球', () => {
    const ids = computeStandings(fixture).map((r) => r.teamId)
    expect(ids).toEqual([1, 2, 3])
  })

  it('相互对战未全部踢完（缺回合一）→ 回落总净胜球，不误用残缺相互战绩', () => {
    const partial = [m('h1', 2, 'B', 3, 1, 'A', 0), m('h3', 1, 'A', 9, 3, 'Y', 0)]
    // A、B 各 3 分；A 总净胜球 +6 > B +3；若残缺相互战绩被误用则 B 会压 A
    const ids = computeStandings(partial, {}, { headToHead: true }).map((r) => r.teamId)
    expect(ids).toEqual([1, 2, 3])
  })

  it('相互积分打平 → 比相互净胜球（本例 B 总净胜球高但相互吃亏）', () => {
    // 一胜一负相互积分 3-3；相互净胜球 A +1 > B -1；总净胜球 B(+8) > A(+2)
    const split = [
      m('h1', 2, 'B', 2, 1, 'A', 0),
      m('h2', 1, 'A', 3, 2, 'B', 0),
      m('h3', 1, 'A', 1, 3, 'Y', 0),
      m('h4', 2, 'B', 9, 3, 'Y', 0),
    ]
    const ids = computeStandings(split, {}, { headToHead: true }).map((r) => r.teamId)
    expect(ids).toEqual([1, 2, 3])
  })

  it('相互积分/净胜球/进球全同（两回合同分）→ 逐级回落到总净胜球', () => {
    const twin = [
      m('h1', 2, 'B', 2, 1, 'A', 0),
      m('h2', 1, 'A', 2, 2, 'B', 0),
      m('h3', 1, 'A', 3, 3, 'Y', 0),
      m('h4', 2, 'B', 1, 3, 'Y', 0),
    ]
    const ids = computeStandings(twin, {}, { headToHead: true }).map((r) => r.teamId)
    expect(ids).toEqual([1, 2, 3]) // A 总净胜球 +3 > B +1
  })

  it('配置开关：仅中超启用相互战绩', () => {
    expect(HEAD_TO_HEAD_TIEBREAK['chn.1']).toBe(true)
    expect(HEAD_TO_HEAD_TIEBREAK['eng.1']).toBeFalsy()
    expect(HEAD_TO_HEAD_TIEBREAK['esp.1']).toBeFalsy()
    expect(HEAD_TO_HEAD_TIEBREAK['ita.1']).toBeFalsy()
    expect(HEAD_TO_HEAD_TIEBREAK['ger.1']).toBeFalsy()
    expect(HEAD_TO_HEAD_TIEBREAK['fra.1']).toBeFalsy()
  })
})
