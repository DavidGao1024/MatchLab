import type { FormResult, Match } from '../types/models'

/** 某队近 limit 场形势：时间序，最近一场在最右（规格 FormDots） */
export function computeForm(matches: Match[], teamId: number, limit = 5): FormResult[] {
  const involved = matches.filter((m) => m.completed && (m.home.id === teamId || m.away.id === teamId))
  involved.sort((a, b) => b.date.localeCompare(a.date))
  const latest = involved.slice(0, limit).map((m): FormResult => {
    const isHome = m.home.id === teamId
    const gf = (isHome ? m.home.score : m.away.score) ?? 0
    const ga = (isHome ? m.away.score : m.home.score) ?? 0
    return gf > ga ? 'W' : gf < ga ? 'L' : 'D'
  })
  return latest.reverse()
}

/** 最近一个有完赛的比赛日（UTC 日期）；没有则 null（战报带回扫用） */
export function lastCompletedMatchday(matches: Match[]): string | null {
  let best: string | null = null
  for (const m of matches) {
    if (!m.completed) continue
    const d = m.date.slice(0, 10)
    if (!best || d > best) best = d
  }
  return best
}

/** 战报带选场：① 榜首参与 ② 榜二参与 ③ 剩余按开球时间从早到晚补满 4 场（规格 v1.4） */
export function selectStripMatches(dayMatches: Match[], ranked: { rank: number; teamId: number }[]): Match[] {
  const top1 = ranked.find((r) => r.rank === 1)?.teamId
  const top2 = ranked.find((r) => r.rank === 2)?.teamId
  const involves = (m: Match, id: number | undefined) => id !== undefined && (m.home.id === id || m.away.id === id)
  const picked: Match[] = []
  const take = (m: Match | undefined) => {
    if (m && !picked.includes(m)) picked.push(m)
  }
  take(dayMatches.find((m) => involves(m, top1)))
  take(dayMatches.find((m) => involves(m, top2)))
  const rest = [...dayMatches].filter((m) => !picked.includes(m)).sort((a, b) => a.date.localeCompare(b.date))
  for (const m of rest) {
    if (picked.length >= 4) break
    picked.push(m)
  }
  return picked.slice(0, 4)
}
