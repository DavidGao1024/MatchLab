<script setup lang="ts">
import { computed, ref } from 'vue'
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

// 移动端行展开状态（规格 移动端兼容 §1）
const expanded = ref(false)
function toggleExpand() {
  expanded.value = !expanded.value
}
</script>

<template>
  <tr
    class="group border-b border-white/5 transition-colors hover:bg-white/[0.04] md:cursor-default cursor-pointer md:[&:hover]:bg-white/[0.04]"
    :class="expanded ? 'bg-white/[0.06]' : ''"
    :style="{ boxShadow: `inset 3px 0 0 ${zoneBar}` }"
    @click="toggleExpand"
  >
    <th scope="row" class="sticky left-0 z-[1] bg-[#0e1424] px-2 py-2.5 text-left font-normal transition-colors group-hover:bg-[#161d31]">
      <router-link :to="teamLink" class="inline-flex min-w-44 items-center gap-2.5 hover:text-white" @click.stop>
        <span class="font-score w-5 text-right text-base" :class="row.rank === 1 ? 'text-white' : 'text-slate-400'">{{ row.rank }}</span>
        <TeamLogo :team="team" :size="20" />
        <span class="truncate font-cond text-[13px] hover:underline" :class="row.zone === 'ucl' ? 'text-slate-100' : 'text-slate-300'">
          {{ teamName(row.team, app.lang) }}
        </span>
        <span class="md:hidden ml-auto text-slate-500 text-xs" :class="expanded ? 'rotate-90' : ''">▸</span>
      </router-link>
    </th>
    <td :class="stat" class="hidden md:table-cell">{{ row.played }}</td>
    <td :class="stat" class="hidden md:table-cell">{{ row.won }}</td>
    <td :class="stat" class="hidden md:table-cell">{{ row.drawn }}</td>
    <td :class="stat" class="hidden md:table-cell">{{ row.lost }}</td>
    <td :class="stat" class="hidden md:table-cell">{{ row.goalsFor }}</td>
    <td :class="stat" class="hidden md:table-cell">{{ row.goalsAgainst }}</td>
    <td
      class="tabular px-1 py-2.5 text-center text-xs hidden md:table-cell"
      :class="row.goalDiff > 0 ? 'text-emerald-300/80' : row.goalDiff < 0 ? 'text-red-300/70' : 'text-slate-300'"
    >{{ row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff }}</td>
    <td class="px-2 py-2.5 text-center">
      <span class="font-score text-lg text-white">{{ row.points }}</span>
      <span v-if="row.deduction" class="ml-0.5 text-[9px] font-mono-d text-red-400/80" :title="`扣 ${row.deduction} 分`">-{{ row.deduction }}</span>
    </td>
    <td class="px-2 py-2.5 text-center"><FormDots :details="dots" /></td>
    <template v-if="showXg">
      <td class="tabular px-1 py-2.5 text-center text-xs text-emerald-300/80 hidden md:table-cell">{{ row.xG?.toFixed(1) ?? '–' }}</td>
      <td class="tabular px-1 py-2.5 text-center text-xs text-emerald-300/80 hidden md:table-cell">{{ row.xGA?.toFixed(1) ?? '–' }}</td>
      <td class="tabular px-1 py-2.5 text-center text-xs text-emerald-300/80 hidden md:table-cell">{{ row.xPts?.toFixed(1) ?? '–' }}</td>
    </template>
  </tr>
  <!-- 移动端展开行：渲染次要数据（赛/胜/平/负/进/失/净 + 可选 xG） -->
  <tr v-if="expanded" class="md:hidden border-b border-white/5 bg-black/20">
    <td colspan="4" class="px-3 py-3">
      <div class="grid grid-cols-3 gap-x-3 gap-y-2 font-mono-d text-[11px] text-slate-300">
        <div class="flex items-baseline justify-between"><span class="text-slate-500">赛</span><span class="text-white font-semibold">{{ row.played }}</span></div>
        <div class="flex items-baseline justify-between"><span class="text-slate-500">胜</span><span class="text-emerald-400 font-semibold">{{ row.won }}</span></div>
        <div class="flex items-baseline justify-between"><span class="text-slate-500">平</span><span class="text-slate-300 font-semibold">{{ row.drawn }}</span></div>
        <div class="flex items-baseline justify-between"><span class="text-slate-500">负</span><span class="text-red-400 font-semibold">{{ row.lost }}</span></div>
        <div class="flex items-baseline justify-between"><span class="text-slate-500">进</span><span class="text-white font-semibold">{{ row.goalsFor }}</span></div>
        <div class="flex items-baseline justify-between"><span class="text-slate-500">失</span><span class="text-white font-semibold">{{ row.goalsAgainst }}</span></div>
        <div class="flex items-baseline justify-between"><span class="text-slate-500">净</span><span :class="row.goalDiff > 0 ? 'text-emerald-400' : row.goalDiff < 0 ? 'text-red-400' : 'text-slate-300'" class="font-semibold">{{ row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff }}</span></div>
        <template v-if="showXg">
          <div class="flex items-baseline justify-between"><span class="text-slate-500">xG</span><span class="text-emerald-300 font-semibold">{{ row.xG?.toFixed(1) ?? '–' }}</span></div>
          <div class="flex items-baseline justify-between"><span class="text-slate-500">xGA</span><span class="text-emerald-300 font-semibold">{{ row.xGA?.toFixed(1) ?? '–' }}</span></div>
        </template>
      </div>
    </td>
  </tr>
</template>
