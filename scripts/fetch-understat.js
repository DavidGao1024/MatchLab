/**
 * Understat xG 数据抓取（零依赖，Phase 1 重构版）
 *
 * 数据源：Understat 非官方 JSON 端点（免费、无 Key；CORS 实测不通，只能服务端/Actions 抓取）
 *   - GET  https://understat.com/getLeagueData/{league}/{season}
 *   - POST https://understat.com/main/getPlayersStats/
 *
 * 输出（Phase 1 起改为站内静态目录，git 跟踪）：
 *   public/data/{league-slug}/xg/standings.json   积分榜 + xG/xGA/xpts + 每队逐场历史
 *   public/data/{league-slug}/xg/players.json     全量球员 xG 统计
 *
 * 用法：
 *   node scripts/fetch-understat.js                  # 全 5 联赛（默认赛季见 lib/espn-endpoints.js）
 *   node scripts/fetch-understat.js EPL              # 单联赛（Understat slug 或 ESPN slug 均可）
 *   node scripts/fetch-understat.js EPL 2025         # 单联赛 + 指定赛季
 *
 * 已知坑（勿重复踩）：
 *   - getPlayersStats 的 position 参数不过滤 → 单次调用取全量即可
 *   - history 里的 wins/draws/loses/pts 是单场值（0/1），累计必须 reduce 求和
 *   - Understat 只覆盖五大联赛，杯赛 404
 *   - 请求间隔 1200ms（Understat 对频率敏感，比 ESPN 保守）
 */
'use strict';

const path = require('path');
const { sleep, httpRequest, writeJsonIfChanged } = require('./lib/http');
const { SEASON, LEAGUES } = require('./lib/espn-endpoints');

const BASE = 'https://understat.com';
const DELAY_MS = 1200;
const DATA_ROOT = path.join(__dirname, '..', 'public', 'data');

const argv = process.argv.slice(2);
const requested = argv[0];
const season = argv[1] || SEASON;

const targets = requested
  ? LEAGUES.filter((l) => l.understatSlug === requested || l.slug === requested)
  : LEAGUES;
if (requested && targets.length === 0) {
  console.error(`[understat] 未知联赛: ${requested}（可选 ${LEAGUES.map((l) => l.understatSlug).join(' / ')}）`);
  process.exit(1);
}

