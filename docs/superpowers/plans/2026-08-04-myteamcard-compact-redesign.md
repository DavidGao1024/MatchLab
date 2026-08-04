# MyTeamCard 紧凑重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MyTeamCard 重写为紧凑版（单卡满宽时 4 段横排，多卡并排时纵向堆叠），HomeView 订阅区容器改为响应式 grid 横排多卡。

**Architecture:** 一套模板自适应。卡内 `compact-grid` 用 CSS Grid `grid-template-columns: 1.4fr 1fr 1fr auto`，720px 媒体查询阈值切换为单列。父容器（HomeView 订阅区）用 Tailwind `grid md:grid-cols-2 lg:grid-cols-3` 控制几卡并排。删除"最近 3 场"明细列表及相关 `recentMatches` ref + `scoreLine/matchTone/formatDateShort` 函数。

**Tech Stack:** Vue 3 `<script setup>` + TS strict + Tailwind 4 + scoped CSS + Vitest + @vue/test-utils

参考 spec：`docs/superpowers/specs/2026-08-04-myteamcard-compact-redesign-design.md`

---

## 文件结构

| 文件 | 责任 |
|---|---|
| `src/components/home/MyTeamCard.vue` | 紧凑卡组件：模板重写 + 样式重写 + script 删除 4 项死代码 |
| `src/views/HomeView.vue` | 订阅区容器 grid 横排 |
| `tests/components/MyTeamCard.test.ts` | 测试同步：class 名 `.wide-card` → `.compact-card`，删除 vs-row 相关断言 |

---

### Task 1: 同步测试断言到新 class 名（先红）

让测试先失败，暴露需要改的 class 名与删除的断言。

**Files:**
- Modify: `tests/components/MyTeamCard.test.ts`

- [ ] **Step 1: 改 wide-card → compact-card，删除 vs-row 相关测试**

打开 `tests/components/MyTeamCard.test.ts`，做以下替换：

1. 全文替换 `.wide-card` → `.compact-card`（出现 2 次：line 178, 197 附近的 `expect(html).toMatch(/wide-card/)`）

2. 全文替换 describe 标题 `'MyTeamCard wide 模式（1 队订阅）'` → `'MyTeamCard 紧凑模式（1 队订阅）'`

3. 全文替换 describe 标题 `'MyTeamCard 多队订阅仍用 wide 模式（每卡拉宽占满）'` → `'MyTeamCard 多队订阅（每卡仍渲染紧凑结构）'`

4. 删除整个 describe 块 `'MyTeamCard vs 行 mine/opp 高亮 + WDL tone'`（line 220-252），因为 "最近 3 场" 明细列表将被删除，`.name.mine` / `.name.opp` / `.vs-score.w` 选择器不再存在

- [ ] **Step 2: 跑测试，确认失败**

Run: `npm test -- --run tests/components/MyTeamCard.test.ts`
Expected: FAIL — `expect(html).toMatch(/compact-card/)` 失败（当前组件仍是 `.wide-card`）

- [ ] **Step 3: Commit**

```bash
git add tests/components/MyTeamCard.test.ts
git commit -m "test: MyTeamCard 测试同步到紧凑版 class 名 + 删除 vs-row 断言"
```

---

### Task 2: 重写 MyTeamCard 模板（紧凑版 4 段）

把模板从 wide 3 列 grid 改为 compact 4 段 grid，class 全部重命名。

**Files:**
- Modify: `src/components/home/MyTeamCard.vue` （`<template>` 整段 + `<style scoped>` 整段）

- [ ] **Step 1: 替换 `<template>` 整段**

打开 `src/components/home/MyTeamCard.vue`，把 `<template>` 块（从 line 173 `<template>` 到对应 `</template>`）整段替换为：

