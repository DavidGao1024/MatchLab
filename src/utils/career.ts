import type { TransferEntry } from '../types/static'

/** 球员履历区间：某队效力的起止年份，to=null 表示"至今" */
export interface CareerStage {
  teamId: number | null
  team: string | null
  from: number
  to: number | null
}

/**
 * 把球员的转会记录整合成「效力球队 + 年份区间」。
 * 同队的多次记录（含租借）合并为一个区间（取最早 ~ 最晚年份）；
 * 最新一笔转会的转入队 to 置 null（= 至今）。
 */
export function buildCareer(transfers: TransferEntry[]): CareerStage[] {
  const sorted = transfers
    .filter((t) => t.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))

  const byTeam = new Map<number, CareerStage>()
  const touch = (teamId: number | null, team: string | null, year: number) => {
    if (teamId == null) return
    if (!byTeam.has(teamId)) {
      byTeam.set(teamId, { teamId, team, from: year, to: year })
      return
    }
    const e = byTeam.get(teamId)!
    if (year < e.from) e.from = year
    if (e.to != null && year > e.to) e.to = year
    if (!e.team && team) e.team = team
  }

  for (const t of sorted) {
    const year = Number(String(t.date).slice(0, 4))
    if (!year) continue
    touch(t.fromTeamId, t.fromTeam, year)
    touch(t.toTeamId, t.toTeam, year)
  }

  // 最新一笔转会的转入队 = 当前队，to 置 null（至今）
  const last = sorted[sorted.length - 1]
  if (last && last.toTeamId != null && byTeam.has(last.toTeamId)) {
    byTeam.get(last.toTeamId)!.to = null
  }

  return [...byTeam.values()].sort((a, b) => a.from - b.from)
}