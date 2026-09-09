import { describe, expect, it } from 'vitest'
import { computeForm, formDetails, findStripDay, pickCrossLeagueStrip } from '../../src/utils/matches'
import type { StripEntry } from '../../src/utils/matches'
import type { Match } from '../../src/types/models'

/** 构造一场已完赛比赛：homeId a - b awayId */
const mk = (eventId: string, date: string, homeId: number, hs: number, awayId: number, as: number): Match => ({
  eventId,
  date,
  status: 'post',
  completed: true,
  venue: 'X',
  home: { id: homeId, name: `T${homeId}`, abbreviation: `T${homeId}`, logo: '', score: hs, winner: hs > as ? true : null },
  away: { id: awayId, name: `T${awayId}`, abbreviation: `T${awayId}`, logo: '', score: as, winner: as > hs ? true : null },
})

describe('computeForm', () => {
  const matches = [
    mk('1', '2026-05-01T14:00Z', 10, 2, 11, 0), // T10 胜
    mk('2', '2026-05-08T14:00Z', 12, 1, 10, 1), // T10 平
    mk('3', '2026-05-15T14:00Z', 10, 0, 13, 3), // T10 负
    mk('4', '2026-05-24T14:00Z', 14, 1, 10, 2), // T10 客场胜
  ]
  it('时间序输出，最近一场在最右', () => {
    expect(computeForm(matches, 10)).toEqual(['W', 'D', 'L', 'W'])
  })
  it('最多取 5 场', () => {
    expect(computeForm([...matches, mk('0', '2026-04-20T14:00Z', 10, 5, 15, 0)], 10)).toEqual(['W', 'W', 'D', 'L', 'W'])
  })
  it('无该队比赛 → 空数组（占位短横线由组件画）', () => {
    expect(computeForm(matches, 999)).toEqual([])
  })
  it('未完赛的比赛不计入', () => {
    const pre: Match = { ...mk('9', '2026-06-01T14:00Z', 10, 0, 11, 0), status: 'pre', completed: false }
    expect(computeForm([pre], 10)).toEqual([])
  })
})

/** 造跨联赛战报条目（日期为 UTC ISO，北京日由 beijingDay 换算） */
const entry = (slug: StripEntry['league'], id: string, bjIso: string, homeId: number, awayId: number): StripEntry => ({
  match: mk(id, bjIso, homeId, 1, awayId, 0),
  league: slug,
})

describe('findStripDay（昨日优先，回看 7 天）', () => {
  // 北京日 = UTC+8：07T10:00Z→北京07；08T02:00Z→北京08（今天）；06T10:00Z→北京06
  it('昨日（北京）有完赛 → 只取昨日各场', () => {
    const es = [
      entry('eng.1', 'a', '2026-09-07T10:00:00Z', 1, 2),
      entry('esp.1', 'b', '2026-09-08T02:00:00Z', 3, 4),
      entry('ita.1', 'c', '2026-09-06T10:00:00Z', 5, 6),
    ]
    const day = findStripDay(es, '2026-09-08')
    expect(day?.day).toBe('2026-09-07')
    expect(day?.entries.map((e) => e.match.eventId)).toEqual(['a'])
  })
  it('昨日无完赛 → 回退到最近有完赛的北京日', () => {
    const es = [entry('ger.1', 'x', '2026-09-05T19:00:00Z', 1, 2)] // 北京 09-06 凌晨
    const day = findStripDay(es, '2026-09-08') // 昨日 09-07 空 → 回退 09-06
    expect(day?.day).toBe('2026-09-06')
  })
  it('未完赛不计；回看窗外（>7 天）返回 null', () => {
    const pre = entry('eng.1', 'p', '2026-09-07T19:00:00Z', 1, 2)
    pre.match.completed = false
    expect(findStripDay([pre], '2026-09-08')).toBeNull()
    expect(findStripDay([entry('eng.1', 'o', '2026-08-30T19:00:00Z', 1, 2)], '2026-09-08')).toBeNull()
  })
})

