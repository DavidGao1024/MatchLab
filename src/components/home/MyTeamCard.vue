<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchLiveScores, fetchTeamInjuries } from '../../composables/useEspanFetch'
import { useStandingsStore } from '../../stores/standings'
import { useTeamsStore } from '../../stores/teams'
import { useAppStore } from '../../stores/app'
import { playerName, teamName, t, venueName } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'
import type { Subscription } from '../../types/user-data'
import type { Match, MatchTeam, StandingRow, Team } from '../../types/models'

const props = defineProps<{ subscription: Subscription }>()
const router = useRouter()
const standings = useStandingsStore()
const teams = useTeamsStore()
const app = useAppStore()

const todayMatch = ref<Match | null>(null)
const nextMatch = ref<Match | null>(null)        // hero 在无 todayMatch 时用
const afterNextMatch = ref<Match | null>(null)   // footer 用（既非 today 也非 next）
const injuries = ref<string[]>([])
const loading = ref(true)
const error = ref('')

const team = computed<Team | undefined>(() => teams.teamById(props.subscription.league, props.subscription.teamId))
const teamColor = computed(() => team.value?.color || app.leagueInfo(props.subscription.league)?.color || '#3D195B')
const standing = computed<StandingRow | undefined>(() => {
  const rows = standings.rows[props.subscription.league] ?? []
  return rows.find((r) => r.teamId === props.subscription.teamId)
})
// footer 用：今日赛时显示 nextMatch（今日赛之后第一场 future），无今日赛时显示 afterNextMatch（避免与 hero 重复）
const footerMatch = computed<Match | null>(() => todayMatch.value ? nextMatch.value : afterNextMatch.value)
const leagueDisplayName = computed(() => {
  const info = app.leagueInfo(props.subscription.league)
  const zh = info?.nameZh
  const en = info?.name ?? props.subscription.league.toUpperCase()
  return app.lang === 'zh' && zh ? `${zh} · ${en}` : en
})

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

