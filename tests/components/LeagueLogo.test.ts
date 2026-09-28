// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LeagueLogo from '../../src/components/common/LeagueLogo.vue'
import { LEAGUE_SLUGS } from '../../src/utils/constants'

describe('LeagueLogo', () => {
  it('六大联赛都有本地徽标，src 指向 leagues/<slug>.png', () => {
    for (const slug of LEAGUE_SLUGS) {
      const w = mount(LeagueLogo, { props: { league: slug } })
      const img = w.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toContain(`leagues/${slug}.png`)
    }
  })

  it('label 同时作为 alt/title（徽标独立出现、旁边无联赛名时用）', () => {
    const w = mount(LeagueLogo, { props: { league: 'eng.1', label: '英超' } })
    const img = w.find('img')
    expect(img.attributes('alt')).toBe('英超')
    expect(img.attributes('title')).toBe('英超')
  })

  it('缺省 label 时 alt 为空串（名字就在旁边，避免读屏重复）', () => {
    const w = mount(LeagueLogo, { props: { league: 'esp.1' } })
    expect(w.find('img').attributes('alt')).toBe('')
  })

  it('尺寸跟随 size，默认 16', () => {
    const w1 = mount(LeagueLogo, { props: { league: 'eng.1' } })
    expect(w1.find('img').attributes('width')).toBe('16')
    expect(w1.find('img').attributes('height')).toBe('16')
    const w2 = mount(LeagueLogo, { props: { league: 'eng.1', size: 22 } })
    expect(w2.find('img').attributes('width')).toBe('22')
    expect(w2.find('img').attributes('height')).toBe('22')
  })

  it('加载失败后隐藏（不裂图）', async () => {
    const w = mount(LeagueLogo, { props: { league: 'eng.1' } })
    await w.find('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
  })
})