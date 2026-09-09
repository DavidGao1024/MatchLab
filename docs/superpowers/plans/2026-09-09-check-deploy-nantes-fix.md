# 体检红灯治理 + GH 部署解耦 + 南特案勘误 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **军令备注**：提交/推送时机以总司令当次指令为准（本仓库铁律：commit 前请示、push 必等明确命令）。

**Goal:** 根治「体检永久红灯 → GH Pages 部署被跳 → 静态数据冻结」连环伤：体检脚本跳过勘误在案场次、deploy 接力不再看 Fetch Data 脸色、南特中断场入勘误表 ack 在案。

**Architecture:** 勘误表从 `src/utils/standings.ts` 内联对象迁到 `src/utils/match-fixes.json`（前端 vite JSON import + 脚本 fs 读同一文件，单一事实源）；体检跳过逻辑落 `scripts/lib/suspicious-checks.js` 纯函数（可单测）；deploy.yml 删 conclusion 闸门恢复「体检红不阻塞部署」原设计。

**Tech Stack:** 零依赖 Node 脚本（CommonJS）+ Vue 3/TS strict 前端 + vitest + GitHub Actions YAML。

**背景实锤（2026-09-09 查岗 Fetch Data #41 取证）：**
1. `check-suspicious-matches.js` 不读勘误表 → 辽宁 raw 错（`401861543`，前端已勘误 3-2、raw 永 0-0 标胜者）每次必报 → **Fetch Data 自 08-31 起次次红**（#39/#40/#41 实锤 failure）
2. `deploy.yml:27` 的 `if:` 闸门：workflow_run 接力仅在 Fetch Data conclusion=success 时部署 → 连红连跳 → **GH Pages 静态数据冻结 9+ 天**（与 check 脚本头部「不阻塞部署」设计意图相反；10-01 九月转历史月文件将暴露缺数）
3. 南特-图卢兹 `fra.1/2026-05` eventId `746714`：raw `status=post, completed=false, clock=22', period=1` = **比赛中断快照从未更新**；前端 normalizeEvent 看 completed=false 已排除（榜单安全），但体检指纹 2 永久报它

**受影响接口盘点（数据结构/API 不变铁律核对）：** 静态 JSON 数据文件零改动；`match-fixes.json` 是新增代码配置文件（非 public/data）；`MatchFix` 接口增可选字段属前端内部契约扩展；deploy.yml 仅删条件行。

---

### Task 1: 南特案 summary 取证（只读调查，产出 ack 注记文本）

**Files:** 无修改（只读）

- [ ] **Step 1: 拉 summary 看有无事件/阵容**

Run:

```bash
node -e "
const { fetchJson, UA_CURL } = require('./scripts/lib/http');
fetchJson('https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/summary?event=746714', { ua: UA_CURL })
  .then(s => {
    const ke = Array.isArray(s.keyEvents) ? s.keyEvents.length : 0;
    const rosters = Array.isArray(s.rosters) ? s.rosters : [];
    const players = rosters.reduce((n, r) => n + (Array.isArray(r && r.roster) ? r.roster.length : 0), 0);
    console.log('keyEvents:', ke, '| roster players:', players);
    console.log('hasBoxscore:', !!s.boxscore);
  }).catch(e => console.log('FETCH_FAIL', e.message));
"
```

Expected: 输出三类之一——① keyEvents>0 或 players>0（真踢过 22 分钟后中断）② 全 0 空壳（幽灵快照）。**无论哪种，处置路线不变**（raw completed=false 前端已排除，榜单安全；缺的只是让体检闭嘴的 ack 在案记录），取证结果写进 Step 2 的 ack note 文本。

- [ ] **Step 2: 定格 ack note 文本**

按取证结果二选一写进后续 Task 4 的 JSON 条目 `note` 字段：
- 真踢过：`"2026-05-17 比赛中断于 22'（summary 有 N 事件/M 球员实证），ESPN 从未更新终场；前端按 completed=false 排除榜单安全；ack 在案防体检永久红"`
- 空壳：`"2026-05-17 场次 summary 空壳（疑赛前取消/延期），ESPN 状态 post 未清理；前端按 completed=false 排除榜单安全；ack 在案防体检永久红"`

**本 Task 无代码改动、无提交。**

---

### Task 2: 勘误表迁共享 JSON（单一事实源）

**Files:**
- Create: `src/utils/match-fixes.json`
- Modify: `src/utils/standings.ts:51-61`（MatchFix 接口 + ESPN_MATCH_FIXES 内联对象）
- Modify: `tsconfig.app.json`（compilerOptions 加 resolveJsonModule）
- Test: `tests/utils/standings.test.ts`（存量 applyMatchFixes 用例必须零回归）

