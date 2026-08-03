import { createRouter, createWebHashHistory } from 'vue-router'
import { isLeagueSlug } from '../utils/constants'
import HomeView from '../views/HomeView.vue'

// GitHub Pages 无服务端回退，统一 hash mode（图纸 §7 决策）
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    // 裸 /:league → 该联赛积分榜（规格 v1.2）
    { path: '/:league', redirect: (to) => `/${to.params.league}/standings` },
    { path: '/:league/standings', name: 'standings', component: () => import('../views/StandingsView.vue') },
    { path: '/:league/schedule', name: 'schedule', component: () => import('../views/ScheduleView.vue') },
    { path: '/:league/schedule/:month', name: 'schedule-month', component: () => import('../views/ScheduleView.vue') },
    { path: '/:league/players', name: 'players', component: () => import('../views/PlayersView.vue') },
    { path: '/:league/player/:id', name: 'player-detail', component: () => import('../views/PlayerDetailView.vue') },
    { path: '/:league/leaders', name: 'leaders', component: () => import('../views/LeadersView.vue') },
    { path: '/:league/team/:id', name: 'team-detail', component: () => import('../views/TeamDetailView.vue') },
    { path: '/:league/compare', name: 'compare', component: () => import('../views/CompareView.vue') },
    { path: '/favorites', name: 'favorites', component: () => import('../views/FavoritesView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 联赛参数非法 → 打回首页（规格规则 6）。月份格式校验在 ScheduleView 内做（回落默认月份）
router.beforeEach((to) => {
  const league = to.params.league
  if (typeof league === 'string' && !isLeagueSlug(league)) return '/'
  return true
})

export default router
