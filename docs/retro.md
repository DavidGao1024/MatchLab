# MatchLab MVP 复盘（Phase 0–6）

> 建档：2026-07-31 · MVP 全部完工后沉淀，给后续开新坑（PWA、UCL/UEL 覆盖、历史赛季回溯）复用
> 施工图纸：`docs/implementation-plan.md` · 调研活文档：`docs/data-site-mvp-plan.md`

## 一、阶段总览

| Phase | 完工日期 | 一句话总结 | 关键决策/产物 |
|---|---|---|---|
| 0 | 2026-07-24 | 脚手架 + 数据源调研 | Vite 6 + Vue 3 + TS strict + Tailwind 4 + Pinia + Vue Router 4 hash mode；base=`/MatchLab/`；ESPN core CORS 实测通但架构定方案 A 全走 Actions |
| 1 | 2026-07-24 | 数据管线上线 | 4 个零依赖脚本（fetch-espn-core / fetch-understat / fetch-espn-scores / build-team-map）；6339 请求 / 0 失败 / 26 条队名映射与调研完全吻合 |
| 2 | 2026-07-28 | 积分榜 + 赛程 + 首页 | 转播图形风视觉、中英双语、49 单测全绿；flex 撑满 + 卡片拉伸 + 宽屏多列自适应；中超全链接入（ESPN chn.1 实测） |
| 3 | 2026-07-29 | 比赛详情弹窗主体 | 单页滚动世界杯风（金比分/绿色场/球员金边圆牌）；连克两潜伏 bug（stat `displayValue` 非 `value`；stat name 是 camelCase 非 kebab-case）；球员中文译名表上线 |
| 4 | 2026-07-30 | 球员数据 + 排行榜 | 球员档案 70+ 字段统计；12 项联赛排行榜；MiniSearch 全文搜索；译名表抓取（懂球帝 API + NUXT vm 沙箱 eval） |
| 5 | 2026-07-30 | 球队详情 + 完善 | 球队详情页（阵容 + 最近赛果 + 完整统计）；球员对比页 |
| 6 | 2026-07-30 | 图表 + 高阶功能 | xG 趋势图、生涯曲线、历史赛季切换、球员对比页（最多 4 人 13 项 stats）；顺手修 fetch-espn-core roster `pageSize` bug（默认 25 漏球员 → `?limit=100`） |

## 二、数据源结论（已验证，勿重复踩坑）

| 源 | 覆盖 | 状态 |
|---|---|---|
| ESPN site.api | 赛程/比分/阵容/事件/技术统计/H2H/伤病；联赛 slug `eng.1/esp.1/ita.1/ger.1/fra.1/chn.1` | ✅ 浏览器可直连 |
| ESPN core API | 球队（颜色/队徽/场馆）、球员档案 + 70+ 字段统计、12 项联赛排行榜、25 个历史赛季 | ✅ 走 Actions（CORS 已通但批量转移限流风险，架构定方案 A） |
| Understat | 五大联赛 xG/xA/npxG/xGChain/xGBuildup、球员逐场时间线 | ✅ 免费无 Key，CORS 不通，只能 Actions 抓 |
| 懂球帝 | 球员中英文译名（roster API + 详情页 NUXT vm 沙箱）；season_id：英超=24646、西甲=24651、意甲=24596、德甲=24648、法甲=24652、中超=26322 | ✅ Actions 跑 `scripts/fetch-dqd-players.js` |
| FBref | 射门坐标地图等 | ❌ Cloudflare JS 挑战，curl/Node/CF Worker 反代都过不了 |
| Transfermarkt | 身价/转会 | ❌ API 全封，MVP 不做 |

## 三、已知坑清单

### 数据层

- **ESPN standings 端点返回空** → 积分榜本地从比分计算（`computeStandings()` 模式，沿用世界杯项目）
- **ESPN core stat 字段是 `displayValue` 非 `value`** → 全 0 bug，2026-07-29 修
- **ESPN core stat name 是 camelCase**（`possessionPct`/`wonCorners`）非 kebab-case → label 英文回退 bug，同日修
- **ESPN core roster `pageSize` 默认 25** → 漏球员（EPL 500→661），2026-07-30 加 `?limit=100` 修
- **球员单赛季 vs 生涯累计**：`/seasons/{year}/types/1/athletes/{id}/statistics/0` 是单赛季；不带 seasons 路径的是生涯累计，别混用
- **Understat CORS 实测不通** → 一律走 Actions
- **Understat `getPlayersStats` position 参数不过滤** → 单次调用取全量即可
- **Understat history 的 `wins/draws/loses/pts` 是单场值（0/1）** → 累计必须 reduce 求和
- **Understat 无 fixtures 端点** → 未来赛程用 ESPN scoreboard
- **Understat 只覆盖五大联赛**，杯赛（UCL/UEL/UECL）404，UCL/UEL 的 xG 目前无免费源

