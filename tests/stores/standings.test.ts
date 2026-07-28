import { describe, expect, it } from 'vitest'
import { formMonths } from '../../src/stores/standings'

describe('formMonths（形势列回看窗口，规格规则 5）', () => {
  it('休赛期（7 月）→ 赛季最后两个月 4/5 月', () => {
    expect(formMonths('2025', 'european', new Date('2026-07-27T00:00:00Z'))).toEqual(['2026-04', '2026-05'])
  })
  it('赛季中（1 月）→ 12/1 月', () => {
    expect(formMonths('2025', 'european', new Date('2026-01-15T00:00:00Z'))).toEqual(['2025-12', '2026-01'])
  })
  it('赛季初（8 月）只有一个月 → 单月窗口', () => {
    expect(formMonths('2025', 'european', new Date('2025-08-20T00:00:00Z'))).toEqual(['2025-08'])
  })
})
