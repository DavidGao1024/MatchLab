// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayersStore } from '../../src/stores/players'
import { __resetPlayerNames } from '../../src/utils/i18n'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const indexFile = {
  players: [
    { id: 11, name: 'Mohamed Salah', teamId: 14, team: 'Liverpool', position: 'F', age: 34, goals: 7, assists: 5 },
    { id: 22, name: 'Virgil van Dijk', teamId: 14, team: 'Liverpool', position: 'D', age: 33, goals: 1, assists: 0 },
    { id: 33, name: 'Zh Testson', teamId: 14, team: 'Liverpool', position: 'M', age: 20, goals: 0, assists: 0 },
  ],
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