```vue
<template>
  <article
    :style="{ '--team-color': teamColor }"
    class="compact-card"
  >
    <div v-if="loading" class="p-4 text-sm text-slate-500">加载中...</div>
    <div v-else-if="error" class="p-4 text-sm text-red-400">{{ error }}</div>
    <div v-else class="compact-body">
      <header class="compact-header">
        <span class="tag">订阅主队</span>
        <span class="league">{{ leagueDisplayName }}</span>
        <h3
          class="team-name"
          role="button"
          tabindex="0"
          @click="goTeam"
          @keydown.enter="goTeam"
          @keydown.space.prevent="goTeam"
        >{{ displayName(subscription.teamName) }}</h3>
        <div v-if="standing" class="rank-badge">
          <span class="num">{{ standing.rank }}</span>
          <span class="of">/ {{ (standings.rows[subscription.league] ?? []).length || 20 }}</span>
        </div>
      </header>

      <div class="compact-grid">
        <section class="hero-block">
          <div v-if="todayMatch?.status === 'in'" class="hero-meta">
            <span class="live-dot live"></span>进行中 · {{ todayMatch.clock ?? '—' }}
          </div>
          <div v-else-if="todayMatch" class="hero-meta">
            <span class="live-dot"></span>今日 · {{ formatKickoff(todayMatch.date) }}
          </div>
          <div v-else-if="nextMatch" class="hero-meta">
            <span class="next-dot"></span>下场 · {{ formatKickoff(nextMatch.date) }}
          </div>
          <div v-else class="hero-meta">赛季已结束{{ standing ? ` · 最终第 ${standing.rank} 名` : '' }}</div>

          <div v-if="todayMatch || nextMatch" class="hero-matchup">
            <div class="hero-side left">
              <span class="hero-abbr">{{ displayName((todayMatch ?? nextMatch)!.home.name) }}</span>
              <TeamLogo :team="teamFor((todayMatch ?? nextMatch)!.home)" :size="26" />
            </div>
            <div class="hero-vs">VS</div>
            <div class="hero-side right">
              <TeamLogo :team="teamFor((todayMatch ?? nextMatch)!.away)" :size="26" />
              <span class="hero-abbr">{{ displayName((todayMatch ?? nextMatch)!.away.name) }}</span>
            </div>
          </div>

          <div v-if="todayMatch?.status === 'in'" class="kickoff-row">
            <span>进行中 <span class="kickoff-time">{{ todayMatch.home.score ?? 0 }} - {{ todayMatch.away.score ?? 0 }}</span></span>
            <span class="countdown">{{ todayMatch.clock ?? '—' }}</span>
          </div>
          <div v-else-if="todayMatch || nextMatch" class="kickoff-row">
            <span>开球 <span class="kickoff-time">{{ formatKickoffTime((todayMatch ?? nextMatch)!.date) }}</span></span>
            <span class="countdown">{{ formatCountdown((todayMatch ?? nextMatch)!.date) }}</span>
          </div>
          <div v-if="todayMatch || nextMatch" class="venue-row">◉ {{ (todayMatch ?? nextMatch)!.venue || '—' }}</div>
        </section>

        <section class="stats-block">
          <div class="section-label">赛季战绩</div>
          <div v-if="standing" class="wdl">
            <div class="wdl-cell wdl-w"><div class="wdl-label">W</div><div class="wdl-val">{{ standing.won }}</div></div>
            <div class="wdl-cell wdl-d"><div class="wdl-label">D</div><div class="wdl-val">{{ standing.drawn }}</div></div>
            <div class="wdl-cell wdl-l"><div class="wdl-label">L</div><div class="wdl-val">{{ standing.lost }}</div></div>
          </div>
          <div v-else class="wdl-skeleton">—</div>
          <div v-if="standing" class="points-row">
            <span class="points-label">积分</span>
            <span class="points-val">{{ standing.points }}</span>
          </div>
          <div v-if="standing && standing.form?.length" class="form-row">
            <div class="section-label">最近 5 场</div>
            <div class="form-pills">
              <span v-for="(f, i) in standing.form" :key="i" :class="`pill ${f.toLowerCase()}`">{{ f }}</span>
            </div>
          </div>
        </section>

        <section class="gf-ga-block">
          <div class="section-label">攻防</div>
          <div v-if="standing" class="gf-ga">
            <div class="gf-ga-cell"><span class="gf-ga-label">GF</span><span class="gf-ga-val">{{ standing.goalsFor }}</span></div>
            <div class="gf-ga-cell"><span class="gf-ga-label">GA</span><span class="gf-ga-val">{{ standing.goalsAgainst }}</span></div>
          </div>
          <div v-if="injuries.length" class="inj-block">
            <span class="inj-label">伤员</span>
            <span class="inj-names">{{ injuries.join(' · ') }}</span>
          </div>
        </section>

        <section v-if="footerMatch" class="next-block">
          <div class="next-label">下场</div>
          <div class="next-match">{{ displayName(footerMatch.home.name) }} vs {{ displayName(footerMatch.away.name) }}</div>
          <div class="next-meta">{{ formatDateLong(footerMatch.date) }}</div>
          <div class="next-venue">◉ {{ footerMatch.venue || '—' }}</div>
        </section>
        <section v-else class="next-block">
          <div class="next-label">下场</div>
          <div class="next-match skeleton">无再下场</div>
        </section>
      </div>
    </div>
  </article>
</template>
```