### 前端层

- **getFieldXY 副作用 mutate cats 数组导致 for...of 跳项重复迭代** → 2026-07-29 排序 bug，改用 entries 索引或拷贝
- **GitHub Pages 子路径部署** → 前端 fetch 静态 JSON 一律走 `import.meta.env.BASE_URL` 前缀，禁用 `/data/...` 绝对路径
- **vue-router 钉 `@4`** → latest 已是 v5，要求 Vite 7/8，不兼容 Vite 6
- **Vite 钉 6** → 脚手架用 `npm create vite@6`，不用 latest
- **Node ≥20.19** → `.nvmrc` / package.json engines / Actions setup-node 三处一致
- **MiniSearch 7.x `SearchOptions` 无 `limit` 字段** → 用 `.slice(0, limit)`，2026-07-31 修（导致 Deploy build 失败）
- **TS strict 报 Team 类型缺字段** → 别手写窄类型，直接用 `Team` 全量；删冗余 `.map((t) => t)`
- **`Object.entries` 对 union 类型推断出 `unknown`** → 显式注解 `Array<[string, number | null]>` 收窄

### 流程层

- **commit 没跑 typecheck → push 后 Deploy workflow Build 失败** → 2026-07-31 加 husky pre-push 防线（`npm run typecheck`）
- **本地跑 fetch 脚本和 daily Actions 数据 commit 撞冲突** → 本地 fetch 只用于验证脚本能跑，**不要 `git add public/data/`**；数据文件由 `.github/workflows/fetch-data.yml` 每天 UTC 06:00 跑

## 四、复用模式沉淀（后续开新坑直接套）

| 模式 | 适用场景 | 出处 |
|---|---|---|
| **两段式数据流**：Actions 跑零依赖脚本 → 静态 JSON（git 跟踪）→ SPA fetch | 所有 GitHub Pages 静态站项目 | Phase 1 |
| **本地算积分榜**：从比分 reduce 出 standings，不依赖 API standings 端点 | API standings 返回空或不准 | 世界杯项目沿用 |
| **足球场阵容可视化**：绿色场 + 球员金边圆牌，按 position 缩写 `posOrder`/`midDepthRank` 排序 | 比赛详情弹窗、阵容页 | Phase 3 |
| **译名表兜底链**：`PLAYER_ZH` + `playerName(name, lang)` 函数（去重音 + 大小写不敏感 + 撇号兜底 + 单名兜底 + 分词回退） | 球员中英文显示 | Phase 3 |
| **ESPN core ID 跨赛事全局一致**（Arsenal=359，Haaland=253989） | 数据模型按 `(entity_id, league_slug, season)` 三元组组织，无需映射表 | Phase 1 调研 |
| **抓取脚本零依赖约定**：仅 Node 内置模块（https/zlib/fs），UA 伪装、gzip 解压、请求间隔 ≥200ms、数据无变化不 commit；CommonJS 隔离（`scripts/package.json` 的 `type: commonjs`） | 所有抓取脚本 | Phase 1 |
| **Understat ↔ ESPN 队名映射**：26 条差异，维护 `UNDERSTAT_TEAM_MAP`；球员用 lower-case 姓名精确匹配（92.5% 命中） + 编辑距离 fuzzy match + 人工 `player-name-map.json` 兜底 | 跨源 Join | Phase 1 调研 |
| **localStorage 数据持久化模式**：`version` 字段防 schema 演进 + `migrate*` 函数 hydrate 时归一化 + `schedulePersist` debounce 200ms 写盘 + `storage` event 多 tab 同步 + `readOnly` flag 探测隐私模式 | 浏览器端用户数据（订阅/收藏/对比等） | 子项目 1 |
| **iCal 导出模式**：`generateICal` 生成 RFC 5545 文本（`injuries` 数组映射 VEVENT，UID 含 `team-slug-date-teamId-awayId@matchlab` 保证稳定）+ `downloadBlob` 触发下载 + `Promise.all` 并发拉取赛季 10 个月 | 用户导出赛程到本地日历应用 | 子项目 1 |
| **ESPN 端点结构实测模式**：plan/spec 假设的 JSON 结构必须用浏览器 DevTools 实测验证（顶层字段名 + 字段类型 + 嵌套层级），偏差时适配实现而非盲跳过；用 NFL/NBA 同端点家族验证字段结构（足球预季返 0 条时） | 接入新 ESPN 端点 | 子项目 1 Task 13 |
| **subagent-driven TDD 工作流**：每 Task 写测试 → 跑失败 → 实现 → 跑通过 → 提交；catch 用 `e instanceof Error` 替代 `as any`（沿用 Task 10 重构方向）；组件加 `type="button"` + a11y 属性 | 多 Task 子项目实施 | 子项目 1 |
| **MyTeamCard 战报卡模式**：暗背景渐变 + 球队主色 CSS var + Bebas Neue 大字 + JetBrains Mono 标签 + 3 列 wide 模式（hero 今日赛 + recent vs + stats WDL/form/GF-GA + footer 伤员/下场预告）+ mini MatchCard vs 行（mine/opp class + W/D/L tone）+ footerMatch 数据树（todayMatch ? nextMatch : afterNextMatch 避免重复） | 首页订阅卡片 / 跨赛事关注多队 | MyTeamCard 重设计 |
| **flex cross-axis + mx-auto 不 stretch 兜底**：在 `flex flex-col` 父级下，子元素 `mx-auto` 在 cross-axis 不触发 stretch，宽度跟内容走；要占满父宽需加 `w-full` 或干脆去掉 max-w + mx-auto 让 flex stretch 生效 | flex 容器内子元素需占满 cross-axis 宽度 | MyTeamCard 重设计 后续调整 |

