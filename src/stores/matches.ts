import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import { fetchLiveScores } from '../composables/useEspanFetch'
import type { Match } from '../types/models'
import type { MatchesFile } from '../types/static'
import { currentMonth, seasonMonths, type LeagueSlug } from '../utils/constants'

const STATIC_TTL = 60 * 60 * 1000
const POLL_MS = 60 * 1000 // 有进行中比赛时每 60s 刷新（规格规则 1）
// 代际计数：连续切月时丢弃过期请求的后续状态写入（规格 v1.5 过期响应防护的 store 层）
let loadGen = 0

export const useMatchesStore = defineStore('matches', {
  state: () => ({
    months: {} as Record<string, Match[]>, // key: `${league}/${month}`
    live: false,       // 当前月份数据来自直播通道
    fallback: false,   // 直播断线已退回快照（挂提示用）
    empty: false,      // 当月/该月无联赛比赛（空场/休赛期状态用）
    timer: null as ReturnType<typeof setInterval> | null,
    teamSchedules: {} as Record<string, Match[]>, // key: `${league}/${teamId}`
    // Phase 3：全局比赛详情弹窗
    activeMatch: null as { match: Match; league: LeagueSlug } | null,
  }),
  actions: {
    key(league: LeagueSlug, month: string) {
      return `${league}/${month}`
    },
    hasInProgress(league: LeagueSlug, month: string): boolean {
      return (this.months[this.key(league, month)] ?? []).some((m) => m.status === 'in')
    },
    /**
     * 加载某月赛程。活/死分界 = 自然月（规格规则 1）：
     * 当月 → ESPN 直连（内存态，不落缓存）；断线 → 同月静态快照；快照也缺 → 空场态（规格规则 4）
     */
    async loadMonth(league: LeagueSlug, month: string, season: string) {
      const gen = ++loadGen
      this.stopPolling()
      this.live = false
      this.fallback = false
      this.empty = false
      const k = this.key(league, month)
      if (month === currentMonth()) {
        try {
          const liveMatches = await fetchLiveScores(league, month)
          if (gen !== loadGen) return // 过期请求：状态已被新调用接管，直接退场
          this.months[k] = liveMatches
          this.live = true
          this.empty = liveMatches.length === 0
          if (this.hasInProgress(league, month)) this.startPolling(league, month)
          return
        } catch {
          if (gen !== loadGen) return
          this.fallback = true // 直连失败 → 掉到下面的静态快照
        }
      }
      try {
        const f = await fetchJsonCached<MatchesFile>(`data/${league}/matches/${month}.json`, STATIC_TTL, season)
        if (gen !== loadGen) return
        this.months[k] = f.matches
        this.empty = f.matches.length === 0
      } catch {
        if (gen !== loadGen) return
        this.months[k] = []
        this.empty = true // 文件不存在（如休赛期当月）→ 空场提示 + 引导跳月
      }
    },
    /**
     * 加载某队整赛季赛程：跨季度 10 个月并行拉取，过滤出该队主/客场，按开球时间正序。
     * 不复用 loadMonth——它内置单月串行防过期计数（loadGen），并行调 10 次会互相丢数据。
     * 当月走直播直连（失败回落静态快照），其余月走静态 JSON；单月失败不连坐其余月。
     */
    async loadTeamSchedule(league: LeagueSlug, teamId: number, season: string, seasonType: 'european' | 'calendar' = 'european') {
      const k = `${league}/${teamId}`
      const months = seasonMonths(season, seasonType)
      const results = await Promise.all(months.map(async (m) => {
        if (m === currentMonth()) {
          try { return await fetchLiveScores(league, m) }
          catch { /* 直播失败 → 回落下面的静态快照 */ }
        }
        try {
          const f = await fetchJsonCached<MatchesFile>(`data/${league}/matches/${m}.json`, STATIC_TTL, season)
          return f.matches
        } catch { return [] } // 月文件不存在（休赛期当月等）→ 空
      }))
      this.teamSchedules[k] = results
        .flat()
        .filter((m) => m.home.id === teamId || m.away.id === teamId)
        .sort((a, b) => a.date.localeCompare(b.date))
    },
    /** 手动刷新：直播态才生效（MonthStrip 的刷新按钮用） */
    async refresh(league: LeagueSlug, month: string) {
      if (!this.live) return
      try {
        this.months[this.key(league, month)] = await fetchLiveScores(league, month)
      } catch {
        // 本次失败保留上一份直播数据
      }
    },
    startPolling(league: LeagueSlug, month: string) {
      this.stopPolling()
      const tick = async () => {
        try {
          this.months[this.key(league, month)] = await fetchLiveScores(league, month)
        } catch {
          // 本 tick 静默失败，下个 tick 再试
        }
        // 数据刷新后重新评估续停（规格 v1.3）
        if (!this.hasInProgress(league, month)) this.stopPolling()
      }
      this.timer = setInterval(tick, POLL_MS)
    },
    stopPolling() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    // Phase 3：弹窗开关
    openMatch(match: Match, league: LeagueSlug) {
      this.activeMatch = { match, league }
    },
    closeMatch() {
      this.activeMatch = null
    },
  },
})
