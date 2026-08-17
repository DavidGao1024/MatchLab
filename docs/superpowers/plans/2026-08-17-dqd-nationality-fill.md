# 球员国籍懂球帝补齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 ESPN 缺 `citizenship`/`flag` 的球员（中超为主，约 252 人），用懂球帝 `base_info.nationality` 在脚本层补齐，落库形态与 ESPN 现有形态一致（英文国名 + ESPN countries CDN 国旗），六联赛统一，前端零改动。

**Architecture:** 三层数据流。① `fetch-dqd-players.js` 抓详情页时顺带产 `public/data/mappings/players-nationality.json`（英文变体→中文国名，手动跑、入库）；② `scripts/lib/country-map.js` 静态表（中文国名→{en,code}）；③ `fetch-espn-core.js` doc 构造时对缺失者查映射补底。补底纯逻辑抽到 `scripts/lib/nationality-fill.js`（CommonJS 纯函数，vitest 用 createRequire 单测）。

**Tech Stack:** 零依赖 Node（CommonJS，仅内置模块）；Vitest（node 环境 + createRequire 加载 CJS）。

**Spec:** `docs/superpowers/specs/2026-08-17-dqd-nationality-fill-design.md`

**施工进度（2026-08-17 完工）**：Task 1–5 全过（子代理驱动+双审）。审查修正两处：韩国码 `kor`→`kors`、中国 en 对齐 ESPN 存量「China PR」。全中超映射 3577 条；中超补后覆盖率 49.2%→**98.4%**（王钰栋等本土球员带中国旗实测）；五大赛 95.7–100%；284 单测全绿+typecheck 零错。待总司令批准提交。

**项目约定（执行者必读）：**
1. 抓取脚本零依赖、请求间隔 ≥200ms、UA 设置（服务端抓 ESPN 用 `UA_CURL`，见 scripts/lib/http.js）。
2. **数据提交**：每联赛 scraped 数据（players/index/teams 等）**不 `git add public/data/`**（每日 Actions 管）；但 `public/data/mappings/players-nationality.json` 属手动维护映射（同 players-zh.json 先例），**单独显式提交**。
3. 本机 `tests/` 用 bash cat/head/grep 可能乱码（SafeNet），一律用 Read/Edit/Write 工具；vitest 可正常读。
4. 测试命令：`npx vitest run <文件>`、`npm test`、`npm run typecheck`。
5. commit 用 HEREDOC，结尾附 `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`。本会话总控约定：commit 前先请示，push 不主动。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `scripts/lib/nationality-fill.js` | 新建 | 补底纯逻辑：名字变体候选键 → 查中文国名 → country-map → {citizenship,flag} |
| `scripts/lib/country-map.js` | 新建 | 静态表 中文国名→{en,code}（code=ESPN countries slug） |
| `tests/scripts/nationality-fill.test.ts` | 新建 | 补底五态单测（createRequire 加载 CJS） |
| `scripts/fetch-dqd-players.js` | 改 | fetchPlayerDetail 带出 nationality；主循环产 players-nationality.json |
| `scripts/fetch-espn-core.js` | 改 | 读映射；doc 构造对缺失者补底 |

---

### Task 1: nationality-fill 纯逻辑 + 单测（TDD）

**Files:**
- Create: `scripts/lib/nationality-fill.js`
- Test: `tests/scripts/nationality-fill.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/scripts/nationality-fill.test.ts`：

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const { resolveFill, lookupZh, candidateKeys } = req('../../scripts/lib/nationality-fill.js')
const { COUNTRY_MAP } = req('../../scripts/lib/country-map.js')

const natMap: Record<string, string> = {
  'Wang Yudong': '中国',
  'Yudong Wang': '中国',
  'Kilian Bevis': '瓜德罗普',
}

