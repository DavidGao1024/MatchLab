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
  <article
    :style="{ '--team-color': teamColor }"
    :class="isWide ? 'wide-card' : 'narrow-card'"
  >
    <!-- Loading 态 -->
    <div v-if="loading" class="p-4 text-sm text-slate-500">加载中...</div>

    <!-- 错误态 -->
    <div v-else-if="error" class="p-4 text-sm text-red-400">{{ error }}</div>

    <!-- Wide 模式（1 队订阅） -->
    <div v-else-if="isWide" class="wide-body">
      <!-- Header -->
      <header class="wide-header">
        <span class="tag">订阅主队</span>
        <span class="league">{{ subscription.league.toUpperCase() }}</span>
        <h3
          class="team-name"
          role="button"
          tabindex="0"
          @click="goTeam"
          @keydown.enter="goTeam"
          @keydown.space.prevent="goTeam"
        >{{ displayName(subscription.teamName) }}</h3>
        <div v-if="standing" class="rank-badge">
          <span class="num">{{ standing.rank }}</span>
          <span class="of">/ {{ (standings.rows[subscription.league] ?? []).length || 20 }}</span>
        </div>
      </header>

      <!-- Main 3 列 grid -->
      <div class="wide-grid">
        <!-- 列 1：今日赛英雄区 -->
        <section class="hero-block">
          <div v-if="todayMatch?.status === 'in'" class="hero-meta">
            <span class="live-dot live"></span>进行中 · {{ todayMatch.clock ?? '—' }}
          </div>
          <div v-else-if="todayMatch" class="hero-meta">
            <span class="live-dot"></span>今日 · {{ formatKickoff(todayMatch.date) }}
          </div>
          <div v-else-if="nextMatch" class="hero-meta">
            <span class="next-dot"></span>下场 · {{ formatKickoff(nextMatch.date) }}
          </div>
          <div v-else class="hero-meta">赛季已结束</div>

          <div v-if="todayMatch || nextMatch" class="hero-matchup">
            <div class="hero-side left">
              <span class="hero-abbr">{{ displayName((todayMatch ?? nextMatch)!.home.name) }}</span>
            </div>
            <div class="hero-vs">VS</div>
            <div class="hero-side right">
              <span class="hero-abbr">{{ displayName((todayMatch ?? nextMatch)!.away.name) }}</span>
            </div>
          </div>

          <div v-if="todayMatch?.status === 'in'" class="kickoff-row">
            <span>进行中 <span class="kickoff-time">{{ todayMatch.home.score ?? 0 }} - {{ todayMatch.away.score ?? 0 }}</span></span>
            <span class="countdown">{{ todayMatch.clock ?? '—' }}</span>
          </div>
          <div v-else-if="todayMatch || nextMatch" class="kickoff-row">
            <span>开球 <span class="kickoff-time">{{ formatKickoffTime((todayMatch ?? nextMatch)!.date) }}</span></span>
            <span class="countdown">{{ formatCountdown((todayMatch ?? nextMatch)!.date) }}</span>
          </div>
          <div v-if="todayMatch || nextMatch" class="venue-row">◉ {{ (todayMatch ?? nextMatch)!.venue || '—' }}</div>
        </section>

        <!-- 列 2：最近 3 场 -->
        <section class="recent-block">
          <div class="section-label">最近 3 场</div>
          <div v-if="!recentMatches.length" class="empty-placeholder">暂无最近比赛</div>
          <div v-for="m in recentMatches" :key="m.eventId" class="vs-row">
            <div class="vs-side home">
              <span :class="m.home.id === subscription.teamId ? 'name mine' : 'name opp'">{{ displayName(m.home.name) }}</span>
            </div>
            <div>
              <div :class="`vs-score ${matchTone(m)}`">{{ scoreLine(m) }}</div>
              <div class="vs-date">{{ formatDateShort(m.date) }}</div>
            </div>
            <div class="vs-side away">
              <span :class="m.away.id === subscription.teamId ? 'name mine' : 'name opp'">{{ displayName(m.away.name) }}</span>
            </div>
          </div>
        </section>

        <!-- 列 3：战绩区 -->
        <section class="stats-block">
          <div class="section-label">赛季战绩</div>
          <div v-if="standing" class="wdl">
            <div class="wdl-cell wdl-w"><div class="wdl-label">W</div><div class="wdl-val">{{ standing.won }}</div></div>
            <div class="wdl-cell wdl-d"><div class="wdl-label">D</div><div class="wdl-val">{{ standing.drawn }}</div></div>
            <div class="wdl-cell wdl-l"><div class="wdl-label">L</div><div class="wdl-val">{{ standing.lost }}</div></div>
          </div>
          <div v-else class="wdl-skeleton">—</div>
          <div v-if="standing" class="points-row">
            <span class="points-label">积分</span>
            <span class="points-val">{{ standing.points }}</span>
          </div>
          <div v-if="standing && standing.form?.length" class="form-row">
            <div class="section-label">最近 5 场</div>
            <div class="form-pills">
              <span v-for="(f, i) in standing.form" :key="i" :class="`pill ${f.toLowerCase()}`">{{ f }}</span>
            </div>
          </div>
          <div v-if="standing" class="gf-ga">
            <div class="gf-ga-cell"><span class="gf-ga-label">GF</span><span class="gf-ga-val">{{ standing.goalsFor }}</span></div>
            <div class="gf-ga-cell"><span class="gf-ga-label">GA</span><span class="gf-ga-val">{{ standing.goalsAgainst }}</span></div>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <footer class="wide-footer">
        <div v-if="injuries.length" class="inj-block">
          <span class="inj-label">伤员</span>
          <span class="inj-names">{{ injuries.join(' · ') }}</span>
        </div>
        <div v-if="afterNextMatch" class="next-game">
          <div class="next-label">下场</div>
          <div class="next-match">{{ displayName(afterNextMatch.home.name) }} vs {{ displayName(afterNextMatch.away.name) }}</div>
          <div class="next-meta">{{ formatDateLong(afterNextMatch.date) }}</div>
        </div>
      </footer>
    </div>

    <!-- Narrow 模式（2-3 队订阅） -->
    <div v-else class="narrow-body">
      <header class="narrow-header">
        <span class="tag">订阅主队</span>
        <span class="league">{{ subscription.league.toUpperCase() }}</span>
        <h3
          class="team-name"
          role="button"
          tabindex="0"
          @click="goTeam"
          @keydown.enter="goTeam"
          @keydown.space.prevent="goTeam"
        >{{ displayName(subscription.teamName) }}</h3>
      </header>
      <div v-if="todayMatch" class="today-mini">
        <div class="today-meta">今日 · {{ formatKickoff(todayMatch.date) }}</div>
        <div class="mini-matchup">
          <span class="mini-side left">{{ displayName(todayMatch.home.name) }}</span>
          <span class="vs-text">VS</span>
          <span class="mini-side right">{{ displayName(todayMatch.away.name) }}</span>
        </div>
        <div class="kickoff">{{ formatKickoffTime(todayMatch.date) }}</div>
      </div>
      <div v-else-if="nextMatch" class="today-mini">
        <div class="today-meta">下场 · {{ formatKickoff(nextMatch.date) }}</div>
        <div class="mini-matchup">
          <span class="mini-side left">{{ displayName(nextMatch.home.name) }}</span>
          <span class="vs-text">VS</span>
          <span class="mini-side right">{{ displayName(nextMatch.away.name) }}</span>
        </div>
        <div class="kickoff">{{ formatKickoffTime(nextMatch.date) }}</div>
      </div>
      <div v-else class="today-mini"><div class="today-meta">赛季已结束</div></div>

      <div class="section-label">最近 3 场</div>
      <div v-if="!recentMatches.length" class="empty-placeholder">暂无最近比赛</div>
      <div v-for="m in recentMatches" :key="m.eventId" class="vs-row">
        <div class="vs-side home">
          <span :class="m.home.id === subscription.teamId ? 'name mine' : 'name opp'">{{ displayName(m.home.name) }}</span>
        </div>
        <div>
          <div :class="`vs-score ${matchTone(m)}`">{{ scoreLine(m) }}</div>
          <div class="vs-date">{{ formatDateShort(m.date) }}</div>
        </div>
        <div class="vs-side away">
          <span :class="m.away.id === subscription.teamId ? 'name mine' : 'name opp'">{{ displayName(m.away.name) }}</span>
        </div>
      </div>

      <div v-if="injuries.length" class="inj-bar">
        <span class="inj-label">伤员</span>{{ injuries.join(' · ') }}
      </div>
    </div>
  </article>
