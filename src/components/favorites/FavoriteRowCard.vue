<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../../stores/app'
import { playerName, teamName, t } from '../../utils/i18n'
import type { LeagueSlug } from '../../utils/constants'
import type { Team } from '../../types/models'
import TeamLogo from '../common/TeamLogo.vue'
import ExportCalendarButton from '../teams/ExportCalendarButton.vue'

const props = defineProps<{
  kind: 'team' | 'player'
  name: string
  league: LeagueSlug
  teamId?: number      // 缺 → 无编号遗留条目，降级渲染（无按钮、不可跳转）
  athleteId?: number   // 同上（球员）
  team?: Team          // 已解析的球队档案；缺省 → 首字圆牌兜底
}>()
const emit = defineEmits<{ go: []; remove: [] }>()

const app = useAppStore()

// 编号有无决定按钮与跳转能力（规格「无编号遗留条目」）
const hasId = computed(() =>
  props.kind === 'team' ? props.teamId !== undefined : props.athleteId !== undefined,
)
const display = computed(() =>
  props.kind === 'team' ? teamName(props.name, app.lang) : playerName(props.name, app.lang),
)
const info = computed(() => app.leagueInfo(props.league))
const leagueColor = computed(() => info.value?.color ?? '#3D195B')
const leagueLabel = computed(() =>
  app.lang === 'zh' ? (info.value?.nameZh ?? props.league) : (info.value?.name ?? props.league),
)
const initials = computed(() => teamName(props.name, app.lang).charAt(0) || '?')
const chipStyle = computed(() => ({
  background: `color-mix(in srgb, ${leagueColor.value} 30%, transparent)`,
  color: `color-mix(in srgb, ${leagueColor.value} 60%, white)`,
}))

// 紧凑导出钮需要的两个小工具（原 FavoritesView 移入，逻辑不变）
function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}
const seasonStart = computed(() => {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
})
</script>

<template>
  <div class="flex items-center gap-2 rounded-lg border border-white/10 bg-[#131a2b] px-3 py-2.5">
    <!-- 图标：球队队徽（无档案 → 联赛色首字圆牌）/ 球员黄星 -->
    <template v-if="kind === 'team'">
      <TeamLogo v-if="team" :team="team" :size="24" />
      <span
        v-else
        class="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full font-cond text-xs text-white"
        :style="{ background: leagueColor }"
        aria-hidden="true"
      >{{ initials }}</span>
    </template>
    <span
      v-else
      class="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-yellow-400/15 text-sm text-yellow-400"
      aria-hidden="true"
    >★</span>

    <!-- 名字：有编号 → 按钮可跳详情；无编号 → 纯文本（布局规则：flex-1 truncate，徽章按钮优先） -->
    <button
      v-if="hasId"
      type="button"
      class="min-w-0 flex-1 truncate text-left text-sm font-medium text-white hover:underline"
      @click="emit('go')"
    >{{ display }}</button>
    <span v-else class="min-w-0 flex-1 truncate text-sm text-slate-200">{{ display }}</span>

    <!-- 联赛徽章 -->
    <span class="flex-none rounded-full px-2 py-0.5 text-[10px]" :style="chipStyle">{{ leagueLabel }}</span>

    <!-- 动作区：仅有编号条目渲染；日历钮内嵌导出按钮紧凑变体（整链闭环，不发事件） -->
    <template v-if="hasId">
      <ExportCalendarButton
        v-if="kind === 'team' && teamId !== undefined"
        compact
        :league="league"
        :team-id="teamId"
        :team-name="name"
        :team-slug="slugify(name)"
        :season-start="seasonStart"
      />
      <button
        type="button"
        class="flex-none rounded-md border border-rose-400/25 px-2.5 py-1 text-xs text-rose-400 transition-colors hover:bg-rose-400/10"
        @click="emit('remove')"
      >{{ t('fav.remove', app.lang) }}</button>
    </template>
  </div>
</template>
