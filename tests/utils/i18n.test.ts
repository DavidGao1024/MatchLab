import { describe, expect, it } from 'vitest'
import { t, teamName, TEAM_ZH } from '../../src/utils/i18n'

describe('t()', () => {
  it('中英文都能取到', () => {
    expect(t('nav.standings', 'zh')).toBe('积分榜')
    expect(t('nav.standings', 'en')).toBe('Table')
  })
  it('未定义的键原样返回（不炸页）', () => {
    expect(t('no.such.key', 'zh')).toBe('no.such.key')
  })
})

describe('teamName()', () => {
  it('中文模式走译名表', () => {
    expect(teamName('Arsenal', 'zh')).toBe('阿森纳')
    expect(teamName('Tottenham Hotspur', 'zh')).toBe('托特纳姆热刺')
  })
  it('英文模式/未收录队名原样返回', () => {
    expect(teamName('Arsenal', 'en')).toBe('Arsenal')
    expect(teamName('Some Unknown FC', 'zh')).toBe('Some Unknown FC')
  })
})

describe('TEAM_ZH 覆盖 96 队', () => {
  it('五联赛队数 = 20+20+20+18+18', () => {
    expect(Object.keys(TEAM_ZH)).toHaveLength(96)
  })
})
