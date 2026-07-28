<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { isLeagueSlug, LEAGUE_SLUGS, type LeagueSlug } from '../../utils/constants'

const app = useAppStore()
const route = useRoute()
const router = useRouter()

// 高亮跟随路由；首页（无 league 参数）回落到焦点联赛（规格 v1.7 导航行为）
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
  else router.push(`/${slug}/standings`)
}
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto" :aria-label="app.lang === 'zh' ? '联赛切换' : 'League switch'">
    <button
      v-for="slug in LEAGUE_SLUGS"
      :key="slug"
      type="button"
      @click="pick(slug)"
      class="font-cond text-xs tracking-wider px-3 py-1.5 whitespace-nowrap rounded transition-colors"
      :class="
        slug === active
          ? 'text-white bg-white/10 shadow-[inset_0_-2px_0_var(--league-color)]'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      "
    >
      {{ label(slug) }}
    </button>
  </nav>
</template>
