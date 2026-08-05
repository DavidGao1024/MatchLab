<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../../stores/app'
import { t } from '../../utils/i18n'
import type { PlayerStats } from '../../types/static'

const props = defineProps<{ stats: PlayerStats; position: string }>()

const app = useAppStore()

/** 字段中英文字典（覆盖主要字段；未覆盖自动 prettify camelCase） */
const LABEL: Record<string, { zh: string; en: string }> = {
  // offensive
  goals: { zh: '进球', en: 'Goals' },
  assists: { zh: '助攻', en: 'Assists' },
  shots: { zh: '射门', en: 'Shots' },
  shotsOnTarget: { zh: '射正', en: 'Shots on Target' },
  shotsOnTargetPct: { zh: '射正率', en: 'SOT %' },
  totalShots: { zh: '总射门', en: 'Total Shots' },
  shotAccuracy: { zh: '射门准确率', en: 'Shot Accuracy' },
  penalties: { zh: '点球', en: 'Penalties' },
  penaltiesScored: { zh: '点球命中', en: 'Penalties Scored' },
  penaltiesAttempted: { zh: '点球主罚', en: 'Penalties Attempted' },
  penaltiesConceded: { zh: '被判点球', en: 'Penalties Conceded' },
  goalsFk: { zh: '任意球进球', en: 'Free Kick Goals' },
  goalsHeader: { zh: '头球进球', en: 'Header Goals' },
  goalsLeftFoot: { zh: '左脚进球', en: 'Left Foot Goals' },
  goalsRightFoot: { zh: '右脚进球', en: 'Right Foot Goals' },
  accurateCrosses: { zh: '精准传中', en: 'Accurate Crosses' },
  accurateLongBalls: { zh: '精准长传', en: 'Accurate Long Balls' },
  accuratePasses: { zh: '精准传球', en: 'Accurate Passes' },
  accurateThroughBalls: { zh: '精准直塞', en: 'Accurate Through Balls' },
  attemptsInBox: { zh: '禁区射门', en: 'Attempts in Box' },
  attemptsOutBox: { zh: '禁区外射门', en: 'Attempts out of Box' },
  crossPct: { zh: '传中成功率', en: 'Cross %' },
  freeKickGoals: { zh: '任意球进球', en: 'Free Kick Goals' },
  freeKickPct: { zh: '任意球命中率', en: 'Free Kick %' },
  freeKickShots: { zh: '任意球射门', en: 'Free Kick Shots' },
  gameWinningAssists: { zh: '制胜助攻', en: 'Game Winning Assists' },
  gameWinningGoals: { zh: '制胜进球', en: 'Game Winning Goals' },
  goalAssists: { zh: '助攻', en: 'Goal Assists' },
  headedGoals: { zh: '头球进球', en: 'Headed Goals' },
  inaccurateCrosses: { zh: '失败传中', en: 'Inaccurate Crosses' },
  inaccurateLongBalls: { zh: '失败长传', en: 'Inaccurate Long Balls' },
  inaccuratePasses: { zh: '失败传球', en: 'Inaccurate Passes' },
  inaccurateThroughBalls: { zh: '失败直塞', en: 'Inaccurate Through Balls' },
  leftFootedShots: { zh: '左脚射门', en: 'Left Footed Shots' },
  longballPct: { zh: '长传成功率', en: 'Longball %' },
  offsides: { zh: '越位', en: 'Offsides' },
  penaltyKickGoals: { zh: '点球进球', en: 'Penalty Kick Goals' },
  penaltyKickPct: { zh: '点球命中率', en: 'Penalty Kick %' },
  penaltyKickShots: { zh: '点球射门', en: 'Penalty Kick Shots' },
  penaltyKicksMissed: { zh: '点球未中', en: 'Penalties Missed' },
  rightFootedShots: { zh: '右脚射门', en: 'Right Footed Shots' },
  secondAssists: { zh: '二次助攻', en: 'Second Assists' },
  shootOutGoals: { zh: '点球大战进球', en: 'Shootout Goals' },
  shootOutMisses: { zh: '点球大战未中', en: 'Shootout Misses' },
  shootOutPct: { zh: '点球大战命中率', en: 'Shootout %' },
  shotAssists: { zh: '射门助攻', en: 'Shot Assists' },
  shotPct: { zh: '射门转化率', en: 'Shot %' },
  shotsHeaded: { zh: '头球射门', en: 'Shots Headed' },
  shotsOffTarget: { zh: '射偏', en: 'Shots Off Target' },
  shotsOnPost: { zh: '中柱', en: 'Shots on Post' },
  throughBallPct: { zh: '直塞成功率', en: 'Through Ball %' },
  totalCrosses: { zh: '总传中', en: 'Total Crosses' },
  totalGoals: { zh: '总进球', en: 'Total Goals' },
  totalLongBalls: { zh: '总长传', en: 'Total Long Balls' },
  totalPasses: { zh: '总传球', en: 'Total Passes' },
  totalThroughBalls: { zh: '总直塞', en: 'Total Through Balls' },
  // defensive
  blockedShots: { zh: '封堵射门', en: 'Blocked Shots' },
  effectiveClearance: { zh: '有效解围', en: 'Effective Clearances' },
  ineffectiveClearance: { zh: '无效解围', en: 'Ineffective Clearances' },
  totalClearance: { zh: '总解围', en: 'Total Clearances' },
  effectiveTackles: { zh: '有效抢断', en: 'Effective Tackles' },
  inneffectiveTackles: { zh: '无效抢断', en: 'Ineffective Tackles' },
  totalTackles: { zh: '总抢断', en: 'Total Tackles' },
  tacklesLost: { zh: '失抢断', en: 'Tackles Lost' },
  tacklePct: { zh: '抢断成功率', en: 'Tackle %' },
  interceptions: { zh: '拦截', en: 'Interceptions' },
  // general
  appearances: { zh: '出场', en: 'Appearances' },
  starts: { zh: '首发', en: 'Starts' },
  subIns: { zh: '替补上场', en: 'Sub Ins' },
  subOuts: { zh: '被换下', en: 'Sub Outs' },
  dnp: { zh: '未出场', en: 'Did Not Play' },
  minutes: { zh: '分钟', en: 'Minutes' },
  wins: { zh: '胜', en: 'Wins' },
  draws: { zh: '平', en: 'Draws' },
  losses: { zh: '负', en: 'Losses' },
  winPct: { zh: '胜率', en: 'Win %' },
  foulsCommitted: { zh: '犯规', en: 'Fouls Committed' },
  foulsSuffered: { zh: '被犯规', en: 'Fouls Suffered' },
  yellowCards: { zh: '黄牌', en: 'Yellow Cards' },
  redCards: { zh: '红牌', en: 'Red Cards' },
  ownGoals: { zh: '乌龙', en: 'Own Goals' },
  passPct: { zh: '传球成功率', en: 'Pass %' },
  wonCorners: { zh: '获角球', en: 'Won Corners' },
  lostCorners: { zh: '失角球', en: 'Lost Corners' },
  handBalls: { zh: '手球', en: 'Hand Balls' },
  suspensions: { zh: '停赛', en: 'Suspensions' },
  touches: { zh: '触球', en: 'Touches' },
  goalDifference: { zh: '净胜球', en: 'Goal Diff' },
  avgRatingFromUser: { zh: '用户评分', en: 'User Rating' },
  avgRatingFromEditor: { zh: '编辑评分', en: 'Editor Rating' },
  avgRatingFromCorrespondent: { zh: '记者评分', en: 'Correspondent Rating' },
  avgRatingFromDataFeed: { zh: '数据评分', en: 'Data Feed Rating' },
  timeStarted: { zh: '开场分钟', en: 'Time Started' },
  timeEnded: { zh: '终场分钟', en: 'Time Ended' },
  // goalKeeping
  cleanSheet: { zh: '零封', en: 'Clean Sheets' },
  partialCleenSheet: { zh: '半场零封', en: 'Partial Clean Sheet' },
  goalsConceded: { zh: '失球', en: 'Goals Conceded' },
  saves: { zh: '扑救', en: 'Saves' },
  savePct: { zh: '扑救率', en: 'Save %' },
  penaltyKickSavePct: { zh: '点球扑救率', en: 'Penalty Save %' },
  penaltyKickConceded: { zh: '被判点球', en: 'Penalties Conceded' },
  penaltyKicksFaced: { zh: '面对点球', en: 'Penalties Faced' },
  penaltyKicksSaved: { zh: '扑出点球', en: 'Penalties Saved' },
  crossesCaught: { zh: '摘传中', en: 'Crosses Caught' },
}

