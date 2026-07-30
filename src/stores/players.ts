import { defineStore } from 'pinia'
import MiniSearch from 'minisearch'
import { fetchJsonCached } from '../composables/useJsonFetch'
import type { PlayerFile, PlayersIndexFile } from '../types/static'
import type { PlayerProfile, PlayerSummary } from '../types/models'
import type { LeagueSlug } from '../utils/constants'

const INDEX_TTL = 60 * 60 * 1000 // 球员列表 1h
const PROFILE_TTL = 24 * 60 * 60 * 1000 // 球员档案 24h

/** MiniSearch 文档：PlayerSummary + string id（MiniSearch 要求 id 为 string） */
interface SearchDoc {
  id: string
  name: string
  team: string
  teamId: number
  position: string
  age: number | null
  goals: number | null
  assists: number | null
}

function toSummary(p: PlayersIndexFile['players'][number]): PlayerSummary {
  return {
    id: p.id,
    name: p.name,
    teamId: p.teamId,
    team: p.team,
    position: p.position,
    age: p.age,
    goals: p.goals,
    assists: p.assists,
  }
}

function toProfile(f: PlayerFile): PlayerProfile {
  return {
    id: f.id,
    displayName: f.displayName,
    shortName: f.shortName ?? f.displayName,
    firstName: f.firstName ?? '',
    lastName: f.lastName ?? '',
    age: f.age,
    height: f.height,
    weight: f.weight,
    dateOfBirth: f.dateOfBirth,
    jersey: f.jersey,
    position: f.position,
    positionLabel: f.positionLabel ?? f.position,
    teamId: f.teamId,
    stats: f.stats,
  }
}

export const usePlayersStore = defineStore('players', {
  state: () => ({
    indexes: {} as Partial<Record<LeagueSlug, PlayerSummary[]>>,
    searchIdx: {} as Partial<Record<LeagueSlug, MiniSearch<SearchDoc>>>,
    profiles: {} as Record<string, PlayerProfile>,
    loadingIdx: {} as Partial<Record<LeagueSlug, boolean>>,
    loadingProfile: {} as Record<string, boolean>,
  }),
  actions: {
    /** 加载联赛球员 index 并构建 MiniSearch 索引；幂等 + 内存命中 */
    async ensureIndex(league: LeagueSlug, season: string): Promise<PlayerSummary[]> {
      const hit = this.indexes[league]
      if (hit) return hit
      this.loadingIdx[league] = true
      try {
        const f = await fetchJsonCached<PlayersIndexFile>(`data/${league}/players/index.json`, INDEX_TTL, season)
        const list = f.players.map(toSummary)
        const ms = new MiniSearch<SearchDoc>({
          fields: ['name', 'team'],
          storeFields: ['id', 'name', 'teamId', 'team', 'position', 'age', 'goals', 'assists'],
          searchOptions: { prefix: true, fuzzy: 0.2, boost: { name: 2 }, combineWith: 'AND' },
        })
        ms.addAll(
          list.map((p) => ({
            id: String(p.id),
            name: p.name,
            team: p.team,
            teamId: p.teamId,
            position: p.position,
            age: p.age,
            goals: p.goals,
            assists: p.assists,
          })),
        )
        this.indexes[league] = list
        this.searchIdx[league] = ms
        return list
      } finally {
        this.loadingIdx[league] = false
      }
    },
    /** 按需加载球员档案；幂等 + 内存命中 */
    async ensureProfile(league: LeagueSlug, id: number, season: string): Promise<PlayerProfile> {
      const key = `${league}:${id}`
      const hit = this.profiles[key]
      if (hit) return hit
      this.loadingProfile[key] = true
      try {
        const f = await fetchJsonCached<PlayerFile>(`data/${league}/players/${id}.json`, PROFILE_TTL, season)
        const profile = toProfile(f)
        this.profiles[key] = profile
        return profile
      } finally {
        this.loadingProfile[key] = false
      }
    },
    /** 搜索球员；返回前 limit 条 */
    search(league: LeagueSlug, q: string, limit = 10): PlayerSummary[] {
      const ms = this.searchIdx[league]
      if (!ms || !q.trim()) return []
      const results = ms.search(q.trim(), { limit })
      return results.map((r) => ({
        id: Number(r.id),
        name: r.name,
        teamId: r.teamId,
        team: r.team,
        position: r.position,
        age: r.age,
        goals: r.goals,
        assists: r.assists,
      }))
    },
  },
})
