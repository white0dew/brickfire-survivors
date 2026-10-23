# 钢铁余烬 · 像素美术生产计划（AI 辅助）

> 结论先行：**AI 图适合做“母版/候选精灵图”，不适合直接当最终游戏资产。**
> 游戏内仍然只做顶视 2D 像素，不做三视图、3D 模型或等距图。
> 测试使用 `gpt-image-2.5`，原始图 1254×1254；测试文件在 `art-src/tests/`。

## 这次实际测试了什么

| 测试 | 结果 | 评价 |
|---|---|---|
| 12 个 Boss 精灵表（4×3） | 12/12，轮廓差异明显 | 可直接作为 Boss 战斗图/图鉴母版；需要抠底、裁切、缩放到 96–128px |
| 12 个敌人精灵表（4×3，地面/空中/异星） | 12/12，行列结构正确 | 可用；异星行有深色光晕，需要单独处理 alpha |
| 16 个战斗 VFX（4×4） | 16/16，爆炸/枪口/冰/酸/虚空等齐全 | 最适合优先接入，透明化后加到现有 Canvas 特效层 |
| 8×8 地形瓦片（64 格） | 64/64，风格统一 | 观感好，但**不保证无缝平铺**；需要做 2×2/4×4 平铺检查，再决定是否替换现有程序化地块 |

原始图、透明化图、预览图：

- `art-src/tests/boss-sheet-test.png`
- `art-src/tests/boss-sprites-128.png`
- `art-src/tests/enemy-sheet-test.png`
- `art-src/tests/enemy-sprites-96.png`
- `art-src/tests/vfx-sheet-test.png`
- `art-src/tests/vfx-sprites-64.png`
- `art-src/tests/tileset-test.png`
- `art-src/tests/tileset-32.png`

## 推荐的生产顺序

### 第一批：反馈最明显，风险最低

1. **Boss 战斗图 + Boss 图鉴肖像**
   - 12 个 Boss，每个 1 张顶视战斗图 + 1 张图鉴肖像。
   - 统一 128×128 战斗图、512×512 肖像；透明底、固定锚点。
   - 先做这一批，因为 Boss 是每关的记忆点。

2. **战斗 VFX**
   - 16–24 个：炮口、命中、爆炸、冰爆、酸液、虚空、太阳能、冲击波。
   - 以 64×64 生成，游戏内按 16–32px 使用；爆炸类可以加法混合。
   - 这是“让打击感变好”性价比最高的一批。

3. **敌人战斗图**
   - 先做 12 个核心单位，再做剩余单位。
   - 地面 48–64px、空中 64–96px、异星 64–96px；按实际碰撞半径统一缩放。
   - 重点是轮廓可读性，不是细节数量。

### 第二批：地图辨识度

4. **地形/道具 atlas**
   - 按阵营做 3–4 套：工业废铁、毒沼、冰原、异星/反应堆。
   - 每套 8×8 个 32px tile，先替换地表和墙体，保留现有碰撞逻辑。
   - 地图机关（喷口、酸池、辐射区）用独立动画层，不要塞进静态 tile。

### 第三批：玩家与 UI

5. **玩家坦克底盘/炮塔**
   - 20 台底盘工作量大，先做 4–6 台主力；车身和炮塔分开，Canvas 继续负责旋转。
   - 不建议一开始全量替换，容易破坏现有辨识度。

6. **图鉴/菜单/关卡插画**
   - AI 很适合做图鉴卡、Boss 登场卡、关卡封面；不要让 AI 生成文字，文字仍用 HTML/Canvas 排版。

## 不要做的事

- 不要生成三视图、3D、等距图；游戏是顶视 2D。
- 不要指望一张 AI“动画精灵表”能直接得到连贯动画；动画应拆成单帧、固定参考图生成，再手工对齐，或继续用程序化动画。
- 不要让 AI 生成带文字的 UI 图；文字必然要后期排版。
- 不要一次性替换所有单位；先做 Boss + VFX + 核心敌人，接入一张测试地图看实际 960×576 画面。

## 接入管线

1. 生成：固定 4×3 / 4×4 / 8×8 网格、flat 背景、无文字、无投影、统一顶视。
2. 后处理：裁格 → flood-fill 抠底 → 去边 → 统一锚点 → NEAREST 缩放到 32/48/64/96/128。
3. 导出：`atlas.png` + `atlas.json`（名称、格子、锚点、帧尺寸）。
4. 游戏内：只替换 `drawEnemy`/`drawBoss`/特效绘制的贴图层，不碰 AI、碰撞和数值。
5. 验收：在真实地图、真实缩放、真实弹幕密度下看轮廓是否可读；不要只看白底大图。

## 第一关历史落地（熔炉工厂；已被下方全 12 关方案取代）

