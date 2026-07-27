import type { LeagueInfo, Match } from './models'

export interface LeaguesFile {
  updateTime: string
  season: string
  count: number
  leagues: LeagueInfo[]
}

export interface MetaFile {
  source: string
  updateTime: string
  league: string
  name: string
  displayName: string
  slug: string
  color: string
  nameZh: string
  country: { name: string; flag: string }
  season: { year: number; displayName: string }
}

export interface RawTeam {
  id: number
  displayName: string
  shortDisplayName: string
  abbreviation: string
  color: string
  alternateColor: string
  logo: string
  logoDark: string
  venue: { name: string; city: string; country: string }
}

export interface TeamsFile {
  source: string
  updateTime: string
  league: string
  season: string
  count: number
  teams: RawTeam[]
}

export interface RawStanding {
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
}

export interface StandingsFile {
  source: string
  updateTime: string
  league: string
  season: string
  matchesCounted: number
  count: number
  standings: RawStanding[]
}

export interface MatchesFile {
  source: string
  updateTime: string
  league: string
  month: string
  count: number
  matches: Match[]
}

/** Understat 原始行——只声明要用的字段，history 等大宗字段不建模（规格规则 7 白名单） */
export interface RawXgStanding {
  rank: number
  teamId: string
  team: string
  xG: number
  xGA: number
  xpts: number
  history?: unknown
}

export interface XgFile {
  source: string
  league: string
  understatLeague: string
  season: string
  updateTime: string
  standings: RawXgStanding[]
}

export interface TeamNameMapFile {
  description: string
  updateTime: string
  count: number
  /** Understat 队名 → ESPN 队名，26 条 */
  map: Record<string, string>
}
