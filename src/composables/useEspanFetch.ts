import type { EspnCompetitor, EspnEvent, EspnH2HGame, EspnKeyEvent, EspnRoster, EspnRosterPlayer, EspnScoreboard, EspnSummary } from '../types/espn-site'
import type { H2HEntry, LineupPlayer, Match, MatchEvent, MatchEventType, MatchLineup, MatchSummary, MatchTeam, StatRow } from '../types/models'
import type { LeagueSlug } from '../utils/constants'

const SITE_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer'

interface ScoreCacheEntry { data: Match[]; ts: number }
const scoreCache = new Map<string, ScoreCacheEntry>()
const TTL_DEFAULT = 60_000
const TTL_LIVE = 10_000

/** 进行中比赛持续不超过 3 小时；当月有进行中比赛则用短 TTL */
function isMonthLive(data: Match[]): boolean {
  const now = Date.now()
  return data.some((m) => {
    if (m.status !== 'in') return false
    const start = new Date(m.date).getTime()
    return now - start < 3 * 3600_000 && now > start
  })
}

function scoreCacheKey(league: string, month: string) { return `${league}:${month}` }

/** 仅供测试：清空缓存 */
export function clearScoreCache() { scoreCache.clear() }

/** 'YYYY-MM' → ESPN dates 参数 YYYYMM01-YYYYMMDD（月末按 UTC 日历推） */
export function monthDateRange(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate() // 下月 0 号 = 本月最后一天
  const mm = String(m).padStart(2, '0')
  return `${y}${mm}01-${y}${mm}${String(last).padStart(2, '0')}`
}

/** ESPN 事件 → Match 模型。页面层永不接触 ESPN 原始结构，接口变脸只改这个文件（规格 §五） */
export function normalizeEvent(e: EspnEvent): Match | null {
  const comp = e.competitions?.[0]
  if (!comp) return null
  const homeC = comp.competitors.find((c) => c.homeAway === 'home')
  const awayC = comp.competitors.find((c) => c.homeAway === 'away')
  if (!homeC || !awayC) return null
  const toTeam = (c: EspnCompetitor): MatchTeam => ({
    id: Number(c.team.id),
    name: c.team.displayName,
    abbreviation: c.team.abbreviation ?? '',
    logo: c.team.logo ?? '',
    score: c.score != null ? Number(c.score) : null,
    winner: c.winner ?? null,
  })
  const state = e.status?.type?.state ?? 'pre'
  return {
    eventId: e.id,
    date: e.date,
    status: state,
    // 判据对齐抓取脚本（scripts/fetch-espn-scores.js 的 type.completed）：
    // ESPN 延期场标 state=post 但 completed=false（STATUS_POSTPONED），按 post 判完赛会以 0-0 污染积分榜
    completed: e.status?.type?.completed === true,
    clock: e.status?.displayClock,
    venue: comp.venue?.fullName ?? '',
    home: toTeam(homeC),
    away: toTeam(awayC),
  }
}

/** 当月直播比分（limit=200 防分页截断，蓝图 §6.3 / 规格 v1.5）
 *  加共享内存缓存：60s 默认 / 10s 当月有进行中比赛 */
export async function fetchLiveScores(league: LeagueSlug, month: string): Promise<Match[]> {
  const key = scoreCacheKey(league, month)
  const hit = scoreCache.get(key)
  if (hit) {
    const age = Date.now() - hit.ts
    const ttl = isMonthLive(hit.data) ? TTL_LIVE : TTL_DEFAULT
    if (age < ttl) return hit.data
  }
  const res = await fetch(`${SITE_API}/${league}/scoreboard?dates=${monthDateRange(month)}&limit=200`)
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  const sb = (await res.json()) as EspnScoreboard
  const data = (sb.events ?? []).map(normalizeEvent).filter((m): m is Match => m !== null)
  scoreCache.set(key, { data, ts: Date.now() })
  return data
}

