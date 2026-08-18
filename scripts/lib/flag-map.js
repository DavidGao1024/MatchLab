/**
 * 球员国籍英文名 → flagcdn 国旗码（ISO 3166-1 alpha-2 / UK 细分）映射
 *
 * 用途：把 ESPN 的 citizenship 英文国名映射到 flagcdn 旗码，
 *       生成本地国旗路径 public/flags/{iso2}.png，替代 ESPN 盗链。
 *
 * 数据源：ESPN citizenship 字段全集（116 国，扫描自 fetch-espn-core.js 产物）。
 * 特殊处理：
 *   - 英国四分区用 flagcdn UK 细分码：England=gb-eng / Scotland=gb-sct /
 *     Wales=gb-wls / Northern Ireland=gb-nir
 *   - 海外领地：French Guiana=gf / Guadeloupe=gp / Faroe Islands=fo
 *   - 属地归属：China PR=cn / Hong Kong=hk / Chinese Taipei=tw（与 ESPN 现状一致）
 *
 * 维护约定：ESPN 新增国籍若本表未覆盖，localFlagPath 返回 null（前端不显旗），
 * 下载/生成时应在日志警告并人工补入，不要在运行时猜测映射。
 */
'use strict';

const FLAG_MAP = {
  'Albania': 'al',
  'Algeria': 'dz',
  'Angola': 'ao',
  'Argentina': 'ar',
  'Armenia': 'am',
  'Australia': 'au',
  'Austria': 'at',
  'Belgium': 'be',
  'Benin': 'bj',
  'Bolivia': 'bo',
  'Bosnia and Herzegovina': 'ba',
  'Brazil': 'br',
  'Bulgaria': 'bg',
  'Burkina Faso': 'bf',
  'Burundi': 'bi',
  'Cameroon': 'cm',
  'Canada': 'ca',
  'Cape Verde Islands': 'cv',
  'Central African Republic': 'cf',
  'Chile': 'cl',
  'China PR': 'cn',
  'Chinese Taipei': 'tw',
  'Colombia': 'co',
  'Congo': 'cg',
  'Congo DR': 'cd',
  'Croatia': 'hr',
  'Cyprus': 'cy',
  'Czechia': 'cz',
  'Denmark': 'dk',
  'Dominican Republic': 'do',
  'Ecuador': 'ec',
  'Egypt': 'eg',
  'England': 'gb-eng',
  'Equatorial Guinea': 'gq',
  'Estonia': 'ee',
  'Faroe Islands': 'fo',
  'Finland': 'fi',
  'France': 'fr',
  'French Guiana': 'gf',
  'Gabon': 'ga',
  'Gambia': 'gm',
  'Georgia': 'ge',
  'Germany': 'de',
  'Ghana': 'gh',
  'Greece': 'gr',
  'Guadeloupe': 'gp',
  'Guinea': 'gn',
  'Guinea-Bissau': 'gw',
  'Haiti': 'ht',
  'Honduras': 'hn',
  'Hong Kong': 'hk',
  'Hungary': 'hu',
  'Iceland': 'is',
  'Indonesia': 'id',
  'Israel': 'il',
  'Italy': 'it',
  'Ivory Coast': 'ci',
  'Jamaica': 'jm',
  'Japan': 'jp',
  'Jordan': 'jo',
  'Kenya': 'ke',
  'Kosovo': 'xk',
  'Latvia': 'lv',
  'Libya': 'ly',
  'Lithuania': 'lt',
  'Luxembourg': 'lu',
  'Madagascar': 'mg',
  'Malaysia': 'my',
  'Mali': 'ml',
  'Mauritania': 'mr',
  'Mexico': 'mx',
  'Moldova': 'md',
  'Montenegro': 'me',
  'Morocco': 'ma',
  'Mozambique': 'mz',
  'Netherlands': 'nl',
  'New Zealand': 'nz',
  'Nigeria': 'ng',
  'North Macedonia': 'mk',
  'Northern Ireland': 'gb-nir',
  'Norway': 'no',
  'Paraguay': 'py',
  'Peru': 'pe',
  'Poland': 'pl',
  'Portugal': 'pt',
  'Republic of Ireland': 'ie',
  'Romania': 'ro',
  'Russia': 'ru',
  'Saudi Arabia': 'sa',
  'Scotland': 'gb-sct',
  'Senegal': 'sn',
  'Serbia': 'rs',
  'Sierra Leone': 'sl',
  'Slovakia': 'sk',
  'Slovenia': 'si',
  'South Africa': 'za',
  'South Korea': 'kr',
  'Spain': 'es',
  'Suriname': 'sr',
  'Sweden': 'se',
  'Switzerland': 'ch',
  'Syria': 'sy',
  'Tanzania': 'tz',
  'Thailand': 'th',
  'Togo': 'tg',
  'Trinidad and Tobago': 'tt',
  'Tunisia': 'tn',
  'Türkiye': 'tr',
  'USA': 'us',
  'Ukraine': 'ua',
  'Uruguay': 'uy',
  'Uzbekistan': 'uz',
  'Venezuela': 've',
  'Wales': 'gb-wls',
  'Zambia': 'zm',
  'Zimbabwe': 'zw',
};

/** 英文国名 → 本地国旗相对路径；未知/空返回 null（前端不显旗） */
function localFlagPath(citizenship) {
  if (!citizenship) return null;
  const iso = FLAG_MAP[citizenship];
  return iso ? `flags/${iso}.png` : null;
}

module.exports = { FLAG_MAP, localFlagPath };