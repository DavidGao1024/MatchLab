import { CACHE_PREFIX } from '../utils/constants'

interface CacheEntry<T> {
  data: T
  ts: number
}

/**
 * 静态 JSON 唯一入口（铁律：BASE_URL 前缀，禁绝对路径）。
 * 缓存键带赛季号——八月赛季更替时旧缓存自动作废（规格 v1.6）。
 * 缓存读写、解析全部容错：损坏按未命中，隐私模式降级内存直取（规格风险表）。
 */
export async function fetchJsonCached<T>(path: string, ttlMs: number, season = 'na'): Promise<T> {
  const key = `${CACHE_PREFIX}:${season}:${path}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry<T>
      if (typeof entry.ts === 'number' && Date.now() - entry.ts < ttlMs) return entry.data
    }
  } catch {
    // 缓存损坏或 localStorage 不可用 → 当未命中
  }
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  const data = (await res.json()) as T
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() } satisfies CacheEntry<T>))
  } catch {
    // 隐私模式/配额满 → 本次降级为直取，功能不受影响
  }
  return data
}
