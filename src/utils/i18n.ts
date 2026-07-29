export type Lang = 'zh' | 'en'

/** 96 队标准中文译名（键 = teams.json 的 displayName，一个不多一个不少） */
export const TEAM_ZH: Record<string, string> = {
  // 英超 eng.1（20）
  'AFC Bournemouth': '伯恩茅斯',
  'Arsenal': '阿森纳',
  'Aston Villa': '阿斯顿维拉',
  'Brentford': '布伦特福德',
  'Brighton & Hove Albion': '布莱顿',
  'Burnley': '伯恩利',
  'Chelsea': '切尔西',
  'Crystal Palace': '水晶宫',
  'Everton': '埃弗顿',
  'Fulham': '富勒姆',
  'Leeds United': '利兹联',
  'Liverpool': '利物浦',
  'Manchester City': '曼城',
  'Manchester United': '曼联',
  'Newcastle United': '纽卡斯尔联',
  'Nottingham Forest': '诺丁汉森林',
  'Sunderland': '桑德兰',
  'Tottenham Hotspur': '托特纳姆热刺',
  'West Ham United': '西汉姆联',
  'Wolverhampton Wanderers': '狼队',
  // 西甲 esp.1（20）
  'Alavés': '阿拉维斯',
  'Athletic Club': '毕尔巴鄂竞技',
  'Atlético Madrid': '马德里竞技',
  'Barcelona': '巴塞罗那',
  'Celta Vigo': '塞尔塔',
  'Elche': '埃尔切',
  'Espanyol': '西班牙人',
  'Getafe': '赫塔费',
  'Girona': '赫罗纳',
  'Levante': '莱万特',
  'Mallorca': '马略卡',
  'Osasuna': '奥萨苏纳',
  'Rayo Vallecano': '巴列卡诺',
  'Real Betis': '皇家贝蒂斯',
  'Real Madrid': '皇家马德里',
  'Real Oviedo': '皇家奥维耶多',
  'Real Sociedad': '皇家社会',
  'Sevilla': '塞维利亚',
  'Valencia': '瓦伦西亚',
  'Villarreal': '比利亚雷亚尔',
  // 意甲 ita.1（20）
  'AC Milan': 'AC米兰',
  'AS Roma': '罗马',
  'Atalanta': '亚特兰大',
  'Bologna': '博洛尼亚',
  'Cagliari': '卡利亚里',
  'Como': '科莫',
  'Cremonese': '克雷莫纳',
  'Fiorentina': '佛罗伦萨',
  'Genoa': '热那亚',
  'Hellas Verona': '维罗纳',
  'Internazionale': '国际米兰',
  'Juventus': '尤文图斯',
  'Lazio': '拉齐奥',
  'Lecce': '莱切',
  'Napoli': '那不勒斯',
  'Parma': '帕尔马',
  'Pisa': '比萨',
  'Sassuolo': '萨索洛',
  'Torino': '都灵',
  'Udinese': '乌迪内斯',
  // 德甲 ger.1（18）
  '1. FC Heidenheim 1846': '海登海姆',
  '1. FC Union Berlin': '柏林联合',
  'Bayer Leverkusen': '勒沃库森',
  'Bayern Munich': '拜仁慕尼黑',
  'Borussia Dortmund': '多特蒙德',
  'Borussia Mönchengladbach': '门兴格拉德巴赫',
  'Eintracht Frankfurt': '法兰克福',
  'FC Augsburg': '奥格斯堡',
  'FC Cologne': '科隆',
  'Hamburg SV': '汉堡',
  'Mainz': '美因茨',
  'RB Leipzig': 'RB莱比锡',
  'SC Freiburg': '弗赖堡',
  'St. Pauli': '圣保利',
  'TSG Hoffenheim': '霍芬海姆',
  'VfB Stuttgart': '斯图加特',
  'VfL Wolfsburg': '沃尔夫斯堡',
  'Werder Bremen': '云达不莱梅',
  // 法甲 fra.1（18）
  'AJ Auxerre': '欧塞尔',
  'Angers': '昂热',
  'AS Monaco': '摩纳哥',
  'Brest': '布雷斯特',
  'Le Havre AC': '勒阿弗尔',
  'Lens': '朗斯',
  'Lille': '里尔',
  'Lorient': '洛里昂',
  'Lyon': '里昂',
  'Marseille': '马赛',
  'Metz': '梅斯',
  'Nantes': '南特',
  'Nice': '尼斯',
  'Paris FC': '巴黎FC',
  'Paris Saint-Germain': '巴黎圣日耳曼',
  'Stade Rennais': '雷恩',
  'Strasbourg': '斯特拉斯堡',
  'Toulouse': '图卢兹',
  // 中超 chn.1（16）
  'Shanghai Shenhua': '上海申花',
  'Beijing Guoan': '北京国安',
  'Shandong Taishan': '山东泰山',
  'Tianjin Jinmen Tiger': '天津津门虎',
  'Henan': '河南',
  'Shanghai Port': '上海海港',
  'Zhejiang Professional FC': '浙江',
  'Chengdu Rongcheng': '成都蓉城',
  'Wuhan Three Towns': '武汉三镇',
  'Qingdao Hainiu': '青岛海牛',
  'Qingdao West Coast': '青岛西海岸',
  'Shenzhen Xinpengcheng': '深圳新鹏城',
  'Yunnan Yukun': '云南玉昆',
  'Dalian Yingbo': '大连英博',
  'Chongqing Tonglianglong': '重庆铜梁龙',
  'Liaoning Tieren': '辽宁铁人',
}

