// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ExportCalendarButton from '../../src/components/teams/ExportCalendarButton.vue'
import { clearScoreCache, clearInjuryCache } from '../../src/composables/useEspanFetch'
import { __resetToast } from '../../src/composables/useToast'
import { __resetConfirm } from '../../src/composables/useConfirm'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  mockFetch.mockReset()
  __resetToast()
  __resetConfirm()
  clearScoreCache()
  clearInjuryCache()
  vi.useFakeTimers()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
  vi.spyOn(URL, 'revokeObjectURL')
  HTMLAnchorElement.prototype.click = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ExportCalendarButton', () => {
  it('点击导出完成态复位并生成 blob', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
    const w = mount(ExportCalendarButton, {
      props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025 },
    })
    expect(w.text()).toContain('导出赛程到日历')
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('导出赛程到日历')
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
  it('fetch 失败 → loading 复位 + 不生成 blob', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    const w = mount(ExportCalendarButton, {
      props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025 },
    })
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('导出赛程到日历')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('英文模式：按钮文案英文', async () => {
    localStorage.setItem('matchlab:lang', 'en')
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
    const w = mount(ExportCalendarButton, {
      props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025 },
    })
    expect(w.text()).toContain('Export to Calendar')
    expect(w.text()).not.toContain('导出赛程到日历')
  })
  it('store.readOnly → 按钮 disabled（隐私模式）', async () => {
    const { useUserDataStore } = await import('../../src/stores/userData')
    const store = useUserDataStore()
    await store.init()
    store.readOnly = true
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
    const w = mount(ExportCalendarButton, {
      props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025 },
    })
    expect(w.find('button').attributes('disabled')).toBeDefined()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('compact 变体：短文案日历 + 导出逻辑不变', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) })
    const w = mount(ExportCalendarButton, {
      props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025, compact: true },
    })
    expect(w.text()).toContain('日历')
    expect(w.text()).not.toContain('导出赛程到日历')
    await w.find('button').trigger('click')
    await flushPromises()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
  it('compact 变体英文模式：iCal', async () => {
    localStorage.setItem('matchlab:lang', 'en')
    const w = mount(ExportCalendarButton, {
      props: { league: 'eng.1', teamId: 359, teamName: 'Arsenal', teamSlug: 'arsenal', seasonStart: 2025, compact: true },
    })
    expect(w.text()).toContain('iCal')
    expect(w.text()).not.toContain('日历')
  })
})
