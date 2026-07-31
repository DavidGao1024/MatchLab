import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useToast, __resetToast } from '../../src/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    __resetToast()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it('show 成功消息 → toasts 含一条 type=success', () => {
    const toast = useToast()
    toast.success('已订阅')
    expect(toast.toasts.value.length).toBe(1)
    expect(toast.toasts.value[0].type).toBe('success')
    expect(toast.toasts.value[0].message).toBe('已订阅')
  })
  it('3 秒后自动移除', () => {
    const toast = useToast()
    toast.success('test')
    expect(toast.toasts.value.length).toBe(1)
    vi.advanceTimersByTime(3000)
    expect(toast.toasts.value.length).toBe(0)
  })
  it('error 类型独立', () => {
    const toast = useToast()
    toast.error('失败')
    expect(toast.toasts.value[0].type).toBe('error')
  })
  it('手动 dismiss', () => {
    const toast = useToast()
    toast.success('a')
    toast.dismiss(toast.toasts.value[0].id)
    expect(toast.toasts.value.length).toBe(0)
  })
})
