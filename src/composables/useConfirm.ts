import { ref } from 'vue'

interface ConfirmState {
  visible: boolean
  title: string
  body: string
}

const state = ref<ConfirmState>({ visible: false, title: '', body: '' })
let resolver: ((v: boolean) => void) | null = null

export function useConfirm() {
  function open(title: string, body: string): Promise<boolean> {
    if (resolver) resolver(false) // 防御性兜底：旧 Promise 自动 resolve(false)
    state.value = { visible: true, title, body }
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }
  function resolve(v: boolean) {
    if (resolver) {
      resolver(v)
      resolver = null
    }
    state.value = { ...state.value, visible: false }
  }
  return { state, open, resolve }
}

/** 测试用：重置单例状态。仅 DEV 环境生效，生产环境 no-op。 */
export function __resetConfirm() {
  if (!import.meta.env.DEV) return
  if (resolver) resolver(false)
  resolver = null
  state.value = { visible: false, title: '', body: '' }
}
