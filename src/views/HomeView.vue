<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import EmptyState from '../components/common/EmptyState.vue'
import LeagueCard from '../components/home/LeagueCard.vue'
import MatchdayStrip from '../components/home/MatchdayStrip.vue'
import MyTeamCard from '../components/home/MyTeamCard.vue'
import { fetchJsonCached } from '../composables/useJsonFetch'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { t } from '../utils/i18n'
import { useStandingsStore } from '../stores/standings'
import { useTeamsStore } from '../stores/teams'
import { useUserDataStore } from '../stores/userData'
import type { Match } from '../types/models'
import type { MatchesFile } from '../types/static'
import { FOCUS_LEAGUE, LEAGUE_SLUGS, defaultMonth, seasonMonths } from '../utils/constants'
import { lastCompletedMatchday, selectStripMatches } from '../utils/matches'

const app = useAppStore()
const standings = useStandingsStore()
const teams = useTeamsStore()
const userStore = useUserDataStore()

onMounted(() => userStore.init())

const focus = FOCUS_LEAGUE
const others = LEAGUE_SLUGS.filter((l) => l !== focus)

// 订阅区网格列数：电脑端永远占满一行——1 队通栏、2 队对半、3 队三分（设计稿 §六）；
// 三个类名均为静态字面量，保证 Tailwind 按需编译能扫到
const subGridCols = computed(() => {
  const n = userStore.subscriptions.length
  if (n <= 1) return 'md:grid-cols-1'
  return n === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
})

const seq = ref(0)
const error = ref('')
const loading = ref(true)

interface Strip {
  matches: Match[] // 该比赛日全部比赛（未筛选）
  utcDate: string
  month: string
}
const strip = ref<Strip | null>(null)

async function load() {
  const my = ++seq.value
  error.value = ''
  loading.value = true
  try {
    await app.loadLeagues()
    const focusInfo = app.leagueInfo(focus)
    const season = focusInfo?.season ?? '2025'
    const sType = focusInfo?.seasonType ?? 'european'
    // 并行：焦点联赛档案 + 其余联赛 teams 档案预热（队徽/队色就位）+ 各联赛正榜
    await Promise.all([
      ensureLeague(focus),
      ...others.map((l) => teams.ensure(l).catch(() => null)),
      ...LEAGUE_SLUGS.map((l) => {
        const li = app.leagueInfo(l)
        const ls = li?.season ?? season
        const lt = li?.seasonType ?? 'european'
        return standings.load(l, ls, { withForm: false, seasonType: lt, forceFresh: true }).catch(() => null)
      }),
    ])
    // "上轮" = 最近一个有完赛的比赛日，从默认月份往前最多回看 2 个月份文件（规格 v1.2）
    const months = seasonMonths(season, sType)
    const from = months.indexOf(defaultMonth(season, sType))
    const scan = months.slice(Math.max(0, from - 1), from + 1).reverse()
    let found: Strip | null = null
    for (const m of scan) {
      if (seq.value !== my) return // 过期响应防护：扫描途中视图已切换则立即放弃
      let matches: Match[]
      try {
        matches = (await fetchJsonCached<MatchesFile>(`data/${focus}/matches/${m}.json`, 60 * 60 * 1000, season, { forceFresh: true })).matches
      } catch {
        continue // 该月文件缺失 → 继续回看
      }
      const d = lastCompletedMatchday(matches)
      if (d) {
        found = { matches: matches.filter((x) => x.date.slice(0, 10) === d), utcDate: d, month: m }
        break
      }
    }
    if (seq.value !== my) return
    strip.value = found
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq.value === my) loading.value = false
  }
}

onMounted(load)

// 选场：榜首/榜二优先 + 开球时间补足 4 场（规格 v1.4 确定性规则）
const stripMatches = computed(() =>
  strip.value ? selectStripMatches(strip.value.matches, standings.rows[focus] ?? []) : [],
)
const topTeamId = computed(() => (standings.rows[focus] ?? []).find((r) => r.rank === 1)?.teamId)
const featuredId = computed(() => {
  const id = topTeamId.value
  if (id === undefined) return ''
  return stripMatches.value.find((m) => m.home.id === id || m.away.id === id)?.eventId ?? ''
})
</script>

<template>
  <div class="py-6 flex flex-col flex-1">
    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="loading && !standings.rows[focus]" kind="cards" />
    <template v-else>
      <!-- ① 订阅主队卡片（无订阅 → 引导去积分榜订阅） -->
      <section v-if="userStore.initialized" class="mb-4">
        <div v-if="userStore.subscriptions.length === 0">
          <EmptyState
            :title="t('home.emptySubTitle', app.lang)"
            :body="t('home.emptySubBody', app.lang)"
          />
        </div>
        <div class="grid gap-3" :class="subGridCols">
          <MyTeamCard
            v-for="sub in userStore.subscriptions"
            :key="sub.teamId"
            :subscription="sub"
          />
        </div>
      </section>

      <!-- ② 上轮战报转播带（查不到完赛比赛日则不出，规格 v1.2） -->
      <MatchdayStrip
        v-if="strip && stripMatches.length"
        :league="focus"
        :utc-date="strip.utcDate"
        :month="strip.month"
        :matches="stripMatches"
        :featured-id="featuredId"
      />

      <!-- ② 联赛板块：焦点大卡 + 小卡网格（6 联赛：1+5） -->
      <div class="mt-6 grid gap-4 lg:grid-cols-12 flex-1">
        <LeagueCard :league="focus" featured class="lg:col-span-7 xl:col-span-5 2xl:col-span-4" />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 lg:col-span-5 xl:col-span-7 2xl:col-span-8">
          <LeagueCard v-for="l in others" :key="l" :league="l" />
        </div>
      </div>
    </template>
  </div>
</template>
