import { defineStore } from 'pinia'

const MAX = 4
const STORAGE_KEY = 'matchlab:compare-ids'

function loadIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.slice(0, MAX).filter((x) => typeof x === 'number')
    }
  } catch {
    // 隐私模式 / 损坏 → 空
  }
  return []
}

export const useCompareStore = defineStore('compare', {
  state: () => ({
    ids: loadIds() as number[],
  }),
  getters: {
    isFull: (s) => s.ids.length >= MAX,
    includes: (s) => (id: number) => s.ids.includes(id),
  },
  actions: {
    add(id: number) {
      if (this.ids.length >= MAX || this.ids.includes(id)) return
      // 引用替换而非 push 原地改：watch(() => ids) 靠引用变化触发（2026-08-06 fix：push 导致添加后不刷新）
      this.ids = [...this.ids, id]
      this.persist()
    },
    remove(id: number) {
      this.ids = this.ids.filter((x) => x !== id)
      this.persist()
    },
    clear() {
      this.ids = []
      this.persist()
    },
    toggle(id: number) {
      if (this.ids.includes(id)) this.remove(id)
      else this.add(id)
    },
    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ids))
      } catch {
        // 隐私模式 → 仅会话内
      }
    },
  },
})
