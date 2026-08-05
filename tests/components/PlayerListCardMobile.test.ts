// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlayerListCardMobile from '../../src/components/players/PlayerListCardMobile.vue'
import type { PlayerSummary, Team } from '../../src/types/models'

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
    color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
    ...over,
  }
}

function makePlayer(over: Partial<PlayerSummary> = {}): PlayerSummary {
  return {
    id: 253989, name: 'Erling Haaland', teamId: 503, team: 'Manchester City',
    position: 'F', age: 25, goals: 14, assists: 2,
    ...over,
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('PlayerListCardMobile', () => {
  it('中文模式渲染球员名/球队名/位置/年龄/进球/助攻', () => {
    const w = mount(PlayerListCardMobile, {
      props: { player: makePlayer(), team: makeTeam(), rank: 1, lang: 'zh' },
    })
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('曼城')
    expect(w.text()).toContain('前锋')
    expect(w.text()).toContain('25')
    expect(w.text()).toContain('14')
    expect(w.text()).toContain('2')
  })

  it('英文模式回退英文', () => {
    const w = mount(PlayerListCardMobile, {
      props: { player: makePlayer(), team: makeTeam(), rank: 1, lang: 'en' },
    })
    expect(w.text()).toContain('Haaland')
    expect(w.text()).toContain('Manchester City')
    expect(w.text()).toContain('Forward')
  })

  it('点击触发 click emit', async () => {
    const w = mount(PlayerListCardMobile, {
      props: { player: makePlayer(), team: makeTeam(), rank: 1, lang: 'zh' },
    })
    await w.trigger('click')
    expect(w.emitted('click')).toBeTruthy()
  })
})
