import type { EspnCompetitor, EspnEvent, EspnScoreboard } from '../types/espn-site'
import type { Match, MatchTeam } from '../types/models'
import type { LeagueSlug } from '../utils/constants'

const SITE_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer'

/** 'YYYY-MM' → ESPN dates 参数 YYYYMM01-YYYYMMDD（月末按 UTC 日历推） */
export function monthDateRange(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate() // 下月 0 号 = 本月最后一天
  const mm = String(m).padStart(2, '0')
  return `${y}${mm}01-${y}${mm}${String(last).padStart(2, '0')}`
}

/** ESPN 事件 → Match 模型。页面层永不接触 ESPN 原始结构，接口变脸只改这个文件（规格 §五） */
export function normalizeEvent(e: EspnEvent): Match | null {
  const comp = e.competitions?.[0]
  if (!comp) return null
  const homeC = comp.competitors.find((c) => c.homeAway === 'home')
  const awayC = comp.competitors.find((c) => c.homeAway === 'away')
  if (!homeC || !awayC) return null
  const toTeam = (c: EspnCompetitor): MatchTeam => ({
    id: Number(c.team.id),
    name: c.team.displayName,
    abbreviation: c.team.abbreviation ?? '',
    logo: c.team.logo ?? '',
    score: c.score != null ? Number(c.score) : null,
    winner: c.winner ?? null,
  })
  const state = e.status?.type?.state ?? 'pre'
  return {
    eventId: e.id,
    date: e.date,
    status: state,
    completed: state === 'post',
    clock: e.status?.displayClock,
    venue: comp.venue?.fullName ?? '',
    home: toTeam(homeC),
    away: toTeam(awayC),
  }
}

/** 当月直播比分（limit=200 防分页截断，蓝图 §6.3 / 规格 v1.5） */
export async function fetchLiveScores(league: LeagueSlug, month: string): Promise<Match[]> {
  const res = await fetch(`${SITE_API}/${league}/scoreboard?dates=${monthDateRange(month)}&limit=200`)
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  const sb = (await res.json()) as EspnScoreboard
  return (sb.events ?? [])
    .map(normalizeEvent)
    .filter((m): m is Match => m !== null)
}
