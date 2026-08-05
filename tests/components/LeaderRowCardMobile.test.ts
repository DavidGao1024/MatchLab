// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LeaderRowCardMobile from '../../src/components/players/LeaderRowCardMobile.vue'
import type { Team } from '../../src/types/models'
import type { LeaderEntry } from '../../src/types/static'

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI',
    color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '',
    ...over,
  }
}

function makeEntry(over: Partial<LeaderEntry> = {}): LeaderEntry {
  return {
    rank: 1, value: 14, displayValue: '14', athleteId: 253989, athleteName: 'Erling Haaland',
    teamId: 503, teamName: 'Manchester City',
    ...over,
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('LeaderRowCardMobile', () => {
  it('中文模式渲染排名/球员名/球队名/数值/分类名', () => {
    const w = mount(LeaderRowCardMobile, {
      props: { entry: makeEntry(), team: makeTeam(), category: 'goalsLeaders', catDisplayName: 'Goals', lang: 'zh' },
    })
    expect(w.text()).toContain('1')
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('曼城')
    expect(w.text()).toContain('14')
    expect(w.text()).toContain('进球')
  })

  it('英文模式走 displayName', () => {
    const w = mount(LeaderRowCardMobile, {
      props: { entry: makeEntry(), team: makeTeam(), category: 'goalsLeaders', catDisplayName: 'Goals', lang: 'en' },
    })
    expect(w.text()).toContain('Haaland')
    expect(w.text()).toContain('Goals')
  })

  it('点击触发 click emit', async () => {
    const w = mount(LeaderRowCardMobile, {
      props: { entry: makeEntry(), team: makeTeam(), category: 'goalsLeaders', catDisplayName: 'Goals', lang: 'zh' },
    })
    await w.trigger('click')
    expect(w.emitted('click')).toBeTruthy()
  })
})
