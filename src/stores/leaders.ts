import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import type { LeadersFile } from '../types/static'
import type { LeagueSlug } from '../utils/constants'

const TTL = 60 * 60 * 1000 // 排行榜 1h

export const useLeadersStore = defineStore('leaders', {
  state: () => ({
    bundles: {} as Partial<Record<LeagueSlug, LeadersFile>>,
    loading: {} as Partial<Record<LeagueSlug, boolean>>,
  }),
  actions: {
    async ensure(league: LeagueSlug, season: string): Promise<LeadersFile> {
      const hit = this.bundles[league]
      if (hit) return hit
      this.loading[league] = true
      try {
        const f = await fetchJsonCached<LeadersFile>(`data/${league}/leaders.json`, TTL, season)
        this.bundles[league] = f
        return f
      } finally {
        this.loading[league] = false
      }
    },
    /** 按 category.name 取条目；找不到返回 null */
    byName(league: LeagueSlug, catName: string) {
      const b = this.bundles[league]
      if (!b) return null
      return b.categories.find((c) => c.name === catName) ?? null
    },
  },
})
