import { defineStore } from 'pinia'
import {
  SUBSCRIPTIONS_KEY, FAVORITES_KEY, USER_DATA_VERSION,
  SUBSCRIPTIONS_LIMIT, FAVORITES_LIMIT,
  type Subscription, type Favorite, type UserData, type FavoritesData,
} from '../types/user-data'
import { migrateUserData, migrateFavorites } from '../utils/migrate'

interface State {
  subscriptions: Subscription[]
  favorites: { teams: Favorite[]; players: Favorite[] }
  initialized: boolean
  /** localStorage 不可用（隐私模式/配额满）→ 所有按钮 disabled 防止无效操作 */
  readOnly: boolean
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

/** 探测 localStorage 是否可写（隐私模式/配额满时 setItem 抛错） */
function isLocalStorageWritable(): boolean {
  try {
    const k = 'matchlab:storage-test'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export const useUserDataStore = defineStore('userData', {
  state: (): State => ({
    subscriptions: [],
    favorites: { teams: [], players: [] },
    initialized: false,
    readOnly: false,
  }),
  actions: {
    async init() {
      if (this.initialized) return
      this.hydrate()
      this.readOnly = !isLocalStorageWritable()
      if (!this.readOnly) {
        window.addEventListener('storage', this.onStorageEvent)
      }
      this.initialized = true
    },
    hydrate() {
      try {
        const rawSubs = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) ?? 'null')
        this.subscriptions = migrateUserData(rawSubs).items
        const rawFav = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? 'null')
        const m = migrateFavorites(rawFav)
        this.favorites = { teams: m.teams, players: m.players }
      } catch {
        this.subscriptions = []
        this.favorites = { teams: [], players: [] }
      }
    },
    schedulePersist() {
      if (this.readOnly) return
      if (persistTimer) clearTimeout(persistTimer)
      persistTimer = setTimeout(() => this.persist(), 200)
    },
    persist() {
      if (this.readOnly) return
      const subsData: UserData = { version: USER_DATA_VERSION, items: this.subscriptions }
      localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subsData))
      const favData: FavoritesData = {
        version: USER_DATA_VERSION,
        teams: this.favorites.teams,
        players: this.favorites.players,
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favData))
    },
    onStorageEvent(e: StorageEvent) {
      if (e.key === SUBSCRIPTIONS_KEY || e.key === FAVORITES_KEY) {
        this.hydrate()
      }
    },
    addSubscription(input: { league: Subscription['league']; teamId: number; teamName: string }) {
      if (this.subscriptions.some((s) => s.teamId === input.teamId)) return
      if (this.subscriptions.length >= SUBSCRIPTIONS_LIMIT) {
        throw new Error(`订阅上限 ${SUBSCRIPTIONS_LIMIT} 队`)
      }
      this.subscriptions.push({ ...input, addedAt: new Date().toISOString() })
      this.schedulePersist()
    },
    removeSubscription(teamId: number) {
      this.subscriptions = this.subscriptions.filter((s) => s.teamId !== teamId)
      this.schedulePersist()
    },
    isSubscribed(teamId: number): boolean {
      return this.subscriptions.some((s) => s.teamId === teamId)
    },
    addFavorite(type: 'team' | 'player', input: { league: Subscription['league']; teamId?: number; athleteId?: number; name: string }) {
      const total = this.favorites.teams.length + this.favorites.players.length
      if (total >= FAVORITES_LIMIT) {
        throw new Error(`收藏上限 ${FAVORITES_LIMIT} 项`)
      }
      if (type === 'team') {
        const list = this.favorites.teams
        if (input.teamId !== undefined && list.some((f) => f.teamId === input.teamId)) return
        const fav: Favorite = { league: input.league, name: input.name, addedAt: new Date().toISOString() }
        if (input.teamId !== undefined) fav.teamId = input.teamId
        list.push(fav)
      } else {
        const list = this.favorites.players
        if (input.athleteId !== undefined && list.some((f) => f.athleteId === input.athleteId)) return
        const fav: Favorite = { league: input.league, name: input.name, addedAt: new Date().toISOString() }
        if (input.athleteId !== undefined) fav.athleteId = input.athleteId
        list.push(fav)
      }
      this.schedulePersist()
    },
    removeFavorite(type: 'team' | 'player', id: number) {
      if (type === 'team') {
        this.favorites.teams = this.favorites.teams.filter((f) => f.teamId !== id)
      } else {
        this.favorites.players = this.favorites.players.filter((f) => f.athleteId !== id)
      }
      this.schedulePersist()
    },
    toggleFavorite(type: 'team' | 'player', id: number, name: string, league: Subscription['league']) {
      const list = type === 'team' ? this.favorites.teams : this.favorites.players
      const exists = type === 'team'
        ? list.some((f) => f.teamId === id)
        : list.some((f) => f.athleteId === id)
      if (exists) {
        this.removeFavorite(type, id)
      } else {
        const input = type === 'team'
          ? { league, name, teamId: id }
          : { league, name, athleteId: id }
        this.addFavorite(type, input)
      }
    },
    isFavorite(type: 'team' | 'player', id: number): boolean {
      if (type === 'team') {
        return this.favorites.teams.some((f) => f.teamId === id)
      }
      return this.favorites.players.some((f) => f.athleteId === id)
    },
  },
})
