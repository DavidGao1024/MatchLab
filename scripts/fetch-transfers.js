/**
 * 抓取球员转会记录（零依赖，仅 Node 内置模块）
 *
 * 数据源：ESPN core API `athletes/{id}/transactions`（球员级、跨联赛、不带 league/season 前缀）。
 * 每条转会含 date / from(转出队) / to(转入队) / type / amount(displayAmount)。
 * 联盟级 `leagues/{slug}/transactions` 端点实测返回空，故逐球员遍历。
 *
 * 输出：public/data/{league}/transfers.json（该联赛球员的转会汇总）
 *
 * 用法：node scripts/fetch-transfers.js              # 全量（~2611 球员，约 40 分钟）
 *       PLAYERS_LIMIT=5 node scripts/fetch-transfers.js  # 冒烟：每联赛前 5 球员
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { sleep, fetchJson, writeJsonIfChanged } = require('./lib/http');

const DATA_ROOT = path.join(__dirname, '..', 'public', 'data');
const CORE_BASE = 'https://sports.core.api.espn.com';
const DELAY_MS = 200;
const PLAYERS_LIMIT = process.env.PLAYERS_LIMIT ? Number(process.env.PLAYERS_LIMIT) : 0;

const txEndpoint = (id) => `${CORE_BASE}/v2/sports/soccer/athletes/${id}/transactions?lang=en&region=us`;

function idFromRef(ref) {
  if (!ref) return null;
  const m = String(ref).match(/teams\/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** 本地队名映射：各联赛 teams.json 收集 teamId → name（避免重复抓 team 端点） */
function loadTeamNames() {
  const map = new Map();
  for (const lg of fs.readdirSync(DATA_ROOT)) {
    const tf = path.join(DATA_ROOT, lg, 'teams.json');
    if (!fs.existsSync(tf)) continue;
    try {
      const t = JSON.parse(fs.readFileSync(tf, 'utf8'));
      for (const team of t.teams || []) {
        if (team.id != null && !map.has(team.id)) map.set(team.id, team.name || team.displayName || null);
      }
    } catch (e) { /* 忽略损坏文件 */ }
  }
  return map;
}

/** 解析 $ref 指向的球队 → { id, name }；本地映射优先，跨联赛/历史队抓 team 端点兜底 */
async function resolveTeam(ref, teamNames, teamCache) {
  const id = idFromRef(ref);
  if (!id) return { id: null, name: null };
  if (teamNames.has(id)) return { id, name: teamNames.get(id) };
  if (teamCache.has(id)) return { id, name: teamCache.get(id) };
  try {
    const url = String(ref).replace(/^http:\/\//, 'https://');
    const t = await fetchJson(url);
    const name = t.displayName || t.name || t.shortDisplayName || null;
    teamCache.set(id, name);
    return { id, name };
  } catch (e) {
    teamCache.set(id, null);
    return { id, name: null };
  }
}

async function main() {
  const teamNames = loadTeamNames();
  const teamCache = new Map();
  const leagues = process.env.LEAGUE ? [process.env.LEAGUE] : ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'chn.1'];

  for (const lg of leagues) {
    const pdir = path.join(DATA_ROOT, lg, 'players');
    if (!fs.existsSync(pdir)) continue;
    let files = fs.readdirSync(pdir).filter((f) => f.endsWith('.json'));
    if (PLAYERS_LIMIT) files = files.slice(0, PLAYERS_LIMIT);

    const transfers = [];
    let ok = 0;
    for (const f of files) {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(pdir, f), 'utf8'));
        if (p.id == null) continue;
        const tx = await fetchJson(txEndpoint(p.id));
        for (const it of tx.items || []) {
          const from = await resolveTeam(it.from && it.from.$ref, teamNames, teamCache);
          const to = await resolveTeam(it.to && it.to.$ref, teamNames, teamCache);
          transfers.push({
            playerId: p.id,
            playerName: p.displayName || p.shortName || null,
            date: it.date || null,
            fromTeamId: from.id,
            fromTeam: from.name,
            toTeamId: to.id,
            toTeam: to.name,
            type: it.type || null,
            amount: it.amount != null ? it.amount : null,
            displayAmount: it.displayAmount || null,
          });
          await sleep(DELAY_MS);
        }
        ok += 1;
        await sleep(DELAY_MS);
      } catch (e) {
        if (e.statusCode === 404) continue; // 无转会记录（青训/本土球员），正常跳过
        console.warn(`  ! ${lg} 球员 ${f} 转会抓取失败: ${e.message}`);
      }
    }

    writeJsonIfChanged(path.join(DATA_ROOT, lg, 'transfers.json'), {
      source: 'sports.core.api.espn.com athletes/{id}/transactions',
      updateTime: new Date().toISOString(),
      league: lg,
      playersScanned: files.length,
      count: transfers.length,
      transfers,
    });
    console.log(`[${lg}] ${ok}/${files.length} 球员 → ${transfers.length} 条转会`);
  }
  console.log('[transfers] 完成');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});