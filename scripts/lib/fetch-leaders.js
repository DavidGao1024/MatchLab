/**
 * 抓某联赛排行榜（12 项排行榜），从 fetch-espn-core.js 抽出便于单测。
 * 零依赖：getJson / core 由调用方注入。
 */
'use strict';

const idFromRef = (ref) => {
  if (!ref) return null;
  const m = String(ref).match(/\/(\d+)(?:\?|$)/);
  return m ? Number(m[1]) : null;
};

/**
 * 抓 leaders 端点并归一化。
 * 404（新赛季未开赛 → ESPN 返 "No stats found"）视为空榜单——切季返回空 categories；
 * 其余错误照抛，由上层保留旧文件（空榜防线：瞬时故障绝不清榜）。
 *
 * @param {Function} getJson 抓取函数（fetch-espn-core 注入带计数/sleep 的版本）
 * @param {object} core espn-endpoints 的 core 端点对象
 * @param {{slug: string}} league
 * @param {string} season
 * @param {Array<{id: number|string, name?: string, teamId?: number}>} index 球员索引（解析名字用）
 * @param {Map<number, {displayName?: string}>} teamsById
 */
async function fetchLeaders(getJson, core, league, season, index, teamsById) {
  const nameById = new Map(index.map((p) => [Number(p.id), p]));

  let raw;
  try {
    raw = await getJson(core.leaders(league.slug, season));
  } catch (e) {
    if (e && e.statusCode === 404) {
      raw = null; // 新赛季未开赛，无 stats → 空榜单
    } else {
      throw e;
    }
  }

  const categories = [];
  for (const cat of raw?.categories || []) {
    const entries = [];
    for (const row of cat.leaders || cat.leaderList || []) {
      const athleteId =
        idFromRef(row.athlete && (row.athlete.$ref || row.athlete.href)) ??
        (row.athlete && row.athlete.id) ??
        null;
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

      const teamId =
        (known && known.teamId) ??
        idFromRef(row.team && (row.team.$ref || row.team.href)) ??
        null;
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

module.exports = { fetchLeaders, idFromRef };