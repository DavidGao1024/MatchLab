# 球队旗面真彩重设计 · 设计稿

> 日期：2026-08-28
> 视觉基准：`tmp/team-redesign.html`（定稿板，含六队 Hero / 订阅卡 / 整页示例）
> 自验截图：`tmp/mockup/real-{arsenal,madrid,juventus,home-cards}.png` + `real-arsenal-solid-border.png`（最终版）
> 范围：球队详情页旗面 + 首页订阅卡旗面，两处同步

## 一、背景与原则

08-27 旗面改主副色交替条纹（25abcc20）后，围绕「真彩 vs 明度软压 vs 遮罩」讨论三轮。08-28 总司令定调：

1. **真彩直上**：不做明度软压、不加全屏遮罩、不用满幅粗条纹交替；
2. **队色只留旗面**：旗面之外全部朴素深色；
3. **文字对比只看主色**：副色只管纹与边，不参与文字对比。

工作区现存的「真彩 + 描边、无遮罩」未提交改动（08-27 17:28）被本设计取代，实施时直接覆盖。

## 二、旗面公式（两处通用）

| 层 | 规则 |
|---|---|
| 背景 | 真主色实底 |
| 细针纹 | 真副色斜纹：3px 宽、22px 周期、116deg；不透明度 = 主色亮 ? 0.55 : 0.35 |
| 边框 | 真副色纯色 100%（08-28 总司令改：不要渐变，左右一致）：详情页 1px 全圈 / 订阅卡作 2px 底线 |
| 兜底 | 副色缺失或与主色最大通道差 < 24（沿用 `altDistinct` 阈值）：边框退纯白 `#ffffff`，针纹退半透明白（不透明度同上） |

## 三、文字规则（含描边突出）

主色明度（`luminance` 线性加权）判定，阈值 **0.55**：

| 主色 | 文字 | 描边（paint-order: stroke fill） | 阴影 |
|---|---|---|---|
| 亮（>0.55） | 深字 `#0f172a` | 白描边：队名 1px（订阅卡 0.8px）/ 小字 0.6px，`rgba(255,255,255,0.55)` | `0 1px 3px rgba(255,255,255,0.5)` |
| 暗 | 白字 | 深描边：`rgba(0,0,0,0.55)`，粗细同上 | `0 1px 4px rgba(0,0,0,0.45)` |

兜底圆牌（TeamLogo 无徽标时）不改组件，沿用 3a52cb31 的明度深字修复。

## 四、详情页 TeamDetailView

- `.team-flag` 按公式重写：删满幅条纹交替、删 `::before` 遮罩、删旧描边独存版；
- `isLight` 判定改为「主色明度 > 0.55」，删除「副色亮也算」的旧逻辑；
- **accent 收掉（四处）**：积分格数字 `.val-pts` 改 `#fff`；阵容标题 `.squad-title` 底线改 `rgba(255,255,255,0.35)`；页签选中内联 `borderColor` 改 `rgba(255,255,255,0.35)`；`TeamSquad` 位置分组小标题删 `var(--accent)` 内联色、回 `#94a3b8`；`themeVars` 删 `--accent`；
- 保留不动：赛程列表队色小圆点（功能性色点，非装饰）、战绩格 / 下一场 / 赛程其余朴素样式。

## 五、订阅卡 MyTeamCard

- `.flag` 背景由渐变改主色实底 + 针纹 + 渐变副色**底线 2px**（`border-bottom: 2px solid transparent` + 同款双背景）；
- 卡外框保持中性 `rgba(255,255,255,0.16)` hairline（多卡并排不花）；
- 排名徽章沿用 `is-light` 深浅两套；
- 数据区布局不动，**accent 收掉（三处）**：`.val-pts` 改 `#fff`、直播比分 `.score-num` 改 `#fff`、`.stat-pts` 删 accent color-mix 与普通格同款。

## 六、teamColor.ts 重写

`bannerTheme` 重构为旗面新主题函数（可改名，两调用点同步）：

- 入参 `(main, alt)` 不变；主色缺失时沿用两调用点现有兜底（联赛色 / `#3D195B`），不在函数内处理；
- 出参收敛为：`darkText`（明度 >0.55）、`stripe`（针纹 rgba 串，含兜底）、`border`（边框纯色串，含兜底）；
- 删除旧字段 `from / to / stripe旧义 / pinFrom / pinTo / accent`；
- `luminance / hexToRgb / mix / altDistinct` 保留。

## 七、测试与验证

- `tests/utils/teamColor.test.ts` 同步重写：0.55 深字阈值、副色兜底判定、针纹/边框 rgba 输出；
- `tests/views/TeamDetailView.test.ts`、`tests/components/MyTeamCard.test.ts` 中主题相关断言（is-light、CSS 变量）同步改；
- typecheck + 全量单测绿；
- 浏览器实测六极端队 × 两页面：皇马（白主）/尤文（黑主）/拜仁（红）/曼城（天蓝）/阿森纳（红+白副）/伯恩茅斯（红+黑副），重点看描边突出效果与边框兜底队。

## 八、不做

- 明度软压、全屏遮罩、满幅粗条纹；
- TeamLogo 组件改造；
- 数据结构 / API 接口任何变更；
- 旗面之外的队色装饰（accent 已收，不再新增）。
