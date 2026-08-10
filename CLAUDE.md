# MatchLab 项目灵魂档案

> 档案性质：项目级协作规则（**最高权威**，与全局灵魂档案冲突时以本档案为准）
> 全局档案：`~/.claude/global-memory/SOUL.md`
> 建档日期：2026-07-23

## 一、项目画像

- **代号**：MatchLab — 五大联赛（英超/西甲/意甲/德甲/法甲）数据查询网站
- **当前阶段**：Phase 0–6 MVP 完工（2026-07-30 验收）；**子项目 1「个人化基础」（球队订阅 + 收藏夹 + iCal 导出）完工**（2026-07-31 起，2026-08-03 验收通过，25/25 Task + 3 followup 修复，无后端 + localStorage 路径）；**子项目 1.5「MyTeamCard 重设计 v1」完工**（2026-08-03，5 Task TDD + 后续调整，永远 wide 模式 + 与下方等宽）；**子项目 1.6「MyTeamCard 紧凑重设计 v2」完工**（2026-08-04，5 Task TDD + 1 容器查询修复，单卡满宽 4 段横排 / 多卡并排纵向堆叠 / 移动竖排，CSS container query 自适应卡宽）；**子项目 1.7「积分榜移动端兼容」完工**（2026-08-04，3 Task + 1 commit，移动端隐藏次要列 + 行点击展开 grid 次要数据；逐页移动端兼容扫描 9 页，仅积分榜有真问题）；**子项目 1.8「移动端卡片化方案 B（第一批）」代码完工待回归**（2026-08-05，8 Task subagent-driven-development 双关 review，PC 表格字节级未改 / 移动端双 DOM 卡片化 PlayersView+LeadersView+CompareView + AppHeader 搜索图标 + 全屏搜索层，172 单测全绿，375px 手测与 i18n 双语手测待回归）；共 172 单测全绿；施工图纸见 `docs/implementation-plan.md`，子项目 1 计划文档见 `docs/superpowers/plans/2026-07-31-personalization-mvp.md`，MyTeamCard v1 重设计见 `docs/superpowers/plans/2026-08-03-myteamcard-redesign.md`，v2 紧凑重设计见 `docs/superpowers/plans/2026-08-04-myteamcard-compact-redesign.md`，移动端卡片化见 `docs/superpowers/plans/2026-08-05-mobile-cards.md`
- **协作模式**：总司令下令 → 营长执行；全局铁律（未经指令不改码、先汇报后更新、不擅自持久化）全程有效

## 二、军衔记录（本项目独立计算）

