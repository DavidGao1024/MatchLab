<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
import { groupMatchesByUtcDate } from '../../utils/format'
import MatchCard from './MatchCard.vue'

const props = defineProps<{ matches: Match[]; league: LeagueSlug }>()
const app = useAppStore()

// 分组用数据日期（UTC），全球用户看到的一致、可分享（规格 v1.2）
const groups = computed(() => groupMatchesByUtcDate(props.matches))

const weekday = (utcDate: string) => {
  const d = new Date(`${utcDate}T00:00:00Z`)
  const names = app.lang === 'zh' ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return names[d.getUTCDay()]
}
</script>

<template>
  <div v-for="(g, gi) in groups" :key="g.utcDate" class="mb-6">
    <div class="mb-2.5 flex items-baseline gap-2.5">
      <!-- 组头：联赛色日期徽章（format 的 dayLabel 已含星期，这里再加场次） -->
      <span
        class="border-l-[3px] bg-white/[0.04] px-2.5 py-1 font-cond text-xs font-semibold uppercase tracking-[0.12em] text-slate-200"
        style="border-color: var(--league-color)"
      >{{ g.utcDate }} · {{ weekday(g.utcDate) }}</span>
      <span class="text-[11px] text-slate-500">{{ g.matches.length }} {{ t('schedule.matchesUnit', app.lang) }}</span>
    </div>
    <div class="grid grid-cols-1 gap-2 xl:grid-cols-2">
      <MatchCard
        v-for="(m, mi) in g.matches"
        :key="m.eventId"
        :match="m"
        :league="league"
        class="rise-in"
        :style="{ animationDelay: `${Math.min(gi * 60 + mi * 40, 400)}ms` }"
      />
    </div>
  </div>
</template>
