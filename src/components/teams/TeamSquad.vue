<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import NationFlag from '../common/NationFlag.vue'
import { playerName, t } from '../../utils/i18n'
import type { PlayerSummary } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'

const props = defineProps<{ players: PlayerSummary[]; league: LeagueSlug }>()

const app = useAppStore()
const router = useRouter()

interface PosGroup {
  key: string
  labelKey: string
  list: PlayerSummary[]
}

const groups = computed<PosGroup[]>(() => {
  const order: Array<{ key: string; labelKey: string }> = [
    { key: 'G', labelKey: 'players.positionG' },
    { key: 'D', labelKey: 'players.positionD' },
    { key: 'M', labelKey: 'players.positionM' },
    { key: 'F', labelKey: 'players.positionF' },
  ]
  return order
    .map((o) => ({ ...o, list: props.players.filter((p) => p.position === o.key) }))
    .filter((g) => g.list.length > 0)
})

function go(p: PlayerSummary) {
  router.push(`/${props.league}/player/${p.id}`)
}

function fmtNum(n: number | null): string {
  return n === null ? '—' : String(n)
}
</script>

<template>
  <div class="space-y-4">
    <section v-for="g in groups" :key="g.key">
      <h3 class="font-cond text-sm tracking-wider mb-2 pb-1 border-b border-white/10" :style="{ color: 'var(--accent, #94a3b8)' }">
        {{ t(g.labelKey, app.lang) }}
        <span class="text-slate-600 font-mono-d text-xs ml-1">({{ g.list.length }})</span>
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
        <button
          v-for="p in g.list"
          :key="p.id"
          type="button"
          @click="go(p)"
          class="text-left px-2 py-1.5 rounded hover:bg-white/5 transition-colors flex items-center gap-3"
        >
          <NationFlag :flag="p.flag" :citizenship="p.citizenship" :size="16" />
          <span class="text-white text-sm flex-1 truncate">{{ playerName(p.name, app.lang) }}</span>
          <span class="text-xs text-slate-500 font-mono-d w-10 text-right">{{ fmtNum(p.goals) }}G</span>
          <span class="text-xs text-slate-500 font-mono-d w-10 text-right">{{ fmtNum(p.assists) }}A</span>
        </button>
      </div>
    </section>
  </div>
</template>
