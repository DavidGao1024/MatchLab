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
    async ensure(league: LeagueSlug): Promise<LeagueBundle> {
      const hit = this.bundles[league]
      if (hit) return hit
      const [metaF, teamsF] = await Promise.all([
        fetchJsonCached<MetaFile>(`data/${league}/meta.json`, TTL),
        fetchJsonCached<TeamsFile>(`data/${league}/teams.json`, TTL),
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
