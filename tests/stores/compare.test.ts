// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCompareStore } from '../../src/stores/compare'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('compare store', () => {
  it('add 替换数组引用（watch(() => ids) 依赖引用变化触发）', () => {
    const store = useCompareStore()
    const before = store.ids
    store.add(1)
    expect(store.ids).not.toBe(before)
    expect(store.ids).toEqual([1])
  })
  it('重复 add 同一球员不重复入列', () => {
    const store = useCompareStore()
    store.add(1)
    store.add(1)
    expect(store.ids).toEqual([1])
  })
  it('满 4 人后 add 被拒', () => {
    const store = useCompareStore()
    ;[1, 2, 3, 4, 5].forEach((id) => store.add(id))
    expect(store.ids).toEqual([1, 2, 3, 4])
  })
  it('remove 移除指定球员', () => {
    const store = useCompareStore()
    store.add(1)
    store.add(2)
    store.remove(1)
    expect(store.ids).toEqual([2])
  })
})
