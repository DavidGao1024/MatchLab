export interface EspnTeamRef {
  id: string
  displayName: string
  abbreviation: string
  logo?: string
}

export interface EspnCompetitor {
  homeAway: 'home' | 'away'
  id: string
  score?: string
  winner?: boolean
  team: EspnTeamRef
}

export interface EspnEvent {
  id: string
  date: string
  status: {
    clock?: number
    displayClock?: string
    type: { id: string; state: 'pre' | 'in' | 'post'; completed?: boolean }
  }
  competitions: {
    venue?: { fullName?: string }
    competitors: EspnCompetitor[]
  }[]
}

export interface EspnScoreboard {
  events?: EspnEvent[]
}

// ===== summary 端点（阵容/事件/统计/H2H）=====

export interface EspnRosterPlayer {
  jersey?: string
  starter?: boolean
  athlete: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
    shortName?: string
    headshot?: string
  }
  position?: {
    abbreviation?: string // G / D / CD-L / LB / AM / CM-L / F / CF-R 等
    name?: string // Goalkeeper / Center Left Defender / ...
    displayName?: string
  }
  stats?: { name?: string; abbreviation?: string; value?: string }[]
}

export interface EspnRoster {
  /** 阵型字符串，如 "3-5-2" */
  formation?: string
  /** 阵型高层数字（如 3 后卫 5 中场 2 前锋），部分赛事返回字符串 */
  formationPieces?: string | number[]
  team?: EspnTeamRef
  roster?: EspnRosterPlayer[]
  coach?: { id?: string; firstName?: string; lastName?: string; displayName?: string }
}

export type EspnKeyEventType =
  | 'goal'
  | 'own-goal'
  | 'yellow-card'
  | 'red-card'
  | 'second-yellow' // ESPN 通常仍归在 yellow-card 下，需 text 解析
  | 'substitution'
  | 'var-decision'
  | 'penalty'
  | 'penalty-missed'
  | string

export interface EspnKeyEvent {
  id?: string
  type?: EspnKeyEventType
  text?: string
  shortText?: string
  /** "23'" 等显示串 */
  clock?: { displayValue?: string }
  period?: { number?: number }
  /** 所属球队（乌龙球时通常标得分方 team.id） */
  team?: { id: string }
  /** 参与者：进球 [射手, 助攻者]；换人 [入局, 出局]；黄/红牌 [被罚] */
  participants?: { athlete?: { id?: string; displayName?: string } }[]
  /** 进球比分快照 */
  homeScore?: string
  awayScore?: string
  scoringTeam?: 'home' | 'away'
}

export interface EspnBoxscoreTeam {
  team: EspnTeamRef
  statistics?: { name?: string; abbreviation?: string; label?: string; value?: string; displayValue?: string }[]
}

export interface EspnBoxscore {
  teams?: EspnBoxscoreTeam[]
}

export interface EspnH2HGame {
  date?: string
  competitions?: {
    competitors: EspnCompetitor[]
    venue?: { fullName?: string }
  }[]
}

export interface EspnSummary {
  boxscore?: EspnBoxscore
  rosters?: EspnRoster[]
  keyEvents?: EspnKeyEvent[]
  headToHeadGames?: EspnH2HGame[]
}
