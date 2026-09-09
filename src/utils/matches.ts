import type { FormResult, Match } from '../types/models'
import { beijingDay, shiftBjDay } from './format'
import type { LeagueSlug } from './constants'
import { LEAGUE_SLUGS } from './constants'

export interface FormDetail {
  result: FormResult
  opponentId: number
  gf: number
  ga: number
}

/** 近 limit 场形势带对手与比分（时间序，最近一场在最右）——FormDots 悬停提示用 */
export function formDetails(matches: Match[], teamId: number, limit = 5): FormDetail[] {
  const involved = matches.filter((m) => m.completed && (m.home.id === teamId || m.away.id === teamId))
  involved.sort((a, b) => b.date.localeCompare(a.date))
  const latest = involved.slice(0, limit).map((m): FormDetail => {
    const isHome = m.home.id === teamId
    const gf = (isHome ? m.home.score : m.away.score) ?? 0
    const ga = (isHome ? m.away.score : m.home.score) ?? 0
    return { result: gf > ga ? 'W' : gf < ga ? 'L' : 'D', opponentId: isHome ? m.away.id : m.home.id, gf, ga }
  })
  return latest.reverse()
}

/** 某队近 limit 场形势：时间序，最近一场在最右（规格 FormDots） */
export function computeForm(matches: Match[], teamId: number, limit = 5): FormResult[] {
  return formDetails(matches, teamId, limit).map((d) => d.result)
}

// ===== 战报带 v2（跨联赛·昨日优先回看 7 天，规格 v2.0）=====

export interface StripEntry {
  match: Match
  league: LeagueSlug
}

export interface StripDay {
  day: string // 命中的北京日历日 'YYYY-MM-DD'
  entries: StripEntry[] // 该日全部完赛条目（未筛选）
}

export interface StripPick extends StripEntry {
  featured: boolean // 涉及本联赛榜首
}

/** 昨日（todayBj-1）起回看 lookback 个北京日，第一个有完赛的日子；全无 → null */
export function findStripDay(entries: StripEntry[], todayBj: string, lookback = 7): StripDay | null {
  const byDay = new Map<string, StripEntry[]>()
  for (const e of entries) {
    if (!e.match.completed) continue
    const d = beijingDay(e.match.date)
    const list = byDay.get(d)
    if (list) list.push(e)
    else byDay.set(d, [e])
  }
  for (let i = 1; i <= lookback; i++) {
    const day = shiftBjDay(todayBj, -i)
    const list = byDay.get(day)
    if (list?.length) return { day, entries: list }
  }
  return null
}

/** 选场：LEAGUE_SLUGS 固定联赛序轮转；组内排序 榜首→榜二→开球时间；cap 封顶 */
export function pickCrossLeagueStrip(
  dayEntries: StripEntry[],
  rankedByLeague: Partial<Record<LeagueSlug, { rank: number; teamId: number }[]>>,
  cap = 4,
): StripPick[] {
  const involves = (m: Match, id: number | undefined) => id !== undefined && (m.home.id === id || m.away.id === id)
  const groups = new Map<LeagueSlug, StripPick[]>()
  for (const slug of LEAGUE_SLUGS) {
    const ranked = rankedByLeague[slug] ?? []
    const top1 = ranked.find((r) => r.rank === 1)?.teamId
    const top2 = ranked.find((r) => r.rank === 2)?.teamId
    const list = dayEntries
      .filter((e) => e.league === slug)
      .map((e): StripPick => ({ ...e, featured: involves(e.match, top1) }))
    // 组内排序键：榜首 0 / 榜二 1 / 其余 2，同键按开球时间升序
    list.sort((a, b) => {
      const ka = involves(a.match, top1) ? 0 : involves(a.match, top2) ? 1 : 2
      const kb = involves(b.match, top1) ? 0 : involves(b.match, top2) ? 1 : 2
      return ka - kb || a.match.date.localeCompare(b.match.date)
    })
    groups.set(slug, list)
  }
  const picked: StripPick[] = []
  for (let round = 0; picked.length < cap; round++) {
    let moved = false
    for (const slug of LEAGUE_SLUGS) {
      const it = groups.get(slug)?.[round]
      if (it) {
        picked.push(it)
        moved = true
        if (picked.length >= cap) break
      }
    }
    if (!moved) break
  }
  return picked.slice(0, cap)
}
