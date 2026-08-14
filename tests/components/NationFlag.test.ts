// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NationFlag from '../../src/components/common/NationFlag.vue'

const FLAG = 'https://a.espncdn.com/i/teamlogos/countries/500/eng.png'

describe('NationFlag', () => {
  it('有旗链接渲染 img，title/alt 为国名', () => {
    const w = mount(NationFlag, { props: { flag: FLAG, citizenship: 'England' } })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(FLAG)
    expect(img.attributes('title')).toBe('England')
    expect(img.attributes('alt')).toBe('England')
  })

  it('无旗链接（null / 缺省）什么都不渲染', () => {
    const w1 = mount(NationFlag, { props: { flag: null, citizenship: 'England' } })
    expect(w1.find('img').exists()).toBe(false)
    expect(w1.text()).toBe('')
    const w2 = mount(NationFlag)
    expect(w2.find('img').exists()).toBe(false)
  })

  it('加载失败后隐藏', async () => {
    const w = mount(NationFlag, { props: { flag: FLAG, citizenship: 'England' } })
    await w.find('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
  })

  it('旗链接变化时重置失败态', async () => {
    const w = mount(NationFlag, { props: { flag: 'https://x/a.png', citizenship: 'A' } })
    await w.find('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
    await w.setProps({ flag: FLAG, citizenship: 'England' })
    expect(w.find('img').exists()).toBe(true)
  })

  it('尺寸跟随 size，默认 16', () => {
    const w1 = mount(NationFlag, { props: { flag: FLAG, citizenship: 'England' } })
    expect(w1.find('img').attributes('width')).toBe('16')
    const w2 = mount(NationFlag, { props: { flag: FLAG, citizenship: 'England', size: 24 } })
    expect(w2.find('img').attributes('width')).toBe('24')
    expect(w2.find('img').attributes('height')).toBe('24')
  })
})
