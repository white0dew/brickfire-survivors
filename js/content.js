/* STEEL EMBERS // content definitions. All art is generated at runtime. */
(function () {
  'use strict';

  const MAPS = [
    {
      id: 'furnace',
      name: '熔炉工厂',
      en: 'FURNACE WORKS',
      sector: 'SECTOR 01',
      desc: '标准威胁 · 高温余烬',
      mod: { enemyHp: .88, enemyDamage: .72, spawnMul: 1.25, bossHp: .6, xpMul: 1.15 },
      baseHpMul: 1.5, startTurrets: 2, baseDamageMul: .55,
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
    },
    {
      id: 'citadel', name: '天穹堡垒', en: 'SKY CITADEL', sector: 'SECTOR 09',
      desc: '立体交叉火力 · 深层战区',
      mod: { enemyHp: 1.68, enemySpeed: 1.14, spawnMul: .78, xpMul: 1.24, bossHp: 1.15 },
      palette: {
        sky: '#0b111d', ground: '#1e2b3a', groundAlt: '#243446', grid: 'rgba(195,222,255,.045)',
        fog: 'rgba(114,185,255,.07)', accent: '#8bd4ff', ambient: '#4b9cff',
        brickA: '#546a8f', brickB: '#2d3b54', brickLight: '#91acd1', brickDark: '#182235',
        steelA: '#5a7080', steelB: '#2f3f4d', steelLight: '#b4d3e2', water: '#12384d', waterLight: '#347c9d',
        bush: '#244637', bushLight: '#4b8060', core: '#8bd4ff', hazard: '#ffd36b'
      },
      map: [
        '..............................',
        '..SS..BBBB......BBBB..SS......',
        '..SS..B..B......B..B..SS......',
        '......B..B..SS..B..B..........',
        '..BBBBBB..B..SS..B..BBBBBB....',
        '..B....B..B......B..B....B....',
        '..B....B..BBBB....BBBB..B.....',
        '..BBBBBB......BB......BBBB....',
        '........SS....SS..............',
        '..TT....SS....SS....TT........',
        '..TT................TT........',
        '..BBBB..BBBB....BBBB..BBBB....',
        '..B..B..B..B....B..B..B..B....',
        '..BBBB..B..B....B..B..BBBB....',
        '........BBBB....BBBB..........',
        '......P.....B..B..............',
        '............B.CC.B............',
        '............B.CC.B............'
      ]
    },
    {
      id: 'abyss', name: '深渊泵站', en: 'ABYSS PUMP', sector: 'SECTOR 10',
      desc: '水网与回廊 · 深层战区',
      mod: { enemyHp: 1.8, enemySpeed: 1.16, spawnMul: .76, xpMul: 1.28, bossHp: 1.2 },
      palette: {
        sky: '#071416', ground: '#183033', groundAlt: '#1e3a3d', grid: 'rgba(152,244,232,.045)',
        fog: 'rgba(54,224,194,.07)', accent: '#53e6cb', ambient: '#22b79c',
        brickA: '#3f6070', brickB: '#243843', brickLight: '#7fa9b5', brickDark: '#122129',
        steelA: '#48666b', steelB: '#263d41', steelLight: '#9ac7c8', water: '#083b45', waterLight: '#1a8d9a',
        bush: '#1c4b3d', bushLight: '#3f876b', core: '#53e6cb', hazard: '#ffb36b'
      },
      map: [
        '..............................',
        '..BBBB..WWWW....WWWW..BBBB....',
        '..B..B..WWWW....WWWW..B..B....',
        '..B..B..WWWW....WWWW..B..B....',
        '..BBBB..WWWW....WWWW..BBBB....',
        '..........WW....WW............',
        '..SS......WW....WW......SS....',
        '..SS....................SS....',
        '........BBBBBBBBBBBB..........',
        '..TT....B..........B....TT....',
        '..TT....B..SS..SS..B....TT....',
        '........B..SS..SS..B..........',
        '........BBBBBBBBBBBB..........',
        '..BBBB................BBBB....',
        '..B..B................B..B....',
        '......P.....B..B..............',
        '............B.CC.B............',
        '............B.CC.B............'
      ]
    },
    {
      id: 'solar', name: '日冕裂谷', en: 'SOLAR RIFT', sector: 'SECTOR 11',
      desc: '开阔火线 · 深层战区',
      mod: { enemyHp: 1.92, enemySpeed: 1.18, spawnMul: .74, xpMul: 1.32, bossHp: 1.28 },
      palette: {
        sky: '#180e08', ground: '#342419', groundAlt: '#3e2b1c', grid: 'rgba(255,210,132,.05)',
        fog: 'rgba(255,143,64,.08)', accent: '#ffbf5a', ambient: '#ff7d2d',
        brickA: '#8a4b2e', brickB: '#51291b', brickLight: '#d68a55', brickDark: '#2d140d',
        steelA: '#77664f', steelB: '#41372b', steelLight: '#dbc79a', water: '#3a2318', waterLight: '#9d592d',
        bush: '#4a3d22', bushLight: '#8c7440', core: '#ffbf5a', hazard: '#ff6f4d'
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
        '........TT....TT..............',
        '..BBBB..TT....TT..BBBB........',
        '..B..B............B..B........',
        '..B..B....BBBB....B..B........',
        '..BBBB....B..B....BBBB........',
        '..........B..B................',
        '......P...BBBB................',
        '............B..B..............',
        '............B.CC.B............',
        '............B.CC.B............'
      ]
    },
    {
      id: 'throne', name: '边境王座', en: 'BORDER THRONE', sector: 'SECTOR 12',
      desc: '最终深层战区 · 泰坦决战',
      mod: { enemyHp: 2.05, enemySpeed: 1.2, spawnMul: .72, xpMul: 1.38, bossHp: 1.35 },
      palette: {
        sky: '#160d13', ground: '#30232d', groundAlt: '#392a35', grid: 'rgba(255,197,214,.05)',
        fog: 'rgba(255,101,137,.075)', accent: '#ff9ab2', ambient: '#ff4f78',
        brickA: '#7c3d53', brickB: '#482433', brickLight: '#c4798e', brickDark: '#29121c',
        steelA: '#66545c', steelB: '#3b2f36', steelLight: '#c4a7b2', water: '#361b2b', waterLight: '#8b3f63',
        bush: '#45303a', bushLight: '#7f5565', core: '#ff9ab2', hazard: '#ffcf73'
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
    },

    // ---- PER-MAP BOSS ROSTER ----
    bossHive: {
      name: '巢母·感染型', en: 'HIVE MATRON', hp: 16000, speed: 16, damage: 30, fire: 2.2, bulletSpeed: 190,
      xp: 280, radius: 30, color: '#6f7f3a', dark: '#1c2411', light: '#d8ff9a', core: '#a9e56e', class: 'boss', boss: true,
      bossKind: 'hive', bossScale: 1.38, tag: 'HIVE // MATRON', domain: 'ground',
      codex: '霓虹沼泽的巢母。不断产出分裂运输车与毒素池；先清幼体，别在毒池里和它换血。'
    },
    bossCryo: {
      name: '冰棺·堡垒型', en: 'CRYO BASTION', hp: 21000, speed: 12, damage: 34, fire: 2.0, bulletSpeed: 220,
      xp: 300, radius: 28, color: '#5c7f96', dark: '#17232c', light: '#c8f4ff', core: '#7fe8ff', class: 'boss', boss: true,
      bossKind: 'cryo', bossScale: 1.42, tag: 'CRYO // BASTION', domain: 'ground',
      codex: '霜蚀边陲的冰棺堡垒。晶体护甲周期性展开，发射减速冰锥；护甲展开时绕后或用爆炸破甲。'
    },
    bossDread: {
      name: '赤潮·无畏舰', en: 'REDTIDE DREADNOUGHT', hp: 24000, speed: 14, damage: 36, fire: 1.8, bulletSpeed: 250,
      xp: 320, radius: 32, color: '#7a3440', dark: '#201016', light: '#ffb0a0', core: '#ff5b4a', class: 'boss', boss: true,
      bossKind: 'dread', bossScale: 1.5, tag: 'DREAD // REDTIDE', domain: 'ground',
      codex: '赤潮港的无畏舰。舷侧齐射与鱼雷扇面覆盖大片水域，保持斜向移动，别正对它的侧舷。'
    },
    bossBurrower: {
      name: '熔渣·掘地虫', en: 'SLAG BURROWER', hp: 22000, speed: 22, damage: 40, fire: 2.4, bulletSpeed: 200,
      xp: 300, radius: 30, color: '#8a4b2c', dark: '#24130c', light: '#ffbe7a', core: '#ff8a3a', class: 'boss', boss: true,
      bossKind: 'burrower', bossScale: 1.45, tag: 'BURROW // SLAG', domain: 'ground',
      codex: '余烬高架下的巨虫。会潜地突进并留下熔渣喷发；听到钻头震动就离开落点。'
    },
    bossSkycarrier: {
      name: '苍穹·航母', en: 'SKY CARRIER', hp: 23000, speed: 18, damage: 32, fire: 1.7, bulletSpeed: 240,
      xp: 320, radius: 34, color: '#6f5540', dark: '#201811', light: '#ffd7a4', core: '#5ff0ce', class: 'boss', boss: true,
      bossKind: 'skycarrier', bossScale: 1.55, tag: 'SKY // CARRIER', domain: 'air',
      codex: '轨道墓场上空的无人机母舰。持续放出侦察无人机与俯冲翼，并用扫射航线封锁地面。'
    },
    bossXenarch: {
      name: '异星·执政官', en: 'XENARCH', hp: 26000, speed: 20, damage: 38, fire: 1.6, bulletSpeed: 270,
      xp: 360, radius: 30, color: '#59458f', dark: '#1a1230', light: '#cbb8ff', core: '#9b7bff', class: 'boss', boss: true,
      bossKind: 'xenarch', bossScale: 1.5, tag: 'XENARCH // ZERO', domain: 'hover',
      codex: '零号反应堆的异星执政官。瞬移、交叉光束与护盾节点同时出现；先拆节点再集火本体。'
    },
    bossSentinel: {
      name: '终焉·穹顶哨兵', en: 'DOME SENTINEL', hp: 28000, speed: 10, damage: 42, fire: 2.0, bulletSpeed: 230,
      xp: 380, radius: 34, color: '#6e6250', dark: '#211c15', light: '#ffe6a8', core: '#ffcf5a', class: 'boss', boss: true,
      bossKind: 'sentinel', bossScale: 1.55, tag: 'SENTINEL // DOME', domain: 'ground',
      codex: '终焉穹顶的旋转护盾核心。护盾展开时正面减伤，旋转结束后露出核心；抓窗口输出。'
    },
    bossSkyfortress: {
      name: '天穹·要塞', en: 'SKY FORTRESS', hp: 30000, speed: 12, damage: 40, fire: 1.8, bulletSpeed: 220,
      xp: 400, radius: 38, color: '#5b6570', dark: '#1a2025', light: '#d8e8f0', core: '#7fe8ff', class: 'boss', boss: true,
      bossKind: 'skyfortress', bossScale: 1.65, tag: 'FORTRESS // CITADEL', domain: 'air',
      codex: '天穹堡垒的悬浮要塞。四角炮塔轮转轰炸，并释放炮艇；优先击破角部炮塔减少弹幕。'
    },
    bossLeviathan: {
      name: '深渊·利维坦', en: 'ABYSS LEVIATHAN', hp: 32000, speed: 14, damage: 44, fire: 2.1, bulletSpeed: 210,
      xp: 420, radius: 36, color: '#3f6f70', dark: '#102324', light: '#a8f0e0', core: '#5ff0ce', class: 'boss', boss: true,
      bossKind: 'leviathan', bossScale: 1.6, tag: 'LEVIATHAN // ABYSS', domain: 'hover',
      codex: '深渊泵站深处的触手巨兽。触手拍击与毒潮会封锁走位，攻击间隙集中在核心。'
    },
    bossSeraph: {
      name: '日冕·炽天使', en: 'SOLAR SERAPH', hp: 34000, speed: 16, damage: 46, fire: 1.9, bulletSpeed: 260,
      xp: 440, radius: 34, color: '#8a5a2f', dark: '#2a1710', light: '#ffe0a0', core: '#ffb52d', class: 'boss', boss: true,
      bossKind: 'seraph', bossScale: 1.55, tag: 'SERAPH // SOLAR', domain: 'hover',
      codex: '日冕裂谷的恒星守卫。环绕日珥球与放射状耀斑交替出现，利用间隙靠近。'
    },
    bossWarlord: {
      name: '边境·霸主', en: 'BORDER WARLORD', hp: 36000, speed: 18, damage: 48, fire: 1.5, bulletSpeed: 250,
      xp: 480, radius: 34, color: '#7b2f2f', dark: '#241010', light: '#ffb18a', core: '#ff4f58', class: 'boss', boss: true,
      bossKind: 'warlord', bossScale: 1.6, tag: 'WARLORD // THRONE', domain: 'ground',
      codex: '边境王座的主人。召唤封印守卫、冲锋与重炮轮换；最后一战没有安全角落。'
    },

    // ---- EXPANSION PILOT: Rust Legion ground units ----
    mortar: {
      name: '炉膛迫击车', en: 'FURNACE MORTAR', hp: 95, speed: 26, damage: 18, fire: 3.8, bulletSpeed: 0,
      xp: 6, radius: 14, color: '#b76038', dark: '#4a2318', light: '#ffb279', core: '#ffcf5a', class: 'medium',
      domain: 'ground', ai: 'artillery', role: 'artillery', tier: 1, size: 1.02,
      codex: '曲射单位。会预判车体位置，延迟后落下燃烧弹；看到地面红圈就离开。'
    },
    bulwark: {
      name: '盾墙车', en: 'BULWARK', hp: 420, speed: 20, damage: 16, fire: 2.8, bulletSpeed: 210,
      xp: 26, radius: 18, color: '#a85a32', dark: '#3a1c12', light: '#ffb87a', core: '#ffb52d', class: 'heavy',
      domain: 'ground', ai: 'shield', role: 'tank', tier: 2, size: 1.25,
      codex: '正面装有推土铲的重装单位。正面减伤极高，绕后、电弧和曲射能有效处理。'
    },
    minelayer: {
      name: '布雷履带', en: 'MINELAYER', hp: 90, speed: 32, damage: 12, fire: 0, bulletSpeed: 0,
      xp: 5, radius: 12, color: '#9a7b3e', dark: '#3c3117', light: '#ffdd8a', core: '#ffcf5a', class: 'light',
      domain: 'ground', ai: 'minelayer', role: 'trapper', tier: 1, size: .95,
      codex: '移动时在身后布设感应雷。不要沿着它的旧路线追击；远程打掉地雷。'
    },
    splitter: {
      name: '分裂运输车', en: 'SPLITTER', hp: 300, speed: 26, damage: 15, fire: 2.5, bulletSpeed: 220,
      xp: 18, radius: 16, color: '#a66a42', dark: '#42251a', light: '#e9a878', core: '#ff9d5a', class: 'medium',
      domain: 'ground', ai: 'splitter', role: 'carrier', tier: 2, size: 1.12,
      codex: '死亡时分裂成三只小型履带。尽量用范围伤害一次清干净，避免被碎片包围。'
    },
    scrap: {
      name: '碎片履带', en: 'SCRAP RUNNER', hp: 18, speed: 62, damage: 6, fire: 0, bulletSpeed: 0,
      xp: 1, radius: 7, color: '#b3774b', dark: '#3a2418', light: '#ffc08a', core: '#ff8a4a', class: 'light',
      domain: 'ground', ai: 'rusher', role: 'rusher', tier: 1, size: .7,
      codex: '分裂运输车死亡后掉出的高速碎片。血少、速度快，优先用范围武器清掉。'
    },

    // ---- EXPANSION PILOT: Sky Swarm air units ----
    drone: {
      name: '侦察无人机', en: 'RECON DRONE', hp: 48, speed: 70, damage: 6, fire: 2.2, bulletSpeed: 280,
      xp: 3, radius: 8, color: '#b8753e', dark: '#3b2416', light: '#ffcf8a', core: '#5ff0ce', class: 'light',
      domain: 'air', ai: 'airOrbit', role: 'rusher', tier: 1, size: .8,
      codex: '四旋翼侦察机。会绕着目标盘旋点射，完全无视地面墙体和水域；看它的地面影子。'
    },
    strafer: {
      name: '俯冲翼', en: 'STRAFER', hp: 160, speed: 62, damage: 14, fire: 3.2, bulletSpeed: 300,
      xp: 9, radius: 11, color: '#b97945', dark: '#3b2418', light: '#ffd19a', core: '#5ff0ce', class: 'medium',
      domain: 'air', ai: 'airStrafe', role: 'bomber', tier: 2, size: .9,
      codex: '会先锁定一条扫射路线，再俯冲扫过。红线出现后立刻离开，别和它比直线速度。'
    },
    skybomber: {
      name: '轰炸机', en: 'SKY BOMBER', hp: 230, speed: 38, damage: 20, fire: 4.2, bulletSpeed: 0,
      xp: 13, radius: 15, color: '#a9693d', dark: '#352215', light: '#ffd7a4', core: '#ffcf5a', class: 'heavy',
      domain: 'air', ai: 'airBomber', role: 'artillery', tier: 2, size: 1.15,
      codex: '重型空中平台。沿航线投放三枚炸弹，落点会提前标记；优先在投弹前打掉。'
    },
    gunship: {
      name: '炮艇', en: 'GUNSHIP', hp: 360, speed: 26, damage: 12, fire: 1.9, bulletSpeed: 250,
      xp: 16, radius: 17, color: '#9e6c45', dark: '#322116', light: '#e8c49b', core: '#ffcf5a', class: 'heavy',
      domain: 'air', ai: 'airGunship', role: 'tank', tier: 2, size: 1.2,
      codex: '悬停炮艇。会在中距离持续压制，逼迫车体离开掩体；用对空爆发或绕到侧后方。'
    },

    // ---- EXPANSION PILOT: Xeno Fleet hover units ----
    saucer: {
      name: '侦察飞碟', en: 'XENO SAUCER', hp: 72, speed: 54, damage: 8, fire: 2.6, bulletSpeed: 260,
      xp: 5, radius: 11, color: '#6f5a9c', dark: '#241c39', light: '#c8b8ff', core: '#5ff0ce', class: 'light',
      domain: 'hover', ai: 'xenoHover', role: 'ranged', tier: 1, size: .95,
      codex: '异星侦察飞碟。悬浮移动、无视水域，会横向拉扯并发射青色光束。'
    },
    beamfrigate: {
      name: '光束护卫舰', en: 'BEAM FRIGATE', hp: 320, speed: 24, damage: 24, fire: 4.5, bulletSpeed: 0,
      xp: 16, radius: 15, color: '#614c91', dark: '#211832', light: '#c4a9ff', core: '#7fe8ff', class: 'heavy',
      domain: 'hover', ai: 'xenoBeam', role: 'artillery', tier: 2, size: 1.15,
      codex: '异星光束舰。蓄能后沿直线投射三段光束，先出现紫色警示线；离开射线。'
    },
    warper: {
      name: '跃迁者', en: 'WARPER', hp: 240, speed: 46, damage: 18, fire: 2.8, bulletSpeed: 280,
      xp: 14, radius: 13, color: '#5b4f99', dark: '#1d1734', light: '#b9a8ff', core: '#5ff0ce', class: 'medium',
      domain: 'hover', ai: 'xenoWarper', role: 'ambusher', tier: 2, size: 1.0,
      codex: '会周期性传送到目标侧后方。传送前有空间扭曲，保持移动并准备近身爆发。'
    },
    warden: {
      name: '异星守卫', en: 'XENO WARDEN', hp: 380, speed: 22, damage: 0, fire: 0, bulletSpeed: 0,
      xp: 18, radius: 16, color: '#55458c', dark: '#1b1533', light: '#b9a8ff', core: '#9b7bff', class: 'elite',
      domain: 'hover', ai: 'xenoWarden', role: 'support', tier: 2, size: 1.1,
      codex: '异星护盾节点。会给周围敌人提供减伤护盾，自己不攻击；优先集火破盾。'
    }
  };

  const WAVES = [
    { at: 0, label: '侦察潮', sub: 'SCOUT TIDE', spawn: 1.35, types: ['scout', 'scout', 'grunt'], max: 10 },
    { at: 55, label: '装甲楔', sub: 'ARMORED WEDGE', spawn: 1.10, types: ['grunt', 'scout', 'scout', 'heavy'], max: 15 },
    { at: 110, label: '蜂群突袭', sub: 'SWARM SURGE', spawn: 0.88, types: ['scout', 'bomber', 'grunt', 'scout'], max: 21 },
    { at: 165, label: '精英猎杀', sub: 'ELITE HUNT', spawn: 0.74, types: ['grunt', 'sniper', 'heavy', 'scout'], max: 27, elite: true },
    { at: 225, label: '铁幕推进', sub: 'IRON CURTAIN', spawn: 0.62, types: ['heavy', 'sniper', 'grunt', 'bomber'], max: 33, elite: true },
    { at: 285, label: '泰坦降临', sub: 'TITANFALL', spawn: 0.52, types: ['grunt', 'heavy', 'sniper', 'bomber'], max: 39, boss: true }
  ];

  const ITEMS = {
    star: { name: '火炮星星', en: 'STAR', color: '#ffb52d', glyph: '✦', desc: '主炮立即提升 1 级', detail: '主炮满级后，随机提升另一把武器；全部满级则修复 25 点装甲。' },
    grenade: { name: '震荡手雷', en: 'GRENADE', color: '#ff5b4a', glyph: '●', desc: '清除全屏敌弹并重创敌军', detail: '对屏幕内所有敌人造成高额伤害，同时清空敌方弹幕。' },
    helmet: { name: '反应头盔', en: 'HELMET', color: '#5ff0ce', glyph: '◒', desc: '获得 8 秒无敌护盾', detail: '持续期间免疫一切伤害；适合强行拾取或穿越弹幕。' },
    timer: { name: '时滞核心', en: 'TIMER', color: '#79b9ff', glyph: '◷', desc: '冻结所有敌人 7 秒', detail: '敌人停止移动与开火；首领同样受影响。' },
    shovel: { name: '应急维修', en: 'FIELD REPAIR', color: '#a9e56e', glyph: '✚', desc: '修复车体 25%，并获得 2 秒无敌', detail: '立即回复最大装甲的 25%，短暂无敌便于脱离包围。' },
    tank: { name: '备用车体', en: 'TANK', color: '#a9e56e', glyph: '▣', desc: '修复车体 45%，并提升 5 最大装甲', detail: '永久增加 5 点最大装甲，并按新上限修复 45%。' },
    basekit: { name: '基地维修包', en: 'BASE KIT', color: '#5ff0ce', glyph: '⌂', desc: '修复基地装甲 24%', detail: '只对基地生效；基地装甲归零会立即失守。' },
    turret: { name: '哨戒炮塔', en: 'SENTRY', color: '#8fffe6', glyph: '⌖', desc: '在基地周围部署防御塔', detail: '最多部署 4 座；基地本身不攻击。塔满后拾取改为修复基地 10% 装甲。' },
    hover: { name: '两栖浮渡', en: 'PONTOON', color: '#5ff0ce', glyph: '≈', desc: '15 秒内可穿越水面', detail: '临时展开浮筒，直接碾过水域；期间仍可正常开火和冲刺。' }
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
      name: '环绕蜂群', en: 'ORBITAL SWARM', short: '环绕', icon: 'drone', color: '#5ff0ce', type: 'weapon',
      desc: '无人机环绕车体旋转，自动攻击附近敌人，并能拦截敌方子弹。',
      levels: [
        { damage: 9, interval: 1.25, count: 1, range: 330, text: '部署 <b>1</b> 架环绕无人机，自动索敌并拦截子弹。' },
        { damage: 12, interval: 1.18, count: 1, range: 340, text: '脉冲伤害 <b>+3</b>。' },
        { damage: 13, interval: 1.10, count: 2, range: 350, text: '环绕机数量 <b>+1</b>。' },
        { damage: 17, interval: 1.02, count: 2, range: 360, text: '脉冲伤害 <b>+4</b>，射速提升。' },
        { damage: 21, interval: .92, count: 3, range: 380, text: '环绕机数量 <b>+1</b>。' },
        { damage: 26, interval: .84, count: 3, range: 400, text: '蜂群协议：伤害 <b>+5</b>，射速提升。' },
        { damage: 32, interval: .74, count: 4, range: 425, text: '环绕机数量 <b>+1</b>，弹药超频。' },
        { damage: 42, interval: .62, count: 5, range: 450, text: '<b>母舰协议</b>：五机环绕，形成移动弹幕屏障。' }
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
        { damage: 8, interval: .50, life: 4.2, radius: 24, text: '移动时留下双轨火焰，持续灼烧接触敌人。' },
        { damage: 10, interval: .44, life: 4.6, radius: 26, text: '火焰伤害 <b>+2</b>，火痕更密。' },
        { damage: 13, interval: .38, life: 5.0, radius: 29, text: '火痕范围扩大，燃烧更久。' },
        { damage: 16, interval: .33, life: 5.4, radius: 32, text: '伤害 <b>+3</b>，持续时间提升。' },
        { damage: 20, interval: .28, life: 5.9, radius: 35, text: '喷流压力提升，双轨铺满身后。' },
        { damage: 25, interval: .24, life: 6.4, radius: 38, text: '伤害 <b>+5</b>，火焰扩散。' },
        { damage: 31, interval: .20, life: 7.0, radius: 42, text: '火焰密度与范围提升。' },
        { damage: 40, interval: .16, life: 7.8, radius: 48, text: '<b>焚城协议</b>：所过之处皆为火海。' }
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
      name: '轨道光矛', en: 'ORBITAL LANCE', short: '轨道', icon: 'orbital', color: '#b896ff', type: 'weapon',
      desc: '标记敌群，从轨道投射聚焦光矛。',
      levels: [
        { damage: 90, interval: 5.4, radius: 56, count: 1, delay: .72, text: '每 <b>5.4</b> 秒标记敌群，降下 1 道光矛。' },
        { damage: 116, interval: 5.2, radius: 60, count: 1, delay: .68, text: '光矛伤害 <b>+26</b>。' },
        { damage: 138, interval: 4.9, radius: 66, count: 1, delay: .64, text: '爆炸范围提升。' },
        { damage: 172, interval: 4.65, radius: 70, count: 2, delay: .6, text: '每次呼叫 <b>2</b> 道光矛。' },
        { damage: 214, interval: 4.4, radius: 76, count: 2, delay: .56, text: '伤害 <b>+42</b>。' },
        { damage: 260, interval: 4.1, radius: 82, count: 2, delay: .52, text: '轨道充能加速。' },
        { damage: 320, interval: 3.8, radius: 90, count: 3, delay: .48, text: '光矛数量 <b>3</b>。' },
        { damage: 430, interval: 3.35, radius: 104, count: 3, delay: .42, text: '<b>天基惩戒</b>：三连光矛熔穿敌群。' }
      ]
    },
    scatter: {
      name: '碎星霰弹', en: 'STARBURST SCATTER', short: '霰弹', icon: 'cannon', color: '#ff9a4a', type: 'weapon',
      desc: '朝目标喷出扇形弹幕，贴脸时全部命中。',
      levels: [
        { damage: 12, interval: 1.08, speed: 500, pellets: 4, spread: .58, pierce: 0, text: '向目标喷出 <b>4</b> 枚弹丸。' },
        { damage: 15, interval: 1.0, speed: 510, pellets: 5, spread: .62, pierce: 0, text: '弹丸 <b>+1</b>，伤害提升。' },
        { damage: 18, interval: .94, speed: 520, pellets: 6, spread: .66, pierce: 0, text: '扇面扩大到 <b>6</b> 枚。' },
        { damage: 22, interval: .86, speed: 540, pellets: 6, spread: .7, pierce: 1, text: '弹丸可贯穿 <b>1</b> 个目标。' },
        { damage: 27, interval: .78, speed: 560, pellets: 7, spread: .74, pierce: 1, text: '伤害 <b>+5</b>，装填加速。' },
        { damage: 33, interval: .70, speed: 580, pellets: 8, spread: .78, pierce: 1, text: '近距爆发提升，弹丸 <b>8</b> 枚。' },
        { damage: 40, interval: .62, speed: 600, pellets: 9, spread: .82, pierce: 1, text: '弹幕密度大幅提升。' },
        { damage: 50, interval: .54, speed: 630, pellets: 12, spread: .96, pierce: 2, text: '<b>超新星散射</b>：12 枚弹丸覆盖整片扇区。' }
      ]
    },
    laser: {
      name: '棱镜激光', en: 'PRISM LANCE', short: '激光', icon: 'arc', color: '#ff6b8a', type: 'weapon',
      desc: '高频直线光束，瞬间贯穿一整列敌人。',
      levels: [
        { damage: 24, interval: 1.25, speed: 1450, pierce: 99, text: '每 <b>1.25</b> 秒发射一道贯穿光束。' },
        { damage: 30, interval: 1.16, speed: 1500, pierce: 99, text: '光束伤害 <b>+6</b>。' },
        { damage: 37, interval: 1.08, speed: 1550, pierce: 99, text: '聚焦透镜升级，伤害提升。' },
        { damage: 45, interval: .98, speed: 1600, pierce: 99, text: '冷却缩短，光束更密集。' },
        { damage: 54, interval: .88, speed: 1650, pierce: 99, text: '伤害 <b>+9</b>，穿透整条直线。' },
        { damage: 64, interval: .78, speed: 1720, pierce: 99, text: '棱镜过载，发射频率提升。' },
        { damage: 76, interval: .66, speed: 1800, pierce: 99, text: '高热光束灼穿重甲。' },
        { damage: 92, interval: .52, speed: 1900, pierce: 99, text: '<b>湮灭棱镜</b>：几乎不间断的贯穿射线。' }
      ]
    },
    missile: {
      name: '黄蜂导弹', en: 'HORNET PODS', short: '导弹', icon: 'mine', color: '#ffd05a', type: 'weapon',
      desc: '发射自动追踪的微型导弹，命中后爆炸。',
      levels: [
        { damage: 32, interval: 2.2, speed: 310, count: 1, explode: 30, turn: 4.2, text: '发射 <b>1</b> 枚追踪导弹。' },
        { damage: 40, interval: 2.08, speed: 320, count: 1, explode: 34, turn: 4.5, text: '导弹伤害与爆炸范围提升。' },
        { damage: 46, interval: 1.96, speed: 330, count: 2, explode: 38, turn: 4.8, text: '齐射 <b>2</b> 枚导弹。' },
        { damage: 56, interval: 1.82, speed: 345, count: 2, explode: 44, turn: 5.1, text: '推进器升级，追踪更灵敏。' },
        { damage: 68, interval: 1.68, speed: 360, count: 2, explode: 50, turn: 5.5, text: '弹头装药强化。' },
        { damage: 82, interval: 1.52, speed: 375, count: 3, explode: 58, turn: 6.0, text: '齐射 <b>3</b> 枚导弹。' },
        { damage: 100, interval: 1.36, speed: 390, count: 3, explode: 66, turn: 6.4, text: '蜂群弹幕形成饱和追踪。' },
        { damage: 125, interval: 1.16, speed: 410, count: 4, explode: 78, turn: 7.0, text: '<b>蜂群饱和</b>：四枚导弹同时锁定。' }
      ]
    },
    frost: {
      name: '霜环发生器', en: 'CRYO RING', short: '霜环', icon: 'cooling', color: '#9bd8ff', type: 'weapon',
      desc: '周期性释放霜冻脉冲，伤害并减速周围敌人。',
      levels: [
        { damage: 14, interval: 2.4, radius: 88, slow: 1.2, text: '释放霜环，减速周围敌人 <b>1.2</b> 秒。' },
        { damage: 19, interval: 2.25, radius: 96, slow: 1.35, text: '霜环范围与伤害提升。' },
        { damage: 24, interval: 2.1, radius: 104, slow: 1.5, text: '低温扩散，减速时间延长。' },
        { damage: 31, interval: 1.92, radius: 114, slow: 1.7, text: '冻结效率提升。' },
        { damage: 39, interval: 1.74, radius: 124, slow: 1.9, text: '霜环伤害 <b>+8</b>。' },
        { damage: 49, interval: 1.56, radius: 136, slow: 2.1, text: '冷却缩短，覆盖更大。' },
        { damage: 61, interval: 1.38, radius: 148, slow: 2.3, text: '接近绝对零度的脉冲。' },
        { damage: 78, interval: 1.18, radius: 165, slow: 2.6, text: '<b>绝对零度</b>：大范围冻结与重创。' }
      ]
    },
    toxin: {
      // Legacy id kept for saves; the weapon itself is now a kinetic orbital rod.
      name: '天基动能棒', en: 'RODS FROM GOD', short: '天基', icon: 'orbital', color: '#9dbbff', type: 'weapon',
      desc: '从轨道投下钨棒，延迟后贯穿并震碎目标区域。',
      levels: [
        { damage: 105, interval: 5.2, radius: 44, count: 1, delay: .9, text: '每 <b>5.2</b> 秒锁定目标，投下 1 根钨棒。' },
        { damage: 130, interval: 5.05, radius: 48, count: 1, delay: .86, text: '动能伤害 <b>+25</b>，落点更精准。' },
        { damage: 160, interval: 4.85, radius: 52, count: 1, delay: .82, text: '再入速度提升，冲击半径扩大。' },
        { damage: 195, interval: 4.6, radius: 58, count: 1, delay: .78, text: '钨棒质量增加，贯穿效果提升。' },
        { damage: 240, interval: 4.35, radius: 64, count: 2, delay: .72, text: '每次呼叫 <b>2</b> 根钨棒。' },
        { damage: 295, interval: 4.1, radius: 70, count: 2, delay: .66, text: '轨道投送窗口缩短。' },
        { damage: 365, interval: 3.8, radius: 78, count: 2, delay: .6, text: '连续动能打击覆盖敌群。' },
        { damage: 455, interval: 3.45, radius: 88, count: 3, delay: .52, text: '<b>天基制裁</b>：三根钨棒同时贯穿战区。' }
      ]
    },
    gravity: {
      name: '引力奇点', en: 'GRAVITY WELL', short: '引力', icon: 'orbital', color: '#b896ff', type: 'weapon',
      desc: '制造吸附奇点，把敌军拖入中心并持续碾碎。',
      levels: [
        { damage: 18, interval: 4.6, radius: 82, life: 1.2, pull: 44, text: '生成 <b>1.2</b> 秒吸附奇点。' },
        { damage: 24, interval: 4.35, radius: 90, life: 1.35, pull: 52, text: '奇点范围与引力提升。' },
        { damage: 31, interval: 4.1, radius: 98, life: 1.5, pull: 60, text: '引力场持续时间延长。' },
        { damage: 40, interval: 3.85, radius: 108, life: 1.7, pull: 68, text: '中心碾碎伤害提升。' },
        { damage: 51, interval: 3.6, radius: 118, life: 1.9, pull: 78, text: '奇点质量增加。' },
        { damage: 64, interval: 3.3, radius: 130, life: 2.15, pull: 88, text: '吸附力大幅增强。' },
        { damage: 80, interval: 3.0, radius: 142, life: 2.4, pull: 100, text: '接近事件视界。' },
        { damage: 102, interval: 2.65, radius: 160, life: 2.8, pull: 118, text: '<b>事件视界</b>：把整片敌群拖进湮灭。' }
      ]
    },
    mortar: {
      name: '电浆迫击炮', en: 'PLASMA MORTAR', short: '迫击', icon: 'orbital', color: '#b896ff', type: 'weapon',
      desc: '远程抛射电浆弹，落点爆炸并短暂瘫痪敌群。',
      levels: [
        { damage: 34, interval: 2.5, speed: 360, radius: 52, slow: 1.2, count: 1, text: '向最近目标抛射 <b>1</b> 枚电浆弹。' },
        { damage: 44, interval: 2.35, speed: 378, radius: 58, slow: 1.3, count: 1, text: '电浆伤害与爆炸范围提升。' },
        { damage: 55, interval: 2.2, speed: 396, radius: 64, slow: 1.4, count: 1, text: '落点形成短暂的电磁迟滞。' },
        { damage: 70, interval: 2.04, speed: 414, radius: 70, slow: 1.5, count: 2, text: '每轮抛射 <b>2</b> 枚电浆弹。' },
        { damage: 88, interval: 1.88, speed: 432, radius: 76, slow: 1.6, count: 2, text: '弹体装药强化，瘫痪时间延长。' },
        { damage: 110, interval: 1.72, speed: 450, radius: 82, slow: 1.7, count: 2, text: '双联电浆覆盖敌群。' },
        { damage: 138, interval: 1.56, speed: 470, radius: 90, slow: 1.8, count: 3, text: '每轮抛射 <b>3</b> 枚电浆弹。' },
        { damage: 175, interval: 1.38, speed: 500, radius: 100, slow: 2.0, count: 3, text: '<b>电浆过载</b>：三轮电浆把战场变成禁行区。' }
      ]
    },
    sentry: {
      name: '哨戒壁垒', en: 'AEGIS BASTION', short: '壁垒', icon: 'turret', color: '#8fffe6', type: 'weapon',
      desc: '部署带装甲的哨戒炮台，主动吸引周围敌军火力；被摧毁后仍会爆炸反伤。',
      levels: [
        { damage: 12, interval: 1.6, count: 1, range: 220, life: 8, fire: .72, text: '部署 <b>1</b> 座带装甲的哨戒炮台，吸引周围火力。' },
        { damage: 15, interval: 1.52, count: 1, range: 230, life: 8.5, fire: .68, text: '炮塔伤害、射程与耐久提升。' },
        { damage: 19, interval: 1.44, count: 1, range: 240, life: 9.2, fire: .64, text: '炮塔持续更久，嘲讽范围扩大。' },
        { damage: 24, interval: 1.34, count: 2, range: 250, life: 10, fire: .60, text: '同时部署 <b>2</b> 座炮塔。' },
        { damage: 30, interval: 1.24, count: 2, range: 260, life: 10.8, fire: .56, text: '炮塔装甲与火力提升。' },
        { damage: 37, interval: 1.14, count: 2, range: 270, life: 11.6, fire: .52, text: '自动装填机升级。' },
        { damage: 45, interval: 1.04, count: 3, range: 280, life: 12.4, fire: .48, text: '同时部署 <b>3</b> 座炮塔。' },
        { damage: 56, interval: .92, count: 3, range: 300, life: 14, fire: .42, text: '<b>堡垒网络</b>：三座重炮哨戒全场，并形成嘲讽防线。' }
      ]
    },
    emp: {
      name: '电磁脉冲矩阵', en: 'EMP MATRIX', short: 'EMP', icon: 'emp', color: '#6fd8ff', type: 'weapon',
      desc: '释放环形电磁脉冲，灼伤并瘫痪周围敌军，同时清除范围内的敌方弹幕。',
      levels: [
        { damage: 38, interval: 5.8, radius: 132, disrupt: 1.0, text: '每 <b>5.8</b> 秒释放 EMP，瘫痪 <b>1</b> 秒并清除弹幕。' },
        { damage: 48, interval: 5.6, radius: 142, disrupt: 1.1, text: '脉冲伤害与半径提升。' },
        { damage: 58, interval: 5.35, radius: 152, disrupt: 1.2, text: '电磁线圈过载，瘫痪时间延长。' },
        { damage: 72, interval: 5.1, radius: 162, disrupt: 1.35, text: '脉冲半径 <b>162</b>，反弹幕范围扩大。' },
        { damage: 88, interval: 4.85, radius: 174, disrupt: 1.5, text: '电容阵列升级，伤害 <b>+16</b>。' },
        { damage: 108, interval: 4.6, radius: 186, disrupt: 1.65, text: '瘫痪 <b>1.65</b> 秒，敌方火控短暂失效。' },
        { damage: 132, interval: 4.35, radius: 200, disrupt: 1.8, text: '脉冲半径 <b>200</b>，覆盖整片近场。' },
        { damage: 165, interval: 4.1, radius: 220, disrupt: 2.0, text: '<b>零域脉冲</b>：大范围瘫痪并抹除敌方弹幕。' }
      ]
    },
    rail: {
      name: '磁轨重炮', en: 'RAIL CANNON', short: '磁轨', icon: 'cannon', color: '#9dbbff', type: 'weapon',
      desc: '蓄力发射超高速磁轨弹，穿透并爆破整条直线。',
      levels: [
        { damage: 64, interval: 2.4, speed: 1750, pierce: 99, explode: 42, text: '发射穿透磁轨弹，命中引发爆炸。' },
        { damage: 79, interval: 2.28, speed: 1800, pierce: 99, explode: 46, text: '磁轨伤害 <b>+15</b>。' },
        { damage: 97, interval: 2.16, speed: 1850, pierce: 99, explode: 50, text: '电容升级，伤害提升。' },
        { damage: 119, interval: 2.02, speed: 1900, pierce: 99, explode: 56, text: '穿透爆破范围扩大。' },
        { damage: 146, interval: 1.86, speed: 1980, pierce: 99, explode: 62, text: '磁轨加速，装填缩短。' },
        { damage: 178, interval: 1.68, speed: 2060, pierce: 99, explode: 70, text: '弹芯密度提升。' },
        { damage: 218, interval: 1.48, speed: 2150, pierce: 99, explode: 78, text: '接近舰炮级输出。' },
        { damage: 270, interval: 1.22, speed: 2300, pierce: 99, explode: 92, text: '<b>歼星磁轨</b>：一发贯穿整条战线。' }
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
      desc: '提高暴击率与暴击伤害，直接命中与轨道打击均可暴击。', max: 5,
      stats: ['暴击率 +16%', '暴击伤害 +10%'], text: '暴击率 <b>+16%</b>，暴击伤害 <b>+10%</b>。'
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
    regen: {
      name: '纳米修复', en: 'NANO REPAIR', short: '修复', icon: 'nano', color: '#a9e56e',
      desc: '纳米胶体持续修补车体。', max: 5,
      stats: ['每秒修复 +1.1'], text: '每秒修复 <b>1.1</b> 点装甲。'
    },
    plating: {
      name: '反应装甲', en: 'REACTIVE PLATING', short: '减伤', icon: 'armor', color: '#c9d8d3',
      desc: '命中瞬间偏转部分伤害。', max: 5,
      stats: ['受到伤害 -4%'], text: '受到的全部伤害 <b>-4%</b>。'
    },
    pierce: {
      name: '穿甲校准', en: 'PIERCE CALIBRATION', short: '穿透', icon: 'warhead', color: '#ffcf5a',
      desc: '所有弹丸额外贯穿敌人。', max: 5,
      stats: ['弹丸穿透 +1'], text: '所有弹丸 <b>穿透 +1</b>。'
    },
    dash: {
      name: '矢量推进', en: 'VECTOR THRUST', short: '冲刺', icon: 'engine', color: '#9bd8ff',
      desc: '压缩推进器再装填时间，并延长冲刺无敌帧。', max: 5,
      stats: ['冲刺冷却 -5%', '冲刺无敌 +0.04s'], text: '冲刺冷却 <b>-5%</b>，冲刺无敌 <b>+0.04</b> 秒。'
    },
    fortune: {
      name: '回收协议', en: 'SALVAGE PROTOCOL', short: '掉落', icon: 'salvage', color: '#f5d76e',
      desc: '从残骸中拆出更多特殊道具。', max: 5,
      stats: ['特殊掉落 +2%'], text: '特殊道具掉率 <b>+2%</b>。'
    },
    execute: {
      name: '处决协议', en: 'EXECUTION PROTOCOL', short: '处决', icon: 'crit', color: '#ff4f58',
      desc: '对濒危目标造成额外伤害。', max: 5,
      stats: ['对残血伤害 +8%'], text: '对生命低于 <b>35%</b> 的敌人伤害 <b>+8%</b>。'
    },
    venom: {
      name: '纳米爆裂弹头', en: 'NANO BURST', short: '纳爆', icon: 'nano', color: '#a9e56e',
      desc: '命中时引发纳米腐蚀爆裂，对周围敌人造成范围伤害。', max: 5,
      stats: ['范围腐蚀伤害'], text: '命中触发 <b>纳米爆裂</b>，半径和范围伤害随等级提升。'
    },
    frostbite: {
      name: '霜爆弹头', en: 'CRYO BURST', short: '霜爆', icon: 'cooling', color: '#9bd8ff',
      desc: '命中时引发低温爆裂，对周围敌人造成范围伤害并减速。', max: 5,
      stats: ['范围冻伤'], text: '命中触发 <b>霜爆</b>，半径、伤害与减速随等级提升。'
    },
    persist: {
      name: '持续增幅', en: 'PERSISTENCE', short: '持续', icon: 'cooling', color: '#b896ff',
      desc: '延长火焰与区域效果持续时间。', max: 5,
      stats: ['区域持续 +10%'], text: '火焰与区域效果持续时间 <b>+10%</b>。'
    },
    guardian: {
      name: '基地守护', en: 'BASE GUARDIAN', short: '守家', icon: 'shield', color: '#5ff0ce',
      desc: '强化基地装甲与自动维修。', max: 5,
      stats: ['基地减伤 +5%'], text: '基地受到伤害 <b>-5%</b>，维修速度提升。'
    },
    amphibious: {
      name: '两栖履带', en: 'AMPHIBIOUS TRACKS', short: '渡水', icon: 'engine', color: '#5ff0ce',
      desc: '高压浮筒让车体直接碾过水面。', max: 2, minLevel: 8,
      stats: ['解锁水面通行'], text: '解锁 <b>水面通行</b>；升级提升水中移动速度。'
    },
    phase: {
      name: '相位弹芯', en: 'PHASE CORE', short: '穿钢', icon: 'warhead', color: '#b896ff',
      desc: '炮弹穿过钢板但不破坏钢板，可隔墙射击。', max: 2, minLevel: 12,
      stats: ['炮弹穿过钢板'], text: '炮弹可穿过 <b>钢板</b>且不损伤钢板；升级追加弹丸穿透。'
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
    { id:'hive', name:'蜂巢 M-08', en:'HIVE', role:'无人机', desc:'你只需要移动，环绕蜂群负责扣扳机。', trait:'开场携带环绕蜂群；环绕机 +1', colors:{body:'#b38a3e',light:'#ffe6a0',dark:'#493414',core:'#ffd15c'}, droneAdd:1, affinity:['drone','loader','cannon'], start:{weapons:{cannon:1,drone:1}} },
    { id:'sapper', name:'工兵 M-09', en:'SAPPER', role:'雷区', desc:'把追兵变成一片会发光的禁区。', trait:'开场携带地雷；每次布雷 +1', colors:{body:'#a87932',light:'#ffd889',dark:'#452e11',core:'#ffcf5a'}, mineAdd:1, areaMul:1.1, affinity:['mine','warhead','armor'], start:{weapons:{cannon:1,mine:1}} },
    { id:'oracle', name:'天罚 M-10', en:'ORACLE', role:'轨道', desc:'从看不见的高处，替战场做减法。', trait:'开场携带轨道；光矛 +1；冷却 -10%', colors:{body:'#8b6ac4',light:'#e0c8ff',dark:'#36254f',core:'#b896ff'}, orbitalAdd:1, cdrMul:.9, affinity:['orbital','cooling','crit'], start:{weapons:{cannon:1,orbital:1}} },
    { id:'cryo', name:'霜牙 M-11', en:'CRYO', role:'减速', desc:'先冻住，再拆掉。', trait:'炮弹命中减速 30%，持续 1.2 秒', colors:{body:'#4f9eb5',light:'#c7f5ff',dark:'#183c49',core:'#9bd8ff'}, slowOnHit:true, affinity:['cannon','cooling','armor'], start:{weapons:{cannon:1}} },
    { id:'magnet', name:'磁力 M-12', en:'MAGNET', role:'拾取', desc:'余烬会自己来找你。', trait:'拾取范围 +70%；经验 +12%', colors:{body:'#4c9e91',light:'#c8fff2',dark:'#173d38',core:'#5ff0ce'}, pickupMul:1.7, xpMul:1.12, affinity:['magnet','salvage','cannon'], start:{weapons:{cannon:1},passives:{magnet:1}} },
    { id:'scavenger', name:'拾荒 M-13', en:'SCAVENGER', role:'经验', desc:'每一块废铁，都是下一层协议。', trait:'经验 +20%；特殊掉落 +4%', colors:{body:'#9b8b4d',light:'#f1e5a0',dark:'#3a3216',core:'#f5d76e'}, xpMul:1.2, dropAdd:.04, affinity:['salvage','magnet','cannon'], start:{weapons:{cannon:1},passives:{salvage:1}} },
    { id:'vampire', name:'吸血鬼 M-14', en:'VAMPIRE', role:'吸能', desc:'敌人的最后一口气，归你。', trait:'击毁敌人修复 1.2 装甲', colors:{body:'#7d3b55',light:'#ff9dc0',dark:'#2c101c',core:'#ff4f7a'}, lifesteal:1.2, affinity:['cannon','overdrive','crit'], start:{weapons:{cannon:1}} },
    { id:'glass', name:'玻璃炮 M-15', en:'GLASS CANNON', role:'爆发', desc:'一发入魂，或者一发入土。', trait:'全伤害 +40%；最大装甲 -35%；速度 +8%', colors:{body:'#c96b2d',light:'#ffe0a0',dark:'#4a220e',core:'#ffb52d'}, damageMul:1.4, hpMul:.65, speedMul:1.08, affinity:['cannon','crit','overdrive'], start:{weapons:{cannon:1}} },
    { id:'medic', name:'医疗 M-16', en:'MEDIC', role:'护盾', desc:'活着，才有下一轮输出。', trait:'护盾每秒充能 1.2；附近友军缓慢修复', colors:{body:'#4f9b75',light:'#c8ffe1',dark:'#183b2b',core:'#5ff0ce'}, shieldRegen:1.2, auraHeal:.25, affinity:['shield','armor','cannon'], start:{weapons:{cannon:1},passives:{shield:1}} },
    { id:'juggernaut', name:'巨兽 M-17', en:'JUGGERNAUT', role:'坦度', desc:'不需要躲子弹，子弹需要躲你。', trait:'最大装甲 +35%；受伤 -10%；速度 -15%', colors:{body:'#71634a',light:'#d8c294',dark:'#342b1b',core:'#ffbc55'}, hpMul:1.35, damageTakenMul:.9, speedMul:.85, affinity:['armor','shield','cannon'], start:{weapons:{cannon:1},passives:{armor:1}} },
    { id:'phantom', name:'幽灵 M-18', en:'PHANTOM', role:'冲刺', desc:'出现，开火，消失。', trait:'冲刺冷却 -45%；速度 +6%', colors:{body:'#4e7b8b',light:'#b7efff',dark:'#172f38',core:'#5ff0ce'}, dashCdMul:.55, speedMul:1.06, affinity:['engine','cannon','crit'], start:{weapons:{cannon:1},passives:{engine:1}} },
    { id:'demo', name:'爆破 M-19', en:'DEMOLITION', role:'爆炸', desc:'把每一发炮弹都变成一个小型事件。', trait:'爆炸范围 +25%；爆炸伤害 +10%', colors:{body:'#b45a32',light:'#ffc07a',dark:'#44200f',core:'#ff7a2a'}, areaMul:1.25, explodeAdd:20, affinity:['warhead','mine','cannon'], start:{weapons:{cannon:1},passives:{warhead:1}} },
    { id:'toxin', name:'天基 M-20', en:'ROD FROM GOD', role:'轨道打击', desc:'从近地轨道投下钨棒，把敌群按回地面。', trait:'开场携带天基动能棒；动能打击 +1；爆炸范围 +10%', colors:{body:'#52638f',light:'#dbe8ff',dark:'#1b2544',core:'#9dbbff'}, rodAdd:1, areaMul:1.1, affinity:['orbital','warhead','cannon'], start:{weapons:{cannon:1,toxin:1}} }
  ];

  const FUSIONS = {
    cannon: { id:'cannon', weapon:'cannon', passive:'overdrive', weaponLevel:6, passiveLevel:2, name:'湮灭轨道炮', en:'ANNIHILATOR RAIL', color:'#ffb52d', icon:'cannon', desc:'主炮+1齐射，穿透+2，命中引发 <b>轨道爆裂</b>。' },
    drone: { id:'drone', weapon:'drone', passive:'loader', weaponLevel:6, passiveLevel:2, name:'母舰蜂群', en:'MOTHERSHIP SWARM', color:'#5ff0ce', icon:'drone', desc:'环绕机 +1，脉冲伤害提高，蜂群形成贴身弹幕屏障。' },
    arc: { id:'arc', weapon:'arc', passive:'cooling', weaponLevel:6, passiveLevel:2, name:'超导风暴', en:'SUPERCONDUCTING STORM', color:'#79b9ff', icon:'arc', desc:'电弧连锁 +2，冷却缩短，超导线圈把闪电导向更多目标。' },
    flame: { id:'flame', weapon:'flame', passive:'warhead', weaponLevel:6, passiveLevel:2, name:'热熔过载', en:'THERMAL OVERLOAD', color:'#ff7a2a', icon:'flame', desc:'火焰范围 +30%，伤害 +30%，留下持续燃烧的热熔带。' },
    mine: { id:'mine', weapon:'mine', passive:'armor', weaponLevel:6, passiveLevel:2, name:'奇点雷区', en:'SINGULARITY FIELD', color:'#ffcf5a', icon:'mine', desc:'每次布雷 +1，爆炸半径与伤害大幅提高。' },
    orbital: { id:'orbital', weapon:'orbital', passive:'crit', weaponLevel:6, passiveLevel:2, name:'天基熔断', en:'ORBITAL OVERRIDE', color:'#b896ff', icon:'orbital', desc:'光矛 +1，暴击由轨道放大，熔断覆盖整片战区。' },
    scatter: { id:'scatter', weapon:'scatter', passive:'warhead', weaponLevel:6, passiveLevel:2, name:'超新星霰弹', en:'SUPERNOVA BUCKSHOT', color:'#ff9a4a', icon:'cannon', desc:'弹丸 +3，扇面爆炸，命中引发 <b>超新星爆裂</b>。' },
    laser: { id:'laser', weapon:'laser', passive:'crit', weaponLevel:6, passiveLevel:2, name:'湮灭棱镜', en:'ANNIHILATION PRISM', color:'#ff6b8a', icon:'arc', desc:'光束宽度与暴击提升，贯穿线上的一切目标。' },
    missile: { id:'missile', weapon:'missile', passive:'loader', weaponLevel:6, passiveLevel:2, name:'蜂群饱和', en:'SWARM SATURATION', color:'#ffd05a', icon:'mine', desc:'导弹 +2，追踪转向更快，爆炸范围扩大。' },
    frost: { id:'frost', weapon:'frost', passive:'cooling', weaponLevel:6, passiveLevel:2, name:'绝对零度', en:'ABSOLUTE ZERO', color:'#9bd8ff', icon:'cooling', desc:'霜环范围 +30%，减速延长，脉冲伤害提升。' },
    toxin: { id:'toxin', weapon:'toxin', passive:'warhead', weaponLevel:6, passiveLevel:2, name:'天基齐射', en:'ORBITAL BARRAGE', color:'#9dbbff', icon:'orbital', desc:'动能棒 +1，冲击半径 +25%，落点引发二次震波。' },
    gravity: { id:'gravity', weapon:'gravity', passive:'magnet', weaponLevel:6, passiveLevel:2, name:'事件视界', en:'EVENT HORIZON', color:'#b896ff', icon:'orbital', desc:'奇点半径 +30%，吸附力翻倍，碾碎伤害提升。' },
    mortar: { id:'mortar', weapon:'mortar', passive:'warhead', weaponLevel:6, passiveLevel:2, name:'电浆过载', en:'PLASMA OVERLOAD', color:'#b896ff', icon:'orbital', desc:'电浆弹 +1，落点爆炸半径与电磁迟滞时间提升。' },
    sentry: { id:'sentry', weapon:'sentry', passive:'armor', weaponLevel:6, passiveLevel:2, name:'堡垒网络', en:'FORTRESS NET', color:'#8fffe6', icon:'turret', desc:'哨戒 +1，耐久与嘲讽范围提升，形成会吸火的交叉防线。' },
    emp: { id:'emp', weapon:'emp', passive:'cooling', weaponLevel:6, passiveLevel:2, name:'零域脉冲', en:'NULL FIELD', color:'#6fd8ff', icon:'emp', desc:'脉冲半径 +30%，瘫痪时间延长，零域覆盖整片近场。' },
    rail: { id:'rail', weapon:'rail', passive:'overdrive', weaponLevel:6, passiveLevel:2, name:'歼星磁轨', en:'STARBREAKER', color:'#9dbbff', icon:'cannon', desc:'磁轨伤害 +35%，爆炸范围扩大，贯穿整条战线。' }
  };

  // Role tags make each upgrade card's battlefield job explicit.
  Object.assign(WEAPONS.cannon, { role:'单体爆发', focus:'首领 / 直线穿透' });
  Object.assign(WEAPONS.drone, { role:'环绕护卫', focus:'贴身索敌 / 弹幕拦截' });
  Object.assign(WEAPONS.arc, { role:'连锁清场', focus:'密集敌群 / 跳跃' });
  Object.assign(WEAPONS.flame, { role:'区域封锁', focus:'走位 / 持续灼烧' });
  Object.assign(WEAPONS.mine, { role:'陷阱控场', focus:'埋伏 / 爆发' });
  Object.assign(WEAPONS.orbital, { role:'重型炮击', focus:'敌群 / 高伤害' });
  Object.assign(WEAPONS.scatter, { role:'近距爆发', focus:'贴脸 / 扇形清群' });
  Object.assign(WEAPONS.laser, { role:'直线穿透', focus:'单列 / 高频射线' });
  Object.assign(WEAPONS.missile, { role:'追踪爆发', focus:'自动锁定 / 爆炸' });
  Object.assign(WEAPONS.frost, { role:'范围控场', focus:'减速 / 近身防御' });
  Object.assign(WEAPONS.toxin, { role:'重型打击', focus:'天基 / 单体爆发' });
  Object.assign(WEAPONS.gravity, { role:'聚怪控场', focus:'吸附 / 集中歼灭' });
  Object.assign(WEAPONS.mortar, { role:'远程炮击', focus:'抛射 / 范围瘫痪' });
  Object.assign(WEAPONS.sentry, { role:'嘲讽阵地', focus:'吸引火力 / 基地守区' });
  Object.assign(WEAPONS.emp, { role:'反弹幕 / 近场控制', focus:'电磁脉冲 / 瘫痪与清弹' });
  Object.assign(WEAPONS.rail, { role:'重型穿透', focus:'直线爆破 / 重甲' });
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
  Object.assign(PASSIVES.regen, { role:'续航' });
  Object.assign(PASSIVES.plating, { role:'减伤' });
  Object.assign(PASSIVES.pierce, { role:'穿透' });
  Object.assign(PASSIVES.dash, { role:'机动' });
  Object.assign(PASSIVES.fortune, { role:'资源' });
  Object.assign(PASSIVES.execute, { role:'收割' });
  Object.assign(PASSIVES.venom, { role:'范围腐蚀' });
  Object.assign(PASSIVES.frostbite, { role:'范围冻伤' });
  Object.assign(PASSIVES.persist, { role:'区域延长' });
  Object.assign(PASSIVES.guardian, { role:'基地防御' });
  Object.assign(PASSIVES.amphibious, { role:'地形通行' });
  Object.assign(PASSIVES.phase, { role:'穿墙火力' });

  // Progression: each sealed chassis has a seal core placed in its stage.
  // Break the core, defeat the summoned seal guard, and the chassis is permanently unlocked.
  const SEAL_TANKS_BY_STAGE = [
    ['twin', 'magnet'],
    ['bastion', 'gale'],
    ['railgun', 'pyro'],
    ['storm', 'sapper'],
    ['hive', 'cryo'],
    ['oracle'],
    ['vampire', 'glass'],
    ['juggernaut', 'phantom'],
    ['medic'],
    ['demo'],
    ['toxin'],
    ['scavenger']
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
  window.BF_CONTENT = { MAPS, ENEMIES, WAVES, ITEMS, WEAPONS, PASSIVES, TANKS, FUSIONS, SEAL_TANKS_BY_STAGE, DIFFICULTIES, PLAYER_BASE };
})();
