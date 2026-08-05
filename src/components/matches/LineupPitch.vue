<script setup lang="ts">
import { computed } from 'vue'
import type { LineupPlayer, MatchLineup } from '../../types/models'
import { useAppStore } from '../../stores/app'
import { playerName } from '../../utils/i18n'

const props = defineProps<{ lineup: MatchLineup | null; side: 'home' | 'away' }>()
const app = useAppStore()

interface Placed {
  id: number
  name: string
  shortName: string
  jersey?: string
  position: string
  positionAbbr?: string
  x?: number
  y?: number
}

const placed = computed<Placed[]>(() => {
  if (!props.lineup) return []
  return props.lineup.starters.map((p) => ({
    id: p.id,
    name: p.name,
    shortName: p.shortName,
    jersey: p.jersey,
    position: p.position,
    positionAbbr: p.positionAbbr,
    x: p.x,
    y: p.y,
  }))
})

// 显示名：中文模式查完整名译名表，命中显示译名；未命中或英文模式显示 shortName
function displayShort(p: Pick<LineupPlayer, 'name' | 'shortName'>): string {
  if (app.lang !== 'zh') return p.shortName
  const tr = playerName(p.name, 'zh')
  return tr !== p.name ? tr : p.shortName
}
</script>

<template>
  <div v-if="!lineup" class="match-lineup-empty">
    阵容尚未公布
  </div>

  <div v-else class="match-field-col">
    <div class="match-field-head">
      <span class="match-field-team" :class="side === 'home' ? 'is-home' : 'is-away'">
        {{ side === 'home' ? '主队' : '客队' }}
      </span>
      <span v-if="lineup.formation" class="match-field-formation">{{ lineup.formation }}</span>
      <span v-if="lineup.coachName" class="match-field-coach">{{ playerName(lineup.coachName, app.lang) }}</span>
    </div>

    <div class="match-pitch">
      <div class="pitch-line-mid"></div>
      <div class="pitch-circle-mid"></div>
      <div class="pitch-box-18"></div>
      <div class="pitch-box-6"></div>
      <div class="pitch-box-18-top"></div>
      <div class="pitch-box-6-top"></div>
      <div class="pitch-goal-b"></div>
      <div class="pitch-goal-t"></div>

      <div
        v-for="p in placed"
        :key="p.id"
        class="match-player-dot"
        :style="{ left: `${p.x ?? 50}%`, top: `${p.y ?? 50}%` }"
        :title="`${p.jersey ?? ''} ${playerName(p.name, app.lang)} (${p.positionAbbr ?? p.position})`.trim()"
      >
        <span class="dot-jersey">{{ p.jersey ?? '?' }}</span>
        <span class="dot-name">{{ displayShort(p) }}</span>
      </div>
    </div>

    <div v-if="lineup.bench.length" class="match-bench">
      <div class="match-bench-title">替补 · {{ lineup.bench.length }}</div>
      <div class="match-bench-list">
        <span v-for="p in lineup.bench" :key="p.id" class="match-bench-item">
          <span class="match-bench-num">#{{ p.jersey ?? '?' }}</span>{{ displayShort(p) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.match-lineup-empty {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  font-size: 0.85rem;
  background: #0f0f23;
  border-radius: 12px;
}

.match-field-col {
  background: #0f0f23;
  border-radius: 12px;
  padding: 14px 14px 18px;
}

.match-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.75rem;
}
.match-field-team {
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}
.match-field-team.is-home { color: #93c5fd; background: rgba(59, 130, 246, 0.1); }
.match-field-team.is-away { color: #fca5a5; background: rgba(239, 68, 68, 0.1); }
.match-field-formation {
  color: #86efac;
  font-family: monospace;
  letter-spacing: 1px;
}
.match-field-coach { color: #64748b; font-size: 0.7rem; }

.match-pitch {
  position: relative;
  width: 100%;
  height: 380px;
  background: linear-gradient(to bottom, #1e4620 0%, #2a5c2d 3%, #348c3a 15%, #3a9c40 30%, #3a9c40 70%, #348c3a 85%, #2a5c2d 97%, #1e4620 100%);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}
.pitch-line-mid { position: absolute; top: 50%; left: 8%; right: 8%; height: 1px; background: rgba(255,255,255,0.2); }
.pitch-circle-mid { position: absolute; top: 50%; left: 50%; width: 56px; height: 56px; border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; transform: translate(-50%, -50%); }
.pitch-box-18 { position: absolute; left: 20%; right: 20%; bottom: 4%; height: 16%; border: 1px solid rgba(255,255,255,0.25); border-bottom: none; border-radius: 4px 4px 0 0; }
.pitch-box-6 { position: absolute; left: 36%; right: 36%; bottom: 4%; height: 6%; border: 1px solid rgba(255,255,255,0.2); border-bottom: none; border-radius: 3px 3px 0 0; }
.pitch-box-18-top { position: absolute; left: 20%; right: 20%; top: 4%; height: 16%; border: 1px solid rgba(255,255,255,0.25); border-top: none; border-radius: 0 0 4px 4px; }
.pitch-box-6-top { position: absolute; left: 36%; right: 36%; top: 4%; height: 6%; border: 1px solid rgba(255,255,255,0.2); border-top: none; border-radius: 0 0 3px 3px; }
.pitch-goal-b { position: absolute; left: 44%; right: 44%; bottom: 0; height: 5px; background: rgba(255,255,255,0.15); border-radius: 2px 2px 0 0; }
.pitch-goal-t { position: absolute; left: 44%; right: 44%; top: 0; height: 5px; background: rgba(255,255,255,0.15); border-radius: 0 0 2px 2px; }

.match-player-dot {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  transform: translate(-50%, -50%);
  z-index: 2;
}
.dot-jersey {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #1a1a3e;
  border: 2px solid #ffd700;
  color: #ffd700;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
}
.match-player-dot:hover .dot-jersey {
  transform: scale(1.25);
  z-index: 5;
}
.dot-name {
  color: #e2e8f0;
  font-size: 0.6rem;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.match-bench-title {
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 600;
  margin-bottom: 6px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.match-bench-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.match-bench-item {
  font-size: 0.7rem;
  color: #94a3b8;
  white-space: nowrap;
}
.match-bench-num {
  color: #ffd700;
  font-size: 0.65rem;
  margin-right: 3px;
}

@media (max-width: 640px) {
  .match-pitch { height: 320px; }
  .dot-jersey { width: 22px; height: 22px; font-size: 0.6rem; }
  .dot-name { font-size: 0.55rem; max-width: 60px; }
}
</style>
