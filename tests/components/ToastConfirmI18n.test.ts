// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Toast from '../../src/components/common/Toast.vue'
import ConfirmDialog from '../../src/components/common/ConfirmDialog.vue'
import { useToast, __resetToast } from '../../src/composables/useToast'
import { useConfirm, __resetConfirm } from '../../src/composables/useConfirm'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.useFakeTimers()
  __resetToast()
  __resetConfirm()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast i18n', () => {
  it('中文模式：aria-label 成功/错误', () => {
    const toast = useToast()
    toast.success('ok')
    toast.error('bad')
    const w = mount(Toast)
    const labels = w.findAll('[role="status"]').map((n) => n.attributes('aria-label'))
    expect(labels).toContain('成功')
    expect(labels).toContain('错误')
  })
  it('英文模式：aria-label Success/Error', () => {
    localStorage.setItem('matchlab:lang', 'en')
    const toast = useToast()
    toast.success('ok')
    toast.error('bad')
    const w = mount(Toast)
    const labels = w.findAll('[role="status"]').map((n) => n.attributes('aria-label'))
    expect(labels).toContain('Success')
    expect(labels).toContain('Error')
  })
})

describe('ConfirmDialog i18n', () => {
  it('中文模式：按钮 取消/确认', () => {
    useConfirm().open('标题', '内容')
    const w = mount(ConfirmDialog)
    expect(w.text()).toContain('取消')
    expect(w.text()).toContain('确认')
  })
  it('英文模式：按钮 Cancel/Confirm', () => {
    localStorage.setItem('matchlab:lang', 'en')
    useConfirm().open('Title', 'Body')
    const w = mount(ConfirmDialog)
    expect(w.text()).toContain('Cancel')
    expect(w.text()).toContain('Confirm')
  })
})
