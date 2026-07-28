<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { t, type Lang } from '../../utils/i18n'
import type { FormResult } from '../../types/models'

export interface DotDetail {
  result: FormResult
  opponent: string
  score: string
}

const props = defineProps<{ details: DotDetail[] }>()
const app = useAppStore()

const COLOR: Record<FormResult, string> = {
  W: 'bg-emerald-400',
  D: 'bg-slate-500',
  L: 'bg-red-400',
}

function aria(d: DotDetail, lang: Lang): string {
  const r = d.result === 'W' ? t('form.win', lang) : d.result === 'D' ? t('form.draw', lang) : t('form.loss', lang)
  return `${r} ${d.opponent} ${d.score}`
}
</script>

<template>
  <!-- 不足 5 场按实际出点；零场出占位短横线（规格 v1.3） -->
  <span v-if="props.details.length === 0" class="text-slate-600">–</span>
  <span v-else class="inline-flex gap-1" role="img" :aria-label="props.details.map((d) => aria(d, app.lang)).join(app.lang === 'zh' ? '，' : ', ')">
    <span
      v-for="(d, i) in props.details"
      :key="i"
      class="inline-block h-2 w-2 rounded-full transition-transform hover:scale-150"
      :class="COLOR[d.result]"
      :title="`${d.opponent} ${d.score}`"
    ></span>
  </span>
</template>
