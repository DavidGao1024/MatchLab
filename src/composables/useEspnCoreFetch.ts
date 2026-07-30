import { CACHE_PREFIX } from '../utils/constants'

/**
 * ESPN core API 浏览器直连（CORS 已验证 2026-07-24，CLAUDE.md 批准 Phase 6 历史赛季按需直连）
 * 复用 fetchJsonCached 的 localStorage TTL 缓存模式，但 fetch 跨域到 ESPN 域（不带 BASE_URL 前缀）
 */

const CORE_BASE = 'https://sports.core.api.espn.com/v2'

interface CacheEntry<T> {
  data: T
  ts: number
}

export async function fetchCoreJsonCached<T>(path: string, ttlMs: number): Promise<T> {
  const url = path.startsWith('http') ? path : `${CORE_BASE}${path}`
  const key = `${CACHE_PREFIX}:core:${url}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry<T>
      if (typeof entry.ts === 'number' && Date.now() - entry.ts < ttlMs) return entry.data
    }
  } catch {
    // localStorage 损坏 → 视未命中
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const data = (await res.json()) as T
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() } satisfies CacheEntry<T>))
  } catch {
    // 隐私模式/配额满 → 降级直取
  }
  return data
}