## 五、当前线上状态（2026-08-03）

- 线上：https://davidgao1024.github.io/MatchLab/
- 部署 workflow：`Deploy to GitHub Pages`（push to main 触发）
- 数据 workflow：`Fetch Data`（每天 UTC 06:00，数据无变化不 commit）
- 首屏 entry chunk：206KB / gzip 77KB（含 HomeView 静态 import + 子项目 1 个人化组件 + MyTeamCard 重设计 wide 模式）
- 最大 chunk：PlayerDetailView 179KB / gzip 62.96KB（chart.js 占大头，未来可考虑动态注册 chart 组件减体积）
- ESPN 一线队译名命中率：英超 81.1% / 西甲 85.7% / 意甲 73.7% / 德甲 87.2% / 法甲 83.0% / 中超 95.9%（总计 83.7%）
- 测试覆盖：144 单测 / 24 文件全绿（Phase 0-6 + 子项目 1 + MyTeamCard 重设计）
- 子项目 1「个人化基础」完工：25/25 Task + 3 followup 修复（2026-08-03 验收），32 commit 在 main
- MyTeamCard 重设计完工：5 Task TDD + 后续调整（永远 wide + 与下方等宽），10 commit 在 main（子项目 1 之后），144 单测全绿

## 六、后续可能的方向

| 方向 | 估工作量 | 前置 |
|---|---|---|
| **子项目 1 个人化基础** | 中 | ✅ **完工**（2026-07-31 起 2026-08-03 验收，25/25 Task + 3 followup 修复，见 `docs/superpowers/plans/2026-07-31-personalization-mvp.md`） |
| **商用化决策待办** | 中 | 部署切换（GitHub Pages → 自有域名 + 付费 host）+ 数据源授权（ESPN/Understat 商用授权）+ 隐藏代码（私有仓库 or obfuscation），待总司令决策 |
| PWA + Service Worker 离线缓存 | 中 | SW 缓存策略需区分静态 JSON（缓存优先）与 ESPN 直连（网络优先） |
| 内容深化（球员更多统计分类、球队阵容页、射手榜单独页） | 中 | 数据已有，前端补 UI |
| 历史赛季回溯（25 个赛季的 standings/赛程切换） | 中大 | `seasons.json` 已抓，需补 fetchSeasons 落地 standings/赛程 |
| UCL/UEL 杯赛覆盖 | 大 | Understat 不支持，需调研新数据源 |
| bundle 体积优化 | 小 | chart.js 动态注册，PlayerDetailView 可减 60KB+ |
