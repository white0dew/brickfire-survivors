# STEEL EMBERS art source

所有 AI 生图与派生素材都在这里，按用途分目录。游戏只加载 `assets/game/stages/<stage>/` 下的最终 PNG。

## masters/

不改动的高分辨率母版，后续重切、换色、重导出都从这里来：

- `boss-sheet-12.png` — 12 个 Boss 的 4×3 母版（1254×1254），顺序与 12 关一致。
- `enemy-sheet-ground-air-xeno.png` — 12 个敌人母版（4×3：地面/空中/异星）。
- `furnace-modular-reference.png` — 第一关 6 台模块化参考母版。
- `player-hull-raw-1254.png` / `player-turret-raw-1254.png` — 玩家坦克车体/炮塔原始图。
- `player-hull-48.png` / `player-turret-48.png` — 处理后 48×48 游戏版。
- `floor-tiles-128.png` — 4×4 地板母版。

## tests/

过程截图、对比图、调色试验。仅本地保留，不参与构建，默认不提交。

## legacy/

第一关早期平铺素材，保留供对比；游戏已改用 `assets/game/stages/furnace/`。

## 规则

1. **一次生图尽量出一张 sheet**：车身 + 炮塔、多个敌人、多个 Boss 放在同一张图里，按象限/网格切，不逐张生成。
2. 原始 1254 图只留母版；进游戏的图按目标尺寸 **一次降采样**，再做 3–4 bit 量化，避免先缩到 96 再反复缩放。
3. 每个关卡最终资源固定结构：

```
assets/game/stages/<stage>/
  boss.png          256×256
  floor.png         128×128 (4×4 32px tiles)
  player/hull.png    48×48
  player/turret.png  48×48
  enemies/*.png      96×96
  vfx/*.png          64×64
```
