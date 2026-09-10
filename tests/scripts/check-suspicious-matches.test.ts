// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const { findWinnerConflicts, findPostNotCompleted, isGhostSummary, filterKnownFixes } = req('../../scripts/lib/suspicious-checks.js')

const match = (over: Record<string, unknown> = {}) => ({
  eventId: 'e1',
  date: '2026-05-29T11:35Z',
  completed: true,
  home: { id: 131705, name: 'Liaoning Tieren', score: 3, winner: true },
  away: { id: 15515, name: 'Shanghai Port', score: 2, winner: false },
  ...over,
})
const entry = (m: Record<string, unknown>) => ({ league: 'chn.1', month: '2026-05', match: m })

describe('findWinnerConflicts（平局却标胜者指纹）', () => {
  it('真案回放：0-0 但 home.winner=true → 报可疑', () => {
    const issues = findWinnerConflicts([
      entry(match({ home: { id: 1, name: 'H', score: 0, winner: true }, away: { id: 2, name: 'A', score: 0, winner: null } })),
    ])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ league: 'chn.1', month: '2026-05', reason: 'tied-but-winner' })
    expect(issues[0].eventId).toBe('e1')
  })

  it('正常完赛比分（分胜负）→ 不报', () => {
    expect(findWinnerConflicts([entry(match())])).toEqual([])
  })

  it('真平局（比分同且无胜者）→ 不报', () => {
    const issues = findWinnerConflicts([
      entry(match({ home: { id: 1, name: 'H', score: 1, winner: null }, away: { id: 2, name: 'A', score: 1, winner: null } })),
    ])
    expect(issues).toEqual([])
  })

  it('未完赛（比分同为空/0 且 winner null）→ 不报', () => {
    const issues = findWinnerConflicts([
      entry(match({ completed: false, home: { id: 1, name: 'H', score: null, winner: null }, away: { id: 2, name: 'A', score: null, winner: null } })),
    ])
    expect(issues).toEqual([])
  })

  it('比分平但 away.winner=true → 也报', () => {
    const issues = findWinnerConflicts([
      entry(match({ home: { id: 1, name: 'H', score: 2, winner: null }, away: { id: 2, name: 'A', score: 2, winner: true } })),
    ])
    expect(issues).toHaveLength(1)
  })
})

describe('findPostNotCompleted（post 却未完成指纹）', () => {
  it('真实幽灵案（浙江-三镇静态快照）：status=post 但 completed=false → 报可疑', () => {
    const issues = findPostNotCompleted([
      entry({ eventId: '401861443', date: '2026-08-08T11:35Z', status: 'post', completed: false, home: { id: 1, name: 'Zhe', score: 0 }, away: { id: 2, name: 'Wtt', score: 0 } }),
    ])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ reason: 'post-not-completed', eventId: '401861443' })
  })

  it('正常未完赛（status=pre/in，completed=false）→ 不报', () => {
    const ok = (st: string) => entry({ status: st, completed: false, home: { id: 1, name: 'H', score: null }, away: { id: 2, name: 'A', score: null } })
    expect(findPostNotCompleted([ok('pre'), ok('in')])).toEqual([])
  })

  it('正常完赛（post + completed=true）→ 不报', () => {
    expect(findPostNotCompleted([entry()])).toEqual([])
  })
})

describe('isGhostSummary（0-0 幽灵场指纹：无事件且无球员）', () => {
  it('真实幽灵案（浙江-三镇 summary）：keyEvents 缺失 + roster 数组有条目但球员 0+0 → 幽灵', () => {
    expect(isGhostSummary({ rosters: [{ team: {}, roster: [] }, { team: {}, roster: [] }] })).toBe(true)
  })
  it('rosters 完全缺失/空 → 幽灵', () => {
    expect(isGhostSummary({ keyEvents: [], rosters: [] })).toBe(true)
    expect(isGhostSummary({})).toBe(true)
  })
  it('真实平局案：46 条 keyEvents → 非幽灵', () => {
    expect(isGhostSummary({ keyEvents: [{ id: '1' }], rosters: [{ roster: [] }] })).toBe(false)
  })
  it('无事件但有球员大名单（23+23）→ 非幽灵', () => {
    expect(isGhostSummary({ rosters: [{ roster: [{ id: '1' }], team: {} }, { roster: [{ id: '2' }] }] })).toBe(false)
  })
  it('summary 抓取失败/为 null → 不下幽灵结论（fail-safe）', () => {
    expect(isGhostSummary(null)).toBe(false)
  })
})

describe('filterKnownFixes（勘误在案跳过）', () => {
  const fixes = { '401861543': { score: { home: 3, away: 2 }, note: '辽宁案' } }
  it('在案 eventId 被跳过，其余保留', () => {
    const known = match({ eventId: '401861543', home: { id: 1, name: 'H', score: 0, winner: true }, away: { id: 2, name: 'A', score: 0, winner: null } })
    const fresh = match({ eventId: 'x9', home: { id: 3, name: 'H2', score: 1, winner: true }, away: { id: 4, name: 'A2', score: 1, winner: null } })
    const { kept, skipped } = filterKnownFixes([entry(known), entry(fresh)], fixes)
    expect(skipped).toHaveLength(1)
    expect(skipped[0].match.eventId).toBe('401861543')
    expect(kept).toHaveLength(1)
    expect(kept[0].match.eventId).toBe('x9')
  })
  it('空勘误表全保留', () => {
    const { kept, skipped } = filterKnownFixes([entry(match())], {})
    expect(kept).toHaveLength(1)
    expect(skipped).toEqual([])
  })
  it('串联指纹：在案辽宁 raw 不再报 tied-but-winner', () => {
    const raw = match({ eventId: '401861543', home: { id: 1, name: 'H', score: 0, winner: true }, away: { id: 2, name: 'A', score: 0, winner: null } })
    const { kept } = filterKnownFixes([entry(raw)], fixes)
    expect(findWinnerConflicts(kept)).toEqual([])
  })
})
