// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '../../src/components/common/EmptyState.vue'

describe('EmptyState', () => {
  it('显示标题与正文', () => {
    const w = mount(EmptyState, { props: { title: '暂无订阅', body: '去订阅主队' } })
    expect(w.text()).toContain('暂无订阅')
    expect(w.text()).toContain('去订阅主队')
  })
  it('cta 按钮触发事件', async () => {
    const w = mount(EmptyState, { props: { title: 't', ctaText: '去订阅' } })
    await w.find('button').trigger('click')
    expect(w.emitted('cta')).toBeTruthy()
  })
})
