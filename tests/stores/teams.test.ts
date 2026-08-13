// @vitest-environment jsdom
// 球队包 forceFresh 取最新（方案甲）：纠偏后老访客刷新即见正确颜色，不再等 24h TTL。
// 回归背景：2026-08-13 天津津门虎颜色纠偏上线后，浏览器 localStorage 里的红色 teams.json
// 要等 24h TTL 过期才换，导致"修好了但用户看不见"。forceFresh 绕过内存 + localStorage 双缓存。
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTeamsStore } from '../../src/stores/teams'
import { __resetFreshGateForTests } from '../../src/composables/useJsonFetch'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const metaFile = { season: '2025', seasonType: 'european' }
const teamsFile = (color: string) => ({
  teams: [{
    id: 8239, displayName: 'Tianjin Jinmen Tiger', shortDisplayName: 'Tianjin',
    abbreviation: 'TJJ', color, alternateColor: '#FFFFFF', logo: '', logoDark: '',
  }],
})

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  __resetFreshGateForTests()
  mockFetch.mockReset()
})

function mockTeams(color: string) {
  mockFetch.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () => (String(url).includes('meta.json') ? metaFile : teamsFile(color)),
  }))
}

describe('teams store ensure — forceFresh 取最新', () => {
  it('默认：第二次 ensure 命中内存缓存，不重新 fetch', async () => {
    mockTeams('#5B2D8B')
    const s = useTeamsStore()
    await s.ensure('chn.1')
    await s.ensure('chn.1')
    // meta + teams 各 1 次；第二次 ensure 走内存，不新增请求
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('forceFresh 绕过内存旧包：数据变色后重拉取到新色', async () => {
    mockTeams('#C60000') // 先红
    const s = useTeamsStore()
    await s.ensure('chn.1')
    expect(s.teamById('chn.1', 8239)?.color).toBe('#C60000')
    mockTeams('#5B2D8B') // 服务端纠偏为紫
    await s.ensure('chn.1', { forceFresh: true })
    expect(s.teamById('chn.1', 8239)?.color).toBe('#5B2D8B')
  })

  it('forceFresh 绕过 localStorage 24h 缓存：新页面（新 store）取到纠偏后的紫', async () => {
    // 第一次访问填进红色 localStorage 缓存
    mockTeams('#C60000')
    useTeamsStore() && (await useTeamsStore().ensure('chn.1'))
    expect(localStorage.getItem('matchlab:v1:na:data/chn.1/teams.json')).toContain('#C60000')

    // 模拟用户刷新：全新 pinia（内存空），localStorage 仍是红缓存，服务端已修紫
    setActivePinia(createPinia())
    __resetFreshGateForTests()
    mockTeams('#5B2D8B')
    const fresh = useTeamsStore()
    await fresh.ensure('chn.1', { forceFresh: true })
    expect(fresh.teamById('chn.1', 8239)?.color).toBe('#5B2D8B')
  })

  it('不带 forceFresh 时仍读 localStorage 缓存（保持 24h 省请求语义不变）', async () => {
    mockTeams('#C60000')
    await useTeamsStore().ensure('chn.1') // 填缓存
    // 新页面，无 forceFresh → 命中 localStorage 红缓存，不发新请求
    setActivePinia(createPinia())
    __resetFreshGateForTests()
    mockTeams('#5B2D8B')
    const s = useTeamsStore()
    await s.ensure('chn.1')
    expect(s.teamById('chn.1', 8239)?.color).toBe('#C60000')
  })
})