- [ ] **Step 1: 建 JSON 文件**

`src/utils/match-fixes.json`：

```json
{
  "401861543": {
    "score": { "home": 3, "away": 2 },
    "note": "2026-05-29 中超第15轮 辽宁铁人 3-2 上海海港（央视/新华社/腾讯实录），ESPN 误记 0-0（比分无源可推，唯一人工比分条目）"
  }
}
```

- [ ] **Step 2: 改 standings.ts**

`src/utils/standings.ts` 第 51-61 行整段替换为（接口增 `ack?`/`note?` 两可选字段；表改 JSON import）：

```ts
/** ESPN 源数据勘误（按 eventId）。上游修正后删除对应条目；表体在 match-fixes.json（脚本体检同读） */
export interface MatchFix {
  score?: { home: number; away: number }
  void?: boolean
  /** 仅注记在案：不改数据，只让体检脚本跳过（中断/取消场等前端已天然排除的 raw 怪态） */
  ack?: boolean
  note?: string
}

import matchFixesJson from './match-fixes.json'
export const ESPN_MATCH_FIXES = matchFixesJson as Record<string, MatchFix>
```

（import 语句位置若与文件既有 import 区风格冲突，移到文件顶部 import 区，保持 `export const` 在原位。）

- [ ] **Step 3: tsconfig 开 JSON 模块**

`tsconfig.app.json` 的 `compilerOptions` 内加一行：

```json
"resolveJsonModule": true,
```

- [ ] **Step 4: 跑存量测试 + typecheck + build 确认零回归**

Run: `npx vitest run tests/utils/standings.test.ts && npm run typecheck && npm run build`
Expected: 全绿/零错/构建成功（存量用例含对 ESPN_MATCH_FIXES 的动态插删 test-void，JSON import 的对象运行时可 mutate，应照常通过）

- [ ] **Step 5: 提交节奏听令（军令备注）**

```bash
git add src/utils/match-fixes.json src/utils/standings.ts tsconfig.app.json
git commit -m "refactor(fixes): 勘误表迁 match-fixes.json 单一事实源（前端与体检脚本同读）"
```

---

### Task 3: 体检脚本跳过勘误在案场次（TDD）

**Files:**
- Modify: `scripts/lib/suspicious-checks.js`（追加 filterKnownFixes）
- Modify: `scripts/check-suspicious-matches.js:57-69`（读 JSON + 接入跳过）
- Test: `tests/scripts/check-suspicious-matches.test.ts`（追加 describe）

- [ ] **Step 1: 写失败测试**

`tests/scripts/check-suspicious-matches.test.ts` 顶部 require 行补 `filterKnownFixes`（该文件用 `createRequire` 载 lib，沿用），末尾追加：

```ts
describe('filterKnownFixes（勘误在案跳过）', () => {
  const fixes = { '401861543': { score: { home: 3, away: 2 }, note: '辽宁案' } }
  it('在案 eventId 被跳过，其余保留', () => {
    const known = match({ eventId: '401861543', home: { id: 1, name: 'H', score: 0, winner: true }, away: { id: 2, name: 'A', score: 0, winner: null } })
    const fresh = match({ eventId: 'x9', home: { id: 3, name: 'H2', score: 1, winner: true }, away: { id: 4, name: 'A2', score: 1, winner: null } })
    const { kept, skipped } = filterKnownFixes([entry(known), entry(fresh)], fixes)
    expect(skipped).toHaveLength(1)
    expect(skipped[0].match.eventId).toBe('401861543')
    expect(kept).toHaveLength(1)
    expect(kept[0].match.eventId).toBe('x9')
  })
  it('空勘误表全保留', () => {
    const { kept, skipped } = filterKnownFixes([entry(match())], {})
    expect(kept).toHaveLength(1)
    expect(skipped).toEqual([])
  })
  it('串联指纹：在案辽宁 raw 不再报 tied-but-winner', () => {
    const raw = match({ eventId: '401861543', home: { id: 1, name: 'H', score: 0, winner: true }, away: { id: 2, name: 'A', score: 0, winner: null } })
    const { kept } = filterKnownFixes([entry(raw)], fixes)
    expect(findWinnerConflicts(kept)).toEqual([])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/scripts/check-suspicious-matches.test.ts`
Expected: FAIL（filterKnownFixes is not a function / not exported）

- [ ] **Step 3: 实现 lib 纯函数**

`scripts/lib/suspicious-checks.js` 的 `module.exports` 前追加：

