import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import { fetchLiveScores } from '../composables/useEspanFetch'
import type { Match } from '../types/models'
import type { MatchesFile } from '../types/static'
import { currentMonth, type LeagueSlug } from '../utils/constants'

const STATIC_TTL = 60 * 60 * 1000
const POLL_MS = 60 * 1000 // 有进行中比赛时每 60s 刷新（规格规则 1）

export const useMatchesStore = defineStore('matches', {
  state: () => ({
    months: {} as Record<string, Match[]>, // key: `${league}/${month}`
    live: false,       // 当前月份数据来自直播通道
    fallback: false,   // 直播断线已退回快照（挂提示用）
    empty: false,      // 当月/该月无联赛比赛（空场/休赛期状态用）
    timer: null as ReturnType<typeof setInterval> | null,
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
      this.stopPolling()
      this.live = false
      this.fallback = false
      this.empty = false
      const k = this.key(league, month)
      if (month === currentMonth()) {
        try {
          this.months[k] = await fetchLiveScores(league, month)
          this.live = true
          this.empty = this.months[k].length === 0
          if (this.hasInProgress(league, month)) this.startPolling(league, month)
          return
        } catch {
          this.fallback = true // 直连失败 → 掉到下面的静态快照
        }
      }
      try {
        const f = await fetchJsonCached<MatchesFile>(`data/${league}/matches/${month}.json`, STATIC_TTL, season)
        this.months[k] = f.matches
        this.empty = f.matches.length === 0
      } catch {
        this.months[k] = []
        this.empty = true // 文件不存在（如休赛期当月）→ 空场提示 + 引导跳月
      }
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
  },
})
