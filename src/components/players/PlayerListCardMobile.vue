<script setup lang="ts">
import type { PlayerSummary, Team } from '../../types/models'
import type { Lang } from '../../utils/i18n'
import { playerName, teamName, t } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'

const props = defineProps<{
  player: PlayerSummary
  team?: Team
  rank: number
  lang: Lang
}>()

defineEmits<{ click: [] }>()

function posLabel(p: string): string {
  if (p === 'G') return t('players.positionG', props.lang)
  if (p === 'D') return t('players.positionD', props.lang)
  if (p === 'M') return t('players.positionM', props.lang)
  if (p === 'F') return t('players.positionF', props.lang)
  return p
}
</script>

<template>
  <div
    class="card mb-2 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
    :style="{ background: team ? `${team.color}0d` : 'rgba(255,255,255,0.02)' }"
    @click="$emit('click')"
  >
    <div class="flex items-center gap-2 mb-2">
      <span class="text-slate-500 font-mono-d text-xs w-5">{{ rank }}</span>
      <TeamLogo :team="team" :size="20" />
      <span class="text-white font-cond text-sm flex-1 truncate">{{ playerName(player.name, lang) }}</span>
      <span class="text-slate-500 text-xs truncate max-w-[100px]">{{ teamName(player.team, lang) }}</span>
    </div>
    <div class="grid grid-cols-4 gap-2 text-xs">
      <div>
        <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ t('col.pos', lang) }}</div>
        <div class="text-slate-300 font-mono-d mt-0.5">{{ posLabel(player.position) }}</div>
      </div>
      <div>
        <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ t('col.age', lang) }}</div>
        <div class="text-slate-300 font-mono-d mt-0.5">{{ player.age ?? '—' }}</div>
      </div>
      <div>
        <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ t('col.goals', lang) }}</div>
        <div class="text-white font-mono-d mt-0.5 font-semibold">{{ player.goals ?? '—' }}</div>
      </div>
      <div>
        <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ t('col.assists', lang) }}</div>
        <div class="text-white font-mono-d mt-0.5 font-semibold">{{ player.assists ?? '—' }}</div>
      </div>
    </div>
  </div>
</template>
