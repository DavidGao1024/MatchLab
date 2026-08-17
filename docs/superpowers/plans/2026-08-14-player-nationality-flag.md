# 球员国籍国旗 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 抓取脚本补 `citizenship`/`flag` 两字段，前端六处展示位（球员列表 PC+移动、球员详情、球队阵容、搜索下拉、对比页）名字前显示国旗。

**Architecture:** 数据从 ESPN core 球员档案现成字段取（不加请求），存进球员档案与索引两类静态文件；前端新增 `NationFlag` 小组件（热链 ESPN 图、失败隐藏），索引经 players store 透传（含 MiniSearch 白名单），档案经 profile 透传。旧数据无字段时全链路静默降级。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript strict + Pinia + Vitest + @vue/test-utils；抓取脚本零依赖 CommonJS（仅 Node 内置模块）。

**设计稿：** `docs/superpowers/specs/2026-08-14-player-nationality-flag-design.md`

---

## 施工进度（2026-08-17 会话更新）

| Task | 状态 | 提交 | 备注 |
|---|---|---|---|
| 1 NationFlag 组件 | ✅ 完工，双审通过 | `47bb2b3` | 5 项测试绿 |
| 2 类型+store 透传+MiniSearch 白名单 | ✅ 完工，双审通过 | `5c2dc73` | 5 项测试绿 |
| 3 球员列表两处插旗 | ✅ 完工，双审通过，待提交 | — | 08-14 三条遗留顺手项已并入（null 对称用例/profileFile 四字段/NationFlag 注释） |
| 4 详情页+阵容插旗 | ✅ 完工，双审通过，待提交 | — | 两条 Minor（imgs[1] title/source 值）并入 Task 5 |
| 5 搜索+对比页插旗 | ✅ 完工，双审通过，待提交 | — | 两条 Minor（indexFile 五字段/width 断言）并入 Task 6 |
| 6 抓取脚本+冒烟 | ✅ 完工，双审+整体终审通过，待提交 | — | 冒烟 406 请求/0 失败/10 人 10 旗；两条 Minor（移动卡按钮内断言/CompareView mock 补字段）已并入；冒烟副作用：stale 清理删 eng.1 其余 651 份档案+索引缩至 10 条（预期内，手测后还原） |
| 7 全量验收+手测+还原 | ✅ 完工，待提交 | — | 278 全绿+typecheck 零错+build 通过+整体终审「可以入库」；08-17 总司令许可浏览器手测九项全过；`git checkout -- public/data/` 已还原 |

**测试账目**：起点 262 + 计划新增 15（组件 5/store 5/列表 2/阵容 1/对比 2）+ Task 3 附加 null 对称用例 1 = **278**。

**手测结论（2026-08-17 总司令许可浏览器，localhost:5173 实测全过）**：
- ①英超列表 PC 表格 10/10 有旗 + 375px 移动卡有旗 ②详情页 h1 内 24px 旗、title=Türkiye ③布莱顿阵容 10 旗全在名字按钮内 16px ④顶栏搜索英文 Veltman/中文「邓克」下拉皆有旗 ⑤对比页候选行 + PC 表头 + 移动卡有旗（双 DOM 两旗 375px 仅一可见）⑥中英切换旗在、文字无残留 ⑦西甲旧数据 0 旗、控制台 0 报错 ⑧视口已恢复 1280 ⑨`git checkout -- public/data/` 已还原（还原后布莱顿 31 人/阿森纳 36 人阵容齐全，实证见下条）。截图存证 `tmp/manual-test/`（草稿不入库）。
- 手测中总司令两度报「球队阵容没人/不全」——查明为冒烟态预期副作用（stale 清理删 651 份档案）叠加浏览器 localStorage 1h 索引缓存；还原 + 清站点数据后恢复。**教训：本地冒烟改 public/data 的可见影响须提前主动告知总司令**（已录记忆）。
- 同日总司令复测报「西甲/中超没旗」——系还原后数据无国籍字段（新脚本未入库，Actions 未跑）。经批准本地全量跑新脚本补三联赛带旗数据：eng.1 661/661、esp.1 577/603、chn.1 245/498（中超覆盖率低系 ESPN 源缺国籍数据，无旗静默降级）；浏览器实测西甲首屏 48/50 有旗、中超 45/50 有旗（截图 tmp/manual-test/03-csl-flags.jpeg）。此数据仅本地不入库；线上显旗仍需提交 + Actions。
- 总司令再令「自测其他联赛」，本地全量跑 ita.1/ger.1/fra.1（0 失败）：ita.1 678/684（99.1%）、ger.1 559/564（99.1%）、fra.1 598/608（98.4%）；浏览器实测意甲首屏 50/50、德甲 49/50（个别 ESPN 缺国籍静默降级）、法甲 50/50 全有旗。至此六联赛本地全部显旗验证完毕。
- 提交方案待总司令批准：计划原为每 Task 一提交，但顺手项跨任务交织（players.test.ts 等五个测试文件跨 Task 复改），按任务硬拆需块级暂存，建议合并为三提交（前端六展示位一提交/脚本一提交/文档进度一提交）。
- 只记不修观察项：①CompareView 双 DOM 用例 imgs[1] title 未断（组件级测试已补位）②中文分支无国籍球员无直接用例（间接闭合）③TeamSquad 的 NationFlag import 位置风格小异（无 lint 强制）④脚本 `citizenship ?? null` 不拦空串（ESPN 实测无此形态）。
- 工作区遗留：`tmp/scan-zh.cjs` 未跟踪旧文件，与本功能无关，未动；提交只 add `src/ scripts/ tests/ docs/`，严禁 `public/data/`（冒烟态入库会把线上打成 10 人版）；push 一律不主动。

