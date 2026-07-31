import type { LeagueSlug } from '../utils/constants'

export const USER_DATA_VERSION = 1

export interface Subscription {
  league: LeagueSlug
  teamId: number
  teamName: string
  addedAt: string
}

export interface Favorite {
  league: LeagueSlug
  teamId?: number
  athleteId?: number
  name: string
  addedAt: string
}

export interface UserData {
  version: number
  items: Subscription[]
}

export interface FavoritesData {
  version: number
  teams: Favorite[]
  players: Favorite[]
}

export const SUBSCRIPTIONS_KEY = 'matchlab:subscriptions'
export const FAVORITES_KEY = 'matchlab:favorites'
export const SUBSCRIPTIONS_LIMIT = 3
export const FAVORITES_LIMIT = 50
