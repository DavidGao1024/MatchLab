import { describe, it, expect } from 'vitest'
import { generateICal } from '../../src/utils/iCal'
import type { Match } from '../../src/types/models'

const team = { name: 'Arsenal', slug: 'arsenal' }
const matches: Match[] = [
  {
    eventId: '1',
    date: '2025-08-16T14:00:00Z',
    status: 'pre',
    completed: false,
    venue: 'Emirates Stadium',
    home: { id: 359, name: 'Arsenal', abbreviation: 'ARS', logo: '', score: null, winner: null },
    away: { id: 25, name: 'Liverpool', abbreviation: 'LIV', logo: '', score: null, winner: null },
  },
]

describe('generateICal', () => {
  it('输出含 VCALENDAR 头尾', () => {
    const out = generateICal(team, matches)
    expect(out).toContain('BEGIN:VCALENDAR')
    expect(out).toContain('END:VCALENDAR')
    expect(out).toContain('VERSION:2.0')
    expect(out).toContain('PRODID:-//MatchLab//Personalization MVP//CN')
  })
  it('每场一个 VEVENT', () => {
    const out = generateICal(team, matches)
    expect(out).toContain('BEGIN:VEVENT')
    expect(out).toContain('END:VEVENT')
    expect(out).toContain('SUMMARY:Arsenal vs Liverpool')
  })
  it('DTSTART 用 UTC ISO 时间（含 Z 后缀）', () => {
    const out = generateICal(team, matches)
    expect(out).toContain('DTSTART:20250816T140000Z')
  })
  it('UID 唯一稳定', () => {
    const out1 = generateICal(team, matches)
    const out2 = generateICal(team, matches)
    const uid1 = out1.match(/UID:([^\r\n]+)/)?.[1]
    const uid2 = out2.match(/UID:([^\r\n]+)/)?.[1]
    expect(uid1).toBe(uid2)
  })
  it('空 matches 仍生成 VCALENDAR 头尾', () => {
    const out = generateICal(team, [])
    expect(out).toContain('BEGIN:VCALENDAR')
    expect(out.match(/BEGIN:VEVENT/g)).toBeNull()
  })
})
