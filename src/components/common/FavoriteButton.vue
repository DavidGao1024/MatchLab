<script setup lang="ts">
import { computed } from 'vue'
import { useUserDataStore } from '../../stores/userData'
import { useToast } from '../../composables/useToast'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
import { FAVORITES_LIMIT } from '../../types/user-data'
import type { LeagueSlug } from '../../utils/constants'

const props = defineProps<{
  type: 'team' | 'player'
  id: number
  name: string
  league: LeagueSlug
}>()

const store = useUserDataStore()
const app = useAppStore()
const toast = useToast()

const fav = computed(() => store.isFavorite(props.type, props.id))
const atLimit = computed(() => {
  if (store.readOnly) return true
  const total = store.favorites.teams.length + store.favorites.players.length
  return total >= FAVORITES_LIMIT && !fav.value
})

function onClick() {
  try {
    store.toggleFavorite(props.type, props.id, props.name, props.league)
  } catch {
    // toggleFavorite 只会因上限抛错；中文保留原措辞（带数字），英文走 i18n
    toast.error(app.lang === 'zh' ? `收藏上限 ${FAVORITES_LIMIT} 项` : t('fav.limitReached', app.lang))
  }
}
</script>

<template>
  <button
    type="button"
    class="text-2xl leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
    :class="fav ? 'text-yellow-500' : 'text-slate-400'"
    :disabled="atLimit"
    @click="onClick"
  >
    {{ fav ? '★' : '☆' }}
  </button>
</template>
