<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useLeagueSwitch } from '../../composables/useLeagueSwitch'
import { LEAGUE_SLUGS, type LeagueSlug } from '../../utils/constants'

const { active, label, pick } = useLeagueSwitch()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function choose(slug: LeagueSlug) {
  open.value = false
  pick(slug)
}

// 点外关闭：仅在打开时挂 document click，点在组件外则收起
function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
watch(open, (v) => {
  if (v) document.addEventListener('click', onDocClick)
  else document.removeEventListener('click', onDocClick)
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative md:hidden self-center shrink-0">
    <button
      type="button"
      class="flex items-center gap-1 whitespace-nowrap rounded border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white"
      :aria-label="label(active)"
      @click.stop="toggle"
    >
      {{ label(active) }}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <div
      v-if="open"
      class="absolute left-0 top-full z-50 mt-1 w-40 rounded-md border border-slate-700 bg-slate-800 shadow-lg"
    >
      <button
        v-for="slug in LEAGUE_SLUGS"
        :key="slug"
        type="button"
        class="block w-full text-left px-3 py-2 text-sm whitespace-nowrap"
        :class="slug === active ? 'text-white bg-white/10' : 'text-slate-300 hover:bg-slate-700'"
        @click.stop="choose(slug)"
      >
        {{ label(slug) }}
      </button>
    </div>
  </div>
</template>