// ===== Phase 3：比赛详情弹窗 summary 端点（CORS 已验证，与 scoreboard 同源同端点族）=====

/** 解析阵型串 "3-5-2" → [3, 5, 2]（后卫/中场/前锋）；GK 单独 */
function parseFormation(form?: string): number[] {
  if (!form) return []
  const parts = form.split('-').map(Number).filter((n) => Number.isFinite(n) && n > 0)
  return parts
}

/** 球员按位置分类（移植世界杯项目 categorizePlayers 逻辑）
 *  DEF: posAbbr === 'D' 或匹配 /^(CD(?:-|$)|CB|LB|RB|WB|SW)/，注意 CD(?:-|$) 排除 CDM
 *  MID: posName 含 'midfield' 或 posAbbr 匹配 /^(CM|DM|AM|LM|RM|M)/
 *  其余 → FWD */
interface PlayerCats { GK: EspnRosterPlayer[]; D: EspnRosterPlayer[]; M: EspnRosterPlayer[]; F: EspnRosterPlayer[] }
function categorizePlayers(players: EspnRosterPlayer[]): PlayerCats {
  const cats: PlayerCats = { GK: [], D: [], M: [], F: [] }
  for (const p of players) {
    const posName = (p.position?.name ?? p.position?.displayName ?? '').toLowerCase()
    const a = (p.position?.abbreviation ?? '').toUpperCase()
    if (posName === 'goalkeeper' || a === 'G' || a === 'GK') { cats.GK.push(p); continue }
    if (a === 'D' || /^(CD(?:-|$)|CB|LB|RB|WB|SW)/.test(a)) { cats.D.push(p); continue }
    if (posName.includes('midfield') || /^(CM|DM|AM|LM|RM|M)/.test(a)) { cats.M.push(p); continue }
    cats.F.push(p)
  }
  return cats
}

/** 同排球员左右排序：LB/LW/LM=0, L*=1, C*=2, R*=3, RB/RW/RM=4 */
function posOrder(abbr?: string): number {
  const a = (abbr ?? '').toUpperCase()
  if (/-L$|^LCB$|^LDM$|^LCM$|^LCF$/.test(a)) return 1
  if (/-R$|^RCB$|^RDM$|^RCM$|^RCF$/.test(a)) return 3
  if (/^(LB|LWB|LW|LF|LM)$/.test(a)) return 0
  if (/^(RB|RWB|RW|RF|RM)$/.test(a)) return 4
  return 2
}

/** 中场球员深度排序：DM=0（靠后）→ CM=1 → AM=2（靠前） */
function midDepthRank(abbr?: string): number {
  const a = (abbr ?? '').toUpperCase()
  if (/^(DM|CDM|LDM|RDM)/.test(a)) return 0
  if (/^(AM|CAM|LAM|RAM)/.test(a)) return 2
  return 1
}

/** 前锋深度排序：CF/ST 最深=3，CF-/ST-=2，F/FW=1，边锋=0 */
function fwdDepthRank(abbr?: string): number {
  const a = (abbr ?? '').toUpperCase()
  if (a === 'CF' || a === 'ST') return 3
  if (/^CF-|^ST-/.test(a)) return 2
  if (a === 'F' || a === 'FW') return 1
  return 0
}

/** 阵型字符串中提取中场各排人数，"4-2-3-1" → [2, 3] */
function getMidPieces(formation: number[]): number[] {
  if (formation.length < 3) return formation.length >= 1 ? [formation[0]] : [4]
  return formation.slice(1, formation.length - 1)
}

/** 根据阵型计算各类球员 Y 坐标百分比（移植世界杯 getFormationYRows）
 *  Y 从下到上：GK(88), DEF(74), MID 各排..., FWD(16) */
