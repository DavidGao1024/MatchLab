<script setup lang="ts">
import { computed } from 'vue'
import { useUserDataStore } from '../../stores/userData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
import { SUBSCRIPTIONS_LIMIT } from '../../types/user-data'
import type { LeagueSlug } from '../../utils/constants'

const props = defineProps<{
  league: LeagueSlug
  teamId: number
  teamName: string
}>()

const store = useUserDataStore()
const app = useAppStore()
const toast = useToast()
const confirm = useConfirm()

const subscribed = computed(() => store.isSubscribed(props.teamId))
const atLimit = computed(() =>
  store.readOnly
  || (store.subscriptions.length >= SUBSCRIPTIONS_LIMIT && !subscribed.value),
)

async function onClick() {
  if (subscribed.value) {
    const body = app.lang === 'zh' ? `确定取消订阅 ${props.teamName}？` : `Unsubscribe from ${props.teamName}?`
    const ok = await confirm.open(t('sub.confirmTitle', app.lang), body)
    if (ok) {
      store.removeSubscription(props.teamId)
      toast.success(app.lang === 'zh' ? `已取消订阅 ${props.teamName}` : `Unsubscribed from ${props.teamName}`)
    }
  } else {
    try {
      store.addSubscription({ league: props.league, teamId: props.teamId, teamName: props.teamName })
      toast.success(
        app.lang === 'zh'
          ? `已订阅 ${props.teamName}，首页将显示今日赛程`
          : `Subscribed to ${props.teamName}; today's fixtures will show on home`,
      )
    } catch {
      // addSubscription 只会因上限抛错；中文保留原措辞（带数字），英文走 i18n
      toast.error(app.lang === 'zh' ? `订阅上限 ${SUBSCRIPTIONS_LIMIT} 队` : t('sub.limitReached', app.lang))
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
    {{ subscribed ? t('sub.btnDone', app.lang) : t('sub.btn', app.lang) }}
  </button>
</template>
