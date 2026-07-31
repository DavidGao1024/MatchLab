import { defineStore } from 'pinia'
import {
  SUBSCRIPTIONS_KEY, FAVORITES_KEY, USER_DATA_VERSION,
  SUBSCRIPTIONS_LIMIT,
  type Subscription, type Favorite, type UserData, type FavoritesData,
} from '../types/user-data'
import { migrateUserData, migrateFavorites } from '../utils/migrate'

interface State {
  subscriptions: Subscription[]
  favorites: { teams: Favorite[]; players: Favorite[] }
  initialized: boolean
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

export const useUserDataStore = defineStore('userData', {
  state: (): State => ({
    subscriptions: [],
    favorites: { teams: [], players: [] },
    initialized: false,
  }),
  actions: {
    async init() {
      if (this.initialized) return
      this.hydrate()
      window.addEventListener('storage', this.onStorageEvent)
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
      if (persistTimer) clearTimeout(persistTimer)
      persistTimer = setTimeout(() => this.persist(), 200)
    },
    persist() {
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
  },
})
