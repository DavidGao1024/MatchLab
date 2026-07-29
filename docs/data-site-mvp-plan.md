# 数据查询类网站 MVP 可行性调研

> 目标：基于当前世界杯项目的技术思路，扩展为覆盖五大联赛（英超、西甲、意甲、德甲、法甲）的数据查询网站，包含赛程、积分榜、球员等海量数据。
>
> 本文档为**随时做随时记录**的活文档，调研到哪写到哪，不追求一次性完成。

## 总体判断

可行，但规模量级与当前世界杯项目完全不同。关键瓶颈在数据源与架构，需要先用一个联赛（英超）做 MVP 验证后再横向扩展。

---

## 1. 数据源调研（最关键，决定架构）

### 赛程 / 比分 / 积分
- [x] ESPN 非官方 API 是否覆盖英超（与世界杯同源，大概率可用） ✅ 2026-07-17
- [x] 端点格式与世界杯是否一致，能否复用 `espn.js` 逻辑 ✅ 2026-07-17
- [x] 是否有联赛专属 ID（如 `eng.1` 之类）替代 `fifa.world` ✅ `eng.1` 2026-07-17

### 球员基础数据
- [x] 名单、号码、位置 — ESPN summary API 的 `rosters` 是否含联赛比赛 ✅ 2026-07-17
- [x] 首发/替补/阵型字符串是否同样可用 ✅ 2026-07-17

### 球员统计
- [x] 进球/助攻/出场/黄红牌 — **FBref** 可用性与反爬策略 ❌ Cloudflare 403，须服务端抓取 2026-07-17
- [x] **Understat** 的 xG / xA 数据端点 ✅ 2026-07-21 — `/getLeagueData/{lg}/{season}` 和 `POST /main/getPlayersStats/` 可用，无需 API Key，返回 gzip JSON，完整 xG/xA/xGChain/xGBuildup 覆盖
- [x] 两者的 CORS 表现与更新频率 ✅ 2026-07-24 线上 origin 实测：ESPN core/site 通，Understat 拦；低频数据 Actions 每日抓取（条件 commit），实时比分浏览器直连

### 身价 / 转会
- [ ] **Transfermarkt** 是否有非官方 JSON 端点 ❌ 直接 API 不可用 2026-07-17
- [ ] 或需要 HTML 解析（脆弱性评估）
- [ ] 转会窗期间的数据新鲜度需求

### 伤病
- [ ] 英超官方 injury report 端点
- [x] ESPN 的伤病字段 ✅ `/sports/soccer/eng.1/injuries` 端点存在，off-season 为空 2026-07-17
- [ ] 是否能复用 `scripts/fetch-injuries.js` 思路

### 赔率
- [ ] 现有体彩方案能否扩展到英超（体彩只覆盖国内开放的赛事）
- [ ] 若不能，考虑国外赔率源（但合规性需确认）

---

## 2. 技术约束验证

- [ ] 各数据源的 CORS 表现（浏览器直 fetch vs 必须服务端中转）
- [ ] 频率限制 / 风控（腾讯云 WAF 类）
- [ ] 数据新鲜度需求分级：
  - 比分：实时（分钟级）
  - 积分：每日
  - 球员统计：每周
  - 身价/转会：转会窗期间
- [ ] GitHub Actions 免费额度（每月 2000 min，每 15 分钟抓取是否够用）
- [ ] 数据体积估算（380 场 × 20 球员 × 多维度 ≈ 几万条记录）

---

## 3. 架构决策点

- [ ] **静态 JSON 文件能否撑住**：加载和筛选性能实测
- [ ] **是否需要前端索引库**：MiniSearch / Fuse.js / Lunr 选型对比
- [ ] **是否需要轻量后端**：Cloudflare Workers 免费额度（10 万次/天）是否够 MVP
- [ ] **是否引入构建工具**：当前零构建可能要放弃，改用 Vite + 框架（React/Vue/Svelte）
- [ ] **是否拆分数据存储**：高频（比分）走 API 中转，低频（球员档案）走静态文件

---

## 4. MVP 范围界定

### 最小可用（P0）
- [ ] 赛程
- [ ] 积分榜
- [ ] 球员名单（不含详细统计）

### 目标可用（P1）
- [x] 球员进球助攻排行 ✅ Understat API 已验证（2026-07-21）
- [ ] 伤病信息

### 加分项（P2）
- [ ] 赔率
- [ ] 预测模型复用（10 维度框架需适配联赛，主场优势重新建模）
- [ ] xG / xA 高阶数据

---

## 5. 复用评估

### 可直接复用
- [ ] `i18n.js` 多语言框架
- [ ] `timezone.js` 时区转换
- [ ] 队名映射逻辑（`ESPN_TEAM_MAP` 模式）
- [ ] 比赛详情弹窗结构
- [ ] 足球场阵容可视化（`renderLineupCol` 等）
- [ ] 伤病+停赛合并逻辑

### 需重新设计
- [ ] 预测模型的 10 维度框架：
  - FIFA 排名 → 联赛排名（权重需调整）
  - 主场优势（联赛中俱乐部主场更稳定，但 max 14 分可能需下调）
  - 历史交锋 H2H（联赛内交锋频率远高于世界杯，逻辑可简化）
- [ ] 阶段清零的停赛规则（联赛为累计黄牌停赛，规则不同）

---

## 数据获取现状（2026-07-21 汇总）

### ✅ 已能获取（免费 + 无 Key）

**ESPN API（5 大联赛全覆盖）** — 与世界杯项目同源
- 赛程（已完赛 + 未开赛）
- 实时比分（进行中）
- 积分榜（本地 `computeStandings()` 算）
- 比赛详情：首发阵容 + 阵型 + 替补
- 比赛事件：进球（含助攻）、红黄牌、换人
- 技术统计（28 项：控球、射门、传球、犯规、角球等）
- H2H 历史交锋
- 球员号码/位置/姓名（来自 roster）
- 伤病列表（`/eng.1/injuries` 端点，赛季中有数据）

**Understat API（5 大联赛全覆盖）**
- 联赛积分榜（含 xG/xGA/npxG/npxGA/xpts/xGD）
- 每队每场比赛历史（xG/xGA/ppda/deep/结果）
- 球员赛季统计：进球、助攻、xG、xA、npxG、xGChain、xGBuildup、npg、shots、key_passes、黄红牌
- 球员逐场日志（`getPlayerData/{id}`）— 每场 xG/射门/助攻时间线
- 单场双方阵容（`getMatchData/{id}`）— 细粒度位置码（GK/DL/DC/DR/DMC/AMC/AMR/AML/FW）+ 换人链 + 每球员 xG 分解
- 覆盖 96 队 × 2775 球员

**ESPN core API（`sports.core.api.espn.com`）** — 新发现
- 220 个联赛元数据（含 5 大联赛、UCL、UEL、UECL、世界杯、Leagues Cup、各国杯赛）
- 26 个历史赛季（EPL 可回溯到 2000 年；UCL 至 2006；世界杯至 1950）
- 球队/球员 ID 跨赛事**全局一致**（Arsenal=359 在 EPL/UCL/UEL 都是同一 id；Haaland=253989 跨赛事一致）
- 球队元数据：含 `color`/`alternateColor`（主副色 hex）、`logos[]`（含 dark mode PNG）、venue、nickname
- 球队战绩（record）：W-D-L + gamesPlayed + pointDifferential
- 球队花名册（roster）：每队 30+ 球员
- 球队赛季统计：4 大分类 70+ 字段（同球员统计结构）
- 球员档案：身高/体重/年龄/生日/姓名
- 球员单赛季统计（70+ 字段）+ 生涯总统计（累计）
- 球员列表分页（EPL 共 646 名运动员，UCL 1468，UEL 1433，UECL 1277）
- 联赛级 12 项排行榜（goalsLeaders/assistsLeaders/shotsOnTarget/yellowCards/redCards/saves/...）
- 场馆库 9221 个（全球，含城市/国家）
- 杯赛多阶段 types（UCL 6 阶段：联赛阶段 + 4 轮淘汰 + 决赛；Leagues Cup 5 阶段含三四名）

