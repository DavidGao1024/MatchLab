<script setup lang="ts">
import type { StandingRow as StandingRowData } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
import StandingRow from './StandingRow.vue'

defineProps<{ rows: StandingRowData[]; league: LeagueSlug; showXg: boolean }>()
const app = useAppStore()

const STAT_COLS = ['col.played', 'col.won', 'col.drawn', 'col.lost', 'col.gf', 'col.ga', 'col.gd', 'col.pts'] as const
const th = 'px-1 py-2 text-center font-cond text-[10px] font-medium uppercase tracking-[0.14em]'
</script>

<template>
  <!-- 语义表格 + 窄视口整体横滑（规格 §四交互 / §七无障碍） -->
  <div class="overflow-x-auto rounded-lg border border-white/10">
    <table class="w-full min-w-[760px] border-collapse">
      <thead class="bg-[#0e1424] text-slate-500">
        <tr>
          <th scope="col" class="sticky left-0 z-[2] bg-[#0e1424] px-2 py-2 text-left font-cond text-[10px] font-medium uppercase tracking-[0.14em]">
            # / {{ t('col.team', app.lang) }}
          </th>
          <th v-for="c in STAT_COLS" :key="c" scope="col" :class="th">{{ t(c, app.lang) }}</th>
          <th scope="col" :class="th">{{ t('col.form', app.lang) }}</th>
          <template v-if="showXg">
            <th v-for="c in ['xG', 'xGA', 'xPts']" :key="c" scope="col" :class="`${th} normal-case text-emerald-300/70`">{{ c }}</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <!-- 数据按 rank 直出，不做客户端排序（规格 v1.6） -->
        <StandingRow v-for="row in rows" :key="row.teamId" :row="row" :league="league" :show-xg="showXg" />
      </tbody>
    </table>
  </div>

  <!-- 表尾小图例（规格 §四） -->
  <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-500">
    <span class="inline-flex items-center gap-1.5">
      <i class="inline-block h-2 w-2 rounded-sm" style="background: var(--league-color)"></i>{{ t('legend.ucl', app.lang) }}
    </span>
    <span class="inline-flex items-center gap-1.5">
      <i class="inline-block h-2 w-2 rounded-sm bg-amber-500"></i>{{ t('legend.uel', app.lang) }}
    </span>
    <span v-if="league === 'ger.1'" class="inline-flex items-center gap-1.5">
      <i class="inline-block h-2 w-2 rounded-sm bg-orange-400"></i>{{ t('legend.playoff', app.lang) }}
    </span>
    <span class="inline-flex items-center gap-1.5">
      <i class="inline-block h-2 w-2 rounded-sm bg-red-500"></i>{{ t('legend.rel', app.lang) }}
    </span>
  </div>
</template>
