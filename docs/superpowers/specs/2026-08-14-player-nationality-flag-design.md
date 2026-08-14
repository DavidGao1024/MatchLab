# 球员国籍国旗 设计稿

> 性质：球员数据补国籍字段 + 名字前展示国旗
> 数据源：ESPN core 球员档案现成的 `citizenship`（国名）与 `flag.href`（国旗图链接），实测三联赛可用
> 图源方案：**热链 ESPN 国旗图**（方案甲，总司令批准）——与队徽热链同一模式
> 展示范围：六个展示位（排行榜、收藏位不做，见「明确不做」）

## 一、背景与目标

当前球员数据（档案 `players/{id}.json` 与索引 `players/index.json`）**没有国籍字段**——抓取脚本从 ESPN 球员档案取数时把国籍丢掉了。实测 ESPN core 球员档案接口（`/leagues/{slug}/athletes/{id}`）返回：

- `citizenship`：英文国名（England / China PR / Norway……），抽查中超/西甲/英超球员均有值
- `citizenshipCountry.abbreviation`：三位国家码（ENG / CHN / NOR）
- `flag.href`：ESPN 官方国旗图链接（`https://a.espncdn.com/i/teamlogos/countries/500/{code}.png`，500×500 方形徽章图，单张约 4KB）

**目标**：抓取时顺手补两个字段（不新增任何请求），前端在球员名字前展示小国旗。

**非目标**：不做国名文字（含中文国名映射表）、不做排行榜、不做收藏相关位置、不做比赛阵容/事件时间线。

## 二、决策过程（均经总司令裁定）

| 问题 | 结论 |
|---|---|
| 展示范围 | 顺带零成本位：球员列表 + 球员详情 + 球队阵容 + 搜索下拉 + 对比页；排行榜不做 |
| 国名文字 | 只显旗子，悬停提示英文国名，不维护中文国名映射表 |
| 图源方案 | **方案甲：热链 ESPN 国旗图**。方案乙（下载国旗图进仓库）被否：队徽本就热链，单边本地化不解决外部依赖；方案丙（表情符号国旗）排除：Windows 浏览器不渲染，显示成字母 |
| 收藏位 | 原拟用「收藏时快照旗链接」方案覆盖收藏下拉与收藏页，总司令裁定**砍掉**——收藏位整体不做 |

## 三、数据管线改动（scripts/fetch-espn-core.js）

球员档案环节（构造 doc 处）多取两个字段，请求数不变（本来就抓档案）：

- **档案文件** `players/{id}.json`：加
  - `citizenship: profile.citizenship ?? null`（英文国名字符串）
  - `flag: (profile.flag && profile.flag.href) || null`（图链接字符串）
- **索引文件** `players/index.json`：每条索引项同样加 `citizenship`、`flag` 两项（列表页只读索引，不读档案——2600+ 球员不能逐个懒加载）

类型定义（`src/types/static.ts`）同步：`PlayerFile` 与 `PlayerIndexEntry` 各加可选字段 `citizenship?: string | null`、`flag?: string | null`。**必须可选**——线上旧数据文件没有这两项，补齐前前端照常工作。

数据补齐时机：代码入库后由每日定时抓取（或手动触发工作流）全量覆盖；`writeJsonIfChanged` 遇新字段人人有变、全量重写，一次跑完六联赛齐活。本地验证按项目约定跑单联赛脚本确认能跑，**不 commit `public/data/`**。

体积影响：索引每条加约 75 字节，单联赛索引文件增约四成（~50KB，英超 600+ 人基数下仍在可接受范围）；档案文件每份增约 100 字节，忽略不计。

## 四、前端数据流（stores/players.ts）

- `PlayerSummary`、`PlayerProfile`（`src/types/models.ts`）加同样两个可选字段
- `toSummary` / `toProfile` 映射函数透传
- **MiniSearch 白名单**（易漏点）：搜索下拉走全文索引，`storeFields` 是白名单制——须把 `citizenship`、`flag` 加进**四处**：`SearchDoc` 类型接口、`storeFields` 清单、`addAll` 的文档构造、`search()` 返回映射，否则搜索结果带不出旗子（中文搜索分支直接走索引数组，天然带出，不受影响）

