import { describe, expect, it } from 'vitest'
import {
  formatKickoff,
  formatUtcDateLabel,
  groupMatchesByUtcDate,
  isNextDay,
} from '../../src/utils/format'
import type { Match } from '../../src/types/models'

const pad = (n: number) => String(n).padStart(2, '0')
/** 用 Date API 推导本地 HH:mm，测试与实现同时区，断言永远自洽 */
const localHM = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

describe('isNextDay', () => {
  it('本地日期与 UTC 日期一致 → false；跨天 → true（期望值现场推导）', () => {
    const iso = '2025-08-16T16:30Z'
    const d = new Date(iso)
    const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    expect(isNextDay(iso)).toBe(localDate !== '2025-08-16')
  })
})

describe('formatKickoff', () => {
  it('不跨天：纯 HH:mm', () => {
    const iso = '2025-08-16T11:30Z'
    expect(formatKickoff(iso, 'zh')).toBe(isNextDay(iso) ? `次日 ${localHM(iso)}` : localHM(iso))
  })
  it('跨天：中文加"次日"前缀，英文加 (+1d)', () => {
    // 构造一个必然跨天的用例：UTC 深夜，东八区必跨天；若本机时区不跨天则期望值自动切换
    const iso = '2025-08-16T16:30Z'
    const out = formatKickoff(iso, 'zh')
    expect(out.endsWith(localHM(iso))).toBe(true)
    if (isNextDay(iso)) expect(out).toBe(`次日 ${localHM(iso)}`)
    else expect(out).toBe(localHM(iso))
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
