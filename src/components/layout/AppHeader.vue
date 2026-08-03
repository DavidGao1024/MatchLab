<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import FavoritesDropdown from './FavoritesDropdown.vue'
import LeagueTabs from './LeagueTabs.vue'
import LeagueSubNav from './LeagueSubNav.vue'
import SearchBar from '../common/SearchBar.vue'

const app = useAppStore()
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#0c101b]/80 backdrop-blur border-b border-white/10">
    <div class="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
      <router-link
        to="/"
        class="font-score text-2xl tracking-[0.14em] text-white flex items-center gap-2 shrink-0"
      >
        <span
          class="w-2.5 h-2.5 rounded-full transition-colors duration-700"
          :style="{ background: 'var(--league-color)', boxShadow: '0 0 12px var(--league-color)' }"
        ></span>
        MATCHLAB
      </router-link>
      <LeagueTabs class="ml-2" />
      <SearchBar class="ml-auto w-full max-w-xs hidden md:block" />
      <FavoritesDropdown />
      <button
        type="button"
        @click="app.toggleLang()"
        class="shrink-0 text-[11px] font-mono-d border border-white/15 rounded-full px-2.5 py-1 text-slate-300 hover:text-white transition-colors"
      >
        {{ app.lang === 'zh' ? '中 / EN' : 'EN / 中' }}
      </button>
    </div>
    <LeagueSubNav />
  </header>
</template>
