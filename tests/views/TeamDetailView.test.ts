// @vitest-environment jsdom
// 球队详情页主副色主题（旗面式强主题，spec 见 docs/superpowers/specs/2026-08-13-team-detail-theme-design.md）
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import TeamDetailView from '../../src/views/TeamDetailView.vue'
import { useTeamsStore } from '../../src/stores/teams'
import { usePlayersStore } from '../../src/stores/players'
import type { Team, PlayerSummary } from '../../src/types/models'

// 数据全部预注入：除球队身价静态表外，发生任何网络请求都算异常
const mockFetch = vi.fn((input: unknown) => {
  const url = String(input)
  if (url.includes('team-values.json')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ teams: {} }) })
  }
  if (url.includes('/matches/')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches: [] }) })
  }
  return Promise.reject(new Error('no fetch expected'))
})
globalThis.fetch = mockFetch as any

beforeEach(() => {
  localStorage.clear()
  // 强制英文模式，断言用原文队名
  localStorage.setItem('matchlab:lang', 'en')
  mockFetch.mockClear()
})

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 359, name: 'Arsenal', shortDisplayName: 'Arsenal', abbreviation: 'ARS',
    color: '#EF0107', alternateColor: '#9C1B1B', logo: '', logoDark: '',
    venue: { name: 'Emirates Stadium', city: 'London', country: 'England' },
    record: { wins: 26, draws: 7, losses: 5, played: 38, points: 85, goalDiff: 43, goalsFor: 75, goalsAgainst: 32, summary: '26-7-5' },
    ...over,
  }
}

function makePlayer(over: Partial<PlayerSummary> = {}): PlayerSummary {
  return { id: 11, name: 'Test Striker', teamId: 359, team: 'Arsenal', position: 'F', age: 25, goals: 3, assists: 1, ...over }
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/:league/team/:id', component: TeamDetailView },
      { path: '/:league/standings', component: { template: '<div/>' } },
      { path: '/:league/player/:id', component: { template: '<div/>' } },
    ],
  })
}

/** 预注入球队包 + 球员索引，绕开所有网络请求 */
async function setup(team: Team, squad: PlayerSummary[] = []) {
  setActivePinia(createPinia())
  const teams = useTeamsStore()
  teams.bundles['eng.1'] = {
    meta: { season: '2025', seasonType: 'european' } as any,
    teams: [team],
    byId: new Map([[team.id, team]]),
  }
  const players = usePlayersStore()
  players.indexes['eng.1'] = squad
  const router = makeRouter()
  router.push(`/eng.1/team/${team.id}`)
  await router.isReady()
  const w = mount(TeamDetailView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('球队详情页·主题上页', () => {
  it('基本盘：挂载成功、队名出现、无多余网络请求', async () => {
    const w = await setup(makeTeam())
    expect(w.text()).toContain('Arsenal')
    expect(w.text()).toContain('85')
    // 放行唯一合法请求：球队身价静态表；其余一律违规
    const urls = mockFetch.mock.calls.map((c) => String(c[0]))
    expect(urls.every((u) => u.includes('team-values.json') || u.includes('/matches/'))).toBe(true)
  })

  it('球队主色上根容器：--flag-from 为主色，--accent 在位', async () => {
    const w = await setup(makeTeam({ color: '#EF0107' }))
    const style = w.find('section').attributes('style') ?? ''
    expect(style).toContain('--flag-from')
    expect(style).toContain('#EF0107')
    expect(style).toContain('--accent')
  })

  it('白主色 → 旗面深字（防白底白字）', async () => {
    const w = await setup(makeTeam({ color: '#FFFFFF', alternateColor: '#132257' }))
    const style = w.find('section').attributes('style') ?? ''
    expect(style).toContain('--flag-text')
    expect(style).toContain('#0f172a')
  })
})

describe('球队详情页·点缀落位', () => {
  it('战绩 7 格 class 化：积分格 stat-pts，胜绿负红语义类', async () => {
    const w = await setup(makeTeam())
    expect(w.findAll('.stat-cell').length).toBe(7)
    expect(w.find('.stat-cell.stat-pts').exists()).toBe(true)
    expect(w.find('.stat-val.val-w').exists()).toBe(true)
    expect(w.find('.stat-val.val-l').exists()).toBe(true)
  })

  it('阵容总标题挂 squad-title（主色下划线由 CSS 变量承接）', async () => {
    const w = await setup(makeTeam(), [makePlayer()])
    await w.find('[data-tab="squad"]').trigger('click')
    expect(w.find('.squad-title').exists()).toBe(true)
  })

  it('位置分组小标题吃到 --accent（CSS 变量自 section 级联）', async () => {
    const w = await setup(makeTeam(), [makePlayer()])
    await w.find('[data-tab="squad"]').trigger('click')
    const h3 = w.find('h3')
    expect(h3.exists()).toBe(true)
    expect(h3.attributes('style') ?? '').toContain('var(--accent')
  })
})

describe('球队阵容·国旗', () => {
  it('阵容球员有国籍时名字前渲染国旗', async () => {
    const w = await setup(makeTeam(), [makePlayer({ citizenship: 'England', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/eng.png' })])
    await w.find('[data-tab="squad"]').trigger('click')
    const img = w.find('img[src*="eng.png"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('title')).toBe('England')
    expect(img.attributes('width')).toBe('16')
  })
})

describe('球队详情页·赛程页签', () => {
  it('默认停在赛程页签，赛程空态可见', async () => {
    const w = await setup(makeTeam())
    expect(w.text()).toContain('No matches this season')
  })

  it('点击阵容页签切到阵容，赛程区隐藏', async () => {
    const w = await setup(makeTeam(), [makePlayer()])
    await w.find('[data-tab="squad"]').trigger('click')
    expect(w.find('.squad-title').exists()).toBe(true)
    expect(w.text()).not.toContain('No matches this season')
  })
})
