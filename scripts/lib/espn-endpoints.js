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

const { fetchJson, UA_CURL } = require('./http');

const CORE_BASE = 'https://sports.core.api.espn.com';
const SITE_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

/** 默认赛季（欧洲联赛 2025 = 2025–26；中超等自然年联赛用各自 season 字段覆盖） */
const SEASON = '2025';

/** 联赛配置（图纸 §8 + 中超扩展） */
const LEAGUES = [
  { slug: 'eng.1', name: 'Premier League', nameZh: '英超', understatSlug: 'EPL', country: 'England', teams: 20, color: '#3D195B', season: '2025', seasonType: 'european' },
  { slug: 'esp.1', name: 'LALIGA', nameZh: '西甲', understatSlug: 'La_liga', country: 'Spain', teams: 20, color: '#EE8707', season: '2025', seasonType: 'european' },
  { slug: 'ita.1', name: 'Italian Serie A', nameZh: '意甲', understatSlug: 'Serie_A', country: 'Italy', teams: 20, color: '#008FD7', season: '2025', seasonType: 'european' },
  { slug: 'ger.1', name: 'Bundesliga', nameZh: '德甲', understatSlug: 'Bundesliga', country: 'Germany', teams: 18, color: '#D20100', season: '2025', seasonType: 'european' },
  { slug: 'fra.1', name: 'French Ligue 1', nameZh: '法甲', understatSlug: 'Ligue_1', country: 'France', teams: 18, color: '#14213D', season: '2025', seasonType: 'european' },
  { slug: 'chn.1', name: 'Chinese Super League', nameZh: '中超', understatSlug: null, country: 'China', teams: 16, color: '#C8102E', season: '2026', seasonType: 'calendar',
    // 2026 赛季"假赌黑"专项整治扣分（赛季前固定扣除，不计入比赛结果）
    pointDeductions: { 977: 10, 8239: 10, 21910: 7, 7521: 6, 8240: 6, 21506: 5, 18203: 5, 15515: 5, 2052: 5 },
  },
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

/**
 * 队级数据覆盖：ESPN 缺失/过时的 logo 和颜色，用本地文件兜底。
 * 把正确 logo PNG 丢到 public/logos/{league}/{teamId}.png 即可生效。
 * color / alternateColor 用于修正 ESPN 返回占位色或错色的情况。
 */
const TEAM_OVERRIDES = {
  // ===== 英超（副色/主色修正，正确的队不动）=====
  349: { color: '#DA291C', alternateColor: '#000000' },  // 伯恩茅斯（副紫→黑）
  359: { color: '#EF0107', alternateColor: '#FFFFFF' },  // 阿森纳（副蓝→白）
  362: { color: '#670E36', alternateColor: '#95BFE5' },  // 维拉（副黑→天蓝 #95BFE5）
  331: { color: '#0057B8', alternateColor: '#FFFFFF' },  // 布莱顿（主亮蓝→蓝，副青→白）
  364: { color: '#C8102E', alternateColor: '#FFFFFF' },  // 利物浦（主色微调）
  363: { color: '#034694', alternateColor: '#FFFFFF' },  // 切尔西（主色校正）
  384: { color: '#1B458F', alternateColor: '#C4122E' },  // 水晶宫（蓝红）
  370: { color: '#FFFFFF', alternateColor: '#000000' },  // 富勒姆（副红→黑）
  361: { color: '#241F20', alternateColor: '#FFFFFF' },  // 纽卡（副深蓝→白）
  393: { color: '#DD0000', alternateColor: '#FFFFFF' },  // 森林（副绿→白）
  366: { color: '#EB172B', alternateColor: '#FFFFFF' },  // 桑德兰（副粉→白）
  // ===== 西甲 =====
  96: { color: '#016FB9', alternateColor: '#FFFFFF' },   // 阿拉维斯（副粉→白）
  93: { color: '#EE2523', alternateColor: '#FFFFFF' },   // 毕尔巴鄂（副黑→白）
  83: { color: '#A50044', alternateColor: '#004D98' },   // 巴萨（blaugrana 红蓝，主深红副黄已改）
  3751: { color: '#008F4C', alternateColor: '#FFFFFF' }, // 埃尔切（副紫→白）
  1538: { color: '#A51931', alternateColor: '#004B93' }, // 莱万特（副黑→蓝）
  99: { color: '#0098D3', alternateColor: '#FFFFFF' },   // 马拉加（主淡蓝副粉 → 蓝白）
  86: { color: '#FFFFFF', alternateColor: '#FEBE10' },   // 皇马（副深绿→金）
  // ===== 意甲 =====
  103: { color: '#FB090B', alternateColor: '#000000' },  // AC 米兰（副白→黑）
  110: { color: '#0068A8', alternateColor: '#000000' },  // 国米（副白→黑）
  111: { color: '#000000', alternateColor: '#FFFFFF' },  // 尤文（副黄→白）
  113: { color: '#EE2E2E', alternateColor: '#FFD700' },  // 莱切（副深蓝→黄）
  115: { color: '#F3D02E', alternateColor: '#0056A0' },  // 帕尔马（主黑副黄 → 黄蓝）
  118: { color: '#1B1B1B', alternateColor: '#FFFFFF' },  // 乌迪内斯（副黄→白）
  // ===== 德甲 =====
  10388: { color: '#008F4C', alternateColor: '#FFFFFF' }, // 埃尔弗斯贝格（主黑→绿白）
  // ===== 法甲 =====
  172: { color: '#002E5F', alternateColor: '#FFFFFF' },  // 欧塞尔（主白→蓝）
  174: { color: '#E30613', alternateColor: '#FFFFFF' },  // 摩纳哥（副深绿→白）
  175: { color: '#E30613', alternateColor: '#F0B100' },  // 朗斯（sang et or 红金：副深绿→金）
  2502: { color: '#E30613', alternateColor: '#000000' }, // 尼斯（副粉→黑）
  6851: { color: '#0D1F3D', alternateColor: '#FFFFFF' }, // 巴黎FC（主副黑→深蓝白）
  // ===== 中超（占位色黑+红批量修正；球衣常识校填，仍建议人工复核）=====
  21355: { color: '#C60000', alternateColor: '#FFFFFF' }, // 成都蓉城（主黑→红）
  22537: { color: '#003F8A', alternateColor: '#FFFFFF' }, // 大连英博（主黑→蓝）
  8240: { color: '#C60000', alternateColor: '#FFFFFF' },  // 河南（副红→白）
  21910: { color: '#C60000', alternateColor: '#FFFFFF' }, // 青岛海牛（主黑→红）
  22198: { color: '#003F8A', alternateColor: '#FFFFFF' }, // 青岛西海岸（主黑→蓝）
  7521: { color: '#F37021', alternateColor: '#FFFFFF' },  // 山东泰山（主红→橙）
  977: { color: '#2C5FA8', alternateColor: '#FFFFFF' },   // 上海申花（主红→蓝）
  22199: { color: '#003F8A', alternateColor: '#FFFFFF' }, // 深圳新鹏城（主黑→蓝）
  21506: { color: '#003F8A', alternateColor: '#FFFFFF' }, // 武汉三镇（主黑→蓝）
  22536: { color: '#C60000', alternateColor: '#FFFFFF' }, // 云南玉昆（主黑→红）
  18203: { color: '#008F4C', alternateColor: '#FFFFFF' }, // 浙江（主黑→绿白）
  // logo 覆盖（路径相对于 public/，前端自动拼 BASE_URL）
  131704: { logo: 'logos/chn.1/131704.png', color: '#C8102E', alternateColor: '#FFFFFF' },  // 重庆铜梁龙（副红→白）
  131705: { logo: 'logos/chn.1/131705.png', color: '#C8102E', alternateColor: '#FFFFFF' },  // 辽宁铁人（副红→白）
  8239: { logo: 'logos/chn.1/8239.png', color: '#5B2D8B', alternateColor: '#FFFFFF' }, // 天津津门虎（ESPN logo 过旧；主场紫色，2026 赛季细节白色，ESPN 错给深红）
};

/** 开赛月份：欧洲制 8 月开幕；自然年制 3 月开幕 */
function seasonOpenMonth(seasonType) {
  return seasonType === 'calendar' ? 3 : 8;
}

/** 候选赛季（日期驱动）：欧洲制 8–12 月=当年、1–7 月=上一年；自然年制=当年 */
function candidateSeason(seasonType, now) {
  const y = now.getUTCFullYear();
  if (seasonType === 'calendar') return y;
  return now.getUTCMonth() + 1 >= 8 ? y : y - 1;
}

/**
 * 赛季交替判定（2026-08-06 初版需完赛才切；2026-08-18 放宽）：候选新赛季开幕月
 * 有赛程（任意状态，pre 也算）即切新季，否则回退上一季。
 * 放宽理由：季前赛程已排定（如英超 8/21 揭幕），继续展示上季完整数据不合时宜。
 * 原地改写 league.season，下游（core/scores/understat/leagues.json 汇总）同对象可见；
 * 每联赛 1 次 scoreboard 请求，失败保守不改。
 */
async function resolveSeasonsInPlace(leagues, now = new Date()) {
  for (const league of leagues) {
    const type = league.seasonType || 'european';
    const cand = candidateSeason(type, now);
    const m = seasonOpenMonth(type);
    const mm = String(m).padStart(2, '0');
    const last = new Date(Date.UTC(cand, m + 1, 0)).getUTCDate();
    try {
      // site.api 服务端抓取必须用 curl UA（浏览器 UA + 服务器 IP 会被 Akamai 403）
      const sb = await fetchJson(`${SITE_BASE}/${league.slug}/scoreboard?dates=${cand}${mm}01-${cand}${mm}${String(last).padStart(2, '0')}&limit=200`, { ua: UA_CURL });
      const scheduled = (sb.events ?? []).length > 0;
      league.season = scheduled ? String(cand) : String(cand - 1);
    } catch {
      // 网络失败不改 season（保守沿用配置值）
    }
    console.log(`[season] ${league.slug} → ${league.season}（候选 ${cand}）`);
  }
  return leagues;
}

module.exports = { CORE_BASE, SITE_BASE, SEASON, LEAGUES, core, site, TEAM_OVERRIDES, resolveSeasonsInPlace };
