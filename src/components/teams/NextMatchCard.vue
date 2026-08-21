<script setup lang="ts">
import { computed } from 'vue'
import type { Match, Team } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useTeamsStore } from '../../stores/teams'
import { useTimezone } from '../../composables/useTimezone'
import { teamName, venueName, t } from '../../utils/i18n'
import { formatMatchDate } from '../../utils/format'
import TeamLogo from '../common/TeamLogo.vue'

const props = defineProps<{ match: Match; league: LeagueSlug }>()
const app = useAppStore()
const teams = useTeamsStore()
const tz = useTimezone()

// 比赛自带 logo/名称；档案里有就用档案（含主色），没有就现场拼一个
const homeTeam = computed<Team>(() =>
  teams.teamById(props.league, props.match.home.id) ??
  { id: props.match.home.id, name: props.match.home.name, shortDisplayName: props.match.home.name, abbreviation: props.match.home.abbreviation, color: '#1f2937', alternateColor: '', logo: props.match.home.logo, logoDark: '' },
)
const awayTeam = computed<Team>(() =>
  teams.teamById(props.league, props.match.away.id) ??
  { id: props.match.away.id, name: props.match.away.name, shortDisplayName: props.match.away.name, abbreviation: props.match.away.abbreviation, color: '#1f2937', alternateColor: '', logo: props.match.away.logo, logoDark: '' },
)

const dateLabel = computed(() => formatMatchDate(props.match.date, app.lang))
</script>

<template>
  <div class="next-card">
    <div class="next-head">
      <span class="next-label">{{ t('team.nextMatch', app.lang) }}</span>
      <span class="next-date">{{ dateLabel }}</span>
    </div>
    <div class="next-body">
      <div class="side">
        <TeamLogo :team="homeTeam" :size="64" />
        <div class="side-name">{{ teamName(match.home.name, app.lang) }}</div>
      </div>
      <div class="mid">
        <div class="mid-vs">VS</div>
        <div class="mid-time">{{ tz.kickoff(match.date) }}</div>
      </div>
      <div class="side">
        <TeamLogo :team="awayTeam" :size="64" />
        <div class="side-name">{{ teamName(match.away.name, app.lang) }}</div>
      </div>
    </div>
    <div v-if="match.venue" class="next-foot">{{ venueName(match.venue, app.lang) }}</div>
  </div>
</template>

<style scoped>
.next-card {
  margin-top: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: #131a2b;
  overflow: hidden;
}
.next-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 0;
}
.next-label {
  font-family: var(--font-cond, sans-serif);
  font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
  color: #94a3b8;
}
.next-date { font-size: 11px; color: #64748b; font-family: var(--font-mono-d, monospace); }
.next-body {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px;
  padding: 20px 24px;
}
.side { display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 0; }
.side-name {
  font-family: var(--font-cond, sans-serif);
  font-size: 20px; font-weight: 800; letter-spacing: 0.04em; color: #fff;
  overflow-wrap: anywhere; text-align: center;
}
.mid { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.mid-vs {
  font-family: var(--font-cond, sans-serif);
  font-size: 26px; font-weight: 800; font-style: italic; color: #475569; line-height: 1;
}
.mid-time { font-family: var(--font-mono-d, monospace); font-size: 13px; color: #cbd5e1; font-weight: 700; }
.next-foot {
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  padding: 12px 20px; text-align: center;
  font-family: var(--font-mono-d, monospace);
  font-size: 11px; color: #64748b;
}
@media (max-width: 480px) {
  .next-head { padding: 12px 16px 0; }
  .next-body { padding: 16px; gap: 6px; }
  .side-name { font-size: 15px; }
  .mid-vs { font-size: 22px; }
  .next-foot { padding: 10px 16px; }
}
</style>