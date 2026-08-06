export type Lang = 'zh' | 'en'

/** 96 队标准中文译名（键 = teams.json 的 displayName）+ 赛季交替升班马补录 */
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
  // ===== 2026-27 升班马补录（赛季交替，teams.json 尚为 2025-26 阵容，实时赛程已出现）=====
  // 英超 eng.1
  'Coventry City': '考文垂',
  'Hull City': '赫尔城',
  'Ipswich Town': '伊普斯维奇',
  // 西甲 esp.1
  'Racing Santander': '桑坦德竞技',
  'Deportivo La Coruña': '拉科鲁尼亚',
  'Málaga': '马拉加',
  // 意甲 ita.1
  'Monza': '蒙扎',
  'Frosinone': '弗罗西诺内',
  'Venezia': '威尼斯',
  // 德甲 ger.1
  'SC Paderborn 07': '帕德博恩',
  'SV Elversberg': '埃尔夫斯贝格',
  'Schalke 04': '沙尔克04',
  // 法甲 fra.1
  'Le Mans': '勒芒',
  'Troyes': '特鲁瓦',
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
  // ===== Phase 4：球员 / 排行榜 / 搜索 =====
  'nav.players': { zh: '球员', en: 'Players' },
  'nav.leaders': { zh: '排行榜', en: 'Leaders' },
  'nav.favorites': { zh: '收藏', en: 'Favorites' },
  'fav.viewAll': { zh: '查看全部 →', en: 'View all →' },
  'search.placeholder': { zh: '搜索球员或球队…', en: 'Search players or teams…' },
  'search.players': { zh: '球员', en: 'Players' },
  'search.teams': { zh: '球队', en: 'Teams' },
  'search.noResults': { zh: '无匹配结果', en: 'No results' },
  'search.hint': { zh: '输入姓名 / 队名', en: 'Type a name or team' },
  'players.title': { zh: '球员列表', en: 'Players' },
  'players.positionAll': { zh: '全部位置', en: 'All Positions' },
  'players.positionG': { zh: '门将', en: 'Goalkeeper' },
  'players.positionD': { zh: '后卫', en: 'Defender' },
  'players.positionM': { zh: '中场', en: 'Midfielder' },
  'players.positionF': { zh: '前锋', en: 'Forward' },
  'players.teamAll': { zh: '全部球队', en: 'All Teams' },
  'players.sortGoals': { zh: '按进球', en: 'By Goals' },
  'players.sortAssists': { zh: '按助攻', en: 'By Assists' },
  'players.sortName': { zh: '按姓名', en: 'By Name' },
  'players.sortAge': { zh: '按年龄', en: 'By Age' },
  'players.page': { zh: '页', en: 'Page' },
  'players.of': { zh: '共', en: 'of' },
  'players.empty': { zh: '无符合条件的球员', en: 'No players match these filters' },
  'col.player': { zh: '球员', en: 'Player' },
  'col.pos': { zh: '位', en: 'Pos' },
  'col.age': { zh: '年龄', en: 'Age' },
  'col.goals': { zh: '进球', en: 'G' },
  'col.assists': { zh: '助攻', en: 'A' },
  'player.jersey': { zh: '号', en: '#' },
  'player.born': { zh: '出生', en: 'Born' },
  'player.height': { zh: '身高', en: 'Height' },
  'player.weight': { zh: '体重', en: 'Weight' },
  'player.xgSection': { zh: 'xG 数据 (Understat)', en: 'xG (Understat)' },
  'player.xgNoData': { zh: '暂无 xG 数据', en: 'No xG data' },
  'player.stats.offensive': { zh: '进攻', en: 'Offensive' },
  'player.stats.defensive': { zh: '防守', en: 'Defensive' },
  'player.stats.general': { zh: '通用', en: 'General' },
  'player.stats.goalKeeping': { zh: '门将', en: 'Goalkeeping' },
  'leaders.title': { zh: '排行榜', en: 'Leaders' },
  'leaders.rank': { zh: '排名', en: 'Rank' },
  'leaders.value': { zh: '数值', en: 'Value' },
  // ===== Phase 5：球队详情 =====
  'team.venue': { zh: '主场', en: 'Venue' },
  'team.city': { zh: '城市', en: 'City' },
  'team.record': { zh: '战绩', en: 'Record' },
  'team.played': { zh: '已赛', en: 'Played' },
  'team.squad': { zh: '阵容', en: 'Squad' },
  'team.stats': { zh: '球队统计', en: 'Team Stats' },
  'team.col.gf': { zh: '进球', en: 'GF' },
  'team.col.ga': { zh: '失球', en: 'GA' },
  'team.col.gd': { zh: '净胜球', en: 'GD' },
  'team.col.pts': { zh: '积分', en: 'Pts' },
  'team.col.w': { zh: '胜', en: 'W' },
  'team.col.d': { zh: '平', en: 'D' },
  'team.col.l': { zh: '负', en: 'L' },
  // ===== Phase 6：图表 + 高阶功能 =====
  'chart.xgTrend': { zh: 'xG 趋势', en: 'xG Trend' },
  'chart.careerCurve': { zh: '生涯曲线', en: 'Career Curve' },
  'chart.careerLoading': { zh: '加载生涯数据…', en: 'Loading career…' },
  'chart.careerEmpty': { zh: '暂无生涯数据', en: 'No career data' },
  'chart.xgEmpty': { zh: '暂无逐场 xG 数据', en: 'No per-match xG' },
  'chart.rollingAvg': { zh: '5 场滚动平均', en: '5-match rolling avg' },
  'chart.xG': { zh: 'xG', en: 'xG' },
  'chart.npxG': { zh: 'npxG', en: 'npxG' },
  'chart.goals': { zh: '进球', en: 'Goals' },
  'chart.assists': { zh: '助攻', en: 'Assists' },
  'chart.matches': { zh: '场次', en: 'Matches' },
  'chart.season': { zh: '赛季', en: 'Season' },
  'compare.title': { zh: '球员对比', en: 'Player Compare' },
  'compare.add': { zh: '添加球员', en: 'Add player' },
  'compare.remove': { zh: '移除', en: 'Remove' },
  'compare.placeholder': { zh: '搜索球员 ID 或姓名添加到对比', en: 'Search player to compare' },
  'compare.empty': { zh: '尚未选择球员，从搜索框添加', en: 'No players selected' },
  'compare.maxPlayers': { zh: '最多 4 人对比', en: 'Max 4 players' },
  'compare.max': { zh: '最高', en: 'max' },
  // ===== 首页订阅卡（MyTeamCard）=====
  'card.tag': { zh: '订阅主队', en: 'My Team' },
  'card.today': { zh: '今日', en: 'Today' },
  'card.next': { zh: '下场', en: 'Next' },
  'card.live': { zh: '进行中', en: 'Live' },
  'card.seOver': { zh: '赛季已结束', en: 'Season ended' },
  'card.seasonRecord': { zh: '赛季战绩', en: 'Season Record' },
  'card.recent5': { zh: '最近 5 场', en: 'Last 5' },
  'card.injured': { zh: '伤员', en: 'Injuries' },
  'card.noNext': { zh: '无再下场', en: 'No more fixtures' },
  'card.loading': { zh: '加载中...', en: 'Loading...' },
  'compare.diff': { zh: '差值', en: 'Diff' },
  'seasonSelector.label': { zh: '赛季', en: 'Season' },
  'seasonSelector.current': { zh: '当前', en: 'Current' },
  'nav.compare': { zh: '对比', en: 'Compare' },
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
  // 中超外援/归化球员补丁（dongqiudi en_name 用中文拼音或常用简称，与 ESPN displayName 不一致）
  'Serginho': '塞尔吉尼奥',
  'Guilherme Ramos': '吉列尔梅-拉莫斯',
  'Fábio Abreu': '法比奥-阿布雷乌',
  'Fabio Abreu': '法比奥-阿布雷乌',
  'Dawhan': '达万',
  'Boubacar Konté': '孔特',
  'Aboubacar Konte': '孔特',
  'Chadrac Akolo': '沙德拉克',
  'Jeremy Dudziak': '杜齐亚克',
  'Uroš Spajić': '斯帕伊奇',
  'Uros Spajic': '斯帕伊奇',
  'Saulo Mineiro': '绍洛-米内罗',
  'Saulo': '绍洛',
  'Wilson Manafá': '马纳法',
  'Rafael Ratão': '拉斐尔-拉唐',
  'Prince Ampem': '安佩姆',
  'Mateus Vital': '马特乌斯-维塔尔',
  'Óscar Melendo': '梅伦多',
  'Oscar Melendo': '梅伦多',
  'Jaume Grau': '豪梅-格劳',
  'Miguel Campos': '米格尔-坎波斯',
  'Alberto Quiles Piosa': '基莱斯',
  'Alberto Quiles': '基莱斯',
  'Guilherme Schettine': '吉列尔梅-谢蒂内',
  'Xadas': '哈达斯',
  'Cristian Salvador': '克里斯蒂安-萨尔瓦多',
  'Aitor Córdoba': '艾托尔-科尔多瓦',
  'Aitor Cordoba': '艾托尔-科尔多瓦',
  'Jhonder Cádiz': '卡迪斯',
  'Jhonder Cadiz': '卡迪斯',
  'Kilian Bevis': '贝维斯',
  'Antoine Leautey': '洛泰',
  'Léo Souza': '莱昂纳多',
  'Davidson': '戴维森',
  'Aziz Yakubu': '阿齐兹',
  'Cryzan': '克雷桑',
  'Zeca': '泽卡',
  'Valeri Qazaishvili': '卡扎伊什维利',
  'Felippe Cardoso': '费利佩-卡多索',
  'Marko Tolic': '托利奇',
  'Alexandru Mitriță': '米特里策',
  'Jin-seob Park': '朴镇燮',
  'Lucas Possignolo': '卢卡斯-波西诺洛',
  'Wellington Silva': '韦林顿-席尔瓦',
  'Issa Kallon': '伊萨-卡隆',
  'Rômulo': '罗慕洛',
  'Romulo': '罗慕洛',
  'Matheus Jussa': '马特乌斯-茹萨',
  'Egor Sorokin': '索罗金',
  'Landry Dimata': '迪马塔',
  'Ibrahim Amadou': '易卜拉欣-阿马杜',
  'Lucão': '卢康',
  'Michael Ngadeu': '恩加德乌',
  'Oscar Taty Maritu': '奥斯卡',
  'Cléber': '克莱伯',
  'Cleber': '克莱伯',
  'Caio Vinicius': '卡约',
  'Alexandru Ioniță': '亚历山德鲁-约尼查',
  'Andrei Burcă': '布尔克',
  'Cephas Malele': '马莱莱',
  'Frank Acheampong': '阿奇姆彭',
  'Nicolae Stanciu': '斯坦丘',
  'Isnik Alimi': '阿利米',
  'Mamadou Traoré': '马马杜-特拉奥雷',
  'Mamadou Traore': '马马杜-特拉奥雷',
  'Nelson Coquenao da Luz': '内尔松-卢斯',
  'Samir Memisevic': '梅米舍维奇',
  'Bruno Viana': '布鲁诺-维亚纳',
  'Guy Mbenza': '居伊-姆本扎',
  'Jeffinho': '热菲尼奥',
  'Takahiro Kunimoto': '邦本宜裕',
  'Felipe': '费利佩',
  'Pavle Vagic': '瓦吉奇',
  'Wesley Moraes': '韦斯利',
  'Deabeas Owusu-Sekyere': '迪比斯-奥乌苏',
  'Albion Ademi': '阿尔比恩-阿代米',
  'Eden Karzev': '卡尔采夫',
  'Gabriel Xavier': '加布里埃尔-沙维尔',
}

