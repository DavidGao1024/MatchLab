import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLiveScores, clearScoreCache, fetchTeamInjuries, clearInjuryCache } from '../../src/composables/useEspanFetch'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

function mockResponse(events: any[]) {
  return { ok: true, json: async () => ({ events }) } as Response
}

describe('fetchLiveScores 缓存层', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    clearScoreCache()
    clearInjuryCache()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it('首次调用发 fetch', async () => {
    mockFetch.mockResolvedValue(mockResponse([]))
    await fetchLiveScores('eng.1', '2025-08')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
  it('60s 内第二次命中缓存不发 fetch', async () => {
    mockFetch.mockResolvedValue(mockResponse([]))
    await fetchLiveScores('eng.1', '2025-08')
    await fetchLiveScores('eng.1', '2025-08')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
  it('60s 后第二次发 fetch', async () => {
    mockFetch.mockResolvedValue(mockResponse([]))
    await fetchLiveScores('eng.1', '2025-08')
    vi.advanceTimersByTime(61000)
    await fetchLiveScores('eng.1', '2025-08')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('fetchTeamInjuries', () => {
  // ESPN 实测结构（2026-08-03 验证）：顶层 injuries 数组，每条含
  //   athlete.{id, displayName}, type.{id, name, description, abbreviation},
  //   status（顶层字符串，如 "Injured Reserve"）, details.{type, location, returnDate}
  beforeEach(() => {
    mockFetch.mockReset()
    clearInjuryCache()
  })
  it('返回伤员数组，5 分钟内缓存', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        injuries: [{
          id: '632414',
          athlete: { id: 1, displayName: 'Saka' },
          type: { id: '5', name: 'INJURY_STATUS_IR', description: 'Injured Reserve', abbreviation: 'IR' },
          status: 'Doubtful',
          date: '2026-08-01T20:43Z',
        }],
      }),
    })
    const r1 = await fetchTeamInjuries('eng.1', 359)
    expect(r1.length).toBe(1)
    expect(r1[0]).toMatchObject({ athleteId: 1, name: 'Saka', type: 'Injured Reserve', status: 'Doubtful' })
    const r2 = await fetchTeamInjuries('eng.1', 359)
    expect(mockFetch).toHaveBeenCalledTimes(1) // 命中缓存
  })
  it('空响应返回空数组', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const r = await fetchTeamInjuries('eng.1', 999)
    expect(r).toEqual([])
  })
  it('HTTP 错抛错', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 } as Response)
    await expect(fetchTeamInjuries('eng.1', 888)).rejects.toThrow()
  })
})
