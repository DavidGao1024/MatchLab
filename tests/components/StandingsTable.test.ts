// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StandingsTable from '../../src/components/standings/StandingsTable.vue'

beforeEach(() => setActivePinia(createPinia()))

describe('StandingsTable 图例', () => {
  it('欧冠显示专用图例，不显示欧联/降级', () => {
    const w = mount(StandingsTable, { props: { rows: [], league: 'uefa.champions', showXg: false } })
    expect(w.text()).toContain('前 8 直接晋级')
    expect(w.text()).toContain('9–24')
    expect(w.text()).toContain('25–36')
    expect(w.text()).not.toContain('欧联')
    expect(w.text()).not.toContain('降级')
  })
  it('英超保留原图例', () => {
    const w = mount(StandingsTable, { props: { rows: [], league: 'eng.1', showXg: false } })
    expect(w.text()).toContain('欧联')
    expect(w.text()).toContain('降级')
  })
})