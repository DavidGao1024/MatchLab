<script setup lang="ts">
import { ref } from 'vue'
import type { H2HEntry } from '../../types/models'
import { useAppStore } from '../../stores/app'
import { teamName } from '../../utils/i18n'

const props = defineProps<{ h2h: H2HEntry[]; defaultOpen?: boolean }>()
const app = useAppStore()
const open = ref(props.defaultOpen ?? false)
</script>

<template>
  <section v-if="h2h.length" class="match-section">
    <button class="h2h-toggle" @click="open = !open">
      <span class="h2h-title">历史交锋</span>
      <span class="h2h-count">{{ h2h.length }}</span>
      <span class="h2h-arrow" :class="{ 'is-open': open }">▾</span>
    </button>

    <div v-if="open" class="h2h-list">
      <div v-for="(g, i) in h2h" :key="i" class="h2h-row">
        <span class="h2h-team h2h-home">{{ teamName(g.homeName, app.lang) }}</span>
        <span class="h2h-score">
          <template v-if="g.homeScore != null && g.awayScore != null">{{ g.homeScore }} - {{ g.awayScore }}</template>
          <template v-else>vs</template>
        </span>
        <span class="h2h-team h2h-away">{{ teamName(g.awayName, app.lang) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.match-section {
  padding: 0 20px 20px;
}
.h2h-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  background: none;
}
.h2h-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #ffd700;
}
.h2h-count {
  font-size: 0.65rem;
  color: #64748b;
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
  border-radius: 8px;
}
.h2h-arrow {
  margin-left: auto;
  color: #64748b;
  font-size: 0.7rem;
  transition: transform 0.2s;
}
.h2h-arrow.is-open {
  transform: rotate(180deg);
}

.h2h-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}
.h2h-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 0.75rem;
}
.h2h-team {
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.h2h-home { text-align: right; }
.h2h-away { text-align: left; }
.h2h-score {
  color: #ffd700;
  font-weight: 600;
  font-family: monospace;
  min-width: 36px;
  text-align: center;
}
</style>
