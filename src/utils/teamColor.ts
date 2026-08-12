// 旗面颜色兜底（子项目 2.0 设计稿 §3.3）
// 近黑主色（明度<0.16）会与深蓝卡底融为一体、旗子丢轮廓 → 提亮到约 0.20；
// 白主色（明度>0.85）→ 深字模式；其余原色直上。
// 阈值依据：粗大白字只需 3:1 对比，提亮不是为文字可读而是为旗子轮廓，见设计稿。

export interface BannerTheme {
  /** 旗面渐变起点（主色或调整后） */
  from: string
  /** 渐变终点（起点混 30% 黑） */
  to: string
  /** 斜纹 rgba 色 */
  stripe: string
  /** 下缘细线起点（副色，缺失退回强调色） */
  pinFrom: string
  /** 下缘细线终点 */
  pinTo: string
  /** 白底旗 → 深字模式 */
  darkText: boolean
  /** 深色数据区用的亮主色（比赛块左条 / 积分格） */
  accent: string
}

const DARK_FLOOR = 0.16
const LIGHT_CEIL = 0.85
const DARK_TARGET = 0.2
const ACCENT_FLOOR = 0.45   // 主色明度低于此值时作深底强调色太暗，需提亮
const ACCENT_TARGET = 0.6   // 强调色提亮目标明度

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return [0, 0, 0]
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** 线性加权亮度（0.2126/0.7152/0.0722，范围 0-1）。注意：非 WCAG 相对亮度，无 gamma 校正 */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** 混色：t=0 全 a，t=1 全 b */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

/** 副色与主色是否可分辨（最大通道差 ≥ 24） */
function altDistinct(main: string, alt: string): boolean {
  if (!alt) return false
  const [r1, g1, b1] = hexToRgb(main)
  const [r2, g2, b2] = hexToRgb(alt)
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2)) >= 24
}

export function bannerTheme(color: string, altColor: string): BannerTheme {
  const lum = luminance(color)
  let from = color
  if (lum < DARK_FLOOR) {
    // 明度对混色比例是线性的，一步解出混白比例
    from = mix(color, '#ffffff', (DARK_TARGET - lum) / (1 - lum))
  }
  const darkText = lum > LIGHT_CEIL
  const accent = lum >= ACCENT_FLOOR || darkText
    ? color
    : mix(color, '#ffffff', (ACCENT_TARGET - lum) / (1 - lum))
  const useAlt = altDistinct(color, altColor)
  const stripe = useAlt
    ? rgba(altColor, 0.15)
    : darkText ? rgba(mix(color, '#000000', 0.6), 0.15) : 'rgba(0,0,0,0.12)'
  return {
    from,
    to: mix(from, '#000000', 0.3),
    stripe,
    pinFrom: useAlt ? altColor : accent,
    pinTo: from,
    darkText,
    accent,
  }
}
