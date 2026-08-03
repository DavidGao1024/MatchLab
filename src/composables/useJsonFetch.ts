import { CACHE_PREFIX } from '../utils/constants'

interface CacheEntry<T> {
  data: T
  ts: number
}

interface FetchOpts {
  /** 进入页面时绕过 localStorage + HTTP 缓存拉一次最新数据，拿到后写回 localStorage 更新 ts */
  forceFresh?: boolean
}

/** forceFresh 节流：同一 path 5 分钟内重复 forceFresh 降级为普通缓存读，避免短时切页面反复发请求 */
const FRESH_THROTTLE_MS = 5 * 60 * 1000
const freshGate = new Map<string, number>()

/** 仅供测试：清空 forceFresh 节流门控，避免测试间互相污染 */
export function __resetFreshGateForTests() {
  freshGate.clear()
}

/**
 * 静态 JSON 唯一入口（铁律：BASE_URL 前缀，禁绝对路径）。
 * 缓存键带赛季号——八月赛季更替时旧缓存自动作废（规格 v1.6）。
 * 缓存读写、解析全部容错：损坏按未命中，隐私模式降级内存直取（规格风险表）。
 *
 * forceFresh 应对 GitHub Pages 无 Cache-Control 头导致的浏览器启发式缓存陷阱：
 * URL 加时间戳查询参数破坏 HTTP 缓存，同时 fetch 加 cache:'no-cache' 兜底。
 * 节流放在 path 维度，避免 standings/leaders 各自维护 lastFreshAt，跨 store 统一。
 */
export async function fetchJsonCached<T>(path: string, ttlMs: number, season = 'na', opts: FetchOpts = {}): Promise<T> {
  const key = `${CACHE_PREFIX}:${season}:${path}`
  let forceFresh = opts.forceFresh ?? false
  if (forceFresh) {
    const last = freshGate.get(path) ?? 0
    if (Date.now() - last < FRESH_THROTTLE_MS) {
      forceFresh = false
    } else {
      freshGate.set(path, Date.now())
    }
  }
  if (!forceFresh) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const entry = JSON.parse(raw) as CacheEntry<T>
        if (typeof entry.ts === 'number' && Date.now() - entry.ts < ttlMs) return entry.data
      }
    } catch {
      // 缓存损坏或 localStorage 不可用 → 当未命中
    }
  }
  // URL 加 ?_t= 时间戳（仅 forceFresh），破坏浏览器对静态 JSON 的启发式 HTTP 缓存
  const sep = path.includes('?') ? '&' : '?'
  const url = forceFresh
    ? `${import.meta.env.BASE_URL}${path}${sep}_t=${Date.now()}`
    : `${import.meta.env.BASE_URL}${path}`
  // cache:'no-cache' 让浏览器发条件请求验证（不直接复用磁盘缓存），微信浏览器 X5/TBS 内核支持度不确定，URL 时间戳是兜底
  const init: RequestInit | undefined = forceFresh ? { cache: 'no-cache' } : undefined
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  const data = (await res.json()) as T
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() } satisfies CacheEntry<T>))
  } catch {
    // 隐私模式/配额满 → 本次降级为直取，功能不受影响
  }
  return data
}
