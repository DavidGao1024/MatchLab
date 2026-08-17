/**
 * 中文国名 → ESPN 国家码表（球员国籍补齐用）
 *
 * 结构：{ 中文国名: { en: 英文国名, code: ESPN countries slug } }
 *   - code 为 ESPN 国旗资源 slug，完整 URL =
 *     https://a.espncdn.com/i/teamlogos/countries/500/{code}.png
 *   - en 为 ESPN citizenship 字段惯用的英文国名
 *
 * 维护约定：抓取/补齐时若遇到本表未映射的中文国名，应在日志里警告并
 * 人工核实后补入本表，不要在运行时猜测映射。
 */
'use strict';

const COUNTRY_MAP = {
  '中国': { en: 'China PR', code: 'chn' },
  '巴西': { en: 'Brazil', code: 'bra' },
  '阿根廷': { en: 'Argentina', code: 'arg' },
  '法国': { en: 'France', code: 'fra' },
  '英格兰': { en: 'England', code: 'eng' },
  '德国': { en: 'Germany', code: 'ger' },
  '西班牙': { en: 'Spain', code: 'esp' },
  '意大利': { en: 'Italy', code: 'ita' },
  '葡萄牙': { en: 'Portugal', code: 'por' },
  '荷兰': { en: 'Netherlands', code: 'ned' },
  '克罗地亚': { en: 'Croatia', code: 'cro' },
  '塞尔维亚': { en: 'Serbia', code: 'sba' },
  '丹麦': { en: 'Denmark', code: 'den' },
  '瑞典': { en: 'Sweden', code: 'swe' },
  '挪威': { en: 'Norway', code: 'nor' },
  '美国': { en: 'USA', code: 'usa' },
  '比利时': { en: 'Belgium', code: 'bel' },
  '瑞士': { en: 'Switzerland', code: 'sui' },
  '奥地利': { en: 'Austria', code: 'aut' },
  '波兰': { en: 'Poland', code: 'pol' },
  '捷克': { en: 'Czechia', code: 'cze' },
  '土耳其': { en: 'Türkiye', code: 'tur' },
  '澳大利亚': { en: 'Australia', code: 'aus' },
  '摩洛哥': { en: 'Morocco', code: 'mor' },
  '塞内加尔': { en: 'Senegal', code: 'sen' },
  '阿尔及利亚': { en: 'Algeria', code: 'alg' },
  '科特迪瓦': { en: 'Ivory Coast', code: 'civ' },
  '喀麦隆': { en: 'Cameroon', code: 'crm' },
  '马里': { en: 'Mali', code: 'mli' },
  '尼日利亚': { en: 'Nigeria', code: 'nga' },
  '乌克兰': { en: 'Ukraine', code: 'ukr' },
  '俄罗斯': { en: 'Russia', code: 'rus' },
  '冰岛': { en: 'Iceland', code: 'isl' },
  '苏格兰': { en: 'Scotland', code: 'sco' },
  '希腊': { en: 'Greece', code: 'gre' },
  '哥伦比亚': { en: 'Colombia', code: 'col' },
  '加拿大': { en: 'Canada', code: 'can' },
  '波黑': { en: 'Bosnia and Herzegovina', code: 'bih' },
  '韩国': { en: 'South Korea', code: 'kors' },
  '日本': { en: 'Japan', code: 'jpn' },
};

module.exports = { COUNTRY_MAP };
