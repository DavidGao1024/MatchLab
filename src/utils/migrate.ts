import { USER_DATA_VERSION, type UserData, type FavoritesData, type Subscription, type Favorite } from '../types/user-data'

export function migrateUserData(raw: any | null): UserData {
  if (!raw || typeof raw !== 'object') return { version: USER_DATA_VERSION, items: [] }
  const items = Array.isArray(raw.items) ? raw.items.filter(isSubscription) : []
  return { version: USER_DATA_VERSION, items }
}

export function migrateFavorites(raw: any | null): FavoritesData {
  if (!raw || typeof raw !== 'object') return { version: USER_DATA_VERSION, teams: [], players: [] }
  const teams = Array.isArray(raw.teams) ? raw.teams.filter(isFavorite).map(normalizeFavorite) : []
  const players = Array.isArray(raw.players) ? raw.players.filter(isFavorite).map(normalizeFavorite) : []
  return { version: USER_DATA_VERSION, teams, players }
}

function isSubscription(x: any): x is Subscription {
  return x && typeof x.league === 'string' && typeof x.teamId === 'number' && typeof x.teamName === 'string'
}

function isFavorite(x: any): x is Favorite {
  return x && typeof x.league === 'string' && (typeof x.name === 'string' || typeof x.teamName === 'string')
}

function normalizeFavorite(x: any): Favorite {
  const out: Favorite = { league: x.league, name: x.name ?? x.teamName, addedAt: x.addedAt }
  if (typeof x.teamId === 'number') out.teamId = x.teamId
  if (typeof x.athleteId === 'number') out.athleteId = x.athleteId
  return out
}
