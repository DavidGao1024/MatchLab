// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TeamLogo from '../../src/components/common/TeamLogo.vue'
import type { Team } from '../../src/types/models'

function makeTeam(over: Partial<Team> = {}): Team {
  return {
    id: 367, name: 'Tottenham Hotspur', displayName: 'Tottenham', shortDisplayName: 'Spurs', abbreviation: 'TOT',
    color: '#FFFFFF', alternateColor: '#132257', logo: 'logos/367.png', logoDark: 'logos/367-dark.png',
    venue: { name: 'X', city: 'Y', country: 'Z' }, record: null,
    ...over,
  }
}

beforeEach(() => setActivePinia(createPinia()))

/** 让 img 连续两次 error，落到兜底圆牌 span */
async function toBadge(w: ReturnType<typeof mount>) {
  await w.find('img').trigger('error')
  await w.find('img').trigger('error')
  return w.find('span')
}

describe('TeamLogo 兜底圆牌', () => {
  it('白主色队用深字（白底白字看不清）', async () => {
    const w = mount(TeamLogo, { props: { team: makeTeam({ color: '#FFFFFF' }) } })
    const span = await toBadge(w)
    expect(span.classes()).toContain('text-slate-900')
    expect(span.classes()).not.toContain('text-white')
  })

  it('深主色队用白字', async () => {
    const w = mount(TeamLogo, { props: { team: makeTeam({ color: '#EF0107' }) } })
    const span = await toBadge(w)
    expect(span.classes()).toContain('text-white')
    expect(span.classes()).not.toContain('text-slate-900')
  })
})