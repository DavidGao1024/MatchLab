# 球员国籍懂球帝补齐 设计稿

> 日期：2026-08-17
> 前置：`docs/superpowers/specs/2026-08-14-player-nationality-flag-design.md`（国籍国旗六展示位，已完工）
> 性质：数据管线增强（脚本层），前端零改动

## 一、背景与目标

国籍国旗功能上线后实测覆盖率不均：英超 100% / 西甲 95.7% / 意甲 99.1% / 德甲 99.1% / 法甲 98.4% / **中超 49.2%**（2026-08-17 本地全量实测）。

缺因实证（非抓取 bug）：

- 直连 ESPN core 原始档案（如王钰栋 365941、谢文能 317989）：顶层**无** `citizenship`/`flag` 键，`birthPlace` 为空对象；
- 花名册端点条目仅 `$ref` 链接，无国籍，不可补；
- 中超缺旗集 252 人清一色中国球员（含维吾尔族球员），无一外援——ESPN 只对档案较全/有国脚背景者填国籍。

懂球帝球员详情页 NUXT `base_info` 带 `nationality`（中文国名，如「澳大利亚」）、`nationality_logo`、`other_nationality`（双重国籍，数组）——2026-08-17 实测。

**目标**：脚本层对 citizenship 缺失球员用懂球帝源补齐，落库形态与 ESPN 现有形态完全一致（**英文国名 + ESPN countries CDN 国旗**），六联赛统一逻辑，前端零改动。

## 二、数据流（三层）

### 2.1 fetch-dqd-players.js 扩展

- 抓详情页时顺带提取 `base_info.nationality`（**只取主国籍**，`other_nationality` 不取）。
- 新产物 `public/data/mappings/players-nationality.json`：

  ```json
  { "_generated": "2026-08-17", "_source": "懂球帝球员详情页 base_info.nationality",
    "players": { "Wang Yudong": "中国", "Yudong Wang": "中国", "...": "..." } }
  ```

- 键生成复用现有 `expandNameVariants`（与 players-zh.json 同款：原序/反序/短名/去重音变体），值 = 中文国名。
- 合并策略同 players-zh（与已有文件合并）。**手动跑、提交入库**——国籍极少变动，不进每日管线。

### 2.2 scripts/lib/country-map.js（新）

- 静态手维护表：`中文国名 → { en: 英文国名, code: ESPN countries slug }`。
- 初版覆盖 dqd 数据实际出现的国名集合（施工时聚合出现清单逐条填表）。
- `code` 正确性用既有 ESPN 数据聚合的「英文国名 → code」集合交叉校验，不一致 console 警告。
- 中国条目手填 `{ en: 'China PR', code: 'chn' }`（`chn.png` 已实测 HTTP 200；en 用「China PR」与 ESPN 存量中国籍实值对齐，避免同库两种写法）。韩国 code 为 `kors`（ESPN 实际 slug，非 `kor`）。
- 未映射中文国名：跳过补齐 + console 警告（警告清单即补表线索）。

### 2.3 fetch-espn-core.js 补底

- doc 构造处：`profile.citizenship` 缺失时，以球员多个名字形态（displayName/shortName 及各自反序/去重音变体，生成规则同 `expandNameVariants`）逐个作键查 `players-nationality.json`，取首个命中 → 中文国名 → country-map → 落 `citizenship = en`、`flag = https://a.espncdn.com/i/teamlogos/countries/500/${code}.png`。
- **ESPN 已有值不覆盖**（仅缺失时补）。
- 映射文件缺失/不可读：静默跳过，脚本可独立运行（Actions 首跑零影响）。
- index.push 两字段随 doc 自动带出（现有透传不变）。

## 三、集成与运维

- `.github/workflows/fetch-data.yml` **零改动**：映射文件是入库静态数据，espn-core 每日跑时读它补底；不新增高频 Actions 任务（月额度余量不大，CLAUDE.md 约束）。
- players-nationality.json 更新随手动跑 fetch-dqd-players（频率同 players-zh）。
- 映射入库后下一次全量 espn-core 会带补齐字段重写球员档案（一次性全量重写，属预期，同 08-17 本地全量行为）。

## 四、兼容与降级

- 前端零改动；NationFlag `v-if="flag && !failed"` 天然降级保留。
- 三级静默：无映射文件不补 / 键不命中不补 / 国名未映射不补。
- 补齐命中者与 ESPN 来源球员形态一致（英文国名 tooltip + ESPN 圆旗）。

## 五、测试策略

- 单测（TDD）：补底纯逻辑抽到 `scripts/lib/nationality-fill.js`（CommonJS，纯函数无网络），覆盖五态：命中补齐 / 无映射文件 / 键不命中 / 国名未映射 / ESPN 已有值不覆盖。vitest 以 `createRequire`（node 环境）加载该 CJS 模块（项目首个脚本单测，无先例但机制标准）。
- dqd 扩展：单队冒烟（`node scripts/fetch-dqd-players.js <dqd队id>`）验 nationality 提取落盘。
- 端到端：本地全量跑后中超带旗率 49% → 预期 90%+，五大赛抽查提升；抽样 HTTP HEAD 验补齐旗 URL 可达。
- 回归：现有 278 项测试全绿 + typecheck 零错。

## 六、明确不做

- 不展示双重国籍（other_nationality）；
- 不抓懂球帝其他字段（身价/周薪等）；
- 不改前端/类型/store（两字段透传链路已备）；
- 不将 fetch-dqd-players 纳入每日 Actions。

## 七、风险

- 名字变体命中率（中超 ~96%、五大赛 ~80–87%）决定补齐上限，漏者静默跳过；
- 中文国名译法差异（如「科特迪瓦」异写）靠警告列表补表；
- ESPN countries CDN 热链为既有依赖（同国籍国旗功能）。
