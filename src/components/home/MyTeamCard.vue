<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchLiveScores, fetchTeamInjuries } from '../../composables/useEspanFetch'
import { useUserDataStore } from '../../stores/userData'
import { useStandingsStore } from '../../stores/standings'
import { useTeamsStore } from '../../stores/teams'
import { useAppStore } from '../../stores/app'
import { teamName } from '../../utils/i18n'
import type { Subscription } from '../../types/user-data'
import type { Match, StandingRow, Team } from '../../types/models'

const props = defineProps<{ subscription: Subscription }>()
const router = useRouter()
const userStore = useUserDataStore()
const standings = useStandingsStore()
const teams = useTeamsStore()
const app = useAppStore()

const todayMatch = ref<Match | null>(null)
const nextMatch = ref<Match | null>(null)        // hero 在无 todayMatch 时用
const afterNextMatch = ref<Match | null>(null)   // footer 用（既非 today 也非 next）
const recentMatches = ref<Match[]>([])
const injuries = ref<string[]>([])
const loading = ref(true)
const error = ref('')

const team = computed<Team | undefined>(() => teams.teamById(props.subscription.league, props.subscription.teamId))
const teamColor = computed(() => team.value?.color || app.leagueInfo(props.subscription.league)?.color || '#3D195B')
const standing = computed<StandingRow | undefined>(() => {
  const rows = standings.rows[props.subscription.league] ?? []
  return rows.find((r) => r.teamId === props.subscription.teamId)
})
const layoutMode = computed<'wide' | 'narrow'>(() => userStore.subscriptions.length === 1 ? 'wide' : 'narrow')
const isWide = computed(() => layoutMode.value === 'wide')

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const now = new Date()
    const months: string[] = []
    for (let i = -12; i <= 10; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      months.push(`${y}-${m}`)
    }
    const all = await Promise.all(
      months.map((m) => fetchLiveScores(props.subscription.league, m)),
    )
    const teamMatches = all.flat()
      .filter((m) => m.home.id === props.subscription.teamId || m.away.id === props.subscription.teamId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    todayMatch.value = teamMatches.find((m) => isToday(m.date)) ?? null
    const future = teamMatches.filter((m) => new Date(m.date) > now)
    // nextMatch = 第一个非 todayMatch 的 future（hero 在无 todayMatch 时用）
    nextMatch.value = future.find((m) => m.eventId !== todayMatch.value?.eventId) ?? null
    // afterNextMatch = 第三个 future（既非 todayMatch 也非 nextMatch，footer 用）
    afterNextMatch.value = future.find((m) =>
      m.eventId !== todayMatch.value?.eventId && m.eventId !== nextMatch.value?.eventId
    ) ?? null
    const past = teamMatches.filter((m) =>
      new Date(m.date) < now && m.eventId !== todayMatch.value?.eventId
    )
    recentMatches.value = past.slice(-3).reverse()
    try {
      const inj = await fetchTeamInjuries(props.subscription.league, props.subscription.teamId)
      injuries.value = inj.slice(0, 3).map((i) => i.name)
    } catch {
      injuries.value = []
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.subscription.teamId, load)

function goTeam() {
  router.push(`/${props.subscription.league}/team/${props.subscription.teamId}`)
}

function displayName(name: string): string {
  return teamName(name, app.lang)
}

function scoreLine(m: Match): string {
  if (m.home.score != null && m.away.score != null) {
    return `${m.home.score}-${m.away.score}`
  }
  return 'vs'
}

type Tone = 'w' | 'd' | 'l' | 'none'
function matchTone(m: Match): Tone {
  if (m.status !== 'post' || m.home.score == null || m.away.score == null) return 'none'
  const mine = props.subscription.teamId
  const myHome = m.home.id === mine
  const myScore = myHome ? m.home.score : m.away.score
  const oppScore = myHome ? m.away.score : m.home.score
  if (myScore > oppScore) return 'w'
  if (myScore < oppScore) return 'l'
  return 'd'
}

function formatCountdown(targetIso: string): string {
  const ms = new Date(targetIso).getTime() - Date.now()
  if (ms <= 0) return '00D 00H 00M'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${String(d).padStart(2, '0')}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M`
}

function formatKickoff(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm} 北京`
}

function formatKickoffTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm} UTC`
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLong(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}/${d.getDate()} · ${weekdays[d.getDay()]} ${hh}:${mm}`
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
