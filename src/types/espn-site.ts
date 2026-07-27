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
