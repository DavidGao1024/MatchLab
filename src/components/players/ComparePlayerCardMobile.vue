<script setup lang="ts">
import type { PlayerProfile, Team } from '../../types/models'
import type { Lang } from '../../utils/i18n'
import { playerName, t } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'

interface Row {
  category: string
  field: string
  label: string
  values: (number | null)[]
  isMaxFlags?: boolean[]
}

const props = defineProps<{
  profile: PlayerProfile
  team?: Team
  rows: Row[]
  playerIndex: number
  lang: Lang
}>()

defineEmits<{ remove: []; click: [] }>()

function fmtVal(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v)
    return v.toFixed(2)
  }
  return String(v)
}

function isMax(row: Row): boolean {
  return row.isMaxFlags?.[props.playerIndex] ?? false
}

function rowValue(row: Row): number | null {
  return row.values[props.playerIndex] ?? null
}
</script>

<template>
  <div
    class="mb-3 rounded-lg border border-white/10 p-3"
    :style="{ background: team?.color ? `${team.color}0d` : 'rgba(255,255,255,0.02)' }"
  >
    <div class="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
      <TeamLogo :team="team" :size="28" class="shrink-0" />
      <button
        type="button"
        class="order-3 text-[9px] text-slate-500 hover:text-red-400 shrink-0"
        @click="$emit('remove')"
      >
        {{ t('compare.remove', lang) }} ×
      </button>
      <button
        type="button"
        class="flex-1 truncate text-left text-white font-cond text-sm hover:underline"
        @click="$emit('click')"
      >
        {{ playerName(profile.displayName, lang) }}
      </button>
    </div>
    <div class="space-y-1.5 text-xs">
      <div v-for="row in rows" :key="row.category + row.field" class="flex justify-between">
        <span class="text-slate-400">{{ t(row.label, lang) }}</span>
        <span :class="['font-mono-d', isMax(row) ? 'text-emerald-300 font-semibold' : 'text-slate-300']">
          {{ fmtVal(rowValue(row)) }}<span v-if="isMax(row)" class="ml-1 text-[10px]">({{ t('compare.max', lang) }})</span>
        </span>
      </div>
    </div>
  </div>
</template>
