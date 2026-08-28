<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Team } from '../../types/models'
import { teamName } from '../../utils/i18n'
import { luminance } from '../../utils/teamColor'
import { useAppStore } from '../../stores/app'

const props = withDefaults(defineProps<{ team?: Team; size?: number }>(), { size: 20 })
const app = useAppStore()

const failedDark = ref(false)
const failedAll = ref(false)
watch(() => props.team, () => {
  failedDark.value = false
  failedAll.value = false
})

const BASE = import.meta.env.BASE_URL

function resolveLogo(url: string): string {
  if (!url) return ''
  return url.startsWith('http') ? url : BASE + url
}

const src = computed(() => {
  if (!props.team || failedAll.value) return ''
  if (failedDark.value) return resolveLogo(props.team.logo || '')
  return resolveLogo(props.team.logoDark || props.team.logo || '')
})

// 白主色队（明度 > 0.85）兜底圆牌用深字，避免白底白字融进白旗面
const isLight = computed(() => {
  const c = props.team?.color
  return c ? luminance(c) > 0.85 : false
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
    class="object-contain shrink-0"
    @error="onError"
  />
  <!-- 全部版本加载失败 → 主色圆牌 + 首字母（规格 §七） -->
  <span
    v-else-if="team"
    class="inline-flex items-center justify-center rounded-full font-cond shrink-0"
    :class="isLight ? 'text-slate-900' : 'text-white'"
    :style="{ width: `${size}px`, height: `${size}px`, background: team.color, fontSize: `${Math.round(size * 0.55)}px` }"
    :aria-label="teamName(team.name, app.lang)"
  >{{ teamName(team.name, app.lang).charAt(0) }}</span>
</template>
