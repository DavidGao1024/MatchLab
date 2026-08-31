/**
 * ESPN 源数据可疑记录体检（零依赖，纯函数；I/O 在 check-suspicious-matches.js）
 *
 * 三指纹（2026-08-31 中超积分榜对账实锤）：
 *   指纹1 tied-but-winner：401861543 辽宁 0-0 海港（真实 3-2）——比分平却标了胜者，ESPN 自相矛盾
 *   指纹2 post-not-completed：401861443 浙江-三镇（台风延期）——status=post 但 completed=false
 *   指纹3 ghost-0-0：0-0 完赛场 summary 空壳（无事件无球员），联网核验用
 */
'use strict';

/**
 * @param {{league:string, month:string, match:object}[]} entries
 * @returns {{league:string, month:string, eventId:string, date?:string, home?:string, away?:string, reason:string}[]}
 */
function findWinnerConflicts(entries) {
  const issues = [];
  for (const { league, month, match: m } of entries) {
    if (!m || !m.completed) continue;
    const hs = m.home && m.home.score;
    const as = m.away && m.away.score;
    if (hs == null || as == null || hs !== as) continue;
    if (m.home.winner === true || m.away.winner === true) {
      issues.push({
        league, month, eventId: m.eventId, date: m.date,
        home: m.home && m.home.name, away: m.away && m.away.name,
        reason: 'tied-but-winner',
      });
    }
  }
  return issues;
}

/**
 * status=post 但 completed=false——ESPN 自相矛盾（2026-08-08 浙江 vs 三镇静态快照实锤：
 * 台风延期未赛，状态却标 post）。前端 normalizeEvent 只看 state、抓取脚本看 completed，
 * 两侧口径分叉正是榜单被污染的路径，必须体检暴露。
 */
function findPostNotCompleted(entries) {
  const issues = [];
  for (const { league, month, match: m } of entries) {
    if (m && m.status === 'post' && m.completed !== true) {
      issues.push({
        league, month, eventId: m.eventId, date: m.date,
        home: m.home && m.home.name, away: m.away && m.away.name,
        reason: 'post-not-completed',
      });
    }
  }
  return issues;
}

/**
 * 0-0 完赛场的 summary 是否为「幽灵场」空壳：无事件且两队列大名单球员数为 0。
 * 实测（2026-08）：真实比赛 keyEvents≥40、roster 各 23 人；幽灵场 keyEvents 缺失、rosters 有条目但 roster 全空。
 * fail-safe：summary 缺失/抓取失败一律判非幽灵，宁漏不误报。
 */
function isGhostSummary(summary) {
  if (!summary || typeof summary !== 'object') return false;
  if (Array.isArray(summary.keyEvents) && summary.keyEvents.length > 0) return false;
  const rosters = Array.isArray(summary.rosters) ? summary.rosters : [];
  const players = rosters.reduce((n, r) => n + (Array.isArray(r && r.roster) ? r.roster.length : 0), 0);
  return players === 0;
}

module.exports = { findWinnerConflicts, findPostNotCompleted, isGhostSummary };
