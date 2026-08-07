import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { isLeagueSlug, type LeagueSlug } from '../utils/constants'

/**
 * 切联赛共享逻辑（LeagueTabs 与 LeaguePicker 共用）。
 * 由 LeagueTabs.vue 原有逻辑抽出，行为不变：纯前端路由，不碰撞 store 数据/API。
 */
export function useLeagueSwitch() {
  const app = useAppStore()
  const route = useRoute()
  const router = useRouter()

  // 高亮跟随路由；首页（无 league 参数）回落到焦点联赛
  const active = computed<LeagueSlug>(() => {
    const p = route.params.league
    return typeof p === 'string' && isLeagueSlug(p) ? p : app.currentLeague
  })

  function label(slug: LeagueSlug): string {
    const info = app.leagueInfo(slug)
    if (!info) return slug
    return app.lang === 'zh' ? info.nameZh : info.name
  }

  // 切联赛留在当前页面类型（按路由名判断，不拆路径字符串）
  function pick(slug: LeagueSlug) {
    const n = String(route.name ?? '')
    if (n === 'schedule' || n === 'schedule-month') router.push(`/${slug}/schedule`)
    else if (n === 'players' || n === 'player-detail') router.push(`/${slug}/players`)
    else if (n === 'leaders') router.push(`/${slug}/leaders`)
    else if (n === 'compare') router.push(`/${slug}/compare`)
    else router.push(`/${slug}/standings`)
  }

  return { active, label, pick }
}
