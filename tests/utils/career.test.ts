// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildCareer } from '../../src/utils/career'
import type { TransferEntry } from '../../src/types/static'

const tr = (o: Partial<TransferEntry>): TransferEntry => ({
  playerId: 1,
  playerName: 'X',
  date: null,
  fromTeamId: null,
  fromTeam: null,
  toTeamId: null,
  toTeam: null,
  type: null,
  amount: null,
  displayAmount: null,
  ...o,
})

describe('buildCareer', () => {
  it('空转会 → 空履历', () => {
    expect(buildCareer([])).toEqual([])
  })

  it('单笔转会：from/to 两队，转入队 to=null（至今）', () => {
    const career = buildCareer([
      tr({ date: '2020-07-01', fromTeamId: 1, fromTeam: 'A 队', toTeamId: 2, toTeam: 'B 队' }),
    ])
    expect(career).toEqual([
      { teamId: 1, team: 'A 队', from: 2020, to: 2020 },
      { teamId: 2, team: 'B 队', from: 2020, to: null },
    ])
  })

  it('同队多次租借合并为一个区间', () => {
    const career = buildCareer([
      tr({ date: '2012-11-06', fromTeamId: 10, fromTeam: '母队', toTeamId: 20, toTeam: '租借队 A' }),
      tr({ date: '2013-11-28', fromTeamId: 10, fromTeam: '母队', toTeamId: 30, toTeam: '租借队 B' }),
      tr({ date: '2017-07-03', fromTeamId: 40, fromTeam: '中游队', toTeamId: 50, toTeam: '现役队' }),
    ])
    // 母队(10) 出现 2012/2013 → 合并 2012–2013；现役队(50) to=null 至今
    expect(career.map((c) => c.team)).toEqual(['母队', '租借队 A', '租借队 B', '中游队', '现役队'])
    const mother = career.find((c) => c.team === '母队')!
    expect([mother.from, mother.to]).toEqual([2012, 2013])
    const current = career.find((c) => c.team === '现役队')!
    expect(current.to).toBeNull()
  })

  it('按年份升序排列', () => {
    const career = buildCareer([
      tr({ date: '2022-01-01', fromTeamId: 3, fromTeam: 'C', toTeamId: 4, toTeam: 'D' }),
      tr({ date: '2018-01-01', fromTeamId: 1, fromTeam: 'A', toTeamId: 2, toTeam: 'B' }),
    ])
    const froms = career.map((c) => c.from)
    expect(froms).toEqual([...froms].sort((a, b) => a - b))
  })
})

describe('buildCareer 当前队兜底（ESPN transactions 滞后）', () => {
  afterEach(() => { vi.useRealTimers() })

  it('当前队 ≠ 最后转入队 → 追加当前队至今，原队收尾当前年', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T00:00:00Z'))
    const career = buildCareer(
      [tr({ date: '2023-07-08', fromTeamId: 84, fromTeam: 'Mallorca', toTeamId: 160, toTeam: 'Paris Saint-Germain' })],
      { teamId: 1068, team: 'Atlético Madrid' },
    )
    expect(career).toEqual([
      { teamId: 84, team: 'Mallorca', from: 2023, to: 2023 },
      { teamId: 160, team: 'Paris Saint-Germain', from: 2023, to: 2026 },
      { teamId: 1068, team: 'Atlético Madrid', from: 2026, to: null },
    ])
  })

  it('当前队 = 最后转入队 → 不兜底，行为同原来', () => {
    const career = buildCareer(
      [tr({ date: '2023-07-08', fromTeamId: 84, fromTeam: 'Mallorca', toTeamId: 160, toTeam: 'Paris Saint-Germain' })],
      { teamId: 160, team: 'Paris Saint-Germain' },
    )
    expect(career.map((c) => [c.teamId, c.to])).toEqual([[84, 2023], [160, null]])
  })

  it('未传当前队 → 行为同原来（最后一笔转入队至今）', () => {
    const career = buildCareer([
      tr({ date: '2023-07-08', fromTeamId: 84, fromTeam: 'Mallorca', toTeamId: 160, toTeam: 'Paris Saint-Germain' }),
    ])
    expect(career.map((c) => [c.teamId, c.to])).toEqual([[84, 2023], [160, null]])
  })

  it('空转会但有当前队 → 仍出当前队至今一行', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T00:00:00Z'))
    const career = buildCareer([], { teamId: 1068, team: 'Atlético Madrid' })
    expect(career).toEqual([{ teamId: 1068, team: 'Atlético Madrid', from: 2026, to: null }])
  })
})