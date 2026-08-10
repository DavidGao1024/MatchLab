<script setup lang="ts">
import { ref } from 'vue'
import { fetchLiveScores } from '../../composables/useEspanFetch'
import { generateICal } from '../../utils/iCal'
import { downloadBlob } from '../../utils/download'
import { useToast } from '../../composables/useToast'
import { useUserDataStore } from '../../stores/userData'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
import type { Match } from '../../types/models'
import type { LeagueSlug } from '../../utils/constants'

const props = defineProps<{
  league: LeagueSlug
  teamId: number
  teamName: string
  teamSlug: string
  seasonStart: number
}>()

const store = useUserDataStore()
const app = useAppStore()
const loading = ref(false)
const toast = useToast()

async function onExport() {
  if (loading.value || store.readOnly) return
  loading.value = true
  try {
    const months = ['08', '09', '10', '11', '12', '01', '02', '03', '04', '05']
    const all = await Promise.all(
      months.map((m) => {
        const year = Number(m) >= 8 ? props.seasonStart : props.seasonStart + 1
        return fetchLiveScores(props.league, `${year}-${m}`)
      }),
    )
    const teamMatches = all.flat().filter((m) => {
      return m.home.id === props.teamId || m.away.id === props.teamId
    }) as Match[]
    const ical = generateICal({ name: props.teamName, slug: props.teamSlug }, teamMatches)
    downloadBlob(`matchlab-${props.teamSlug}-${props.seasonStart}.ics`, ical, 'text/calendar')
    toast.success(app.lang === 'zh' ? `已导出 ${teamMatches.length} 场赛程` : `Exported ${teamMatches.length} matches`)
  } catch (e) {
    toast.error(t('cal.exportFailed', app.lang))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="px-3 py-1.5 rounded text-sm bg-slate-700 text-white hover:opacity-80 disabled:opacity-50"
    :disabled="loading || store.readOnly"
    @click="onExport"
  >
    {{ loading ? t('cal.exporting', app.lang) : t('cal.export', app.lang) }}
  </button>
</template>
