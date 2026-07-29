import { describe, expect, it } from 'vitest'
import { normalizeSummary } from '../../src/composables/useEspanFetch'
import type { EspnSummary } from '../../src/types/espn-site'
import type { EspnKeyEvent, EspnRoster, EspnRosterPlayer } from '../../src/types/espn-site'

const HOME_ID = 364
const AWAY_ID = 349

function makeRoster(teamId: number, formation: string): EspnRoster {
  const gk: EspnRosterPlayer = {
    jersey: '1', starter: true,
    athlete: { id: '1', displayName: 'Alisson', lastName: 'Alisson', shortName: 'Alisson' },
    position: { abbreviation: 'GK' },
  }
  // 简化：3-5-2 → 3 后卫 + 5 中场 + 2 前锋
  const defs = Array.from({ length: 3 }, (_, i) => ({
    jersey: String(2 + i), starter: true,
    athlete: { id: String(100 + i), displayName: `Def${i}`, shortName: `Def${i}` },
    position: { abbreviation: 'D' },
  }))
  const mids = Array.from({ length: 5 }, (_, i) => ({
    jersey: String(10 + i), starter: true,
    athlete: { id: String(200 + i), displayName: `Mid${i}`, shortName: `Mid${i}` },
    position: { abbreviation: 'M' },
  }))
  const fwds = Array.from({ length: 2 }, (_, i) => ({
    jersey: String(20 + i), starter: true,
    athlete: { id: String(300 + i), displayName: `Fwd${i}`, shortName: `Fwd${i}` },
    position: { abbreviation: 'F' },
  }))
  const bench: EspnRosterPlayer = {
    jersey: '30', starter: false,
    athlete: { id: '999', displayName: 'Sub Player', shortName: 'Sub' },
    position: { abbreviation: 'M' },
  }
  return {
    formation,
    team: { id: String(teamId), displayName: teamId === HOME_ID ? 'Liverpool' : 'Bournemouth', abbreviation: 'LIV' },
    roster: [gk, ...defs, ...mids, ...fwds, bench],
    coach: { displayName: 'Arne Slot' },
  }
}

describe('normalizeSummary — 阵容', () => {
  it('3-5-2 阵型分层：GK + 3D + 5M + 2F，替补单列', () => {
    const s: EspnSummary = { rosters: [makeRoster(HOME_ID, '3-5-2')] }
    const out = normalizeSummary(s, HOME_ID, AWAY_ID)
    const home = out.lineups.home!
    expect(home).not.toBeNull()
    expect(home.formation).toBe('3-5-2')
    expect(home.starters).toHaveLength(11)
    // GK y=88（最底部）
    const gk = home.starters.find((p) => p.position === 'GK')
    expect(gk?.y).toBe(88)
    // 后卫线 3 人，y=74
    const defs = home.starters.filter((p) => p.position === 'D')
    expect(defs).toHaveLength(3)
    expect(defs.every((d) => d.y === 74)).toBe(true)
    // 中场 5 人（单排），y=46
    const mids = home.starters.filter((p) => p.position === 'M')
    expect(mids).toHaveLength(5)
    expect(mids.every((m) => m.y === 46)).toBe(true)
    // 前锋线 2 人，y=16
    const fwds = home.starters.filter((p) => p.position === 'F')
    expect(fwds).toHaveLength(2)
    expect(fwds.every((f) => f.y === 16)).toBe(true)
    // 替补不在 starters 里
    expect(home.bench).toHaveLength(1)
    expect(home.bench[0].shortName).toBe('Sub')
  })

  it('4-2-3-1 阵型：GK + 4D + 2+3 两排中场 + 1F', () => {
    const s: EspnSummary = { rosters: [makeRoster(HOME_ID, '4-2-3-1')] }
    const out = normalizeSummary(s, HOME_ID, AWAY_ID)
    const home = out.lineups.home!
    // 3+5+2+1=11（makeRoster 固定 D3 M5 F2，4-2-3-1 期望 4D 但实际只 3D，slice 容错）
    expect(home.starters).toHaveLength(11)
    // 中场多排：5 人按 midDepthRank 排序后分到 2 + 3 两排
    const mids = home.starters.filter((p) => p.position === 'M')
    expect(mids).toHaveLength(5)
    // 两排 y 不同（58 防守 + 34 进攻）
    const ySet = new Set(mids.map((m) => m.y))
    expect(ySet.size).toBe(2)
    expect(ySet.has(58)).toBe(true)
    expect(ySet.has(34)).toBe(true)
  })
})

