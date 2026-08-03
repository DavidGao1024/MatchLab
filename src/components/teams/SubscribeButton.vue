<script setup lang="ts">
import { computed } from 'vue'
import { useUserDataStore } from '../../stores/userData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import { SUBSCRIPTIONS_LIMIT } from '../../types/user-data'
import type { LeagueSlug } from '../../utils/constants'

const props = defineProps<{
  league: LeagueSlug
  teamId: number
  teamName: string
}>()

const store = useUserDataStore()
const toast = useToast()
const confirm = useConfirm()

const subscribed = computed(() => store.isSubscribed(props.teamId))
const atLimit = computed(() =>
  store.readOnly
  || (store.subscriptions.length >= SUBSCRIPTIONS_LIMIT && !subscribed.value),
)

async function onClick() {
  if (subscribed.value) {
    const ok = await confirm.open('取消订阅？', `确定取消订阅 ${props.teamName}？`)
    if (ok) {
      store.removeSubscription(props.teamId)
      toast.success(`已取消订阅 ${props.teamName}`)
    }
  } else {
    try {
      store.addSubscription({ league: props.league, teamId: props.teamId, teamName: props.teamName })
      toast.success(`已订阅 ${props.teamName}，首页将显示今日赛程`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '订阅失败')
    }
  }
}
</script>

<template>
  <button
    type="button"
    class="px-4 py-1.5 rounded text-sm font-medium transition-opacity"
    :class="subscribed
      ? 'bg-green-600 text-white hover:opacity-80'
      : 'bg-blue-600 text-white hover:opacity-80 disabled:bg-slate-400 disabled:cursor-not-allowed'"
    :disabled="atLimit"
    @click="onClick"
  >
    {{ subscribed ? '已订阅 ✓' : '订阅主队' }}
  </button>
</template>
