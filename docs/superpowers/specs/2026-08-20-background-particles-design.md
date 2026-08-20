# 背景金色粒子动效 · 方案一（画布粒子漂浮）

> 日期：2026-08-20
> 范围：新增 `BackgroundParticles.vue` 全屏背景粒子层 + 接入 `App.vue`
> 前提红线：**现有三层背景与内容层零影响**；`prefers-reduced-motion` 下不启动；移动端粒子减半
> Mockup 参考：`tmp/mockup/background-dynamics.html`（四模式切换预览）

## 一、背景与决策

**问题**：MatchLab 现有背景三层全是静态的——深蓝底 `#0c101b`、球场标线纹理 `.pitch-texture`（opacity 0.03）、顶部联赛光晕 `.league-glow`。缺"动"。

**用户诉求**：给背景加动感元素，参考世界杯项目（`E:\GitHub\WorldCup2026`）的画布金色粒子漂浮。

**方案选型**：做了三种方向的预览，用户选定**方案一 · 画布粒子漂浮**（金色）：

| 方案 | 结论 |
|---|---|
| 一 · 画布粒子漂浮（金色光点呼吸、随机漂移） | ✅ 选定，最贴世界杯 |
| 二 · 纯 CSS（光晕呼吸 + 顶部扫光 + 纹理漂移） | 暂不做 |
| 三 · 混合（CSS 打底 + 粒子点睛） | 暂不做 |

**粒子颜色决策**（方案讨论时确认）：**金色 `#ffd700`**（最贴世界杯、深蓝底上最显眼），不跟随联赛色。

## 二、目标与约束

**目标**：在现有三层背景之上加一层金色粒子飘浮，全站各页可见，观感贴世界杯。

**约束**：
1. 现有背景三层（深蓝底 / 标线纹理 / 联赛光晕）与内容布局**零影响**
2. **性能优先**：粒子数量少（桌面 70、移动 35），`prefers-reduced-motion` 下完全不画，组件卸载即停逐帧循环
3. 可访问性：画布 `aria-hidden` + `pointer-events: none`（不挡点击、不进读屏）
4. 零依赖：纯 Canvas 2D，不引入任何动画/粒子库

## 三、实现方案

### 层级（从底到顶）

```
body 深蓝底          ← 已有
.pitch-texture 纹理  ← 已有
.league-glow 光晕    ← 已有
粒子画布 canvas      ← 新增（z-index: 0, pointer-events: none）
main 内容 (z-10)     ← 已有，粒子在其下不挡交互
```

### 粒子参数（照搬世界杯项目 `initParticles`）

| 项 | 值 |
|---|---|
| 数量 | 桌面 70，移动 (<768px) 35 |
| 半径 | 0.5 ~ 2px |
| 速度 | ±0.15px/帧 随机 |
| 颜色 | `rgba(255,215,0, alpha)`，alpha 约 0.2~0.6 基础上做正弦呼吸 |
| 运动 | 随机漂移 + 正弦呼吸 + 边缘环绕（穿出边界从另一侧进） |

## 四、组件分解

### 1. `src/components/layout/BackgroundParticles.vue`（新）

- 模板：一个全屏 `<canvas aria-hidden="true">`，固定定位 `inset:0`、`z-index:0`、`pointer-events:none`
- 逻辑（`onMounted` 启动 / `onUnmounted` 停止）：
  - 若 `window.matchMedia('(prefers-reduced-motion: reduce)').matches` 为真，**直接 return，不启动**
  - 初始化粒子数组（数量按 `window.innerWidth < 768 ? 35 : 70`，**挂载时判断一次，之后不变**）
  - 逐帧循环 `requestAnimationFrame`；存帧 id，卸载时 `cancelAnimationFrame`
  - `resize` 监听只适配画布尺寸，不重建粒子，卸载时移除监听

### 2. `src/App.vue`（改）

- 背景区新增 `<BackgroundParticles />`，排在 `.league-glow` 之后、`<main>` 之前

## 五、数据流 / 状态管理

**无**。纯视觉效果，不碰 store / API / 路由 / 数据请求。

## 六、测试策略

### 新增单测 `tests/components/BackgroundParticles.test.ts`

jsdom 无 Canvas 2D、也无 `matchMedia`（项目既往已踩过此坑），需 mock：`getContext` 返回桩对象（含 `clearRect`/`beginPath`/`arc`/`fill` 空实现）+ 桩掉 `requestAnimationFrame`/`cancelAnimationFrame` + 桩掉 `window.matchMedia`。覆盖三点：

1. `prefers-reduced-motion: reduce` 下不启动（不初始化粒子 / 不开启循环）
2. `resize` 监听已注册，卸载时移除
3. 组件卸载时调用 `cancelAnimationFrame`

### 现有测试

289 项单测不受影响（纯新增组件，无改动既有组件）。

### 浏览器手测清单（待批准执行）

- 桌面：金色粒子漂浮 + 呼吸，全站各页（首页 / 积分榜 / 详情页 / 弹窗）可见，不挡点击、内容无破相
- 375px 移动：粒子正常（系统未开减少动效时），页面不卡
- 系统开「减少动态效果」：粒子完全不画

## 七、验收标准

1. 全站背景出现金色漂浮粒子，观感贴世界杯
2. 现有背景三层与内容层零破相、交互不受影响
3. `prefers-reduced-motion` 下不启动粒子
4. 移动端粒子数量减半生效
5. 单测全绿 + typecheck / build 通过

## 八、风险与备选

1. **逐帧循环在低端机 / 移动端耗电**：粒子数已压到 70/35 + reduced-motion 兜底；若实测仍卡，可再降数量或降帧率（备用，不默认做）
2. **jsdom 无 Canvas 2D**：单测需 mock `getContext` 与 rAF，属已知常规做法
3. **粒子在比赛详情弹窗下方**：弹窗层级更高，粒子不干扰弹窗内容

## 九、不在本范围

- 方案二（CSS 扫光呼吸）、方案三（混合）暂不做，验收满意后再议
- 星空 / 流星 / 足球元素上浮等其它动效
- 粒子数量 / 颜色 / 速度的进一步调控开关（先写死，后续要调再议）