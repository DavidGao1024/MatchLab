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
import { fetchJsonCached } from '../../composables/useJsonFetch'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
import type { XgPlayerHistoryFile } from '../../types/static'
import type { LeagueSlug } from '../../utils/constants'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale)

const props = defineProps<{ league: LeagueSlug; understatPlayerId: string | null }>()
const app = useAppStore()

const history = ref<XgPlayerHistoryFile | null>(null)
const loading = ref(false)
const error = ref('')

const TTL = 24 * 60 * 60 * 1000

async function load() {
  loading.value = true
  error.value = ''
  history.value = null
  if (!props.understatPlayerId) {
    loading.value = false
    return
  }
  try {
    // 路径 xg/players/{understat_id}.json
    const path = `data/${props.league}/xg/players/${props.understatPlayerId}.json`
    history.value = await fetchJsonCached<XgPlayerHistoryFile>(path, TTL, 'xg-hist')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => [props.league, props.understatPlayerId], load)

/** 滚动平均：5 场窗口 */
function rollingAvg(arr: (number | null)[], window: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1)
    const slice = arr.slice(start, i + 1).filter((v) => v !== null) as number[]
    out.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null)
  }
  return out
}

const chartData = computed(() => {
  const matches = history.value?.history ?? []
  // 按日期升序
  const sorted = [...matches].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const labels = sorted.map((m) => (m.date || '').slice(5)) // MM-DD
  const xg = sorted.map((m) => m.xG)
  const npxG = sorted.map((m) => m.npxG)
  const xgAvg = rollingAvg(xg, 5)
  return {
    labels,
    datasets: [
      {
        label: t('chart.xG', app.lang),
        data: xg,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        fill: false,
        tension: 0.2,
        pointRadius: 3,
      },
      {
        label: t('chart.npxG', app.lang),
        data: npxG,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        fill: false,
        tension: 0.2,
        pointRadius: 2,
      },
      {
        label: t('chart.rollingAvg', app.lang),
        data: xgAvg,
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        borderDash: [5, 3],
        pointRadius: 0,
      },
    ],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#cbd5e1', font: { size: 11 } } },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: { ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
  },
}))

const hasData = computed(() => (history.value?.history ?? []).length > 0)
</script>

<template>
  <div v-if="props.understatPlayerId" class="border border-white/10 rounded-lg p-4 mb-6 bg-white/[0.02]">
    <h2 class="font-cond text-sm tracking-wider text-white mb-3">{{ t('chart.xgTrend', app.lang) }}</h2>
    <div v-if="loading" class="text-slate-500 text-xs py-8 text-center">…</div>
    <div v-else-if="error || !hasData" class="text-slate-500 text-xs py-8 text-center">{{ t('chart.xgEmpty', app.lang) }}</div>
    <div v-else class="h-64">
      <Line :data="chartData" :options="options" />
    </div>
  </div>
</template>
