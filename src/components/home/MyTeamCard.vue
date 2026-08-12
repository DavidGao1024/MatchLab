<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchLiveScores } from '../../composables/useEspanFetch'
import { useStandingsStore } from '../../stores/standings'
import { useTeamsStore } from '../../stores/teams'
import { useAppStore } from '../../stores/app'
import { teamName, t, venueName } from '../../utils/i18n'
import { bannerTheme } from '../../utils/teamColor'
import TeamLogo from '../common/TeamLogo.vue'
import type { Subscription } from '../../types/user-data'
import type { Match, StandingRow, Team } from '../../types/models'

const props = defineProps<{ subscription: Subscription }>()
const router = useRouter()
const standings = useStandingsStore()
const teams = useTeamsStore()
const app = useAppStore()

const todayMatch = ref<Match | null>(null)
const nextMatch = ref<Match | null>(null)
const loading = ref(true)
const error = ref('')

const team = computed<Team | undefined>(() => teams.teamById(props.subscription.league, props.subscription.teamId))
// 球队数据未加载时的兜底身（队徽圆牌与旗色用联赛色顶着）
const flagTeam = computed<Team>(() => team.value ?? {
  id: props.subscription.teamId,
  name: props.subscription.teamName,
  shortDisplayName: props.subscription.teamName,
  abbreviation: '',
  color: app.leagueInfo(props.subscription.league)?.color || '#3D195B',
  alternateColor: '',
  logo: '',
  logoDark: '',
})
const theme = computed(() => bannerTheme(flagTeam.value.color, flagTeam.value.alternateColor))
const themeVars = computed(() => ({
  '--flag-from': theme.value.from,
  '--flag-to': theme.value.to,
  '--flag-stripe': theme.value.stripe,
  '--pin-from': theme.value.pinFrom,
  '--pin-to': theme.value.pinTo,
  '--accent': theme.value.accent,
  '--flag-text': theme.value.darkText ? '#0f172a' : '#ffffff',
}))
const standing = computed<StandingRow | undefined>(() => {
  const rows = standings.rows[props.subscription.league] ?? []
  return rows.find((r) => r.teamId === props.subscription.teamId)
})
const leagueLabel = computed(() => {
  const info = app.leagueInfo(props.subscription.league)
  const zh = info?.nameZh
  const en = info?.name ?? props.subscription.league.toUpperCase()
  return app.lang === 'zh' && zh ? `${zh} · ${en}` : en
})

const live = computed<Match | null>(() =>
  todayMatch.value && todayMatch.value.status === 'in' ? todayMatch.value : null)
const heroMatch = computed<Match | null>(() => live.value ?? todayMatch.value ?? nextMatch.value)
const finalRankText = computed(() => standing.value
  ? t('card.finalRank', app.lang).replace('{n}', String(standing.value.rank))
  : '')

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

