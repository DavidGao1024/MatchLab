<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import StandingsTable from '../components/standings/StandingsTable.vue'
import { ensureLeague } from '../composables/useLeague'
import { useTimezone } from '../composables/useTimezone'
import { useAppStore } from '../stores/app'
import { useStandingsStore } from '../stores/standings'
import { useTeamsStore } from '../stores/teams'
import { t } from '../utils/i18n'
import type { LeagueSlug } from '../utils/constants'

const route = useRoute()
const app = useAppStore()
const store = useStandingsStore()
const teams = useTeamsStore()
const tz = useTimezone()

const league = computed(() => route.params.league as LeagueSlug)
const season = computed(() => app.leagueInfo(league.value)?.season ?? '2025')
const seasonType = computed(() => app.leagueInfo(league.value)?.seasonType ?? 'european')
const seasonLabel = computed(() =>
  seasonType.value === 'calendar' ? season.value : `${season.value}-${String(Number(season.value) + 1).slice(2)}`,
)

const seq = ref(0) // 过期响应防护（规格 v1.5）
const error = ref('')
const xgNotice = ref(false)

async function load() {
  const my = ++seq.value
  error.value = ''
  xgNotice.value = false
  try {
    await ensureLeague(league.value) // 加载顺序契约：队徽/主色先就位
    await store.load(league.value, season.value, { seasonType: seasonType.value })
    if (seq.value !== my) return // 过期响应防护（规格 v1.5）：返回时视图已切换则放弃后续处理（store 按联赛命名空间隔离，数据本身不串）
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function onToggleXg() {
  try {
    xgNotice.value = false
    await store.toggleXg(league.value, season.value)
  } catch {
    xgNotice.value = true // 开关保持关 + 提示，主表不受影响（验收 3）
  }
}

onMounted(load)
watch(league, load)

const rows = computed(() => store.rows[league.value] ?? [])
const meta = computed(() => teams.bundles[league.value]?.meta)
const ready = computed(() => !store.loading[league.value] && rows.value.length > 0)
</script>

<template>
  <section class="py-6">
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <h1 class="font-cond text-2xl font-semibold text-white">
        {{ app.lang === 'zh' ? meta?.nameZh : meta?.displayName }}
        <span class="text-base text-slate-500">{{ t('standings.season', app.lang) }} {{ seasonLabel }}</span>
      </h1>
      <p class="font-mono-d text-[10px] text-slate-500">
        {{ t('standings.updated', app.lang) }} {{ store.updateTime[league] ? tz.updated(store.updateTime[league]!) : '—' }}
      </p>
      <label class="ml-auto inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
        <input type="checkbox" class="accent-[var(--league-color)]" :checked="!!store.xgOn[league]" @change="onToggleXg" />
        {{ t('standings.xgToggle', app.lang) }}
      </label>
    </div>

    <p v-if="xgNotice" class="mt-2 text-[11px] text-amber-400/90">xG · {{ t('state.error', app.lang) }}</p>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="!ready" kind="table" />
    <StandingsTable v-else :rows="rows" :league="league" :show-xg="!!store.xgOn[league]" />
  </section>
</template>