### ⚠️ 已验证可行但未抓

- Understat 守门员高阶统计（GK 专属字段）— Understat `getMatchData` 含位置码 GK 但无 GK 专属统计
- 季前赛/友谊赛（ESPN 覆盖，未测）
- 杯赛（冠军联赛/欧联杯）— ESPN site.api 覆盖赛程/阵容；Understat 不覆盖（已确认 404）

### ❌ 缺失/不可达

| 数据项 | 状态 | 备选方案 |
|---|---|---|
| 球员身价/转会 | Transfermarkt API 全封，HTML 解析脆弱 | P2 暂不做，或付费 API-Football |
| 逐场比赛射门坐标地图 | FBref 有但 Cloudflare JS 挑战 | 付费 ScrapingBee / API-Football Pro |
| 冠军联赛/欧联杯 xG 数据 | Understat 不覆盖（404），FBref 被 Cloudflare 拦 | 付费 API-Football（含 UCL） |
| 比赛赔率（5 大联赛） | 体彩只覆盖国内开放赛事 | 国外赔率源（合规性待确认） |
| 逐传球/逐射门事件 | StatsBomb open-data 无 EPL 授权 | 付费 StatsBomb Pro |
| 训练数据/跑动距离 | 各家都不开放 | 无公开源 |
| 官方 VAR/裁判报告 | 联赛官方才发 | 无 |
| 季前赛/友谊赛积分 | 无官方积分榜 | 不做 |

### 🚧 已知但需要补建

- **跨源队名映射表** `UNDERSTAT_TEAM_MAP`（26 条差异，草稿在 `tmp/fbref/out/understat-team-map.json`）
- **跨源球员姓名映射**（92.5% 直接命中，剩 7.5% 音译差异需 fuzzy match + 人工表）
- **未来赛程**（ESPN scoreboard 已覆盖，Understat 无 fixtures 端点）

### 一句话总结

**P0 + P1 + P2 大部分数据 100% 免费可得**，ESPN core 覆盖 220 联赛 + 26 年历史赛季 + 跨赛事全局 ID 一致 + 球员生涯各季统计 + 12 项联赛排行榜 + 杯赛 6 阶段结构，Understat 补充 5 大联赛 xG 系列与逐场时间线，**只需付费的是「身价/转会」、「逐射门坐标地图」、「UCL/UEL 的 xG」**，全量数据约 100-150 MB（必须拆分懒加载）。

---

## 调研记录

> 按日期倒序记录每次调研进展，格式：`### YYYY-MM-DD`

### 2026-07-29 — 懂球帝中英文球员译名表抓取（Phase 3 弹窗球员名中文化）

**调研内容**：ESPN site.api summary 返回的 roster 只有英文 displayName / shortName，没有中文译名 API。Phase 3 比赛详情弹窗在中文模式下球员名仍是英文，需要外部源补中英对照表。

**调研路径**：
1. 复用世界杯项目 `data/players-zh.json`（3737 球员，源：2026fifa.tw）——只覆盖世界杯 48 队参赛球员，五大联赛中下游球员（利兹联/伯恩利等）几乎全缺
2. ESPN core athlete 端点验证——无 `translations` 字段，中超数据也是英文，无中文 API
3. 试懂球帝——成功。完整 API 链路如下：

**懂球帝 API 链路（实测可用，2026-07-29）**：
- **roster**：`GET https://www.dongqiudi.com/sport-data/soccer/biz/dqd/v1/team/member_v2/{team_id}?app=dqd`
  - 返回 `{ code:0, data:{ list:[ { type:'goalkeeper'|'defender'|'midfielder'|'attacker'|'coach', data:[ { person_id, person_name(中文), person_logo, nationality_name, ... } ] } ] }, seasons:[...] }`
  - 必须带 `Referer: https://www.dongqiudi.com/team/{team_id}` 否则返回 HTML 反爬页
- **球员英文名**：roster API **不含**英文名，需拉球员详情页 HTML
  - `GET https://www.dongqiudi.com/player/{person_id}`
  - HTML 含 `window.__NUXT__=(function(a,b,...){return {data:[{detail:{base_info:{person_name:var, person_en_name:var, ...}}]}}})("v1","v2",...)`
  - **关键坑**：base_info 里 `person_en_name` 是变量引用（如 `dH`）而非字面量，HTML 里出现的字面量 `person_en_name:"Mikel Arteta"` 是"相关球员"推荐列表不是当前球员
  - 解决：用 Node `vm.createContext + runInContext` 沙箱执行整个 NUXT IIFE，取 `sandbox.window.__NUXT__.data[0].detail.base_info.person_en_name`
- **联赛球队列表**（找 team_id）：
  - `GET https://www.dongqiudi.com/sport-data/soccer/biz/data/standing?season_id={X}&app=dqd&version=850&platform=ios&language=zh-cn`
  - 必须带 `Referer` 否则反爬
  - 返回 `{ content:{ rounds:[{ content:{ data:[{ team_id, team_name }] }] }] }`
- **联赛 season_id 探查**（dongqiudi 的 league 页是 SPA，HTML NUXT 空，HTML title 是默认值）：
  - 直接试 URL 参数无效；正确方法——用浏览器打开 `https://www.dongqiudi.com/` 主页，点击右侧 sidebar 联赛切换按钮（"中超"/"英超"等），监听 network 看实际 standing API 的 season_id
  - 实测：**英超=24646**、**中超=26322**（其他联赛待探查）

**输出格式**：
- 译名表每个球员展开为 3 种 key 格式，对应 ESPN 的 displayName 和 shortName：
  - 完整名 `"Mikel Arteta"`
  - 短名带点 `"M. Arteta"`（ESPN shortName 常见格式）
  - 短名无点 `"M Arteta"`（备选格式）
- 合并策略：手填表 > 已有译名表 > 本次抓取（避免覆盖人工维护的高质量译名）

**抓取脚本**：`scripts/fetch-dqd-players.js`（零依赖，CommonJS）
- 默认：`node scripts/fetch-dqd-players.js` → 抓英超全 20 队
- `--csl`：抓中超全 16 队
- 单队测试：`node scripts/fetch-dqd-players.js 50000513`
- 200ms 间隔防限流；输出 `public/data/mappings/players-zh.json`，自动合并已有

**实测覆盖**（2026-07-29）：
- 英超 20 队 × ~30 球员 = 新增 1791 个译名变体（约 600 球员）
- 中超 16 队 × ~35 球员 = 新增 1863 个变体
- 加 WC 表 3737 + 手填 45，去重后总量 **7486 个译名变体**
- 浏览器实测：利兹联 11 首发全中文化（达洛/比约尔/斯特鲁伊克/...），中超云南玉昆 11 首发 9 中文化

**剩余工作**（其他 4 联赛 + 后续优化）：
- 西甲/意甲/德甲/法甲：需用同样方法（dongqiudi 主页 sidebar 切换 + network 监听）找各联赛 season_id，再跑脚本
- 边缘球员未中文化：ESPN shortName 与 dongqiudi 完整名格式不一致（如 ESPN `Y. Bao` vs dongqiudi `Yang Bo`），可补展开变体（如 `"Y Bao"` 无点格式已展开，但 `"Y. Bao"` vs `"Y. Bo"` 末字母差异需补）

---

### 2026-07-24 — ESPN core 球员注册覆盖不均（Phase 1 全量抓取发现）

**调研内容**：Phase 1 全量抓取实测 ESPN core 联赛级球员列表（`/leagues/{slug}/athletes`）的实际 count。

**发现**（ESPN count vs Understat 实际出场球员数）：