已接入 `assets/game/stages/furnace/`：

- `boss.png`：第一关 Boss 的 AI 顶视战斗图，256px 透明底。
- `enemies/scout/grunt/heavy/bomber/sniper/elite.png`：第一关主力敌人，96px 透明底。
- `enemies/mortar/bulwark/minelayer/drone.png`：第一关增援单位。
- `floor.png`：4×4 / 32px 工厂地表 atlas。
- `vfx/muzzle.png`、`vfx/explosion.png` 等：第一关枪口/爆炸特效。

接入方式：

- 只替换 `js/game.js` 的绘制层：`drawBoss`、`drawEnemy`、`drawAirEnemy`、`drawEffects`、`buildGroundCache`。
- 碰撞、AI、数值、波次、Boss 技能和原有程序化绘制全部保留，作为加载失败时的 fallback。
- 第一关专属逻辑已在“全 12 关已落地”中替换为按关卡加载。
- 图鉴中第一关已解锁的 Boss/敌人也会显示新的 AI 立绘。

验证结果：

- 45 秒正常波次运行：正常进入升级、击杀 35、无控制台报错。
- 第一关 Boss 16 秒模拟：正常存在、无报错。
- 图鉴 50 张卡渲染正常。
- 第一关截图：`art-src/tests/first-stage-enemies.png`、`first-stage-boss.png`。

## 全 12 关已落地（2026-10-23）

### 最终资源结构

```
assets/game/stages/<stage>/
  boss.png            256×256，12 关各一张，顺序与 BOSS_BY_MAP 一致
  floor.png           128×128，4×4 个 32px tile，按关卡 palette 调色
  player/hull.png      48×48，和旧程序化坦克同级视觉尺寸
  player/turret.png    48×48，独立旋转
  enemies/*.png        96×96，18 种敌人；6 种地面主战单位另有 *-hull.png
  vfx/*.png            64×64，枪口/爆炸/冲击/酸液/虚空/日冕等
```

`<stage>` 为 `furnace / marsh / frost / redtide / foundry / graveyard / reactor / dome / citadel / abyss / solar / throne`。

### 素材源管理

高分辨率母版统一放在：

- `art-src/masters/boss-sheet-12.png`：4×3 十二 Boss 母版，一次生成。
- `art-src/masters/enemy-sheet-ground-air-xeno.png`：4×3 敌人母版，一次生成。
- `art-src/masters/player-tank-kit-sheet.png`：玩家车体/炮塔 2×2 拼版，未来按这一张 sheet 生成。
- `art-src/masters/player-hull-raw-1254.png`、`player-turret-raw-1254.png`：本次玩家原始输出。
- `art-src/masters/floor-tiles-128.png`：地板 atlas 母版。
- `art-src/tests/`：对比图、截图、调色试验，本地保留，不参与构建。
- `art-src/legacy/furnace-flat/`：第一关旧平铺素材，仅作对比。

以后生图必须 **一张 sheet 出多个部件/单位**，不再为每个车体、炮塔、敌人分别调用一次生图。

### 处理管线修正

- 不再“先缩到 96、再在 Canvas 里旋转缩放”。
- Boss 从 1254 母版一次切格并降到 256；玩家从 1254 原始图一次降到 48；空中/异星敌人从 1254 母版一次降到 96，再做 3–4 bit 量化。
- 玩家绘制尺寸从 92 改为 48；护盾半径 36 改回 24；枪口偏移 38 改回 22。
- 地面敌人绘制尺寸改为 `radius × 4.6`，不再出现“玩家像 Boss、敌人像大饼”的比例问题。
- 所有 sprite 使用最近邻、整数坐标、车身 8 方向吸附；炮塔独立按 `turretAngle` 旋转。

### 接入方式

- `loadStageArt(stageId)` 按关卡动态加载 `assets/game/stages/<stage>/`，切换关卡时自动换整套图。
- `drawBoss` 使用当前关 `boss`；12 个 Boss 共用同一套 turret 瞄准逻辑，但外观各自独立。
- `buildGroundCache` 使用当前关 `floor`；其他地图不再回退程序化地面。
- `drawGroundEnemyArt` / `drawGroundEnemyTurret` / `drawAirEnemy` / `drawXenoEnemy` 已覆盖 18 种单位；缺图时仍保留程序化 fallback。
- 图鉴、Boss 立绘、VFX 也走同一套资源。

### 验证结果

- 12 关逐关 `startRun`：每关 38 张图全部加载，Boss/地板/玩家/敌人均存在，控制台 0 报错。
- 单关生成 18 种敌人：全部绘制，0 报错。
- 第 1/2/7/12 关截图检查：Boss 独立、地板按关卡调色、玩家尺寸回到旧坦克级别。
- 资源版本：`20261023-11`。
