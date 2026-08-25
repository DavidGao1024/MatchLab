<script setup lang="ts">
import type { Match } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useTimezone } from '../../composables/useTimezone'
import { t } from '../../utils/i18n'
import MatchCard from '../matches/MatchCard.vue'

const props = defineProps<{
  league: LeagueSlug
  utcDate: string  // 战报所在比赛日（UTC 日期）
  month: string    // 战报所在月份（"查看完整赛程"链接用）
  matches: Match[] // 已按选场规则挑好的 ≤4 场
  featuredId: string // 涉及榜首的那场 eventId（焦点标记，规格 v1.4）
}>()
const app = useAppStore()
const tz = useTimezone()

const leagueName = () => {
  const info = app.leagueInfo(props.league)
  return (app.lang === 'zh' ? info?.nameZh : info?.name) ?? props.league
}
</script>

<template>
  <!-- 开场即比赛日：上轮战报转播带（首页第一段，规格 §四） -->
  <section
    class="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.03] backdrop-blur-xl p-5"
  >
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <span class="rounded border px-2 py-0.5 font-mono-d text-[10px] tracking-[0.22em]" style="border-color: color-mix(in srgb, var(--league-color) 60%, transparent); color: color-mix(in srgb, var(--league-color) 70%, white)">
        {{ t('home.lastRound', app.lang) }}
      </span>
      <h2 class="font-cond text-lg font-semibold text-white">{{ leagueName() }} · {{ tz.dayLabel(utcDate) }}</h2>
      <router-link
        :to="`/${league}/schedule/${month}`"
        class="ml-auto text-xs text-slate-400 transition-colors hover:text-white"
      >{{ t('home.viewFull', app.lang) }} →</router-link>
    </div>
    <div class="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <MatchCard
        v-for="m in matches"
        :key="m.eventId"
        :match="m"
        :league="league"
        :featured="m.eventId === featuredId"
        class="rise-in"
      />
    </div>
  </section>
</template>
