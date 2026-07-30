<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import TeamLogo from '../components/common/TeamLogo.vue'
import TeamSquad from '../components/teams/TeamSquad.vue'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { usePlayersStore } from '../stores/players'
import { useTeamsStore } from '../stores/teams'
import { teamName, t } from '../utils/i18n'
import type { LeagueSlug } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const players = usePlayersStore()
const teams = useTeamsStore()

const league = computed(() => route.params.league as LeagueSlug)
const teamId = computed(() => Number(route.params.id))
const season = computed(() => app.leagueInfo(league.value)?.season ?? '2025')

const seq = ref(0)
const error = ref('')

async function load() {
  const my = ++seq.value
  error.value = ''
  try {
    await ensureLeague(league.value)
    await players.ensureIndex(league.value, season.value)
    if (seq.value !== my) return
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(load)
watch([league, teamId], load)

const team = computed(() => teams.teamById(league.value, teamId.value))
const ready = computed(() => !!team.value)
const squad = computed(() => {
  const all = players.indexes[league.value] ?? []
  return all.filter((p) => p.teamId === teamId.value)
})

const displayName = computed(() => (team.value ? teamName(team.value.name, app.lang) : ''))
const record = computed(() => team.value?.record ?? null)

function back() {
  router.push(`/${league.value}/standings`)
}
</script>

<template>
  <section class="py-6">
    <button type="button" class="text-xs text-slate-400 hover:text-white mb-3" @click="back">‹ {{ t('col.team', app.lang) }}</button>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="!ready" kind="cards" />
    <template v-else-if="team">
      <!-- 头部：队徽 + 名字 + 简称 -->
      <div class="flex items-center gap-4 mb-6">
        <TeamLogo :team="team" :size="64" />
        <div class="flex-1 min-w-0">
          <h1 class="font-cond text-3xl font-semibold text-white truncate">{{ displayName }}</h1>
          <p class="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="text-slate-500">{{ team.abbreviation }}</span>
            <span v-if="team.venue?.name">· {{ team.venue.name }}</span>
            <span v-if="team.venue?.city" class="text-slate-500">{{ team.venue.city }}</span>
          </p>
        </div>
      </div>

      <!-- 球队战绩 -->
      <div v-if="record" class="grid grid-cols-3 md:grid-cols-7 gap-2 mb-6">
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('team.played', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ record.played }}</div>
        </div>
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('team.col.w', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ record.wins }}</div>
        </div>
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('team.col.d', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ record.draws }}</div>
        </div>
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('team.col.l', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ record.losses }}</div>
        </div>
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('team.col.gf', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ record.goalsFor }}</div>
        </div>
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('team.col.ga', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ record.goalsAgainst }}</div>
        </div>
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('team.col.pts', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ record.points }}</div>
        </div>
      </div>

      <!-- 阵容（按位置分组） -->
      <div class="mt-6">
        <h2 class="font-cond text-lg tracking-wider text-white mb-3 pb-1 border-b border-white/10">
          {{ t('team.squad', app.lang) }}
          <span class="text-slate-600 font-mono-d text-xs ml-2">({{ squad.length }})</span>
        </h2>
        <TeamSquad :players="squad" :league="league" />
      </div>
    </template>
  </section>
</template>
