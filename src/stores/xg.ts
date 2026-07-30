import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import type { XgPlayersFile } from '../types/static'
import type { XgPlayer } from '../types/models'
import type { LeagueSlug } from '../utils/constants'

const TTL = 24 * 60 * 60 * 1000 // xG 24h

function deAcc(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function norm(s: string): string {
  return deAcc(s).toLowerCase().trim()
}

export const useXgStore = defineStore('xg', {
  state: () => ({
    bundles: {} as Partial<Record<LeagueSlug, XgPlayer[]>>,
    byLower: {} as Partial<Record<LeagueSlug, Map<string, XgPlayer>>>,
    byDeAccLower: {} as Partial<Record<LeagueSlug, Map<string, XgPlayer>>>,
    loading: {} as Partial<Record<LeagueSlug, boolean>>,
  }),
  actions: {
    /** 加载 xg/players.json (~2MB，按需)；幂等 */
    async ensure(league: LeagueSlug, season: string): Promise<XgPlayer[]> {
      const hit = this.bundles[league]
      if (hit) return hit
      this.loading[league] = true
      try {
        const f = await fetchJsonCached<XgPlayersFile>(`data/${league}/xg/players.json`, TTL, season)
        const list = f.players
        const lower = new Map<string, XgPlayer>()
        const deAccLower = new Map<string, XgPlayer>()
        for (const p of list) {
          const l = p.name.toLowerCase()
          if (!lower.has(l)) lower.set(l, p)
          const dl = norm(p.name)
          if (!deAccLower.has(dl)) deAccLower.set(dl, p)
        }
        this.bundles[league] = list
        this.byLower[league] = lower
        this.byDeAccLower[league] = deAccLower
        return list
      } finally {
        this.loading[league] = false
      }
    },
    /** 按 ESPN displayName 查 Understat xG 行；先 lowercase 精确，再 deAccent fuzzy；不命中返回 null */
    byName(league: LeagueSlug, espnName: string): XgPlayer | null {
      const l = this.byLower[league]
      if (l) {
        const hit = l.get(espnName.toLowerCase())
        if (hit) return hit
      }
      const dl = this.byDeAccLower[league]
      if (dl) {
        const hit = dl.get(norm(espnName))
        if (hit) return hit
      }
      return null
    },
  },
})