## 项目约定（执行者必读）

1. **数据提交铁律**：任何 commit 一律显式 `git add src/ scripts/ tests/ docs/` 等代码路径，**绝不 `git add public/data/`**（数据由每日 Actions 管）。不 push。
2. **本机加密层警告**：`tests/` 下文件用 bash `cat`/`head`/`grep` 读可能出乱码（SafeNet 透明加密），**一律用 Read/Edit/Write 工具操作文件**；vitest 能正常读到，跑测试不受影响。
3. 测试命令：`npm test`（vitest run 全量）、`npx vitest run <文件>`（单文件）；类型检查 `npm run typecheck`；构建 `npm run build`。
4. 现有测试基线 272 项全绿（Task 2 完工后；起点 262），每个 Task 结束时必须保持全绿（加上新增用例）。
5. 浏览器手测**须先获总司令许可**；375px 移动视口用完恢复窗口宽度 ≥1024。
6. commit 信息用 HEREDOC 传递，结尾附 `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`（计划里为省篇幅只写正文）。

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/components/common/NationFlag.vue` | 新建 | 国旗渲染组件：热链 + 懒加载 + 无链接不渲染 + 失败隐藏 |
| `tests/components/NationFlag.test.ts` | 新建 | 组件五态测试 |
| `src/types/static.ts` | 改 | `PlayerFile`/`PlayerIndexEntry` 加可选 `citizenship`/`flag` |
| `src/types/models.ts` | 改 | `PlayerSummary`/`PlayerProfile` 加同两可选字段 |
| `src/stores/players.ts` | 改 | `toSummary`/`toProfile` 透传 + MiniSearch 四处白名单 |
| `tests/stores/players.test.ts` | 改 | 透传与白名单测试 |
| `src/views/PlayersView.vue` | 改 | PC 表格名字前插旗 |
| `src/components/players/PlayerListCardMobile.vue` | 改 | 移动卡片名字前插旗 |
| `tests/views/PlayersView.test.ts`、`tests/components/PlayerListCardMobile.test.ts` | 改 | 插旗断言 |
| `src/views/PlayerDetailView.vue` | 改 | 头部大字前插旗（24px） |
| `src/components/teams/TeamSquad.vue` | 改 | 阵容名字前插旗 |
| `tests/views/TeamDetailView.test.ts` | 改 | 阵容插旗断言 |
| `src/components/common/SearchBar.vue` | 改 | 搜索下拉名字前插旗 |
| `src/views/CompareView.vue` | 改 | 候选下拉 + PC 表头插旗 |
| `src/components/players/ComparePlayerCardMobile.vue` | 改 | 移动对比卡名字前插旗 |
| `tests/views/CompareView.test.ts`、`tests/components/ComparePlayerCardMobile.test.ts` | 改 | 插旗断言 |
| `scripts/fetch-espn-core.js` | 改 | doc 与 index 各补两字段 |

---

### Task 1: NationFlag 组件（TDD）

**Files:**
- Create: `src/components/common/NationFlag.vue`
- Test: `tests/components/NationFlag.test.ts`

- [x] **Step 1: 写失败测试**

新建 `tests/components/NationFlag.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NationFlag from '../../src/components/common/NationFlag.vue'

