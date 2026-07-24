/**
 * 生成 Understat ↔ ESPN 队名映射表（零依赖）
 *
 * 原理：读已抓取的 xg/standings.json（Understat 队名）与 teams.json（ESPN 队名），
 *      自动匹配（精确 → 去重音/去标点归一），仅输出「有差异」的条目。
 *      归一后仍对不上的（如 RasenBallsport Leipzig → RB Leipzig）用 KNOWN_MAP 人工兜底，
 *      再对不上会在控制台报 unmatched，人工补进 KNOWN_MAP 重跑即可。
 *
 * 输出：
 *   public/data/mappings/team-name-map.json    { Understat 队名: ESPN 队名 }（差异条目）
 *   public/data/mappings/player-name-map.json  球员姓名人工映射（首次生成空表，人工维护）
 *
 * 用法：先跑 fetch-espn-core.js + fetch-understat.js，再跑 node scripts/build-team-map.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { writeJsonIfChanged } = require('./lib/http');
const { LEAGUES } = require('./lib/espn-endpoints');

const DATA_ROOT = path.join(__dirname, '..', 'public', 'data');

/** 归一化：小写 + 去重音 + 去非字母数字（Paris Saint Germain ≡ Paris Saint-Germain ≡ Atlético→atletico） */
function norm(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** 人工兜底映射：简写 vs 全称类差异（归一化救不了），调研 2026-07-21 + Phase 1 实测 */
const KNOWN_MAP = {
  // EPL（5 条，实测验证）
  Bournemouth: 'AFC Bournemouth',
  Brighton: 'Brighton & Hove Albion',
  Leeds: 'Leeds United',
  Tottenham: 'Tottenham Hotspur',
  'West Ham': 'West Ham United',
  // Serie A（4 条，调研记录）
  Inter: 'Internazionale',
  Roma: 'AS Roma',
  'Parma Calcio 1913': 'Parma',
  Verona: 'Hellas Verona',
  // Bundesliga（10 条，Phase 1 实测全集）
  'RasenBallsport Leipzig': 'RB Leipzig',
  Hoffenheim: 'TSG Hoffenheim',
  Freiburg: 'SC Freiburg',
  Augsburg: 'FC Augsburg',
  'Mainz 05': 'Mainz',
  'Union Berlin': '1. FC Union Berlin',
  'Borussia M.Gladbach': 'Borussia Mönchengladbach',
  'Hamburger SV': 'Hamburg SV',
  Wolfsburg: 'VfL Wolfsburg',
  'FC Heidenheim': '1. FC Heidenheim 1846',
  // Ligue 1（4 条实测 + Paris Saint Germain 归一自动匹配，共 5 条）
  Rennes: 'Stade Rennais',
  Monaco: 'AS Monaco',
  'Le Havre': 'Le Havre AC',
  Auxerre: 'AJ Auxerre',
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function main() {
  const map = {};
  const auto = [];
  const known = [];
  const unmatched = [];

  for (const league of LEAGUES) {
    const xg = readJson(path.join(DATA_ROOT, league.slug, 'xg', 'standings.json'));
    const teams = readJson(path.join(DATA_ROOT, league.slug, 'teams.json'));
    if (!xg || !teams) {
      console.warn(`[team-map] [${league.slug}] 缺数据（xg/standings.json 或 teams.json），跳过——先跑 fetch-understat / fetch-espn-core`);
      continue;
    }

    const understatNames = [...new Set((xg.standings || []).map((s) => s.team).filter(Boolean))];
    const espnNames = (teams.teams || []).map((t) => t.displayName).filter(Boolean);
    const espnByNorm = new Map(espnNames.map((n) => [norm(n), n]));

    for (const uName of understatNames) {
      if (espnNames.includes(uName)) continue; // 完全一致，无需映射
      if (KNOWN_MAP[uName]) {
        map[uName] = KNOWN_MAP[uName];
        known.push(`${league.slug}: ${uName} → ${KNOWN_MAP[uName]}（人工）`);
        continue;
      }
      const hit = espnByNorm.get(norm(uName));
      if (hit) {
        map[uName] = hit;
        auto.push(`${league.slug}: ${uName} → ${hit}（归一匹配）`);
      } else {
        unmatched.push(`${league.slug}: ${uName}`);
      }
    }
  }

  const changed = writeJsonIfChanged(path.join(DATA_ROOT, 'mappings', 'team-name-map.json'), {
    description: 'Understat 队名 → ESPN 队名（仅差异条目；前端用法 teamMap[name] ?? name）',
    updateTime: new Date().toISOString(),
    count: Object.keys(map).length,
    map,
  });

  // 球员姓名人工映射表：首次生成空表（92.5% 精确匹配 + 去重音 fuzzy 由前端处理，此表兜底残余）
  const playerMapFile = path.join(DATA_ROOT, 'mappings', 'player-name-map.json');
  if (!fs.existsSync(playerMapFile)) {
    writeJsonIfChanged(playerMapFile, {
      description: 'ESPN 球员名 → Understat 球员名（人工维护，兜底音译/顺序差异，如 Tomás Soucek→Tomas Soucek）',
      updateTime: new Date().toISOString(),
      count: 0,
      map: {},
    });
  }

  console.log(`[team-map] 映射 ${Object.keys(map).length} 条（自动 ${auto.length} + 人工 ${known.length}）${changed ? '，已写入' : '，无变化'}`);
  for (const line of [...auto, ...known]) console.log(`  · ${line}`);
  if (unmatched.length) {
    console.warn(`[team-map] ⚠ ${unmatched.length} 条未匹配，需人工补 KNOWN_MAP 后重跑:`);
    for (const line of unmatched) console.warn(`  ! ${line}`);
  }
}

main();