describe('nationality-fill', () => {
  it('命中补齐：返回英文国名 + ESPN 旗', () => {
    const r = resolveFill(['Wang Yudong'], natMap, COUNTRY_MAP)
    expect(r).toEqual({ citizenship: 'China', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/chn.png' })
  })

  it('反序变体命中', () => {
    const r = resolveFill(['Yudong Wang'], natMap, COUNTRY_MAP)
    expect(r && r.citizenship).toBe('China')
  })

  it('空表/无映射文件 → null', () => {
    expect(resolveFill(['Wang Yudong'], {}, COUNTRY_MAP)).toBeNull()
  })

  it('键不命中 → null', () => {
    expect(resolveFill(['Somebody Else'], natMap, COUNTRY_MAP)).toBeNull()
  })

  it('国名未映射 → null', () => {
    expect(resolveFill(['Kilian Bevis'], natMap, COUNTRY_MAP)).toBeNull()
  })

  it('candidateKeys 含原序/去重音/反序', () => {
    const keys = candidateKeys('Joël Veltman')
    expect(keys).toContain('Joël Veltman')
    expect(keys).toContain('Joel Veltman')
    expect(keys).toContain('Veltman Joël')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/scripts/nationality-fill.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 nationality-fill.js**

新建 `scripts/lib/nationality-fill.js`：

```js
'use strict';
// 球员国籍补底纯逻辑（零依赖，CommonJS，无网络）
// 懂球帝只提供中文国名；本模块：名字变体查表 → 中文国名 → country-map → {citizenship, flag}

const FLAG_BASE = 'https://a.espncdn.com/i/teamlogos/countries/500/';

function deaccent(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function reversed(s) {
  const p = String(s).trim().split(/\s+/);
  if (p.length < 2) return null;
  return [...p.slice(1), p[0]].join(' ');
}

// 候选查找键（与懂球帝 expandNameVariants 键空间对齐：原序/去重音/反序/反序去重音）
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

// names: [displayName, shortName]；natMap: { 英文变体: 中文国名 } → 中文国名 | null
function lookupZh(names, natMap) {
  for (const n of names || []) {
    for (const k of candidateKeys(n)) {
      if (natMap && natMap[k]) return natMap[k];
    }
  }
  return null;
}

// 返回 { citizenship, flag } | null
function resolveFill(names, natMap, countryMap) {
  const zh = lookupZh(names, natMap);
  if (!zh) return null;
  const m = countryMap && countryMap[zh];
  if (!m || !m.code) return null;
  return { citizenship: m.en || zh, flag: FLAG_BASE + m.code + '.png' };
}

module.exports = { FLAG_BASE, deaccent, reversed, candidateKeys, lookupZh, resolveFill };
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/scripts/nationality-fill.test.ts`
Expected: PASS（6 项）。

- [ ] **Step 5: 提交**

```bash
git add scripts/lib/nationality-fill.js tests/scripts/nationality-fill.test.ts
git commit -m "feat: 国籍补底纯逻辑 nationality-fill + 单测"
```

---

### Task 2: country-map 静态表

**Files:**
- Create: `scripts/lib/country-map.js`

- [ ] **Step 1: 写表**

新建 `scripts/lib/country-map.js`（初版覆盖常见足球国家；code 为 ESPN countries slug，未映射的抓取时警告补表）：

```js
'use strict';
// 中文国名 → { en, code }（code = ESPN countries slug）
// 初版覆盖常见足球国家；未映射的由抓取 console 警告，逐步补表
const COUNTRY_MAP = {
  '中国': { en: 'China', code: 'chn' },
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
  '韩国': { en: 'South Korea', code: 'kor' },
  '日本': { en: 'Japan', code: 'jpn' },
};
module.exports = { COUNTRY_MAP };
```

- [ ] **Step 2: 交叉校验 code（可选，防错码）**

Run（聚合既有 ESPN 数据 en→code，人工比对上表）：

```bash
node -e "const fs=require('fs');const m={};for(const L of ['eng.1','esp.1','ita.1','ger.1','fra.1','chn.1']){try{const j=JSON.parse(fs.readFileSync('public/data/'+L+'/players/index.json','utf8'));for(const p of j.players){if(p.citizenship&&p.flag)m[p.citizenship]=(p.flag.split('/').pop()||'').replace('.png','')}}catch{}}console.log(JSON.stringify(m,null,1))"
```

Expected: 输出 en→code；核对 country-map 各 code 与之一致（chn 已实测 200）。发现不一致就改 country-map。

- [ ] **Step 3: 提交**

```bash
git add scripts/lib/country-map.js
git commit -m "feat: 中文国名→英文/ESPN 国家码映射表"
```

---

### Task 3: fetch-dqd-players 产 players-nationality.json

**Files:**
- Modify: `scripts/fetch-dqd-players.js`

- [ ] **Step 1: fetchPlayerDetail 带出 nationality**

在 `fetch-dqd-players.js` 的 `fetchPlayerDetail` 返回对象（约 122–125 行）加 `nationality`：

```js
  return {
    enName: baseInfo.person_en_name || '',
    cnName: baseInfo.person_name || '',
    nationality: baseInfo.nationality || '',
  }
```

- [ ] **Step 2: 主循环累积 natOut + 落盘**

在 `main()` 顶部 `OUT_PATH` 旁加常量：

```js
const OUT_NAT_PATH = path.join(ROOT, 'public/data/mappings/players-nationality.json')
```

在 `const out = {}`（约 204 行）旁加：

```js
  const natOut = {}
```

在每球员成功块 `expandNameVariants(det.enName, det.cnName, out)`（约 224 行）后加：

```js
          if (det.nationality) expandNameVariants(det.enName, det.nationality, natOut)
```

在写 players-zh 之后（约 248 行后）加落盘 players-nationality.json（合并、已有优先）：

```js
  let existingNat = { players: {} }
  try { existingNat = JSON.parse(fs.readFileSync(OUT_NAT_PATH, 'utf8')) } catch {}
  const mergedNat = { ...natOut, ...(existingNat.players || {}) }
  fs.writeFileSync(OUT_NAT_PATH, JSON.stringify({
    _generated: new Date().toISOString().slice(0, 10),
    _source: '懂球帝球员详情页 base_info.nationality',
    players: mergedNat,
    _totalKeys: Object.keys(mergedNat).length,
  }, null, 2))
  console.log(`国籍映射：${Object.keys(mergedNat).length} 条 → ${OUT_NAT_PATH}`)
```

- [ ] **Step 3: 单队冒烟**

Run: `node scripts/fetch-dqd-players.js 50076899`（浙江队 dqd id，实测可用）
Expected: 日志见 roster N 人、若干译名，结尾打印「国籍映射：N 条」；`public/data/mappings/players-nationality.json` 出现且含中文国名值。

- [ ] **Step 4: 提交（映射单独入库）**

```bash
git add scripts/fetch-dqd-players.js public/data/mappings/players-nationality.json
git commit -m "feat: 懂球帝抓取顺带产球员国籍映射 players-nationality.json"
```

---

### Task 4: fetch-espn-core 集成补底

**Files:**
- Modify: `scripts/fetch-espn-core.js`

- [ ] **Step 1: 顶部加载映射与补底模块**

在 require 区（约 30–31 行）后加：

```js
const { resolveFill } = require('./lib/nationality-fill');
const { COUNTRY_MAP } = require('./lib/country-map');
```

在 `DATA_ROOT` 定义后加读取国籍映射（缺失静默跳过）：

```js
let NAT_MAP = {};
try {
  NAT_MAP = JSON.parse(fs.readFileSync(path.join(DATA_ROOT, 'mappings', 'players-nationality.json'), 'utf8')).players || {};
} catch { /* 无映射文件不补底 */ }
```

- [ ] **Step 2: doc 构造补底**

在 doc 构造（约 292–313 行）前计算 fill，并改写 citizenship/flag 两行：

```js
      const fill = profile.citizenship ? null : resolveFill([profile.displayName, profile.shortName], NAT_MAP, COUNTRY_MAP);
      if (!profile.citizenship && !fill) {
        // 记录未补到底的中文国名/球员，便于补表（仅当有映射但国名未映射时由 resolveFill 内部处理；此处仅调试可选）
      }
      const doc = {
        ...
        citizenship: profile.citizenship ?? (fill ? fill.citizenship : null),
        flag: (profile.flag && profile.flag.href) || (fill ? fill.flag : null),
        ...
      }
```

（保持其余字段不变；`fill` 仅在 `profile.citizenship` 缺失时生效，已有值不覆盖。）

- [ ] **Step 3: 冒烟**

Run: `PLAYERS_LIMIT=30 node scripts/fetch-espn-core.js chn.1`
Expected: 跑完无致命错误；抽查 `public/data/chn.1/players/*.json` 原本缺国籍的中国球员现带 `citizenship:"China"`、`flag:".../chn.png"`。

- [ ] **Step 4: 提交（仅脚本，不含数据）**

```bash
git add scripts/fetch-espn-core.js
git commit -m "feat: espn-core 对缺国籍球员用懂球帝映射补底"
```

注意：`public/data/chn.1/` 冒烟改动**不 add**，Task 5 验证后还原。

---

### Task 5: 离线覆盖率验证 + 还原

**Files:** 无新增（只读验证）

- [ ] **Step 1: 离线统计补底命中率（不跑网络）**

Run：

```bash
node -e "const fs=require('fs');const {resolveFill}=require('./scripts/lib/nationality-fill.js');const {COUNTRY_MAP}=require('./scripts/lib/country-map.js');const nat=JSON.parse(fs.readFileSync('public/data/mappings/players-nationality.json','utf8')).players;const idx=JSON.parse(fs.readFileSync('public/data/chn.1/players/index.json','utf8')).players;const miss=idx.filter(p=>!p.citizenship);const filled=miss.filter(p=>resolveFill([p.name],nat,COUNTRY_MAP));console.log('中超缺',miss.length,'可补',filled.length,'补后覆盖率',((idx.length-miss.length+filled.length)/idx.length*100).toFixed(1)+'%')"
```

Expected: 「可补」数显著（预期 ≥200/252），补后覆盖率 ≥90%。若过低，回 Task 2/3 补表或查键命中。

- [ ] **Step 2: 五大赛抽查（可选）**

同上命令改 `chn.1` 为 `esp.1`/`ita.1` 等，确认缺者也能部分补齐。

- [ ] **Step 3: 还原冒烟数据**

Run: `git checkout -- public/data/chn.1 public/data/eng.1 public/data/esp.1 public/data/ita.1 public/data/ger.1 public/data/fra.1`
Expected: `git status` 仅剩代码与 mappings 改动。

- [ ] **Step 4: 全量回归**

Run: `npm test && npm run typecheck`
Expected: 全绿（278 + 6 新单测 = 284）、typecheck 无错。

- [ ] **Step 5: 汇报**

向总司令汇报：补底命中率、补后覆盖率、未映射国名警告清单（补表线索）。线上生效需提交 push 后由 Actions 跑新脚本。

---

## 计划自查

- **Spec 覆盖**：三层数据流→Task1–4；测试五态→Task1；dqd 冒烟→Task3；espn 补底→Task4；e2e 覆盖率→Task5；前端/Actions 零改动→全文未涉及；不展示双重国籍→fetchPlayerDetail 只取 nationality。✓
- **占位符**：无 TBD/TODO，代码步均含完整代码。✓
- **类型一致**：resolveFill/lookupZh/candidateKeys/COUNTRY_MAP 命名跨 Task 一致。✓
