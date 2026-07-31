<script setup lang="ts">
import { useToast } from '../../composables/useToast'
const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="px-4 py-2 rounded-md shadow-lg pointer-events-auto cursor-pointer text-sm font-medium"
      :class="t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
      @click="dismiss(t.id)"
    >
      {{ t.message }}
    </div>
  </div>
</template>