interface FormationRows { GK: number; D: number; M: number | number[]; F: number; AM?: number }
function getFormationYRows(formation: number[], _cats: PlayerCats): FormationRows {
  const parts = formation.length >= 3 ? formation : [4, 4, 2]
  const midPieces = getMidPieces(parts)
  const yPositions: number[] = []
  yPositions.push(88) // GK
  yPositions.push(74) // DEF
  if (midPieces.length === 1) {
    yPositions.push(46) // 单排中场
  } else if (midPieces.length === 2) {
    yPositions.push(58) // 防守中场
    yPositions.push(34) // 进攻中场
  } else if (midPieces.length >= 3) {
    yPositions.push(62)
    yPositions.push(44)
    yPositions.push(26)
  }
  yPositions.push(16) // FWD
  const result: FormationRows = {
    GK: yPositions[0],
    D: yPositions[1],
    M: midPieces.length === 1 ? yPositions[2] : yPositions.slice(2, 2 + midPieces.length),
    F: yPositions[yPositions.length - 1],
  }
  if (parts.length >= 4) result.AM = 34
  return result
}

/** 获取同一排（同 Y）的球员，用于同排内 x 均分时计数（移植世界杯 getPeersInRow）
 *  注意：必须返回副本，不能返回 cats[cat] 原引用，否则 getFieldXY 内的 peers.sort 会改原数组
 *  导致 layerStarters 的 for...of 迭代器在数组被重排后跳项重复 */
function getPeersInRow(player: EspnRosterPlayer, cat: 'GK' | 'D' | 'M' | 'F', cats: PlayerCats, formation: number[]): EspnRosterPlayer[] {
  if (cat === 'GK' || cat === 'D') return [...cats[cat]]
  if (cat === 'F') {
    const parts = formation.length >= 3 ? formation : [4, 4, 2]
    if (parts.length >= 4 && cats.F.length > parts[parts.length - 1]) {
      const sortedFwds = [...cats.F].sort((a, b) => fwdDepthRank(b.position?.abbreviation) - fwdDepthRank(a.position?.abbreviation))
      const fwdCount = parts[parts.length - 1]
      const fwdIdx = sortedFwds.indexOf(player)
      if (fwdIdx < fwdCount) return sortedFwds.slice(0, fwdCount)
      return sortedFwds.slice(fwdCount)
    }
    return [...cats.F]
  }
  // MID: 按深度分组
  const midPieces = getMidPieces(formation)
  if (midPieces.length <= 1) return [...cats.M]
  const sortedMids = [...cats.M].sort((a, b) => midDepthRank(a.position?.abbreviation) - midDepthRank(b.position?.abbreviation))
  const posIdx = sortedMids.indexOf(player)
  let cumulative = 0
  for (let r = 0; r < midPieces.length; r++) {
    cumulative += midPieces[r]
    if (posIdx < cumulative) {
      const start = cumulative - midPieces[r]
      return sortedMids.slice(start, cumulative)
    }
  }
  return [...cats.M]
}

