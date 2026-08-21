<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
</script>

<template>
  <DataError v-if="error" :message="error" @retry="load" />
  <DataLoading v-else-if="loading" kind="cards" />
  <div v-else-if="schedule.length === 0" class="my-10 text-center text-sm text-slate-500">
    {{ t('team.scheduleEmpty', app.lang) }}
  </div>
  <MatchList v-else :matches="schedule" :league="league" plain />
</template>