function formEncode(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v == null ? '' : v)}`)
    .join('&');
}

async function understatJson(league, method, urlPath, formData) {
  await sleep(DELAY_MS);
  const text = await httpRequest(BASE + urlPath, {
    method,
    body: formData ? formEncode(formData) : null,
    headers: {
      Referer: `${BASE}/league/${league.understatSlug}/${season}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON 解析失败 (${urlPath}): ${text.slice(0, 200)}`);
  }
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ========== 1. 联赛数据（积分榜 + 每队逐场历史） ==========

async function fetchLeagueData(league) {
  console.log(`[understat] [${league.slug}] GET /getLeagueData/${league.understatSlug}/${season}`);
  const data = await understatJson(league, 'GET', `/getLeagueData/${league.understatSlug}/${season}`);

  const teams = data.teams || {};
  const rows = [];

  for (const [teamId, team] of Object.entries(teams)) {
    const history = (team.history || []).map((h) => ({
      date: h.date,
      homeAway: h.h_a, // 'h' = 主场, 'a' = 客场
      result: h.result, // 'w'/'d'/'l'
      scored: toNum(h.scored),
      missed: toNum(h.missed),
      xG: toNum(h.xG),
      xGA: toNum(h.xGA),
      npxG: toNum(h.npxG),
      npxGA: toNum(h.npxGA),
      xpts: toNum(h.xpts),
      npxGD: toNum(h.npxGD),
      ppda: h.ppda, // 防守压力强度 {att, def}
      ppdaAllowed: h.ppda_allowed,
      deep: h.deep, // 禁区触球次数
      deepAllowed: h.deep_allowed,
      pts: toNum(h.pts),
      wins: toNum(h.wins),
      draws: toNum(h.draws),
      loses: toNum(h.loses),
    }));

    // 累计统计：每条 history 的 wins/draws/loses/pts 是单场值（1 或 0），需 sum
    const sum = (f) => history.reduce((s, m) => s + (Number(m[f]) || 0), 0);
    rows.push({
      teamId,
      team: team.title,
      summary: {
        matches: history.length,
        wins: sum('wins'),
        draws: sum('draws'),
        loses: sum('loses'),
        pts: sum('pts'),
        scored: sum('scored'),
        missed: sum('missed'),
        xG: sum('xG'),
        xGA: sum('xGA'),
        npxG: sum('npxG'),
        npxGA: sum('npxGA'),
        xpts: sum('xpts'), // 期望积分（图纸 §9 积分榜 xPts 叠加列）
        deep: sum('deep'),
        deepAllowed: sum('deepAllowed'),
      },
      history,
    });
  }

  rows.sort((a, b) => {
    if (b.summary.pts !== a.summary.pts) return b.summary.pts - a.summary.pts;
    return (b.summary.xG - b.summary.xGA) - (a.summary.xG - a.summary.xGA);
  });

  return {
    source: 'understat.com',
    league: league.slug,
    understatLeague: league.understatSlug,
    season,
    updateTime: new Date().toISOString(),
    standings: rows.map((s, i) => ({
      rank: i + 1,
      teamId: s.teamId,
      team: s.team,
      ...s.summary,
      xGD: Number((s.summary.xG - s.summary.xGA).toFixed(2)),
      npxGD: Number((s.summary.npxG - s.summary.npxGA).toFixed(2)),
    })),
    teamHistory: rows.map((s) => ({ teamId: s.teamId, team: s.team, history: s.history })),
  };
}

// ========== 2. 球员统计（position 参数无效，单次取全量） ==========

async function fetchAllPlayers(league) {
  console.log(`[understat] [${league.slug}] POST /main/getPlayersStats/`);
  const data = await understatJson(league, 'POST', '/main/getPlayersStats/', {
    league: league.understatSlug,
    season,
    position: '',
    team: '',
    mins_min: '',
    mins_max: '',
  });
  if (!data.success) {
    throw new Error(`API 返回 success=false: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return (data.players || []).map((p) => ({
    id: p.id,
    name: p.player_name,
    team: p.team_title,
    position: p.position, // 'GK' / 'D' / 'M S' / 'F S'（细位置码，阵容可视化需要）
    games: toNum(p.games),
    minutes: toNum(p.time),
    goals: toNum(p.goals),
    npg: toNum(p.npg), // 非点球进球
    assists: toNum(p.assists),
    xG: toNum(p.xG),
    xA: toNum(p.xA),
    npxG: toNum(p.npxG),
    xGChain: toNum(p.xGChain), // 球员参与的所有射门 xG 总和
    xGBuildup: toNum(p.xGBuildup), // 不含最后两传的 Chain
    shots: toNum(p.shots),
    keyPasses: toNum(p.key_passes),
    yellowCards: toNum(p.yellow_cards),
    redCards: toNum(p.red_cards),
  }));
}

// ========== 主流程 ==========

async function processLeague(league) {
  const xgDir = path.join(DATA_ROOT, league.slug, 'xg');

  const standings = await fetchLeagueData(league);
  const sChanged = writeJsonIfChanged(path.join(xgDir, 'standings.json'), standings);
  console.log(`  · [${league.slug}] xg/standings.json ${sChanged ? '已更新' : '无变化'}（${standings.standings.length} 队）`);

  const players = await fetchAllPlayers(league);
  const pChanged = writeJsonIfChanged(path.join(xgDir, 'players.json'), {
    source: 'understat.com',
    league: league.slug,
    understatLeague: league.understatSlug,
    season,
    updateTime: new Date().toISOString(),
    count: players.length,
    players,
  });
  console.log(`  · [${league.slug}] xg/players.json ${pChanged ? '已更新' : '无变化'}（${players.length} 人）`);
}

async function main() {
  console.log(`[understat] 联赛: ${targets.map((t) => t.understatSlug).join(', ')}  赛季: ${season}`);
  for (const league of targets) {
    try {
      await processLeague(league);
    } catch (e) {
      console.error(`[understat] [${league.slug}] 致命错误: ${e.stack || e.message}`);
    }
  }
  console.log('[understat] 完成');
}

main().catch((e) => {
  console.error(`[understat] 致命错误: ${e.stack || e.message}`);
  process.exit(1);
});
