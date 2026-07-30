import type { LeagueSlug, Zone } from '../utils/constants'

export interface LeagueInfo {
  slug: LeagueSlug
  name: string
  nameZh: string
  country: string
  color: string
  understatSlug: string | null
  season: string
  seasonType?: 'european' | 'calendar'
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
  venue?: { name: string; city: string; country: string }
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
  deduction?: number
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

// ===== Phase 4：球员 / 排行榜 / xG 球员 =====

import type {
  PlayerFile,
  PlayerIndexEntry,
  LeaderCategory,
  XgPlayerEntry,
} from './static'

/** 球员列表项（业务模型，由 PlayerIndexEntry 加 i18n 友好的 team 名） */
export interface PlayerSummary {
  id: number
  name: string
  teamId: number
  team: string
  position: string
  age: number | null
  goals: number | null
  assists: number | null
}

/** 球员档案（业务模型，含 i18n 友好的姓名/队名） */
export interface PlayerProfile {
  id: number
  displayName: string
  shortName: string
  firstName: string
  lastName: string
  age: number | null
  height: number | null
  weight: number | null
  dateOfBirth?: string
  jersey: number | null
  position: string
  positionLabel: string
  teamId: number
  stats: PlayerFile['stats']
}

/** 排行榜分类（业务模型） */
export interface LeaderBoard extends LeaderCategory {}

/** xG 球员（业务模型） */
export type XgPlayer = XgPlayerEntry

/** 球员列表项 + 球队信息（SearchBar/PlayersView 用） */
export interface PlayerSearchHit extends PlayerIndexEntry {
  score?: number
}

/** 按 UTC 日期分组的比赛日（规格：分组用数据日期，全球一致） */
export interface DayGroup {
  utcDate: string
  matches: Match[]
}

// ===== Match Summary（Phase 3 弹窗归一化模型）=====

export type MatchEventType =
  | 'goal'
  | 'ownGoal'
  | 'yellow'
  | 'red'
  | 'secondYellow'
  | 'substitution'
  | 'penalty'
  | 'penaltyMissed'

export interface MatchEvent {
  id: string
  type: MatchEventType
  /** 主客归属：按 ESPN team.id 归到得分方（乌龙球同理，已确认） */
  side: 'home' | 'away'
  minute: number
  /** 进球/黄红牌球员名；换人：出局球员名 */
  primaryName: string
  /** 换入球员名（仅 substitution）/ 进球助攻者（可选） */
  secondaryName?: string
  /** 进球比分快照，如 "1-0" */
  scoreSnapshot?: string
}

export interface LineupPlayer {
  id: number
  jersey?: string
  name: string
  shortName: string
  position: string // GK / D / M / F / 未知 fallback
  /** ESPN 原始位置缩写（LB / CD-L / AM-R 等），用于同排左右排序 */
  positionAbbr?: string
  /** ESPN 原始位置全名（Left Midfielder 等），用于兜底识别 midfielder/defender/forward */
  positionName?: string
  starter: boolean
  /** 阵型分层索引：0=后卫线 1=中场线 2=前锋线（GK 不在此体系） */
  lineIndex?: number
  /** 同一行内的横向位置序号（0 起） */
  rowIndex?: number
  /** 同一行内总位置数（用于 x 均分） */
  lineTotal?: number
  /** 在足球场上的 X 坐标百分比（0-100），由 useEspanFetch 算好 */
  x?: number
  /** 在足球场上的 Y 坐标百分比（0-100），GK 在底部约 88%，前锋在顶部约 16% */
  y?: number
}

export interface MatchLineup {
  teamId: number
  formation?: string
  starters: LineupPlayer[]
  bench: LineupPlayer[]
  coachName?: string
}

export interface StatRow {
  label: string
  home: string | number
  away: string | number
  /** 占比类（如控球率）true 时按主客比例画条 */
  isPercent?: boolean
}

export interface H2HEntry {
  date: string
  homeName: string
  homeScore: number | null
  awayName: string
  awayScore: number | null
  venue?: string
}

export interface MatchSummary {
  /** 主客 lineup */
  lineups: { home: MatchLineup | null; away: MatchLineup | null }
  events: MatchEvent[]
  stats: StatRow[]
  h2h: H2HEntry[]
}