const UI: Record<string, { zh: string; en: string }> = {
  'nav.standings': { zh: '积分榜', en: 'Table' },
  'nav.schedule': { zh: '赛程', en: 'Fixtures' },
  'home.lastRound': { zh: '上轮战报', en: 'Latest Round' },
  'home.viewFull': { zh: '查看完整赛程', en: 'Full fixtures' },
  'home.featured': { zh: '焦点联赛', en: 'Featured' },
  'home.enter': { zh: '进入', en: 'Enter' },
  'home.teamsUnit': { zh: '队', en: 'teams' },
  'home.playersUnit': { zh: '名球员', en: 'players' },
  'home.playedUnit': { zh: '场已战罢', en: 'matches played' },
  'home.focus': { zh: '焦点', en: 'Focus' },
  'col.team': { zh: '球队', en: 'Team' },
  'col.played': { zh: '赛', en: 'P' },
  'col.won': { zh: '胜', en: 'W' },
  'col.drawn': { zh: '平', en: 'D' },
  'col.lost': { zh: '负', en: 'L' },
  'col.gf': { zh: '进', en: 'GF' },
  'col.ga': { zh: '失', en: 'GA' },
  'col.gd': { zh: '净', en: 'GD' },
  'col.pts': { zh: '积分', en: 'Pts' },
  'col.form': { zh: '近5场', en: 'Last 5' },
  'legend.ucl': { zh: '欧冠', en: 'Champions League' },
  'legend.uel': { zh: '欧联', en: 'Europa League' },
  'legend.playoff': { zh: '降级附加赛', en: 'Relegation playoff' },
  'legend.rel': { zh: '降级', en: 'Relegation' },
  'standings.xgToggle': { zh: 'xG 数据', en: 'xG data' },
  'standings.updated': { zh: '数据更新', en: 'Updated' },
  'standings.season': { zh: '赛季', en: 'Season' },
  'schedule.live': { zh: '直播', en: 'LIVE' },
  'schedule.noMatches': { zh: '本月暂无联赛比赛', en: 'No league matches this month' },
  'schedule.offseason': { zh: '赛季已收官，展示最终数据', en: 'Season concluded — final data' },
  'schedule.goLatest': { zh: '跳到最近有数据的月份', en: 'Go to latest month with data' },
  'schedule.refresh': { zh: '刷新', en: 'Refresh' },
  'schedule.matchesUnit': { zh: '场', en: 'matches' },
  'state.loading': { zh: '数据加载中', en: 'Loading' },
  'state.error': { zh: '数据加载失败', en: 'Failed to load' },
  'state.retry': { zh: '重试', en: 'Retry' },
  'state.liveDown': { zh: '直播暂不可用，已退回快照数据', en: 'Live unavailable — showing cached snapshot' },
  'footer.pipeline': { zh: '自动管线每日刷新', en: 'Auto pipeline · refreshed daily' },
  'footer.snapshot': { zh: '数据快照', en: 'Data snapshot' },
  'footer.source': { zh: '来源', en: 'Source' },
  'footer.tagline': { zh: '足球联赛数据查询', en: 'Football leagues data hub' },
  'match.vs': { zh: 'VS', en: 'VS' },
  'form.win': { zh: '胜', en: 'Win' },
  'form.draw': { zh: '平', en: 'Draw' },
  'form.loss': { zh: '负', en: 'Loss' },
  // Phase 3 弹窗
  'modal.close': { zh: '关闭', en: 'Close' },
  'modal.loading': { zh: '加载中', en: 'Loading' },
  'modal.error': { zh: '比赛详情加载失败', en: 'Failed to load match' },
  'modal.lineup': { zh: '阵容', en: 'Lineup' },
  'modal.timeline': { zh: '时间线', en: 'Timeline' },
  'modal.stats': { zh: '统计', en: 'Stats' },
  'modal.h2h': { zh: '历史交锋', en: 'Head to Head' },
  'lineup.formation': { zh: '阵型', en: 'Formation' },
  'lineup.bench': { zh: '替补', en: 'Bench' },
  'lineup.coach': { zh: '主教练', en: 'Coach' },
  'lineup.notAnnounced': { zh: '阵容尚未公布', en: 'Lineup not announced yet' },
  'events.goal': { zh: '进球', en: 'Goal' },
  'events.ownGoal': { zh: '乌龙', en: 'Own Goal' },
  'events.yellow': { zh: '黄牌', en: 'Yellow' },
  'events.red': { zh: '红牌', en: 'Red' },
  'events.secondYellow': { zh: '两黄变红', en: '2nd Yellow' },
  'events.substitution': { zh: '换人', en: 'Sub' },
  'events.penalty': { zh: '点球', en: 'Penalty' },
  'events.penaltyMissed': { zh: '点球未中', en: 'Penalty Missed' },
  'h2h.expand': { zh: '展开历史交锋', en: 'Expand H2H' },
  'h2h.collapse': { zh: '收起', en: 'Collapse' },
  'h2h.noMatches': { zh: '暂无历史交锋数据', en: 'No previous meetings' },
  'h2h.vs': { zh: '对阵', en: 'vs' },
}

