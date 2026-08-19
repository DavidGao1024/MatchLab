/**
 * 一次性抓懂球帝球员身价 + 球队总身价（零依赖，仅 Node 内置模块）
 *
 * 数据源（2026-08-19 实测）：
 *   - 球员身价：球员详情页 NUXT base_info.market_value（单位「万欧」，数字字符串）
 *     e.g. 萨卡 "11000" = 1.1 亿欧，哈弗茨 "5500" = 5500 万欧
 *   - 球队总身价：球队详情页 NUXT teamInfo.marketValue（字符串 "€1410.0M"）
 *     e.g. 阿森纳 "€1410.0M" = 14.1 亿欧
 *
 * 输出（git 跟踪的存量映射，一次性抓取、不再持续抓，同 players-zh.json）：
 *   public/data/mappings/player-values.json  { players: { 英文名: 万欧整数 } }
 *   public/data/mappings/team-values.json    { teams: { 英文名: 百万欧数字 } }
 *
 * 球队枚举走 standing API 的 season_id。LEAGUE_SEASON 当前是 2025-26 值——
 * 懂球帝五大联赛数据尚未切 2026-27（2026-08-19 探查 24646→25000 未见新赛季），
 * 故 2026-27 升班马（考文垂/赫尔城/伊普斯维奇等 11 队）暂时抓不到身价。
 * 懂球帝切季后更新 LEAGUE_SEASON 重跑本脚本即可补齐升班马（幂等合并，已有优先）。
 *
 * 用法：
 *   node scripts/fetch-market-values.js            # 全量 6 联赛（~3000 球员，约 30 分钟）
 *   PLAYERS_LIMIT=5 TRIM_TEAMS=1 node scripts/fetch-market-values.js  # 冒烟：每联赛 1 队前 5 球员
 */
'use strict';

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REFERER_BASE = 'https://www.dongqiudi.com/';

const ROOT = path.resolve(__dirname, '..');
const PLAYER_OUT = path.join(ROOT, 'public/data/mappings/player-values.json');
const TEAM_OUT = path.join(ROOT, 'public/data/mappings/team-values.json');
const DELAY_MS = 200;

// 懂球帝五大联赛 + 中超 season_id（2025-26 赛季值，实测 2026-07-30，同 fetch-dqd-players.js）
const LEAGUE_SEASON = {
  eng: { name: '英超', seasonId: 24646 },
  esp: { name: '西甲', seasonId: 24651 },
  ita: { name: '意甲', seasonId: 24596 },
  ger: { name: '德甲', seasonId: 24648 },
  fra: { name: '法甲', seasonId: 24652 },
  chn: { name: '中超', seasonId: 26322 },
};

const PLAYERS_LIMIT = process.env.PLAYERS_LIMIT ? Number(process.env.PLAYERS_LIMIT) : 0;
const TRIM_TEAMS = process.env.TRIM_TEAMS ? Number(process.env.TRIM_TEAMS) : 0;

function get(url, referer = REFERER_BASE) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': referer,
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      const enc = res.headers['content-encoding'];
      let stream = res;
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

/** 从 HTML 提取 window.__NUXT__=... 并 vm 沙箱执行，取 data[0] */
function extractNuxt(html) {
  const m = html.match(/window\.__NUXT__=([\s\S]+?)<\/script>/);
  if (!m) throw new Error('NUXT not found');
  const code = m[1].replace(/;$/, '');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(`window.__NUXT__=${code}`, sandbox, { timeout: 5000 });
  return sandbox.window.__NUXT__?.data?.[0];
}

/** 拉联赛 standing，返回 [{ teamId, name }] */
async function fetchLeagueTeams(league) {
  const url = `https://www.dongqiudi.com/sport-data/soccer/biz/data/standing?season_id=${league.seasonId}&app=dqd&version=850&platform=ios&language=zh-cn`;
  const text = await get(url);
  const j = JSON.parse(text);
  const data = j.content?.rounds?.[0]?.content?.data ?? [];
  return data.map((t) => ({ teamId: String(t.team_id), name: t.team_name }));
}

/** 拉球队详情，返回 { englishName, marketValueMillion } */
async function fetchTeamValue(teamId) {
  const html = await get(`https://www.dongqiudi.com/team/${teamId}`);
  const d = extractNuxt(html);
  const ti = d?.teamInfo;
  return {
    englishName: ti?.englishName || '',
    marketValueMillion: parseMarketValue(ti?.marketValue || ''),
  };
}

