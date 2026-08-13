import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import type { Team } from '../types/models'
import type { MetaFile, TeamsFile } from '../types/static'
import type { LeagueSlug } from '../utils/constants'

const TTL = 24 * 60 * 60 * 1000 // Actions 每日刷新，24h 缓存足够

export interface LeagueBundle {
  meta: MetaFile
  teams: Team[]
  byId: Map<number, Team>
}

export const useTeamsStore = defineStore('teams', {
  state: () => ({
    bundles: {} as Partial<Record<LeagueSlug, LeagueBundle>>,
  }),
  actions: {
    async ensure(league: LeagueSlug, opts: { forceFresh?: boolean } = {}): Promise<LeagueBundle> {
      // forceFresh 时跳过内存缓存检查（照 leaders 模式：否则切走再切回直接返回旧内存，永不重拉）。
      // 用途：订阅卡/收藏夹等"队色队徽可见"入口取最新，纠偏后老访客刷新即见效，不等 24h TTL。
      if (!opts.forceFresh) {
        const hit = this.bundles[league]
        if (hit) return hit
      }
      const [metaF, teamsF] = await Promise.all([
        fetchJsonCached<MetaFile>(`data/${league}/meta.json`, TTL, 'na', opts),
        fetchJsonCached<TeamsFile>(`data/${league}/teams.json`, TTL, 'na', opts),
      ])
      const teams: Team[] = teamsF.teams.map((t) => ({
        id: t.id,
        name: t.displayName,
        shortDisplayName: t.shortDisplayName,
        abbreviation: t.abbreviation,
        color: t.color,
        alternateColor: t.alternateColor,
        logo: t.logo,
        logoDark: t.logoDark,
        venue: t.venue,
        record: t.record,
      }))
      const bundle: LeagueBundle = { meta: metaF, teams, byId: new Map(teams.map((t) => [t.id, t])) }
      this.bundles[league] = bundle
      return bundle
    },
    teamById(league: LeagueSlug, id: number): Team | undefined {
      return this.bundles[league]?.byId.get(id)
    },
  },
})
