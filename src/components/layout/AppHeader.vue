<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../../stores/app'
import FavoritesDropdown from './FavoritesDropdown.vue'
import LeagueTabs from './LeagueTabs.vue'
import LeagueSubNav from './LeagueSubNav.vue'
import SearchBar from '../common/SearchBar.vue'

const app = useAppStore()
const searchOpen = ref(false)
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
      <!-- PC 端搜索框：完全不动 -->
      <SearchBar class="ml-auto w-full max-w-xs hidden md:block" />
      <!-- 移动端搜索图标按钮 -->
      <button
        type="button"
        class="md:hidden shrink-0 text-slate-300 hover:text-white p-1.5 rounded border border-white/15"
        :aria-label="app.lang === 'zh' ? '搜索' : 'Search'"
        @click="searchOpen = true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>
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
    <!-- 移动端全屏搜索层 -->
    <Teleport to="body">
      <div
        v-if="searchOpen"
        class="mobile-search-overlay md:hidden fixed inset-0 z-50 bg-[#0c101b] flex flex-col"
      >
        <div class="p-3 flex items-center gap-2 border-b border-white/10">
          <div class="flex-1">
            <SearchBar />
          </div>
          <button
            type="button"
            class="cancel-btn shrink-0 text-xs text-slate-400 hover:text-white px-2 py-1"
            @click="searchOpen = false"
          >
            {{ app.lang === 'zh' ? '取消' : 'Cancel' }}
          </button>
        </div>
      </div>
    </Teleport>
  </header>
</template>
