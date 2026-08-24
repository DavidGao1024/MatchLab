<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'

const app = useAppStore()
</script>

<template>
  <footer class="relative z-10 border-t border-white/10 mt-12">
    <div class="max-w-[1600px] mx-auto px-4 py-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono-d text-slate-500">
      <span class="pipe-dot" aria-hidden="true"></span>
      <span>{{ t('footer.pipeline', app.lang) }}</span>
      <span aria-hidden="true">·</span>
      <span>{{ t('footer.source', app.lang) }} ESPN</span>
      <span aria-hidden="true">·</span>
      <span>{{ t('footer.disclaimer', app.lang) }}</span>
      <span class="ml-auto">MATCHLAB · {{ t('footer.tagline', app.lang) }}</span>
    </div>
  </footer>
</template>
