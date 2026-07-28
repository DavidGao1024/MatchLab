<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import MatchList from '../components/matches/MatchList.vue'
import MonthStrip from '../components/matches/MonthStrip.vue'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { useMatchesStore } from '../stores/matches'
import { currentMonth, defaultMonth, seasonMonths, type LeagueSlug } from '../utils/constants'
import { t } from '../utils/i18n'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const store = useMatchesStore()

const league = computed(() => route.params.league as LeagueSlug)
const season = computed(() => app.leagueInfo(league.value)?.season ?? '2025')
const months = computed(() => seasonMonths(season.value))

// 月份参数校验：YYYY-MM 且在赛季清单内，否则回落默认月份（规格规则 6）
const MONTH_RE = /^\d{4}-\d{2}$/
const month = computed(() => {
  const p = route.params.month
  return typeof p === 'string' && MONTH_RE.test(p) && months.value.includes(p)
    ? p
    : defaultMonth(season.value)
})

const seq = ref(0) // 过期响应防护（规格 v1.5）
const error = ref('')
const loading = ref(false)

async function load() {
  const my = ++seq.value
  error.value = ''
  loading.value = true
  try {
    await ensureLeague(league.value)
    await store.loadMonth(league.value, month.value, season.value)
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq.value === my) loading.value = false
  }
}

function pick(m: string) {
  if (m === month.value) return
  router.push(`/${league.value}/schedule/${m}`) // 路由变化 → watch 触发 load
}

// 空场引导：跳赛季收官月（规格风险表"上赛季数据不在仓库"）
function goLatest() {
  pick(months.value[months.value.length - 1])
}

watch([league, month], load)
onMounted(load)
onUnmounted(() => store.stopPolling()) // 人走轮询停（规格规则 1）

const matches = computed(() => store.months[store.key(league.value, month.value)] ?? [])
const inSeason = computed(() => months.value.includes(currentMonth()))
const offSeason = computed(() => !inSeason.value)
</script>

<template>
  <section class="py-6">
    <h1 class="font-cond text-2xl font-semibold text-white">
      {{ (app.lang === 'zh' ? app.leagueInfo(league)?.nameZh : app.leagueInfo(league)?.name) ?? league }}
      <span class="text-base text-slate-500">{{ t('nav.schedule', app.lang) }}</span>
    </h1>

    <MonthStrip
      class="mt-4"
      :months="months"
      :current="month"
      :live-month="currentMonth()"
      :show-live="inSeason"
      :is-live="store.live"
      @pick="pick"
      @refresh="store.refresh(league, month)"
    />

    <!-- 直播断线 → 快照提示（规格规则 4） -->
    <p v-if="store.fallback" class="mt-2 text-[11px] text-amber-400/90">{{ t('state.liveDown', app.lang) }}</p>
    <!-- 休赛期横幅（规格 §七） -->
    <p v-if="offSeason" class="mt-3 rounded border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400">
      {{ t('schedule.offseason', app.lang) }}
    </p>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="loading" kind="cards" />
    <div v-else-if="store.empty" class="my-12 text-center text-sm text-slate-500">
      {{ t('schedule.noMatches', app.lang) }}
      <button
        v-if="month !== months[months.length - 1]"
        type="button"
        class="mx-auto mt-4 block font-cond text-xs tracking-wider hover:underline"
        style="color: var(--league-color)"
        @click="goLatest"
      >{{ t('schedule.goLatest', app.lang) }}</button>
    </div>
    <MatchList v-else :matches="matches" :league="league" />
  </section>
</template>
