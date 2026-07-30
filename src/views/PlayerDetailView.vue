<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import TeamLogo from '../components/common/TeamLogo.vue'
import PlayerStatsGrid from '../components/players/PlayerStatsGrid.vue'
import PlayerXgChart from '../components/players/PlayerXgChart.vue'
import PlayerCareerChart from '../components/players/PlayerCareerChart.vue'
import SeasonSelector from '../components/common/SeasonSelector.vue'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { usePlayersStore } from '../stores/players'
import { useTeamsStore } from '../stores/teams'
import { useXgStore } from '../stores/xg'
import { playerName, teamName, t } from '../utils/i18n'
import type { LeagueSlug } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const players = usePlayersStore()
const teams = useTeamsStore()
const xg = useXgStore()

const league = computed(() => route.params.league as LeagueSlug)
const playerId = computed(() => Number(route.params.id))
const season = computed(() => app.leagueInfo(league.value)?.season ?? '2025')
// Phase 6: 历史赛季切换（仅 PlayerDetailView，URL query ?season=2024）
const selectedSeason = computed(() => (route.query.season as string) || season.value)

const seq = ref(0)
const error = ref('')

async function load() {
  const my = ++seq.value
  error.value = ''
  try {
    await ensureLeague(league.value)
    await players.ensureIndex(league.value, season.value) // SearchBar 索引也确保就位
    await players.ensureProfile(league.value, playerId.value, season.value)
    if (seq.value !== my) return
    // xG 后台并行加载，不阻塞主流程
    xg.ensure(league.value, season.value).catch(() => { /* xg 失败静默 */ })
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(load)
watch([league, playerId], load)

const profile = computed(() => players.profiles[`${league.value}:${playerId.value}`])
const team = computed(() => (profile.value ? teams.teamById(league.value, profile.value.teamId) : undefined))
const ready = computed(() => !players.loadingProfile[`${league.value}:${playerId.value}`] && !!profile.value)
const xgRow = computed(() => (profile.value ? xg.byName(league.value, profile.value.displayName) : null))

const displayName = computed(() => profile.value ? playerName(profile.value.displayName, app.lang) : '')
const teamDisplay = computed(() => team.value ? teamName(team.value.name, app.lang) : '')

function posLabel(p: string): string {
  if (p === 'G') return t('players.positionG', app.lang)
  if (p === 'D') return t('players.positionD', app.lang)
  if (p === 'M') return t('players.positionM', app.lang)
  if (p === 'F') return t('players.positionF', app.lang)
  return p
}

function fmtHeight(h: number | null): string {
  if (h == null) return '—'
  return `${h} cm`
}

function fmtWeight(w: number | null): string {
  if (w == null) return '—'
  return `${w} kg`
}

function fmtDob(dob?: string): string {
  if (!dob) return '—'
  return dob.slice(0, 10)
}

function back() {
  router.push(`/${league.value}/players`)
}
</script>

<template>
  <section class="py-6">
    <button type="button" class="text-xs text-slate-400 hover:text-white mb-3" @click="back">‹ {{ t('players.title', app.lang) }}</button>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="!ready" kind="cards" />
    <template v-else-if="profile">
      <!-- 头部 -->
      <div class="flex items-center gap-4 mb-6">
        <TeamLogo :team="team" :size="56" />
        <div class="flex-1 min-w-0">
          <h1 class="font-cond text-3xl font-semibold text-white truncate">{{ displayName }}</h1>
          <p class="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <router-link v-if="team" :to="`/${league}/team/${team.id}`" class="hover:text-white hover:underline">
              {{ teamDisplay }}
            </router-link>
            <span v-if="profile.jersey" class="text-slate-500">#{{ profile.jersey }}</span>
            <span class="text-slate-500">·</span>
            <span>{{ posLabel(profile.position) }}</span>
          </p>
        </div>
      </div>

      <!-- 基础信息 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('col.age', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ profile.age ?? '—' }}</div>
        </div>
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('player.height', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ fmtHeight(profile.height) }}</div>
        </div>
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('player.weight', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ fmtWeight(profile.weight) }}</div>
        </div>
        <div class="border border-white/10 rounded p-2 bg-white/[0.02]">
          <div class="text-[10px] uppercase text-slate-500 font-mono-d">{{ t('player.born', app.lang) }}</div>
          <div class="text-base text-white font-mono-d">{{ fmtDob(profile.dateOfBirth) }}</div>
        </div>
      </div>

      <!-- xG 数据区块 -->
      <div v-if="xgRow" class="border border-white/10 rounded-lg p-4 mb-6 bg-white/[0.02]">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-cond text-sm tracking-wider text-white">{{ t('player.xgSection', app.lang) }}</h2>
          <SeasonSelector v-if="season !== selectedSeason" :league="league" :model-value="selectedSeason" @update:model-value="(v) => router.replace({ query: { ...route.query, season: v } })" />
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
          <div><div class="text-[10px] text-slate-500 font-mono-d">xG</div><div class="text-white font-mono-d">{{ xgRow.xG.toFixed(2) }}</div></div>
          <div><div class="text-[10px] text-slate-500 font-mono-d">xA</div><div class="text-white font-mono-d">{{ xgRow.xA.toFixed(2) }}</div></div>
          <div><div class="text-[10px] text-slate-500 font-mono-d">npxG</div><div class="text-white font-mono-d">{{ xgRow.npxG.toFixed(2) }}</div></div>
          <div><div class="text-[10px] text-slate-500 font-mono-d">xGChain</div><div class="text-white font-mono-d">{{ xgRow.xGChain.toFixed(2) }}</div></div>
          <div><div class="text-[10px] text-slate-500 font-mono-d">xGBuildup</div><div class="text-white font-mono-d">{{ xgRow.xGBuildup.toFixed(2) }}</div></div>
          <div><div class="text-[10px] text-slate-500 font-mono-d">{{ t('col.goals', app.lang) }}</div><div class="text-white font-mono-d">{{ xgRow.goals }}</div></div>
          <div><div class="text-[10px] text-slate-500 font-mono-d">{{ t('col.assists', app.lang) }}</div><div class="text-white font-mono-d">{{ xgRow.assists }}</div></div>
        </div>
      </div>

      <!-- xG 趋势图（Phase 6，逐场 + 5 场滚动平均） -->
      <PlayerXgChart :league="league" :understat-player-id="xgRow ? xgRow.id : null" />

      <!-- 生涯曲线（Phase 6，最近 8 个赛季进球/助攻） -->
      <PlayerCareerChart :league="league" :player-id="playerId" :current-season="season" />

      <!-- 统计 4 分类 -->
      <PlayerStatsGrid :stats="profile.stats" :position="profile.position" />
    </template>
  </section>
</template>