| 联赛 | ESPN core | Understat | 差距 |
|---|---|---|---|
| eng.1 | 681 | 537 | ESPN 更全 |
| esp.1 | **165** | 600 | **ESPN 严重缺失**（仅为实际 27%） |
| ita.1 | 843 | 586 | ESPN 更全 |
| ger.1 | **158** | 499 | **ESPN 严重缺失**（仅为实际 32%） |
| fra.1 | 764 | 553 | ESPN 更全 |

**结论**：

- ESPN 对西甲的球员档案注册严重不全（非脚本 bug，API 本身 count=165，已 curl 验证）
- **Phase 4 合并策略必须调整**：球员列表不能只以 ESPN 为骨架——对 ESPN 稀疏的联赛（至少西甲），应以 Understat 球员为主体，ESPN 档案作为叠加层；`players/index.json` 需支持「Understat-only 球员」（无 ESPN id，用 understat id 占位或独立命名空间）
- 球队级数据不受影响（ESPN 球队注册 20/20 齐全）

---

### 2026-07-24 — CORS 实测：ESPN core 意外可直连，Understat 不通实锤

**调研内容**：线上站点真实 origin（davidgao1024.github.io）浏览器 fetch 实测三数据源 CORS（图纸 §13 待验证项销账）。

**发现**：

1. **ESPN core API（sports.core.api.espn.com）：浏览器可直连** ✅
   - `GET /v2/sports/soccer/leagues/eng.1` → 200，返回 `"English Premier League"`，uid `s:600~l:700`
   - ESPN 未文档化 CORS 承诺，当前行为为开放

2. **ESPN site.api：复核通过** ✅
   - `GET .../eng.1/scoreboard?dates=20250801-20250831&limit=10` → 200，10 场比赛
   - 与世界杯项目结论一致，比分浏览器直连设计安全

3. **Understat：拦截** ❌
   - `GET https://understat.com/getLeagueData/EPL/2025` → `TypeError: Failed to fetch`，CORS 拦截实锤
   - xG 数据必须走 Actions（与设计预期一致）

**结论**：

- 架构维持两段式（方案 A，已决策）：ESPN core 数据仍由 Actions 预生成。理由：批量数据（球员全量 650+ 分页请求）浏览器逐用户直连会把限流风险转移到访客侧；CORS 非 ESPN 承诺、随时可能关闭；静态 JSON 懒加载首屏与切换体验更优
- **意外红利**：CORS 通 → Phase 6 历史赛季（26 赛季 × 5 联赛）可浏览器按需直连，无需预生成
- 图纸 §12 风险条「ESPN core CORS 未实测」已销账

---

### 2026-07-21 — 球员 per-season 生涯统计端点

**调研内容**：验证 ESPN core 是否提供球员单赛季历史统计（用于生涯曲线页）。

**发现**：

1. **两条端点路径，含义不同**
   - `/v2/sports/soccer/leagues/{slug}/athletes/{id}/statistics/0` — **生涯总统计**（所有赛季合并累加）
   - `/v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/athletes/{id}/statistics/0` — **单赛季统计**
   - 实测：前者 4 个年份调用返回值相同（生涯累计），后者返回各年真实数据

2. **Haaland per-season 统计实测**（验证路径正确性）
   | 赛事 | 赛季 | 出场 | 进球 |
   |---|---|---|---|
   | EPL | 2025 | 35 | 27 |
   | EPL | 2024 | 31 | 22 |
   | EPL | 2023 | 31 | 27 |
   | UCL | 2025 | 10 | 8 |
   | UCL | 2024 | 9 | 8 |

3. **生涯曲线页所需数据全部可得**
   - 任意球员 × 任意赛事 × 任意历史赛季 → 单季 70+ 字段统计
   - 26 个历史赛季可回溯
   - 可做：球员生涯进球曲线、xG vs 实际进球对比、生涯累计 stats
   - 组合路径：用 26 个 `year` 循环拉数据即可

4. **完整 endpoint 清单更新**（在 ESPN core 端点清单基础上补充）
   ```
   /v2/sports/soccer/leagues/{slug}/athletes/{id}/statistics/0                    # 生涯总统计
   /v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/athletes/{id}/statistics/0  # 单赛季统计
   ```

**结论**：

- **球员生涯页 100% 可实现**：单球员 × 26 赛季 × 5 联赛 + 3 杯赛 = 130+ 季度 stats，全部可拉
- **历史排行榜页可实现**：任意年份的 12 项 leaders 都可拉
- **球员对比页可实现**：两球员生涯各季 stats 并排展示
- ESPN core 完整覆盖：元数据 + 球队 + 球员 + 统计 + 生涯 + 排行 + 场馆 + 阶段

---

### 2026-07-21 — 跨赛事 ID 一致性验证

**调研内容**：验证 ESPN core 的 team/athlete ID 是否跨赛事一致（决定能否跨联赛+杯赛合并同一球队/球员的数据）。

**发现**：

1. **球队 ID 全局一致**（实测 EPL → UCL/UEL）
   - Arsenal = id 359（EPL/UCL/UEL 三处完全一致）
   - Liverpool = id 364
   - Manchester City = id 382
   - 推论：ESPN core 球队 ID 是全局命名空间，同一实体跨赛事共享
   - 影响：跨赛事合并球队数据**无需 ID 映射表**

2. **球员 ID 全局一致**（实测 Haaland）
   - `eng.1/athletes/253989` = Erling Haaland
   - `uefa.champions/athletes/253989` = Erling Haaland（同一 id 同一人）
   - 推论：ESPN core 球员 ID 是全局命名空间
   - 影响：球员档案 + 各赛事统计合并**无需 ID 映射表**

3. **架构含义**
   - 单个 team detail / athlete detail ref 可被多赛事共享
   - 前端球队详情页：一次拉 EPL stats + UCL stats + UEL stats（同 id），合并展示生涯数据
   - 前端球员详情页：同 athlete id 可分别拉 EPL/UCL/UEL 三套 statistics，展示「联赛 vs 杯赛」对比
   - **数据模型简化**：`team` 和 `athlete` 是全局实体；`stats` 按 (entity_id, league_slug, season) 维度组织

4. **数据 join 总策略确认**
   ```
   ESPN core team(id=382)            ← 全局球队实体
        ├─ EPL season 2025 record
        ├─ UCL season 2025 record
        └─ UEL season 2025 record (if applicable)
              ↓
   ESPN core athlete(id=253989)      ← 全局球员实体
        ├─ EPL season 2025 statistics
        ├─ UCL season 2025 statistics
        └─ 英格兰国家队 statistics (if applicable)
              ↓
   Understat player(id=8260)         ← Understat 命名空间独立，按姓名 join ESPN
              ↓
   球队/球员详情页统一展示
   ```
   - ESPN 内部：id 一致，无需映射
   - ESPN ↔ Understat：按姓名 join（92.5% 直接命中 + 7.5% 音译映射）
   - ESPN ↔ Understat 球队名：26 条映射表（已生成草稿）

5. **对前端数据模型的影响**
   - 球队数据结构：`{ id, name, colors, logos, venue, stats: { 'eng.1_2025': {...}, 'uefa.champions_2025': {...}, ... } }`
   - 球员数据结构：`{ id, name, height, weight, birthdate, stats: { 'eng.1_2025': {...}, 'uefa.champions_2025': {...} } }`
   - Understat 数据按姓名归并到对应 ESPN athlete

**结论**：

- **ESPN core 是单一统一数据源**：team/athlete ID 跨赛事全局一致，直接合并 EPL+UCL+UEL 数据无需映射
- **唯一需要映射的边界**：ESPN ↔ Understat（按姓名 + 26 条球队名映射）
- **球员生涯数据**：可直接从 ESPN core 拉一个 athlete id 在多个 league slug 下的 statistics，组装出球员生涯曲线（EPL + UCL + 国家队）
- **架构定调**：前端数据访问层可基于 ESPN core 的 ID 全局性，统一用 `entity_id + league_slug + season` 三元组定位任意 stats