const FLAG = 'https://a.espncdn.com/i/teamlogos/countries/500/eng.png'

describe('NationFlag', () => {
  it('有旗链接渲染 img，title/alt 为国名', () => {
    const w = mount(NationFlag, { props: { flag: FLAG, citizenship: 'England' } })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(FLAG)
    expect(img.attributes('title')).toBe('England')
    expect(img.attributes('alt')).toBe('England')
  })

  it('无旗链接（null / 缺省）什么都不渲染', () => {
    const w1 = mount(NationFlag, { props: { flag: null, citizenship: 'England' } })
    expect(w1.find('img').exists()).toBe(false)
    expect(w1.text()).toBe('')
    const w2 = mount(NationFlag)
    expect(w2.find('img').exists()).toBe(false)
  })

  it('加载失败后隐藏', async () => {
    const w = mount(NationFlag, { props: { flag: FLAG, citizenship: 'England' } })
    await w.find('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
  })

  it('旗链接变化时重置失败态', async () => {
    const w = mount(NationFlag, { props: { flag: 'https://x/a.png', citizenship: 'A' } })
    await w.find('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
    await w.setProps({ flag: FLAG, citizenship: 'England' })
    expect(w.find('img').exists()).toBe(true)
  })

  it('尺寸跟随 size，默认 16', () => {
    const w1 = mount(NationFlag, { props: { flag: FLAG, citizenship: 'England' } })
    expect(w1.find('img').attributes('width')).toBe('16')
    const w2 = mount(NationFlag, { props: { flag: FLAG, citizenship: 'England', size: 24 } })
    expect(w2.find('img').attributes('width')).toBe('24')
    expect(w2.find('img').attributes('height')).toBe('24')
  })
})
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/components/NationFlag.test.ts`
Expected: FAIL——`NationFlag.vue` 不存在，导入报错

- [x] **Step 3: 实现组件**

新建 `src/components/common/NationFlag.vue`（模式参照 `TeamLogo.vue`，降级更简：失败即隐藏，不做兜底牌）：

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  flag?: string | null
  citizenship?: string | null
  size?: number
}>(), { flag: null, citizenship: null, size: 16 })

const failed = ref(false)
watch(() => props.flag, () => { failed.value = false })
</script>

<template>
  <img
    v-if="flag && !failed"
    :src="flag"
    :alt="citizenship ?? ''"
    :title="citizenship ?? ''"
    loading="lazy"
    :width="size"
    :height="size"
    class="rounded-full object-contain shrink-0 inline-block align-middle"
    @error="failed = true"
  />
</template>
```

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/components/NationFlag.test.ts`
Expected: PASS（5 项）

- [x] **Step 5: 提交**

```bash
git add src/components/common/NationFlag.vue tests/components/NationFlag.test.ts
git commit -m "feat: 国旗组件 NationFlag——ESPN 图热链 + 失败隐藏"
```

---

### Task 2: 类型 + store 透传 + MiniSearch 白名单（TDD）

**Files:**
- Modify: `src/types/static.ts`（`PlayerIndexEntry` 约 120–129 行、`PlayerFile` 约 148–167 行）
- Modify: `src/types/models.ts`（`PlayerSummary` 约 102–110 行、`PlayerProfile` 约 114–129 行）
- Modify: `src/stores/players.ts`（`SearchDoc` 13–24 行、`toSummary` 26–37 行、`toProfile` 39–56 行、`storeFields` 79 行、`addAll` 82–95 行、`search()` 130–139 行）
- Test: `tests/stores/players.test.ts`

- [x] **Step 1: 写失败测试**

改 `tests/stores/players.test.ts`：

（a）把顶部 `indexFile` 的前两条加上国籍字段，第三条保持无字段（充当旧数据用例）：

```ts
const indexFile = {
  players: [
    { id: 11, name: 'Mohamed Salah', teamId: 14, team: 'Liverpool', position: 'F', age: 34, goals: 7, assists: 5, citizenship: 'Egypt', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/egy.png' },
    { id: 22, name: 'Virgil van Dijk', teamId: 14, team: 'Liverpool', position: 'D', age: 33, goals: 1, assists: 0, citizenship: 'Netherlands', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/ned.png' },
    { id: 33, name: 'Zh Testson', teamId: 14, team: 'Liverpool', position: 'M', age: 20, goals: 0, assists: 0 },
  ],
}
```

（b）`indexFile` 下面加档案 mock：

```ts
const profileFile = {
  id: 11, displayName: 'Mohamed Salah', age: 34, height: 175, weight: 72,
  jersey: 11, position: 'F', teamId: 14, stats: { general: {} },
  citizenship: 'Egypt', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/egy.png',
}
```

（c）`beforeEach` 的 mock 实现里，`/players/index.json` 分支之后加档案分支：

```ts
    if (String(url).includes('/players/11.json')) {
      return { ok: true, json: async () => profileFile }
    }
```

（d）文件末尾追加新 describe：

```ts
describe('国籍字段透传', () => {
  it('ensureIndex 带出 citizenship/flag', async () => {
    const s = usePlayersStore()
    const list = await s.ensureIndex('eng.1', '2025')
    const salah = list.find((p) => p.id === 11)
    expect(salah?.citizenship).toBe('Egypt')
    expect(salah?.flag).toBe('https://a.espncdn.com/i/teamlogos/countries/500/egy.png')
  })

  it('旧数据无国籍字段不报错（undefined）', async () => {
    const s = usePlayersStore()
    const list = await s.ensureIndex('eng.1', '2025')
    const t = list.find((p) => p.id === 33)
    expect(t?.citizenship).toBeUndefined()
    expect(t?.flag).toBeUndefined()
  })

  it('英文搜索结果带出 citizenship/flag（MiniSearch 白名单）', async () => {
    const s = usePlayersStore()
    await s.ensureIndex('eng.1', '2025')
    const hits = s.search('eng.1', 'Sala')
    expect(hits[0].citizenship).toBe('Egypt')
    expect(hits[0].flag).toContain('egy.png')
  })

  it('中文搜索结果带出 citizenship/flag（索引数组分支）', async () => {
    const s = usePlayersStore()
    await s.ensureIndex('eng.1', '2025')
    const hits = s.search('eng.1', '范迪')
    expect(hits[0].citizenship).toBe('Netherlands')
  })

  it('ensureProfile 带出 citizenship/flag', async () => {
    const s = usePlayersStore()
    const p = await s.ensureProfile('eng.1', 11, '2025')
    expect(p.citizenship).toBe('Egypt')
    expect(p.flag).toContain('egy.png')
  })
})
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/stores/players.test.ts`
Expected: FAIL——新用例断言 undefined ≠ 'Egypt'（旧三项用例仍绿）

- [x] **Step 3: 类型加字段**

`src/types/static.ts`——`PlayerIndexEntry` 末尾（`team: string` 之后）加：

```ts
  citizenship?: string | null
  flag?: string | null
```

`PlayerFile` 的 `teamId: number` 之后、`stats` 之前加同样两行。

`src/types/models.ts`——`PlayerSummary`（`assists` 行之后）与 `PlayerProfile`（`stats` 行之后）各加同样两行。

- [x] **Step 4: store 透传 + 白名单**

`src/stores/players.ts`：

（a）`SearchDoc` 接口末尾加：

```ts
  citizenship: string | null
  flag: string | null
```

（b）`toSummary` 返回对象加：

```ts
    citizenship: p.citizenship,
    flag: p.flag,
```

（c）`toProfile` 返回对象加：

```ts
    citizenship: f.citizenship,
    flag: f.flag,
```

（d）`storeFields` 清单追加两项：

```ts
          storeFields: ['id', 'name', 'teamId', 'team', 'position', 'age', 'goals', 'assists', 'citizenship', 'flag'],
```

（e）`addAll` 文档构造（`assists: p.assists,` 之后）加：

```ts
            citizenship: p.citizenship ?? null,
            flag: p.flag ?? null,
```

（f）`search()` 非中文分支返回映射（`assists: r.assists,` 之后）加：

```ts
        citizenship: r.citizenship ?? null,
        flag: r.flag ?? null,
```

- [x] **Step 5: 跑测试与类型检查确认通过**

Run: `npx vitest run tests/stores/players.test.ts && npm run typecheck`
Expected: 全 PASS，typecheck 无错

- [x] **Step 6: 提交**

```bash
git add src/types/static.ts src/types/models.ts src/stores/players.ts tests/stores/players.test.ts
git commit -m "feat: 球员索引/档案透传国籍字段——含 MiniSearch 白名单四处"
```

---

### Task 3: 球员列表两处插旗（PlayersView PC 表格 + 移动卡片）

**Files:**
- Modify: `src/views/PlayersView.vue`（script import + 名单单元格约 153–156 行）
- Modify: `src/components/players/PlayerListCardMobile.vue`（import + 头行约 32–37 行）
- Test: `tests/views/PlayersView.test.ts`、`tests/components/PlayerListCardMobile.test.ts`

- [ ] **Step 1: 写失败测试**

（a）`tests/views/PlayersView.test.ts`——`setup()` 里注入的索引条目（`players.indexes['eng.1']`）加两字段：

```ts
  players.indexes['eng.1'] = [{
    id: 253989, name: 'Erling Haaland', teamId: 503, team: 'Manchester City',
    position: 'F', age: 25, goals: 14, assists: 2,
    citizenship: 'Norway', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/nor.png',
  }] as any
```

describe 里追加用例（双 DOM：PC 表格 + 移动卡各一面旗，TeamLogo 因 logo 为空走首字圆牌不产 img，恰好 2 张）：

```ts
  it('球员名前渲染国旗（PC 表格 + 移动卡双 DOM）', async () => {
    const { w } = await setup()
    const imgs = w.findAll('img[src*="nor.png"]')
    expect(imgs.length).toBe(2)
    expect(imgs[0].attributes('title')).toBe('Norway')
  })
```

（b）`tests/components/PlayerListCardMobile.test.ts`——describe 里追加：

```ts
  it('有国籍时名字前渲染国旗', () => {
    const w = mount(PlayerListCardMobile, {
      props: {
        player: makePlayer({ citizenship: 'Norway', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/nor.png' }),
        team: makeTeam(), rank: 1, lang: 'zh',
      },
    })
    const img = w.find('img[src*="nor.png"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('title')).toBe('Norway')
  })
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/views/PlayersView.test.ts tests/components/PlayerListCardMobile.test.ts`
Expected: 新用例 FAIL（找不到 nor.png），旧用例仍绿

- [ ] **Step 3: 插旗实现**

（a）`src/views/PlayersView.vue`——script 区 import 区加：

```ts
import NationFlag from '../components/common/NationFlag.vue'
```

PC 表格名单单元格（`<td class="py-2 px-2">`，inline 布局无 gap，用 `mr-1` 留 4px）：

```vue
              <td class="py-2 px-2">
                <NationFlag :flag="p.flag" :citizenship="p.citizenship" :size="16" class="mr-1" />
                <span class="text-white">{{ playerName(p.name, app.lang) }}</span>
                <span class="text-slate-500 text-xs ml-2">{{ teamName(p.team, app.lang) }}</span>
              </td>
```

（b）`src/components/players/PlayerListCardMobile.vue`——script 区加：

```ts
import NationFlag from '../common/NationFlag.vue'
```

头行 flex（gap-2 自带间隙），`TeamLogo` 与名字之间插入：

```vue
      <TeamLogo :team="team" :size="20" />
      <NationFlag :flag="player.flag" :citizenship="player.citizenship" :size="16" />
      <span class="text-white font-cond text-sm flex-1 truncate">{{ playerName(player.name, lang) }}</span>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/views/PlayersView.test.ts tests/components/PlayerListCardMobile.test.ts`
Expected: 全 PASS

- [ ] **Step 5: 提交**

```bash
git add src/views/PlayersView.vue src/components/players/PlayerListCardMobile.vue tests/views/PlayersView.test.ts tests/components/PlayerListCardMobile.test.ts
git commit -m "feat: 球员列表名字前加国旗（PC 表格 + 移动卡）"
```

---

### Task 4: 球员详情页 + 球队阵容插旗

**Files:**
- Modify: `src/views/PlayerDetailView.vue`（import + 头部 h1 约 103 行）
- Modify: `src/components/teams/TeamSquad.vue`（import + 球员行约 56 行）
- Test: `tests/views/TeamDetailView.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/views/TeamDetailView.test.ts` 末尾追加（该文件 `setup(team, squad)` 支持注入阵容，`makePlayer` 的 over 参数接住新字段；球队 logo 为空走圆牌、页头旗面是 CSS 渐变不是 img，nor/eng 图断言无歧义）：

```ts
describe('球队阵容·国旗', () => {
  it('阵容球员有国籍时名字前渲染国旗', async () => {
    const w = await setup(makeTeam(), [makePlayer({ citizenship: 'England', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/eng.png' })])
    const img = w.find('img[src*="eng.png"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('title')).toBe('England')
  })
})
```

（球员详情页无现成视图测试文件，该处靠 typecheck + Task 7 手测覆盖。）

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/views/TeamDetailView.test.ts`
Expected: 新用例 FAIL，旧用例仍绿

- [ ] **Step 3: 插旗实现**

（a）`src/views/PlayerDetailView.vue`——script 区加：

```ts
import NationFlag from '../components/common/NationFlag.vue'
```

头部大字（h1 为 truncate 块，img 内联在前；24px 配大字，`mr-1.5` 留 6px）：

```vue
            <h1 class="font-cond text-3xl font-semibold text-white truncate">
              <NationFlag :flag="profile.flag" :citizenship="profile.citizenship" :size="24" class="mr-1.5" />{{ displayName }}
            </h1>
```

（b）`src/components/teams/TeamSquad.vue`——script 区加：

```ts
import NationFlag from '../common/NationFlag.vue'
```

球员行（button 为 flex gap-3），名字 span 前插入：

```vue
          <NationFlag :flag="p.flag" :citizenship="p.citizenship" :size="16" />
          <span class="text-white text-sm flex-1 truncate">{{ playerName(p.name, app.lang) }}</span>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/views/TeamDetailView.test.ts && npm run typecheck`
Expected: 全 PASS，typecheck 无错

- [ ] **Step 5: 提交**

```bash
git add src/views/PlayerDetailView.vue src/components/teams/TeamSquad.vue tests/views/TeamDetailView.test.ts
git commit -m "feat: 球员详情页与球队阵容名字前加国旗"
```

---

### Task 5: 搜索下拉 + 对比页插旗

**Files:**
- Modify: `src/components/common/SearchBar.vue`（import + 球员行约 153–155 行）
- Modify: `src/views/CompareView.vue`（import + 候选下拉约 174–176 行 + PC 表头按钮约 195–197 行）
- Modify: `src/components/players/ComparePlayerCardMobile.vue`（import + 名字按钮约 57–63 行）
- Test: `tests/views/CompareView.test.ts`、`tests/components/ComparePlayerCardMobile.test.ts`

- [ ] **Step 1: 写失败测试**

（a）`tests/views/CompareView.test.ts`——顶部 `mockProfile` 对象加两字段：

```ts
  citizenship: 'Norway',
  flag: 'https://a.espncdn.com/i/teamlogos/countries/500/nor.png',
```

describe 里追加（mockProfile 同时喂 PC 表头与移动卡，双 DOM 恰好 2 张；队徽 logo 为空走圆牌）：

```ts
  it('已选球员名前渲染国旗（PC 表头 + 移动卡双 DOM）', async () => {
    const { w } = await setup()
    const imgs = w.findAll('img[src*="nor.png"]')
    expect(imgs.length).toBe(2)
    expect(imgs[0].attributes('title')).toBe('Norway')
  })
```

（SearchBar 无专属测试文件，插旗靠 typecheck + Task 7 手测第 4 条覆盖。）

（b）`tests/components/ComparePlayerCardMobile.test.ts`——describe 里追加：

```ts
  it('有国籍时名字前渲染国旗', () => {
    const rows: Row[] = []
    const w = mount(ComparePlayerCardMobile, {
      props: {
        profile: makeProfile({ citizenship: 'Norway', flag: 'https://a.espncdn.com/i/teamlogos/countries/500/nor.png' }),
        team: makeTeam(), rows, playerIndex: 0, lang: 'zh',
      },
    })
    expect(w.find('img[src*="nor.png"]').exists()).toBe(true)
  })
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/views/CompareView.test.ts tests/components/ComparePlayerCardMobile.test.ts`
Expected: 新用例 FAIL，旧用例仍绿

- [ ] **Step 3: 插旗实现**

（a）`src/components/common/SearchBar.vue`——script 区加 `import NationFlag from './NationFlag.vue'`，球员行 position 与名字之间插入：

```vue
          <span class="text-xs font-mono-d text-slate-500 w-4">{{ p.position }}</span>
          <NationFlag :flag="p.flag" :citizenship="p.citizenship" :size="16" />
          <span class="text-sm text-white flex-1 truncate">{{ playerName(p.name, app.lang) }}</span>
```

（b）`src/views/CompareView.vue`——script 区加 `import NationFlag from '../components/common/NationFlag.vue'`。

候选下拉行（flex gap-2）：

```vue
              <span class="text-xs font-mono-d text-slate-500 w-4">{{ r.position }}</span>
              <NationFlag :flag="r.flag" :citizenship="r.citizenship" :size="16" />
              <span class="text-sm text-white flex-1 truncate">{{ playerName(r.name, app.lang) }}</span>
```

PC 表头名字按钮（inline，`mr-1` 留隙）：

```vue
                    <button class="text-xs text-white hover:underline truncate max-w-[100px]" @click="goDetail(p.id)">
                      <NationFlag :flag="p.flag" :citizenship="p.citizenship" :size="16" class="mr-1" />{{ playerName(p.displayName, app.lang) }}
                    </button>
```

（c）`src/components/players/ComparePlayerCardMobile.vue`——script 区加 `import NationFlag from '../common/NationFlag.vue'`，名字按钮内文字前插入：

```vue
      <button
        type="button"
        class="flex-1 truncate text-left text-white font-cond text-sm hover:underline"
        @click="$emit('click')"
      >
        <NationFlag :flag="profile.flag" :citizenship="profile.citizenship" :size="16" class="mr-1" />{{ playerName(profile.displayName, lang) }}
      </button>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run tests/views/CompareView.test.ts tests/components/ComparePlayerCardMobile.test.ts && npm run typecheck`
Expected: 全 PASS，typecheck 无错

- [ ] **Step 5: 提交**

```bash
git add src/components/common/SearchBar.vue src/views/CompareView.vue src/components/players/ComparePlayerCardMobile.vue tests/views/CompareView.test.ts tests/components/ComparePlayerCardMobile.test.ts
git commit -m "feat: 搜索下拉与对比页名字前加国旗"
```

---

### Task 6: 抓取脚本补字段 + 本地冒烟

**Files:**
- Modify: `scripts/fetch-espn-core.js`（doc 构造约 292–311 行、`index.push` 约 319–327 行）

- [ ] **Step 1: 改脚本**

（a）doc 构造处，`teamId,` 之后、`stats` 之前加两行：

```js
        teamId,
        citizenship: profile.citizenship ?? null,
        flag: (profile.flag && profile.flag.href) || null,
        stats: stats || null,
```

（b）`index.push` 里 `assists,` 之后加两行：

```js
      index.push({
        id: doc.id,
        name: doc.displayName,
        teamId: teamId != null ? Number(teamId) : null,
        position,
        age: doc.age,
        goals,
        assists,
        citizenship: doc.citizenship,
        flag: doc.flag,
      });
```

（索引落盘处 `indexWithName` 用 spread 展开，新字段自动带出，无需改。）

- [ ] **Step 2: 本地冒烟跑单联赛（限量 10 人）**

Run: `PLAYERS_LIMIT=10 node scripts/fetch-espn-core.js eng.1`
Expected: 跑完无致命错误，日志见 `[season] eng.1 → …` 与球员进度

- [ ] **Step 3: 验证产物带上新字段**

Run:

```bash
node -e "const j=require('./public/data/eng.1/players/index.json');const w=j.players.filter(p=>p.flag);console.log('索引带旗人数:',w.length);console.log(JSON.stringify(w[0]&&{name:w[0].name,citizenship:w[0].citizenship,flag:w[0].flag}))"
```

Expected: 带旗人数 ≈10，样例打印出英文国名与 `https://a.espncdn.com/i/teamlogos/countries/500/xxx.png`

再抽一份档案：

```bash
node -e "const fs=require('fs');const dir='public/data/eng.1/players';const f=fs.readdirSync(dir).filter(x=>x!=='index.json'&&x.match(/^\d+\.json$/)).slice(0,5);for(const n of f){const j=JSON.parse(fs.readFileSync(dir+'/'+n,'utf8'));console.log(n,j.displayName,'|',j.citizenship,'|',j.flag)}"
```

Expected: 被冒烟更新过的档案打印出国名与旗链接（未被更新的老档案打印 null 属正常）

- [ ] **Step 4: 提交脚本（不含数据）**

```bash
git add scripts/fetch-espn-core.js
git commit -m "feat: 抓取脚本补 citizenship/flag 两字段——每日 Actions 自动补齐"
```

**注意**：`git status` 里 `public/data/` 下一堆改动是冒烟产物，**不 add**。保留到 Task 7 手测用（本地有旗数据才能在浏览器里看到旗），手测完再还原。

---

### Task 7: 全量验收 + 手测 + 数据还原

- [ ] **Step 1: 全量测试 + 类型检查 + 构建**

Run: `npm test && npm run typecheck && npm run build`
Expected: 全部通过；测试总数 277（基线 262——计划原写 234 系旧数，球队主题子项目入库后已增长——加本次新增 15：组件 5 + store 5 + 列表 2 + 阵容 1 + 对比 2）

- [ ] **Step 2: 手测清单（先请示总司令开浏览器）**

起本地 dev：`npm run dev`。冒烟数据只有 eng.1 带旗，用英超验证：

1. 球员列表页（英超）：PC 表格名字前有旗；切 375px 视口，移动卡名字前有旗
2. 点进任一有旗球员详情页：大字名前 24px 旗；悬停出英文国名提示
3. 球队详情页（英超任一队）：阵容名字前有旗
4. 顶栏搜索框搜 "Sala"（英文）与中文译名各一次：下拉结果名字前有旗
5. 对比页：搜索候选行有旗；添加后 PC 表头与移动卡名字前有旗
6. 中英双语切换：旗子渲染一致，文字无残留异常
7. 旧数据容错：打开西甲（esp.1 未冒烟，无旗数据）各同路径页面——不显旗、不报错、布局如常
8. 图裂场景（可选）：DevTools 拦一张国旗图请求，确认旗消失不留空盒
9. 375px 视口用完**恢复窗口宽度 ≥1024**

若本地此前开过站、索引被缓存（store 有 1 小时 TTL），硬刷新（Ctrl+F5）或清站点数据后再看。

- [ ] **Step 3: 还原冒烟数据，保持工作区干净**

冒烟改动的 `public/data/` 不入库（由 Actions 统一补），还原到 HEAD：

Run: `git checkout -- public/data/`
Expected: `git status` 只剩 untracked 的无关文件（如 tmp/ 下旧物）

- [ ] **Step 4: 汇报完工**

向总司令汇报：新增测试数、六展示位手测结果、待线上数据补齐的提示（代码入库后等每日抓取或手动触发 "Fetch Data" 工作流，线上才会显旗）。

---

## 计划自查记录

- **规格覆盖**：数据管线（§三）→ Task 6；类型/store/白名单（§四）→ Task 2；组件（§五）→ Task 1；六展示位（§六）→ Task 3/4/5；降级（§七）→ 各 Task 用例（无旗不渲染/失败隐藏/旧数据 undefined）+ Task 7 手测第 7 条；测试（§八）→ Task 1–5 单测 + Task 7 手测；「明确不做」（§九）→ 未安排任何排行榜/收藏/国名文字任务 ✓
- **占位符扫描**：无 TBD/TODO，所有代码步骤含完整代码 ✓
- **类型一致性**：`citizenship`/`flag` 字段名全链一致；`NationFlag` props（flag/citizenship/size）各 Task 用法一致 ✓
- **双 DOM 断言数字依据**：PlayersView/CompareView 的 `imgs.length === 2` 依赖「队徽 logo 传空串走首字圆牌不产 img」，两份视图测试的 mock 均已满足 ✓
