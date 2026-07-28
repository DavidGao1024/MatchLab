<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'

defineProps<{ kind: 'table' | 'cards' }>()
const app = useAppStore()
</script>

<template>
  <!-- 骨架屏：绝不白屏（规格 §七） -->
  <div v-if="kind === 'table'" role="status" class="animate-pulse space-y-2 py-4">
    <div v-for="i in 12" :key="i" class="h-9 rounded bg-white/5"></div>
    <span class="sr-only">{{ t('state.loading', app.lang) }}</span>
  </div>
  <div v-else role="status" class="animate-pulse space-y-3 py-4">
    <div v-for="i in 4" :key="i" class="h-20 rounded-lg bg-white/5"></div>
    <span class="sr-only">{{ t('state.loading', app.lang) }}</span>
  </div>
</template>
