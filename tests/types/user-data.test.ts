import { describe, it, expect } from 'vitest'
import type { Subscription, Favorite, UserData } from '../../src/types/user-data'
import { USER_DATA_VERSION } from '../../src/types/user-data'

describe('types/user-data 类型导出', () => {
  it('USER_DATA_VERSION = 1', () => {
    expect(USER_DATA_VERSION).toBe(1)
  })
  it('Subscription 结构', () => {
    const s: Subscription = { league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: '2026-07-31T00:00:00Z' }
    expect(s.teamId).toBe(359)
  })
  it('Favorite 结构（球队）', () => {
    const f: Favorite = { league: 'eng.1', teamId: 359, name: 'Arsenal', addedAt: '2026-07-31T00:00:00Z' }
    expect(f.teamId).toBe(359)
  })
  it('Favorite 结构（球员）', () => {
    const f: Favorite = { league: 'eng.1', athleteId: 253989, name: 'Haaland', addedAt: '2026-07-31T00:00:00Z' }
    expect(f.athleteId).toBe(253989)
  })
})
