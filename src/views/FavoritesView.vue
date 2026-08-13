<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserDataStore } from '../stores/userData'
import { useTeamsStore } from '../stores/teams'
import { useToast } from '../composables/useToast'
import EmptyState from '../components/common/EmptyState.vue'
import FavoriteRowCard from '../components/favorites/FavoriteRowCard.vue'
import { useRouter } from 'vue-router'
import type { LeagueSlug } from '../utils/constants'
import { useAppStore } from '../stores/app'
import { t as tr } from '../utils/i18n'
import type { Favorite } from '../types/user-data'

const store = useUserDataStore()
const teams = useTeamsStore()
const app = useAppStore()
const toast = useToast()
const router = useRouter()
const tab = ref<'teams' | 'players'>('teams')

// 队徽预载：只走档案库 ensure()（仅拉数据、无副作用），
// 不用 ensureLeague——它会把入参联赛设为"当前联赛"，收藏夹是跨联赛页，会搅乱联赛上下文。
// 只为有球队收藏的联赛预载；尽力而为，失败落首字圆牌兜底。
// forceFresh：队色队徽是"低频但会被纠偏"的数据，进页即绕过 24h 缓存取最新
// （2026-08-13 天津颜色纠偏滞留事故；5 分钟节流由 fetchJsonCached 兜住）
const teamLeagues = computed<LeagueSlug[]>(() =>
  [...new Set(store.favorites.teams.filter((f) => f.teamId !== undefined).map((f) => f.league))],
)
onMounted(() => {
  Promise.allSettled(teamLeagues.value.map((l) => teams.ensure(l, { forceFresh: true }))).catch(() => { /* 尽力而为 */ })
})

const teamOf = (f: Favorite) =>
  f.teamId !== undefined ? teams.teamById(f.league, f.teamId) : undefined

function goTeam(league: LeagueSlug, id: number) { router.push(`/${league}/team/${id}`) }
function goPlayer(league: LeagueSlug, id: number) { router.push(`/${league}/player/${id}`) }
function onTeamGo(f: Favorite) { if (f.teamId !== undefined) goTeam(f.league, f.teamId) }
function onPlayerGo(f: Favorite) { if (f.athleteId !== undefined) goPlayer(f.league, f.athleteId) }
function onTeamRemove(f: Favorite) { if (f.teamId !== undefined) removeTeam(f.teamId) }
function onPlayerRemove(f: Favorite) { if (f.athleteId !== undefined) removePlayer(f.athleteId) }

function removeTeam(id: number) {
  store.removeFavorite('team', id)
  toast.success(tr('fav.removed', app.lang))
}
function removePlayer(id: number) {
  store.removeFavorite('player', id)
  toast.success(tr('fav.removed', app.lang))
}
</script>

<template>
  <!-- w-full 是必需的：App.vue 的 router-view 透传 flex flex-col，配合 mx-auto 会让宽度退回内容
       min-content，英文长队名会把整行推出 375px 视口（2026-08-11 手测发现） -->
  <section class="mx-auto max-w-3xl w-full p-4">
    <h1 class="font-cond text-2xl font-semibold text-white">{{ tr('fav.title', app.lang) }}</h1>

    <div v-if="store.favorites.teams.length === 0 && store.favorites.players.length === 0" class="mt-4">
      <EmptyState
        :title="tr('fav.emptyTitle', app.lang)"
        :body="tr('fav.emptyBody', app.lang)"
        :cta-text="tr('fav.emptyCta', app.lang)"
        @cta="router.push('/eng.1/standings')"
      />
    </div>
    <template v-else>
      <!-- 页签：暗色圆角钮 + 中性浅色下划线（本页无联赛上下文，不用联赛色） -->
      <div class="mt-4 flex gap-2">
        <button
          type="button"
          class="rounded-lg px-3.5 py-1.5 text-sm transition-colors"
          :class="tab === 'teams'
            ? 'bg-white/10 text-white shadow-[inset_0_-2px_0_rgba(255,255,255,0.45)]'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'"
          @click="tab = 'teams'"
        >{{ tr('fav.teams', app.lang) }} ({{ store.favorites.teams.length }})</button>
        <button
          type="button"
          class="rounded-lg px-3.5 py-1.5 text-sm transition-colors"
          :class="tab === 'players'
            ? 'bg-white/10 text-white shadow-[inset_0_-2px_0_rgba(255,255,255,0.45)]'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'"
          @click="tab = 'players'"
        >{{ tr('fav.players', app.lang) }} ({{ store.favorites.players.length }})</button>
      </div>

      <div v-if="tab === 'teams'" class="mt-3 space-y-2">
        <FavoriteRowCard
          v-for="f in store.favorites.teams"
          :key="f.teamId ?? `name:${f.name}`"
          kind="team"
          :name="f.name"
          :league="f.league"
          :team-id="f.teamId"
          :team="teamOf(f)"
          @go="onTeamGo(f)"
          @remove="onTeamRemove(f)"
        />
      </div>
      <div v-if="tab === 'players'" class="mt-3 space-y-2">
        <FavoriteRowCard
          v-for="f in store.favorites.players"
          :key="f.athleteId ?? `name:${f.name}`"
          kind="player"
          :name="f.name"
          :league="f.league"
          :athlete-id="f.athleteId"
          @go="onPlayerGo(f)"
          @remove="onPlayerRemove(f)"
        />
      </div>
    </template>
  </section>
</template>
