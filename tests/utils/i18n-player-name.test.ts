// @vitest-environment node
// playerName 特征测试：锁定中文译名的 6 层兜底语义，作为 O(N)→O(1) 重构的等价性护栏。
// 数据用 __setPlayerZh 注入最小集合，精确触发每个分支；重构前后输出必须逐字一致。
import { describe, it, expect, beforeEach } from 'vitest'
import { playerName, __setPlayerZh } from '../../src/utils/i18n'

describe('playerName 分支语义（锁定现有行为）', () => {
  beforeEach(() => {
    __setPlayerZh({
      'Mohamed Salah': '萨拉赫',
      'Kevin De Bruyne': '德布劳内',
      'Martin Ødegaard': '厄德高',
      'Fabio Abreu': '法比奥-阿布雷乌',   // 去重音 key，无带重音 twin → 测③
      'Nkololo': '恩科洛洛',             // 无撇号 key → 测④
      'Pedri': '佩德里',                 // 单独 key → 测⑤分词命中
      'Xyzzy Puma': '甲乙丙',            // 唯一含 "Xyzzy" 的多词 key → 测⑥唯一
      'Qwer One': '冲突样本甲',           // ⑥冲突 A
      'Qwer Two': '冲突样本乙',           // ⑥冲突 B（与 A 共享 "Qwer" 且译名不同）
    })
  })

  it('① 精确命中', () => {
    expect(playerName('Mohamed Salah', 'zh')).toBe('萨拉赫')
  })

  it('② 大小写不敏感：全小写/乱序大小写输入命中', () => {
    expect(playerName('mohamed salah', 'zh')).toBe('萨拉赫')
    expect(playerName('MoHaMeD SaLaH', 'zh')).toBe('萨拉赫')
  })

  it('③ 去重音精确：带重音输入命中去重音 key', () => {
    expect(playerName('Fábio Abreu', 'zh')).toBe('法比奥-阿布雷乌')
  })

  it('④ 撇号兜底：N’Kololo 命中无撇号 key', () => {
    expect(playerName("N'kololo", 'zh')).toBe('恩科洛洛')
  })

  it('⑤ 分词（多词名）：单个词命中返回该译名', () => {
    expect(playerName('Pedri SomethingElse', 'zh')).toBe('佩德里')
  })

  it('⑥ 单名词唯一命中：译名表仅一个 key 含该词', () => {
    expect(playerName('Xyzzy', 'zh')).toBe('甲乙丙')
  })

  it('⑥ 单名词冲突放弃：多个不同译名共享该词 → 返回原名', () => {
    expect(playerName('Qwer', 'zh')).toBe('Qwer')
  })

  it('未命中：多词名无任何命中 → 返回原名', () => {
    expect(playerName('Totally Unknown Name', 'zh')).toBe('Totally Unknown Name')
  })

  it('未命中：单名词无命中 → 返回原名', () => {
    expect(playerName('Qwerty', 'zh')).toBe('Qwerty')
  })

  it('英文模式：直接返回原名', () => {
    expect(playerName('Mohamed Salah', 'en')).toBe('Mohamed Salah')
  })

  it('空名：直接返回空串', () => {
    expect(playerName('', 'zh')).toBe('')
    expect(playerName('', 'en')).toBe('')
  })
})