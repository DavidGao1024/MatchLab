import { defineStore } from 'pinia'
import {
  SUBSCRIPTIONS_KEY, FAVORITES_KEY,
  type Subscription, type Favorite,
} from '../types/user-data'
import { migrateUserData, migrateFavorites } from '../utils/migrate'

interface State {
  subscriptions: Subscription[]
  favorites: { teams: Favorite[]; players: Favorite[] }
  initialized: boolean
}

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
      this.initialized = true
    },
    hydrate() {
      try {
        const rawSubs = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) ?? 'null')
        const migratedSubs = migrateUserData(rawSubs)
        this.subscriptions = migratedSubs.items
        const rawFav = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? 'null')
        const migratedFav = migrateFavorites(rawFav)
        this.favorites = { teams: migratedFav.teams, players: migratedFav.players }
      } catch {
        this.subscriptions = []
        this.favorites = { teams: [], players: [] }
      }
    },
  },
})
