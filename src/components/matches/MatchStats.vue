<script setup lang="ts">
import { computed } from 'vue'
import type { StatRow } from '../../types/models'

const props = defineProps<{ stats: StatRow[] }>()

const rows = computed(() =>
  props.stats.map((s) => {
    const h = typeof s.home === 'number' ? s.home : Number(s.home) || 0
    const a = typeof s.away === 'number' ? s.away : Number(s.away) || 0
    if (s.isPercent) {
      return { ...s, hPct: h, aPct: a, home: String(h), away: String(a) }
    }
    const total = h + a || 1
    return { ...s, hPct: Math.round((h / total) * 100), aPct: Math.round((a / total) * 100), home: String(s.home), away: String(s.away) }
  }),
)
</script>

<template>
  <div v-if="!stats.length" class="match-empty">暂无技术统计</div>

  <section v-else class="match-section">
    <h3 class="match-section-title">技术统计</h3>

    <div v-for="(s, i) in rows" :key="i" class="match-stat-row">
      <span class="match-stat-label">{{ s.label }}</span>
      <span class="match-stat-val" :class="{ 'is-winner': s.hPct > s.aPct }">
        {{ s.home }}<span v-if="s.isPercent" class="unit">%</span>
      </span>
      <span class="match-stat-bar-wrap">
        <span class="match-stat-bar-home" :style="{ width: `${s.hPct}%` }"></span>
        <span class="match-stat-bar-away" :style="{ width: `${s.aPct}%` }"></span>
      </span>
      <span class="match-stat-val" :class="{ 'is-winner': s.aPct > s.hPct }">
        {{ s.away }}<span v-if="s.isPercent" class="unit">%</span>
      </span>
    </div>
  </section>
</template>

<style scoped>
.match-empty {
  text-align: center;
  padding: 24px;
  color: #64748b;
  font-size: 0.85rem;
}

.match-section {
  padding: 0 20px 20px;
}
.match-section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.match-stat-row {
  display: grid;
  grid-template-columns: 90px 44px 1fr 44px;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 0.78rem;
}
.match-stat-label {
  color: #94a3b8;
  font-size: 0.72rem;
  text-align: left;
}
.match-stat-val {
  color: #94a3b8;
  text-align: center;
  font-weight: 600;
  font-family: monospace;
  transition: color 0.2s;
}
.match-stat-val.is-winner {
  color: #ffd700;
  font-weight: 700;
}
.unit {
  color: #64748b;
  font-size: 0.6rem;
  margin-left: 1px;
}
.match-stat-bar-wrap {
  height: 6px;
  background: #2a2a4a;
  border-radius: 3px;
  display: flex;
  overflow: hidden;
}
.match-stat-bar-home {
  height: 100%;
  background: linear-gradient(90deg, #60a5fa, #3b82f6);
  transition: width 0.3s ease;
}
.match-stat-bar-away {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f87171);
  transition: width 0.3s ease;
}

@media (max-width: 640px) {
  .match-stat-row {
    grid-template-columns: 70px 36px 1fr 36px;
    gap: 8px;
    font-size: 0.72rem;
  }
  .match-stat-label { font-size: 0.65rem; }
}
</style>
