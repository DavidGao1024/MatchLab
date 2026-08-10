<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useUserDataStore } from '../../stores/userData'
import { useAppStore } from '../../stores/app'
import { playerName, t, teamName } from '../../utils/i18n'

const store = useUserDataStore()
const app = useAppStore()
const router = useRouter()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const total = computed(() => store.favorites.teams.length + store.favorites.players.length)

// 仅鼠标指针触发悬停开合（桌面行为不变）；触屏 pointerType=touch 不触发
function onPointerEnter(e: PointerEvent) {
  if (e.pointerType === 'mouse') open.value = true
}
function onPointerLeave(e: PointerEvent) {
  if (e.pointerType === 'mouse') open.value = false
}
// 点按切换（触屏主路径；桌面点按只会收起已悬停展开的下拉，无副作用）
function toggle() {
  open.value = !open.value
}

// 点外关闭：仅打开时挂 document click，点在组件外则收起
function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
watch(open, (v) => {
  if (v) document.addEventListener('click', onDocClick)
  else document.removeEventListener('click', onDocClick)
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

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
    ref="root"
    class="relative"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <button
      type="button"
      :aria-label="t('nav.favorites', app.lang)"
      class="relative whitespace-nowrap px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:opacity-80"
      @click.stop="toggle"
    >
      <!-- 移动端：♥ 图标 + 角标（total=0 不渲染角标） -->
      <span class="fav-icon md:hidden relative inline-flex items-center" aria-hidden="true">
        ♥
        <span
          v-if="total > 0"
          class="fav-badge absolute -top-1.5 -right-2 bg-blue-500 text-white text-[9px] rounded-full px-1 leading-4"
        >{{ total }}</span>
      </span>
      <!-- 桌面端：文字（不变） -->
      <span class="hidden md:inline">{{ t('nav.favorites', app.lang) }} ({{ total }})</span>
    </button>
    <!-- 悬停桥：间隙做成外层 pt-2（属于面板元素），鼠标穿过不触发 pointerleave 误关；
         视觉样式（圆角/边框/背景/阴影）挂内层，外观与原版一致 -->
    <div v-if="open && total > 0" class="absolute right-0 top-full z-40 pt-2">
      <div class="w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
        <button
          type="button"
          class="block w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          @click="goFavorites"
        >
          {{ t('fav.viewAll', app.lang) }}
        </button>
        <div v-if="store.favorites.teams.length" class="px-3 py-1 text-xs text-slate-400">{{ t('fav.teams', app.lang) }}</div>
        <button
          v-for="tm in store.favorites.teams"
          :key="`t${tm.teamId}`"
          type="button"
          class="block w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          @click="tm.teamId && goTeam(tm.league, tm.teamId)"
        >
          {{ teamName(tm.name, app.lang) }}
        </button>
        <div v-if="store.favorites.players.length" class="px-3 py-1 text-xs text-slate-400">{{ t('fav.players', app.lang) }}</div>
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
  </div>
</template>