- [ ] **Step 2: 替换 `<style scoped>` 整段**

把 `<style scoped>` 块（line 308 起）整段替换为：

```css
.compact-card {
  background: linear-gradient(180deg, color-mix(in srgb, var(--team-color) 16%, #10152a), #10152a);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.compact-body { display: flex; flex-direction: column; }

.compact-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--team-color) 25%, transparent);
}
.tag {
  border: 1px solid color-mix(in srgb, var(--team-color) 60%, transparent);
  color: color-mix(in srgb, var(--team-color) 75%, white);
  padding: 3px 8px; border-radius: 4px;
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  letter-spacing: 0.22em; text-transform: uppercase;
}
.league {
  font-family: var(--font-mono-d, monospace); font-size: 10px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.18em;
}
.team-name {
  font-family: var(--font-cond, sans-serif);
  font-size: 22px; letter-spacing: 0.02em;
  color: #fff; cursor: pointer; margin: 0;
}
.rank-badge {
  margin-left: auto;
  background: color-mix(in srgb, var(--team-color) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--team-color) 45%, transparent);
  border-radius: 6px; padding: 5px 11px;
  font-family: var(--font-cond, sans-serif);
  display: flex; align-items: baseline; gap: 5px;
}
.rank-badge .num { font-size: 18px; color: #fff; font-weight: 600; }
.rank-badge .of { font-size: 10px; color: var(--slate-400, #94a3b8); letter-spacing: 0.12em; }

.compact-grid {
  display: grid; grid-template-columns: 1.4fr 1fr 1fr auto;
  gap: 12px; padding: 12px 16px;
}
@media (max-width: 720px) {
  .compact-grid { grid-template-columns: 1fr; }
}

.hero-block {
  background: rgba(0,0,0,0.32);
  border: 1px solid color-mix(in srgb, var(--team-color) 35%, transparent);
  border-radius: 8px; padding: 10px 12px;
}
.hero-meta {
  font-family: var(--font-mono-d, monospace); font-size: 10px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.22em; text-transform: uppercase;
}
.live-dot, .next-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  margin-right: 6px; vertical-align: middle;
}
.live-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
.live-dot.live { background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: pulse 1.2s ease-in-out infinite; }
.next-dot { background: var(--team-color); }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.hero-matchup {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-top: 8px;
}
.hero-side { display: flex; align-items: center; gap: 8px; }
.hero-side.left { justify-content: flex-end; }
.hero-side.right { justify-content: flex-start; }
.hero-abbr { font-family: var(--font-cond, sans-serif); font-size: 16px; letter-spacing: 0.04em; color: #fff; }
.hero-vs { font-family: var(--font-cond, sans-serif); font-size: 12px; color: var(--slate-500, #64748b); }
.kickoff-row {
  margin-top: 10px; padding-top: 8px;
  border-top: 1px dashed rgba(255,255,255,0.08);
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  font-family: var(--font-mono-d, monospace); font-size: 10px;
  color: var(--slate-400, #94a3b8); letter-spacing: 0.12em;
}
.kickoff-time { color: #fff; font-weight: 600; font-size: 11px; }
.countdown {
  font-family: var(--font-cond, sans-serif); font-size: 16px;
  color: var(--team-color); letter-spacing: 0.06em; font-weight: 600;
}
.venue-row {
  margin-top: 4px;
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: var(--slate-500, #64748b); letter-spacing: 0.12em;
}

.section-label {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: var(--slate-500, #64748b); letter-spacing: 0.22em; text-transform: uppercase;
  margin-bottom: 5px;
}

.stats-block { display: flex; flex-direction: column; }
.wdl {
  display: flex; gap: 4px;
  font-family: var(--font-mono-d, monospace);
}
.wdl-cell {
  flex: 1;
  background: rgba(255,255,255,0.03); border-radius: 4px; padding: 5px 7px;
  border: 1px solid rgba(255,255,255,0.04); text-align: center;
}
.wdl-label { font-size: 9px; color: var(--slate-500, #64748b); letter-spacing: 0.18em; }
.wdl-val { font-size: 14px; font-weight: 600; margin-top: 1px; color: #fff; }
.wdl-w .wdl-val { color: #10b981; }
.wdl-d .wdl-val { color: #cbd5e1; }
.wdl-l .wdl-val { color: #ef4444; }
.wdl-skeleton { color: var(--slate-600, #475569); padding: 8px; text-align: center; }
.points-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-top: 6px; padding: 5px 7px;
  background: color-mix(in srgb, var(--team-color) 10%, transparent);
  border-radius: 4px;
}
.points-label { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-400, #94a3b8); letter-spacing: 0.18em; text-transform: uppercase; }
.points-val { font-family: var(--font-cond, sans-serif); font-size: 18px; color: var(--team-color); font-weight: 600; }
.form-row { margin-top: 6px; }
.form-pills { display: flex; gap: 3px; }
.pill {
  width: 16px; height: 16px; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono-d, monospace); font-size: 9px; font-weight: 600;
}
.pill.w { background: rgba(16,185,129,0.18); color: #10b981; }
.pill.d { background: rgba(148,163,184,0.15); color: #cbd5e1; }
.pill.l { background: rgba(239,68,68,0.18); color: #ef4444; }

.gf-ga-block { display: flex; flex-direction: column; }
.gf-ga {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5px;
  font-family: var(--font-mono-d, monospace); font-size: 11px;
}
.gf-ga-cell {
  background: rgba(255,255,255,0.03); padding: 5px 7px; border-radius: 4px;
  display: flex; justify-content: space-between; align-items: baseline;
}
.gf-ga-label { color: var(--slate-500, #64748b); font-size: 9px; letter-spacing: 0.18em; }
.gf-ga-val { color: #fff; font-weight: 600; font-size: 13px; }
.inj-block {
  margin-top: 6px;
  border-left: 3px solid #ef4444; padding-left: 7px;
  font-size: 10px; color: #fca5a5;
  display: flex; align-items: center; gap: 6px;
}
.inj-label {
  font-family: var(--font-mono-d, monospace); font-size: 9px;
  color: #ef4444; letter-spacing: 0.22em; text-transform: uppercase;
}

.next-block {
  background: rgba(0,0,0,0.22); border-radius: 8px; padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.05);
  display: flex; flex-direction: column; justify-content: center;
  min-width: 120px;
}
.next-label { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-500, #64748b); letter-spacing: 0.22em; text-transform: uppercase; }
.next-match { font-family: var(--font-cond, sans-serif); font-size: 14px; color: #fff; letter-spacing: 0.04em; margin-top: 2px; }
.next-match.skeleton { color: var(--slate-500, #64748b); }
.next-meta { font-family: var(--font-mono-d, monospace); font-size: 9px; color: var(--slate-400, #94a3b8); margin-top: 2px; letter-spacing: 0.12em; }
.next-venue { margin-top: 3px; font-family: var(--font-mono-d, monospace); font-size: 8px; color: var(--slate-500, #64748b); letter-spacing: 0.18em; }
```

