<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import TeamLogo from '../components/common/TeamLogo.vue'
import LeaderRowCardMobile from '../components/players/LeaderRowCardMobile.vue'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { useLeadersStore } from '../stores/leaders'
import { useTeamsStore } from '../stores/teams'
import { leadersCatName, playerName, teamName, t } from '../utils/i18n'
import type { LeagueSlug } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const leaders = useLeadersStore()
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
    await leaders.ensure(league.value, season.value, { forceFresh: true })
    if (seq.value !== my) return
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(load)
watch(league, load)

const bundle = computed(() => leaders.bundles[league.value])
const ready = computed(() => !leaders.loading[league.value] && !!bundle.value)
const categories = computed(() => bundle.value?.categories ?? [])

const activeCat = ref(0)
const current = computed(() => categories.value[activeCat.value] ?? null)

watch(league, () => { activeCat.value = 0 })

function go(id: number) {
  router.push(`/${league.value}/player/${id}`)
}

function teamFor(id: number) {
  return teams.teamById(league.value, id)
}
</script>

<template>
  <section class="py-6">
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-4">
      <h1 class="font-cond text-2xl font-semibold text-white">{{ t('leaders.title', app.lang) }}</h1>
      <p class="font-mono-d text-[10px] text-slate-500">{{ t('standings.season', app.lang) }} {{ season }}</p>
    </div>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="!ready" kind="table" />
    <template v-else>
      <!-- 分类 tab -->
      <div class="flex gap-1 overflow-x-auto mb-4 pb-1">
        <button
          v-for="(cat, i) in categories"
          :key="cat.name"
          type="button"
          @click="activeCat = i"
          class="text-xs font-cond tracking-wider px-3 py-1.5 whitespace-nowrap rounded transition-colors"
          :class="i === activeCat ? 'text-white bg-white/10 shadow-[inset_0_-2px_0_var(--league-color)]' : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          {{ leadersCatName(cat.name, cat.displayName, app.lang) }}
        </button>
      </div>

      <div v-if="current" class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-[10px] uppercase tracking-wider text-slate-500 font-mono-d border-b border-white/10">
            <tr>
              <th class="py-2 px-2 text-left w-8">{{ t('leaders.rank', app.lang) }}</th>
              <th class="py-2 px-2 text-left">{{ t('col.player', app.lang) }}</th>
              <th class="py-2 px-2 text-right w-20">{{ t('leaders.value', app.lang) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="e in current.entries"
              :key="e.athleteId"
              class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
              @click="go(e.athleteId)"
            >
              <td class="py-2 px-2 text-slate-500 font-mono-d">{{ e.rank }}</td>
              <td class="py-2 px-2">
                <div class="flex items-center gap-2">
                  <TeamLogo :team="teamFor(e.teamId)" :size="18" />
                  <span class="text-white">{{ playerName(e.athleteName, app.lang) }}</span>
                  <span class="text-slate-500 text-xs">{{ teamName(e.teamName, app.lang) }}</span>
                </div>
              </td>
              <td class="py-2 px-2 text-right text-white font-mono-d">{{ e.value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="current" class="md:hidden">
        <LeaderRowCardMobile
          v-for="e in current.entries"
          :key="e.athleteId"
          :entry="e"
          :team="teamFor(e.teamId)"
          :category="current.name"
          :cat-display-name="current.displayName"
          :lang="app.lang"
          @click="go(e.athleteId)"
        />
      </div>
    </template>
  </section>
</template>
