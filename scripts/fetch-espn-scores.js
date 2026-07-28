/**
 * ESPN site.api 赛程/比分抓取 + 本地计算积分榜（零依赖）
 *
 * 数据源：https://site.api.espn.com（浏览器 CORS 已验证；实时比分由前端直连，
 *        本脚本产出「按月归档的静态赛程」+ 从比分本地计算的积分榜）
 *
 * 输出：
 *   public/data/{league}/matches/{YYYY-MM}.json   按月拆分的赛程/比分
 *   public/data/{league}/standings.json           本地从已完赛比分计算（ESPN standings 端点返回空的已知坑）
 *
 * 用法：
 *   node scripts/fetch-espn-scores.js                # 全 5 联赛（月窗口 2025-07 → 2026-06）
 *   node scripts/fetch-espn-scores.js eng.1 esp.1    # 指定联赛
 *   SEASON_START=2026 node scripts/fetch-espn-scores.js  # 下赛季窗口（2026-07 → 2027-06）
 *
 * 积分榜排序：积分 → 净胜球 → 进球数 → 队名（联赛通用规则，未含同分加赛特例）
 */
'use strict';

const path = require('path');
const { sleep, fetchJson, writeJsonIfChanged } = require('./lib/http');
const { SEASON, LEAGUES, site } = require('./lib/espn-endpoints');

const DATA_ROOT = path.join(__dirname, '..', 'public', 'data');
const DELAY_MS = 200;

const requested = process.argv.slice(2);
const targets = requested.length ? LEAGUES.filter((l) => requested.includes(l.slug)) : LEAGUES;
if (requested.length && targets.length !== requested.length) {
  console.error(`[scores] 未知联赛 slug: ${requested.filter((s) => !targets.find((t) => t.slug === s)).join(', ')}`);
  process.exit(1);
}

/** 某月的日期窗口：YYYYMM01-YYYYMMDD（末日按真实日历算） */
function monthRange(year, month) {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { key: `${year}-${mm}`, dates: `${year}${mm}01-${year}${mm}${String(lastDay).padStart(2, '0')}` };
}

/** 赛季月窗口：欧洲制 startYear 年 7 月 → 次年 6 月 */
function seasonMonthsEuropean(startYear) {
  const months = [];
  for (let m = 7; m <= 12; m += 1) months.push(monthRange(startYear, m));
  for (let m = 1; m <= 6; m += 1) months.push(monthRange(startYear + 1, m));
  return months;
}

/** 赛季月窗口：自然年制 1 月 → 12 月 */
function seasonMonthsCalendar(year) {
  const months = [];
  for (let m = 1; m <= 12; m += 1) months.push(monthRange(year, m));
  return months;
}

function seasonMonthsFor(league) {
  const year = Number(process.env.SEASON_START || league.season || SEASON);
  return league.seasonType === 'calendar' ? seasonMonthsCalendar(year) : seasonMonthsEuropean(year);
}

function mapCompetitor(c) {
  if (!c) return null;
  return {
    id: Number(c.id),
    name: c.team ? c.team.displayName : null,
    abbreviation: c.team ? c.team.abbreviation : null,
    logo: c.team ? c.team.logo : null,
    score: c.score != null ? Number(c.score) : null,
    winner: c.winner === true || c.winner === 'true' ? true : null,
  };
}

function mapEvent(ev) {
  const comp = (ev.competitions || [])[0] || {};
  const competitors = comp.competitors || [];
  const home = competitors.find((c) => c.homeAway === 'home') || competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') || competitors[1];
  const type = (ev.status && ev.status.type) || {};
  return {
    eventId: String(ev.id),
    date: ev.date,
    name: ev.name,
    status: type.state || null, // 'pre' | 'in' | 'post'
    completed: type.completed === true,
    clock: ev.status ? ev.status.displayClock : null,
    period: ev.status ? ev.status.period : null,
    venue: (comp.venue && comp.venue.fullName) || (ev.venue && ev.venue.fullName) || null,
    home: mapCompetitor(home),
    away: mapCompetitor(away),
  };
}