describe('normalizeSummary — 事件', () => {
  it('普通进球：participants[0]=射手，participants[1]=助攻者，比分从 text 解析', () => {
    const ev: EspnKeyEvent = {
      id: 'ev1', type: 'goal',
      clock: { displayValue: "23'" },
      team: { id: String(HOME_ID) },
      text: 'Goal! Liverpool 1, Bournemouth 0. Mohamed Salah right footed shot. Assisted by Alexis Mac Allister.',
      participants: [
        { athlete: { id: '1', displayName: 'Mohamed Salah' } },
        { athlete: { id: '2', displayName: 'Alexis Mac Allister' } },
      ],
    }
    const s: EspnSummary = { keyEvents: [ev] }
    const out = normalizeSummary(s, HOME_ID, AWAY_ID)
    expect(out.events).toHaveLength(1)
    expect(out.events[0].type).toBe('goal')
    expect(out.events[0].side).toBe('home')
    expect(out.events[0].minute).toBe(23)
    expect(out.events[0].primaryName).toBe('Mohamed Salah')
    expect(out.events[0].secondaryName).toBe('Alexis Mac Allister')
    expect(out.events[0].scoreSnapshot).toBe('1-0')
  })

  it('乌龙球：text 含 Own Goal → type=ownGoal，按 team.id 归到得分方', () => {
    const ev: EspnKeyEvent = {
      id: 'ev2', type: 'goal',
      clock: { displayValue: "55'" },
      team: { id: String(AWAY_ID) },
      text: 'Own Goal by Virgil van Dijk.',
    }
    const s: EspnSummary = { keyEvents: [ev] }
    const out = normalizeSummary(s, HOME_ID, AWAY_ID)
    expect(out.events[0].type).toBe('ownGoal')
    expect(out.events[0].side).toBe('away')
  })

  it('第二黄：text 含 Second Yellow → secondYellow', () => {
    const ev: EspnKeyEvent = {
      id: 'ev3', type: 'yellow-card',
      clock: { displayValue: "78'" },
      team: { id: String(AWAY_ID) },
      text: 'Second Yellow Card against John Stones.',
      participants: [{ athlete: { id: '3', displayName: 'John Stones' } }],
    }
    const out = normalizeSummary({ keyEvents: [ev] }, HOME_ID, AWAY_ID)
    expect(out.events[0].type).toBe('secondYellow')
    expect(out.events[0].primaryName).toBe('John Stones')
  })

  it('换人：participants[0]=入局、[1]=出局 → primaryName=出局、secondaryName=入局', () => {
    const ev: EspnKeyEvent = {
      id: 'ev4', type: 'substitution',
      clock: { displayValue: "67'" },
      team: { id: String(HOME_ID) },
      text: 'Substitution, Liverpool. Cody Gakpo replaces Darwin Nunez.',
      participants: [
        { athlete: { id: '10', displayName: 'Cody Gakpo' } }, // 入局
        { athlete: { id: '20', displayName: 'Darwin Nunez' } }, // 出局
      ],
    }
    const out = normalizeSummary({ keyEvents: [ev] }, HOME_ID, AWAY_ID)
    expect(out.events[0].type).toBe('substitution')
    expect(out.events[0].primaryName).toBe('Darwin Nunez') // 出局
    expect(out.events[0].secondaryName).toBe('Cody Gakpo') // 入局
  })

  it('点球命中：text 含 Penalty 但不含 Miss → penalty', () => {
    const ev: EspnKeyEvent = {
      id: 'ev5', type: 'goal',
      clock: { displayValue: "12'" },
      team: { id: String(HOME_ID) },
      text: 'Penalty Kick Goal by Mohamed Salah.',
      participants: [{ athlete: { id: '1', displayName: 'Mohamed Salah' } }],
    }
    const out = normalizeSummary({ keyEvents: [ev] }, HOME_ID, AWAY_ID)
    expect(out.events[0].type).toBe('penalty')
  })

  it('事件按分钟升序', () => {
    const events: EspnKeyEvent[] = [
      { id: 'a', type: 'goal', clock: { displayValue: "78'" }, team: { id: String(HOME_ID) }, text: 'Goal! 1, 0' },
      { id: 'b', type: 'goal', clock: { displayValue: "23'" }, team: { id: String(AWAY_ID) }, text: 'Goal! 0, 1' },
      { id: 'c', type: 'yellow-card', clock: { displayValue: "45'" }, team: { id: String(HOME_ID) }, text: 'Yellow.' },
    ]
    const out = normalizeSummary({ keyEvents: events }, HOME_ID, AWAY_ID)
    expect(out.events.map((e) => e.minute)).toEqual([23, 45, 78])
  })

  it('kickoff/halftime 等噪声事件跳过', () => {
    const events: EspnKeyEvent[] = [
      { id: 'k1', type: 'kickoff', clock: { displayValue: "" }, text: 'Kickoff' },
      { id: 'h1', type: 'halftime', clock: { displayValue: "45'+4'" }, text: 'First Half ends.' },
      { id: 's2', type: 'start-2nd-half', clock: { displayValue: "45'" }, text: 'Second Half begins.' },
      { id: 'g1', type: 'goal', clock: { displayValue: "23'" }, team: { id: String(HOME_ID) }, text: 'Goal! 1, 0', participants: [{ athlete: { id: '1', displayName: 'Salah' } }] },
    ]
    const out = normalizeSummary({ keyEvents: events }, HOME_ID, AWAY_ID)
    expect(out.events).toHaveLength(1)
    expect(out.events[0].type).toBe('goal')
  })
})

describe('normalizeSummary — H2H', () => {
  it('headToHeadGames 归一化为 H2HEntry', () => {
    const s: EspnSummary = {
      headToHeadGames: [
        {
          date: '2025-04-01',
          competitions: [{
            venue: { fullName: 'Anfield' },
            competitors: [
              { homeAway: 'home', id: '364', score: '2', winner: true, team: { id: '364', displayName: 'Liverpool', abbreviation: 'LIV' } },
              { homeAway: 'away', id: '349', score: '0', winner: false, team: { id: '349', displayName: 'AFC Bournemouth', abbreviation: 'BOU' } },
            ],
          }],
        },
      ],
    }
    const out = normalizeSummary(s, HOME_ID, AWAY_ID)
    expect(out.h2h).toHaveLength(1)
    expect(out.h2h[0].homeName).toBe('Liverpool')
    expect(out.h2h[0].homeScore).toBe(2)
    expect(out.h2h[0].awayScore).toBe(0)
    expect(out.h2h[0].venue).toBe('Anfield')
  })
})
