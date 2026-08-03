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

describe('useUserDataStore 订阅 actions', () => {
  it('isSubscribed 命中', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    vi.advanceTimersByTime(200)
    expect(s.isSubscribed(359)).toBe(true)
    expect(s.isSubscribed(999)).toBe(false)
  })
  it('removeSubscription 删除并写盘', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    vi.advanceTimersByTime(200)
    s.removeSubscription(359)
    vi.advanceTimersByTime(200)
    expect(s.subscriptions.length).toBe(0)
    const stored = JSON.parse(localStorage.getItem('matchlab:subscriptions')!)
    expect(stored.items.length).toBe(0)
  })
  it('重复 addSubscription 被 dedup', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    s.addSubscription({ league: 'eng.1', teamId: 359, teamName: 'Arsenal' })
    expect(s.subscriptions.length).toBe(1)
  })
  it('超 3 队抛错', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addSubscription({ league: 'eng.1', teamId: 1, teamName: 'A' })
    s.addSubscription({ league: 'eng.1', teamId: 2, teamName: 'B' })
    s.addSubscription({ league: 'eng.1', teamId: 3, teamName: 'C' })
    expect(() => s.addSubscription({ league: 'eng.1', teamId: 4, teamName: 'D' })).toThrow()
  })
})

describe('useUserDataStore 收藏 actions', () => {
  it('addFavorite 球队', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    vi.advanceTimersByTime(200)
    expect(s.favorites.teams.length).toBe(1)
    expect(s.isFavorite('team', 359)).toBe(true)
  })
  it('addFavorite 球员', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addFavorite('player', { league: 'eng.1', athleteId: 253989, name: 'Haaland' })
    vi.advanceTimersByTime(200)
    expect(s.favorites.players.length).toBe(1)
    expect(s.isFavorite('player', 253989)).toBe(true)
  })
  it('重复 addFavorite 被 dedup', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    s.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    expect(s.favorites.teams.length).toBe(1)
  })
  it('toggleFavorite 切换态', async () => {
    const s = useUserDataStore()
    await s.init()
    s.toggleFavorite('team', 359, 'Arsenal', 'eng.1')
    expect(s.favorites.teams.length).toBe(1)
    s.toggleFavorite('team', 359, 'Arsenal', 'eng.1')
    expect(s.favorites.teams.length).toBe(0)
  })
  it('removeFavorite 删除', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addFavorite('team', { league: 'eng.1', teamId: 359, name: 'Arsenal' })
    s.removeFavorite('team', 359)
    expect(s.favorites.teams.length).toBe(0)
  })
  it('超 50 项抛错', async () => {
    const s = useUserDataStore()
    await s.init()
    for (let i = 0; i < 50; i++) {
      s.addFavorite('team', { league: 'eng.1', teamId: i, name: `T${i}` })
    }
    expect(() => s.addFavorite('team', { league: 'eng.1', teamId: 999, name: 'X' })).toThrow()
  })
  it('混合上限（teams+players 合计 50）', async () => {
    const s = useUserDataStore()
    await s.init()
    for (let i = 0; i < 30; i++) {
      s.addFavorite('team', { league: 'eng.1', teamId: i, name: `T${i}` })
    }
    for (let i = 0; i < 20; i++) {
      s.addFavorite('player', { league: 'eng.1', athleteId: i + 1000, name: `P${i}` })
    }
    expect(() => s.addFavorite('team', { league: 'eng.1', teamId: 999, name: 'X' })).toThrow()
  })
  it('removeFavorite 球员分支', async () => {
    const s = useUserDataStore()
    await s.init()
    s.addFavorite('player', { league: 'eng.1', athleteId: 253989, name: 'Haaland' })
    s.removeFavorite('player', 253989)
    expect(s.favorites.players.length).toBe(0)
    expect(s.isFavorite('player', 253989)).toBe(false)
  })
  it('isFavorite 负向断言', async () => {
    const s = useUserDataStore()
    await s.init()
    expect(s.isFavorite('team', 999)).toBe(false)
    expect(s.isFavorite('player', 999)).toBe(false)
  })
})

describe('useUserDataStore 多 tab 同步', () => {
  it('storage event 触发 hydrate', async () => {
    const s = useUserDataStore()
    await s.init()
    // 模拟另一 tab 写入
    localStorage.setItem('matchlab:subscriptions', JSON.stringify({
      version: 1,
      items: [{ league: 'eng.1', teamId: 359, teamName: 'Arsenal', addedAt: 'x' }],
    }))
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'matchlab:subscriptions',
      newValue: localStorage.getItem('matchlab:subscriptions'),
    }))
    expect(s.subscriptions.length).toBe(1)
    expect(s.subscriptions[0].teamName).toBe('Arsenal')
  })
  it('其他 key 的 storage event 不触发 hydrate', async () => {
    const s = useUserDataStore()
    await s.init()
    const before = s.subscriptions.length
    window.dispatchEvent(new StorageEvent('storage', { key: 'other-key', newValue: 'x' }))
    expect(s.subscriptions.length).toBe(before)
  })
})
