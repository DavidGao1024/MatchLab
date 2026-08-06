<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserDataStore } from '../../stores/userData'
import { useAppStore } from '../../stores/app'
import { playerName, t, teamName } from '../../utils/i18n'

const store = useUserDataStore()
const app = useAppStore()
const router = useRouter()
const open = ref(false)

const total = computed(() => store.favorites.teams.length + store.favorites.players.length)

function goTeam(league: string, id: number) {
  open.value = false
  router.push(`/${league}/team/${id}`)
}
function goPlayer(league: string, id: number) {
  open.value = false
  router.push(`/${league}/player/${id}`)
}
function goFavorites() {
  open.value = false
  router.push('/favorites')
}
</script>

<template>
  <div
    class="relative"
    @mouseenter="open = true"
    @mouseleave="open = false"
  >
    <button
      type="button"
      class="px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:opacity-80"
    >
      {{ t('nav.favorites', app.lang) }} ({{ total }})
    </button>
    <div
      v-if="open && total > 0"
      class="absolute right-0 mt-2 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-40"
    >
      <button
        type="button"
        class="block w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="goFavorites"
      >
        {{ t('fav.viewAll', app.lang) }}
      </button>
      <div v-if="store.favorites.teams.length" class="px-3 py-1 text-xs text-slate-400">球队</div>
      <button
        v-for="t in store.favorites.teams"
        :key="`t${t.teamId}`"
        type="button"
        class="block w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="t.teamId && goTeam(t.league, t.teamId)"
      >
        {{ teamName(t.name, app.lang) }}
      </button>
      <div v-if="store.favorites.players.length" class="px-3 py-1 text-xs text-slate-400">球员</div>
      <button
        v-for="p in store.favorites.players"
        :key="`p${p.athleteId}`"
        type="button"
        class="block w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="p.athleteId && goPlayer(p.league, p.athleteId)"
      >
        {{ playerName(p.name, app.lang) }}
      </button>
    </div>
  </div>
</template>