```js
/**
 * 跳过勘误在案场次（2026-09-09 治理体检永久红）：fixes 表里的 eventId 一律不体检。
 * 在案场次已是人工确认过的 raw 怪态，再报只会磨钝红灯警觉；真新伤不受影响。
 * @param {{league:string, month:string, match:object}[]} entries
 * @param {Record<string, object>} fixes 勘误表（src/utils/match-fixes.json 同构）
 * @returns {{kept:object[], skipped:object[]}}
 */
function filterKnownFixes(entries, fixes) {
  const kept = [];
  const skipped = [];
  for (const e of entries) {
    (fixes && e.match && fixes[e.match.eventId] ? skipped : kept).push(e);
  }
  return { kept, skipped };
}
```

并把 `module.exports` 行改为：

```js
module.exports = { findWinnerConflicts, findPostNotCompleted, isGhostSummary, filterKnownFixes };
```

- [ ] **Step 4: 体检主脚本接入**

`scripts/check-suspicious-matches.js`：顶部 require 区追加 `const { findWinnerConflicts, findPostNotCompleted, isGhostSummary, filterKnownFixes } = require('./lib/suspicious-checks');`（替换原 require 行）；main() 内第 58 行 `const entries = collectEntries(slug);` 之后插入：

```js
    const FIXES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'match-fixes.json'), 'utf8'));
    const { kept, skipped } = filterKnownFixes(entries, FIXES);
    if (skipped.length) console.log(`  · 勘误在案跳过 ${skipped.length} 场：${skipped.map((e) => e.match.eventId).join(',')}`);
```

并把其后两处 `entries` 用法（第 59-60 行指纹、第 62 行日志的场次计数、第 65 行 zeroZero 过滤）全部改用 `kept`（日志场次计数同时打印 `在案 ${skipped.length}`）。**FIXES 读取移到 main() 外模块级一次读**（别放循环里）：顶部 `const FIXES = JSON.parse(...)` 模块级常量，循环内只用。

- [ ] **Step 5: 跑测试确认通过 + 本地全联赛体检复验**

Run: `npx vitest run tests/scripts/check-suspicious-matches.test.ts`
Expected: PASS
Run: `node scripts/check-suspicious-matches.js`（联网，约 1 分钟）
Expected: 辽宁不再报；**南特仍报**（ack 条目 Task 4 才写）；exit 1

- [ ] **Step 6: 提交节奏听令**

```bash
git add scripts/lib/suspicious-checks.js scripts/check-suspicious-matches.js tests/scripts/check-suspicious-matches.test.ts
git commit -m "fix(check): 体检跳过勘误在案场次（根治辽宁永久红灯）"
```

---

### Task 4: 南特案 ack 入表 + ack 语义测试（TDD）

**Files:**
- Modify: `src/utils/match-fixes.json`（追加 746714 条目）
- Modify: `src/utils/standings.ts:64-86`（applyMatchFixes 对 ack-only 条目原样透传——核实无需改代码则只加测试）
- Test: `tests/utils/standings.test.ts`（追加 ack 用例）

- [ ] **Step 1: 写失败测试**

`tests/utils/standings.test.ts` 的 applyMatchFixes describe 内追加：

```ts
  it('ack-only 条目：数据原样透传不改写', () => {
    ;(ESPN_MATCH_FIXES as Record<string, unknown>)['test-ack'] = { ack: true, note: '中断场在案' }
    try {
      const pre = fix({ eventId: 'test-ack', status: 'post', completed: false, home: { id: 1, name: 'H', score: 0, winner: null }, away: { id: 2, name: 'A', score: 0, winner: null } })
      const [m] = applyMatchFixes([pre])
      expect(m.completed).toBe(false)
      expect(m.home.score).toBe(0)
    } finally {
      delete (ESPN_MATCH_FIXES as Record<string, unknown>)['test-ack']
    }
  })
```

- [ ] **Step 2: 跑测试确认行为**

Run: `npx vitest run tests/utils/standings.test.ts`
Expected: 若现实现已对无 score/void 条目透传则直接 PASS（ack 语义天然成立）→ 跳 Step 3 实现；若 FAIL 则在 applyMatchFixes 的 `if (f.score)` 分支链确认 ack-only 走 `out.push(m)` 透传路径（应本就走，核实即可）

- [ ] **Step 3: 南特条目入 JSON**

`src/utils/match-fixes.json` 追加（note 文本用 Task 1 Step 2 定格版）：

```json
  "746714": {
    "ack": true,
    "note": "<Task 1 定格文本>"
  }
```