- [ ] **Step 3: 跑测试**

Run: `npm test -- --run tests/components/MyTeamCard.test.ts`
Expected: PASS — class 名匹配 `.compact-card`、`.wdl-cell`、`.points-row`、`.form-pills .pill`、`.gf-ga-cell`、`.wdl-skeleton` 都还在；vs-row 测试已删除。

- [ ] **Step 4: typecheck**

Run: `npm run typecheck`
Expected: PASS（template 引用的 `footerMatch`、`teamFor`、`formatDateLong` 等都在 script setup 中存在；删除的 `recentMatches`、`scoreLine`、`matchTone`、`formatDateShort` 在 template 中已无引用，但 script 中尚存 → 会报 unused warning 但不阻塞 typecheck；下个 Task 清理）

注：若 typecheck 报错 "Cannot find name 'X'"，说明 template 引用了已删除的变量/函数，回头检查 Step 1 模板是否完整替换。

- [ ] **Step 5: Commit**

```bash
git add src/components/home/MyTeamCard.vue
git commit -m "feat: MyTeamCard 重写为紧凑版（4 段 grid 自适应）"
```

---

### Task 3: 删除 script 死代码

模板已不再引用 `recentMatches` / `scoreLine` / `matchTone` / `formatDateShort`，从 script setup 中删除。

