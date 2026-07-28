<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'

defineProps<{
  months: string[]
  current: string
  liveMonth: string
  showLive: boolean // 仅赛季内挂 LIVE 红点（规格 v1.2）
  isLive: boolean    // 当前数据来自直播通道 → 显示手动刷新钮
}>()
defineEmits<{ pick: [month: string]; refresh: [] }>()
const app = useAppStore()

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const label = (m: string) => {
  const [y, mm] = m.split('-').map(Number)
  return app.lang === 'zh' ? `${mm}月` : `${MONTHS_EN[mm - 1]} '${String(y).slice(2)}`
}
</script>

<template>
  <div class="flex items-center gap-1 overflow-x-auto pb-1">
    <button
      v-for="m in months"
      :key="m"
      type="button"
      class="relative whitespace-nowrap rounded px-3 py-1.5 font-cond text-xs tracking-wider transition-colors"
      :class="m === current ? 'bg-white/10 text-white shadow-[inset_0_-2px_0_var(--league-color)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'"
      @click="$emit('pick', m)"
    >
      {{ label(m) }}
      <span
        v-if="showLive && m === liveMonth"
        class="live-dot absolute -right-0.5 -top-0.5"
        aria-hidden="true"
      ></span>
    </button>
    <button
      v-if="isLive"
      type="button"
      class="ml-1 shrink-0 rounded border border-white/15 px-2.5 py-1 font-cond text-[10px] tracking-wider text-slate-300 transition-colors hover:text-white"
      @click="$emit('refresh')"
    >⟳ {{ t('schedule.refresh', app.lang) }}</button>
  </div>
</template>
