/**
 * ESPN core API 全量抓取（零依赖，仅 Node 内置模块）
 *
 * 数据源：https://sports.core.api.espn.com（端点清单见 lib/espn-endpoints.js 与
 *        docs/data-site-mvp-plan.md 2026-07-21 调研记录，均已验证）
 *
 * 输出（git 跟踪，Vite 自动复制到 dist）：
 *   public/data/leagues.json                       联赛列表
 *   public/data/{league}/meta.json                 联赛元数据
 *   public/data/{league}/teams.json                20/18 队（含颜色/队徽/场馆/本季战绩）
 *   public/data/{league}/players/{id}.json         单球员档案 + 单赛季 70+ 字段统计
 *   public/data/{league}/players/index.json        球员索引（搜索用，轻量）
 *   public/data/{league}/leaders.json              12 项排行榜
 *
 * 用法：
 *   node scripts/fetch-espn-core.js                 # 全 5 联赛（~6500 请求，约 30 分钟）
 *   node scripts/fetch-espn-core.js eng.1 esp.1     # 指定联赛
 *   PLAYERS_LIMIT=10 node scripts/fetch-espn-core.js eng.1   # 冒烟测试（每联赛只抓 10 名球员）
 *
 * 关键约定：
 *   - 请求间隔 ≥200ms（REQUEST_DELAY_MS），5xx/429/网络错误自动重试
 *   - 球员统计用「单赛季」端点（seasons/{year}/types/1/ 前缀），生涯累计端点别混用
 *   - 数据无变化不写盘（writeJsonIfChanged）→ 工作流层 git diff 为空 → 不 commit
 *   - ESPN standings 端点返回空 → 积分榜由 fetch-espn-scores.js 本地计算，本脚本不产出 standings.json
 */
'use strict';

const fs = require('fs')
const path = require('path');
const { sleep, fetchJson, writeJsonIfChanged } = require('./lib/http');
const { SEASON, LEAGUES, core, TEAM_OVERRIDES, resolveSeasonsInPlace } = require('./lib/espn-endpoints');
const { resolveFill } = require('./lib/nationality-fill');
const { COUNTRY_MAP } = require('./lib/country-map');
const { localFlagPath } = require('./lib/flag-map');

const DATA_ROOT = path.join(__dirname, '..', 'public', 'data');

let NAT_MAP = {};
try {
  NAT_MAP = JSON.parse(fs.readFileSync(path.join(DATA_ROOT, 'mappings', 'players-nationality.json'), 'utf8')).players || {};
} catch { /* 无映射文件不补底 */ }
const REQUEST_DELAY_MS = 200;
const PAGE_SIZE = 50; // ESPN core 支持的上限附近；调研用的 limit=5 需 130 页，50 只需 ~13 页
const PLAYERS_LIMIT = process.env.PLAYERS_LIMIT ? Number(process.env.PLAYERS_LIMIT) : Infinity;

const requested = process.argv.slice(2);
const targets = requested.length
  ? LEAGUES.filter((l) => requested.includes(l.slug))
  : LEAGUES;
if (requested.length && targets.length !== requested.length) {
  console.error(`[espn-core] 未知联赛 slug: ${requested.filter((s) => !targets.find((t) => t.slug === s)).join(', ')}`);
  console.error(`[espn-core] 可选: ${LEAGUES.map((l) => l.slug).join(', ')}`);
  process.exit(1);
}

let totalRequests = 0;
async function getJson(url) {
  totalRequests += 1;
  await sleep(REQUEST_DELAY_MS);
  return fetchJson(url);
}

/** ESPN core 列表响应：{ count, items: [{$ref}], pageCount... } → 收集全部 $ref */
async function collectList(firstUrl) {
  const first = await getJson(firstUrl);
  const count = first.count ?? (first.items || []).length;
  const items = [...(first.items || [])];
  const pageCount = first.pageCount ?? 1;
  const base = firstUrl.replace(/([?&])page=\d+/, '$1page=');
  for (let page = 2; page <= pageCount; page += 1) {
    const sep = base.includes('?') ? '&' : '?';
    const url = base.endsWith('page=') ? `${base}${page}` : `${base}${sep}page=${page}`;
    const resp = await getJson(url);
    items.push(...(resp.items || []));
  }
  return { count, items };
}

