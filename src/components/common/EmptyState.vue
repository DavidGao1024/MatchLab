<script setup lang="ts">
defineProps<{
  title: string
  body?: string
  ctaText?: string
}>()
const emit = defineEmits<{ (e: 'cta'): void }>()
</script>

<template>
  <div class="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
    <p class="text-lg font-semibold text-slate-900 dark:text-white">{{ title }}</p>
    <p v-if="body" class="mt-2 text-sm text-slate-600 dark:text-slate-400">{{ body }}</p>
    <button
      v-if="ctaText"
      class="mt-4 px-4 py-2 rounded bg-slate-700 text-white text-sm hover:opacity-80"
      @click="emit('cta')"
    >
      {{ ctaText }}
    </button>
  </div>
</template>
