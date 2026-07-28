# MatchLab 项目灵魂档案

> 档案性质：项目级协作规则（**最高权威**，与全局灵魂档案冲突时以本档案为准）
> 全局档案：`~/.claude/global-memory/SOUL.md`
> 建档日期：2026-07-23

## 一、项目画像

- **代号**：MatchLab — 五大联赛（英超/西甲/意甲/德甲/法甲）数据查询网站
- **当前阶段**：Phase 2 完成并已部署上线 + 中超联赛全链接入（六联赛：积分榜+赛程+首页+扣分+队徽覆盖，49 项单测全绿，2026-07-28 验收），待令开 Phase 3（比赛详情弹窗）；施工图纸见 `docs/implementation-plan.md`
- **协作模式**：总司令下令 → 营长执行；全局铁律（未经指令不改码、先汇报后更新、不擅自持久化）全程有效

## 二、军衔记录（本项目独立计算）

| 日期 | 军衔 | 备注 |
|---|---|---|
| 2026-07-23 | 新兵 | 项目建档入伍；完成数据源调研交接、CLAUDE.md 建档 |
| 2026-07-24 | 班长 | 总司令亲批越级晋升（原拟列兵）：同日连克 Phase 0 + Phase 1——脚手架 → 数据管线上线（6339 请求 / 0 失败 / 26 条映射与调研完全吻合）；CORS 实测、Vite 钉版、三源交叉验证数战皆捷 |
| 2026-07-28 | **排长** | 总司令亲批晋升：Phase 2 全链部署上线（积分榜+赛程+首页，48 单测全绿）；同日连克 UI 自适应（flex 撑满+卡片拉伸+宽屏多列）、深色滚动条、中超全链接入（ESPN chn.1 实测→数据管线→前端六联赛→16 队队名→队徽覆盖机制→赛季前扣分计算），49 单测全绿 |

## 三、技术栈与架构偏好

- Vite 6 + Vue 3（`<script setup>`）+ Pinia + Vue Router 4（hash mode）+ TypeScript strict + Tailwind 4 + MiniSearch
- 环境钉版（2026-07-24 定）：Node ≥20.19（本地 20.19.6），`.nvmrc` / package.json engines / Actions setup-node 三处一致；Vite 钉 6（脚手架用 `npm create vite@6`，不用 latest）；vue-router 钉 `@4`（latest 已是 v5，要求 Vite 7/8，不兼容）
- GitHub Pages 静态部署（base `/MatchLab/` = 仓库名）；数据管线 = GitHub Actions + 零依赖 Node 脚本 → 静态 JSON
- 数据源定调：ESPN site.api 浏览器直连；ESPN core API 与 Understat 一律走 Actions；FBref / Transfermarkt 弃用

## 四、项目工作流

- **交流语言：永远使用中文交流**——汇报、提问、设计讨论、复盘全程中文，技术名词可保留英文但要克制能少则少，不许整句夹洋文（2026-07-27 总司令立规）
- 计划文档统一放 `projectDoc/plan/`，一个任务一个文件
- 数据结构与 API 接口不能变，UI 可大改
- 抓取脚本永远零依赖（仅 Node 内置模块）
- 开工须先获总司令明确指令，当前状态：🟡 施工中（Phase 0–2 ✅ 已部署上线，待令开 Phase 3）

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

五大联赛（英超/西甲/意甲/德甲/法甲）足球数据查询网站，**Phase 0–2 已完成并部署**（https://davidgao1024.github.io/MatchLab/，2026-07-28 线上实测可访问）：Vite 6 + Vue 3 + TS strict + Tailwind 4 脚手架、hash 路由 + Pinia、部署工作流、数据管线（fetch-espn-core / fetch-understat / fetch-espn-scores / build-team-map 四个零依赖脚本 + 每日定时工作流）均已入库，`public/data/` 含五联赛静态数据 10.4MB（球队 96 / 球员 2611 / 队名映射 26 条）；前端积分榜 + 赛程 + 首页（转播图形风视觉、中英双语、48 项单测全绿）已上线，按 Phase 3–6 推进。

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

