<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import TeamLogo from '../components/common/TeamLogo.vue'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { usePlayersStore } from '../stores/players'
import { useTeamsStore } from '../stores/teams'
import { playerName, teamName, t } from '../utils/i18n'
import type { LeagueSlug } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const players = usePlayersStore()
const teams = useTeamsStore()

const league = computed(() => route.params.league as LeagueSlug)
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
watch(league, load)

const list = computed(() => players.indexes[league.value] ?? [])
const ready = computed(() => !players.loadingIdx[league.value] && list.value.length > 0)

// 过滤 + 排序
const posFilter = ref<'ALL' | 'G' | 'D' | 'M' | 'F'>('ALL')
const teamFilter = ref<number | 'ALL'>('ALL')
const sortKey = ref<'goals' | 'assists' | 'name' | 'age'>('goals')
const page = ref(1)
const PAGE_SIZE = 50

const teamOptions = computed(() => {
  const bundle = teams.bundles[league.value]
  if (!bundle) return []
  return [...bundle.teams].sort((a, b) => a.name.localeCompare(b.name))
})

const filtered = computed(() => {
  let r = list.value
  if (posFilter.value !== 'ALL') r = r.filter((p) => p.position === posFilter.value)
  if (teamFilter.value !== 'ALL') r = r.filter((p) => p.teamId === teamFilter.value)
  const sk = sortKey.value
  r = [...r].sort((a, b) => {
    if (sk === 'name') return a.name.localeCompare(b.name)
    if (sk === 'age') return (b.age ?? 0) - (a.age ?? 0)
    if (sk === 'assists') return (b.assists ?? 0) - (a.assists ?? 0)
    return (b.goals ?? 0) - (a.goals ?? 0)
  })
  return r
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const pageItems = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

watch([posFilter, teamFilter, sortKey], () => { page.value = 1 })

function go(p: { id: number }) {
  router.push(`/${league.value}/player/${p.id}`)
}

function posLabel(p: string): string {
  if (p === 'G') return t('players.positionG', app.lang)
  if (p === 'D') return t('players.positionD', app.lang)
  if (p === 'M') return t('players.positionM', app.lang)
  if (p === 'F') return t('players.positionF', app.lang)
  return p
}
</script>

<template>
  <section class="py-6">
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-4">
      <h1 class="font-cond text-2xl font-semibold text-white">{{ t('players.title', app.lang) }}</h1>
      <p class="font-mono-d text-[10px] text-slate-500">
        {{ t('players.of', app.lang) }} {{ filtered.length }}
      </p>
    </div>

    <!-- 过滤栏 -->
    <div class="flex flex-wrap items-center gap-2 mb-4 text-xs">
      <select v-model="posFilter" class="bg-white/5 border border-white/15 rounded px-2 py-1 text-white">
        <option value="ALL">{{ t('players.positionAll', app.lang) }}</option>
        <option value="G">{{ t('players.positionG', app.lang) }}</option>
        <option value="D">{{ t('players.positionD', app.lang) }}</option>
        <option value="M">{{ t('players.positionM', app.lang) }}</option>
        <option value="F">{{ t('players.positionF', app.lang) }}</option>
      </select>
      <select v-model="teamFilter" class="bg-white/5 border border-white/15 rounded px-2 py-1 text-white max-w-[200px]">
        <option value="ALL">{{ t('players.teamAll', app.lang) }}</option>
        <option v-for="tm in teamOptions" :key="tm.id" :value="tm.id">{{ teamName(tm.name, app.lang) }}</option>
      </select>
      <select v-model="sortKey" class="bg-white/5 border border-white/15 rounded px-2 py-1 text-white ml-auto">
        <option value="goals">{{ t('players.sortGoals', app.lang) }}</option>
        <option value="assists">{{ t('players.sortAssists', app.lang) }}</option>
        <option value="age">{{ t('players.sortAge', app.lang) }}</option>
        <option value="name">{{ t('players.sortName', app.lang) }}</option>
      </select>
    </div>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="!ready" kind="table" />
    <template v-else>
      <div v-if="filtered.length === 0" class="text-center text-slate-500 py-12 text-sm">
        {{ t('players.empty', app.lang) }}
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-[10px] uppercase tracking-wider text-slate-500 font-mono-d border-b border-white/10">
            <tr>
              <th class="py-2 px-2 text-left w-8">#</th>
              <th class="py-2 px-2 text-left">{{ t('col.player', app.lang) }}</th>
              <th class="py-2 px-2 text-left w-12">{{ t('col.pos', app.lang) }}</th>
              <th class="py-2 px-2 text-right w-12">{{ t('col.age', app.lang) }}</th>
              <th class="py-2 px-2 text-right w-12">{{ t('col.goals', app.lang) }}</th>
              <th class="py-2 px-2 text-right w-12">{{ t('col.assists', app.lang) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(p, i) in pageItems"
              :key="p.id"
              class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
              @click="go(p)"
            >
              <td class="py-2 px-2 text-slate-500 font-mono-d">{{ (page - 1) * 50 + i + 1 }}</td>
              <td class="py-2 px-2">
                <span class="text-white">{{ playerName(p.name, app.lang) }}</span>
                <span class="text-slate-500 text-xs ml-2">{{ teamName(p.team, app.lang) }}</span>
              </td>
              <td class="py-2 px-2 text-slate-400">{{ posLabel(p.position) }}</td>
              <td class="py-2 px-2 text-right text-slate-300 font-mono-d">{{ p.age ?? '—' }}</td>
              <td class="py-2 px-2 text-right text-white font-mono-d">{{ p.goals ?? '—' }}</td>
              <td class="py-2 px-2 text-right text-white font-mono-d">{{ p.assists ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- 分页 -->
      <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-4 text-xs">
        <button
          type="button"
          class="px-2 py-1 rounded border border-white/15 text-slate-300 hover:text-white disabled:opacity-30"
          :disabled="page === 1"
          @click="page--"
        >‹</button>
        <span class="text-slate-400 font-mono-d">{{ page }} / {{ totalPages }}</span>
        <button
          type="button"
          class="px-2 py-1 rounded border border-white/15 text-slate-300 hover:text-white disabled:opacity-30"
          :disabled="page === totalPages"
          @click="page++"
        >›</button>
      </div>
    </template>
  </section>
</template>