---

### 2026-07-21 — UEFA 杯赛覆盖 + 数据体积 + 阶段类型

**调研内容**：扩展 UEFA 三大杯赛覆盖范围、估算全量球员数据体积、探测 types/stages 结构。

**发现**：

1. **UEFA 三大杯赛全部可用**（ESPN core 完整覆盖）

| 赛事 | slug | 球队 | 球员 | 历史赛季 | ESPN site.api 比赛数 |
|---|---|---|---|---|---|
| UEFA Champions League | `uefa.champions` | 36 | 1468 | 25（2006-2025） | 189 |
| UEFA Europa League | `uefa.europa` | 36 | 1433 | 17（2009-2025） | 189 |
| UEFA Conference League | `uefa.europa.conf` | 36 | 1277 | 5（2021-2025） | 153 |
| World Cup | `fifa.world` | 0（休赛） | 3055 | 23（1950-2026） | 104 |
| Leagues Cup | `concacaf.leagues.cup` | 36 | 1305 | 8（2019-2026） | 44 |

- 三大杯赛都有 12 项 leaders 排行榜（与 5 大联赛一致）
- UCL 2025 top scorer: 15 球 / 11 场（Messi/Ronaldo 时代历史可追到 2006）
- UEFA 比赛含完整球队/球员/统计/排行，与 5 大联赛字段完全同构
- **xG 数据缺口**：Understat 不覆盖 UEFA 杯赛；ESPN core 无 xG。UCL/UEL 的 xG 仍无免费源

2. **球员数据体积估算**（实测 EPL 5 球员抽样）
   - 球员档案均 5.1 KB（姓名/身高/体重/生日/链接等）
   - 球员统计均 15.0 KB（4 分类 70+ 字段）
   - 单球员 = 20 KB
   - **单联赛（EPL 646 球员）= 12.4 MB**
   - **5 联赛 + UCL/UEL/UECL ≈ 142 MB**（含球队重复，去重后 ~100 MB）
   - **静态 JSON 加载决策**：
     - 不能整包加载（浏览器卡死）
     - 必须拆分：按联赛 → 按队 → 按球员（懒加载）
     - 或引入前端索引库（MiniSearch ~30KB，可索引 5000 球员 <2MB）
     - 或走 CF Worker 服务端搜索

3. **types/stages 结构**（杯赛多阶段）
   - **EPL**：1 个 type（regular season, hasStandings=true）
   - **UCL**：6 个 type（2024 瑞士模式）
     1. League Phase — `hasStandings=true`（36 队单循环联赛阶段）
     2. Knockout Round Playoffs — `hasLegs=true`（两回合）
     3. Round of 16 — `hasLegs=true`（两回合）
     4. Quarterfinals — `hasLegs=true`
     5. Semifinals — `hasLegs=true`
     6. Final — 单场决胜
   - **Leagues Cup**：5 个 type（League Phase + QF + SF + 3rd-Place + Final）
   - **groups 端点**：UCL 2025 League Phase 有 1 个 group（Swiss 模式所有队在同一 group）
   - **关键发现**：每 type 有独立的 `hasStandings`/`hasGroups`/`hasLegs`/`hasStats` 标识，UI 需根据 type 切换显示模式

4. **总体规模总结**
   - 5 联赛 + 3 杯赛 + 世界杯 = 8 个主要赛事
   - 总球员数 ~7400（含重复）/ 去重 ~5000-6000
   - 总比赛数 ~1000+ 场/赛季
   - 历史可回溯：EPL 至 2000 年、UCL 至 2006 年、世界杯至 1950 年
   - 全量数据 ~100-150 MB

**结论**：

- **ESPN core 的覆盖远超预期**：不仅覆盖 5 大联赛，UCL/UEL/UECL/世界杯/Leagues Cup 全部含完整元数据、球队、球员、统计、排行榜
- **xG 数据缺口定位明确**：5 大联赛有 Understat；UCL/UEL/UECL 无免费 xG（付费 API-Football 或 FBref+ScrapingBee 是唯一出路）
- **架构定调**：必须拆分存储 + 懒加载，单文件不可行
- **历史数据可用**：可做「历年射手榜」、「球队 vs 球队历史交锋」、「球员生涯曲线」等历史分析页面

**下一步候选**：
1. **验证球员跨赛事 ID 一致性**：UCL 的 Manchester City 球队 id 是否与 EPL 一致（影响跨赛事合并）
2. **抽样拉一份完整 EPL 646 球员档案 + 统计落盘**，实测浏览器加载性能
3. **探测 ESPN core 是否有 match-level events**（进球/换人/红黄牌等，与 ESPN site.api summary 对比）
4. **Understat 是否有球员 ID 跨赛季稳定**（影响逐年累计统计）

---

### 2026-07-21 — ESPN core 元数据全量挖掘

**调研内容**：深度探测 ESPN core API 的 league/team/season/venue/leaders 元数据端点。

**发现**：

1. **联赛列表 220 个**（11 页 × 20）
   - 端点：`/v2/sports/soccer/leagues?limit=N&page=P`
   - 含世界杯、5 大联赛、各国杯赛、女子联赛、青年联赛
   - 已验证 5 大联赛 slug 与中文名：
     - `eng.1` → Premier League / England
     - `esp.1` → LALIGA / Spain
     - `ita.1` → Italian Serie A / Italy
     - `ger.1` → Bundesliga / Germany
     - `fra.1` → French Ligue 1 / France
   - 其它可见 slug：`fifa.world` / `fifa.wwc` / `uefa.champions` / `eng.fa` / `eng.league_cup` / `esp.copa_del_rey` / `usa.1` / `usa.nwsl` / `concacaf.leagues.cup` 等

2. **单联赛元数据**完整
   - 端点：`/v2/sports/soccer/leagues/{slug}`
   - 字段：id/guid/uid/alternateId/name/displayName/abbreviation/shortName/midsizeName/slug
   - country：id/slug/name/abbreviation/flag(PNG URL) + athletes ref
   - season（当前）：year/startDate/endDate/displayName/type
   - type 字段含布尔标识：hasGroups/hasStandings/hasLiveStandings/hasLegs/hasStats/isFinal

3. **历史赛季** 26 个（EPL 2026 回溯到 ~2000）
   - 端点：`/v2/sports/soccer/leagues/{slug}/seasons`
   - 可拉历史数据做趋势分析

4. **球队列表与详情**（与 Understat 球队数完全一致：20/20/20/18/18）
   - 列表：`/v2/sports/soccer/leagues/{slug}/seasons/{year}/teams`
   - 详情：`/v2/sports/soccer/leagues/{slug}/seasons/{year}/teams/{id}`
   - 详情字段：location/name/nickname/abbreviation/displayName/shortDisplayName
   - **`color`/`alternateColor`**：球队主色与副色 hex，前端主题化可用
   - **`logos[]`**：500x500 PNG 队徽 URL（含 dark mode 版本）
   - `isActive`/`isAllStar`
   - venue 引用：fullName/shortName/address{city,country}/images[]
   - 关联 refs：record/athletes/groups/statistics/leaders

5. **球队战绩**（record）
   - 端点：`/v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/teams/{id}/record`
   - 返回 stats 数组：gamesPlayed/losses/pointDifferential/wins/draws 等字段
   - summary 字段："14-11-13"（W-D-L 格式字符串）

6. **球队运动员花名册**（roster）
   - 端点：`/v2/sports/soccer/leagues/{slug}/seasons/{year}/teams/{id}/athletes`
   - Brighton EPL 2025 赛季 31 名球员
   - 每个 ref 指向 athlete 详情（含身高/体重/生日/统计）

