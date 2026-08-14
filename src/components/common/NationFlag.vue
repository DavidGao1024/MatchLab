<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  flag?: string | null
  citizenship?: string | null
  size?: number
}>(), { flag: null, citizenship: null, size: 16 })

const failed = ref(false)
watch(() => props.flag, () => { failed.value = false })
</script>

<template>
  <img
    v-if="flag && !failed"
    :src="flag"
    :alt="citizenship ?? ''"
    :title="citizenship ?? ''"
    loading="lazy"
    :width="size"
    :height="size"
    class="rounded-full object-contain shrink-0 inline-block align-middle"
    @error="failed = true"
  />
</template>