</template>

<style scoped>
.wide-card, .narrow-card {
  background: linear-gradient(180deg, color-mix(in srgb, var(--team-color) 16%, #10152a), #10152a);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.narrow-card { border-radius: 12px; }

/* === Wide === */
.wide-body { display: flex; flex-direction: column; }
.wide-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 24px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--team-color) 25%, transparent);
}
.tag {
  border: 1px solid color-mix(in srgb, var(--team-color) 60%, transparent);
  color: color-mix(in srgb, var(--team-color) 75%, white);
  padding: 3px 10px; border-radius: 4px;
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  letter-spacing: 0.22em; text-transform: uppercase;
}
.league {
  font-family: var(--font-mono-d, monospace); font-size: 11px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.18em;
}
.team-name {
  font-family: var(--font-cond, sans-serif);
  font-size: 32px; letter-spacing: 0.02em;
  color: #fff; cursor: pointer; margin: 0;
}
.narrow-card .team-name { font-size: 22px; margin-left: auto; }
.rank-badge {
  margin-left: auto;
  background: color-mix(in srgb, var(--team-color) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--team-color) 45%, transparent);
  border-radius: 6px; padding: 6px 12px;
  font-family: var(--font-cond, sans-serif);
  display: flex; align-items: baseline; gap: 6px;
}
.rank-badge .num { font-size: 22px; color: #fff; }
.rank-badge .of { font-size: 11px; color: var(--slate-400, #94a3b8); letter-spacing: 0.12em; }

.wide-grid {
  display: grid; grid-template-columns: 1.5fr 1fr 1.1fr;
  gap: 16px; padding: 16px 24px 0;
}
@media (max-width: 980px) { .wide-grid { grid-template-columns: 1fr; } }

.hero-block {
  background: rgba(0,0,0,0.32);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 10px; padding: 14px 16px;
}
.hero-meta {
  font-family: var(--font-mono-d, monospace); font-size: 10px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.22em; text-transform: uppercase;
}
.live-dot, .next-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  margin-right: 6px; vertical-align: middle;
}
.live-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
.live-dot.live { background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: pulse 1.2s ease-in-out infinite; }
.next-dot { background: var(--team-color); }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.hero-matchup {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 10px; margin-top: 10px;
}
.hero-side { display: flex; align-items: center; gap: 10px; }
.hero-side.left { justify-content: flex-end; }
.hero-side.right { justify-content: flex-start; }
.hero-abbr { font-family: var(--font-cond, sans-serif); font-size: 22px; letter-spacing: 0.04em; color: #fff; }
.hero-vs { font-family: var(--font-cond, sans-serif); font-size: 14px; color: var(--slate-500, #64748b); }
.kickoff-row {
  margin-top: 12px; padding-top: 10px;
  border-top: 1px dashed rgba(255,255,255,0.08);
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  font-family: var(--font-mono-d, monospace); font-size: 11px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.12em;
}
.kickoff-time { color: #fff; font-weight: 600; font-size: 13px; }
.countdown {
  font-family: var(--font-cond, sans-serif); font-size: 22px;
  color: var(--team-color); letter-spacing: 0.06em;
}
.venue-row {
  margin-top: 6px;
  font-family: var(--font-mono-d, monospace); font-size: 10px;
  color: var(--slate-500, #64748b); letter-spacing: 0.12em;
}

.section-label {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: var(--slate-500, #64748b); letter-spacing: 0.22em; text-transform: uppercase;
  margin-bottom: 6px;
}
.empty-placeholder {
  color: var(--slate-600, #475569);
  font-size: 12px;
  padding: 8px 0;
  font-family: var(--font-mono-d, monospace);
  letter-spacing: 0.12em;
}

/* === vs row（wide + narrow 共用）=== */
.vs-row {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(255,255,255,0.06);
  font-family: var(--font-cond, sans-serif);
}
.vs-row:last-child { border-bottom: 0; }
.vs-side { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 13px; letter-spacing: 0.04em; }
.vs-side.home { justify-content: flex-end; }
.vs-side.away { justify-content: flex-start; }
.vs-side .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vs-side .name.mine { color: #fff; font-weight: 600; }
.vs-side .name.opp { color: var(--slate-400, #94a3b8); }
.vs-score {
  font-family: var(--font-mono-d, monospace); font-size: 13px; font-weight: 500;
  padding: 0 6px; min-width: 40px; text-align: center;
}
.vs-score.w { color: #10b981; }
.vs-score.d { color: #cbd5e1; }
.vs-score.l { color: #ef4444; }
.vs-score.none { color: var(--slate-400, #94a3b8); }
.vs-date {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: var(--slate-600, #475569); letter-spacing: 0.12em; text-align: center; margin-top: 1px;
}
.narrow-card .vs-side { font-size: 12px; }
.narrow-card .vs-score { font-size: 11px; }

/* === stats === */
.wdl {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
  font-family: var(--font-mono-d, monospace);
}
.wdl-cell {
  background: rgba(255,255,255,0.03); border-radius: 4px; padding: 6px 8px;
  border: 1px solid rgba(255,255,255,0.04);
}
.wdl-label { font-size: 9px; color: var(--slate-500, #64748b); letter-spacing: 0.18em; }
.wdl-val { font-size: 16px; font-weight: 600; margin-top: 2px; color: #fff; }
.wdl-w .wdl-val { color: #10b981; }
.wdl-d .wdl-val { color: #cbd5e1; }
.wdl-l .wdl-val { color: #ef4444; }
.wdl-skeleton { color: var(--slate-600, #475569); padding: 8px; }
.points-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-top: 8px; padding: 6px 8px;
  background: color-mix(in srgb, var(--team-color) 10%, transparent);
  border-radius: 4px;
}
.points-label { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-400, #94a3b8); letter-spacing: 0.18em; text-transform: uppercase; }
.points-val { font-family: var(--font-cond, sans-serif); font-size: 22px; color: var(--team-color); }
.form-row { margin-top: 10px; }
.form-pills { display: flex; gap: 4px; }
.pill {
  width: 22px; height: 22px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono-d, monospace); font-size: 11px; font-weight: 600;
}
.pill.w { background: rgba(16,185,129,0.18); color: #10b981; }
.pill.d { background: rgba(148,163,184,0.15); color: #cbd5e1; }
.pill.l { background: rgba(239,68,68,0.18); color: #ef4444; }
.gf-ga {
  margin-top: 10px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  font-family: var(--font-mono-d, monospace); font-size: 11px;
}
.gf-ga-cell {
  background: rgba(255,255,255,0.03); padding: 6px 8px; border-radius: 4px;
  display: flex; justify-content: space-between; align-items: baseline;
}
.gf-ga-label { color: var(--slate-500, #64748b); font-size: 9px; letter-spacing: 0.18em; }
.gf-ga-val { color: #fff; font-weight: 600; font-size: 14px; }

/* === wide footer === */
.wide-footer {
  margin: 14px 24px 18px; padding: 10px 14px;
  background: rgba(0,0,0,0.22); border-radius: 8px;
  display: grid; grid-template-columns: 1fr auto;
  gap: 12px; align-items: center;
  border: 1px solid rgba(255,255,255,0.05);
}
.inj-block {
  border-left: 3px solid #ef4444; padding-left: 10px;
  font-size: 12px; color: #fca5a5;
  display: flex; align-items: center; gap: 10px;
}
.inj-label {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: #ef4444; letter-spacing: 0.22em; text-transform: uppercase;
}
.next-game { text-align: right; font-family: var(--font-mono-d, monospace); }
.next-label { font-size: 9px; color: var(--slate-500, #64748b); letter-spacing: 0.22em; text-transform: uppercase; }
.next-match { font-family: var(--font-cond, sans-serif); font-size: 16px; color: #fff; letter-spacing: 0.04em; margin-top: 2px; }
.next-meta { font-size: 10px; color: var(--slate-400, #94a3b8); margin-top: 2px; letter-spacing: 0.12em; }

/* === narrow === */
.narrow-body { padding: 12px 14px 10px; display: flex; flex-direction: column; gap: 8px; }
.narrow-header { display: flex; align-items: center; gap: 8px; }
.today-mini {
  padding: 8px 10px;
  background: rgba(0,0,0,0.30);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 6px;
}
.today-meta { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-400, #94a3b8); letter-spacing: 0.18em; text-transform: uppercase; }
.mini-matchup { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 6px; margin-top: 4px; }
.mini-side { font-family: var(--font-cond, sans-serif); font-size: 14px; color: #fff; }
.mini-side.left { text-align: right; }
.vs-text { color: var(--slate-500, #64748b); font-size: 10px; font-family: var(--font-mono-d, monospace); text-align: center; }
.kickoff { font-family: var(--font-cond, sans-serif); font-size: 14px; color: var(--team-color); text-align: center; margin-top: 2px; }
.inj-bar {
  padding: 5px 8px;
  border-left: 2px solid #ef4444;
  background: rgba(239,68,68,0.06);
  font-size: 10px; color: #fca5a5;
}
</style>
