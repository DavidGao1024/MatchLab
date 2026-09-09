<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import EmptyState from '../components/common/EmptyState.vue'
import LeagueCard from '../components/home/LeagueCard.vue'
import MatchdayStrip from '../components/home/MatchdayStrip.vue'
import MyTeamCard from '../components/home/MyTeamCard.vue'
import { fetchScoresRange } from '../composables/useEspanFetch'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { t } from '../utils/i18n'
import { useStandingsStore } from '../stores/standings'
import { useTeamsStore } from '../stores/teams'
import { useUserDataStore } from '../stores/userData'
import { FOCUS_LEAGUE, LEAGUE_SLUGS } from '../utils/constants'
import { beijingDay, shiftBjDay } from '../utils/format'
import { findStripDay, pickCrossLeagueStrip, type StripDay, type StripEntry } from '../utils/matches'

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

const strip = ref<StripDay | null>(null)

async function load() {
  const my = ++seq.value
  error.value = ''
  loading.value = true
  try {
    await app.loadLeagues()
    const focusInfo = app.leagueInfo(focus)
    const season = focusInfo?.season ?? '2025'
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
    // 战报带 v2：六联赛并行拉近 9 天实时比分（±时区富余），纯前端判「昨日优先→回看 7 天」
    const today = beijingDay(new Date().toISOString())
    const perLeague = await Promise.all(LEAGUE_SLUGS.map(async (l): Promise<StripEntry[]> => {
      try {
        const ms = await fetchScoresRange(l, shiftBjDay(today, -8), shiftBjDay(today, 1))
        return ms.map((m): StripEntry => ({ match: m, league: l }))
      } catch {
        return [] // 单联赛失败不拖垮战报带
      }
    }))
    if (seq.value !== my) return // 过期响应防护：取数途中代际已变则放弃
    strip.value = findStripDay(perLeague.flat(), today, 7)
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq.value === my) loading.value = false
  }
}

onMounted(load)

// 战报带选场：六联赛轮转封顶 4（规格 v2.0）
const stripPicks = computed(() =>
  strip.value
    ? pickCrossLeagueStrip(
        strip.value.entries,
        Object.fromEntries(LEAGUE_SLUGS.map((l) => [l, standings.rows[l] ?? []])),
      )
    : [],
)
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

      <!-- ② 昨日战报转播带（回看窗内查不到完赛则不出，规格 v2.0） -->
      <MatchdayStrip v-if="strip && stripPicks.length" :day="strip.day" :picks="stripPicks" />

      <!-- ② 联赛板块：六联赛等宽卡（3 列） -->
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 flex-1">
        <LeagueCard v-for="l in LEAGUE_SLUGS" :key="l" :league="l" />
      </div>
    </template>
  </div>
</template>
