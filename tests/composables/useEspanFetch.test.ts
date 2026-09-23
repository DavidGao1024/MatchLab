import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLiveScores, fetchScoresRange, clearScoreCache, fetchTeamInjuries, clearInjuryCache } from '../../src/composables/useEspanFetch'

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

describe('fetchScoresRange 战报带日期区间', () => {
  const event = {
    id: 'e1', date: '2026-09-07T10:00:00Z',
    status: { type: { state: 'post', completed: true } },
    competitions: [{
      venue: { fullName: 'Anfield' },
      competitors: [
        { homeAway: 'home', team: { id: '1', displayName: 'A' }, score: '2' },
        { homeAway: 'away', team: { id: '2', displayName: 'B' }, score: '1' },
      ],
    }],
  }
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    clearScoreCache()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('月内区间：单次请求，URL 带整月令牌', async () => {
    mockFetch.mockResolvedValue(mockResponse([event]))
    const list = await fetchScoresRange('eng.1', '2026-09-01', '2026-09-08')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('scoreboard?dates=202609&limit=200'),
    )
    expect(list).toHaveLength(1)
    expect(list[0].eventId).toBe('e1')
    expect(list[0].completed).toBe(true)
  })

  it('跨月区间：按月各发一次请求', async () => {
    mockFetch.mockResolvedValue(mockResponse([event]))
    await fetchScoresRange('eng.1', '2026-08-28', '2026-09-08')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const urls = mockFetch.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('dates=202608'))).toBe(true)
    expect(urls.some((u) => u.includes('dates=202609'))).toBe(true)
  })

  it('区间外比赛本地过滤，时区边界 ±1 天保留', async () => {
    const at = (d: string) => ({ ...event, id: `e-${d}`, date: `${d}T10:00:00Z` })
    mockFetch.mockResolvedValue(mockResponse([
      at('2026-09-01'), // 早一天：时区松弛保留
      at('2026-09-08'), // 区间端点
      at('2026-08-20'), // 早于区间
      at('2026-09-20'), // 晚于区间
    ]))
    const list = await fetchScoresRange('eng.1', '2026-09-02', '2026-09-08')
    expect(list.map((m) => m.date.slice(0, 10)).sort()).toEqual(['2026-09-01', '2026-09-08'])
  })

  it('同区间 60s 内命中缓存，60s 后再发', async () => {
    mockFetch.mockResolvedValue(mockResponse([]))
    await fetchScoresRange('eng.1', '2026-09-02', '2026-09-08')
    await fetchScoresRange('eng.1', '2026-09-02', '2026-09-08')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(61000)
    await fetchScoresRange('eng.1', '2026-09-02', '2026-09-08')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('HTTP 非 2xx 抛错', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 } as Response)
    await expect(fetchScoresRange('eng.1', '2026-09-01', '2026-09-08')).rejects.toThrow('ESPN HTTP 403')
  })
})
