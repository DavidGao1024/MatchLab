# 《football‑site‑checklist.md》对照分析报告

> 日期：2026-08-17
> 性质：纯分析，未改任何代码/配置。供次日复核。
> 被分析文档：`docs/football‑site‑checklist.md`（下简称「清单」）
> 分析方法：通读清单 + 代码事实核查（grep 密钥/后端/直连/盗链），不臆测。

---

## 0. 一句话结论

清单的安全与法律建议**大部分正确、标准**；但它假设的部署架构（香港/新加坡 VPS + Nginx + Cloudflare + 自建后端 + 数据库）与 MatchLab 现状（**GitHub Pages 纯静态 SPA，无后端、无数据库、无任何 API Key**）不符。因此**多数服务器/后端/数据库条目对现状是"不适用"，而非"要改"**；真正与现状相关、且被清单点名的是**数据源合规**（懂球帝/ESPN/Understat 抓取、盗链队徽）。改动量：基础设施条目照做 = 整体重构（最大）；数据源合规 = 策略+管线改动（中–大）；个别项（停抓、加来源声明）= 小。

---

## 1. 现状架构（事实基线，已核查）

| 维度 | 现状 | 证据 |
|---|---|---|
| 部署 | GitHub Pages 静态站（base `/MatchLab/`，hash 路由） | CLAUDE.md / vite.config |
| 后端 | **无** | 仓库无服务端代码 |
| 数据库 | **无** | 数据为 git 跟踪的静态 JSON（`public/data/`） |
| API Key | **无** | grep `Authorization/apikey/Bearer/process.env` 仅命中 `PLAYERS_LIMIT`/`SEASON_START`/`WITH_PLAYER_HISTORY` 三个本地开关，非密钥 |
| 实时数据 | 浏览器**直连** ESPN site.api（CORS 已验证） | `src/composables/useEspanFetch.ts:5` |
| 历史数据 | 浏览器可直连 ESPN core（Phase 6） | `src/composables/useEspnCoreFetch.ts:8` |
| 低频数据 | Actions 抓 ESPN core/Understat/懂球帝 → 静态 JSON → 前端 fetch 本站 JSON | scripts/ + .github/workflows/fetch-data.yml |
| 图片 | TeamLogo/NationFlag **热链** `a.espncdn.com` 队徽/国旗；**无**球员肖像 | 组件 + 数据 href |

---

## 2. 清单逐节核对（数据安全聚焦）

### 2.1 判定为「正确」的条款（标准做法，与我们无关或可借鉴）
- API Key 不入前端、经自建后端中转、CORS 不通配、密钥不入日志、配额监控、失败降级不吐错误栈。✔（我们无密钥，故无泄密面；但原则正确）
- 数据库不曝公网、SSH 密钥登录、`server_tokens off`、`autoindex off`。✔（我们无 DB/VPS，不适用但正确）
- Cloudflare `Full(strict)` 必须受信任证书（禁自签名）、用完整 CF IP 段取真实 IP、`/api/*` 绕缓存、API 加 `no-store`。✔
- "公网可访问即算商用、不论是否投广告"。✔（对多数 API 协议是正确谨慎）
- "单条比分是客观事实不版权保护；整理后事件流/xG/整套数据库属汇编作品受保护"。✔（合理法律框架，管辖有差异）

### 2.2 判定为「不适用」的条款（我们没有这一层）
- 整个 §二（VPS/Nginx/CF 配置）与 §三 的后端代理/CORS/数据库项。我们是 GitHub Pages 静态站，**配不了 Nginx/CF，也没有后端/DB**。这些不是"要改"，是"没这个层"。

### 2.3 判定为「命中差距」的条款（现状被点名）
| 清单条款 | 现状 | 风险级 |
|---|---|---|
| 🔴 禁逆向抓商业站内部接口对外服务 | Actions 抓 ESPN core/site.api + Understat 并公开 | 最高 |
| ❌ 严禁爬懂球帝 | `fetch-dqd-players.js` 正抓懂球帝 | 高（在禁止清单上） |
| ❌ 禁盗链队徽/头像 | 热链 `a.espncdn.com` 队徽/国旗 | 中（无肖像，较好） |
| 🟠 API Key 泄露 | 无密钥 | 无（没东西可泄） |
| 🟠 数据库曝公网 | 无 DB | 无 |
| 🟡 /api 旧缓存 | 无 /api | 不适用 |

**说明**：浏览器直连 ESPN 是有意设计（CORS 已验证、且规避服务器 IP 被 Akamai 403 的坑，见记忆 project_espn_siteapi_ua）。因无密钥，不构成泄密，只构成"抓取合规"问题——即清单风险 #1。

---

## 3. 改动量评估

### 路线 A：维持 GitHub Pages 静态（近期推荐）
| 项 | 量级 | 说明 |
|---|---|---|
| 停懂球帝持续抓取（保留已缓存译名表） | 小 | 不再跑 fetch-dqd-players；players-zh 已入库可继续用 |
| 页面底部加数据来源声明 | 极小 | 纯文案 |
| 队徽/国旗本地化或换开源 SVG 库 | 中 | 换图源 + 下载/自托管 |
| 换持牌付费 API 替代 ESPN/Understat 抓取 | **大** | 重写全部 fetch 脚本 + 持续费用 |

### 路线 B：照清单上 VPS+Nginx+CF+后端+DB
- = 部署整体重构 + 自建后端代理 + CI/CD + TLS +（可选）DB。**最大**。本质即您悬而未决的「商用化/隐藏代码」路线。

---

## 4. 建议优先级

1. **先做低成本高价值**：停懂球帝持续抓取；加数据来源声明。
2. **队徽本地化/开源库**，降盗链风险。
3. **换付费 API + 后端化** 留到商用化阶段，与既有商用决策一并定。

---

## 5. 待决问题（并入商用决策）

- 本项目数据源（ESPN/Understat/懂球帝）均无明确商用授权；若商用，需按清单切持牌 API（API-Football 等）或承担风险。
- 是否从 GitHub Pages 迁到 VPS+CF（隐藏代码 + 满足清单架构），即既有商用决策待办。
- 本清单可视为该商用决策的**执行路线图**。

---

## 附：次日复核提示

- 清单中 API 免费层限额/价格（football-data.org、API-Football、TheSportsDB）会随服务商变化，落地前需重核官网 ToS。
- "汇编作品/不正当竞争"属地管辖有差异，重大决策建议咨询律师，本分析仅为工程视角。