/** 界面文案唯一出口；未定义的键原样返回 */
export function t(key: string, lang: Lang): string {
  return UI[key]?.[lang] ?? key
}

/** 队名：中文查译名表，英文/未收录直接用数据原始 displayName */
export function teamName(name: string, lang: Lang): string {
  return lang === 'zh' ? (TEAM_ZH[name] ?? name) : name
}

// ===== 球员中文名映射 =====
// 高频球员手填（覆盖五大联赛明星）；启动时异步加载 players-zh.json 合并扩充
// 未收录 fallback：去重音 + 大小写不敏感 + 分词回退（沿用世界杯项目 trPlayer 策略）
let PLAYER_ZH: Record<string, string> = {
  // 英超
  'Mohamed Salah': '萨拉赫',
  'Erling Haaland': '哈兰德',
  'Kevin De Bruyne': '德布劳内',
  'Bukayo Saka': '萨卡',
  'Martin Ødegaard': '厄德高',
  'Heung-Min Son': '孙兴慜',
  'James Maddison': '麦迪逊',
  'Cole Palmer': '帕尔默',
  'Alexander Isak': '伊萨克',
  'Ollie Watkins': '沃特金斯',
  'Bruno Fernandes': 'B·费尔南德斯',
  'Marcus Rashford': '拉什福德',
  'Phil Foden': '福登',
  'Virgil van Dijk': '范迪克',
  'Alisson Becker': '阿利松',
  'Trent Alexander-Arnold': '阿诺德',
  // 西甲
  'Jude Bellingham': '贝林厄姆',
  'Vinícius Júnior': '维尼修斯',
  'Kylian Mbappé': '姆巴佩',
  'Lamine Yamal': '亚马尔',
  'Robert Lewandowski': '莱万多夫斯基',
  'Pedri': '佩德里',
  'Gavi': '加维',
  'Federico Valverde': '巴尔韦德',
  // 意甲
  'Lautaro Martínez': '劳塔罗',
  'Paulo Dybala': '迪巴拉',
  'Rafael Leão': '莱奥',
  'Khvicha Kvaratskhelia': '克瓦拉茨赫利亚',
  'Theo Hernández': '特奥',
  'Mike Maignan': '迈尼昂',
  // 德甲
  'Harry Kane': '凯恩',
  'Jamal Musiala': '穆西亚拉',
  'Florian Wirtz': '维尔茨',
  'Joshua Kimmich': '基米希',
  'Serge Gnabry': '格纳布里',
  'Leroy Sané': '萨内',
  // 法甲
  'Ousmane Dembélé': '登贝莱',
  'Bradley Barcola': '巴尔科拉',
  'Achraf Hakimi': '阿什拉夫',
  'Gianluigi Donnarumma': '多纳鲁马',
}

