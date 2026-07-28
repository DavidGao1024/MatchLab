<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'

defineProps<{ message?: string }>()
defineEmits<{ retry: [] }>()
const app = useAppStore()
</script>

<template>
  <div role="alert" class="my-8 rounded-lg border border-red-500/30 bg-red-500/5 px-5 py-6 text-center">
    <p class="text-sm text-slate-200">
      {{ t('state.error', app.lang) }}
      <span v-if="message" class="font-mono-d text-xs text-slate-500"> · {{ message }}</span>
    </p>
    <button
      type="button"
      class="mt-3 rounded bg-white/10 px-4 py-1.5 font-cond text-xs tracking-wider text-white transition-colors hover:bg-white/20"
      @click="$emit('retry')"
    >{{ t('state.retry', app.lang) }}</button>
  </div>
</template>
