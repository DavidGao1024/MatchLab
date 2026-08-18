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

describe('TEAM_ZH 覆盖 212 队', () => {
  it('六联赛 112 队 + 升班马 14 队 + 转会履历知名球队 86 队', () => {
    expect(Object.keys(TEAM_ZH)).toHaveLength(212)
  })
  it('升班马译名命中', () => {
    expect(teamName('Coventry City', 'zh')).toBe('考文垂')
    expect(teamName('Hull City', 'zh')).toBe('赫尔城')
    expect(teamName('Schalke 04', 'zh')).toBe('沙尔克04')
  })
  it('转会履历知名球队译名命中', () => {
    expect(teamName('RB Salzburg', 'zh')).toBe('萨尔茨堡红牛')
    expect(teamName('Ajax Amsterdam', 'zh')).toBe('阿贾克斯')
    expect(teamName('FC Porto', 'zh')).toBe('波尔图')
  })
})
