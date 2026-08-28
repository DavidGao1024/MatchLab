// 旗面真彩主题（设计稿 docs/superpowers/specs/2026-08-28-team-flag-realcolor-design.md）
// 主色实底 + 副色细针纹 + 渐变副色边框；文字对比只看主色（明度 > 0.55 → 深字），
// 副色只管纹与边；副色缺失或与主色太近时纹/边退回半透明白。

export interface FlagTheme {
  /** 主色明度 > 0.55，深字模式 */
  darkText: boolean
  /** 细针纹 rgba 色串（3px 宽 / 22px 周期 / 116deg 层） */
  stripe: string
  /** 边框纯色（真副色 100%；副色缺失/太近退回纯白） */
  border: string
}

const TEXT_LIGHT_CEIL = 0.55
const PIN_OP_LIGHT = 0.55 // 浅主色队针纹不透明度（深字压得住）
const PIN_OP_DARK = 0.35

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

export function flagTheme(color: string, altColor: string): FlagTheme {
  const darkText = luminance(color) > TEXT_LIGHT_CEIL
  const useAlt = altDistinct(color, altColor)
  const pinHex = useAlt ? altColor : '#ffffff'
  const pinOp = darkText ? PIN_OP_LIGHT : PIN_OP_DARK
  return {
    darkText,
    stripe: rgba(pinHex, pinOp),
    border: useAlt ? altColor : '#ffffff',
  }
}
