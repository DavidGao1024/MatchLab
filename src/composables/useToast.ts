import { ref } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'error'
  message: string
}

let nextId = 1
const toasts = ref<ToastItem[]>([])

function push(type: ToastItem['type'], message: string) {
  const id = nextId++
  toasts.value.push({ id, type, message })
  setTimeout(() => dismiss(id), 3000)
}

function dismiss(id: number) {
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

/** 测试用：重置单例状态。生产代码请勿调用。 */
export function __resetToast() {
  toasts.value.length = 0
  nextId = 1
}
