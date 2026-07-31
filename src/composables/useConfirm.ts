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
