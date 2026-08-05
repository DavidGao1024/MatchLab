<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { useStandingsStore } from '../../stores/standings'
import { t } from '../../utils/i18n'
import type { LeagueSlug } from '../../utils/constants'
import MiniStandings from './MiniStandings.vue'

const props = withDefaults(defineProps<{ league: LeagueSlug; featured?: boolean }>(), { featured: false })
const app = useAppStore()
const store = useStandingsStore()
const router = useRouter()

const info = computed(() => app.leagueInfo(props.league))
const rows = computed(() => store.rows[props.league] ?? [])
const color = computed(() => info.value?.color ?? '#3D195B')
const name = computed(() => (app.lang === 'zh' ? info.value?.nameZh : info.value?.name) ?? props.league)

function enter() {
  router.push(`/${props.league}/standings`)
}
</script>

<template>
  <article
    role="link"
    tabindex="0"
    class="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#111726] transition-all hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.9)] h-full flex flex-col"
    @click="enter"
    @keydown.enter="enter"
  >
    <!-- 品牌色顶条（切联赛时焦点卡随主题色过渡） -->
    <div
      class="h-1 transition-colors duration-700"
      :style="{ background: featured ? `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 35%, white))` : color }"
    ></div>
    <div class="p-4 flex flex-col flex-1">
      <p v-if="featured" class="font-mono-d text-[9px] tracking-[0.24em]" :style="{ color }">
        {{ t('home.featured', app.lang).toUpperCase() }}
      </p>
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="font-cond text-lg font-semibold text-white">{{ name }}</h3>
        <span class="text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-white">→</span>
      </div>
      <p class="font-mono-d text-[9px] uppercase tracking-[0.18em] text-slate-500">{{ name }}</p>

      <MiniStandings :rows="rows" :league="league" :limit="featured ? 8 : 4" :header="featured" class="mt-3 flex-1" />

      <p class="mt-3 font-mono-d text-[9px] text-slate-600">
        {{ info?.teams }} {{ t('home.teamsUnit', app.lang) }} · {{ info?.players }} {{ t('home.playersUnit', app.lang) }}
      </p>
      <p v-if="featured" class="mt-3 font-cond text-xs tracking-[0.1em]" :style="{ color }">
        {{ t('home.enter', app.lang) }}{{ name }} →
      </p>
    </div>
  </article>
</template>