7. **球队赛季统计**（4 分类，与运动员统计同结构）
   - 端点：`/v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/teams/{id}/statistics`
   - 4 分类：defensive(8) / general(16) / goalKeeping(12) / offensive(34)
   - 球队级别的累计统计

8. **球队 leaders**（球队内部排行）
   - 端点：`/v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/teams/{id}/leaders`
   - 返回该队各项数据 Top 球员（goalsLeaders 等）

9. **联赛 leaders**（联赛级排行榜，12 分类）
   - 端点：`/v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/leaders`
   - 12 个分类：
     - `goalsLeaders`（射手榜）、`assistsLeaders`（助攻榜）
     - `shotsOnTarget`（射正）、`totalShots`（总射门）、`accuratePasses`（传球）
     - `yellowCards`（黄牌）、`redCards`（红牌）
     - `foulsCommitted`（犯规）、`foulsSuffered`（被犯规）
     - `saves`（门将扑救）
     - `goals`/`assists`（与 goalsLeaders/assistsLeaders 数据相同）
   - 每分类返回 Top 球员 + athlete ref + value
   - 实测 2025 EPL：goals Top=Haaland 27 球，assists Top=21 助攻

10. **场馆列表** 9221 个（全球数据库）
    - 端点：`/v2/sports/soccer/leagues/{slug}/venues`
    - 详情：id/fullName/shortName/address{city,country}/images[]
    - 球队详情里嵌入了 venue ref，不需要单独拉场馆列表

11. **完整端点清单**（已验证）

```
ESPN core API: https://sports.core.api.espn.com

/v2/sports/soccer/leagues                                     # 全 220 联赛（分页）
/v2/sports/soccer/leagues/{slug}                              # 单联赛元数据
/v2/sports/soccer/leagues/{slug}/seasons                      # 赛季列表（26 个）
/v2/sports/soccer/leagues/{slug}/seasons/{year}               # 单赛季元数据
/v2/sports/soccer/leagues/{slug}/seasons/{year}/teams         # 球队列表
/v2/sports/soccer/leagues/{slug}/seasons/{year}/teams/{id}    # 球队详情（含颜色/队徽/场馆）
/v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/teams/{id}/record      # 球队战绩
/v2/sports/soccer/leagues/{slug}/seasons/{year}/teams/{id}/athletes            # 球队运动员名单
/v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/teams/{id}/statistics  # 球队统计
/v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/teams/{id}/leaders     # 球队内排行榜
/v2/sports/soccer/leagues/{slug}/athletes?limit=N&page=P     # 联赛级球员列表（646 EPL）
/v2/sports/soccer/leagues/{slug}/athletes/{id}               # 球员档案（身高/体重/生日）
/v2/sports/soccer/leagues/{slug}/athletes/{id}/statistics/0  # 球员单季统计 70+ 字段
/v2/sports/soccer/leagues/{slug}/seasons/{year}/types/1/leaders  # 联赛 12 项排行榜
/v2/sports/soccer/leagues/{slug}/venues                      # 场馆库（9221 个）
```

**结论**：

- **ESPN core API 完全可替代 ESPN site.api 的 standings/leaders 部分，且字段更结构化**
- **球队颜色 + 队徽 + 场馆信息** 是 ESPN core 独有，对前端 UI 极有价值（主题色、logo 加载）
- **联赛 12 项 leaders 排行榜** 是免费版的「赛季球员排行」完整方案
- **历史赛季回溯 26 年** 可做趋势/历史对比页面
- **完整端点清单已写明**，可直接作为前端实现的数据接口文档

**对原 P0/P1/P2 的影响**：
- P0（赛程/积分/球员名单）：已全量覆盖，且多了球队颜色/队徽等附加字段
- P1（球员进球助攻排行 + 伤病）：ESPN core leaders 12 项排行榜直接覆盖，不再依赖 Understat 单点
- P2（赔率/预测模型/xG 高阶）：Understat 仍是 xG 唯一免费源；ESPN core 提供球队+球员级传统统计

**下一步可选**：
1. 拉一份 EPL 完整 646 球员档案 + 统计，估算数据体积
2. 探测 `types` 其它值（type=2/3 可能是 playoff/cup stage）
3. ESPN core 是否覆盖 champion/UEFA 比赛（`uefa.champions` slug 已见）

---

### 2026-07-21 — Understat/ESPN 深度端点挖掘

**调研内容**：在确认 5 大联赛基本数据可用后，挖掘 Understat 的 player/match 详情端点，以及 ESPN 的 core API（`sports.core.api.espn.com`）。

**发现**：

1. **Understat 球员逐场日志端点**（`getPlayerData/{playerId}`）
   - 返回该球员每场比赛的完整统计：goals/shots/xG/xA/xGChain/xGBuildup/npxG/assists/key_passes/time/position/date/h_team/a_team/h_goals/a_goals/roster_id
   - 可用于：球员状态/手感曲线、近 N 场 xG 滚动平均、xG vs goals 差距分析
   - 数据精度到单场，足够细

2. **Understat 单场阵容端点**（`getMatchData/{matchId}`）
   - 返回该场比赛双方完整阵容 + 每球员细粒度数据：
     - 字段：goals/own_goals/shots/xG/time/position/player_id/team_id/yellow_card/red_card/roster_in/roster_out/key_passes/assists/xA/xGChain/xGBuildup/positionOrder
     - 位置码细粒度：GK/DL/DC/DR/DMC/AMC/AMR/AML/FW（比 ESPN 的 G/D/M/F 更细）
     - 换人链：roster_in/roster_out 字段记录被换下/换上的 player_id
   - 与 ESPN summary 互补：ESPN 有阵型字符串、详细技术统计、H2H；Understat 有每球员单场 xG + 细粒度位置 + 换人链

3. **Understat 覆盖范围 = 5 大联赛 only**
   - 探测 Champions_League / Europa_League / World_Cup / Euros / Nations_League / RFPL / MLS → 全部 404
   - Understat 不覆盖杯赛/洲际赛事
   - 杯赛数据若需要仍只能靠 ESPN

4. **ESPN core API（`sports.core.api.espn.com`）**— 全新发现
   - 公开可访问，无 Key，无 Cloudflare
   - 端点：`/v2/sports/soccer/{league-slug}/athletes?limit=N&page=P`
   - 端点：`/v2/sports/soccer/{league-slug}/athletes/{id}` — 球员完整档案
   - 端点：`/v2/sports/soccer/{league-slug}/athletes/{id}/statistics/0` — 球员单季统计（70+ 字段）
   - **球员档案字段**：firstName/lastName/fullName/displayName/weight/height/age/dateOfBirth/gender/links
   - **统计 4 大分类**：
     - offensive（34 字段）：totalGoals/accuratePasses/accurateLongBalls/attemptsInBox/shotAssists/leftFootedShots/rightFootedShots/freeKickGoals/penaltyKicksMissed/shotsOffTarget/shotsOnPost/totalThroughBalls/...
     - defensive（8 字段）：blockedShots/effectiveTackles/interceptions/tacklePct/totalClearance/...
     - goalKeeping（12 字段）：crossesCaught/penaltyKicksSaved/punches/smothers/...
     - general（16 字段）：appearances/subIns/subOuts/yellowCards/redCards/passPct/ownGoals/dnp/...
   - EPL 球员总数：646 名（ paginate 130 页 × 5 条）

5. **数据互补矩阵**

| 数据维度 | ESPN site.api | ESPN core.api | Understat |
|---|---|---|---|
| 赛程/比分 | ✅ | — | — |
| 积分榜 | ✅ 本地算 | — | ✅ 含 xG |
| 阵容（单场） | ✅ 含阵型字符串 | — | ✅ 含细位置 + xG |
| 比赛事件 | ✅ 进球+红黄+换人 | — | ✅ + xG |
| 技术统计（团队） | ✅ 28 项 | — | — |
| 技术统计（球员个人） | — | ✅ 70+ 字段 | ✅ xG 系列 |
| H2H 历史交锋 | ✅ | — | — |
| 伤病 | ✅ season 中有 | — | — |
| 球员档案（身高/体重/生日） | — | ✅ | — |
| 球员逐场 xG 时间线 | — | — | ✅ |
| 球队 xG/xGA | — | — | ✅ |
| 球员头像 | jerseyImages（球衣图） | — | — |
| 杯赛覆盖 | ✅ UCL/UEL 等 | — | ❌ 只 5 联赛 |

