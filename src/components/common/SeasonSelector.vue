<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchJsonCached } from '../../composables/useJsonFetch'
import { useAppStore } from '../../stores/app'
import type { SeasonsFile } from '../../types/static'
import { t } from '../../utils/i18n'
import type { LeagueSlug } from '../../utils/constants'

const props = defineProps<{ league: LeagueSlug; modelValue: string | number }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const app = useAppStore()
const route = useRoute()
const router = useRouter()

const seasons = ref<{ year: number; displayName: string }[]>([])
const loading = ref(true)

const current = computed(() => {
  const info = app.leagueInfo(props.league)
  return info?.season ?? '2025'
})

const selected = computed(() => String(props.modelValue || current.value))

onMounted(async () => {
  try {
    const f = await fetchJsonCached<SeasonsFile>(`data/${props.league}/seasons.json`, 24 * 60 * 60 * 1000, 'seasons')
    seasons.value = f.seasons
  } catch {
    // seasons.json 不存在 → 只显示当前
  } finally {
    loading.value = false
  }
})

function onChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  emit('update:modelValue', v)
  // 同步到 URL query
  const q = { ...route.query }
  if (v === current.value) delete q.season
  else q.season = v
  router.replace({ query: q })
}
</script>

<template>
  <label class="inline-flex items-center gap-2 text-xs text-slate-400">
    <span>{{ t('seasonSelector.label', app.lang) }}</span>
    <select
      :value="selected"
      :disabled="loading"
      @change="onChange"
      class="bg-white/5 border border-white/15 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[var(--league-color)]"
    >
      <option v-for="s in seasons" :key="s.year" :value="s.year">
        {{ s.year }}{{ s.year === Number(current) ? ` · ${t('seasonSelector.current', app.lang)}` : '' }}
      </option>
    </select>
  </label>
</template>