function label(field: string): string {
  const hit = LABEL[field]
  if (hit) return app.lang === 'zh' ? hit.zh : hit.en
  // 中文模式下未映射字段原样返回 key（避免输出英文 Title Case 误导用户）
  if (app.lang === 'zh') return field
  // 英文模式：camelCase → Title Case
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

function formatValue(field: string, v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  if (typeof v !== 'number') return String(v)
  // 字段名含 Pct/pct/率 才按百分比显示
  if (/(pct|rate|pctg)$/i.test(field) || /pct/i.test(field)) {
    // 0-1 范围是百分比小数；>1 是已计算值
    if (v > 0 && v <= 1) return `${(v * 100).toFixed(1)}%`
    if (Number.isInteger(v)) return `${v}%`
    return `${v.toFixed(2)}%`
  }
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(2)
}

interface Section {
  key: keyof PlayerStats
  titleKey: string
}

const sections = computed<Section[]>(() => {
  const base: Section[] = [
    { key: 'general', titleKey: 'player.stats.general' },
    { key: 'offensive', titleKey: 'player.stats.offensive' },
    { key: 'defensive', titleKey: 'player.stats.defensive' },
  ]
  if (props.position === 'GK' && props.stats.goalKeeping) {
    base.push({ key: 'goalKeeping', titleKey: 'player.stats.goalKeeping' })
  }
  return base
})
</script>

<template>
  <div class="space-y-3">
    <details
      v-for="sec in sections"
      :key="sec.key"
      :open="sec.key === 'general' || sec.key === 'offensive'"
      class="group border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]"
    >
      <summary class="cursor-pointer px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors list-none">
        <span class="font-cond tracking-wider text-sm text-white">{{ t(sec.titleKey, app.lang) }}</span>
        <span class="text-xs text-slate-500 font-mono-d">
          {{ sec.key === 'general' || sec.key === 'offensive' ? '▾' : '▸' }}
        </span>
      </summary>
      <div class="px-4 pb-3 pt-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
        <div
          v-for="(val, field) in stats[sec.key]"
          :key="field"
          class="flex justify-between gap-2 py-0.5 border-b border-white/5"
        >
          <span class="text-xs text-slate-400 truncate flex-1">{{ label(field) }}</span>
          <span class="text-xs text-white font-mono-d">{{ formatValue(String(field), val as number | null) }}</span>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
details > summary::-webkit-details-marker { display: none; }
</style>
