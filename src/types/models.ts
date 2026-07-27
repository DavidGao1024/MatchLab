import type { LeagueSlug, Zone } from '../utils/constants'

export interface LeagueInfo {
  slug: LeagueSlug
  name: string
  nameZh: string
  country: string
  color: string
  understatSlug: string
  season: string
  teams: number
  players: number
}

export interface Team {
  id: number
  name: string
  shortDisplayName: string
  abbreviation: string
  color: string
  alternateColor: string
  logo: string
  logoDark: string
}

export type FormResult = 'W' | 'D' | 'L'

export interface StandingRow {
  rank: number
  teamId: number
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  zone: Zone | null
  /** 近 5 场，时间序，最近一场在最右（规格 FormDots） */
  form: FormResult[]
  xG?: number
  xGA?: number
  xPts?: number
}

export type MatchStatus = 'pre' | 'in' | 'post'

export interface MatchTeam {
  id: number
  name: string
  abbreviation: string
  logo: string
  score: number | null
  winner: boolean | null
}

export interface Match {
  eventId: string
  /** UTC ISO 8601，如 2025-08-16T14:00Z */
  date: string
  status: MatchStatus
  completed: boolean
  clock?: string
  venue: string
  home: MatchTeam
  away: MatchTeam
}

export interface XgRow {
  team: string
  xG: number
  xGA: number
  xpts: number
}

/** 按 UTC 日期分组的比赛日（规格：分组用数据日期，全球一致） */
export interface DayGroup {
  utcDate: string
  matches: Match[]
}
