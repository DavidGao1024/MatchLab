<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchLiveScores, fetchTeamInjuries } from '../../composables/useEspanFetch'
import type { Subscription } from '../../types/user-data'
import type { Match } from '../../types/models'

const props = defineProps<{ subscription: Subscription }>()
const router = useRouter()

const todayMatch = ref<Match | null>(null)
const recentMatches = ref<Match[]>([])
const injuries = ref<string[]>([])
const loading = ref(true)

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

async function load() {
  loading.value = true
  try {
    const now = new Date()
    const seasonStart = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    const months = ['08', '09', '10', '11', '12', '01', '02', '03', '04', '05']
    const all = await Promise.all(months.map((m) => {
      const y = Number(m) >= 8 ? seasonStart : seasonStart + 1
      return fetchLiveScores(props.subscription.league, `${y}-${m}`)
    }))
    const teamMatches = all.flat()
      .filter((m) => m.home.id === props.subscription.teamId || m.away.id === props.subscription.teamId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    todayMatch.value = teamMatches.find((m) => isToday(m.date)) ?? null
    const past = teamMatches.filter((m) => new Date(m.date) < now)
    recentMatches.value = past.slice(-3).reverse()
    try {
      const inj = await fetchTeamInjuries(props.subscription.league, props.subscription.teamId)
      injuries.value = inj.slice(0, 3).map((i) => i.name)
    } catch {
      injuries.value = []
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.subscription.teamId, load)

function goTeam() {
  router.push(`/${props.subscription.league}/team/${props.subscription.teamId}`)
}

function scoreLine(m: Match): string {
  if (m.home.score != null && m.away.score != null) {
    return `${m.home.score}-${m.away.score}`
  }
  return 'vs'
}
</script>

<template>
  <div class="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
    <div class="flex items-center justify-between mb-3">
      <h3
        class="font-bold text-lg text-slate-900 dark:text-white cursor-pointer hover:underline"
        @click="goTeam"
      >
        {{ subscription.teamName }}
      </h3>
    </div>
    <div v-if="loading" class="text-sm text-slate-500">加载中...</div>
    <div v-else>
      <div v-if="todayMatch" class="mb-3 p-2 rounded bg-blue-50 dark:bg-blue-900/30">
        <div class="text-xs text-slate-500 dark:text-slate-400">
          今日 {{ new Date(todayMatch.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
        </div>
        <div class="font-medium text-slate-900 dark:text-white">
          {{ todayMatch.home.name }} vs {{ todayMatch.away.name }}
        </div>
      </div>
      <div v-else class="text-sm text-slate-500 dark:text-slate-400 mb-3">今日无赛</div>
      <div v-if="recentMatches.length" class="text-xs space-y-1">
        <div class="text-slate-500 dark:text-slate-400">最近 3 场</div>
        <div v-for="m in recentMatches" :key="m.eventId" class="text-slate-700 dark:text-slate-300">
          {{ m.home.name }} {{ scoreLine(m) }} {{ m.away.name }}
        </div>
      </div>
      <div v-if="injuries.length" class="mt-3 text-xs">
        <div class="text-red-500">伤员：{{ injuries.join('、') }}</div>
      </div>
    </div>
  </div>
</template>