const idFromRef = (ref) => {
  if (!ref) return null;
  const m = String(ref).match(/\/(\d+)(?:\?|$)/);
  return m ? Number(m[1]) : null;
};

// ========== 1. meta.json ==========

async function fetchMeta(league) {
  const season = league.season || SEASON;
  const raw = await getJson(core.league(league.slug));
  return {
    source: 'sports.core.api.espn.com',
    updateTime: new Date().toISOString(),
    league: league.slug,
    id: raw.id,
    uid: raw.uid,
    name: raw.name,
    displayName: raw.displayName,
    abbreviation: raw.abbreviation,
    shortName: raw.shortName,
    slug: raw.slug ?? league.slug,
    color: league.color,
    nameZh: league.nameZh,
    country: raw.country ? { name: raw.country.name, flag: raw.country.flag && raw.country.flag.href } : { name: league.country },
    season: raw.season ? { year: raw.season.year, startDate: raw.season.startDate, endDate: raw.season.endDate, displayName: raw.season.displayName } : { year: Number(season) },
  };
}

// ========== 2. teams.json（含 record 战绩） ==========

const RECORD_KEYS = {
  wins: ['wins'],
  draws: ['draws', 'ties'],
  losses: ['losses', 'loses'],
  played: ['gamesPlayed', 'played'],
  points: ['points'],
  goalDiff: ['pointDifferential', 'goalDifferential', 'goalDiff'],
  goalsFor: ['scored', 'pointsFor', 'goalsFor'],
  goalsAgainst: ['conceded', 'pointsAgainst', 'goalsAgainst'],
};

/**
 * record 端点实测结构（2026-07-24 验证）：
 *   { items: [ { name: 'overall', summary: '26-7-5', stats: [{name, value}, ...] }, ... ] }
 * 取 overall 条目，stats 数组转扁平对象
 */
function parseRecord(raw) {
  const rec = Array.isArray(raw && raw.items)
    ? raw.items.find((i) => i.name === 'overall' || i.type === 'total') || raw.items[0]
    : raw;
  if (!rec || !Array.isArray(rec.stats)) return null;
  const byName = {};
  for (const s of rec.stats) if (s && s.name != null) byName[s.name] = s.value;
  const pick = (candidates) => {
    for (const c of candidates) if (byName[c] != null) return Number(byName[c]) ?? null;
    return null;
  };
  const out = {};
  for (const [k, candidates] of Object.entries(RECORD_KEYS)) out[k] = pick(candidates);
  out.summary = rec.summary || null; // "W-D-L" 格式
  return out;
}

function mapTeamDetail(raw) {
  const logos = raw.logos || [];
  const logo = logos.find((l) => !(l.rel || []).includes('dark')) || logos[0];
  const logoDark = logos.find((l) => (l.rel || []).includes('dark'));
  return {
    id: Number(raw.id),
    uid: raw.uid,
    location: raw.location,
    name: raw.name,
    nickname: raw.nickname,
    displayName: raw.displayName,
    shortDisplayName: raw.shortDisplayName,
    abbreviation: raw.abbreviation,
    color: raw.color ? `#${raw.color}` : null,
    alternateColor: raw.alternateColor ? `#${raw.alternateColor}` : null,
    logo: logo ? logo.href : null,
    logoDark: logoDark ? logoDark.href : null,
    venue: raw.venue
      ? { name: raw.venue.fullName, city: raw.venue.address && raw.venue.address.city, country: raw.venue.address && raw.venue.address.country }
      : null,
    isActive: raw.isActive,
  };
}

