// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FavoriteRowCard from '../../src/components/favorites/FavoriteRowCard.vue'
import TeamLogo from '../../src/components/common/TeamLogo.vue'
import { useAppStore } from '../../src/stores/app'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'
import type { LeagueInfo, Team } from '../../src/types/models'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  __resetToast()
  __resetConfirm()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeInfo(over: Partial<LeagueInfo> = {}): LeagueInfo {
  return {
    slug: 'eng.1', name: 'Premier League', nameZh: '英超', country: 'England',
    color: '#3D195B', understatSlug: 'EPL', season: '2025', teams: 20, players: 500,
    ...over,
  }
}

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
    color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
    ...over,
  }
}

describe('FavoriteRowCard', () => {
  it('球队行：名字/联赛徽章/日历钮/删除钮齐全', () => {
    useAppStore().leagues = [makeInfo()]
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1', teamId: 359, team: makeTeam() },
    })
    expect(w.text()).toContain('阿森纳')
    expect(w.text()).toContain('英超')
    expect(w.text()).toContain('日历')
    expect(w.text()).toContain('删除')
    expect(w.findComponent(TeamLogo).exists()).toBe(true)
  })
  it('球队行：名字点击 emit go，删除点击 emit remove', async () => {
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1', teamId: 359 },
    })
    await w.findAll('button').find((b) => b.text().includes('阿森纳'))!.trigger('click')
    expect(w.emitted('go')).toHaveLength(1)
    await w.findAll('button').find((b) => b.text().includes('删除'))!.trigger('click')
    expect(w.emitted('remove')).toHaveLength(1)
  })
  it('球员行：星标圆牌 + 译名，无日历钮', () => {
    const w = mount(FavoriteRowCard, {
      props: { kind: 'player', name: 'Erling Haaland', league: 'eng.1', athleteId: 253989 },
    })
    expect(w.text()).toContain('哈兰德')
    expect(w.text()).toContain('★')
    expect(w.text()).toContain('删除')
    expect(w.text()).not.toContain('日历')
  })
  it('无编号遗留条目：无按钮、名字纯文本', () => {
    useAppStore().leagues = [makeInfo()]
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1' },
    })
    expect(w.findAll('button')).toHaveLength(0)
    expect(w.text()).toContain('阿森纳')
    expect(w.text()).toContain('英超')
  })
  it('球队无档案：联赛色首字圆牌兜底', () => {
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1', teamId: 359 },
    })
    // 未传 team → 兜底圆牌显示译名首字「阿」，背景走联赛默认色 #3D195B
    const badge = w.find('span[aria-hidden="true"]')
    expect(badge.text()).toBe('阿')
    expect(badge.attributes('style')).toContain('rgb(61, 25, 91)')
  })
  it('英文模式：全无中文残留', () => {
    localStorage.setItem('matchlab:lang', 'en')
    useAppStore().leagues = [makeInfo()]
    const w = mount(FavoriteRowCard, {
      props: { kind: 'team', name: 'Arsenal', league: 'eng.1', teamId: 359, team: makeTeam() },
    })
    expect(w.text()).toContain('Arsenal')
    expect(w.text()).toContain('Premier League')
    expect(w.text()).toContain('iCal')
    expect(w.text()).toContain('Remove')
    expect(w.text()).not.toContain('阿森纳')
    expect(w.text()).not.toContain('英超')
    expect(w.text()).not.toContain('日历')
    expect(w.text()).not.toContain('删除')
  })
})