/** 根据位置分类与阵型计算球员在场上的 X, Y 百分比（移植世界杯 getFieldXY） */
function getFieldXY(player: EspnRosterPlayer, cat: 'GK' | 'D' | 'M' | 'F', cats: PlayerCats, formation: number[]): { x: number; y: number } {
  const rows = getFormationYRows(formation, cats)
  let rowY: number | number[] = rows[cat]
  if (cat === 'M' && Array.isArray(rowY)) {
    const sortedMids = [...cats.M].sort((a, b) => midDepthRank(a.position?.abbreviation) - midDepthRank(b.position?.abbreviation))
    const midPieces = getMidPieces(formation)
    const posIdx = sortedMids.indexOf(player)
    let cumulative = 0
    for (let r = 0; r < midPieces.length; r++) {
      cumulative += midPieces[r]
      if (posIdx < cumulative) { rowY = rowY[r]; break }
    }
    if (Array.isArray(rowY)) rowY = rowY[rowY.length - 1]
  }
  // FWD 溢出分流
  if (cat === 'F' && rows.AM !== undefined) {
    const parts = formation.length >= 3 ? formation : [4, 4, 2]
    const fwdCount = parts[parts.length - 1]
    if (cats.F.length > fwdCount) {
      const sortedFwds = [...cats.F].sort((a, b) => fwdDepthRank(b.position?.abbreviation) - fwdDepthRank(a.position?.abbreviation))
      const fwdIdx = sortedFwds.indexOf(player)
      rowY = fwdIdx < fwdCount ? rows.F : rows.AM
    }
  }
  const y = typeof rowY === 'number' ? rowY : 48
  const peers = getPeersInRow(player, cat, cats, formation)
  peers.sort((a, b) => posOrder(a.position?.abbreviation) - posOrder(b.position?.abbreviation))
  const idx = peers.indexOf(player)
  const count = peers.length
  let x: number
  if (count <= 1) x = 50
  else if (count === 2) x = [28, 72][idx]
  else if (count === 3) x = [18, 50, 82][idx]
  else if (count === 4) x = [12, 36, 64, 88][idx]
  else x = 8 + (84 * idx / (count - 1))
  return { x, y }
}

/** ESPN roster player → LineupPlayer */
function normalizeLineupPlayer(p: EspnRosterPlayer, group: 'GK' | 'D' | 'M' | 'F'): LineupPlayer {
  const fullName = p.athlete.displayName ?? ([p.athlete.firstName, p.athlete.lastName].filter(Boolean).join(' ') || '')
  return {
    id: Number(p.athlete.id),
    jersey: p.jersey,
    name: fullName,
    shortName: p.athlete.shortName ?? p.athlete.lastName ?? fullName,
    position: group,
    positionAbbr: p.position?.abbreviation,
    positionName: p.position?.name,
    starter: p.starter ?? false,
  }
}

/** 把首发 11 人按阵型分层 + 计算每个球员的 (x, y) 坐标
 *  完全移植世界杯项目 categorizePlayers + getFieldXY + getFormationYRows 逻辑 */
function layerStarters(roster: EspnRosterPlayer[], formation: number[]): LineupPlayer[] {
  const starters = roster.filter((p) => p.starter)
  const cats = categorizePlayers(starters)
  const out: LineupPlayer[] = []
  for (const cat of ['GK', 'D', 'M', 'F'] as const) {
    for (const p of cats[cat]) {
      const lp = normalizeLineupPlayer(p, cat)
      const { x, y } = getFieldXY(p, cat, cats, formation)
      lp.x = x
      lp.y = y
      out.push(lp)
    }
  }
  return out
}

function normalizeLineup(roster: EspnRoster, teamId: number): MatchLineup {
  const formation = parseFormation(roster.formation)
  const all = roster.roster ?? []
  const starters = layerStarters(all, formation)
  const starterIds = new Set(starters.map((s) => s.id))
  const benchRoster = all.filter((p) => !starterIds.has(Number(p.athlete.id)))
  const benchCats = categorizePlayers(benchRoster)
  const bench: LineupPlayer[] = []
  for (const cat of ['GK', 'D', 'M', 'F'] as const) {
    for (const p of benchCats[cat]) {
      bench.push(normalizeLineupPlayer(p, cat))
    }
  }
  const coach = roster.coach
  const coachName = coach?.displayName ?? [coach?.firstName, coach?.lastName].filter(Boolean).join(' ')
  return {
    teamId,
    formation: roster.formation,
    starters,
    bench,
    coachName: coachName || undefined,
  }
}

/** ESPN keyEvent text 含 "Own Goal" 子串则判为乌龙球 */
function isOwnGoal(text?: string): boolean {
  if (!text) return false
  return /own goal/i.test(text)
}

/** ESPN keyEvent text 含 "Second Yellow" / "second bookable" / 累积黄牌 → 第二黄 */
function isSecondYellow(text?: string): boolean {
  if (!text) return false
  return /second yellow|second bookable|2nd yellow/i.test(text)
}

