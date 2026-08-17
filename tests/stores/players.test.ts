// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayersStore } from '../../src/stores/players'
import { __resetPlayerNames } from '../../src/utils/i18n'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const indexFile = {
  source: 'sports.core.api.espn.com', updateTime: '2026-08-17T06:00:00Z', league: 'eng.1', season: '2025', count: 3,
  players: [
    { id: 11, name: 'Mohamed Salah', teamId: 14, team: 'Liverpool', position: 'F', age: 34, goals: 7, assists: 5, citizenship: 'Egypt', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/egy.png' },
    { id: 22, name: 'Virgil van Dijk', teamId: 14, team: 'Liverpool', position: 'D', age: 33, goals: 1, assists: 0, citizenship: 'Netherlands', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/ned.png' },
    { id: 33, name: 'Zh Testson', teamId: 14, team: 'Liverpool', position: 'M', age: 20, goals: 0, assists: 0 },
  ],
}

const profileFile = {
  source: 'sports.core.api.espn.com', updateTime: '2026-08-17T06:00:00Z', league: 'eng.1', season: '2025',
  id: 11, displayName: 'Mohamed Salah', age: 34, height: 175, weight: 72,
  jersey: 11, position: 'F', teamId: 14, stats: { general: {} },
  citizenship: 'Egypt', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/egy.png',
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  __resetPlayerNames()
  mockFetch.mockReset()
  mockFetch.mockImplementation(async (url: string) => {
    if (String(url).includes('players-zh.json')) {
      // Testson 不在手填表，只有 players-zh.json 有 → 命中即证明建索引前已等合并
      return { ok: true, json: async () => ({ players: { 'Zh Testson': '测试森' } }) }
    }
    if (String(url).includes('/players/index.json')) {
      return { ok: true, json: async () => indexFile }
    }
    if (String(url).includes('/players/11.json')) {
      return { ok: true, json: async () => profileFile }
    }
    throw new Error(`unexpected url ${url}`)
  })
})

describe('players store 搜索', () => {
  it('中文输入命中 players-zh.json 译名（证明建索引前已等合并）', async () => {
    const s = usePlayersStore()
    await s.ensureIndex('eng.1', '2025')
    const hits = s.search('eng.1', '测试森')
    expect(hits.length).toBe(1)
    expect(hits[0].name).toBe('Zh Testson')
  })

  it('中文子串命中手填译名（范迪克 取 范迪）', async () => {
    const s = usePlayersStore()
    await s.ensureIndex('eng.1', '2025')
    const hits = s.search('eng.1', '范迪')
    expect(hits.length).toBe(1)
    expect(hits[0].name).toBe('Virgil van Dijk')
  })

  it('英文前缀照旧命中', async () => {
    const s = usePlayersStore()
    await s.ensureIndex('eng.1', '2025')
    const hits = s.search('eng.1', 'Sala')
    expect(hits.length).toBe(1)
    expect(hits[0].name).toBe('Mohamed Salah')
  })
})

describe('国籍字段透传', () => {
  it('ensureIndex 带出 citizenship/flag', async () => {
    const s = usePlayersStore()
    const list = await s.ensureIndex('eng.1', '2025')
    const salah = list.find((p) => p.id === 11)
    expect(salah?.citizenship).toBe('Egypt')
    expect(salah?.flag).toBe('https://a.espncdn.com/i/teamlogos/countries/500/egy.png')
  })

  it('旧数据无国籍字段不报错（undefined）', async () => {
    const s = usePlayersStore()
    const list = await s.ensureIndex('eng.1', '2025')
    const t = list.find((p) => p.id === 33)
    expect(t?.citizenship).toBeUndefined()
    expect(t?.flag).toBeUndefined()
  })

  it('英文搜索结果带出 citizenship/flag（MiniSearch 白名单）', async () => {
    const s = usePlayersStore()
    await s.ensureIndex('eng.1', '2025')
    const hits = s.search('eng.1', 'Sala')
    expect(hits[0].citizenship).toBe('Egypt')
    expect(hits[0].flag).toContain('egy.png')
  })

  it('中文搜索结果带出 citizenship/flag（索引数组分支）', async () => {
    const s = usePlayersStore()
    await s.ensureIndex('eng.1', '2025')
    const hits = s.search('eng.1', '范迪')
    expect(hits[0].citizenship).toBe('Netherlands')
  })

  it('ensureProfile 带出 citizenship/flag', async () => {
    const s = usePlayersStore()
    const p = await s.ensureProfile('eng.1', 11, '2025')
    expect(p.citizenship).toBe('Egypt')
    expect(p.flag).toContain('egy.png')
  })

  it('英文搜索无国籍球员 citizenship/flag 归一为 null', async () => {
    const s = usePlayersStore()
    await s.ensureIndex('eng.1', '2025')
    const hits = s.search('eng.1', 'Testson')
    expect(hits[0].citizenship).toBeNull()
    expect(hits[0].flag).toBeNull()
  })
})
