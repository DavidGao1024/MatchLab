# ESPN scoreboard 日期区间语法废弃 — 修复计划（完工留档）

> 日期：2026-09-23
> 状态：✅ 完工（commit `e2144c3e` 已 push，部署已上线）
> 关联：`docs/data-site-mvp-plan.md` 调研记录 2026-09-23 + 决策日志同日条

## 一、故障画像

| 项 | 内容 |
|---|---|
| 表象 | Fetch Data 自 09-17 起连红 4 次（09-17/19/20/21），静态数据冻结 09-14 |
| 失败步 | 「Fetch ESPN scores + compute standings」；后续转会/提交/体检全 skipped |
| 根因 | ESPN 废弃 scoreboard 日期区间语法：`dates=YYYYMMDD-YYYYMMDD` 一律 400 `Failed to get events endpoint.` |
| 连带 | 赛季交替探测同走区间 URL，400 被 `catch {}` 静默吞掉 → `league.season` 险停旧季 2025 |
| 线上 | 前端 `fetchLiveScores`（积分榜当月）+ `fetchScoresRange`（昨日战报）同源失能 |

## 二、高危陷阱（务必记住）

只修取数（`fetch-espn-scores.js`）不修赛季探测（`espn-endpoints.js`），管线会把 **2025-26 旧季数据覆写进 2026-27**——比红灯本身更糟。两处必须同修。

## 三、任务勾选

- [x] T1 抽 `monthToken(key)` 纯函数入 `scripts/lib/espn-endpoints.js` + 单测（3 项）
- [x] T2 `fetch-espn-scores.js` 月窗口 `dates` 区间 → 月令牌
- [x] T3 `espn-endpoints.js` 赛季探测改月令牌 + **失败改为出声明**（堵静默吞错）
- [x] T4 前端 `monthDateRange` → `monthToken`（`dates=YYYYMM`），契约测试同步
- [x] T5 `fetchScoresRange` 重写：覆盖月逐月取数 + 本地按日过滤（±1 天时区松弛）
- [x] T6 本地端到端复跑 + 体检
- [x] T7 全量回归 + 浏览器实测（本地 + 线上）

## 四、验证实据

| 项 | 结果 |
|---|---|
| 等价性（旧区间 vs 整月令牌） | eng.1 30/30、esp.1 39/39、chn.1 11/11 **逐场 eventId 全等** |
| 赛季判定 | 六联赛全切 **2026**（修复前停在 2025） |
| 旧赛季文件覆写 | **0 个**（陷阱排除） |
| 端到端跑脚本 | 六联赛全成，窗口 2026-07 → 2027-06 |
| 数据口径 | 08 月 20 场 + 09 月 30 场 = 50 场 = 5 轮，与榜首 5 战 15 分吻合 |
| 体检 `check-suspicious-matches` | exit 0（0-0 联网核验 140 场无异常） |
| 单测 / typecheck / build | 403 全绿 / 通过 / 通过 |
| 浏览器（本地 5174） | 战报带「9月21日·周一」渲染，六联赛 `dates=202609` 全 200，console 0 错 |
| 浏览器（线上 GH Pages） | 积分榜 2026-27 20 队正常 + 战报带渲染 + 六联赛月令牌全 200 |

## 五、后续

1. **Action 实跑闭环**：Fetch Data cron `0 23 * * 0,3,5,6`（UTC）= 北京周四/六/日/一 07:00，即 2026-09-23 23:00 UTC 后由红转绿即可销案；急可 `workflow_dispatch` 手动触发。
2. 陈旧残迹（非本次引入，观察级）：线上 console 有 `vite.svg` 404 与中超空赛月（2026-01/02/12）JSON 404——脚本按设计不写空月文件，前端已有兜底。
3. 5173 端口被上次会话遗留 dev 服务占（PID 45404），本次改用 5174。