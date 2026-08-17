// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ComparePlayerCardMobile from '../../src/components/players/ComparePlayerCardMobile.vue'
import type { PlayerProfile, Team } from '../../src/types/models'

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI',
    color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '',
    ...over,
  }
}

function makeProfile(over: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    id: 253989, displayName: 'Erling Haaland', shortName: 'Haaland',
    firstName: 'Erling', lastName: 'Haaland', age: 25, height: 194, weight: 88,
    jersey: 9, position: 'F', positionLabel: 'Forward', teamId: 503,
    stats: { general: {}, offensive: {}, defensive: {}, goalKeeping: {} } as any,
    ...over,
  }
}

interface Row { category: string; field: string; label: string; values: (number | null)[]; isMaxFlags?: boolean[] }

beforeEach(() => setActivePinia(createPinia()))

describe('ComparePlayerCardMobile', () => {
  it('中文模式渲染球员名 + 各统计项 + 最高标记', () => {
    const rows: Row[] = [
      { category: 'offensive', field: 'totalGoals', label: '进球', values: [14, 12, 8], isMaxFlags: [true, false, false] },
      { category: 'offensive', field: 'goalAssists', label: '助攻', values: [2, 7, 5], isMaxFlags: [false, true, false] },
    ]
    const w = mount(ComparePlayerCardMobile, {
      props: {
        profile: makeProfile(),
        team: makeTeam(),
        rows,
        playerIndex: 0,
        lang: 'zh',
      },
    })
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('进球')
    expect(w.text()).toContain('14')
    expect(w.text()).toContain('最高')
    expect(w.text()).toContain('助攻')
    // 卡片显示该球员的助攻值（index 0 → 2，不是 max）
    expect(w.text()).toContain('2')
  })

  it('英文模式回退英文', () => {
    const rows: Row[] = [
      { category: 'offensive', field: 'totalGoals', label: 'Goals', values: [14, 12], isMaxFlags: [true, false] },
    ]
    const w = mount(ComparePlayerCardMobile, {
      props: { profile: makeProfile(), team: makeTeam(), rows, playerIndex: 0, lang: 'en' },
    })
    expect(w.text()).toContain('Haaland')
    expect(w.text()).toContain('Goals')
  })

  it('点击移除按钮触发 remove emit', async () => {
    const rows: Row[] = []
    const w = mount(ComparePlayerCardMobile, {
      props: { profile: makeProfile(), team: makeTeam(), rows, playerIndex: 0, lang: 'zh' },
    })
    const btn = w.find('button')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(w.emitted('remove')).toBeTruthy()
  })

  it('点击卡片头部球员名触发 click emit', async () => {
    const rows: Row[] = []
    const w = mount(ComparePlayerCardMobile, {
      props: { profile: makeProfile(), team: makeTeam(), rows, playerIndex: 0, lang: 'zh' },
    })
    const buttons = w.findAll('button')
    // 找到"球员名"按钮（不是移除按钮，球员名按钮含"哈兰德"）
    const nameBtn = buttons.find((b) => b.text().includes('哈兰德'))
    expect(nameBtn).toBeTruthy()
    await nameBtn!.trigger('click')
    expect(w.emitted('click')).toBeTruthy()
  })

  it('有国籍时名字前渲染国旗', () => {
    const rows: Row[] = []
    const w = mount(ComparePlayerCardMobile, {
      props: {
        profile: makeProfile({ citizenship: 'Norway', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/nor.png' }),
        team: makeTeam(), rows, playerIndex: 0, lang: 'zh',
      },
    })
    // 旗必须在「名字按钮」内部（承载球员名的 button），而非队徽旁等其他位置
    const nameBtn = w.findAll('button').find((b) => b.text().includes('哈兰德'))
    expect(nameBtn).toBeTruthy()
    expect(nameBtn!.find('img[src*="nor.png"]').exists()).toBe(true)
  })
})
