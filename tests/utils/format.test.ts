import { describe, expect, it } from 'vitest'
import {
  formatKickoff,
  formatMatchDate,
  formatUtcDateLabel,
  groupMatchesByUtcDate,
  beijingDay,
  shiftBjDay,
} from '../../src/utils/format'
import type { Match } from '../../src/types/models'

describe('formatKickoff', () => {
  it('中文用东八区（UTC+8）', () => {
    expect(formatKickoff('2025-01-15T11:30Z', 'zh')).toBe('19:30')
  })
  it('英文用英国时间（1 月冬令时 UTC+0）', () => {
    expect(formatKickoff('2025-01-15T11:30Z', 'en')).toBe('11:30')
  })
  it('中文东八区跨天加「次日」前缀', () => {
    expect(formatKickoff('2025-01-15T20:00Z', 'zh')).toBe('次日 04:00')
  })
})

describe('formatMatchDate', () => {
  it('中文日期标签随东八区（跨天到 1/16）', () => {
    expect(formatMatchDate('2025-01-15T20:00Z', 'zh')).toBe('1月16日 · 周四')
  })
  it('英文日期标签随伦敦时区（同日 1/15）', () => {
    expect(formatMatchDate('2025-01-15T20:00Z', 'en')).toBe('Jan 15 · Wed')
  })
})

describe('formatUtcDateLabel', () => {
  it('中文：8月16日 · 周六（UTC 星期推导，与本机时区无关）', () => {
    expect(formatUtcDateLabel('2025-08-16', 'zh')).toBe('8月16日 · 周六')
  })
  it('英文：Aug 16 · Sat', () => {
    expect(formatUtcDateLabel('2025-08-16', 'en')).toBe('Aug 16 · Sat')
  })
})

const mkMatch = (eventId: string, date: string): Match => ({
  eventId,
  date,
  status: 'post',
  completed: true,
  venue: 'X',
  home: { id: 1, name: 'A', abbreviation: 'A', logo: '', score: 1, winner: true },
  away: { id: 2, name: 'B', abbreviation: 'B', logo: '', score: 0, winner: null },
})

describe('groupMatchesByUtcDate', () => {
  it('按 UTC 日期分组并按日期升序，组内按开球时间升序', () => {
    const groups = groupMatchesByUtcDate([
      mkMatch('3', '2025-08-17T13:00Z'),
      mkMatch('1', '2025-08-16T14:00Z'),
      mkMatch('2', '2025-08-16T11:30Z'),
    ])
    expect(groups.map((g) => g.utcDate)).toEqual(['2025-08-16', '2025-08-17'])
    expect(groups[0].matches.map((m) => m.eventId)).toEqual(['2', '1'])
  })
  it('空输入 → 空数组', () => {
    expect(groupMatchesByUtcDate([])).toEqual([])
  })
})

describe('beijingDay / shiftBjDay（北京日历日）', () => {
  it('UTC 上午仍算北京当天（北京傍晚）', () => {
    expect(beijingDay('2026-09-08T10:00:00Z')).toBe('2026-09-08')
  })
  it('UTC 晚间跨过北京零点 → 次日', () => {
    expect(beijingDay('2026-09-07T20:00:00Z')).toBe('2026-09-08')
  })
  it('欧联晚场：UTC 21:05 → 北京次日', () => {
    expect(beijingDay('2026-09-05T21:05:00Z')).toBe('2026-09-06')
  })
  it('shiftBjDay 往前跨日', () => {
    expect(shiftBjDay('2026-09-08', -1)).toBe('2026-09-07')
  })
  it('shiftBjDay 跨月', () => {
    expect(shiftBjDay('2026-10-01', -1)).toBe('2026-09-30')
    expect(shiftBjDay('2026-09-30', 1)).toBe('2026-10-01')
  })
  it('shiftBjDay 跨年', () => {
    expect(shiftBjDay('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftBjDay('2025-12-31', 1)).toBe('2026-01-01')
  })
  it('shiftBjDay 闰日', () => {
    expect(shiftBjDay('2028-03-01', -1)).toBe('2028-02-29')
  })
})