| 日期 | 军衔 | 备注 |
|---|---|---|
| 2026-07-23 | 新兵 | 项目建档入伍；完成数据源调研交接、CLAUDE.md 建档 |
| 2026-07-24 | 班长 | 总司令亲批越级晋升（原拟列兵）：同日连克 Phase 0 + Phase 1——脚手架 → 数据管线上线（6339 请求 / 0 失败 / 26 条映射与调研完全吻合）；CORS 实测、Vite 钉版、三源交叉验证数战皆捷 |
| 2026-07-28 | **排长** | 总司令亲批晋升：Phase 2 全链部署上线（积分榜+赛程+首页，48 单测全绿）；同日连克 UI 自适应（flex 撑满+卡片拉伸+宽屏多列）、深色滚动条、中超全链接入（ESPN chn.1 实测→数据管线→前端六联赛→16 队队名→队徽覆盖机制→赛季前扣分计算），49 单测全绿 |
| 2026-07-29 | **连长** | 总司令亲批晋升：Phase 3 比赛详情弹窗主体完工——单页滚动世界杯风（金比分/绿色足球场/球员金边圆牌），阵容按 position 缩写 posOrder/midDepthRank 排序（修复 getFieldXY 副作用 mutate cats 数组导致 for...of 跳项重复迭代 bug），事件时间线 participants 字段对齐 ESPN 实际结构（进球 [射手, 助攻者] / 换人 [入局, 出局]），技术统计精简到 10 项核心；连克两潜伏 bug：① stat 字段 `displayValue` 非 `value` 导致全 0 ② stat name 是 camelCase（possessionPct/wonCorners）非 kebab-case 导致 label 英文回退；球员中文译名表抓取上线（懂球帝 API 链路：roster→详情页 vm 沙箱 NUXT eval，59 单测全绿） |
| 2026-08-03 | **（待总司令亲批晋升）** | 子项目 1「个人化基础」全 25 Task + 3 followup 修复完工（同会话连克 Task 13-25 + 3 followup）：球队订阅（3 队上限）+ 收藏夹（50 项上限）+ iCal RFC 5545 导出 + 伤员端点 fetchTeamInjuries（CORS 实测 200 OK，ESPN 实际结构 ≠ plan 假设适配实现：`injuries` 数组非 `athletes`，`type` 对象非字符串，`status` 顶层字符串）+ 隐私模式 readOnly flag；Toast/ConfirmDialog/EmptyState 通用组件齐；FavoritesDropdown hover 下拉；MyTeamCard 跨赛季间隙 bug 修复（拉过去 12 月 + 未来 10 月）；TeamDetailView slug 中文双横线 bug 修复；浏览器手动 16 项清单 11 ✅，138 单测全绿，typecheck/build 通过。**军衔待总司令亲批** |
| 2026-08-04 | **（待总司令亲批晋升）** | 子项目 1.6「MyTeamCard 紧凑重设计 v2」完工（同会话 5 Task TDD + 1 容器查询修复，6 commit 落地）：放弃 v1"永远 wide 模式"3 列 grid + 最近 3 场明细，改紧凑单卡 4 段 grid（hero \| 战绩 \| 攻防 \| 下场）；HomeView 订阅区容器 `flex flex-col` → `grid md:grid-cols-2 lg:grid-cols-3` 桌面横排 / 移动竖排；CSS container query（`@container max-width:720px` + `container-type:inline-size`）让卡内 grid 看卡自身宽度而非 viewport 自适应堆叠；删除 `recentMatches` ref + `scoreLine`/`matchTone`/`formatDateShort` 死码；浏览器手测 6 状态全过（1/2/3 订阅 × 桌面/移动）；8 单测全绿，typecheck/build 通过。**军衔待总司令亲批** |
| 2026-08-04 | **（待总司令亲批晋升）** | 子项目 1.7「积分榜移动端兼容」完工（同会话 3 Task + 1 commit）：逐页移动端兼容扫描 9 页（Home/Standings/Schedule/Players/Leaders/Compare/TeamDetail/PlayerDetail/Favorites）375px 模拟微信浏览器，仅 Standings 有真问题——`min-w-[760px]` 强制横滑，核心列"积分/近5场"看不到。改造：移动端隐藏 7 列次要数据（赛/胜/平/负/进/失/净 + xG），只显 4 列 `# / 球队 / 积分 / 近5场`，点击行展开渲染 grid 形式的次要数据；`table min-w-[760px]` → `md:min-w-[760px]`；`router-link @click.stop` 防误触发；新增 `StandingRow.test.ts` 5 项覆盖展开/收起/不误触发/xG；148 单测全绿，typecheck/build 通过。**军衔待总司令亲批** |
| 2026-08-05 | **（待总司令亲批晋升）** | 子项目 1.8「移动端卡片化方案 B（第一批）」代码完工待回归（同会话 8 Task subagent-driven-development，implementer + spec review + quality review 双关，8 subagent commit 在 main 本地未 push）：3 个新移动卡片组件（PlayerListCardMobile / LeaderRowCardMobile / ComparePlayerCardMobile）+ AppHeader 移动搜索图标 + Teleport 全屏搜索层 + PlayersView/LeadersView/CompareView 三 view 双 DOM 接入；双 DOM 模式（PC 表格 `hidden md:block` 包原样 / 移动卡片 `md:hidden`）保证 PC 端字节级零影响；新增 24 单测（原 148 → 172），typecheck/build 通过；375px 移动手测（4 处交互）+ i18n 双语手测（6 项）列入待回归清单（subagent 执行期间按项目约定禁用浏览器）；plan 与 spec 入库 `docs/superpowers/{plans,specs}/2026-08-05-mobile-cards*.md`，mockup 入库 `tmp/mockup/mobile-cards.html`。**军衔待总司令亲批** |

