import { describe, it, expect } from 'vitest'
import { migrateUserData, migrateFavorites } from '../../src/utils/migrate'

describe('migrateUserData', () => {
  it('空 localStorage → 默认空数组结构', () => {
    const result = migrateUserData(null)
    expect(result).toEqual({ version: 1, items: [] })
  })
  it('version 缺失 → 补 version=1', () => {
    const raw = { items: [{ league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: 'x' }] }
    const result = migrateUserData(raw as any)
    expect(result.version).toBe(1)
    expect(result.items.length).toBe(1)
  })
  it('version 0 → 升级到 1（保留 items）', () => {
    const raw = { version: 0, items: [] }
    const result = migrateUserData(raw as any)
    expect(result.version).toBe(1)
  })
})

describe('migrateFavorites', () => {
  it('空 → 默认结构', () => {
    expect(migrateFavorites(null)).toEqual({ version: 1, teams: [], players: [] })
  })
  it('旧字段 teamName → name 统一', () => {
    const raw = { version: 0, teams: [{ league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: 'x' }], players: [] }
    const result = migrateFavorites(raw as any)
    expect(result.teams[0].name).toBe('Arsenal')
    expect(result.teams[0].teamName).toBeUndefined()
  })
})