/** 异步加载 players-zh.json 合并到 PLAYER_ZH（应用启动调用一次） */
export async function loadPlayerNames(): Promise<void> {
  try {
    const base = import.meta.env.BASE_URL
    const res = await fetch(`${base}data/mappings/players-zh.json`)
    if (!res.ok) return
    const data = await res.json()
    if (data?.players && typeof data.players === 'object') {
      PLAYER_ZH = { ...data.players, ...PLAYER_ZH }
    }
  } catch {
    // 静默失败，不影响应用启动
  }
}

// 去重音：Vinícius → Vinicius，便于大小写不敏感匹配
function normalizeAccents(s: string): string {
  return s
    .replace(/[áàâãäå]/g, 'a').replace(/[ÁÀÂÃÄÅ]/g, 'A')
    .replace(/[éèêë]/g, 'e').replace(/[ÉÈÊË]/g, 'E')
    .replace(/[íìîï]/g, 'i').replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[óòôõöø]/g, 'o').replace(/[ÓÒÔÕÖØ]/g, 'O')
    .replace(/[úùûü]/g, 'u').replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/[ýÿ]/g, 'y').replace(/[ÝŸ]/g, 'Y')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .replace(/š/g, 's').replace(/Š/g, 'S')
    .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
    .replace(/ð/g, 'd').replace(/Ð/g, 'D')
    .replace(/ø/g, 'o').replace(/Ø/g, 'O')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .replace(/å/g, 'a').replace(/Å/g, 'A')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
    .replace(/ß/g, 'ss')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
}

/** 球员名：中文查译名表 + 去重音/大小写不敏感/分词回退；英文/未收录直接用原名 */
export function playerName(name: string, lang: Lang): string {
  if (!name || lang !== 'zh') return name
  if (PLAYER_ZH[name]) return PLAYER_ZH[name]
  const lower = name.toLowerCase()
  for (const k of Object.keys(PLAYER_ZH)) {
    if (k.toLowerCase() === lower) return PLAYER_ZH[k]
  }
  const norm = normalizeAccents(name)
  if (norm !== name && PLAYER_ZH[norm]) return PLAYER_ZH[norm]
  const parts = name.split(/\s+/)
  if (parts.length > 1) {
    for (const p of parts) {
      if (PLAYER_ZH[p]) return PLAYER_ZH[p]
      const np = normalizeAccents(p)
      if (PLAYER_ZH[np]) return PLAYER_ZH[np]
    }
  }
  return name
}
