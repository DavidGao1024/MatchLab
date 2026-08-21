import type { DayGroup, Match } from '../types/models'
import type { Lang } from './i18n'

const pad = (n: number) => String(n).padStart(2, '0')

const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WD_EN_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// 语言时区：中文→东八区（北京），英文→英国时间（伦敦，含夏令时）
const ZONE_ZH = 'Asia/Shanghai'
const ZONE_EN = 'Europe/London'
function zoneOf(lang: Lang): string {
  return lang === 'zh' ? ZONE_ZH : ZONE_EN
}

/** 目标时区字段（年/月/日/时/分/星期索引） */
function zoneFields(d: Date, lang: Lang) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zoneOf(lang),
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(d)
  const num = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  return {
    year: num('year'), month: num('month'), day: num('day'),
    hour: num('hour'), minute: num('minute'),
    wdIndex: Math.max(0, WD_EN_SHORT.indexOf(weekday)),
  }
}

/** 目标时区开球时间；相对 UTC 跨天加前缀（中「次日」/ 英「(+1d)」） */
export function formatKickoff(iso: string, lang: Lang): string {
  const z = zoneFields(new Date(iso), lang)
  const hm = `${pad(z.hour)}:${pad(z.minute)}`
  const zoneDate = `${z.year}-${pad(z.month)}-${pad(z.day)}`
  return zoneDate === iso.slice(0, 10) ? hm : (lang === 'zh' ? `次日 ${hm}` : `(+1d) ${hm}`)
}

/** 目标时区比赛日期标签：中文「8月22日 · 周六」/ 英文「Aug 22 · Sat」 */
export function formatMatchDate(iso: string, lang: Lang): string {
  const z = zoneFields(new Date(iso), lang)
  return lang === 'zh'
    ? `${z.month}月${z.day}日 · ${WEEKDAYS_ZH[z.wdIndex]}`
    : `${MONTHS_EN[z.month - 1]} ${z.day} · ${WEEKDAYS_EN[z.wdIndex]}`
}

/** UTC 日期组头标签："8月16日 · 周六" / "Aug 16 · Sat"（星期按 UTC 推，全球一致） */
export function formatUtcDateLabel(utcDate: string, lang: Lang): string {
  const d = new Date(`${utcDate}T00:00:00Z`)
  const [, m, day] = utcDate.split('-').map(Number)
  const wd = d.getUTCDay()
  if (lang === 'zh') return `${m}月${day}日 · ${WEEKDAYS_ZH[wd]}`
  return `${MONTHS_EN[m - 1]} ${day} · ${WEEKDAYS_EN[wd]}`
}

/** 按 UTC 日期分组（组间升序、组内按开球时间升序）——测试纯函数之五 */
export function groupMatchesByUtcDate(matches: Match[]): DayGroup[] {
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))
  const map = new Map<string, Match[]>()
  for (const m of sorted) {
    const key = m.date.slice(0, 10)
    const list = map.get(key)
    if (list) list.push(m)
    else map.set(key, [m])
  }
  return [...map.entries()].map(([utcDate, ms]) => ({ utcDate, matches: ms }))
}

/** 数据更新时间显示：ISO → 本地"YYYY-MM-DD HH:mm"，不裸出 ISO（规格 §四积分榜页头） */
export function formatUpdateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}