<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useTimezone } from '../../composables/useTimezone'
import { useTeamsStore } from '../../stores/teams'
import { useMatchesStore } from '../../stores/matches'
import { t, teamName, venueName } from '../../utils/i18n'
import type { Team } from '../../types/models'
import TeamLogo from '../common/TeamLogo.vue'

const props = withDefaults(defineProps<{ match: Match; league: LeagueSlug; featured?: boolean; plain?: boolean }>(), { featured: false, plain: false })
const app = useAppStore()
const tz = useTimezone()
const teams = useTeamsStore()
const matches = useMatchesStore()

function open() {
  matches.openMatch(props.match, props.league)
}

// 比赛自带 logo URL；档案里有就用档案（含 logoDark/主色），没有就现场拼一个
const homeTeam = computed<Team | undefined>(() =>
  teams.teamById(props.league, props.match.home.id) ??
  { id: props.match.home.id, name: props.match.home.name, shortDisplayName: props.match.home.name, abbreviation: props.match.home.abbreviation, color: '#1f2937', alternateColor: '', logo: props.match.home.logo, logoDark: '' },
)
const awayTeam = computed<Team | undefined>(() =>
  teams.teamById(props.league, props.match.away.id) ??
  { id: props.match.away.id, name: props.match.away.name, shortDisplayName: props.match.away.name, abbreviation: props.match.away.abbreviation, color: '#1f2937', alternateColor: '', logo: props.match.away.logo, logoDark: '' },
)

type Tone = 'win' | 'draw' | 'lose'
const tone = computed<{ home: Tone; away: Tone }>(() => {
  const h = props.match.home.score
  const a = props.match.away.score
  if (props.match.status !== 'post' || h === null || a === null) return { home: 'draw', away: 'draw' }
  if (h > a) return { home: 'win', away: 'lose' }
  if (h < a) return { home: 'lose', away: 'win' }
  return { home: 'draw', away: 'draw' }
})
const NAME_CLS: Record<Tone, string> = { win: 'text-white', draw: 'text-slate-300', lose: 'text-slate-500' }
const scoreCls = computed(() => (tone.value.home === 'draw' && props.match.status === 'post' ? 'text-slate-400' : 'text-white'))
</script>

<template>
  <article
    class="group cursor-pointer rounded-lg border px-4 py-2.5 transition-all hover:translate-x-1"
    :class="featured ? 'border-[var(--league-color)] bg-[#191036]' : 'border-white/10 bg-[#131a2b] hover:border-[var(--league-color)] hover:bg-[#171f33]'"
    @click="open"
  >
    <span
      v-if="featured"
      class="mb-1.5 inline-block rounded px-1.5 py-0.5 font-cond text-[9px] font-semibold tracking-[0.14em] text-[#0b0f1a]"
      style="background: var(--league-color)"
    >{{ t('home.focus', app.lang) }}</span>
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <!-- 主队（右对齐） -->
      <div class="flex min-w-0 items-center justify-end gap-2.5">
        <span class="truncate font-cond text-[13px]" :class="plain ? 'text-white' : NAME_CLS[tone.home]">{{ teamName(match.home.name, app.lang) }}</span>
        <TeamLogo :team="homeTeam" :size="18" />
      </div>

      <!-- 比分压中：完赛显比分 / 未开赛显 VS / 进行中显分钟 + 心跳点 -->
      <div class="min-w-[86px] text-center">
        <template v-if="match.status === 'post'">
          <span class="font-score text-2xl tracking-wide" :class="scoreCls">
            {{ match.home.score }}<span class="text-slate-500"> - </span>{{ match.away.score }}
          </span>
        </template>
        <template v-else-if="match.status === 'in'">
          <span class="inline-flex items-center gap-1.5">
            <span class="live-dot" aria-hidden="true"></span>
            <span class="font-score text-xl text-red-300">{{ match.clock ?? '—' }}</span>
          </span>
          <div class="font-score text-base text-slate-300">{{ match.home.score }} - {{ match.away.score }}</div>
        </template>
        <template v-else>
          <span class="font-score text-lg text-slate-400">{{ t('match.vs', app.lang) }}</span>
        </template>
      </div>

      <!-- 客队 -->
      <div class="flex min-w-0 items-center gap-2.5">
        <TeamLogo :team="awayTeam" :size="18" />
        <span class="truncate font-cond text-[13px]" :class="plain ? 'text-white' : NAME_CLS[tone.away]">{{ teamName(match.away.name, app.lang) }}</span>
      </div>
    </div>

    <!-- 底栏：本地开球时间（跨天自动"次日"）· 英文球场名（规格 v1.6） -->
    <div class="mt-2 flex items-center justify-between gap-3 border-t border-dashed border-white/10 pt-1.5 font-mono-d text-[9px] text-slate-500">
      <time class="shrink-0" :datetime="match.date">{{ tz.kickoff(match.date) }}</time>
      <span class="truncate">{{ venueName(match.venue, app.lang) }}</span>
    </div>
  </article>
</template>