/** "€1410.0M" / "€1.41B" → 百万欧数字（B 转 ×1000 统一到 M） */
function parseMarketValue(s) {
  if (!s) return null;
  const v = String(s).replace(/[€\s,]/g, '');
  if (v.endsWith('B')) { const n = parseFloat(v.slice(0, -1)); return Number.isFinite(n) ? n * 1000 : null; }
  if (v.endsWith('M')) { const n = parseFloat(v.slice(0, -1)); return Number.isFinite(n) ? n : null; }
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** 拉球队 roster，返回现役球员 person_id 列表（过滤教练） */
async function fetchRoster(teamId) {
  const url = `https://www.dongqiudi.com/sport-data/soccer/biz/dqd/v1/team/member_v2/${teamId}?app=dqd`;
  const text = await get(url, `https://www.dongqiudi.com/team/${teamId}`);
  const j = JSON.parse(text);
  if (j.code !== 0) throw new Error(`roster code=${j.code}`);
  const ids = [];
  for (const group of j.data?.list ?? []) {
    if (group.type === 'coach') continue;
    for (const p of group.data ?? []) {
      if (p.person_id) ids.push(String(p.person_id));
    }
  }
  return ids;
}

/** 拉球员详情，返回 { enName, wanEuro }（market_value 单位为万欧） */
async function fetchPlayerValue(personId) {
  const html = await get(`https://www.dongqiudi.com/player/${personId}`);
  const d = extractNuxt(html);
  const b = d?.detail?.base_info;
  const raw = b?.market_value;
  const wan = raw ? Number(raw) : null;
  return { enName: b?.person_en_name || '', wanEuro: Number.isFinite(wan) && wan > 0 ? wan : null };
}

/** 英文名变体展开（同 fetch-dqd-players.js 的 expandNameVariants，值改为身价数字） */
function expandVariants(enName, value, out) {
  if (!enName || value == null) return;
  out[enName] = value;
  const deAccName = enName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (deAccName !== enName) out[deAccName] = value;
  const parts = enName.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0];
    const rest = parts.slice(1).join(' ');
    out[`${first.charAt(0)}. ${rest}`] = value;
    out[`${first.charAt(0)} ${rest}`] = value;
    const reversed = `${rest} ${first}`;
    out[reversed] = value;
    out[`${rest.charAt(0)}. ${first}`] = value;
    out[`${rest.charAt(0)} ${first}`] = value;
    if (deAccName !== enName) {
      const dFirst = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const dRest = rest.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      out[`${dFirst.charAt(0)}. ${dRest}`] = value;
      out[`${dRest} ${dFirst}`] = value;
      out[`${dRest.charAt(0)}. ${dFirst}`] = value;
    }
  }
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJsonIfChanged(file, obj) {
  const prev = readJson(file, null);
  const next = JSON.stringify(obj, null, 2);
  if (prev !== null && JSON.stringify(prev) === next) return false;
  fs.writeFileSync(file, next);
  return true;
}

async function main() {
  const playerValues = {};
  const teamValues = {};
  const leagues = Object.entries(LEAGUE_SEASON);
  let teamsScanned = 0;
  let playersScanned = 0;
  let playersWithValue = 0;

  for (const [key, league] of leagues) {
    console.log(`\n===== ${league.name} (season_id=${league.seasonId}) =====`);
    const teams = await fetchLeagueTeams(league);
    console.log(`  standing: ${teams.length} 队`);
    const limitTeams = TRIM_TEAMS > 0 ? teams.slice(0, TRIM_TEAMS) : teams;

    for (const t of limitTeams) {
      teamsScanned += 1;
      // 球队总身价
      try {
        const tv = await fetchTeamValue(t.teamId);
        if (tv.englishName && tv.marketValueMillion != null) {
          teamValues[tv.englishName] = tv.marketValueMillion;
        }
        await new Promise((r) => setTimeout(r, DELAY_MS));
      } catch (e) {
        console.warn(`  ! 球队 ${t.teamId} ${t.name} 总身价失败: ${e.message}`);
      }

      // 球员身价
      let roster = [];
      try {
        roster = await fetchRoster(t.teamId);
      } catch (e) {
        console.warn(`  ! roster ${t.teamId} 失败: ${e.message}`);
      }
      if (PLAYERS_LIMIT > 0) roster = roster.slice(0, PLAYERS_LIMIT);

      for (const pid of roster) {
        playersScanned += 1;
        try {
          const pv = await fetchPlayerValue(pid);
          if (pv.enName && pv.wanEuro != null) {
            expandVariants(pv.enName, pv.wanEuro, playerValues);
            playersWithValue += 1;
          }
          await new Promise((r) => setTimeout(r, DELAY_MS));
        } catch (e) {
          if (e.message !== 'HTTP 404') console.warn(`  ! 球员 ${pid} 身价失败: ${e.message}`);
        }
      }
      console.log(`  [${teamsScanned}/${limitTeams.length}] ${t.name}: 球员 ${roster.length} 人`);
    }
  }

  // 合并已有（已有优先，保证手填/旧值不被覆盖）
  const prevPlayer = readJson(PLAYER_OUT, { players: {} });
  const prevTeam = readJson(TEAM_OUT, { teams: {} });
  const mergedPlayers = { ...playerValues, ...(prevPlayer.players || {}) };
  const mergedTeams = { ...teamValues, ...(prevTeam.teams || {}) };

  writeJsonIfChanged(PLAYER_OUT, {
    _generated: new Date().toISOString().slice(0, 10),
    _source: '懂球帝球员详情页 base_info.market_value（万欧）',
    _totalKeys: Object.keys(mergedPlayers).length,
    players: mergedPlayers,
  });
  writeJsonIfChanged(TEAM_OUT, {
    _generated: new Date().toISOString().slice(0, 10),
    _source: '懂球帝球队详情页 teamInfo.marketValue（百万欧）',
    _totalKeys: Object.keys(mergedTeams).length,
    teams: mergedTeams,
  });

  console.log(`\n完成：扫描 ${teamsScanned} 队 / ${playersScanned} 球员，其中 ${playersWithValue} 人有身价`);
  console.log(`球员身价映射 ${Object.keys(mergedPlayers).length} 键 → ${PLAYER_OUT}`);
  console.log(`球队总身价映射 ${Object.keys(mergedTeams).length} 键 → ${TEAM_OUT}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});