## 三、技术栈与架构偏好

- Vite 6 + Vue 3（`<script setup>`）+ Pinia + Vue Router 4（hash mode）+ TypeScript strict + Tailwind 4 + MiniSearch
- 环境钉版（2026-07-24 定）：Node ≥20.19（本地 20.19.6），`.nvmrc` / package.json engines / Actions setup-node 三处一致；Vite 钉 6（脚手架用 `npm create vite@6`，不用 latest）；vue-router 钉 `@4`（latest 已是 v5，要求 Vite 7/8，不兼容）
- GitHub Pages 静态部署（base `/MatchLab/` = 仓库名）；数据管线 = GitHub Actions + 零依赖 Node 脚本 → 静态 JSON
- 数据源定调：ESPN site.api 浏览器直连；ESPN core API 与 Understat 一律走 Actions；FBref / Transfermarkt 弃用；懂球帝用于球员中文译名表抓取（Actions 跑）

## 四、项目工作流

- **交流语言：永远使用中文交流**——汇报、提问、设计讨论、复盘全程中文，技术名词可保留英文但要克制能少则少，不许整句夹洋文（2026-07-27 总司令立规）
- 计划文档统一放 `projectDoc/plan/`，一个任务一个文件
- 数据结构与 API 接口不能变，UI 可大改
- 抓取脚本永远零依赖（仅 Node 内置模块）
- 开工须先获总司令明确指令，当前状态：✅ 子项目 1「个人化基础」完工（Phase 0–6 MVP 完工基线之上：球队订阅 + 收藏夹 + iCal 导出，无后端 + localStorage 路径；2026-07-31 起 2026-08-03 验收通过，25/25 Task + 3 followup 修复，32 commit 在 main，138 单测全绿；待总司令批军衔 + 决定下一子项目方向）
- **数据提交约定**（避免和 daily Actions 冲突）：本地跑 fetch 脚本（fetch-espn-core/fetch-understat/fetch-espn-scores/build-team-map/fetch-dqd-players 等）只用来验证脚本能跑，**不要 `git add public/data/`**。数据文件由 `.github/workflows/fetch-data.yml` 每天 UTC 06:00 跑（或手动触发 workflow_dispatch）。本地代码改动 commit 时显式 `git add src/ scripts/ docs/ types/ package.json` 等代码路径，避开 `public/data/`，否则 push 时会和 daily Actions 的数据 commit 撞冲突。如要立即更新线上数据：到 GitHub Actions 页面手动触发 "Fetch Data" workflow。

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

五大联赛（英超/西甲/意甲/德甲/法甲）足球数据查询网站，**Phase 0–6 MVP + 子项目 1「个人化基础」均完工**（线上部署 https://davidgao1024.github.io/MatchLab/）：Vite 6 + Vue 3 + TS strict + Tailwind 4 脚手架、hash 路由 + Pinia、部署工作流、数据管线（fetch-espn-core / fetch-understat / fetch-espn-scores / build-team-map / fetch-dqd-players 五个零依赖脚本 + 每日定时工作流）均已入库，`public/data/` 含六联赛静态数据（球队 96+ / 球员 2611 / 队名映射 26 条 / 球员中英译名 31393 变体）；前端积分榜 + 赛程 + 首页 + 比赛详情弹窗 + 球员/球队详情 + 排行榜 + 对比页 + 个人化（球队订阅 + 收藏夹 + iCal 导出 + 伤员端点 + 隐私模式 readOnly）齐上线（138 项单测全绿，typecheck/build 通过）。

动手写任何功能代码前，先读 `docs/implementation-plan.md`（施工图纸）——技术栈、目录结构、数据管线、Phase 0–6 分步计划与验收标准都在里面，按阶段执行，不要另起架构。

## 两份文档的分工

| 文档 | 性质 | 内容 |
|---|---|---|
| `docs/data-site-mvp-plan.md` | 调研活文档 | 数据源可行性结论、已验证端点清单、倒序调研记录、决策日志。新调研结论追加到「调研记录」，关键决策写入「决策日志」 |
| `docs/implementation-plan.md` | 施工图纸 | 技术栈（Vite 6 + Vue 3 `<script setup>` + Pinia + Vue Router 4 hash mode + TS strict + Tailwind 4 + MiniSearch）、目录结构、数据文件拆分策略、分阶段实施计划 |

