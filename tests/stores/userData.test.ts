// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserDataStore } from '../../src/stores/userData'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useUserDataStore state', () => {
  it('初始空', () => {
    const s = useUserDataStore()
    expect(s.subscriptions).toEqual([])
    expect(s.favorites).toEqual({ teams: [], players: [] })
  })
  it('init 从空 localStorage 启动不报错', async () => {
    const s = useUserDataStore()
    await s.init()
    expect(s.subscriptions).toEqual([])
  })
  it('init 从有数据的 localStorage 启动 → hydrate', async () => {
    localStorage.setItem('matchlab:subscriptions', JSON.stringify({
      version: 1,
      items: [{ league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: 'x' }],
    }))
    localStorage.setItem('matchlab:favorites', JSON.stringify({
      version: 1, teams: [], players: [],
    }))
    const s = useUserDataStore()
    await s.init()
    expect(s.subscriptions.length).toBe(1)
    expect(s.subscriptions[0].teamName).toBe('Arsenal')
  })
})
