<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import AppFooter from './components/layout/AppFooter.vue'
import AppHeader from './components/layout/AppHeader.vue'
import { useAppStore } from './stores/app'
import { isLeagueSlug } from './utils/constants'

const app = useAppStore()
const route = useRoute()

// 启动即拉联赛列表（1.4KB，首页板块与页脚都靠它）
app.loadLeagues().catch(() => {
  /* 失败不阻塞壳渲染，首页会各自挂错误态 */
})

// 联赛光晕：路由 league 优先，否则用当前焦点联赛；颜色写根节点 CSS 变量
watchEffect(() => {
  const param = route.params.league
  const slug = typeof param === 'string' && isLeagueSlug(param) ? param : app.currentLeague
  const color = app.leagueInfo(slug)?.color ?? '#3D195B'
  document.documentElement.style.setProperty('--league-color', color)
})
</script>

<template>
  <div class="relative min-h-screen flex flex-col">
    <div class="pitch-texture" aria-hidden="true"></div>
    <div class="league-glow" aria-hidden="true"></div>
    <AppHeader />
    <main class="relative z-10 flex-1 flex flex-col w-full max-w-[1600px] mx-auto px-4">
      <router-view class="flex flex-col flex-1" />
    </main>
    <AppFooter />
  </div>
</template>