## 现有脚本（零依赖，仅 Node.js 内置模块）

```bash
# ESPN core 全量抓取（球队/球员/排行榜，5 联赛 ~6500 请求，约 40 分钟，常态由 Actions 跑）
node scripts/fetch-espn-core.js                    # 全 5 联赛 → public/data/{league}/
node scripts/fetch-espn-core.js eng.1              # 单联赛；PLAYERS_LIMIT=10 可冒烟测试

# Understat xG 数据（免费无 Key；CORS 实测不通，只能服务端/Actions 抓取）
node scripts/fetch-understat.js                    # 全 5 联赛 → public/data/{league}/xg/
node scripts/fetch-understat.js EPL 2025           # 单联赛（Understat/ESPN slug 均可）+ 赛季

# ESPN site.api 赛程 + 本地算积分榜（standings 端点返回空的已知坑，从比分本地计算）
node scripts/fetch-espn-scores.js                  # → public/data/{league}/matches/{YYYY-MM}.json + standings.json

# Understat ↔ ESPN 队名映射（依赖上面两个脚本的产物）
node scripts/build-team-map.js                     # → public/data/mappings/team-name-map.json

# 懂球帝球员中英文译名抓取（Phase 3 弹窗中文化，Actions 跑）
node scripts/fetch-dqd-players.js                  # 默认抓英超全 20 队 → 合并到 players-zh.json
node scripts/fetch-dqd-players.js --csl           # 中超全 16 队
node scripts/fetch-dqd-players.js --laliga         # 西甲全 20 队
node scripts/fetch-dqd-players.js --seriea         # 意甲全 20 队
node scripts/fetch-dqd-players.js --bundesliga     # 德甲全 18 队
node scripts/fetch-dqd-players.js --ligue1         # 法甲全 18 队
node scripts/fetch-dqd-players.js --epl --laliga --seriea --bundesliga --ligue1 --csl  # 六联赛全抓
node scripts/fetch-dqd-players.js 50000513         # 单队测试（阿森纳）

# 译名表后处理（覆盖率提升工具链，幂等可重复跑）
node scripts/augment-player-zh.js                 # 对 zh.json 补反序 + 去重音变体（中国序↔西方序 + 音标兜底）
node scripts/handfill-player-zh.js                # 把 i18n.ts PLAYER_ZH 手填区同步到 zh.json（中超外援补丁）

# FBref HTML 解析原型（URL 模式被 Cloudflare JS 挑战拦截，只能用浏览器手动保存的本地 HTML）
node scripts/fetch-fbref.js tmp/fbref/overview.html data tmp/fbref/squads
```

- Understat 联赛参数：`EPL` / `La_liga` / `Serie_A` / `Bundesliga` / `Ligue_1`；`2025` 表示 2025–26 赛季
- Understat 输出：`xg/standings.json`（积分榜 + xG/xGA/xpts + 每队逐场历史）、`xg/players.json`（全量球员 xG 统计）
- 抓取脚本公共库：`scripts/lib/http.js`（UA/gzip/重试/比较写入）、`scripts/lib/espn-endpoints.js`（端点常量 + 联赛配置）
- 定时抓取：`.github/workflows/fetch-data.yml`（每天 UTC 06:00，数据无变化不 commit）
- FBref 路径已被 Understat 取代（数据更干净、无反爬），脚本仅保留 HTML 解析逻辑备用
- 新写抓取脚本沿用同一约定：纯 Node 内置模块（https/zlib/fs）、UA 设置（默认浏览器 UA；**服务端抓 site.api 必须用 curl UA**，见数据源结论关键事实）、gzip 解压、请求间隔（≥200ms）、数据无变化不 commit；脚本为 CommonJS（由 `scripts/package.json` 的 `type: commonjs` 隔离，不受根 package.json `type: module` 影响）
- **空榜防线**（2026-08-10 增设）：`fetch-espn-scores.js` 全月份抓取失败时拒绝写榜并抛错，让工作流红灯——08-05 事故证明「静默用空数据覆写」比抓取失败本身危害更大；**Actions 红灯务必查看原因**，别只等第二天自动重跑