/** 异步加载 players-zh.json 合并到 PLAYER_ZH（应用启动调用一次） */
let playerNamesPromise: Promise<void> | null = null

/** 记忆化：多次调用共享同一 Promise，players store 建索引前 await 它保证译名表已合并 */
export function loadPlayerNames(): Promise<void> {
  if (!playerNamesPromise) {
    playerNamesPromise = (async () => {
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
    })()
  }
  return playerNamesPromise
}

/** 仅供测试：重置记忆化 Promise */
export function __resetPlayerNames(): void {
  playerNamesPromise = null
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

/** 球场中文名（按 teams.json 的 venue.name 键） */
const VENUE_ZH: Record<string, string> = {
  // 英超
  'Vitality Stadium': '迪恩考特球场',
  'Emirates Stadium': '酋长球场',
  'Villa Park': '维拉公园球场',
  'Gtech Community Stadium': 'GTech 社区球场',
  'American Express Stadium': '美国运通球场',
  'Turf Moor': '特夫摩尔球场',
  'Kai Tak Sports Park': '启德体育园',
  'Selhurst Park': '塞尔赫斯特公园',
  'Hill Dickinson Stadium': '希尔·迪金森球场',
  'Craven Cottage': '克拉文农场',
  'Elland Road': '埃兰路球场',
  'Anfield': '安菲尔德',
  'Etihad Stadium': '伊蒂哈德球场',
  'Old Trafford': '老特拉福德',
  "St. James' Park": '圣詹姆斯公园',
  'The City Ground': '城市球场',
  'Stadium of Light': '光明球场',
  'Tottenham Hotspur Stadium': '热刺球场',
  'London Stadium': '伦敦奥林匹克球场',
  'Molineux Stadium': '莫利纽克斯球场',
  // 西甲
  'Mendizorrotza': '门迪索罗萨',
  "San Mamés": '圣马梅斯',
  'Riyadh Air Metropolitano': '大都会球场',
  'Spotify Camp Nou': '诺坎普',
  'Balaidos': '巴莱多斯',
  'Estadio Martínez Valero': '马丁内斯·巴莱罗球场',
  'RCDE Stadium': 'RCDE 球场',
  'Estadio Coliseum': '科利塞姆球场',
  'Estadi Montilivi': '蒙蒂利维',
  'Estadi Ciutat de València': '瓦伦西亚城市球场',
  'Estadi Mallorca Son Moix': '索恩莫伊斯球场',
  'El Sadar': '萨达尔',
  'Estadio de Vallecas': '巴列卡斯球场',
  'Estadio La Cartuja': '拉卡图哈球场',
  'Santiago Bernabéu': '伯纳乌',
  'Estadio Carlos Tartiere': '卡洛斯·塔蒂耶雷球场',
  'Reale Arena': '雷亚莱球场',
  'Ramón Sánchez Pizjuán Stadium': '皮斯胡安球场',
  'Mestalla Stadium': '梅斯塔利亚',
  'Estadio de la Cerámica': '陶瓷球场',
  // 意甲
  'San Siro': '圣西罗',
  'Olimpico': '罗马奥林匹克',
  'New Balance Arena': '新百伦球场',
  "Renato Dall'Ara": '雷纳托·达尔拉',
  'Unipol Domus': '乌尼波尔穹顶',
  'Giuseppe Sinigaglia': '西尼加利亚',
  'Stadio Giovanni Zini': '乔瓦尼·齐尼球场',
  'Stadio Artemio Franchi': '阿尔泰米奥·弗兰基球场',
  'Stadio Luigi Ferraris': '路易吉·费拉里斯',
  'Stadio Marcantonio Bentegodi': '本特戈迪',
  'Allianz Stadium': '安联球场',
  'Via del Mare': '滨海球场',
  'Stadio Diego Armando Maradona': '马拉多纳球场',
  'Ennio Tardini': '塔迪尼',
  'Arena Garibaldi - Stadio Romeo Anconetani': '加里波第球场',
  'Mapei Stadium': '马佩球场',
  'Stadio Olimpico Grande Torino': '都灵奥林匹克',
  'Stadio Friuli': '弗留利',
  // 德甲
  'Voith-Arena': '福伊特球场',
  'Stadion An der Alten Försterei': '老森林管理所球场',
  'BayArena': '拜耳球场',
  'Allianz Arena': '安联球场',
  'Signal Iduna Park': '西格纳伊度公园',
  'BORUSSIA-PARK': '普鲁士公园',
  'Deutsche Bank Park': '德意志银行公园',
  'WWK Arena': 'WWK 球场',
  'RheinEnergieStadion': '莱茵能源球场',
  'Volksparkstadion': '人民公园球场',
  'MEWA ARENA': '美瓦球场',
  'Red Bull Arena': '红牛球场',
  'Europa-Park Stadion': '欧洲公园球场',
  'Millerntor-Stadion': '米勒恩托球场',
  'PreZero Arena': '普雷零球场',
  'MHPArena': 'MHP 球场',
  'Volkswagen Arena': '大众竞技场',
  'Weserstadion': '威悉球场',
  // 法甲
  "Stade de l'Abbé-Deschamps": '德尚普斯神父球场',
  'Stade Raymond Kopa': '雷蒙·科帕球场',
  'Stade Louis II': '路易二世球场',
  'Stade Francis-Le Blé': '弗朗西斯·勒布莱球场',
  'Stade Océane': '海洋球场',
  'Stade Bollaert-Delelis': '博莱特-德莱利斯球场',
  'Decathlon Arena - Stade Pierre-Mauroy': '皮埃尔·莫鲁瓦球场',
  'Stade du Moustoir - Yves Allainmat': '穆斯托瓦球场',
  'Groupama Stadium': '格鲁帕马球场',
  'Stade Vélodrome': '韦洛德罗姆',
  'Stade Saint-Symphorien': '圣西姆弗里安球场',
  'Stade de la Beaujoire': '博茹瓦尔球场',
  'Allianz Riviera': '蔚蓝海岸安联',
  'Stade Jean Bouin': '让·布安球场',
  'Parc des Princes': '王子公园',
  'Roazhon Park': '罗阿泽公园',
  'Stade de la Meinau': '梅纳乌球场',
  'Stadium Municipal de Toulouse': '图卢兹市政球场',
  // 中超
  "Workers' Stadium": '工人体育场',
  'Chengdu Phoenix Mountain Sports Park': '成都凤凰山足球场',
  'Chongqing Longxing Football Stadium': '重庆龙兴足球场',
  'Dalian Suoyuwan Football Stadium': '大连梭鱼湾足球场',
  'Zhengzhou Hanghai Stadium': '郑州航海体育场',
  'Tiexi New District Sports Centre': '铁西新区体育中心',
  'Qingdao Youth Football Stadium': '青岛青春足球场',
  'Qingdao West Coast University City Stadium': '青岛西海岸大学城体育场',
  'Jinan Olympic Sports Center Stadium': '济南奥体中心体育场',
  'SAIC Motor Pudong Arena': '上汽浦东足球场',
  'Shanghai Stadium': '上海体育场',
  'Shenzhen Stadium': '深圳体育场',
  'TEDA Football Stadium': '泰达足球场',
  'Wuhan Sports Center Stadium': '武汉体育中心体育场',
  'Yuxi Plateau Sports Center Stadium': '玉溪高原体育运动中心体育场',
  'Yellow Dragon Sports Center Stadium': '黄龙体育中心体育场',
}

/** 城市中文名（按 teams.json 的 venue.city 键） */
const CITY_ZH: Record<string, string> = {
  // 英超
  'Bournemouth': '伯恩茅斯', 'London': '伦敦', 'Birmingham': '伯明翰',
  'Brentford': '布伦特福德', 'Falmer': '法尔默', 'Burnley': '伯恩利',
  'Mongkok, Kowloon': '香港旺角', 'Liverpool': '利物浦', 'Leeds': '利兹',
  'Manchester': '曼彻斯特', 'Newcastle-upon-Tyne': '纽卡斯尔',
  'Nottingham': '诺丁汉', 'Sunderland': '桑德兰', 'Wolverhampton': '伍尔弗汉普顿',
  // 西甲
  'Vitoria-Gasteiz': '维多利亚', 'Bilbao': '毕尔巴鄂', 'Madrid': '马德里',
  'Barcelona': '巴塞罗那', 'Vigo': '维哥', 'Elche': '埃尔切',
  'Getafe': '赫塔费', 'Girona': '赫罗纳', 'Manises': '马尼塞斯',
  'Palma de Mallorca': '帕尔马-马略卡', 'Pamplona': '潘普洛纳',
  'Sevilla': '塞维利亚', 'Oviedo': '奥维耶多', 'San Sebastian': '圣塞巴斯蒂安',
  'Villarreal': '比利亚雷亚尔',
  // 意甲
  'Milano': '米兰', 'Roma': '罗马', 'Bergamo': '贝加莫',
  'Bologna': '博洛尼亚', 'Cagliari': '卡利亚里', 'Como': '科莫',
  'Cremona': '克雷莫纳', 'Firenze': '佛罗伦萨', 'Genova': '热那亚',
  'Verona': '维罗纳', 'Torino': '都灵', 'Lecce': '莱切',
  'Napoli': '那不勒斯', 'Parma': '帕尔马', 'Pisa': '比萨',
  'Reggio Emilia': '雷焦艾米利亚', 'Udine': '乌迪内',
  // 德甲
  'Heidenheim': '海登海姆', 'Berlin': '柏林', 'Leverkusen': '勒沃库森',
  'München': '慕尼黑', 'Aue': '奥厄', 'Mönchengladbach': '门兴格拉德巴赫',
  'Frankfurt': '法兰克福', 'Augsburg': '奥格斯堡', 'Cologne': '科隆',
  'Hamburg Norderstedt': '汉堡', 'Mainz': '美因茨', 'Leipzig': '莱比锡',
  'Freiburg im Breisgau': '弗赖堡', 'Sinsheim': '辛斯海姆',
  'Stuttgart': '斯图加特', 'Wolfsburg': '沃尔夫斯堡', 'Bremen': '不来梅',
  // 法甲
  'Auxerre': '欧塞尔', 'Angers': '昂热', 'Monaco': '摩纳哥',
  'Brest': '布雷斯特', 'Le Havre': '勒阿弗尔', 'Lens': '朗斯',
  'Lille': '里尔', 'Lorient': '洛里昂', 'Lyon': '里昂',
  'Marseille': '马赛', 'Metz': '梅斯', 'Nantes': '南特',
  'Nice': '尼斯', 'Paris': '巴黎', 'Rennes': '雷恩',
  'Strasbourg': '斯特拉斯堡', 'Toulouse': '图卢兹',
  // 中超
  'Beijing': '北京', 'Chengdu': '成都', 'Chongqing': '重庆',
  'Dalian': '大连', 'Zhengzhou': '郑州', 'Liaoning': '辽宁',
  'Qingdao': '青岛', 'Jinan': '济南', 'Shanghai': '上海',
  'Shenzhen': '深圳', 'Tianjin': '天津', 'Wuhan': '武汉',
  'Yuxi': '玉溪', 'Hangzhou': '杭州',
}

/** 场馆名：中文查译名表，英文/未收录回退原文 */
export function venueName(name: string, lang: Lang): string {
  return lang === 'zh' ? (VENUE_ZH[name] ?? name) : name
}

/** 城市名：中文查译名表，英文/未收录回退原文 */
export function cityName(name: string, lang: Lang): string {
  return lang === 'zh' ? (CITY_ZH[name] ?? name) : name
}

/** 排行榜分类中文名（按 leaders.json 的 cat.name 键， ESPN 12 项稳定） */
const LEADERS_CAT_ZH: Record<string, string> = {
  goalsLeaders: '进球榜',
  assistsLeaders: '助攻榜',
  goals: '进球',
  assists: '助攻',
  shotsOnTarget: '射正',
  yellowCards: '黄牌',
  redCards: '红牌',
  foulsCommitted: '犯规',
  foulsSuffered: '被侵犯',
  totalShots: '射门',
  accuratePasses: '成功传球',
  saves: '扑救',
}

/** 排行榜分类名：中文查译名表，英文/未收录回退 displayName */
export function leadersCatName(name: string, displayName: string, lang: Lang): string {
  if (lang !== 'zh') return displayName
  return LEADERS_CAT_ZH[name] ?? displayName
}

/** 球员名：中文查译名表 + 去重音/大小写不敏感/撇号兜底/分词回退；英文/未收录直接用原名 */
export function playerName(name: string, lang: Lang): string {
  if (!name || lang !== 'zh') return name
  if (PLAYER_ZH[name]) return PLAYER_ZH[name]
  const lower = name.toLowerCase()
  for (const k of Object.keys(PLAYER_ZH)) {
    if (k.toLowerCase() === lower) return PLAYER_ZH[k]
  }
  const norm = normalizeAccents(name)
  if (norm !== name && PLAYER_ZH[norm]) return PLAYER_ZH[norm]
  // 撇号兜底：外援名 N'Kololo / N'Guessan 等，dongqiudi 存 "Nkololo"，ESPN 存 "N'Kololo"
  const noApos = name.replace(/['\u2019]/g, '')
  if (noApos !== name) {
    const noAposLower = noApos.toLowerCase()
    for (const k of Object.keys(PLAYER_ZH)) {
      if (k.replace(/['\u2019]/g, '').toLowerCase() === noAposLower) return PLAYER_ZH[k]
    }
  }
  const parts = name.split(/\s+/)
  if (parts.length > 1) {
    for (const p of parts) {
      if (PLAYER_ZH[p]) return PLAYER_ZH[p]
      const np = normalizeAccents(p)
      if (PLAYER_ZH[np]) return PLAYER_ZH[np]
    }
  }
  // 单名兜底：输入为单词时（如 ESPN "Djené" / "Manafá" / "Leonardo"），搜 key 中含该词的唯一译名
  // 多个不同译名冲突则跳过（如 "Leonardo" 命中 Balerdi/Spinazzola 等多个不同球员）
  if (parts.length === 1) {
    const inputLower = lower
    const inputDeAcc = normalizeAccents(name).toLowerCase()
    let uniqueCn: string | null = null
    let conflict = false
    for (const k of Object.keys(PLAYER_ZH)) {
      const kParts = k.split(/[\s.\-]+/).filter(p => p.length >= 2)
      if (kParts.length < 2) continue
      if (kParts.some(p => {
        const lp = p.toLowerCase()
        return lp === inputLower || lp === inputDeAcc
      })) {
        const cn = PLAYER_ZH[k]
        if (uniqueCn && uniqueCn !== cn) { conflict = true; break }
        uniqueCn = cn
      }
    }
    if (!conflict && uniqueCn) return uniqueCn
  }
  return name
}
