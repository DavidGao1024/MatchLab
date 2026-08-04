# MyTeamCard 紧凑重设计 v2

> 日期：2026-08-04
> 关联前作：`2026-08-03-myteamcard-redesign-design.md`（v1，"永远 wide 模式"）
> 性质：UI 重设计，覆盖 v1 的"永远 wide 模式"决策
> 目标：多订阅场景桌面横排、单订阅满宽、移动端竖排

## 一、动机

v1 "永远 wide 模式"假设单订阅场景，整行宽 + 内部 3 列 grid。用户在用了一段时间后发现：

- 多订阅（2-3 队）时，多张 wide-card 竖排，每张占满整行 → 页面拉得很长，要滚很久
- 用户期望桌面多订阅横排，移动端才竖排
- 单订阅仍要满宽（不希望横排时单卡孤零零地占一角）

## 二、设计决策

**方案 B：一套模板，靠容器宽度自适应。** 放弃 v1 的 wide-card 内部 3 列 grid + 最近 3 场明细，改紧凑纵向流。单订阅场景容器宽 → 卡片内部 4 段横向并排；多订阅场景容器窄 → 卡片内部纵向堆叠。同一模板，靠 CSS Grid `grid-template-columns` 响应式切换。

放弃 v1 的"两套模板切换"（A 方案），因为代码维护成本高，且多订阅场景已经牺牲了信息密度，没必要为单订阅场景单独维护一套更密的模板。

## 三、容器布局（HomeView.vue）

订阅区容器从 `flex flex-col gap-3` 改为响应式 grid：

```html
<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
  <MyTeamCard v-for="sub in userStore.subscriptions" :key="sub.teamId" :subscription="sub" />
</div>
```

- 1 订阅：grid 默认单列 → 卡占满行宽
- 2 订阅：`md:grid-cols-2` → 两卡并排
- 3 订阅：`lg:grid-cols-3` → 三卡并排
- 移动端（< md）：默认单列 → 竖排

注：grid 而非 flex，因为 flex 在 1 项时 `flex-1` 也占满行宽，但 2 项时不会自动换行成等宽，需要 `basis-1/2` 之类；grid 的 `grid-cols-N` 直接等分，更省心。

## 四、MyTeamCard 模板（一套，自适应）

放弃 v1 的 `wide-card` + `wide-body` + `wide-grid`（3 列内部 grid）+ `wide-footer` 命名。改 `compact-card` 顶层 + `compact-grid` 内部 grid：

### 内部 grid（桌面横排时 4 列，移动竖排时 1 列）

```css
.compact-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr auto;
  gap: 12px;
  padding: 12px 16px;
}
@media (max-width: 720px) {
  .compact-grid { grid-template-columns: 1fr; }
}
```

注：容器宽度变化由父 grid 决定（1 卡满宽 → 此卡也满宽 → 内部 4 列；3 卡并排 → 此卡 ~33% 视口宽 → 触发 720px 媒体查询 → 内部 1 列）。卡内 grid 的媒体查询阈值 720px 是关键参数——低于此值堆叠，高于此值横向。

### 4 段内容

1. **hero 块**（左 1.4fr）：今日/下场/进行中三态。主客队 logo + 缩写 + 比分/开球 + 倒计时 + 场馆
2. **战绩块**（1fr）：W-D-L 三格横排 + 积分条 + form pills 横排
3. **攻防块**（1fr）：GF/GA 两格 + 伤员（红色左竖线）
4. **下场块**（右 auto）：下场对手 + 时间 + 场馆。带边框背景区分

### 删除项

- "最近 3 场"明细列表（vs-row × 3）—— form pills 已覆盖近期表现，多卡场景窄卡放不下
- v1 的 `recentMatches` ref + `scoreLine()` + `matchTone()` + `formatDateShort()` 函数可一并删除（script setup 简化）

### 保留项

- `load()` 数据加载逻辑（fetchLiveScores + fetchTeamInjuries）原样
- `todayMatch` / `nextMatch` / `afterNextMatch` / `injuries` ref 保留
- `team` / `teamColor` / `standing` / `leagueDisplayName` computed 保留
- `goTeam()` / `teamFor()` / `formatCountdown()` / `formatKickoff()` / `formatKickoffTime()` / `formatDateLong()` 保留
- `footerMatch` computed 保留（今日赛时显示 nextMatch，否则 afterNextMatch）

### 字号收紧（vs v1）

- 队名：32px → 22px
- 排名数字：22px → 18px
- 倒计时：22px → 16px
- hero abbr：22px → 16px
- 内部 padding：`16px 24px` → `12px 16px`
- 整体圆角：14px 保持，内部块圆角 10px → 6-8px

## 五、文件改动

| 文件 | 改动 |
|---|---|
| `src/components/home/MyTeamCard.vue` | 模板 + `<style scoped>` 重写；script setup 删除 `recentMatches` ref + `scoreLine` + `matchTone` + `formatDateShort` |
| `src/views/HomeView.vue` | 订阅区容器 `flex flex-col gap-3` → `grid gap-3 md:grid-cols-2 lg:grid-cols-3` |

不动：数据加载、路由、其他组件。

## 六、测试

- 单测：v1 的 MyTeamCard 单测若涉及 `recentMatches` / `scoreLine` / `matchTone` 断言，需相应删除或调整。先跑 `npm test` 看哪些挂掉，再补
- 浏览器手测：1/2/3 订阅三种状态 × 桌面/移动两宽度，看 grid 切换是否流畅
- typecheck + build 必须通过

## 七、风险与回退

- **风险 1**：单卡满宽时 4 段横向并排，若内容不够密会显空。对策：4 段都填满信息（hero 4 行 / 战绩 3 行 / 攻防 3 行 / 下场 4 行），实测若空再调
- **风险 2**：720px 媒体查询阈值与父 grid 阈值（md=768px, lg=1024px）不重合。3 卡并排在 lg（≥1024px）时触发，单卡宽 ~340px → 低于 720px → 卡内堆叠 ✓。2 卡在 md（≥768px）时触发，单卡宽 ~380px → 低于 720px → 堆叠 ✓。1 卡时此卡满宽 → 高于 720px → 4 段并排 ✓。阈值链路通
- **回退**：git revert 即可回 v1 wide 模式