# FBref HTML 解析原型（URL 模式被 Cloudflare JS 挑战拦截，只能用浏览器手动保存的本地 HTML）
node scripts/fetch-fbref.js tmp/fbref/overview.html data tmp/fbref/squads
```

- Understat 联赛参数：`EPL` / `La_liga` / `Serie_A` / `Bundesliga` / `Ligue_1`；`2025` 表示 2025–26 赛季
- Understat 输出：`xg/standings.json`（积分榜 + xG/xGA/xpts + 每队逐场历史）、`xg/players.json`（全量球员 xG 统计）
- 抓取脚本公共库：`scripts/lib/http.js`（UA/gzip/重试/比较写入）、`scripts/lib/espn-endpoints.js`（端点常量 + 联赛配置）
- 定时抓取：`.github/workflows/fetch-data.yml`（每天 UTC 06:00，数据无变化不 commit）
- FBref 路径已被 Understat 取代（数据更干净、无反爬），脚本仅保留 HTML 解析逻辑备用
- 新写抓取脚本沿用同一约定：纯 Node 内置模块（https/zlib/fs）、UA 伪装、gzip 解压、请求间隔（≥200ms）、数据无变化不 commit；脚本为 CommonJS（由 `scripts/package.json` 的 `type: commonjs` 隔离，不受根 package.json `type: module` 影响）

## 架构核心（需综合多份文档才能拼出的大图）

**两段式数据流**：GitHub Actions 跑零依赖抓取脚本 → 生成静态 JSON（git 跟踪，放 `public/data/`，Vite 自动复制到 dist）→ Vue SPA 部署到 GitHub Pages。

浏览器只 fetch 两类东西：
1. **ESPN site.api**（实时数据：比分/阵容/事件/H2H/伤病）——CORS 已验证，浏览器直连，**比分不进 Actions**
2. **本站静态 JSON**（低频数据：球队/球员档案/统计/排行榜/xG）——由 Actions 预生成，按 联赛 → 球队 → 球员 懒加载

**ESPN core API（sports.core.api.espn.com）和 Understat 绝不在浏览器调用**（CORS 未验证/大概率不通），一律走 Actions → 静态文件。全量数据约 100–150 MB，禁止整包加载；拆分策略与首屏预算见 implementation-plan.md §5。

## 数据源结论（调研核心产出，勿重复踩坑）

| 源 | 覆盖 | 状态 |
|---|---|---|
| ESPN site.api | 赛程/比分/阵容/事件/28 项技术统计/H2H/伤病；联赛 slug：`eng.1` / `esp.1` / `ita.1` / `ger.1` / `fra.1` | ✅ 浏览器可直连 |
| ESPN core API | 球队（颜色/队徽/场馆）、球员档案 + 70+ 字段统计、12 项联赛排行榜、26 个历史赛季、220 个联赛元数据 | ✅ 走 Actions |
| Understat | 五大联赛 xG/xA/npxG/xGChain/xGBuildup、球员逐场时间线、单场阵容细位置 | ✅ 免费无 Key，走 Actions |
| FBref | 射门坐标地图等 | ❌ Cloudflare JS 挑战，curl/Node/CF Worker 反代都过不了 |
| Transfermarkt | 身价/转会 | ❌ API 全封，MVP 不做 |

**关键事实**：
- ESPN core 的 team/athlete ID **跨赛事全局一致**（Arsenal=359 在 EPL/UCL 相同；Haaland=253989 跨赛事相同）——ESPN 内部合并无需映射表，数据模型按 `(entity_id, league_slug, season)` 三元组组织
- Understat **只覆盖五大联赛**，杯赛（UCL/UEL/UECL）404；UCL/UEL 的 xG 目前无免费源
- Understat 已知坑：`getPlayersStats` 的 position 参数不过滤（单次调用取全量即可）；history 里的 `wins/draws/loses/pts` 是单场值（0/1），累计必须 reduce 求和；无 fixtures 端点（未来赛程用 ESPN scoreboard）
- ESPN standings 端点返回空 → 积分榜本地从比分计算（`computeStandings()` 模式，沿用世界杯项目）
- 球员**单赛季**统计用 `/seasons/{year}/types/1/athletes/{id}/statistics/0`；不带 seasons 路径的 `.../athletes/{id}/statistics/0` 是生涯累计，两者别混用
- 端点完整清单在 data-site-mvp-plan.md 的 2026-07-21 几篇调研记录里，写抓取脚本前先查

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
