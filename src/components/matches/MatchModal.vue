<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Match, MatchSummary, Team } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { useTeamsStore } from '../../stores/teams'
import { fetchMatchSummary } from '../../composables/useEspanFetch'
import { teamName } from '../../utils/i18n'
import TeamLogo from '../common/TeamLogo.vue'
import DataLoading from '../common/DataLoading.vue'
import DataError from '../common/DataError.vue'
import LineupPitch from './LineupPitch.vue'
import MatchEvents from './MatchEvents.vue'
import MatchStats from './MatchStats.vue'
import MatchH2H from './MatchH2H.vue'

const props = defineProps<{ match: Match; league: LeagueSlug }>()
const emit = defineEmits<{ close: [] }>()

const app = useAppStore()
const teams = useTeamsStore()

const summary = ref<MatchSummary | null>(null)
const loading = ref(true)
const error = ref('')

const homeTeam = computed<Team>(() =>
  teams.teamById(props.league, props.match.home.id) ?? {
    id: props.match.home.id, name: props.match.home.name,
    shortDisplayName: props.match.home.name, abbreviation: props.match.home.abbreviation,
    color: '#1f2937', alternateColor: '', logo: props.match.home.logo, logoDark: '',
  },
)
const awayTeam = computed<Team>(() =>
  teams.teamById(props.league, props.match.away.id) ?? {
    id: props.match.away.id, name: props.match.away.name,
    shortDisplayName: props.match.away.name, abbreviation: props.match.away.abbreviation,
    color: '#1f2937', alternateColor: '', logo: props.match.away.logo, logoDark: '',
  },
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    summary.value = await fetchMatchSummary(props.league, props.match.eventId, props.match.home.id, props.match.away.id, app.lang)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  load()
})
onUnmounted(() => {
  document.body.style.overflow = ''
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

watch(() => props.match.eventId, load)

const hasScore = computed(() => props.match.home.score !== null && props.match.away.score !== null)
const scoreDisplay = computed(() =>
  hasScore.value ? `${props.match.home.score} - ${props.match.away.score}` : 'vs',
)
</script>

<template>
  <Teleport to="body">
    <div class="match-overlay" role="dialog" aria-modal="true" @click.self="emit('close')">
      <button class="match-close" :aria-label="'关闭'" @click="emit('close')">✕</button>

      <div class="match-modal">
        <div class="match-modal-body">
          <!-- Header -->
          <header class="match-header">
            <div class="match-score">
              <div class="match-team">
                <router-link :to="`/${league}/team/${homeTeam.id}`" class="hover:underline" @click.stop="emit('close')">
                  <TeamLogo :team="homeTeam" :size="40" />
                  <span class="match-team-name">{{ teamName(match.home.name, app.lang) }}</span>
                </router-link>
              </div>
              <div class="match-score-num font-score">{{ scoreDisplay }}</div>
              <div class="match-team">
                <router-link :to="`/${league}/team/${awayTeam.id}`" class="hover:underline" @click.stop="emit('close')">
                  <TeamLogo :team="awayTeam" :size="40" />
                  <span class="match-team-name">{{ teamName(match.away.name, app.lang) }}</span>
                </router-link>
              </div>
            </div>
            <div class="match-meta">
              <span>{{ match.clock || '' }}</span>
              <span>·</span>
              <span>{{ match.venue }}</span>
            </div>
          </header>

          <DataError v-if="error" :message="error" @retry="load" />
          <DataLoading v-else-if="loading" kind="cards" />

          <template v-else-if="summary">
            <!-- Lineups -->
            <div class="match-lineups">
              <LineupPitch :lineup="summary.lineups.home" side="home" />
              <LineupPitch :lineup="summary.lineups.away" side="away" />
            </div>

            <!-- Events -->
            <MatchEvents :events="summary.events" />

            <!-- Stats（已完赛才显示） -->
            <MatchStats v-if="hasScore" :stats="summary.stats" />

            <!-- H2H 历史交锋 -->
            <MatchH2H :h2h="summary.h2h" :default-open="match.status === 'pre'" />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.match-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.85);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.match-modal {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 16px;
  width: 95%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.match-close {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.match-close:hover {
  background: #ef4444;
}

.match-header {
  background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
  padding: 24px 28px 20px;
  border-radius: 16px 16px 0 0;
  text-align: center;
  border-bottom: 1px solid #2a2a4a;
}
.match-score {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  flex-wrap: nowrap;
}
.match-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}
.match-team a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}
.match-team a:hover .match-team-name { text-decoration: underline; }
.match-team-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
}
.match-score-num {
  font-size: 2.2rem;
  font-weight: 900;
  color: #ffd700;
  letter-spacing: 4px;
  white-space: nowrap;
}
.match-meta {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 10px;
}
.match-meta span {
  margin: 0 8px;
}

.match-lineups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px;
}

@media (max-width: 640px) {
  .match-modal {
    max-width: 100%;
    border-radius: 12px;
    max-height: 95vh;
  }
  .match-header {
    padding: 16px 12px 12px;
  }
  .match-team {
    min-width: 80px;
  }
  .match-team-name {
    font-size: 0.85rem;
  }
  .match-score-num {
    font-size: 1.6rem;
  }
  .match-lineups {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 12px;
  }
}
</style>
