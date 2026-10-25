/* STEEL EMBERS // main game. Canvas pixel renderer + roguelite systems. */
(function () {
  'use strict';

  const C = window.BF_CONTENT;
  const ICONS = window.BF_ICONS;
  const AUDIO = window.BF_AUDIO;
  const { MAPS, ENEMIES, WAVES, ITEMS, WEAPONS, PASSIVES, TANKS, FUSIONS, SEAL_TANKS_BY_STAGE, DIFFICULTIES, PLAYER_BASE } = C;

  const TILE = 32;
  const COLS = 30;
  const ROWS = 18;
  const W = COLS * TILE;
  const H = ROWS * TILE;
  const TOTAL_TIME = 600;
  const BOSS_AT = 600;
  const TUTORIAL_BOSS_AT = 300;
  const PHASE_LEN = 120;
  const ELITE_FIRST_AT = 150;
  const ELITE_GAP = 150;
  const ENDLESS_WAVE_SPAN = 75;
  const ENDLESS_FIRST_BOSS = 120;
  const ENDLESS_BOSS_GAP = 90;
  const ENDLESS_MAX_ENEMIES = 78;
  const CORE_W = 64;
  const CORE_H = 64;
  const BASE_MAX_HP = 520;
  const BASE_RADIUS = 24;
  const BASE_RANGE = 315;
  // Enemy target selection leans toward pilots, not the static base. A base
  // must be meaningfully closer than a pilot before it steals the lock.
  const ENEMY_TARGET_LOCK = 3.2;
  const ENEMY_BASE_DIST_MULT = 1.75;
  const PLAYER_AUTO_RANGE = 560;
  const REFRACT_RADIUS = 170;
  const SHAKE_SCALE = .5;
  const RECALL_CD = 30;
  const MAX_PARTICLES = 620;
  const MAX_EFFECTS = 160;
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
  const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
  const randInt = (a, b) => Math.floor(rand(b + 1, a));
  const chance = p => Math.random() < p;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const fmtTime = sec => {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };
  const fmtShort = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function weightedPick(items) {
    let total = 0;
    for (const it of items) total += it.weight || 1;
    let r = Math.random() * total;
    for (const it of items) { r -= it.weight || 1; if (r <= 0) return it; }
    return items[items.length - 1];
  }

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  const FALLBACK_SPAWN_POINTS = [
    { cx: 2, cy: 0, side: 'top' }, { cx: 14, cy: 0, side: 'top' }, { cx: 27, cy: 0, side: 'top' },
    { cx: 2, cy: 9, side: 'left' }, { cx: 27, cy: 9, side: 'right' }
  ];

  // Expansion pilot: each map gets a signature detachment on top of its wave table.
  const MAP_SIGNATURES = {
    furnace: [{ type: 'mortar', at: 0 }, { type: 'drone', at: 35 }, { type: 'bulwark', at: 70 }, { type: 'minelayer', at: 100 }],
    marsh: [{ type: 'minelayer', at: 15 }, { type: 'splitter', at: 50 }, { type: 'saucer', at: 85 }, { type: 'strafer', at: 120 }],
    frost: [{ type: 'mortar', at: 0 }, { type: 'strafer', at: 45 }, { type: 'bulwark', at: 80 }],
    redtide: [{ type: 'minelayer', at: 10 }, { type: 'drone', at: 40 }, { type: 'saucer', at: 80 }],
    foundry: [{ type: 'mortar', at: 0 }, { type: 'gunship', at: 50 }, { type: 'splitter', at: 80 }],
    graveyard: [{ type: 'drone', at: 0 }, { type: 'skybomber', at: 45 }, { type: 'strafer', at: 80 }],
    reactor: [{ type: 'saucer', at: 0 }, { type: 'warper', at: 45 }, { type: 'warden', at: 80 }, { type: 'beamfrigate', at: 120 }],
    dome: [{ type: 'gunship', at: 0 }, { type: 'skybomber', at: 45 }, { type: 'warper', at: 90 }],
    citadel: [{ type: 'strafer', at: 0 }, { type: 'gunship', at: 45 }, { type: 'warden', at: 80 }],
    abyss: [{ type: 'saucer', at: 0 }, { type: 'warper', at: 50 }, { type: 'beamfrigate', at: 80 }],
    solar: [{ type: 'saucer', at: 0 }, { type: 'beamfrigate', at: 45 }, { type: 'skybomber', at: 80 }],
    throne: [{ type: 'warper', at: 0 }, { type: 'warden', at: 45 }, { type: 'skybomber', at: 80 }]
  };

  // Expansion pilot: one readable environmental rhythm for the three test maps.
  const MAP_HAZARDS = {
    furnace: { color: '#ffb52d', period: 9.5, warning: 1.15, radius: 44, damage: 12, points: [[14, 10], [7, 12], [23, 12]] },
    marsh: { color: '#5ff0ce', period: 11, warning: 1.0, radius: 40, damage: 10, points: [[14, 5], [8, 13], [21, 13]] },
    reactor: { color: '#c1ff68', period: 10, warning: 1.2, radius: 46, damage: 14, points: [[14, 7], [8, 13], [22, 13]] }
  };

  const BOSS_BY_MAP = {
    furnace: 'boss',
    marsh: 'bossHive',
    frost: 'bossCryo',
    redtide: 'bossDread',
    foundry: 'bossBurrower',
    graveyard: 'bossSkycarrier',
    reactor: 'bossXenarch',
    dome: 'bossSentinel',
    citadel: 'bossSkyfortress',
    abyss: 'bossLeviathan',
    solar: 'bossSeraph',
    throne: 'bossWarlord'
  };

  // Static stage pressure. Difficulty comes from the enemy roster and the
  // stage itself, never from a hidden per-minute HP/damage multiplier.
  const STAGE_PRESSURE = [
    { hp: .72, dmg: .62, spawn: 1.06 }, // tutorial
    { hp: .82, dmg: .72, spawn: 1.00 },
    { hp: .90, dmg: .80, spawn: .98 },
    { hp: .98, dmg: .88, spawn: .96 },
    { hp: 1.06, dmg: .96, spawn: .94 },
    { hp: 1.14, dmg: 1.04, spawn: .92 },
    { hp: 1.22, dmg: 1.10, spawn: .90 },
    { hp: 1.30, dmg: 1.16, spawn: .88 },
    { hp: 1.38, dmg: 1.22, spawn: .86 },
    { hp: 1.46, dmg: 1.28, spawn: .84 },
    { hp: 1.55, dmg: 1.34, spawn: .82 },
    { hp: 1.65, dmg: 1.40, spawn: .80 }
  ];

  const TUTORIAL_PHASES = [
    { spawn: 1.55, cap: 8 },
    { spawn: 1.35, cap: 11 },
    { spawn: 1.15, cap: 14 }
  ];
  const NORMAL_PHASES = [
    { spawn: 1.35, cap: 9 },
    { spawn: 1.20, cap: 13 },
    { spawn: 1.05, cap: 17 },
    { spawn: .90, cap: 21 },
    { spawn: .80, cap: 25 }
  ];

  // Each run introduces exactly one new regular enemy every two minutes.
  // The previous type is retired when the next one arrives: at most one
  // regular wave species is active at a time (elites/seal guards excepted).
  function stageRoster() {
    if (G.arenaIndex === 0 && !G.endless) return ['scout', 'grunt', 'heavy'];
    const base = ['scout', 'grunt', 'heavy'];
    const signatures = (MAP_SIGNATURES[G.arena.id] || [])
      .map(entry => entry.type)
      .filter(type => type !== 'warden');
    return Array.from(new Set(base.concat(signatures))).slice(0, 5);
  }

  function phaseIndex() {
    const roster = stageRoster();
    return Math.min(roster.length - 1, Math.floor(G.elapsed / PHASE_LEN));
  }

  function phaseData() {
    return (G.arenaIndex === 0 && !G.endless ? TUTORIAL_PHASES : NORMAL_PHASES)[phaseIndex()] || NORMAL_PHASES[0];
  }

  function phaseLabel() {
    const roster = stageRoster();
    const type = roster[phaseIndex()] || 'scout';
    const cfg = ENEMIES[type] || {};
    return cfg.name || type;
  }

  function pickWaveType() {
    const roster = stageRoster();
    const idx = phaseIndex();
    return roster[idx] || roster[roster.length - 1];
  }

  // Attack identity per enemy family. Shape + cadence matter more than color:
  // a rail slug, a heavy siege shell, a homing orb and a standard shell should
  // be readable at a glance and demand a different dodge.
  const ENEMY_ATTACK_STYLE = {
    scout:     { shape: 'shell', color: '#ff7a58', shots: 1, radius: 3.0, trail: 14 },
    grunt:     { shape: 'shell', color: '#ff6860', shots: 2, spread: .055, damageMul: .72, radius: 3.1, trail: 16 },
    heavy:     { shape: 'heavy', color: '#ffb35c', shots: 1, speedMul: .78, radius: 5.4, trail: 28, splash: 34, splashMul: .5 },
    sniper:    { shape: 'rail',  color: '#9dbbff', shots: 1, speedMul: 1.15, radius: 2.0, trail: 58 },
    elite:     { shape: 'orb',   color: '#ffd15c', shots: 3, spread: .14, radius: 4.0, trail: 22 },
    bulwark:   { shape: 'heavy', color: '#ffcf73', shots: 1, speedMul: .82, radius: 5.0, trail: 24, splash: 28, splashMul: .45 },
    splitter:  { shape: 'blob',  color: '#ff9d5a', shots: 1, radius: 4.0, trail: 20 },
    drone:     { shape: 'orb',   color: '#7fe8ff', shots: 1, radius: 3.0, trail: 20 },
    gunship:   { shape: 'heavy', color: '#ffc36b', shots: 2, spread: .12, damageMul: .72, radius: 4.4, trail: 24, splash: 26, splashMul: .4 },
    saucer:    { shape: 'orb',   color: '#7fe8ff', shots: 1, homing: true, turn: .72, homingDelay: .12, radius: 3.1, trail: 24 },
    warper:    { shape: 'orb',   color: '#b9a8ff', shots: 1, radius: 3.4, trail: 26 }
  };

  let settingsFocusIndex = 0;

  const G = {
    mode: 'menu',
    arenaIndex: 0,
    arena: MAPS[0],
    tankId: TANKS[0].id,
    tank: TANKS[0],
    tankIds: [TANKS[0].id, TANKS[0].id],
    tankPickerSlot: 0,
    difficulty: 'normal',
    difficultyMod: { enemyHp: 1, enemyDamage: 1, enemySpeed: 1, spawnMul: 1, bossHp: 1, xpMul: 1, coreMul: 1 },
    runMod: {},
    tankViewId: TANKS[0].id,
    profile: { cores: 0, totalKills: 0, wins: 0, revives: 0, unlocked: [TANKS[0].id] },
    campaign: { unlocked: 1, cleared: [] },
    nextStageIndex: -1,
    endless: false,
    endlessSelected: false,
    endlessNextBossAt: 0,
    endlessBossKills: 0,
    endlessEliteAt: 0,
    tiles: [],
    core: null,
    player: null,
    players: [],
    twoPlayer: false,
    coopSelected: false,
    lastCoop: false,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    codexPreviewAll: false,
    pickups: [],
    hazards: [],
    seals: [],
    mines: [],
    strikes: [],
    sentries: [],
    vortices: [],
    effects: [],
    particles: [],
    damageNumbers: [],
    pendingSpawns: [],
    weather: [],
    time: 0,
    elapsed: 0,
    waveIndex: -1,
    level: 1,
    xp: 0,
    xpNext: 9,
    pendingLevels: 0,
    kills: 0,
    pickupsCollected: 0,
    combo: 0,
    comboTimer: 0,
    revives: 0,
    spawnTimer: 0,
    sideSpawnTimer: 0,
    sideWarned: false,
    mapHazardTimer: 0,
    mapHazardIndex: 0,
    spawnPoints: [],
    eliteFlags: {},
    boss: null,
    bossSpawned: false,
    bossDefeated: false,
    victoryTimer: 0,
    bossAt: 600,
    runDuration: 600,
    nextEliteAt: 150,
    eliteTutorialSeen: false,
    sealTutorialSeen: false,
    itemTutorialSeen: false,
    itemTutorialQueued: false,
    freezeTimer: 0,
    weapons: { cannon: 1 },
    passives: {},
    fusions: {},
    weaponCds: {},
    droneState: [],
    flameTimer: 0,
    mineTimer: 0,
    arcTimer: 0,
    orbitalTimer: 0,
    coreTurretCd: 0,
    recallCd: 0,
    recallMax: RECALL_CD,
    rerolls: 2,
    currentChoices: [],
    loadoutDirty: true,
    hudTimer: 0,
    shake: 0,
    shakeTime: 0,
    flash: 0,
    flashColor: '#fff',
    lastFrame: 0,
    accum: 0,
    animTime: 0,
    runSeed: 0,
    totalDamage: 0,
    flowPlayer: null,
    flowPlayers: [],
    flowBase: null,
    flowTimer: 0,
    lastPlayerCell: { x: 0, y: 0 },
    deadReason: '',
    tutorialStep: 0,
    tutorialTimer: 0,
    tutorialMusicPending: false,
    autoPause: false,
    entityId: 1,
    lastEnemySound: 0,
    resolvingUpgrade: false,
    levelupPlayer: null,
    stats: { damage: 1, attackSpeed: 1, cdr: 1, area: 1, crit: .05, critMult: 1.8, pickup: 58, xpGain: 1, dropChance: .032, refractAdd: 0, waterWalk: 0, waterSpeed: 1, steelPierce: 0 }
  };

  const Input = {
    keys: new Set(),
    mobile: { active: false, x: 0, y: 0 },
    gamepad: { connected: false, id: '', index: -1, x: 0, y: 0, selectedCard: -1, levelupNeedsNeutral: false, levelupOwner: 'P1', prevButtons: [], focusEl: null, uiKey: '', uiDirX: 0, uiDirY: 0, uiRepeatAt: 0 },
    gamepad2: { connected: false, id: '', index: -1, x: 0, y: 0, selectedCard: -1, levelupNeedsNeutral: false, levelupOwner: 'P2', prevButtons: [], dpadDirX: 0, dpadDirY: 0, dpadRepeatAt: 0, uiDirX: 0, uiDirY: 0, uiRepeatAt: 0 },
    padSlots: { p1: { ref: null, index: -1, id: '' }, p2: { ref: null, index: -1, id: '' } },
    dashQueued: false,
    dashQueued2: false
  };

  const U = {};
  let gameCtx = null, menuCtx = null;
  let groundCache = null, menuCache = null;
  let menuParticles = [];
  let menuSelectedPulse = 0;
  let lastHudSignature = '';

  /* ---------------- first-stage AI art layer ---------------- */
  // These are deliberately small, pre-cut PNGs. The game still owns movement,
  // collision and animation; art only replaces the visual hull/fx layer.
  const ART_FILES = {
    boss: 'boss.png', floor: 'floor.png',
    playerHull: 'player/hull.png', playerTurret: 'player/turret.png',
    enemyScout: 'enemies/scout.png', enemyGrunt: 'enemies/grunt.png', enemyHeavy: 'enemies/heavy.png',
    enemyBomber: 'enemies/bomber.png', enemySniper: 'enemies/sniper.png', enemyElite: 'enemies/elite.png',
    enemyMortar: 'enemies/mortar.png', enemyBulwark: 'enemies/bulwark.png', enemyMinelayer: 'enemies/minelayer.png',
    enemySplitter: 'enemies/splitter.png', enemyScrap: 'enemies/scrap.png',
    enemyDrone: 'enemies/drone.png', enemyStrafer: 'enemies/strafer.png', enemySkybomber: 'enemies/skybomber.png', enemyGunship: 'enemies/gunship.png',
    enemySaucer: 'enemies/saucer.png', enemyBeamfrigate: 'enemies/beamfrigate.png', enemyWarper: 'enemies/warper.png', enemyWarden: 'enemies/warden.png',
    enemyScoutHull: 'enemies/scout-hull.png', enemyGruntHull: 'enemies/grunt-hull.png', enemyHeavyHull: 'enemies/heavy-hull.png',
    enemySniperHull: 'enemies/sniper-hull.png', enemyEliteHull: 'enemies/elite-hull.png', enemyMortarHull: 'enemies/mortar-hull.png',
    vfxMuzzle: 'vfx/muzzle.png', vfxImpact: 'vfx/impact.png', vfxExplosion: 'vfx/explosion.png', vfxSmoke: 'vfx/smoke.png',
    vfxShock: 'vfx/shock.png', vfxIce: 'vfx/ice.png', vfxAcid: 'vfx/acid.png', vfxVoid: 'vfx/void.png', vfxSolar: 'vfx/solar.png'
  };
  const ART = { images: {}, stage: null, loading: false };
  const ART_FLOOR_SAFE = [0, 4, 5, 6, 8, 10, 11, 13, 14];

  // Playable tank art lives outside the stage folders: a chassis keeps its
  // identity across all 12 sectors. Hull and turret are separate 48px PNGs so
  // the turret can rotate independently of the hull.
  const TANK_ART = { images: {}, loading: false };
  let tankArtRedrawTimer = 0;

  function tankArtImage(id, part) {
    const img = TANK_ART.images[`${id}:${part}`];
    return img && img.complete && img.naturalWidth ? img : null;
  }

  function scheduleTankArtRedraw() {
    clearTimeout(tankArtRedrawTimer);
    tankArtRedrawTimer = setTimeout(() => {
      updatePilotCard(0);
      updatePilotCard(1);
      if (U.tankScreen && !U.tankScreen.classList.contains('hidden')) renderTankGrid();
      if (U.codexScreen && !U.codexScreen.classList.contains('hidden')) renderCodex();
    }, 40);
  }

  function loadTankArt() {
    if (TANK_ART.loading) return;
    TANK_ART.loading = true;
    for (const tank of TANKS) {
      for (const part of ['hull', 'turret']) {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          TANK_ART.images[`${tank.id}:${part}`] = img;
          scheduleTankArtRedraw();
        };
        img.onerror = () => { console.warn('[tank-art] missing', tank.id, part); };
        img.src = `assets/game/tanks/${tank.id}/${part}.png?v=20261024-3`;
      }
    }
  }

  function artImage(key) {
    const img = ART.images[key];
    return img && img.complete && img.naturalWidth ? img : null;
  }

  function loadStageArt(stageId) {
    if (!stageId || (ART.stage === stageId && ART.images.boss)) return;
    ART.stage = stageId;
    ART.images = {};
    ART.loading = true;
    const requestStage = stageId;
    for (const [key, file] of Object.entries(ART_FILES)) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (ART.stage !== requestStage) return;
        ART.images[key] = img;
        if (key === 'floor' && G.mode === 'playing' && G.arena && G.arena.id === requestStage) buildGroundCache();
        if (U.codexScreen && !U.codexScreen.classList.contains('hidden')) scheduleTankArtRedraw();
      };
      img.onerror = () => { console.warn('[art] missing', requestStage, file); };
      img.src = `assets/game/stages/${requestStage}/${file}?v=20261024-12`;
    }
  }

  function loadArtAssets() { loadStageArt((G.arena && G.arena.id) || 'furnace'); }

  function drawSpriteArt(ctx, img, x, y, size, angle, flash, snap) {
    if (!img) return false;
    const a = snap === false ? (angle || 0) : Math.round((angle || 0) / (Math.PI / 8)) * (Math.PI / 8);
    const s = Math.max(1, Math.round(size));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // integer translation keeps nearest-neighbour sprite pixels from smearing
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(a);
    if (flash) ctx.filter = 'brightness(1.9) saturate(.8)';
    ctx.drawImage(img, -s / 2, -s / 2, s, s);
    ctx.restore();
    return true;
  }

  function drawPlayerArt(p, colors, withShadow) {
    const tankId = (p && p.tankId) || (p && p.tank && p.tank.id) || 'vanguard';
    const hull = tankArtImage(tankId, 'hull') || artImage('playerHull');
    const turret = tankArtImage(tankId, 'turret') || artImage('playerTurret');
    if (!hull || !turret) return false;
    const ctx = gameCtx;
    const size = 48;
    if (withShadow !== false) drawTankShadow(ctx, p.x, p.y, .9);
    drawSpriteArt(ctx, hull, p.x, p.y, size, p.bodyAngle + Math.PI / 2, p.hitFlash > 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const recoil = Math.max(0, p.recoil || 0) * 2.4;
    ctx.translate(Math.round(p.x) - Math.cos(p.turretAngle) * recoil, Math.round(p.y) - Math.sin(p.turretAngle) * recoil);
    ctx.rotate(p.turretAngle + Math.PI / 2);
    if (p.hitFlash > 0) ctx.filter = 'brightness(1.9) saturate(.8)';
    ctx.drawImage(turret, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
  }

  function floorArtIndex(x, y) {
    const i = Math.abs((x * 37 + y * 71 + G.arenaIndex * 13) % ART_FLOOR_SAFE.length);
    return ART_FLOOR_SAFE[i];
  }

  /* ---------------- map ---------------- */
  function createPlayer(x, y, index) {
    const p2 = index === 1;
    const tank = TANKS.find(t => t.id === G.tankIds[index]) || TANKS[0];
    const pal = tank.colors;
    return {
      index,
      label: p2 ? 'P2' : 'P1',
      tank,
      tankId: tank.id,
      x, y,
      bodyAngle: -Math.PI / 2, turretAngle: -Math.PI / 2,
      hp: PLAYER_BASE.maxHp, maxHp: PLAYER_BASE.maxHp,
      shield: 0, shieldMax: 0, shieldRecharge: 0, noDamageTime: 0,
      radius: PLAYER_BASE.radius, speed: PLAYER_BASE.speed,
      fireCd: .15, invincible: 0, dashTimer: 0, dashCd: 0, dashMax: 2.3, dashInvuln: .34, waterWalkTimer: 0,
      moving: false, moveX: 0, moveY: 0, vx: 0, vy: 0, trackPhase: 0, recoil: 0,
      hitFlash: 0, lastX: x, lastY: y, alive: true, downed: false, reviveProgress: 0,
      level: 1, xp: 0, xpNext: xpNeeded(1), pendingLevels: 0, rerolls: 2,
      weapons: Object.assign({ cannon: 1 }, (tank.start && tank.start.weapons) || {}),
      passives: Object.assign({}, (tank.start && tank.start.passives) || {}),
      fusions: {},
      weaponCds: {}, droneState: [], mortarTimer: 1.4, flameTimer: 0, mineTimer: 0, arcTimer: 1.3, orbitalTimer: 2.2,
      scatterTimer: .2, laserTimer: .45, missileTimer: .8, frostTimer: .9, toxinTimer: .8, gravityTimer: 1.1, sentryTimer: 1.2, empTimer: 1.3, railTimer: .65,
      bodyColor: p2 ? pal.body : pal.body,
      bodyLight: p2 ? pal.light : pal.light,
      bodyDark: p2 ? pal.dark : pal.dark,
      coreColor: pal.core
    };
  }

  function findPlayerSpawn(base) {
    const candidates = [[68, 0], [-68, 0], [0, -68], [0, 68], [102, 0], [-102, 0], [0, -102], [0, 102], [68, -68], [-68, 68]];
    for (const [dx, dy] of candidates) {
      const x = clamp(base.x + dx, PLAYER_BASE.radius + 4, W - PLAYER_BASE.radius - 4);
      const y = clamp(base.y + dy, PLAYER_BASE.radius + 4, H - PLAYER_BASE.radius - 4);
      if (dist(x, y, base.x, base.y) > 36 && !collidesWorld(x, y, PLAYER_BASE.radius - 2, false)) return { x, y };
    }
    return { x: base.x + 56, y: base.y };
  }

  function loadArena(index) {
    const arena = MAPS[index];
    G.arena = arena;
    G.tiles = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
    G.coreCells = [];
    let playerSpawn = null;
    for (let y = 0; y < ROWS; y++) {
      const row = arena.map[y];
      for (let x = 0; x < COLS; x++) {
        const ch = row[x];
        if (ch === 'C') { G.coreCells.push({ x, y }); G.tiles[y][x] = { type: 'core', hp: Infinity, maxHp: Infinity, seed: 0 }; }
        if (ch === 'P') playerSpawn = { x: (x + .5) * TILE, y: (y + .5) * TILE };
        if (ch === 'B') G.tiles[y][x] = { type: 'brick', hp: 22, maxHp: 22, seed: (x * 73 + y * 37) % 1000 };
        else if (ch === 'S') G.tiles[y][x] = { type: 'steel', hp: Infinity, maxHp: Infinity, seed: (x * 31 + y * 91) % 1000 };
        else if (ch === 'W') G.tiles[y][x] = { type: 'water', hp: Infinity, maxHp: Infinity, seed: (x * 17 + y * 57) % 1000 };
        else if (ch === 'T') G.tiles[y][x] = { type: 'bush', hp: Infinity, maxHp: Infinity, seed: (x * 53 + y * 19) % 1000 };
        else if (ch === '.') G.tiles[y][x] = { type: 'ground', hp: 0, maxHp: 0, seed: (x * 43 + y * 23) % 1000 };
      }
    }
    const xs = G.coreCells.map(c => c.x), ys = G.coreCells.map(c => c.y);
    const coreX = Math.min(...xs) * TILE;
    const coreY = Math.min(...ys) * TILE;
    const coreMaxHp = Math.round(BASE_MAX_HP * (arena.baseHpMul || 1));
    G.core = {
      x: coreX, y: coreY, w: CORE_W, h: CORE_H,
      cx: coreX + CORE_W / 2, cy: coreY + CORE_H / 2,
      hp: coreMaxHp, maxHp: coreMaxHp, alive: true, radius: BASE_RADIUS,
      hitFlash: 0, noDamage: 0, turretAngle: -Math.PI / 2, turretCd: .7, turrets: arena.startTurrets || 0, repairRate: 6, repairDelay: 7,
      dronePhase: 0, droneState: [], shieldFlash: 0
    };
    // The base's own defensive shell is friendly to player fire, but enemy fire can breach it.
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const tile = G.tiles[y][x];
      if (tile && tile.type === 'brick' && dist((x + .5) * TILE, (y + .5) * TILE, G.core.cx, G.core.cy) < TILE * 4.6) tile.friendlyWall = true;
    }
    if (!playerSpawn) playerSpawn = { x: TILE * 4.5, y: TILE * 15.5 };
    G.players = [];
    const p1 = createPlayer(playerSpawn.x, playerSpawn.y, 0);
    G.players.push(p1);
    if (G.twoPlayer) {
      const s2 = findPlayerSpawn({ x: playerSpawn.x, y: playerSpawn.y });
      G.players.push(createPlayer(s2.x, s2.y, 1));
    }
    G.player = p1;
    buildSeals(index);
    buildWeather();
    buildSpawnPoints();
    buildGroundCache();
    buildFlows();
  }

  function tileAt(px, py) {
    const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return { type: 'void', hp: Infinity };
    return G.tiles[y][x] || { type: 'ground', hp: 0 };
  }

  function isBlockingTile(px, py, includeWater = true) {
    const t = tileAt(px, py);
    if (t.type === 'brick' || t.type === 'steel') return true;
    if (includeWater && t.type === 'water') return true;
    if (t.type === 'void') return true;
    return false;
  }

  function circleHitsRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
    return dist2(cx, cy, nx, ny) < r * r;
  }

  function collidesWorld(x, y, r, includeCore = true, ignoreWater = false) {
    if (x - r < 0 || y - r < 0 || x + r > W || y + r > H) return true;
    const minX = Math.floor((x - r) / TILE), maxX = Math.floor((x + r) / TILE);
    const minY = Math.floor((y - r) / TILE), maxY = Math.floor((y + r) / TILE);
    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        const t = G.tiles[ty] && G.tiles[ty][tx];
        if (!t) continue;
        if (t.type === 'brick' || t.type === 'steel' || (t.type === 'water' && !ignoreWater)) return true;
      }
    }
    if (includeCore && G.core && circleHitsRect(x, y, r, G.core.x, G.core.y, G.core.w, G.core.h)) return true;
    return false;
  }

  function buildSeals(index) {
    G.seals = [];
    const ids = (SEAL_TANKS_BY_STAGE[index] || []);
    if (!ids.length) return;

    // Seals are optional destinations. Put them in the upper rooms, behind
    // existing steel/brick cover relative to the player's spawn, so the base
    // cannot simply stare down a straight lane and snipe them at t=0.
    const cornerZones = [
      { x0: 1, x1: 12, y0: 1, y1: 8, ax: 4, ay: 3 },
      { x0: COLS - 13, x1: COLS - 2, y0: 1, y1: 8, ax: COLS - 5, ay: 3 }
    ];
    const used = [];
    const spawn = G.player || G.players[0] || { x: W / 2, y: H / 2 };

    const safeHere = (x, y) => {
      if (collidesWorld(x, y, 18, true)) return false;
      if (dist(x, y, spawn.x, spawn.y) < 120) return false;
      if (dist(x, y, G.core.cx, G.core.cy) < 120) return false;
      if (used.some(p => dist(x, y, p.x, p.y) < 86)) return false;
      return true;
    };

    const lineBlockers = (x0, y0, x1, y1) => {
      let steel = 0, brick = 0, water = 0;
      for (let i = 0; i <= 90; i++) {
        const x = x0 + (x1 - x0) * i / 90;
        const y = y0 + (y1 - y0) * i / 90;
        const tile = G.tiles[Math.floor(y / TILE)] && G.tiles[Math.floor(y / TILE)][Math.floor(x / TILE)];
        if (!tile) continue;
        if (tile.type === 'steel') steel++;
        else if (tile.type === 'brick') brick++;
        else if (tile.type === 'water') water++;
      }
      return { steel, brick, water };
    };

    for (let si = 0; si < ids.length; si++) {
      const tankId = ids[si];
      const tank = TANKS.find(t => t.id === tankId);
      if (!tank) continue;
      const zone = cornerZones[si % cornerZones.length];
      let best = null;
      for (let ty = zone.y0; ty <= zone.y1; ty++) {
        for (let tx = zone.x0; tx <= zone.x1; tx++) {
          const tile = G.tiles[ty] && G.tiles[ty][tx];
          if (!tile || (tile.type !== 'ground' && tile.type !== 'rubble')) continue;
          const x = (tx + .5) * TILE, y = (ty + .5) * TILE;
          if (!safeHere(x, y)) continue;
          const fromSpawn = lineBlockers(spawn.x, spawn.y, x, y);
          const fromCore = lineBlockers(G.core.cx, G.core.cy, x, y);
          // Steel is the hard cover we want. Brick is acceptable; water is
          // only a last-resort visual blocker.
          let score = 0;
          if (fromSpawn.steel) score += 10000;
          else if (fromSpawn.brick) score += 1200;
          else if (fromSpawn.water) score += 300;
          if (fromCore.steel) score += 3000;
          else if (fromCore.brick) score += 500;
          score -= dist(x, y, zone.ax * TILE, zone.ay * TILE) * .02;
          if (!best || score > best.score) best = { x, y, score };
        }
      }
      if (!best) {
        // A fully walled-in corner can have no legal tile. Use the old
        // upper-half fallback rather than dropping the seal's unlock.
        const fallback = [];
        for (let ty = 1; ty < Math.max(8, Math.floor(ROWS / 2)); ty++) {
          for (let tx = 1; tx < COLS - 1; tx++) {
            const inHalf = si % 2 === 0 ? tx < COLS / 2 : tx >= COLS / 2;
            if (!inHalf) continue;
            const tile = G.tiles[ty] && G.tiles[ty][tx];
            if (!tile || (tile.type !== 'ground' && tile.type !== 'rubble')) continue;
            const x = (tx + .5) * TILE, y = (ty + .5) * TILE;
            if (safeHere(x, y)) fallback.push({ x, y });
          }
        }
        fallback.sort((a, b) => dist2(a.x, a.y, zone.ax * TILE, zone.ay * TILE) - dist2(b.x, b.y, zone.ax * TILE, zone.ay * TILE));
        best = fallback[0] || null;
      }
      if (!best) continue;

      // Put a visible steel cover directly on the spawn-facing side of the
      // seal. A distant line-of-sight check alone is not readable on screen;
      // the player must be able to see that the seal is tucked behind steel.
      {
        const dx = spawn.x - best.x, dy = spawn.y - best.y;
        const vertical = Math.abs(dy) >= Math.abs(dx);
        const dir = Math.sign(vertical ? dy : dx) || 1;
        const scx = Math.floor(best.x / TILE), scy = Math.floor(best.y / TILE);
        let placed = 0;
        for (const depth of [2, 3]) {
          for (let off = -2; off <= 2; off++) {
            const tx = vertical ? scx + off : scx + dir * depth;
            const ty = vertical ? scy + dir * depth : scy + off;
            if (tx < 1 || ty < 1 || tx >= COLS - 1 || ty >= ROWS - 1) continue;
            const tile = G.tiles[ty] && G.tiles[ty][tx];
            if (!tile || (tile.type !== 'ground' && tile.type !== 'rubble' && tile.type !== 'brick')) continue;
            tile.type = 'steel'; tile.hp = Infinity; tile.maxHp = Infinity;
            tile.seed = (tx * 31 + ty * 91) % 1000;
            placed++;
          }
          if (placed >= 3) break;
        }
      }

      used.push(best);
      const maxHp = 150 + index * 18;
      G.seals.push({
        tankId: tank.id,
        tankIndex: TANKS.indexOf(tank),
        x: best.x, y: best.y, radius: 17,
        hp: maxHp, maxHp, hitFlash: 0, minionCd: 0, dead: false, seed: rand(TAU), ring: rand(TAU)
      });
    }
  }

  function drawSeals(t) {
    for (const seal of G.seals) {
      if (seal.dead) continue;
      const tank = TANKS[seal.tankIndex] || TANKS[0];
      const c = tank.colors;
      const pulse = .65 + Math.sin(t * 3.2 + seal.seed) * .25;
      const pct = clamp(seal.hp / seal.maxHp, 0, 1);
      const flash = seal.hitFlash > 0;
      const ctx = gameCtx;
      ctx.save();
      ctx.translate(seal.x, seal.y);

      // Contained core glow.
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 38);
      glow.addColorStop(0, hexA(c.core, .25 * pulse));
      glow.addColorStop(.55, hexA(c.core, .08 * pulse));
      glow.addColorStop(1, hexA(c.core, 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Outer containment ring: broken rune circle with three orbiting
      // shards. The seal reads as a floating monolith, not a wall tile.
      ctx.strokeStyle = hexA(c.core, .28 + pulse * .22);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]);
      ctx.lineDashOffset = -t * 16;
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        const a = t * .72 + seal.ring + i * TAU / 3;
        const ox = Math.cos(a) * 25;
        const oy = Math.sin(a) * 16;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = flash ? '#fff6d8' : hexA(c.light, .8 + pulse * .15);
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(3, 3); ctx.lineTo(-3, 3); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Dark triangular monolith with a lit inner face.
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(0, -20); ctx.lineTo(-17, 14); ctx.lineTo(17, 14); ctx.closePath();
      ctx.fillStyle = 'rgba(3,8,6,.94)';
      ctx.fill();
      ctx.strokeStyle = flash ? '#fff6d8' : hexA(c.core, .85);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Left/right faces give the pyramid a readable 3D fold at 1x.
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(-13, 12); ctx.lineTo(0, 12); ctx.closePath();
      ctx.fillStyle = hexA(c.dark, .98);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(13, 12); ctx.lineTo(0, 12); ctx.closePath();
      ctx.fillStyle = flash ? hexA('#fff6d8', .75) : hexA(c.core, .16);
      ctx.fill();

      // Inner sealed aperture and the unknown-pilot glyph.
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(-8, 8); ctx.lineTo(8, 8); ctx.closePath();
      ctx.fillStyle = 'rgba(3,8,6,.72)';
      ctx.fill();
      ctx.strokeStyle = hexA(c.light, .65);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(5, 1); ctx.lineTo(0, 9); ctx.lineTo(-5, 1); ctx.closePath();
      ctx.fillStyle = flash ? '#fff6d8' : hexA(c.core, .92);
      ctx.fill();
      ctx.fillStyle = 'rgba(3,8,6,.92)';
      ctx.font = '12px Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 1);
      ctx.textBaseline = 'alphabetic';

      // Nameplate and integrity meter float above the monolith.
      ctx.fillStyle = 'rgba(4,10,8,.72)'; ctx.fillRect(-19, -34, 38, 3);
      ctx.fillStyle = flash ? '#fff6d8' : c.core; ctx.fillRect(-19, -34, 38 * pct, 3);
      ctx.font = '7px Silkscreen, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = hexA(c.light, .9); ctx.fillText(`M-${String(seal.tankIndex + 1).padStart(2, '0')}`, 0, -39);
      ctx.restore();
    }
    // Keep the hit flash decay independent of draw cadence.
    for (const seal of G.seals) if (seal.hitFlash > 0) seal.hitFlash = Math.max(0, seal.hitFlash - .02);
  }

  function buildWeather() {
    G.weather = [];
    const p = G.arena.palette;
    const isSnow = G.arena.id === 'frost';
    const isMarsh = G.arena.id === 'marsh';
    for (let i = 0; i < 70; i++) {
      G.weather.push({
        x: rand(W), y: rand(H), z: rand(1),
        vx: rand(isSnow ? 8 : 13, isSnow ? -8 : -3), vy: rand(isSnow ? 24 : 18, isSnow ? 10 : -12),
        size: isSnow ? rand(2, 1) : rand(2.2, .7), phase: rand(TAU),
        color: isSnow ? '#c7e7ff' : isMarsh ? (chance(.4) ? '#f26bd4' : '#5ff0ce') : (chance(.7) ? '#ff9a45' : '#ffce7a')
      });
    }
  }

  function buildGroundCache() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const p = G.arena.palette;
    const rng = mulberry32(8821 + G.arenaIndex * 911);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = p.ground;
    ctx.fillRect(0, 0, W, H);
    // big atmospheric gradient
    const grad = ctx.createLinearGradient(0, 0, W * .3, H);
    grad.addColorStop(0, hexA(p.sky, .55)); grad.addColorStop(.5, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(255,120,40,.035)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // AI-painted 32px plates, tinted per stage into the map palette.
    const floorArt = artImage('floor');
    if (floorArt) {
      ctx.save();
      ctx.globalAlpha = .58;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const tile = G.tiles[y] && G.tiles[y][x];
          if (!tile || tile.type !== 'ground') continue;
          const fi = floorArtIndex(x, y);
          const sx = (fi % 4) * 32, sy = Math.floor(fi / 4) * 32;
          ctx.drawImage(floorArt, sx, sy, 32, 32, x * TILE, y * TILE, TILE, TILE);
        }
      }
      ctx.restore();
    } else {
      // checker slabs (fallback while art is loading)
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = hexA(p.groundAlt, .5);
            ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          }
        }
      }
    }
    // grid
    ctx.strokeStyle = p.grid; ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * TILE + .5, 0); ctx.lineTo(x * TILE + .5, H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE + .5); ctx.lineTo(W, y * TILE + .5); ctx.stroke(); }
    // per-tile texture
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        for (let n = 0; n < 1; n++) {
          const px = x * TILE + rng() * 30, py = y * TILE + rng() * 30;
          ctx.fillStyle = hexA(rng() > .5 ? p.steelLight : p.steelB, rng() * .07 + .015);
          ctx.fillRect(px | 0, py | 0, 1 + (rng() * 2 | 0), 1 + (rng() * 2 | 0));
        }
      }
    }
    // oil stains
    for (let i = 0; i < 6; i++) {
      const x = rng() * W, y = rng() * H, r = 12 + rng() * 55;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(2,6,5,.13)'); g.addColorStop(1, 'rgba(2,6,5,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * .38, rng(), 0, TAU); ctx.fill();
    }
    // hazard stripes around core approach
    ctx.save();
    ctx.globalAlpha = .5;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? hexA(p.hazard, .8) : 'rgba(6,10,8,.65)';
      ctx.fillRect(G.core.x - 44 + i * 14, G.core.y + 6, 9, 3);
    }
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? hexA(p.hazard, .7) : 'rgba(6,10,8,.65)';
      ctx.fillRect(G.core.x + G.core.w + 35 - i * 14, G.core.y + 6, 9, 3);
    }
    ctx.restore();
    // spawn plates: top hatches plus left/right pressure lanes.
    const plates = G.spawnPoints && G.spawnPoints.length ? G.spawnPoints : FALLBACK_SPAWN_POINTS;
    for (const sp of plates) {
      const x = (sp.cx + .5) * TILE, y = (sp.cy + .5) * TILE;
      const sideLane = sp.side === 'left' || sp.side === 'right';
      const plateColor = sideLane ? '#ff8a5a' : p.accent;
      ctx.strokeStyle = hexA(plateColor, sideLane ? .38 : .22); ctx.lineWidth = sideLane ? 1.4 : 1;
      ctx.strokeRect(x - 11.5, y - 11.5, 23, 23);
      ctx.fillStyle = hexA(plateColor, sideLane ? .14 : .08); ctx.fillRect(x - 9, y - 9, 18, 18);
      if (sideLane) {
        // Chevron points inward: a lane marker, not a pickup.
        const dir = sp.side === 'left' ? 1 : -1;
        ctx.fillStyle = hexA(plateColor, .72);
        ctx.beginPath();
        ctx.moveTo(x + dir * 6, y);
        ctx.lineTo(x - dir * 4, y - 6);
        ctx.lineTo(x - dir * 4, y + 6);
        ctx.closePath();
        ctx.fill();
      }
    }
    // large floor markings
    ctx.save();
    ctx.font = 'bold 92px Silkscreen, monospace';
    ctx.fillStyle = hexA(p.steelLight, .035);
    ctx.fillText('07', 42, H - 50);
    ctx.font = '9px Silkscreen, monospace';
    ctx.fillStyle = hexA(p.steelLight, .12);
    ctx.fillText('机库 / 07 / 装甲分队', 44, H - 30);
    ctx.restore();
    // chips & cracks
    for (let i = 0; i < 14; i++) {
      const x = rng() * W, y = rng() * H;
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng() * 8 - 4, y + rng() * 9 + 3); ctx.lineTo(x + rng() * 14 - 7, y + rng() * 17 + 4); ctx.stroke();
    }
    groundCache = c;
  }

  /* ---------------- flow field ---------------- */
  class MinHeap {
    constructor() { this.a = []; }
    push(node) {
      const a = this.a; a.push(node); let i = a.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (a[p].d <= a[i].d) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
    }
    pop() {
      const a = this.a; if (!a.length) return null;
      const top = a[0], last = a.pop();
      if (a.length) {
        a[0] = last; let i = 0;
        while (true) {
          const l = i * 2 + 1, r = l + 1; let s = i;
          if (l < a.length && a[l].d < a[s].d) s = l;
          if (r < a.length && a[r].d < a[s].d) s = r;
          if (s === i) break; [a[i], a[s]] = [a[s], a[i]]; i = s;
        }
      }
      return top;
    }
    get size() { return this.a.length; }
  }

  function tileCostForFlow(x, y, targetIsCore) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return Infinity;
    const t = G.tiles[y][x];
    if (!t) return 1;
    if (t.type === 'water' || t.type === 'steel' || t.type === 'core') return Infinity;
    if (t.type === 'brick') return 4;
    return 1;
  }

  function buildFlow(targetX, targetY, targetIsCore) {
    const tx = clamp(Math.floor(targetX / TILE), 0, COLS - 1);
    const ty = clamp(Math.floor(targetY / TILE), 0, ROWS - 1);
    const size = COLS * ROWS;
    const d = new Float32Array(size); d.fill(Infinity);
    const start = ty * COLS + tx;
    d[start] = 0;
    const heap = new MinHeap(); heap.push({ i: start, d: 0 });
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    while (heap.size) {
      const cur = heap.pop(); if (!cur) break;
      if (cur.d > d[cur.i] + .0001) continue;
      const cx = cur.i % COLS, cy = Math.floor(cur.i / COLS);
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        const c = tileCostForFlow(nx, ny, targetIsCore);
        if (c === Infinity) continue;
        const ni = ny * COLS + nx;
        const nd = cur.d + c;
        if (nd < d[ni] - .0001) { d[ni] = nd; heap.push({ i: ni, d: nd }); }
      }
    }
    return d;
  }

  function buildFlows() {
    if (!G.players || !G.players.length || !G.core) return;
    G.flowPlayers = G.players.map(p => (p.alive && !p.downed) ? buildFlow(p.x, p.y, false) : null);
    G.flowPlayer = G.flowPlayers[0] || null;
    G.flowBase = G.core.alive ? buildFlow(G.core.cx, G.core.cy, true) : null;
  }

  function buildSpawnPoints() {
    const points = [];
    const add = (cx, cy, side) => {
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
      const tile = G.tiles[cy] && G.tiles[cy][cx];
      if (!tile || tile.type === 'brick' || tile.type === 'steel' || tile.type === 'water' || tile.type === 'core') return;
      if (G.core && dist((cx + .5) * TILE, (cy + .5) * TILE, G.core.cx, G.core.cy) < TILE * 5.5) return;
      if (points.some(p => p.cx === cx && p.cy === cy)) return;
      points.push({ cx, cy, side });
    };
    // Top deployment hatches. Add the center hatch explicitly so the first
    // minutes have one predictable entrance instead of a full perimeter.
    add(14, 0, 'top');
    for (let x = 2; x <= COLS - 3; x += 5) add(x, 0, 'top');
    // Left and right edge lanes. These are the pressure lanes that force repositioning.
    for (let y = 2; y <= ROWS - 4; y += 3) {
      add(1, y, 'left');
      add(COLS - 2, y, 'right');
    }
    // Bottom corner lanes, kept away from the core.
    add(1, ROWS - 3, 'left');
    add(COLS - 2, ROWS - 3, 'right');
    G.spawnPoints = points.length ? points : FALLBACK_SPAWN_POINTS.slice();
  }

  function spawnPointTier(sp) {
    if (sp.side === 'top' && sp.cx === 14) return 0;
    if ((sp.side === 'left' || sp.side === 'right') && sp.cy === 8) return 1;
    if ((sp.side === 'left' || sp.side === 'right') && (sp.cy === 5 || sp.cy === 11)) return 2;
    if (sp.side === 'top') return 3;
    return 4;
  }

  function spawnPointOrder(sp) {
    const tier = spawnPointTier(sp);
    if (tier === 0) return 0;
    if (tier === 1) return sp.side === 'left' ? 10 : 11;
    if (tier === 2) return 20 + Math.abs(sp.cy - 8) * 2 + (sp.side === 'right' ? 1 : 0);
    if (tier === 3) return 30 + Math.abs(sp.cx - 14);
    return 50 + sp.cy * 2 + (sp.side === 'right' ? 1 : 0);
  }

  // New entrances unlock every minute: center top -> left/right lanes ->
  // wider top hatches -> bottom corners. This prevents the opening minute from
  // becoming a four-direction surround.
  function activeSpawnPoints() {
    const all = G.spawnPoints && G.spawnPoints.length ? G.spawnPoints : FALLBACK_SPAWN_POINTS;
    const minute = Math.floor(G.elapsed / 60);
    // One entrance in the opening minute, then at least two new directions per
    // minute so the full map is live by the Titan cue instead of stranding
    // half of the hatches unused.
    const count = minute <= 1 ? 1 : Math.min(all.length, 2 * minute - 1);
    return all.slice().sort((a, b) => spawnPointOrder(a) - spawnPointOrder(b)).slice(0, count);
  }

  function spawnPoolSides() {
    return activeSpawnPoints().filter(sp => sp.side === 'left' || sp.side === 'right');
  }

  function chooseSpawnPoint(pool) {
    const points = pool && pool.length ? pool : activeSpawnPoints();
    const ps = G.players && G.players.length ? G.players : [G.player];
    const safe = points.filter(sp => !ps.some(p => p && dist((sp.cx + .5) * TILE, (sp.cy + .5) * TILE, p.x, p.y) < 130));
    return pick(safe.length ? safe : points);
  }

  function flowDirection(flow, px, py, currentDir) {
    if (!flow) return null;
    const cx = clamp(Math.floor(px / TILE), 0, COLS - 1), cy = clamp(Math.floor(py / TILE), 0, ROWS - 1);
    let best = null, bestD = flow[cy * COLS + cx];
    if (!Number.isFinite(bestD)) bestD = Infinity;
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const d = flow[ny * COLS + nx];
      if (d < bestD - .001) {
        bestD = d; best = { dx, dy, nx, ny, d };
      }
    }
    if (!best) return null;
    if (currentDir && best.dx === -currentDir.dx && best.dy === -currentDir.dy && Math.random() < .35) {
      // keep some variety, but reverse only when it is the sole improvement
    }
    return best;
  }

  /* ---------------- pixel rendering ---------------- */
  function drawBrickTile(ctx, x, y, tile, t) {
    const p = G.arena.palette;
    const ratio = tile.hp / tile.maxHp;
    const rng = mulberry32(tile.seed + 99);
    ctx.fillStyle = '#160e0c';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = p.brickDark;
    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    for (let row = 0; row < 4; row++) {
      const yy = y + 2 + row * 7;
      const offset = row % 2 ? -8 : 0;
      for (let col = 0; col < 3; col++) {
        const xx = x + 1 + offset + col * 15;
        if (xx + 14 < x || xx > x + TILE - 1) continue;
        const sx = Math.max(x + 1, xx), ex = Math.min(x + TILE - 2, xx + 14);
        if (ex <= sx) continue;
        const shade = (tile.seed + row * 3 + col) % 4;
        ctx.fillStyle = shade === 0 ? p.brickA : shade === 1 ? p.brickB : shade === 2 ? lightenHex(p.brickA, -13) : p.brickA;
        ctx.fillRect(sx, yy, ex - sx, 5);
        ctx.fillStyle = hexA(p.brickLight, shade === 0 ? .32 : .15);
        ctx.fillRect(sx, yy, ex - sx, 1);
        ctx.fillStyle = 'rgba(0,0,0,.24)';
        ctx.fillRect(sx, yy + 4, ex - sx, 1);
      }
    }
    // chipped edges
    for (let i = 0; i < 4; i++) {
      const px = x + 2 + (rng() * (TILE - 5) | 0), py = y + 2 + (rng() * (TILE - 5) | 0);
      ctx.fillStyle = hexA('#000', .22); ctx.fillRect(px, py, 2, 2);
    }
    if (ratio < .7) {
      ctx.strokeStyle = 'rgba(9,6,4,.65)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 8, y + 3); ctx.lineTo(x + 12, y + 11); ctx.lineTo(x + 8, y + 16); ctx.lineTo(x + 14, y + 23); ctx.stroke();
      if (ratio < .35) {
        ctx.beginPath(); ctx.moveTo(x + 25, y + 4); ctx.lineTo(x + 20, y + 12); ctx.lineTo(x + 26, y + 17); ctx.lineTo(x + 22, y + 28); ctx.stroke();
      }
    }
    if (tile.friendlyWall) {
      ctx.strokeStyle = hexA(p.core, .55); ctx.lineWidth = 1;
      ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
      ctx.fillStyle = hexA(p.core, .8);
      ctx.fillRect(x + 4, y + 4, 4, 1); ctx.fillRect(x + 4, y + 4, 1, 4);
      ctx.fillRect(x + TILE - 8, y + 4, 4, 1); ctx.fillRect(x + TILE - 5, y + 4, 1, 4);
      ctx.fillStyle = hexA(p.core, .28); ctx.fillRect(x + 9, y + 15, TILE - 18, 1);
    }
  }

  function lightenHex(hex, amt) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return `rgb(${clamp(((n >> 16) & 255) + amt, 0, 255)},${clamp(((n >> 8) & 255) + amt, 0, 255)},${clamp((n & 255) + amt, 0, 255)})`;
  }

  function drawSteelTile(ctx, x, y, tile, t) {
    const p = G.arena.palette;
    ctx.fillStyle = '#101715'; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = p.steelB; ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = p.steelA; ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
    ctx.fillStyle = hexA(p.steelLight, .24); ctx.fillRect(x + 3, y + 3, TILE - 6, 1); ctx.fillRect(x + 3, y + 3, 1, TILE - 6);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + 3, y + TILE - 4, TILE - 6, 1); ctx.fillRect(x + TILE - 4, y + 3, 1, TILE - 6);
    // diagonal hazard strip
    ctx.save();
    ctx.globalAlpha = .24;
    ctx.beginPath(); ctx.rect(x + 7, y + 7, TILE - 14, TILE - 14); ctx.clip();
    ctx.strokeStyle = p.hazard; ctx.lineWidth = 2;
    for (let i = -TILE; i < TILE * 2; i += 9) {
      ctx.beginPath(); ctx.moveTo(x + i, y + TILE); ctx.lineTo(x + i + TILE, y); ctx.stroke();
    }
    ctx.restore();
    // rivets
    ctx.fillStyle = hexA(p.steelLight, .7);
    [[6, 6], [TILE - 7, 6], [6, TILE - 7], [TILE - 7, TILE - 7]].forEach(([ox, oy]) => {
      ctx.fillRect(x + ox, y + oy, 2, 2);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + ox + 1, y + oy + 1, 1, 1);
      ctx.fillStyle = hexA(p.steelLight, .7);
    });
    ctx.fillStyle = hexA(p.accent, .45);
    ctx.fillRect(x + 11, y + 15, 10, 1);
  }

  function drawWaterTile(ctx, x, y, t) {
    const p = G.arena.palette;
    ctx.fillStyle = p.water; ctx.fillRect(x, y, TILE, TILE);
    const g = ctx.createLinearGradient(x, y, x, y + TILE);
    g.addColorStop(0, hexA(p.waterLight, .14)); g.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.fillStyle = g; ctx.fillRect(x, y, TILE, TILE);
    for (let i = 0; i < 3; i++) {
      const yy = y + 8 + i * 8 + Math.sin(t * 1.7 + x * .06 + y * .04 + i) * 2;
      const xx = x + 3 + Math.sin(t * 1.2 + y * .05 + i * 2) * 4;
      ctx.fillStyle = hexA(p.waterLight, .36 - i * .07);
      ctx.fillRect(xx, yy, 11 + i * 3, 1);
      ctx.fillStyle = hexA('#c7ffff', .12);
      ctx.fillRect(xx + 2, yy - 1, 5, 1);
    }
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(x, y, 1, TILE); ctx.fillRect(x, y, TILE, 1);
  }

  function drawRubble(ctx, x, y, tile) {
    const p = G.arena.palette;
    const rng = mulberry32(tile.seed + 5);
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(x, y, TILE, TILE);
    for (let i = 0; i < 11; i++) {
      const rx = x + 2 + rng() * 27, ry = y + 4 + rng() * 25;
      ctx.fillStyle = rng() > .5 ? p.brickB : p.brickDark;
      ctx.fillRect(rx | 0, ry | 0, 2 + (rng() * 4 | 0), 1 + (rng() * 3 | 0));
    }
    ctx.fillStyle = hexA(p.brickLight, .18); ctx.fillRect(x + 3, y + 3, 2, 1); ctx.fillRect(x + 20, y + 12, 3, 1);
  }

  function drawBushes(ctx, t) {
    const p = G.arena.palette;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = G.tiles[y][x];
        if (!tile || tile.type !== 'bush') continue;
        const px = x * TILE, py = y * TILE;
        const rng = mulberry32(tile.seed + 21);
        ctx.globalAlpha = .9;
        ctx.fillStyle = 'rgba(2,10,7,.5)';
        ctx.fillRect(px + 1, py + 2, TILE - 2, TILE - 1);
        for (let i = 0; i < 13; i++) {
          const bx = px + 2 + rng() * 27, by = py + 2 + rng() * 27;
          const s = 2 + rng() * 4;
          ctx.fillStyle = rng() > .55 ? p.bushLight : p.bush;
          ctx.fillRect(bx | 0, by | 0, s | 0, s | 0);
          if (rng() > .6) { ctx.fillStyle = hexA(p.bushLight, .5); ctx.fillRect((bx | 0) + 1, (by | 0) + 1, 1, 1); }
        }
        ctx.fillStyle = hexA(p.bushLight, .08); ctx.fillRect(px, py, TILE, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawCore(t) {
    const ctx = gameCtx;
    const p = G.arena.palette;
    const c = G.core;
    if (!c) return;
    ctx.save();
    ctx.translate(c.x, c.y);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(c.w / 2, c.h / 2 + 11, 32, 13, 0, 0, TAU); ctx.fill();
    // extraction plate
    ctx.fillStyle = '#080d0b'; ctx.fillRect(3, 5, 58, 57);
    ctx.fillStyle = p.steelB; ctx.fillRect(4, 4, 56, 56);
    ctx.fillStyle = p.steelA; ctx.fillRect(6, 6, 52, 52);
    ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fillRect(9, 9, 46, 46);
    // hazard corners
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? p.hazard : '#1c211b';
      ctx.fillRect(7 + i * 5, 7 + i, 4, 3);
      ctx.fillRect(57 - i * 5, 7 + i, 4, 3);
      ctx.fillRect(7 + i * 5, 54 - i, 4, 3);
      ctx.fillRect(57 - i * 5, 54 - i, 4, 3);
    }
    // landing ring
    const pulse = .7 + Math.sin(t * 2.6) * .2;
    ctx.fillStyle = hexA(p.core, .06); ctx.beginPath(); ctx.arc(32, 32, 17, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(p.core, .38 + pulse * .2); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(32, 32, 16, 0, TAU); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.lineDashOffset = -t * 9;
    ctx.strokeStyle = hexA(p.core, .55); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(32, 32, 21, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // rotating beacon ticks
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + t * .22;
      ctx.fillStyle = hexA(p.core, i % 2 ? .35 : .8);
      ctx.fillRect(31 + Math.cos(a) * 24, 31 + Math.sin(a) * 24, 2, 2);
    }
    // Orbiting interceptor drones cover the left/top/right arc; the bottom
    // 90-degree sector is deliberately left open as the base's blind spot.
    const droneCount = (c.droneState || []).length;
    if (droneCount > 0) {
      const shieldPulse = c.shieldFlash > 0 ? .38 : 0;
      ctx.save();
      ctx.strokeStyle = hexA(p.core, .2 + shieldPulse);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -t * 14;
      ctx.beginPath();
      ctx.arc(32, 32, BASE_RADIUS + 22, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const d of c.droneState || []) {
      ctx.save();
      ctx.translate(32 + d.ox, 32 + d.oy);
      // orbit tether
      ctx.strokeStyle = hexA(p.core, .13);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-d.ox, -d.oy); ctx.lineTo(0, 0); ctx.stroke();
      // energy bubble (the actual bullet-catching radius is larger than the hull)
      ctx.strokeStyle = hexA(p.core, d.blockFlash > 0 ? .85 : .2);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke();
      ctx.rotate((d.angle || 0) + Math.PI / 2);
      ctx.shadowColor = 'rgba(143,255,230,.58)';
      ctx.shadowBlur = 6;
      // rotor arms and pods
      ctx.strokeStyle = '#3d8c7d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
      ctx.fillStyle = '#06100d'; ctx.fillRect(-11, -3, 5, 6); ctx.fillRect(6, -3, 5, 6);
      ctx.strokeStyle = hexA(p.core, .55); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(-8.5, 0, 3, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(8.5, 0, 3, 0, TAU); ctx.stroke();
      // central pod
      ctx.fillStyle = '#0a1b17';
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = d.blockFlash > 0 ? '#eafffb' : '#8fffe6';
      ctx.fillRect(-1, -1, 2, 2);
      // short emitter barrel points at the current target
      const rel = (d.aimAngle == null ? d.angle : d.aimAngle) - d.angle;
      ctx.rotate(rel);
      ctx.fillStyle = '#8fffe6'; ctx.fillRect(-1, -11, 2, 5);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    // center light
    const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 13);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(.22, hexA(p.core, .75));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(18, 18, 28, 28);
    // corner lamps
    [[8,8],[56,8],[8,56],[56,56]].forEach(([x, y]) => {
      ctx.fillStyle = hexA(p.core, .35 + pulse * .45); ctx.fillRect(x - 1, y - 1, 2, 2);
    });
    // base armor strip
    const basePct = clamp((c.hp == null ? 1 : c.hp / c.maxHp), 0, 1);
    ctx.fillStyle = 'rgba(3,10,8,.9)'; ctx.fillRect(6, 59, 52, 3);
    ctx.fillStyle = basePct < .3 ? '#ff5f4a' : p.core; ctx.fillRect(6, 59, 52 * basePct, 3);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(32, 59, 26, 3);
    ctx.globalAlpha = .32; ctx.fillStyle = p.core; ctx.fillRect(32, 59, 26 * basePct, 3); ctx.globalAlpha = 1;
    if (c.hitFlash > 0) {
      ctx.globalAlpha = Math.min(.55, c.hitFlash * 3);
      ctx.fillStyle = '#fff'; ctx.fillRect(3, 3, 58, 58); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // vertical evacuation beam + tag
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(0, c.y - 46, 0, c.y + 20);
    beam.addColorStop(0, hexA(p.core, 0));
    beam.addColorStop(.55, hexA(p.core, .12));
    beam.addColorStop(1, hexA(p.core, .28));
    ctx.fillStyle = beam; ctx.fillRect(c.cx - 12, c.y - 46, 24, 66);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(3,10,8,.86)';
    ctx.fillRect(c.cx - 27, c.y - 15, 54, 12);
    ctx.strokeStyle = hexA(p.core, .55); ctx.lineWidth = 1;
    ctx.strokeRect(c.cx - 26.5, c.y - 14.5, 53, 11);
    ctx.fillStyle = (c.hp / c.maxHp) < .3 ? '#ff8a8d' : hexA(p.core, .92);
    ctx.font = '6px Silkscreen, monospace'; ctx.textAlign = 'center';
    ctx.fillText('基地核心', c.cx, c.y - 6.5);
    if (c.hp < c.maxHp) {
      ctx.fillStyle = 'rgba(3,10,8,.9)'; ctx.fillRect(c.cx - 27, c.y - 2, 54, 3);
      ctx.fillStyle = (c.hp / c.maxHp) < .3 ? '#ff5f4a' : p.core;
      ctx.fillRect(c.cx - 26, c.y - 1, 52 * clamp(c.hp / c.maxHp, 0, 1), 1);
    }
    ctx.restore();
  }

  function drawTankShadow(ctx, x, y, size) {
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + 5, 16 * size, 8 * size, 0, 0, TAU); ctx.fill();
  }

  function drawHullLocal(ctx, colors, size, trackPhase, opts) {
    const w = 26 * size, h = 28 * size;
    const dark = colors.dark, body = colors.body, light = colors.light;
    // tracks
    ctx.fillStyle = '#070a08';
    ctx.fillRect(-w / 2 - 1, -h / 2 + 2, 8, h - 4);
    ctx.fillRect(w / 2 - 7, -h / 2 + 2, 8, h - 4);
    ctx.fillStyle = dark;
    ctx.fillRect(-w / 2, -h / 2 + 3, 6, h - 6);
    ctx.fillRect(w / 2 - 6, -h / 2 + 3, 6, h - 6);
    for (let y = -h / 2 + 4; y < h / 2 - 3; y += 4) {
      const on = (Math.floor((y + trackPhase * 20) / 4) % 2) === 0;
      ctx.fillStyle = on ? hexA(light, .24) : '#0a0d0b';
      ctx.fillRect(-w / 2, y, 6, 2);
      ctx.fillRect(w / 2 - 6, y, 6, 2);
    }
    // chassis stepped silhouette
    ctx.fillStyle = '#090d0b';
    ctx.fillRect(-w / 2 + 5, -h / 2, w - 10, h);
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    ctx.fillStyle = body;
    ctx.fillRect(-w / 2 + 5, -h / 2 + 1, w - 10, h - 2);
    ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    // chamfer highlights
    ctx.fillStyle = light;
    ctx.fillRect(-w / 2 + 6, -h / 2 + 1, w - 12, 1);
    ctx.fillRect(-w / 2 + 4, -h / 2 + 4, 1, h - 8);
    ctx.fillStyle = hexA('#000', .28);
    ctx.fillRect(-w / 2 + 4, h / 2 - 5, w - 8, 1);
    ctx.fillRect(w / 2 - 5, -h / 2 + 4, 1, h - 8);
    // front armor wedge
    ctx.fillStyle = dark;
    ctx.fillRect(-w / 2 + 6, -h / 2 - 2, w - 12, 3);
    ctx.fillStyle = body;
    ctx.fillRect(-w / 2 + 8, -h / 2 - 1, w - 16, 2);
    // center plates
    ctx.fillStyle = hexA(light, .14);
    ctx.fillRect(-w / 2 + 8, -h / 2 + 7, w - 16, 1);
    ctx.fillRect(-w / 2 + 8, h / 2 - 9, w - 16, 1);
    ctx.fillStyle = hexA('#000', .18);
    ctx.fillRect(-w / 2 + 8, -4, w - 16, 1);
    // side skirts, rivets, seams and lights: makes silhouettes read as machines
    ctx.fillStyle = dark;
    ctx.fillRect(-w / 2 + 1, -h / 2 + 7, 2, h - 14);
    ctx.fillRect(w / 2 - 3, -h / 2 + 7, 2, h - 14);
    ctx.fillStyle = hexA(light, .26);
    ctx.fillRect(-w / 2 + 2, -h / 2 + 7, 1, h - 14);
    ctx.fillRect(w / 2 - 3, -h / 2 + 7, 1, h - 14);
    for (let y = -h / 2 + 9; y < h / 2 - 6; y += 5) {
      ctx.fillStyle = hexA(light, .34);
      ctx.fillRect(-w / 2 + 6, y, 1, 1);
      ctx.fillRect(w / 2 - 7, y, 1, 1);
    }
    ctx.fillStyle = hexA('#000', .24);
    ctx.fillRect(-w / 2 + 8, -h / 2 + 10, w - 16, 1);
    ctx.fillRect(-w / 2 + 8, h / 2 - 7, w - 16, 1);
    ctx.fillStyle = colors.core;
    ctx.fillRect(-w / 2 + 7, -h / 2 + 3, 2, 1);
    ctx.fillRect(w / 2 - 9, -h / 2 + 3, 2, 1);
    if (opts && opts.player) {
      ctx.fillStyle = hexA('#5ff0ce', .8);
      ctx.fillRect(-w / 2 + 9, -h / 2 + 5, 3, 1);
      ctx.fillRect(w / 2 - 12, -h / 2 + 5, 3, 1);
      ctx.fillStyle = hexA('#ffffff', .55);
      ctx.fillRect(-1, -h / 2 + 6, 2, 1);
    }
    // rear vents
    ctx.fillStyle = dark;
    for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + 8 + i * 3, h / 2 - 7, 2, 3);
    // team chevron / core
    ctx.fillStyle = colors.core;
    ctx.fillRect(-2, 4, 4, 2);
    ctx.globalAlpha = .45;
    ctx.fillStyle = colors.core;
    ctx.fillRect(-4, 7, 8, 1);
    ctx.globalAlpha = 1;
    if (opts && opts.heavy) {
      ctx.fillStyle = hexA(light, .32);
      ctx.fillRect(-w / 2 + 7, -h / 2 + 10, 4, 7);
      ctx.fillRect(w / 2 - 11, -h / 2 + 10, 4, 7);
    }
    if (opts && opts.elite) {
      ctx.fillStyle = hexA('#ffdd9a', .7);
      ctx.fillRect(-w / 2 + 7, -h / 2 + 2, 3, 1); ctx.fillRect(w / 2 - 10, -h / 2 + 2, 3, 1);
      ctx.fillRect(-w / 2 + 7, h / 2 - 4, 3, 1); ctx.fillRect(w / 2 - 10, h / 2 - 4, 3, 1);
    }
    if (opts && opts.bomber) {
      ctx.fillStyle = colors.core;
      ctx.globalAlpha = .65 + Math.sin(performance.now() / 110) * .25;
      ctx.fillRect(-4, -2, 8, 8);
      ctx.globalAlpha = 1;
    }
    // Enemy-specific silhouette modules. Kept low-contrast so the swarm stays readable.
    const etype = opts && opts.enemyType;
    if (etype === 'heavy' || etype === 'elite') {
      ctx.fillStyle = hexA(light, .38);
      ctx.fillRect(-w / 2 - 2, -h / 2 + 7, 3, h - 14);
      ctx.fillRect(w / 2 - 1, -h / 2 + 7, 3, h - 14);
      ctx.fillStyle = hexA('#000', .34);
      ctx.fillRect(-w / 2 - 1, -h / 2 + 7, 1, h - 14);
      ctx.fillRect(w / 2, -h / 2 + 7, 1, h - 14);
      ctx.fillStyle = hexA(colors.core, .7);
      for (let y = -h / 2 + 10; y < h / 2 - 8; y += 6) {
        ctx.fillRect(-w / 2 - 2, y, 2, 1); ctx.fillRect(w / 2, y, 2, 1);
      }
    }
    if (etype === 'scout') {
      ctx.fillStyle = light; ctx.fillRect(-w / 2 + 5, -h / 2 - 5, 1, 7);
      ctx.fillStyle = colors.core; ctx.fillRect(-w / 2 + 4, -h / 2 - 6, 3, 2);
      ctx.fillStyle = hexA('#000', .3); ctx.fillRect(-w / 2 + 7, -h / 2 + 7, w - 14, 1);
    }
    if (etype === 'sniper') {
      ctx.fillStyle = '#161d2a'; ctx.fillRect(-w / 2 + 7, -h / 2 + 11, w - 14, 3);
      ctx.fillStyle = hexA('#9dbbff', .8); ctx.fillRect(-w / 2 + 10, -h / 2 + 12, 4, 1);
      ctx.fillStyle = colors.core; ctx.fillRect(w / 2 - 9, -h / 2 + 12, 2, 1);
    }
    if (etype === 'bomber') {
      ctx.save();
      ctx.globalAlpha = .7;
      ctx.fillStyle = colors.core;
      for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + 7 + i * 5, h / 2 - 10, 3, 3);
      ctx.restore();
      ctx.fillStyle = '#1a0c10'; ctx.fillRect(-5, h / 2 - 15, 10, 4);
    }
    if (etype === 'bulwark') {
      // oversized front plow: readable from above, even in a swarm
      ctx.fillStyle = '#17100c'; ctx.fillRect(-w / 2 - 5, -h / 2 - 13, w + 10, 8);
      ctx.fillStyle = light; ctx.fillRect(-w / 2 - 3, -h / 2 - 11, w + 6, 3);
      ctx.fillStyle = dark; ctx.fillRect(-w / 2 - 3, -h / 2 - 7, w + 6, 4);
      ctx.fillStyle = colors.core; ctx.fillRect(-w / 2 + 2, -h / 2 - 10, 3, 1); ctx.fillRect(w / 2 - 5, -h / 2 - 10, 3, 1);
      ctx.fillStyle = hexA(light, .28); ctx.fillRect(-w / 2 - 4, -h / 2 - 4, 3, 8); ctx.fillRect(w / 2 + 1, -h / 2 - 4, 3, 8);
    }
    if (etype === 'mortar') {
      ctx.fillStyle = '#1a120b'; ctx.fillRect(-8, -h / 2 + 4, 16, 9);
      ctx.fillStyle = light; ctx.fillRect(-6, -h / 2 + 5, 12, 2);
      ctx.fillStyle = colors.core; ctx.fillRect(-2, -h / 2 + 10, 4, 2);
    }
    if (etype === 'minelayer') {
      ctx.fillStyle = '#17130b'; ctx.fillRect(-w / 2 + 7, h / 2 - 10, w - 14, 6);
      ctx.fillStyle = colors.core;
      for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + 9 + i * 6, h / 2 - 8, 3, 2);
    }
    if (etype === 'splitter') {
      ctx.fillStyle = dark; ctx.fillRect(-w / 2 - 3, -4, 4, 12); ctx.fillRect(w / 2 - 1, -4, 4, 12);
      ctx.fillStyle = colors.core; ctx.fillRect(-w / 2 - 1, 0, 2, 2); ctx.fillRect(w / 2 - 1, 0, 2, 2);
    }
  }

  function pixelLine(ctx, angle, length, width, color, start = 0) {
    const steps = Math.max(1, Math.ceil(length));
    ctx.fillStyle = color;
    for (let i = start; i <= steps; i++) {
      const px = Math.round(Math.cos(angle) * i);
      const py = Math.round(Math.sin(angle) * i);
      ctx.fillRect(px - Math.floor(width / 2), py - Math.floor(width / 2), width, width);
    }
  }

  function drawTurretLocal(ctx, angle, colors, size, opts) {
    const dark = colors.dark, body = colors.body, light = colors.light, core = colors.core;
    // turret base
    ctx.fillStyle = '#080c0a';
    ctx.fillRect(-9 * size, -8 * size, 18 * size, 16 * size);
    ctx.fillRect(-8 * size, -9 * size, 16 * size, 18 * size);
    ctx.fillStyle = dark;
    ctx.fillRect(-8 * size, -7 * size, 16 * size, 14 * size);
    ctx.fillRect(-7 * size, -8 * size, 14 * size, 16 * size);
    ctx.fillStyle = body;
    ctx.fillRect(-6 * size, -6 * size, 12 * size, 12 * size);
    ctx.fillStyle = light;
    ctx.fillRect(-5 * size, -6 * size, 10 * size, 1);
    ctx.fillRect(-6 * size, -5 * size, 1, 10);
    ctx.fillStyle = hexA('#000', .25);
    ctx.fillRect(-4 * size, 5 * size, 8 * size, 1);
    // mantlet + barrel
    ctx.save();
    ctx.rotate(angle);
    const back = opts && opts.recoil ? Math.max(0, opts.recoil * 2) : 0;
    const barrelLen = (opts && opts.barrelLen ? opts.barrelLen : 17) * size;
    const barrelW = (opts && opts.barrelWide ? 4 : 3) * size;
    const barrels = opts && opts.twin ? [-2 * size, 2 * size] : [0];
    for (const off of barrels) {
      ctx.save(); ctx.translate(0, off + 1);
      pixelLine(ctx, 0, barrelLen + barrelW, barrelW + 2, '#060a08', 3 - back);
      pixelLine(ctx, 0, barrelLen + barrelW, barrelW, dark, 3 - back);
      pixelLine(ctx, 0, barrelLen + barrelW - 2, Math.max(1, barrelW - 2), body, 3 - back);
      pixelLine(ctx, 0, barrelLen - 3, 1, light, 5 - back);
      ctx.fillStyle = dark; ctx.fillRect(Math.round(barrelLen * .56), -barrelW - 1, 2, barrelW * 2 + 2);
      ctx.fillStyle = hexA(light, .6); ctx.fillRect(Math.round(barrelLen * .56), -barrelW, 1, 1);
      ctx.fillStyle = '#080c0a'; ctx.fillRect(Math.round(barrelLen + barrelW - back), -barrelW, barrelW + 2, barrelW * 2 + 2);
      ctx.fillStyle = core; ctx.fillRect(Math.round(barrelLen + barrelW - 1 - back), -1, 3, 2);
      ctx.restore();
    }
    // muzzle glow
    ctx.fillStyle = hexA(core, .75);
    ctx.fillRect(Math.round(barrelLen + 2), -1, 2, 2);
    ctx.restore();
    // type-specific optics / launchers
    const etype = opts && opts.enemyType;
    if (etype === 'sniper') {
      ctx.fillStyle = '#0a111b'; ctx.fillRect(-4 * size, -6 * size, 8 * size, 3 * size);
      ctx.fillStyle = '#9dbbff'; ctx.fillRect(-2 * size, -5 * size, 3 * size, 1 * size);
    } else if (etype === 'bomber') {
      ctx.fillStyle = '#090b0a'; ctx.fillRect(-5 * size, -3 * size, 10 * size, 6 * size);
      ctx.fillStyle = colors.core; ctx.fillRect(-2 * size, -2 * size, 4 * size, 4 * size);
    } else if (etype === 'elite') {
      ctx.fillStyle = hexA('#ffdd9a', .75);
      ctx.fillRect(-5 * size, -5 * size, 2 * size, 1 * size);
      ctx.fillRect(3 * size, -5 * size, 2 * size, 1 * size);
    }
    // hatch glow
    ctx.fillStyle = hexA(core, .9);
    ctx.fillRect(-1 * size, -1 * size, 2 * size, 2 * size);
    ctx.fillStyle = hexA(core, .2);
    ctx.fillRect(-4 * size, -4 * size, 8 * size, 8 * size);
  }

  function drawTankAt(ctx, x, y, bodyAngle, turretAngle, colors, size, trackPhase, opts) {
    opts = opts || {};
    drawTankShadow(ctx, x, y, size);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bodyAngle + Math.PI / 2);
    drawHullLocal(ctx, colors, size, trackPhase, opts);
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    drawTurretLocal(ctx, turretAngle, colors, size, opts);
    ctx.restore();
  }

  function drawBossCore(ctx, e, t, radius) {
    const pulse = .62 + Math.sin(t * 4 + e.id) * .22;
    const r = radius || 10;
    ctx.fillStyle = '#080b09';
    ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(e.coreColor, .16 + pulse * .18);
    ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(e.coreColor, .62);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff0dc';
    ctx.beginPath(); ctx.arc(0, 0, Math.max(2, r * .36), 0, TAU); ctx.fill();
    ctx.fillStyle = e.coreColor;
    ctx.fillRect(-2, -2, 4, 4);
  }

  function drawBossBody(ctx, e, t) {
    const body = e.hitFlash > 0 ? '#fff' : e.color;
    const light = e.hitFlash > 0 ? '#fff' : e.light;
    const dark = e.dark;
    const core = e.coreColor;
    const kind = e.bossKind || 'siege';

    if (kind === 'hive') {
      // organic brood carrier: pods, legs, a wet central sac
      ctx.strokeStyle = dark; ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        const y = -24 + i * 24;
        ctx.beginPath(); ctx.moveTo(-24, y); ctx.lineTo(-42, y - 8); ctx.lineTo(-50, y + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(42, y - 8); ctx.lineTo(50, y + 4); ctx.stroke();
      }
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, 2, 31, 47, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 2, 26, 41, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = hexA(light, .45); ctx.beginPath(); ctx.ellipse(-7, -10, 10, 23, -.2, 0, TAU); ctx.fill();
      for (const [x, y, r] of [[-27, -22, 9], [27, -22, 9], [-28, 18, 10], [28, 18, 10]]) {
        ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill();
        ctx.fillStyle = core; ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      // maw
      ctx.fillStyle = '#100a0b'; ctx.beginPath(); ctx.ellipse(0, -38, 15, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = light; for (let i = -2; i <= 2; i++) ctx.fillRect(i * 5 - 1, -42, 2, 6);
      drawBossCore(ctx, e, t, 12);
    } else if (kind === 'cryo') {
      // hexagonal ice bastion with crystal spikes
      const pts = [];
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; pts.push([Math.cos(a) * 42, Math.sin(a) * 42]); }
      ctx.fillStyle = dark; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); pts.forEach(([x, y], i) => { const k = .82; i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k); }); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = light; ctx.globalAlpha = .5; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + Math.PI / 6;
        ctx.save(); ctx.rotate(a); ctx.fillStyle = hexA('#c8f4ff', .7); ctx.beginPath(); ctx.moveTo(0, -39); ctx.lineTo(-6, -54); ctx.lineTo(6, -54); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      drawBossCore(ctx, e, t, 13);
    } else if (kind === 'dread') {
      // long broadside battleship
      ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(30, -30); ctx.lineTo(27, 44); ctx.lineTo(-27, 44); ctx.lineTo(-30, -30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(0, -49); ctx.lineTo(24, -27); ctx.lineTo(21, 38); ctx.lineTo(-21, 38); ctx.lineTo(-24, -27); ctx.closePath(); ctx.fill();
      ctx.fillStyle = hexA(light, .35); ctx.fillRect(-18, -28, 36, 4);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = dark; ctx.fillRect(side * 23 - 7, -18 + i * 16, 14, 11);
          ctx.fillStyle = core; ctx.globalAlpha = .7; ctx.fillRect(side * 23 - 2, -15 + i * 16, 4, 3); ctx.globalAlpha = 1;
        }
      }
      ctx.fillStyle = '#17100f'; ctx.fillRect(-9, 27, 18, 18);
      drawBossCore(ctx, e, t, 10);
    } else if (kind === 'burrower') {
      // segmented drill worm, front is -y
      for (let i = 0; i < 6; i++) {
        const y = 34 - i * 13, r = 25 - i * 2.2;
        ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, y, r + 3, 0, TAU); ctx.fill();
        ctx.fillStyle = i % 2 ? body : hexA(body, .7); ctx.beginPath(); ctx.arc(0, y, r, 0, TAU); ctx.fill();
        if (i < 5) { ctx.fillStyle = light; ctx.fillRect(-r * .45, y - 2, r * .9, 2); }
      }
      ctx.fillStyle = '#17100b'; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(24, -22); ctx.lineTo(-24, -22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(15, -24); ctx.lineTo(-15, -24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = core; ctx.fillRect(-2, -43, 4, 14);
      drawBossCore(ctx, e, t, 8);
    } else if (kind === 'skycarrier') {
      // flight deck with runway and island
      ctx.fillStyle = dark; ctx.fillRect(-35, -46, 70, 92);
      ctx.fillStyle = body; ctx.fillRect(-31, -42, 62, 84);
      ctx.fillStyle = hexA(light, .25); ctx.fillRect(-26, -38, 52, 4);
      ctx.fillStyle = '#15181a'; ctx.fillRect(-5, -30, 10, 58);
      ctx.fillStyle = hexA(core, .5); for (let i = 0; i < 5; i++) ctx.fillRect(-2, -24 + i * 11, 4, 6);
      ctx.fillStyle = dark; ctx.fillRect(21, -28, 10, 34);
      ctx.fillStyle = light; ctx.fillRect(23, -25, 6, 3);
      for (const side of [-1, 1]) {
        ctx.fillStyle = dark; ctx.fillRect(side * 30 - 8, 26, 16, 12);
        ctx.fillStyle = hexA(core, .6); ctx.fillRect(side * 30 - 3, 29, 6, 3);
      }
      drawBossCore(ctx, e, t, 9);
    } else if (kind === 'xenarch') {
      // alien diamond and orbital rings
      ctx.save(); ctx.rotate(t * .35);
      ctx.strokeStyle = hexA(light, .55); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 22, .3, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 23, 38, -.3, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(27, 0); ctx.lineTo(0, 42); ctx.lineTo(-27, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(21, 0); ctx.lineTo(0, 35); ctx.lineTo(-21, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = light; ctx.fillRect(-2, -29, 4, 58);
      drawBossCore(ctx, e, t, 12);
    } else if (kind === 'sentinel') {
      // rotating dome armor around a bright eye
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, 0, 45, 0, TAU); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill();
      ctx.save(); ctx.rotate(t * .55);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(TAU / 4); ctx.fillStyle = i % 2 ? hexA(light, .35) : dark;
        ctx.beginPath(); ctx.arc(0, 0, 39, -.32, .32); ctx.lineTo(27, 0); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = hexA(core, .55); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 31, 0, TAU); ctx.stroke();
      drawBossCore(ctx, e, t, 12);
    } else if (kind === 'skyfortress') {
      // floating square citadel with corner turrets
      ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-42, -42); ctx.lineTo(42, -42); ctx.lineTo(48, -30); ctx.lineTo(48, 32); ctx.lineTo(36, 42); ctx.lineTo(-36, 42); ctx.lineTo(-48, 30); ctx.lineTo(-48, -32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-36, -36); ctx.lineTo(36, -36); ctx.lineTo(40, -26); ctx.lineTo(40, 27); ctx.lineTo(31, 36); ctx.lineTo(-31, 36); ctx.lineTo(-40, 27); ctx.lineTo(-40, -26); ctx.closePath(); ctx.fill();
      for (const [x, y] of [[-33, -29], [33, -29], [-33, 29], [33, 29]]) {
        ctx.fillStyle = dark; ctx.fillRect(x - 7, y - 7, 14, 14);
        ctx.fillStyle = core; ctx.globalAlpha = .65; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#15191a'; ctx.fillRect(-10, -12, 20, 24);
      drawBossCore(ctx, e, t, 9);
    } else if (kind === 'leviathan') {
      // tentacled abyss beast
      ctx.strokeStyle = dark; ctx.lineWidth = 6;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU, r0 = 25;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.quadraticCurveTo(Math.cos(a + .4) * 46, Math.sin(a + .4) * 46, Math.cos(a + .1) * 58, Math.sin(a + .1) * 58); ctx.stroke();
      }
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, 0, 39, 32, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 32, 26, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = light; ctx.globalAlpha = .38; ctx.beginPath(); ctx.ellipse(-8, -8, 12, 9, -.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      drawBossCore(ctx, e, t, 11);
    } else if (kind === 'seraph') {
      // solar entity with wing orbs
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.strokeStyle = hexA(light, .6); ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(side * 12, -5 + i * 9); ctx.quadraticCurveTo(side * 35, -25 + i * 13, side * 54, -5 + i * 20); ctx.stroke();
          ctx.fillStyle = core; ctx.beginPath(); ctx.arc(side * 48, -1 + i * 19, 4, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill();
      drawBossCore(ctx, e, t, 17);
    } else if (kind === 'warlord') {
      // command tank with banners and side pods
      ctx.fillStyle = '#090b0a'; ctx.fillRect(-45, -38, 14, 78); ctx.fillRect(31, -38, 14, 78);
      ctx.fillStyle = body; ctx.fillRect(-28, -44, 56, 88);
      ctx.fillStyle = dark; ctx.fillRect(-23, -38, 46, 70);
      ctx.fillStyle = light; ctx.fillRect(-21, -34, 42, 3);
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#1a0d0d'; ctx.fillRect(side * 37 - 8, -18, 16, 36);
        ctx.fillStyle = core; ctx.globalAlpha = .7; ctx.fillRect(side * 37 - 2, -13, 4, 4); ctx.globalAlpha = 1;
        ctx.strokeStyle = core; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(side * 40, -30); ctx.lineTo(side * 40, -55); ctx.stroke();
        ctx.fillStyle = '#e9b35a'; ctx.beginPath(); ctx.moveTo(side * 40, -55); ctx.lineTo(side * 40 + side * 13, -50); ctx.lineTo(side * 40, -44); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#120c0d'; ctx.fillRect(-13, 24, 26, 15);
      drawBossCore(ctx, e, t, 12);
    } else {
      // siege titan, the original furnace pattern
      ctx.fillStyle = '#090b0a'; ctx.fillRect(-45, -44, 15, 88); ctx.fillRect(30, -44, 15, 88);
      ctx.fillStyle = '#2a1c1c'; ctx.fillRect(-42, -41, 10, 82); ctx.fillRect(32, -41, 10, 82);
      for (let y = -38; y < 38; y += 7) { ctx.fillStyle = y % 14 === 0 ? '#6a4b3f' : '#1b1413'; ctx.fillRect(-42, y, 10, 3); ctx.fillRect(32, y, 10, 3); }
      ctx.fillStyle = '#080b09'; ctx.fillRect(-31, -40, 62, 80);
      ctx.fillStyle = body; ctx.fillRect(-25, -37, 50, 76);
      ctx.fillStyle = light; ctx.fillRect(-23, -36, 46, 3);
      ctx.fillStyle = '#201417'; ctx.fillRect(-23, 26, 46, 9);
      ctx.fillStyle = '#d1a272'; ctx.fillRect(-18, -46, 5, 7); ctx.fillRect(13, -46, 5, 7); ctx.fillRect(-4, -47, 8, 8);
      for (const side of [-1, 1]) { ctx.fillStyle = '#120c0d'; ctx.fillRect(side * 37 - 8, -14, 16, 30); ctx.fillStyle = '#4e3236'; ctx.fillRect(side * 37 - 6, -12, 12, 24); }
      drawBossCore(ctx, e, t, 10);
    }
  }

  function drawBoss(ctx, e, t) {
    const core = e.coreColor;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(core, .28); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, 60 + Math.sin(t * 3) * 3, 0, TAU); ctx.stroke();
    ctx.fillStyle = hexA(core, .045);
    ctx.beginPath(); ctx.arc(e.x, e.y, 64, 0, TAU); ctx.fill();
    ctx.restore();
    drawTankShadow(ctx, e.x, e.y, 4.8);
    const s = e.bossScale || 1.45;
    const lift = e.domain === 'air' ? 18 : e.domain === 'hover' ? 8 : 0;
    const bossArt = artImage('boss');
    if (bossArt) {
      const artSize = 180 * s / 1.45;
      // The baked cannon follows the faster turret aim so it stays on the player.
      drawSpriteArt(ctx, bossArt, e.x, e.y - lift, artSize, e.turretAngle + Math.PI / 2, e.hitFlash > 0);
    } else {
      ctx.save();
      ctx.translate(e.x, e.y - lift);
      ctx.rotate(e.bodyAngle + Math.PI / 2);
      ctx.scale(s, s);
      drawBossBody(ctx, e, t);
      ctx.restore();
    }
    // some bosses expose an independently rotating main turret
    if (!bossArt && (e.bossKind === 'siege' || e.bossKind === 'dread' || e.bossKind === 'warlord' || e.bossKind === 'sentinel')) {
      ctx.save();
      ctx.translate(e.x, e.y - lift);
      ctx.rotate(e.turretAngle);
      ctx.scale(s, s);
      ctx.fillStyle = '#080a09'; ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = hexA(core, .55); ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#15100f'; ctx.fillRect(0, -8, 39, 5);
      ctx.fillStyle = e.light; ctx.fillRect(0, -7, 34, 2);
      ctx.fillStyle = core; ctx.fillRect(37, -8, 3, 3);
      ctx.restore();
    }
    const labelY = Math.max(8, e.y - lift - 76);
    const label = e.bossTag || 'SIEGE // TITAN';
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,7,.92)';
    ctx.fillRect(e.x - 64, labelY, 128, 14);
    ctx.strokeStyle = hexA(core, .75); ctx.lineWidth = 1;
    ctx.strokeRect(e.x - 64.5, labelY - .5, 129, 15);
    ctx.fillStyle = core; ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, e.x, labelY + 10);
    ctx.fillStyle = hexA(core, .9);
    ctx.beginPath(); ctx.moveTo(e.x - 5, labelY + 16); ctx.lineTo(e.x + 5, labelY + 16); ctx.lineTo(e.x, labelY + 22); ctx.closePath(); ctx.fill();
    ctx.restore();
    // core bloom in screen space
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(e.x, e.y - lift, 2, e.x, e.y - lift, 55);
    g.addColorStop(0, hexA(core, .2)); g.addColorStop(1, hexA(core, 0));
    ctx.fillStyle = g; ctx.fillRect(e.x - 60, e.y - lift - 60, 120, 120);
    ctx.restore();
  }

  function drawAirEnemy(e, t, drawCtx) {
    const ctx = drawCtx || gameCtx;
    const s = e.size || 1;
    const lift = 13 + Math.sin(t * 3 + e.id * .7) * 2;
    drawTankShadow(ctx, e.x, e.y + 2, s * .82);
    const body = e.hitFlash > 0 ? '#fff' : e.color;
    const light = e.hitFlash > 0 ? '#fff' : e.light;
    const dark = e.dark;
    const core = e.coreColor;

    ctx.save();
    ctx.translate(e.x, e.y - lift);
    ctx.rotate(e.bodyAngle + Math.PI / 2);
    ctx.lineWidth = 1;

    const airKey = {
      drone: 'enemyDrone', strafer: 'enemyStrafer', skybomber: 'enemySkybomber', gunship: 'enemyGunship'
    }[e.type];
    const airArt = airKey ? artImage(airKey) : null;
    if (airArt) {
      const ds = Math.round(e.radius * 5.8);
      if (e.hitFlash > 0) ctx.filter = 'brightness(1.9) saturate(.8)';
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(airArt, -ds / 2, -ds / 2, ds, ds);
      ctx.filter = 'none';
    } else if (e.type === 'drone') {
      // four rotor pods, one central recon body
      ctx.fillStyle = dark;
      for (const [ox, oy] of [[-17, -15], [17, -15], [-17, 15], [17, 15]]) {
        ctx.fillRect(ox - 2, oy - 2, 4, 4);
        ctx.beginPath(); ctx.arc(ox, oy, 7 * s, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = body;
      ctx.fillRect(-9 * s, -7 * s, 18 * s, 14 * s);
      ctx.fillStyle = light;
      ctx.fillRect(-7 * s, -5 * s, 14 * s, 2 * s);
      ctx.fillStyle = core;
      ctx.fillRect(-2 * s, -2 * s, 4 * s, 4 * s);
      ctx.fillStyle = '#07100d';
      ctx.fillRect(-5 * s, 2 * s, 10 * s, 5 * s);
      ctx.strokeStyle = hexA(light, .55);
      for (const [ox, oy] of [[-17, -15], [17, -15], [-17, 15], [17, 15]]) {
        ctx.beginPath(); ctx.arc(ox, oy, 4.5 * s, t * 9, t * 9 + 1.4); ctx.stroke();
      }
    } else if (e.type === 'strafer') {
      // swept-wing dive fighter
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(0, -19 * s); ctx.lineTo(24 * s, 12 * s); ctx.lineTo(7 * s, 9 * s); ctx.lineTo(0, 17 * s); ctx.lineTo(-7 * s, 9 * s); ctx.lineTo(-24 * s, 12 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(0, -16 * s); ctx.lineTo(18 * s, 9 * s); ctx.lineTo(4 * s, 6 * s); ctx.lineTo(0, 14 * s); ctx.lineTo(-4 * s, 6 * s); ctx.lineTo(-18 * s, 9 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = light; ctx.fillRect(-2 * s, -13 * s, 4 * s, 17 * s);
      ctx.fillStyle = core; ctx.fillRect(-1 * s, 9 * s, 2 * s, 5 * s);
      ctx.fillStyle = '#07100d'; ctx.fillRect(-11 * s, -1 * s, 3 * s, 9 * s); ctx.fillRect(8 * s, -1 * s, 3 * s, 9 * s);
    } else if (e.type === 'skybomber') {
      // broad strategic bomber
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(0, -24 * s); ctx.lineTo(31 * s, 4 * s); ctx.lineTo(17 * s, 10 * s); ctx.lineTo(0, 18 * s); ctx.lineTo(-17 * s, 10 * s); ctx.lineTo(-31 * s, 4 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(0, -21 * s); ctx.lineTo(25 * s, 4 * s); ctx.lineTo(12 * s, 7 * s); ctx.lineTo(0, 15 * s); ctx.lineTo(-12 * s, 7 * s); ctx.lineTo(-25 * s, 4 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = light; ctx.fillRect(-3 * s, -17 * s, 6 * s, 26 * s);
      ctx.fillStyle = core;
      for (const [ox, oy] of [[-19, 1], [19, 1], [-13, 7], [13, 7]]) ctx.fillRect(ox - 2, oy - 2, 4, 4);
      ctx.fillStyle = '#07100d'; ctx.fillRect(-8 * s, 10 * s, 16 * s, 6 * s);
    } else {
      // gunship: wide hull + side engine pods
      ctx.fillStyle = dark;
      ctx.fillRect(-25 * s, -16 * s, 50 * s, 32 * s);
      ctx.fillStyle = body;
      ctx.fillRect(-21 * s, -13 * s, 42 * s, 26 * s);
      ctx.fillStyle = light; ctx.fillRect(-18 * s, -11 * s, 36 * s, 3 * s);
      for (const side of [-1, 1]) {
        ctx.fillStyle = dark; ctx.fillRect(side * 19 * s - 7 * s, -6 * s, 14 * s, 12 * s);
        ctx.fillStyle = core; ctx.fillRect(side * 19 * s - 3 * s, -2 * s, 6 * s, 4 * s);
        ctx.fillStyle = '#07100d'; ctx.fillRect(side * 14 * s - 2 * s, 8 * s, 4 * s, 8 * s);
      }
      ctx.fillStyle = core; ctx.fillRect(-2 * s, -2 * s, 4 * s, 4 * s);
    }
    ctx.restore();

    // altitude cue: a tiny underbelly light and a faint vertical line to the shadow.
    ctx.save();
    ctx.globalAlpha = .2;
    ctx.strokeStyle = hexA(core, .8); ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(e.x, e.y - lift + 12); ctx.lineTo(e.x, e.y + 3); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = hexA(core, .85); ctx.fillRect(e.x - 1, e.y - lift + 8, 2, 2);
    ctx.restore();
  }

  function drawXenoEnemy(e, t, drawCtx) {
    const ctx = drawCtx || gameCtx;
    const s = e.size || 1;
    const lift = 6 + Math.sin(t * 2 + e.id) * 1.5;
    drawTankShadow(ctx, e.x, e.y + 3, s * .75);
    const body = e.hitFlash > 0 ? '#fff' : e.color;
    const light = e.hitFlash > 0 ? '#fff' : e.light;
    const dark = e.dark;
    const core = e.coreColor;

    ctx.save();
    ctx.translate(e.x, e.y - lift);
    ctx.rotate(e.bodyAngle + Math.PI / 2);
    const xenoKey = {
      saucer: 'enemySaucer', beamfrigate: 'enemyBeamfrigate', warper: 'enemyWarper', warden: 'enemyWarden'
    }[e.type];
    const xenoArt = xenoKey ? artImage(xenoKey) : null;
    if (xenoArt) {
      const ds = Math.round(e.radius * 5.8);
      if (e.hitFlash > 0) ctx.filter = 'brightness(1.9) saturate(.8)';
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(xenoArt, -ds / 2, -ds / 2, ds, ds);
      ctx.filter = 'none';
    } else if (e.type === 'saucer') {
      ctx.save(); ctx.rotate(t * .55 * e.orbitDir);
      ctx.strokeStyle = hexA(light, .7); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 23 * s, 12 * s, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = hexA(core, .5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, 17 * s, 8 * s, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = hexA(core, .18); ctx.beginPath(); ctx.ellipse(0, 0, 19 * s, 9 * s, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.fillStyle = core; ctx.fillRect(Math.cos(a) * 19 * s - 1, Math.sin(a) * 11 * s - 1, 2, 2); }
      ctx.restore();
      ctx.fillStyle = body; ctx.fillRect(-8 * s, -5 * s, 16 * s, 10 * s);
      ctx.fillStyle = light; ctx.fillRect(-5 * s, -4 * s, 10 * s, 2 * s);
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, 4 * s, 0, TAU); ctx.fill();
    } else if (e.type === 'warper') {
      ctx.save(); ctx.rotate(t * 1.1 * e.orbitDir);
      ctx.strokeStyle = hexA(light, .75); ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(0, 0, (18 + i * 7) * s, i * 1.2, i * 1.2 + 2.3); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = body; ctx.fillRect(-8 * s, -11 * s, 16 * s, 22 * s);
      ctx.fillStyle = light; ctx.fillRect(-5 * s, -9 * s, 10 * s, 2 * s);
      ctx.fillStyle = core; ctx.fillRect(-3 * s, -3 * s, 6 * s, 6 * s);
      ctx.globalAlpha = .35 + Math.sin(t * 8 + e.id) * .2;
      ctx.fillStyle = core; ctx.fillRect(-12 * s, 8 * s, 3, 3); ctx.fillRect(9 * s, -12 * s, 3, 3);
    } else if (e.type === 'warden') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexA(core, .08 + Math.sin(t * 2) * .03);
      ctx.beginPath(); ctx.arc(0, 0, 27 * s, 0, TAU); ctx.fill();
      ctx.strokeStyle = hexA(light, .55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 25 * s, 0, TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .2; ctx.fillStyle = hexA(core, .75); ctx.fillRect(Math.cos(a) * 20 * s - 1, Math.sin(a) * 20 * s - 1, 2, 2); }
      ctx.restore();
      ctx.fillStyle = body; ctx.fillRect(-10 * s, -8 * s, 20 * s, 16 * s);
      ctx.fillStyle = light; ctx.fillRect(-7 * s, -6 * s, 14 * s, 2 * s);
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, 5 * s, 0, TAU); ctx.fill();
    } else {
      // beam frigate: long alien lance
      ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(0, -26 * s); ctx.lineTo(16 * s, 4 * s); ctx.lineTo(8 * s, 14 * s); ctx.lineTo(0, 20 * s); ctx.lineTo(-8 * s, 14 * s); ctx.lineTo(-16 * s, 4 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(0, -22 * s); ctx.lineTo(11 * s, 3 * s); ctx.lineTo(5 * s, 11 * s); ctx.lineTo(0, 17 * s); ctx.lineTo(-5 * s, 11 * s); ctx.lineTo(-11 * s, 3 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = light; ctx.fillRect(-2 * s, -18 * s, 4 * s, 22 * s);
      ctx.fillStyle = core; ctx.fillRect(-3 * s, -28 * s, 6 * s, 7 * s);
      ctx.fillStyle = hexA(core, .6); ctx.fillRect(-1 * s, -31 * s, 2 * s, 4 * s);
    }
    ctx.restore();
    // xeno core bloom
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(e.x, e.y - lift, 1, e.x, e.y - lift, 18 * s);
    g.addColorStop(0, hexA(core, .25)); g.addColorStop(1, hexA(core, 0));
    ctx.fillStyle = g; ctx.fillRect(e.x - 20 * s, e.y - lift - 20 * s, 40 * s, 40 * s);
    ctx.restore();
  }

  function groundEnemyArt(e) {
    // Seal guards carry a specific chassis identity; keep their procedural hull.
    if (e.sealTankId) return null;
    const fullKey = {
      scout: 'enemyScout', grunt: 'enemyGrunt', heavy: 'enemyHeavy',
      bomber: 'enemyBomber', sniper: 'enemySniper', elite: 'enemyElite',
      mortar: 'enemyMortar', bulwark: 'enemyBulwark', minelayer: 'enemyMinelayer',
      splitter: 'enemySplitter', scrap: 'enemyScrap'
    }[e.type];
    const hullKey = {
      scout: 'enemyScoutHull', grunt: 'enemyGruntHull', heavy: 'enemyHeavyHull',
      sniper: 'enemySniperHull'
    }[e.type];
    if (hullKey) {
      const hull = artImage(hullKey);
      // Enemy turret crops from the single-sprite sheets carry too much hull noise.
      // Keep the control crisp: AI hull + procedural turret that owns the aim angle.
      if (hull) return { img: hull, split: true, turret: null };
    }
    const img = fullKey ? artImage(fullKey) : null;
    // Mortar / elite / scrap already contain their gun in the AI sheet. Drawing a
    // procedural turret on top produced a second barrel, so rotate the complete
    // sprite instead and let it own the aim direction.
    const aimWithTurret = e.type === 'mortar' || e.type === 'elite' || e.type === 'scrap';
    return img ? { img, split: false, aimWithTurret } : null;
  }

  function drawGroundEnemyTurret(e) {
    const ctx = gameCtx;
    const colors = {
      body: e.hitFlash > 0 ? '#ffffff' : e.color,
      light: e.hitFlash > 0 ? '#ffffff' : e.light,
      dark: e.dark, core: e.coreColor
    };
    const size = e.radius / 11.5;
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    drawTurretLocal(ctx, e.turretAngle, colors, size, {
      recoil: e.recoil, heavy: e.type === 'heavy', elite: e.elite,
      enemyType: e.type,
      barrelLen: e.type === 'sniper' ? 23 : e.elite ? 21 : e.type === 'heavy' ? 18 : 16,
      barrelWide: e.type === 'heavy' || e.elite,
      twin: e.elite
    });
    ctx.restore();
  }

  function drawGroundEnemyArt(e, t) {
    const art = groundEnemyArt(e);
    if (!art) return false;
    const size = e.radius * 4.6;
    drawTankShadow(gameCtx, e.x, e.y, e.radius / 14);
    const bodyAngle = art.aimWithTurret ? e.turretAngle : e.bodyAngle;
    drawSpriteArt(gameCtx, art.img, e.x, e.y, size, bodyAngle + Math.PI / 2, e.hitFlash > 0);
    if (art.turret) {
      const recoil = Math.max(0, e.recoil || 0) * 2.2;
      drawSpriteArt(
        gameCtx, art.turret,
        e.x - Math.cos(e.turretAngle) * recoil,
        e.y - Math.sin(e.turretAngle) * recoil,
        size, e.turretAngle + Math.PI / 2, e.hitFlash > 0, false
      );
    } else if (art.split) {
      drawGroundEnemyTurret(e);
    }
    return true;
  }

  function drawEmpArcs(e, t) {
    if (!(e.empTimer > 0)) return;
    const ctx = gameCtx;
    const r = (e.radius || 14) * (e.size || 1) + 6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = t * 7 + i * 2.1;
      ctx.strokeStyle = i === 0 ? 'rgba(217,251,255,.9)' : 'rgba(111,216,255,.45)';
      ctx.lineWidth = i === 0 ? 1.2 : .8;
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const aa = a + j * .38;
        const rr = r * (0.55 + .12 * j);
        const x = e.x + Math.cos(aa) * rr;
        const y = e.y + Math.sin(aa) * rr;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(217,251,255,.85)';
    for (let i = 0; i < 4; i++) {
      const a = -t * 5 + i * 1.57;
      ctx.fillRect(e.x + Math.cos(a) * r - 1, e.y + Math.sin(a) * r - 1, 2, 2);
    }
    ctx.restore();
  }

  function drawEnemy(e, t) {
    const ctx = gameCtx;
    if (e.spawnTimer > 0) {
      const k = 1 - e.spawnTimer / e.spawnTotal;
      ctx.save();
      ctx.globalAlpha = .3 + k * .7;
      ctx.strokeStyle = hexA(e.coreColor, .7); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, 15 + (1 - k) * 18, 0, TAU); ctx.stroke();
      ctx.fillStyle = hexA(e.coreColor, .15); ctx.beginPath(); ctx.arc(e.x, e.y, 12 + k * 4, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    if (e.boss) { drawBoss(ctx, e, t); return; }
    if (e.domain === 'air') { drawAirEnemy(e, t); return; }
    if (e.domain === 'hover') { drawXenoEnemy(e, t); return; }
    const size = e.size;
    // hostile grounding ring keeps small silhouettes legible in a swarm
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = e.elite ? 'rgba(255,181,45,.38)' : 'rgba(255,88,72,.24)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, (e.elite ? 20 : 14) * size, (e.elite ? 12 : 8) * size, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = e.elite ? 'rgba(255,181,45,.035)' : 'rgba(255,88,72,.025)';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, (e.elite ? 20 : 14) * size, (e.elite ? 12 : 8) * size, 0, 0, TAU); ctx.fill();
    ctx.restore();
    const artEnemy = drawGroundEnemyArt(e, t);
    if (!artEnemy) {
      const colors = {
        body: e.hitFlash > 0 ? '#ffffff' : e.color,
        light: e.hitFlash > 0 ? '#ffffff' : e.light,
        dark: e.dark, core: e.coreColor
      };
      drawTankAt(ctx, e.x, e.y, e.bodyAngle, e.turretAngle, colors, size, e.trackPhase, {
        recoil: e.recoil, heavy: e.type === 'heavy', elite: e.elite, bomber: e.type === 'bomber', enemyType: e.type,
        barrelLen: e.type === 'sniper' ? 23 : e.elite ? 21 : 16,
        barrelWide: e.type === 'heavy' || e.elite,
        twin: e.elite
      });
    }
    if (e.freeze > 0) {
      ctx.save();
      ctx.globalAlpha = .3;
      ctx.fillStyle = '#a8f0ff';
      ctx.fillRect(e.x - 14 * size, e.y - 14 * size, 28 * size, 28 * size);
      ctx.fillStyle = '#e8ffff';
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + e.freeze * 2;
        ctx.fillRect(e.x + Math.cos(a) * 13, e.y + Math.sin(a) * 13, 2, 2);
      }
      ctx.restore();
    }
    if (e.elite) {
      const sealBoss = !!e.sealTankId;
      const w = sealBoss ? 116 : 76;
      // Pulsing command ring: an elite must read as an event, not a recolored grunt.
      const pulse = .5 + .5 * Math.sin(t * 5 + e.id);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = sealBoss ? `rgba(95,240,206,${.25 + pulse * .28})` : `rgba(255,181,45,${.25 + pulse * .3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, 23 + pulse * 3, 0, TAU); ctx.stroke();
      ctx.restore();
      // mini-boss nameplate, kept above the swarm
      ctx.fillStyle = 'rgba(4,8,7,.88)'; ctx.fillRect(e.x - w / 2, e.y - 50, w, 11);
      ctx.strokeStyle = sealBoss ? 'rgba(95,240,206,.65)' : 'rgba(255,181,45,.55)'; ctx.lineWidth = 1; ctx.strokeRect(e.x - w / 2 + .5, e.y - 49.5, w - 1, 10);
      ctx.fillStyle = sealBoss ? '#8fffe6' : '#ffd176'; ctx.font = '7px Silkscreen, monospace'; ctx.textAlign = 'center';
      ctx.fillText(sealBoss ? `封印守卫 · ${e.sealLabel || ''}` : '精英', e.x, e.y - 42);
      ctx.fillStyle = 'rgba(5,9,7,.9)'; ctx.fillRect(e.x - w / 2, e.y - 36, w, 5);
      ctx.fillStyle = '#ffb52d'; ctx.fillRect(e.x - w / 2 + 1, e.y - 35, (w - 2) * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
    if (e.hitFlash > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = e.hitFlash * .6;
      ctx.fillStyle = '#fff'; ctx.fillRect(e.x - 13, e.y - 13, 26, 26); ctx.restore();
    }
  }

  function drawPlayer(t, p) {
    if (!p || !p.alive) return;
    const ctx = gameCtx;
    const accent = p.index === 1 ? '#ffb52d' : '#5ff0ce';
    if (p.downed) {
      ctx.save();
      drawTankShadow(ctx, p.x, p.y, 1.1);
      ctx.globalAlpha = .55;
      const downedColors = { body: '#3a2520', light: '#8f6a53', dark: '#160d0a', core: '#ff6858' };
      if (!drawPlayerArt(p, downedColors, false)) drawTankAt(ctx, p.x, p.y, p.bodyAngle, p.turretAngle, downedColors, 1.08, p.trackPhase, { recoil: 0, barrelLen: 21, player: true });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,88,74,.55)'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]); ctx.lineDashOffset = t * 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, 24 + Math.sin(t * 3) * 2, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(4,8,7,.82)'; ctx.fillRect(p.x - 22, p.y - 39, 44, 11);
      ctx.fillStyle = '#ff6858'; ctx.font = '6px Silkscreen, monospace'; ctx.textAlign = 'center';
      ctx.fillText(`P${p.index + 1} 倒地`, p.x, p.y - 31);
      if (p.reviveProgress > 0) {
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(p.x - 18, p.y - 25, 36, 2);
        ctx.fillStyle = '#5ff0ce'; ctx.fillRect(p.x - 18, p.y - 25, 36 * clamp(p.reviveProgress / 2.4, 0, 1), 2);
      }
      ctx.restore();
      return;
    }
    // friendly locator ring keeps the pilot readable in a busy swarm
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 42);
    lg.addColorStop(0, 'rgba(95,240,206,.13)');
    lg.addColorStop(.55, 'rgba(95,240,206,.045)');
    lg.addColorStop(1, 'rgba(95,240,206,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(p.x, p.y, 42, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(95,240,206,.42)'; ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 10;
    ctx.beginPath(); ctx.arc(p.x, p.y, 20 + Math.sin(t * 3) * 1.2, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(95,240,206,.72)';
    ctx.fillRect(p.x - 14, p.y - 25, 4, 1); ctx.fillRect(p.x + 10, p.y - 25, 4, 1);
    ctx.fillRect(p.x - 14, p.y - 27, 1, 3); ctx.fillRect(p.x + 13, p.y - 27, 1, 3);
    const marker = .65 + Math.sin(t * 4) * .22;
    ctx.fillStyle = `rgba(95,240,206,${marker})`;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 31); ctx.lineTo(p.x + 4, p.y - 27); ctx.lineTo(p.x, p.y - 23); ctx.lineTo(p.x - 4, p.y - 27); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(3,10,8,.85)'; ctx.fillRect(p.x - 1, p.y - 28, 2, 2);
    ctx.restore();
    ctx.save();
    ctx.font = '6px Silkscreen, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(3,10,8,.82)'; ctx.fillRect(p.x - 11, p.y - 40, 22, 9);
    ctx.fillStyle = accent; ctx.fillText(p.label, p.x, p.y - 33);
    ctx.restore();
    if (p.dashTimer > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = .12 / i;
        ctx.fillStyle = '#5ff0ce';
        ctx.fillRect(p.x - 18 - i * 8, p.y - 8, 26, 16);
      }
      ctx.restore();
    }
    const blink = p.invincible > 0 && Math.floor(t * 18) % 2 === 0;
    if (blink) ctx.globalAlpha = .45;
    const colors = {
      body: p.hitFlash > 0 ? '#fff' : p.bodyColor,
      light: p.hitFlash > 0 ? '#fff' : p.bodyLight,
      dark: p.bodyDark, core: p.coreColor
    };
    if (p.moving) {
      const ex = p.x - Math.cos(p.bodyAngle) * 15, ey = p.y - Math.sin(p.bodyAngle) * 15;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, 13);
      eg.addColorStop(0, 'rgba(95,240,206,.34)'); eg.addColorStop(1, 'rgba(95,240,206,0)');
      ctx.fillStyle = eg; ctx.fillRect(ex - 13, ey - 13, 26, 26);
      ctx.restore();
    }
    const tankId = p.tankId || G.tankId;
    if (!drawPlayerArt(p, colors)) {
      drawTankAt(ctx, p.x, p.y, p.bodyAngle, p.turretAngle, colors, 1.12, p.trackPhase, {
        recoil: p.recoil, barrelLen: tankId === 'railgun' ? 27 : tankId === 'twin' ? 19 : 21,
        barrelWide: weaponsFor(p).cannon >= 4, twin: weaponsFor(p).cannon >= 6 || tankId === 'twin',
        heavy: tankId === 'bastion' || tankId === 'juggernaut', player: true
      });
    }
    ctx.globalAlpha = 1;
    // shield bubble
    if (p.shield > 0 || p.invincible > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = 24 + Math.sin(t * 4) * 1.5;
      ctx.strokeStyle = p.invincible > 0 ? hexA('#ffb52d', .55) : hexA('#5ff0ce', .45);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = hexA(p.invincible > 0 ? '#ffb52d' : '#5ff0ce', .045);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function drawBullets(t) {
    const ctx = gameCtx;
    const all = G.bullets.concat(G.enemyBullets);
    for (const b of all) {
      const isEnemy = b.enemy;
      const color = b.color || (isEnemy ? '#ff5a50' : '#ffd166');
      const trailLen = b.trail || 12;
      const ang = Math.atan2(b.vy, b.vx);
      const r = b.radius;
      const shape = b.shape || 'shell';
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      // restrained bloom: readable tracer, not a glowing blob
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.6);
      g.addColorStop(0, hexA(color, .32));
      g.addColorStop(.45, hexA(color, .13));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g; ctx.fillRect(-r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
      const grad = ctx.createLinearGradient(-r * .5, 0, -trailLen, 0);
      grad.addColorStop(0, hexA(color, .95));
      grad.addColorStop(.35, hexA(color, .42));
      grad.addColorStop(1, hexA(color, 0));
      ctx.strokeStyle = grad; ctx.lineWidth = Math.max(1, r * 1.05);
      ctx.beginPath(); ctx.moveTo(-r * .4, 0); ctx.lineTo(-trailLen, 0); ctx.stroke();
      // Distinct silhouettes, not just recolors: shell / siege / rail / orb / spore.
      ctx.globalCompositeOperation = 'source-over';
      if (shape === 'rail') {
        const len = Math.max(18, r * 9), w = Math.max(1.6, r * .7);
        ctx.fillStyle = 'rgba(5,8,7,.94)';
        ctx.fillRect(-len * .76 - 1, -w / 2 - 1, len + 2, w + 2);
        ctx.fillStyle = hexA(color, .55);
        ctx.fillRect(-len * .76, -w / 2, len, w);
        ctx.fillStyle = '#eef8ff';
        ctx.fillRect(len * .02, -w * .26, len * .3, w * .52);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(len * .18, -1, 2, 2);
      } else if (shape === 'heavy') {
        const w = Math.max(9, r * 3.4), h = Math.max(5, r * 1.9);
        ctx.fillStyle = 'rgba(5,8,7,.95)';
        ctx.fillRect(-w * .72 - 1, -h * .5 - 1, w + 2, h + 2);
        ctx.fillStyle = hexA(color, .6);
        ctx.fillRect(-w * .68, -h * .36, w * .35, h * .72);
        ctx.fillStyle = color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = 'rgba(5,8,7,.9)';
        ctx.fillRect(w * .06, -h * .3, w * .3, h * .6);
        ctx.fillStyle = hexA('#fff2c0', .95);
        ctx.fillRect(w * .11, -h * .18, w * .2, h * .36);
      } else if (shape === 'orb') {
        ctx.fillStyle = 'rgba(5,8,7,.9)';
        ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, TAU); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.08, 0, TAU); ctx.fill();
        ctx.fillStyle = hexA('#ffffff', .92);
        ctx.beginPath(); ctx.arc(r * .2, -r * .2, Math.max(1, r * .36), 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(color, .62); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, TAU); ctx.stroke();
      } else if (shape === 'blob') {
        const n = 8, rr = r * 1.65;
        const jag = (scale) => {
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const a = i / n * TAU, rad = rr * scale * (i % 2 ? .72 : 1);
            const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.closePath();
        };
        ctx.fillStyle = 'rgba(5,8,7,.9)'; jag(1); ctx.fill();
        ctx.fillStyle = color; jag(.78); ctx.fill();
        ctx.fillStyle = hexA('#ffffff', .8);
        ctx.beginPath(); ctx.arc(r * .15, -r * .15, Math.max(1, r * .28), 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(color, .5); ctx.lineWidth = 1; jag(.95); ctx.stroke();
      } else {
        // standard shell
        const w = Math.max(5, r * 2.7), h = Math.max(2.4, r * 1.35);
        ctx.fillStyle = 'rgba(5,8,7,.92)';
        ctx.fillRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
        ctx.fillStyle = color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = isEnemy ? '#ffd4ac' : '#fff3bb';
        ctx.fillRect(w * .12, -h * .26, w * .36, h * .52);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(w * .40, -1, 2, 2);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA('#ffffff', .7);
        ctx.fillRect(-w * .62, -1, 1, 2);
      }
      ctx.restore();
    }
  }

  function drawMineShape(ctx, m, t) {
    ctx.save(); ctx.translate(m.x, m.y);
    const blink = m.arm <= 0 ? .6 + Math.sin(t * 9 + m.seed) * .35 : .2;
    ctx.fillStyle = '#060a08'; ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = m.hostile ? '#6b2520' : '#7b6a31'; ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = m.hostile ? '#e05a44' : '#c8ab4b'; ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = '#1a1c15'; ctx.fillRect(-3, -3, 6, 6);
    ctx.fillStyle = hexA(m.hostile ? '#ff5b4a' : '#ffcf5a', blink); ctx.fillRect(-1, -1, 2, 2);
    ctx.fillStyle = '#0a0c09'; ctx.fillRect(-9, -1, 2, 2); ctx.fillRect(7, -1, 2, 2); ctx.fillRect(-1, -9, 2, 2); ctx.fillRect(-1, 7, 2, 2);
    ctx.restore();
  }

  function drawHazards(t) {
    const ctx = gameCtx;
    // flame and toxin pools
    for (const f of G.hazards) {
      const k = f.life / f.maxLife;
      const toxin = f.kind === 'toxin';
      const c0 = toxin ? '#d8ff9a' : '#fff1b0';
      const c1 = toxin ? '#8dd94e' : '#ff8a2b';
      const c2 = toxin ? '#2d5d22' : '#c52f1c';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const radius = f.radius * (1 + Math.sin(t * 7 + f.seed) * .08);
      const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, radius);
      g.addColorStop(0, hexA(c0, .5 * k));
      g.addColorStop(.25, hexA(c1, .42 * k));
      g.addColorStop(.7, hexA(c2, .16 * k));
      g.addColorStop(1, hexA(c2, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, radius, 0, TAU); ctx.fill();
      ctx.fillStyle = hexA(toxin ? '#baff7a' : '#ffcf6b', .55 * k);
      for (let i = 0; i < 3; i++) {
        const a = f.seed + i * 2.1 + t * 1.8;
        ctx.fillRect(f.x + Math.cos(a) * radius * .5, f.y + Math.sin(a) * radius * .4 - 2, 3, 3);
      }
      ctx.restore();
    }
    // gravity wells
    for (const v of G.vortices) {
      const k = clamp(v.life / v.maxLife, 0, 1);
      ctx.save(); ctx.translate(v.x, v.y);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, v.radius);
      g.addColorStop(0, hexA('#d9c7ff', .34 * k));
      g.addColorStop(.4, hexA('#9d76ff', .14 * k));
      g.addColorStop(1, hexA('#6b3dbb', 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, v.radius, 0, TAU); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const rr = v.radius * (.22 + i * .16);
        ctx.strokeStyle = hexA('#c7b2ff', (.32 - i * .05) * k); ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]); ctx.lineDashOffset = -t * (16 + i * 5);
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = hexA('#f2eaff', .7 * k); ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
    // deployed sentries
    for (const s of G.sentries) {
      if (s.hp <= 0) continue;
      // The faint dashed ring is the taunt radius, not a damage radius.
      ctx.save();
      ctx.strokeStyle = hexA('#8fffe6', .13); ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.tauntRadius || 160, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.save(); ctx.translate(s.x, s.y);
      ctx.fillStyle = 'rgba(4,10,8,.9)'; ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = s.hitFlash > 0 ? '#ffffff' : '#254a43'; ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = s.hitFlash > 0 ? '#ffffff' : '#8fffe6'; ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#07100d'; ctx.fillRect(-2, -2, 4, 4);
      ctx.rotate(s.angle || 0); ctx.fillStyle = '#c8fff5'; ctx.fillRect(4, -1, 11, 2);
      ctx.restore();
      ctx.fillStyle = 'rgba(5,10,8,.7)'; ctx.fillRect(s.x - 12, s.y - 17, 24, 3);
      ctx.fillStyle = (s.hp / s.maxHp) < .3 ? '#ff8a8d' : '#8fffe6';
      ctx.fillRect(s.x - 12, s.y - 17, 24 * clamp(s.hp / s.maxHp, 0, 1), 3);
    }
    // mines
    for (const m of G.mines) drawMineShape(ctx, m, t);
    // orbital warnings & beams
    for (const s of G.strikes) {
      if (s.state === 'warn') {
        const k = 1 - s.timer / s.delay;
        const color = s.color || '#b896ff';
        ctx.save();
        ctx.strokeStyle = hexA(color, .5 + Math.sin(t * 15) * .2); ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]); ctx.lineDashOffset = t * 20;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.radius * (1.2 - k * .2), 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = hexA(color, .22); ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, TAU); ctx.stroke();
        ctx.fillStyle = hexA(color, .06); ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, TAU); ctx.fill();
        ctx.fillStyle = hexA(color, .65); ctx.fillRect(s.x - 1, s.y - 12, 2, 24); ctx.fillRect(s.x - 12, s.y - 1, 24, 2);
        if (s.kind === 'rod') {
          const fall = clamp(1 - s.timer / s.delay, 0, 1);
          const drop = 190 * (1 - fall);
          ctx.strokeStyle = hexA('#dbe8ff', .25 + fall * .5); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(s.x, s.y - drop - 26); ctx.lineTo(s.x, s.y); ctx.stroke();
          ctx.fillStyle = hexA('#ffffff', .55 + fall * .35);
          ctx.fillRect(s.x - 1, s.y - drop - 42, 2, 42);
        }
        ctx.restore();
      }
    }
  }

  function drawEffects(t) {
    const ctx = gameCtx;
    const firstStageArt = !!G.arena;
    for (const fx of G.effects) {
      const k = fx.life / fx.maxLife;
      if (fx.type === 'explosion') {
        const r = fx.radius * (1.1 - k * .35);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(fx.x, fx.y, 1, fx.x, fx.y, r);
        g.addColorStop(0, `rgba(255,255,240,${.72 * k})`);
        g.addColorStop(.16, hexA(fx.color || '#ffb15a', .72 * k));
        g.addColorStop(.55, hexA(fx.color || '#ff5f2a', .26 * k));
        g.addColorStop(1, hexA(fx.color || '#ff5f2a', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA('#fff4d0', .35 * k); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, r * .8, 0, TAU); ctx.stroke();
        const explosionArt = firstStageArt ? artImage('vfxExplosion') : null;
        if (explosionArt) {
          const es = clamp(fx.radius * 2.15, 24, 220);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = clamp(k * 1.2, 0, 1);
          ctx.drawImage(explosionArt, fx.x - es / 2, fx.y - es / 2, es, es);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      } else if (fx.type === 'ring') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(fx.color, .5 * k); ctx.lineWidth = fx.width || 1;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius * (1 - k) + 4, 0, TAU); ctx.stroke();
        ctx.restore();
      } else if (fx.type === 'lightning') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass ? 'rgba(218,248,255,.95)' : hexA(fx.color || '#79b9ff', .45);
          ctx.lineWidth = pass ? 1.2 : 6;
          ctx.beginPath();
          const pts = fx.points;
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            const p = pts[i];
            ctx.lineTo(p.x + (pass ? 0 : Math.sin(t * 40 + i) * 2), p.y + (pass ? 0 : Math.cos(t * 43 + i) * 2));
          }
          ctx.stroke();
        }
        ctx.restore();
      } else if (fx.type === 'beam') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const width = fx.radius * (1 + (1 - k) * .12);
        const grad = ctx.createLinearGradient(fx.x - width, 0, fx.x + width, 0);
        grad.addColorStop(0, 'rgba(120,80,255,0)'); grad.addColorStop(.35, hexA('#b896ff', .3 * k)); grad.addColorStop(.5, `rgba(255,255,255,${.8 * k})`); grad.addColorStop(.65, hexA('#b896ff', .3 * k)); grad.addColorStop(1, 'rgba(120,80,255,0)');
        ctx.fillStyle = grad; ctx.fillRect(fx.x - width, 0, width * 2, fx.y);
        ctx.fillStyle = `rgba(255,255,255,${.5 * k})`; ctx.fillRect(fx.x - 3, 0, 6, fx.y);
        ctx.strokeStyle = hexA('#b896ff', .7 * k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius * (1.3 - k * .3), 0, TAU); ctx.stroke();
        ctx.restore();
      } else if (fx.type === 'spawn') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const r = fx.radius * (1 - k) + 4;
        ctx.strokeStyle = hexA(fx.color || '#ff6f55', .55 * k); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, TAU); ctx.stroke();
        ctx.fillStyle = hexA(fx.color || '#ff6f55', .04 * k); ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (fx.type === 'muzzle') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const r = 8 + (1 - k) * 14;
        const g = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, r);
        g.addColorStop(0, `rgba(255,255,220,${.85 * k})`); g.addColorStop(.3, hexA(fx.color || '#ffcf5a', .5 * k)); g.addColorStop(1, hexA(fx.color || '#ffcf5a', 0));
        ctx.fillStyle = g; ctx.fillRect(fx.x - r, fx.y - r, r * 2, r * 2);
        const muzzleArt = firstStageArt ? artImage('vfxMuzzle') : null;
        if (muzzleArt) {
          const ms = 38 + (1 - k) * 14;
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = clamp(k * 1.4, 0, 1);
          ctx.translate(fx.x, fx.y); ctx.rotate(fx.angle || 0);
          ctx.drawImage(muzzleArt, -ms / 2, -ms / 2, ms, ms);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
    }
  }

  function drawParticles() {
    const ctx = gameCtx;
    for (const p of G.particles) {
      const k = p.life / p.maxLife;
      ctx.globalAlpha = clamp(k * p.alpha, 0, 1);
      ctx.fillStyle = p.color;
      const s = Math.max(1, p.size * k);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawDamageNumbers() {
    const ctx = gameCtx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const d of G.damageNumbers) {
      const k = d.life / d.maxLife;
      ctx.globalAlpha = clamp(k * 1.65, 0, 1);
      const size = d.crit ? 17 : 12;
      ctx.font = `900 ${size}px Silkscreen, monospace`;
      // A dark keyline keeps numbers legible over bricks, fire and enemy hulls.
      ctx.lineWidth = d.crit ? 4 : 3;
      ctx.strokeStyle = 'rgba(3,7,5,.88)';
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillStyle = d.crit ? '#ffe27a' : d.color || '#fff5dc';
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.restore();
  }

  function drawPickups(t) {
    const ctx = gameCtx;
    for (const p of G.pickups) {
      const bob = Math.sin(t * 4 + p.seed) * 2;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      if (p.type === 'xp') {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
        g.addColorStop(0, 'rgba(210,255,244,.8)'); g.addColorStop(.25, hexA('#5ff0ce', .45)); g.addColorStop(1, hexA('#5ff0ce', 0));
        ctx.fillStyle = g; ctx.fillRect(-14, -14, 28, 28);
        ctx.fillStyle = '#cafff3';
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#39bda4'; ctx.fillRect(-1, -2, 2, 4);
      } else if (p.type === 'chest') {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
        g.addColorStop(0, 'rgba(255,220,120,.72)'); g.addColorStop(.4, 'rgba(255,170,50,.30)'); g.addColorStop(1, 'rgba(255,170,50,0)');
        ctx.fillStyle = g; ctx.fillRect(-24, -24, 48, 48);
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.rotate(Math.sin(t * 2 + p.seed) * .08);
        ctx.fillStyle = '#3b2714'; ctx.fillRect(-10, -8, 20, 15);
        ctx.strokeStyle = '#ffd66b'; ctx.lineWidth = 1.5; ctx.strokeRect(-9.5, -7.5, 19, 14);
        ctx.fillStyle = '#ffcf5a'; ctx.fillRect(-10, -2, 20, 2); ctx.fillRect(-2, -2, 4, 7);
        ctx.fillStyle = '#fff3bd'; ctx.fillRect(-3, 1, 6, 2);
        ctx.restore();
      } else {
        const item = ITEMS[p.type];
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        g.addColorStop(0, hexA(item.color, .5)); g.addColorStop(1, hexA(item.color, 0));
        ctx.fillStyle = g; ctx.fillRect(-20, -20, 40, 40);
        ctx.globalCompositeOperation = 'source-over';
        // item slot
        ctx.fillStyle = 'rgba(4,9,7,.9)'; ctx.fillRect(-9, -9, 18, 18);
        ctx.strokeStyle = item.color; ctx.lineWidth = 1; ctx.strokeRect(-8.5, -8.5, 17, 17);
        ctx.fillStyle = item.color;
        if (p.type === 'star') {
          ctx.fillRect(-1, -6, 2, 12); ctx.fillRect(-6, -1, 12, 2); ctx.fillRect(-3, -3, 6, 6);
        } else if (p.type === 'grenade') {
          ctx.beginPath(); ctx.arc(0, 1, 5, 0, TAU); ctx.fill(); ctx.fillRect(-1, -8, 2, 4);
        } else if (p.type === 'helmet') {
          ctx.fillRect(-5, -5, 10, 5); ctx.fillRect(-6, -1, 12, 4); ctx.fillRect(-3, 3, 6, 2);
        } else if (p.type === 'timer') {
          ctx.beginPath(); ctx.arc(0, 1, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#06100d'; ctx.fillRect(0, -2, 1, 3); ctx.fillRect(0, 0, 3, 1);
        } else if (p.type === 'shovel') {
          ctx.fillRect(-1, -7, 2, 8); ctx.fillRect(-4, 1, 8, 4); ctx.fillRect(-3, 5, 6, 2);
        } else if (p.type === 'tank') {
          ctx.fillRect(-5, -4, 10, 8); ctx.fillRect(-2, -6, 4, 3); ctx.fillRect(0, -8, 1, 4);
        } else if (p.type === 'basekit') {
          ctx.fillRect(-6, -5, 12, 10); ctx.fillRect(-1, -8, 2, 16); ctx.fillRect(-8, -1, 16, 2);
          ctx.fillStyle = '#06100d'; ctx.fillRect(-3, -3, 6, 6);
        } else if (p.type === 'fortify') {
          ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, -3); ctx.lineTo(5, 5); ctx.lineTo(0, 8); ctx.lineTo(-5, 5); ctx.lineTo(-7, -3); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#06100d'; ctx.fillRect(-2, -3, 4, 7); ctx.fillRect(-4, -1, 8, 2);
        } else if (p.type === 'turret') {
          // orbiting interceptor drone: central pod, two rotor arms and a
          // faint shield ring around the pickup slot.
          ctx.fillRect(-7, -1, 14, 2); ctx.fillRect(-7, -4, 3, 2); ctx.fillRect(4, -4, 3, 2);
          ctx.fillStyle = '#06100d'; ctx.fillRect(-3, -3, 6, 6);
          ctx.fillStyle = item.color; ctx.fillRect(-1, -1, 2, 2);
          ctx.strokeStyle = hexA(item.color, .42); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke();
        }
        ctx.restore();
        const near = nearestPlayer(p.x, p.y) || G.player;
        if (near && dist(near.x, near.y, p.x, p.y) < 80) {
          ctx.save();
          ctx.font = '9px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = item.color; ctx.fillText(item.name, p.x, p.y - 16);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  function drawWeather(t, dt) {
    const ctx = gameCtx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of G.weather) {
      p.x += p.vx * .016; p.y += p.vy * .016;
      if (p.y > H + 5) { p.y = -5; p.x = rand(W); }
      if (p.y < -5) { p.y = H + 5; p.x = rand(W); }
      if (p.x > W + 5) p.x = -5; if (p.x < -5) p.x = W + 5;
      ctx.globalAlpha = .14 + p.z * .38;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.restore();
  }

  function drawWorld(t) {
    const ctx = gameCtx;
    ctx.save();
    // screen shake
    let sx = 0, sy = 0;
    if (G.shake > 0) {
      sx = rand(1, -1) * G.shake; sy = rand(1, -1) * G.shake;
    }
    ctx.translate(sx | 0, sy | 0);
    ctx.fillStyle = G.arena.palette.sky; ctx.fillRect(-10, -10, W + 20, H + 20);
    if (groundCache) ctx.drawImage(groundCache, 0, 0);
    // water first
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const tile = G.tiles[y][x]; if (!tile) continue;
      if (tile.type === 'water') drawWaterTile(ctx, x * TILE, y * TILE, t);
    }
    // walls
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const tile = G.tiles[y][x]; if (!tile) continue;
      if (tile.type === 'brick') drawBrickTile(ctx, x * TILE, y * TILE, tile, t);
      else if (tile.type === 'steel') drawSteelTile(ctx, x * TILE, y * TILE, tile, t);
      else if (tile.type === 'rubble') drawRubble(ctx, x * TILE, y * TILE, tile);
    }
    // base shadow / pickups under units
    drawHazards(t);
    drawPickups(t);
    drawCore(t);
    drawSeals(t);
    // sort units by y
    const units = [];
    for (const e of G.enemies) units.push({ y: e.y, draw: () => { drawEnemy(e, t); drawEmpArcs(e, t); } });
    for (const p of G.players || []) if (p.alive) units.push({ y: p.y, draw: () => drawPlayer(t, p) });
    units.sort((a, b) => a.y - b.y);
    for (const u of units) u.draw();
    drawDrones(t);
    drawBullets(t);
    drawEffects(t);
    drawParticles();
    drawDamageNumbers();
    drawBushes(ctx, t);
    drawWeather(t);
    ctx.restore();
    // screen edge tint
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .73);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,.27)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    if (G.flash > 0) {
      ctx.fillStyle = hexA(G.flashColor, G.flash * .45); ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------------- menu art ---------------- */
  function rebuildMenuCache() {
    const c = document.createElement('canvas'); c.width = 720; c.height = 760;
    const ctx = c.getContext('2d');
    const p = G.arena.palette;
    const bg = ctx.createLinearGradient(0, 0, 720, 760);
    bg.addColorStop(0, p.sky); bg.addColorStop(.55, '#08110e'); bg.addColorStop(1, '#040706');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 720, 760);
    // glow
    const glow = ctx.createRadialGradient(360, 420, 20, 360, 420, 380);
    glow.addColorStop(0, hexA(p.ambient, .18)); glow.addColorStop(.5, hexA(p.ambient, .04)); glow.addColorStop(1, hexA(p.ambient, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 720, 760);
    // overhead industrial window
    ctx.fillStyle = 'rgba(1,4,3,.4)';
    for (let x = 0; x < 720; x += 72) ctx.fillRect(x, 0, 2, 760);
    for (let y = 0; y < 760; y += 72) ctx.fillRect(0, y, 720, 1);
    // pillars / gantry
    ctx.fillStyle = 'rgba(4,8,6,.68)';
    ctx.fillRect(0, 0, 34, 760); ctx.fillRect(686, 0, 34, 760);
    ctx.fillStyle = 'rgba(142,163,144,.055)';
    for (let y = 0; y < 760; y += 9) { ctx.fillRect(8, y, 7, 3); ctx.fillRect(705, y, 7, 3); }
    ctx.fillStyle = 'rgba(3,6,5,.8)';
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.translate(-60 + i * 250, 0); ctx.rotate(-.24);
      ctx.fillRect(0, 0, 15, 760); ctx.restore();
    }
    // back wall frames
    ctx.strokeStyle = 'rgba(147,176,157,.08)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { ctx.strokeRect(46 + i * 130, 60, 96, 235); ctx.fillStyle = 'rgba(6,12,9,.22)'; ctx.fillRect(47 + i * 130, 61, 94, 233); }
    // hazard floor
    ctx.save();
    ctx.translate(360, 530);
    ctx.scale(1, .32);
    ctx.strokeStyle = hexA(p.accent, .12); ctx.lineWidth = 1;
    for (let r = 120; r <= 370; r += 42) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
    for (let a = 0; a < 12; a++) { ctx.beginPath(); ctx.moveTo(Math.cos(a / 12 * TAU) * 60, Math.sin(a / 12 * TAU) * 60); ctx.lineTo(Math.cos(a / 12 * TAU) * 360, Math.sin(a / 12 * TAU) * 360); ctx.stroke(); }
    ctx.restore();
    // floor platform
    const floor = ctx.createLinearGradient(0, 470, 0, 760);
    floor.addColorStop(0, hexA(p.groundAlt, .55)); floor.addColorStop(1, 'rgba(2,6,4,.9)');
    ctx.fillStyle = floor; ctx.fillRect(0, 505, 720, 255);
    ctx.strokeStyle = hexA(p.steelLight, .12); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 505); ctx.lineTo(720, 505); ctx.stroke();
    ctx.fillStyle = hexA(p.accent, .22);
    for (let i = 0; i < 18; i++) { if (i % 2) ctx.fillRect(70 + i * 34, 540, 18, 4); }
    // distant silhouettes
    drawMenuSilhouette(ctx, 125, 470, .75, p);
    drawMenuSilhouette(ctx, 592, 482, .58, p);
    // hangar labels
    ctx.font = '8px Silkscreen, monospace'; ctx.fillStyle = hexA(p.steelLight, .32);
    ctx.fillText('07 号机库 · 维护中', 47, 500);
    ctx.fillStyle = hexA(p.accent, .45);
    ctx.fillText('警告 · 实弹区域', 47, 516);
    menuCache = c;
  }

  function drawMenuSilhouette(ctx, x, y, s, p) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-.12);
    ctx.globalAlpha = .28;
    drawTankShadow(ctx, 0, 4, 1);
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-.12);
    drawHullLocal(ctx, { body: '#1b2420', dark: '#101613', light: '#334139', core: p.steelLight }, 1.3, 0, {});
    ctx.restore();
  }


  function drawMenuHero(ctx, t, p) {
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const disc = (cx, cy, rad, c) => {
      ctx.fillStyle = c;
      for (let dy = -rad; dy <= rad; dy++) {
        const dx = Math.floor(Math.sqrt(Math.max(0, rad * rad - dy * dy)));
        ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
      }
    };
    const tk = (G.tank || TANKS[0]).colors;
    const C = {
      black: '#070a08', track: '#111712', tread: '#303a31', treadHi: '#617064',
      wheel: '#3b483e', hub: '#98ad9b',
      shell: tk.body, shellMid: tk.body, shellLight: tk.light, shellHi: tk.light,
      shellDark: tk.dark, deep: '#2a170b',
      steel: '#58665c', steelLight: '#a9bdab', steelDark: '#303a33',
      core: tk.core, coreHot: '#dcfff7'
    };
    // ground contact shadow
    ctx.save();
    ctx.translate(360, 625);
    ctx.scale(1, .28);
    const sh = ctx.createRadialGradient(0, 0, 10, 0, 0, 265);
    sh.addColorStop(0, 'rgba(0,0,0,.68)'); sh.addColorStop(.65, 'rgba(0,0,0,.22)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, 265, 0, TAU); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(292, 460);
    ctx.scale(5.2, 5.2);

    // rear exhausts
    r(-48, -8, 8, 9, C.black);
    r(-46, -7, 4, 7, C.steelDark);
    r(-45, -6, 2, 5, C.steel);
    r(-39, -14, 2, 7, C.steelLight);
    r(-36, -12, 2, 5, C.steelDark);
    // animated exhaust puffs
    for (let i = 0; i < 4; i++) {
      const k = ((t * .55 + i * .25) % 1);
      ctx.globalAlpha = (1 - k) * .22;
      r(-48 - k * 8, -17 - k * 17, 3 + k * 4, 3 + k * 4, C.steelLight);
    }
    ctx.globalAlpha = 1;

    // track assembly
    r(-48, 11, 96, 23, C.black);
    r(-46, 13, 92, 18, C.track);
    const shift = Math.floor((t * 17) % 5);
    for (let x = -45 + shift; x < 44; x += 5) {
      r(x, 12, 3, 2, C.tread);
      r(x + 1, 30, 2, 2, C.tread);
    }
    // road wheels + return rollers
    for (const cx of [-36, -19, -2, 15, 32]) {
      disc(cx, 23, 6, C.black);
      disc(cx, 23, 4, C.wheel);
      disc(cx, 23, 2, C.steelDark);
      r(cx - 1, 22, 2, 2, C.hub);
    }
    for (const cx of [-30, -13, 4, 21, 38]) {
      disc(cx, 14, 2, C.steelDark);
      r(cx, 13, 1, 1, C.steelLight);
    }
    // fender / track guard
    r(-44, 8, 88, 5, C.deep);
    r(-42, 8, 84, 2, C.shellDark);
    r(-38, 9, 14, 2, C.shellMid);
    r(24, 9, 16, 2, C.shellMid);

    // lower hull
    r(-42, -1, 82, 14, C.black);
    r(-40, 0, 78, 12, C.shellDark);
    r(-38, 1, 74, 9, C.shell);
    r(-36, 2, 70, 3, C.shellMid);
    // rear plate + vents
    r(-42, -2, 9, 13, C.deep);
    for (let i = 0; i < 3; i++) r(-41, 1 + i * 3, 5, 2, C.steelDark);
    // upper hull / deck
    r(-35, -10, 67, 12, C.black);
    r(-33, -9, 64, 10, C.shellDark);
    r(-31, -8, 59, 7, C.shell);
    r(-29, -7, 50, 2, C.shellMid);
    r(-30, -8, 48, 1, C.shellLight);
    // side skirt plates
    for (let i = 0; i < 6; i++) {
      const x = -38 + i * 12;
      r(x, 6, 10, 7, i % 2 ? C.shellDark : C.shell);
      r(x, 6, 10, 1, i % 2 ? C.shellMid : C.shellLight);
      r(x, 12, 10, 1, C.deep);
      r(x + 4, 9, 2, 1, C.deep);
    }
    // front glacis wedge
    r(28, -7, 10, 18, C.black);
    r(29, -6, 9, 16, C.shellDark);
    r(30, -5, 7, 14, C.shellMid);
    r(31, -4, 4, 2, C.shellLight);
    // front lamp + hazard marks
    r(35, 0, 3, 3, C.black);
    r(36, 1, 1, 1, C.coreHot);
    for (let i = 0; i < 5; i++) r(27 + i * 3, 10, 2, 2, i % 2 ? p.hazard : C.black);

    // turret assembly has a slow servo sway, so the hangar tank feels alive
    ctx.save();
    ctx.translate(0, -14);
    ctx.rotate(Math.sin(t * .5) * .035);
    ctx.translate(0, 14);
    // turret basket
    r(-19, -23, 38, 15, C.black);
    r(-17, -22, 34, 13, C.steelDark);
    r(-15, -21, 30, 11, C.shellDark);
    r(-13, -20, 26, 9, C.shell);
    // turret stepped shell
    r(-15, -33, 31, 12, C.black);
    r(-13, -32, 28, 10, C.shellDark);
    r(-11, -31, 24, 8, C.shell);
    r(-9, -30, 18, 3, C.shellMid);
    r(9, -29, 5, 7, C.shellLight);
    // commander hatch + sight
    r(-7, -36, 13, 4, C.black);
    r(-6, -35, 11, 2, C.steel);
    r(-4, -35, 2, 2, C.steelLight);
    r(4, -27, 7, 4, C.black);
    r(5, -26, 5, 2, C.steelDark);
    r(6, -26, 3, 1, C.core);
    // antenna
    r(-17, -43, 1, 11, C.steelLight);
    r(-18, -45, 2, 2, C.core);
    r(-18, -45, 1, 1, C.coreHot);
    // coaxial secondary gun
    r(-22, -20, 6, 4, C.black);
    r(-21, -19, 4, 2, C.steelLight);
    // rivets on turret
    for (let i = 0; i < 4; i++) r(-11 + i * 6, -18, 1, 1, C.shellHi);
    for (let i = 0; i < 4; i++) r(-11 + i * 6, -13, 1, 1, C.deep);

    // main cannon, slight elevation
    ctx.save();
    ctx.translate(18, -15);
    ctx.rotate(-.075);
    r(0, -4, 49, 9, C.black);
    r(1, -3, 47, 7, C.steelDark);
    r(2, -2, 44, 5, C.shellDark);
    r(3, -1, 40, 3, C.shellMid);
    r(4, -1, 37, 1, C.shellHi);
    r(12, -4, 3, 9, C.steel);
    r(24, -4, 2, 9, C.steel);
    r(35, -4, 2, 9, C.steel);
    r(46, -6, 10, 13, C.black);
    r(47, -5, 8, 11, C.steel);
    r(48, -4, 6, 9, C.shellDark);
    r(49, -2, 4, 5, C.deep);
    r(53, -3, 2, 7, C.shellLight);
    r(9, 0, 31, 1, hexA(C.core, .68));
    r(8, -1, 31, 1, hexA(C.core, .25));
    ctx.restore();
    ctx.restore();

    // rim / panel light
    r(-42, -1, 1, 14, hexA(C.shellHi, .5));
    r(-35, -10, 1, 12, hexA(C.shellHi, .35));
    r(-17, -33, 1, 12, hexA(C.core, .16));
    r(30, 1, 1, 10, hexA(C.core, .22));
    // hull hull number
    ctx.save();
    ctx.font = '5px Silkscreen, monospace';
    ctx.fillStyle = hexA(C.shellHi, .85);
    ctx.fillText('09', -27, 15);
    ctx.fillStyle = hexA(C.core, .9);
    ctx.fillRect(-20, 12, 3, 1);
    ctx.restore();
    ctx.restore();

    // shoulder lamps + holo sparks
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(360, 316, 2, 360, 316, 80);
    glow.addColorStop(0, 'rgba(95,240,206,.14)'); glow.addColorStop(1, 'rgba(95,240,206,0)');
    ctx.fillStyle = glow; ctx.fillRect(250, 240, 220, 160);
    ctx.restore();
  }

  function drawMenu(t) {
    if (!menuCtx) return;
    const ctx = menuCtx;
    if (!menuCache) rebuildMenuCache();
    ctx.clearRect(0, 0, 720, 760);
    if (menuCache) ctx.drawImage(menuCache, 0, 0);
    const p = G.arena.palette;
    // rotating target rings
    ctx.save();
    ctx.translate(360, 430);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const r = 145 + i * 42;
      ctx.strokeStyle = hexA(p.accent, .10 - i * .022);
      ctx.lineWidth = 1;
      ctx.setLineDash(i === 1 ? [3, 8] : []);
      ctx.lineDashOffset = (i % 2 ? -1 : 1) * t * (8 + i * 5);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = hexA(p.core, .26); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 178, -t * .45, -t * .45 + 1.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 178, -t * .45 + Math.PI, -t * .45 + Math.PI + .45); ctx.stroke();
    ctx.restore();
    // spotlights
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const light = ctx.createLinearGradient(280, 0, 420, 560);
    light.addColorStop(0, hexA(p.ambient, .16)); light.addColorStop(1, hexA(p.ambient, 0));
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.moveTo(310, 0); ctx.lineTo(420, 0); ctx.lineTo(540, 560); ctx.lineTo(180, 560); ctx.closePath(); ctx.fill();
    ctx.restore();
    // hero tank
    const bob = Math.sin(t * 1.3) * 1.4;
    ctx.save(); ctx.translate(0, bob);
    drawMenuHero(ctx, t, p);
    ctx.restore();
    // floor contact light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const groundGlow = ctx.createRadialGradient(360, 638, 10, 360, 638, 220);
    groundGlow.addColorStop(0, hexA(p.cyan || p.core, .18)); groundGlow.addColorStop(1, hexA(p.core, 0));
    ctx.fillStyle = groundGlow; ctx.beginPath(); ctx.ellipse(360, 640, 250, 48, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // floating motes
    if (!menuParticles.length) {
      for (let i = 0; i < 54; i++) menuParticles.push({ x: rand(720), y: rand(760), vx: rand(10, -10), vy: rand(-4, -18), size: rand(2.4, .5), phase: rand(TAU) });
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const m of menuParticles) {
      m.x += m.vx * .016; m.y += m.vy * .016;
      if (m.y < -10) { m.y = 770; m.x = rand(720); }
      if (m.x < -10) m.x = 730; if (m.x > 730) m.x = -10;
      ctx.globalAlpha = .18 + .3 * (Math.sin(t * 2 + m.phase) * .5 + .5);
      ctx.fillStyle = p.accent; ctx.fillRect(m.x, m.y, m.size, m.size);
    }
    ctx.restore();
    // scan sweep
    const sy = ((t * 30) % 900) - 100;
    const sweep = ctx.createLinearGradient(0, sy - 80, 0, sy + 80);
    sweep.addColorStop(0, hexA(p.core, 0)); sweep.addColorStop(.5, hexA(p.core, .035)); sweep.addColorStop(1, hexA(p.core, 0));
    ctx.fillStyle = sweep; ctx.fillRect(24, sy - 80, 672, 160);
    // bottom fade
    const fade = ctx.createLinearGradient(0, 600, 0, 760);
    fade.addColorStop(0, 'rgba(2,5,4,0)'); fade.addColorStop(1, 'rgba(2,5,4,.92)');
    ctx.fillStyle = fade; ctx.fillRect(0, 600, 720, 160);
  }

  /* ---------------- run lifecycle / stats ---------------- */
  function xpNeeded(level) {
    // Longer early curve: the first few levels should not chain-pause the run.
    // Tuned for roughly 18-20 choices in a 10-minute stage.
    return Math.floor(20 + (level - 1) * 15 + Math.pow(level, 1.35) * 7.2);
  }

  function startRun(index, coop, endless) {
    const unlocked = G.campaign ? G.campaign.unlocked : 1;
    index = clamp(index | 0, 0, Math.min(MAPS.length - 1, Math.max(0, unlocked - 1)));
    G.mode = 'playing';
    G.endless = !!endless;
    G.endlessSelected = G.endless;
    G.endlessBossKills = 0;
    G.endlessNextBossAt = ENDLESS_FIRST_BOSS;
    G.endlessEliteAt = 180;
    G.twoPlayer = coop !== undefined ? !!coop : !!G.coopSelected;
    G.coopSelected = G.twoPlayer;
    G.lastCoop = G.twoPlayer;
    G.tankIds = readTankIds();
    G.tank = TANKS.find(t => t.id === G.tankIds[0]) || TANKS[0];
    G.tankId = G.tank.id;
    G.arenaIndex = index;
    G.arena = MAPS[index];
    loadStageArt(G.arena.id);
    G.difficulty = stageDifficulty(G.campaign || readCampaign(), index);
    G.difficultyMod = difficultyData(G.difficulty).mod;
    G.runMod = buildRunMod(G.arena.mod, G.difficulty);
    const stagePressure = STAGE_PRESSURE[clamp(index, 0, STAGE_PRESSURE.length - 1)] || STAGE_PRESSURE[0];
    G.runMod.enemyHp *= stagePressure.hp;
    G.runMod.bossHp *= stagePressure.hp;
    G.runMod.enemyDamage *= stagePressure.dmg;
    G.runMod.spawnMul *= stagePressure.spawn;
    if (G.arenaIndex === 0 && !G.endless) {
      // The five-minute tutorial has fewer kills but still needs a usable build.
      G.runMod.xpMul *= 1.4;
    }
    if (G.twoPlayer) {
      // Co-op adds pressure instead of free survivability: more bodies and
      // 20% more incoming damage. Enemy HP stays unchanged.
      G.runMod.spawnMul *= 1 / 1.2;
      G.runMod.enemyDamage *= 1.2;
      G.runMod.bossHp *= 1.35;
      // Each level-up is a concentrated choice: two-person squads level
      // twice as fast, while modules cap at rank 2.
      G.runMod.xpMul *= 2;
    }
    G.bossAt = G.endless ? Infinity : (index === 0 ? TUTORIAL_BOSS_AT : BOSS_AT);
    G.runDuration = G.bossAt;
    G.runSeed = Date.now() % 99999;
    G.tiles = [];
    G.core = null;
    G.player = null;
    G.players = [];
    G.enemies = [];
    G.bullets = [];
    G.enemyBullets = [];
    G.pickups = [];
    G.hazards = [];
    G.seals = [];
    G.mines = [];
    G.strikes = [];
    G.sentries = [];
    G.vortices = [];
    G.effects = [];
    G.particles = [];
    G.damageNumbers = [];
    G.pendingSpawns = [];
    G.weather = [];
    G.time = 0;
    G.elapsed = 0;
    G.waveIndex = -1;
    G.level = 1;
    G.xp = 0;
    G.xpNext = xpNeeded(1);
    G.pendingLevels = 0;
    G.kills = 0;
    G.pickupsCollected = 0;
    G.combo = 0;
    G.comboTimer = 0;
    G.revives = 0;
    G.progressRecorded = false;
    G.spawnTimer = 1.2;
    G.sideSpawnTimer = 8;
    G.sideWarned = false;
    G.mapHazardTimer = 3.5;
    G.mapHazardIndex = 0;
    G.spawnPoints = [];
    G.eliteFlags = {};
    G.nextEliteAt = ELITE_FIRST_AT;
    try { G.eliteTutorialSeen = localStorage.getItem('bf.eliteTutorial') === '1'; }
    catch (_) { G.eliteTutorialSeen = false; }
    try { G.sealTutorialSeen = localStorage.getItem('bf.sealTutorial') === '1'; }
    catch (_) { G.sealTutorialSeen = false; }
    try { G.itemTutorialSeen = localStorage.getItem('bf.itemTutorial') === '1'; }
    catch (_) { G.itemTutorialSeen = false; }
    G.itemTutorialQueued = false;
    G.boss = null;
    G.bossSpawned = false;
    G.bossDefeated = false;
    G.victoryTimer = 0;
    G.freezeTimer = 0;
    G.fusions = {};
    const activeTanks = G.twoPlayer
      ? [G.tank, TANKS.find(t => t.id === G.tankIds[1]) || G.tank]
      : [G.tank];
    const startWeapons = {}, startPassives = {};
    for (const tank of activeTanks) {
      for (const [id, lvl] of Object.entries((tank.start && tank.start.weapons) || {})) {
        startWeapons[id] = Math.max(startWeapons[id] || 0, lvl);
      }
      for (const [id, lvl] of Object.entries((tank.start && tank.start.passives) || {})) {
        startPassives[id] = Math.max(startPassives[id] || 0, lvl);
      }
    }
    G.weapons = Object.assign({ cannon: 1 }, startWeapons);
    G.passives = startPassives;
    G.weaponCds = {};
    G.droneState = [];
    G.flameTimer = 0;
    G.mineTimer = 0;
    G.arcTimer = 1.3;
    G.orbitalTimer = 2.2;
    G.recallCd = 0;
    G.recallMax = RECALL_CD;
    G.rerolls = 2;
    G.currentChoices = [];
    G.loadoutDirty = true;
    G.hudTimer = 0;
    G.shake = 0; G.shakeTime = 0; G.flash = 0;
    G.totalDamage = 0;
    G.deadReason = '';
    G.tutorialStep = 0;
    G.tutorialTimer = 6;
    G.tutorialMusicPending = false;
    G.autoPause = false;
    G.entityId = 1;
    G.lastEnemySound = 0;
    G.resolvingUpgrade = false;
    G.lastPlayerCell = { x: 0, y: 0 };
    lastHudSignature = '';
    Input.keys.clear();
    Input.dashQueued = false; Input.dashQueued2 = false;
    Input.gamepad.selectedCard = -1;
    Input.gamepad.levelupNeedsNeutral = false;
    Input.mobile = { active: false, x: 0, y: 0 };
    loadArena(index);
    // Co-op builds are independent: each pilot owns their XP, level, weapons,
    // passives and fusions. Keep P1 as the legacy global alias for HUD/results.
    for (const p of G.players) {
      p.level = 1;
      p.xp = 0;
      p.xpNext = xpNeeded(1);
      p.pendingLevels = 0;
      p.rerolls = 2;
      p.weaponCds = {};
      p.droneState = [];
      p.flameTimer = 0; p.mineTimer = 0; p.arcTimer = 1.3; p.orbitalTimer = 2.2;
    }
    G.weapons = G.player.weapons;
    G.passives = G.player.passives;
    G.fusions = G.player.fusions;
    G.level = G.player.level;
    G.xp = G.player.xp;
    G.xpNext = G.player.xpNext;
    G.pendingLevels = 0;
    G.rerolls = 2;
    G.levelupPlayer = null;
    for (const p of G.players) {
      p.bonusHp = 0;
      p.noDamageTime = 0;
    }
    recalcStats(true);
    for (const p of G.players) {
      p.hp = p.maxHp;
      p.shield = p.shieldMax;
      p.invincible = 2.8;
    }
    G.waveIndex = 0;
    G.currentChoices = [];
    U.menuScreen.classList.add('hidden');
    U.gameLayout.classList.remove('is-hidden');
    U.gameLayout.setAttribute('aria-hidden', 'false');
    U.levelupScreen.classList.add('hidden');
    U.pauseScreen.classList.add('hidden');
    U.resultScreen.classList.add('hidden');
    U.howScreen.classList.add('hidden');
    if (U.settingsScreen) U.settingsScreen.classList.add('hidden');
    if (U.fusionScreen) U.fusionScreen.classList.add('hidden');
    if (U.tankScreen) U.tankScreen.classList.add('hidden');
    if (U.codexScreen) U.codexScreen.classList.add('hidden');
    if (U.saveScreen) U.saveScreen.classList.add('hidden');
    U.bossHud.classList.add('is-hidden');
    if (U.bossMarker) U.bossMarker.style.display = G.endless ? 'none' : '';
    const diff = difficultyData(G.difficulty);
    U.sectorLabel.textContent = `第 ${index + 1} 区 · ${MAPS[index].name} · ${diff.name}${G.endless ? ' · 无尽' : ''}`;
    U.objectiveLabel.textContent = G.endless ? '无尽协议 · 生存至极限' : `泰坦降临倒计时 · ${fmtShort(G.bossAt || BOSS_AT)}`;
    U.sideTip.textContent = G.twoPlayer
      ? `P1 · ${G.tank.name} · P2 · ${tankData(G.players[1]).name}`
      : `底盘 // ${G.tank.name} · ${G.tank.role}`;
    if (U.pilotHudName) U.pilotHudName.textContent = G.tank.name;
    if (U.coopName2 && G.twoPlayer && G.players[1]) U.coopName2.textContent = tankData(G.players[1]).name;
    if (U.visualUnit) U.visualUnit.textContent = `${G.tank.name} «${G.tank.en}»`;
    if (U.visualUnitSub) U.visualUnitSub.textContent = `MODULAR SIEGE PLATFORM / ${MAPS[index].sector}`;
    if (U.coopPanel) U.coopPanel.classList.toggle('is-hidden', !G.twoPlayer);
    if (U.deckHint) U.deckHint.innerHTML = G.twoPlayer ? '<span>P1 WASD</span> 移动 <b>/</b> <span>P2 左摇杆/方向键</span> 移动 <b>/</b> <span>自动火控</span> 正面优先 <b>/</b> <span>SPACE / A</span> 冲刺' : '<span>WASD</span> 移动 <b>/</b> <span>自动火控</span> 正面优先 <b>/</b> <span>SPACE / A</span> 冲刺 <b>/</b> <span>ESC / START</span> 暂停';
    const p = U.primaryIcon; if (p) { p.innerHTML = '<canvas data-icon="cannon" data-color="#ffb52d" data-size="36"></canvas>'; ICONS.applyAll(p); }
    renderLoadout();
    if (U.p1Feed) U.p1Feed.innerHTML = '';
    if (U.p2Feed) U.p2Feed.innerHTML = '';
    updateHUD();
    AUDIO.init();
    const tutorialPending = G.arenaIndex === 0 && !G.endless;
    G.tutorialMusicPending = tutorialPending;
    if (tutorialPending) {
      // The first-stage manual pauses the run. Keep the 7s deploy sting for
      // the moment the player actually enters the battlefield, instead of
      // playing it underneath the tutorial overlay.
      AUDIO.stopMusic();
    } else {
      AUDIO.startMusic(G.arenaIndex, { intro: true });
      AUDIO.setIntensity(0);
    }
    showToast(G.endless
      ? `无尽协议启动 // ${G.arena.name} · 生存至极限`
      : (G.twoPlayer
        ? `P1 ${G.tank.name} // P2 ${tankData(G.players[1]).name} 已部署`
        : `${G.tank.name} 已部署 // ${G.tank.trait}`), 'cyan');
    setTimeout(() => {
      if (G.mode !== 'playing') return;
      if (G.twoPlayer) showToast(isTouchUI() ? '手机双人建议外接手柄 · 靠近倒地队友可救援' : 'P1 键鼠 / P2 手柄 · 靠近倒地队友可救援');
      else showToast(isTouchUI() ? '左侧摇杆移动 · 自动索敌 · 右下 DASH 冲刺' : 'WASD / 左摇杆移动 · 自动索敌 · SPACE / A 冲刺');
    }, 2600);
    setTimeout(() => { if (G.mode === 'playing') showToast('收集青色余烬，升级你的钢铁构筑'); }, 5600);
    if (G.seals.length) setTimeout(() => {
      if (G.mode === 'playing') showToast(`封印 · 本关 ${G.seals.length} 座封印核心 · 主炮可索敌 · 受击弹出增援`, 'red');
    }, 4200);
    if (G.arenaIndex === 0 && !G.endless) openTutorial();
  }

  function recalcStats(fullHeal) {
    for (const p of G.players || []) {
      const pass = passivesFor(p);
      const armorLvl = pass.armor || 0;
      const engineLvl = pass.engine || 0;
      const loaderLvl = pass.loader || 0;
      const magnetLvl = pass.magnet || 0;
      const warheadLvl = pass.warhead || 0;
      const coolingLvl = pass.cooling || 0;
      const critLvl = pass.crit || 0;
      const salvageLvl = pass.salvage || 0;
      const overdriveLvl = pass.overdrive || 0;
      const shieldLvl = pass.shield || 0;
      const regenLvl = pass.regen || 0;
      const refractLvl = pass.pierce || 0;
      const dashLvl = pass.dash || 0;
      const fortuneLvl = pass.fortune || 0;
      const amphibiousLvl = pass.amphibious || 0;
      const phaseLvl = pass.phase || 0;
      const base = {
        damage: 1 + overdriveLvl * .08 + warheadLvl * .04,
        attackSpeed: 1 + loaderLvl * .07,
        cdr: Math.max(.45, 1 - coolingLvl * .07),
        area: 1 + warheadLvl * .1,
        crit: .05 + critLvl * .16,
        critMult: 1.8 + critLvl * .10,
        pickup: PLAYER_BASE.pickupRadius * (1 + magnetLvl * .22),
        xpGain: 1 + salvageLvl * .12 + magnetLvl * .04,
        dropChance: .025 + salvageLvl * .015 + fortuneLvl * .02,
        regen: regenLvl * 1.1,
        damageTaken: 1,
        refractAdd: refractLvl + (phaseLvl > 1 ? 1 : 0),
        waterWalk: amphibiousLvl > 0 ? 1 : 0,
        waterSpeed: 1 + amphibiousLvl * .12,
        steelPierce: phaseLvl > 0 ? 1 : 0,
        duration: 1
      };
      const tank = tankData(p);
      const st = {
        damage: base.damage * (tank.damageMul || 1),
        attackSpeed: base.attackSpeed * (tank.attackSpeedMul || 1),
        cdr: Math.max(.45, base.cdr * (tank.cdrMul || 1)),
        area: base.area * (tank.areaMul || 1),
        crit: base.crit + (tank.critAdd || 0),
        critMult: base.critMult,
        pickup: base.pickup * (tank.pickupMul || 1),
        xpGain: base.xpGain * (tank.xpMul || 1),
        dropChance: base.dropChance + (tank.dropAdd || 0),
        regen: base.regen,
        damageTaken: base.damageTaken,
        refractAdd: base.refractAdd,
        waterWalk: base.waterWalk,
        waterSpeed: base.waterSpeed,
        steelPierce: base.steelPierce,
        duration: base.duration
      };
      p.stats = st;
      const oldMax = p.maxHp || PLAYER_BASE.maxHp;
      const oldShieldMax = p.shieldMax || 0;
      p.maxHp = (PLAYER_BASE.maxHp + (p.bonusHp || 0) + armorLvl * 18) * (tank.hpMul || 1);
      p.hp = fullHeal ? p.maxHp : Math.min(p.maxHp, p.hp + Math.max(0, p.maxHp - oldMax));
      p.speed = PLAYER_BASE.speed * (1 + engineLvl * .08) * (tank.speedMul || 1);
      p.shieldMax = shieldLvl * 24;
      if (fullHeal || p.shieldMax <= 0) p.shield = p.shieldMax;
      else if (p.shieldMax > oldShieldMax) p.shield = Math.min(p.shieldMax, p.shield + (p.shieldMax - oldShieldMax));
      p.dashMax = 2.3 * st.cdr * (tank.dashCdMul || 1) * (1 - dashLvl * .05);
      p.dashInvuln = .34 + dashLvl * .04;
      p.radius = PLAYER_BASE.radius;
      p.bodyColor = tank.colors.body;
      p.bodyLight = tank.colors.light;
      p.bodyDark = tank.colors.dark;
      p.coreColor = tank.colors.core;
    }
    const firstPass = passivesFor(G.players && G.players[0]);
    const guardianLvl = firstPass.guardian || 0;
    G.coreArmor = guardianLvl * .05;
    if (G.core) G.core.repairRate = 6 + guardianLvl * 1.2;
    const first = (G.players || [])[0];
    G.stats = first && first.stats ? first.stats : {
      damage: 1, attackSpeed: 1, cdr: 1, area: 1, crit: .05, critMult: 1.8,
      pickup: PLAYER_BASE.pickupRadius, xpGain: 1, dropChance: .025, regen: 0,
      damageTaken: 1, refractAdd: 0, waterWalk: 0, waterSpeed: 1, steelPierce: 0,
      duration: 1
    };
  }

  // Four visible tiers in single-player, each worth roughly two old levels.
  // Co-op collapses the same power into two visible ranks: the second rank
  // is already the old max-tier stat line, so each module only asks for one
  // upgrade pick per player.
  const WEAPON_TIER_LEVEL = [0, 1, 3, 6, 8];
  const PASSIVE_TIER_LEVEL = [0, 1, 2, 4, 5];
  const WEAPON_TIER_LEVEL_COOP = [0, 1, 8, 8, 8];
  const PASSIVE_TIER_LEVEL_COOP = [0, 1, 5, 5, 5];
  function maxUpgradeRank() { return G.twoPlayer ? 2 : 4; }
  function weaponTierTable() { return G.twoPlayer ? WEAPON_TIER_LEVEL_COOP : WEAPON_TIER_LEVEL; }
  function passiveTierTable() { return G.twoPlayer ? PASSIVE_TIER_LEVEL_COOP : PASSIVE_TIER_LEVEL; }
  function weaponTierValue(rank) { const t = weaponTierTable(); return t[clamp(rank | 0, 0, t.length - 1)]; }
  function passiveTierValue(rank) { const t = passiveTierTable(); return t[clamp(rank | 0, 0, t.length - 1)]; }
  function tierLevels(raw, table) {
    const out = {};
    for (const [id, tier] of Object.entries(raw || {})) {
      const mapped = table[clamp(tier | 0, 0, table.length - 1)];
      if (mapped > 0) out[id] = mapped;
    }
    return out;
  }
  function weaponsFor(p) { return tierLevels((p && p.weapons) || (G.player && G.player.weapons) || G.weapons || { cannon: 1 }, weaponTierTable()); }
  function passivesFor(p) { return tierLevels((p && p.passives) || (G.player && G.player.passives) || G.passives || {}, passiveTierTable()); }
  function fusionsFor(p) { return (p && p.fusions) || (G.player && G.player.fusions) || G.fusions || {}; }

  function statsFor(p) {
    return (p && p.stats) || G.stats;
  }

  function activePlayers() {
    return (G.players || []).filter(p => p.alive && !p.downed);
  }

  function nearestPlayer(x, y) {
    let best = null, bd = Infinity;
    for (const p of activePlayers()) {
      const d = dist2(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function sentryTarget(s) {
    return {
      index: -2, isSentry: true, sentry: s,
      x: s.x, y: s.y, radius: s.radius || 15,
      alive: true, downed: false, moveX: 0, moveY: 0, speed: 0
    };
  }

  function nearestTauntSentry(x, y) {
    let best = null, bd = Infinity;
    for (const s of G.sentries || []) {
      if (!s || s.life <= 0 || s.hp <= 0) continue;
      const d = dist2(x, y, s.x, s.y);
      const taunt = s.tauntRadius || 0;
      if (d < taunt * taunt && d < bd) { bd = d; best = s; }
    }
    return best ? sentryTarget(best) : null;
  }

  function baseTarget() {
    if (!G.core || !G.core.alive || G.core.hp <= 0) return null;
    return {
      index: -1, isBase: true, x: G.core.cx, y: G.core.cy,
      radius: G.core.radius, alive: true, downed: false, moveX: 0, moveY: 0, speed: 0
    };
  }

  function targetIsValid(target) {
    if (!target) return false;
    if (target.isBase) return !!(G.core && G.core.alive && G.core.hp > 0);
    if (target.isSentry) {
      const sentry = target.sentry;
      return !!(sentry && sentry.life > 0 && sentry.hp > 0 && (G.sentries || []).includes(sentry));
    }
    return !!target.alive && !target.downed;
  }

  function nearestTarget(x, y, source) {
    // Enemy locks are intentionally sticky. Re-evaluating every frame made
    // enemies flip between a pilot, the base and a taunt sentry, which made
    // solo play feel like the base was stealing all the aggro.
    if (source && source.lockedTarget && source.targetLockUntil > G.elapsed) {
      if (targetIsValid(source.lockedTarget)) return source.lockedTarget;
    }
    if (source) {
      source.lockedTarget = null;
      source.targetLockUntil = 0;
    }

    // A deployed bastion is a deliberate fire magnet: enemies inside its
    // taunt ring prefer it over the player or the base. Its taunt still wins,
    // but the chosen sentry is locked like any other target.
    const sentry = nearestTauntSentry(x, y);
    if (sentry) {
      if (source) {
        source.lockedTarget = sentry;
        source.targetLockUntil = G.elapsed + ENEMY_TARGET_LOCK;
      }
      return sentry;
    }

    // Compare pilots and the base on weighted distance. The base is treated as
    // 75% farther away, so a pilot wins unless the base is much closer.
    let best = null, bestScore = Infinity;
    for (const p of activePlayers()) {
      const score = dist(x, y, p.x, p.y);
      if (score < bestScore) { bestScore = score; best = p; }
    }
    const b = baseTarget();
    if (b) {
      const score = dist(x, y, b.x, b.y) * ENEMY_BASE_DIST_MULT;
      if (score < bestScore) { bestScore = score; best = b; }
    }
    if (source && best) {
      source.lockedTarget = best;
      source.targetLockUntil = G.elapsed + ENEMY_TARGET_LOCK;
    }
    return best;
  }

  function nearestEnemy(x, y, range, excludeDead = true) {
    let best = null, bd = Infinity;
    const r2 = range * range;
    for (const e of G.enemies) {
      if (excludeDead && (e.dead || e.spawnTimer > 0)) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < r2 && d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function nearestRefractTarget(x, y, range, hit) {
    let best = null, bd = range * range;
    for (const e of G.enemies) {
      if (e.dead || e.spawnTimer > 0) continue;
      if (hit && hit.has(e.id)) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function nearestSeal(x, y, range) {
    let best = null, bd = range * range;
    for (const s of G.seals || []) {
      if (s.dead) continue;
      const d = dist2(x, y, s.x, s.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function nearestAttackable(x, y, range) {
    const enemy = nearestEnemy(x, y, range);
    const seal = nearestSeal(x, y, range);
    if (!seal) return enemy;
    if (!enemy) return seal;
    return dist2(x, y, seal.x, seal.y) <= dist2(x, y, enemy.x, enemy.y) ? seal : enemy;
  }

  function autoAngleDelta(a, b) {
    return ((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI;
  }

  function segmentBlockInfo(p, target) {
    const sx = p.x, sy = p.y;
    const dx = target.x - sx, dy = target.y - sy;
    const len2 = dx * dx + dy * dy;
    const len = Math.sqrt(len2);
    if (len < 2) return { hard: false, blocked: false };
    const steelPierce = !!(statsFor(p) && statsFor(p).steelPierce);
    const steps = Math.max(2, Math.ceil(len / 10));
    let blocked = false;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tile = tileAt(sx + dx * t, sy + dy * t);
      if (tile.type === 'steel') {
        // Steel is a hard stop without phase core: the shot cannot reach.
        if (!steelPierce) return { hard: true, blocked: true };
      } else if (tile.type === 'brick') {
        // Friendly walls cannot be broken, so they are hard cover too.
        if (tile.friendlyWall) return { hard: true, blocked: true };
        blocked = true;
      }
    }
    const markBody = (body, radius) => {
      if (!body || body.dead || body === target) return;
      const ex = body.x - sx, ey = body.y - sy;
      const t = (ex * dx + ey * dy) / len2;
      if (t <= .02 || t >= .98) return;
      const ox = sx + dx * t - body.x, oy = sy + dy * t - body.y;
      if (ox * ox + oy * oy < (radius + 3) ** 2) blocked = true;
    };
    for (const e of G.enemies) {
      if (e.dead || e.spawnTimer > 0) continue;
      markBody(e, e.radius * e.size);
    }
    for (const s of G.seals || []) {
      if (s.dead) continue;
      markBody(s, s.radius);
    }
    return { hard: false, blocked };
  }

  function frontBrickTarget(p) {
    if (!p) return null;
    const facing = Number.isFinite(p.bodyAngle) ? p.bodyAngle : 0;
    const limit = Math.hypot(W, H) + TILE;
    for (let d = 2; d <= limit; d += 6) {
      const x = p.x + Math.cos(facing) * d;
      const y = p.y + Math.sin(facing) * d;
      const tile = tileAt(x, y);
      if (tile.type === 'steel' || tile.type === 'void') return null;
      if (tile.type !== 'brick') continue;
      // Friendly base walls cannot be broken; never waste the cannon on them.
      if (tile.friendlyWall) return null;
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      return {
        isBrick: true, tile, dead: false, moving: false, bodyAngle: 0, speed: 0,
        x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, radius: TILE * .55
      };
    }
    return null;
  }

  function nearestDirectionalAttackable(p, range) {
    if (!p) return null;
    const r2 = range * range;
    const facing = Number.isFinite(p.bodyAngle) ? p.bodyAngle : 0;
    const candidates = [];
    const consider = (target) => {
      if (!target || target.dead) return;
      const d = dist2(p.x, p.y, target.x, target.y);
      if (d > r2) return;
      const rel = Math.abs(autoAngleDelta(Math.atan2(target.y - p.y, target.x - p.x), facing));
      const front = rel <= Math.PI / 2 + 1e-6;
      const block = segmentBlockInfo(p, target);
      if (block.hard) return;
      // Clear front -> clear rear -> covered front -> covered rear.
      const priority = (block.blocked ? 2 : 0) + (front ? 0 : 1);
      candidates.push({ target, d, rel, priority });
    };
    for (const e of G.enemies) {
      if (e.dead || e.spawnTimer > 0) continue;
      consider(e);
    }
    for (const s of G.seals || []) {
      if (s.dead) continue;
      consider(s);
    }
    let best = null;
    for (const c of candidates) {
      if (!best || c.priority < best.priority ||
          (c.priority === best.priority && (c.d < best.d - 1e-6 ||
          (Math.abs(c.d - best.d) <= 1e-6 && c.rel < best.rel)))) {
        best = c;
      }
    }
    return best ? best.target : null;
  }

  function fused(id, p) {
    const fusions = fusionsFor(p);
    return !!(fusions && fusions[id]);
  }

  function tankData(p) {
    return (p && p.tank) || G.tank || TANKS[0];
  }

  function angleLerp(a, b, t) {
    let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
    return a + d * clamp(t, 0, 1);
  }

  function tryMovePlayer(p, vx, vy, dt) {
    // Slightly smaller collision body than the sprite: avoids invisible corner snags.
    const moveR = Math.max(8, p.radius - 3);
    const canCrossWater = p.waterWalkTimer > 0 || !!statsFor(p).waterWalk;
    const oldX = p.x, oldY = p.y;
    const nx = p.x + vx * dt;
    if (!collidesWorld(nx, p.y, moveR, true, canCrossWater)) p.x = nx;
    else p.vx = 0;
    const ny = p.y + vy * dt;
    if (!collidesWorld(p.x, ny, moveR, true, canCrossWater)) p.y = ny;
    else p.vy = 0;
    // Corner assist: when a diagonal input jams on a corner, nudge along the open axis.
    if (p.x === oldX && p.y === oldY && Math.abs(vx) > 8 && Math.abs(vy) > 8) {
      const sx = Math.sign(vx), sy = Math.sign(vy);
      for (let step = 2; step <= 6; step += 2) {
        if (!collidesWorld(p.x + sx * step, p.y, moveR, true, canCrossWater) && !collidesWorld(p.x + sx * step, p.y + sy * step, moveR, true, canCrossWater)) {
          p.x += sx * step; break;
        }
        if (!collidesWorld(p.x, p.y + sy * step, moveR, true, canCrossWater) && !collidesWorld(p.x + sx * step, p.y + sy * step, moveR, true, canCrossWater)) {
          p.y += sy * step; break;
        }
      }
    }
    p.x = clamp(p.x, p.radius, W - p.radius);
    p.y = clamp(p.y, p.radius, H - p.radius);
  }

  function updatePlayers(dt) {
    for (const p of G.players || []) {
      if (!p || !p.alive) continue;
      if (p.downed) updateDownedPlayer(p, dt);
      else updatePlayer(dt, p);
      const tank = tankData(p);
      if (p.alive && !p.downed && tank.shieldRegen && p.shieldMax > 0) {
        p.shield = Math.min(p.shieldMax, p.shield + tank.shieldRegen * dt);
      }
      if (p.alive && !p.downed && tank.auraHeal) {
        for (const q of activePlayers()) healPlayer(tank.auraHeal * dt, q);
      }
    }
  }

  function updateDownedPlayer(p, dt) {
    const helper = (G.players || []).find(o => o !== p && o.alive && !o.downed && dist(o.x, o.y, p.x, p.y) < 58);
    if (helper) {
      p.reviveProgress += dt;
      if (p.reviveProgress >= 2.4) {
        p.downed = false;
        p.reviveProgress = 0;
        p.hp = Math.max(1, Math.round(p.maxHp * .35));
        p.invincible = 2.5;
        p.dashTimer = .18;
        p.noDamageTime = 0;
        addEffect({ type: 'ring', x: p.x, y: p.y, radius: 52, life: .65, maxLife: .65, color: '#5ff0ce' });
        addParticles(p.x, p.y, 18, '#5ff0ce', 'spark', 1.2);
        G.revives = (G.revives || 0) + 1;
        showToast(`P${p.index + 1} 已重启 · 装甲恢复 35%`, 'cyan');
        AUDIO.confirm(); rumble(.35, 100);
      }
    } else {
      p.reviveProgress = Math.max(0, p.reviveProgress - dt * .45);
    }
  }

  function updatePlayer(dt, p) {
    if (!p || !p.alive || p.downed) return;
    p.fireCd -= dt;
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    p.waterWalkTimer = Math.max(0, (p.waterWalkTimer || 0) - dt);
    p.invincible = Math.max(0, p.invincible - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt * 5);
    p.recoil = Math.max(0, p.recoil - dt * 8);
    p.noDamageTime += dt;
    if (p.shieldMax > 0 && p.noDamageTime > 6 && p.shield < p.shieldMax) {
      p.shield = Math.min(p.shieldMax, p.shield + dt * 18);
    }
    if (p.noDamageTime > 6 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + dt * 3.2);
    }
    if (p.hp < p.maxHp && statsFor(p).regen) {
      p.hp = Math.min(p.maxHp, p.hp + statsFor(p).regen * dt);
    }
    const idx = p.index || 0;
    const wantDash = idx === 0 ? Input.dashQueued : Input.dashQueued2;
    if (wantDash) {
      if (idx === 0) Input.dashQueued = false; else Input.dashQueued2 = false;
      if (p.dashCd <= .02 && p.alive) {
        p.dashCd = p.dashMax;
        p.dashTimer = .2;
        p.invincible = Math.max(p.invincible, p.dashInvuln || .34);
        AUDIO.dash(); rumble(.3, 70);
        addShake(2.5, .12);
        for (let i = 0; i < 9; i++) addParticle(p.x + rand(10, -10), p.y + rand(10, -10), rand(120, -120), rand(120, -120), '#5ff0ce', 'spark', .4, 1.5);
        if (weaponsFor(p).flame) addFlamePool(p.x, p.y, true, p);
      }
    }
    // Two physical pads: P1 gets the first, P2 gets the second. With one
    // pad in co-op the pad belongs to P2 and P1 stays on keyboard.
    const p1Pad = G.twoPlayer ? (Input.gamepad2.connected ? Input.gamepad : null) : Input.gamepad;
    const p2Pad = Input.gamepad2.connected ? Input.gamepad2 : Input.gamepad;
    const pad = idx === 0 ? p1Pad : p2Pad;
    let ix = 0, iy = 0;
    if (idx === 0) {
      if (Input.keys.has('KeyA')) ix -= 1;
      if (Input.keys.has('KeyD')) ix += 1;
      if (Input.keys.has('KeyW')) iy -= 1;
      if (Input.keys.has('KeyS')) iy += 1;
      if (!G.twoPlayer) {
        if (Input.keys.has('ArrowLeft')) ix -= 1;
        if (Input.keys.has('ArrowRight')) ix += 1;
        if (Input.keys.has('ArrowUp')) iy -= 1;
        if (Input.keys.has('ArrowDown')) iy += 1;
      }
      ix += Input.mobile.x; iy += Input.mobile.y;
      if (p1Pad && p1Pad.connected) { ix += p1Pad.x; iy += p1Pad.y; }
    } else {
      if (Input.keys.has('ArrowLeft')) ix -= 1;
      if (Input.keys.has('ArrowRight')) ix += 1;
      if (Input.keys.has('ArrowUp')) iy -= 1;
      if (Input.keys.has('ArrowDown')) iy += 1;
      if (pad && pad.connected) { ix += pad.x; iy += pad.y; }
    }
    const mag = Math.hypot(ix, iy);
    const onWater = tileAt(p.x, p.y).type === 'water';
    const waterSpeed = onWater && (p.waterWalkTimer > 0 || statsFor(p).waterWalk) ? (statsFor(p).waterSpeed || 1.15) : 1;
    const sp = p.speed * (p.dashTimer > 0 ? 2.35 : 1) * waterSpeed;
    if (mag > .08) {
      ix /= Math.max(1, mag); iy /= Math.max(1, mag);
    } else {
      ix = 0; iy = 0;
    }
    const desiredX = ix * sp, desiredY = iy * sp;
    const response = p.dashTimer > 0 ? 26 : mag > .08 ? 16 : 10;
    p.vx += (desiredX - p.vx) * Math.min(1, dt * response);
    p.vy += (desiredY - p.vy) * Math.min(1, dt * response);
    if (mag <= .08) {
      p.vx *= Math.max(0, 1 - dt * 9);
      p.vy *= Math.max(0, 1 - dt * 9);
    }
    tryMovePlayer(p, p.vx, p.vy, dt);
    const actualSpeed = Math.hypot(p.vx, p.vy);
    if (mag > .08 && actualSpeed < 10) p.blockedTime = (p.blockedTime || 0) + dt;
    else p.blockedTime = 0;
    if (p.blockedTime > .16) {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[.7,-.7],[-.7,.7],[-.7,-.7]];
      for (const [dx, dy] of dirs) {
        for (let step = 2; step <= 6; step += 2) {
          if (!collidesWorld(p.x + dx * step, p.y + dy * step, Math.max(8, p.radius - 3))) {
            p.x += dx * step; p.y += dy * step; p.blockedTime = 0; break;
          }
        }
        if (!p.blockedTime) break;
      }
      if (p.blockedTime) p.blockedTime = 0;
    }
    if (actualSpeed > 10) {
      p.bodyAngle = angleLerp(p.bodyAngle, Math.atan2(p.vy, p.vx), dt * 13);
      p.trackPhase += dt * (8 + actualSpeed / sp * (p.dashTimer > 0 ? 18 : 8));
      p.moving = true;
      if (onWater && chance(dt * 16)) addParticle(p.x + rand(12, -12), p.y + rand(8, -8), rand(-18, 18), rand(-6, 10), '#8fffe6', 'spark', .35, 1.5);
      p.moveX = p.vx / actualSpeed; p.moveY = p.vy / actualSpeed;
      if (chance(dt * 6)) {
        addParticle(p.x - p.moveX * 12 + rand(4, -4), p.y + 7, rand(-12, 12), rand(2, -12), hexA(G.arena.palette.steelLight, .55), 'smoke', .5, 2);
      }
    } else {
      p.moving = false; p.moveX = 0; p.moveY = 0;
      if (mag <= .08) { p.vx = 0; p.vy = 0; }
    }
    // Automatic fire control only. The turret prefers targets in the forward
    // half of the hull's facing; the rear half is used only when the front is
    // empty, and distance decides inside each half.
    let aimAngle = p.turretAngle;
    let aimPoint = null;
    // A brick directly in front is the immediate obstacle: clear it before
    // turning the turret toward enemies elsewhere.
    const autoTarget = frontBrickTarget(p) || nearestDirectionalAttackable(p, PLAYER_AUTO_RANGE);
    if (autoTarget) {
      const lead = Math.min(.55, dist(p.x, p.y, autoTarget.x, autoTarget.y) / 620);
      const vx = autoTarget.moving ? Math.cos(autoTarget.bodyAngle) * autoTarget.speed : 0;
      const vy = autoTarget.moving ? Math.sin(autoTarget.bodyAngle) * autoTarget.speed : 0;
      aimPoint = { x: autoTarget.x + vx * lead, y: autoTarget.y + vy * lead };
      aimAngle = Math.atan2(aimPoint.y - p.y, aimPoint.x - p.x);
    } else {
      aimAngle = p.bodyAngle;
    }
    p.turretAngle = angleLerp(p.turretAngle, aimAngle, dt * 10);
    if (p.fireCd <= 0 && autoTarget) {
      fireCannon(aimPoint.x, aimPoint.y, p);
    }
  }

  function fireCannon(tx, ty, p) {
    if (!p) p = G.player;
    const tank = tankData(p);
    const st = statsFor(p);
    const lvl = weaponsFor(p).cannon || 1;
    const w = WEAPONS.cannon.levels[Math.min(7, lvl - 1)];
    const angle = Math.atan2(ty - p.y, tx - p.x);
    const fusion = fused('cannon', p);
    const shots = (w.shots || 1) + (tank.extraShots || 0) + (fusion ? 1 : 0);
    const spread = shots > 1 ? .055 : 0;
    const refract = (w.refract || 0) + (tank.refractAdd || 0) + (st.refractAdd || 0) + (fusion ? 2 : 0);
    const explode = (w.explode ? w.explode * st.area : 0) + (tank.explodeAdd ? tank.explodeAdd * st.area : 0) + (fusion ? 38 * st.area : 0);
    const muzzleDist = artImage('playerHull') ? 22 : 25;
    for (let i = 0; i < shots; i++) {
      const a = angle + (i - (shots - 1) / 2) * spread;
      const crit = chance(st.crit);
      const dmg = w.damage * st.damage * (crit ? st.critMult : 1);
      const mx = p.x + Math.cos(a) * muzzleDist, my = p.y + Math.sin(a) * muzzleDist;
      G.bullets.push({
        x: mx, y: my, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
        radius: 3, damage: dmg, crit, refract, explode, owner: p, steelPierce: !!st.steelPierce,
        life: 1.6, maxLife: 1.6, color: st.steelPierce ? '#b896ff' : '#ffd15c', trail: 15, enemy: false, hit: new Set()
      });
    }
    p.fireCd = Math.max(.09, w.interval / st.attackSpeed * st.cdr);
    p.recoil = 1;
    addEffect({ type: 'muzzle', x: p.x + Math.cos(angle) * muzzleDist, y: p.y + Math.sin(angle) * muzzleDist, life: .12, maxLife: .12, color: '#ffd56a' });
    for (let i = 0; i < 4; i++) addParticle(p.x + Math.cos(angle) * (muzzleDist + 2) + rand(3, -3), p.y + Math.sin(angle) * (muzzleDist + 2) + rand(3, -3), Math.cos(angle) * rand(120, 30), Math.sin(angle) * rand(120, 30), '#ffcc6b', 'spark', .22, 1.6);
    AUDIO.shoot();
  }

  function spawnBulletFromDrone(ds, target, lvl, p) {
    const w = WEAPONS.drone.levels[Math.min(7, lvl - 1)];
    const st = statsFor(p);
    const a = Math.atan2(target.y - ds.y, target.x - ds.x);
    const crit = chance(st.crit);
    G.bullets.push({
      x: ds.x, y: ds.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, radius: 2.3,
      damage: w.damage * st.damage * (crit ? st.critMult : 1) * (fused('drone', p) ? 1.3 : 1), crit, refract: st.refractAdd || 0, explode: 0, owner: p, steelPierce: !!st.steelPierce,
      life: .9, maxLife: .9, color: st.steelPierce ? '#b896ff' : '#5ff0ce', trail: 10, enemy: false, hit: new Set()
    });
    addEffect({ type: 'muzzle', x: ds.x, y: ds.y, life: .08, maxLife: .08, color: '#5ff0ce' });
  }

  function addFlamePool(x, y, force, p) {
    const lvl = weaponsFor(p).flame || 0;
    if (!lvl) return;
    const w = WEAPONS.flame.levels[Math.min(7, lvl - 1)];
    const st = statsFor(p);
    const tank = tankData(p);
    const fusion = fused('flame', p);
    if (G.hazards.length > 90) G.hazards.shift();
    G.hazards.push({
      x, y, radius: w.radius * st.area * (fusion ? 1.3 : 1), damage: w.damage * st.damage * (fusion ? 1.3 : 1),
      life: w.life * st.duration, maxLife: w.life * st.duration, tick: .24, seed: rand(TAU), force: !!force, owner: p
    });
  }

  function spawnPlayerBullet(x, y, angle, speed, baseDamage, owner, opts) {
    opts = opts || {};
    const st = statsFor(owner);
    const crit = opts.crit !== undefined ? !!opts.crit : chance(st.crit);
    const damage = baseDamage * st.damage * (crit ? st.critMult : 1) * (opts.damageMul || 1);
    const b = {
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: opts.radius || 2.6,
      damage, crit,
      refract: (opts.refract || 0) + (st.refractAdd || 0),
      explode: opts.explode || 0,
      slow: opts.slow || 0,
      steelPierce: opts.steelPierce !== undefined ? !!opts.steelPierce : !!st.steelPierce,
      owner, life: opts.life || 1.4, maxLife: opts.life || 1.4,
      color: opts.color || (st.steelPierce ? '#b896ff' : '#ffd15c'), trail: opts.trail || 12,
      enemy: false, hit: new Set(), homing: !!opts.homing, target: opts.target || null,
      turn: opts.turn || 0, laser: !!opts.laser
    };
    G.bullets.push(b);
    return b;
  }

  function addToxinPool(x, y, damage, radius, owner, life, tick) {
    if (G.hazards.length > 95) G.hazards.shift();
    G.hazards.push({
      kind: 'toxin', x, y, radius, damage, owner,
      life, maxLife: life, tick: tick || .4, tickEvery: tick || .4, seed: rand(TAU), color: '#a9e56e'
    });
  }

  function pickOrbitTarget(p, range) {
    let best = null, bestD = range * range;
    for (const e of G.enemies) {
      if (e.dead || e.spawnTimer > 0) continue;
      const d = dist2(e.x, e.y, p.x, p.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function updateWeapons(dt) {
    for (const p of G.players || []) {
      if (p.alive && !p.downed) updateWeaponsFor(p, dt);
    }
  }

  function updateWeaponsFor(p, dt) {
    const st = statsFor(p);
    // orbiting drone swarm: bodyguards rotate around the tank, fire at nearby
    // enemies and physically intercept enemy shells.
    const droneLvl = weaponsFor(p).drone || 0;
    if (droneLvl) {
      const w = WEAPONS.drone.levels[Math.min(7, droneLvl - 1)];
      const count = w.count + (tankData(p).droneAdd || 0) + (fused('drone', p) ? 1 : 0);
      while (p.droneState.length < count) {
        const idx = p.droneState.length;
        p.droneState.push({
          phase: (idx / Math.max(1, count)) * TAU, cd: .25 + idx * .16,
          x: p.x + Math.cos(idx * 2.1) * 40, y: p.y + Math.sin(idx * 2.1) * 30,
          fireFlash: 0, blockFlash: 0, target: null, scanCd: 0
        });
      }
      if (p.droneState.length > count) p.droneState.length = count;
      const orbitR = 42 + Math.min(16, count * 3) + (fused('drone', p) ? 4 : 0);
      const orbitSpeed = 1.05 + droneLvl * .045;
      for (let i = 0; i < p.droneState.length; i++) {
        const ds = p.droneState[i];
        ds.scanCd = Math.max(0, (ds.scanCd || 0) - dt);
        if (!ds.target || ds.target.dead || ds.target.spawnTimer > 0 || ds.scanCd <= 0) {
          ds.target = pickOrbitTarget(p, w.range);
          ds.scanCd = .25;
        }
        // Rotate around the hull; the elliptical orbit reads as a guard screen.
        const angle = G.animTime * orbitSpeed + ds.phase;
        ds.x = p.x + Math.cos(angle) * orbitR;
        ds.y = p.y + Math.sin(angle) * orbitR * .82;
        ds.x = clamp(ds.x, 22, W - 22);
        ds.y = clamp(ds.y, 22, H - 22);
        const target = ds.target;
        ds.cd -= dt;
        if (ds.cd <= 0) {
          if (target && !target.dead && dist2(ds.x, ds.y, target.x, target.y) <= w.range * w.range) {
            spawnBulletFromDrone(ds, target, droneLvl, p);
            ds.cd = Math.max(.16, w.interval / st.attackSpeed * st.cdr);
            ds.fireFlash = .1;
          } else ds.cd = .1;
        }
        ds.fireFlash = Math.max(0, ds.fireFlash - dt);
        ds.blockFlash = Math.max(0, (ds.blockFlash || 0) - dt);
      }
    } else p.droneState = [];
    // arc coil
    const arcLvl = weaponsFor(p).arc || 0;
    if (arcLvl) {
      const w = WEAPONS.arc.levels[Math.min(7, arcLvl - 1)];
      const arcChains = w.chains + (tankData(p).arcAdd || 0) + (fused('arc', p) ? 2 : 0);
      const arcDamage = w.damage * (fused('arc', p) ? 1.25 : 1);
      p.arcTimer -= dt;
      if (p.arcTimer <= 0) {
        const first = nearestEnemy(p.x, p.y, w.range);
        if (first) {
          const chain = [first];
          const used = new Set([first.id]);
          let last = first;
          for (let i = 1; i < arcChains; i++) {
            let best = null, bd = Infinity;
            for (const e of G.enemies) {
              if (e.dead || e.spawnTimer > 0 || used.has(e.id)) continue;
              const d = dist2(last.x, last.y, e.x, e.y);
              if (d < 160 * 160 && d < bd) { bd = d; best = e; }
            }
            if (!best) break;
            used.add(best.id); chain.push(best); last = best;
          }
          let prev = { x: p.x, y: p.y };
          const points = [];
          for (const e of chain) {
            const segments = 5;
            for (let s = 0; s < segments; s++) {
              const t = s / segments;
              points.push({
                x: lerp(prev.x, e.x, t) + (s ? rand(7, -7) : 0),
                y: lerp(prev.y, e.y, t) + (s ? rand(7, -7) : 0)
              });
            }
            points.push({ x: e.x, y: e.y });
            const crit = chance(st.crit);
            damageEnemy(e, arcDamage * st.damage * (crit ? st.critMult : 1), crit, 'arc', p);
            addParticle(e.x, e.y, rand(20, -20), rand(20, -20), '#9dd8ff', 'spark', .25, 2);
            prev = e;
          }
          addEffect({ type: 'lightning', points, life: .2, maxLife: .2, color: '#79b9ff' });
          AUDIO.tone(520, .08, 'sawtooth', .02, 1200);
          p.arcTimer = Math.max(.5, w.interval / st.attackSpeed * st.cdr * (fused('arc', p) ? .8 : 1));
        } else p.arcTimer = .2;
      }
    }
    // flame trail
    const flameLvl = weaponsFor(p).flame || 0;
    if (flameLvl && p.moving) {
      const w = WEAPONS.flame.levels[Math.min(7, flameLvl - 1)];
      p.flameTimer -= dt;
      if (p.flameTimer <= 0) {
        p.flameSide = ((p.flameSide || 0) + 1) % 2;
        const side = p.flameSide ? 1 : -1;
        const bx = p.x - p.moveX * 9;
        const by = p.y - p.moveY * 9 + 5;
        addFlamePool(bx - p.moveY * 7 * side, by + p.moveX * 7 * side, false, p);
        addFlamePool(bx + p.moveY * 7 * side, by - p.moveX * 7 * side, false, p);
        p.flameTimer = Math.max(.12, w.interval / st.attackSpeed * st.cdr);
      }
    }
    // mines
    const mineLvl = weaponsFor(p).mine || 0;
    if (mineLvl) {
      const w = WEAPONS.mine.levels[Math.min(7, mineLvl - 1)];
      const mineCount = w.count + (tankData(p).mineAdd || 0) + (fused('mine', p) ? 1 : 0);
      const mineFusion = fused('mine', p);
      p.mineTimer -= dt;
      if (p.mineTimer <= 0) {
        for (let i = 0; i < mineCount; i++) {
          if (G.mines.length > 40) G.mines.shift();
          const spread = (i - (mineCount - 1) / 2) * 17;
          G.mines.push({
            x: p.x - Math.cos(p.bodyAngle) * 16 + Math.cos(p.bodyAngle + Math.PI / 2) * spread,
            y: p.y - Math.sin(p.bodyAngle) * 16 + Math.sin(p.bodyAngle + Math.PI / 2) * spread,
            arm: .45, life: 14, damage: w.damage * st.damage * (mineFusion ? 1.25 : 1), radius: w.radius * st.area * (mineFusion ? 1.3 : 1), seed: rand(TAU), owner: p
          });
        }
        p.mineTimer = Math.max(.6, w.interval / st.attackSpeed * st.cdr);
      }
    }
    // orbital
    const orbLvl = weaponsFor(p).orbital || 0;
    if (orbLvl) {
      const w = WEAPONS.orbital.levels[Math.min(7, orbLvl - 1)];
      const orbitalCount = w.count + (tankData(p).orbitalAdd || 0) + (fused('orbital', p) ? 1 : 0);
      const orbitalFusion = fused('orbital', p);
      p.orbitalTimer -= dt;
      if (p.orbitalTimer <= 0) {
        let candidates = G.enemies.filter(e => !e.dead && e.spawnTimer <= 0);
        const base = G.core && G.core.alive ? G.core : null;
        const baseThreats = base ? candidates.filter(e => dist2(e.x, e.y, base.cx, base.cy) < 230 * 230) : [];
        if (baseThreats.length) candidates = baseThreats;
        if (candidates.length) {
          for (let i = 0; i < orbitalCount; i++) {
            const target = candidates[(Math.random() * candidates.length) | 0];
            const crit = chance(st.crit);
            G.strikes.push({
              x: clamp(target.x + rand(30, -30), 30, W - 30), y: clamp(target.y + rand(30, -30), 30, H - 30),
              radius: w.radius * st.area * (orbitalFusion ? 1.25 : 1),
              damage: w.damage * st.damage * (orbitalFusion ? 1.25 : 1) * (crit ? st.critMult : 1),
              crit, owner: p, delay: w.delay, timer: w.delay, state: 'warn', color: '#b896ff'
            });
          }
          p.orbitalTimer = Math.max(.8, w.interval / st.attackSpeed * st.cdr);
          AUDIO.tone(220, .5, 'sine', .022, 880);
        } else p.orbitalTimer = .4;
      }
    }
    // scatter shotgun
    const scatterLvl = weaponsFor(p).scatter || 0;
    if (scatterLvl) {
      const w = WEAPONS.scatter.levels[Math.min(7, scatterLvl - 1)];
      p.scatterTimer -= dt;
      if (p.scatterTimer <= 0) {
        const target = nearestDirectionalAttackable(p, 560);
        if (target) {
          const baseA = Math.atan2(target.y - p.y, target.x - p.x);
          const pellets = w.pellets + (fused('scatter', p) ? 3 : 0);
          const spread = w.spread * (fused('scatter', p) ? 1.12 : 1);
          for (let i = 0; i < pellets; i++) {
            const a = baseA + (i - (pellets - 1) / 2) * (spread / Math.max(1, pellets - 1));
            spawnPlayerBullet(p.x + Math.cos(a) * 22, p.y + Math.sin(a) * 22, a, w.speed, w.damage, p, {
              refract: w.refract || 0, radius: 2.4, life: .9, color: '#ff9a4a', trail: 9,
              explode: fused('scatter', p) ? 26 * st.area : 0
            });
          }
          addEffect({ type: 'muzzle', x: p.x + Math.cos(baseA) * 25, y: p.y + Math.sin(baseA) * 25, angle: baseA, life: .12, maxLife: .12, color: '#ff9a4a', radius: 9 });
          AUDIO.shoot();
          p.scatterTimer = Math.max(.42, w.interval / st.attackSpeed * st.cdr);
        } else p.scatterTimer = .15;
      }
    }
    // prism laser
    const laserLvl = weaponsFor(p).laser || 0;
    if (laserLvl) {
      const w = WEAPONS.laser.levels[Math.min(7, laserLvl - 1)];
      p.laserTimer -= dt;
      if (p.laserTimer <= 0) {
        const target = nearestDirectionalAttackable(p, 600);
        if (target) {
          const a = Math.atan2(target.y - p.y, target.x - p.x);
          spawnPlayerBullet(p.x + Math.cos(a) * 24, p.y + Math.sin(a) * 24, a, w.speed, w.damage * (fused('laser', p) ? 1.55 : 1), p, {
            refract: w.refract, radius: fused('laser', p) ? 3.6 : 2.6, life: .95, color: '#ff6b8a', trail: 54, laser: true
          });
          addEffect({ type: 'muzzle', x: p.x + Math.cos(a) * 25, y: p.y + Math.sin(a) * 25, angle: a, life: .1, maxLife: .1, color: '#ff6b8a', radius: 12 });
          AUDIO.tone(880, .08, 'sawtooth', .018, 1600);
          p.laserTimer = Math.max(.26, w.interval / st.attackSpeed * st.cdr);
        } else p.laserTimer = .15;
      }
    }
    // homing missile pod
    const missileLvl = weaponsFor(p).missile || 0;
    if (missileLvl) {
      const w = WEAPONS.missile.levels[Math.min(7, missileLvl - 1)];
      p.missileTimer -= dt;
      if (p.missileTimer <= 0) {
        const target = nearestDirectionalAttackable(p, 600);
        if (target) {
          const count = w.count + (fused('missile', p) ? 2 : 0);
          for (let i = 0; i < count; i++) {
            const a = Math.atan2(target.y - p.y, target.x - p.x) + rand(.25, -.25);
            spawnPlayerBullet(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 18, a, w.speed, w.damage, p, {
              homing: true, target, turn: w.turn * (fused('missile', p) ? 1.25 : 1), explode: w.explode * st.area * (fused('missile', p) ? 1.3 : 1),
              radius: 2.8, life: 3.2, color: '#ffd05a', trail: 16
            });
          }
          addEffect({ type: 'muzzle', x: p.x, y: p.y, life: .12, maxLife: .12, color: '#ffd05a', radius: 15 });
          AUDIO.tone(170, .16, 'square', .018, 420);
          p.missileTimer = Math.max(.65, w.interval / st.attackSpeed * st.cdr);
        } else p.missileTimer = .2;
      }
    }
    // cryo pulse
    const frostLvl = weaponsFor(p).frost || 0;
    if (frostLvl) {
      const w = WEAPONS.frost.levels[Math.min(7, frostLvl - 1)];
      p.frostTimer -= dt;
      if (p.frostTimer <= 0) {
        const radius = w.radius * st.area * (fused('frost', p) ? 1.3 : 1);
        let hitAny = false;
        for (const e of G.enemies) {
          if (e.dead || e.spawnTimer > 0) continue;
          if (dist2(p.x, p.y, e.x, e.y) > (radius + e.radius * e.size) ** 2) continue;
          damageEnemy(e, w.damage * st.damage * (fused('frost', p) ? 1.3 : 1), false, 'frost', p);
          e.slowTimer = Math.max(e.slowTimer || 0, w.slow + (fused('frost', p) ? .8 : 0));
          hitAny = true;
        }
        for (const seal of G.seals || []) {
          if (!seal.dead && dist2(p.x, p.y, seal.x, seal.y) < (radius + seal.radius) ** 2) {
            damageSeal(seal, w.damage * st.damage * .7 * (fused('frost', p) ? 1.3 : 1));
            hitAny = true;
          }
        }
        if (hitAny) {
          addEffect({ type: 'ring', x: p.x, y: p.y, radius, life: .45, maxLife: .45, color: '#9bd8ff' });
          addEffect({ type: 'explosion', x: p.x, y: p.y, radius: radius * .55, life: .3, maxLife: .3, color: '#c7f5ff' });
          AUDIO.tone(610, .18, 'sine', .02, 300);
        }
        p.frostTimer = Math.max(.55, w.interval / st.attackSpeed * st.cdr);
      }
    }
    // orbital kinetic rods (legacy weapon id: toxin)
    const toxinLvl = weaponsFor(p).toxin || 0;
    if (toxinLvl) {
      const w = WEAPONS.toxin.levels[Math.min(7, toxinLvl - 1)];
      p.toxinTimer -= dt;
      if (p.toxinTimer <= 0) {
        const candidates = G.enemies.filter(e => !e.dead && e.spawnTimer <= 0 && dist2(e.x, e.y, p.x, p.y) < 640 * 640);
        if (candidates.length) {
          // Prefer the boss, then the toughest target: the rod is a single heavy hit,
          // not another area-denial pool.
          candidates.sort((a, b) => ((b === G.boss ? 1 : 0) - (a === G.boss ? 1 : 0)) || b.hp - a.hp);
          const target = candidates[0];
          const rodCount = w.count + (tankData(p).rodAdd || 0) + (fused('toxin', p) ? 1 : 0);
          for (let i = 0; i < rodCount; i++) {
            const crit = chance(st.crit);
            G.strikes.push({
              x: clamp(target.x + (i ? rand(34, -34) : 0), 30, W - 30),
              y: clamp(target.y + (i ? rand(34, -34) : 0), 30, H - 30),
              radius: w.radius * st.area * (fused('toxin', p) ? 1.25 : 1),
              damage: w.damage * st.damage * (fused('toxin', p) ? 1.2 : 1) * (crit ? st.critMult : 1),
              crit, owner: p, delay: w.delay, timer: w.delay, state: 'warn', kind: 'rod', source: 'kinetic', fusion: fused('toxin', p), color: '#9dbbff'
            });
          }
          p.toxinTimer = Math.max(.7, w.interval / st.attackSpeed * st.cdr);
          AUDIO.tone(130, .45, 'sine', .02, 240);
        } else p.toxinTimer = .3;
      }
    }
    // gravity well
    const gravityLvl = weaponsFor(p).gravity || 0;
    if (gravityLvl) {
      const w = WEAPONS.gravity.levels[Math.min(7, gravityLvl - 1)];
      p.gravityTimer -= dt;
      if (p.gravityTimer <= 0) {
        const target = nearestDirectionalAttackable(p, 560);
        if (target) {
          if (G.vortices.length > 8) G.vortices.shift();
          G.vortices.push({
            x: target.x, y: target.y, radius: w.radius * st.area * (fused('gravity', p) ? 1.3 : 1),
            life: w.life * st.duration, maxLife: w.life * st.duration,
            damage: w.damage * st.damage * (fused('gravity', p) ? 1.35 : 1),
            pull: w.pull * (fused('gravity', p) ? 2 : 1), tick: .45, owner: p, seed: rand(TAU)
          });
          addEffect({ type: 'ring', x: target.x, y: target.y, radius: w.radius * .7, life: .6, maxLife: .6, color: '#b896ff' });
          AUDIO.tone(90, .55, 'sine', .02, 180);
          p.gravityTimer = Math.max(1.1, w.interval / st.attackSpeed * st.cdr);
        } else p.gravityTimer = .3;
      }
    }
    // plasma mortar: ranged arcing shells with a short electromagnetic slow.
    const mortarLvl = weaponsFor(p).mortar || 0;
    if (mortarLvl) {
      const w = WEAPONS.mortar.levels[Math.min(7, mortarLvl - 1)];
      p.mortarTimer -= dt;
      if (p.mortarTimer <= 0) {
        const target = nearestDirectionalAttackable(p, 650);
        if (target) {
          const shells = w.count + (fused('mortar', p) ? 1 : 0);
          const candidates = G.enemies.filter(e => !e.dead && e.spawnTimer <= 0 && dist2(p.x, p.y, e.x, e.y) < 650 * 650);
          for (let i = 0; i < shells; i++) {
            const t = i === 0 ? target : (candidates.length ? pick(candidates) : target);
            const a = Math.atan2(t.y - p.y, t.x - p.x) + rand(.09, -.09);
            spawnPlayerBullet(p.x + Math.cos(a) * 28, p.y + Math.sin(a) * 28, a, w.speed, w.damage, p, {
              radius: 4.4, life: 2.2, color: '#b896ff', trail: 22,
              explode: w.radius * st.area * (fused('mortar', p) ? 1.25 : 1),
              slow: w.slow, damageMul: fused('mortar', p) ? 1.25 : 1
            });
          }
          addEffect({ type: 'muzzle', x: p.x + Math.cos(p.turretAngle) * 28, y: p.y + Math.sin(p.turretAngle) * 28, angle: p.turretAngle, life: .14, maxLife: .14, color: '#b896ff', radius: 12 });
          AUDIO.tone(150, .22, 'sine', .022, 420);
          p.mortarTimer = Math.max(.85, w.interval / st.attackSpeed * st.cdr);
        } else p.mortarTimer = .25;
      }
    }
    // deploy sentry
    const sentryLvl = weaponsFor(p).sentry || 0;
    if (sentryLvl) {
      const w = WEAPONS.sentry.levels[Math.min(7, sentryLvl - 1)];
      const count = w.count + (fused('sentry', p) ? 1 : 0);
      p.sentryTimer -= dt;
      const owned = G.sentries.filter(s => s.owner === p && s.life > 0 && s.hp > 0).length;
      if (p.sentryTimer <= 0 && owned < count) {
        const sentryHp = (60 + sentryLvl * 18 + p.maxHp * .12) * (fused('sentry', p) ? 1.35 : 1);
        const core = G.core && G.core.alive ? G.core : null;
        const coreThreat = core ? nearestEnemy(core.cx, core.cy, 250) : null;
        const threat = coreThreat || nearestEnemy(p.x, p.y, 460);
        const ax = coreThreat ? core.cx : p.x, ay = coreThreat ? core.cy : p.y;
        const deployAngle = threat ? Math.atan2(threat.y - ay, threat.x - ax) : rand(TAU);
        const deployDist = coreThreat ? 76 : 56;
        G.sentries.push({
          x: clamp(ax + Math.cos(deployAngle) * deployDist, 28, W - 28),
          y: clamp(ay + Math.sin(deployAngle) * deployDist, 28, H - 28),
          owner: p, life: w.life * 1.45 * (fused('sentry', p) ? 1.25 : 1), maxLife: w.life * 1.45 * (fused('sentry', p) ? 1.25 : 1),
          range: w.range * (fused('sentry', p) ? 1.15 : 1), fire: w.fire * .85,
          damage: w.damage * (fused('sentry', p) ? 1.25 : 1), fireCd: .3, angle: -Math.PI / 2, seed: rand(TAU),
          hp: sentryHp, maxHp: sentryHp, radius: 15, hitFlash: 0,
          tauntRadius: (150 + sentryLvl * 10) * (fused('sentry', p) ? 1.2 : 1)
        });
        addEffect({ type: 'ring', x: p.x, y: p.y, radius: 24, life: .3, maxLife: .3, color: '#8fffe6' });
        p.sentryTimer = Math.max(.8, w.interval / st.attackSpeed * st.cdr);
      } else if (p.sentryTimer <= 0) p.sentryTimer = .4;
    }
    // electromagnetic pulse matrix
    const empLvl = weaponsFor(p).emp || 0;
    if (empLvl) {
      const w = WEAPONS.emp.levels[Math.min(7, empLvl - 1)];
      const empFusion = fused('emp', p);
      p.empTimer -= dt;
      if (p.empTimer <= 0) {
        const radius = w.radius * st.area * (empFusion ? 1.3 : 1);
        const damage = w.damage * st.damage * (empFusion ? 1.2 : 1);
        const disrupt = w.disrupt * (empFusion ? 1.3 : 1);
        for (const e of G.enemies) {
          if (e.dead || e.spawnTimer > 0) continue;
          const reach = radius + (e.radius || 14) * (e.size || 1) * .3;
          if (dist2(p.x, p.y, e.x, e.y) > reach * reach) continue;
          damageEnemy(e, damage, false, 'emp', p);
          if (e.dead) continue;
          e.empTimer = Math.max(e.empTimer || 0, disrupt * (e.boss ? .45 : 1));
          e.slowTimer = Math.max(e.slowTimer || 0, 1.0);
        }
        // EMP burns out hostile projectiles inside its radius.
        G.enemyBullets = G.enemyBullets.filter(b => dist2(b.x, b.y, p.x, p.y) > radius * radius);
        addEffect({ type: 'ring', x: p.x, y: p.y, radius: radius * 1.02, life: .52, maxLife: .52, color: '#6fd8ff', width: 2 });
        addEffect({ type: 'ring', x: p.x, y: p.y, radius: radius * .66, life: .36, maxLife: .36, color: '#d9fbff', width: 1 });
        addParticles(p.x, p.y, 16, '#6fd8ff', 'spark', .85);
        addShake(4, .16);
        G.flash = .18; G.flashColor = '#6fd8ff';
        AUDIO.tone(180, .22, 'square', .018, 560);
        p.empTimer = Math.max(1.2, w.interval / st.attackSpeed * st.cdr);
      }
    }
    // rail cannon
    const railLvl = weaponsFor(p).rail || 0;
    if (railLvl) {
      const w = WEAPONS.rail.levels[Math.min(7, railLvl - 1)];
      p.railTimer -= dt;
      if (p.railTimer <= 0) {
        const target = nearestDirectionalAttackable(p, 650);
        if (target) {
          const a = Math.atan2(target.y - p.y, target.x - p.x);
          spawnPlayerBullet(p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26, a, w.speed, w.damage * (fused('rail', p) ? 1.35 : 1), p, {
            refract: w.refract, explode: w.explode * st.area * (fused('rail', p) ? 1.3 : 1), radius: 4.2, life: 1.15, color: '#9dbbff', trail: 42
          });
          addEffect({ type: 'muzzle', x: p.x + Math.cos(a) * 28, y: p.y + Math.sin(a) * 28, angle: a, life: .16, maxLife: .16, color: '#9dbbff', radius: 16 });
          addShake(2.5, .15); AUDIO.tone(70, .3, 'square', .025, 160);
          p.railTimer = Math.max(.7, w.interval / st.attackSpeed * st.cdr);
        } else p.railTimer = .2;
      }
    }
  }

  function updateHazards(dt) {
    for (const f of G.hazards) {
      const toxin = f.kind === 'toxin';
      f.life -= dt; f.tick -= dt;
      if (f.tick <= 0) {
        f.tick = toxin ? (f.tickEvery || .4) : .24;
        for (const e of G.enemies) {
          if (e.dead || e.spawnTimer > 0) continue;
          if (dist2(f.x, f.y, e.x, e.y) < (f.radius + e.radius * e.size * .6) ** 2) {
            damageEnemy(e, f.damage, false, toxin ? 'poison' : 'flame', f.owner);
          }
        }
        if (toxin) {
          for (const seal of G.seals || []) {
            if (!seal.dead && dist2(f.x, f.y, seal.x, seal.y) < (f.radius + seal.radius) ** 2) damageSeal(seal, f.damage * .4);
          }
        }
      }
      if (chance(dt * 2)) addParticle(
        f.x + rand(f.radius, -f.radius), f.y + rand(f.radius * .5, -f.radius * .5),
        rand(8, -8), rand(-18, -35), toxin ? '#a9e56e' : '#ff9a45', 'ember', .55, 2
      );
    }
    G.hazards = G.hazards.filter(f => f.life > 0);
    // gravity wells pull enemies toward the center and crush them in ticks.
    for (const v of G.vortices) {
      v.life -= dt; v.tick -= dt;
      for (const e of G.enemies) {
        if (e.dead || e.spawnTimer > 0) continue;
        const d = dist(v.x, v.y, e.x, e.y);
        if (d > 4 && d < v.radius + e.radius) {
          const pull = v.pull * (1 - d / (v.radius + e.radius)) * dt;
          e.x += (v.x - e.x) / d * pull;
          e.y += (v.y - e.y) / d * pull;
        }
      }
      if (v.tick <= 0) {
        v.tick = .45;
        for (const e of G.enemies) {
          if (e.dead || e.spawnTimer > 0) continue;
          if (dist2(v.x, v.y, e.x, e.y) < (v.radius * .72) ** 2) {
            damageEnemy(e, v.damage, false, 'gravity', v.owner);
            e.slowTimer = Math.max(e.slowTimer || 0, .5);
          }
        }
        for (const seal of G.seals || []) {
          if (!seal.dead && dist2(v.x, v.y, seal.x, seal.y) < (v.radius * .72) ** 2) damageSeal(seal, v.damage * .35);
        }
      }
      if (chance(dt * 4)) addParticle(v.x + rand(v.radius, -v.radius), v.y + rand(v.radius, -v.radius), rand(12, -12), rand(12, -12), '#b896ff', 'spark', .4, 2);
    }
    G.vortices = G.vortices.filter(v => v.life > 0);
    // deployed sentries
    for (const s of G.sentries) {
      s.life -= dt; s.fireCd -= dt;
      s.hitFlash = Math.max(0, (s.hitFlash || 0) - dt * 5);
      if (s.life <= 0 || s.hp <= 0) continue;
      if (s.fireCd <= 0) {
        const target = nearestEnemy(s.x, s.y, s.range);
        if (target) {
          const a = Math.atan2(target.y - s.y, target.x - s.x);
          s.angle = a;
          spawnPlayerBullet(s.x + Math.cos(a) * 12, s.y + Math.sin(a) * 12, a, 620, s.damage, s.owner, {
            radius: 2.3, life: 1.1, color: '#8fffe6', trail: 12
          });
          s.fireCd = s.fire;
          addEffect({ type: 'muzzle', x: s.x + Math.cos(a) * 13, y: s.y + Math.sin(a) * 13, angle: a, life: .08, maxLife: .08, color: '#8fffe6', radius: 6 });
        } else s.fireCd = .18;
      }
    }
    G.sentries = G.sentries.filter(s => s.life > 0 && s.hp > 0);
    for (const m of G.mines) {
      m.arm -= dt; m.life -= dt;
      if (m.life <= 0) { m.dead = true; continue; }
      if (m.arm > 0) continue;
      if (m.hostile) {
        const hitPlayer = activePlayers().find(p => dist2(m.x, m.y, p.x, p.y) < (22 + p.radius) ** 2);
        const hitBase = G.core && G.core.alive && dist2(m.x, m.y, G.core.cx, G.core.cy) < (22 + G.core.radius) ** 2;
        const hitSentry = (G.sentries || []).find(s => s.life > 0 && s.hp > 0 && dist2(m.x, m.y, s.x, s.y) < (22 + s.radius) ** 2);
        if (hitPlayer || hitBase || hitSentry) {
          m.dead = true;
          explodeAt(m.x, m.y, m.radius, m.damage, '#ff8a5a', { source: 'mine', hostileOnly: true, hurtPlayer: true, hurtBase: true, hostile: true });
        }
        continue;
      }
      let trigger = null;
      for (const e of G.enemies) {
        if (e.dead || e.spawnTimer > 0) continue;
        if (dist2(m.x, m.y, e.x, e.y) < (22 + e.radius * e.size * .4) ** 2) { trigger = e; break; }
      }
      if (trigger) {
        m.dead = true;
        explodeAt(m.x, m.y, m.radius, m.damage, '#ffcf5a', { source: 'mine', owner: m.owner });
      }
    }
    G.mines = G.mines.filter(m => !m.dead);
    for (const s of G.strikes) {
      if (s.state !== 'warn') continue;
      s.timer -= dt;
      if (s.timer <= 0) {
        s.state = 'done';
        const color = s.color || '#b896ff';
        addEffect({ type: 'beam', x: s.x, y: s.y, radius: s.radius, life: .5, maxLife: .5, color });
        if (s.hostile) {
          addEffect({ type: 'explosion', x: s.x, y: s.y, radius: s.radius, life: .42, maxLife: .42, color });
          addParticles(s.x, s.y, 12, color, 'spark', 1.1);
          for (const p of activePlayers()) {
            if (dist2(s.x, s.y, p.x, p.y) < (s.radius + p.radius) ** 2) damagePlayer(s.damage, p);
          }
          for (const sentry of G.sentries || []) {
            if (sentry.life > 0 && sentry.hp > 0 && dist2(s.x, s.y, sentry.x, sentry.y) < (s.radius + sentry.radius) ** 2) damageSentry(sentry, s.damage * .8, 'strike');
          }
          if (G.core && G.core.alive && dist2(s.x, s.y, G.core.cx, G.core.cy) < (s.radius + G.core.radius) ** 2) {
            damageBase(s.damage * .8, 'hazard');
          }
        } else {
          explodeAt(s.x, s.y, s.radius, s.damage, color, { source: s.source || 'orbital', owner: s.owner, crit: s.crit });
          if (s.kind === 'rod') {
            addEffect({ type: 'ring', x: s.x, y: s.y, radius: s.radius * 1.8, life: .45, maxLife: .45, color: '#dbe8ff' });
            addParticles(s.x, s.y, 18, '#cfe4ff', 'spark', 1.5);
            if (s.fusion) explodeAt(s.x, s.y, s.radius * 1.65, s.damage * .45, '#dbe8ff', { source: 'kinetic', owner: s.owner, crit: false });
          }
        }
        addShake(9, .33);
        G.flash = .6; G.flashColor = color;
        AUDIO.bigExplode();
      }
    }
    G.strikes = G.strikes.filter(s => s.state !== 'done');
  }

  function getWave() {
    if (G.endless) return WAVES[Math.floor(G.elapsed / ENDLESS_WAVE_SPAN) % WAVES.length];
    let w = WAVES[0];
    for (const wave of WAVES) if (G.elapsed >= wave.at) w = wave;
    return w;
  }

  function updateMapHazards(dt) {
    const hz = MAP_HAZARDS[G.arena.id];
    if (!hz) return;
    if (G.elapsed < 6) return;
    G.mapHazardTimer -= dt;
    if (G.mapHazardTimer > 0) return;
    G.mapHazardTimer = hz.period;
    const point = hz.points[G.mapHazardIndex % hz.points.length];
    G.mapHazardIndex += 1;
    const x = (point[0] + .5) * TILE;
    const y = (point[1] + .5) * TILE;
    queueHostileStrike(x, y, hz.radius, hz.damage, hz.color, hz.warning);
    addEffect({ type: 'ring', x, y, radius: hz.radius * .6, life: .5, maxLife: .5, color: hz.color });
  }

  function retireEnemy(e) {
    if (!e || e.dead) return;
    e.dead = true;
    addEffect({ type: 'ring', x: e.x, y: e.y, radius: 18 + e.radius, life: .32, maxLife: .32, color: e.coreColor || '#9fb3a7' });
    for (let i = 0; i < 6; i++) addParticle(e.x, e.y, rand(45, -45), rand(45, -45), e.coreColor || '#9fb3a7', 'smoke', .35, 2);
  }

  function retireOldWaveTypes(activeType) {
    for (const e of G.enemies) {
      if (e.dead || e.boss || e.elite || e.sealTankId || e.retreating) continue;
      if (e.type === activeType) continue;
      e.retreating = true;
      e.retreatTimer = 1.15;
      e.spawnTimer = 0;
    }
  }

  function updateWaves(dt) {
    const pi = phaseIndex();
    if (pi !== G.waveIndex) {
      G.waveIndex = pi;
      const roster = stageRoster();
      // Retire the previous wave type instead of letting five silhouettes
      // accumulate behind the new one. The arena should read as "one new
      // species every two minutes", not "all species at once".
      retireOldWaveTypes(roster[pi]);
      showToast(`第 ${pi + 1} 阶段 · ${phaseLabel()}${G.endless ? ' · 无尽' : ''}`, 'cyan');
      if (G.elapsed > 1 && G.mode === 'playing') {
        for (let i = 0; i < 2; i++) spawnEnemy(pickWaveType());
      }
      AUDIO.tick();
      AUDIO.setIntensity(pi >= 3 ? 1 : 0);
    }

    // Elites are timed events, not a random drop. First one teaches the chest.
    if (!G.endless && !G.boss && G.elapsed >= G.nextEliteAt && G.elapsed < G.bossAt) {
      G.nextEliteAt += ELITE_GAP;
      // One timed elite at a time. If the previous one is still alive, let the
      // player finish it instead of stacking three gold silhouettes.
      const eliteAlive = G.enemies.some(e => e.elite && !e.sealTankId && !e.dead);
      if (!eliteAlive) {
        spawnEnemy('elite', { warning: true });
        showToast('警告：精英单位「破城者」进入战区 · 击破必掉战术宝箱', 'red');
        AUDIO.boss();
      }
    }
    if (G.endless && G.elapsed >= G.endlessEliteAt) {
      G.endlessEliteAt = G.elapsed + ELITE_GAP;
      spawnEnemy('elite', { warning: true });
      showToast('无尽猎杀 · 精英单位进入战区', 'red');
      AUDIO.boss();
    }

    if (G.endless) {
      if (!G.boss && G.elapsed >= G.endlessNextBossAt) {
        G.bossSpawned = true;
        spawnBoss();
      }
    } else if (G.elapsed >= G.bossAt && !G.bossSpawned) {
      G.bossSpawned = true;
      spawnBoss();
      showToast('泰坦级目标降临 · 击破它才能结束战役', 'red');
      AUDIO.boss();
    }

    if (!G.endless && G.bossDefeated) {
      G.victoryTimer = Math.max(0, G.victoryTimer - dt);
      if (G.victoryTimer <= 0 && G.mode === 'playing') {
        endRun(true, 'titan');
        return;
      }
    }

    // During the Titan duel, stop feeding the arena so the boss pattern is readable.
    if (G.boss && !G.endless) return;
    const phase = phaseData();
    const coopCap = G.twoPlayer ? 1.2 : 1;
    const cap = Math.min(G.endless ? ENDLESS_MAX_ENEMIES : 40, Math.round(phase.cap * coopCap));
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0 && G.enemies.length < cap) {
      spawnEnemy(pickWaveType());
      G.spawnTimer = Math.max(.55, phase.spawn * rand(1.08, .82) * (G.runMod && G.runMod.spawnMul ? G.runMod.spawnMul : 1));
    }

    // Side lanes unlock gradually with the active spawn-point set.
    G.sideSpawnTimer -= dt;
    if (G.sideSpawnTimer <= 0) {
      const sidePoints = spawnPoolSides();
      if (G.enemies.length < cap && sidePoints.length) {
        if (!G.sideWarned) { G.sideWarned = true; showToast('侧翼通道开启 · 地图边缘开始入场', 'red'); }
        const squad = G.endless ? Math.min(3, 1 + Math.floor(G.elapsed / 240)) : (G.elapsed >= 240 ? 2 : 1);
        for (let i = 0; i < squad && G.enemies.length < cap; i++) {
          spawnEnemy(pickWaveType(), { spawn: chooseSpawnPoint(sidePoints) });
        }
        G.sideSpawnTimer = Math.max(2.2, 5.6 - Math.min(1, G.elapsed / 600) * 2.6) * (G.runMod && G.runMod.spawnMul ? G.runMod.spawnMul : 1);
      } else {
        G.sideSpawnTimer = 1.2;
      }
    }
  }

  function spawnEnemy(type, opts) {
    opts = opts || {};
    const cfg = ENEMIES[type];
    if (!cfg) return null;
    if (G.enemies.length > 110) return null;
    const spawnPool = activeSpawnPoints();
    let sp = opts.spawn || chooseSpawnPoint(spawnPool);
    if (!opts.spawn) {
      let tries = 0;
      const ps = G.players && G.players.length ? G.players : [G.player];
      while (tries++ < 8 && ps.some(p => p && dist((sp.cx + .5) * TILE, (sp.cy + .5) * TILE, p.x, p.y) < 130)) sp = chooseSpawnPoint(spawnPool);
    }
    const x = (sp.cx + .5) * TILE, y = (sp.cy + .5) * TILE;
    const mod = G.runMod || {};
    const e = {
      id: ++G.entityId,
      type, x, y, cx: sp.cx, cy: sp.cy,
      bodyAngle: Math.PI / 2, turretAngle: Math.PI / 2,
      hp: cfg.hp * (cfg.elite ? 1.15 : 1) * (mod.enemyHp || 1), maxHp: cfg.hp * (cfg.elite ? 1.15 : 1) * (mod.enemyHp || 1),
      damage: cfg.damage * .84 * (mod.enemyDamage || 1), speed: cfg.speed * (mod.enemySpeed || 1), fireCd: rand(2.8, 1.4), fireInterval: cfg.fire, bulletSpeed: cfg.bulletSpeed,
      radius: cfg.radius, size: cfg.size || (cfg.elite ? 1.32 : type === 'heavy' ? 1.25 : type === 'bomber' ? .96 : type === 'scout' ? .9 : type === 'sniper' ? 1.0 : 1.04),
      color: cfg.color, dark: cfg.dark, light: cfg.light, coreColor: cfg.core,
      xp: cfg.xp, elite: !!cfg.elite, boss: !!cfg.boss,
      domain: cfg.domain || 'ground', ai: cfg.ai || 'line', role: cfg.role || 'line', tier: cfg.tier || 1,
      airPhase: rand(TAU), orbit: rand(TAU), orbitDir: chance(.5) ? 1 : -1, teleportCd: rand(4.5, 2.2),
      spawnTimer: opts.warning ? 1.15 : .62, spawnTotal: opts.warning ? 1.15 : .62,
      hitFlash: 0, freeze: 0, trackPhase: rand(TAU), moving: false, moveTarget: null,
      targetMode: 'player', think: rand(.3), contactCd: 0, abilityCd: rand(4, 2), recoil: 0, dead: false
    };
    markCodex(type);
    G.enemies.push(e);
    addEffect({ type: 'spawn', x, y, radius: 24 + e.radius, life: .75, maxLife: .75, color: e.coreColor });
    for (let i = 0; i < 8; i++) addParticle(x, y, rand(55, -55), rand(55, -55), e.coreColor, 'spark', .5, 2);
    return e;
  }

  function spawnBoss() {
    const bossKey = BOSS_BY_MAP[G.arena.id] || 'boss';
    const cfg = ENEMIES[bossKey] || ENEMIES.boss;
    const flying = cfg.domain === 'air' || cfg.domain === 'hover';
    const x = W / 2, y = flying ? 122 : 150;
    const scale = 1 + (G.endless ? G.endlessBossKills * .16 : 0);
    const mod = G.runMod || {};
    const e = {
      id: ++G.entityId, type: 'boss', bossKey, bossKind: cfg.bossKind || 'siege',
      bossName: cfg.name, bossTag: cfg.tag || cfg.en, bossScale: cfg.bossScale || 1.45,
      domain: cfg.domain || 'ground',
      x, y, cx: 14, cy: 4,
      bodyAngle: Math.PI / 2, turretAngle: Math.PI / 2,
      hp: cfg.hp * scale * (mod.bossHp || 1), maxHp: cfg.hp * scale * (mod.bossHp || 1),
      damage: cfg.damage * .88 * (mod.enemyDamage || 1),
      speed: cfg.speed * (mod.enemySpeed || 1), radius: cfg.radius, size: cfg.bossScale || 1.5, bulletSpeed: cfg.bulletSpeed,
      color: cfg.color, dark: cfg.dark, light: cfg.light, coreColor: cfg.core,
      elite: false, boss: true, xp: cfg.xp, spawnTimer: 1.35, spawnTotal: 1.35,
      hitFlash: 0, freeze: 0, trackPhase: 0, fireCd: rand(2.8, 1.6), minionTimer: 11, burstCd: 4.5, shockCd: 7,
      abilityCd: 3.2, specialCd: 5.8, specialIndex: 0, phase: rand(TAU), shieldTimer: 0, contactCd: 0, dead: false
    };
    markCodex(bossKey);
    G.enemies.push(e);
    G.boss = e;
    addEffect({ type: 'spawn', x, y, radius: 58, life: 1.4, maxLife: 1.4, color: cfg.core });
    addShake(10, .8);
    G.flash = .7; G.flashColor = cfg.core;
    U.bossHud.classList.remove('is-hidden');
    const meta = U.bossHud.querySelector('.boss-hud__meta span');
    if (meta) meta.textContent = `首领 · ${cfg.name}`;
    U.bossHpLabel.textContent = `${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}`;
    U.bossHpBar.style.width = '100%';
    showToast(`${cfg.name} 降临`, 'red');
    AUDIO.boss(); AUDIO.setIntensity(1); rumble(1, 360);
  }

  /* ---------------- enemy brain ---------------- */
  function updateEnemies(dt) {
    if (!activePlayers().length && !baseTarget()) return;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.spawnTimer > 0) {
        e.spawnTimer -= dt;
        continue;
      }
      if (e.retreating) {
        e.retreatTimer -= dt;
        if (e.retreatTimer <= 0) retireEnemy(e);
        continue;
      }
      if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.poisonTimer > 0) {
        e.poisonTimer = Math.max(0, e.poisonTimer - dt);
        damageEnemy(e, (e.poisonDps || 0) * dt, false, 'poison', e.poisonOwner);
        if (e.dead) continue;
      }
      if (e.empTimer > 0) {
        e.empTimer = Math.max(0, e.empTimer - dt);
        continue;
      }
      e.freeze = G.freezeTimer;
      if (G.freezeTimer > 0) continue;
      if (e.boss) {
        updateBoss(e, dt);
      } else if (e.domain === 'air') {
        updateAirEnemy(e, dt);
      } else if (e.domain === 'hover') {
        updateHoverEnemy(e, dt);
      } else {
        updateRegularEnemy(e, dt);
      }
      if (e.dead) continue;
      // Ground and hover units can ram; aircraft stay above the collision plane.
      if (e.domain !== 'air') {
        if (e.contactCd > 0) e.contactCd -= dt;
        const p = nearestTarget(e.x, e.y);
        if (p) {
          const contactR = (e.radius * e.size + p.radius + 1);
          if (dist2(e.x, e.y, p.x, p.y) < contactR * contactR) {
            if (e.type === 'bomber') { bomberExplode(e); continue; }
            if (e.contactCd <= 0) {
              if (p.isSentry) damageSentry(p.sentry, e.damage * .9, 'contact');
              else if (p.isBase) damageBase(e.damage * .9, 'contact');
              else damagePlayer(e.damage * .75, p);
              e.contactCd = 1.0;
            }
          }
        }
      }
    }
    G.enemies = G.enemies.filter(e => !e.dead);
  }

  function moveFlyingEnemy(e, tx, ty, dt, speedMul) {
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const step = Math.max(0, e.speed * (speedMul || 1) * (e.slowTimer > 0 ? .7 : 1) * dt);
    e.x += dx / d * Math.min(step, d);
    e.y += dy / d * Math.min(step, d);
    e.x = clamp(e.x, 34, W - 34);
    e.y = clamp(e.y, 30, H - 42);
    e.trackPhase += dt * 6;
  }

  function queueHostileStrike(x, y, radius, damage, color, delay) {
    G.strikes.push({
      x: clamp(x, 28, W - 28), y: clamp(y, 28, H - 28),
      radius, damage, delay: delay || .9, timer: delay || .9, state: 'warn',
      color: color || '#ffb15a', hostile: true
    });
  }

  function updateAirEnemy(e, dt) {
    e.think -= dt;
    e.fireCd -= dt;
    e.abilityCd -= dt;
    e.airPhase += dt;
    const p = nearestTarget(e.x, e.y, e);
    if (!p) return;
    const targetDist = dist(e.x, e.y, p.x, p.y);
    e.turretAngle = angleLerp(e.turretAngle, Math.atan2(p.y - e.y, p.x - e.x), dt * 5);

    let tx, ty;
    if (e.ai === 'airOrbit') {
      e.orbit += dt * .85 * e.orbitDir;
      const radius = 145 + Math.sin(e.airPhase * .7) * 22;
      tx = p.x + Math.cos(e.orbit) * radius;
      ty = p.y + Math.sin(e.orbit) * radius * .62;
    } else if (e.ai === 'airBomber') {
      e.orbit += dt * .35 * e.orbitDir;
      tx = p.x + Math.cos(e.orbit) * 265;
      ty = p.y + Math.sin(e.orbit) * 135 - 30;
    } else if (e.ai === 'airGunship') {
      tx = p.x + Math.cos(e.airPhase * .35) * 285;
      ty = p.y + Math.sin(e.airPhase * .35) * 120 - 25;
    } else {
      tx = p.x + Math.cos(e.airPhase * .6) * 225;
      ty = p.y + Math.sin(e.airPhase * .6) * 105 - 35;
    }
    moveFlyingEnemy(e, tx, ty, dt);
    e.bodyAngle = angleLerp(e.bodyAngle, Math.atan2(ty - e.y, tx - e.x), dt * 3.5);

    if (e.ai === 'airStrafe' && e.abilityCd <= 0 && targetDist < 470) {
      e.abilityCd = 5.2;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      for (let i = 0; i < 3; i++) {
        const d = 70 + i * 62;
        queueHostileStrike(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 30, e.damage * .58, '#ffb15a', .9);
      }
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 36, life: .35, maxLife: .35, color: '#ffb15a' });
    }
    if (e.ai === 'airBomber' && e.abilityCd <= 0 && targetDist < 520) {
      e.abilityCd = 5.6;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      for (let i = -1; i <= 1; i++) {
        const aa = a + i * .28;
        queueHostileStrike(p.x + Math.cos(aa) * 42, p.y + Math.sin(aa) * 42, 36, e.damage * .7, '#ffcf5a', 1.0);
      }
    }
    if (e.damage > 0 && e.fireCd <= 0 && targetDist < 480 && e.ai !== 'airBomber') {
      const st = ENEMY_ATTACK_STYLE[e.type] || {};
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const shots = Math.max(1, st.shots || 1);
      const spread = st.spread || 0;
      for (let i = 0; i < shots; i++) {
        const aa = a + (i - (shots - 1) / 2) * spread;
        fireEnemyBullet(e, e.x + Math.cos(aa) * 15, e.y + Math.sin(aa) * 15, aa, e.bulletSpeed * (st.speedMul || 1), e.damage * (st.damageMul || 1), {
          color: st.color || (e.ai === 'airGunship' ? '#ffc36b' : '#7fe8ff'),
          radius: st.radius || 2.8, trail: st.trail || 18,
          shape: st.shape || 'orb', splash: st.splash || 0,
          splashMul: st.splashMul == null ? .5 : st.splashMul,
          homing: !!st.homing, turn: st.turn, homingDelay: st.homingDelay
        });
      }
      e.fireCd = Math.max(.7, (e.fireInterval || 2.2) * rand(1.2, .8));
      e.recoil = 1;
    }
  }

  function updateHoverEnemy(e, dt) {
    e.think -= dt;
    e.fireCd -= dt;
    e.abilityCd -= dt;
    e.teleportCd -= dt;
    e.airPhase += dt;
    const p = nearestTarget(e.x, e.y, e);
    if (!p) return;
    const targetDist = dist(e.x, e.y, p.x, p.y);
    e.turretAngle = angleLerp(e.turretAngle, Math.atan2(p.y - e.y, p.x - e.x), dt * 4);

    if (e.ai === 'xenoWarper' && e.teleportCd <= 0 && targetDist > 90) {
      e.teleportCd = 4.8;
      const a = Math.atan2(p.y - e.y, p.x - e.x) + rand(1.1, -1.1);
      const radius = rand(135, 85);
      const nx = clamp(p.x + Math.cos(a) * radius, 38, W - 38);
      const ny = clamp(p.y + Math.sin(a) * radius, 38, H - 54);
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 34, life: .45, maxLife: .45, color: '#b9a8ff' });
      addParticles(e.x, e.y, 12, '#b9a8ff', 'spark', .7);
      e.x = nx; e.y = ny;
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 34, life: .45, maxLife: .45, color: '#5ff0ce' });
      e.bodyAngle = Math.atan2(p.y - e.y, p.x - e.x);
    }

    let tx, ty;
    if (e.ai === 'xenoWarden') {
      tx = p.x + Math.cos(e.airPhase * .28) * 205;
      ty = p.y + Math.sin(e.airPhase * .28) * 115;
    } else if (e.ai === 'xenoBeam') {
      tx = p.x + Math.cos(e.airPhase * .22) * 260;
      ty = p.y + Math.sin(e.airPhase * .22) * 120 - 25;
    } else {
      e.orbit += dt * .55 * e.orbitDir;
      tx = p.x + Math.cos(e.orbit) * 175;
      ty = p.y + Math.sin(e.orbit) * 90;
    }
    moveFlyingEnemy(e, tx, ty, dt, .82);
    e.bodyAngle = angleLerp(e.bodyAngle, Math.atan2(p.y - e.y, p.x - e.x), dt * 2.5);

    if (e.ai === 'xenoBeam' && e.abilityCd <= 0 && targetDist < 440) {
      e.abilityCd = 5.4;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      for (let i = 0; i < 3; i++) {
        const d = 80 + i * 72;
        queueHostileStrike(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 28, e.damage * .56, '#9b7bff', .95);
      }
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 42, life: .45, maxLife: .45, color: '#9b7bff' });
    }
    if (e.damage > 0 && e.fireCd <= 0 && targetDist < 440 && e.ai !== 'xenoBeam') {
      const st = ENEMY_ATTACK_STYLE[e.type] || {};
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const shots = Math.max(1, st.shots || 1);
      const spread = st.spread || 0;
      for (let i = 0; i < shots; i++) {
        const aa = a + (i - (shots - 1) / 2) * spread;
        fireEnemyBullet(e, e.x + Math.cos(aa) * 18, e.y + Math.sin(aa) * 18, aa, e.bulletSpeed * (st.speedMul || 1), e.damage * (st.damageMul || 1), {
          color: st.color || (e.ai === 'xenoWarden' ? '#b9a8ff' : '#7fe8ff'),
          radius: st.radius || 2.8, trail: st.trail || 22,
          shape: st.shape || 'orb', splash: st.splash || 0,
          splashMul: st.splashMul == null ? .5 : st.splashMul,
          homing: !!st.homing, turn: st.turn, homingDelay: st.homingDelay
        });
      }
      e.fireCd = Math.max(.8, (e.fireInterval || 2.4) * rand(1.15, .8));
      e.recoil = 1;
    }
  }

  function updateRegularEnemy(e, dt) {
    e.think -= dt;
    if (G.elapsed >= 7) e.fireCd -= dt;
    else e.fireCd = Math.max(e.fireCd, 1.4);
    e.abilityCd -= dt;
    e.recoil = Math.max(0, e.recoil - dt * 6);
    const p = nearestTarget(e.x, e.y, e);
    if (!p) return;
    const targetMode = p.isBase ? 'base' : 'player';
    const tx = p.x;
    const ty = p.y;
    const targetDist = dist(e.x, e.y, tx, ty);
    const attackStyle = ENEMY_ATTACK_STYLE[e.type] || {};
    // turret aim
    if (e.type !== 'bomber') {
      e.turretAngle = angleLerp(e.turretAngle, Math.atan2(ty - e.y, tx - e.x), dt * 5);
    }
    // elite area burst
    if (e.elite && e.abilityCd <= 0) {
      e.abilityCd = 8.5;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + rand(.15, -.15);
        fireEnemyBullet(e, e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, a, e.bulletSpeed * .48, e.damage * .35, { color: '#ffb52d', radius: 3.4, shape: 'orb' });
      }
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 64, life: .5, maxLife: .5, color: '#ffb52d' });
      addShake(3, .2);
    }
    // minelayer leaves a hostile mine trail; this is its pressure, not a gun.
    if (e.ai === 'minelayer' && e.abilityCd <= 0) {
      e.abilityCd = 2.6;
      if (G.mines.length < 55) {
        G.mines.push({
          x: e.x - Math.cos(e.bodyAngle) * 15,
          y: e.y - Math.sin(e.bodyAngle) * 15,
          arm: .8, life: 12, damage: e.damage * 1.6, radius: 30,
          seed: rand(TAU), hostile: true
        });
      }
    }
    // firing: artillery uses a telegraphed ground strike; everyone else uses a shell.
    if (e.ai === 'artillery' && targetDist < 480 && e.fireCd <= 0) {
      const lead = targetMode === 'player' ? clamp(targetDist / 260, 0, .6) : 0;
      const px = targetMode === 'player' ? p.x + p.moveX * p.speed * lead : tx;
      const py = targetMode === 'player' ? p.y + p.moveY * p.speed * lead : ty;
      queueHostileStrike(px, py, 38, e.damage, '#ffb15a', 1.05);
      addEffect({ type: 'ring', x: px, y: py, radius: 34, life: .35, maxLife: .35, color: '#ffb15a' });
      e.fireCd = (e.fireInterval || 3.8) * rand(1.2, .85);
      e.recoil = 1;
    } else if (targetDist < 455 && e.fireCd <= 0 && e.type !== 'bomber' && e.ai !== 'minelayer' && e.ai !== 'artillery' && e.ai !== 'rusher') {
      const interval = e.fireInterval || ENEMIES[e.type].fire || 2.3;
      const shots = Math.max(1, attackStyle.shots || (e.elite ? 3 : 1));
      const spread = attackStyle.spread != null ? attackStyle.spread : (e.elite ? .16 : 0);
      const bulletSpeed = e.bulletSpeed * (attackStyle.speedMul || 1);
      const bulletDamage = e.damage * (attackStyle.damageMul || 1);
      const lead = targetMode === 'player' ? clamp(dist(e.x, e.y, tx, ty) / bulletSpeed, 0, .22) : 0;
      const px = targetMode === 'player' ? p.x + p.moveX * p.speed * lead : tx;
      const py = targetMode === 'player' ? p.y + p.moveY * p.speed * lead : ty;
      const baseAngle = Math.atan2(py - e.y, px - e.x);
      for (let i = 0; i < shots; i++) {
        const a = baseAngle + (i - (shots - 1) / 2) * spread;
        fireEnemyBullet(e, e.x + Math.cos(a) * (e.radius + 5), e.y + Math.sin(a) * (e.radius + 5), a, bulletSpeed, bulletDamage, {
          color: attackStyle.color || (e.elite ? '#ffd15c' : '#ff6860'),
          radius: attackStyle.radius || (e.elite ? 4.2 : 3.2),
          trail: attackStyle.trail || 14,
          shape: attackStyle.shape || (e.elite ? 'orb' : 'shell'),
          splash: attackStyle.splash || 0,
          splashMul: attackStyle.splashMul == null ? .5 : attackStyle.splashMul
        });
      }
      e.fireCd = interval * rand(1.15, .8);
      e.recoil = 1;
    }
    if (e.type === 'bomber') {
      // bombers chase directly; they do not shoot
    }
    // movement
    if (e.moving && e.moveTarget) {
      const dx = e.moveTarget.x - e.x, dy = e.moveTarget.y - e.y;
      const dd = Math.hypot(dx, dy);
      const step = e.speed * (e.slowTimer > 0 ? .7 : 1) * dt;
      if (dd <= step) {
        e.x = e.moveTarget.x; e.y = e.moveTarget.y;
        e.cx = Math.round((e.x - TILE / 2) / TILE);
        e.cy = Math.round((e.y - TILE / 2) / TILE);
        e.moving = false; e.moveTarget = null;
      } else {
        e.x += dx / dd * step; e.y += dy / dd * step;
        e.trackPhase += dt * 7;
      }
    } else if (e.think <= 0) {
      e.think = .12;
      let shouldHold = false;
      if (targetDist < 205) shouldHold = true;
      if (e.ai === 'artillery' && targetDist < 300) shouldHold = true;
      if (e.ai === 'minelayer' && targetDist < 180) shouldHold = true;
      if (!shouldHold) {
        const flow = p.isBase ? G.flowBase : (G.flowPlayers[p.index] || G.flowPlayer);
        let dir = flowDirection(flow, e.x, e.y, null);
        if (!dir) {
          const dx = Math.sign(tx - e.x), dy = Math.sign(ty - e.y);
          dir = Math.abs(tx - e.x) > Math.abs(ty - e.y) ? { dx, dy: 0, nx: e.cx + dx, ny: e.cy } : { dx: 0, dy, nx: e.cx, ny: e.cy + dy };
        }
        if (dir && dir.nx >= 0 && dir.ny >= 0 && dir.nx < COLS && dir.ny < ROWS) {
          const nextTile = G.tiles[dir.ny][dir.nx];
          if (nextTile && nextTile.type === 'brick') {
            // dig in
            e.bodyAngle = Math.atan2(dir.dy, dir.dx);
            e.turretAngle = e.bodyAngle;
            if (e.fireCd <= 0 && e.type !== 'bomber' && e.ai !== 'minelayer' && e.ai !== 'artillery' && e.ai !== 'rusher') {
              const bx = (dir.nx + .5) * TILE, by = (dir.ny + .5) * TILE;
              fireEnemyBullet(e, e.x + Math.cos(e.bodyAngle) * (e.radius + 4), e.y + Math.sin(e.bodyAngle) * (e.radius + 4), e.bodyAngle, e.bulletSpeed * (attackStyle.speedMul || 1), e.damage * 1.1, {
                color: attackStyle.color || '#ff8062', radius: attackStyle.radius || 3.2,
                trail: attackStyle.trail || 14, shape: attackStyle.shape || 'shell',
                splash: attackStyle.splash || 0, splashMul: attackStyle.splashMul == null ? .5 : attackStyle.splashMul
              });
              e.fireCd = (e.fireInterval || ENEMIES[e.type].fire || 2.2) * .75;
              e.recoil = 1;
            }
          } else if (nextTile && (nextTile.type === 'steel' || nextTile.type === 'water' || nextTile.type === 'void' || nextTile.type === 'core')) {
            // blocked; fire toward it, or stop
            e.bodyAngle = Math.atan2(dir.dy, dir.dx);
            e.turretAngle = e.bodyAngle;
          } else {
            e.bodyAngle = Math.atan2(dir.dy, dir.dx);
            e.moving = true;
            e.moveTarget = { x: (dir.nx + .5) * TILE, y: (dir.ny + .5) * TILE };
          }
        }
      }
    }
    // bombers proximity trigger
    if (e.type === 'bomber') {
      if (dist(e.x, e.y, p.x, p.y) < 30) bomberExplode(e);
    }
  }

  function bomberExplode(e) {
    if (e.dead) return;
    killEnemy(e, 'bomber');
  }

  function fireEnemyBullet(e, x, y, angle, speed, damage, opts) {
    opts = opts || {};
    if (G.enemyBullets.length > 240) return;
    const life = opts.life || 3;
    const shape = opts.shape || (e && e.boss ? 'orb' : opts.homing ? 'orb' : 'shell');
    G.enemyBullets.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: opts.radius || 3.2, damage, life, maxLife: life,
      color: opts.color || '#ff6860', trail: opts.trail || 14, enemy: true, ownerId: e.id, hit: null,
      shape, splash: opts.splash || 0, splashMul: opts.splashMul == null ? .5 : opts.splashMul,
      homing: !!opts.homing, turn: opts.turn || 1.3, homingDelay: opts.homingDelay || 0
    });
    if (!G.lastEnemySound || performance.now() - G.lastEnemySound > 100) {
      G.lastEnemySound = performance.now();
      AUDIO.enemyShoot();
    }
  }

  function bossFan(e, count, spread, speedMul, damageMul, color, radius) {
    const p = nearestTarget(e.x, e.y, e);
    if (!p) return;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    for (let i = 0; i < count; i++) {
      const aa = a + (i - (count - 1) / 2) * spread;
      fireEnemyBullet(e, e.x + Math.cos(aa) * 34, e.y + Math.sin(aa) * 34, aa, e.bulletSpeed * speedMul, e.damage * damageMul, {
        color, radius: radius || 3.6, trail: 22
      });
    }
  }

  function bossRadial(e, count, speedMul, damageMul, color, radius) {
    for (let i = 0; i < count; i++) {
      const a = i / count * TAU + e.id * .17;
      fireEnemyBullet(e, e.x + Math.cos(a) * 32, e.y + Math.sin(a) * 32, a, e.bulletSpeed * speedMul, e.damage * damageMul, {
        color, radius: radius || 3.4, trail: 18
      });
    }
  }

  function bossSummon(e, type, count) {
    for (let i = 0; i < count; i++) {
      const sx = clamp(e.x + rand(64, -64), 36, W - 36);
      const sy = clamp(e.y + rand(64, 20), 38, H - 38);
      spawnEnemy(type, { spawn: { cx: Math.floor(sx / TILE), cy: Math.floor(sy / TILE) } });
      addEffect({ type: 'ring', x: sx, y: sy, radius: 34, life: .5, maxLife: .5, color: e.coreColor });
    }
  }

  function updateSiegeBoss(e, dt, p, enraged, dp) {
    if (e.fireCd <= 0) {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      bossFan(e, enraged ? 3 : 1, .14, 1, 1, enraged ? '#ff8a6b' : '#ff6b58', 4.8);
      e.fireCd = enraged ? 1.35 : 1.9;
      e.recoil = 1;
      addShake(enraged ? 3.2 : 2.4, .16);
      addEffect({ type: 'muzzle', x: e.x + Math.cos(a) * 44, y: e.y + Math.sin(a) * 44, angle: a, life: .18, maxLife: .18, color: '#ffb16b', radius: 16 });
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 5.2 : 7.2;
      bossFan(e, 5, .16, .82, .55, '#ffc36b', 3.6);
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 46, life: .35, maxLife: .35, color: '#ffcf73' });
      addShake(4, .22);
    }
    if (e.shockCd <= 0 && dp < 165) {
      e.shockCd = enraged ? 6 : 9;
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 120, life: .7, maxLife: .7, color: '#ff5f4a' });
      addParticles(e.x, e.y, 22, '#ff9b62', 'spark', 1.2);
      if (p.isSentry) damageSentry(p.sentry, e.damage * 1.2, 'shockwave');
      else if (p.isBase) damageBase(e.damage * 1.2, 'shockwave');
      else damagePlayer(e.damage * .8, p);
      addShake(8, .45);
    }
    if (e.minionTimer <= 0) {
      e.minionTimer = enraged ? 8 : 12;
      bossSummon(e, enraged ? 'grunt' : 'scout', enraged ? 2 : 1);
    }
  }

  function updateHiveBoss(e, dt, p, enraged) {
    if (e.fireCd <= 0) {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      for (let i = -1; i <= 1; i++) {
        const aa = a + i * .2;
        fireEnemyBullet(e, e.x + Math.cos(aa) * 32, e.y + Math.sin(aa) * 32, aa, e.bulletSpeed, e.damage * .55, { color: '#b9f06a', radius: 3.8, trail: 22, shape: 'blob' });
      }
      e.fireCd = enraged ? 1.5 : 2.1;
      e.recoil = 1;
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 3.8 : 5.5;
      addToxinPool(p.x + rand(26, -26), p.y + rand(26, -26), e.damage * .35, 52, null, 5.5, .4);
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 56, life: .5, maxLife: .5, color: '#a9e56e' });
    }
    if (e.minionTimer <= 0) {
      e.minionTimer = enraged ? 5.5 : 8;
      bossSummon(e, enraged ? 'splitter' : 'scrap', enraged ? 2 : 3);
    }
  }

  function updateCryoBoss(e, dt, p, enraged) {
    if (e.abilityCd <= 0) {
      e.abilityCd = enraged ? 4.5 : 6.2;
      e.shieldTimer = 3.6;
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 90, life: .7, maxLife: .7, color: '#7fe8ff' });
      addShake(3, .25);
    }
    if (e.fireCd <= 0) {
      bossRadial(e, enraged ? 10 : 7, .7, .6, '#a8f0ff', 3.5);
      e.fireCd = enraged ? 1.7 : 2.4;
      e.recoil = 1;
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4.2 : 6.4;
      queueHostileStrike(p.x, p.y, 58, e.damage * .45, '#7fe8ff', 1.0);
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 42, life: .4, maxLife: .4, color: '#7fe8ff' });
    }
  }

  function updateDreadBoss(e, dt, p, enraged) {
    if (e.fireCd <= 0) {
      // broadside volley: shells rake across the arena from both flanks
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const a = e.bodyAngle + side * Math.PI / 2 + (i - 1) * .12;
          fireEnemyBullet(e, e.x + Math.cos(a) * 38, e.y + Math.sin(a) * 38, a, e.bulletSpeed * .8, e.damage * .62, { color: '#ff8a76', radius: 4.2, trail: 26 });
        }
      }
      e.fireCd = enraged ? 1.5 : 2.2;
      e.recoil = 1;
      addShake(4, .25);
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4.5 : 6.8;
      bossFan(e, 4, .18, .7, .45, '#ffb09a', 3.8);
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 74, life: .45, maxLife: .45, color: '#ff5b4a' });
    }
  }

  function updateBurrowerBoss(e, dt, p, enraged) {
    if (e.abilityCd <= 0) {
      e.abilityCd = enraged ? 4.2 : 5.8;
      const nx = clamp(p.x + rand(110, -110), 60, W - 60);
      const ny = clamp(p.y + rand(80, -80), 55, H - 60);
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 44, life: .5, maxLife: .5, color: '#ff8a3a' });
      addParticles(e.x, e.y, 16, '#ffb15a', 'debris', 1);
      e.x = nx; e.y = ny;
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 58, life: .55, maxLife: .55, color: '#ff8a3a' });
      queueHostileStrike(e.x, e.y, 70, e.damage * .7, '#ff8a3a', .85);
    }
    if (e.fireCd <= 0) {
      bossRadial(e, enraged ? 8 : 5, .75, .5, '#ffbe7a', 3.8);
      e.fireCd = enraged ? 1.8 : 2.6;
      e.recoil = 1;
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4.4 : 6.2;
      queueHostileStrike(p.x, p.y, 52, e.damage * .5, '#ffbe7a', 1.1);
    }
  }

  function updateSkycarrierBoss(e, dt, p, enraged) {
    if (e.minionTimer <= 0) {
      e.minionTimer = enraged ? 6 : 9;
      bossSummon(e, enraged ? 'strafer' : 'drone', enraged ? 2 : 1);
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4.2 : 6.2;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      for (let i = 0; i < 3; i++) queueHostileStrike(p.x + Math.cos(a + i * .2) * 50, p.y + Math.sin(a + i * .2) * 50, 30, e.damage * .5, '#5ff0ce', .9);
      addShake(3, .2);
    }
    if (e.fireCd <= 0) {
      bossFan(e, enraged ? 4 : 2, .15, 1, .55, '#7fe8ff', 3.2);
      e.fireCd = enraged ? 1.4 : 2.1;
    }
  }

  function updateXenarchBoss(e, dt, p, enraged) {
    if (e.abilityCd <= 0) {
      e.abilityCd = enraged ? 4 : 5.5;
      const nx = clamp(p.x + rand(150, -150), 48, W - 48);
      const ny = clamp(p.y + rand(110, -110), 48, H - 60);
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 46, life: .45, maxLife: .45, color: '#b9a8ff' });
      e.x = nx; e.y = ny;
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 46, life: .45, maxLife: .45, color: '#5ff0ce' });
    }
    if (e.fireCd <= 0) {
      bossFan(e, enraged ? 5 : 3, .18, 1, .52, '#9b7bff', 3.4);
      e.fireCd = enraged ? 1.5 : 2.2;
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4 : 5.8;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      for (let i = 0; i < 3; i++) queueHostileStrike(e.x + Math.cos(a) * (80 + i * 70), e.y + Math.sin(a) * (80 + i * 70), 28, e.damage * .45, '#9b7bff', 1.0);
    }
  }

  function updateSentinelBoss(e, dt, p, enraged) {
    if (e.abilityCd <= 0) {
      e.abilityCd = enraged ? 6 : 8;
      e.shieldTimer = 4.2;
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 92, life: .8, maxLife: .8, color: '#ffcf5a' });
      addShake(4, .3);
    }
    if (e.fireCd <= 0) {
      bossRadial(e, enraged ? 12 : 8, .68, .5, '#ffe6a8', 3.4);
      e.fireCd = enraged ? 1.7 : 2.4;
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4.5 : 6.2;
      bossFan(e, 5, .14, .8, .5, '#ffcf5a', 3.6);
    }
  }

  function updateSkyfortressBoss(e, dt, p, enraged) {
    if (e.minionTimer <= 0) {
      e.minionTimer = enraged ? 7 : 10;
      bossSummon(e, 'gunship', 1);
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4 : 6;
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + e.phase;
        queueHostileStrike(p.x + Math.cos(a) * 65, p.y + Math.sin(a) * 65, 34, e.damage * .45, '#7fe8ff', 1.1);
      }
    }
    if (e.fireCd <= 0) {
      bossRadial(e, enraged ? 8 : 5, .75, .45, '#d8e8f0', 3.4);
      e.fireCd = enraged ? 1.8 : 2.5;
    }
  }

  function updateLeviathanBoss(e, dt, p, enraged) {
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4 : 5.6;
      addToxinPool(p.x + rand(50, -50), p.y + rand(50, -50), e.damage * .3, 66, null, 6.5, .45);
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 70, life: .5, maxLife: .5, color: '#5ff0ce' });
    }
    if (e.fireCd <= 0) {
      bossRadial(e, enraged ? 9 : 6, .7, .5, '#a8f0e0', 4);
      e.fireCd = enraged ? 1.9 : 2.7;
    }
    if (e.shockCd <= 0 && dist(e.x, e.y, p.x, p.y) < 220) {
      e.shockCd = enraged ? 5 : 7.5;
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 150, life: .8, maxLife: .8, color: '#5ff0ce' });
      if (p.isSentry) damageSentry(p.sentry, e.damage * .6, 'tentacle'); else if (p.isBase) damageBase(e.damage * .6, 'tentacle'); else damagePlayer(e.damage * .55, p);
      addShake(9, .5);
    }
  }

  function updateSeraphBoss(e, dt, p, enraged) {
    e.phase += dt * .7;
    if (e.fireCd <= 0) {
      bossRadial(e, enraged ? 14 : 9, .65, .45, '#ffcf5a', 3.2);
      e.fireCd = enraged ? 1.6 : 2.3;
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4.2 : 5.8;
      for (let i = 0; i < 6; i++) {
        const a = e.phase + i / 6 * TAU;
        fireEnemyBullet(e, e.x + Math.cos(a) * 36, e.y + Math.sin(a) * 36, a, e.bulletSpeed * .55, e.damage * .4, { color: '#ffb52d', radius: 4.4, trail: 28 });
      }
    }
  }

  function updateWarlordBoss(e, dt, p, enraged, dp) {
    if (e.minionTimer <= 0) {
      e.minionTimer = enraged ? 8 : 12;
      bossSummon(e, 'elite', enraged ? 2 : 1);
    }
    if (e.abilityCd <= 0 && dp < 300) {
      e.abilityCd = enraged ? 4.8 : 7;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      e.x = clamp(e.x + Math.cos(a) * 88, 50, W - 50);
      e.y = clamp(e.y + Math.sin(a) * 88, 50, H - 60);
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 70, life: .55, maxLife: .55, color: '#ff8a76' });
      if (p.isSentry) damageSentry(p.sentry, e.damage * .5, 'charge'); else if (p.isBase) damageBase(e.damage * .5, 'charge'); else damagePlayer(e.damage * .45, p);
      addShake(5, .3);
    }
    if (e.fireCd <= 0) {
      bossFan(e, enraged ? 3 : 1, .13, 1, .9, '#ffb18a', 4.4);
      e.fireCd = enraged ? 1.25 : 1.8;
      e.recoil = 1;
    }
    if (e.burstCd <= 0) {
      e.burstCd = enraged ? 4 : 6;
      bossFan(e, 6, .16, .8, .5, '#ff5b4a', 3.4);
    }
  }

  function bossRayStrikes(e, angle, count, spacing, radius, damage, color, delay, delayStep, startDist) {
    const start = startDist == null ? 72 : startDist;
    for (let i = 0; i < count; i++) {
      const d = start + i * spacing;
      queueHostileStrike(e.x + Math.cos(angle) * d, e.y + Math.sin(angle) * d, radius, damage, color, (delay || .7) + i * (delayStep == null ? .08 : delayStep));
    }
  }

  function bossLineStrikes(e, p, count, spacing, radius, damage, color, delay, startDist) {
    const angle = Math.atan2(p.y - e.y, p.x - e.x);
    bossRayStrikes(e, angle, count, spacing, radius, damage, color, delay, .09, startDist);
  }

  function bossRingStrikesAt(cx, cy, count, ringRadius, hitRadius, damage, color, delay, startAngle, skip) {
    const base = startAngle == null ? 0 : startAngle;
    for (let i = 0; i < count; i++) {
      if (i === skip) continue;
      const a = base + i / count * TAU;
      queueHostileStrike(cx + Math.cos(a) * ringRadius, cy + Math.sin(a) * ringRadius, hitRadius, damage, color, (delay || .7) + i * .045);
    }
  }

  function bossRingStrikes(e, p, count, ringRadius, hitRadius, damage, color, delay, skip) {
    bossRingStrikesAt(p.x, p.y, count, ringRadius, hitRadius, damage, color, delay, e.id * .2, skip);
  }

  function bossTorpedo(e, angle, damage, color, speedMul) {
    fireEnemyBullet(e, e.x + Math.cos(angle) * 34, e.y + Math.sin(angle) * 34, angle, e.bulletSpeed * .46 * (speedMul || 1), damage, {
      color: color || '#ff8a76', radius: 5.8, trail: 38, life: 5.2, homing: true, turn: 1.05, homingDelay: .18
    });
  }

  function bossSignature(e, p, enraged) {
    const phase = (e.specialIndex || 0) % 2;
    e.specialIndex = (e.specialIndex || 0) + 1;
    e.specialCd = enraged ? 4.7 : 6.8;
    const color = e.coreColor || '#ffcf5a';
    addEffect({ type: 'ring', x: e.x, y: e.y, radius: 86, life: .55, maxLife: .55, color });
    addShake(2.5, .16);
    switch (e.bossKind) {
      case 'siege': {
        if (phase === 0) {
          bossLineStrikes(e, p, 6, 54, 32, e.damage * .62, '#ff9a45', .65, 60);
        } else {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          for (const off of [-.22, 0, .22]) bossRayStrikes(e, a + off, 4, 56, 30, e.damage * .45, '#ffc36b', .7, .07, 75);
        }
        break;
      }
      case 'hive': {
        if (phase === 0) {
          bossSummon(e, 'splitter', enraged ? 3 : 2);
          for (let i = 0; i < 5; i++) {
            const a = i / 5 * TAU + e.id * .3;
            addToxinPool(p.x + Math.cos(a) * 66, p.y + Math.sin(a) * 66, e.damage * .28, 48, null, 5.2, .42);
          }
        } else {
          bossRingStrikes(e, p, 8, 82, 34, e.damage * .38, '#a9e56e', .75, 2);
          for (let i = 0; i < 4; i++) addToxinPool(p.x + rand(48, -48), p.y + rand(48, -48), e.damage * .25, 55, null, 6, .45);
        }
        break;
      }
      case 'cryo': {
        if (phase === 0) {
          bossRingStrikes(e, p, 8, 76, 32, e.damage * .42, '#8feaff', .75, 2);
          addEffect({ type: 'ring', x: p.x, y: p.y, radius: 86, life: .55, maxLife: .55, color: '#8feaff' });
        } else {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          for (let i = -2; i <= 2; i++) bossRayStrikes(e, a + i * .16, 3, 58, 28, e.damage * .34, '#b8f5ff', .7, .1, 70);
        }
        break;
      }
      case 'dread': {
        if (phase === 0) {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          for (let i = -2; i <= 2; i++) bossTorpedo(e, a + i * .24, e.damage * .72, '#ff8a76', 1);
        } else {
          bossLineStrikes(e, p, 5, 62, 36, e.damage * .5, '#ffb09a', .7, 48);
        }
        break;
      }
      case 'burrower': {
        if (phase === 0) {
          bossLineStrikes(e, p, 6, 50, 38, e.damage * .56, '#ffbe7a', .55, 40);
          addParticles(e.x, e.y, 18, '#ffb15a', 'debris', 1.2);
        } else {
          bossRingStrikes(e, p, 7, 88, 40, e.damage * .48, '#ff8a3a', .8, 3);
        }
        break;
      }
      case 'skycarrier': {
        if (phase === 0) {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          const perp = a + Math.PI / 2;
          for (let i = -3; i <= 3; i++) {
            queueHostileStrike(p.x + Math.cos(perp) * i * 48, p.y + Math.sin(perp) * i * 48, 30, e.damage * .38, '#5ff0ce', .7 + Math.abs(i) * .05);
          }
          bossSummon(e, 'drone', enraged ? 2 : 1);
        } else {
          bossSummon(e, enraged ? 'strafer' : 'drone', enraged ? 3 : 2);
          bossRingStrikes(e, p, 6, 70, 28, e.damage * .3, '#7fe8ff', .8, 1);
        }
        break;
      }
      case 'xenarch': {
        if (phase === 0) {
          const a = Math.atan2(p.y - e.y, p.x - e.x) + .35;
          for (let k = 0; k < 4; k++) bossRayStrikes(e, a + k * Math.PI / 2, 4, 56, 26, e.damage * .4, '#9b7bff', .65, .08, 62);
        } else {
          bossRingStrikes(e, p, 10, 126, 26, e.damage * .32, '#5ff0ce', 1.0, -1);
          addEffect({ type: 'ring', x: p.x, y: p.y, radius: 70, life: .75, maxLife: .75, color: '#9b7bff' });
        }
        break;
      }
      case 'sentinel': {
        if (phase === 0) {
          bossRingStrikesAt(e.x, e.y, 12, 96, 24, e.damage * .38, '#ffcf5a', .7, e.phase + e.id * .2, 4);
          addEffect({ type: 'ring', x: e.x, y: e.y, radius: 118, life: .7, maxLife: .7, color: '#ffcf5a' });
        } else {
          bossLineStrikes(e, p, 5, 70, 24, e.damage * .55, '#ffe6a8', .75, 60);
        }
        break;
      }
      case 'skyfortress': {
        if (phase === 0) {
          for (let gx = -1; gx <= 1; gx++) {
            for (let gy = -1; gy <= 1; gy++) {
              queueHostileStrike(p.x + gx * 62, p.y + gy * 62, 29, e.damage * .34, '#7fe8ff', .75 + (Math.abs(gx) + Math.abs(gy)) * .05);
            }
          }
        } else {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          const perp = a + Math.PI / 2;
          for (let i = -3; i <= 3; i++) {
            queueHostileStrike(p.x + Math.cos(perp) * i * 50 + Math.cos(a) * 58, p.y + Math.sin(perp) * i * 50 + Math.sin(a) * 58, 28, e.damage * .3, '#d8e8f0', .9);
            queueHostileStrike(p.x + Math.cos(perp) * i * 50 - Math.cos(a) * 58, p.y + Math.sin(perp) * i * 50 - Math.sin(a) * 58, 28, e.damage * .3, '#d8e8f0', .9);
          }
        }
        break;
      }
      case 'leviathan': {
        if (phase === 0) {
          bossRingStrikes(e, p, 9, 76, 30, e.damage * .32, '#5ff0ce', .85, 3);
          for (let i = 0; i < 4; i++) {
            const a = i / 4 * TAU + e.phase * .3;
            addToxinPool(p.x + Math.cos(a) * 104, p.y + Math.sin(a) * 104, e.damage * .26, 52, null, 6.5, .45);
          }
        } else {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          for (const off of [-.26, 0, .26]) bossRayStrikes(e, a + off, 3, 78, 42, e.damage * .4, '#a8f0e0', .8, .12, 58);
        }
        break;
      }
      case 'seraph': {
        if (phase === 0) {
          const base = e.phase * .9 + e.id * .2;
          for (let arm = 0; arm < 3; arm++) {
            for (let i = 0; i < 7; i++) {
              const a = base + arm * TAU / 3 + i * .16;
              fireEnemyBullet(e, e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, a, e.bulletSpeed * .52, e.damage * .28, { color: i % 2 ? '#ffcf5a' : '#ffb52d', radius: 3.4, trail: 24 });
            }
          }
          addEffect({ type: 'ring', x: e.x, y: e.y, radius: 104, life: .7, maxLife: .7, color: '#ffcf5a' });
        } else {
          bossRadial(e, enraged ? 18 : 12, .5, .32, '#ffcf5a', 3.2);
          addEffect({ type: 'ring', x: e.x, y: e.y, radius: 140, life: .8, maxLife: .8, color: '#ffb52d' });
        }
        break;
      }
      case 'warlord': {
        if (phase === 0) {
          bossSummon(e, 'elite', enraged ? 2 : 1);
          bossLineStrikes(e, p, 5, 58, 36, e.damage * .52, '#ff8a76', .65, 62);
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          e.x = clamp(e.x + Math.cos(a) * 48, 50, W - 50);
          e.y = clamp(e.y + Math.sin(a) * 48, 50, H - 60);
        } else {
          bossRingStrikesAt(e.x, e.y, 10, 100, 32, e.damage * .36, '#ff5b4a', .7, e.phase, 2);
          bossLineStrikes(e, p, 4, 64, 32, e.damage * .4, '#ffb18a', .9, 76);
        }
        break;
      }
      default: {
        bossLineStrikes(e, p, 5, 56, 34, e.damage * .5, '#ff9a45', .7, 56);
        break;
      }
    }
  }

  function updateBoss(e, dt) {
    const p = nearestTarget(e.x, e.y, e);
    if (!p) return;
    e.fireCd -= dt;
    e.minionTimer -= dt;
    e.burstCd = (e.burstCd == null ? 5 : e.burstCd) - dt;
    e.shockCd = (e.shockCd == null ? 8 : e.shockCd) - dt;
    e.abilityCd = (e.abilityCd == null ? 5 : e.abilityCd) - dt;
    e.specialCd = (e.specialCd == null ? 6.5 : e.specialCd) - dt;
    e.shieldTimer = Math.max(0, (e.shieldTimer || 0) - dt);
    e.recoil = Math.max(0, e.recoil - dt * 4);
    e.phase = (e.phase || 0) + dt;
    const enraged = e.hp < e.maxHp * .58;
    const aimX = p.x, aimY = p.y;
    e.bodyAngle = angleLerp(e.bodyAngle, Math.atan2(aimY - e.y, aimX - e.x), dt * .9);
    e.turretAngle = angleLerp(e.turretAngle, Math.atan2(aimY - e.y, aimX - e.x), dt * 1.8);
    const dp = dist(e.x, e.y, p.x, p.y);
    const flying = e.domain === 'air' || e.domain === 'hover';

    if (flying) {
      const orbit = e.phase * .35 + e.id * .7;
      const tx = p.x + Math.cos(orbit) * 230;
      const ty = p.y + Math.sin(orbit * .8) * 135 - 30;
      const dx = tx - e.x, dy = ty - e.y, dd = Math.hypot(dx, dy);
      if (dd > 8) {
        const step = e.speed * (e.slowTimer > 0 ? .7 : 1) * dt;
        e.x += dx / dd * Math.min(step, dd);
        e.y += dy / dd * Math.min(step, dd);
      }
      e.x = clamp(e.x, 58, W - 58); e.y = clamp(e.y, 50, H - 70);
      e.trackPhase += dt * 3;
    } else if (dp > 190) {
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      const bossSpeed = e.speed * (e.slowTimer > 0 ? .7 : 1);
      e.x += Math.cos(angle) * bossSpeed * dt;
      e.y += Math.sin(angle) * bossSpeed * dt;
      e.x = clamp(e.x, 55, W - 55); e.y = clamp(e.y, 50, H - 50);
      e.trackPhase += dt * 4;
      if (e.bossKind !== 'burrower' && chance(dt * 4)) crushTileAt(e.x + Math.cos(angle) * 46, e.y + Math.sin(angle) * 46);
    }

    if (e.specialCd <= 0) bossSignature(e, p, enraged);
    switch (e.bossKind) {
      case 'hive': updateHiveBoss(e, dt, p, enraged); break;
      case 'cryo': updateCryoBoss(e, dt, p, enraged); break;
      case 'dread': updateDreadBoss(e, dt, p, enraged); break;
      case 'burrower': updateBurrowerBoss(e, dt, p, enraged); break;
      case 'skycarrier': updateSkycarrierBoss(e, dt, p, enraged); break;
      case 'xenarch': updateXenarchBoss(e, dt, p, enraged); break;
      case 'sentinel': updateSentinelBoss(e, dt, p, enraged); break;
      case 'skyfortress': updateSkyfortressBoss(e, dt, p, enraged); break;
      case 'leviathan': updateLeviathanBoss(e, dt, p, enraged); break;
      case 'seraph': updateSeraphBoss(e, dt, p, enraged); break;
      case 'warlord': updateWarlordBoss(e, dt, p, enraged, dp); break;
      default: updateSiegeBoss(e, dt, p, enraged, dp); break;
    }
    if (e.contactCd > 0) e.contactCd -= dt;
  }

  function crushTileAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return;
    const tile = G.tiles[ty][tx];
    if (!tile || (tile.type !== 'brick' && tile.type !== 'steel')) return;
    const px = tx * TILE + 16, py = ty * TILE + 16;
    tile.type = 'rubble'; tile.hp = 0; tile.maxHp = 0;
    addParticles(px, py, 9, '#a5664a', 'debris', 1.4);
    addEffect({ type: 'explosion', x: px, y: py, radius: 20, life: .22, maxLife: .22, color: '#ff8b55' });
  }

  /* ---------------- projectiles / damage ---------------- */
  function hitTile(tile, x, y, damage, color, hostile) {
    if (!tile) return false;
    if (tile.type === 'brick' && tile.friendlyWall && !hostile) return true;
    if (tile.type === 'steel') {
      for (let i = 0; i < 5; i++) addParticle(x, y, rand(80, -80), rand(80, -80), '#d7e5dc', 'spark', .26, 2);
      return true;
    }
    if (tile.type === 'brick') {
      tile.hp -= damage;
      for (let i = 0; i < 6; i++) addParticle(x, y, rand(70, -70), rand(70, -70), color || '#c45e3d', 'debris', .55, 2.2);
      if (tile.hp <= 0) {
        tile.type = 'rubble'; tile.hp = 0; tile.maxHp = 0;
        addParticles(x, y, 12, '#a55335', 'debris', 1);
        addEffect({ type: 'explosion', x, y, radius: 18, life: .25, maxLife: .25, color: '#ff7a3a' });
        AUDIO.hit();
      }
      return true;
    }
    return false;
  }

  function spawnSealMinions(seal, count, force) {
    if (!seal || (seal.dead && !force)) return;
    const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    let spawned = 0;
    for (const [ox, oy] of offsets) {
      if (spawned >= count) break;
      const cx = clamp(Math.floor(seal.x / TILE) + ox, 1, COLS - 2);
      const cy = clamp(Math.floor(seal.y / TILE) + oy, 1, ROWS - 2);
      const x = (cx + .5) * TILE, y = (cy + .5) * TILE;
      if (collidesWorld(x, y, 12, false)) continue;
      // Seal reinforcements are one readable silhouette, not a mixed squad:
      // the player is already learning "attack seal -> response".
      const e = spawnEnemy('grunt', { spawn: { cx, cy }, warning: true });
      if (!e) continue;
      e.x = x; e.y = y; e.cx = cx; e.cy = cy;
      spawned++;
    }
    if (spawned) {
      addEffect({ type: 'ring', x: seal.x, y: seal.y, radius: 30, life: .28, maxLife: .28, color: '#ff8a5a' });
      addParticles(seal.x, seal.y, 8, '#ff8a5a', 'spark', .6);
    }
  }

  function updateSeals(dt) {
    for (const seal of G.seals) {
      if (seal.dead) continue;
      seal.minionCd = Math.max(0, (seal.minionCd || 0) - dt);
      seal.hitFlash = Math.max(0, (seal.hitFlash || 0) - dt * 4);
    }
  }

  function damageSeal(seal, amount) {
    if (!seal || seal.dead) return;
    seal.hp -= amount;
    seal.hitFlash = .12;
    if (!G.sealTutorialSeen) {
      G.sealTutorialSeen = true;
      try { localStorage.setItem('bf.sealTutorial', '1'); } catch (_) {}
      showSealTutorial(seal);
    }
    for (let i = 0; i < 4; i++) addParticle(seal.x + rand(8, -8), seal.y + rand(8, -8), rand(45, -45), rand(45, -45), '#ffe3a0', 'spark', .35, 2);
    if ((seal.minionCd || 0) <= 0) {
      spawnSealMinions(seal, 2);
      seal.minionCd = .52;
      if (!seal.minionWarned) { seal.minionWarned = true; showToast('封印反应 · 守卫增援弹出', 'red'); }
    }
    if (seal.hp <= 0) breakSeal(seal);
  }

  function breakSeal(seal) {
    if (!seal || seal.dead) return;
    seal.dead = true;
    const tank = TANKS.find(t => t.id === seal.tankId);
    addEffect({ type: 'explosion', x: seal.x, y: seal.y, radius: 70, life: .65, maxLife: .65, color: '#ffd05a' });
    addEffect({ type: 'ring', x: seal.x, y: seal.y, radius: 46, life: .5, maxLife: .5, color: '#fff0b0' });
    addParticles(seal.x, seal.y, 30, '#ffd05a', 'spark', 1.4);
    addParticles(seal.x, seal.y, 12, '#5b4d3b', 'smoke', .9);
    addShake(9, .5); G.flash = Math.max(G.flash, .5); G.flashColor = '#ffd05a';
    AUDIO.explode(1.4);
    spawnSealMinions(seal, 4, true);
    showToast(`封印核心破裂 · ${tank ? tank.name : '未知底盘'} 守卫苏醒`, 'red');
    spawnSealBoss(seal);
  }

  function spawnSealBoss(seal) {
    const tank = TANKS.find(t => t.id === seal.tankId);
    if (!tank) return;
    const sp = { cx: clamp(Math.floor(seal.x / TILE), 1, COLS - 2), cy: clamp(Math.floor(seal.y / TILE), 1, ROWS - 2) };
    const e = spawnEnemy('elite', { spawn: sp, warning: true });
    if (!e) {
      showToast('战场拥挤 · 封印守卫暂时无法入场', 'red');
      seal.dead = false; seal.hp = 1;
      return;
    }
    e.x = seal.x; e.y = seal.y; e.cx = sp.cx; e.cy = sp.cy;
    e.sealTankId = tank.id;
    e.sealLabel = tank.name || '守卫';
    e.elite = true;
    e.size = 1.42;
    e.hp = e.maxHp = e.maxHp * (1.45 + G.arenaIndex * .13);
    e.damage *= 1.18;
    e.speed *= .82;
    e.xp = 36 + G.arenaIndex * 6;
    e.color = tank.colors.body;
    e.light = tank.colors.light;
    e.dark = tank.colors.dark;
    e.coreColor = tank.colors.core;
    e.spawnTimer = 1.2; e.spawnTotal = 1.2;
    markCodex(`seal:${tank.id}`);
    addEffect({ type: 'ring', x: seal.x, y: seal.y, radius: 52, life: .7, maxLife: .7, color: tank.colors.core });
    addShake(7, .45); G.flash = Math.max(G.flash, .35); G.flashColor = tank.colors.core;
  }

  function hostileShellSplash(b, x, y, direct) {
    if (!b.splash) return;
    const radius = b.splash;
    addEffect({ type: 'ring', x, y, radius, life: .32, maxLife: .32, color: b.color || '#ffb15a' });
    for (let i = 0; i < 7; i++) addParticle(x, y, rand(95, -95), rand(95, -95), b.color || '#ffb15a', 'spark', .38, 1.8);
    for (const p of activePlayers()) {
      if (p === direct) continue;
      if (dist2(x, y, p.x, p.y) < (radius + p.radius) ** 2) damagePlayer(b.damage * b.splashMul, p);
    }
    if (G.core && G.core.alive && G.core !== direct && dist2(x, y, G.core.cx, G.core.cy) < (radius + G.core.radius) ** 2) {
      damageBase(b.damage * b.splashMul, 'shell');
    }
    for (const s of G.sentries || []) {
      if (s === direct || s.life <= 0 || s.hp <= 0) continue;
      if (dist2(x, y, s.x, s.y) < (radius + s.radius) ** 2) damageSentry(s, b.damage * b.splashMul, 'shell');
    }
  }

  function updateBullets(dt) {
    for (const b of G.bullets) {
      if (b.dead) continue;
      if (b.homing) {
        let target = b.target && !b.target.dead ? b.target : null;
        if (!target) target = nearestAttackable(b.x, b.y, 300);
        if (target && !target.dead) {
          b.target = target;
          const speed = Math.max(40, Math.hypot(b.vx, b.vy));
          const cur = Math.atan2(b.vy, b.vx);
          const want = Math.atan2(target.y - b.y, target.x - b.x);
          let diff = ((want - cur + Math.PI) % TAU + TAU) % TAU - Math.PI;
          const turn = (b.turn || 4) * dt;
          diff = clamp(diff, -turn, turn);
          const next = cur + diff;
          b.vx = Math.cos(next) * speed; b.vy = Math.sin(next) * speed;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) { b.dead = true; continue; }
      const tile = tileAt(b.x, b.y);
      if (!b.baseShot && (tile.type === 'brick' || tile.type === 'steel')) {
        if (tile.type === 'steel' && b.steelPierce) {
          // Phase core: pass through steel cover without damaging it.
        } else {
          const broken = hitTile(tile, b.x, b.y, b.damage * .4, '#c45e3d');
          if (b.explode > 0) {
            explodeAt(b.x, b.y, b.explode, b.damage * .48, '#ffb15a', { source: 'cannon', silent: true, owner: b.owner, slow: b.slow, crit: b.crit });
            b.dead = true;
          } else if (broken) {
            b.dead = true;
          }
          continue;
        }
      }
      if (!b.enemy && !b.baseShot) {
        const seal = G.seals.find(s => !s.dead && dist2(b.x, b.y, s.x, s.y) < (s.radius + b.radius) ** 2);
        if (seal) {
          damageSeal(seal, b.damage);
          addParticle(b.x, b.y, rand(45, -45), rand(45, -45), '#ffdc82', 'spark', .28, 2);
          b.dead = true;
          continue;
        }
      }
      for (const e of G.enemies) {
        if (e.dead || e.spawnTimer > 0) continue;
        if (b.hit && b.hit.has(e.id)) continue;
        const rr = e.radius * e.size + b.radius;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          if (!b.hit) b.hit = new Set();
          b.hit.add(e.id);
          damageEnemy(e, b.damage, b.crit, 'bullet', b.owner);
          addParticle(b.x, b.y, rand(50, -50), rand(50, -50), b.color, 'spark', .2, 1.5);
          if (b.explode > 0) {
            explodeAt(b.x, b.y, b.explode, b.damage * .6, b.color, { source: 'cannon', owner: b.owner, slow: b.slow, crit: b.crit });
          }
          // No projectile passes through a target. If it has refraction
          // charges, it instead snaps toward the nearest fresh enemy around
          // the impact point; otherwise it is consumed here.
          if ((b.refract || 0) > 0) {
            const next = nearestRefractTarget(e.x, e.y, REFRACT_RADIUS, b.hit);
            if (next) {
              b.refract -= 1;
              const speed = Math.max(120, Math.hypot(b.vx, b.vy));
              const angle = Math.atan2(next.y - b.y, next.x - b.x);
              b.vx = Math.cos(angle) * speed;
              b.vy = Math.sin(angle) * speed;
              b.x = e.x; b.y = e.y;
              addEffect({ type: 'lightning', points: [{ x: e.x, y: e.y }, { x: next.x, y: next.y }], life: .14, maxLife: .14, color: b.color || '#ffd15c' });
              addEffect({ type: 'ring', x: e.x, y: e.y, radius: 18, life: .18, maxLife: .18, color: b.color || '#ffd15c' });
            } else {
              b.dead = true;
            }
          } else {
            b.dead = true;
          }
          if (b.dead) break;
        }
      }
    }
    G.bullets = G.bullets.filter(b => !b.dead);
    for (const b of G.enemyBullets) {
      if (b.dead) continue;
      if (b.homing) {
        b.homingDelay = Math.max(0, (b.homingDelay || 0) - dt);
        if (b.homingDelay <= 0) {
          const target = nearestTarget(b.x, b.y);
          if (target) {
            const speed = Math.max(24, Math.hypot(b.vx, b.vy));
            const cur = Math.atan2(b.vy, b.vx);
            const want = Math.atan2(target.y - b.y, target.x - b.x);
            let diff = ((want - cur + Math.PI) % TAU + TAU) % TAU - Math.PI;
            diff = clamp(diff, -(b.turn || 1.3) * dt, (b.turn || 1.3) * dt);
            const next = cur + diff;
            b.vx = Math.cos(next) * speed; b.vy = Math.sin(next) * speed;
          }
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) { b.dead = true; continue; }
      const tile = tileAt(b.x, b.y);
      if (tile.type === 'brick') {
        hitTile(tile, b.x, b.y, 8, '#a55335', true);
        hostileShellSplash(b, b.x, b.y, null);
        b.dead = true; continue;
      } else if (tile.type === 'steel') {
        for (let i = 0; i < 4; i++) addParticle(b.x, b.y, rand(60, -60), rand(60, -60), '#ffe4ae', 'spark', .24, 1.8);
        hostileShellSplash(b, b.x, b.y, null);
        b.dead = true; continue;
      }
      let baseDroneHit = null;
      if (G.core && G.core.alive) {
        for (const d of G.core.droneState || []) {
          if (dist2(b.x, b.y, d.x, d.y) < (d.radius + b.radius + 1) ** 2) { baseDroneHit = d; break; }
        }
      }
      if (baseDroneHit) {
        baseDroneHit.blockFlash = .2;
        G.core.shieldFlash = .22;
        b.dead = true;
        addEffect({ type: 'ring', x: b.x, y: b.y, radius: 24, life: .24, maxLife: .24, color: '#bafff0' });
        for (let i = 0; i < 4; i++) addParticle(b.x, b.y, rand(90, -90), rand(90, -90), '#bafff0', 'spark', .28, 1.5);
        continue;
      }
      let blockDrone = null;
      for (const p of G.players || []) {
        if (!p.alive || p.downed) continue;
        for (const ds of p.droneState || []) {
          if (dist2(b.x, b.y, ds.x, ds.y) < (10 + b.radius + 1) ** 2) { blockDrone = ds; break; }
        }
        if (blockDrone) break;
      }
      if (blockDrone) {
        blockDrone.blockFlash = .16;
        hostileShellSplash(b, b.x, b.y, null);
        b.dead = true;
        addEffect({ type: 'ring', x: b.x, y: b.y, radius: 18, life: .24, maxLife: .24, color: '#bafff0' });
        for (let i = 0; i < 4; i++) addParticle(b.x, b.y, rand(85, -85), rand(85, -85), '#bafff0', 'spark', .28, 1.5);
        continue;
      }
      const sentryHit = (G.sentries || []).find(s => s.life > 0 && s.hp > 0 && dist2(b.x, b.y, s.x, s.y) < (s.radius + b.radius + 1) ** 2);
      if (sentryHit) {
        damageSentry(sentryHit, b.damage, 'shell');
        hostileShellSplash(b, b.x, b.y, sentryHit);
        b.dead = true;
        continue;
      }
      const hit = activePlayers().find(p => dist2(b.x, b.y, p.x, p.y) < (p.radius + b.radius + 1) ** 2);
      if (hit) {
        damagePlayer(b.damage, hit);
        hostileShellSplash(b, b.x, b.y, hit);
        b.dead = true; continue;
      }
      if (G.core && G.core.alive && dist2(b.x, b.y, G.core.cx, G.core.cy) < (G.core.radius + b.radius + 1) ** 2) {
        damageBase(b.damage, 'shell');
        hostileShellSplash(b, b.x, b.y, G.core);
        b.dead = true; continue;
      }
    }
    G.enemyBullets = G.enemyBullets.filter(b => !b.dead);
  }

  function explodeAt(x, y, radius, damage, color, opts) {
    opts = opts || {};
    addEffect({ type: 'explosion', x, y, radius, life: .42, maxLife: .42, color: color || '#ffb15a' });
    addEffect({ type: 'ring', x, y, radius: radius * 1.2, life: .35, maxLife: .35, color: color || '#ffb15a' });
    addParticles(x, y, 10 + Math.min(16, radius / 6), color || '#ffb15a', 'spark', 1.1);
    addParticles(x, y, 5, '#4b4b3b', 'smoke', .7);
    if (!opts.silent) AUDIO.explode(Math.min(2, .7 + radius / 90));
    if (!opts.hostileOnly) {
      for (const e of G.enemies) {
        if (e.dead || e.spawnTimer > 0) continue;
        const rr = radius + e.radius * e.size;
        const d2 = dist2(x, y, e.x, e.y);
        if (d2 < rr * rr) {
          const fall = 1 - .35 * Math.sqrt(d2) / rr;
          damageEnemy(e, damage * fall, !!opts.crit, opts.source || 'explosion', opts.owner);
          if (opts.slow) e.slowTimer = Math.max(e.slowTimer || 0, opts.slow);
        }
      }
    }
    if (opts.owner) {
      for (const seal of G.seals) {
        if (seal.dead || dist2(x, y, seal.x, seal.y) >= (radius + seal.radius) ** 2) continue;
        damageSeal(seal, damage * .65);
      }
    }
    // destroy environment in radius
    const minX = Math.max(0, Math.floor((x - radius) / TILE)), maxX = Math.min(COLS - 1, Math.floor((x + radius) / TILE));
    const minY = Math.max(0, Math.floor((y - radius) / TILE)), maxY = Math.min(ROWS - 1, Math.floor((y + radius) / TILE));
    for (let ty = minY; ty <= maxY; ty++) for (let tx = minX; tx <= maxX; tx++) {
      const tile = G.tiles[ty][tx];
      if (!tile || tile.type !== 'brick') continue;
      const cx = tx * TILE + 16, cy = ty * TILE + 16;
      if (dist2(x, y, cx, cy) < radius * radius) hitTile(tile, cx, cy, 14, '#b35b3c', !!opts.hostile);
    }
    if (opts.hurtPlayer) {
      for (const p of activePlayers()) {
        if (dist(p.x, p.y, x, y) < radius) damagePlayer(damage * .75, p);
      }
      for (const s of G.sentries || []) {
        if (s.life > 0 && s.hp > 0 && dist(s.x, s.y, x, y) < radius + s.radius) damageSentry(s, damage * .75, 'blast');
      }
    }
    if (opts.hurtBase && G.core && G.core.alive && dist(x, y, G.core.cx, G.core.cy) < radius + G.core.radius) {
      damageBase(damage * .75, opts.source || 'blast');
    }
    addShake(Math.min(11, radius * .1), .22);
  }

  function damageEnemy(e, amount, crit, source, owner) {
    if (!e || e.dead || e.spawnTimer > 0) return;
    // Bulwark: front plow absorbs most direct fire; flanking and explosives bypass it.
    if (e.type === 'bulwark' && owner && source !== 'explosion' && source !== 'flame') {
      const incoming = Math.atan2(owner.y - e.y, owner.x - e.x);
      const diff = ((incoming - e.bodyAngle + Math.PI) % TAU + TAU) % TAU - Math.PI;
      if (Math.abs(diff) < 1.15) {
        amount *= .35;
        if (chance(.18)) addEffect({ type: 'ring', x: e.x, y: e.y, radius: 24, life: .18, maxLife: .18, color: '#ffb87a' });
      }
    }
    // Warden: nearby xeno units take reduced damage until the warden is killed.
    if (e.type !== 'warden') {
      const warden = G.enemies.find(w => w.type === 'warden' && !w.dead && dist2(w.x, w.y, e.x, e.y) < 125 * 125);
      if (warden) amount *= .65;
    }
    // Boss phase armor: Cryo/Sentinel expose a window, then raise shields again.
    if (e.boss && e.shieldTimer > 0) amount *= e.bossKind === 'sentinel' ? .42 : .6;
    const tank = tankData(owner);
    const st = statsFor(owner);
    e.hp -= amount;
    e.hitFlash = .12;
    if (tank.slowOnHit && source !== 'flame' && source !== 'poison') {
      e.slowTimer = Math.max(e.slowTimer || 0, 1.2);
    }
    if (tank.poisonOnHit && source !== 'poison' && source !== 'flame') {
      e.poisonTimer = Math.max(e.poisonTimer || 0, 2);
      e.poisonDps = Math.max(e.poisonDps || 0, 4 * st.damage);
      e.poisonOwner = owner;
    }
    G.totalDamage += amount;
    if (source !== 'flame' || chance(.45)) addDamageNumber(e.x, e.y - 17 * (e.size || 1), Math.round(amount), crit ? '#ffd15c' : '#f4ead2', crit);
    if (e.hp <= 0) killEnemy(e, source, owner);
  }

  function killEnemy(e, source, owner) {
    if (e.dead) return;
    e.dead = true;
    G.kills += 1;
    const tank = tankData(owner);
    if (tank.lifesteal) {
      healPlayer(tank.lifesteal, owner || G.player);
    }
    G.combo += 1;
    G.comboTimer = 2.6;
    const xpValue = e.xp || 2;
    if (e.boss) {
      G.boss = null;
      U.bossHud.classList.add('is-hidden');
      addEffect({ type: 'explosion', x: e.x, y: e.y, radius: 160, life: .9, maxLife: .9, color: '#ff8a3e' });
      addEffect({ type: 'explosion', x: e.x + 40, y: e.y - 20, radius: 100, life: .7, maxLife: .7, color: '#ffd05a' });
      addParticles(e.x, e.y, 50, '#ffb15a', 'spark', 2.2);
      addParticles(e.x, e.y, 24, '#4d3a30', 'smoke', 1.1);
      addShake(18, 1.0); G.flash = 1; G.flashColor = '#ffc46b';
      AUDIO.bigExplode();
      for (let i = 0; i < 9; i++) spawnPickup(chance(.55) ? 'xp' : pick(Object.keys(ITEMS)), e.x + rand(30, -30), e.y + rand(24, -24), 0);
      if (G.endless) {
        G.endlessBossKills += 1;
        G.endlessNextBossAt = G.elapsed + ENDLESS_BOSS_GAP;
        showToast(`${e.bossName || '首领'} 已击破 · 第 ${G.endlessBossKills} 个无尽首领 · 下一轮 ${fmtShort(ENDLESS_BOSS_GAP)} 后`, 'cyan');
      } else {
        G.bossDefeated = true;
        showToast(`${e.bossName || '泰坦'} 已击破 · 战役完成`, 'cyan');
        G.victoryTimer = 1.2;
      }
    } else {
      if (e.elite) {
        addEffect({ type: 'explosion', x: e.x, y: e.y, radius: 72, life: .65, maxLife: .65, color: '#ffb52d' });
        addParticles(e.x, e.y, 24, '#ffbd58', 'spark', 1.6);
        addShake(8, .45); AUDIO.explode(1.6);
        if (e.sealTankId) unlockTankFromSeal(e.sealTankId);
        else showToast('精英单位已击毁 · 战术宝箱已掉落', 'gold');
        if (!e.sealTankId) spawnPickup('chest', e.x, e.y, 0);
        if (!e.sealTankId && !G.eliteTutorialSeen) {
          G.eliteTutorialSeen = true;
          try { localStorage.setItem('bf.eliteTutorial', '1'); } catch (_) {}
          showEliteTutorial();
        }
      } else {
        addParticles(e.x, e.y, 12, e.color, 'debris', .55);
        addEffect({ type: 'explosion', x: e.x, y: e.y, radius: 28, life: .2, maxLife: .2, color: '#ff9a58' });
        if (chance(.18)) AUDIO.explode(.55);
        addShake(1.3, .1);
      }
      if (e.type === 'splitter') {
        for (let i = 0; i < 3; i++) {
          const cx = clamp(e.cx + (i - 1), 1, COLS - 2);
          const cy = clamp(e.cy + (i === 1 ? 1 : 0), 1, ROWS - 2);
          const shard = spawnEnemy('scrap', { spawn: { cx, cy }, warning: false });
          if (shard) {
            shard.spawnTimer = .35; shard.spawnTotal = .35;
            addEffect({ type: 'ring', x: shard.x, y: shard.y, radius: 12, life: .25, maxLife: .25, color: '#ff9d5a' });
          }
        }
        addEffect({ type: 'explosion', x: e.x, y: e.y, radius: 34, life: .3, maxLife: .3, color: '#ff9d5a' });
      }
      spawnPickup('xp', e.x, e.y, xpValue);
      const dropChance = (e.elite ? .95 : statsFor(owner).dropChance);
      if (chance(dropChance)) {
        const itemKeys = ['star', 'grenade', 'helmet', 'timer', 'shovel', 'tank', 'turret'];
        const weights = [15, 15, 15, 13, 15, 20, 10];
        // Base support enters the pool only when it can matter. Fortify is a
        // permanent max-armor upgrade; basekit is a repair that keeps a damaged
        // base alive instead of becoming a dead pickup at full health.
        if (G.core && G.core.alive && G.core.hp < G.core.maxHp * .9) { itemKeys.push('basekit'); weights.push(10); }
        if (G.core && G.core.alive) { itemKeys.push('fortify'); weights.push(7); }
        const totalWeight = weights.reduce((sum, n) => sum + n, 0);
        let r = Math.random() * totalWeight, item = 'star';
        for (let i = 0; i < itemKeys.length; i++) { r -= weights[i]; if (r <= 0) { item = itemKeys[i]; break; } }
        spawnPickup(item, e.x, e.y, 0);
      }
      if (e.elite) {
        for (let i = 0; i < 4; i++) spawnPickup('xp', e.x + rand(18, -18), e.y + rand(18, -18), 0);
        if (G.core && G.core.alive && G.core.hp < G.core.maxHp * .78 && chance(.58)) spawnPickup('basekit', e.x + rand(12, -12), e.y + rand(12, -12), 0);
      }
      if (G.core && G.core.alive && G.core.hp < G.core.maxHp * .5 && chance(.035)) spawnPickup('basekit', e.x, e.y, 0);
    }
    if (e.type === 'bomber') explodeAt(e.x, e.y, 46, 25, '#ff5b4a', { hurtPlayer: true, hurtBase: true, hostile: true, source: 'bomber' });
    G.combo = Math.min(G.combo, 999);
  }

  function damageSentry(s, amount, source) {
    if (!s || s.life <= 0 || s.hp <= 0) return;
    s.hp -= amount;
    s.hitFlash = .15;
    addDamageNumber(s.x, s.y - 20, Math.round(amount), '#8fffe6', false);
    addParticles(s.x, s.y, 5, '#8fffe6', 'spark', .5);
    if (s.hp <= 0) {
      s.hp = 0; s.life = 0;
      addEffect({ type: 'explosion', x: s.x, y: s.y, radius: 58, life: .35, maxLife: .35, color: '#8fffe6' });
      addEffect({ type: 'ring', x: s.x, y: s.y, radius: 62, life: .4, maxLife: .4, color: '#c8fff5' });
      addParticles(s.x, s.y, 16, '#8fffe6', 'spark', 1.0);
      explodeAt(s.x, s.y, 58, 36 + s.maxHp * .35, '#8fffe6', { source: 'sentry', owner: s.owner, silent: true });
      AUDIO.explode(.8);
    }
  }

  function damageBase(amount, source) {
    const c = G.core;
    if (!c || !c.alive) return;
    amount = Math.max(1, amount * (G.arena.baseDamageMul || 1) * (1 - (G.coreArmor || 0)));
    c.hp = Math.max(0, c.hp - amount);
    c.noDamage = 0;
    c.hitFlash = .2;
    addShake(Math.min(7, 1.4 + amount * .16), .22);
    addDamageNumber(c.cx, c.cy - 12, Math.round(amount), '#ff8a8d', false);
    for (let i = 0; i < 6; i++) addParticle(c.cx + rand(18, -18), c.cy + rand(14, -14), rand(60, -60), rand(20, -50), '#ff7a58', 'spark', .5, 2);
    if (c.hp <= 0) {
      c.alive = false;
      addEffect({ type: 'explosion', x: c.cx, y: c.cy, radius: 92, life: .8, maxLife: .8, color: '#ff5f4a' });
      addEffect({ type: 'ring', x: c.cx, y: c.cy, radius: 74, life: .6, maxLife: .6, color: '#ffcf73' });
      addParticles(c.cx, c.cy, 34, '#ff9b62', 'debris', 1.7);
      addShake(14, .9); G.flash = 1; G.flashColor = '#ff5f4a';
      AUDIO.bigExplode();
      showToast('基地装甲归零 · 防线失守', 'red');
      endRun(false, 'base');
    }
  }

  function baseInDefenseArc(angle) {
    const a = ((angle % TAU) + TAU) % TAU;
    return a >= Math.PI || a <= 1e-6;
  }

  function nearestBaseTarget() {
    const c = G.core;
    if (!c) return null;
    let best = null, bestD2 = BASE_RANGE * BASE_RANGE;
    for (const e of G.enemies) {
      if (e.dead || e.spawnTimer > 0) continue;
      if (!baseInDefenseArc(Math.atan2(e.y - c.cy, e.x - c.cx))) continue;
      const d2 = dist2(c.cx, c.cy, e.x, e.y);
      if (d2 < bestD2) { bestD2 = d2; best = e; }
    }
    return best;
  }

  function updateBaseDrones(c, dt, count) {
    const prev = c.droneState || [];
    c.dronePhase = ((c.dronePhase || 0) + dt * .5) % 1;
    c.shieldFlash = Math.max(0, (c.shieldFlash || 0) - dt);
    if (count <= 0) { c.droneState = []; return; }
    const orbit = BASE_RADIUS + 22;
    const start = Math.PI;
    const span = Math.PI;
    const next = [];
    for (let i = 0; i < count; i++) {
      const u = (c.dronePhase + i / count) % 1;
      const angle = start + u * span;
      const old = prev[i];
      next.push({
        angle,
        ox: Math.cos(angle) * orbit,
        oy: Math.sin(angle) * orbit,
        x: c.cx + Math.cos(angle) * orbit,
        y: c.cy + Math.sin(angle) * orbit,
        radius: 18,
        aimAngle: old ? old.aimAngle : angle,
        blockFlash: Math.max(0, (old ? old.blockFlash : 0) - dt)
      });
    }
    c.droneState = next;
  }

  function fireBaseShot(target, turretIndex) {
    const c = G.core;
    if (!c || !c.alive || !target) return;
    const drone = (c.droneState || [])[turretIndex % Math.max(1, (c.droneState || []).length)];
    const sx = drone ? drone.x : c.cx;
    const sy = drone ? drone.y : c.cy - BASE_RADIUS;
    const a = Math.atan2(target.y - sy, target.x - sx);
    if (drone) drone.aimAngle = a;
    c.turretAngle = a;
    const muzzle = 14;
    G.bullets.push({
      x: sx + Math.cos(a) * muzzle, y: sy + Math.sin(a) * muzzle,
      vx: Math.cos(a) * 520, vy: Math.sin(a) * 520,
      radius: 3.2, damage: 25, life: 1.2, maxLife: 1.2,
      color: '#8fffe6', trail: 16, enemy: false, baseShot: true,
      owner: null, crit: false, refract: 0, explode: 0, hit: new Set()
    });
    addEffect({ type: 'muzzle', x: sx + Math.cos(a) * 19, y: sy + Math.sin(a) * 19, angle: a, life: .16, maxLife: .16, color: '#8fffe6', radius: 11 });
    AUDIO.shoot();
  }

  function updateBase(dt) {
    const c = G.core;
    if (!c || !c.alive) return;
    c.hitFlash = Math.max(0, c.hitFlash - dt);
    c.noDamage += dt;
    if (c.hp < c.maxHp && c.noDamage > c.repairDelay) {
      c.hp = Math.min(c.maxHp, c.hp + c.repairRate * dt);
    }
    const turretCount = Math.min(4, c.turrets || 0);
    updateBaseDrones(c, dt, turretCount);
    if (turretCount <= 0) return;
    c.turretCd -= dt;
    if (c.turretCd <= 0) {
      // Only the three-sided defense arc fires; the bottom sector is blind.
      const target = nearestBaseTarget();
      if (!target) { c.turretCd = .2; return; }
      for (let i = 0; i < turretCount; i++) fireBaseShot(target, i);
      c.turretCd = .92;
    }
  }

  function recallToBase() {
    if (G.mode !== 'playing' || !G.core || !G.core.alive) return false;
    if ((G.recallCd || 0) > 0) {
      showToast(`回程充能中 · ${Math.ceil(G.recallCd)} 秒`, 'red');
      return false;
    }
    const active = activePlayers();
    if (!active.length) return false;
    const spots = [[0, -86], [-86, 0], [86, 0], [0, 86], [-86, -58], [86, -58], [0, -116], [-116, 0], [116, 0], [0, 116]];
    const used = [];
    for (const p of active) {
      let spot = null;
      for (const [ox, oy] of spots) {
        const x = clamp(G.core.cx + ox, p.radius + 6, W - p.radius - 6);
        const y = clamp(G.core.cy + oy, p.radius + 6, H - p.radius - 6);
        if (dist(x, y, G.core.cx, G.core.cy) < G.core.radius + p.radius + 4) continue;
        if (collidesWorld(x, y, p.radius - 2, false)) continue;
        if (used.some(q => dist(x, y, q.x, q.y) < 34)) continue;
        spot = { x, y }; break;
      }
      if (!spot) spot = findPlayerSpawn({ x: G.core.cx, y: G.core.cy });
      if (!spot || dist(spot.x, spot.y, G.core.cx, G.core.cy) < G.core.radius + p.radius + 4) {
        spot = { x: G.core.cx, y: clamp(G.core.cy - G.core.radius - p.radius - 10, p.radius + 6, H - p.radius - 6) };
      }
      used.push(spot);
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 28, life: .35, maxLife: .35, color: '#8fffe6' });
      addParticles(p.x, p.y, 14, '#8fffe6', 'spark', .8);
      p.x = spot.x; p.y = spot.y; p.vx = 0; p.vy = 0; p.moving = false;
      p.invincible = Math.max(p.invincible, 1.3);
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 28, life: .5, maxLife: .5, color: '#8fffe6' });
    }
    G.recallCd = RECALL_CD;
    G.player = (G.players || []).find(p => p.alive && !p.downed) || G.player;
    addEffect({ type: 'ring', x: G.core.cx, y: G.core.cy, radius: 64, life: .55, maxLife: .55, color: '#8fffe6' });
    addShake(3.5, .25); G.flash = Math.max(G.flash, .3); G.flashColor = '#8fffe6';
    showToast('回程协议 · 全队撤回基地', 'cyan');
    AUDIO.confirm();
    return true;
  }

  function damagePlayer(amount, target) {
    const p = target || G.player;
    if (!p || !p.alive || p.downed || p.invincible > 0 || p.dashTimer > 0) return;
    amount *= .9 * (tankData(p).damageTakenMul || 1) * (statsFor(p).damageTaken || 1);
    p.noDamageTime = 0;
    if (p.shield > 0) {
      p.shield = Math.max(0, p.shield - amount);
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 24, life: .3, maxLife: .3, color: '#5ff0ce' });
      addParticles(p.x, p.y, 8, '#5ff0ce', 'spark', .6);
      AUDIO.shield(); rumble(.25, 55);
      if (p.shield <= 0) showToast(`P${p.index + 1} 护盾破碎`, 'red');
      return;
    }
    p.hp -= amount;
    p.hitFlash = 1;
    p.invincible = .5;
    p.shieldRecharge = 0;
    G.shake = Math.max(G.shake, 5 * SHAKE_SCALE);
    G.flash = Math.max(G.flash, .35); G.flashColor = '#ff4343';
    addParticles(p.x, p.y, 10, '#ff8b58', 'spark', 1);
    AUDIO.hit(); rumble(.6, 120);
    if (p.hp <= 0) {
      p.hp = 0;
      p.hitFlash = 0;
      p.vx = 0; p.vy = 0; p.moving = false;
      if (G.twoPlayer) {
        p.downed = true;
        p.reviveProgress = 0;
        p.invincible = 0;
        addEffect({ type: 'explosion', x: p.x, y: p.y, radius: 72, life: .7, maxLife: .7, color: '#ff9c5b' });
        addParticles(p.x, p.y, 22, '#ff8b58', 'spark', 1.3);
        addShake(8, .5);
        showToast(`P${p.index + 1} 车体损毁 · 队友靠近可救援`, 'red');
        AUDIO.gameOver();
        if ((G.players || []).every(q => !q.alive || q.downed)) endRun(false, 'pilot');
      } else {
        p.alive = false;
        addEffect({ type: 'explosion', x: p.x, y: p.y, radius: 90, life: .8, maxLife: .8, color: '#ff9c5b' });
        addShake(15, .8);
        endRun(false, 'pilot');
      }
    }
  }

  function healPlayer(amount, target) {
    const p = target || G.player; if (!p || p.downed) return;
    p.hp = Math.min(p.maxHp, p.hp + amount);
  }
  function spawnPickup(type, x, y, value) {
    if (G.pickups.length > 320) G.pickups.shift();
    const a = rand(TAU);
    const speed = type === 'xp' ? rand(65, 20) : rand(30, 8);
    G.pickups.push({
      type, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      value: value || 0, life: type === 'chest' ? 120 : 38, seed: rand(TAU), picked: false
    });
    // The scripted opening turret is not a combat drop; let the first real
    // item drop (or first pickup) introduce the supply system.
    if (type !== 'xp' && type !== 'chest' && G.elapsed > .6) queueItemTutorial();
  }

  function updatePickups(dt) {
    for (const pk of G.pickups) {
      pk.life -= dt;
      if (pk.life <= 0) { pk.picked = true; continue; }
      const p = nearestPlayer(pk.x, pk.y);
      if (!p) continue;
      const d = dist(pk.x, pk.y, p.x, p.y);
      const magnetR = statsFor(p).pickup * (pk.type === 'xp' ? 1.8 : .8);
      if (pk.type === 'xp' && d > magnetR && pk.life < 34) {
        const drift = Math.min(80, 42 + (34 - pk.life) * 2);
        pk.x += (p.x - pk.x) / d * drift * dt;
        pk.y += (p.y - pk.y) / d * drift * dt;
      }
      if (d < magnetR) {
        const a = Math.atan2(p.y - pk.y, p.x - pk.x);
        const pull = 600 * clamp(1 - d / magnetR, .2, 1);
        pk.vx = lerp(pk.vx, Math.cos(a) * pull, .3);
        pk.vy = lerp(pk.vy, Math.sin(a) * pull, .3);
      } else {
        pk.vx *= .92; pk.vy *= .92;
      }
      pk.x += pk.vx * dt; pk.y += pk.vy * dt;
      for (const q of activePlayers()) {
        if (dist(pk.x, pk.y, q.x, q.y) < 14) {
          collectPickup(pk, q);
          pk.picked = true;
          break;
        }
      }
    }
    G.pickups = G.pickups.filter(p => !p.picked);
  }

  function collectPickup(pk, picker) {
    const p = picker || G.player;
    G.pickupsCollected += 1;
    if (pk.type === 'xp') {
      // Co-op keeps the same XP requirements and full pickup value. Enemy
      // count is the difficulty lever, not invisible XP inflation.
      addXp(pk.value || 1, p);
      AUDIO.xp();
      addParticle(pk.x, pk.y, rand(20, -20), rand(-30, -60), '#aef9e7', 'spark', .35, 1.3);
      return;
    }
    if (pk.type === 'chest') {
      p.pendingLevels = (p.pendingLevels || 0) + 1;
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 46, life: .6, maxLife: .6, color: '#ffcf5a' });
      addParticles(p.x, p.y, 20, '#ffcf5a', 'spark', 1.2);
      showPickupToast(p, '战术宝箱 · 获得一次升级选择');
      AUDIO.item();
      return;
    }
    queueItemTutorial();
    const item = ITEMS[pk.type];
    if (!item) return;
    if (pk.type === 'turret') {
      if (G.core && G.core.alive) {
        const max = 4;
        if ((G.core.turrets || 0) < max) {
          G.core.turrets = (G.core.turrets || 0) + 1;
          addEffect({ type: 'ring', x: G.core.cx, y: G.core.cy, radius: 46, life: .55, maxLife: .55, color: '#8fffe6' });
          showPickupToast(p, `哨戒无人机 ${G.core.turrets} / ${max} · 三向拦截启用`);
          AUDIO.item();
        } else {
          const heal = G.core.maxHp * .1;
          G.core.hp = Math.min(G.core.maxHp, G.core.hp + heal);
          showPickupToast(p, '无人机已满编 // 基地装甲 +10%');
          AUDIO.tick();
        }
      }
      return;
    }
    if (pk.type === 'basekit') {
      if (G.core && G.core.alive) {
        const heal = G.core.maxHp * .24;
        G.core.hp = Math.min(G.core.maxHp, G.core.hp + heal);
        addEffect({ type: 'ring', x: G.core.cx, y: G.core.cy, radius: 44, life: .6, maxLife: .6, color: '#5ff0ce' });
        showPickupToast(p, `基地维修 // 装甲 +${Math.round(heal)}`);
        AUDIO.tick();
      }
      return;
    }
    if (pk.type === 'fortify') {
      if (G.core && G.core.alive) {
        const add = Math.round(G.core.maxHp * .15);
        G.core.maxHp += add;
        G.core.hp = Math.min(G.core.maxHp, G.core.hp + add);
        addEffect({ type: 'ring', x: G.core.cx, y: G.core.cy, radius: 54, life: .7, maxLife: .7, color: '#b896ff' });
        showPickupToast(p, `基地强化 // 装甲上限 +${add}`);
        AUDIO.item();
      }
      return;
    }
    if (pk.type === 'star') {
      const raw = p.weapons || (p.weapons = {});
      // Main cannon first; only once it is maxed does the pickup spill over
      // into another weapon, then into a small repair.
      const maxRank = maxUpgradeRank();
      if ((raw.cannon || 0) < maxRank) {
        raw.cannon = Math.min(maxRank, (raw.cannon || 0) + 1);
      } else {
        const upgradable = Object.keys(raw).filter(k => k !== 'cannon' && (raw[k] || 0) < maxRank);
        if (upgradable.length) {
          const id = pick(upgradable);
          raw[id] = Math.min(maxRank, (raw[id] || 0) + 1);
        } else healPlayer(25, p);
      }
      recalcStats(false);
      G.loadoutDirty = true;
    } else if (pk.type === 'grenade') {
      for (const e of G.enemies) if (!e.dead && e.spawnTimer <= 0) damageEnemy(e, 190 * statsFor(p).damage, false, 'grenade', p);
      G.enemyBullets = [];
      for (let i = 0; i < 18; i++) addParticle(p.x + rand(220, -220), p.y + rand(160, -160), rand(100, -100), rand(100, -100), '#ffcf5a', 'spark', 1, 2);
      addShake(12, .6); G.flash = .9; G.flashColor = '#ffd05a';
      AUDIO.bigExplode();
    } else if (pk.type === 'helmet') {
      p.invincible = Math.max(p.invincible, 8);
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 30, life: .5, maxLife: .5, color: '#5ff0ce' });
    } else if (pk.type === 'timer') {
      G.freezeTimer = 7;
      addShake(4, .4); G.flash = .5; G.flashColor = '#79b9ff';
    } else if (pk.type === 'shovel') {
      healPlayer(p.maxHp * .25, p);
      p.invincible = Math.max(p.invincible, 2);
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 42, life: .55, maxLife: .55, color: '#a9e56e' });
    } else if (pk.type === 'tank') {
      p.bonusHp = (p.bonusHp || 0) + 5;
      recalcStats(false);
      healPlayer(p.maxHp * .45, p);
    }
    G.loadoutDirty = true;
    AUDIO.item();
    showPickupToast(p, `${item.name} // ${item.desc}`);
    addEffect({ type: 'ring', x: pk.x, y: pk.y, radius: 26, life: .4, maxLife: .4, color: item.color });
  }
  function addXp(amount, sourceP) {
    const p = sourceP || G.player || (G.players && G.players[0]);
    if (!p) return;
    p.xp += Math.max(1, amount * statsFor(p).xpGain * ((G.runMod && G.runMod.xpMul) || 1));
    let leveled = false;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.pendingLevels += 1;
      p.xpNext = xpNeeded(p.level);
      leveled = true;
    }
    if (p.index === 0) {
      G.xp = p.xp;
      G.xpNext = p.xpNext;
      G.level = p.level;
    }
    if (leveled) {
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 42, life: .45, maxLife: .45, color: '#ffb52d' });
      addParticles(p.x, p.y, 14, '#ffd36b', 'spark', .8);
      G.loadoutDirty = true;
    }
  }

  function nextPendingPlayer() {
    const players = G.players || [];
    return players.find(p => p.pendingLevels > 0) || null;
  }

  function maybeOpenLevelUp() {
    if (G.mode !== 'playing' || G.levelupPlayer) return;
    const p = nextPendingPlayer();
    if (p) openLevelUp(p);
  }

  /* ---------------- particles / updates ---------------- */
  function addParticle(x, y, vx, vy, color, type, life, size, gravity, alpha) {
    if (G.particles.length > MAX_PARTICLES) G.particles.shift();
    G.particles.push({
      x, y, vx, vy, color, type: type || 'spark', life: life || .5, maxLife: life || .5,
      size: size || 2, gravity: gravity == null ? (type === 'smoke' ? -10 : 70) : gravity, alpha: alpha == null ? .9 : alpha
    });
  }
  function addParticles(x, y, count, color, type, power) {
    const p = power || 1;
    for (let i = 0; i < count; i++) {
      const a = rand(TAU), s = rand(190, 20) * p;
      addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, type || 'spark', rand(1, .25) * (type === 'smoke' ? 1.2 : 1), rand(3.2, 1) * (type === 'smoke' ? 2.4 : 1), type === 'smoke' ? -15 : 75, type === 'smoke' ? .45 : .95);
    }
  }
  function addEffect(fx) {
    if (G.effects.length > MAX_EFFECTS) G.effects.shift();
    G.effects.push({ life: .3, maxLife: .3, ...fx });
  }
  function addDamageNumber(x, y, amount, color, crit) {
    if (G.damageNumbers.length > 80) G.damageNumbers.shift();
    G.damageNumbers.push({ x: x + rand(8, -8), y, text: crit ? `${Math.round(amount)}!` : String(Math.round(amount)), color, crit, life: .65, maxLife: .65, vy: -28 });
  }
  function addShake(mag, time) {
    G.shake = Math.max(G.shake, mag * SHAKE_SCALE);
    G.shakeTime = Math.max(G.shakeTime, time || .2);
  }

  function updateStatus(dt) {
    G.animTime += dt;
    G.freezeTimer = Math.max(0, G.freezeTimer - dt);
    G.recallCd = Math.max(0, (G.recallCd || 0) - dt);
    G.comboTimer = Math.max(0, G.comboTimer - dt);
    if (G.comboTimer <= 0) G.combo = 0;
    G.flash = Math.max(0, G.flash - dt * 1.8);
    G.shake = Math.max(0, G.shake - dt * (18 + G.shake * 1.5));
    G.shakeTime = Math.max(0, G.shakeTime - dt);
    G.flowTimer -= dt;
    if (G.flowTimer <= 0) { G.flowTimer = .42; buildFlows(); }
    G.hudTimer -= dt;
    if (G.hudTimer <= 0) { G.hudTimer = .08; updateHUD(); }
    // intro hints
    if (G.tutorialTimer > 0) G.tutorialTimer -= dt;
  }

  function updateEffects(dt) {
    for (const fx of G.effects) fx.life -= dt;
    G.effects = G.effects.filter(fx => fx.life > 0);
    for (const p of G.particles) {
      p.life -= dt;
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= .98; p.vy *= .985;
    }
    G.particles = G.particles.filter(p => p.life > 0);
    for (const d of G.damageNumbers) {
      d.life -= dt; d.y += d.vy * dt; d.vy *= .92;
    }
    G.damageNumbers = G.damageNumbers.filter(d => d.life > 0);
  }

  function drawDrones(t) {
    const ctx = gameCtx;
    for (const p of G.players || []) {
      if (!p.droneState || !p.droneState.length || p.downed) continue;
      const accent = p.index === 1 ? '#ffb52d' : '#5ff0ce';
      for (let i = 0; i < p.droneState.length; i++) {
        const ds = p.droneState[i];
        ctx.save();
        ctx.translate(ds.x, ds.y);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 13);
        g.addColorStop(0, 'rgba(216,255,247,.44)'); g.addColorStop(.4, 'rgba(95,240,206,.13)'); g.addColorStop(1, 'rgba(95,240,206,0)');
        ctx.fillStyle = g; ctx.fillRect(-13, -13, 26, 26);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#07100d'; ctx.fillRect(-7, -5, 14, 10); ctx.fillRect(-3, -7, 6, 14);
        ctx.fillStyle = '#3caf99'; ctx.fillRect(-5, -4, 10, 8);
        ctx.fillStyle = '#c7fff4'; ctx.fillRect(-1, -1, 2, 2);
        ctx.fillStyle = accent; ctx.fillRect(-9, -6, 2, 2); ctx.fillRect(7, -6, 2, 2); ctx.fillRect(-9, 4, 2, 2); ctx.fillRect(7, 4, 2, 2);
        ctx.strokeStyle = hexA(accent, .18); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, 10 + Math.sin(t * 5 + i) * 2, 0, TAU); ctx.stroke();
        if (ds.blockFlash > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = hexA('#d8fff7', .85);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 13 + ds.blockFlash * 26, 0, TAU); ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  /* ---------------- upgrades ---------------- */
  const UTILITY_CARDS = [
    { id: 'field_repair', name: '战地维修', en: 'FIELD REPAIR', icon: 'nano', color: '#a9e56e', desc: '立即修复车体 <b>35%</b> 最大装甲。', type: 'utility' },
    { id: 'pulse', name: '清屏脉冲', en: 'PULSE SWEEP', icon: 'timer', color: '#79b9ff', desc: '清除全部敌弹，并击伤附近敌人。', type: 'utility' },
    { id: 'emergency_shield', name: '应急护盾', en: 'EMERGENCY BARRIER', icon: 'shield', color: '#79b9ff', desc: '立即获得 <b>40</b> 点护盾。', type: 'utility' }
  ];

  function getUpgradeChoices(p) {
    p = p || G.levelupPlayer || G.player || (G.players && G.players[0]);
    const tank = tankData(p);
    const affinity = tank.affinity || [];
    const wset = weaponsFor(p);
    const pset = passivesFor(p);
    const rawWeapons = p.weapons || {};
    const rawPassives = p.passives || {};
    const fset = fusionsFor(p);
    const fusionCandidates = [];
    for (const f of Object.values(FUSIONS)) {
      if (fset[f.id]) continue;
      if ((wset[f.weapon] || 0) < f.weaponLevel) continue;
      if ((pset[f.passive] || 0) < f.passiveLevel) continue;
      fusionCandidates.push({
        kind: 'fusion', id: f.id, data: f, fusion: f, level: 0, nextLevel: 0, max: 0,
        accent: f.color, weight: 8
      });
    }
    const weaponCandidates = [];
    const weaponCount = Object.values(rawWeapons).filter(lvl => lvl > 0).length;
    for (const id of Object.keys(WEAPONS)) {
      const data = WEAPONS[id];
      const lvl = rawWeapons[id] || 0;
      if (lvl >= maxUpgradeRank()) continue;
      if (lvl === 0 && weaponCount >= 6) continue;
      weaponCandidates.push({
        kind: 'weapon', id, data, level: lvl, nextLevel: lvl + 1, max: maxUpgradeRank(),
        accent: data.color,
        weight: (lvl === 0 ? 1.15 : 1.7) * (affinity.includes(id) ? 1.6 : 1)
      });
    }
    const passiveCandidates = [];
    const passiveCount = Object.values(rawPassives).filter(lvl => lvl > 0).length;
    for (const id of Object.keys(PASSIVES)) {
      const data = PASSIVES[id];
      const lvl = rawPassives[id] || 0;
      const maxTier = Math.min(maxUpgradeRank(), data.max || 4);
      if (lvl >= maxTier) continue;
      if (lvl === 0 && data.minLevel && p.level < data.minLevel) continue;
      if (lvl === 0 && passiveCount >= 6) continue;
      passiveCandidates.push({
        kind: 'passive', id, data, level: lvl, nextLevel: lvl + 1, max: maxTier,
        accent: data.color,
        weight: (lvl === 0 ? 1.1 : 1.35) * (affinity.includes(id) ? 1.45 : 1)
      });
    }
    const picked = [];
    const seen = new Set();
    const take = (pool) => {
      const avail = pool.filter(c => !seen.has(c.kind + c.id));
      if (!avail.length) return null;
      const c = weightedPick(avail);
      seen.add(c.kind + c.id);
      picked.push(c);
      return c;
    };
    if (fusionCandidates.length) take(fusionCandidates);
    if (weaponCandidates.length) take(weaponCandidates);
    let guard = 0;
    while (picked.length < 3 && guard++ < 24) {
      const pool = weaponCandidates.concat(passiveCandidates);
      if (!take(pool)) break;
    }
    if (picked.length && !picked.some(c => c.kind === 'passive') && passiveCandidates.length && picked.length >= 3) {
      const alt = weightedPick(passiveCandidates.filter(c => !picked.some(x => x.kind === c.kind && x.id === c.id)));
      if (alt) picked[picked.length - 1] = alt;
    }
    if (picked.length && !picked.some(c => c.kind === 'weapon') && weaponCandidates.length && picked.length >= 3) {
      const alt = weightedPick(weaponCandidates.filter(c => !picked.some(x => x.kind === c.kind && x.id === c.id)));
      if (alt) picked[picked.length - 1] = alt;
    }
    const utilityPool = UTILITY_CARDS.slice();
    while (picked.length < 3 && utilityPool.length) {
      const utility = utilityPool.splice(Math.floor(Math.random() * utilityPool.length), 1)[0];
      picked.push({ kind: 'utility', id: utility.id, data: utility, level: 0, nextLevel: 0, max: 0, accent: utility.color, utility });
    }
    return picked;
  }

  function levelupPad() {
    const p = G.levelupPlayer;
    if (p && p.index === 1 && Input.gamepad2.connected) return Input.gamepad2;
    return Input.gamepad;
  }

  function syncLevelupFocus() {
    const g = levelupPad();
    const cards = U.upgradeCards ? U.upgradeCards.querySelectorAll('.upgrade-card') : [];
    const owner = G.levelupPlayer;
    if (!owner) {
      cards.forEach(card => card.classList.remove('is-pad'));
      clearPadFocus();
      return;
    }
    cards.forEach((card, i) => {
      card.classList.toggle('is-pad', i === g.selectedCard);
      const tag = card.querySelector('.upgrade-card__pad');
      if (tag) tag.textContent = owner.label;
    });
    if (g.selectedCard >= 0 && cards[g.selectedCard]) setPadFocus(cards[g.selectedCard]);
    else clearPadFocus();
  }

  function moveLevelupSelection(dir, owner) {
    const p = G.levelupPlayer;
    if (!p || (owner && owner !== p.label)) { AUDIO.deny(); return; }
    const g = levelupPad();
    const count = Math.max(1, (G.currentChoices || []).length);
    g.levelupOwner = p.label;
    if (g.selectedCard < 0) g.selectedCard = dir > 0 ? 0 : count - 1;
    else g.selectedCard = (g.selectedCard + dir + count) % count;
    syncLevelupFocus();
    AUDIO.tick();
  }

  function updateLevelupPrompt() {
    const coop = !!G.twoPlayer;
    const p = G.levelupPlayer || G.player;
    const isP2 = !!(p && p.index === 1);
    if (U.levelupOwner) U.levelupOwner.textContent = isP2 ? 'P2' : 'P1';
    if (U.levelupPlayers) U.levelupPlayers.classList.toggle('is-hidden', !coop);
    if (U.levelupP1) {
      U.levelupP1.classList.toggle('is-active', !isP2);
      U.levelupP1.innerHTML = `<b>P1</b><em>${isP2 ? '等待' : '正在选择'}</em>`;
    }
    if (U.levelupP2) {
      U.levelupP2.classList.toggle('is-active', isP2);
      U.levelupP2.innerHTML = `<b>P2</b><em>${isP2 ? '正在选择' : '等待'}</em>`;
    }
    if (U.levelupKeyHint) {
      U.levelupKeyHint.textContent = isP2 ? '' : (coop ? 'P1：按 1 / 2 / 3 选择' : '按 1 / 2 / 3 选择');
      U.levelupKeyHint.classList.toggle('is-hidden', isP2);
    }
    if (U.rerollBtn) {
      U.rerollBtn.disabled = isP2 || !p || p.rerolls <= 0;
      U.rerollBtn.classList.toggle('is-hidden', isP2 || !p || p.rerolls <= 0);
    }
    if (U.rerollCount) U.rerollCount.textContent = String((p && p.rerolls) || 0);
  }

  function openLevelUp(p) {
    if (G.mode !== 'playing' && G.mode !== 'levelup') return;
    p = p || nextPendingPlayer();
    if (!p) return;
    G.mode = 'levelup';
    G.levelupPlayer = p;
    G.resolvingUpgrade = false;
    for (const gp of [Input.gamepad, Input.gamepad2]) {
      gp.selectedCard = -1; gp.levelupNeedsNeutral = true; gp.levelupOwner = p.label;
    }
    clearPadFocus();
    G.currentChoices = getUpgradeChoices(p);
    U.newLevel.textContent = String(p.level).padStart(2, '0');
    if (U.levelupOwner) U.levelupOwner.textContent = p.label || 'P1';
    renderUpgradeCards(G.currentChoices);
    U.levelupScreen.classList.remove('hidden');
    updateLevelupPrompt();
    G.lastFrame = performance.now();
    AUDIO.levelUp();
  }

  function fusionHintFor(c) {
    if (!c || c.kind === 'utility') return '';
    const p = G.levelupPlayer || G.player;
    const fset = fusionsFor(p);
    const weaponName = id => (WEAPONS[id] && (WEAPONS[id].short || WEAPONS[id].name)) || id;
    const passiveName = id => (PASSIVES[id] && PASSIVES[id].name) || id;
    const all = Object.values(FUSIONS).filter(f => !fset[f.id]);
    if (c.kind === 'fusion') {
      return `<span class="fusion-label">已满足</span>${weaponName(c.fusion.weapon)} + ${passiveName(c.fusion.passive)} → <b>${c.fusion.name}</b>`;
    }
    if (c.kind === 'weapon') {
      const f = all.find(x => x.weapon === c.id);
      if (!f) return '';
      const need = Math.max(1, PASSIVE_TIER_LEVEL.indexOf(f.passiveLevel));
      const cur = (passivesFor(p) || {})[f.passive] || 0;
      const ready = cur >= f.passiveLevel;
      return `<span class="fusion-label">合成需求</span>搭配 <b>${passiveName(f.passive)}</b>${ready ? '<em>已满足</em>' : `<em>需 Lv.${need}</em>`} → ${f.name}`;
    }
    if (c.kind === 'passive') {
      const links = all.filter(x => x.passive === c.id);
      if (!links.length) return '';
      const parts = links.map(f => {
        const need = Math.max(1, WEAPON_TIER_LEVEL.indexOf(f.weaponLevel));
        const cur = (weaponsFor(p) || {})[f.weapon] || 0;
        return `<b>${weaponName(f.weapon)}</b>${cur >= f.weaponLevel ? '<em>✓</em>' : `<em>Lv.${need}</em>`}→${f.name}`;
      });
      return `<span class="fusion-label">可合成</span>${parts.join(' · ')}`;
    }
    return '';
  }

  function renderUpgradeCards(choices) {
    const ownerTag = G.levelupPlayer ? G.levelupPlayer.label : (G.twoPlayer ? 'P2' : 'P1');
    const cards = choices.map((c, i) => {
      const data = c.data;
      let typeLabel = c.kind === 'fusion' ? '合成' : c.kind === 'weapon' ? '武器' : c.kind === 'passive' ? '被动' : '补给';
      let levelLabel = c.kind === 'utility' ? '补给' : c.kind === 'fusion' ? '进化' : c.level === 0 ? '新模块' : '';
      let desc = c.kind === 'utility' ? c.utility.desc : c.kind === 'fusion' ? c.fusion.desc : c.kind === 'weapon' ? WEAPONS[c.id].levels[weaponTierValue(c.nextLevel) - 1].text : PASSIVES[c.id].text;
      let pips = '';
      if (c.kind === 'fusion') {
        pips = Array.from({ length: maxUpgradeRank() }, () => '<i class="is-on"></i>').join('');
      } else if (c.kind !== 'utility') {
        const count = c.kind === 'weapon' ? maxUpgradeRank() : c.max;
        for (let n = 0; n < count; n++) pips += `<i class="${n < c.nextLevel ? 'is-on' : ''}"></i>`;
      } else {
        pips = '<i class="is-on"></i><i class="is-on"></i><i class="is-on"></i>';
      }
      const name = c.kind === 'utility' ? c.utility.name : data.name;
      const icon = c.kind === 'utility' ? c.utility.icon : data.icon;
      const color = c.kind === 'utility' ? c.utility.color : data.color;
      const role = c.kind === 'utility' ? '即时补给' : c.kind === 'fusion' ? '武器进化' : (data.role || '') + (data.focus ? ' · ' + data.focus : '');
      const fusionHint = fusionHintFor(c);
      return `<button class="upgrade-card" type="button" data-index="${i}" style="--accent:${color}" aria-label="${ownerTag} 选择 ${name}">
        <span class="upgrade-card__corner" aria-hidden="true"></span>
        <div class="upgrade-card__top"><span class="upgrade-card__type">${typeLabel}</span><span class="upgrade-card__level">${levelLabel}</span></div>
        <div class="upgrade-card__icon"><canvas data-icon="${icon}" data-color="${color}" data-size="82"></canvas></div>
        <div class="upgrade-card__body">
          <h3 class="upgrade-card__name">${name}</h3>
          <div class="upgrade-card__role">${role}</div>
          <p class="upgrade-card__desc">${desc}</p>
        </div>
        ${fusionHint ? `<div class="upgrade-card__fusion">${fusionHint}</div>` : ''}
        <div class="upgrade-card__pips">${pips}</div>
        <span class="upgrade-card__pad" aria-hidden="true">${ownerTag}</span>
        <span class="upgrade-card__key">${i + 1}</span>
      </button>`;
    }).join('');
    U.upgradeCards.innerHTML = cards;
    ICONS.applyAll(U.upgradeCards);
  }

  function chooseUpgrade(index, owner) {
    if (G.mode !== 'levelup' || G.resolvingUpgrade) return;
    const p = G.levelupPlayer;
    if (!p) return;
    if (owner && ((owner === 'P2' && p.index !== 1) || (owner === 'P1' && p.index !== 0))) {
      AUDIO.deny();
      return;
    }
    const c = G.currentChoices[index];
    if (!c) return;
    G.resolvingUpgrade = true;
    AUDIO.confirm();
    if (c.kind === 'fusion') {
      p.fusions[c.id] = true;
      showToast(`${p.label} 合成完成 · ${c.fusion.name}`, 'gold');
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 90, life: .8, maxLife: .8, color: c.fusion.color });
      addParticles(p.x, p.y, 28, c.fusion.color, 'spark', 1.6);
    } else if (c.kind === 'weapon') {
      const cur = p.weapons[c.id] || 0;
      p.weapons[c.id] = Math.min(maxUpgradeRank(), cur + 1);
      if (cur === 0) p.weaponCds[c.id] = .5;
      showToast(`${p.label} 武器解锁 · ${c.data.name}`, 'cyan');
    } else if (c.kind === 'passive') {
      const cur = p.passives[c.id] || 0;
      p.passives[c.id] = Math.min(c.data.max, cur + 1);
      if (c.id === 'armor') healPlayer(18, p);
      showToast(`${p.label} 协议升级 · ${c.data.name}`, 'cyan');
    } else if (c.kind === 'utility') {
      if (c.id === 'field_repair') healPlayer(p.maxHp * .35, p);
      else if (c.id === 'pulse') {
        G.enemyBullets = [];
        for (const e of G.enemies) {
          if (e.dead) continue;
          if (dist(e.x, e.y, p.x, p.y) < 240) damageEnemy(e, 90 * statsFor(p).damage, false, 'pulse', p);
        }
      } else if (c.id === 'emergency_shield') p.shield = Math.max(p.shield, 40);
      showToast(`${p.label} 补给到位 · ${c.utility.name}`, 'cyan');
    }
    recalcStats(false);
    p.pendingLevels = Math.max(0, p.pendingLevels - 1);
    G.loadoutDirty = true;
    addEffect({ type: 'ring', x: p.x, y: p.y, radius: 50, life: .55, maxLife: .55, color: c.accent });
    addParticles(p.x, p.y, 10, c.accent, 'spark', .9);
    updateHUD();
    setTimeout(() => {
      if (G.mode !== 'levelup') return;
      if (p.pendingLevels > 0) { openLevelUp(p); return; }
      const next = nextPendingPlayer();
      if (next) { openLevelUp(next); return; }
      G.mode = 'playing';
      G.levelupPlayer = null;
      U.levelupScreen.classList.add('hidden');
      G.lastFrame = performance.now();
      G.resolvingUpgrade = false;
    }, 180);
  }

  function rerollUpgrades(owner) {
    const p = G.levelupPlayer;
    if (!p || G.mode !== 'levelup' || p.rerolls <= 0 || G.resolvingUpgrade) { AUDIO.deny(); return; }
    if (owner && ((owner === 'P2' && p.index !== 1) || (owner === 'P1' && p.index !== 0))) { AUDIO.deny(); return; }
    p.rerolls -= 1;
    U.rerollCount.textContent = String(p.rerolls);
    U.rerollBtn.disabled = p.index === 1 || p.rerolls <= 0;
    G.currentChoices = getUpgradeChoices(p);
    for (const gp of [Input.gamepad, Input.gamepad2]) {
      gp.selectedCard = -1; gp.levelupNeedsNeutral = true; gp.levelupOwner = p.label;
    }
    clearPadFocus();
    renderUpgradeCards(G.currentChoices);
    AUDIO.select();
  }

  /* ---------------- HUD / overlays ---------------- */
  function showToast(text, type) {
    if (!U.toastStack) return;
    while (U.toastStack.children.length > 3) U.toastStack.removeChild(U.toastStack.firstChild);
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'cyan' ? ' is-cyan' : type === 'red' ? ' is-red' : '');
    el.textContent = text;
    U.toastStack.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3000);
  }

  function showPickupToast(p, text) {
    const feed = p === (G.players && G.players[1]) ? U.p2Feed : U.p1Feed;
    if (!feed) { showToast(text, 'cyan'); return; }
    while (feed.children.length > 2) feed.removeChild(feed.firstChild);
    const el = document.createElement('div');
    el.className = 'pickup-toast';
    el.textContent = text;
    feed.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3400);
  }

  function updateHUD() {
    const p = (G.players && G.players[0]) || G.player;
    if (!p) return;
    const hpPct = clamp(p.hp / p.maxHp * 100, 0, 100);
    const endless = !!G.endless;
    const progress = endless
      ? clamp((G.elapsed % ENDLESS_WAVE_SPAN) / ENDLESS_WAVE_SPAN * 100, 0, 100)
      : clamp(G.elapsed / Math.max(1, G.bossAt || BOSS_AT) * 100, 0, 100);
    const remain = endless
      ? Math.max(0, (G.endlessNextBossAt || 0) - G.elapsed)
      : Math.max(0, (G.bossAt || BOSS_AT) - G.elapsed);
    const xpPct = clamp(p.xp / p.xpNext * 100, 0, 100);
    U.hpMeter.style.width = `${hpPct}%`;
    U.xpMeter.style.width = `${xpPct}%`;
    U.hpText.textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
    U.xpText.textContent = `${Math.floor(p.xp)} / ${Math.ceil(p.xpNext)}`;
    U.levelLabel.textContent = String(p.level).padStart(2, '0');
    const p2 = G.players && G.players[1];
    if (p2 && U.coopXpMeter2) {
      U.coopLv2.textContent = String(p2.level).padStart(2, '0');
      U.coopXp2.textContent = `${Math.floor(p2.xp)} / ${Math.ceil(p2.xpNext)}`;
      U.coopXpMeter2.style.width = `${clamp(p2.xp / p2.xpNext * 100, 0, 100)}%`;
      const buildParts = [
        ...Object.entries(p2.weapons).filter(([id, lvl]) => lvl > 0 && WEAPONS[id]).map(([id, lvl]) => `${WEAPONS[id].short} ${lvl}`),
        ...Object.entries(p2.passives).filter(([id, lvl]) => lvl > 0 && PASSIVES[id]).map(([id, lvl]) => `${PASSIVES[id].short} ${lvl}`)
      ];
      const build = buildParts.slice(0, 4).join(' / ') || '主炮 1';
      U.coopBuild2.innerHTML = `<b>P2</b> · ${build}`;
    }
    G.xp = p.xp; G.xpNext = p.xpNext; G.level = p.level;
    U.statAtk.textContent = `${Math.round(G.stats.damage * 100)}`;
    U.statSpd.textContent = `${Math.round(p.speed / PLAYER_BASE.speed * 100)}`;
    U.statCrit.textContent = `${Math.round(G.stats.crit * 100)}%`;
    U.coreRing.style.setProperty('--p', progress.toFixed(1));
    U.corePercent.textContent = endless ? String(G.endlessBossKills).padStart(2, '0') : String(Math.floor(progress));
    U.coreText.textContent = endless ? (G.boss ? '首领' : `下一波 ${fmtShort(remain)}`) : (G.boss ? '泰坦' : fmtShort(remain));
    U.coreState.textContent = endless ? 'ENDLESS' : (G.boss ? 'BOSS' : (remain <= 0 ? 'READY' : `T-${fmtShort(remain)}`));
    const basePct = G.core ? clamp(G.core.hp / G.core.maxHp * 100, 0, 100) : 0;
    if (U.baseHpText) U.baseHpText.textContent = G.core ? `${Math.ceil(G.core.hp)} / ${Math.ceil(G.core.maxHp)}` : '--';
    if (U.baseHpMeter) U.baseHpMeter.style.width = `${basePct}%`;
    if (U.baseMeter) U.baseMeter.classList.toggle('is-low', basePct < 30);
    if (U.baseTurretNote) {
      const turrets = (G.core && G.core.turrets) || 0;
      U.baseTurretNote.textContent = turrets > 0 ? `拦截无人机 ${turrets} / 4 · 左/上/右三向` : '拦截无人机 0 / 4 · 拾取后启用';
      U.baseTurretNote.classList.toggle('is-active', turrets > 0);
    }
    U.coreState.classList.toggle('is-danger', basePct < 30 || hpPct < 35);
    Array.from(U.corePips.children).forEach((el, i) => el.classList.toggle('is-off', progress < (i + 1) * 20));
    U.killCount.textContent = String(G.kills).padStart(3, '0');
    U.topKills.textContent = String(G.kills).padStart(3, '0');
    U.pickupCount.textContent = String(G.pickupsCollected).padStart(3, '0');
    U.comboCount.textContent = `x${(1 + Math.min(1.5, G.combo * .02)).toFixed(1)}`;
    if (G.boss) {
      const bossName = G.boss.bossName || '泰坦';
      U.phaseLabel.textContent = `泰坦 · ${bossName}`;
      U.objectiveLabel.textContent = endless ? `无尽协议 · 击破 ${bossName} · 已生存 ${fmtShort(G.elapsed)}` : `击破${bossName} · 摧毁泰坦`;
      U.sideTip.textContent = G.twoPlayer ? `${bossName}优先锁定车体。保持移动，队友别站同一条弹道。` : `${bossName}优先锁定你的车体。保持移动，别被逼进死角。`;
    } else {
      U.phaseLabel.textContent = `第 ${phaseIndex() + 1} 阶段 · ${phaseLabel()}`;
      U.objectiveLabel.textContent = endless ? `无尽协议 · 已生存 ${fmtShort(G.elapsed)}` : (remain > 0 ? `泰坦降临倒计时 · ${fmtShort(remain)}` : '泰坦已降临 · 摧毁它');
      if (hpPct < 35) U.sideTip.textContent = '车体濒危 · 拉开距离，先吃维修包。';
      else if (endless) U.sideTip.textContent = `无尽协议 · 已击破 ${G.endlessBossKills} 个首领 · 下一轮 ${fmtShort(remain)}`;
      else if (G.elapsed > 480) U.sideTip.textContent = '最后阶段 · 保留冲刺，准备迎击泰坦。';
      else if (weaponsFor(p).flame && p.moving) U.sideTip.textContent = '燃迹喷流正在灼烧追兵。';
      else U.sideTip.textContent = '提示 · 砖墙可打碎，钢板不可。';
    }
    U.clockLabel.textContent = endless ? fmtTime(G.elapsed) : (G.boss ? `+${fmtTime(Math.max(0, G.elapsed - (G.bossAt || BOSS_AT)))}` : fmtTime(remain));
    U.clockBar.style.width = `${endless ? clamp((G.elapsed % 120) / 120 * 100, 0, 100) : clamp(G.elapsed / Math.max(1, G.bossAt || BOSS_AT) * 100, 0, 100)}%`;
    if (U.mCoreBar) {
      U.mCoreBar.style.width = `${progress}%`;
      if (U.mBaseBar) U.mBaseBar.style.width = `${basePct}%`;
      U.mHpBar.style.width = `${hpPct}%`;
      U.mLevel.textContent = String(p.level).padStart(2, '0');
      U.mCoreBar.parentElement.parentElement.classList.toggle('is-low', false);
      if (U.mBaseBar) U.mBaseBar.parentElement.parentElement.classList.toggle('is-low', basePct < 30);
      U.mHpBar.parentElement.parentElement.classList.toggle('is-low', hpPct < 30);
    }
    const threat = clamp(1 + phaseIndex() * 1.1 + G.enemies.length / 9, 0, 8);
    Array.from(U.threatBars.children).forEach((el, i) => el.classList.toggle('is-on', i < threat));
    U.threatBars.classList.toggle('is-critical', threat > 5.5);
    U.threatLabel.textContent = threat > 6.5 ? '极危' : threat > 4.5 ? '高' : threat > 2.5 ? '中' : '低';
    U.dangerTint.classList.toggle('is-active', hpPct < 28);
    const dashLeft = Math.max(0, p.dashCd);
    if (U.dashStatus) U.dashStatus.textContent = dashLeft <= .03 ? '就绪' : `充能 ${dashLeft.toFixed(1)}s`;
    if (U.dashMeter) U.dashMeter.style.width = `${dashLeft <= .03 ? 100 : clamp((1 - dashLeft / p.dashMax) * 100, 0, 100)}%`;
    if (U.dashStatus2) {
      const dashLeft2 = p2 ? Math.max(0, p2.dashCd) : 0;
      U.dashStatus2.textContent = !p2 ? '离线' : (p2.downed ? '倒地' : (dashLeft2 <= .03 ? '就绪' : `充能 ${dashLeft2.toFixed(1)}s`));
      if (U.dashMeter2) U.dashMeter2.style.width = p2 ? `${dashLeft2 <= .03 ? 100 : clamp((1 - dashLeft2 / p2.dashMax) * 100, 0, 100)}%` : '0%';
    }
    const recallLeft = Math.max(0, G.recallCd || 0);
    for (const status of [U.recallStatus, U.recallStatus2]) {
      if (status) status.textContent = recallLeft <= .03 ? '就绪' : `冷却 ${Math.ceil(recallLeft)}s`;
    }
    const recallPct = recallLeft <= .03 ? 100 : clamp((1 - recallLeft / (G.recallMax || RECALL_CD)) * 100, 0, 100);
    for (const meter of [U.recallMeter, U.recallMeter2]) {
      if (meter) meter.style.width = `${recallPct}%`;
    }
    for (const btn of [U.recallBtn, U.recallBtn2]) {
      if (!btn) continue;
      btn.disabled = recallLeft > .03;
      btn.classList.toggle('is-cooling', recallLeft > .03);
    }
    if (U.mobileRecall) {
      U.mobileRecall.disabled = recallLeft > .03;
      U.mobileRecall.classList.toggle('is-cooling', recallLeft > .03);
      U.mobileRecall.textContent = recallLeft <= .03 ? '回程' : `${Math.ceil(recallLeft)}s`;
    }
    if (U.coopPanel) {
      U.coopPanel.classList.toggle('is-hidden', !G.twoPlayer);
      if (G.twoPlayer) {
        for (let i = 0; i < 2; i++) {
          const q = G.players[i];
          const hp = q ? (q.downed ? 0 : clamp(q.hp / q.maxHp * 100, 0, 100)) : 0;
          const b = i === 0 ? U.coopHp1 : U.coopHp2;
          const m = i === 0 ? U.coopMeter1 : U.coopMeter2;
          const st = i === 0 ? U.coopState1 : U.coopState2;
          if (b) b.textContent = q ? `${Math.ceil(q.hp)} / ${Math.ceil(q.maxHp)}` : '--';
          if (m) m.style.width = `${hp}%`;
          if (st) {
            st.textContent = !q ? '离线' : q.downed ? '倒地' : '在线';
            st.classList.toggle('is-down', !!q && q.downed);
            st.classList.toggle('is-alive', !!q && !q.downed);
          }
        }
        const downed = G.players.find(q => q.downed);
        if (downed) U.sideTip.textContent = `P${downed.index + 1} 倒地 · 队友靠近并停留 2.4 秒可重启`;
      }
    }
    if (U.coreNote) U.coreNote.innerHTML = `<span class="blink-dot"></span> ${G.endless ? '无尽协议 · 生存至极限 · 车体或基地归零即终止' : (G.twoPlayer ? `双人 · 泰坦 ${fmtShort(G.bossAt || BOSS_AT)} 降临 · 双车或基地归零即失败` : `泰坦 ${fmtShort(G.bossAt || BOSS_AT)} 降临 · 车体或基地归零即失败`)}`;
    if (G.weapons.cannon && U.primaryName) U.primaryName.textContent = G.fusions.cannon ? FUSIONS.cannon.name : G.weapons.cannon >= maxUpgradeRank() ? '湮灭主炮' : WEAPONS.cannon.name;
    const downedNow = G.twoPlayer ? G.players.find(q => q.downed) : null;
    if (downedNow) U.sideTip.textContent = `P${downedNow.index + 1} 倒地 · 队友靠近并停留 2.4 秒可重启`;
    U.objectiveLabel.title = G.endless ? '无尽协议：持续生存，首领循环刷新，车体或基地归零即终止' : (G.twoPlayer ? '双人合作：击破泰坦，两人都倒下或基地被毁才失败' : (G.boss ? `${G.boss.bossName || '泰坦'} 会攻击最近的你和基地，击破它才能结束战役` : '在倒计时结束前整备，击破降临的泰坦'));
    if (G.boss && G.boss.hp > 0) {
      U.bossHud.classList.remove('is-hidden');
      const bp = clamp(G.boss.hp / G.boss.maxHp * 100, 0, 100);
      U.bossHpLabel.textContent = `${Math.ceil(G.boss.hp)} / ${Math.ceil(G.boss.maxHp)}  ·  ${Math.ceil(bp)}%`;
      U.bossHpBar.style.width = `${bp}%`;
    } else if (!G.boss) {
      U.bossHud.classList.add('is-hidden');
    }
    if (G.loadoutDirty) renderLoadout();
  }

  function renderLoadout() {
    if (!U.loadoutList) return;
    let html = '';
    for (const id of Object.keys(G.weapons)) {
      const data = WEAPONS[id]; const lvl = G.weapons[id];
      if (!data) continue;
      const fusion = FUSIONS[id] && G.fusions[id] ? FUSIONS[id] : null;
      const name = fusion ? fusion.name : data.name;
      const sub = fusion ? '进化' : `等级 ${lvl} / ${maxUpgradeRank()}`;
      html += `<div class="loadout-item${fusion ? ' is-fused' : ''}">
        <canvas data-icon="${fusion ? fusion.icon : data.icon}" data-color="${fusion ? fusion.color : data.color}" data-size="22"></canvas>
        <div class="loadout-item__copy"><strong>${name}</strong><small>${sub}</small></div>
        <div class="loadout-pips">${Array.from({ length: maxUpgradeRank() }, (_, i) => `<i class="${i < lvl ? 'is-on' : ''}"></i>`).join('')}</div>
      </div>`;
    }
    for (const id of Object.keys(G.passives)) {
      const data = PASSIVES[id]; const lvl = G.passives[id];
      if (!data) continue;
      html += `<div class="loadout-item is-passive">
        <canvas data-icon="${data.icon}" data-color="${data.color}" data-size="22"></canvas>
        <div class="loadout-item__copy"><strong>${data.name}</strong><small>PASSIVE · LV.${lvl} / ${Math.min(maxUpgradeRank(), data.max)}</small></div>
        <div class="loadout-pips">${Array.from({ length: Math.min(maxUpgradeRank(), data.max) }, (_, i) => `<i class="${i < lvl ? 'is-on' : ''}"></i>`).join('')}</div>
      </div>`;
    }
    const totalItems = Object.keys(G.weapons).length + Object.keys(G.passives).length;
    if (totalItems < 4) html += '<div class="loadout-hint">继续拾取余烬扩展构筑</div>';
    U.loadoutList.innerHTML = html || '<div class="empty-slot">升级解锁武器模块</div>';
    ICONS.applyAll(U.loadoutList);
    U.slotCount.textContent = `武器 ${Object.keys(G.weapons).length} / 6`;
    if (U.passiveCount) U.passiveCount.textContent = `被动 ${Object.keys(G.passives).length} / 6`;
    G.loadoutDirty = false;
  }

  function difficultyData(id) {
    return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[0];
  }

  function stageDifficulty(campaign, index) {
    const list = (campaign && Array.isArray(campaign.difficulties)) ? campaign.difficulties : [];
    return difficultyData(list[index]).id;
  }

  function buildRunMod(base, difficultyId) {
    const baseMod = base || {};
    const diff = difficultyData(difficultyId).mod;
    return {
      enemyHp: (baseMod.enemyHp || 1) * (diff.enemyHp || 1),
      enemyDamage: (baseMod.enemyDamage || 1) * (diff.enemyDamage || 1),
      enemySpeed: (baseMod.enemySpeed || 1) * (diff.enemySpeed || 1),
      spawnMul: (baseMod.spawnMul || 1) * (diff.spawnMul || 1),
      bossHp: (baseMod.bossHp || 1) * (diff.bossHp || 1),
      xpMul: (baseMod.xpMul || 1) * (diff.xpMul || 1),
      coreMul: diff.coreMul || 1
    };
  }

  function readCampaign() {
    let c = {};
    try { c = JSON.parse(localStorage.getItem('bf.campaign') || '{}'); } catch (e) {}
    const unlocked = clamp(Number(c.unlocked) || 1, 1, MAPS.length);
    const difficulties = Array.isArray(c.difficulties) ? c.difficulties : [];
    return { unlocked, cleared: Array.isArray(c.cleared) ? c.cleared : [], difficulties };
  }

  function writeCampaign(c) {
    try { localStorage.setItem('bf.campaign', JSON.stringify(c)); } catch (e) {}
  }

  function readCodex() {
    try {
      const list = JSON.parse(localStorage.getItem('bf.codex') || '[]');
      return Array.isArray(list) ? list.filter(k => typeof k === 'string') : [];
    } catch (e) { return []; }
  }

  function writeCodex(list) {
    try { localStorage.setItem('bf.codex', JSON.stringify(Array.from(new Set(list)))); } catch (e) {}
  }

  function markCodex(key) {
    if (!key) return;
    const list = readCodex();
    if (list.includes(key)) return;
    list.push(key);
    writeCodex(list);
    if (U.codexScreen && !U.codexScreen.classList.contains('hidden')) renderCodex();
  }

  function readProfile() {
    let p = {};
    let hasHangar = false;
    try {
      hasHangar = !!localStorage.getItem('bf.hangar');
      p = JSON.parse(localStorage.getItem('bf.hangar') || '{}');
    } catch (e) {}
    const unlocked = Array.isArray(p.unlocked)
      ? p.unlocked.filter(id => TANKS.some(t => t.id === id))
      : [];
    if (!unlocked.includes(TANKS[0].id)) unlocked.unshift(TANKS[0].id);
    return {
      cores: Math.max(0, Math.floor(Number(p.cores) || 0)),
      totalKills: Math.max(0, Math.floor(Number(p.totalKills) || 0)),
      wins: Math.max(0, Math.floor(Number(p.wins) || (hasHangar ? 0 : readRecords().wins))),
      revives: Math.max(0, Math.floor(Number(p.revives) || 0)),
      unlocked
    };
  }

  function writeProfile(profile) {
    try { localStorage.setItem('bf.hangar', JSON.stringify(profile)); } catch (e) {}
  }

  function tankRequirementText(tank) {
    const u = tank.unlock || { type: 'default' };
    if (u.type === 'default') return '初始配发';
    if (u.type === 'seal') {
      const map = MAPS[u.value - 1];
      return `第 ${u.value} 关${map ? ' · ' + map.name : ''} · 击破守卫`;
    }
    return '未公开条件';
  }

  function syncTankUnlocks(profile) {
    let changed = false;
    for (const tank of TANKS) {
      if (profile.unlocked.includes(tank.id)) continue;
      if (tank.unlock && tank.unlock.type === 'default') {
        profile.unlocked.push(tank.id);
        changed = true;
      }
    }
    if (changed) writeProfile(profile);
    return profile;
  }

  function tankOwned(id, profile) {
    const p = profile || G.profile || readProfile();
    return p.unlocked.includes(id);
  }

  function readTankIds() {
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem('bf.tanks') || '[]'); } catch (e) {}
    if (!Array.isArray(ids) || !ids.length) {
      try {
        const legacy = localStorage.getItem('bf.tank');
        if (legacy) ids = [legacy];
      } catch (e) {}
    }
    const profile = G.profile || syncTankUnlocks(readProfile());
    return [0, 1].map(i => {
      const id = ids[i];
      return TANKS.some(t => t.id === id) && tankOwned(id, profile) ? id : TANKS[0].id;
    });
  }

  function writeTankIds(ids) {
    try {
      localStorage.setItem('bf.tanks', JSON.stringify(ids));
      localStorage.setItem('bf.tank', ids[0] || TANKS[0].id);
    } catch (e) {}
  }

  function unlockTankWithCores(id) {
    const tank = TANKS.find(t => t.id === id);
    if (!tank || tankOwned(id)) return true;
    const profile = G.profile || readProfile();
    if (profile.cores < tank.cost) return false;
    profile.cores -= tank.cost;
    profile.unlocked.push(tank.id);
    writeProfile(profile);
    G.profile = profile;
    showToast(`底盘解锁 · ${tank.name}`, 'cyan');
    return true;
  }

  function unlockTankFromSeal(id) {
    const tank = TANKS.find(t => t.id === id);
    if (!tank) return null;
    const profile = G.profile || readProfile();
    if (!profile.unlocked.includes(tank.id)) {
      profile.unlocked.push(tank.id);
      writeProfile(profile);
      G.profile = profile;
    }
    updateTankCount();
    updatePilotCard(0); updatePilotCard(1);
    showToast(`封印解除 · ${tank.name} 已解锁`, 'cyan');
    return tank;
  }

  function recordRunProgress(win) {
    if (G.progressRecorded) return;
    G.progressRecorded = true;
    const profile = G.profile || readProfile();
    profile.totalKills += G.kills || 0;
    profile.revives += G.revives || 0;
    const diff = difficultyData(G.difficulty);
    const earned = Math.round((Math.floor((G.kills || 0) / 8) + (win ? 10 : 0)) * (diff.mod.coreMul || 1));
    profile.cores += earned;
    G.lastCoreReward = earned;
    if (win) profile.wins += 1;
    writeProfile(profile);
    G.profile = syncTankUnlocks(profile);
  }

  function renderStagePicker() {
    if (!U.arenaOptions) return;
    const camp = G.campaign || readCampaign();
    const endlessUnlocked = !!camp.cleared[1] || camp.unlocked >= 3;
    const endlessActive = !!G.endlessSelected;
    U.arenaOptions.innerHTML = MAPS.map((m, i) => {
      const locked = i >= camp.unlocked;
      const cleared = !!camp.cleared[i];
      const diff = difficultyData(stageDifficulty(camp, i));
      const active = !endlessActive && i === G.arenaIndex;
      return `<button class="arena-card${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}${cleared ? ' is-cleared' : ''}" data-arena="${i}" type="button" ${locked ? 'disabled aria-disabled="true"' : ''}>
        <span class="arena-card__index">${String(i + 1).padStart(2, '0')} ${cleared ? '· 已突破' : locked ? '· 未解锁' : '· 可出击'}</span>
        <span class="arena-card__name">${m.name}</span>
        <span class="arena-card__trait">${m.desc}</span>
        <span class="arena-card__diff arena-card__diff--${diff.id}">${diff.name}</span>
        ${locked ? '<span class="arena-card__lock">▣</span>' : ''}
      </button>`;
    }).join('');
    if (U.endlessOptions) {
      U.endlessOptions.innerHTML = `<button class="arena-card arena-card--endless${endlessActive ? ' is-active' : ''}${endlessUnlocked ? '' : ' is-locked'}" data-endless="1" type="button" ${endlessUnlocked ? '' : 'disabled aria-disabled="true"'}>
        <span class="arena-card__index">无穷 // PROTOCOL</span>
        <span class="arena-card__name">无尽协议</span>
        <span class="arena-card__en">ENDLESS PROTOCOL</span>
        <span class="arena-card__trait">${endlessUnlocked ? '无尽波次 · 循环 Boss · 生存计分' : '通关第 2 关解锁'}</span>
        <span class="arena-card__diff arena-card__diff--endless">∞ / ENDLESS</span>
        ${endlessUnlocked ? '' : '<span class="arena-card__lock">▣</span>'}
      </button>`;
    }
    requestAnimationFrame(() => {
      const active = U.arenaOptions && U.arenaOptions.querySelector('.arena-card.is-active');
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    U.arenaCards = Array.from((U.arenaOptions || document).querySelectorAll('.arena-card'))
      .concat(Array.from((U.endlessOptions || document).querySelectorAll('.arena-card')));
    const p = U.stageProgress;
    if (p) p.textContent = `${String(camp.unlocked).padStart(2, '0')} / ${String(MAPS.length).padStart(2, '0')}`;
    if (U.stageFootHint) U.stageFootHint.textContent = endlessUnlocked
      ? (camp.unlocked >= MAPS.length ? '全部星区与无尽协议已解锁。' : `已解锁 ${camp.unlocked} / ${MAPS.length} 个星区 · 无尽协议已开放。`)
      : (camp.unlocked >= MAPS.length ? '全部星区已解锁。' : `已解锁 ${camp.unlocked} / ${MAPS.length} 个星区 · 通关第 2 关解锁无尽协议。`);
    updateStageRoster();
  }

  function drawTankPreview(canvas, tank) {
    if (!canvas || !tank) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    const x = canvas.width / 2, y = canvas.height / 2 + 2;
    const hull = tankArtImage(tank.id, 'hull');
    const turret = tankArtImage(tank.id, 'turret');
    if (hull && turret) {
      const size = 48;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath(); ctx.ellipse(x + 2, y + 7, 20, 7, 0, 0, TAU); ctx.fill();
      ctx.drawImage(hull, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
      ctx.drawImage(turret, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
      ctx.restore();
      return;
    }
    drawTankAt(ctx, x, y, -Math.PI / 2, -Math.PI / 2, tank.colors, .95, 0, { barrelLen: tank.id === 'railgun' ? 24 : 18, twin: tank.id === 'twin', heavy: tank.id === 'bastion' || tank.id === 'juggernaut', player: true });
  }

  function updateTankCount() {
    if (U.tankCountLabel) {
      const owned = (G.profile && G.profile.unlocked.length) || 1;
      U.tankCountLabel.textContent = `${owned} / ${TANKS.length}`;
    }
  }

  function syncMenuSelection() {
    const tank = TANKS.find(t => t.id === G.tankIds[0]) || TANKS[0];
    const stage = G.endlessSelected ? { name: '无尽协议', sector: 'ENDLESS' } : (MAPS[G.arenaIndex] || MAPS[0]);
    if (U.sfStageName) U.sfStageName.textContent = stage.name;
    if (U.sfStageSector) U.sfStageSector.textContent = G.endlessSelected ? '无尽' : `第 ${G.arenaIndex + 1} 区`;
    if (U.sfTankName) U.sfTankName.textContent = tank.name;
    if (U.sfUnitName) U.sfUnitName.textContent = tank.name;
    if (U.sfUnitRole) U.sfUnitRole.textContent = tank.role;
    if (U.sfModeName) U.sfModeName.textContent = G.coopSelected ? '双人模式' : '单人模式';
  }

  function updateStageRoster() {
    if (!U.stageTankP1) return;
    const p1 = TANKS.find(t => t.id === G.tankIds[0]) || TANKS[0];
    const p2 = TANKS.find(t => t.id === G.tankIds[1]) || TANKS[0];
    if (U.stageTankNameP1) U.stageTankNameP1.textContent = p1.name;
    if (U.stageTankRoleP1) U.stageTankRoleP1.textContent = p1.role;
    if (U.stageTankNameP2) U.stageTankNameP2.textContent = p2.name;
    if (U.stageTankRoleP2) U.stageTankRoleP2.textContent = p2.role;
    if (U.stageTankP2) U.stageTankP2.classList.toggle('is-hidden', !G.coopSelected);
  }

  function updatePilotCard(slot) {
    const tank = TANKS.find(t => t.id === G.tankIds[slot]) || TANKS[0];
    const p2 = slot === 1;
    const nameEl = p2 ? U.pilotName2 : U.pilotName;
    const roleEl = p2 ? U.pilotRole2 : U.pilotRole;
    const traitEl = p2 ? U.pilotTrait2 : U.pilotTrait;
    const preview = p2 ? U.pilotPreview2 : U.pilotPreview;
    if (nameEl) nameEl.textContent = tank.name;
    if (roleEl) roleEl.textContent = tank.role;
    if (traitEl) traitEl.textContent = tank.trait;
    if (preview) drawTankPreview(preview, tank);
    if (!p2) syncMenuSelection();
  }

  function renderTankGrid() {
    if (!U.tankGrid) return;
    const selected = G.tankViewId || G.tankIds[G.tankPickerSlot] || TANKS[0].id;
    const equipped = G.tankIds[G.tankPickerSlot] || TANKS[0].id;
    const profile = G.profile || readProfile();
    U.tankGrid.innerHTML = TANKS.map((t, i) => {
      const owned = tankOwned(t.id, profile);
      return `<button class="tank-card${t.id === selected ? ' is-active' : ''}${owned ? ' is-owned' : ' is-locked'}" type="button" data-tank="${t.id}" aria-pressed="${t.id === equipped ? 'true' : 'false'}">
        <div class="tank-card__top"><span class="tank-card__id">M-${String(i + 1).padStart(2, '0')}</span><span class="tank-card__role">${owned ? t.role : '未解锁'}</span></div>
        <canvas width="86" height="58" data-tank-preview="${t.id}"></canvas>
        <span class="tank-card__name">${t.name}</span>
        <span class="tank-card__trait">${owned ? t.trait : tankRequirementText(t)}</span>
        ${owned ? (t.id === equipped ? '<span class="tank-card__lock">已装备</span>' : '') : `<span class="tank-card__lock">▣ ${t.cost} 核心</span>`}
      </button>`;
    }).join('');
    U.tankGrid.querySelectorAll('canvas[data-tank-preview]').forEach(cv => drawTankPreview(cv, TANKS.find(t => t.id === cv.dataset.tankPreview)));
    const tank = TANKS.find(t => t.id === selected) || TANKS[0];
    const owned = tankOwned(tank.id, profile);
    if (U.tankDetail) {
      U.tankDetail.innerHTML = `<strong>${tank.name}</strong><b>${tank.trait}</b>${owned ? '' : `<em>${tankRequirementText(tank)} · ${tank.cost} 核心</em>`}`;
    }
    if (U.tankCores) U.tankCores.textContent = `合金核心 ${profile.cores}`;
    if (U.tankUnlockBtn) {
      U.tankUnlockBtn.classList.toggle('is-hidden', owned);
      const strong = U.tankUnlockBtn.querySelector('strong');
      const small = U.tankUnlockBtn.querySelector('small');
      if (!owned) {
        if (strong) strong.textContent = `兑换 ${tank.cost}`;
        if (small) small.textContent = profile.cores >= tank.cost ? 'UNLOCK CHASSIS' : `还差 ${tank.cost - profile.cores} 核心`;
        U.tankUnlockBtn.disabled = profile.cores < tank.cost;
      }
    }
    if (U.tankSlotLabel) U.tankSlotLabel.textContent = `P${G.tankPickerSlot + 1}`;
    updateTankCount();
  }

  function equipTankToSlot(id) {
    const tank = TANKS.find(t => t.id === id);
    if (!tank || !tankOwned(tank.id)) return false;
    const slot = G.tankPickerSlot === 1 ? 1 : 0;
    G.tankIds[slot] = tank.id;
    if (slot === 0) { G.tankId = tank.id; G.tank = tank; }
    writeTankIds(G.tankIds);
    updatePilotCard(slot);
    updateStageRoster();
    if (G.tank && !G.twoPlayer) {
      if (U.visualUnit) U.visualUnit.textContent = `${G.tank.name} «${G.tank.en}»`;
      if (U.visualUnitSub) U.visualUnitSub.textContent = `MODULAR SIEGE PLATFORM / ${MAPS[G.arenaIndex].sector}`;
    }
    menuCache = null;
    menuParticles = [];
    return true;
  }

  function selectTank(id) {
    const tank = TANKS.find(t => t.id === id);
    if (!tank) return;
    G.tankViewId = tank.id;
    if (!tankOwned(tank.id)) {
      renderTankGrid();
      return;
    }
    equipTankToSlot(tank.id);
    if (U.tankGrid && U.tankScreen && !U.tankScreen.classList.contains('hidden')) renderTankGrid();
  }

  function openStageScreen() {
    const camp = G.campaign || readCampaign();
    G.campaign = camp;
    G.endlessSelected = false;
    G.arenaIndex = Math.max(0, Math.min(camp.unlocked - 1, MAPS.length - 1));
    G.difficulty = stageDifficulty(camp, G.arenaIndex);
    renderStagePicker();
    updateDifficultyUI();
    syncMenuSelection();
    U.stageScreen.classList.remove('hidden');
    AUDIO.init(); AUDIO.tick();
  }
  function closeStageScreen() { U.stageScreen.classList.add('hidden'); }
  function openTankScreen(slot) {
    G.tankPickerSlot = slot === 1 ? 1 : 0;
    G.tankViewId = G.tankIds[G.tankPickerSlot] || TANKS[0].id;
    renderTankGrid();
    U.tankScreen.classList.remove('hidden');
    AUDIO.init(); AUDIO.tick();
  }
  function closeTankScreen() { U.tankScreen.classList.add('hidden'); }
  function openFusionScreen() {
    if (U.fusionGrid) {
      U.fusionGrid.innerHTML = Object.values(FUSIONS).map(f => {
        const w = WEAPONS[f.weapon], p = PASSIVES[f.passive];
        // The UI uses four visible tiers (pips); legacy level numbers are only
        // used internally for stat scaling and should not leak into fusion cards.
        const wTier = Math.max(1, WEAPON_TIER_LEVEL.indexOf(f.weaponLevel));
        const pTier = Math.max(1, PASSIVE_TIER_LEVEL.indexOf(f.passiveLevel));
        return `<article class="fusion-card">
          <div class="fusion-card__part"><small>武器</small><strong>${w.name} 第 ${wTier} 阶</strong></div>
          <div class="fusion-card__plus">+</div>
          <div class="fusion-card__part"><small>被动</small><strong>${p.name} 第 ${pTier} 阶</strong></div>
          <div class="fusion-card__result"><strong>${f.name}</strong><span>${f.desc}</span></div>
        </article>`;
      }).join('');
    }
    const fromPause = G.mode === 'paused';
    if (U.fusionDoneLabel) U.fusionDoneLabel.textContent = fromPause ? '返回战场' : '返回机库';
    U.fusionScreen.classList.remove('hidden');
    AUDIO.init(); AUDIO.tick();
  }
  function closeFusionScreen() { U.fusionScreen.classList.add('hidden'); }

  function readRecords() {
    try {
      const r = JSON.parse(localStorage.getItem('bf.records') || '{}');
      return { bestTime: Number(r.bestTime) || 0, bestLevel: Number(r.bestLevel) || 0, wins: Number(r.wins) || 0 };
    } catch (e) { return { bestTime: 0, bestLevel: 0, wins: 0 }; }
  }
  function writeRecords(r) {
    try { localStorage.setItem('bf.records', JSON.stringify(r)); } catch (e) {}
  }
  function updateBestStats() {
    const r = readRecords();
    if (U.bestTime) U.bestTime.textContent = r.bestTime > 0 ? fmtShort(r.bestTime) : '--:--';
    if (U.bestLevel) U.bestLevel.textContent = `等级 ${Math.max(1, r.bestLevel)}`;
    if (U.bestWins) U.bestWins.textContent = String(r.wins);
    if (U.sfBestTime) U.sfBestTime.textContent = r.bestTime > 0 ? fmtShort(r.bestTime) : '--:--';
    if (U.sfBestLevel) U.sfBestLevel.textContent = `等级 ${Math.max(1, r.bestLevel)}`;
    if (U.sfBestWins) U.sfBestWins.textContent = String(r.wins);
  }

  function endRun(win, reason) {
    if (G.mode !== 'playing') return;
    G.mode = 'result';
    G.deadReason = reason || '';
    AUDIO.stopMusic();
    const progress = clamp(G.elapsed / Math.max(1, G.bossAt || BOSS_AT) * 100, 0, 100);
    const records = readRecords();
    records.bestTime = Math.max(records.bestTime, Math.floor(G.elapsed));
    records.bestLevel = Math.max(records.bestLevel, G.level);
    if (win) records.wins += 1;
    writeRecords(records);
    updateBestStats();
    G.nextStageIndex = -1;
    if (win) {
      const camp = readCampaign();
      camp.cleared[G.arenaIndex] = true;
      camp.unlocked = Math.max(camp.unlocked, Math.min(MAPS.length, G.arenaIndex + 2));
      writeCampaign(camp);
      G.campaign = camp;
      renderStagePicker();
      if (G.arenaIndex < MAPS.length - 1) G.nextStageIndex = G.arenaIndex + 1;
    }
    recordRunProgress(win);
    const items = [];
    for (const id of Object.keys(G.weapons)) if (WEAPONS[id]) {
      const name = G.fusions[id] && FUSIONS[id] ? FUSIONS[id].name : WEAPONS[id].short;
      items.push(`<span${G.fusions[id] ? ' class="is-fused"' : ''}><i></i>${name} 等级${G.weapons[id]}</span>`);
    }
    for (const id of Object.keys(G.passives)) if (PASSIVES[id]) items.push(`<span><i></i>${PASSIVES[id].short} 等级${G.passives[id]}</span>`);
    U.resultBuild.innerHTML = items.join('');
    U.resultTime.textContent = fmtShort(G.elapsed);
    U.resultLevel.textContent = `等级 ${G.level}`;
    U.resultKills.textContent = String(G.kills).padStart(3, '0');
    U.resultCore.textContent = G.endless ? `${G.endlessBossKills} 个首领` : `${Math.floor(progress)}%`;
    if (U.resultCoreLabel) U.resultCoreLabel.textContent = G.endless ? '击破首领' : '生存进度';
    U.resultSeal.classList.toggle('is-win', win);
    U.resultSeal.querySelector('b').textContent = win ? '胜' : '败';
    U.resultTag.classList.toggle('is-win', win);
    const stageNo = String(G.arenaIndex + 1).padStart(2, '0');
    if (G.endless) {
      const baseLost = reason === 'base';
      U.resultTag.textContent = '无尽协议 · 生存终止';
      U.resultTitle.textContent = baseLost ? '防线归零' : '钢铁归零';
      U.resultFlavor.textContent = `无尽协议中断 · ${MAPS[G.arenaIndex].name} · 生存 ${fmtShort(G.elapsed)} · 击破 ${G.endlessBossKills} 个首领。`;
      AUDIO.gameOver();
    } else if (win) {
      const finalWin = G.arenaIndex >= MAPS.length - 1;
      U.resultTag.textContent = finalWin ? '战役完成' : `第 ${stageNo} 关突破`;
      U.resultTitle.textContent = finalWin ? '穹顶陷落' : '黎明抵达';
      U.resultFlavor.textContent = finalWin ? '最后一道钢铁潮汐退去。整条战役线已经打通。' : `第 ${stageNo} 关已清理。下一关的入口正在开启。`;
      U.resultCore.textContent = '100%';
      AUDIO.victory();
    } else {
      const baseLost = reason === 'base';
      U.resultTag.textContent = baseLost ? '任务失败 · 基地失守' : '任务失败 · 车体击毁';
      U.resultTitle.textContent = baseLost ? '防线归零' : '钢铁归零';
      U.resultFlavor.textContent = baseLost
        ? `第 ${stageNo} 关基地装甲归零，防线被撕开。优先清理拆墙单位和远程火力。`
        : `第 ${stageNo} 关未能突破。调整坦克与协议，再试一次。`;
      AUDIO.gameOver();
    }
    const resultDiff = difficultyData(G.difficulty);
    if (G.lastCoreReward) U.resultFlavor.textContent += ` · ${resultDiff.name} · 合金核心 +${G.lastCoreReward}`;
    if (U.nextBtn) {
      U.nextBtn.classList.toggle('is-hidden', !(win && G.nextStageIndex >= 0));
      const next = U.nextBtn.querySelector('strong');
      if (next) next.textContent = G.nextStageIndex >= 0 ? `下一关 · ${MAPS[G.nextStageIndex].name}` : '下一关';
    }
    U.bossHud.classList.add('is-hidden');
    U.levelupScreen.classList.add('hidden');
    U.pauseScreen.classList.add('hidden');
    // 失败时先让死亡爆炸和战场停顿 3 秒，再显示继续/选关菜单；
    // 胜利结算保持原来的短停顿。
    const revealDelay = win ? 520 : 3000;
    setTimeout(() => {
      if (G.mode === 'result') {
        U.resultScreen.classList.remove('hidden');
        G.lastFrame = performance.now();
      }
    }, revealDelay);
  }

  function returnToMenu() {
    G.mode = 'menu';
    AUDIO.stopMusic();
    AUDIO.startMenuMusic();
    AUDIO.setIntensity(0);
    U.gameLayout.classList.add('is-hidden');
    U.gameLayout.setAttribute('aria-hidden', 'true');
    U.menuScreen.classList.remove('hidden');
    U.levelupScreen.classList.add('hidden');
    U.pauseScreen.classList.add('hidden');
    U.resultScreen.classList.add('hidden');
    U.howScreen.classList.add('hidden');
    if (U.codexScreen) U.codexScreen.classList.add('hidden');
    if (U.saveScreen) U.saveScreen.classList.add('hidden');
    U.bossHud.classList.add('is-hidden');
    Input.keys.clear();
    Input.dashQueued = false; Input.dashQueued2 = false;
    menuCache = null;
    G.campaign = readCampaign();
    renderStagePicker();
    selectArena(Math.min(G.arenaIndex, G.campaign.unlocked - 1));
    G.profile = syncTankUnlocks(readProfile());
    G.tankIds = readTankIds();
    G.tankId = G.tankIds[0];
    G.tank = TANKS.find(t => t.id === G.tankId) || TANKS[0];
    updatePilotCard(0); updatePilotCard(1);
    updateTankCount();
    selectCoop(G.lastCoop);
    updateBestStats();
  }

  function syncSettingsUI() {
    const sfx = Math.round(AUDIO.sfxVolume * 100);
    const bgm = Math.round(AUDIO.bgmVolume * 100);
    if (U.sfxVolume) U.sfxVolume.value = String(sfx);
    if (U.bgmVolume) U.bgmVolume.value = String(bgm);
    if (U.sfxVolumeValue) U.sfxVolumeValue.textContent = `${sfx}%`;
    if (U.bgmVolumeValue) U.bgmVolumeValue.textContent = `${bgm}%`;
    syncFullscreenUI();
  }
  function syncFullscreenUI() {
    const on = !!document.fullscreenElement;
    if (U.settingsFullscreen) {
      U.settingsFullscreen.classList.toggle('is-on', on);
      U.settingsFullscreen.setAttribute('aria-pressed', on ? 'true' : 'false');
      const span = U.settingsFullscreen.querySelector('span');
      if (span) span.textContent = on ? '开启' : '关闭';
    }
  }
  function openSettings() {
    if (!U.settingsScreen) return;
    if (U.settingsDoneLabel) U.settingsDoneLabel.textContent = G.mode === 'paused' ? '返回战场' : '返回机库';
    syncSettingsUI();
    U.settingsScreen.classList.remove('hidden');
    setSettingsFocus(0);
    AUDIO.init(); AUDIO.tick();
  }
  function closeSettings() {
    if (U.settingsScreen) U.settingsScreen.classList.add('hidden');
    clearSettingsFocus();
    clearPadFocus();
    AUDIO.tick();
  }

  function pauseGame() {
    if (G.mode !== 'playing') return;
    G.mode = 'paused';
    Input.keys.clear();
    Input.dashQueued = false; Input.dashQueued2 = false;
    U.pauseScreen.classList.remove('hidden');
    AUDIO.tick();
  }
  function resumeGame() {
    if (G.mode !== 'paused') return;
    G.mode = 'playing';
    U.pauseScreen.classList.add('hidden');
    G.lastFrame = performance.now();
    AUDIO.tick();
  }

  function toggleMute() {
    AUDIO.init();
    const muted = AUDIO.toggleMute();
    syncSoundButtons();
    return muted;
  }
  function syncSoundButtons() {
    [U.soundBtn, U.soundBtnMenu].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('is-muted', AUDIO.muted);
      btn.setAttribute('aria-label', AUDIO.muted ? '开启声音' : '关闭声音');
      btn.title = AUDIO.muted ? '开启声音 (M)' : '关闭声音 (M)';
    });
  }
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }

  function isTouchUI() {
    try { return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0; } catch (e) { return false; }
  }

  function selectCoop(coop) {
    G.coopSelected = !!coop;
    if (U.modeCards) U.modeCards.forEach(card => {
      const on = (card.dataset.coop === '1') === G.coopSelected;
      card.classList.toggle('is-active', on);
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (U.modeHint) U.modeHint.textContent = G.coopSelected
      ? (isTouchUI() ? '手机双人建议外接手柄 · 两台机型分别选择 · 各自升级' : 'P1 键鼠 · P2 Xbox 手柄 / 方向键 · 各自升级 · 模块上限2级')
      : (isTouchUI() ? '触屏摇杆移动 · 自动索敌 · 单兵生存' : 'P1 键鼠 · 自动索敌 · 单兵生存');
    if (U.tankPickerBtn2) U.tankPickerBtn2.classList.toggle('is-hidden', !G.coopSelected);
    updatePilotCard(0);
    updatePilotCard(1);
    updateStageRoster();
    if (U.startBtnLabel) U.startBtnLabel.textContent = G.endlessSelected ? (G.coopSelected ? '双人无尽' : '无尽出击') : (G.coopSelected ? '双人出击' : '点火出击');
    if (U.startBtnSub) U.startBtnSub.textContent = G.endlessSelected ? (G.coopSelected ? 'CO-OP ENDLESS / LINK TWO PILOTS' : 'ENDLESS PROTOCOL') : (G.coopSelected ? 'LINK TWO PILOTS / CO-OP' : 'ENTER THE SECTOR');
    syncMenuSelection();
  }

  function updateDifficultyUI() {
    const diff = difficultyData(G.difficulty);
    if (U.stageDifficulty) U.stageDifficulty.textContent = G.endlessSelected ? '无尽' : diff.name;
    if (U.difficultyHint) U.difficultyHint.textContent = `${diff.name}：${diff.desc}`;
    if (U.difficultyOptions) {
      U.difficultyOptions.querySelectorAll('.difficulty-card').forEach(btn => {
        const on = btn.dataset.difficulty === diff.id;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
  }

  function selectArena(index) {
    const camp = G.campaign || readCampaign();
    G.endlessSelected = false;
    index = clamp(index | 0, 0, Math.min(MAPS.length - 1, camp.unlocked - 1));
    G.arenaIndex = index;
    G.arena = MAPS[index];
    loadStageArt(G.arena.id);
    G.difficulty = stageDifficulty(camp, index);
    U.arenaCards.forEach(card => {
      const active = card.dataset.endless !== '1' && parseInt(card.dataset.arena, 10) === index;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const diff = difficultyData(G.difficulty);
    if (U.stageHint) {
      const cleared = camp.cleared[index] ? ' · 已突破' : '';
      U.stageHint.textContent = `第 ${index + 1} 区 · ${diff.name} · ${MAPS[index].desc}${cleared} · 通关解锁下一关`;
    }
    if (U.stageIndex) U.stageIndex.textContent = String(index + 1).padStart(2, '0');
    if (U.stageName) U.stageName.textContent = MAPS[index].name;
    if (U.stageMeta) U.stageMeta.textContent = `第 ${index + 1} 区 · ${MAPS[index].name}`;
    if (U.stageTrait) U.stageTrait.textContent = `${MAPS[index].desc}${camp.cleared[index] ? ' · 已突破' : ''}`;
    updateDifficultyUI();
    const frame = document.querySelector('.visual-frame');
    if (frame) {
      frame.style.borderColor = hexA(MAPS[index].palette.accent, .27);
      frame.style.boxShadow = `0 0 0 1px rgba(0,0,0,.5), 0 0 70px ${hexA(MAPS[index].palette.accent, .12)}`;
    }
    if (U.visualUnitSub) U.visualUnitSub.textContent = `MODULAR SIEGE PLATFORM / ${MAPS[index].sector}`;
    if (U.startBtnLabel) U.startBtnLabel.textContent = G.coopSelected ? '双人出击' : '点火出击';
    if (U.startBtnSub) U.startBtnSub.textContent = G.coopSelected ? 'LINK TWO PILOTS / CO-OP' : 'ENTER THE SECTOR';
    syncMenuSelection();
    menuCache = null;
    menuParticles = [];
  }

  function selectEndless() {
    const camp = G.campaign || readCampaign();
    if (!(camp.cleared[1] || camp.unlocked >= 3)) return;
    G.endlessSelected = true;
    const index = clamp(G.arenaIndex | 0, 0, Math.min(MAPS.length - 1, camp.unlocked - 1));
    G.arenaIndex = index;
    G.arena = MAPS[index];
    loadStageArt(G.arena.id);
    G.difficulty = stageDifficulty(camp, index);
    U.arenaCards.forEach(card => {
      const active = card.dataset.endless === '1';
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (U.stageHint) U.stageHint.textContent = `无尽协议 · ${MAPS[index].name} · 敌军持续升级 / Boss 循环刷新 / 生存时间计分`;
    if (U.stageIndex) U.stageIndex.textContent = '∞';
    if (U.stageName) U.stageName.textContent = '无尽协议';
    if (U.stageMeta) U.stageMeta.textContent = `无尽协议 · ${MAPS[index].name}`;
    if (U.stageTrait) U.stageTrait.textContent = '持续波次 · 循环首领 · 生存计分';
    updateDifficultyUI();
    if (U.stageDifficulty) U.stageDifficulty.textContent = '无尽';
    const frame = document.querySelector('.visual-frame');
    if (frame) {
      frame.style.borderColor = hexA(MAPS[index].palette.accent, .27);
      frame.style.boxShadow = `0 0 0 1px rgba(0,0,0,.5), 0 0 70px ${hexA(MAPS[index].palette.accent, .12)}`;
    }
    if (U.visualUnitSub) U.visualUnitSub.textContent = `MODULAR SIEGE PLATFORM / ENDLESS`;
    if (U.startBtnLabel) U.startBtnLabel.textContent = G.coopSelected ? '双人无尽' : '无尽出击';
    if (U.startBtnSub) U.startBtnSub.textContent = G.coopSelected ? 'CO-OP ENDLESS / LINK TWO PILOTS' : 'ENDLESS PROTOCOL';
    syncMenuSelection();
    menuCache = null;
    menuParticles = [];
  }

  function codexEntries() {
    const normalKeys = [
      'scout', 'grunt', 'heavy', 'bomber', 'sniper',
      'mortar', 'bulwark', 'minelayer', 'splitter', 'scrap',
      'drone', 'strafer', 'skybomber', 'gunship',
      'saucer', 'beamfrigate', 'warper', 'warden'
    ];
    const normal = normalKeys.map(key => {
      const cfg = ENEMIES[key];
      return { key, type: key, name: cfg.name, en: cfg.en, desc: cfg.codex, colors: cfg, cls: 'normal', domain: cfg.domain || 'ground', size: cfg.size || 1 };
    });
    const elite = [{ key: 'elite', type: 'elite', name: ENEMIES.elite.name, en: ENEMIES.elite.en, desc: ENEMIES.elite.codex, colors: ENEMIES.elite, cls: 'elite' }];
    for (const tank of TANKS) {
      if (tank.id === TANKS[0].id) continue;
      elite.push({
        key: `seal:${tank.id}`, type: 'elite', name: `${tank.name} · 封印守卫`, en: `SEAL GUARD // ${tank.en}`,
        desc: `击破 ${tank.sealStage + 1} 号星区封印核心后苏醒的精英守卫。${tank.trait || ''}`,
        colors: { body: tank.colors.body, light: tank.colors.light, dark: tank.colors.dark, core: tank.colors.core },
        cls: 'elite', tank
      });
    }
    const bossKeys = Object.keys(ENEMIES).filter(key => ENEMIES[key].boss);
    const boss = bossKeys.map(key => {
      const cfg = ENEMIES[key];
      return {
        key, type: 'boss', name: cfg.name, en: cfg.en, desc: cfg.codex,
        colors: cfg, cls: 'boss', domain: cfg.domain || 'ground', size: cfg.bossScale || 1.5,
        bossKind: cfg.bossKind
      };
    });
    return { normal, elite, boss };
  }

  function drawCodexPreview(canvas, entry) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const c = entry.colors || {};
    const locked = !G.codexPreviewAll && !readCodex().includes(entry.key);
    const colors = locked
      ? { body: '#1b2721', light: '#354740', dark: '#0b110e', core: '#5c746a' }
      : { body: c.body || c.color || '#555', light: c.light || '#ccc', dark: c.dark || '#222', core: c.core || c.coreColor || '#5ff0ce' };
    const isBoss = entry.cls === 'boss';
    const scale = isBoss ? 2.9 : entry.cls === 'elite' ? 2.25 : 1.95;
    const sealTank = entry.tank || null;
    const sealHull = sealTank ? tankArtImage(sealTank.id, 'hull') : null;
    const sealTurret = sealTank ? tankArtImage(sealTank.id, 'turret') : null;
    if (sealHull && sealTurret) {
      const size = 84;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = locked ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.32)';
      ctx.beginPath(); ctx.ellipse(w / 2 + 2, h / 2 + 15, 28, 9, 0, 0, TAU); ctx.fill();
      if (locked) ctx.filter = 'grayscale(1) brightness(.3) saturate(.35)';
      if (!locked) {
        ctx.strokeStyle = hexA(colors.core, .28);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 43, 0, TAU); ctx.stroke();
      }
      ctx.drawImage(sealHull, (w - size) / 2, (h - size) / 2, size, size);
      ctx.drawImage(sealTurret, (w - size) / 2, (h - size) / 2, size, size);
      ctx.restore();
      return;
    }
    const artKey = entry.key === 'boss' ? 'boss' : {
      scout: 'enemyScout', grunt: 'enemyGrunt', heavy: 'enemyHeavy', bomber: 'enemyBomber',
      sniper: 'enemySniper', elite: 'enemyElite', mortar: 'enemyMortar', bulwark: 'enemyBulwark',
      minelayer: 'enemyMinelayer', splitter: 'enemySplitter', scrap: 'enemyScrap',
      drone: 'enemyDrone', strafer: 'enemyStrafer', skybomber: 'enemySkybomber', gunship: 'enemyGunship',
      saucer: 'enemySaucer', beamfrigate: 'enemyBeamfrigate', warper: 'enemyWarper', warden: 'enemyWarden'
    }[entry.key];
    const codexArt = !locked && artKey ? artImage(artKey) : null;
    if (codexArt) {
      const size = isBoss ? 104 : 76;
      ctx.drawImage(codexArt, (w - size) / 2, (h - size) / 2, size, size);
    } else {
      ctx.save();
      ctx.translate(w / 2, h / 2 + 4);
      if (isBoss) {
      const fake = {
        id: entry.key.length + 7, bossKind: entry.bossKind, bossScale: entry.size || 1.5,
        hitFlash: 0, color: colors.body, light: colors.light, dark: colors.dark, coreColor: colors.core
      };
      ctx.scale(.92, .92);
      drawBossBody(ctx, fake, performance.now() / 1000);
    } else if (entry.domain === 'air' || entry.domain === 'hover') {
      const fake = {
        id: entry.key.length, type: entry.type, x: 0, y: 0, size: (entry.size || 1) * scale * .72,
        bodyAngle: -Math.PI / 2, orbitDir: 1, hitFlash: 0,
        color: colors.body, light: colors.light, dark: colors.dark, coreColor: colors.core
      };
      if (entry.domain === 'air') drawAirEnemy(fake, performance.now() / 1000, ctx);
      else drawXenoEnemy(fake, performance.now() / 1000, ctx);
    } else {
      drawTankAt(ctx, 0, 0, -Math.PI / 2, -Math.PI / 2, colors, scale, .35, {
        recoil: 0, heavy: isBoss || entry.type === 'heavy', elite: entry.cls === 'elite' || isBoss,
        twin: isBoss || entry.cls === 'elite', bomber: entry.type === 'bomber', enemyType: entry.type,
        barrelLen: entry.type === 'sniper' ? 23 : entry.cls === 'elite' ? 20 : 16,
        barrelWide: entry.type === 'heavy' || entry.cls === 'elite' || isBoss
      });
    }
      ctx.restore();
    }
    if (isBoss) {
      ctx.save();
      ctx.fillStyle = locked ? 'rgba(92,116,106,.4)' : 'rgba(255,79,88,.08)';
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 24, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function renderCodex() {
    if (!U.codexGrid) return;
    const entries = codexEntries();
    const seen = new Set(readCodex());
    const previewAll = !!G.codexPreviewAll;
    const all = entries.normal.concat(entries.elite, entries.boss);
    const total = all.length;
    const found = previewAll ? total : all.filter(e => seen.has(e.key)).length;
    if (U.codexProgress) U.codexProgress.textContent = `已记录 ${found} / ${total}`;
    const section = (title, list) => {
      const n = previewAll ? list.length : list.filter(e => seen.has(e.key)).length;
      const cards = list.map(e => {
        const known = previewAll || seen.has(e.key);
        return `<article class="codex-card is-${e.cls}${known ? '' : ' is-locked'}">
          <canvas width="200" height="116" data-codex-key="${e.key}"></canvas>
          <strong class="codex-card__name">${known ? e.name : '???'}</strong>
          <span class="codex-card__desc">${known ? e.desc : '尚未遭遇。进入战区并让它出现在你的雷达上。'}</span>
        </article>`;
      }).join('');
      return `<section class="codex-section"><div class="codex-section__head"><span>${title}</span><b>${n} / ${list.length}</b></div><div class="codex-cards">${cards}</div></section>`;
    };
    U.codexGrid.innerHTML = section('普通单位', entries.normal)
      + section('精英单位', entries.elite)
      + section('首领单位', entries.boss);
    const byKey = new Map(all.map(e => [e.key, e]));
    U.codexGrid.querySelectorAll('canvas[data-codex-key]').forEach(cv => {
      drawCodexPreview(cv, byKey.get(cv.dataset.codexKey));
    });
  }

  function openCodexScreen() {
    renderCodex();
    U.codexScreen.classList.remove('hidden');
    AUDIO.init(); AUDIO.tick();
  }
  function closeCodexScreen() { U.codexScreen.classList.add('hidden'); }

  function initArtMode() {
    const params = new URLSearchParams(location.search);
    if (params.get('aiart') !== '1' && params.get('art') !== '1') return;
    document.body.classList.add('ai-art');
    if (U.artBtn) U.artBtn.classList.remove('is-hidden');
    if (params.get('art') === '1') setTimeout(openArtScreen, 350);
  }

  function openArtScreen() {
    if (!U.artScreen) return;
    U.artScreen.classList.remove('hidden');
    AUDIO.init(); AUDIO.tick();
  }
  function closeArtScreen() {
    if (U.artScreen) U.artScreen.classList.add('hidden');
  }

  function renderItemGuide() {
    if (!U.itemGrid) return;
    U.itemGrid.innerHTML = Object.entries(ITEMS).map(([id, item]) => {
      const baseItem = id === 'basekit' || id === 'turret' || id === 'fortify';
      return `<article class="item-guide-card" style="--item-color:${item.color}">
        <span class="item-guide-card__tag">${baseItem ? '基地' : '战地'}</span>
        <div class="item-guide-card__head">
          <span class="item-guide-card__glyph">${item.glyph || '◇'}</span>
          <div class="item-guide-card__title"><strong>${item.name}</strong></div>
        </div>
        <div class="item-guide-card__desc">${item.desc}</div>
        <div class="item-guide-card__detail">${item.detail || ''}</div>
      </article>`;
    }).join('');
  }

  function openItemGuide() {
    renderItemGuide();
    U.itemScreen.classList.remove('hidden');
    AUDIO.init(); AUDIO.tick();
  }
  function closeItemGuide() { U.itemScreen.classList.add('hidden'); }

  const SAVE_KEYS = ['bf.campaign', 'bf.hangar', 'bf.tanks', 'bf.tank', 'bf.records', 'bf.codex'];

  function makeSaveText() {
    const data = {};
    for (const key of SAVE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw == null) continue;
      try { data[key] = JSON.parse(raw); } catch (e) { data[key] = raw; }
    }
    return JSON.stringify({
      format: 'brickfire-save', version: 1, game: 'brickfire-survivors',
      exportedAt: new Date().toISOString(), data
    }, null, 2);
  }

  function setSaveStatus(text, kind) {
    if (!U.saveStatus) return;
    U.saveStatus.textContent = text;
    U.saveStatus.classList.toggle('is-ok', kind === 'ok');
    U.saveStatus.classList.toggle('is-bad', kind === 'bad');
  }

  function fillSaveText() {
    if (!U.saveText) return;
    U.saveText.value = makeSaveText();
    setSaveStatus('已生成当前存档，可复制或下载。', 'ok');
  }

  function openSaveScreen() {
    fillSaveText();
    U.saveScreen.classList.remove('hidden');
    AUDIO.init(); AUDIO.tick();
  }
  function closeSaveScreen() { U.saveScreen.classList.add('hidden'); }

  function downloadSave() {
    if (!U.saveText) return;
    U.saveText.value = makeSaveText();
    const blob = new Blob([U.saveText.value], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `brickfire-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setSaveStatus('存档文件已下载。', 'ok');
  }

  async function copySave() {
    if (!U.saveText) return;
    U.saveText.value = makeSaveText();
    try {
      await navigator.clipboard.writeText(U.saveText.value);
      setSaveStatus('存档 JSON 已复制到剪贴板。', 'ok');
    } catch (e) {
      U.saveText.focus(); U.saveText.select();
      setSaveStatus('无法直接访问剪贴板，已选中文本，按 Ctrl/Cmd+C 复制。', 'bad');
    }
  }

  function importSave() {
    if (!U.saveText) return;
    let parsed;
    try { parsed = JSON.parse(U.saveText.value); } catch (e) { setSaveStatus('JSON 解析失败，请检查文本完整性。', 'bad'); return; }
    const data = parsed && parsed.data ? parsed.data : parsed;
    if (!data || typeof data !== 'object' || Array.isArray(data)) { setSaveStatus('不是有效的钢铁余烬存档。', 'bad'); return; }
    const keys = Object.keys(data).filter(k => SAVE_KEYS.includes(k));
    if (!keys.length) { setSaveStatus('存档中没有可导入的钢铁余烬数据。', 'bad'); return; }
    if (!window.confirm('导入会覆盖当前浏览器里的钢铁余烬存档，是否继续？')) return;
    try {
      // Full restore: keys absent from the archive are cleared too.
      for (const key of SAVE_KEYS) localStorage.removeItem(key);
      for (const key of keys) {
        const value = data[key];
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    } catch (e) {
      setSaveStatus('写入本机存档失败，可能是浏览器禁用了存储。', 'bad');
      return;
    }
    setSaveStatus('导入成功，正在刷新机库…', 'ok');
    setTimeout(() => location.reload(), 450);
  }

  function showHow(fromPause = false) {
    G.helpFromPause = !!fromPause;
    if (U.howStart) {
      const label = U.howStart.querySelector('strong');
      if (label) label.textContent = fromPause ? '返回战场' : '明白了，出击';
    }
    U.howScreen.classList.remove('hidden');
    AUDIO.init(); AUDIO.tick();
  }
  function hideHow() {
    U.howScreen.classList.add('hidden');
    G.helpFromPause = false;
  }
  function handleHowKey(e) {
    if (!U.howScreen || U.howScreen.classList.contains('hidden')) return false;
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      U.howStart.click();
      return true;
    }
    return false;
  }

  function showEliteTutorial() {
    if (document.getElementById('eliteTutorial')) return;
    G.mode = 'eliteTutorial';
    G.accum = 0;
    G.lastFrame = performance.now();
    Input.keys.clear();
    const wrap = document.createElement('div');
    wrap.id = 'eliteTutorial';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:rgba(2,7,5,.82);backdrop-filter:blur(5px);padding:24px;';
    wrap.innerHTML = `
      <div style="width:min(460px,92vw);border:1px solid rgba(255,207,90,.6);background:linear-gradient(160deg,rgba(34,25,10,.98),rgba(5,10,8,.99));box-shadow:0 0 50px rgba(255,170,40,.18);padding:28px;">
        <div style="font:700 11px/1.2 Silkscreen,monospace;letter-spacing:.18em;color:#ffcf5a;margin-bottom:12px;">ELITE PROTOCOL // 首次击破</div>
        <h2 style="margin:0 0 12px;font-size:26px;color:#fff3bd;">精英单位已击破</h2>
        <p style="margin:0 0 10px;color:#e8dfc8;line-height:1.7;font-size:15px;">精英单位必掉一个 <b style="color:#ffcf5a;">战术宝箱</b>。靠近并拾取宝箱，会立即获得一次升级选择。</p>
        <p style="margin:0 0 22px;color:#a9b8aa;line-height:1.6;font-size:13px;">精英每 2–3 分钟出现一次。优先击破它们，是建立构筑的关键。</p>
        <button id="eliteTutorialClose" type="button" style="width:100%;padding:13px 18px;border:1px solid #ffcf5a;background:#ffcf5a;color:#201608;font:700 15px/1 Silkscreen,monospace;cursor:pointer;letter-spacing:.08em;">继续战斗</button>
      </div>`;
    document.body.appendChild(wrap);
    let padWatch = null;
    const close = () => {
      if (!wrap.parentNode) return;
      wrap.parentNode.removeChild(wrap);
      document.removeEventListener('keydown', onKey);
      if (padWatch) clearInterval(padWatch);
      G.mode = 'playing';
      G.accum = 0;
      G.lastFrame = performance.now();
      Input.keys.clear();
      AUDIO.confirm();
    };
    const onKey = (event) => {
      if (event.code === 'Enter' || event.code === 'Space' || event.code === 'Escape') { event.preventDefault(); close(); }
    };
    document.addEventListener('keydown', onKey);
    padWatch = setInterval(() => {
      for (const gp of [Input.gamepad, Input.gamepad2]) {
        if (gp && gp.connected && gp.buttons && gp.buttons[0] && gp.buttons[0].pressed) { close(); break; }
      }
    }, 90);
    wrap.querySelector('#eliteTutorialClose').addEventListener('click', close);
    AUDIO.tick();
  }

  function drawSealTutorialIcon(canvas, seal) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 144 * dpr;
    canvas.height = 126 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 144, 126);
    const tank = TANKS[(seal && seal.tankIndex) || 0] || TANKS[0];
    const c = tank.colors;
    const t = performance.now() / 1000;
    ctx.save();
    ctx.translate(72, 66);
    ctx.scale(2.25, 2.25);
    // Dark background disc.
    ctx.fillStyle = 'rgba(2,8,6,.78)';
    ctx.beginPath(); ctx.arc(0, 0, 42, 0, TAU); ctx.fill();
    // Steel cover hint at the bottom.
    ctx.fillStyle = '#27383d';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 11 - 5, 30, 9, 7);
    ctx.fillStyle = 'rgba(140,190,190,.22)';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 11 - 5, 30, 9, 2);
    // Core glow.
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 36);
    glow.addColorStop(0, hexA(c.core, .3));
    glow.addColorStop(1, hexA(c.core, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 36, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Rune ring.
    ctx.strokeStyle = hexA(c.core, .5);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.lineDashOffset = -t * 16;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    // Orbit shards.
    for (let i = 0; i < 3; i++) {
      const a = t * .72 + i * TAU / 3;
      ctx.save();
      ctx.translate(Math.cos(a) * 25, Math.sin(a) * 16);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = hexA(c.light, .85);
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(3, 3); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Monolith.
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-17, 14); ctx.lineTo(17, 14); ctx.closePath();
    ctx.fillStyle = 'rgba(3,8,6,.96)'; ctx.fill();
    ctx.strokeStyle = hexA(c.core, .9); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-13, 12); ctx.lineTo(0, 12); ctx.closePath();
    ctx.fillStyle = hexA(c.dark, .98); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(13, 12); ctx.lineTo(0, 12); ctx.closePath();
    ctx.fillStyle = hexA(c.core, .18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-8, 8); ctx.lineTo(8, 8); ctx.closePath();
    ctx.fillStyle = 'rgba(3,8,6,.76)'; ctx.fill(); ctx.strokeStyle = hexA(c.light, .7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 1); ctx.lineTo(0, 9); ctx.lineTo(-5, 1); ctx.closePath();
    ctx.fillStyle = hexA(c.core, .95); ctx.fill();
    ctx.fillStyle = 'rgba(3,8,6,.92)'; ctx.font = '12px Silkscreen, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 1);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(4,10,8,.72)'; ctx.fillRect(-19, -34, 38, 3);
    ctx.fillStyle = c.core; ctx.fillRect(-19, -34, 38, 3);
    ctx.restore();
  }

  function showSealTutorial(seal) {
    if (document.getElementById('sealTutorial')) return;
    G.mode = 'sealTutorial';
    G.accum = 0;
    G.lastFrame = performance.now();
    Input.keys.clear();
    const wrap = document.createElement('div');
    wrap.id = 'sealTutorial';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:rgba(2,7,5,.82);backdrop-filter:blur(5px);padding:24px;';
    wrap.innerHTML = `
      <div style="width:min(500px,92vw);border:1px solid rgba(95,240,206,.6);background:linear-gradient(160deg,rgba(8,28,24,.98),rgba(5,10,8,.99));box-shadow:0 0 50px rgba(95,240,206,.15);padding:28px;">
        <div style="font:700 11px/1.2 Silkscreen,monospace;letter-spacing:.18em;color:#5ff0ce;margin-bottom:12px;">SEAL PROTOCOL // 首次攻击</div>
        <div style="display:flex;gap:16px;align-items:center;margin:0 0 18px;padding:12px 14px;border:1px solid rgba(95,240,206,.22);background:rgba(2,9,7,.55);">
          <canvas id="sealTutorialIcon" width="144" height="126" aria-label="封印核心图标" style="flex:0 0 144px;width:144px;height:126px;image-rendering:pixelated;"></canvas>
          <div style="min-width:0;">
            <strong style="display:block;color:#d8fff3;font-size:17px;margin-bottom:5px;">这就是封印核心</strong>
            <span style="display:block;color:#a9c6b8;font-size:12px;line-height:1.65;">地图上半区的黑色三角塔<br>外层有旋转的青色符环<br>通常躲在一段钢墙后面</span>
          </div>
        </div>
        <h2 style="margin:0 0 12px;font-size:26px;color:#d8fff3;">封印核心会反击</h2>
        <p style="margin:0 0 10px;color:#d8e8df;line-height:1.7;font-size:15px;">攻击封印会立刻触发 <b style="color:#5ff0ce;">守军增援</b>，持续攻击还会不断召唤小兵。</p>
        <p style="margin:0 0 10px;color:#d8e8df;line-height:1.7;font-size:15px;">击破封印后，<b style="color:#ffcf5a;">封印守卫</b>会苏醒；击败守卫可以解锁它的底盘。</p>
        <p style="margin:0 0 22px;color:#a9b8aa;line-height:1.6;font-size:13px;">封印位于地图左上或右上角落，需要主动靠近。前期不必急着打。</p>
        <button id="sealTutorialClose" type="button" style="width:100%;padding:13px 18px;border:1px solid #5ff0ce;background:#5ff0ce;color:#05201a;font:700 15px/1 Silkscreen,monospace;cursor:pointer;letter-spacing:.08em;">知道了，继续</button>
      </div>`;
    document.body.appendChild(wrap);
    drawSealTutorialIcon(wrap.querySelector('#sealTutorialIcon'), seal);
    let padWatch = null;
    const close = () => {
      if (!wrap.parentNode) return;
      wrap.parentNode.removeChild(wrap);
      document.removeEventListener('keydown', onKey);
      if (padWatch) clearInterval(padWatch);
      G.mode = 'playing';
      G.accum = 0;
      G.lastFrame = performance.now();
      Input.keys.clear();
      AUDIO.confirm();
    };
    const onKey = (event) => {
      if (event.code === 'Enter' || event.code === 'Space' || event.code === 'Escape') { event.preventDefault(); close(); }
    };
    document.addEventListener('keydown', onKey);
    padWatch = setInterval(() => {
      for (const gp of [Input.gamepad, Input.gamepad2]) {
        if (gp && gp.connected && gp.buttons && gp.buttons[0] && gp.buttons[0].pressed) { close(); break; }
      }
    }, 90);
    wrap.querySelector('#sealTutorialClose').addEventListener('click', close);
    AUDIO.tick();
  }

  function renderItemTutorial() {
    if (!U.itemTutorialGrid) return;
    const baseIds = new Set(['basekit', 'turret', 'fortify']);
    U.itemTutorialGrid.innerHTML = Object.entries(ITEMS).map(([id, item]) => `
      <article class="item-tutorial__card${baseIds.has(id) ? ' is-base' : ''}" style="--item-color:${item.color}">
        <header>
          <span class="item-tutorial__glyph">${item.glyph || '◇'}</span>
          <div class="item-tutorial__title"><strong>${item.name}</strong><small>${item.en}</small></div>
          <span class="item-tutorial__tag">${baseIds.has(id) ? '基地' : '战地'}</span>
        </header>
        <p class="item-tutorial__desc">${item.desc}</p>
        <small class="item-tutorial__detail">${item.detail || ''}</small>
      </article>`).join('');
  }

  function openItemTutorial() {
    if (!U.itemTutorialScreen || G.itemTutorialSeen || !G.itemTutorialQueued) return;
    if (G.mode !== 'playing') return;
    G.itemTutorialQueued = false;
    G.itemTutorialSeen = true;
    try { localStorage.setItem('bf.itemTutorial', '1'); } catch (_) {}
    renderItemTutorial();
    G.mode = 'itemTutorial';
    G.accum = 0;
    G.lastFrame = performance.now();
    Input.keys.clear();
    Input.dashQueued = false; Input.dashQueued2 = false;
    U.itemTutorialScreen.classList.remove('hidden');
    U.itemTutorialScreen.setAttribute('aria-hidden', 'false');
    clearPadFocus();
    if (Input.gamepad.connected) setPadFocus(U.itemTutorialStart);
    AUDIO.init(); AUDIO.tick();
  }

  function closeItemTutorial() {
    if (G.mode !== 'itemTutorial') return;
    U.itemTutorialScreen.classList.add('hidden');
    U.itemTutorialScreen.setAttribute('aria-hidden', 'true');
    G.mode = 'playing';
    G.accum = 0;
    G.lastFrame = performance.now();
    Input.keys.clear();
    Input.dashQueued = false; Input.dashQueued2 = false;
    clearPadFocus();
    AUDIO.confirm();
  }

  function queueItemTutorial() {
    if (G.itemTutorialSeen || G.itemTutorialQueued || G.mode !== 'playing') return;
    G.itemTutorialQueued = true;
    openItemTutorial();
  }

  function openTutorial() {
    if (!U.tutorialScreen) return;
    G.mode = 'tutorial';
    G.accum = 0;
    G.lastFrame = performance.now();
    Input.keys.clear();
    Input.dashQueued = false; Input.dashQueued2 = false;
    U.tutorialScreen.classList.remove('hidden');
    U.tutorialScreen.setAttribute('aria-hidden', 'false');
    ICONS.applyAll(U.tutorialScreen);
    clearPadFocus();
    if (Input.gamepad.connected) setPadFocus(U.tutorialStart);
    AUDIO.tick();
  }

  function closeTutorial() {
    if (G.mode !== 'tutorial') return;
    U.tutorialScreen.classList.add('hidden');
    U.tutorialScreen.setAttribute('aria-hidden', 'true');
    G.mode = 'playing';
    G.accum = 0;
    G.lastFrame = performance.now();
    Input.keys.clear();
    Input.dashQueued = false; Input.dashQueued2 = false;
    clearPadFocus();
    AUDIO.confirm();
    if (G.tutorialMusicPending) {
      G.tutorialMusicPending = false;
      AUDIO.startMusic(G.arenaIndex, { intro: true });
      AUDIO.setIntensity(0);
    }
  }

  /* ---------------- input / lifecycle ---------------- */
  function cacheUI() {
    const ids = ['app', 'menuScreen', 'menuCanvas', 'padState', 'padHint', 'startBtn', 'howBtn', 'howScreen', 'howClose', 'howStart', 'soundBtnMenu',
      'gameLayout', 'slotCount', 'passiveCount', 'sectorLabel', 'phaseLabel', 'clockLabel', 'clockBar', 'bossMarker', 'topKills', 'soundBtn', 'pauseBtn', 'fullBtn', 'fullBtnMenu',
      'battleFrame', 'gameCanvas', 'toastStack', 'p1Feed', 'p2Feed', 'bossHud', 'bossHpLabel', 'bossHpBar', 'mobileHud', 'mCoreBar', 'mBaseBar', 'mHpBar', 'mLevel', 'levelLabel', 'hpText', 'hpMeter', 'xpText', 'xpMeter',
      'statAtk', 'statSpd', 'statCrit', 'coreState', 'corePercent', 'coreText', 'coreRing', 'corePips', 'loadoutList',
      'coopPanel', 'coopName2', 'coopHp1', 'coopMeter1', 'coopState1', 'coopHp2', 'coopMeter2', 'coopState2', 'coopLv2', 'coopXp2', 'coopXpMeter2', 'coopBuild2', 'deckHint', 'modePicker', 'modeHint', 'startBtnLabel', 'startBtnSub', 'coreNote',
      'killCount', 'comboCount', 'pickupCount', 'threatLabel', 'threatBars', 'sideTip', 'primaryIcon', 'primaryName', 'dashStatus', 'dashMeter', 'dashStatus2', 'dashMeter2', 'recallBtn', 'recallBtn2', 'recallStatus', 'recallStatus2', 'recallMeter', 'recallMeter2', 'mobileRecall',
      'objectiveLabel', 'dangerTint', 'tutorialScreen', 'tutorialStart', 'tutorialClose', 'itemTutorialScreen', 'itemTutorialGrid', 'itemTutorialStart', 'itemTutorialClose', 'levelupScreen', 'newLevel', 'upgradeCards', 'rerollBtn', 'rerollCount', 'levelupOwner', 'levelupPlayers', 'levelupP1', 'levelupP2', 'levelupKeyHint', 'pauseScreen', 'resumeBtn',
      'restartBtn', 'quitBtn', 'pauseSettingsBtn', 'pauseFusionBtn', 'pauseHelpBtn', 'settingsScreen', 'settingsClose', 'settingsDone', 'settingsDoneLabel', 'settingsFullscreen', 'padSwapBtn', 'padAssignment', 'sfxVolume', 'sfxVolumeValue', 'bgmVolume', 'bgmVolumeValue', 'resultScreen', 'resultTag', 'resultTitle', 'resultSeal', 'resultFlavor', 'resultTime', 'resultLevel',
      'resultKills', 'resultCore', 'resultCoreLabel', 'resultBuild', 'nextBtn', 'againBtn', 'backBtn', 'mobileStick', 'mobileDash', 'bestTime', 'bestLevel', 'bestWins', 'sfBestTime', 'sfBestLevel', 'sfBestWins',
      'arenaOptions', 'endlessOptions', 'stageProgress', 'stageHint', 'tankPickerBtn', 'tankPickerBtn2', 'tankCountLabel', 'pilotPreview', 'pilotPreview2', 'pilotName', 'pilotName2', 'pilotRole', 'pilotRole2', 'pilotTrait', 'pilotTrait2', 'pilotHudName',
      'sfStageName', 'sfStageSector', 'sfTankName', 'sfUnitName', 'sfUnitRole', 'sfModeName', 'menuNav',
      'visualUnit', 'visualUnitSub', 'fusionBtn', 'tankScreen', 'tankGrid', 'tankDetail', 'tankClose', 'tankConfirm', 'tankSlotLabel', 'tankCores', 'tankUnlockBtn', 'tankScreenHint', 'fusionScreen', 'fusionGrid', 'fusionClose', 'fusionDone', 'fusionDoneLabel',
      'stageScreen', 'stagePickerBtn', 'stageClose', 'stageConfirm', 'stageFootHint', 'stageTankP1', 'stageTankP2', 'stageTankNameP1', 'stageTankNameP2', 'stageTankRoleP1', 'stageTankRoleP2', 'stageIndex', 'stageName', 'stageMeta', 'stageTrait', 'stageDifficulty', 'difficultyOptions', 'difficultyHint',
      'baseMeter', 'baseHpText', 'baseHpMeter', 'baseTurretNote', 'codexBtn', 'codexScreen', 'codexProgress', 'codexGrid', 'codexClose', 'codexDone', 'itemBtn', 'itemScreen', 'itemGrid', 'itemClose', 'itemDone', 'artBtn', 'artScreen', 'artClose', 'artDone', 'saveBtn', 'saveScreen', 'saveText', 'saveExportBtn', 'saveCopyBtn', 'saveImportBtn', 'saveClose', 'saveDone', 'saveStatus'];
    for (const id of ids) U[id] = document.getElementById(id);
    U.arenaCards = Array.from(U.arenaOptions ? U.arenaOptions.querySelectorAll('.arena-card') : document.querySelectorAll('.arena-card'));
    U.modeCards = Array.from(document.querySelectorAll('.mode-card'));
    U.visualFrame = document.querySelector('.visual-frame');
  }

  function bindUI() {
    const kickMenuAudio = () => {
      AUDIO.init();
      if (G.mode === 'menu') AUDIO.startMenuMusic();
    };
    window.addEventListener('pointerdown', kickMenuAudio, { passive: true });
    window.addEventListener('keydown', kickMenuAudio);
    document.addEventListener('fullscreenchange', syncFullscreenUI);
    window.addEventListener('gamepadconnected', e => {
      adoptPad(e.gamepad);
      syncPadState();
    });
    window.addEventListener('gamepaddisconnected', e => {
      forgetPad(e.gamepad);
      syncPadState();
    });
    U.modeCards.forEach(card => card.addEventListener('click', () => { AUDIO.init(); selectCoop(card.dataset.coop === '1'); AUDIO.tick(); }));
    U.startBtn.addEventListener('click', () => { AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.coopSelected, G.endlessSelected); });
    if (U.menuNav) U.menuNav.querySelectorAll('[data-menu-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        AUDIO.init(); AUDIO.tick();
        const action = btn.dataset.menuAction;
        if (action === 'start') openStageScreen();
        else if (action === 'stage') U.stagePickerBtn.click();
        else if (action === 'tank') U.tankPickerBtn.click();
        else if (action === 'mode') selectCoop(!G.coopSelected);
        else if (action === 'manual') U.itemBtn.click();
        else if (action === 'fusion') U.fusionBtn.click();
        else if (action === 'codex') U.codexBtn.click();
        else if (action === 'save') U.saveBtn.click();
        else if (action === 'settings') openSettings();
      });
    });
    [U.arenaOptions, U.tankGrid, U.itemGrid].forEach(grid => {
      if (!grid) return;
      grid.addEventListener('wheel', e => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || grid.scrollWidth <= grid.clientWidth) return;
        grid.scrollLeft += e.deltaY;
        e.preventDefault();
      }, { passive: false });
    });
    [U.arenaOptions, U.endlessOptions].forEach(grid => {
      if (!grid) return;
      grid.addEventListener('click', e => {
        const endlessCard = e.target.closest('[data-endless]');
        if (endlessCard) {
          if (endlessCard.disabled) return;
          AUDIO.init(); selectEndless(); renderStagePicker(); updateDifficultyUI(); AUDIO.tick();
          return;
        }
        const card = e.target.closest('.arena-card');
        if (!card || card.disabled) return;
        AUDIO.init(); selectArena(parseInt(card.dataset.arena, 10)); renderStagePicker(); updateDifficultyUI(); AUDIO.tick();
      });
    });
    U.stagePickerBtn.addEventListener('click', openStageScreen);
    if (U.stageTankP1) U.stageTankP1.addEventListener('click', () => openTankScreen(0));
    if (U.stageTankP2) U.stageTankP2.addEventListener('click', () => openTankScreen(1));
    if (U.difficultyOptions) U.difficultyOptions.addEventListener('click', e => {
      const btn = e.target.closest('.difficulty-card');
      if (!btn) return;
      const id = btn.dataset.difficulty;
      if (!DIFFICULTIES.some(d => d.id === id)) return;
      G.difficulty = id;
      const camp = G.campaign || readCampaign();
      if (!Array.isArray(camp.difficulties)) camp.difficulties = [];
      camp.difficulties[G.arenaIndex] = id;
      writeCampaign(camp);
      G.campaign = camp;
      renderStagePicker();
      updateDifficultyUI();
      const diff = difficultyData(id);
      if (U.stageHint) U.stageHint.textContent = `第 ${G.arenaIndex + 1} 区 · ${diff.name} · ${MAPS[G.arenaIndex].desc}${camp.cleared[G.arenaIndex] ? ' · 已突破' : ''} · 通关解锁下一关`;
      AUDIO.init(); AUDIO.tick();
    });
    U.stageClose.addEventListener('click', closeStageScreen);
    U.stageConfirm.addEventListener('click', () => {
      closeStageScreen();
      AUDIO.init(); AUDIO.confirm();
      startRun(G.arenaIndex, G.coopSelected, G.endlessSelected);
    });
    U.stageScreen.addEventListener('click', e => { if (e.target === U.stageScreen || e.target.classList.contains('overlay__backdrop')) closeStageScreen(); });
    U.tankPickerBtn.addEventListener('click', () => openTankScreen(0));
    if (U.tankPickerBtn2) U.tankPickerBtn2.addEventListener('click', () => openTankScreen(1));
    U.tankClose.addEventListener('click', closeTankScreen);
    U.tankConfirm.addEventListener('click', closeTankScreen);
    U.tankScreen.addEventListener('click', e => { if (e.target === U.tankScreen || e.target.classList.contains('overlay__backdrop')) closeTankScreen(); });
    U.tankGrid.addEventListener('click', e => {
      const card = e.target.closest('.tank-card');
      if (!card) return;
      selectTank(card.dataset.tank);
      renderTankGrid();
      AUDIO.tick();
    });
    if (U.tankUnlockBtn) U.tankUnlockBtn.addEventListener('click', () => {
      const id = G.tankViewId;
      const ok = unlockTankWithCores(id);
      if (ok) {
        equipTankToSlot(id);
        renderTankGrid();
        updatePilotCard(0); updatePilotCard(1);
      } else {
        showToast('合金核心不足 · 继续出战获取', 'red');
      }
      AUDIO.init(); AUDIO.tick();
    });
    U.fusionBtn.addEventListener('click', openFusionScreen);
    U.fusionClose.addEventListener('click', closeFusionScreen);
    U.fusionDone.addEventListener('click', closeFusionScreen);
    U.fusionScreen.addEventListener('click', e => { if (e.target === U.fusionScreen || e.target.classList.contains('overlay__backdrop')) closeFusionScreen(); });
    U.codexBtn.addEventListener('click', openCodexScreen);
    U.codexClose.addEventListener('click', closeCodexScreen);
    U.codexDone.addEventListener('click', closeCodexScreen);
    U.codexScreen.addEventListener('click', e => { if (e.target === U.codexScreen || e.target.classList.contains('overlay__backdrop')) closeCodexScreen(); });
    if (U.artBtn) {
      U.artBtn.addEventListener('click', openArtScreen);
      U.artClose.addEventListener('click', closeArtScreen);
      U.artDone.addEventListener('click', closeArtScreen);
      U.artScreen.addEventListener('click', e => { if (e.target === U.artScreen || e.target.classList.contains('overlay__backdrop')) closeArtScreen(); });
    }
    U.itemBtn.addEventListener('click', openItemGuide);
    U.itemClose.addEventListener('click', closeItemGuide);
    U.itemDone.addEventListener('click', closeItemGuide);
    U.itemScreen.addEventListener('click', e => { if (e.target === U.itemScreen || e.target.classList.contains('overlay__backdrop')) closeItemGuide(); });
    if (U.recallBtn) U.recallBtn.addEventListener('click', recallToBase);
    if (U.recallBtn2) U.recallBtn2.addEventListener('click', recallToBase);
    if (U.mobileRecall) U.mobileRecall.addEventListener('click', recallToBase);
    U.saveBtn.addEventListener('click', openSaveScreen);
    U.saveClose.addEventListener('click', closeSaveScreen);
    U.saveDone.addEventListener('click', closeSaveScreen);
    U.saveScreen.addEventListener('click', e => { if (e.target === U.saveScreen || e.target.classList.contains('overlay__backdrop')) closeSaveScreen(); });
    U.saveExportBtn.addEventListener('click', downloadSave);
    U.saveCopyBtn.addEventListener('click', copySave);
    U.saveImportBtn.addEventListener('click', importSave);
    U.howBtn.addEventListener('click', () => showHow(false));
    U.howClose.addEventListener('click', hideHow);
    U.howStart.addEventListener('click', () => {
      const fromPause = !!G.helpFromPause;
      hideHow();
      if (fromPause) { AUDIO.tick(); return; }
      AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.coopSelected, G.endlessSelected);
    });
    U.howScreen.addEventListener('click', e => { if (e.target === U.howScreen || e.target.classList.contains('overlay__backdrop')) hideHow(); });
    U.tutorialStart.addEventListener('click', () => { AUDIO.init(); closeTutorial(); });
    U.tutorialClose.addEventListener('click', () => { AUDIO.init(); closeTutorial(); });
    U.tutorialScreen.addEventListener('click', e => {
      if (e.target === U.tutorialScreen || e.target.classList.contains('overlay__backdrop')) closeTutorial();
    });
    U.itemTutorialStart.addEventListener('click', () => { AUDIO.init(); closeItemTutorial(); });
    U.itemTutorialClose.addEventListener('click', () => { AUDIO.init(); closeItemTutorial(); });
    U.itemTutorialScreen.addEventListener('click', e => {
      if (e.target === U.itemTutorialScreen || e.target.classList.contains('overlay__backdrop')) closeItemTutorial();
    });
    U.soundBtnMenu.addEventListener('click', toggleMute);
    U.soundBtn.addEventListener('click', toggleMute);
    U.pauseBtn.addEventListener('click', pauseGame);
    U.fullBtn.addEventListener('click', toggleFullscreen);
    if (U.fullBtnMenu) U.fullBtnMenu.addEventListener('click', toggleFullscreen);
    U.resumeBtn.addEventListener('click', resumeGame);
    if (U.pauseSettingsBtn) U.pauseSettingsBtn.addEventListener('click', openSettings);
    if (U.pauseFusionBtn) U.pauseFusionBtn.addEventListener('click', openFusionScreen);
    if (U.pauseHelpBtn) U.pauseHelpBtn.addEventListener('click', () => showHow(true));
    if (U.settingsClose) U.settingsClose.addEventListener('click', closeSettings);
    if (U.settingsDone) U.settingsDone.addEventListener('click', closeSettings);
    if (U.settingsScreen) {
      U.settingsScreen.addEventListener('click', e => {
        const row = e.target.closest && e.target.closest('.settings-row');
        if (row) {
          const i = settingsRows().indexOf(row);
          if (i >= 0) {
            settingsFocusIndex = i;
            settingsRows().forEach((r, n) => r.classList.toggle('is-selected', n === i));
          }
        } else if (e.target === U.settingsScreen || e.target.classList.contains('overlay__backdrop')) closeSettings();
      });
      U.settingsScreen.addEventListener('focusin', e => {
        const row = e.target.closest && e.target.closest('.settings-row');
        if (!row) return;
        const i = settingsRows().indexOf(row);
        if (i >= 0) {
          settingsFocusIndex = i;
          settingsRows().forEach((r, n) => r.classList.toggle('is-selected', n === i));
        }
      });
    }
    if (U.settingsFullscreen) U.settingsFullscreen.addEventListener('click', () => { AUDIO.init(); toggleFullscreen(); });
    if (U.padSwapBtn) U.padSwapBtn.addEventListener('click', () => {
      if (!Input.gamepad.connected || !Input.gamepad2.connected) {
        AUDIO.deny();
        showToast('需要两只手柄才能交换 · 当前只识别到一只', 'red');
        return;
      }
      swapPadSlots();
      pollGamepad();
      syncPadState();
      AUDIO.confirm();
      showToast('手柄已交换 · P1 ↔ P2', 'cyan');
    });
    if (U.sfxVolume) U.sfxVolume.addEventListener('input', () => {
      AUDIO.init();
      AUDIO.setSfxVolume(Number(U.sfxVolume.value) / 100);
      if (U.sfxVolumeValue) U.sfxVolumeValue.textContent = `${U.sfxVolume.value}%`;
    });
    if (U.bgmVolume) U.bgmVolume.addEventListener('input', () => {
      AUDIO.init();
      AUDIO.setBgmVolume(Number(U.bgmVolume.value) / 100);
      if (U.bgmVolumeValue) U.bgmVolumeValue.textContent = `${U.bgmVolume.value}%`;
      if (G.mode === 'menu') AUDIO.startMenuMusic();
    });
    U.restartBtn.addEventListener('click', () => { AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.lastCoop, G.endless); });
    U.quitBtn.addEventListener('click', returnToMenu);
    U.nextBtn.addEventListener('click', () => { AUDIO.init(); AUDIO.confirm(); startRun(G.nextStageIndex, G.lastCoop, false); });
    U.againBtn.addEventListener('click', () => { AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.lastCoop, G.endless); });
    U.backBtn.addEventListener('click', returnToMenu);
    U.rerollBtn.addEventListener('click', () => rerollUpgrades('P1'));
    U.upgradeCards.addEventListener('click', e => {
      const card = e.target.closest('.upgrade-card');
      if (card) chooseUpgrade(parseInt(card.dataset.index, 10), 'P1');
    });
    U.pauseScreen.addEventListener('click', e => { if (e.target.classList.contains('overlay__backdrop')) resumeGame(); });
    U.levelupScreen.addEventListener('click', e => { if (e.target.classList.contains('overlay__backdrop')) { /* must choose */ } });

    U.gameCanvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('keydown', e => {
      if (e.code === 'KeyM') { toggleMute(); return; }
      if (e.code === 'KeyF') { toggleFullscreen(); return; }
      if (G.mode === 'itemTutorial') {
        if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          closeItemTutorial();
        }
        return;
      }
      if (G.mode === 'tutorial') {
        if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          closeTutorial();
        }
        return;
      }
      if (e.code === 'Escape') {
        if (U.settingsScreen && !U.settingsScreen.classList.contains('hidden')) { closeSettings(); return; }
        // Tank/fusion can sit on top of the stage or pause screens, so close
        // the topmost overlay first.
        if (!U.tankScreen.classList.contains('hidden')) { closeTankScreen(); return; }
        if (!U.fusionScreen.classList.contains('hidden')) { closeFusionScreen(); return; }
        if (!U.stageScreen.classList.contains('hidden')) { closeStageScreen(); return; }
        if (!U.codexScreen.classList.contains('hidden')) { closeCodexScreen(); return; }
        if (U.artScreen && !U.artScreen.classList.contains('hidden')) { closeArtScreen(); return; }
        if (!U.itemScreen.classList.contains('hidden')) { closeItemGuide(); return; }
        if (!U.saveScreen.classList.contains('hidden')) { closeSaveScreen(); return; }
        if (!U.howScreen.classList.contains('hidden')) { hideHow(); return; }
        if (G.mode === 'paused') { resumeGame(); return; }
        if (G.mode === 'playing') { pauseGame(); return; }
        if (G.mode === 'result') { returnToMenu(); return; }
        return;
      }
      if (U.settingsScreen && !U.settingsScreen.classList.contains('hidden') && handleSettingsKey(e)) return;
      if (U.howScreen && !U.howScreen.classList.contains('hidden') && handleHowKey(e)) return;
      if (G.mode === 'menu' || G.mode === 'paused' || G.mode === 'result') {
        if (handleOverlayNavKey(e, uiContext())) return;
      }
      if (G.mode === 'levelup') {
        const g = Input.gamepad;
        if (G.levelupPlayer && G.levelupPlayer.index === 0) {
          if (e.code === 'Digit1' || e.code === 'Numpad1') chooseUpgrade(0, 'P1');
          else if (e.code === 'Digit2' || e.code === 'Numpad2') chooseUpgrade(1, 'P1');
          else if (e.code === 'Digit3' || e.code === 'Numpad3') chooseUpgrade(2, 'P1');
          else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyA' || e.code === 'KeyW') { e.preventDefault(); moveLevelupSelection(-1, 'P1'); }
          else if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyD' || e.code === 'KeyS') { e.preventDefault(); moveLevelupSelection(1, 'P1'); }
          else if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            if (g.selectedCard < 0) { AUDIO.deny(); return; }
            chooseUpgrade(g.selectedCard, 'P1');
          } else if (e.code === 'KeyR') rerollUpgrades('P1');
        }
        return;
      }
      if (G.mode === 'menu') {
        if (!U.howScreen.classList.contains('hidden')) {
          if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); hideHow(); startRun(G.arenaIndex, G.coopSelected, G.endlessSelected); }
          return;
        }
        if (U.settingsScreen && !U.settingsScreen.classList.contains('hidden')) return;
        if (!U.stageScreen.classList.contains('hidden') || !U.tankScreen.classList.contains('hidden') || !U.fusionScreen.classList.contains('hidden') || !U.codexScreen.classList.contains('hidden') || (U.artScreen && !U.artScreen.classList.contains('hidden')) || !U.itemScreen.classList.contains('hidden') || !U.saveScreen.classList.contains('hidden')) return;
        const menuDir = {
          ArrowLeft: [-1, 0], KeyA: [-1, 0],
          ArrowRight: [1, 0], KeyD: [1, 0],
          ArrowUp: [0, -1], KeyW: [0, -1],
          ArrowDown: [0, 1], KeyS: [0, 1]
        }[e.code];
        if (menuDir) {
          e.preventDefault();
          movePadFocus(menuDir[0], menuDir[1]);
          return;
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          const navItem = document.activeElement && document.activeElement.closest && document.activeElement.closest('.sf-nav__item');
          if (navItem) { navItem.click(); return; }
          AUDIO.init(); AUDIO.confirm(); openStageScreen();
        }
        return;
      }
      if (G.mode === 'paused') {
        if (e.code === 'KeyP') { resumeGame(); return; }
        return;
      }
      if (G.mode !== 'playing') return;
      if (e.code === 'Space') {
        if (!e.repeat) Input.dashQueued = true;
        e.preventDefault();
      }
      if (G.twoPlayer && e.code === 'Enter') {
        if (!e.repeat) Input.dashQueued2 = true;
        e.preventDefault();
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        Input.keys.add(e.code);
        e.preventDefault();
      }
      if (e.code === 'KeyB') { if (!e.repeat) recallToBase(); return; }
      if (e.code === 'KeyP') pauseGame();
    });
    window.addEventListener('keyup', e => Input.keys.delete(e.code));
    const autoPauseEnabled = !new URLSearchParams(location.search).has('noauto');
    window.addEventListener('blur', () => {
      Input.keys.clear();
      if (autoPauseEnabled && G.mode === 'playing') pauseGame();
    });
    document.addEventListener('visibilitychange', () => {
      if (autoPauseEnabled && document.hidden && G.mode === 'playing') pauseGame();
    });

    // touch joystick
    let stickId = null, origin = null;
    const stick = U.mobileStick, knob = stick.querySelector('i');
    const resetStick = () => {
      stickId = null; origin = null; Input.mobile.active = false; Input.mobile.x = 0; Input.mobile.y = 0;
      knob.style.transform = 'translate(0,0)';
    };
    stick.addEventListener('pointerdown', e => {
      if (G.mode !== 'playing') return;
      stickId = e.pointerId; const r = stick.getBoundingClientRect();
      origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      Input.mobile.active = true;
      stick.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    stick.addEventListener('pointermove', e => {
      if (e.pointerId !== stickId || !origin) return;
      let dx = e.clientX - origin.x, dy = e.clientY - origin.y;
      const len = Math.hypot(dx, dy), max = 28;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      Input.mobile.x = dx / max; Input.mobile.y = dy / max;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      e.preventDefault();
    });
    const endStick = e => { if (e.pointerId === stickId) resetStick(); };
    stick.addEventListener('pointerup', endStick);
    stick.addEventListener('pointercancel', endStick);
    U.mobileDash.addEventListener('pointerdown', e => { e.preventDefault(); if (G.mode === 'playing') Input.dashQueued = true; });
  }

  function gamepadList() {
    try {
      const getter = navigator.getGamepads || navigator.webkitGetGamepads;
      return getter ? (getter.call(navigator) || []) : [];
    } catch (e) {
      return [];
    }
  }

  function markPadSlot(which, gp) {
    const slot = Input.padSlots[which];
    if (!slot || !gp) return;
    slot.ref = gp;
    slot.index = gp.index;
    slot.id = gp.id || '';
  }

  function clearPadSlot(which) {
    const slot = Input.padSlots[which];
    if (!slot) return;
    slot.ref = null; slot.index = -1; slot.id = '';
  }

  function adoptPad(gp) {
    if (!gp) return;
    const s1 = Input.padSlots.p1, s2 = Input.padSlots.p2;
    if (s1.ref === gp || s2.ref === gp) return;
    if (!s1.ref && s1.index < 0) markPadSlot('p1', gp);
    else if (!s2.ref && s2.index < 0) markPadSlot('p2', gp);
  }

  function forgetPad(gp) {
    if (!gp) return;
    for (const which of ['p1', 'p2']) {
      const slot = Input.padSlots[which];
      if (slot && (slot.ref === gp || (slot.index === gp.index && slot.id === (gp.id || '')))) {
        clearPadSlot(which);
      }
    }
  }

  function swapPadSlots() {
    const p1 = Input.padSlots.p1;
    Input.padSlots.p1 = Input.padSlots.p2;
    Input.padSlots.p2 = p1;
    for (const state of [Input.gamepad, Input.gamepad2]) {
      state.prevButtons = [];
      state.selectedCard = -1;
      state.levelupNeedsNeutral = true;
    }
  }

  function rumble(strength, duration) {
    try {
      const pads = gamepadList();
      const gp = Array.from(pads).find(p => p && p.connected);
      const actuator = gp && gp.vibrationActuator;
      if (!actuator || !actuator.playEffect) return;
      const effect = actuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: duration || 100,
        strongMagnitude: clamp(strength, 0, 1),
        weakMagnitude: clamp(strength * .55, 0, 1)
      });
      if (effect && effect.catch) effect.catch(() => {});
    } catch (e) {}
  }

  function syncPadState() {
    const el = document.getElementById('padState');
    if (!el) return;
    const supported = !!(navigator.getGamepads || navigator.webkitGetGamepads);
    const p1 = Input.gamepad.connected ? (Input.gamepad.id || 'Controller') : '';
    const p2 = Input.gamepad2.connected ? (Input.gamepad2.id || 'Controller') : '';
    el.textContent = !supported ? '手柄 / 不支持'
      : p1 && p2 ? '手柄 / P1 + P2'
        : p1 ? '手柄 / 已连接' : '手柄 / 未连接';
    el.title = !supported
      ? '当前浏览器不支持 Gamepad API；请使用 Chrome / Edge 等支持手柄的浏览器。'
      : p1
        ? `P1：${p1}${p2 ? `\nP2：${p2}` : ''}\nP1 为第一只连接的手柄，P2 为第二只。`
        : '未检测到手柄。连接后按任意键；浏览器需支持 Gamepad API 并保持页面聚焦。';
    el.classList.toggle('is-on', !!p1);
    if (U.padSwapBtn) {
      const canSwap = !!Input.gamepad.connected && !!Input.gamepad2.connected;
      U.padSwapBtn.classList.toggle('is-unavailable', !canSwap);
      U.padSwapBtn.setAttribute('aria-disabled', canSwap ? 'false' : 'true');
      const label = U.padSwapBtn.querySelector('span');
      if (label) label.textContent = canSwap ? '交换 P1/P2' : '等待两只手柄';
    }
    if (U.padAssignment) {
      U.padAssignment.textContent = `P1 ${Input.gamepad.connected ? '已连接' : '未连接'} · P2 ${Input.gamepad2.connected ? '已连接' : '未连接'}`;
    }
    document.body.classList.toggle('pad-connected', !!Input.gamepad.connected);
    syncPadCues();
    if (!Input.gamepad.connected) updatePadHint(null);
  }

  function syncPadCues() {
    const on = !!Input.gamepad.connected;
    const stageCta = document.querySelector('.stage-picker-card__cta');
    if (stageCta) stageCta.innerHTML = on ? 'A 打开星图' : '打开星图 <b>↗</b>';
    document.querySelectorAll('.pilot-card__cta').forEach(el => {
      el.innerHTML = on ? 'A 更换' : '更换 <b>↗</b>';
    });
    const startArrow = U.startBtn && U.startBtn.querySelector('.cta__arrow');
    if (startArrow) startArrow.textContent = on ? 'A' : '↗';
  }

  function updatePadHint(ctx) {
    const el = U.padHint;
    const g = Input.gamepad;
    if (!el) return;
    if (!g.connected || !ctx) {
      el.classList.remove('is-visible');
      el.innerHTML = '';
      g.hintKey = '';
      return;
    }
    const base = {
      menu: [['方向键', '选择'], ['A', '确认'], ['START', '出击']],
      tutorial: [['A', '开始作战'], ['B', '跳过教学']],
      itemTutorial: [['A', '继续战斗'], ['B', '关闭']],
      stage: [['方向键', '选择星区'], ['A', '进入'], ['B', '返回']],
      tank: [['方向键', '选择坦克'], ['A', '装备'], ['B', '返回']],
      fusion: [['方向键', '选择'], ['A', '确认'], ['B', '返回']],
      codex: [['方向键', '选择'], ['A', '确认'], ['B', '返回']],
      item: [['方向键', '选择'], ['A', '确认'], ['B', '返回']],
      save: [['方向键', '选择'], ['A', '确认'], ['B', '返回']],
      how: [['方向键', '选择'], ['A', '确认'], ['B', '返回']],
      art: [['方向键', '选择'], ['A', '确认'], ['B', '返回']],
      pause: [['A', '继续'], ['B', '返回']],
      settings: [['方向键', '调整'], ['A', '切换'], ['B', '返回']],
      result: [['A', '再次出击'], ['B', '机库']],
      levelup: [['方向键', '选择'], ['A', '确认'], ['B', '重掷']]
    };
    const scrollable = !!padScrollRoot(ctx);
    const hintKey = `${ctx.key}:${scrollable ? 1 : 0}`;
    if (g.hintKey === hintKey && el.classList.contains('is-visible')) return;
    g.hintKey = hintKey;
    const parts = (base[ctx.key] || base.menu).slice();
    if (scrollable) parts.splice(2, 0, ['LB/RB', '翻页']);
    const html = parts.map(([key, label]) => `<span><kbd>${key}</kbd>${label}</span>`).join('');
    if (el.innerHTML !== html) el.innerHTML = html;
    el.classList.add('is-visible');
  }

  function padScrollRoot(ctx) {
    if (!ctx) return null;
    const selectors = {
      settings: '.settings__rows',
      stage: '#arenaOptions',
      tank: '#tankGrid',
      codex: '#codexGrid',
      item: '#itemGrid',
      how: '.how__panel',
      fusion: '.how__panel',
      art: '.art-panel'
    };
    const selector = selectors[ctx.key];
    if (!selector) return null;
    const el = ctx.root.querySelector(selector);
    if (!el || el.scrollHeight <= el.clientHeight + 4) return null;
    return el;
  }

  function padScrollPage(ctx, dir) {
    const el = padScrollRoot(ctx);
    if (!el) return false;
    const horizontal = el.scrollWidth > el.clientWidth + 4;
    if (horizontal) el.scrollBy({ left: Math.max(120, el.clientWidth * .72) * dir, behavior: 'auto' });
    else el.scrollBy({ top: Math.max(90, el.clientHeight * .72) * dir, behavior: 'auto' });
    return true;
  }

  function isUiVisible(el) {
    if (!el || el.classList.contains('hidden') || el.classList.contains('is-hidden')) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function uiContext() {
    const overlays = [
      ['itemTutorial', U.itemTutorialScreen], ['tutorial', U.tutorialScreen], ['levelup', U.levelupScreen], ['settings', U.settingsScreen], ['fusion', U.fusionScreen],
      ['tank', U.tankScreen], ['pause', U.pauseScreen], ['result', U.resultScreen],
      ['stage', U.stageScreen], ['codex', U.codexScreen], ['item', U.itemScreen],
      ['art', U.artScreen], ['save', U.saveScreen], ['how', U.howScreen]
    ];
    for (const [key, el] of overlays) {
      if (isUiVisible(el)) return { key, root: el };
    }
    if (G.mode === 'menu' && isUiVisible(U.menuScreen)) return { key: 'menu', root: U.menuScreen };
    return null;
  }

  function settingsRows() {
    return U.settingsScreen ? Array.from(U.settingsScreen.querySelectorAll('.settings-row')) : [];
  }

  function settingsRowControl(row) {
    return row ? row.querySelector('.settings-toggle, input[type="range"], button') : null;
  }

  function setSettingsFocus(index) {
    const rows = settingsRows();
    if (!rows.length) return null;
    settingsFocusIndex = Math.max(0, Math.min(rows.length - 1, index));
    rows.forEach((row, i) => row.classList.toggle('is-selected', i === settingsFocusIndex));
    const target = settingsRowControl(rows[settingsFocusIndex]);
    if (target) setPadFocus(target);
    return target;
  }

  function clearSettingsFocus() {
    settingsRows().forEach(row => row.classList.remove('is-selected'));
    settingsFocusIndex = 0;
  }

  function moveSettingsFocus(delta) {
    if (!U.settingsScreen || U.settingsScreen.classList.contains('hidden')) return;
    setSettingsFocus(settingsFocusIndex + delta);
    AUDIO.tick();
  }

  function adjustSettingsRange(delta) {
    const row = settingsRows()[settingsFocusIndex];
    const range = row && row.querySelector('input[type="range"]');
    if (!range) return false;
    const step = range.step && range.step !== 'any' ? Number(range.step) : 1;
    const next = Math.max(Number(range.min || 0), Math.min(Number(range.max || 100), Number(range.value) + delta * Math.max(step, 5)));
    range.value = String(next);
    range.dispatchEvent(new Event('input', { bubbles: true }));
    AUDIO.tick();
    return true;
  }

  function handleSettingsKey(e) {
    if (!U.settingsScreen || U.settingsScreen.classList.contains('hidden')) return false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); moveSettingsFocus(-1); return true; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); moveSettingsFocus(1); return true; }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); adjustSettingsRange(-1); return true; }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); adjustSettingsRange(1); return true; }
    if (e.code === 'Enter' || e.code === 'Space') {
      const row = settingsRows()[settingsFocusIndex];
      const button = row && row.querySelector('.settings-toggle');
      if (button) { e.preventDefault(); button.click(); return true; }
    }
    return false;
  }

  function handleOverlayNavKey(e, ctx) {
    if (!ctx || ctx.key === 'menu' || ctx.key === 'settings' || ctx.key === 'levelup' || ctx.key === 'how') return false;
    const dir = {
      ArrowLeft: [-1, 0], KeyA: [-1, 0],
      ArrowRight: [1, 0], KeyD: [1, 0],
      ArrowUp: [0, -1], KeyW: [0, -1],
      ArrowDown: [0, 1], KeyS: [0, 1]
    }[e.code];
    if (dir) {
      e.preventDefault();
      movePadFocus(dir[0], dir[1]);
      return true;
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      activatePadFocus();
      return true;
    }
    return false;
  }

  function padFocusables(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('button:not([disabled]), input[type="range"]:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(el => {
      if (!isUiVisible(el) || el.disabled) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    });
  }

  function setPadFocus(el) {
    const g = Input.gamepad;
    if (!el) return;
    if (g.focusEl && g.focusEl !== el) g.focusEl.classList.remove('is-pad-focus');
    g.focusEl = el;
    el.classList.add('is-pad-focus');
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
  }

  function clearPadFocus() {
    const g = Input.gamepad;
    if (g.focusEl) g.focusEl.classList.remove('is-pad-focus');
    g.focusEl = null;
  }

  function defaultPadFocus(ctx) {
    if (!ctx) return null;
    if (ctx.key === 'menu') return document.querySelector('.sf-nav__item--start') || (U.menuNav && U.menuNav.querySelector('.sf-nav__item--start')) || U.startBtn;
    if (ctx.key === 'tutorial') return U.tutorialStart;
    if (ctx.key === 'itemTutorial') return U.itemTutorialStart;
    if (ctx.key === 'levelup') return null;
    if (ctx.key === 'pause') return U.resumeBtn;
    if (ctx.key === 'settings') return settingsRowControl(settingsRows()[settingsFocusIndex]) || U.settingsFullscreen || padFocusables(ctx.root)[0] || null;
    if (ctx.key === 'result') return U.nextBtn && !U.nextBtn.classList.contains('is-hidden') ? U.nextBtn : U.againBtn;
    const list = padFocusables(ctx.root);
    if (ctx.key === 'stage') {
      return list.find(el => el.classList.contains('arena-card') && el.classList.contains('is-active')) ||
        list.find(el => el.classList.contains('arena-card')) || list[0] || null;
    }
    if (ctx.key === 'tank') {
      return list.find(el => el.classList.contains('tank-card') && el.classList.contains('is-active')) ||
        list.find(el => el.classList.contains('tank-card')) || list[0] || null;
    }
    return list.find(el => el.classList.contains('arena-card') || el.classList.contains('tank-card')) ||
      list.find(el => el.classList.contains('cta') && !el.classList.contains('close-btn')) || list[0] || null;
  }

  function syncPadContext(force) {
    const g = Input.gamepad;
    const ctx = uiContext();
    if (!ctx) { g.uiKey = ''; clearPadFocus(); updatePadHint(null); return null; }
    if (force || ctx.key !== g.uiKey) {
      g.uiKey = ctx.key;
      g.selectedCard = ctx.key === 'levelup' ? -1 : 0;
      g.levelupNeedsNeutral = ctx.key === 'levelup';
      if (ctx.key === 'levelup') g.levelupOwner = G.twoPlayer ? 'P2' : 'P1';
      if (ctx.key === 'levelup') {
        Input.gamepad2.selectedCard = -1;
        Input.gamepad2.levelupNeedsNeutral = true;
        Input.gamepad2.levelupOwner = G.twoPlayer ? 'P2' : 'P1';
      }
      const first = defaultPadFocus(ctx);
      if (first) setPadFocus(first); else clearPadFocus();
    } else if (!g.focusEl || !padFocusables(ctx.root).includes(g.focusEl)) {
      const first = defaultPadFocus(ctx);
      if (first) setPadFocus(first); else clearPadFocus();
    }
    updatePadHint(ctx);
    return ctx;
  }

  function movePadFocus(dx, dy) {
    const g = Input.gamepad;
    const ctx = syncPadContext(false);
    if (!ctx) return;
    if (ctx.key === 'settings') {
      if (dy) { moveSettingsFocus(dy); return; }
      if (dx && adjustSettingsRange(dx)) return;
      return;
    }
    const list = padFocusables(ctx.root);
    if (!list.length) return;
    if (!g.focusEl || !list.includes(g.focusEl)) { setPadFocus(list[0]); return; }
    const cur = g.focusEl.getBoundingClientRect();
    const cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of list) {
      if (el === g.focusEl) continue;
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const px = ex - cx, py = ey - cy;
      const primary = dx ? px * Math.sign(dx) : py * Math.sign(dy);
      const perp = dx ? Math.abs(py) : Math.abs(px);
      if (primary < 5) continue;
      const score = primary + perp * 2.1;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    // Controller convention: edges are hard stops. Wrapping from the last
    // stage card back to the first one feels like a teleport, not navigation.
    if (best) setPadFocus(best);
  }

  function activatePadFocus() {
    const g = Input.gamepad;
    const ctx = syncPadContext(false);
    if (!ctx) return false;
    const el = g.focusEl;
    if (el && padFocusables(ctx.root).includes(el)) {
      AUDIO.init();
      el.click();
      return true;
    }
    const first = defaultPadFocus(ctx);
    if (first) { setPadFocus(first); return true; }
    return false;
  }

  function backPadContext() {
    const ctx = syncPadContext(false);
    if (!ctx || ctx.key === 'menu') return false;
    if (ctx.key === 'levelup') return false;
    if (ctx.key === 'tutorial') closeTutorial();
    else if (ctx.key === 'itemTutorial') closeItemTutorial();
    else if (ctx.key === 'stage') closeStageScreen();
    else if (ctx.key === 'tank') closeTankScreen();
    else if (ctx.key === 'fusion') closeFusionScreen();
    else if (ctx.key === 'codex') closeCodexScreen();
    else if (ctx.key === 'item') closeItemGuide();
    else if (ctx.key === 'art') closeArtScreen();
    else if (ctx.key === 'save') closeSaveScreen();
    else if (ctx.key === 'how') hideHow();
    else if (ctx.key === 'settings') closeSettings();
    else if (ctx.key === 'pause') resumeGame();
    else if (ctx.key === 'result') returnToMenu();
    return true;
  }

  // Turn one pad's d-pad/stick into one UI step, with a short repeat delay.
  // Level-up must use the pad owned by the pilot who is choosing, not P1's pad.
  function padUiStep(state) {
    if (!state || !state.buttons) return null;
    const pressed = i => !!(state.buttons[i] && state.buttons[i].pressed);
    const now = performance.now();
    const ddx = (pressed(15) ? 1 : 0) - (pressed(14) ? 1 : 0);
    const ddy = (pressed(13) ? 1 : 0) - (pressed(12) ? 1 : 0);
    if (ddx || ddy) {
      if (ddx !== state.dpadDirX || ddy !== state.dpadDirY) {
        state.dpadDirX = ddx; state.dpadDirY = ddy; state.dpadRepeatAt = now + 340;
        return { dx: ddx, dy: ddy };
      }
      if (now >= state.dpadRepeatAt) {
        state.dpadRepeatAt = now + 140;
        return { dx: ddx, dy: ddy };
      }
      return null;
    }
    state.dpadDirX = 0; state.dpadDirY = 0;
    const ax = Math.abs(state.x) >= .48 ? Math.sign(state.x) : 0;
    const ay = Math.abs(state.y) >= .48 ? Math.sign(state.y) : 0;
    if (!ax && !ay) { state.uiDirX = 0; state.uiDirY = 0; return null; }
    const dx = Math.abs(ax) >= Math.abs(ay) ? ax : 0;
    const dy = dx ? 0 : ay;
    if (dx !== state.uiDirX || dy !== state.uiDirY) {
      state.uiDirX = dx; state.uiDirY = dy; state.uiRepeatAt = now + 340;
      return { dx, dy };
    }
    if (now >= state.uiRepeatAt) {
      state.uiRepeatAt = now + 150;
      return { dx, dy };
    }
    return null;
  }

  function pollGamepad() {
    const g = Input.gamepad;
    const g2 = Input.gamepad2;
    const connected = Array.from(gamepadList()).filter(p => p && p.connected);
    const slots = Input.padSlots;
    const resolveSlot = (slot, exclude) => {
      if (!slot) return null;
      const accept = (gp) => {
        slot.ref = gp; slot.index = gp.index; slot.id = gp.id || '';
        return gp;
      };
      if (slot.ref) {
        const found = connected.find(p => p === slot.ref && p !== exclude);
        if (found) return accept(found);
      }
      // Browsers can renumber a newly connected pad. Match the remembered
      // id before falling back to the raw array index.
      if (slot.id) {
        // Only use the id as a fallback when it uniquely identifies a pad.
        // Two identical Xbox pads share the same id; for those, keep the
        // remembered slot/index instead of guessing the wrong one.
        const sameId = connected.filter(p => p !== exclude && p.id === slot.id);
        if (sameId.length === 1) return accept(sameId[0]);
      }
      if (slot.index >= 0) {
        const found = connected.find(p => p !== exclude && p.index === slot.index && (!slot.id || p.id === slot.id));
        if (found) return accept(found);
      }
      return null;
    };
    let p1 = resolveSlot(slots.p1, null);
    let p2 = resolveSlot(slots.p2, p1);
    if (p1 === p2) p2 = null;
    if (!p1) {
      const candidate = connected.find(p => p !== p2);
      if (candidate) { markPadSlot('p1', candidate); p1 = candidate; }
      else clearPadSlot('p1');
    }
    if (!p2) {
      const candidate = connected.find(p => p !== p1);
      if (candidate) { markPadSlot('p2', candidate); p2 = candidate; }
      else clearPadSlot('p2');
    }
    const primary = p1 || null;
    const secondary = p2 || null;
    const resetPad = (state) => {
      state.connected = false; state.id = ''; state.index = -1; state.x = 0; state.y = 0;
      state.prevButtons = [];
    };
    if (!primary) {
      clearPadSlot('p1'); clearPadSlot('p2');
      if (g.connected) {
        resetPad(g);
        syncPadState();
        if (G.mode === 'playing') showToast('Xbox 手柄已断开', 'red');
      }
      if (g2.connected) {
        resetPad(g2);
        if (G.mode === 'playing') showToast('P2 手柄已断开', 'red');
      }
      return;
    }

    const readPad = (gp, state) => {
      if (!state.connected) state.connected = true;
      state.id = gp.id || 'Xbox Controller';
      state.index = gp.index;
      const dz = .2;
      let x = gp.axes[0] || 0, y = gp.axes[1] || 0;
      const mag = Math.hypot(x, y);
      if (mag > dz) {
        const scale = Math.min(1, (mag - dz) / (1 - dz)) / mag;
        x *= scale; y *= scale;
      } else { x = 0; y = 0; }
      const btns = gp.buttons || [];
      if (btns[12] && btns[12].pressed) y -= 1;
      if (btns[13] && btns[13].pressed) y += 1;
      if (btns[14] && btns[14].pressed) x -= 1;
      if (btns[15] && btns[15].pressed) x += 1;
      const moveMag = Math.hypot(x, y);
      if (moveMag > 1) { x /= moveMag; y /= moveMag; }
      state.x = x; state.y = y;
      state.buttons = btns;

    };

    const hadPrimary = g.connected;
    const hadSecondary = g2.connected;
    readPad(primary, g);
    if (!g.id) g.id = primary.id || 'Xbox Controller';
    if (!secondary) {
      if (g2.connected) resetPad(g2);
    } else {
      readPad(secondary, g2);
    }
    if (!hadPrimary || hadSecondary !== g2.connected) syncPadState();
    if (secondary && !hadSecondary && G.mode === 'playing') showToast('P2 手柄已连接 · 左摇杆移动', 'cyan');

    const pressed = i => !!(g.buttons[i] && g.buttons[i].pressed);
    const was = i => !!g.prevButtons[i];
    const just = i => pressed(i) && !was(i);
    const pressed2 = i => !!(g2.buttons && g2.buttons[i] && g2.buttons[i].pressed);
    const was2 = i => !!g2.prevButtons[i];
    const just2 = i => g2.connected && pressed2(i) && !was2(i);
    const dpadPressed = pressed(12) || pressed(13) || pressed(14) || pressed(15);
    let padStep = null;
    if (G.mode !== 'playing') {
      if (dpadPressed) {
        const dx = (pressed(15) ? 1 : 0) - (pressed(14) ? 1 : 0);
        const dy = (pressed(13) ? 1 : 0) - (pressed(12) ? 1 : 0);
        const nowMs = performance.now();
        if (dx !== g.dpadDirX || dy !== g.dpadDirY) {
          g.dpadDirX = dx; g.dpadDirY = dy; g.dpadRepeatAt = nowMs + 340;
          padStep = { dx, dy };
        } else if (nowMs >= g.dpadRepeatAt) {
          g.dpadRepeatAt = nowMs + 140;
          padStep = { dx, dy };
        }
      } else {
        g.dpadDirX = 0; g.dpadDirY = 0;
        const ax = Math.abs(g.x) >= .48 ? Math.sign(g.x) : 0;
        const ay = Math.abs(g.y) >= .48 ? Math.sign(g.y) : 0;
        if (ax || ay) {
          const dx = Math.abs(ax) >= Math.abs(ay) ? ax : 0;
          const dy = dx ? 0 : ay;
          const nowMs = performance.now();
          if (dx !== g.uiDirX || dy !== g.uiDirY) {
            g.uiDirX = dx; g.uiDirY = dy; g.uiRepeatAt = nowMs + 340;
            padStep = { dx, dy };
          } else if (nowMs >= g.uiRepeatAt) {
            g.uiRepeatAt = nowMs + 150;
            padStep = { dx, dy };
          }
        } else {
          g.uiDirX = 0; g.uiDirY = 0;
        }
      }
    } else {
      g.uiDirX = 0; g.uiDirY = 0;
      g.dpadDirX = 0; g.dpadDirY = 0;
    }

    if (G.mode === 'playing') {
      clearPadFocus();
      g.uiKey = '';
      if (just(0)) {
        if (!G.twoPlayer) Input.dashQueued = true;
        else if (!g2.connected) Input.dashQueued2 = true;
        else Input.dashQueued = true;
      }
      if (just(3)) recallToBase();
      if (just(9)) pauseGame();
      if (g2.connected) {
        if (just2(0)) Input.dashQueued2 = true;
        if (just2(3)) recallToBase();
        if (just2(9)) pauseGame();
      }
    } else {
      const ctx = syncPadContext(false);
      if (ctx && ctx.key === 'levelup') {
        // Do not auto-select the first card: wait for a neutral stick/d-pad state,
        // then require an explicit direction before showing the selection frame.
        const lp = (G.levelupPlayer && G.levelupPlayer.index === 1 && g2.connected) ? g2 : g;
        const pressedL = i => !!(lp.buttons && lp.buttons[i] && lp.buttons[i].pressed);
        const justL = i => pressedL(i) && !(lp.prevButtons && lp.prevButtons[i]);
        if (lp.levelupNeedsNeutral && Math.hypot(lp.x, lp.y) < .24) lp.levelupNeedsNeutral = false;
        const padOwnerLabel = G.levelupPlayer ? G.levelupPlayer.label : (G.twoPlayer ? 'P2' : 'P1');
        const lpStep = lp === g ? padStep : padUiStep(lp);
        if (!lp.levelupNeedsNeutral && G.levelupPlayer) {
          const left = justL(14) || justL(12) || justL(4) || (lpStep && lpStep.dx < 0) || (lpStep && lpStep.dy < 0);
          const right = justL(15) || justL(13) || justL(5) || (lpStep && lpStep.dx > 0) || (lpStep && lpStep.dy > 0);
          if (left) moveLevelupSelection(-1, padOwnerLabel);
          if (right) moveLevelupSelection(1, padOwnerLabel);
          if (justL(0) && lp.selectedCard >= 0) { AUDIO.init(); chooseUpgrade(lp.selectedCard, padOwnerLabel); }
        }
        if (justL(1)) rerollUpgrades(padOwnerLabel);
        if (lp.selectedCard < 0) syncLevelupFocus();
      } else if (ctx) {
        if (just(4)) padScrollPage(ctx, -1);
        if (just(5)) padScrollPage(ctx, 1);
        const slider = ctx.key === 'settings' && g.focusEl && g.focusEl.matches && g.focusEl.matches('.settings-range');
        if (padStep && slider && padStep.dx && !padStep.dy) {
          const range = g.focusEl;
          const step = range.step && range.step !== 'any' ? Number(range.step) : 1;
          const next = Math.max(Number(range.min || 0), Math.min(Number(range.max || 100), Number(range.value) + padStep.dx * Math.max(step, 5)));
          range.value = String(next);
          range.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (padStep) movePadFocus(padStep.dx, padStep.dy);
        else if (just(12)) movePadFocus(0, -1);
        else if (just(13)) movePadFocus(0, 1);
        else if (just(14)) movePadFocus(-1, 0);
        else if (just(15)) movePadFocus(1, 0);
        if (just(0)) activatePadFocus();
        if (just(1)) backPadContext();
        if (just(9)) {
          // START belongs to the current focus context, not the background menu.
          if (ctx.key === 'menu') { AUDIO.init(); AUDIO.confirm(); openStageScreen(); }
          else if (ctx.key === 'pause') resumeGame();
          else if (ctx.key === 'result') returnToMenu();
        }
      } else if (G.mode === 'paused') {
        if (just(0) || just(9)) resumeGame();
      } else if (G.mode === 'result') {
        if (just(0)) { AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.lastCoop, G.endless); }
        if (just(9)) returnToMenu();
      }
    }
    g.prevButtons = Array.from(g.buttons || [], b => !!(b && b.pressed));
    g2.prevButtons = Array.from(g2.buttons || [], b => !!(b && b.pressed));
  }

  function primeMenuAudio() {
    AUDIO.init();
    if (G.mode !== 'menu') return;
    if (!AUDIO.menuMusicOn || AUDIO.bgmKind !== 'menu') {
      AUDIO.startMenuMusic();
    } else if (AUDIO.bgmEl && AUDIO.bgmEl.paused) {
      const play = AUDIO.bgmEl.play();
      if (play && play.catch) play.catch(() => {});
    }
  }

  function init() {
    cacheUI();
    loadArtAssets();
    loadTankArt();
    gameCtx = U.gameCanvas.getContext('2d');
    menuCtx = U.menuCanvas.getContext('2d');
    [gameCtx, menuCtx].forEach(ctx => { if (ctx) ctx.imageSmoothingEnabled = false; });
    bindUI();
    initArtMode();
    syncSoundButtons();
    G.entityId = 1;
    G.campaign = readCampaign();
    G.profile = syncTankUnlocks(readProfile());
    G.tankIds = readTankIds();
    G.tankId = G.tankIds[0];
    G.tank = TANKS.find(t => t.id === G.tankId) || TANKS[0];
    G.tankViewId = G.tankId;
    renderStagePicker();
    selectArena(Math.min(G.arenaIndex, G.campaign.unlocked - 1));
    updatePilotCard(0);
    updatePilotCard(1);
    updateTankCount();
    selectCoop(false);
    syncSettingsUI();
    updateBestStats();
    syncPadState();
    U.bossMarker.style.left = `${clamp((G.bossAt || BOSS_AT) / Math.max(1, G.bossAt || BOSS_AT) * 100, 0, 100)}%`;
    rebuildMenuCache();
    if (new URLSearchParams(location.search).has('debug')) {
      const tick = (seconds, autoMove) => {
        const steps = Math.min(36000, Math.max(1, Math.floor(seconds * 60)));
        const patrol = [['KeyW', 'KeyD'], ['KeyS', 'KeyD'], ['KeyS', 'KeyA'], ['KeyW', 'KeyA']];
        const debugPick = () => {
          const names = Array.from(U.upgradeCards.querySelectorAll('.upgrade-card__name')).map(n => n.textContent.trim());
          const priority = ['撕裂者主炮', '复合装甲', '相位护盾', '过载输出', '自动装弹机', '高爆装药', '引擎超频', '暴击协议'];
          for (const want of priority) {
            const i = names.indexOf(want);
            if (i >= 0) { chooseUpgrade(i); return; }
          }
          chooseUpgrade(0);
        };
        for (let i = 0; i < steps; i++) {
          if (G.mode === 'levelup') debugPick();
          if (G.mode !== 'playing') break;
          if (autoMove) {
            Input.keys.clear();
            const phase = Math.floor(G.elapsed / 2.4);
            const keys = patrol[phase % patrol.length];
            for (const key of keys) Input.keys.add(key);
            if (G.twoPlayer) {
              const p2keys = patrol[(phase + 2) % patrol.length];
              const arrowMap = { KeyW: 'ArrowUp', KeyS: 'ArrowDown', KeyA: 'ArrowLeft', KeyD: 'ArrowRight' };
              for (const key of p2keys) Input.keys.add(arrowMap[key]);
              if (i % 480 === 0) Input.dashQueued2 = true;
            }
            if (i % 420 === 0) Input.dashQueued = true;
          }
          update(1 / 60);
        }
        if (autoMove) Input.keys.clear();
        return { mode: G.mode, elapsed: G.elapsed, hp: G.player && G.player.hp, hp1: G.players[0] && G.players[0].hp, hp2: G.players[1] && G.players[1].hp, down1: G.players[0] && G.players[0].downed, down2: G.players[1] && G.players[1].downed, progress: Math.round(G.elapsed / Math.max(1, G.bossAt || BOSS_AT) * 100), level: G.level, kills: G.kills };
      };
      window.__BF_DEBUG = { G, Input, art: ART, startRun, recalcStats, addXp, spawnEnemy, spawnPickup, damageEnemy, update, damageSeal, killEnemy, spawnBoss, damageBase, updateBase, nearestTarget, nearestDirectionalAttackable, openTutorial, closeTutorial, queueItemTutorial, openItemTutorial, closeItemTutorial, hitTile, markCodex, renderCodex, makeSaveText, openCodexScreen, openSaveScreen, openLevelUp, chooseUpgrade, endRun, tick, draw: () => drawGame(performance.now() / 1000), U, defaultFocus: defaultPadFocus, pad: { poll: pollGamepad, p2: Input.gamepad2, slots: Input.padSlots, context: uiContext, focusables: padFocusables, move: movePadFocus, activate: activatePadFocus, back: backPadContext, scan: () => Array.from(gamepadList()).filter(Boolean).map(gp => ({ id: gp.id, mapping: gp.mapping, connected: gp.connected, axes: Array.from(gp.axes || []), buttons: Array.from(gp.buttons || []).map(b => ({ pressed: b.pressed, value: b.value })) })) } };
      Object.assign(window.__BF_DEBUG, { stageRoster, pickWaveType, phaseIndex, activeSpawnPoints });
      // Local-only boss lab: /?debug&boss=1 ... boss=12 starts that map at the boss gate.
      const bossParam = parseInt(new URLSearchParams(location.search).get('boss'), 10);
      if (bossParam >= 1 && bossParam <= MAPS.length) {
        G.campaign.unlocked = MAPS.length;
        startRun(bossParam - 1, false);
        G.spawnTimer = 999;
        G.sideSpawnTimer = 999;
        G.player.invuln = 999;
        G.core.hp = G.core.maxHp = 99999;
        G.elapsed = G.bossAt || BOSS_AT;
        G.bossSpawned = true;
        spawnBoss();
        if (G.boss) { G.boss.spawnTimer = 0; G.boss.spawnTotal = 0; }
      }
    }
    primeMenuAudio();
    ['pointerdown', 'keydown', 'touchstart'].forEach(type => {
      window.addEventListener(type, primeMenuAudio, { capture: true, passive: type === 'touchstart' });
    });
    requestAnimationFrame(loop);
    // Local/debug-only full codex: /?debug&codex=all (never writes bf.codex).
    const codexPreview = new URLSearchParams(location.search);
    if (codexPreview.has('debug') && codexPreview.get('codex') === 'all') {
      G.codexPreviewAll = true;
      openCodexScreen();
    }
  }

  function update(dt) {
    if (G.mode !== 'playing') return;
    G.time += dt;
    G.elapsed += dt;
    updateStatus(dt);
    if (G.mode !== 'playing') return;
    updateWaves(dt);
    if (G.mode !== 'playing') return;
    updateMapHazards(dt);
    updateBase(dt);
    updateSeals(dt);
    if (G.mode !== 'playing') return;
    updatePlayers(dt);
    if (G.mode !== 'playing') return;
    // Safety net: never leave a run alive with no active player.
    if (!activePlayers().length) { endRun(false, 'pilot'); return; }
    updateWeapons(dt);
    updateEnemies(dt);
    if (G.mode !== 'playing') return;
    updateHazards(dt);
    updateBullets(dt);
    updatePickups(dt);
    updateEffects(dt);
    if (G.mode === 'playing') maybeOpenLevelUp();
  }

  function drawGame(t) {
    if (!gameCtx) return;
    gameCtx.setTransform(1, 0, 0, 1, 0, 0);
    gameCtx.clearRect(0, 0, W, H);
    if (!G.player) return;
    drawWorld(t);
  }

  let lastFrame = 0;
  function loop(now) {
    pollGamepad();
    if (!lastFrame) lastFrame = now;
    const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    if (G.mode === 'playing') {
      G.accum += dt;
      let steps = 0;
      while (G.accum >= 1 / 60 && steps < 4) {
        update(1 / 60);
        G.accum -= 1 / 60;
        steps++;
        if (G.mode !== 'playing') { G.accum = 0; break; }
      }
    } else G.accum = 0;
    const t = now / 1000;
    if (G.mode === 'menu') drawMenu(t);
    else drawGame(t);
    requestAnimationFrame(loop);
  }

  window.BF_GAME = { init, startRun, returnToMenu };
})();
