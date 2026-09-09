<script setup lang="ts">
import type { LeagueSlug } from '../../utils/constants'
import type { StripPick } from '../../utils/matches'
import { useAppStore } from '../../stores/app'
import { useTimezone } from '../../composables/useTimezone'
import { t } from '../../utils/i18n'
import MatchCard from '../matches/MatchCard.vue'

// 战报带 v2：六联赛混合，条目自带所属联赛（规格 v2.0）
defineProps<{ day: string; picks: StripPick[] }>()
const app = useAppStore()
const tz = useTimezone()

const leagueLabel = (slug: LeagueSlug) => {
  const info = app.leagueInfo(slug)
  return (app.lang === 'zh' ? info?.nameZh : info?.name) ?? slug
}
</script>

<template>
  <!-- 开场即比赛日：昨日战报转播带（首页第一段） -->
  <section
    class="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.03] backdrop-blur-xl p-5"
  >
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <span class="rounded border px-2 py-0.5 font-mono-d text-[10px] tracking-[0.22em]" style="border-color: color-mix(in srgb, var(--league-color) 60%, transparent); color: color-mix(in srgb, var(--league-color) 70%, white)">
        {{ t('home.lastRound', app.lang) }}
      </span>
      <h2 class="font-cond text-lg font-semibold text-white">{{ tz.dayLabel(day) }}</h2>
    </div>
    <div class="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <MatchCard
        v-for="p in picks"
        :key="p.match.eventId"
        :match="p.match"
        :league="p.league"
        :featured="p.featured"
        :league-tag="leagueLabel(p.league)"
        class="rise-in"
      />
    </div>
  </section>
</template>
