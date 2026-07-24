import { createRouter, createWebHashHistory } from 'vue-router'

// GitHub Pages 无服务端回退，统一 hash mode（图纸 §7 决策）
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    // 兜底重定向（图纸 §7），页面增多后按阶段扩展路由表
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
