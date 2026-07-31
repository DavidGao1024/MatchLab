<script setup lang="ts">
import { useConfirm } from '../../composables/useConfirm'
const { state, resolve } = useConfirm()
</script>

<template>
  <div
    v-if="state.visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="resolve(false)"
  >
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
      <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ state.title }}</h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ state.body }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          class="px-3 py-1.5 rounded text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-80"
          @click="resolve(false)"
        >
          取消
        </button>
        <button
          class="px-3 py-1.5 rounded text-sm bg-red-600 text-white hover:opacity-80"
          @click="resolve(true)"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>