/** text 含 "Penalty" 但不含 "Missed"/"Saved" → 点球命中 */
function isPenalty(text?: string): boolean {
  if (!text) return false
  return /penalty/i.test(text) && !/miss|save/i.test(text)
}

/** ESPN keyEvent → MatchEvent；含 text 关键字判定乌龙/二黄/点球 */
function normalizeKeyEvent(e: EspnKeyEvent, awayId: number, idx: number): MatchEvent | null {
  const t = e.type ?? ''
  const text = e.text ?? ''
  let type: MatchEventType
  switch (t) {
    case 'goal':
      type = isOwnGoal(text) ? 'ownGoal' : isPenalty(text) ? 'penalty' : 'goal'
      break
    case 'yellow-card':
      type = isSecondYellow(text) ? 'secondYellow' : 'yellow'
      break
    case 'red-card':
      type = 'red'
      break
    case 'substitution':
      type = 'substitution'
      break
    case 'penalty-missed':
      type = 'penaltyMissed'
      break
    default:
      // ESPN 部分事件 type 字段缺失或为 unknown，按 text 兜底
      if (/own goal/i.test(text)) type = 'ownGoal'
      else if (/red card/i.test(text)) type = 'red'
      else if (/second yellow/i.test(text)) type = 'secondYellow'
      else if (/yellow card|booked|caution/i.test(text)) type = 'yellow'
      else if (/substitut|replac/i.test(text)) type = 'substitution'
      else if (/penalty.*miss|missed penalty/i.test(text)) type = 'penaltyMissed'
      else if (/penalty/i.test(text)) type = 'penalty'
      else if (/goal/i.test(text)) type = isOwnGoal(text) ? 'ownGoal' : 'goal'
      else return null // kickoff/halftime/start-2nd-half 等噪声事件跳过
  }

  const teamId = e.team?.id ? Number(e.team.id) : null
  const side: 'home' | 'away' = teamId === awayId ? 'away' : 'home'
  // 分钟解析：clock.displayValue 形如 "23'" 或 "90+2'"
  const clockStr = e.clock?.displayValue ?? ''
  const minMatch = clockStr.match(/(\d+)/)
  const minute = minMatch ? Number(minMatch[1]) : idx + 1

  // ESPN participants 顺序：
  //   进球 [射手, 助攻者] / 换人 [入局者, 出局者] / 黄红牌 [被罚球员]
  const parts = e.participants ?? []
  const athlete0 = parts[0]?.athlete?.displayName ?? ''
  const athlete1 = parts[1]?.athlete?.displayName ?? ''

  let primaryName = ''
  let secondaryName: string | undefined

  if (type === 'substitution') {
    // ESPN participants[0]=入局, participants[1]=出局
    // 显示 convention（参照世界杯项目）：出局 ↓ 入局 ↑
    primaryName = athlete1 // 出局者
    secondaryName = athlete0 // 入局者
  } else if (type === 'goal' || type === 'ownGoal' || type === 'penalty') {
    primaryName = athlete0 // 射手
    secondaryName = athlete1 // 助攻者（若 ESPN 提供）
  } else {
    primaryName = athlete0 // 黄红牌被罚球员
  }

  // 比分快照：ESPN text 形如 "Goal! TeamA 1, TeamB 0. ..."，比分之间可能夹队名
  const scoreMatch = text.match(/(\d+)[^0-9]+(\d+)/)
  const scoreSnapshot = scoreMatch ? `${scoreMatch[1]}-${scoreMatch[2]}` : undefined

  return {
    id: e.id ?? `${idx}-${type}-${minute}`,
    type,
    side,
    minute,
    primaryName,
    secondaryName,
    scoreSnapshot,
  }
}