// 只需今日赛 + 下场：从当月起逐月向后扫、找到下场即停（设计稿 §五）
async function load() {
  loading.value = true
  error.value = ''
  // 自载本队所属联赛的球队包：首页只预载焦点联赛，订阅队可能来自任何联赛。
  // 只为旗色与队徽，失败静默退回联赛色兜底；包到达后旗面自动换色
  teams.ensure(props.subscription.league).catch(() => {})
  try {
    const now = new Date()
    let today: Match | null = null
    let next: Match | null = null
    for (let i = 0; i <= 10 && !next; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const matches = await fetchLiveScores(props.subscription.league, month)
      const mine = matches.filter((m) =>
        m.home.id === props.subscription.teamId || m.away.id === props.subscription.teamId)
      if (i === 0) {
        today = mine.find((m) => isToday(m.date) && !m.completed) ?? null
      }
      const future = mine
        .filter((m) => new Date(m.date).getTime() > now.getTime())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      if (future.length) next = future[0]
    }
    todayMatch.value = today
    nextMatch.value = next
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

function formatDateLong(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const zh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const wd = app.lang === 'zh' ? zh[d.getDay()] : en[d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()} · ${wd} ${hh}:${mm}`
}
</script>

<template>
  <article class="banner-card" :style="themeVars">
    <div v-if="loading" class="state-pad">{{ t('card.loading', app.lang) }}</div>
    <div v-else-if="error" class="state-pad state-err">{{ error }}</div>
    <div v-else class="card-inner">
      <div
        class="flag"
        :class="{ 'is-light': theme.darkText }"
        role="button"
        tabindex="0"
        :aria-label="displayName(subscription.teamName)"
        @click="goTeam"
        @keydown.enter="goTeam"
        @keydown.space.prevent="goTeam"
      >
        <TeamLogo :team="flagTeam" :size="52" />
        <div class="flag-id">
          <h3 class="flag-name">{{ displayName(subscription.teamName) }}</h3>
          <div class="flag-sub">{{ leagueLabel }}</div>
        </div>
        <div v-if="standing" class="flag-rank">
          <span class="num">{{ standing.rank }}</span>
          <span class="of">/ {{ (standings.rows[subscription.league] ?? []).length || 20 }}</span>
        </div>
      </div>
      <div class="pin"></div>
      <div class="data">
        <section v-if="live" class="match-block">
          <div class="match-label"><span class="live-dot"></span>{{ t('card.live', app.lang) }} · {{ live.clock ?? '—' }}</div>
          <div class="score-line">
            <span class="score-side">{{ displayName(live.home.name) }}</span>
            <span class="score-num">{{ live.home.score ?? 0 }} - {{ live.away.score ?? 0 }}</span>
            <span class="score-side">{{ displayName(live.away.name) }}</span>
          </div>
          <div class="match-venue">◉ {{ venueName(live.venue || '', app.lang) || '—' }}</div>
        </section>
        <section v-else-if="heroMatch" class="match-block">
          <div class="match-label">{{ todayMatch ? t('card.today', app.lang) : t('card.next', app.lang) }} · {{ formatDateLong(heroMatch.date) }}</div>
          <div class="matchup">
            <span class="matchup-side">{{ displayName(heroMatch.home.name) }}</span>
            <span class="matchup-vs">VS</span>
            <span class="matchup-side">{{ displayName(heroMatch.away.name) }}</span>
          </div>
          <div class="match-venue">◉ {{ venueName(heroMatch.venue || '', app.lang) || '—' }}</div>
        </section>
        <section v-else class="match-block">
          <div class="se-line">{{ t('card.seOver', app.lang) }}<template v-if="finalRankText"> · {{ finalRankText }}</template></div>
        </section>
        <div class="stat-row">
          <div class="stat-cell"><div class="stat-label">{{ t('col.won', app.lang) }}</div><div class="stat-val val-w">{{ standing ? standing.won : '–' }}</div></div>
          <div class="stat-cell"><div class="stat-label">{{ t('col.drawn', app.lang) }}</div><div class="stat-val val-d">{{ standing ? standing.drawn : '–' }}</div></div>
          <div class="stat-cell"><div class="stat-label">{{ t('col.lost', app.lang) }}</div><div class="stat-val val-l">{{ standing ? standing.lost : '–' }}</div></div>
          <div class="stat-cell stat-pts"><div class="stat-label">{{ t('col.pts', app.lang) }}</div><div class="stat-val val-pts">{{ standing ? standing.points : '–' }}</div></div>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.banner-card {
  container-type: inline-size;
  border-radius: 14px;
  overflow: hidden;
  background: #10152a;
  border: 1px solid rgba(255,255,255,0.07);
}
.state-pad { padding: 16px; font-size: 14px; color: #64748b; }
.state-err { color: #f87171; }

.card-inner { display: flex; flex-direction: column; }

/* ===== 旗面 ===== */
.flag {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 16px;
  background: linear-gradient(112deg, var(--flag-from), var(--flag-to));
  color: var(--flag-text);
  cursor: pointer;
}
.flag::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(115deg, transparent 0 26px, var(--flag-stripe) 26px 50px);
}
.flag > * { position: relative; }
.flag-id { flex: 1; min-width: 0; }
.flag-name {
  font-family: var(--font-cond, sans-serif);
  font-size: 22px; font-weight: 800; letter-spacing: 0.05em;
  margin: 0; color: var(--flag-text);
  text-shadow: 0 1px 4px rgba(0,0,0,0.35);
  overflow-wrap: anywhere;
}
.flag-sub { font-size: 11px; letter-spacing: 0.14em; opacity: 0.85; margin-top: 2px; }
.flag.is-light .flag-name { text-shadow: none; }
.flag-rank {
  background: rgba(0,0,0,0.34);
  border: 1px solid rgba(255,255,255,0.28);
  border-radius: 9px; padding: 5px 11px;
  font-family: var(--font-cond, sans-serif);
  display: flex; align-items: baseline; gap: 4px;
}
.flag-rank .num { font-size: 18px; font-weight: 800; color: #fff; }
.flag-rank .of { font-size: 10px; color: rgba(255,255,255,0.75); }
.flag.is-light .flag-rank { background: rgba(15,23,42,0.08); border-color: rgba(15,23,42,0.35); }
.flag.is-light .flag-rank .num,
.flag.is-light .flag-rank .of { color: #0f172a; }

.pin { height: 3px; background: linear-gradient(90deg, var(--pin-from), var(--pin-to)); }

/* ===== 数据区 ===== */
.data { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; }
.match-block {
  background: rgba(255,255,255,0.045);
  border-left: 3px solid var(--accent);
  border-radius: 8px; padding: 10px 13px;
}
.match-label {
  font-family: var(--font-mono-d, monospace);
  font-size: 10px; letter-spacing: 0.26em; text-transform: uppercase;
  color: #94a3b8;
  display: flex; align-items: center; gap: 6px;
}
.live-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: #ef4444; box-shadow: 0 0 8px #ef4444;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.matchup { display: flex; align-items: center; gap: 9px; margin-top: 5px; flex-wrap: wrap; }
.matchup-side {
  font-family: var(--font-cond, sans-serif);
  font-size: 17px; font-weight: 800; color: #fff;
  overflow-wrap: anywhere;
}
.matchup-vs { font-size: 11px; color: #64748b; }
.match-venue {
  margin-top: 4px;
  font-family: var(--font-mono-d, monospace);
  font-size: 10px; letter-spacing: 0.12em; color: #64748b;
}
.score-line { display: flex; align-items: baseline; gap: 10px; margin-top: 5px; flex-wrap: wrap; }
.score-side { font-family: var(--font-cond, sans-serif); font-size: 15px; font-weight: 700; color: #fff; }
.score-num { font-family: var(--font-cond, sans-serif); font-size: 26px; font-weight: 800; color: var(--accent); }
.se-line { font-family: var(--font-cond, sans-serif); font-size: 15px; color: #cbd5e1; }

.stat-row { display: flex; gap: 6px; }
.stat-cell {
  flex: 1; background: rgba(255,255,255,0.045);
  border-radius: 8px; padding: 7px 4px; text-align: center;
}
.stat-label { font-family: var(--font-mono-d, monospace); font-size: 9px; letter-spacing: 0.2em; color: #64748b; }
.stat-val { font-family: var(--font-mono-d, monospace); font-size: 17px; font-weight: 800; color: #fff; margin-top: 1px; }
.val-w { color: #10b981; }
.val-d { color: #cbd5e1; }
.val-l { color: #ef4444; }
.stat-pts {
  background: color-mix(in srgb, var(--accent) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
}
.val-pts { color: var(--accent); }

/* ===== 宽形态：单卡通栏，左旗右数（设计稿 §3.2，断点 640px）===== */
@container (min-width: 640px) {
  .card-inner { flex-direction: row; align-items: stretch; }
  .flag {
    width: 34%; min-width: 180px; max-width: 280px;
    flex-direction: column; justify-content: center; text-align: center;
    padding: 20px 16px;
  }
  .flag-id { flex: none; width: 100%; }
  .flag-rank { margin: 8px auto 0; }
  .pin { width: 3px; height: auto; background: linear-gradient(180deg, var(--pin-from), var(--pin-to)); }
  .data { flex: 1; justify-content: center; padding: 16px 20px; }
}
</style>
