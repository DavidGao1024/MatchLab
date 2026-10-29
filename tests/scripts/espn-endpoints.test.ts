// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const { LEAGUES, monthToken, openMonthOf } = req('../../scripts/lib/espn-endpoints.js')

describe('monthToken（ESPN dates 月令牌）', () => {
  it('YYYY-MM → YYYYMM', () => {
    expect(monthToken('2025-09')).toBe('202509')
  })
  it('个位月份补零', () => {
    expect(monthToken('2026-01')).toBe('202601')
  })
  it('12 月', () => {
    expect(monthToken('2026-12')).toBe('202612')
  })
})

describe('openMonthOf（赛季开幕月）', () => {
  it('默认：欧洲制 8 月、自然年制 3 月', () => {
    expect(openMonthOf({ seasonType: 'european' })).toBe(8)
    expect(openMonthOf({ seasonType: 'calendar' })).toBe(3)
  })
  it('欧冠用 openMonth 覆盖为 9 月', () => {
    expect(openMonthOf({ seasonType: 'european', openMonth: 9 })).toBe(9)
  })
})

describe('欧冠联赛配置', () => {
  it('uefa.champions 在册：36 队、9 月开幕、联赛阶段计入积分榜', () => {
    const ucl = LEAGUES.find((l) => l.slug === 'uefa.champions')
    expect(ucl).toMatchObject({
      nameZh: '欧冠', teams: 36, openMonth: 9, hasStages: true, standingsStage: 'league-phase',
    })
  })
})