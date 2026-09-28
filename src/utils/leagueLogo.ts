import type { LeagueSlug } from './constants'

const BASE = import.meta.env.BASE_URL

/**
 * 联赛徽标本地资源（源：FM2024 图标库 Normal/@2x 512×512，
 * 对应 FM 赛事 ID：英超 11 / 西甲 67 / 意甲 32 / 德甲 22 / 法甲 16 / 中超 130931，
 * 见 docs/fm2024-logos-inventory.md §五）。
 */
const SOURCES: Record<LeagueSlug, string> = {
  'eng.1': `${BASE}leagues/eng.1.png`,
  'esp.1': `${BASE}leagues/esp.1.png`,
  'ita.1': `${BASE}leagues/ita.1.png`,
  'ger.1': `${BASE}leagues/ger.1.png`,
  'fra.1': `${BASE}leagues/fra.1.png`,
  'chn.1': `${BASE}leagues/chn.1.png`,
}

/** 联赛徽标路径（六大联赛均有本地资源） */
export function leagueLogoPath(league: LeagueSlug): string {
  return SOURCES[league]
}