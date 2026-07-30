<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Title,
} from 'chart.js'
import { fetchCoreJsonCached } from '../../composables/useEspnCoreFetch'
import { fetchJsonCached } from '../../composables/useJsonFetch'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
import type { PlayerFile, PlayerStats, SeasonsFile } from '../../types/static'
import type { LeagueSlug } from '../../utils/constants'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale)

const props = defineProps<{ league: LeagueSlug; playerId: number; currentSeason: string }>()
const app = useAppStore()

interface SeasonPoint {
  year: string
  goals: number | null
  assists: number | null
}

const data = ref<SeasonPoint[]>([])
const loading = ref(true)
const error = ref('')

const TTL = 24 * 60 * 60 * 1000

/** 从 ESPN core 原始响应抽 4 分类 stats，归一化为 {cat: {field: value}} */
function extractFromCore(raw: unknown): PlayerStats | null {
  const r = raw as { splits?: { categories?: Array<{ name: string; stats?: Array<{ name: string; value: number | null }> }> } }
  const cats = r?.splits?.categories
  if (!Array.isArray(cats)) return null
  const out: PlayerStats = {}
  for (const c of cats) {
    if (!c.name || !Array.isArray(c.stats)) continue
    const flat: Record<string, number | null> = {}
    for (const s of c.stats) if (s && s.name != null) flat[s.name] = s.value ?? null
    out[c.name as keyof PlayerStats] = flat
  }
  return Object.keys(out).length ? out : null
}

/** 从 PlayerStats（4 分类）里找 goals/assists */
function pickGA(stats: PlayerStats | null): { goals: number | null; assists: number | null } {
  if (!stats) return { goals: null, assists: null }
  let goals: number | null = null
  let assists: number | null = null
  for (const cat of Object.values(stats)) {
    if (!cat || typeof cat !== 'object') continue
    for (const [k, v] of Object.entries(cat)) {
      if (goals === null && (k === 'totalGoals' || k === 'goals')) goals = v
      if (assists === null && (k === 'assists' || k === 'goalAssists')) assists = v
    }
  }
  return { goals, assists }
}

async function loadSeasonsList(): Promise<string[]> {
  try {
    const f = await fetchJsonCached<SeasonsFile>(`data/${props.league}/seasons.json`, TTL, 'seasons')
    return f.seasons.map((s) => String(s.year))
  } catch {
    const cur = Number(props.currentSeason)
    return Array.from({ length: 8 }, (_, i) => String(cur - i))
  }
}

async function load() {
  loading.value = true
  error.value = ''
  data.value = []
  try {
    const seasons = await loadSeasonsList()
    // 过滤未来赛季（year > 当前赛季）+ 取最近 8 个赛季，按年份升序
    const curYear = Number(props.currentSeason)
    const past = seasons.filter((y) => Number(y) <= curYear)
    const years = past.slice(0, 8).sort((a, b) => Number(a) - Number(b))

    const results: SeasonPoint[] = []
    const concurrency = 4
    for (let i = 0; i < years.length; i += concurrency) {
      const batch = years.slice(i, i + concurrency)
      const items = await Promise.all(
        batch.map(async (year): Promise<SeasonPoint> => {
          if (year === props.currentSeason) {
            // 当前赛季：优先用静态 JSON（已 fetch）
            try {
              const pf = await fetchJsonCached<PlayerFile>(`data/${props.league}/players/${props.playerId}.json`, TTL, year)
              return { year, ...pickGA(pf.stats || null) }
            } catch {
              // 静态文件丢失 → 走 core
            }
          }
          // 历史赛季：浏览器直连 ESPN core athleteSeasonStats
          const path = `/sports/soccer/leagues/${props.league}/seasons/${year}/types/1/athletes/${props.playerId}/statistics/0`
          try {
            const raw = await fetchCoreJsonCached<unknown>(path, TTL)
            return { year, ...pickGA(extractFromCore(raw)) }
          } catch {
            return { year, goals: null, assists: null }
          }
        }),
      )
      results.push(...items)
    }
    data.value = results
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => [props.league, props.playerId], load)

const chartData = computed(() => ({
  labels: data.value.map((d) => d.year),
  datasets: [
    {
      label: t('chart.goals', app.lang),
      data: data.value.map((d) => d.goals),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      tension: 0.3,
      fill: false,
    },
    {
      label: t('chart.assists', app.lang),
      data: data.value.map((d) => d.assists),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      tension: 0.3,
      fill: false,
    },
  ],
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#cbd5e1', font: { size: 11 } } },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
  },
}))

const hasData = computed(() => data.value.some((d) => d.goals !== null || d.assists !== null))
</script>

<template>
  <div class="border border-white/10 rounded-lg p-4 mb-6 bg-white/[0.02]">
    <h2 class="font-cond text-sm tracking-wider text-white mb-3">{{ t('chart.careerCurve', app.lang) }}</h2>
    <div v-if="loading" class="text-slate-500 text-xs py-8 text-center">{{ t('chart.careerLoading', app.lang) }}</div>
    <div v-else-if="error" class="text-amber-400/80 text-xs py-8 text-center">{{ error }}</div>
    <div v-else-if="!hasData" class="text-slate-500 text-xs py-8 text-center">{{ t('chart.careerEmpty', app.lang) }}</div>
    <div v-else class="h-64">
      <Line :data="chartData" :options="options" />
    </div>
  </div>
</template>
