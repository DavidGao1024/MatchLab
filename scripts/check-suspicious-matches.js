/**
 * ESPN 源数据体检（零依赖，Actions 专用）——发现自相矛盾/幽灵记录即红灯，提示人工勘误
 *
 * 背景（2026-08-31 中超积分榜对账实锤）：ESPN 会把
 *   ① 真实 3-2 的比赛记成 0-0 却仍标 home.winner=true；
 *   ② 台风延期未赛的比赛记成 0-0「完赛」（summary 无事件无阵容）。
 * 两种错误都会污染前端实时积分榜（前端直连 scoreboard）。本脚本不修数据、不阻塞部署，
 * 只负责「次日晨体检发现」，人工确认后写入 src/utils/standings.ts 的 ESPN_MATCH_FIXES 勘误表。
 *
 * 用法：
 *   node scripts/check-suspicious-matches.js            # 全联赛（含 0-0 场 summary 联网核验）
 *   node scripts/check-suspicious-matches.js chn.1      # 指定联赛
 *   SKIP_SUMMARY=1 node scripts/check-suspicious-matches.js  # 本地冒烟：跳过联网，仅查平局标胜者
 *
 * 退出码：0 = 无异常；1 = 有可疑记录（工作流红灯，数据照常已提交）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { sleep, fetchJson, UA_CURL } = require('./lib/http');
const { LEAGUES, site } = require('./lib/espn-endpoints');
const { findWinnerConflicts, findPostNotCompleted, isGhostSummary } = require('./lib/suspicious-checks');

const DATA_ROOT = path.join(__dirname, '..', 'public', 'data');
const DELAY_MS = 200;

const requested = process.argv.slice(2);
const targets = requested.length ? LEAGUES.filter((l) => requested.includes(l.slug)) : LEAGUES;
if (requested.length && targets.length !== requested.length) {
  console.error(`[check] 未知联赛 slug: ${requested.filter((s) => !LEAGUES.find((l) => l.slug === s)).join(', ')}`);
  process.exit(1);
}

function collectEntries(league) {
  const dir = path.join(DATA_ROOT, league, 'matches');
  if (!fs.existsSync(dir)) return [];
  const entries = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const month = file.replace(/\.json$/, '');
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch (e) {
      console.warn(`  ! ${league}/${month}.json 解析失败: ${e.message}`);
      continue;
    }
    for (const m of data.matches || []) entries.push({ league, month, match: m });
  }
  return entries;
}

async function main() {
  const issues = [];
  let summaryChecked = 0;

  for (const { slug } of targets) {
    const entries = collectEntries(slug);
    const conflicts = findWinnerConflicts(entries);
    const postNotDone = findPostNotCompleted(entries);
    issues.push(...conflicts, ...postNotDone);
    console.log(`[${slug}] 场次 ${entries.length}，平局标胜者 ${conflicts.length}，post未完成 ${postNotDone.length}`);

    // 0-0 完赛场逐场拉 summary 核验幽灵场（真平局必有换人/牌类事件或阵容，空壳即幽灵）
    const zeroZero = entries.filter(
      (e) => e.match.completed && e.match.home && e.match.away
        && e.match.home.score === 0 && e.match.away.score === 0
        && e.match.home.winner !== true && e.match.away.winner !== true,
    );
    if (process.env.SKIP_SUMMARY) {
      if (zeroZero.length) console.log(`  · SKIP_SUMMARY=1，跳过 ${zeroZero.length} 场 0-0 联网核验`);
      continue;
    }
    for (const e of zeroZero) {
      await sleep(DELAY_MS);
      try {
        const s = await fetchJson(site.summary(slug, e.match.eventId), { ua: UA_CURL });
        summaryChecked += 1;
        if (isGhostSummary(s)) {
          issues.push({ ...e, reason: 'ghost-0-0', eventId: e.match.eventId, date: e.match.date, home: e.match.home.name, away: e.match.away.name });
        }
      } catch (err) {
        console.warn(`  ! ${slug} ${e.match.eventId} summary 抓取失败（不计入可疑）: ${err.message}`);
      }
    }
  }

  const lines = issues.map(
    (i) => `- \`${i.league}/${i.month}\` ${i.eventId}：${i.home ?? '?'} vs ${i.away ?? '?'}（${i.date ?? '?'}）— ${{
      'tied-but-winner': '比分平却标胜者',
      'post-not-completed': '状态 post 但标记未完成（疑延期/中断）',
      'ghost-0-0': '0-0 完赛但 summary 空壳（疑延期幽灵场）',
    }[i.reason] ?? i.reason}`,
  );
  if (lines.length) {
    const md = `## ⚠️ ESPN 数据体检：${lines.length} 场可疑\n\n${lines.join('\n')}\n\n处置：与官方赛果核对后，写入 \`src/utils/standings.ts\` → \`ESPN_MATCH_FIXES\` 勘误表。\n`;
    console.error('\n' + md);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
    }
    process.exitCode = 1;
  } else {
    console.log(`[check] ✅ 体检通过（0-0 联网核验 ${summaryChecked} 场，无异常）`);
  }
}

main().catch((e) => {
  console.error(`[check] 致命错误: ${e.stack || e.message}`);
  process.exit(1);
});
