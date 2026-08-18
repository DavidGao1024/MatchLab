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
  record?: {
    wins: number
    draws: number
    losses: number
    played: number
    points: number
    goalDiff: number
    goalsFor: number
    goalsAgainst: number
    summary?: string
  }
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
  deduction?: number
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

// ===== Phase 4：球员 / 排行榜 / xG 球员 =====

/** players/index.json 列表项（轻量，~100KB/联赛） */
export interface PlayerIndexEntry {
  id: number
  name: string
  teamId: number
  position: string // GK / D / M / F
  age: number | null
  goals: number | null
  assists: number | null
  team: string
  citizenship?: string | null
  flag?: string | null
}

export interface PlayersIndexFile {
  source: string
  updateTime: string
  league: string
  season: string
  count: number
  players: PlayerIndexEntry[]
}

/** players/{id}.json 球员档案 stats 4 分类 */
export interface PlayerStats {
  offensive?: Record<string, number | null>
  defensive?: Record<string, number | null>
  general?: Record<string, number | null>
  goalKeeping?: Record<string, number | null>
}

export interface PlayerFile {
  source: string
  updateTime: string
  league: string
  season: string
  id: number
  firstName?: string
  lastName?: string
  displayName: string
  shortName?: string
  age: number | null
  height: number | null
  weight: number | null
  dateOfBirth?: string
  jersey: number | null
  position: string
  positionLabel?: string
  teamId: number
  citizenship?: string | null
  flag?: string | null
  stats: PlayerStats
}

/** leaders.json 12 项排行榜 */
export interface LeaderEntry {
  rank: number
  value: number
  displayValue: string
  athleteId: number
  athleteName: string
  teamId: number
  teamName: string
}

export interface LeaderCategory {
  name: string
  displayName: string
  abbreviation: string
  entries: LeaderEntry[]
}

export interface LeadersFile {
  source: string
  updateTime: string
  league: string
  season: string
  categories: LeaderCategory[]
}

/** xg/players.json Understat 球员逐季汇总（不含 history） */
export interface XgPlayerEntry {
  id: string
  name: string
  team: string
  position: string
  games: number
  minutes: number
  goals: number
  npg: number
  assists: number
  xG: number
  xA: number
  npxG: number
  xGChain: number
  xGBuildup: number
  shots: number
  keyPasses: number
}

export interface XgPlayersFile {
  source: string
  league: string
  understatLeague: string
  season: string
  updateTime: string
  count: number
  players: XgPlayerEntry[]
}

/** Understat 球员逐场 history（Phase 6 xG 趋势图） */
export interface XgPlayerMatch {
  date: string
  homeAway: string // 'h' / 'a'
  result: string // 'w' / 'd' / 'l'
  scored: number | null
  missed: number | null
  xG: number | null
  xA: number | null
  npxG: number | null
  xGChain: number | null
  xGBuildup: number | null
  ppda?: { att: number; def: number }
  ppdaAllowed?: { att: number; def: number }
  deep?: number
  deepAllowed?: number
  kp?: number // key passes
  shots?: number
  position?: string
  team?: string
  opponent?: string
}

export interface XgPlayerHistoryFile {
  source: string
  league: string
  understatLeague: string
  season: string
  understatPlayerId: string
  updateTime: string
  history: XgPlayerMatch[]
}

/** ESPN core 联赛赛季清单 */
export interface SeasonEntry {
  year: number
  displayName: string
  startDate?: string
  endDate?: string
}

export interface SeasonsFile {
  source: string
  league: string
  updateTime: string
  count: number
  seasons: SeasonEntry[]
}

/** transfers.json 球员转会记录（ESPN athletes/{id}/transactions） */
export interface TransferEntry {
  playerId: number
  playerName: string | null
  date: string | null
  fromTeamId: number | null
  fromTeam: string | null
  toTeamId: number | null
  toTeam: string | null
  type: string | null
  amount: number | null
  displayAmount: string | null
}

export interface TransfersFile {
  source: string
  updateTime: string
  league: string
  playersScanned: number
  count: number
  transfers: TransferEntry[]
}
