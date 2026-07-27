import { useAppStore } from '../stores/app'
import { formatKickoff, formatUtcDateLabel, formatUpdateTime } from '../utils/format'

/** 时区格式化统一出口，语言跟随 appStore.lang */
export function useTimezone() {
  const app = useAppStore()
  return {
    /** 开球时间（本地时区，跨天自动加"次日"/(+1d)） */
    kickoff: (iso: string) => formatKickoff(iso, app.lang),
    /** 日期组头标签（UTC 日期，全球一致） */
    dayLabel: (utcDate: string) => formatUtcDateLabel(utcDate, app.lang),
    /** 数据更新时间（本地 YYYY-MM-DD HH:mm，不裸出 ISO） */
    updated: (iso: string) => formatUpdateTime(iso),
  }
}