## 架构核心（需综合多份文档才能拼出的大图）

**两段式数据流**：GitHub Actions 跑零依赖抓取脚本 → 生成静态 JSON（git 跟踪，放 `public/data/`，Vite 自动复制到 dist）→ Vue SPA 部署到 GitHub Pages。

浏览器只 fetch 两类东西：
1. **ESPN site.api**（实时数据：比分/阵容/事件/H2H/伤病）——CORS 已验证，浏览器直连，**比分不进 Actions**
2. **本站静态 JSON**（低频数据：球队/球员档案/统计/排行榜/xG）——由 Actions 预生成，按 联赛 → 球队 → 球员 懒加载

**ESPN core API（sports.core.api.espn.com）和 Understat 绝不在浏览器调用**（CORS 未验证/大概率不通），一律走 Actions → 静态文件。全量数据约 100–150 MB，禁止整包加载；拆分策略与首屏预算见 implementation-plan.md §5。

## 数据源结论（调研核心产出，勿重复踩坑）

| 源 | 覆盖 | 状态 |
|---|---|---|
| ESPN site.api | 赛程/比分/阵容/事件/28 项技术统计/H2H/伤病；联赛 slug：`eng.1` / `esp.1` / `ita.1` / `ger.1` / `fra.1` / `chn.1` | ✅ 浏览器可直连 |
| ESPN core API | 球队（颜色/队徽/场馆）、球员档案 + 70+ 字段统计、12 项联赛排行榜、26 个历史赛季、220 个联赛元数据 | ✅ 走 Actions |
| Understat | 五大联赛 xG/xA/npxG/xGChain/xGBuildup、球员逐场时间线、单场阵容细位置 | ✅ 免费无 Key，走 Actions |
| 懂球帝 | 球员中英文译名对照表（roster API + 球员详情页 NUXT vm 沙箱提取）；season_id 实测：英超=24646、西甲=24651、意甲=24596、德甲=24648、法甲=24652、中超=26322 | ✅ Actions 跑 `scripts/fetch-dqd-players.js` |
| FBref | 射门坐标地图等 | ❌ Cloudflare JS 挑战，curl/Node/CF Worker 反代都过不了 |
| Transfermarkt | 身价/转会 | ❌ API 全封，MVP 不做 |

