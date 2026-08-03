import { beforeEach, describe, expect, it, vi } from 'vitest'

// 测试前装一个内存版 localStorage（vitest 默认 node 环境没有）
const store = new Map<string, string>()
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => store.clear(),
}
;(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock

// import.meta.env.BASE_URL 在 vitest 默认是 '/'，无需额外 stub

import { fetchJsonCached, __resetFreshGateForTests } from '../../src/composables/useJsonFetch'

describe('fetchJsonCached — forceFresh 选项', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    store.clear()
    __resetFreshGateForTests()
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.stringify({ ok: 1, url, init: init ?? null })
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: 1, url, init: init ?? null }),
        text: async () => body,
      } as unknown as Response
    })
    ;(globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock
  })

  it('默认（无 forceFresh）走 localStorage 缓存，TTL 内不重新 fetch', async () => {
    const first = await fetchJsonCached('data/x.json', 60_000, 's1')
    const second = await fetchJsonCached('data/x.json', 60_000, 's1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(first).toEqual(second)
  })

  it('forceFresh=true 时 URL 加 ?_t= 时间戳查询参数破坏 HTTP 缓存', async () => {
    await fetchJsonCached('data/x.json', 60_000, 's1', { forceFresh: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toMatch(/\?_t=\d+/)
  })

  it('forceFresh=true 时 fetch 第二参数含 cache: "no-cache" 兜底', async () => {
    await fetchJsonCached('data/x.json', 60_000, 's1', { forceFresh: true })
    const init = fetchMock.mock.calls[0][1] as RequestInit | undefined
    expect(init?.cache).toBe('no-cache')
  })

  it('默认（无 forceFresh）fetch 不带 init 参数，走浏览器默认 HTTP 缓存策略', async () => {
    await fetchJsonCached('data/x.json', 60_000, 's1')
    const init = fetchMock.mock.calls[0][1] as RequestInit | undefined
    expect(init).toBeUndefined()
  })

  it('forceFresh 跳过 localStorage 缓存：先填缓存再 forceFresh，会真发请求', async () => {
    await fetchJsonCached('data/x.json', 60_000, 's1') // 填缓存
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await fetchJsonCached('data/x.json', 60_000, 's1', { forceFresh: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('forceFresh 拿到新数据后写回 localStorage（更新 ts，TTL 重新计时）', async () => {
    await fetchJsonCached('data/x.json', 60_000, 's1', { forceFresh: true })
    // 此时 localStorage 里应有该键
    const keys = [...store.keys()]
    expect(keys.some((k) => k.endsWith(':data/x.json'))).toBe(true)
    // 第二次默认调用应该命中缓存不发请求
    await fetchJsonCached('data/x.json', 60_000, 's1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('URL 已含查询参数时追加 &_t= 而不是 ?_t=', async () => {
    await fetchJsonCached('data/x.json?lang=zh', 60_000, 's1', { forceFresh: true })
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toMatch(/lang=zh&_t=\d+/)
    expect(url).not.toMatch(/\?_t=/)
  })
})
