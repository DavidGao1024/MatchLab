import { ref } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'error'
  message: string
}

const TOAST_DURATION_MS = 3000

let nextId = 1
const toasts = ref<ToastItem[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function push(type: ToastItem['type'], message: string) {
  const id = nextId++
  toasts.value.push({ id, type, message })
  timers.set(id, setTimeout(() => dismiss(id), TOAST_DURATION_MS))
}

function dismiss(id: number) {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
  const i = toasts.value.findIndex((t) => t.id === id)
  if (i >= 0) toasts.value.splice(i, 1)
}

export function useToast() {
  return {
    toasts,
    success: (msg: string) => push('success', msg),
    error: (msg: string) => push('error', msg),
    dismiss,
  }
}

/** 测试用：重置单例状态。仅 DEV 环境生效，生产环境 no-op。 */
export function __resetToast() {
  if (!import.meta.env.DEV) return
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  toasts.value.length = 0
  nextId = 1
}
