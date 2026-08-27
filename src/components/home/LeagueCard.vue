<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { useStandingsStore } from '../../stores/standings'
import { t } from '../../utils/i18n'
import type { LeagueSlug } from '../../utils/constants'
import MiniStandings from './MiniStandings.vue'

const props = defineProps<{ league: LeagueSlug }>()
const app = useAppStore()
const store = useStandingsStore()
const router = useRouter()

const info = computed(() => app.leagueInfo(props.league))
const rows = computed(() => store.rows[props.league] ?? [])
const name = computed(() => (app.lang === 'zh' ? info.value?.nameZh : info.value?.name) ?? props.league)

function enter() {
  router.push(`/${props.league}/standings`)
}
</script>

<template>
  <article
    role="link"
    tabindex="0"
    class="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#131a2b] transition-all hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.9)] h-full flex flex-col"
    @click="enter"
    @keydown.enter="enter"
  >
    <div class="p-4 flex flex-col flex-1">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="font-cond text-lg font-semibold text-white">{{ name }}</h3>
        <span class="text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-white">→</span>
      </div>
      <p class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ name }}</p>

      <MiniStandings :rows="rows" :league="league" :limit="8" :header="true" class="mt-3 flex-1" />

      <p class="mt-3 font-mono-d text-[9px] text-slate-600">
        {{ info?.teams }} {{ t('home.teamsUnit', app.lang) }} · {{ info?.players }} {{ t('home.playersUnit', app.lang) }}
      </p>
    </div>
  </article>
</template>