function normalizeH2H(g: EspnH2HGame): H2HEntry | null {
  const comp = g.competitions?.[0]
  if (!comp) return null
  const homeC = comp.competitors.find((c) => c.homeAway === 'home')
  const awayC = comp.competitors.find((c) => c.homeAway === 'away')
  if (!homeC || !awayC) return null
  return {
    date: g.date ?? '',
    homeName: homeC.team.displayName,
    homeScore: homeC.score != null ? Number(homeC.score) : null,
    awayName: awayC.team.displayName,
    awayScore: awayC.score != null ? Number(awayC.score) : null,
    venue: comp.venue?.fullName,
  }
}

/** 把 ESPN stat name (camelCase) 转中文/英文 label；fallback 到 ESPN 自带 label */
function statLabel(name: string, fallbackLabel: string | undefined, lang: 'zh' | 'en'): string {
  const map: Record<string, { zh: string; en: string }> = {
    possessionPct: { zh: '控球率', en: 'Possession' },
    totalShots: { zh: '射门', en: 'Shots' },
    shotsOnTarget: { zh: '射正', en: 'On Target' },
    shotsOnGoal: { zh: '射正', en: 'On Target' },
    totalGoals: { zh: '进球', en: 'Goals' },
    wonCorners: { zh: '角球', en: 'Corners' },
    foulsCommitted: { zh: '犯规', en: 'Fouls' },
    offsides: { zh: '越位', en: 'Offsides' },
    yellowCards: { zh: '黄牌', en: 'Yellow Cards' },
    redCards: { zh: '红牌', en: 'Red Cards' },
    saves: { zh: '扑救', en: 'Saves' },
    totalPasses: { zh: '传球', en: 'Passes' },
    accuratePasses: { zh: '成功传球', en: 'Acc. Passes' },
    passPct: { zh: '传球成功率', en: 'Pass Acc.' },
    totalCrosses: { zh: '传中', en: 'Crosses' },
    accurateCrosses: { zh: '成功传中', en: 'Acc. Crosses' },
    crossPct: { zh: '传中成功率', en: 'Cross Acc.' },
    totalLongBalls: { zh: '长传', en: 'Long Balls' },
    accurateLongBalls: { zh: '成功长传', en: 'Acc. Long Balls' },
    longballPct: { zh: '长传成功率', en: 'Long Ball Acc.' },
    blockedShots: { zh: '被封堵射门', en: 'Blocked Shots' },
    effectiveTackles: { zh: '抢断', en: 'Tackles' },
    totalTackles: { zh: '总抢断', en: 'Total Tackles' },
    tacklePct: { zh: '抢断成功率', en: 'Tackle Acc.' },
    interceptions: { zh: '拦截', en: 'Interceptions' },
    effectiveClearance: { zh: '解围', en: 'Clearances' },
    totalClearance: { zh: '总解围', en: 'Total Clearances' },
    shotPct: { zh: '射门转化率', en: 'Shot Conv.' },
    penaltyKickGoals: { zh: '点球命中', en: 'Pen Goals' },
    penaltyKickShots: { zh: '点球射门', en: 'Pen Shots' },
  }
  return map[name]?.[lang] ?? fallbackLabel ?? name
}