**Files:**
- Modify: `src/components/home/MyTeamCard.vue` （`<script setup>` 部分）

- [ ] **Step 1: 删除 4 项死代码**

打开 `src/components/home/MyTeamCard.vue`，在 `<script setup>` 中删除以下 4 段：

1. `recentMatches` ref 声明（约 line 21）：
   ```ts
   const recentMatches = ref<Match[]>([])
   ```

2. `load()` 函数中的 `recentMatches.value = ...` 赋值（约 line 76-79）：
   ```ts
   const past = teamMatches.filter((m) =>
     new Date(m.date) < now && m.eventId !== todayMatch.value?.eventId
   )
   recentMatches.value = past.slice(-3).reverse()
   ```

3. `scoreLine` 函数（约 line 117-122）：
   ```ts
   function scoreLine(m: Match): string {
     if (m.home.score != null && m.away.score != null) {
       return `${m.home.score}-${m.away.score}`
     }
     return 'vs'
   }
   ```

4. `matchTone` 函数（约 line 124-134，含 `type Tone = 'w' | 'd' | 'l' | 'none'` 类型别名）：
   ```ts
   type Tone = 'w' | 'd' | 'l' | 'none'
   function matchTone(m: Match): Tone {
     // ... 整个函数体
   }
   ```

5. `formatDateShort` 函数（约 line 159-162）：
   ```ts
   function formatDateShort(iso: string): string {
     const d = new Date(iso)
     return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
   }
   ```

注意：**保留** `recentMatches` 之外的所有 ref、所有 computed、所有其他函数（`goTeam`、`displayName`、`teamFor`、`formatCountdown`、`formatKickoff`、`formatKickoffTime`、`formatDateLong`）。

- [ ] **Step 2: typecheck + test**

Run: `npm run typecheck && npm test -- --run tests/components/MyTeamCard.test.ts`
Expected: PASS — 无 unused 报错，测试仍全绿（删除的函数没有测试覆盖）。

- [ ] **Step 3: Commit**

```bash
git add src/components/home/MyTeamCard.vue
git commit -m "refactor: MyTeamCard 删除 recentMatches/scoreLine/matchTone/formatDateShort 死代码"
```

---

### Task 4: HomeView 订阅区容器改 grid 横排

**Files:**
- Modify: `src/views/HomeView.vue:118-124`

- [ ] **Step 1: 改容器 class**

打开 `src/views/HomeView.vue`，找到订阅区多卡渲染部分（约 line 118）：

```vue
        <div v-else class="flex flex-col gap-3">
          <MyTeamCard
            v-for="sub in userStore.subscriptions"
            :key="sub.teamId"
            :subscription="sub"
          />
        </div>
```

替换为：

