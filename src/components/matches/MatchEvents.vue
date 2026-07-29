<script setup lang="ts">
import { computed } from 'vue'
import type { MatchEvent } from '../../types/models'
import { useAppStore } from '../../stores/app'
import { playerName } from '../../utils/i18n'

const props = defineProps<{ events: MatchEvent[] }>()
const app = useAppStore()

// 按分钟升序；同分钟按原索引稳定排序
const sorted = computed(() =>
  [...props.events].map((e, i) => ({ ...e, _i: i })).sort((a, b) => a.minute - b.minute || a._i - b._i),
)

const ICON: Record<MatchEvent['type'], string> = {
  goal: '⚽',
  ownGoal: '⚽',
  yellow: '🟨',
  red: '🟥',
  secondYellow: '🟨',
  substitution: '⇄',
  penalty: '⚽',
  penaltyMissed: '✖️',
}
</script>

<template>
  <div v-if="!events.length" class="match-empty">暂无事件数据</div>

  <section v-else class="match-section">
    <h3 class="match-section-title">比赛事件</h3>

    <div
      v-for="e in sorted"
      :key="e.id"
      class="match-event-row"
      :class="e.side === 'home' ? 'is-home' : 'is-away'"
    >
      <span class="match-event-time">{{ e.minute }}'</span>
      <span class="match-event-icon">{{ ICON[e.type] }}</span>
      <span v-if="e.type === 'ownGoal'" class="own-goal-label">（乌龙）</span>
      <span class="match-event-player">
        <template v-if="e.type === 'substitution'">
          {{ playerName(e.primaryName, app.lang) }}
          <span class="sub-off">↓</span>
          {{ playerName(e.secondaryName ?? '', app.lang) }}
          <span class="sub-on">↑</span>
        </template>
        <template v-else>
          {{ playerName(e.primaryName, app.lang) }}
          <span v-if="e.secondaryName && (e.type === 'goal' || e.type === 'penalty')" class="match-event-assist">
            （助攻: {{ playerName(e.secondaryName, app.lang) }}）
          </span>
        </template>
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

.match-event-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 0.8rem;
}
.match-event-row.is-home {
  text-align: left;
}
.match-event-row.is-away {
  flex-direction: row-reverse;
  text-align: right;
}

.match-event-time {
  color: #ffd700;
  font-weight: 600;
  min-width: 38px;
  font-size: 0.75rem;
  font-family: monospace;
}
.match-event-icon {
  width: 18px;
  text-align: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.own-goal-label {
  color: #f87171;
  font-size: 0.72rem;
  margin-right: 4px;
}
.match-event-player {
  flex: 1;
  color: #e2e8f0;
  font-size: 0.8rem;
}
.match-event-assist {
  color: #94a3b8;
  font-size: 0.7rem;
  margin-left: 4px;
}
.sub-on {
  color: #4ade80;
  font-weight: 700;
  margin: 0 4px;
}
.sub-off {
  color: #f87171;
  font-weight: 700;
  margin: 0 4px;
}

@media (max-width: 640px) {
  .match-event-row {
    font-size: 0.72rem;
    gap: 6px;
  }
  .match-event-time {
    min-width: 32px;
    font-size: 0.7rem;
  }
}
</style>
