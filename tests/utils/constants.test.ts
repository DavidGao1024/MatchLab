import { describe, expect, it } from 'vitest'
import {
  defaultMonth,
  isLeagueSlug,
  seasonMonths,
  zoneOf,
  currentMonth,
} from '../../src/utils/constants'

describe('isLeagueSlug', () => {
  it('七联赛通过', () => {
    for (const s of ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'chn.1', 'uefa.champions']) expect(isLeagueSlug(s)).toBe(true)
  })
  it('其他一律拒绝', () => {
    for (const s of ['fifa.world', 'ENG.1', '', 'eng1']) expect(isLeagueSlug(s)).toBe(false)
  })
})

describe('seasonMonths', () => {
  it('2025 赛季 → 2025-08 至 2026-05 共 10 个月', () => {
    const months = seasonMonths('2025')
    expect(months).toHaveLength(10)
    expect(months[0]).toBe('2025-08')
    expect(months[9]).toBe('2026-05')
  })
  it('欧冠赛季含 6 月（决赛月）→ 2026-08 至 2027-06 共 11 个月', () => {
    const months = seasonMonths('2026', 'european', 'uefa.champions')
    expect(months).toHaveLength(11)
    expect(months[0]).toBe('2026-08')
    expect(months[10]).toBe('2027-06')
  })
  it('自然年制联赛不受 league 参数影响（仍 12 个月）', () => {
    expect(seasonMonths('2026', 'calendar', 'uefa.champions')).toHaveLength(12)
  })
})

describe('defaultMonth', () => {
  it('赛季内取当月', () => {
    expect(defaultMonth('2025', 'european', new Date('2026-01-15T12:00:00Z'))).toBe('2026-01')
  })
  it('休赛期（6/7 月）落 5 月收官月', () => {
    expect(defaultMonth('2025', 'european', new Date('2026-07-27T12:00:00Z'))).toBe('2026-05')
    expect(defaultMonth('2025', 'european', new Date('2026-06-10T12:00:00Z'))).toBe('2026-05')
  })
  it('欧冠休赛期（7 月）落 6 月决赛月', () => {
    expect(defaultMonth('2026', 'european', new Date('2027-07-01T00:00:00Z'), 'uefa.champions')).toBe('2027-06')
  })
  it('自然年制赛季内取当月', () => {
    expect(defaultMonth('2026', 'calendar', new Date('2026-07-15T12:00:00Z'))).toBe('2026-07')
  })
})

describe('currentMonth', () => {
  it('按 UTC 取 YYYY-MM', () => {
    expect(currentMonth(new Date('2026-07-27T23:00:00Z'))).toBe('2026-07')
  })
})

describe('zoneOf', () => {
  it('20 队联赛：前 4 欧冠 / 第 5 欧联 / 后 3 降级 / 中间无区带', () => {
    expect(zoneOf(1, 20, 'eng.1')).toBe('ucl')
    expect(zoneOf(4, 20, 'eng.1')).toBe('ucl')
    expect(zoneOf(5, 20, 'eng.1')).toBe('uel')
    expect(zoneOf(6, 20, 'eng.1')).toBeNull()
    expect(zoneOf(18, 20, 'eng.1')).toBe('rel')
    expect(zoneOf(20, 20, 'eng.1')).toBe('rel')
  })
  it('德甲：第 16 附加赛、17/18 直降', () => {
    expect(zoneOf(16, 18, 'ger.1')).toBe('playoff')
    expect(zoneOf(17, 18, 'ger.1')).toBe('rel')
    expect(zoneOf(18, 18, 'ger.1')).toBe('rel')
  })
  it('法甲：无附加赛，后 2 直降', () => {
    expect(zoneOf(16, 18, 'fra.1')).toBeNull()
    expect(zoneOf(17, 18, 'fra.1')).toBe('rel')
  })
  it('欧冠：前 8 为晋级区，其余无区带', () => {
    expect(zoneOf(1, 36, 'uefa.champions')).toBe('ucl')
    expect(zoneOf(8, 36, 'uefa.champions')).toBe('ucl')
    expect(zoneOf(9, 36, 'uefa.champions')).toBeNull()
    expect(zoneOf(36, 36, 'uefa.champions')).toBeNull()
  })
})