async function fetchTeams(league) {
  const season = league.season || SEASON;
  const { items } = await collectList(core.teams(league.slug, season));
  const teams = [];
  const rosterMap = new Map(); // athleteId → teamId（花名册端点建立归属）

  for (const item of items) {
    const id = idFromRef(item.$ref);
    if (!id) continue;
    const detail = await getJson(core.team(league.slug, id, season));
    const team = mapTeamDetail(detail);

    // 应用队级覆盖（ESPN 缺失/过时的 logo 和颜色）
    const ov = TEAM_OVERRIDES[id];
    if (ov) {
      if (ov.color) team.color = ov.color;
      if (ov.alternateColor) team.alternateColor = ov.alternateColor;
      if (ov.logo) {
        const localFile = path.join(__dirname, '..', 'public', ov.logo);
        if (require('fs').existsSync(localFile)) {
          team.logo = ov.logo;
          team.logoDark = null;
        }
      }
    }

    try {
      team.record = parseRecord(await getJson(core.teamRecord(league.slug, id, season)));
    } catch (e) {
      console.warn(`  ! [${league.slug}] team ${id} record 失败: ${e.message}`);
      team.record = null;
    }

    try {
      // 加 ?limit=100 避免默认 pageSize 25 漏球员（Man City 34 人会被截到 25）
      const roster = await getJson(`${core.team(league.slug, id, season)}/athletes?limit=100`);
      for (const a of roster.items || []) {
        const aid = idFromRef(a.$ref);
        if (aid) rosterMap.set(aid, id);
      }
    } catch (e) {
      console.warn(`  ! [${league.slug}] team ${id} 花名册失败: ${e.message}`);
    }

    teams.push(team);
    console.log(`  · [${league.slug}] 球队 ${team.displayName} (${teams.length}/${items.length})`);
  }

  teams.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { teams, rosterMap };
}

// ========== 3. players（档案 + 单赛季统计） ==========

const POSITION_MAP = [
  [/^goalkeeper/i, 'G'],
  [/^defen[cs]e|defender|back/i, 'D'],
  [/^midfield/i, 'M'],
  [/^forward|striker|attack/i, 'F'],
];

function normalizePosition(label) {
  if (!label) return null;
  for (const [re, code] of POSITION_MAP) if (re.test(label)) return code;
  return null;
}

/**
 * 单赛季统计响应实测结构（2026-07-24 验证）：
 *   { splits: { categories: [ { name: 'offensive'|'defensive'|'goalKeeping'|'general',
 *                               stats: [ { name, displayName, value, ... } ] } ] } }
 * 归一化为 blueprint §9 的扁平结构：{ offensive: { totalGoals: 27, ... }, ... }
 */
function extractSeasonStats(raw) {
  if (!raw || !raw.splits || !Array.isArray(raw.splits.categories)) return { stats: null };
  const stats = {};
  for (const cat of raw.splits.categories) {
    const flat = {};
    for (const s of cat.stats || []) if (s && s.name != null) flat[s.name] = s.value ?? null;
    stats[cat.name] = flat;
  }
  return { stats: Object.keys(stats).length ? stats : null };
}

/** ESPN 档案身高体重为英寸/磅，换算为 cm/kg（带防御：已是公制则原样） */
const toCm = (v) => (v == null ? null : v < 100 ? Math.round(v * 2.54) : v);
const toKg = (v) => (v == null ? null : v > 120 ? Math.round(v * 0.453592) : v);

/** 从 4 分类 stats 里找进球/助攻（字段位置 ESPN 未文档化，广搜） */
function pickStat(stats, names) {
  if (!stats) return null;
  for (const cat of Object.values(stats)) {
    if (!cat || typeof cat !== 'object') continue;
    for (const n of names) if (cat[n] != null) return Number(cat[n]) ?? null;
  }
  return null;
}

