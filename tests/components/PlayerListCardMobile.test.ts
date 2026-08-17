// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlayerListCardMobile from '../../src/components/players/PlayerListCardMobile.vue'
import type { PlayerSummary, Team } from '../../src/types/models'

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 503, name: 'Manchester City', shortDisplayName: 'Man City', abbreviation: 'MCI',
    color: '#6CABDD', alternateColor: '#1C2C5B', logo: '', logoDark: '',
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

  it('null age/goals/assists 显示 —', () => {
    const w = mount(PlayerListCardMobile, {
      props: { player: makePlayer({ age: null, goals: null, assists: null }), team: makeTeam(), rank: 1, lang: 'zh' },
    })
    const html = w.html()
    // '—' 出现 3 次（age/goals/assists 三处）
    const matches = html.match(/—/g) ?? []
    expect(matches.length).toBe(3)
  })

  it('有国籍时名字前渲染国旗', () => {
    const w = mount(PlayerListCardMobile, {
      props: {
        player: makePlayer({ citizenship: 'Norway', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/nor.png' }),
        team: makeTeam(), rank: 1, lang: 'zh',
      },
    })
    const img = w.find('img[src*="nor.png"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('title')).toBe('Norway')
  })
})
