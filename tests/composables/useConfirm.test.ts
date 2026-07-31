import { describe, it, expect } from 'vitest'
import { useConfirm } from '../../src/composables/useConfirm'

describe('useConfirm', () => {
  it('初始状态隐藏', () => {
    const c = useConfirm()
    expect(c.state.value.visible).toBe(false)
  })
  it('open → 可见 + 持标题正文', () => {
    const c = useConfirm()
    c.open('取消订阅？', '确定取消订阅 Arsenal？')
    expect(c.state.value.visible).toBe(true)
    expect(c.state.value.title).toBe('取消订阅？')
    expect(c.state.value.body).toBe('确定取消订阅 Arsenal？')
  })
  it('resolve(true) 后关闭', async () => {
    const c = useConfirm()
    const p = c.open('t', 'b')
    c.resolve(true)
    expect(await p).toBe(true)
    expect(c.state.value.visible).toBe(false)
  })
  it('resolve(false) 后关闭', async () => {
    const c = useConfirm()
    const p = c.open('t', 'b')
    c.resolve(false)
    expect(await p).toBe(false)
    expect(c.state.value.visible).toBe(false)
  })
})
