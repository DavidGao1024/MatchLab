import type { DayGroup, Match } from '../types/models'
import type { Lang } from './i18n'

const pad = (n: number) => String(n).padStart(2, '0')

const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 本地日期是否越过比赛的 UTC 日期（"次日"判定，规格 v1.4 标准） */
export function isNextDay(iso: string): boolean {
  const d = new Date(iso)
  const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return localDate !== iso.slice(0, 10)
}

/** 本地时区开球时间；跨天加前缀（中"次日"/英 (+1d)） */
export function formatKickoff(iso: string, lang: Lang): string {
  const d = new Date(iso)
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (!isNextDay(iso)) return hm
  return lang === 'zh' ? `次日 ${hm}` : `(+1d) ${hm}`
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
