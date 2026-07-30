<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { usePlayersStore } from '../../stores/players'
import { useTeamsStore } from '../../stores/teams'
import { isLeagueSlug, type LeagueSlug } from '../../utils/constants'
import { playerName, teamName, t } from '../../utils/i18n'
import TeamLogo from './TeamLogo.vue'

const app = useAppStore()
const route = useRoute()
const router = useRouter()
const players = usePlayersStore()
const teamsStore = useTeamsStore()

const q = ref('')
const open = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
let debounce: ReturnType<typeof setTimeout> | null = null

const league = computed<LeagueSlug | null>(() => {
  const p = route.params.league
  return typeof p === 'string' && isLeagueSlug(p) ? p : null
})

const playerHits = ref<ReturnType<typeof players.search>>([])
const teamHits = ref<{ id: number; name: string; color: string; logo: string; logoDark: string }[]>([])

watch(q, (v) => {
  if (debounce) clearTimeout(debounce)
  if (!v.trim()) {
    playerHits.value = []
    teamHits.value = []
    open.value = false
    return
  }
  debounce = setTimeout(async () => {
    const lg = league.value
    if (!lg) {
      playerHits.value = []
      teamHits.value = []
      return
    }
    playerHits.value = players.search(lg, v, 5)
    const bundle = teamsStore.bundles[lg]
    if (bundle) {
      const lower = v.toLowerCase()
      teamHits.value = bundle.teams
        .filter((t) => t.name.toLowerCase().includes(lower) || t.abbreviation.toLowerCase().includes(lower))
        .slice(0, 3)
        .map((t) => t)
    } else {
      teamHits.value = []
    }
    open.value = true
  }, 200)
})

function goPlayer(id: number) {
  if (!league.value) return
  router.push(`/${league.value}/player/${id}`)
  q.value = ''
  open.value = false
  inputRef.value?.blur()
}

function goTeam(id: number) {
  if (!league.value) return
  router.push(`/${league.value}/team/${id}`)
  q.value = ''
  open.value = false
  inputRef.value?.blur()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    q.value = ''
    open.value = false
    inputRef.value?.blur()
  }
}

function onFocus() {
  if (q.value.trim() && (playerHits.value.length || teamHits.value.length)) open.value = true
}

function onBlur() {
  // 延迟关闭让 click 先触发
  setTimeout(() => { open.value = false }, 150)
}

const hasResults = computed(() => playerHits.value.length > 0 || teamHits.value.length > 0)
</script>

<template>
  <div class="relative">
    <input
      ref="inputRef"
      v-model="q"
      type="search"
      :placeholder="t('search.placeholder', app.lang)"
      class="w-full bg-white/5 border border-white/15 rounded-full px-4 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--league-color)] focus:bg-white/10 transition-colors"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="onBlur"
    />
    <div
      v-if="open && hasResults"
      class="absolute right-0 top-full mt-1 w-80 bg-[#0c101b] border border-white/15 rounded-lg shadow-xl z-50 overflow-hidden"
    >
      <div v-if="playerHits.length" class="py-1">
        <div class="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-mono-d">
          {{ t('search.players', app.lang) }}
        </div>
        <button
          v-for="p in playerHits"
          :key="p.id"
          type="button"
          @mousedown.prevent="goPlayer(p.id)"
          class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-white/5 transition-colors"
        >
          <span class="text-xs font-mono-d text-slate-500 w-4">{{ p.position }}</span>
          <span class="text-sm text-white flex-1 truncate">{{ playerName(p.name, app.lang) }}</span>
          <span class="text-xs text-slate-400 truncate">{{ teamName(p.team, app.lang) }}</span>
        </button>
      </div>
      <div v-if="teamHits.length" class="py-1 border-t border-white/10">
        <div class="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-mono-d">
          {{ t('search.teams', app.lang) }}
        </div>
        <button
          v-for="tm in teamHits"
          :key="tm.id"
          type="button"
          @mousedown.prevent="goTeam(tm.id)"
          class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-white/5 transition-colors"
        >
          <TeamLogo :team="tm" :size="18" />
          <span class="text-sm text-white flex-1 truncate">{{ teamName(tm.name, app.lang) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
