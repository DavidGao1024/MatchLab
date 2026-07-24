/**
 * ESPN 端点常量与联赛配置
 *
 * 端点清单来源：docs/data-site-mvp-plan.md 2026-07-21 调研记录（已验证）
 *
 * 关键事实（勿重复踩坑）：
 *   - core API 与 site API 是两个域名，职责不同（见 CLAUDE.md 架构核心）
 *   - 球员单赛季统计必须用 seasons/{year}/types/1/ 前缀；
 *     不带 seasons 的 athletes/{id}/statistics/0 是生涯累计，两者别混用
 *   - ESPN standings 端点返回空 → 积分榜本地从比分计算（fetch-espn-scores.js）
 */
'use strict';

const CORE_BASE = 'https://sports.core.api.espn.com';
const SITE_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

/** 当前抓取赛季：2025 = 2025–26 赛季 */
const SEASON = '2025';

/** 五大联赛配置（图纸 §8） */
const LEAGUES = [
  { slug: 'eng.1', name: 'Premier League', nameZh: '英超', understatSlug: 'EPL', country: 'England', teams: 20, color: '#3D195B' },
  { slug: 'esp.1', name: 'LALIGA', nameZh: '西甲', understatSlug: 'La_liga', country: 'Spain', teams: 20, color: '#EE8707' },
  { slug: 'ita.1', name: 'Italian Serie A', nameZh: '意甲', understatSlug: 'Serie_A', country: 'Italy', teams: 20, color: '#008FD7' },
  { slug: 'ger.1', name: 'Bundesliga', nameZh: '德甲', understatSlug: 'Bundesliga', country: 'Germany', teams: 18, color: '#D20100' },
  { slug: 'fra.1', name: 'French Ligue 1', nameZh: '法甲', understatSlug: 'Ligue_1', country: 'France', teams: 18, color: '#DAE1E6' },
];

/** ESPN core API 端点构造器（sports.core.api.espn.com） */
const core = {
  league: (slug) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}`,
  seasons: (slug) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}/seasons`,
  teams: (slug, year = SEASON) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}/seasons/${year}/teams`,
  team: (slug, id, year = SEASON) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}/seasons/${year}/teams/${id}`,
  teamRecord: (slug, id, year = SEASON) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}/seasons/${year}/types/1/teams/${id}/record`,
  teamLeaders: (slug, id, year = SEASON) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}/seasons/${year}/types/1/teams/${id}/leaders`,
  leaders: (slug, year = SEASON) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}/seasons/${year}/types/1/leaders`,
  athletes: (slug, limit = 50, page = 1) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}/athletes?limit=${limit}&page=${page}`,
  athlete: (slug, id) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}/athletes/${id}`,
  /** 单赛季统计（70+ 字段 4 分类）。注意：不带 seasons 前缀的是生涯累计，别混用 */
  athleteSeasonStats: (slug, id, year = SEASON) => `${CORE_BASE}/v2/sports/soccer/leagues/${slug}/seasons/${year}/types/1/athletes/${id}/statistics/0`,
};

/** ESPN site API 端点构造器（site.api.espn.com，浏览器 CORS 已验证） */
const site = {
  scoreboard: (slug, dates, limit = 200) => `${SITE_BASE}/${slug}/scoreboard?dates=${dates}&limit=${limit}`,
  summary: (slug, eventId) => `${SITE_BASE}/${slug}/summary?event=${eventId}`,
};

module.exports = { CORE_BASE, SITE_BASE, SEASON, LEAGUES, core, site };
