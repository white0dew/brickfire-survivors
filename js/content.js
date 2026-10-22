/* BRICKFIRE // content definitions. All art is generated at runtime. */
(function () {
  'use strict';

  const MAPS = [
    {
      id: 'furnace',
      name: '熔炉工厂',
      en: 'FURNACE WORKS',
      sector: 'SECTOR 01',
      desc: '标准威胁 · 高温余烬',
      palette: {
        sky: '#0b1411', ground: '#1d2b24', groundAlt: '#21332b', grid: 'rgba(208,232,211,.035)',
        fog: 'rgba(255,133,55,.055)', accent: '#ffb52d', ambient: '#ff7a2a',
        brickA: '#8c3e27', brickB: '#5d281e', brickLight: '#d06a42', brickDark: '#331713',
        steelA: '#546661', steelB: '#2b3834', steelLight: '#91a59d', water: '#102e35', waterLight: '#2f8287',
        bush: '#214b37', bushLight: '#3c7b4f', core: '#5ff0ce', hazard: '#e39a33'
      },
      map: [
        '..............................',
        '..BBBB....SS......SS....BBBB..',
        '..B..B....SS......SS....B..B..',
        '..B..B..................B..B..',
        '..B..B..BBBB......BBBB..B..B..',
        '........B..B......B..B........',
        '..SS....B..B..WW..B..B....SS..',
        '..SS....BBBB..WW..BBBB....SS..',
        '..............WW..............',
        '..TT..........WW..........TT..',
        '..TT....BBBB......BBBB....TT..',
        '........B..B......B..B........',
        '..BBBB..B..B..SS..B..B..BBBB..',
        '..B..B..BBBB..SS..BBBB..B..B..',
        '..B..B..................B..B..',
        '..B..B......BBBBBB......B..B..',
        '......P.....B.CC.B............',
        '............B.CC.B............'
      ]
    },
    {
      id: 'marsh',
      name: '霓虹沼泽',
      en: 'NEON MARSH',
      sector: 'SECTOR 02',
      desc: '水域阻隔 · 磁力增幅',
      palette: {
        sky: '#071318', ground: '#172825', groundAlt: '#1c302b', grid: 'rgba(105,235,218,.04)',
        fog: 'rgba(64,231,206,.06)', accent: '#5ff0ce', ambient: '#58d7ff',
        brickA: '#424b72', brickB: '#252b4a', brickLight: '#7783b6', brickDark: '#14182e',
        steelA: '#41545b', steelB: '#203036', steelLight: '#83a8ab', water: '#083b4a', waterLight: '#1b97a9',
        bush: '#174d43', bushLight: '#2f8c6f', core: '#5ff0ce', hazard: '#f26bd4'
      },
      map: [
        '..............................',
        '..SSSS....BBBB....BBBB....SS..',
        '..S..S....B..B....B..B....SS..',
        '..S..S....B..B....B..B........',
        '..S..S....BBBB....BBBB........',
        '..S..S........................',
        '..SSSS..WWWW....WWWW....SSSS..',
        '........WWWW....WWWW..........',
        '..BBBB..WWWW....WWWW..BBBB....',
        '..B..B......BBBB......B..B....',
        '..B..B......B..B......B..B....',
        '..BBBB..TT..B..B..TT..BBBB....',
        '........TT..BBBB..TT..........',
        '..SSSS..........SSSS..........',
        '............BBBB..............',
        '......P.....B..B..............',
        '............B.CC.B............',
        '............B.CC.B............'
      ]
    },
    {
      id: 'frost',
      name: '霜蚀边陲',
      en: 'FROSTLINE',
      sector: 'SECTOR 03',
      desc: '开阔战场 · 精英猎杀',
      palette: {
        sky: '#0a1017', ground: '#1f2c32', groundAlt: '#24353c', grid: 'rgba(185,224,255,.045)',
        fog: 'rgba(137,197,255,.06)', accent: '#9bd8ff', ambient: '#82b9ff',
        brickA: '#594a58', brickB: '#38303e', brickLight: '#9e8599', brickDark: '#211b27',
        steelA: '#60727b', steelB: '#33444d', steelLight: '#afc8d1', water: '#173b4d', waterLight: '#4a9bb9',
        bush: '#28463c', bushLight: '#527a61', core: '#5ff0ce', hazard: '#ffcf5a'
      },
      map: [
        '..............................',
        '....SS....BBBBBB....SS........',
        '....SS....B....B....SS........',
        '..........B....B..............',
        '....BBBB..BBBBBB..BBBB........',
        '....B..B..........B..B........',
        '....B..B..SS..SS..B..B........',
        '..........SS..SS..............',
        '..TT......SS..SS......TT......',
        '..TT..................TT......',
        '....BBBB........BBBB..........',
        '....B..B..BBBB..B..B..........',
        '....B..B..B..B..B..B..........',
        '....BBBB..BBBB..BBBB..........',
        '..........BBBB................',
        '......P...B..B................',
        '..........B.CC.B..............',
        '..........B.CC.B..............'
      ]
    },
    {
      id: 'redtide', name: '赤潮港', en: 'REDTIDE HARBOR', sector: 'SECTOR 04',
      desc: '水网切割 · 火力封锁', mod: { enemyHp: 1.12, enemySpeed: 1.04, spawnMul: .92, xpMul: 1.05 },
      palette: {
        sky: '#140b10', ground: '#2b2025', groundAlt: '#33252b', grid: 'rgba(255,175,170,.04)',
        fog: 'rgba(255,72,86,.065)', accent: '#ff6b6f', ambient: '#ff435c',
        brickA: '#7d3436', brickB: '#4a1e24', brickLight: '#c45e58', brickDark: '#2a1017',
        steelA: '#5c5154', steelB: '#312b30', steelLight: '#a58c8d', water: '#3a1019', waterLight: '#a52e46',
        bush: '#3d3320', bushLight: '#806337', core: '#ffcf73', hazard: '#ff8d5a'
      },
      map: [
        '..............................',
        '..BBBB....WWWW....BBBB........',
        '..B..B....WWWW....B..B........',
        '..B..B....WWWW....B..B........',
        '..BBBB....WWWW....BBBB........',
        '..........WWWW................',
        '..SS......WWWW......SS........',
        '..SS......WWWW......SS........',
        '..........................TT..',
        '..BBBBBB..........BBBBBB..TT..',
        '..B....B..........B....B......',
        '..B....B..SS..SS..B....B......',
        '..BBBBBB..SS..SS..BBBBBB......',
        '..............................',
        '............BBBB..............',
        '......P.....B..B..............',
        '............B.CC.B............',
        '............B.CC.B............'
      ]
    },
    {
      id: 'foundry', name: '余烬高架', en: 'EMBER FOUNDRY', sector: 'SECTOR 05',
      desc: '钢板回廊 · 狭窄交火', mod: { enemyHp: 1.2, enemySpeed: 1.06, spawnMul: .9, xpMul: 1.08 },
      palette: {
        sky: '#12100b', ground: '#2e2a20', groundAlt: '#383326', grid: 'rgba(255,203,120,.045)',
        fog: 'rgba(255,153,62,.07)', accent: '#ff9d45', ambient: '#ff7b29',
        brickA: '#8c4a2c', brickB: '#542b1d', brickLight: '#d67a4b', brickDark: '#30160f',
        steelA: '#6d6450', steelB: '#3c3830', steelLight: '#c1b18b', water: '#1b3438', waterLight: '#3c7c83',
        bush: '#3b4929', bushLight: '#71863d', core: '#ffd36b', hazard: '#e8b04b'
      },
      map: [
        '..............................',
        '..SSSS....BBBB....BBBB....SS..',
        '..S..S....B..B....B..B....SS..',
        '..S..S....B..B....B..B........',
        '..SSSS....BBBB....BBBB........',
        '..............................',
        '..BBBB..SSSSSS..SSSSSS..BBBB..',
        '..B..B..S....S..S....S..B..B..',
        '..B..B..S....S..S....S..B..B..',
        '..BBBB..SSSSSS..SSSSSS..BBBB..',
        '..............................',
        '....TT....BBBB....BBBB....TT..',
        '....TT....B..B....B..B....TT..',
        '..........BBBB....BBBB........',
        '............BBBB..............',
        '......P.....B..B..............',
        '............B.CC.B............',
        '............B.CC.B............'
      ]
    },
    {
      id: 'graveyard', name: '轨道墓场', en: 'ORBITAL GRAVEYARD', sector: 'SECTOR 06',
      desc: '断壁残垣 · 长距狙杀', mod: { enemyHp: 1.3, enemySpeed: 1.08, spawnMul: .88, xpMul: 1.1 },
      palette: {
        sky: '#0b0c18', ground: '#202235', groundAlt: '#272a40', grid: 'rgba(183,195,255,.045)',
        fog: 'rgba(105,132,255,.065)', accent: '#9bb4ff', ambient: '#637bff',
        brickA: '#4f477a', brickB: '#2d294d', brickLight: '#897fc0', brickDark: '#17152e',
        steelA: '#536070', steelB: '#2b3441', steelLight: '#a4b5c7', water: '#172a4a', waterLight: '#376a9d',
        bush: '#273d39', bushLight: '#4f756c', core: '#9bb4ff', hazard: '#cf9bff'
      },
      map: [
        '..............................',
        '..BB....SS....WW....SS....BB..',
        '..BB....SS....WW....SS....BB..',
        '........SS....WW....SS........',
        '..TT....SS....WW....SS....TT..',
        '........SS..........SS........',
        '..BBBB..SS..BBBBBB..SS..BBBB..',
        '..B..B......B....B......B..B..',
        '..B..B......B....B......B..B..',
        '..BBBB......BBBBBB......BBBB..',
        '..............................',
        '..SS..BBBB........BBBB..SS....',
        '..SS..B..B........B..B..SS....',
        '......B..B........B..B........',
        '......BBBB........BBBB........',
        '......P.....B..B..............',
        '............B.CC.B............',
        '............B.CC.B............'
      ]
    },
    {
      id: 'reactor', name: '零号反应堆', en: 'REACTOR ZERO', sector: 'SECTOR 07',
      desc: '核心熔毁 · 高压围杀', mod: { enemyHp: 1.42, enemySpeed: 1.1, spawnMul: .85, xpMul: 1.14 },
      palette: {
        sky: '#07130f', ground: '#1c2b25', groundAlt: '#22352d', grid: 'rgba(162,255,188,.045)',
        fog: 'rgba(82,255,157,.065)', accent: '#75f0a7', ambient: '#36df85',
        brickA: '#4e6a44', brickB: '#2c3e2a', brickLight: '#87a474', brickDark: '#152015',
        steelA: '#4a6358', steelB: '#273a31', steelLight: '#9dc3ad', water: '#12362d', waterLight: '#2e8a68',
        bush: '#244c2c', bushLight: '#4d8b4e', core: '#9dffb9', hazard: '#c1ff68'
      },
      map: [
        '..............................',
        '..BBBB....SSSSSSSS....BBBB....',
        '..B..B....S......S....B..B....',
        '..B..B....S..BB..S....B..B....',
        '..BBBB....S..BB..S....BBBB....',
        '..........S......S............',
        '..SS......SSSSSSSS......SS....',
        '..SS....................SS....',
        '..........................TT..',
        '..BBBB..BBBB....BBBB..BBBB....',
        '..B..B..B..B....B..B..B..B....',
        '..B..B..B..B....B..B..B..B....',
        '..BBBB..BBBB....BBBB..BBBB....',
        '..............................',
        '............BBBB..............',
        '......P.....B..B..............',
        '............B.CC.B............',
        '............B.CC.B............'
      ]
    },
    {
      id: 'dome', name: '终焉穹顶', en: 'FINAL DOME', sector: 'SECTOR 08',
      desc: '无退路 · 泰坦决战', mod: { enemyHp: 1.55, enemySpeed: 1.12, spawnMul: .8, xpMul: 1.2, bossHp: 1.2 },
      palette: {
        sky: '#16110a', ground: '#30291c', groundAlt: '#3a3222', grid: 'rgba(255,227,164,.05)',
        fog: 'rgba(255,203,111,.075)', accent: '#ffe3a4', ambient: '#ffbd59',
        brickA: '#8b5435', brickB: '#51301f', brickLight: '#d29566', brickDark: '#2d160d',
        steelA: '#756b54', steelB: '#403a2d', steelLight: '#d1c09a', water: '#27363a', waterLight: '#527f83',
        bush: '#4b452a', bushLight: '#8b7e48', core: '#ffe3a4', hazard: '#ff7658'
      },
      map: [
        '..............................',
        '..SS....BBBB........BBBB....SS',
        '..SS....B..B........B..B....SS',
        '........B..B........B..B......',
        '..BBBB..BBBB........BBBB..BBBB',
        '..B..B....................B..B',
        '..B..B..SS..SSSSSS..SS....B..B',
        '..BBBB..SS..S....S..SS....BBBB',
        '........SS..S....S..SS........',
        '..TT....SS..S....S..SS....TT..',
        '..TT....SS..SSSSSS..SS....TT..',
        '........SS..........SS........',
        '..BBBB..BBBB....BBBB..BBBB....',
        '..B..B..B..B....B..B..B..B....',
        '..BBBB..BBBB....BBBB..BBBB....',
        '......P.....B..B..............',
        '............B.CC.B............',
        '............B.CC.B............'
      ]
    }
  ];

  const ENEMIES = {
    scout: {
      name: '侦察履带', en: 'SCOUT', hp: 22, speed: 43, damage: 6, fire: 2.5, bulletSpeed: 235,
      xp: 2, radius: 11, color: '#d37346', dark: '#713721', light: '#ffb47a', core: '#ff6f3a', class: 'light',
      codex: '轻装侦察单位。速度快、装甲薄，负责试探防线和拉扯火力。'
    },
    grunt: {
      name: '突击坦克', en: 'ASSAULT', hp: 44, speed: 35, damage: 8, fire: 2.3, bulletSpeed: 260,
      xp: 3, radius: 13, color: '#b94f43', dark: '#612522', light: '#ff967b', core: '#ff5f4a', class: 'medium',
      codex: '标准突击单位。火力与机动均衡，会优先逼近最近的车体或基地。'
    },
    heavy: {
      name: '重装攻城车', en: 'SIEGE', hp: 150, speed: 23, damage: 14, fire: 3.1, bulletSpeed: 205,
      xp: 7, radius: 16, color: '#8b6f4b', dark: '#45341f', light: '#dbc38b', core: '#ffd16b', class: 'heavy',
      codex: '重装攻城单位。装甲厚、炮弹重，推进缓慢但能持续拆墙。'
    },
    bomber: {
      name: '自爆履带', en: 'BOMBER', hp: 52, speed: 69, damage: 20, fire: 0, bulletSpeed: 0,
      xp: 4, radius: 12, color: '#c65766', dark: '#5c202b', light: '#ff9eaa', core: '#ff3d5a', class: 'bomber',
      codex: '高速自爆单位。没有远程武器，贴身瞬间引爆，优先追击最近目标。'
    },
    sniper: {
      name: '磁轨猎手', en: 'RAIL HUNTER', hp: 62, speed: 29, damage: 17, fire: 3.6, bulletSpeed: 560,
      xp: 6, radius: 12, color: '#6c78b4', dark: '#2d3158', light: '#b9c6ff', core: '#7c9cff', class: 'sniper',
      codex: '远程磁轨单位。弹速极快，会在掩体后方狙击车体和基地。'
    },
    elite: {
      name: '精英·破城者', en: 'BREAKER ELITE', hp: 680, speed: 20, damage: 18, fire: 2.8, bulletSpeed: 225,
      xp: 42, radius: 14.5, color: '#c99332', dark: '#40260b', light: '#fff0b8', core: '#ffca4a', class: 'elite', elite: true,
      codex: '精英破城者。高装甲、高伤害，周期性释放环形弹幕，是封印守卫的基准型号。'
    },
    boss: {
      name: '泰坦·攻城型', en: 'SIEGE TITAN', hp: 18000, speed: 19, damage: 38, fire: 1.45, bulletSpeed: 235,
      xp: 280, radius: 26, color: '#9a5b65', dark: '#241317', light: '#ffd8ca', core: '#ff4f58', class: 'boss', boss: true,
      codex: '泰坦级攻城平台。重炮、弹幕和召唤编队，会同时威胁车体与基地。'
    }
  };

  const WAVES = [
    { at: 0, label: '侦察潮', sub: 'SCOUT TIDE', spawn: 1.58, types: ['scout', 'scout', 'grunt'], max: 8 },
    { at: 55, label: '装甲楔', sub: 'ARMORED WEDGE', spawn: 1.30, types: ['grunt', 'scout', 'scout', 'heavy'], max: 13 },
    { at: 110, label: '蜂群突袭', sub: 'SWARM SURGE', spawn: 1.08, types: ['scout', 'bomber', 'grunt', 'scout'], max: 18 },
    { at: 165, label: '精英猎杀', sub: 'ELITE HUNT', spawn: 0.92, types: ['grunt', 'sniper', 'heavy', 'scout'], max: 22, elite: true },
    { at: 225, label: '铁幕推进', sub: 'IRON CURTAIN', spawn: 0.78, types: ['heavy', 'sniper', 'grunt', 'bomber'], max: 27, elite: true },
    { at: 285, label: '泰坦降临', sub: 'TITANFALL', spawn: 0.66, types: ['grunt', 'heavy', 'sniper', 'bomber'], max: 32, boss: true }
  ];

  const ITEMS = {
    star: { name: '火炮星星', en: 'STAR', color: '#ffb52d', desc: '主炮立即提升 1 级' },
    grenade: { name: '震荡手雷', en: 'GRENADE', color: '#ff5b4a', desc: '清除屏幕内所有敌弹并重创敌军' },
    helmet: { name: '反应头盔', en: 'HELMET', color: '#5ff0ce', desc: '获得 8 秒无敌护盾' },
    timer: { name: '时滞核心', en: 'TIMER', color: '#79b9ff', desc: '冻结所有敌人 7 秒' },
    shovel: { name: '应急维修', en: 'FIELD REPAIR', color: '#a9e56e', desc: '修复车体 25%，并获得 2 秒无敌' },
    tank: { name: '备用车体', en: 'TANK', color: '#a9e56e', desc: '修复车体 45%，并提升 5 最大装甲' },
    basekit: { name: '基地维修包', en: 'BASE KIT', color: '#5ff0ce', desc: '修复基地装甲 24%' }
  };

  const WEAPONS = {
    cannon: {
      name: '撕裂者主炮', en: 'RIPPER CANNON', short: '主炮', icon: 'cannon', color: '#ffb52d', type: 'weapon',
      desc: '自动锁定最近敌人。所有构筑的起点。',
      levels: [
        { damage: 22, interval: .58, speed: 620, pierce: 0, shots: 1, explode: 0, text: '自动锁定最近敌人，发射穿甲弹。' },
        { damage: 28, interval: .56, speed: 640, pierce: 0, shots: 1, explode: 0, text: '弹芯强化：伤害 <b>+6</b>，装填略微缩短。' },
        { damage: 26, interval: .60, speed: 665, pierce: 1, shots: 1, explode: 0, text: '炮弹可贯穿 <b>1</b> 个敌人。' },
        { damage: 34, interval: .54, speed: 690, pierce: 1, shots: 1, explode: 0, text: '高压装药：伤害 <b>+8</b>，射速提升。' },
        { damage: 43, interval: .50, speed: 720, pierce: 2, shots: 1, explode: 25, text: '命中引发 <b>小型爆炸</b>，穿透 2 个目标。' },
        { damage: 54, interval: .46, speed: 750, pierce: 2, shots: 2, explode: 30, text: '双联装填：每次发射 <b>2</b> 发炮弹。' },
        { damage: 68, interval: .40, speed: 790, pierce: 3, shots: 2, explode: 40, text: '破甲弹芯：穿透 <b>3</b>，爆炸范围提升。' },
        { damage: 96, interval: .33, speed: 860, pierce: 6, shots: 2, explode: 62, text: '<b>湮灭协议</b>：重炮撕裂整条战线。' }
      ]
    },
    drone: {
      name: '蜂群无人机', en: 'HIVE DRONES', short: '蜂群', icon: 'drone', color: '#5ff0ce', type: 'weapon',
      desc: '环绕车体飞行，自动向附近目标倾泻脉冲弹。',
      levels: [
        { damage: 9, interval: 1.25, count: 1, range: 330, text: '部署 <b>1</b> 架环绕无人机，自动射击。' },
        { damage: 12, interval: 1.18, count: 1, range: 340, text: '脉冲伤害 <b>+3</b>。' },
        { damage: 13, interval: 1.10, count: 2, range: 350, text: '无人机数量 <b>+1</b>。' },
        { damage: 17, interval: 1.02, count: 2, range: 360, text: '脉冲伤害 <b>+4</b>，射速提升。' },
        { damage: 21, interval: .92, count: 3, range: 380, text: '无人机数量 <b>+1</b>。' },
        { damage: 26, interval: .84, count: 3, range: 400, text: '蜂群协议：伤害 <b>+5</b>，射速提升。' },
        { damage: 32, interval: .74, count: 4, range: 425, text: '无人机数量 <b>+1</b>，弹药超频。' },
        { damage: 42, interval: .62, count: 5, range: 450, text: '<b>母舰协议</b>：五机同射，覆盖全场。' }
      ]
    },
    arc: {
      name: '电弧线圈', en: 'ARC COIL', short: '电弧', icon: 'arc', color: '#79b9ff', type: 'weapon',
      desc: '定期释放连锁闪电，在敌军之间跳跃。',
      levels: [
        { damage: 20, interval: 2.8, chains: 2, range: 250, text: '闪电跳跃 <b>2</b> 个目标，造成瞬时伤害。' },
        { damage: 26, interval: 2.6, chains: 3, range: 260, text: '伤害 <b>+6</b>，跳跃目标 +1。' },
        { damage: 30, interval: 2.45, chains: 3, range: 285, text: '线圈过载：伤害 <b>+4</b>，射程提升。' },
        { damage: 38, interval: 2.25, chains: 4, range: 305, text: '跳跃目标 <b>+1</b>。' },
        { damage: 47, interval: 2.05, chains: 5, range: 330, text: '连锁 <b>5</b> 个目标。' },
        { damage: 59, interval: 1.86, chains: 6, range: 355, text: '伤害 <b>+12</b>，冷却缩短。' },
        { damage: 72, interval: 1.66, chains: 7, range: 380, text: '跳跃目标 <b>+1</b>。' },
        { damage: 94, interval: 1.42, chains: 9, range: 430, text: '<b>风暴协议</b>：闪电风暴席卷战场。' }
      ]
    },
    flame: {
      name: '燃迹喷流', en: 'EMBER TRAIL', short: '燃迹', icon: 'flame', color: '#ff7a2a', type: 'weapon',
      desc: '履带碾过的地方留下燃烧余烬，灼烧追兵。',
      levels: [
        { damage: 5, interval: .72, life: 3.4, radius: 20, text: '移动时留下火焰，持续灼烧接触敌人。' },
        { damage: 7, interval: .66, life: 3.7, radius: 22, text: '火焰伤害 <b>+2</b>。' },
        { damage: 8, interval: .60, life: 4.0, radius: 25, text: '火痕范围扩大。' },
        { damage: 11, interval: .55, life: 4.3, radius: 27, text: '伤害 <b>+3</b>，持续时间提升。' },
        { damage: 14, interval: .49, life: 4.7, radius: 30, text: '喷流压力提升，燃烧更久。' },
        { damage: 17, interval: .43, life: 5.0, radius: 32, text: '伤害 <b>+3</b>。' },
        { damage: 21, interval: .38, life: 5.3, radius: 35, text: '火焰扩散，范围提升。' },
        { damage: 28, interval: .31, life: 6.0, radius: 40, text: '<b>焚城协议</b>：所过之处皆为火海。' }
      ]
    },
    mine: {
      name: '裂变地雷', en: 'FISSION MINES', short: '地雷', icon: 'mine', color: '#ffcf5a', type: 'weapon',
      desc: '在身后布设感应雷，敌人靠近即引爆。',
      levels: [
        { damage: 60, interval: 2.6, count: 1, radius: 55, text: '每 <b>2.6</b> 秒布设 1 枚感应雷。' },
        { damage: 78, interval: 2.45, count: 1, radius: 60, text: '爆炸伤害 <b>+18</b>。' },
        { damage: 86, interval: 2.3, count: 2, radius: 64, text: '每次布设 <b>2</b> 枚地雷。' },
        { damage: 108, interval: 2.15, count: 2, radius: 70, text: '爆炸伤害 <b>+22</b>。' },
        { damage: 130, interval: 2.0, count: 2, radius: 76, text: '装药升级：范围与伤害提升。' },
        { damage: 155, interval: 1.85, count: 3, radius: 82, text: '每次布设 <b>3</b> 枚地雷。' },
        { damage: 190, interval: 1.7, count: 3, radius: 90, text: '伤害 <b>+35</b>，感应半径扩大。' },
        { damage: 250, interval: 1.45, count: 4, radius: 105, text: '<b>裂变风暴</b>：四连核雷铺满战场。' }
      ]
    },
    orbital: {
      name: '轨道审判', en: 'ORBITAL JUDGEMENT', short: '轨道', icon: 'orbital', color: '#b896ff', type: 'weapon',
      desc: '标记敌群，从轨道投射炽白光柱。',
      levels: [
        { damage: 90, interval: 5.4, radius: 56, count: 1, delay: .72, text: '每 <b>5.4</b> 秒标记敌群，降下 1 道光柱。' },
        { damage: 116, interval: 5.2, radius: 60, count: 1, delay: .68, text: '光柱伤害 <b>+26</b>。' },
        { damage: 138, interval: 4.9, radius: 66, count: 1, delay: .64, text: '爆炸范围提升。' },
        { damage: 172, interval: 4.65, radius: 70, count: 2, delay: .6, text: '每次呼叫 <b>2</b> 道光柱。' },
        { damage: 214, interval: 4.4, radius: 76, count: 2, delay: .56, text: '伤害 <b>+42</b>。' },
        { damage: 260, interval: 4.1, radius: 82, count: 2, delay: .52, text: '轨道充能加速。' },
        { damage: 320, interval: 3.8, radius: 90, count: 3, delay: .48, text: '光柱数量 <b>3</b>。' },
        { damage: 430, interval: 3.35, radius: 104, count: 3, delay: .42, text: '<b>天基惩戒</b>：三连审判抹除敌群。' }
      ]
    }
  };

  const PASSIVES = {
    engine: {
      name: '引擎超频', en: 'OVERCLOCKED ENGINE', short: '推进', icon: 'engine', color: '#9bd8ff',
      desc: '移动速度提升，履带转向更迅捷。', max: 5,
      stats: ['速度 +8%'], text: '移动速度 <b>+8%</b>。'
    },
    armor: {
      name: '复合装甲', en: 'COMPOSITE ARMOR', short: '装甲', icon: 'armor', color: '#a9e56e',
      desc: '增加最大装甲值，并立即修复等量结构。', max: 5,
      stats: ['最大装甲 +18'], text: '最大装甲 <b>+18</b>，立即修复。'
    },
    loader: {
      name: '自动装弹机', en: 'AUTO-LOADER', short: '装填', icon: 'loader', color: '#ffb52d',
      desc: '所有武器的攻击间隔缩短。', max: 5,
      stats: ['攻速 +7%'], text: '全部武器攻速 <b>+7%</b>。'
    },
    magnet: {
      name: '磁力回收', en: 'MAGNETIC SALVAGE', short: '磁力', icon: 'magnet', color: '#5ff0ce',
      desc: '扩大余烬吸附范围，并提升拾取效率。', max: 5,
      stats: ['拾取范围 +22%'], text: '吸附范围 <b>+22%</b>，余烬经验 <b>+4%</b>。'
    },
    warhead: {
      name: '高爆装药', en: 'HIGH EXPLOSIVE', short: '爆装', icon: 'warhead', color: '#ff7a2a',
      desc: '所有爆炸范围与炮弹伤害提升。', max: 5,
      stats: ['爆炸范围 +10%'], text: '爆炸范围 <b>+10%</b>，全部伤害 <b>+4%</b>。'
    },
    cooling: {
      name: '冷却核心', en: 'CRYO CORE', short: '冷却', icon: 'cooling', color: '#79b9ff',
      desc: '降低技能与自动武器的冷却时间。', max: 5,
      stats: ['冷却 -7%'], text: '全部武器冷却 <b>-7%</b>。'
    },
    crit: {
      name: '暴击协议', en: 'CRITICAL PROTOCOL', short: '暴击', icon: 'crit', color: '#ff4f58',
      desc: '提高暴击率，暴击造成 1.8 倍伤害。', max: 5,
      stats: ['暴击率 +6%'], text: '暴击率 <b>+6%</b>，暴击伤害 <b>180%</b>。'
    },
    salvage: {
      name: '余烬解析', en: 'EMBER DECODER', short: '解析', icon: 'salvage', color: '#b896ff',
      desc: '从余烬中提取更多经验，并提高特殊道具掉率。', max: 5,
      stats: ['经验 +12%'], text: '经验获取 <b>+12%</b>，特殊掉落 <b>+4%</b>。'
    },
    overdrive: {
      name: '过载输出', en: 'OVERDRIVE', short: '过载', icon: 'overdrive', color: '#ffb52d',
      desc: '提升所有来源的伤害输出。', max: 5,
      stats: ['全部伤害 +8%'], text: '全部伤害 <b>+8%</b>。'
    },
    shield: {
      name: '相位护盾', en: 'PHASE SHIELD', short: '护盾', icon: 'shield', color: '#5ff0ce',
      desc: '获得可再生护盾，抵挡下一次伤害。', max: 4,
      stats: ['护盾 +24'], text: '获得 <b>24</b> 点护盾，脱战 6 秒后重新充能。'
    },
  };


  const TANKS = [
    { id:'vanguard', name:'先锋 M-01', en:'VANGUARD', role:'均衡', desc:'标准装甲与稳定火力。没有短板，适合第一次闯关。', trait:'全伤害 +10%，最大装甲 +10%', colors:{body:'#c47a2d',light:'#ffd176',dark:'#4f2b0d',core:'#5ff0ce'}, hpMul:1.1, damageMul:1.1, affinity:['cannon','armor','overdrive'], start:{weapons:{cannon:1}} },
    { id:'twin', name:'双管 M-02', en:'TWINBARREL', role:'连射', desc:'双联装填，把弹幕铺成一面墙。', trait:'主炮 +1 发齐射；攻速 -5%', colors:{body:'#b35a32',light:'#ffb07a',dark:'#4b2114',core:'#ffcf5a'}, extraShots:1, attackSpeedMul:.95, affinity:['cannon','loader','warhead'], start:{weapons:{cannon:1}} },
    { id:'bastion', name:'铁壁 M-03', en:'BASTION', role:'重装', desc:'慢，但很难被真正打穿。', trait:'最大装甲 +30%；受伤 -18%；速度 -8%', colors:{body:'#6f7b7d',light:'#d4e0dc',dark:'#2b3435',core:'#9bd8ff'}, hpMul:1.3, damageTakenMul:.82, speedMul:.92, affinity:['armor','shield','cannon'], start:{weapons:{cannon:1},passives:{armor:1}} },
    { id:'gale', name:'疾风 M-04', en:'GALE', role:'机动', desc:'用速度换位置，用冲刺换命。', trait:'速度 +18%；冲刺冷却 -30%', colors:{body:'#3f9e91',light:'#b4fff2',dark:'#123c38',core:'#5ff0ce'}, speedMul:1.18, dashCdMul:.7, affinity:['engine','cannon','cooling'], start:{weapons:{cannon:1},passives:{engine:1}} },
    { id:'railgun', name:'磁轨 M-05', en:'RAILGUN', role:'穿透', desc:'一条直线，穿过多层装甲。', trait:'主炮穿透 +2；暴击率 +8%', colors:{body:'#6574ad',light:'#c2d3ff',dark:'#252d55',core:'#9dbbff'}, pierceAdd:2, critAdd:.08, affinity:['cannon','crit','cooling'], start:{weapons:{cannon:1}} },
    { id:'pyro', name:'焚化 M-06', en:'PYRO', role:'火海', desc:'战场不是棋盘，是燃料。', trait:'开场携带燃迹；爆炸范围 +15%', colors:{body:'#d24a2e',light:'#ffb066',dark:'#4e170e',core:'#ff7a2a'}, areaMul:1.15, affinity:['flame','warhead','cannon'], start:{weapons:{cannon:1,flame:1},passives:{warhead:1}} },
    { id:'storm', name:'雷暴 M-07', en:'STORMCALLER', role:'连锁', desc:'让闪电在敌群里自己找路。', trait:'开场携带电弧；连锁 +2；冷却 -10%', colors:{body:'#486fc0',light:'#b8d7ff',dark:'#19294f',core:'#79b9ff'}, arcAdd:2, cdrMul:.9, affinity:['arc','cooling','cannon'], start:{weapons:{cannon:1,arc:1}} },
    { id:'hive', name:'蜂巢 M-08', en:'HIVE', role:'无人机', desc:'你只需要移动，蜂群负责扣扳机。', trait:'开场携带蜂群；无人机 +1', colors:{body:'#b38a3e',light:'#ffe6a0',dark:'#493414',core:'#ffd15c'}, droneAdd:1, affinity:['drone','loader','cannon'], start:{weapons:{cannon:1,drone:1}} },
    { id:'sapper', name:'工兵 M-09', en:'SAPPER', role:'雷区', desc:'把追兵变成一片会发光的禁区。', trait:'开场携带地雷；每次布雷 +1', colors:{body:'#a87932',light:'#ffd889',dark:'#452e11',core:'#ffcf5a'}, mineAdd:1, areaMul:1.1, affinity:['mine','warhead','armor'], start:{weapons:{cannon:1,mine:1}} },
    { id:'oracle', name:'天罚 M-10', en:'ORACLE', role:'轨道', desc:'从看不见的高处，替战场做减法。', trait:'开场携带轨道；光柱 +1；冷却 -10%', colors:{body:'#8b6ac4',light:'#e0c8ff',dark:'#36254f',core:'#b896ff'}, orbitalAdd:1, cdrMul:.9, affinity:['orbital','cooling','crit'], start:{weapons:{cannon:1,orbital:1}} },
    { id:'cryo', name:'霜牙 M-11', en:'CRYO', role:'减速', desc:'先冻住，再拆掉。', trait:'炮弹命中减速 30%，持续 1.2 秒', colors:{body:'#4f9eb5',light:'#c7f5ff',dark:'#183c49',core:'#9bd8ff'}, slowOnHit:true, affinity:['cannon','cooling','armor'], start:{weapons:{cannon:1}} },
    { id:'magnet', name:'磁力 M-12', en:'MAGNET', role:'拾取', desc:'余烬会自己来找你。', trait:'拾取范围 +70%；经验 +12%', colors:{body:'#4c9e91',light:'#c8fff2',dark:'#173d38',core:'#5ff0ce'}, pickupMul:1.7, xpMul:1.12, affinity:['magnet','salvage','cannon'], start:{weapons:{cannon:1},passives:{magnet:1}} },
    { id:'scavenger', name:'拾荒 M-13', en:'SCAVENGER', role:'经验', desc:'每一块废铁，都是下一层协议。', trait:'经验 +20%；特殊掉落 +4%', colors:{body:'#9b8b4d',light:'#f1e5a0',dark:'#3a3216',core:'#f5d76e'}, xpMul:1.2, dropAdd:.04, affinity:['salvage','magnet','cannon'], start:{weapons:{cannon:1},passives:{salvage:1}} },
    { id:'vampire', name:'吸血鬼 M-14', en:'VAMPIRE', role:'吸能', desc:'敌人的最后一口气，归你。', trait:'击毁敌人修复 1.2 装甲', colors:{body:'#7d3b55',light:'#ff9dc0',dark:'#2c101c',core:'#ff4f7a'}, lifesteal:1.2, affinity:['cannon','overdrive','crit'], start:{weapons:{cannon:1}} },
    { id:'glass', name:'玻璃炮 M-15', en:'GLASS CANNON', role:'爆发', desc:'一发入魂，或者一发入土。', trait:'全伤害 +40%；最大装甲 -35%；速度 +8%', colors:{body:'#c96b2d',light:'#ffe0a0',dark:'#4a220e',core:'#ffb52d'}, damageMul:1.4, hpMul:.65, speedMul:1.08, affinity:['cannon','crit','overdrive'], start:{weapons:{cannon:1}} },
    { id:'medic', name:'医疗 M-16', en:'MEDIC', role:'护盾', desc:'活着，才有下一轮输出。', trait:'护盾每秒充能 1.2；附近友军缓慢修复', colors:{body:'#4f9b75',light:'#c8ffe1',dark:'#183b2b',core:'#5ff0ce'}, shieldRegen:1.2, auraHeal:.25, affinity:['shield','armor','cannon'], start:{weapons:{cannon:1},passives:{shield:1}} },
    { id:'juggernaut', name:'巨兽 M-17', en:'JUGGERNAUT', role:'坦度', desc:'不需要躲子弹，子弹需要躲你。', trait:'最大装甲 +35%；受伤 -10%；速度 -15%', colors:{body:'#71634a',light:'#d8c294',dark:'#342b1b',core:'#ffbc55'}, hpMul:1.35, damageTakenMul:.9, speedMul:.85, affinity:['armor','shield','cannon'], start:{weapons:{cannon:1},passives:{armor:1}} },
    { id:'phantom', name:'幽灵 M-18', en:'PHANTOM', role:'冲刺', desc:'出现，开火，消失。', trait:'冲刺冷却 -45%；速度 +6%', colors:{body:'#4e7b8b',light:'#b7efff',dark:'#172f38',core:'#5ff0ce'}, dashCdMul:.55, speedMul:1.06, affinity:['engine','cannon','crit'], start:{weapons:{cannon:1},passives:{engine:1}} },
    { id:'demo', name:'爆破 M-19', en:'DEMOLITION', role:'爆炸', desc:'把每一发炮弹都变成一个小型事件。', trait:'爆炸范围 +25%；爆炸伤害 +10%', colors:{body:'#b45a32',light:'#ffc07a',dark:'#44200f',core:'#ff7a2a'}, areaMul:1.25, explodeAdd:20, affinity:['warhead','mine','cannon'], start:{weapons:{cannon:1},passives:{warhead:1}} },
    { id:'toxin', name:'毒蝎 M-20', en:'TOXIN', role:'中毒', desc:'不追求一炮致命，只追求慢慢烂掉。', trait:'命中附加中毒，2 秒持续伤害；全伤害 -5%', colors:{body:'#6c8a38',light:'#d8ff9a',dark:'#2b3a12',core:'#a9e56e'}, poisonOnHit:true, damageMul:.95, affinity:['cannon','flame','warhead'], start:{weapons:{cannon:1}} }
  ];

  const FUSIONS = {
    cannon: { id:'cannon', weapon:'cannon', passive:'overdrive', weaponLevel:6, passiveLevel:2, name:'湮灭轨道炮', en:'ANNIHILATOR RAIL', color:'#ffb52d', icon:'cannon', desc:'主炮+1齐射，穿透+2，命中引发 <b>轨道爆裂</b>。' },
    drone: { id:'drone', weapon:'drone', passive:'loader', weaponLevel:6, passiveLevel:2, name:'母舰蜂群', en:'MOTHERSHIP SWARM', color:'#5ff0ce', icon:'drone', desc:'无人机 +1，脉冲伤害提高，蜂群覆盖全场。' },
    arc: { id:'arc', weapon:'arc', passive:'cooling', weaponLevel:6, passiveLevel:2, name:'雷神风暴', en:'THUNDERSTORM', color:'#79b9ff', icon:'arc', desc:'电弧连锁 +2，冷却缩短，闪电在敌群中爆裂。' },
    flame: { id:'flame', weapon:'flame', passive:'warhead', weaponLevel:6, passiveLevel:2, name:'焚城炼狱', en:'INFERNO', color:'#ff7a2a', icon:'flame', desc:'火焰范围 +30%，伤害 +30%，留下持续燃烧的火海。' },
    mine: { id:'mine', weapon:'mine', passive:'armor', weaponLevel:6, passiveLevel:2, name:'奇点雷区', en:'SINGULARITY FIELD', color:'#ffcf5a', icon:'mine', desc:'每次布雷 +1，爆炸半径与伤害大幅提高。' },
    orbital: { id:'orbital', weapon:'orbital', passive:'crit', weaponLevel:6, passiveLevel:2, name:'天基审判', en:'ORBITAL JUDGEMENT', color:'#b896ff', icon:'orbital', desc:'光柱 +1，暴击由轨道放大，审判覆盖整片战区。' }
  };

  // Role tags make each upgrade card's battlefield job explicit.
  Object.assign(WEAPONS.cannon, { role:'单体爆发', focus:'Boss / 直线穿透' });
  Object.assign(WEAPONS.drone, { role:'持续火力', focus:'自动索敌 / 多目标' });
  Object.assign(WEAPONS.arc, { role:'连锁清场', focus:'密集敌群 / 跳跃' });
  Object.assign(WEAPONS.flame, { role:'区域封锁', focus:'走位 / 持续灼烧' });
  Object.assign(WEAPONS.mine, { role:'陷阱控场', focus:'埋伏 / 爆发' });
  Object.assign(WEAPONS.orbital, { role:'重型炮击', focus:'敌群 / 高伤害' });
  Object.assign(PASSIVES.engine, { role:'机动' });
  Object.assign(PASSIVES.armor, { role:'生存' });
  Object.assign(PASSIVES.loader, { role:'输出频率' });
  Object.assign(PASSIVES.magnet, { role:'资源' });
  Object.assign(PASSIVES.warhead, { role:'范围爆发' });
  Object.assign(PASSIVES.cooling, { role:'技能循环' });
  Object.assign(PASSIVES.crit, { role:'爆发' });
  Object.assign(PASSIVES.salvage, { role:'成长' });
  Object.assign(PASSIVES.overdrive, { role:'全伤' });
  Object.assign(PASSIVES.shield, { role:'容错' });

  // Progression: each sealed chassis has a seal core placed in its stage.
  // Break the core, defeat the summoned seal guard, and the chassis is permanently unlocked.
  const SEAL_TANKS_BY_STAGE = [
    ['twin', 'magnet'],
    ['bastion', 'gale'],
    ['railgun', 'pyro'],
    ['storm', 'sapper'],
    ['hive', 'cryo'],
    ['oracle', 'scavenger'],
    ['vampire', 'glass', 'medic'],
    ['juggernaut', 'phantom', 'demo', 'toxin']
  ];
  const TANK_COSTS = {
    vanguard: 0, twin: 40, bastion: 60, gale: 50, railgun: 90, pyro: 90,
    storm: 120, hive: 140, sapper: 120, oracle: 160, cryo: 150, magnet: 80,
    scavenger: 180, vampire: 180, glass: 210, medic: 220, juggernaut: 240,
    phantom: 280, demo: 300, toxin: 360
  };
  for (const tank of TANKS) {
    const sealStage = SEAL_TANKS_BY_STAGE.findIndex(list => list.includes(tank.id));
    tank.sealStage = sealStage;
    tank.unlock = tank.id === 'vanguard'
      ? { type: 'default', value: 0 }
      : { type: 'seal', value: sealStage + 1 };
    tank.cost = TANK_COSTS[tank.id] || 400;
  }

  const DIFFICULTIES = [
    {
      id: 'normal', name: '普通', en: 'NORMAL', desc: '标准威胁 · 标准核心奖励',
      mod: { enemyHp: 1, enemyDamage: 1, enemySpeed: 1, spawnMul: 1, bossHp: 1, xpMul: 1, coreMul: 1 }
    },
    {
      id: 'hard', name: '困难', en: 'HARD', desc: '敌军强化 · 核心奖励 +25%',
      mod: { enemyHp: 1.22, enemyDamage: 1.3, enemySpeed: 1.08, spawnMul: 1.15, bossHp: 1.25, xpMul: 1.08, coreMul: 1.25 }
    },
    {
      id: 'nightmare', name: '噩梦', en: 'NIGHTMARE', desc: '极限围杀 · 核心奖励 +60%',
      mod: { enemyHp: 1.5, enemyDamage: 1.6, enemySpeed: 1.18, spawnMul: 1.35, bossHp: 1.5, xpMul: 1.18, coreMul: 1.6 }
    }
  ];

  const PLAYER_BASE = {
    maxHp: 190, speed: 128, radius: 13, fireInterval: .60, damage: 17,
    pickupRadius: 120, crit: .05, critMult: 1.8, xpGain: 1, cdr: 1, area: 1, damageMult: 1
  };
  const UPGRADE_RARITY = {
    weapon: { label: '武器模块', accent: '#ffb52d' },
    passive: { label: '被动协议', accent: '#5ff0ce' }
  };

  window.BF_CONTENT = { MAPS, ENEMIES, WAVES, ITEMS, WEAPONS, PASSIVES, TANKS, FUSIONS, SEAL_TANKS_BY_STAGE, DIFFICULTIES, PLAYER_BASE, UPGRADE_RARITY };
})();
