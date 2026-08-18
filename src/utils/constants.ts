export const LEAGUE_SLUGS = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'chn.1'] as const
export type LeagueSlug = (typeof LEAGUE_SLUGS)[number]

export function isLeagueSlug(v: string): v is LeagueSlug {
  return (LEAGUE_SLUGS as readonly string[]).includes(v)
}

/** 首页默认焦点联赛（规格 §四首页） */
export const FOCUS_LEAGUE: LeagueSlug = 'eng.1'

/** xG 功能开关（合规：Understat 无授权已舍弃，链路保留）。置 true 恢复展示，需配合 workflow 恢复 Understat 抓取 */
export const XG_ENABLED = false

/** localStorage 缓存键前缀，版本升级改这里使全站缓存失效 */
export const CACHE_PREFIX = 'matchlab:v1'

export interface ZoneConfig {
  ucl: number
  uel: number
  /** 降级附加赛名次（仅德甲 18 队制有） */
  playoff?: number
  rel: number
}

/** 每联赛各写一份，规则不通用（规格 §四积分榜页） */
export const ZONE_CONFIG: Record<LeagueSlug, ZoneConfig> = {
  'eng.1': { ucl: 4, uel: 1, rel: 3 },
  'esp.1': { ucl: 4, uel: 1, rel: 3 },
  'ita.1': { ucl: 4, uel: 1, rel: 3 },
  'ger.1': { ucl: 4, uel: 1, playoff: 16, rel: 2 },
  'fra.1': { ucl: 4, uel: 1, rel: 2 },
  'chn.1': { ucl: 2, uel: 0, rel: 2 },
}

export type Zone = 'ucl' | 'uel' | 'playoff' | 'rel'

/** 名次对应的区带，无区带返回 null */
export function zoneOf(rank: number, total: number, league: LeagueSlug): Zone | null {
  const z = ZONE_CONFIG[league]
  if (rank <= z.ucl) return 'ucl'
  if (rank === z.ucl + z.uel) return 'uel'
  if (z.playoff !== undefined && rank === z.playoff) return 'playoff'
  if (rank > total - z.rel) return 'rel'
  return null
}

/** 赛季号 → 月份清单。欧洲制 '2025' → ['2025-08', …, '2026-05']；自然年制 → ['2026-01', …, '2026-12'] */
export function seasonMonths(season: string, seasonType: 'european' | 'calendar' = 'european'): string[] {
  const start = Number(season)
  if (seasonType === 'calendar') {
    return Array.from({ length: 12 }, (_, i) => `${start}-${String(i + 1).padStart(2, '0')}`)
  }
  const months: string[] = []
  for (let i = 0; i < 10; i++) {
    const y = i < 5 ? start : start + 1
    const m = i < 5 ? 8 + i : i - 4
    months.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return months
}

/** 当前 UTC 月份 YYYY-MM（直播/死数据分界用 UTC 口径） */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

/** 默认月份：赛季内当月，休赛期落末月（规格规则 3） */
export function defaultMonth(season: string, seasonType: 'european' | 'calendar' = 'european', now: Date = new Date()): string {
  const cur = currentMonth(now)
  const months = seasonMonths(season, seasonType)
  return months.includes(cur) ? cur : months[months.length - 1]
}