6. **三源组合 = 球员档案页所需 100% 字段覆盖**
   - 基本档案（姓名/年龄/身高/体重/生日/位置）→ ESPN core
   - 赛季总统计（出场/进球/助攻/红黄牌/传球/抢断/拦截/门将）→ ESPN core statistics
   - xG 高阶（xG/xA/xGChain/xGBuildup/npxG/npg/shots/key_passes）→ Understat
   - 逐场 xG 时间序列 → Understat `getPlayerData`

7. **Understat 位置码 → ESPN 位置码 映射**
   - Understat 细：GK/DL/DC/DR/DMC/AMC/AMR/AML/FW（实际阵型位置）
   - ESPN 粗：G/D/M/F（功能分类）
   - 阵容可视化需要 Understat 的细位置码（4-3-3 等阵型按位置分层）

**结论**：

- **可用数据已覆盖 P0/P1/P2 大部分**：赛程、比分、积分、阵容、比赛事件、球员档案、赛季统计、xG 高阶、逐场 xG 时间序列
- **仍缺失**：球员身价/转会（Transfermarkt 全封）、逐射门坐标地图（FBref 封）、冠军联赛/欧联杯 xG 数据（Understat 不覆盖）
- **球员档案页可呈现的字段**：身份信息 7 项 + 进攻 34 项 + 防守 8 项 + 门将 12 项 + 通用 16 项 + xG 系列 8 项 + 逐场时间线 — 单球员可展示 80+ 字段

**已验证可用端点清单**（供前端实现参考）：
```
ESPN site.api.espn.com:
  /sports/soccer/{slug}/scoreboard?dates=...&limit=...  # 赛程/比分/事件
  /sports/soccer/{slug}/summary?event={eventId}          # 阵容/事件/技术统计/H2H
  /sports/soccer/{slug}/injuries                         # 伤病（赛季中）

ESPN site.web.api.espn.com:
  /sports/soccer/{slug}/summary?event={eventId}           # 同上但更全

ESPN sports.core.api.espn.com:
  /v2/sports/soccer/{slug}/athletes?limit=N&page=P       # 球员列表（分页）
  /v2/sports/soccer/{slug}/athletes/{id}                 # 球员档案
  /v2/sports/soccer/{slug}/athletes/{id}/statistics/0    # 球员单季统计

Understat:
  GET  /getLeagueData/{league}/{season}                  # 积分榜+球队历史
  POST /main/getPlayersStats/  body:league=&season=      # 球员赛季统计（xG）
  GET  /getPlayerData/{playerId}                         # 球员逐场日志
  GET  /getMatchData/{matchId}                           # 单场双方阵容+xG分解
```

---

### 2026-07-21 — 五大联赛全覆盖 + 跨源 join 验证

**调研内容**：在确认 Understat API 可用后，验证其它 4 大联赛端点是否同样可用，并实测 Understat ↔ ESPN 跨源队名/球员姓名 join 可行性。

**发现**：

1. **五大联赛端点全部可用**（`getLeagueData` + `getPlayersStats`）
   | 联赛 | slug | 球队 | 球员 |
   |---|---|---|---|
   | EPL | EPL | 20 | 537 |
   | 西甲 | La_liga | 20 | 600 |
   | 意甲 | Serie_A | 20 | 586 |
   | 德甲 | Bundesliga | 18 | 499 |
   | 法甲 | Ligue_1 | 18 | 553 |
   | 合计 | — | 96 | 2775 |

2. **队名跨源差异 26 个**（Understat 简写 vs ESPN 全称）
   - EPL 5 个：Bournemouth/AFC Bournemouth, Brighton/Brighton & Hove Albion, Leeds/Leeds United, Tottenham/Tottenham Hotspur, West Ham/West Ham United
   - La_liga 2 个：Atletico Madrid/Atlético Madrid, Alaves/Alavés
   - Serie_A 4 个：Inter/Internazionale, Roma/AS Roma, Parma Calcio 1913/Parma, Verona/Hellas Verona
   - Bundesliga 10 个（最多）：RasenBallsport Leipzig/RB Leipzig 等
   - Ligue_1 5 个：Paris Saint Germain/Paris Saint-Germain 等
   - **解决方案**：建 `UNDERSTAT_TEAM_MAP`（Understat → ESPN），与项目现有的 `ESPN_TEAM_MAP`（世界杯 5 个差异）模式完全一致

3. **球员姓名 join 成功率 92.5%**（实测一场 EPL 已完赛）
   - ESPN roster 40 人 → Understat 直接按 lower-case 姓名匹配命中 37 人
   - 未命中 3 人都是音译/口音差异：
     - `Tomás Soucek` vs `Tomas Soucek`（口音字符）
     - `Hwang Hee-Chan`（亚洲球员姓名顺序差异）
     - `Toti Gomes`（绰号 vs 全名）
   - **解决方案**：建小规模 `PLAYER_NAME_MAP` 兜底 + 编辑距离 fuzzy match 处理残余

4. **技术路线总结**
   ```
   ESPN API                       Understat API
   (免费、无 Key)                  (免费、无 Key)
        │                              │
        ├─ 赛程/比分                   ├─ 球员统计 (xG/xA/xGChain)
        ├─ 积分榜 (本地算)              ├─ 每场 xG 历史
        ├─ 阵容/阵型                   ├─ 球队 xG/xGA 累计
        ├─ 比赛事件                    └─ ppda/deep 等高阶
        ├─ 技术统计
        ├─ H2H 历史交锋
        └─ 伤病 (eng.1/injuries)
                  │
                  ▼
        前端通过队名映射表 JOIN
        (UNDERSTAT_TEAM_MAP, 26 条)
   ```
   - ESPN + Understat 组合 **100% 覆盖 P0+P1 数据需求**，全部免费
   - 数据 join 通过队名 + 球员姓名双映射，命中率 92.5%+，可工程化
   - 与世界杯项目 `ESPN_TEAM_MAP` 模式完全一致，可原样复用

5. **已实现交付物**
   - `scripts/fetch-understat.js` — 五大联赛通用，零依赖
   - `tmp/fbref/out/understat-{league}-2025-standings.json` × 5
   - `tmp/fbref/out/understat-{league}-2025-players.json` × 5
   - `tmp/fbref/out/team-name-diff.json` — 跨源队名差异详表
   - `tmp/fbref/out/understat-team-map.json` — 26 条队名映射表（草稿）

**下一步**（待用户决策）：
1. 前端集成方案：扩展现有 `espn.js` 加入 Understat 加载，或单建 `understat.js`
2. 数据合并：用 `UNDERSTAT_TEAM_MAP` 把 Understat xG/xA 注入 ESPN 比赛卡片，扩展深度分析维度
3. 球员匹配 fallback：实现 fuzzy match + 人工维护 `PLAYER_NAME_MAP`
4. （可选）扩展到冠军联赛/欧联杯：Understat 也覆盖，slug 是 `Champions_League`、`Europa_League`

---

### 2026-07-21 — Understat JSON API 发现（免费 + xG 全套数据）

**调研内容**：在调研 FBref Cloudflare 拦截问题后，重新评估"免费 + EPL + xG"的可行方案。Understat 实际上提供了免费的 JSON 端点，无需 API Key，已实测可用。

**发现**：

