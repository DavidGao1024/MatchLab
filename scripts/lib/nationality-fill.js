/**
 * 球员国籍补齐纯逻辑（零依赖、无网络）
 *
 * 用途：对 ESPN 缺 citizenship 的球员，用懂球帝给的中文国名，
 * 经 country-map.js 码表转成英文国名 + 本地国旗路径。
 *
 * 键匹配策略（candidateKeys）：
 *   1. 原名原序
 *   2. 去重音变体（NFD 分解去掉组合音符）
 *   3. 反序变体（西方序 ↔ 中国序，姓挪到末尾）
 *   4. 反序 + 去重音
 */
'use strict';

const { localFlagPath } = require('./flag-map');

function deaccent(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function reversed(s) {
  const p = String(s).trim().split(/\s+/);
  if (p.length < 2) return null;
  return [...p.slice(1), p[0]].join(' ');
}

function candidateKeys(name) {
  if (!name) return [];
  const keys = [name];
  const da = deaccent(name);
  if (da !== name) keys.push(da);
  const rev = reversed(name);
  if (rev) {
    keys.push(rev);
    const rda = deaccent(rev);
    if (rda !== rev) keys.push(rda);
  }
  return keys;
}

function lookupZh(names, natMap) {
  for (const n of names || []) {
    for (const k of candidateKeys(n)) {
      if (natMap && natMap[k]) return natMap[k];
    }
  }
  return null;
}

function resolveFill(names, natMap, countryMap) {
  const zh = lookupZh(names, natMap);
  if (!zh) return null;
  const m = countryMap && countryMap[zh];
  if (!m || !m.code) return null;
  const citizenship = m.en || zh;
  return { citizenship, flag: localFlagPath(citizenship) };
}

module.exports = { deaccent, reversed, candidateKeys, lookupZh, resolveFill };
