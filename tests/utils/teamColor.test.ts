import { describe, it, expect } from 'vitest'
import { flagTheme, hexToRgb, luminance, mix } from '../../src/utils/teamColor'

describe('luminance / mix 基础', () => {
  it('纯黑明度 0，纯白明度 1', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 5)
    expect(luminance('#ffffff')).toBeCloseTo(1, 5)
  })
  it('mix 比例 0 原色、1 目标色、0.5 正中点', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mix('#000000', '#ffffff', 0.5).toLowerCase()).toBe('#808080')
  })
})

describe('flagTheme 深字阈值 0.55（设计稿 2026-08-28：文字只看主色）', () => {
  it('阿森纳红 #EF0107 明度约 0.20 → 白字', () => {
    expect(flagTheme('#EF0107', '#FFFFFF').darkText).toBe(false)
  })
  it('尤文黑 #000000 → 白字', () => {
    expect(flagTheme('#000000', '#FFFFFF').darkText).toBe(false)
  })
  it('皇马白 #FFFFFF → 深字', () => {
    expect(flagTheme('#FFFFFF', '#FEBE10').darkText).toBe(true)
  })
  it('曼城天蓝 #6CABDD 明度约 0.63 > 0.55 → 深字', () => {
    expect(flagTheme('#6CABDD', '#FFFFFF').darkText).toBe(true)
  })
  it('边界：#8C8C8C 明度约 0.549 ≤ 0.55 白字；#8D8D8D 约 0.553 深字', () => {
    expect(flagTheme('#8C8C8C', '').darkText).toBe(false)
    expect(flagTheme('#8D8D8D', '').darkText).toBe(true)
  })
})

describe('flagTheme 真彩输出（针纹 + 纯色边框）', () => {
  it('阿森纳（深主色）：针纹真副色白 0.35，边框真副色 100%', () => {
    const th = flagTheme('#EF0107', '#FFFFFF')
    expect(th.stripe).toBe('rgba(255,255,255,0.35)')
    expect(th.border).toBe('#FFFFFF')
  })
  it('皇马（浅主色）：针纹真副色金 0.55', () => {
    expect(flagTheme('#FFFFFF', '#FEBE10').stripe).toBe('rgba(254,190,16,0.55)')
  })
  it('伯恩茅斯黑副色可分辨 → 真彩黑针纹 0.35', () => {
    expect(flagTheme('#DA291C', '#000000').stripe).toBe('rgba(0,0,0,0.35)')
  })
})

describe('flagTheme 兜底（副色缺失 / 与主色太近）', () => {
  it('副色缺失 → 针纹半透明白、边框退回纯白', () => {
    const th = flagTheme('#EF0107', '')
    expect(th.stripe).toBe('rgba(255,255,255,0.35)')
    expect(th.border).toBe('#ffffff')
  })
  it('副色与主色最大通道差 < 24 → 同样兜底', () => {
    const th = flagTheme('#EF0107', '#DA0F10')
    expect(th.stripe).toBe('rgba(255,255,255,0.35)')
    expect(th.border).toBe('#ffffff')
  })
})
