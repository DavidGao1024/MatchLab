import { describe, expect, it } from 'vitest'
import { computeForm, lastCompletedMatchday, selectStripMatches } from '../../src/utils/matches'
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

describe('lastCompletedMatchday', () => {
  it('取完赛比赛里最晚的 UTC 日期', () => {
    const ms = [
      mk('1', '2026-05-24T15:00Z', 1, 1, 2, 0),
      mk('2', '2026-05-23T15:00Z', 3, 1, 4, 0),
    ]
    expect(lastCompletedMatchday(ms)).toBe('2026-05-24')
  })
  it('没有完赛比赛 → null', () => {
    expect(lastCompletedMatchday([])).toBeNull()
  })
})

describe('selectStripMatches（战报带选场，规格 v1.4 确定性规则）', () => {
  const standings = [
    { rank: 1, teamId: 100 },
    { rank: 2, teamId: 200 },
    { rank: 3, teamId: 300 },
  ]
  const day = [
    mk('a', '2026-05-24T15:00Z', 300, 1, 400, 0), // 无关前二，早场
    mk('b', '2026-05-24T15:00Z', 100, 2, 500, 1), // 榜首参与
    mk('c', '2026-05-24T15:00Z', 600, 0, 200, 0), // 榜二参与
    mk('d', '2026-05-24T15:00Z', 700, 1, 800, 1), // 无关，晚场
    mk('e', '2026-05-24T15:00Z', 900, 3, 901, 2), // 无关
  ]
  it('榜首榜二优先，其余按开球时间补满 4 场且去重', () => {
    const picked = selectStripMatches(day, standings)
    expect(picked.map((m) => m.eventId)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('不足 4 场全取', () => {
    expect(selectStripMatches(day.slice(0, 2), standings)).toHaveLength(2)
  })
  it('榜首榜二直接对话只占一个名额', () => {
    const day2 = [
      mk('x', '2026-05-24T15:00Z', 100, 1, 200, 0), // 榜首 vs 榜二
      mk('y', '2026-05-24T15:00Z', 300, 2, 400, 2),
    ]
    const picked = selectStripMatches(day2, standings)
    expect(picked.map((m) => m.eventId)).toEqual(['x', 'y'])
  })
  it('ranked 缺榜首时优雅跳过', () => {
    const picked = selectStripMatches(day, [{ rank: 2, teamId: 200 }, { rank: 3, teamId: 300 }])
    expect(picked.map((m) => m.eventId)).toEqual(['c', 'a', 'b', 'd'])
  })
})
