<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { isLeagueSlug, type LeagueSlug } from '../../utils/constants'

const app = useAppStore()
const route = useRoute()

const active = computed<LeagueSlug | null>(() => {
  const p = route.params.league
  return typeof p === 'string' && isLeagueSlug(p) ? p : null
})

interface SubTab {
  routeName: string
  path: (slug: LeagueSlug) => string
  labelZh: string
  labelEn: string
}

const TABS: SubTab[] = [
  { routeName: 'standings', path: (s) => `/${s}/standings`, labelZh: '积分榜', labelEn: 'Table' },
  { routeName: 'schedule', path: (s) => `/${s}/schedule`, labelZh: '赛程', labelEn: 'Fixtures' },
  { routeName: 'players', path: (s) => `/${s}/players`, labelZh: '球员', labelEn: 'Players' },
  { routeName: 'leaders', path: (s) => `/${s}/leaders`, labelZh: '排行榜', labelEn: 'Leaders' },
  { routeName: 'compare', path: (s) => `/${s}/compare`, labelZh: '对比', labelEn: 'Compare' },
]

function isActive(name: string): boolean {
  const cur = String(route.name ?? '')
  if (name === 'schedule') return cur === 'schedule' || cur === 'schedule-month'
  if (name === 'players') return cur === 'players' || cur === 'player-detail'
  return cur === name
}
</script>

<template>
  <nav v-if="active" class="border-b border-white/10 bg-[#0c101b]/60">
    <div class="max-w-[1600px] mx-auto px-4 flex gap-1 overflow-x-auto">
      <router-link
        v-for="tab in TABS"
        :key="tab.routeName"
        :to="tab.path(active)"
        class="font-cond text-sm tracking-wider px-4 py-2.5 whitespace-nowrap border-b-2 transition-colors"
        :class="
          isActive(tab.routeName)
            ? 'text-white border-[var(--league-color)]'
            : 'text-slate-400 hover:text-white border-transparent'
        "
      >
        {{ app.lang === 'zh' ? tab.labelZh : tab.labelEn }}
      </router-link>
    </div>
  </nav>
</template>
