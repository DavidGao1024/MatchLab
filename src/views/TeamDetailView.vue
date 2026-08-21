<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataError from '../components/common/DataError.vue'
import DataLoading from '../components/common/DataLoading.vue'
import TeamLogo from '../components/common/TeamLogo.vue'
import TeamSquad from '../components/teams/TeamSquad.vue'
import TeamSchedule from '../components/teams/TeamSchedule.vue'
import SubscribeButton from '../components/teams/SubscribeButton.vue'
import FavoriteButton from '../components/common/FavoriteButton.vue'
import ExportCalendarButton from '../components/teams/ExportCalendarButton.vue'
import { ensureLeague } from '../composables/useLeague'
import { useAppStore } from '../stores/app'
import { usePlayersStore } from '../stores/players'
import { useTeamsStore } from '../stores/teams'
import { cityName, teamName, t, venueName, teamValue, formatTeamValue, loadTeamValues } from '../utils/i18n'
import type { LeagueSlug } from '../utils/constants'
import { bannerTheme } from '../utils/teamColor'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const players = usePlayersStore()
const teams = useTeamsStore()

const league = computed(() => route.params.league as LeagueSlug)
const teamId = computed(() => Number(route.params.id))
const season = computed(() => app.leagueInfo(league.value)?.season ?? '2025')

const seq = ref(0)
const error = ref('')

async function load() {
  const my = ++seq.value
  error.value = ''
  try {
    await ensureLeague(league.value)
    await players.ensureIndex(league.value, season.value)
    await loadTeamValues()
    if (seq.value !== my) return
  } catch (e) {
    if (seq.value !== my) return
    error.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(load)
watch([league, teamId], load)

const team = computed(() => teams.teamById(league.value, teamId.value))
const ready = computed(() => !!team.value)
const squad = computed(() => {
  const all = players.indexes[league.value] ?? []
  return all.filter((p) => p.teamId === teamId.value)
})
const tab = ref<'schedule' | 'squad'>('schedule')

const displayName = computed(() => (team.value ? teamName(team.value.name, app.lang) : ''))
const record = computed(() => team.value?.record ?? null)
const squadValueMillion = computed(() => (team.value ? teamValue(team.value.name) : null))
const teamSlug = computed(() => {
  const t = team.value
  if (!t) return String(teamId.value)
  const base = t.shortDisplayName || t.name
  return base.toLowerCase().replace(/\s+/g, '-')
})
const seasonStart = computed(() => {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
})
// 主副色主题（与订阅卡同一套 bannerTheme：近黑提亮/白主色深字/副色兜底全在函数里）
const theme = computed(() => {
  const tm = team.value
  if (!tm) return null
  const main = tm.color || app.leagueInfo(league.value)?.color || '#3D195B'
  return bannerTheme(main, tm.alternateColor || '')
})
const themeVars = computed((): Record<string, string> => {
  const th = theme.value
  if (!th) return {}
  return {
    '--flag-from': th.from,
    '--flag-to': th.to,
    '--flag-stripe': th.stripe,
    '--pin-from': th.pinFrom,
    '--pin-to': th.pinTo,
    '--accent': th.accent,
    '--flag-text': th.darkText ? '#0f172a' : '#ffffff',
  }
})

function back() {
  router.push(`/${league.value}/standings`)
}
</script>

<template>
  <section class="py-6" :style="themeVars">
    <button type="button" class="text-xs text-slate-400 hover:text-white mb-3" @click="back">‹ {{ t('col.team', app.lang) }}</button>

    <DataError v-if="error" :message="error" @retry="load" />
    <DataLoading v-else-if="!ready" kind="cards" />
    <template v-else-if="team">
      <!-- 页头：队旗面（主色渐变 + 副色斜纹，与订阅卡同一视觉语言，spec §3.2） -->
      <div class="team-banner">
        <div class="team-flag" :class="{ 'is-light': theme?.darkText }">
          <TeamLogo :team="team" :size="64" />
          <div class="flag-id">
            <h1 class="flag-name">{{ displayName }}</h1>
            <p class="flag-sub">
              {{ team.abbreviation }}<template v-if="team.venue?.name"> · {{ venueName(team.venue.name, app.lang) }}</template><template v-if="team.venue?.city"> · {{ cityName(team.venue.city, app.lang) }}</template>
            </p>
            <p v-if="squadValueMillion != null" class="flag-sub flag-value">
              {{ t('team.squadValue', app.lang) }} {{ formatTeamValue(squadValueMillion, app.lang) }}
            </p>
          </div>
        </div>
        <div class="pin"></div>
      </div>
      <div class="flex items-center gap-3 mt-3 mb-6">
        <SubscribeButton :league="league" :team-id="teamId" :team-name="displayName" />
        <FavoriteButton type="team" :id="teamId" :name="displayName" :league="league" />
        <ExportCalendarButton
          :league="league"
          :team-id="teamId"
          :team-name="displayName"
          :team-slug="teamSlug"
          :season-start="seasonStart"
        />
      </div>

      <!-- 球队战绩（主色边条点缀，spec §3.4） -->
      <div v-if="record" class="record-grid">
        <div class="stat-cell"><div class="stat-label">{{ t('team.played', app.lang) }}</div><div class="stat-val">{{ record.played }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.w', app.lang) }}</div><div class="stat-val val-w">{{ record.wins }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.d', app.lang) }}</div><div class="stat-val val-d">{{ record.draws }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.l', app.lang) }}</div><div class="stat-val val-l">{{ record.losses }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.gf', app.lang) }}</div><div class="stat-val">{{ record.goalsFor }}</div></div>
        <div class="stat-cell"><div class="stat-label">{{ t('team.col.ga', app.lang) }}</div><div class="stat-val">{{ record.goalsAgainst }}</div></div>
        <div class="stat-cell stat-pts"><div class="stat-label">{{ t('team.col.pts', app.lang) }}</div><div class="stat-val val-pts">{{ record.points }}</div></div>
      </div>

      <!-- 页签栏：赛程 / 阵容 -->
      <div class="mt-6 flex gap-6 border-b border-white/10">
        <button
          type="button"
          class="pb-2 font-cond text-lg tracking-[0.05em]"
          :class="tab === 'schedule' ? 'border-b-2 font-bold text-white' : 'text-slate-500'"
          :style="tab === 'schedule' ? { borderColor: 'var(--accent)' } : undefined"
          data-tab="schedule"
          @click="tab = 'schedule'"
        >{{ t('nav.schedule', app.lang) }}</button>
        <button
          type="button"
          class="pb-2 font-cond text-lg tracking-[0.05em]"
          :class="tab === 'squad' ? 'border-b-2 font-bold text-white' : 'text-slate-500'"
          :style="tab === 'squad' ? { borderColor: 'var(--accent)' } : undefined"
          data-tab="squad"
          @click="tab = 'squad'"
        >{{ t('team.squad', app.lang) }} ({{ squad.length }})</button>
      </div>

      <!-- 赛程页签 -->
      <TeamSchedule v-if="tab === 'schedule'" :league="league" :team-id="teamId" />

      <!-- 阵容页签 -->
      <div v-else class="mt-6">
        <h2 class="squad-title">
          {{ t('team.squad', app.lang) }}
          <span class="squad-count">({{ squad.length }})</span>
        </h2>
        <TeamSquad :players="squad" :league="league" />
      </div>
    </template>
  </section>
