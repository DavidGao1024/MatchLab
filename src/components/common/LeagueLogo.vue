<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LeagueSlug } from '../../utils/constants'
import { leagueLogoPath } from '../../utils/leagueLogo'

const props = withDefaults(defineProps<{
  league: LeagueSlug
  size?: number
  /** 徽标独立出现（旁边没有联赛名）时传入名称，作为 alt/title；名字就在旁边则留空 */
  label?: string
}>(), { size: 16, label: '' })

const src = computed(() => leagueLogoPath(props.league))
const failed = ref(false)
watch(() => props.league, () => { failed.value = false })
</script>

<template>
  <!-- 单根 img 靠 attrs fallthrough 承接父级间距类（同 NationFlag 约定），勿加包裹元素 -->
  <img
    v-if="!failed"
    :src="src"
    :alt="label"
    :title="label"
    loading="lazy"
    :width="size"
    :height="size"
    class="object-contain shrink-0 inline-block align-middle"
    @error="failed = true"
  />
</template>