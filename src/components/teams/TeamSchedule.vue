<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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
    if (seq.value === my) {
      loading.value = false
      await nextTick()
      scrollToAnchor()
    }
  }
}

function scrollToAnchor() {
  const id = anchorId.value
  if (!id) return
  const el = document.getElementById(id)
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ block: 'start' })
  }
}

onMounted(load)
// 必须 watch season/seasonType：app.leagues 异步加载，深链时先 fallback 后修正
watch([() => props.league, () => props.teamId, season, seasonType], load)

const schedule = computed(() => store.teamSchedules[`${props.league}/${props.teamId}`] ?? [])

// 锚点：最后一场已赛（上一场），无已赛则第一场
const anchorId = computed(() => {
  const played = schedule.value.filter((m) => m.status === 'post')
  const target = played.length ? played[played.length - 1] : schedule.value[0]
  return target ? `match-${target.eventId}` : ''
})
</script>

<template>
  <DataError v-if="error" :message="error" @retry="load" />
  <DataLoading v-else-if="loading" kind="cards" />
  <div v-else-if="schedule.length === 0" class="my-10 text-center text-sm text-slate-500">
    {{ t('team.scheduleEmpty', app.lang) }}
  </div>
  <template v-else>
    <!-- 完整列表（全部比赛） -->
    <MatchList :matches="schedule" :league="league" plain />
  </template>
</template>
