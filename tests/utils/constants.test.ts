import { describe, expect, it } from 'vitest'
import {
  defaultMonth,
  isLeagueSlug,
  seasonMonths,
  zoneOf,
  currentMonth,
} from '../../src/utils/constants'

describe('isLeagueSlug', () => {
  it('五大联赛通过', () => {
    for (const s of ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1']) expect(isLeagueSlug(s)).toBe(true)
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
})

describe('defaultMonth', () => {
  it('赛季内取当月', () => {
    expect(defaultMonth('2025', new Date('2026-01-15T12:00:00Z'))).toBe('2026-01')
  })
  it('休赛期（6/7 月）落 5 月收官月', () => {
    expect(defaultMonth('2025', new Date('2026-07-27T12:00:00Z'))).toBe('2026-05')
    expect(defaultMonth('2025', new Date('2026-06-10T12:00:00Z'))).toBe('2026-05')
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
})
