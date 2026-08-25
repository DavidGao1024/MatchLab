<script setup lang="ts">
import { computed } from 'vue'
import type { StandingRow } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useTeamsStore } from '../../stores/teams'
import { t, teamName } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'

const props = withDefaults(
  defineProps<{ rows: StandingRow[]; league: LeagueSlug; limit?: number; header?: boolean }>(),
  { limit: 5, header: false },
)
const app = useAppStore()
const teams = useTeamsStore()
const shown = computed(() => props.rows.slice(0, props.limit))
</script>

<template>
  <div>
    <!-- 列与确认稿 mockup 一致：名次 / 队名 / 胜 / 平 / 负 / 积分（规格 v1.6） -->
    <div
      v-if="header"
      class="grid grid-cols-[1.4rem_1fr_1.6rem_1.6rem_1.6rem_2.2rem] items-center gap-2 border-b border-white/10 px-2 pb-1.5 text-[9px] uppercase tracking-[0.14em] text-slate-500"
    >
      <span>#</span><span>{{ t('col.team', app.lang) }}</span>
      <span class="text-center">{{ t('col.won', app.lang) }}</span>
      <span class="text-center">{{ t('col.drawn', app.lang) }}</span>
      <span class="text-center">{{ t('col.lost', app.lang) }}</span>
      <span class="text-right">{{ t('col.pts', app.lang) }}</span>
    </div>
    <div
      v-for="row in shown"
      :key="row.teamId"
      class="grid items-center gap-2 border-l-2 px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
      :class="header ? 'grid-cols-[1.4rem_1fr_1.6rem_1.6rem_1.6rem_2.2rem]' : 'grid-cols-[1.4rem_1fr_2.2rem]'"
      :style="{ borderColor: row.zone === 'ucl' ? 'var(--league-color)' : 'transparent' }"
    >
      <span class="font-score text-sm" :class="row.rank === 1 ? 'text-white' : 'text-slate-400'">{{ row.rank }}</span>
      <span class="flex min-w-0 items-center gap-2">
        <TeamLogo :team="teams.teamById(league, row.teamId)" :size="16" />
        <span class="truncate font-cond text-xs" :class="row.zone === 'ucl' ? 'text-slate-100' : 'text-slate-300'">{{ teamName(row.team, app.lang) }}</span>
      </span>
      <span v-if="header" class="tabular text-center text-[11px] text-slate-400">{{ row.won }}</span>
      <span v-if="header" class="tabular text-center text-[11px] text-slate-400">{{ row.drawn }}</span>
      <span v-if="header" class="tabular text-center text-[11px] text-slate-400">{{ row.lost }}</span>
      <span class="font-score text-right text-base text-white">{{ row.points }}</span>
    </div>
  </div>
</template>
