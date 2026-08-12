import { describe, it, expect } from 'vitest'
import { bannerTheme, hexToRgb, luminance, mix } from '../../src/utils/teamColor'

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

describe('bannerTheme 明度阈值边界（设计稿 §3.3：0.16 / 0.85）', () => {
  it('#262626 明度 0.149 < 0.16 → 提亮到约 0.20，灰调不变', () => {
    const th = bannerTheme('#262626', '')
    expect(luminance(th.from)).toBeGreaterThanOrEqual(0.18)
    expect(luminance(th.from)).toBeLessThanOrEqual(0.25)
    const [r, g, b] = hexToRgb(th.from)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })
  it('#2b2b2b 明度 0.169 ≥ 0.16 → 原色直上', () => {
    expect(bannerTheme('#2b2b2b', '').from).toBe('#2b2b2b')
  })
  it('#d6d6d6 明度 0.839 ≤ 0.85 → 白字模式', () => {
    expect(bannerTheme('#d6d6d6', '').darkText).toBe(false)
  })
  it('#ffffff 明度 1 > 0.85 → 深字模式、底色不变', () => {
    const th = bannerTheme('#ffffff', '#1a1a1a')
    expect(th.darkText).toBe(true)
    expect(th.from).toBe('#ffffff')
  })
})

describe('bannerTheme 四类真实球队色', () => {
  it('阿森纳红 #EF0107：原色直上 + 白字 + 强调色提亮', () => {
    const th = bannerTheme('#EF0107', '#9C1B1B')
    expect(th.from).toBe('#EF0107')
    expect(th.darkText).toBe(false)
    expect(luminance(th.accent)).toBeGreaterThan(0.5)
    expect(luminance(th.to)).toBeLessThan(luminance(th.from))
  })
  it('切尔西藏青 #144992：原色直上（粗大白字 3:1 足够，不提亮）', () => {
    expect(bannerTheme('#144992', '#f0c75e').from).toBe('#144992')
  })
  it('昂热近黑 #1a1a1a：提亮脱离卡底', () => {
    const th = bannerTheme('#1a1a1a', '#ffffff')
    expect(luminance(th.from)).toBeGreaterThan(0.16)
  })
  it('欧塞尔白 #ffffff：深字模式', () => {
    expect(bannerTheme('#ffffff', '#1a1a1a').darkText).toBe(true)
  })
})

describe('bannerTheme 斜纹与细线兜底', () => {
  it('副色缺失 → 黑纹降级', () => {
    expect(bannerTheme('#EF0107', '').stripe).toBe('rgba(0,0,0,0.12)')
  })
  it('副色与主色相同 → 黑纹降级', () => {
    expect(bannerTheme('#EF0107', '#EF0107').stripe).toBe('rgba(0,0,0,0.12)')
  })
  it('副色有效 → 斜纹带副色', () => {
    expect(bannerTheme('#EF0107', '#003399').stripe).toBe('rgba(0,51,153,0.15)')
  })
  it('白底旗副色缺失 → 深主色纹', () => {
    expect(bannerTheme('#ffffff', '').stripe).toBe('rgba(102,102,102,0.15)')
  })
  it('细线起点：副色有效用副色，缺失退回强调色', () => {
    expect(bannerTheme('#EF0107', '#003399').pinFrom).toBe('#003399')
    const th = bannerTheme('#EF0107', '')
    expect(th.pinFrom).toBe(th.accent)
    expect(th.pinTo).toBe(th.from)
  })
})

describe('hexToRgb 边界', () => {
  it('3 位 hex 正常展开', () => {
    expect(hexToRgb('#f00')).toEqual([255, 0, 0])
  })
  it('空串与非法 hex 兜底纯黑', () => {
    expect(hexToRgb('')).toEqual([0, 0, 0])
    expect(hexToRgb('#12zzzz')).toEqual([0, 0, 0])
  })
})
