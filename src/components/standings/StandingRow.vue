<script setup lang="ts">
import { computed } from 'vue'
import type { StandingRow } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useStandingsStore } from '../../stores/standings'
import { useTeamsStore } from '../../stores/teams'
import { formDetails } from '../../utils/matches'
import { teamName } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'
import FormDots from './FormDots.vue'

const props = defineProps<{ row: StandingRow; league: LeagueSlug; showXg: boolean }>()
const app = useAppStore()
const teams = useTeamsStore()
const store = useStandingsStore()

const team = computed(() => teams.teamById(props.league, props.row.teamId))
const teamLink = computed(() => `/${props.league}/team/${props.row.teamId}`)

const dots = computed(() =>
  formDetails(store.formMatches[props.league] ?? [], props.row.teamId).map((d) => {
    const opp = teams.teamById(props.league, d.opponentId)
    return {
      result: d.result,
      opponent: opp ? teamName(opp.name, app.lang) : `#${d.opponentId}`,
      score: `${d.gf}-${d.ga}`,
    }
  }),
)

// 区带色条：ucl 吃联赛品牌色，其余功能色（规格 §四）
const zoneBar = computed(() => {
  switch (props.row.zone) {
    case 'ucl': return 'var(--league-color)'
    case 'uel': return '#f59e0b'
    case 'playoff': return '#fb923c'
    case 'rel': return '#ef4444'
    default: return 'transparent'
  }
})

const stat = 'tabular px-1 py-2.5 text-center text-xs text-slate-300'
</script>

<template>
  <tr
    class="group border-b border-white/5 transition-colors hover:bg-white/[0.04]"
    :style="{ boxShadow: `inset 3px 0 0 ${zoneBar}` }"
  >
    <th scope="row" class="sticky left-0 z-[1] bg-[#0e1424] px-2 py-2.5 text-left font-normal transition-colors group-hover:bg-[#161d31]">
      <router-link :to="teamLink" class="inline-flex min-w-44 items-center gap-2.5 hover:text-white">
        <span class="font-score w-5 text-right text-base" :class="row.rank === 1 ? 'text-white' : 'text-slate-400'">{{ row.rank }}</span>
        <TeamLogo :team="team" :size="20" />
        <span class="truncate font-cond text-[13px] hover:underline" :class="row.zone === 'ucl' ? 'text-slate-100' : 'text-slate-300'">
          {{ teamName(row.team, app.lang) }}
        </span>
      </router-link>
    </th>
    <td :class="stat">{{ row.played }}</td>
    <td :class="stat">{{ row.won }}</td>
    <td :class="stat">{{ row.drawn }}</td>
    <td :class="stat">{{ row.lost }}</td>
    <td :class="stat">{{ row.goalsFor }}</td>
    <td :class="stat">{{ row.goalsAgainst }}</td>
    <td
      class="tabular px-1 py-2.5 text-center text-xs"
      :class="row.goalDiff > 0 ? 'text-emerald-300/80' : row.goalDiff < 0 ? 'text-red-300/70' : 'text-slate-300'"
    >{{ row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff }}</td>
    <td class="px-2 py-2.5 text-center">
      <span class="font-score text-lg text-white">{{ row.points }}</span>
      <span v-if="row.deduction" class="ml-0.5 text-[9px] font-mono-d text-red-400/80" :title="`扣 ${row.deduction} 分`">-{{ row.deduction }}</span>
    </td>
    <td class="px-2 py-2.5 text-center"><FormDots :details="dots" /></td>
    <template v-if="showXg">
      <td class="tabular px-1 py-2.5 text-center text-xs text-emerald-300/80">{{ row.xG?.toFixed(1) ?? '–' }}</td>
      <td class="tabular px-1 py-2.5 text-center text-xs text-emerald-300/80">{{ row.xGA?.toFixed(1) ?? '–' }}</td>
      <td class="tabular px-1 py-2.5 text-center text-xs text-emerald-300/80">{{ row.xPts?.toFixed(1) ?? '–' }}</td>
    </template>
  </tr>
</template>