async function fetchPlayers(league, rosterMap) {
  const season = league.season || SEASON;
  // 数据准确性（2026-07-30 fix）：改为迭代 team roster 聚合的 rosterMap（当前赛季真名单），
  // 不再用 league-level athletes 端点（含已转会/退役的 stale 球员）。
  // rosterMap 来自 fetchTeams 阶段每队 /teams/{id}/athletes?season=X 端点聚合。
  const allIds = Array.from(rosterMap.keys());
  const wanted = Number.isFinite(PLAYERS_LIMIT) ? allIds.slice(0, PLAYERS_LIMIT) : allIds;
  console.log(`  · [${league.slug}] 球员列表 ${allIds.length} 人（团队花名册聚合，本页抓取 ${wanted.length}）`);

  const index = [];
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < wanted.length; i += 1) {
    const id = wanted[i];
    try {
      const profile = await getJson(core.athlete(league.slug, id));
      // 本季无出场的球员，统计端点返回 404 —— 视为 stats=null，不算失败
      let statsRaw = null;
      try {
        statsRaw = await getJson(core.athleteSeasonStats(league.slug, id, season));
      } catch (e) {
        if (e.statusCode !== 404) throw e;
      }
      const { stats } = extractSeasonStats(statsRaw);

      const position = normalizePosition(profile.position && (profile.position.displayName || profile.position.name)) || null;

      // 球队归属：花名册优先（权威当前赛季），档案 team/defaultTeam 兜底（极少数边缘情况）
      const teamId =
        rosterMap.get(id) ??
        idFromRef(profile.team && profile.team.$ref) ??
        idFromRef(profile.defaultTeam && profile.defaultTeam.$ref) ??
        null;

      const fill = profile.citizenship ? null : resolveFill([profile.displayName, profile.shortName], NAT_MAP, COUNTRY_MAP);
      const citizenship = profile.citizenship ?? (fill ? fill.citizenship : null);
      const doc = {
        source: 'sports.core.api.espn.com',
        updateTime: new Date().toISOString(),
        league: league.slug,
        season,
        id: Number(profile.id ?? id),
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName || profile.fullName,
        shortName: profile.shortName,
        age: profile.age ?? null,
        height: toCm(profile.height), // ESPN 原始为英寸，已换算 cm
        weight: toKg(profile.weight), // ESPN 原始为磅，已换算 kg
        dateOfBirth: profile.dateOfBirth ?? null,
        jersey: profile.jersey != null ? Number(profile.jersey) : null,
        position,
        positionLabel: (profile.position && (profile.position.displayName || profile.position.name)) || null,
        teamId,
        citizenship,
        flag: localFlagPath(citizenship),
        stats: stats || null,
      };

      const file = path.join(DATA_ROOT, league.slug, 'players', `${id}.json`);
      writeJsonIfChanged(file, doc);

      const goals = pickStat(stats, ['totalGoals', 'goals']);
      // 2026-08-06 fix：ESPN 实际字段为 offensive.goalAssists（旧名单永不命中，导致全员助攻 null）
      const assists = pickStat(stats, ['assists', 'totalAssists', 'goalAssists']);
      index.push({
        id: doc.id,
        name: doc.displayName,
        teamId: teamId != null ? Number(teamId) : null,
        position,
        age: doc.age,
        goals,
        assists,
        citizenship: doc.citizenship,
        flag: doc.flag,
      });

      ok += 1;
      if (ok % 50 === 0) console.log(`  · [${league.slug}] 球员进度 ${ok}/${wanted.length}`);
    } catch (e) {
      fail += 1;
      console.warn(`  ! [${league.slug}] 球员 ${id} 失败: ${e.message}`);
    }
  }

  index.sort((a, b) => (b.goals ?? -1) - (a.goals ?? -1) || a.name.localeCompare(b.name));
  console.log(`  · [${league.slug}] 球员完成 ${ok} 成功 / ${fail} 失败`);

  // 清理 stale 球员档案：删除不在当前 index 里的旧 .json 文件
  // （数据准确性：避免转会/退役球员的旧档案残留 + 被 leaders 直接 fetch 时回显错误 teamId）
  const playerDir = path.join(DATA_ROOT, league.slug, 'players');
  const indexIds = new Set(index.map((p) => String(p.id)));
  let removed = 0;
  if (fs.existsSync(playerDir)) {
    for (const f of fs.readdirSync(playerDir)) {
      if (!f.endsWith('.json') || f === 'index.json') continue;
      const id = f.replace(/\.json$/, '');
      if (!indexIds.has(id)) {
        try {
          fs.unlinkSync(path.join(playerDir, f));
          removed += 1;
        } catch (e) {
          console.warn(`  ! 删除 stale ${f} 失败: ${e.message}`);
        }
      }
    }
  }
  if (removed > 0) console.log(`  · [${league.slug}] 清理 stale 球员档案 ${removed} 个`);
  return index;
}