function teamFor(side: MatchTeam): Team {
  return teams.teamById(props.subscription.league, side.id) ?? {
    id: side.id,
    name: side.name,
    shortDisplayName: side.name,
    abbreviation: side.abbreviation ?? '',
    color: teamColor.value,
    alternateColor: '',
    logo: side.logo,
    logoDark: side.logo,
  }
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
  <article
    :style="{ '--team-color': teamColor }"
    class="compact-card"
  >
    <div v-if="loading" class="p-4 text-sm text-slate-500">{{ t('card.loading', app.lang) }}</div>
    <div v-else-if="error" class="p-4 text-sm text-red-400">{{ error }}</div>
    <div v-else class="compact-body">
      <header class="compact-header">
        <span class="tag">{{ t('card.tag', app.lang) }}</span>
        <span class="league">{{ leagueDisplayName }}</span>
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

      <div class="compact-grid">
        <section class="hero-block">
          <div v-if="todayMatch?.status === 'in'" class="hero-meta">
            <span class="live-dot live"></span>{{ t('card.live', app.lang) }} · {{ todayMatch.clock ?? '—' }}
          </div>
          <div v-else-if="todayMatch" class="hero-meta">
            <span class="live-dot"></span>{{ t('card.today', app.lang) }} · {{ formatDateLong(todayMatch.date) }}
          </div>
          <div v-else-if="nextMatch" class="hero-meta">
            <span class="next-dot"></span>{{ t('card.next', app.lang) }} · {{ formatDateLong(nextMatch.date) }}
          </div>
          <div v-else class="hero-meta">{{ t('card.seOver', app.lang) }}{{ standing ? (app.lang === 'zh' ? ` · 最终第 ${standing.rank} 名` : ` · Finished #${standing.rank}`) : '' }}</div>

          <div v-if="todayMatch || nextMatch" class="hero-matchup">
            <div class="hero-side left">
              <span class="hero-abbr">{{ displayName((todayMatch ?? nextMatch)!.home.name) }}</span>
              <TeamLogo :team="teamFor((todayMatch ?? nextMatch)!.home)" :size="26" />
            </div>
            <div class="hero-vs">VS</div>
            <div class="hero-side right">
              <TeamLogo :team="teamFor((todayMatch ?? nextMatch)!.away)" :size="26" />
              <span class="hero-abbr">{{ displayName((todayMatch ?? nextMatch)!.away.name) }}</span>
            </div>
          </div>

          <div v-if="todayMatch?.status === 'in'" class="kickoff-row">
            <span>{{ t('card.live', app.lang) }} <span class="kickoff-time">{{ todayMatch.home.score ?? 0 }} - {{ todayMatch.away.score ?? 0 }}</span></span>
            <span class="countdown">{{ todayMatch.clock ?? '—' }}</span>
          </div>
          <div v-if="todayMatch || nextMatch" class="venue-row">◉ {{ venueName((todayMatch ?? nextMatch)!.venue || '', app.lang) || '—' }}</div>
        </section>

        <section class="stats-block">
          <div class="section-label">{{ t('card.seasonRecord', app.lang) }}</div>
          <div v-if="standing" class="wdl">
            <div class="wdl-cell wdl-w"><div class="wdl-label">{{ t('col.won', app.lang) }}</div><div class="wdl-val">{{ standing.won }}</div></div>
            <div class="wdl-cell wdl-d"><div class="wdl-label">{{ t('col.drawn', app.lang) }}</div><div class="wdl-val">{{ standing.drawn }}</div></div>
            <div class="wdl-cell wdl-l"><div class="wdl-label">{{ t('col.lost', app.lang) }}</div><div class="wdl-val">{{ standing.lost }}</div></div>
          </div>
          <div v-else class="wdl-skeleton">—</div>
          <div v-if="standing" class="points-row">
            <span class="points-label">{{ t('col.pts', app.lang) }}</span>
            <span class="points-val">{{ standing.points }}</span>
          </div>
          <div v-if="standing && standing.form?.length" class="form-row">
            <div class="section-label">{{ t('card.recent5', app.lang) }}</div>
            <div class="form-pills">
              <span v-for="(f, i) in standing.form" :key="i" :class="`pill ${f.toLowerCase()}`">{{ f }}</span>
            </div>
          </div>
          <div v-if="injuries.length" class="inj-block">
            <span class="inj-label">{{ t('card.injured', app.lang) }}</span>
            <span class="inj-names">{{ injuries.map(n => playerName(n, app.lang)).join(' · ') }}</span>
          </div>
        </section>

        <section v-if="footerMatch" class="next-block">
          <div class="next-label">{{ t('card.next', app.lang) }}</div>
          <div class="next-match">{{ displayName(footerMatch.home.name) }} vs {{ displayName(footerMatch.away.name) }}</div>
          <div class="next-meta">{{ formatDateLong(footerMatch.date) }}</div>
          <div class="next-venue">◉ {{ venueName(footerMatch.venue || '', app.lang) || '—' }}</div>
        </section>
        <section v-else class="next-block">
          <div class="next-label">{{ t('card.next', app.lang) }}</div>
          <div class="next-match skeleton">{{ t('card.noNext', app.lang) }}</div>
        </section>
      </div>
    </div>
  </article>
</template>

<style scoped>
.compact-card {
  background: linear-gradient(180deg, color-mix(in srgb, var(--team-color) 16%, #10152a), #10152a);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  container-type: inline-size;
}

.compact-body { display: flex; flex-direction: column; }

.compact-header {
  display: flex; align-items: center; gap: 10px; row-gap: 4px; flex-wrap: wrap;
  padding: 12px 16px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--team-color) 25%, transparent);
}
.tag {
  border: 1px solid color-mix(in srgb, var(--team-color) 60%, transparent);
  color: color-mix(in srgb, var(--team-color) 75%, white);
  padding: 3px 8px; border-radius: 4px;
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  letter-spacing: 0.22em; text-transform: uppercase;
}
.league {
  font-family: var(--font-mono-d, monospace); font-size: 10px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.18em;
}
.team-name {
  font-family: var(--font-cond, sans-serif);
  font-size: 22px; letter-spacing: 0.02em;
  color: #fff; cursor: pointer; margin: 0;
}
.rank-badge {
  margin-left: auto;
  background: color-mix(in srgb, var(--team-color) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--team-color) 45%, transparent);
  border-radius: 6px; padding: 5px 11px;
  font-family: var(--font-cond, sans-serif);
  display: flex; align-items: baseline; gap: 5px;
}
.rank-badge .num { font-size: 18px; color: #fff; font-weight: 600; }
.rank-badge .of { font-size: 10px; color: var(--slate-400, #94a3b8); letter-spacing: 0.12em; }

.compact-grid {
  display: grid; grid-template-columns: 1.4fr 1fr auto;
  gap: 12px; padding: 12px 16px;
}
@container (max-width: 720px) {
  .compact-grid { grid-template-columns: 1fr; }
}

.hero-block {
  background: rgba(0,0,0,0.32);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 8px; padding: 10px 12px;
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
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-top: 8px;
}
.hero-side { display: flex; align-items: center; gap: 8px; }
.hero-side.left { justify-content: flex-end; }
.hero-side.right { justify-content: flex-start; }
.hero-abbr { font-family: var(--font-cond, sans-serif); font-size: 16px; letter-spacing: 0.04em; color: #fff; }
.hero-vs { font-family: var(--font-cond, sans-serif); font-size: 12px; color: var(--slate-500, #64748b); }
.kickoff-row {
  margin-top: 10px; padding-top: 8px;
  border-top: 1px dashed rgba(255,255,255,0.08);
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  font-family: var(--font-mono-d, monospace); font-size: 10px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.12em;
}
.kickoff-time { color: #fff; font-weight: 600; font-size: 11px; }
.countdown {
  font-family: var(--font-cond, sans-serif); font-size: 16px;
  color: var(--team-color); letter-spacing: 0.06em; font-weight: 600;
}
.venue-row {
  margin-top: 4px;
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: var(--slate-500, #64748b); letter-spacing: 0.12em;
}

.section-label {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: var(--slate-500, #64748b); letter-spacing: 0.22em; text-transform: uppercase;
  margin-bottom: 5px;
}

.stats-block { display: flex; flex-direction: column; }
.wdl {
  display: flex; gap: 4px;
  font-family: var(--font-mono-d, monospace);
}
.wdl-cell {
  flex: 1;
  background: rgba(255,255,255,0.03); border-radius: 4px; padding: 5px 7px;
  border: 1px solid rgba(255,255,255,0.04); text-align: center;
}
.wdl-label { font-size: 9px; color: var(--slate-500, #64748b); letter-spacing: 0.18em; }
.wdl-val { font-size: 14px; font-weight: 600; margin-top: 1px; color: #fff; }
.wdl-w .wdl-val { color: #10b981; }
.wdl-d .wdl-val { color: #cbd5e1; }
.wdl-l .wdl-val { color: #ef4444; }
.wdl-skeleton { color: var(--slate-600, #475569); padding: 8px; text-align: center; }
.points-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-top: 6px; padding: 5px 7px;
  background: color-mix(in srgb, var(--team-color) 10%, transparent);
  border-radius: 4px;
}
.points-label { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-400, #94a3b8); letter-spacing: 0.18em; text-transform: uppercase; }
.points-val { font-family: var(--font-cond, sans-serif); font-size: 18px; color: var(--team-color); font-weight: 600; }
.form-row { margin-top: 6px; }
.form-pills { display: flex; gap: 3px; }
.pill {
  width: 16px; height: 16px; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono-d, monospace); font-size: 9px; font-weight: 600;
}
.pill.w { background: rgba(16,185,129,0.18); color: #10b981; }
.pill.d { background: rgba(148,163,184,0.15); color: #cbd5e1; }
.pill.l { background: rgba(239,68,68,0.18); color: #ef4444; }

.inj-block {
  margin-top: 6px;
  border-left: 3px solid #ef4444; padding-left: 7px;
  font-size: 10px; color: #fca5a5;
  display: flex; align-items: center; gap: 6px;
}
.inj-label {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: #ef4444; letter-spacing: 0.22em; text-transform: uppercase;
}

.next-block {
  background: rgba(0,0,0,0.22); border-radius: 8px; padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.05);
  display: flex; flex-direction: column; justify-content: center;
  min-width: 120px;
}
.next-label { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-500, #64748b); letter-spacing: 0.22em; text-transform: uppercase; }
.next-match { font-family: var(--font-cond, sans-serif); font-size: 14px; color: #fff; letter-spacing: 0.04em; margin-top: 2px; }
.next-match.skeleton { color: var(--slate-500, #64748b); }
.next-meta { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-400, #94a3b8); margin-top: 2px; letter-spacing: 0.12em; }
.next-venue { margin-top: 3px; font-family: var(--font-mono-d, monospace); font-size: 8px; color: var(--slate-500, #64748b); letter-spacing: 0.18em; }
</style>
