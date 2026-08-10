<script setup lang="ts">
import { useConfirm } from '../../composables/useConfirm'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
const { state, resolve } = useConfirm()
const app = useAppStore()
</script>

<template>
  <div
    v-if="state.visible"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-dialog-title"
    aria-describedby="confirm-dialog-body"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="resolve(false)"
  >
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
      <h3 id="confirm-dialog-title" class="text-lg font-bold text-slate-900 dark:text-white">{{ state.title }}</h3>
      <p id="confirm-dialog-body" class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ state.body }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          class="px-3 py-1.5 rounded text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-80"
          @click="resolve(false)"
        >
          {{ t('dialog.cancel', app.lang) }}
        </button>
        <button
          class="px-3 py-1.5 rounded text-sm bg-red-600 text-white hover:opacity-80"
          @click="resolve(true)"
        >
          {{ t('dialog.confirm', app.lang) }}
        </button>
      </div>
    </div>
  </div>
</template>
