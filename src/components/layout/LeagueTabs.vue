<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { useLeagueSwitch } from '../../composables/useLeagueSwitch'
import { LEAGUE_SLUGS } from '../../utils/constants'

const app = useAppStore()
const { active, label, pick } = useLeagueSwitch()
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto" :aria-label="app.lang === 'zh' ? '联赛切换' : 'League switch'">
    <button
      v-for="slug in LEAGUE_SLUGS"
      :key="slug"
      type="button"
      @click="pick(slug)"
      class="font-cond tracking-wider whitespace-nowrap rounded transition-colors text-sm px-3.5 py-2 md:text-xs md:px-3 md:py-1.5"
      :class="
        slug === active
          ? 'text-white bg-white/10 shadow-[inset_0_-2px_0_var(--league-color)]'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      "
    >
      {{ label(slug) }}
    </button>
  </nav>
</template>
