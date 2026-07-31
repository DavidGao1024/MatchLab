// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserDataStore } from '../../src/stores/userData'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
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

describe('useUserDataStore 持久化', () => {
  it('addSubscription 后 debounce 200ms 写入 localStorage', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    expect(localStorage.getItem('matchlab:subscriptions')).toBeNull()
    vi.advanceTimersByTime(200)
    const stored = JSON.parse(localStorage.getItem('matchlab:subscriptions')!)
    expect(stored.version).toBe(1)
    expect(stored.items.length).toBe(1)
  })
})
