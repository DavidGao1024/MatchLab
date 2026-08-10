<script setup lang="ts">
import { useToast } from '../../composables/useToast'
import { useAppStore } from '../../stores/app'
import { t as tr } from '../../utils/i18n' // 别名避开下方循环变量 t
const { toasts, dismiss } = useToast()
const app = useAppStore()
</script>

<template>
  <div
    class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
    aria-live="polite"
    aria-atomic="false"
  >
    <div
      v-for="t in toasts"
      :key="t.id"
      role="status"
      :aria-label="t.type === 'success' ? tr('toast.success', app.lang) : tr('toast.error', app.lang)"
      class="px-4 py-2 rounded-md shadow-lg pointer-events-auto cursor-pointer text-sm font-medium"
      :class="t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
      @click="dismiss(t.id)"
    >
      {{ t.message }}
    </div>
  </div>
</template>