## 五、新组件 NationFlag（src/components/common/NationFlag.vue）

照 `TeamLogo` 的热链 + 降级模式，但降级更简单：

- Props：`flag?: string | null`（图链接）、`citizenship?: string | null`（国名，供 title/alt）、`size?: number`（默认 16）
- **没有旗链接 → 什么都不渲染**（不占位，不渲染空盒）
- **加载失败 → 隐藏**（国旗不做首字母兜底牌，无意义）
- 样式：`rounded-full object-contain shrink-0`、`loading="lazy"`、宽高取 size
- `title` 与 `alt` 用英文国名（悬停提示）

## 六、展示位规格（六处）

| # | 位置 | 文件 | 尺寸 | 数据来源 |
|---|---|---|---|---|
| 1 | 球员列表 PC 表格，名字前 | `PlayersView.vue` | 16px | 索引 |
| 2 | 球员列表移动卡片，名字前 | `PlayerListCardMobile.vue` | 16px | 索引 |
| 3 | 球员详情页头部大字名旁 | `PlayerDetailView.vue` | 24px | 档案 |
| 4 | 球队详情页阵容，名字前 | `TeamSquad.vue` | 16px | 索引 |
| 5 | 搜索下拉球员行，名字前 | `SearchBar.vue` | 16px | 索引（经搜索白名单） |
| 6 | 对比页：候选下拉行 + 已选球员表头（PC 表格 + 移动卡） | `CompareView.vue` / `ComparePlayerCardMobile.vue` | 16px | 候选=索引，已选=档案 |

插入位置一律紧贴名字之前：flex 行（移动卡片、阵容、搜索下拉、对比页）沿用所在行既有 gap；inline 位（PC 表格名单单元格、详情页大字标题）无 gap 可循，旗与名字留约 4px 小间隙，必要时用 `align-middle`/`inline-flex` 对齐。不动各展示位现有布局结构与列宽。

## 七、降级与边界

- 线上数据补齐前（旧索引/档案无字段）：全前端不显旗、不报错、布局不变
- 索引有 1 小时浏览器缓存：线上数据补齐后，已访问过的用户最长 1 小时内仍读旧索引不显旗，无害自愈
- `citizenship` 有值但 `flag` 缺（理论边界）：不显旗
- ESPN 图站挂掉：img 加载失败自动隐藏，与队徽失败同感知
- 双语：旗子与语言无关，中英模式渲染一致

## 八、测试与验证

**单元测试**（沿用 `tests/` 现有套路）：
- NationFlag 四态：无链接不渲染 / 有链接渲染 / 加载失败隐藏 / title 取国名
- `toSummary` / `toProfile` 透传两字段（含缺字段旧数据不报错）
- 搜索白名单：`search()` 结果带出 `citizenship` / `flag`
- 既有组件测试补断言：`PlayerListCardMobile` / `ComparePlayerCardMobile` 现有测试各加「有旗渲染国旗」一条（旧用例 mock 数据无旗，组件不渲染旗，原断言不受影响）

**手测清单**（浏览器操作先请示总司令）：
- 六个展示位旗子显示正常，中英双语、桌面与 375px 移动视口各查一遍（移动视口用完恢复窗口尺寸）
- 旧数据容错：数据补齐前访问各页不显旗不报错
- 无国籍/图裂场景抽查

## 九、明确不做

- **排行榜**（LeadersView / LeaderRowCardMobile）：leaders.json 条目无国旗，补齐要前端另载索引对照，单独立项
- **收藏位**（收藏下拉 / 收藏页行卡）：原快照方案已按总司令裁定砍掉
- **国名文字与中文国名映射表**：只显旗子
- **比赛阵容 / 事件时间线**：实时 site.api 另一条数据管线
- **老数据回填**：等每日定时抓取自然覆盖，不做手工回填
