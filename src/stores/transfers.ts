import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import type { TransfersFile, TransferEntry } from '../types/static'
import type { LeagueSlug } from '../utils/constants'

const TTL = 24 * 60 * 60 * 1000 // 转会变化慢（转会窗口期间按周变），24h 缓存足够

export const useTransfersStore = defineStore('transfers', {
  state: () => ({
    bundles: {} as Partial<Record<LeagueSlug, TransferEntry[]>>,
  }),
  actions: {
    /** 懒加载联赛转会汇总，幂等 */
    async ensure(league: LeagueSlug): Promise<TransferEntry[]> {
      if (this.bundles[league]) return this.bundles[league]!
      const f = await fetchJsonCached<TransfersFile>(`data/${league}/transfers.json`, TTL, 'transfer')
      this.bundles[league] = f.transfers || []
      return this.bundles[league]!
    },
    /** 某球员的全部转会记录 */
    forPlayer(league: LeagueSlug, playerId: number): TransferEntry[] {
      return (this.bundles[league] || []).filter((t) => t.playerId === playerId)
    },
  },
})