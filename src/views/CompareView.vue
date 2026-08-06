<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import TeamLogo from '../components/common/TeamLogo.vue'
import ComparePlayerCardMobile from '../components/players/ComparePlayerCardMobile.vue'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { useCompareStore } from '../stores/compare'
import { usePlayersStore } from '../stores/players'
import { useTeamsStore } from '../stores/teams'
import { playerName, t, teamName } from '../utils/i18n'
import type { PlayerProfile } from '../types/models'
import type { LeagueSlug } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const compare = useCompareStore()
const players = usePlayersStore()
const teams = useTeamsStore()

const league = computed(() => route.params.league as LeagueSlug)
const season = computed(() => app.leagueInfo(league.value)?.season ?? '2025')

const seq = ref(0)
const error = ref('')
const profiles = ref<PlayerProfile[]>([])

async function load() {
  const my = ++seq.value
  error.value = ''
  profiles.value = []
  try {
    await ensureLeague(league.value)
    await players.ensureIndex(league.value, season.value)
    if (compare.ids.length === 0) return
    const items = await Promise.all(
      compare.ids.map((id) => players.ensureProfile(league.value, id, season.value).catch(() => null)),
    )
    if (seq.value !== my) return
    profiles.value = items.filter((p): p is PlayerProfile => p != null)
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(load)
watch([league, () => compare.ids], load)

const loading = computed(() => !players.indexes[league.value])

// 统计字段表：4 分类各取几个核心字段做对比
interface Row {
  category: string
  field: string
  label: string
  values: (number | null)[]
  isMaxFlags?: boolean[]
}

const ROWS_DEF: Array<{ category: keyof PlayerProfile['stats']; field: string; label: string }> = [
  { category: 'general', field: 'appearances', label: '出场' },
  { category: 'general', field: 'starts', label: '首发' },
  { category: 'general', field: 'minutes', label: '分钟' },
  { category: 'offensive', field: 'totalGoals', label: '进球' },
  { category: 'offensive', field: 'shotsOnTarget', label: '射正' },
  { category: 'offensive', field: 'totalShots', label: '射门' },
  { category: 'offensive', field: 'accuratePasses', label: '精准传球' },
  { category: 'offensive', field: 'goalAssists', label: '助攻' },
  { category: 'general', field: 'yellowCards', label: '黄牌' },
  { category: 'general', field: 'redCards', label: '红牌' },
  { category: 'defensive', field: 'totalTackles', label: '总抢断' },
  { category: 'defensive', field: 'interceptions', label: '拦截' },
  { category: 'defensive', field: 'totalClearance', label: '总解围' },
]

const rows = computed<Row[]>(() => {
  return ROWS_DEF.map(({ category, field, label }) => {
    const values = profiles.value.map((p) => {
      const cat = p.stats?.[category]
      if (!cat) return null
      return (cat as Record<string, number | null>)[field] ?? null
    })
    const max = Math.max(...values.filter((x): x is number => x !== null))
    const isMaxFlags = values.map((v) => v !== null && v === max)
    return { category, field, label, values, isMaxFlags }
  })
})

function fmtVal(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v)
    return v.toFixed(2)
  }
  return String(v)
}

// 找一行中的最大值用于高亮
function isMax(idx: number, values: (number | null)[]): boolean {
  const v = values[idx]
  if (v === null || v === undefined) return false
  const max = Math.max(...values.filter((x): x is number => x !== null))
  return v === max
}

function teamFor(id: number) {
  return teams.teamById(league.value, id)
}

const searchQ = ref('')
let debounce: ReturnType<typeof setTimeout> | null = null
const searchResults = ref<ReturnType<typeof players.search>>([])

watch(searchQ, (v) => {
  if (debounce) clearTimeout(debounce)
  if (!v.trim()) {
    searchResults.value = []
    return
  }
  debounce = setTimeout(() => {
    searchResults.value = players.search(league.value, v, 5).filter((p) => !compare.includes(p.id))
  }, 200)
})

function addPlayer(id: number) {
  if (compare.isFull) return
  compare.add(id)
  searchQ.value = ''
  searchResults.value = []
}

function removePlayer(id: number) {
  compare.remove(id)
}

function goDetail(id: number) {
  router.push(`/${league.value}/player/${id}`)
}
</script>

<template>
  <section class="py-6">
    <h1 class="font-cond text-2xl font-semibold text-white mb-4">{{ t('compare.title', app.lang) }}</h1>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="loading && compare.ids.length > 0" kind="cards" />
    <template v-else>
      <!-- 搜索框 + 已选球员 -->
      <div class="mb-4">
        <div class="relative max-w-md">
          <input
            v-model="searchQ"
            type="search"
            :placeholder="compare.isFull ? t('compare.maxPlayers', app.lang) : t('compare.placeholder', app.lang)"
            :disabled="compare.isFull"
            class="w-full bg-white/5 border border-white/15 rounded-full px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--league-color)] disabled:opacity-50"
          />
          <div
            v-if="searchResults.length"
            class="absolute top-full mt-1 left-0 w-full bg-[#0c101b] border border-white/15 rounded-lg shadow-xl z-30 overflow-hidden"
          >
            <button
              v-for="r in searchResults"
              :key="r.id"
              type="button"
              @mousedown.prevent="addPlayer(r.id)"
              class="w-full text-left px-3 py-1.5 hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <span class="text-xs font-mono-d text-slate-500 w-4">{{ r.position }}</span>
              <span class="text-sm text-white flex-1 truncate">{{ playerName(r.name, app.lang) }}</span>
              <span class="text-xs text-slate-400 truncate">{{ teamName(r.team, app.lang) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="compare.ids.length === 0" class="text-center text-slate-500 py-12 text-sm">
        {{ t('compare.empty', app.lang) }}
      </div>
      <template v-else>
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-[10px] uppercase tracking-wider text-slate-500 font-mono-d border-b border-white/10">
              <tr>
                <th class="py-2 px-2 text-left w-32">{{ t('col.player', app.lang) }}</th>
                <th v-for="p in profiles" :key="p.id" class="py-2 px-3 text-center min-w-[120px]">
                  <div class="flex flex-col items-center gap-1">
                    <TeamLogo :team="teamFor(p.teamId)" :size="32" />
                    <button class="text-xs text-white hover:underline truncate max-w-[100px]" @click="goDetail(p.id)">
                      {{ playerName(p.displayName, app.lang) }}
                    </button>
                    <button class="text-[9px] text-slate-500 hover:text-red-400" @click="removePlayer(p.id)">
                      {{ t('compare.remove', app.lang) }} ×
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.category + row.field" class="border-b border-white/5">
                <td class="py-2 px-2 text-slate-400 text-xs">{{ row.label }}</td>
                <td v-for="(v, i) in row.values" :key="i" class="py-2 px-3 text-center font-mono-d" :class="isMax(i, row.values) ? 'text-emerald-300' : 'text-slate-300'">
                  {{ fmtVal(v) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="md:hidden">
          <ComparePlayerCardMobile
            v-for="(p, idx) in profiles"
            :key="p.id"
            :profile="p"
            :team="teamFor(p.teamId)"
            :rows="rows"
            :player-index="idx"
            :lang="app.lang"
            @remove="removePlayer(p.id)"
            @click="goDetail(p.id)"
          />
        </div>
      </template>
    </template>
  </section>
</template>
