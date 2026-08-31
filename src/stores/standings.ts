import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import { fetchLiveScores } from '../composables/useEspanFetch'
import type { Match, StandingRow } from '../types/models'
import type { MatchesFile, RawStanding, TeamNameMapFile, XgFile } from '../types/static'
import { applyForm, applyMatchFixes, computeStandings, HEAD_TO_HEAD_TIEBREAK, mergeStandings, POINT_DEDUCTIONS } from '../utils/standings'
import { currentMonth, seasonMonths, type LeagueSlug } from '../utils/constants'

const MATCHES_TTL = 60 * 60 * 1000
const XG_TTL = 24 * 60 * 60 * 1000

export const useStandingsStore = defineStore('standings', {
  state: () => ({
    rows: {} as Partial<Record<LeagueSlug, StandingRow[]>>,
    updateTime: {} as Partial<Record<LeagueSlug, string>>,
    xgOn: {} as Partial<Record<LeagueSlug, boolean>>, // 只存会话内，刷新归关（规格 v1.3）
    loading: {} as Partial<Record<LeagueSlug, boolean>>,
    xgError: {} as Partial<Record<LeagueSlug, boolean>>,
    // 中间料，供 xG 开关切换时重合并，不重复拉正榜
    raw: {} as Partial<Record<LeagueSlug, RawStanding[]>>,
    formMatches: {} as Partial<Record<LeagueSlug, Match[]>>,
    teamNameMap: {} as Record<string, string>,
  }),
  actions: {
    async ensureMap() {
      if (Object.keys(this.teamNameMap).length) return
      const f = await fetchJsonCached<TeamNameMapFile>('data/mappings/team-name-map.json', XG_TTL)
      this.teamNameMap = f.map
    },
    rebuild(league: LeagueSlug, xg: XgFile | null) {
      const raw = this.raw[league]
      if (!raw) return
      const merged = mergeStandings(raw, league, xg?.standings ?? null, this.teamNameMap)
      this.rows[league] = applyForm(merged, this.formMatches[league] ?? [])
    },
    /** 某月比分：当月走直播直连（失败回落静态快照），历史月走静态缓存（文件缺失返回空） */
    async fetchMonthMatches(league: LeagueSlug, month: string, season: string, isCurrent: boolean): Promise<Match[]> {
      if (isCurrent) {
        try {
          return await fetchLiveScores(league, month)
        } catch {
          // 直播断线 → 回落该月静态快照
        }
      }
      try {
        return (await fetchJsonCached<MatchesFile>(`data/${league}/matches/${month}.json`, MATCHES_TTL, season)).matches
      } catch {
        return [] // 文件不存在（休赛期/未来月）→ 空
      }
    },
    async load(league: LeagueSlug, season: string, opts: { withForm?: boolean; seasonType?: 'european' | 'calendar'; forceFresh?: boolean } = {}) {
      const withForm = opts.withForm ?? true
      const sType = opts.seasonType ?? 'european'
      this.loading[league] = true
      try {
        // 整赛季比分 → 本地算积分榜：当月实时 + 历史月静态
        const cur = currentMonth()
        const months = seasonMonths(season, sType)
        const files = await Promise.all(months.map((m) => this.fetchMonthMatches(league, m, season, m === cur)))
        const allMatches = applyMatchFixes(files.flat())
        this.formMatches[league] = withForm ? allMatches : []
        this.raw[league] = computeStandings(allMatches, POINT_DEDUCTIONS[league] ?? {}, { headToHead: Boolean(HEAD_TO_HEAD_TIEBREAK[league]) })
        this.updateTime[league] = new Date().toISOString()
        this.rebuild(league, null)
        if (this.xgOn[league]) {
          // 刷新后保持开关状态；xG 失败则开关自动关（规格 §七）
          try {
            await this.loadXg(league, season)
          } catch {
            this.xgOn[league] = false
            this.xgError[league] = true
          }
        }
      } finally {
        this.loading[league] = false
      }
    },
    async loadXg(league: LeagueSlug, season: string) {
      await this.ensureMap()
      const xf = await fetchJsonCached<XgFile>(`data/${league}/xg/standings.json`, XG_TTL, season)
      this.rebuild(league, xf)
      this.xgError[league] = false
    },
    /** 开关 xG。失败时抛给视图层提示，开关保持关（规格验收 3） */
    async toggleXg(league: LeagueSlug, season: string) {
      if (this.xgOn[league]) {
        this.xgOn[league] = false
        this.rebuild(league, null)
        return
      }
      try {
        await this.loadXg(league, season)
        this.xgOn[league] = true
      } catch (e) {
        this.xgOn[league] = false
        this.xgError[league] = true
        throw e
      }
    },
  },
})
