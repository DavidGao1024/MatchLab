// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const { fetchLeaders } = req('../../scripts/lib/fetch-leaders.js')

const league = { slug: 'ger.1' }
const core = {
  leaders: (slug: string, season: string) => `https://core/leagues/${slug}/seasons/${season}/types/1/leaders`,
  athlete: (slug: string, id: number) => `https://core/leagues/${slug}/athletes/${id}`,
}
const index: unknown[] = []
const teamsById = new Map()

/** mock getJson：按模式返回正常 / 404 / 5xx / 网络错误 */
function mkGetJson(mode: 'normal' | '404' | '500' | 'net') {
  return async (url: string) => {
    if (mode === '404') throw Object.assign(new Error('HTTP 404 for x'), { statusCode: 404, retryable: false })
    if (mode === '500') throw Object.assign(new Error('HTTP 500 for x'), { statusCode: 500, retryable: true })
    if (mode === 'net') throw Object.assign(new Error('timeout'), { retryable: true })
    if (url.includes('/leaders')) {
      return {
        categories: [{
          name: 'goalsLeaders',
          displayName: 'Goals Leaders',
          abbreviation: 'G',
          leaders: [{
            displayValue: 'Matches: 1, Goals: 1',
            value: 1,
            athlete: { $ref: 'http://core/athletes/123?lang=en' },
            team: { $ref: 'http://core/teams/45?lang=en' },
          }],
        }],
      }
    }
    return {}
  }
}

describe('fetchLeaders(league.leaders 端点)', () => {
  it('正常：解析出分类与条目、season 透传', async () => {
    const r = await fetchLeaders(mkGetJson('normal'), core, league, '2026', index, teamsById)
    expect(r.season).toBe('2026')
    expect(r.categories).toHaveLength(1)
    expect(r.categories[0].entries[0]).toMatchObject({ athleteId: 123, teamId: 45, value: 1 })
  })

  it('404(新赛季未开赛 → No stats found)：视为空榜单，切季不抛错', async () => {
    const r = await fetchLeaders(mkGetJson('404'), core, league, '2026', index, teamsById)
    expect(r.season).toBe('2026')
    expect(r.categories).toEqual([])
  })

  it('5xx：照抛——保留旧数据不清榜', async () => {
    await expect(fetchLeaders(mkGetJson('500'), core, league, '2026', index, teamsById)).rejects.toThrow()
  })

  it('网络错误(无 statusCode)：照抛——不清榜', async () => {
    await expect(fetchLeaders(mkGetJson('net'), core, league, '2026', index, teamsById)).rejects.toThrow()
  })
})