/** 从已完赛比分本地计算积分榜（沿用世界杯项目 computeStandings 模式） */
function computeStandings(matches, deductions = {}) {
  const byTeam = new Map();
  const get = (id, name) => {
    if (!byTeam.has(id)) {
      byTeam.set(id, { teamId: id, team: name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 });
    }
    return byTeam.get(id);
  };

  for (const m of matches) {
    if (!m.completed || !m.home || !m.away || m.home.score == null || m.away.score == null) continue;
    const h = get(m.home.id, m.home.name);
    const a = get(m.away.id, m.away.name);
    h.played += 1;
    a.played += 1;
    h.goalsFor += m.home.score;
    h.goalsAgainst += m.away.score;
    a.goalsFor += m.away.score;
    a.goalsAgainst += m.home.score;
    if (m.home.score > m.away.score) {
      h.won += 1;
      a.lost += 1;
    } else if (m.home.score < m.away.score) {
      a.won += 1;
      h.lost += 1;
    } else {
      h.drawn += 1;
      a.drawn += 1;
    }
  }

  const rows = [...byTeam.values()].map((r) => {
    const deduction = deductions[r.teamId] || 0;
    return {
      ...r,
      goalDiff: r.goalsFor - r.goalsAgainst,
      points: r.won * 3 + r.drawn - deduction,
      deduction: deduction || undefined,
    };
  });
  rows.sort(
    (x, y) =>
      y.points - x.points ||
      y.goalDiff - x.goalDiff ||
      y.goalsFor - x.goalsFor ||
      String(x.team).localeCompare(String(y.team))
  );
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

async function processLeague(league) {
  const leagueSeason = league.season || SEASON;
  const months = seasonMonthsFor(league);
  const rangeLabel = league.seasonType === 'calendar'
    ? `${leagueSeason}-01 → ${leagueSeason}-12`
    : `${leagueSeason}-07 → ${Number(leagueSeason) + 1}-06`;
  console.log(`\n===== [${league.slug}] ${league.name} 赛程（${rangeLabel}） =====`);
  const leagueDir = path.join(DATA_ROOT, league.slug);
  const allMatches = [];

  for (const { key, dates } of months) {
    await sleep(DELAY_MS);
    try {
      const resp = await fetchJson(site.scoreboard(league.slug, dates, 200));
      const events = resp.events || [];
      if (events.length === 0) {
        console.log(`  · ${key}: 无比赛`);
        continue;
      }
      const matches = events.map(mapEvent);
      allMatches.push(...matches);
      const changed = writeJsonIfChanged(path.join(leagueDir, 'matches', `${key}.json`), {
        source: 'site.api.espn.com',
        updateTime: new Date().toISOString(),
        league: league.slug,
        month: key,
        count: matches.length,
        matches,
      });
      const done = matches.filter((m) => m.completed).length;
      console.log(`  · ${key}: ${matches.length} 场（已完赛 ${done}）${changed ? '' : ' 无变化'}`);
    } catch (e) {
      console.warn(`  ! ${key} 抓取失败: ${e.message}`);
    }
  }

  const standings = computeStandings(allMatches, league.pointDeductions || {});
  writeJsonIfChanged(path.join(leagueDir, 'standings.json'), {
    source: '本地从 ESPN site.api 比分计算（computeStandings）',
    updateTime: new Date().toISOString(),
    league: league.slug,
    season: leagueSeason,
    matchesCounted: allMatches.filter((m) => m.completed).length,
    count: standings.length,
    standings,
  });
  const top = standings[0];
  console.log(`  · standings: ${standings.length} 队${top ? `，榜首 ${top.team} ${top.points} 分` : ''}`);
}

async function main() {
  console.log(`[scores] 联赛: ${targets.map((t) => t.slug).join(', ')}`);
  for (const league of targets) {
    await processLeague(league);
  }
  console.log('\n[scores] 完成');
}

main().catch((e) => {
  console.error(`[scores] 致命错误: ${e.stack || e.message}`);
  process.exit(1);
});
