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
      const key = teamNameMap[r.team] ?? r.team
      if (!xgByEpsnName.has(key)) {
        xgByEpsnName.set(key, { team: r.team, xG: r.xG, xGA: r.xGA, xpts: r.xpts })
      }
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

/**
 * 中超扣分配置（与 scripts/lib/espn-endpoints.js 的 pointDeductions 保持一致）。
 * 五大联赛无扣分。
 */
export const POINT_DEDUCTIONS: Partial<Record<LeagueSlug, Record<number, number>>> = {
  'chn.1': { 977: 10, 8239: 10, 21910: 7, 7521: 6, 8240: 6, 21506: 5, 18203: 5, 15515: 5, 2052: 5 },
}

/**
 * 从已完赛比分本地计算积分榜（与 scripts/fetch-espn-scores.js 的 computeStandings 同一算法）。
 * 排序：积分 → 净胜球 → 进球 → 队名。返回已按名次排序、带上 rank 的行。
 */
export function computeStandings(matches: Match[], deductions: Record<number, number> = {}): RawStanding[] {
  const byTeam = new Map<number, RawStanding>()
  const get = (id: number, name: string): RawStanding => {
    let r = byTeam.get(id)
    if (!r) {
      r = { rank: 0, teamId: id, team: name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 }
      byTeam.set(id, r)
    }
    return r
  }

  for (const m of matches) {
    if (Number.isFinite(m.home.id)) get(m.home.id, m.home.name)
    if (Number.isFinite(m.away.id)) get(m.away.id, m.away.name)
  }

  for (const m of matches) {
    if (!m.completed || m.home.score == null || m.away.score == null) continue
    if (!Number.isFinite(m.home.id) || !Number.isFinite(m.away.id)) continue
    const h = get(m.home.id, m.home.name)
    const a = get(m.away.id, m.away.name)
    h.played += 1
    a.played += 1
    h.goalsFor += m.home.score
    h.goalsAgainst += m.away.score
    a.goalsFor += m.away.score
    a.goalsAgainst += m.home.score
    if (m.home.score > m.away.score) {
      h.won += 1
      a.lost += 1
    } else if (m.home.score < m.away.score) {
      a.won += 1
      h.lost += 1
    } else {
      h.drawn += 1
      a.drawn += 1
    }
  }

  const rows = [...byTeam.values()].map((r) => {
    const deduction = deductions[r.teamId] || 0
    return {
      ...r,
      goalDiff: r.goalsFor - r.goalsAgainst,
      points: r.won * 3 + r.drawn - deduction,
      deduction: deduction || undefined,
    }
  })
  rows.sort(
    (x, y) =>
      y.points - x.points ||
      y.goalDiff - x.goalDiff ||
      y.goalsFor - x.goalsFor ||
      x.team.localeCompare(y.team),
  )
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}
