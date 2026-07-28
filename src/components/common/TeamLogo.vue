<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Team } from '../../types/models'

const props = withDefaults(defineProps<{ team?: Team; size?: number }>(), { size: 20 })

const failedDark = ref(false)
const failedAll = ref(false)
// 球队变更时复位失败态，防旧 @error 污染复用实例（v-for 场景）
watch(() => props.team, () => {
  failedDark.value = false
  failedAll.value = false
})

// 深底优先深色版队徽（规格 v1.5）；深色版失败再试普通版；都失败 → 空串触发首字母圆牌
const src = computed(() => {
  if (!props.team || failedAll.value) return ''
  if (failedDark.value) return props.team.logo || ''
  return props.team.logoDark || props.team.logo || ''
})

function onError() {
  if (!failedDark.value && props.team?.logoDark) failedDark.value = true
  else failedAll.value = true
}
</script>

<template>
  <img
    v-if="team && src"
    :src="src"
    :alt="team.name"
    loading="lazy"
    :width="size"
    :height="size"
    class="rounded-full object-contain shrink-0"
    @error="onError"
  />
  <!-- 全部版本加载失败 → 主色圆牌 + 首字母（规格 §七） -->
  <span
    v-else-if="team"
    class="inline-flex items-center justify-center rounded-full font-cond text-white shrink-0"
    :style="{ width: `${size}px`, height: `${size}px`, background: team.color, fontSize: `${Math.round(size * 0.55)}px` }"
    :aria-label="team.name"
  >{{ team.name.charAt(0) }}</span>
</template>
