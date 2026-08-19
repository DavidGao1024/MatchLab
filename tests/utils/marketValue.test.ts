import { describe, it, expect } from 'vitest'
import {
  formatPlayerValue,
  formatTeamValue,
  playerValue,
  teamValue,
  __setPlayerValues,
  __setTeamValues,
} from '../../src/utils/i18n'

describe('formatPlayerValue（万欧）', () => {
  it('中文：万欧与亿欧边界', () => {
    expect(formatPlayerValue(5500, 'zh')).toBe('5500万欧')
    expect(formatPlayerValue(10000, 'zh')).toBe('1亿欧')
    expect(formatPlayerValue(11000, 'zh')).toBe('1.1亿欧')
    expect(formatPlayerValue(22000, 'zh')).toBe('2.2亿欧')
  })

  it('英文：€XM', () => {
    expect(formatPlayerValue(5500, 'en')).toBe('€55M')
    expect(formatPlayerValue(11000, 'en')).toBe('€110M')
    expect(formatPlayerValue(22000, 'en')).toBe('€220M')
  })
})

describe('formatTeamValue（百万欧）', () => {
  it('中文：亿欧 / 万欧', () => {
    expect(formatTeamValue(1410, 'zh')).toBe('14.1亿欧')
    expect(formatTeamValue(874.3, 'zh')).toBe('8.7亿欧')
    expect(formatTeamValue(10.4, 'zh')).toBe('1040万欧')
  })

  it('英文：€B / €M', () => {
    expect(formatTeamValue(1410, 'en')).toBe('€1.4B')
    expect(formatTeamValue(874, 'en')).toBe('€874M')
  })
})

describe('playerValue / teamValue 匹配', () => {
  it('精确 + 大小写不敏感 + 去重音', () => {
    __setPlayerValues({ 'Bukayo Saka': 11000, 'Martin Ødegaard': 9000 })
    expect(playerValue('Bukayo Saka')).toBe(11000)
    expect(playerValue('bukayo saka')).toBe(11000)
    expect(playerValue('Martin Odegaard')).toBe(9000)
    expect(playerValue('没人')).toBeNull()
  })

  it('球队：精确 + 大小写 + 去重音', () => {
    __setTeamValues({ Arsenal: 1410, 'Atletico Madrid': 500 })
    expect(teamValue('Arsenal')).toBe(1410)
    expect(teamValue('arsenal')).toBe(1410)
    expect(teamValue('Atlético Madrid')).toBe(500)
    expect(teamValue('不存在')).toBeNull()
  })
})