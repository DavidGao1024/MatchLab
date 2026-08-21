<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import MatchCard from '../matches/MatchCard.vue'
import MatchList from '../matches/MatchList.vue'
import DataError from '../common/DataError.vue'
import DataLoading from '../common/DataLoading.vue'
import { useAppStore } from '../../stores/app'
import { useMatchesStore } from '../../stores/matches'
import type { LeagueSlug } from '../../utils/constants'
import { t } from '../../utils/i18n'

const props = defineProps<{ league: LeagueSlug; teamId: number }>()
const app = useAppStore()
const store = useMatchesStore()

const season = computed(() => app.leagueInfo(props.league)?.season ?? '2025')
const seasonType = computed(() => app.leagueInfo(props.league)?.seasonType ?? 'european')

const seq = ref(0)
const error = ref('')
const loading = ref(false)

async function load() {
  const my = ++seq.value
  error.value = ''
  loading.value = true
  try {
    await store.loadTeamSchedule(props.league, props.teamId, season.value, seasonType.value)
    if (seq.value !== my) return
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq.value === my) loading.value = false
  }
}

onMounted(load)
// 必须 watch season/seasonType：app.leagues 异步加载，深链时先 fallback 后修正
watch([() => props.league, () => props.teamId, season, seasonType], load)

const schedule = computed(() => store.teamSchedules[`${props.league}/${props.teamId}`] ?? [])

// schedule 已按 date 正序：最后一场已赛 = 上一场；第一场未赛 = 下一场
const lastResult = computed(() => schedule.value.filter((m) => m.status === 'post').slice(-1)[0])
const nextMatch = computed(() => schedule.value.find((m) => m.status !== 'post'))
</script>

<template>
  <DataError v-if="error" :message="error" @retry="load" />
  <DataLoading v-else-if="loading" kind="cards" />
  <div v-else-if="schedule.length === 0" class="my-10 text-center text-sm text-slate-500">
    {{ t('team.scheduleEmpty', app.lang) }}
  </div>
  <template v-else>
    <!-- 双卡：上一场 / 下一场 -->
    <div class="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div v-if="lastResult" class="rounded-lg border border-white/10 bg-[#131a2b] p-3">
        <div class="mb-2 font-cond text-[10px] uppercase tracking-[0.14em] text-slate-500">
          {{ t('team.lastMatch', app.lang) }}
        </div>
        <MatchCard :match="lastResult" :league="league" :self-team-id="teamId" />
      </div>
      <div
        v-if="nextMatch"
        class="rounded-lg border border-white/10 bg-[#131a2b] p-3"
        :style="{ borderLeftWidth: '3px', borderLeftColor: 'var(--accent, var(--league-color))' }"
      >
        <div
          class="mb-2 font-cond text-[10px] uppercase tracking-[0.14em]"
          :style="{ color: 'var(--accent, var(--league-color))' }"
        >
          {{ t('team.nextMatch', app.lang) }}
        </div>
        <MatchCard :match="nextMatch" :league="league" :self-team-id="teamId" />
      </div>
    </div>

    <!-- 完整列表（含双卡那两场） -->
    <MatchList :matches="schedule" :league="league" :self-team-id="teamId" />
  </template>
</template>
