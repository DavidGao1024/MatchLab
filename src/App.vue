<script setup lang="ts">
import { onMounted, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import AppFooter from './components/layout/AppFooter.vue'
import AppHeader from './components/layout/AppHeader.vue'
import BackgroundParticles from './components/layout/BackgroundParticles.vue'
import MatchModal from './components/matches/MatchModal.vue'
import Toast from './components/common/Toast.vue'
import ConfirmDialog from './components/common/ConfirmDialog.vue'
import { useAppStore } from './stores/app'
import { useMatchesStore } from './stores/matches'
import { useUserDataStore } from './stores/userData'
import { loadPlayerNames, loadPlayerValues, loadTeamValues } from './utils/i18n'
import { isLeagueSlug } from './utils/constants'

const app = useAppStore()
const route = useRoute()
const matches = useMatchesStore()
const userStore = useUserDataStore()

// 启动即拉联赛列表（1.4KB，首页板块与页脚都靠它）
app.loadLeagues().catch(() => {
  /* 失败不阻塞壳渲染，首页会各自挂错误态 */
})

// 异步加载球员中文译名表（130KB，世界杯项目同款源；不阻塞首屏）
loadPlayerNames()
// 异步加载球员/球队身价映射（懂球帝一次性抓取存量；不阻塞首屏）
loadPlayerValues()
loadTeamValues()

// 个人化数据 hydrate（订阅 + 收藏，localStorage 读取 + 多 tab 同步监听）
onMounted(() => userStore.init())

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
    <div class="bg-glow-field" aria-hidden="true">
      <span class="glow-blob glow-b1"></span>
      <span class="glow-blob glow-b2"></span>
      <span class="glow-blob glow-b3"></span>
      <span class="glow-blob glow-b4"></span>
      <span class="glow-blob glow-b5"></span>
      <span class="glow-blob glow-b6"></span>
    </div>
    <BackgroundParticles />
    <AppHeader />
    <main class="relative z-10 flex-1 flex flex-col w-full max-w-[1600px] mx-auto px-4">
      <router-view class="flex flex-col flex-1" />
    </main>
    <AppFooter />
    <!-- Phase 3：全局比赛详情弹窗 -->
    <MatchModal
      v-if="matches.activeMatch"
      :match="matches.activeMatch.match"
      :league="matches.activeMatch.league"
      @close="matches.closeMatch()"
    />
    <!-- 子项目 1：全局 Toast + ConfirmDialog -->
    <Toast />
    <ConfirmDialog />
  </div>
</template>