describe('pickCrossLeagueStrip（联赛序轮转，榜首优先，封顶 4）', () => {
  const ranked = {
    'eng.1': [{ rank: 1, teamId: 100 }, { rank: 2, teamId: 200 }],
    'esp.1': [{ rank: 1, teamId: 300 }],
  }
  it('多联赛大赛日：每联赛先取代表场（榜首参与最优先），满 4 截断', () => {
    const es = [
      entry('eng.1', 'e-early', '2026-09-07T11:00:00Z', 700, 800),
      entry('eng.1', 'e-top', '2026-09-07T16:00:00Z', 100, 900),
      entry('esp.1', 's-top', '2026-09-07T17:00:00Z', 300, 910),
      entry('ita.1', 'i-1', '2026-09-07T12:00:00Z', 920, 930),
      entry('ger.1', 'g-1', '2026-09-07T13:00:00Z', 940, 950),
    ]
    const picked = pickCrossLeagueStrip(es, ranked)
    // 联赛序 eng→esp→ita→ger：eng 代表=榜首场 e-top，esp=s-top，ita=i-1，ger=g-1 → 满 4
    expect(picked.map((p) => p.match.eventId)).toEqual(['e-top', 's-top', 'i-1', 'g-1'])
    expect(picked.filter((p) => p.featured).map((p) => p.match.eventId)).toEqual(['e-top', 's-top'])
  })
  it('联赛不足 4 个 → 第二轮同序补该联赛次场（组内按开球时间）', () => {
    const es = [
      entry('eng.1', 'e1', '2026-09-07T16:00:00Z', 100, 900),
      entry('eng.1', 'e2', '2026-09-07T11:00:00Z', 700, 800),
      entry('eng.1', 'e3', '2026-09-07T13:00:00Z', 710, 810),
      entry('esp.1', 's1', '2026-09-07T12:00:00Z', 300, 910),
      entry('esp.1', 's2', '2026-09-07T10:00:00Z', 720, 820),
    ]
    const picked = pickCrossLeagueStrip(es, ranked)
    // 第一轮：e1(榜首)、s1(榜首)；第二轮：e2、s2（时间早者优先）
    expect(picked.map((p) => p.match.eventId)).toEqual(['e1', 's1', 'e2', 's2'])
  })
  it('无 ranked 数据也能出：组内退化为纯开球时间序', () => {
    const es = [
      entry('fra.1', 'f2', '2026-09-07T19:00:00Z', 1, 2),
      entry('fra.1', 'f1', '2026-09-07T11:00:00Z', 3, 4),
    ]
    expect(pickCrossLeagueStrip(es, {}).map((p) => p.match.eventId)).toEqual(['f1', 'f2'])
  })
})

describe('formDetails', () => {
  it('带对手 ID 与比分，时间序输出', () => {
    const ms = [
      mk('1', '2026-05-01T14:00Z', 10, 2, 11, 0),
      mk('2', '2026-05-08T14:00Z', 12, 1, 10, 1),
    ]
    expect(formDetails(ms, 10)).toEqual([
      { result: 'W', opponentId: 11, gf: 2, ga: 0 },
      { result: 'D', opponentId: 12, gf: 1, ga: 1 },
    ])
  })
  it('客场视角：gf/ga 翻转', () => {
    const ms = [mk('1', '2026-05-01T14:00Z', 11, 0, 10, 2)] // T10 客场 2-0 胜
    expect(formDetails(ms, 10)).toEqual([{ result: 'W', opponentId: 11, gf: 2, ga: 0 }])
  })
  it('比分为 null（脏数据）按 0 处理', () => {
    const ms = [{ ...mk('1', '2026-05-01T14:00Z', 10, 0, 11, 0), home: { ...mk('1', '2026-05-01T14:00Z', 10, 0, 11, 0).home, score: null } }]
    expect(formDetails(ms, 10)).toEqual([{ result: 'D', opponentId: 11, gf: 0, ga: 0 }])
  })
  it('limit 截断只取最近 N 场', () => {
    const ms = [
      mk('1', '2026-05-01T14:00Z', 10, 1, 11, 0),
      mk('2', '2026-05-02T14:00Z', 10, 1, 12, 0),
      mk('3', '2026-05-03T14:00Z', 10, 1, 13, 0),
    ]
    expect(formDetails(ms, 10, 2)).toHaveLength(2)
    // 最近两场是 5-03 与 5-02，对手 13/12
    expect(formDetails(ms, 10, 2).map((d) => d.opponentId)).toEqual([12, 13])
  })
})