1. **Understat 的 JSON API（非官方，未文档化）完全可用**
   - `GET /getLeagueData/{league}/{season}` — 球队 + 每场比赛 xG 历史
   - `POST /main/getPlayersStats/` — 球员统计（含 xG/xA/xGChain/xGBuildup）
   - 无 Cloudflare 拦截，无 API Key 要求，响应是标准 gzip JSON
   - 只需伪装 UA + Referer + `X-Requested-With: XMLHttpRequest`

2. **数据字段覆盖完整**
   - 联赛：每队的 `history[]` 含每场比赛 `xG/xGA/npxG/npxGA/xpts/ppda/deep/scored/missed/result/date`
   - 球员：`games/time/goals/npg/assists/xG/xA/npxG/xGChain/xGBuildup/shots/key_passes/yellow_cards/red_cards`
   - 覆盖 20 队 × 537 球员 × 38 轮 × 全量 xG 数据

3. **实测数据合理性**（EPL 2025-26 赛季已完赛数据）
   - Arsenal: 85 PTS, 26W 7D 5L, xG 77.5 / xGA 33.1 — 符合实际
   - Haaland: 27 球, xG 28.80, npxG 25.75 — 符合实际
   - 全部 20 队积分榜排序正确

4. **已知坑**
   - `getPlayersStats` 的 `position` 参数**不实际过滤**（每次调用都返回全部球员），单次调用足够
   - `wins/draws/loses/pts` 字段是**单场值**（1 或 0），不是累计值，需 reduce 求和
   - 无 fixtures 端点，未来赛程仍需 ESPN 或其它源补充
   - 端点未文档化，可能随时变动

5. **覆盖联赛（URL slug）**
   - EPL（英超）、La_liga（西甲）、Serie_A（意甲）、Bundesliga（德甲）、Ligue_1（法甲）
   - 其它：RFPL（俄超）等

**结论**：

- **免费 + xG + JSON 的路径找到了** — Understat 完美覆盖 P1 球员进球助攻排行的所有数据需求
- **FBref HTML 抓取方案可弃用** — Understat API 更稳定、数据更干净、零依赖、无 Cloudflare 问题
- **架构路径明确**：
  - 球员统计（xG/xA/xGChain/xGBuildup）→ Understat
  - 赛程/比分/积分榜/阵容/技术统计 → ESPN（项目已有 espn.js）
  - 未来赛程 → ESPN scoreboard
  - 身价/转会 → 暂不做（Transfermarkt 仍不可用）

**交付物**：
- `scripts/fetch-understat.js` — 已实现，零依赖，输出 2 个 JSON 文件
- `data/understat-{league}-{season}-standings.json` — 积分榜 + 每队历史
- `data/understat-{league}-{season}-players.json` — 球员统计

**下一步**：
1. 验证其它联赛（La_liga/Serie_A/Bundesliga/Ligue_1）端点是否同样可用
2. 考虑定时 GitHub Action 抓取（类似 fetch-odds.yml 模式）
3. 前端集成：扩展 `TEAM_ZH` 加入 5 大联赛队名映射，复用现有积分榜/球员排行 UI 框架

---

### 2026-07-21 — FBref 抓取原型：Cloudflare JS 挑战 + 解析器验证

**调研内容**：FBref 抓取脚本原型（`scripts/fetch-fbref.js`），验证零依赖 HTML 解析可行性，并实测 Cloudflare 拦截情况。

**发现**：

1. **Cloudflare 启用 JS 挑战，curl/Node https 无法直连**
   - `curl` + 完整浏览器 headers（UA/Sec-Ch-Ua/Sec-Fetch-*）仍 403
   - 响应是 `<title>Just a moment...</title>` 的 CF 挑战页，需要 JS 执行才能拿到 cookie
   - 与体彩腾讯云 WAF 不同 — 体彩是 UA 检测，FBref 是真 JS 挑战

2. **CF Worker 反代也过不了**
   - CF Worker 是服务端 fetch，无 JS 执行环境
   - 即使从 Worker 出站到 FBref，仍是 403
   - 这条路径在生产方案中排除

3. **生产抓取方案候选**
   - **headless 浏览器（puppeteer/playwright）**：能过 JS 挑战，但破坏零依赖约定
   - **第三方 CF 绕过服务（ScrapingBee/ScraperAPI/Zyte）**：收费但稳定，与体彩现用的 CF Worker 反代模式互补
   - **手动 + GitHub Action 触发**：原型阶段手动保存 HTML 足够

4. **HTML 解析可行 — 零依赖 + 正则 + data-stat 属性**
   - FBref 表格用 `data-stat="..."` 标识列，比位置稳定
   - `parseHtmlTable(html, tableId)` 通用函数已实现，能复用
   - `<thead>` 最后一行（叶子行）抽列名，跳过 `over_header` 分组行
   - `<tbody>` 用 `data-stat` 收集 `<th>/<td>` 值
   - 跳过 `partial_table`/`sum`/`thead` 等分隔/合计行

5. **原型脚本**（`scripts/fetch-fbref.js`）已实现
   - 输入：本地 HTML 文件路径或 URL（URL 会失败，按预期）
   - 输出：`data/fbref-epl-standings.json` + `data/fbref-epl-players.json`
   - 解析目标：积分榜（含 xG/xGA）+ 球队 squad 列表 + 每队球员标准统计（G/A/xG/xAG/npxG/PK/MP/Min 等 17 个字段）
   - 样本 HTML 测试通过（Man City / Liverpool / Haaland / De Bruyne 字段全部正确映射）

**结论**：

- **解析链路 100% 可行**，零依赖 + data-stat 正则方案足够稳定
- **抓取链路需生产方案**，Cloudflare JS 挑战无法靠 header 绕过，必须上 headless 浏览器或第三方服务
- **原型阶段路径**：手动保存 HTML → 脚本解析 → JSON，已跑通
- **决策推迟**：抓取方案待数据可用性确认后另立决策

**下一步**：

1. 用真实 FBref HTML（浏览器手动保存）跑一次完整原型，确认选择器对真实页面的兼容性
2. 评估 ScrapingBee/ScraperAPI 的免费额度和 EPL 20 队 + 380 场的请求量
3. 调研 FBref 是否有非 Cloudflare 的镜像/子域（如 fbref.com vs fbref.com/prem/）

---

### 2026-07-17 — ESPN 英超覆盖 + 第三方数据源初探

**调研内容**：第 1 项数据源调研 — 验证 ESPN 对英超的覆盖范围，并初步探测 FBref / Understat / Transfermarkt 的可用性。

**发现**：

1. **ESPN Scoreboard（赛程/比分）✅ 完全可用**
   - 端点：`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=YYYYMMDD-YYYYMMDD`
   - 联赛 slug：`eng.1`（世界杯是 `fifa.world`），格式完全一致
   - 返回 events[].competitions[0].competitors[] 的 `score`、`status.type.state`（pre/in/post）
   - 测试 2026-05 拉取到 41 场已完赛比赛，含比分与状态
   - **可复用 `espn.js` 的 `fetchEspnScores()` / `mapEspnName()` / `processEspnCards()` 几乎原样**

2. **ESPN Summary（球员名单/阵型/事件/统计/H2H）✅ 完全可用**
   - 端点：`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event={eventId}`
   - 测试 event 740942（2026-05-01 BUR vs LEE）：
     - `rosters[].formation` = "3-5-2"（阵型字符串格式与世界杯一致）
     - `rosters[].roster[]` 20 人，含 `jersey`、`athlete.displayName`、`position.abbreviation`、`starter`
     - `keyEvents` 25 条（进球/黄红牌/换人）
     - `boxscore.teams[]` 有技术统计
     - `headToHeadGames[]` 1 条（H2H 可用）
   - **可复用 `renderLineupCol` / `categorizePlayers` / `getFieldXY` / `getFormationYRows` 整套阵容可视化逻辑**

