<script setup lang="ts">
import type { LeaderEntry } from '../../types/static'
import type { Team } from '../../types/models'
import type { Lang } from '../../utils/i18n'
import { leadersCatName, playerName, teamName } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'

defineProps<{
  entry: LeaderEntry
  team?: Team
  category: string
  catDisplayName: string
  lang: Lang
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <div
    class="mb-2 rounded-lg border border-white/10 p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
    :style="{ background: team?.color ? `${team.color}0d` : 'rgba(255,255,255,0.02)' }"
    @click="$emit('click')"
  >
    <!-- `0d` 是 5% alpha 的 hex 表示（#RRGGBB + 0d → rgba 5%）；team.color 空串兜底 -->
    <span class="text-slate-500 font-mono-d text-lg w-6 text-center">{{ entry.rank }}</span>
    <TeamLogo :team="team" :size="24" />
    <div class="flex-1 min-w-0">
      <div class="text-white font-cond text-sm truncate">{{ playerName(entry.athleteName, lang) }}</div>
      <div class="text-slate-500 text-xs truncate">{{ teamName(entry.teamName, lang) }}</div>
    </div>
    <div class="text-right shrink-0">
      <div class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ leadersCatName(category, catDisplayName, lang) }}</div>
      <div class="text-white font-mono-d text-xl font-semibold leading-tight">{{ entry.displayValue }}</div>
    </div>
  </div>
</template>