// ========== 4. leaders.json（12 项排行榜，球员名从索引解析） ==========

/** leaders 响应实测结构（2026-07-24 验证）：顶层 categories[]，每类内层 leaders[]，team/athlete 只有 $ref 无名字 */
async function fetchLeaders(league, index, teamsById) {
  const season = league.season || SEASON;
  const nameById = new Map(index.map((p) => [Number(p.id), p]));
  const raw = await getJson(core.leaders(league.slug, season));
  const categories = [];

  for (const cat of raw.categories || []) {
    const entries = [];
    for (const row of cat.leaders || cat.leaderList || []) {
      const athleteId = idFromRef(row.athlete && (row.athlete.$ref || row.athlete.href)) ?? (row.athlete && row.athlete.id) ?? null;
      const known = athleteId != null ? nameById.get(Number(athleteId)) : null;
      let athleteName =
        (row.athlete && (row.athlete.displayName || row.athlete.fullName)) ||
        (known && known.name) ||
        null;

      // 索引里没有（罕见：该球员本季无其他数据）→ 单独补拉档案
      if (!athleteName && athleteId != null) {
        try {
          const p = await getJson(core.athlete(league.slug, athleteId));
          athleteName = p.displayName || p.fullName;
        } catch (e) {
          /* 留空名，前端按 ID 展示 */
        }
      }

      const teamId = (known && known.teamId) ?? idFromRef(row.team && (row.team.$ref || row.team.href)) ?? null;
      entries.push({
        rank: entries.length + 1,
        value: row.value ?? Number(row.displayValue) ?? null,
        displayValue: row.displayValue ?? (row.value != null ? String(row.value) : null),
        athleteId: athleteId != null ? Number(athleteId) : null,
        athleteName,
        teamId: teamId != null ? Number(teamId) : null,
        teamName: (teamsById.get(Number(teamId)) || {}).displayName ?? null,
      });
    }
    categories.push({
      name: cat.name,
      displayName: cat.displayName,
      abbreviation: cat.abbreviation,
      entries,
    });
  }

  return {
    source: 'sports.core.api.espn.com',
    updateTime: new Date().toISOString(),
    league: league.slug,
    season,
    categories,
  };
}

// ========== 主流程 ==========

async function fetchSeasons(league) {
  // Phase 6: 联赛赛季清单（26 个历史赛季），用于历史赛季切换
  console.log(`  · [${league.slug}] 抓取赛季清单...`);
  const list = await getJson(core.seasons(league.slug));
  const items = list.items || [];
  const seasons = [];
  for (const item of items) {
    const ref = (item.$ref || item.href || '').replace(/^http:/, 'https:');
    if (!ref) continue;
    try {
      const s = await getJson(ref);
      if (s && s.year != null) {
        seasons.push({
          year: s.year,
          displayName: s.displayName || String(s.year),
          startDate: s.startDate || null,
          endDate: s.endDate || null,
        });
      }
    } catch (e) {
      // 单个赛季详情失败不阻塞主流程
    }
  }
  // 按年份倒序（最新在前）
  seasons.sort((a, b) => b.year - a.year);
  return seasons;
}

