// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const req = createRequire(import.meta.url)
const { resolveFill, candidateKeys } = req('../../scripts/lib/nationality-fill.js')
const { COUNTRY_MAP } = req('../../scripts/lib/country-map.js')
const natMap: Record<string,string> = { 'Wang Yudong':'中国','Yudong Wang':'中国','Kilian Bevis':'瓜德罗普' }
describe('nationality-fill', () => {
  it('命中补齐：返回英文国名+本地旗', () => { expect(resolveFill(['Wang Yudong'],natMap,COUNTRY_MAP)).toEqual({citizenship:'China PR',flag:'flags/cn.png'}) })
  it('反序变体命中', () => { expect(resolveFill(['Yudong Wang'],natMap,COUNTRY_MAP)?.citizenship).toBe('China PR') })
  it('空表/无映射文件→null', () => { expect(resolveFill(['Wang Yudong'],{},COUNTRY_MAP)).toBeNull() })
  it('键不命中→null', () => { expect(resolveFill(['Somebody Else'],natMap,COUNTRY_MAP)).toBeNull() })
  it('国名未映射→null', () => { expect(resolveFill(['Kilian Bevis'],natMap,COUNTRY_MAP)).toBeNull() })
  it('candidateKeys 含原序/去重音/反序', () => { const k=candidateKeys('Joël Veltman'); expect(k).toContain('Joël Veltman'); expect(k).toContain('Joel Veltman'); expect(k).toContain('Veltman Joël') })
})
