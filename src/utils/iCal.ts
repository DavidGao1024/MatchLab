import type { Match } from '../types/models'

interface TeamInput {
  name: string
  slug: string
}

/** ISO 8601 UTC → iCal UTC datetime（2025-08-16T14:00:00Z → 20250816T140000Z） */
function fmtUTC(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** iCal 文本字段转义：逗号/分号/反斜杠需转义（RFC 5545 §3.3.11） */
function safeText(s: string): string {
  return s.replace(/\\|,|;|\n/g, (ch) => {
    if (ch === '\n') return '\\n'
    return `\\${ch}`
  })
}

export function generateICal(team: TeamInput, matches: Match[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MatchLab//Personalization MVP//CN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${safeText(team.name)} 赛程`,
  ]
  for (const m of matches) {
    const home = safeText(m.home.name)
    const away = safeText(m.away.name)
    const summary = `${home} vs ${away}`
    const uid = `matchlab-${team.slug}-${m.date}-${m.home.id}-${m.away.id}@matchlab`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmtUTC(new Date().toISOString())}`,
      `DTSTART:${fmtUTC(m.date)}`,
      `SUMMARY:${summary}`,
      m.venue ? `LOCATION:${safeText(m.venue)}` : '',
      `DESCRIPTION:${safeText(team.name)} 赛程：${home} vs ${away}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join('\r\n')
}
