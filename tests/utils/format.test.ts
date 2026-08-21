import { describe, expect, it } from 'vitest'
import {
  formatKickoff,
  formatMatchDate,
  formatUtcDateLabel,
  groupMatchesByUtcDate,
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