3. **ESPN Standings（积分榜）⚠️ 端点返回空**
   - `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/standings?season=2025` → `{}`
   - 与世界杯项目相同问题 — **采用本地 `computeStandings()` 从比分计算积分即可，已是成熟模式**
   - 不构成阻塞

4. **ESPN Injuries API ✅ 端点存在**
   - `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/injuries`
   - 结构：`{timestamp, status, season, injuries:[]}`，当前 off-season 所以 `injuries` 为空
   - 赛季中需重新探测是否填充 — 若有数据可替代手动维护的 `injuries.json`
   - **现有 `scripts/fetch-injuries.js` 的 Wikipedia 方案仍可作为 fallback**

5. **FBref ❌ Cloudflare 403 拦截**
   - `https://fbref.com/en/comps/9/Premier-League-Stats` 即使带完整浏览器 headers 仍 403
   - 浏览器端 fetch 必然失败（无 CORS + WAF）
   - **必须服务端抓取**：GitHub Actions + cheerio/htmlparser2 解析
   - HTML 结构稳定但偶尔变动，需维护选择器
   - 数据价值高（xG、详细球员统计），值得投入

6. **Understat ⚠️ HTML 页面可访问，数据嵌入页内**
   - `https://understat.com/league/EPL/2025` 返回 200，但数据通过 `JSON.parse` 混淆 JS 嵌入
   - 标准 Understat 混淆模式（`Data() = JSON.parse('...')` 字符串拼接），社区有成熟解密方案
   - 老版 `/league/get_stats/` API 端点已 404
   - **服务端抓取+解混淆可行**，但维护成本高于 FBref
   - 数据价值：xG/xA，与 FBref 重叠，**优先 FBref，Understat 作备选**

7. **Transfermarkt ❌ 直接 API 不可用**
   - `transfermarkt.com/api/v1/apiinit` 返回 405
   - 站点本身用 Cloudflare，社区版 API（`transfermarkt-api` 项目）也常被封
   - 身价/转会数据 **HTML 解析可行但脆弱**，建议作为 P2，不进 MVP

8. **Wikipedia ❌ 超时**（探测时连接失败）
   - 现有 `scripts/fetch-injuries.js` 已跑通 Wikipedia 模板方案，可推断 Wikipedia 可访问
   - 此次超时可能是临时网络问题，不影响结论

**结论**：

- **P0 范围（赛程/积分/球员名单/比赛详情）完全可行**，ESPN 单一数据源即可覆盖，几乎能直接复用世界杯项目的 `espn.js` / `data.js` / `schedule.js`
- **P1 球员统计（进球助攻排行）需服务端抓取 FBref**，架构上必须引入 GitHub Actions + HTML 解析，与现有体彩/伤病方案同模式
- **P2 身价/转会** 优先级最低，Transfermarkt 脆弱，建议 MVP 不做
- **架构定调**：浏览器端只读 ESPN，服务端抓取 FBref/Understat 落静态 JSON — 与世界杯项目一致，无需引入后端

**下一步**：

1. 验证 ESPN Injuries API 在赛季中是否有真实数据（需等待 8 月开赛或回测历史）
2. 编写 FBref 服务端抓取脚本原型，验证 cheerio 选择器稳定性
3. 估算 EPL 数据规模：380 场 × 20 球员 × 多维度，测试静态 JSON 加载性能
4. 调研 EPL 队名与 ESPN 队名差异（类似世界杯的 5 个差异需建立 `ESPN_TEAM_MAP`）

---

## 决策日志

> 记录关键决策点与理由，避免反复纠结

<!-- 模板：
#### 决策：[标题]
**日期**：
**背景**：
**选项**：
**选择**：
**理由**：
**后续影响**：
-->

#### 决策：Node.js 版本——暂用 20.19.6，engines 钉范围
**日期**：2026-07-24
**背景**：图纸未钉 Node 版本；本机为 nvm-windows 1.2.1，已有 20.19.6 / 20.18.3 / 14.18.0
**选项**：A) 升级 Node 22 LTS 再开工 B) 用现有 20.19.6 开工，22 以后顺手再装
**选择**：B——20.19.6
**理由**：Vite 6 支持 18/20/22+，Vite 7/8 的 `^20.19.0 || >=22.12.0` 恰好覆盖 20.19；Tailwind 4 要求 20+。构建产物是纯静态文件、与 Node 版本无关；原生模块走 NAPI，切版本免重装；npm 10/11 同为 lockfileVersion 3 无 churn。Node 20 已过 EOL（2026-04-30）但功能完全可用，属机器卫生问题
**后续影响**：engines 钉 `>=20.19.0` 范围；未来切 22 只需改 `.nvmrc` 与 Actions setup-node 各一行；若未来 Vite 大版本抛弃 Node 20，npm install 会显式报 engines 错误拦住，非静默破坏

#### 决策：Vite 钉 6，不走 latest
**日期**：2026-07-24
**背景**：图纸定 Vite 6，但 2026-07 执行 `npm create vite@latest` 装的是 Vite 7/8
**选项**：A) `npm create vite@6` 钉 Vite 6 照图纸 B) 图纸升级为 Vite 7/8
**选择**：A——钉 Vite 6
**理由**：6→7 是清理已废弃功能（sass 旧 API、CJS 构建等），7→8 是内核换 Rolldown/Oxc——本项目纯 vue-ts + Tailwind 官方插件、无 SSR/sass/CJS/自定义插件，全部沾不上；Vite 8 的构建提速对小 SPA 无感；区别不影响本项目，就没有理由偏离刚批准的图纸
**后续影响**：Vite 6 处维护线（仅安全修复）；官方有兼容层，将来可随时升 7/8。**开工当日（2026-07-24）实测印证**：`vue-router@latest` 已是 5.2.0，peerOptional 要求 Vite `^7.3.0 || ^8.0.0`，与 Vite 6 直接 ERESOLVE 冲突——必须钉 `vue-router@4`（实际装得 4.6.4）。生态在向 Vite 7/8 迁移，Vite 6 项目的依赖安装一律注意带版本号

#### 决策：CORS 实测结果与架构走向（方案 A）
**日期**：2026-07-24
**背景**：图纸 §13 待验证项——ESPN core API 浏览器 CORS；图纸默认按「不通」设计，实测意外通过
**选项**：A) 架构不变，core 数据全走 Actions B) 混合简化，部分 core 数据改浏览器直连
**选择**：A——架构不变（实测：core 通 / site.api 通 / Understat 不通）
**理由**：批量数据（球员全量 650+ 分页）浏览器逐用户直连把限流风险转移到访客侧；CORS 非 ESPN 承诺，生产功能不能架在 undocumented 行为上；两段式 + 静态懒加载的首屏/切换体验更优
**后续影响**：CORS 通道留作备用 + 调试；Phase 6 历史赛季可改浏览器按需直连（图纸 §12「历史按需拉」可行化）；Understat 钉死 Actions

#### 决策：项目根 = 仓库根 MatchLab，base 为 '/MatchLab/'
**日期**：2026-07-24
**背景**：图纸假设仓库名 football-data（base '/football-data/'），实际仓库为 MatchLab
**选项**：A) Vite 项目放仓库根，base '/MatchLab/' B) 建 football-data/ 子目录照图纸字面
**选择**：A——项目放仓库根
**理由**：图纸 §3 目录树本就是单仓库根结构，football-data 是假设的仓库名而非内层子目录；docs/、scripts/ 已在仓库根，根目录脚手架无冲突；Pages 的 base 必须等于实际仓库名，否则白屏（图纸 §12 风险条）
**后续影响**：图纸 Phase 0 命令与 base 值已同步更新；**前端所有静态 JSON 的 fetch 必须走 `import.meta.env.BASE_URL` 前缀，禁止 '/data/...' 绝对路径**（base '/MatchLab/' 下会 404）——图纸 §6.2 的 useJsonFetch 示例代码需在实现时按此修正