- [ ] **Step 4: 本地体检复验全绿**

Run: `node scripts/check-suspicious-matches.js`
Expected: `✅ 体检通过`、exit 0（辽宁+南特均在案跳过，六联赛零新伤）

- [ ] **Step 5: 提交节奏听令**

```bash
git add src/utils/match-fixes.json tests/utils/standings.test.ts src/utils/standings.ts
git commit -m "data(fixes): 南特-图卢兹中断场 ack 入勘误表（体检全绿）"
```

---

### Task 5: deploy.yml 删 conclusion 闸门（恢复「体检红不阻塞部署」）

**Files:**
- Modify: `.github/workflows/deploy.yml:26-27`

- [ ] **Step 1: 删闸门改注释**

第 26-27 行替换为：

```yaml
  build:
    # 2026-09-09 解耦：接力部署不再看 Fetch Data conclusion——体检红灯是「喊人勘误」的警报，
    # 不是部署闸门（数据提交步在体检步之前，红时数据已入库）；与 check 脚本头部「不阻塞部署」设计对齐
    runs-on: ubuntu-latest
```

（即删除 `if: ${{ github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success' }}` 一行。）

- [ ] **Step 2: YAML 语法自检**

Run: `node -e "const s=require('fs').readFileSync('.github/workflows/deploy.yml','utf8'); if(!/runs-on: ubuntu-latest/.test(s)) throw new Error('bad'); console.log('yaml ok', s.split('\n').length, 'lines')"`
Expected: `yaml ok ...`（本仓零依赖无 yaml 解析器，结构目视 +  grep 自检；真验证在 Task 6 的 Actions 实跑）

- [ ] **Step 3: 提交节奏听令**

```bash
git add .github/workflows/deploy.yml
git commit -m "fix(ci): deploy 接力解耦 Fetch Data 结论（体检红不阻塞部署，根治 GH 数据冻结）"
```

---

### Task 6: 全量回归 + 上线验证闭环

**Files:** 无新改动

- [ ] **Step 1: 三关回归**

Run: `npx vitest run && npm run typecheck && npm run build`
Expected: 单测全绿（393 + Task 3/4 新增 ≈ 397±）、typecheck 零错、build 成功

- [ ] **Step 2: 提交/推送听令后触发 Fetch Data**

总司令下 push 令 → push → Actions 页手动触发 Fetch Data（或等定时）→ 观察：
- 「Check ESPN data consistency」步 **绿**（exit 0，跳过日志显示辽宁+南特在案）
- 「Deploy to GitHub Pages」workflow_run 接力 **conclusion success**（不再 skipped）

- [ ] **Step 3: GH 站数据复测**

Run:

```bash
curl -s https://davidgao1024.github.io/MatchLab/data/eng.1/players/index.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const f=JSON.parse(s);console.log('updateTime:',f.updateTime,'| jersey:',f.players.filter(p=>p.jersey!=null).length+'/'+f.players.length)})"
```

Expected: updateTime = 当日、jersey 覆盖 >0（GH 部署链复活 + 号码双站齐）

- [ ] **Step 4: 浏览器抽测 GH 站阵容页号码**（需开窗许可）

`https://davidgao1024.github.io/MatchLab/#/eng.1/team/359` → 阵容页签 → 号码列与 CF 站一致；测毕恢复窗口 ≥1024

- [ ] **Step 5: 关单汇报**

汇报三伤治愈实锤（体检绿 / 部署接力 success / GH 数据追平），任务 #8 关单。

---

## Self-Review 结论

**规格覆盖**：三伤各一 Task（永久红→Task 2+3、部署跳→Task 5、南特→Task 1+4），验证闭环 Task 6；无遗漏要求。
**占位符扫描**：Task 1 Step 2 的 note 文本为「二选一定格」非占位（取证后必填其一，执行者不得留 `<...>` 原样）；其余步骤代码全量给出。
**类型一致性**：`filterKnownFixes` 签名 Task 3 测试与实现一致（`{kept, skipped}`）；`MatchFix.ack/note` Task 2 定义、Task 4 使用一致；JSON 路径 `src/utils/match-fixes.json` 三处引用一致。
**已知风险**：① Task 2 JSON import 后存量测试对 ESPN_MATCH_FIXES 的 mutate 依赖对象可变性（JSON import 运行时为普通对象，应无恙，Step 4 实证）② Task 5 无本地 YAML 解析器，真验证靠 Actions 首跑（若 YAML 错会立刻红，回滚单行即可）③ 10-01 九月转历史月文件是 GH 冻结的最后暴露 deadline，本计划宜在其前落地。