**关键事实**：
- ESPN core 的 team/athlete ID **跨赛事全局一致**（Arsenal=359 在 EPL/UCL 相同；Haaland=253989 跨赛事相同）——ESPN 内部合并无需映射表，数据模型按 `(entity_id, league_slug, season)` 三元组组织
- Understat **只覆盖五大联赛**，杯赛（UCL/UEL/UECL）404；UCL/UEL 的 xG 目前无免费源
- Understat 已知坑：`getPlayersStats` 的 position 参数不过滤（单次调用取全量即可）；history 里的 `wins/draws/loses/pts` 是单场值（0/1），累计必须 reduce 求和；无 fixtures 端点（未来赛程用 ESPN scoreboard）
- ESPN standings 端点返回空 → 积分榜本地从比分计算（`computeStandings()` 模式，沿用世界杯项目）
- **site.api 服务端抓取 UA 坑（2026-08-10 实测）**：Akamai 反爬拦「服务器 IP + 浏览器 UA」组合返 403——服务端抓 scoreboard 必须传 `{ ua: UA_CURL }`（`curl/8.5.0`，定义在 `scripts/lib/http.js`）；真实浏览器直连（实时比分）与 core API 均不受影响。2026-08-05 此坑曾致六联赛积分榜被空榜覆写、线上空窗 5 天（复盘见 data-site-mvp-plan.md 2026-08-10 调研记录）
- ESPN injuries 端点（`/{league}/injuries?team={teamId}`）CORS 实测 200 OK，浏览器直连（子项目 1 Task 13 验证）；实际结构 ≠ plan 假设：顶层 `injuries` 数组（非 `athletes`），每条 `athlete.{id,displayName}` + `type.{description}` 对象（非字符串）+ `status` 顶层字符串；预季五大联赛全返 0 条，赛季中复测待回归。`fetchTeamInjuries(league, teamId)` 5 分钟缓存
- 球员**单赛季**统计用 `/seasons/{year}/types/1/athletes/{id}/statistics/0`；不带 seasons 路径的 `.../athletes/{id}/statistics/0` 是生涯累计，两者别混用
- 端点完整清单在 data-site-mvp-plan.md 的 2026-07-21 几篇调研记录里，写抓取脚本前先查
- 球员中文译名：`public/data/mappings/players-zh.json`（31393 个变体，覆盖英超/西甲/意甲/德甲/法甲/中超六联赛全队 + 反序/去重音/撇号/单名兜底 + 中超外援+DOB匹配手填），App.vue 启动时 `loadPlayerNames()` 异步加载合并到 PLAYER_ZH；`playerName(name, lang)` 函数带去重音 + 大小写不敏感 + 撇号兜底 + 单名兜底 + 分词回退；中文模式命中显示译名，未命中显示 ESPN shortName。当前 ESPN 一线队命中率：英超 81.1% / 西甲 85.7% / 意甲 73.7% / 德甲 87.2% / 法甲 83.0% / 中超 **95.9%**（总计 83.7%）
- 个人化数据（子项目 1）：订阅 + 收藏夹 localStorage 持久化（key=`matchlab:subscriptions` / `matchlab:favorites`，version=1，debounce 200ms 写盘），多 tab 同步走 `storage` event；隐私模式 localStorage 不可写 → store `readOnly=true` flag → SubscribeButton/FavoriteButton/ExportCalendarButton 三按钮 disabled，避免无效操作

## 跨源 Join（ESPN ↔ Understat）

- 球队：26 条队名差异（如 `Tottenham` vs `Tottenham Hotspur`，Bundesliga 最多 10 条），维护 `UNDERSTAT_TEAM_MAP`。草稿曾存在于旧工作区 `tmp/fbref/out/understat-team-map.json`，**本仓库没有该文件**，需按 data-site-mvp-plan.md「2026-07-21 — 五大联赛全覆盖」一节的差异清单重建
- 球员：lower-case 姓名精确匹配命中率 92.5%，残余 7.5% 为音译/顺序差异（`Tomás Soucek` / `Hwang Hee-Chan` / `Toti Gomes` 类），用去重音 + 编辑距离 fuzzy match + 人工 `player-name-map.json` 兜底
- 位置码：Understat 细（GK/DL/DC/DR/DMC/AMC/AMR/AML/FW，阵容可视化需要这套）vs ESPN 粗（G/D/M/F）

## 约定与待办

- 交流语言：永远使用中文交流（2026-07-27 立规）；文档与日志中文为主，技术名词保留英文
- 复用来源：本项目沿用世界杯数据项目的模式（`ESPN_TEAM_MAP` 队名映射、本地算积分榜、足球场阵容可视化、时区转换）；旧项目代码不在本仓库，复用清单见 implementation-plan.md §11
- **ESPN core API CORS 已验证（2026-07-24）**：浏览器可直连（200 OK），site.api 复核通过，Understat 不通实锤。架构定为方案 A：core 数据仍全走 Actions（批量直连转移限流风险 + CORS 非 ESPN 承诺），CORS 通道仅作 Phase 6 历史赛季按需直连 + 调试备用
- GitHub Pages 部署：Vue Router 用 hash mode；`vite.config.ts` 的 `base` 已定为 `/MatchLab/`（= 实际仓库名，2026-07-24 落地）。**前端 fetch 静态 JSON 一律走 `import.meta.env.BASE_URL` 前缀，禁用 `/data/...` 绝对路径**（base 子路径下会 404）
- Actions 额度：低频数据每天 1 次全量抓取约 55 min/天（实测 6339 请求 ≈ 55 min 墙钟），月耗 ~1650 min，在 2000 min/月 免费额度内但余量不大——不要再往 Actions 加高频任务，比分实时数据走浏览器直连
