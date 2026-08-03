<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserDataStore } from '../stores/userData'
import { useToast } from '../composables/useToast'
import EmptyState from '../components/common/EmptyState.vue'
import ExportCalendarButton from '../components/teams/ExportCalendarButton.vue'
import { useRouter } from 'vue-router'
import type { LeagueSlug } from '../utils/constants'

const store = useUserDataStore()
const toast = useToast()
const router = useRouter()
const tab = ref<'teams' | 'players'>('teams')

const seasonStart = computed(() => {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
})

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

function goTeam(league: LeagueSlug, id: number) { router.push(`/${league}/team/${id}`) }
function goPlayer(league: LeagueSlug, id: number) { router.push(`/${league}/player/${id}`) }

function removeTeam(id: number) {
  store.removeFavorite('team', id)
  toast.success('已取消收藏')
}
function removePlayer(id: number) {
  store.removeFavorite('player', id)
  toast.success('已取消收藏')
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4 text-slate-900 dark:text-white">我的收藏</h1>
    <div v-if="store.favorites.teams.length === 0 && store.favorites.players.length === 0">
      <EmptyState
        title="暂无收藏"
        body="去球队/球员详情页点击 ☆ 添加收藏"
        cta-text="去积分榜找球队"
        @cta="router.push('/eng.1/standings')"
      />
    </div>
    <div v-else>
      <div class="flex gap-2 mb-4">
        <button
          type="button"
          class="px-3 py-1 text-sm rounded"
          :class="tab === 'teams' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'"
          @click="tab = 'teams'"
        >
          球队 ({{ store.favorites.teams.length }})
        </button>
        <button
          type="button"
          class="px-3 py-1 text-sm rounded"
          :class="tab === 'players' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'"
          @click="tab = 'players'"
        >
          球员 ({{ store.favorites.players.length }})
        </button>
      </div>
      <div v-if="tab === 'teams'">
        <div
          v-for="t in store.favorites.teams"
          :key="t.teamId"
          class="flex items-center justify-between p-3 mb-2 rounded border border-slate-200 dark:border-slate-700"
        >
          <span
            v-if="t.teamId"
            class="cursor-pointer text-blue-600 hover:underline"
            @click="goTeam(t.league, t.teamId)"
          >{{ t.name }}</span>
          <span v-else class="text-slate-700 dark:text-slate-200">{{ t.name }}</span>
          <div v-if="t.teamId" class="flex gap-2">
            <ExportCalendarButton
              :league="t.league"
              :team-id="t.teamId"
              :team-name="t.name"
              :team-slug="slugify(t.name)"
              :season-start="seasonStart"
            />
            <button type="button" class="text-red-500 text-sm" @click="t.teamId && removeTeam(t.teamId)">删除</button>
          </div>
        </div>
      </div>
      <div v-if="tab === 'players'">
        <div
          v-for="p in store.favorites.players"
          :key="p.athleteId"
          class="flex items-center justify-between p-3 mb-2 rounded border border-slate-200 dark:border-slate-700"
        >
          <span
            v-if="p.athleteId"
            class="cursor-pointer text-blue-600 hover:underline"
            @click="goPlayer(p.league, p.athleteId)"
          >{{ p.name }}</span>
          <span v-else class="text-slate-700 dark:text-slate-200">{{ p.name }}</span>
          <button
            v-if="p.athleteId"
            type="button"
            class="text-red-500 text-sm"
            @click="removePlayer(p.athleteId)"
          >删除</button>
        </div>
      </div>
    </div>
  </div>
</template>