/** ESPN summary → MatchSummary 归一化；homeId/awayId 用来把 keyEvent 归栏 */
export function normalizeSummary(s: EspnSummary, homeId: number, awayId: number, lang: 'zh' | 'en' = 'en'): MatchSummary {
  const rosters = s.rosters ?? []
  const homeRoster = rosters.find((r) => Number(r.team?.id) === homeId)
  const awayRoster = rosters.find((r) => Number(r.team?.id) === awayId)
  const lineups = {
    home: homeRoster ? normalizeLineup(homeRoster, homeId) : null,
    away: awayRoster ? normalizeLineup(awayRoster, awayId) : null,
  }
  const events = (s.keyEvents ?? [])
    .map((e, i) => normalizeKeyEvent(e, awayId, i))
    .filter((e): e is MatchEvent => e !== null)
    .sort((a, b) => a.minute - b.minute)

  // 仅展示 10 项核心统计（与世界杯项目一致），过滤掉噪声字段
  const STAT_ORDER = [
    'possessionPct',
    'totalShots',
    'shotsOnTarget',
    'totalPasses',
    'passPct',
    'foulsCommitted',
    'wonCorners',
    'effectiveTackles',
    'interceptions',
    'effectiveClearance',
  ]
  const teams = s.boxscore?.teams ?? []
  const homeStats = teams.find((t) => Number(t.team.id) === homeId)?.statistics ?? []
  const awayStats = teams.find((t) => Number(t.team.id) === awayId)?.statistics ?? []
  const stats: StatRow[] = []
  for (const name of STAT_ORDER) {
    const h = homeStats.find((s2) => s2.name === name)
    const away = awayStats.find((s2) => s2.name === name)
    if (!h || !away) continue
    const isPossession = name === 'possessionPct'
    const isOtherPct = !isPossession && /Pct$/.test(name)
    const rawH = Number(h.displayValue ?? '0') || 0
    const rawA = Number(away.displayValue ?? '0') || 0
    const homeVal = isOtherPct ? Math.round(rawH * 100) : rawH
    const awayVal = isOtherPct ? Math.round(rawA * 100) : rawA
    stats.push({
      label: statLabel(name, h.label, lang),
      home: homeVal,
      away: awayVal,
      isPercent: isPossession || isOtherPct,
    })
  }

  const h2h = (s.headToHeadGames ?? [])
    .map(normalizeH2H)
    .filter((e): e is H2HEntry => e !== null)
    .slice(0, 10)

  return { lineups, events, stats, h2h }
}

/** 弹窗打开即拉，不进 localStorage（实时数据，与 fetchLiveScores 一致） */
export async function fetchMatchSummary(
  league: LeagueSlug,
  eventId: string,
  homeId: number,
  awayId: number,
  lang: 'zh' | 'en' = 'en',
): Promise<MatchSummary> {
  const res = await fetch(`${SITE_API}/${league}/summary?event=${eventId}`)
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  const s = (await res.json()) as EspnSummary
  return normalizeSummary(s, homeId, awayId, lang)
}

// ===== Task 13: 球队伤员端点（CORS 已验证 2026-08-03，site.api 浏览器直连）=====

export interface InjuryPlayer {
  athleteId: number
  name: string
  type: string
  status: string
}

interface InjuryCacheEntry { data: InjuryPlayer[]; ts: number }
const injuryCache = new Map<string, InjuryCacheEntry>()
const INJURY_TTL = 5 * 60_000

/** 仅供测试：清空伤员缓存 */
export function clearInjuryCache() { injuryCache.clear() }

/** 球队伤员列表（5 分钟缓存）。ESPN 实测：顶层 injuries 数组，非 athletes；
 *  每条 athlete.{id,displayName}、type.{description}、status（顶层字符串）、details.{type,location,returnDate} */
export async function fetchTeamInjuries(league: LeagueSlug, teamId: number): Promise<InjuryPlayer[]> {
  const key = `${league}:${teamId}`
  const hit = injuryCache.get(key)
  if (hit && Date.now() - hit.ts < INJURY_TTL) return hit.data
  const res = await fetch(`${SITE_API}/${league}/injuries?team=${teamId}`)
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`)
  const data = await res.json() as { injuries?: any[] }
  const list: InjuryPlayer[] = (data.injuries ?? []).map((it) => ({
    athleteId: Number(it.athlete?.id ?? 0),
    name: it.athlete?.displayName ?? '',
    type: it.type?.description ?? '',
    status: typeof it.status === 'string' ? it.status : '',
  })).filter((p) => p.athleteId > 0)
  injuryCache.set(key, { data: list, ts: Date.now() })
  return list
}
