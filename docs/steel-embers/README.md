# 钢铁余烬 · 敌人与地图扩展交接包

这份目录是给实现团队的概念与策划交接包。当前版本已开始落第一版可玩切片（13 个新单位、12 个每关独立 Boss、地图签名敌人池与 3 张地图机关），概念与验收标准继续保留在下方文档。

## 文件

- [`enemy-expansion-gdd.md`](./enemy-expansion-gdd.md) — 完整策划案（阵营、单位、Boss、地图机关、波次、图鉴、AI 美术、实施阶段）
- [`implementation-backlog.md`](./implementation-backlog.md) — 可直接拆给程序的 P0/P1/P2 任务与验收标准
- [`per-map-bosses.md`](./per-map-bosses.md) — 12 张地图的 Boss 名单、代码键、行为和本地验收方式
- [`concepts/pixel-lineup-labeled.png`](./concepts/pixel-lineup-labeled.png) — **主概念板**：12 个 MVP 单位的顶视像素概念
- [`concepts/pixel-lineup.png`](./concepts/pixel-lineup.png) — 同上，无标签版
- [`concepts/overview.png`](./concepts/overview.png) — 阵营氛围稿总览，仅用于定风格
- [`concepts/ground-lineup.png`](./concepts/ground-lineup.png) — 废铁军团 8 个地面单位氛围稿
- [`concepts/air-lineup.png`](./concepts/air-lineup.png) — 苍穹机群 8 个空中单位氛围稿
- [`concepts/xeno-lineup.png`](./concepts/xeno-lineup.png) — 异星舰队 8 个异星单位氛围稿
- [`concepts/boss-lineup.png`](./concepts/boss-lineup.png) — 4 个 Boss 氛围稿

## 一句话目标

把现在“5 普通 + 1 精英 + 1 Boss、12 张换色地图”的结构，升级成“地面 / 空中 / 异星 / 封锁守卫”四类威胁，每张地图有自己的机关、敌人组合和记忆点。

## 先做什么

**不要一次铺 12 张地图，也不要一次写 100 个 AI。**

第一轮垂直切片只做：

- 地图：`01 熔炉工厂`、`02 霓虹沼泽`、`07 零号反应堆`
- 机关：熔炉喷口、带电水域、辐射区
- 新单位：4 地面 + 4 空中 + 4 异星
- Boss：先做 1 个完整 Boss（建议空中母舰），另外 2 个只做原型
- 图鉴：新增地面 / 空中 / 异星 / 精英 / Boss 筛选和首次遭遇提示

## 实现底线

- 每个新单位必须有：**一个清晰威胁 + 一个清晰解法 + 一个出现地图**。
- 只换颜色、不改行为的条目，不算新敌人。
- 空中单位同屏不超过 35%，地面仍是主体。
- 所有机关必须有预警、周期和安全区，不能无提示伤害。
- 先跑代码形状/色块原型，行为通过后再接 AI 美术。
- 不把 AI 概念图直接当战斗 sprite；战斗内需要透明底、固定锚点、统一比例和 atlas。

## 读图顺序

**主概念板（战斗视角）**

- **pixel-lineup-labeled.png**：上排左→右 = 盾墙车 / 炉膛迫击车 / 布雷履带 / 分裂运输车；中排左→右 = 侦察无人机 / 俯冲翼 / 轰炸机 / 炮艇；下排左→右 = 侦察飞碟 / 光束护卫舰 / 跃迁者 / 异星守卫。这是顶视像素方向，**不是三视图**。

**氛围稿（3/4 方向，仅用于定风格）**

- **ground-lineup.png**：上排左→右 = 盾墙车 / 炉膛迫击车 / 布雷履带 / 分裂运输车；下排左→右 = 钻地车 / 维修车 / 破阵冲锋车 / 雷达车。
- **air-lineup.png**：上排左→右 = 侦察无人机 / 俯冲翼 / 轰炸机 / 炮艇；下排左→右 = 无人机母舰 / 空投运输机 / 截击机 / 护盾无人机。
- **xeno-lineup.png**：上排左→右 = 侦察飞碟 / 光束护卫舰 / 跃迁者 / 异星守卫；下排左→右 = 虫巢母舰 / 引力舰 / 织网者 / 方尖碑。
- **boss-lineup.png**：左上 = 泰坦·攻城型；右上 = 空中母舰「天穹」；左下 = 异星旗舰「深渊之眼」；右下 = 钻地巨兽「地脉」。

> 概念图是方向稿，不是最终战斗 sprite。正式 sprite 只画**顶视**的一帧车身 + 一帧炮塔，靠 Canvas 旋转；不需要三视图/3D 模型。最终尺寸、锚点、阴影和性能预算见 GDD 第 12 节。
