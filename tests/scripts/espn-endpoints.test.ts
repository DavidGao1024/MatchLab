// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const { LEAGUES, monthToken, openMonthOf, matchesForStandings, stageFilterEmptied } = req('../../scripts/lib/espn-endpoints.js')

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

describe('matchesForStandings（积分榜阶段过滤）', () => {
  it('欧冠只保留 league-phase', () => {
    const ms = [{ stage: 'league-phase' }, { stage: 'round-of-16' }, { stage: 'final' }]
    expect(matchesForStandings(ms, { standingsStage: 'league-phase' })).toEqual([{ stage: 'league-phase' }])
  })
  it('没有 standingsStage 的联赛原样返回同一数组', () => {
    const ms = [{ stage: 'x' }]
    expect(matchesForStandings(ms, {})).toBe(ms)
  })
})

describe('stageFilterEmptied（阶段过滤空榜防线）', () => {
  it('欧冠窗口内有比赛但过滤后 0 场 → true（拒绝写空榜）', () => {
    const all = [{ stage: 'league-phase' }, { stage: 'round-of-16' }]
    expect(stageFilterEmptied(all, [], { standingsStage: 'league-phase' })).toBe(true)
  })
  it('过滤后有比赛 → false', () => {
    const all = [{ stage: 'league-phase' }]
    expect(stageFilterEmptied(all, all, { standingsStage: 'league-phase' })).toBe(false)
  })
  it('非欧冠/空窗口 → false（赛季初不误伤）', () => {
    const ms = [{ stage: 'x' }]
    expect(stageFilterEmptied(ms, ms, {})).toBe(false)
    expect(stageFilterEmptied([], [], { standingsStage: 'league-phase' })).toBe(false)
  })
})