</template>

<style scoped>
/* ===== 队旗面（主题变量挂 section 根，视觉语言同订阅卡）===== */
.team-banner { border-radius: 14px; overflow: hidden; }
.team-flag {
  position: relative;
  display: flex; align-items: center; gap: 16px;
  padding: 20px;
  background: linear-gradient(112deg, var(--flag-from), var(--flag-to));
  color: var(--flag-text);
}
.team-flag::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(115deg, transparent 0 26px, var(--flag-stripe) 26px 50px);
}
.team-flag > * { position: relative; }
.flag-id { flex: 1; min-width: 0; }
.flag-name {
  font-family: var(--font-cond, sans-serif);
  font-size: 28px; font-weight: 800; letter-spacing: 0.05em;
  margin: 0; color: var(--flag-text);
  text-shadow: 0 1px 4px rgba(0,0,0,0.35);
  overflow-wrap: anywhere;
}
.flag-sub { font-size: 12px; letter-spacing: 0.12em; opacity: 0.85; margin-top: 3px; }
.flag-value { font-weight: 600; letter-spacing: 0.12em; opacity: 1; }
.team-flag.is-light .flag-name { text-shadow: none; }
.pin { height: 3px; background: linear-gradient(90deg, var(--pin-from), var(--pin-to)); }

/* ===== 战绩格：主色边条 + 积分格强调（spec §3.4）===== */
.record-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 24px; }
@media (min-width: 768px) { .record-grid { grid-template-columns: repeat(7, 1fr); } }
.stat-cell {
  border: 1px solid rgba(255,255,255,0.1);
  border-left: 3px solid var(--accent);
  border-radius: 4px; padding: 8px;
  background: rgba(255,255,255,0.02);
}
.stat-label { font-family: var(--font-mono-d, monospace); font-size: 10px; text-transform: uppercase; color: #64748b; }
.stat-val { font-family: var(--font-mono-d, monospace); font-size: 16px; color: #ffffff; }
.val-w { color: #10b981; }
.val-d { color: #cbd5e1; }
.val-l { color: #ef4444; }
.stat-pts {
  background: color-mix(in srgb, var(--accent) 13%, transparent);
  border-color: color-mix(in srgb, var(--accent) 42%, transparent);
  border-left-color: var(--accent);
}
.val-pts { color: var(--accent); }

/* ===== 阵容标题：主色下划线 ===== */
.squad-title {
  font-family: var(--font-cond, sans-serif);
  font-size: 18px; letter-spacing: 0.05em; color: #ffffff;
  margin-bottom: 12px; padding-bottom: 4px;
  border-bottom: 2px solid var(--accent);
}
.squad-count { font-family: var(--font-mono-d, monospace); font-size: 12px; color: #475569; margin-left: 8px; }
</style>
