// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const { monthToken } = req('../../scripts/lib/espn-endpoints.js')

describe('monthToken（ESPN dates 月令牌）', () => {
  it('YYYY-MM → YYYYMM', () => {
    expect(monthToken('2025-09')).toBe('202509')
  })
  it('个位月份补零', () => {
    expect(monthToken('2026-01')).toBe('202601')
  })
  it('12 月', () => {
    expect(monthToken('2026-12')).toBe('202612')
  })
})