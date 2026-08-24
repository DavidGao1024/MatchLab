import { defineStore } from 'pinia'
import { fetchJsonCached } from '../composables/useJsonFetch'
import type { LeagueInfo } from '../types/models'
import type { LeaguesFile } from '../types/static'
import { FOCUS_LEAGUE, type LeagueSlug } from '../utils/constants'
import type { Lang } from '../utils/i18n'

const LANG_KEY = 'matchlab:lang'

function savedLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    currentLeague: FOCUS_LEAGUE as LeagueSlug,
    lang: savedLang(),
    leagues: [] as LeagueInfo[],
  }),
  getters: {
    leagueInfo: (s) => (slug: LeagueSlug): LeagueInfo | undefined => s.leagues.find((l) => l.slug === slug),
  },
  actions: {
    async loadLeagues() {
      if (this.leagues.length) return
      const f = await fetchJsonCached<LeaguesFile>('data/leagues.json', 60 * 60 * 1000, 'boot')
      this.leagues = f.leagues
    },
    setLeague(l: LeagueSlug) {
      this.currentLeague = l
    },
    toggleLang() {
      this.lang = this.lang === 'zh' ? 'en' : 'zh'
      try {
        localStorage.setItem(LANG_KEY, this.lang)
      } catch {
        // 隐私模式：语言仅存会话内
      }
    },
  },
})