```vue
        <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <MyTeamCard
            v-for="sub in userStore.subscriptions"
            :key="sub.teamId"
            :subscription="sub"
          />
        </div>
```

注：去掉 `v-else`（因为外层 `v-if="userStore.subscriptions.length === 0"` 已处理空态，此处不需 else 分支）；class 改 `grid gap-3 md:grid-cols-2 lg:grid-cols-3` —— 1 卡满宽、md+ 两卡并排、lg+ 三卡并排、移动端单列竖排。

- [ ] **Step 2: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS — 0 errors，dist 生成。

- [ ] **Step 3: Commit**

```bash
git add src/views/HomeView.vue
git commit -m "feat: HomeView 订阅区改 grid 横排（桌面多卡并排 / 移动竖排）"
```

---

### Task 5: 浏览器手测三种订阅状态 × 两宽度

**Files:**
- 无文件改动，仅手动验证

- [ ] **Step 1: 启动 dev server**

Run: `npm run dev`
打开浏览器访问 Vite 提示的本地 URL（通常 `http://localhost:5173/MatchLab/`）

- [ ] **Step 2: 1 订阅场景**

在 devtools 中执行（任意一队订阅）：
```js
localStorage.setItem('matchlab:subscriptions', '{"version":1,"value":[{"league":"eng.1","teamId":359,"teamName":"Arsenal"}]}')
location.reload()
```
Expected:
- 桌面（>1024px）：MyTeamCard 占满整行宽，内部 4 段横向并排（hero | 战绩 | 攻防 | 下场）
- 移动模拟（devtools toggle device toolbar，< 768px）：卡内 4 段纵向堆叠

- [ ] **Step 3: 2 订阅场景**

devtools 执行：
```js
localStorage.setItem('matchlab:subscriptions', '{"version":1,"value":[{"league":"eng.1","teamId":359,"teamName":"Arsenal"},{"league":"eng.1","teamId":362,"teamName":"Aston Villa"}]}')
location.reload()
```
Expected:
- 桌面（≥768px）：两张卡并排等宽
- 移动（< 768px）：两张卡纵向堆叠

- [ ] **Step 4: 3 订阅场景**

devtools 执行：
```js
localStorage.setItem('matchlab:subscriptions', '{"version":1,"value":[{"league":"eng.1","teamId":359,"teamName":"Arsenal"},{"league":"eng.1","teamId":362,"teamName":"Aston Villa"},{"league":"eng.1","teamId":349,"teamName":"AFC Bournemouth"}]}')
location.reload()
```
Expected:
- 桌面（≥1024px）：三张卡并排等宽
- 平板（768-1023px）：两张并排 + 第三张换行
- 移动（< 768px）：三张纵向堆叠

- [ ] **Step 5: 清理 localStorage**

devtools 执行：
```js
localStorage.removeItem('matchlab:subscriptions')
location.reload()
```

- [ ] **Step 6: 记录手测结果到 commit message（无代码改动则跳过 commit）**

若所有场景流畅通过，无需 commit。若发现问题，回到对应 Task 修复后再 commit。

---

## Self-Review

**Spec coverage:**
- spec §3 容器布局 → Task 4 ✓
- spec §4 内部 grid 4 段 → Task 2 Step 1 ✓
- spec §4 删除项（recentMatches/scoreLine/matchTone/formatDateShort）→ Task 3 ✓
- spec §4 保留项 → Task 2 模板保留 ✓
- spec §6 测试 → Task 1 同步 + Task 2 验证 + Task 5 手测 ✓
- spec §7 风险 → 720px 媒体查询在 Task 2 Step 2 CSS 中 ✓

**Placeholder scan:** 无 TBD/TODO，所有 step 含具体代码或命令。✓

**Type consistency:**
- `Subscription` props 类型不变 ✓
- `Match` / `Team` / `StandingRow` 类型引用一致 ✓
- 删除的函数 `scoreLine`/`matchTone`/`formatDateShort` 在保留的 template 中无引用 ✓
- 保留的 `footerMatch` computed 仍在 template 中用 ✓

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-04-myteamcard-compact-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
