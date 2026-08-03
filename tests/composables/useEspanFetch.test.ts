import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLiveScores, clearScoreCache } from '../../src/composables/useEspanFetch'

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
