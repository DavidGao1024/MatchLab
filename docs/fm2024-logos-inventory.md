# FM2024 图标库资源档案（FMG Standard Logos Megapack）

> 建档日期：2026-09-28
> 建档缘由：换电脑迁移，需先固化目录结构与可复用资产，避免重查
> **路径约定**：本档一律使用**相对根目录**的路径。图包根目录 = 顶层那个 `FMG Standard Logos` 文件夹（旧机位于 `F:\FM2024_LOGOS\FMG Standard Logos\`；新机路径待补记：`________`）

---

## 一、一句话定性

**Football Manager 2024 风格的徽标巨包**（FMG 出品，2023-09 版），**6.8 GB / 约 33.4 万张 PNG**。

**它只有「徽标」**——队徽、赛事徽、国家足协徽、洲际徽、媒体徽、占位图六类。
**⚠️ 不含任何球员头像**（已全盘验证：不存在 face / player / people / staff 类目录）。球员头像属另一类独立图包（如 cut-out faces、DF11 等），本包没有。

---

## 二、顶层结构（六类 + 三个附属文件）

| 目录 | 内容 | 条目数 | config.xml 映射路径（权威证据） |
|---|---|---|---|
| `Clubs/` | 球队队徽 | 6.2 GB，约 30.1 万张 | `graphics/pictures/club/<id>/logo` |
| `Competitions/` | 赛事徽标（联赛/杯赛/超级杯） | 489 MB，约 2.9 万张 | `graphics/pictures/comp/<id>/logo` |
| `Nations/` | **国家足协/国家队徽标**（非纯国旗） | 42 MB，约 2.7 千张 | `graphics/pictures/nation/<id>/logo` |
| `Media/` | 媒体机构徽标（TEAMtalk、as.com 等） | 4.7 MB，270 张 | `graphics/pictures/media_source/<id>/logo` |
| `Default/` | FM 占位图（无徽标时兜底） | 1.3 MB，69 张 | 无独立 config，随各分类 |
| `Confederations/` | 洲际足联徽标（CAF、UEFA 等） | 1.2 MB，116 张 | `graphics/pictures/continent/<id>/logo` |

附属文件（根目录）：

- `FMG Standard Logos Megapack.png` — 16 MB，1080×1350 封面图
- `Football Manager Graphics.png` — 264 KB
- `Original Defaults.zip` — 1.1 MB，内含 FM 原始默认图（`Default/Club/Normal/0–14.png`）

---

## 三、变体体系（**最容易看漏的部分**）

每个子分类下是 `Normal` / `Alternatives` / `Retro` / `Fantasy`（后二者仅部分分类有），再分 `Normal` / `Small` 两档分辨率，各档还有 `@2x` 高清版。

| 变体 | 含义 | 文件名后缀 |
|---|---|---|
| `Normal/`（外层） | 常规版 | 无后缀 |
| `Alternatives/` | 替代设计（同一 ID 多套风格） | `<id>alt.png`、`<id>alt1.png`… |
| `Retro/` | 历史/复古版 | `<id>retro.png` |
| `Fantasy/` | 虚构/幻想版（非真实实体） | `<id>fantasy.png` |

分辨率矩阵（实测）：

| 位置 | 尺寸 | 典型体积 |
|---|---|---|
| `Normal/Normal/` | 180×180 | 3–30 KB |
| `Normal/Normal/@2x/` | **512×512** | 10–120 KB |
| `Normal/Small/` | 25×18 | <2 KB |
| `Normal/Small/@2x/` | 50×36 | <5 KB |
| `Media/*` | **512×512**（无 Small/@2x） | 6–11 KB |
| `Default/Club/Normal/` | 512×512 | 27 KB |
| `Default/Competitions/Normal/` | 512×512 | 31 KB |
| `Default/Continents/Normal/` | 256×256 | 17 KB |

要点：

- `Normal 与 Small 的 ID 集合完全一致`（已用文件名集合 diff 验证）——**同一批 ID 的两档分辨率**，不是两批素材
- Clubs 与 Competitions 的 `@2x` 比 `Normal` 少 1 张（无关紧要）
- `Alternatives` 里混杂了少量**语义文件名**（如 `chile eprimera.png`、`New Zealand Central League.png`），是定位 ID 的额外线索

各叶子目录清单（实测文件数）：

| 目录 | 文件数 | 目录 | 文件数 |
|---|---|---|---|
| `Clubs/Normal/Normal` | 72,196 | `Competitions/Normal/Normal` | 6,706 |
| `Clubs/Normal/Small` | 72,196 | `Competitions/Normal/Small` | 6,706 |
| `Clubs/Normal/Normal/@2x` | 72,196 | `Competitions/Normal/Normal/@2x` | 6,706 |
| `Clubs/Normal/Small/@2x` | 72,196 | `Competitions/Normal/Small/@2x` | 6,706 |
| `Clubs/Alternatives/Normal` | 1,547 | `Competitions/Alternatives/Normal` | 419 |
| `Clubs/Fantasy/Normal` | 936 | `Competitions/Retro/Normal` | 154 |
| `Clubs/Retro/Normal` | 660 | — | — |
| `Nations/Normal/Normal` | 242 | `Media/Normal` | 117 |
| `Nations/Retro/Normal` | 286 | `Media/Alternatives` | 147 |
| `Nations/Alternatives/Normal` | 78 | `Media/Retro` | 6 |
| `Nations/Fantasy/Normal` | 77 | `Confederations/Normal/Normal` | 7 |

（每类的 Normal/Small/@2x 三档数量相同，略）

---

## 四、命名与 ID 体系（最大障碍）

- **文件名 = FM 内部数字 ID**，无任何名称字段
- 包内共 **15 份 `config.xml`**，内容形如 `<record from="11" to="graphics/pictures/comp/11/logo"/>`——**只有 ID→路径，没有名字**
- 结论：**任何用途都要先自建「FM ID ↔ 我们的 slug/ID」对照表**
- 已确认的 ID 命名空间互不重叠：club / comp / nation / continent / media_source

---

## 五、已核验的 ID 对照（本项目的六个联赛）

| 联赛 | FM ID | 佐证 | 替代设计 |
|---|---|---|---|
| 英超 | **`11`** | 狮子徽 + `Alternatives/11alt1–26` | 26 套（最多） |
| 西甲 | **`67`** | LALIGA EA SPORTS（压深底后可见） | `67alt1–7` |
| 意甲 | **`32`** | SERIE A TIM | — |
| 德甲 | **`22`** | BUNDESLIGA | `22alt`、`22alt1` |
| 法甲 | **`16`** | LIGUE 1 uber Eats | — |
| **中超** | **无** | 全库 53 条中国赛事**一律套用「CFA 中国」足协通用盾**（抽检 8 张无一例外） | — |

附赠已确认项：

| 赛事 | ID | 备注 |
|---|---|---|
| 西乙 | `68` | LALIGA HYPERMOTION |
| 欧冠 | `1301394` | UEFA CHAMPIONS LEAGUE |
| 欧联 | `1301395` | UEFA EUROPA LEAGUE |
| 欧洲优胜者杯 | `1301396` | |
| 中国足协杯 | `135941` | 中国足球协会杯（CFA CUP） |
| 中国（国家/足协） | `110`（Nations 目录） | CFA 中国 |
| TEAMtalk / as.com | `133` / `2000230805`（Media 目录） | |

**关键提醒**：FM 数字 ID ≠ ESPN 的赛事 slug/ID，两套体系无关，必须手工对照。

---

## 六、两个必须知道的坑（否则会误判）

1. **图片全为透明底**。白字标在默认渲染下**看起来就是空白方块**，纯色字标看起来像"纯色占位块"——本次曾把西甲 `67.png` 误判成"红方块"。**必须先压到深色底再看**（工具见下）。
2. **批量读图存在错位风险**。一次性读多张图时，返回顺序可能与请求顺序不一致，导致张冠李戴。**核验必须用带文件名标签的拼版图**（标签烘焙进像素，无法错位）。

---

## 七、本次自建工具链（可复用，`docs/fm2024-logos/` 下）

| 脚本 | 用途 | 备注 |
|---|---|---|
| `docs/fm2024-logos/ocr-batch.ps1` | 用 **Windows 自带 OCR** 给整目录图标批量建「ID→识别文字」索引 | 全量 6,706 张赛事图约 8 分钟；单进程循环，勿逐张起进程 |
| `docs/fm2024-logos/ocr.ps1` | 单张 OCR 测试 | |
| `docs/fm2024-logos/flatten.ps1` | 把透明底 PNG 压到深灰底再输出（解决坑 1） | 支持逗号分隔多文件 |
| `docs/fm2024-logos/contact-sheet.ps1` | 生成**带文件名标签的拼版图**（解决坑 2） | 支持自定义列数 |

索引产物（本次生成，可随包一起带走，或按需重建）：

- `docs/fm2024-logos/competitions-ocr.tsv` — 赛事 180px 版，3,627 条有文字
- `docs/fm2024-logos/competitions-ocr-2x.tsv` — 赛事 512px 版，**4,582 条**（识别率更高，推荐用这份）
- `docs/fm2024-logos/alt-ocr.tsv` — 备选图 185 条

⚠️ 注意：**中文 OCR 引擎在本机不可用**（指定 `zh-CN` 会静默退回英文引擎，两轮产物条目数完全相同即为此故）。中文赛事靠"CFA/中国"等可见拉丁字母与字形反推。

---

## 八、缺口与限制（用之前必须知道）

| 项 | 结论 |
|---|---|
| **中超** | 包内只有足协通用盾，**无真实中超 logo**。若要用，需另找来源 |
| **球员头像** | **完全没有**，此包不含 |
| 国旗 | Nations 是**足协徽标**（如中国 CFA、喀麦隆 FECAFOOT），**不是纯国旗**，替不了我们现有的 flagcdn |
| 版本 | 2023-09（FM24 上市期），**距今约 3 年**；队徽/赛事徽可能过时（如新版队徽、升班马） |
| 授权 | **无任何许可说明**，属社区转载图包，图版权归各联赛/俱乐部/媒体。我方 2026-08-18 刚做完合规收尾，引入前需拍板 |

---

## 九、检索方法备忘（如何在任意时刻重新定位一个图标）

1. 用 `ocr-batch.ps1` 对 `Competitions/Normal/Normal/@2x` 建索引（约 8 分钟）
2. 在 TSV 里 grep 关键词（如 `Liga`、`Bundesliga`、`Premier`）
3. 命中 ID 后，用 `contact-sheet.ps1` 生成**带标签拼版**肉眼确认
4. 拿不准时优先看 `Alternatives/`——**大联赛的替代设计数量远多于小联赛**，这本身就是识别线索（英超 26 个、西甲 7 个）
5. 中文赛事搜 `中 ?国`（OCR 会在汉字间插空格）

---

## 十、潜在拓展用途（未来功能，暂不实施）

归档原因：**这套资源以后可能用得上，属于"备着"的资产**。按可行性排序：

| 优先级 | 用途 | 用到的目录 | 前置条件 |
|---|---|---|---|
| ★★★ | **联赛徽标上站**——首页战报带 / 积分榜 / 赛程页头，把文字角标「英超」换成真徽标 | `Competitions`（11/67/32/22/16） | 建 6 条 ID 对照（已核验 5 条）；中超需另找 |
| ★★★ | **球队队徽兜底**——ESPN 缺队徽的队用统一风格占位，消除空白列 | `Clubs/Normal`、`Default/Club` | 需 FM club ID ↔ ESPN team ID 映射（30 万条，工作量大） |
| ★★ | **杯赛页面**（欧冠/欧联/优胜者杯）——若将来扩展赛事范围 | `Competitions`、`Confederations` | 数据源另议（ESPN 有 UCL slug） |
| ★★ | **国家队/足协徽标**——现在球员国籍用国旗，可升级为足协徽；或将来做国家队赛事页 | `Nations`（242 张国家，`110`=中国） | 需 FM nation ID ↔ ISO 映射 |
| ★ | **媒体来源标识**——页脚/数据来源标注（TEAMtalk、as.com 等） | `Media`（270 张） | 低优先，且涉他方商标 |
| ★ | **复古/备选风格**——赛季回顾、主题皮肤 | `Retro`、`Alternatives`（英超 26 套备选） | 需 UI 主题化改造 |
| ★ | **占位图体系**——无数据时的视觉兜底 | `Default`（69 张） | 随时可用，零映射 |

**共同前置条件（两个，缺一不可）**：

1. **ID 对照表**——包内只有 FM 数字 ID，无名称；任何用途都要先建映射（方法见第九节）
2. **授权拍板**——无许可说明的社区图包，且我方 2026-08-18 刚做完合规收尾；**商用化决策也尚未落定**，引入前需总司令明确

---

## 十一、一句话总结

**队徽资源极其充足（30 万张，含 Normal/Small/高清/备选/复古/虚构六种变体），赛事徽标够用但需自建 ID 对照，中超和球员头像是两个硬缺口。**