import type { Match, StandingRow, XgRow } from '../types/models'
import type { RawStanding, RawXgStanding } from '../types/static'
import { zoneOf, type LeagueSlug } from './constants'
import { computeForm } from './matches'

/**
 * 正榜 + zone + xG 三合一。
 * xG 行经 Understat→ESPN 队名映射对行；对不上的留空（规格规则 7：只取 team/xG/xGA/xpts，history 不碰）
 */
export function mergeStandings(
  raw: RawStanding[],
  league: LeagueSlug,
  xg: RawXgStanding[] | null,
  teamNameMap: Record<string, string>,
): StandingRow[] {
  const xgByEpsnName = new Map<string, XgRow>()
  if (xg) {
    for (const r of xg) {
      xgByEpsnName.set(teamNameMap[r.team] ?? r.team, { team: r.team, xG: r.xG, xGA: r.xGA, xpts: r.xpts })
    }
  }
  return raw.map((s) => {
    const x = xgByEpsnName.get(s.team)
    return {
      ...s,
      zone: zoneOf(s.rank, raw.length, league),
      form: [],
      xG: x?.xG,
      xGA: x?.xGA,
      xPts: x?.xpts,
    }
  })
}

/** 把近 5 场形势填进每一行（赛程数据另取，不混进合并函数） */
export function applyForm(rows: StandingRow[], matches: Match[]): StandingRow[] {
  return rows.map((r) => ({ ...r, form: computeForm(matches, r.teamId) }))
}