async function processLeague(league) {
  const season = league.season || SEASON;
  console.log(`\n===== [${league.slug}] ${league.name}（赛季 ${season}） =====`);
  const leagueDir = path.join(DATA_ROOT, league.slug);

  const meta = await fetchMeta(league);
  writeJsonIfChanged(path.join(leagueDir, 'meta.json'), meta);
  console.log(`  · meta 完成`);

  // Phase 6: 抓赛季清单（失败不阻塞主流程）
  try {
    const seasons = await fetchSeasons(league);
    writeJsonIfChanged(path.join(leagueDir, 'seasons.json'), {
      source: 'sports.core.api.espn.com',
      updateTime: new Date().toISOString(),
      league: league.slug,
      count: seasons.length,
      seasons,
    });
    console.log(`  · seasons 完成（${seasons.length} 个赛季）`);
  } catch (e) {
    console.warn(`  ! [${league.slug}] seasons 抓取失败: ${e.message}`);
  }

  const { teams, rosterMap } = await fetchTeams(league);
  const teamsById = new Map(teams.map((t) => [Number(t.id), t]));
  writeJsonIfChanged(path.join(leagueDir, 'teams.json'), {
    source: 'sports.core.api.espn.com',
    updateTime: new Date().toISOString(),
    league: league.slug,
    season,
    count: teams.length,
    teams,
  });
  console.log(`  · teams 完成（${teams.length} 队）`);

  const index = await fetchPlayers(league, rosterMap);
  // 把 teamId 换成 team 名（索引同时带 teamId 与 team 名，前端两样都要）
  const indexWithName = index.map((p) => ({ ...p, team: (teamsById.get(Number(p.teamId)) || {}).displayName ?? null }));
  writeJsonIfChanged(path.join(leagueDir, 'players', 'index.json'), {
    source: 'sports.core.api.espn.com',
    updateTime: new Date().toISOString(),
    league: league.slug,
    season,
    count: indexWithName.length,
    players: indexWithName,
  });
  console.log(`  · index 完成（${indexWithName.length} 人）`);

  const leaders = await fetchLeaders(league, indexWithName, teamsById);
  writeJsonIfChanged(path.join(leagueDir, 'leaders.json'), leaders);
  console.log(`  · leaders 完成（${leaders.categories.length} 项）`);

  return { slug: league.slug, teams: teams.length, players: indexWithName.length };
}

async function main() {
  await resolveSeasonsInPlace(LEAGUES);
  console.log(`[espn-core] 联赛: ${targets.map((t) => t.slug).join(', ')}  赛季: ${targets.map((t) => t.season || SEASON).join('/')}${Number.isFinite(PLAYERS_LIMIT) ? `  PLAYERS_LIMIT=${PLAYERS_LIMIT}` : ''}`);
  const summary = [];
  for (const league of targets) {
    try {
      summary.push(await processLeague(league));
    } catch (e) {
      console.error(`[espn-core] [${league.slug}] 致命错误: ${e.stack || e.message}`);
      summary.push({ slug: league.slug, error: e.message });
    }
  }

  // leagues.json 汇总
  const leagues = LEAGUES.map((l) => {
    const done = summary.find((s) => s.slug === l.slug);
    return {
      slug: l.slug,
      name: l.name,
      nameZh: l.nameZh,
      country: l.country,
      color: l.color,
      understatSlug: l.understatSlug,
      season: l.season || SEASON,
      seasonType: l.seasonType || 'european',
      teams: done && done.teams != null ? done.teams : l.teams,
      players: done ? done.players ?? null : null,
    };
  });
  writeJsonIfChanged(path.join(DATA_ROOT, 'leagues.json'), {
    updateTime: new Date().toISOString(),
    count: leagues.length,
    leagues,
  });

  console.log(`\n[espn-core] 全部完成，共 ${totalRequests} 次请求`);
  for (const s of summary) console.log(`  - ${s.slug}: ${s.error ? `错误 ${s.error}` : `${s.teams} 队 / ${s.players} 球员`}`);
}

main().catch((e) => {
  console.error(`[espn-core] 致命错误: ${e.stack || e.message}`);
  process.exit(1);
});
