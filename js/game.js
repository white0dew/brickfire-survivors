/* BRICKFIRE // main game. Canvas pixel renderer + roguelite systems. */
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
  const TOTAL_TIME = 360;
  const BOSS_AT = 285;
  const CORE_W = 64;
  const CORE_H = 64;
  const BASE_MAX_HP = 650;
  const BASE_RADIUS = 24;
  const BASE_RANGE = 315;
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

  const SPAWN_POINTS = [
    { cx: 2, cy: 0 }, { cx: 14, cy: 0 }, { cx: 27, cy: 0 },
    { cx: 2, cy: 9 }, { cx: 27, cy: 9 }
  ];

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
    pickups: [],
    hazards: [],
    seals: [],
    mines: [],
    strikes: [],
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
    eliteFlags: {},
    boss: null,
    bossSpawned: false,
    bossDefeated: false,
    victoryTimer: 0,
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
    autoPause: false,
    entityId: 1,
    lastEnemySound: 0,
    resolvingUpgrade: false,
    stats: { damage: 1, attackSpeed: 1, cdr: 1, area: 1, crit: .05, critMult: 1.8, pickup: 58, xpGain: 1, dropChance: .032 }
  };

  const Input = {
    keys: new Set(),
    mouse: { x: W / 2, y: H / 2, over: false, down: false },
    mobile: { active: false, x: 0, y: 0 },
    gamepad: { connected: false, id: '', x: 0, y: 0, aimX: 0, aimY: 0, aimActive: false, fire: false, selectedCard: 0, prevButtons: [], focusEl: null, uiKey: '', uiDirX: 0, uiDirY: 0, uiRepeatAt: 0 },
    dashQueued: false,
    dashQueued2: false
  };

  const U = {};
  let gameCtx = null, menuCtx = null;
  let groundCache = null, menuCache = null;
  let menuParticles = [];
  let menuSelectedPulse = 0;
  let lastHudSignature = '';

  /* ---------------- map ---------------- */
  function createPlayer(x, y, index) {
    const p2 = index === 1;
    const tank = TANKS.find(t => t.id === G.tankIds[index]) || TANKS[0];
    const pal = tank.colors;
    return {
      index,
      label: p2 ? 'P2' : 'P1',
      tankId: tank.id,
      x, y,
      bodyAngle: -Math.PI / 2, turretAngle: -Math.PI / 2,
      hp: PLAYER_BASE.maxHp, maxHp: PLAYER_BASE.maxHp,
      shield: 0, shieldMax: 0, shieldRecharge: 0, noDamageTime: 0,
      radius: PLAYER_BASE.radius, speed: PLAYER_BASE.speed,
      fireCd: .15, invincible: 0, dashTimer: 0, dashCd: 0, dashMax: 2.3,
      moving: false, moveX: 0, moveY: 0, vx: 0, vy: 0, trackPhase: 0, recoil: 0,
      hitFlash: 0, lastX: x, lastY: y, alive: true, downed: false, reviveProgress: 0, secondWindUsed: false,
      weaponCds: {}, droneState: [], flameTimer: 0, mineTimer: 0, arcTimer: 1.3, orbitalTimer: 2.2,
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
    G.core = {
      x: coreX, y: coreY, w: CORE_W, h: CORE_H,
      cx: coreX + CORE_W / 2, cy: coreY + CORE_H / 2,
      hp: BASE_MAX_HP, maxHp: BASE_MAX_HP, alive: true, radius: BASE_RADIUS,
      hitFlash: 0, noDamage: 0, turretAngle: -Math.PI / 2, turretCd: .7, turrets: 0, repairRate: 6, repairDelay: 7
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

  function collidesWorld(x, y, r, includeCore = true) {
    if (x - r < 0 || y - r < 0 || x + r > W || y + r > H) return true;
    const minX = Math.floor((x - r) / TILE), maxX = Math.floor((x + r) / TILE);
    const minY = Math.floor((y - r) / TILE), maxY = Math.floor((y + r) / TILE);
    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        const t = G.tiles[ty] && G.tiles[ty][tx];
        if (!t) continue;
        if (t.type === 'brick' || t.type === 'steel' || t.type === 'water') return true;
      }
    }
    if (includeCore && G.core && circleHitsRect(x, y, r, G.core.x, G.core.y, G.core.w, G.core.h)) return true;
    return false;
  }

  function buildSeals(index) {
    G.seals = [];
    const ids = (SEAL_TANKS_BY_STAGE[index] || []);
    if (!ids.length) return;
    const baseSpots = [
      [3.5, 3.5], [COLS - 4.5, 3.5], [3.5, ROWS - 4.5], [COLS - 4.5, ROWS - 4.5],
      [COLS / 2, 3.2], [COLS / 2, ROWS - 3.7], [3.5, ROWS / 2], [COLS - 4.5, ROWS / 2],
      [7.5, 6.5], [COLS - 8.5, 6.5], [7.5, ROWS - 6.5], [COLS - 8.5, ROWS - 6.5]
    ];
    const candidates = baseSpots.slice();
    for (let ty = 2; ty < ROWS - 2; ty++) {
      for (let tx = 2; tx < COLS - 2; tx++) {
        const tile = G.tiles[ty] && G.tiles[ty][tx];
        if (!tile || (tile.type !== 'ground' && tile.type !== 'rubble')) continue;
        candidates.push([tx + .5, ty + .5]);
      }
    }
    const used = [];
    const spawn = G.player || G.players[0] || { x: W / 2, y: H / 2 };
    for (const tankId of ids) {
      const tank = TANKS.find(t => t.id === tankId);
      if (!tank) continue;
      let chosen = null;
      for (const [cx, cy] of candidates) {
        const x = cx * TILE, y = cy * TILE;
        if (collidesWorld(x, y, 24, true)) continue;
        if (dist(x, y, spawn.x, spawn.y) < 120) continue;
        if (dist(x, y, G.core.cx, G.core.cy) < 120) continue;
        if (used.some(p => dist(x, y, p.x, p.y) < 86)) continue;
        chosen = { x, y };
        break;
      }
      if (!chosen) continue;
      used.push(chosen);
      const maxHp = 150 + index * 18;
      G.seals.push({
        tankId: tank.id,
        tankIndex: TANKS.indexOf(tank),
        x: chosen.x, y: chosen.y, radius: 17,
        hp: maxHp, maxHp, hitFlash: 0, dead: false, seed: rand(TAU), ring: rand(TAU)
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
      const ctx = gameCtx;
      ctx.save();
      ctx.translate(seal.x, seal.y);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
      g.addColorStop(0, hexA(c.core, .22 * pulse));
      g.addColorStop(1, hexA(c.core, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = hexA(c.core, .35 + pulse * .25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 22 + Math.sin(t * 2 + seal.ring) * 2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = hexA(c.core, .2); ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 14;
      ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(3,8,6,.92)'; ctx.fillRect(-14, -14, 28, 28);
      ctx.fillStyle = hexA(c.dark, .95); ctx.fillRect(-12, -12, 24, 24);
      ctx.fillStyle = seal.hitFlash > 0 ? '#fff6d8' : c.core; ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = c.light; ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = 'rgba(4,10,8,.58)'; ctx.fillRect(-19, -31, 38, 4);
      ctx.fillStyle = c.core; ctx.fillRect(-19, -31, 38 * pct, 4);
      ctx.font = '7px Silkscreen, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = hexA(c.light, .9); ctx.fillText(`M-${String(seal.tankIndex + 1).padStart(2, '0')}`, 0, -36);
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
    // checker slabs
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = hexA(p.groundAlt, .5);
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
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
    // spawn plates
    for (const sp of SPAWN_POINTS) {
      const x = (sp.cx + .5) * TILE, y = (sp.cy + .5) * TILE;
      ctx.strokeStyle = hexA(p.accent, .22); ctx.lineWidth = 1;
      ctx.strokeRect(x - 11.5, y - 11.5, 23, 23);
      ctx.fillStyle = hexA(p.accent, .08); ctx.fillRect(x - 9, y - 9, 18, 18);
    }
    // large floor markings
    ctx.save();
    ctx.font = 'bold 92px Silkscreen, monospace';
    ctx.fillStyle = hexA(p.steelLight, .035);
    ctx.fillText('07', 42, H - 50);
    ctx.font = '9px Silkscreen, monospace';
    ctx.fillStyle = hexA(p.steelLight, .12);
    ctx.fillText('BAY / 07 / ARMORED DIVISION', 44, H - 30);
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
    // defense towers are added only by sentry pickups
    const turretCount = c.turrets || 0;
    const turretMounts = [[0, -22], [22, 0], [0, 22], [-22, 0]];
    for (let i = 0; i < turretCount; i++) {
      const [ox, oy] = turretMounts[i % turretMounts.length];
      ctx.save();
      ctx.translate(32 + ox, 32 + oy);
      ctx.rotate(c.turretAngle || -Math.PI / 2);
      ctx.fillStyle = '#06100d'; ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#3d8c7d'; ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#06100d'; ctx.fillRect(-2, -12, 4, 12);
      ctx.fillStyle = '#8fffe6'; ctx.fillRect(-1, -10, 2, 2);
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
    ctx.fillText('BASE CORE', c.cx, c.y - 6.5);
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

  function drawBoss(ctx, e, t) {
    const colors = { body: e.hitFlash > 0 ? '#fff' : e.color, light: e.hitFlash > 0 ? '#fff' : e.light, dark: e.dark, core: e.coreColor };
    // Keep the giant silhouette readable against the dark arena floor.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,79,88,.32)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, 56 + Math.sin(t * 3) * 3, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,79,88,.045)';
    ctx.beginPath(); ctx.arc(e.x, e.y, 60, 0, TAU); ctx.fill();
    ctx.restore();
    drawTankShadow(ctx, e.x, e.y, 4.6);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.bodyAngle + Math.PI / 2);
    const s = 1.45;
    ctx.scale(s, s);
    // massive treads
    ctx.fillStyle = '#090b0a'; ctx.fillRect(-45, -44, 15, 88); ctx.fillRect(30, -44, 15, 88);
    ctx.fillStyle = '#2a1c1c'; ctx.fillRect(-42, -41, 10, 82); ctx.fillRect(32, -41, 10, 82);
    for (let y = -38; y < 38; y += 7) {
      ctx.fillStyle = y % 14 === 0 ? '#6a4b3f' : '#1b1413';
      ctx.fillRect(-42, y, 10, 3); ctx.fillRect(32, y, 10, 3);
    }
    // body
    ctx.fillStyle = '#080b09'; ctx.fillRect(-31, -40, 62, 80);
    ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#4a3238'; ctx.fillRect(-28, -41, 56, 82);
    ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.color; ctx.fillRect(-25, -37, 50, 76);
    ctx.strokeStyle = 'rgba(255,216,202,.36)'; ctx.lineWidth = 2; ctx.strokeRect(-30, -41, 60, 82);
    ctx.fillStyle = hexA(e.light, .38); ctx.fillRect(-23, -36, 46, 3);
    ctx.fillStyle = '#201417'; ctx.fillRect(-23, 26, 46, 9);
    ctx.fillStyle = '#a37b60';
    for (let i = 0; i < 7; i++) ctx.fillRect(-20 + i * 6, 28, 3, 2);
    // front spikes
    ctx.fillStyle = '#d1a272';
    ctx.fillRect(-18, -46, 5, 7); ctx.fillRect(13, -46, 5, 7); ctx.fillRect(-4, -47, 8, 8);
    // center core
    const pulse = .65 + Math.sin(t * 4) * .25;
    ctx.fillStyle = '#130b0d'; ctx.fillRect(-14, -12, 28, 28);
    ctx.fillStyle = hexA(e.coreColor, .2 + pulse * .2); ctx.fillRect(-11, -9, 22, 22);
    ctx.fillStyle = hexA(e.coreColor, .55); ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = '#ffe2c9'; ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = e.coreColor; ctx.fillRect(-2, -2, 4, 4);
    // side cannons
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#120c0d'; ctx.fillRect(side * 37 - 8, -14, 16, 30);
      ctx.fillStyle = '#4e3236'; ctx.fillRect(side * 37 - 6, -12, 12, 24);
    }
    ctx.restore();
    // screen-space marker: stays readable while the hull rotates
    const labelY = Math.max(8, e.y - 74);
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,7,.9)';
    ctx.fillRect(e.x - 52, labelY, 104, 13);
    ctx.strokeStyle = 'rgba(255,79,88,.7)'; ctx.lineWidth = 1;
    ctx.strokeRect(e.x - 52.5, labelY - .5, 105, 14);
    ctx.fillStyle = '#ff8a8d';
    ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center';
    ctx.fillText('SIEGE // TITAN', e.x, labelY + 9);
    ctx.fillStyle = 'rgba(255,79,88,.9)';
    ctx.beginPath(); ctx.moveTo(e.x - 5, labelY + 15); ctx.lineTo(e.x + 5, labelY + 15); ctx.lineTo(e.x, labelY + 21); ctx.closePath(); ctx.fill();
    ctx.restore();
    // turrets rotate independently around center
    for (const [angle, offset, len] of [[e.turretAngle, 0, 42], [e.turretAngle + .22, -12, 30], [e.turretAngle - .28, 12, 34]]) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(angle);
      ctx.scale(s, s);
      ctx.fillStyle = '#080a09'; ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = '#76515a'; ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = '#221418'; ctx.fillRect(0, -8, len + 8, 5);
      ctx.fillStyle = '#9f6d72'; ctx.fillRect(0, -7, len + 5, 2);
      ctx.fillStyle = '#080a09'; ctx.fillRect(len - 4, -9, 9, 8);
      ctx.fillStyle = hexA(e.coreColor, .85); ctx.fillRect(len, -8, 2, 2);
      ctx.restore();
    }
    // elite boss glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 44);
    g.addColorStop(0, hexA(e.coreColor, .22)); g.addColorStop(1, hexA(e.coreColor, 0));
    ctx.fillStyle = g; ctx.fillRect(e.x - 50, e.y - 50, 100, 100);
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
      // mini-boss nameplate, kept above the swarm
      ctx.fillStyle = 'rgba(4,8,7,.88)'; ctx.fillRect(e.x - w / 2, e.y - 50, w, 11);
      ctx.strokeStyle = sealBoss ? 'rgba(95,240,206,.65)' : 'rgba(255,181,45,.55)'; ctx.lineWidth = 1; ctx.strokeRect(e.x - w / 2 + .5, e.y - 49.5, w - 1, 10);
      ctx.fillStyle = sealBoss ? '#8fffe6' : '#ffd176'; ctx.font = '7px Silkscreen, monospace'; ctx.textAlign = 'center';
      ctx.fillText(sealBoss ? `SEAL // ${e.sealLabel || 'GUARD'}` : 'BREAKER // ELITE', e.x, e.y - 42);
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
      drawTankAt(ctx, p.x, p.y, p.bodyAngle, p.turretAngle, { body: '#3a2520', light: '#8f6a53', dark: '#160d0a', core: '#ff6858' }, 1.08, p.trackPhase, { recoil: 0, barrelLen: 21, player: true });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,88,74,.55)'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]); ctx.lineDashOffset = t * 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, 24 + Math.sin(t * 3) * 2, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(4,8,7,.82)'; ctx.fillRect(p.x - 22, p.y - 39, 44, 11);
      ctx.fillStyle = '#ff6858'; ctx.font = '6px Silkscreen, monospace'; ctx.textAlign = 'center';
      ctx.fillText(`P${p.index + 1} DOWN`, p.x, p.y - 31);
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
    drawTankAt(ctx, p.x, p.y, p.bodyAngle, p.turretAngle, colors, 1.12, p.trackPhase, {
      recoil: p.recoil, barrelLen: tankId === 'railgun' ? 27 : tankId === 'twin' ? 19 : 21,
      barrelWide: G.weapons.cannon >= 4, twin: G.weapons.cannon >= 6 || tankId === 'twin',
      heavy: tankId === 'bastion' || tankId === 'juggernaut', player: true
    });
    ctx.globalAlpha = 1;
    // shield bubble
    if (p.shield > 0 || p.invincible > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = 22 + Math.sin(t * 4) * 1.5;
      ctx.strokeStyle = p.invincible > 0 ? hexA('#ffb52d', .55) : hexA('#5ff0ce', .45);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = hexA(p.invincible > 0 ? '#ffb52d' : '#5ff0ce', .045);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // aim reticle
    if (Input.mouse.down && Input.mouse.over) {
      const mx = Input.mouse.x, my = Input.mouse.y;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hexA('#ffb52d', .5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mx, my, 8, 0, TAU); ctx.stroke();
      ctx.fillStyle = hexA('#ffb52d', .7); ctx.fillRect(mx - 1, my - 1, 2, 2);
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
      // crisp shell body with a dark pixel outline
      ctx.globalCompositeOperation = 'source-over';
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
      ctx.restore();
    }
  }

  function drawMineShape(ctx, m, t) {
    ctx.save(); ctx.translate(m.x, m.y);
    const blink = m.arm <= 0 ? .6 + Math.sin(t * 9 + m.seed) * .35 : .2;
    ctx.fillStyle = '#060a08'; ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = '#7b6a31'; ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = '#c8ab4b'; ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = '#1a1c15'; ctx.fillRect(-3, -3, 6, 6);
    ctx.fillStyle = hexA('#ffcf5a', blink); ctx.fillRect(-1, -1, 2, 2);
    ctx.fillStyle = '#0a0c09'; ctx.fillRect(-9, -1, 2, 2); ctx.fillRect(7, -1, 2, 2); ctx.fillRect(-1, -9, 2, 2); ctx.fillRect(-1, 7, 2, 2);
    ctx.restore();
  }

  function drawHazards(t) {
    const ctx = gameCtx;
    // flame pools
    for (const f of G.hazards) {
      const k = f.life / f.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const radius = f.radius * (1 + Math.sin(t * 7 + f.seed) * .08);
      const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, radius);
      g.addColorStop(0, hexA('#fff1b0', .55 * k));
      g.addColorStop(.25, hexA('#ff8a2b', .48 * k));
      g.addColorStop(.7, hexA('#c52f1c', .16 * k));
      g.addColorStop(1, hexA('#c52f1c', 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, radius, 0, TAU); ctx.fill();
      ctx.fillStyle = hexA('#ffcf6b', .55 * k);
      for (let i = 0; i < 3; i++) {
        const a = f.seed + i * 2.1 + t * 1.8;
        ctx.fillRect(f.x + Math.cos(a) * radius * .5, f.y + Math.sin(a) * radius * .4 - 2, 3, 3);
      }
      ctx.restore();
    }
    // mines
    for (const m of G.mines) drawMineShape(ctx, m, t);
    // orbital warnings & beams
    for (const s of G.strikes) {
      if (s.state === 'warn') {
        const k = 1 - s.timer / s.delay;
        ctx.save();
        ctx.strokeStyle = hexA('#b896ff', .5 + Math.sin(t * 15) * .2); ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]); ctx.lineDashOffset = t * 20;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.radius * (1.2 - k * .2), 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = hexA('#b896ff', .22); ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, TAU); ctx.stroke();
        ctx.fillStyle = hexA('#b896ff', .06); ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, TAU); ctx.fill();
        ctx.fillStyle = hexA('#b896ff', .65); ctx.fillRect(s.x - 1, s.y - 12, 2, 24); ctx.fillRect(s.x - 12, s.y - 1, 24, 2);
        ctx.restore();
      }
    }
  }

  function drawEffects(t) {
    const ctx = gameCtx;
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
        ctx.fillStyle = g; ctx.fillRect(fx.x - r, fx.y - r, r * 2, r * 2); ctx.restore();
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
        } else if (p.type === 'turret') {
          ctx.fillRect(-5, -3, 10, 7); ctx.fillRect(-2, -7, 4, 5); ctx.fillRect(-1, 4, 2, 3);
          ctx.fillStyle = '#06100d'; ctx.fillRect(-3, -1, 6, 2);
        }
        ctx.restore();
        const near = nearestPlayer(p.x, p.y) || G.player;
        if (near && dist(near.x, near.y, p.x, p.y) < 80) {
          ctx.save();
          ctx.font = '7px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
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
    for (const e of G.enemies) units.push({ y: e.y, draw: () => drawEnemy(e, t) });
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
    ctx.fillText(`BAY 07 // ${(G.tank || TANKS[0]).en} MAINTENANCE CRADLE`, 47, 500);
    ctx.fillStyle = hexA(p.accent, .45);
    ctx.fillText('CAUTION // LIVE ORDNANCE', 47, 516);
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
    return Math.floor(4 + (level - 1) * 3.8 + Math.pow(level, 1.38) * 1.7);
  }

  function startRun(index, coop) {
    const unlocked = G.campaign ? G.campaign.unlocked : 1;
    index = clamp(index | 0, 0, Math.min(MAPS.length - 1, Math.max(0, unlocked - 1)));
    G.mode = 'playing';
    G.twoPlayer = coop !== undefined ? !!coop : !!G.coopSelected;
    G.coopSelected = G.twoPlayer;
    G.lastCoop = G.twoPlayer;
    G.tankIds = readTankIds();
    G.tank = TANKS.find(t => t.id === G.tankIds[0]) || TANKS[0];
    G.tankId = G.tank.id;
    G.arenaIndex = index;
    G.arena = MAPS[index];
    G.difficulty = stageDifficulty(G.campaign || readCampaign(), index);
    G.difficultyMod = difficultyData(G.difficulty).mod;
    G.runMod = buildRunMod(G.arena.mod, G.difficulty);
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
    G.spawnTimer = 1.1;
    G.eliteFlags = {};
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
    G.rerolls = 2;
    G.currentChoices = [];
    G.loadoutDirty = true;
    G.hudTimer = 0;
    G.shake = 0; G.shakeTime = 0; G.flash = 0;
    G.totalDamage = 0;
    G.deadReason = '';
    G.secondWindUsed = false;
    G.tutorialStep = 0;
    G.tutorialTimer = 6;
    G.autoPause = false;
    G.entityId = 1;
    G.lastEnemySound = 0;
    G.resolvingUpgrade = false;
    G.lastPlayerCell = { x: 0, y: 0 };
    lastHudSignature = '';
    Input.keys.clear();
    Input.mouse.down = false;
    Input.dashQueued = false; Input.dashQueued2 = false;
    Input.gamepad.selectedCard = 0;
    Input.mobile = { active: false, x: 0, y: 0 };
    loadArena(index);
    // Give the player one nearby sentry pickup so the base has a clear
    // defensive choice from the first minute instead of firing for free.
    if (G.player) spawnPickup('turret', clamp(G.player.x + 110, 24, W - 24), clamp(G.player.y + 20, 24, H - 24), 0);
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
    if (U.codexScreen) U.codexScreen.classList.add('hidden');
    if (U.saveScreen) U.saveScreen.classList.add('hidden');
    U.bossHud.classList.add('is-hidden');
    const diff = difficultyData(G.difficulty);
    U.sectorLabel.textContent = `${MAPS[index].sector} / ${MAPS[index].en} · ${diff.name}`;
    U.objectiveLabel.textContent = '生存至撤离 · 06:00';
    U.sideTip.textContent = G.twoPlayer
      ? `P1 // ${G.tank.name} · P2 // ${tankData(G.players[1]).name}`
      : `底盘 // ${G.tank.name} · ${G.tank.role}`;
    if (U.pilotHudName) U.pilotHudName.textContent = G.twoPlayer
      ? `P1 ${G.tank.name.replace(/^.*?M-/, 'M-')} // P2 ${tankData(G.players[1]).name.replace(/^.*?M-/, 'M-')}`
      : G.tank.name.replace(/^.*?M-/, 'M-');
    if (U.visualUnit) U.visualUnit.textContent = `${G.tank.name} «${G.tank.en}»`;
    if (U.visualUnitSub) U.visualUnitSub.textContent = `MODULAR SIEGE PLATFORM / ${MAPS[index].sector}`;
    if (U.coopPanel) U.coopPanel.classList.toggle('is-hidden', !G.twoPlayer);
    if (U.deckHint) U.deckHint.innerHTML = G.twoPlayer ? '<span>P1 WASD + 鼠标</span> 移动/瞄准 <b>/</b> <span>P2 左摇杆/方向键 + 右摇杆</span> 移动/瞄准 <b>/</b> <span>SPACE / A</span> 冲刺' : '<span>WASD</span> 移动 <b>/</b> <span>鼠标 / 右摇杆</span> 瞄准 <b>/</b> <span>SPACE / A</span> 冲刺 <b>/</b> <span>ESC / START</span> 暂停';
    const p = U.primaryIcon; if (p) { p.innerHTML = '<canvas data-icon="cannon" data-color="#ffb52d" data-size="36"></canvas>'; ICONS.applyAll(p); }
    renderLoadout();
    updateHUD();
    AUDIO.init();
    AUDIO.startMusic();
    AUDIO.setIntensity(0);
    showToast(G.twoPlayer
      ? `P1 ${G.tank.name} // P2 ${tankData(G.players[1]).name} 已部署 // 拾取哨戒炮塔`
      : `${G.tank.name} 已部署 // ${G.tank.trait} // 拾取哨戒炮塔`, 'cyan');
    setTimeout(() => {
      if (G.mode !== 'playing') return;
      if (G.twoPlayer) showToast(isTouchUI() ? '手机双人建议外接手柄 · 靠近倒地队友可救援' : 'P1 键鼠 / P2 手柄 · 靠近倒地队友可救援');
      else showToast(isTouchUI() ? '左侧摇杆移动 · 自动索敌 · 右下 DASH 冲刺' : 'WASD / 左摇杆移动 · 自动索敌 · SPACE / A 冲刺');
    }, 2600);
    setTimeout(() => { if (G.mode === 'playing') showToast('收集青色余烬，升级你的钢铁构筑'); }, 5600);
    if (G.seals.length) setTimeout(() => {
      if (G.mode === 'playing') showToast(`SEAL // 本关 ${G.seals.length} 座封印核心 · 击破核心召唤守卫`, 'red');
    }, 4200);
  }

  function recalcStats(fullHeal) {
    const armorLvl = G.passives.armor || 0;
    const engineLvl = G.passives.engine || 0;
    const loaderLvl = G.passives.loader || 0;
    const magnetLvl = G.passives.magnet || 0;
    const warheadLvl = G.passives.warhead || 0;
    const coolingLvl = G.passives.cooling || 0;
    const critLvl = G.passives.crit || 0;
    const salvageLvl = G.passives.salvage || 0;
    const overdriveLvl = G.passives.overdrive || 0;
    const shieldLvl = G.passives.shield || 0;
    const base = {
      damage: 1 + overdriveLvl * .08 + warheadLvl * .04,
      attackSpeed: 1 + loaderLvl * .07,
      cdr: Math.max(.45, 1 - coolingLvl * .07),
      area: 1 + warheadLvl * .1,
      crit: .05 + critLvl * .06,
      critMult: 1.8,
      pickup: PLAYER_BASE.pickupRadius * (1 + magnetLvl * .22),
      xpGain: 1 + salvageLvl * .12 + magnetLvl * .04,
      dropChance: .025 + salvageLvl * .015
    };
    for (const p of G.players || []) {
      const tank = p.tank || (p.index === 1 ? TANKS.find(t => t.id === G.tankIds[1]) : G.tank) || TANKS[0];
      p.tank = tank;
      const st = {
        damage: base.damage * (tank.damageMul || 1),
        attackSpeed: base.attackSpeed * (tank.attackSpeedMul || 1),
        cdr: Math.max(.45, base.cdr * (tank.cdrMul || 1)),
        area: base.area * (tank.areaMul || 1),
        crit: base.crit + (tank.critAdd || 0),
        critMult: 1.8,
        pickup: base.pickup * (tank.pickupMul || 1),
        xpGain: base.xpGain * (tank.xpMul || 1),
        dropChance: base.dropChance + (tank.dropAdd || 0)
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
      p.dashMax = 2.3 * st.cdr * (tank.dashCdMul || 1);
      p.radius = PLAYER_BASE.radius;
      p.bodyColor = tank.colors.body;
      p.bodyLight = tank.colors.light;
      p.bodyDark = tank.colors.dark;
      p.coreColor = tank.colors.core;
    }
    const first = (G.players || [])[0];
    G.stats = first && first.stats ? first.stats : base;
  }

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

  function baseTarget() {
    if (!G.core || !G.core.alive || G.core.hp <= 0) return null;
    return {
      index: -1, isBase: true, x: G.core.cx, y: G.core.cy,
      radius: G.core.radius, alive: true, downed: false, moveX: 0, moveY: 0, speed: 0
    };
  }

  function nearestTarget(x, y) {
    let best = nearestPlayer(x, y);
    let bd = best ? dist2(x, y, best.x, best.y) : Infinity;
    const b = baseTarget();
    if (b) {
      const d = dist2(x, y, b.x, b.y);
      if (d < bd) { bd = d; best = b; }
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

  function autoLineClear(x1, y1, x2, y2) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.ceil(len / 10));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tile = tileAt(lerp(x1, x2, t), lerp(y1, y2, t));
      if (tile.type === 'brick' || tile.type === 'steel') return false;
    }
    return true;
  }

  // Auto-fire is intentionally cover-aware: it will not spend the player's
  // cover-breaking shots on a target behind a wall. Manual aim still breaks walls.
  function nearestAutoEnemy(p, range) {
    const r2 = range * range;
    const candidates = [];
    for (const e of G.enemies) {
      if (e.dead || e.spawnTimer > 0) continue;
      const d = dist2(p.x, p.y, e.x, e.y);
      if (d < r2) candidates.push({ e, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    for (const c of candidates) {
      if (autoLineClear(p.x, p.y, c.e.x, c.e.y)) return c.e;
    }
    return null;
  }

  function fused(id) {
    return !!(G.fusions && G.fusions[id]);
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
    const oldX = p.x, oldY = p.y;
    const nx = p.x + vx * dt;
    if (!collidesWorld(nx, p.y, moveR)) p.x = nx;
    else p.vx = 0;
    const ny = p.y + vy * dt;
    if (!collidesWorld(p.x, ny, moveR)) p.y = ny;
    else p.vy = 0;
    // Corner assist: when a diagonal input jams on a corner, nudge along the open axis.
    if (p.x === oldX && p.y === oldY && Math.abs(vx) > 8 && Math.abs(vy) > 8) {
      const sx = Math.sign(vx), sy = Math.sign(vy);
      for (let step = 2; step <= 6; step += 2) {
        if (!collidesWorld(p.x + sx * step, p.y, moveR) && !collidesWorld(p.x + sx * step, p.y + sy * step, moveR)) {
          p.x += sx * step; break;
        }
        if (!collidesWorld(p.x, p.y + sy * step, moveR) && !collidesWorld(p.x + sx * step, p.y + sy * step, moveR)) {
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
        showToast(`P${p.index + 1} 已重启 // 装甲恢复 35%`, 'cyan');
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
    const idx = p.index || 0;
    const wantDash = idx === 0 ? Input.dashQueued : Input.dashQueued2;
    if (wantDash) {
      if (idx === 0) Input.dashQueued = false; else Input.dashQueued2 = false;
      if (p.dashCd <= .02 && p.alive) {
        p.dashCd = p.dashMax;
        p.dashTimer = .2;
        p.invincible = Math.max(p.invincible, .34);
        AUDIO.dash(); rumble(.3, 70);
        addShake(2.5, .12);
        for (let i = 0; i < 9; i++) addParticle(p.x + rand(10, -10), p.y + rand(10, -10), rand(120, -120), rand(120, -120), '#5ff0ce', 'spark', .4, 1.5);
        if (G.weapons.flame) addFlamePool(p.x, p.y, true, p);
      }
    }
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
        ix += Input.mobile.x + Input.gamepad.x; iy += Input.mobile.y + Input.gamepad.y;
      } else {
        ix += Input.mobile.x; iy += Input.mobile.y;
      }
    } else {
      if (Input.keys.has('ArrowLeft')) ix -= 1;
      if (Input.keys.has('ArrowRight')) ix += 1;
      if (Input.keys.has('ArrowUp')) iy -= 1;
      if (Input.keys.has('ArrowDown')) iy += 1;
      if (Input.gamepad.connected) { ix += Input.gamepad.x; iy += Input.gamepad.y; }
    }
    const mag = Math.hypot(ix, iy);
    const sp = p.speed * (p.dashTimer > 0 ? 2.35 : 1);
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
      p.moveX = p.vx / actualSpeed; p.moveY = p.vy / actualSpeed;
      if (chance(dt * 6)) {
        addParticle(p.x - p.moveX * 12 + rand(4, -4), p.y + 7, rand(-12, 12), rand(2, -12), hexA(G.arena.palette.steelLight, .55), 'smoke', .5, 2);
      }
    } else {
      p.moving = false; p.moveX = 0; p.moveY = 0;
      if (mag <= .08) { p.vx = 0; p.vy = 0; }
    }
    // aim: P1 mouse, P2 right stick; otherwise both auto-lock
    let aimAngle = p.turretAngle;
    let aimPoint = null;
    const mouseManual = idx === 0 && Input.mouse.down && Input.mouse.over;
    const padManual = (idx === 0 ? !G.twoPlayer : true) && Input.gamepad.connected && Input.gamepad.aimActive;
    const forceFire = idx === 0 ? (!G.twoPlayer && Input.gamepad.fire) : (Input.gamepad.connected && Input.gamepad.fire);
    const manual = mouseManual || padManual;
    const autoTarget = manual ? null : nearestAutoEnemy(p, 560);
    if ((p.index || 0) === 0) G.autoHold = !manual && !autoTarget && !!nearestEnemy(p.x, p.y, 560);
    if (mouseManual) {
      aimAngle = Math.atan2(Input.mouse.y - p.y, Input.mouse.x - p.x);
    } else if (padManual) {
      aimPoint = { x: p.x + Input.gamepad.aimX * 620, y: p.y + Input.gamepad.aimY * 620 };
      aimAngle = Math.atan2(aimPoint.y - p.y, aimPoint.x - p.x);
    } else if (autoTarget) {
      const lead = Math.min(.55, dist(p.x, p.y, autoTarget.x, autoTarget.y) / 620);
      const vx = autoTarget.moving ? Math.cos(autoTarget.bodyAngle) * autoTarget.speed : 0;
      const vy = autoTarget.moving ? Math.sin(autoTarget.bodyAngle) * autoTarget.speed : 0;
      aimPoint = { x: autoTarget.x + vx * lead, y: autoTarget.y + vy * lead };
      aimAngle = Math.atan2(aimPoint.y - p.y, aimPoint.x - p.x);
    } else if (p.moving) {
      aimAngle = p.bodyAngle;
    }
    p.turretAngle = angleLerp(p.turretAngle, aimAngle, dt * (manual ? 18 : 10));
    if (p.fireCd <= 0) {
      if (mouseManual) fireCannon(Input.mouse.x, Input.mouse.y, p);
      else if (padManual) fireCannon(aimPoint.x, aimPoint.y, p);
      else if (autoTarget) fireCannon(aimPoint.x, aimPoint.y, p);
      else if (forceFire) fireCannon(p.x + Math.cos(p.turretAngle) * 300, p.y + Math.sin(p.turretAngle) * 300, p);
    }
  }

  function fireCannon(tx, ty, p) {
    if (!p) p = G.player;
    const tank = tankData(p);
    const st = statsFor(p);
    const lvl = G.weapons.cannon || 1;
    const w = WEAPONS.cannon.levels[Math.min(7, lvl - 1)];
    const angle = Math.atan2(ty - p.y, tx - p.x);
    const fusion = fused('cannon');
    const shots = (w.shots || 1) + (tank.extraShots || 0) + (fusion ? 1 : 0);
    const spread = shots > 1 ? .055 : 0;
    const pierce = (w.pierce || 0) + (tank.pierceAdd || 0) + (fusion ? 2 : 0);
    const explode = (w.explode ? w.explode * st.area : 0) + (tank.explodeAdd ? tank.explodeAdd * st.area : 0) + (fusion ? 38 * st.area : 0);
    for (let i = 0; i < shots; i++) {
      const a = angle + (i - (shots - 1) / 2) * spread;
      const crit = chance(st.crit);
      const dmg = w.damage * st.damage * (crit ? st.critMult : 1);
      const mx = p.x + Math.cos(a) * 25, my = p.y + Math.sin(a) * 25;
      G.bullets.push({
        x: mx, y: my, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
        radius: 3, damage: dmg, crit, pierce, explode, owner: p,
        life: 1.6, maxLife: 1.6, color: '#ffd15c', trail: 15, enemy: false, hit: new Set()
      });
    }
    p.fireCd = Math.max(.09, w.interval / st.attackSpeed * st.cdr);
    p.recoil = 1;
    addEffect({ type: 'muzzle', x: p.x + Math.cos(angle) * 26, y: p.y + Math.sin(angle) * 26, life: .12, maxLife: .12, color: '#ffd56a' });
    for (let i = 0; i < 4; i++) addParticle(p.x + Math.cos(angle) * 28 + rand(3, -3), p.y + Math.sin(angle) * 28 + rand(3, -3), Math.cos(angle) * rand(120, 30), Math.sin(angle) * rand(120, 30), '#ffcc6b', 'spark', .22, 1.6);
    AUDIO.shoot();
  }

  function spawnBulletFromDrone(ds, target, lvl, p) {
    const w = WEAPONS.drone.levels[Math.min(7, lvl - 1)];
    const st = statsFor(p);
    const a = Math.atan2(target.y - ds.y, target.x - ds.x);
    const crit = chance(st.crit);
    G.bullets.push({
      x: ds.x, y: ds.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, radius: 2.3,
      damage: w.damage * st.damage * (crit ? st.critMult : 1) * (fused('drone') ? 1.3 : 1), crit, pierce: 0, explode: 0, owner: p,
      life: .9, maxLife: .9, color: '#5ff0ce', trail: 10, enemy: false, hit: new Set()
    });
    addEffect({ type: 'muzzle', x: ds.x, y: ds.y, life: .08, maxLife: .08, color: '#5ff0ce' });
  }

  function addFlamePool(x, y, force, p) {
    const lvl = G.weapons.flame || 0;
    if (!lvl) return;
    const w = WEAPONS.flame.levels[Math.min(7, lvl - 1)];
    const st = statsFor(p);
    const tank = tankData(p);
    const fusion = fused('flame');
    if (G.hazards.length > 90) G.hazards.shift();
    G.hazards.push({
      x, y, radius: w.radius * st.area * (fusion ? 1.3 : 1), damage: w.damage * st.damage * (fusion ? 1.3 : 1),
      life: w.life, maxLife: w.life, tick: .24, seed: rand(TAU), force: !!force, owner: p
    });
  }

  function updateWeapons(dt) {
    for (const p of G.players || []) {
      if (p.alive && !p.downed) updateWeaponsFor(p, dt);
    }
  }

  function updateWeaponsFor(p, dt) {
    const st = statsFor(p);
    // drone swarm
    const droneLvl = G.weapons.drone || 0;
    if (droneLvl) {
      const w = WEAPONS.drone.levels[Math.min(7, droneLvl - 1)];
      const count = w.count + (tankData(p).droneAdd || 0) + (fused('drone') ? 1 : 0);
      while (p.droneState.length < count) p.droneState.push({ phase: (p.droneState.length / count) * TAU, cd: .25 + p.droneState.length * .16, x: p.x, y: p.y, fireFlash: 0 });
      if (p.droneState.length > count) p.droneState.length = count;
      for (let i = 0; i < p.droneState.length; i++) {
        const ds = p.droneState[i];
        const angle = G.animTime * 1.4 + ds.phase;
        ds.x = p.x + Math.cos(angle) * 34;
        ds.y = p.y + Math.sin(angle) * 24;
        ds.cd -= dt;
        if (ds.cd <= 0) {
          const target = nearestEnemy(ds.x, ds.y, w.range);
          if (target) {
            spawnBulletFromDrone(ds, target, droneLvl, p);
            ds.cd = Math.max(.16, w.interval / st.attackSpeed * st.cdr);
            ds.fireFlash = .1;
          } else ds.cd = .12;
        }
        ds.fireFlash = Math.max(0, ds.fireFlash - dt);
      }
    } else p.droneState = [];
    // arc coil
    const arcLvl = G.weapons.arc || 0;
    if (arcLvl) {
      const w = WEAPONS.arc.levels[Math.min(7, arcLvl - 1)];
      const arcChains = w.chains + (tankData(p).arcAdd || 0) + (fused('arc') ? 2 : 0);
      const arcDamage = w.damage * (fused('arc') ? 1.25 : 1);
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
          p.arcTimer = Math.max(.5, w.interval / st.attackSpeed * st.cdr * (fused('arc') ? .8 : 1));
        } else p.arcTimer = .2;
      }
    }
    // flame trail
    const flameLvl = G.weapons.flame || 0;
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
    const mineLvl = G.weapons.mine || 0;
    if (mineLvl) {
      const w = WEAPONS.mine.levels[Math.min(7, mineLvl - 1)];
      const mineCount = w.count + (tankData(p).mineAdd || 0) + (fused('mine') ? 1 : 0);
      const mineFusion = fused('mine');
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
    const orbLvl = G.weapons.orbital || 0;
    if (orbLvl) {
      const w = WEAPONS.orbital.levels[Math.min(7, orbLvl - 1)];
      const orbitalCount = w.count + (tankData(p).orbitalAdd || 0) + (fused('orbital') ? 1 : 0);
      const orbitalFusion = fused('orbital');
      p.orbitalTimer -= dt;
      if (p.orbitalTimer <= 0) {
        const candidates = G.enemies.filter(e => !e.dead && e.spawnTimer <= 0);
        if (candidates.length) {
          for (let i = 0; i < orbitalCount; i++) {
            const target = candidates[(Math.random() * candidates.length) | 0];
            G.strikes.push({
              x: clamp(target.x + rand(30, -30), 30, W - 30), y: clamp(target.y + rand(30, -30), 30, H - 30),
              radius: w.radius * st.area * (orbitalFusion ? 1.25 : 1), damage: w.damage * st.damage * (orbitalFusion ? 1.25 : 1), owner: p,
              delay: w.delay, timer: w.delay, state: 'warn', color: '#b896ff'
            });
          }
          p.orbitalTimer = Math.max(.8, w.interval / st.attackSpeed * st.cdr);
          AUDIO.tone(220, .5, 'sine', .022, 880);
        } else p.orbitalTimer = .4;
      }
    }
  }

  function updateHazards(dt) {
    for (const f of G.hazards) {
      f.life -= dt; f.tick -= dt;
      if (f.tick <= 0) {
        f.tick = .24;
        for (const e of G.enemies) {
          if (e.dead || e.spawnTimer > 0) continue;
          if (dist2(f.x, f.y, e.x, e.y) < (f.radius + e.radius * e.size * .6) ** 2) {
            damageEnemy(e, f.damage, false, 'flame', f.owner);
          }
        }
      }
      if (chance(dt * 2)) addParticle(f.x + rand(f.radius, -f.radius), f.y + rand(f.radius * .5, -f.radius * .5), rand(8, -8), rand(-18, -35), '#ff9a45', 'ember', .55, 2);
    }
    G.hazards = G.hazards.filter(f => f.life > 0);
    for (const m of G.mines) {
      m.arm -= dt; m.life -= dt;
      if (m.life <= 0) { m.dead = true; continue; }
      if (m.arm > 0) continue;
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
        addEffect({ type: 'beam', x: s.x, y: s.y, radius: s.radius, life: .5, maxLife: .5, color: '#b896ff' });
        explodeAt(s.x, s.y, s.radius, s.damage, '#b896ff', { source: 'orbital', owner: s.owner });
        addShake(9, .33);
        G.flash = .6; G.flashColor = '#b896ff';
        AUDIO.bigExplode();
      }
    }
    G.strikes = G.strikes.filter(s => s.state !== 'done');
  }

  function getWave() {
    let w = WAVES[0];
    for (const wave of WAVES) if (G.elapsed >= wave.at) w = wave;
    return w;
  }

  function updateWaves(dt) {
    let wi = 0;
    for (let i = 0; i < WAVES.length; i++) if (G.elapsed >= WAVES[i].at) wi = i;
    if (wi !== G.waveIndex) {
      G.waveIndex = wi;
      const wave = WAVES[wi];
      showToast(`WAVE ${String(wi + 1).padStart(2, '0')} // ${wave.label}`, 'cyan');
      if (wi > 0 && G.mode === 'playing') {
        for (let i = 0; i < Math.min(3, 1 + Math.floor(wi / 2)); i++) spawnEnemy(pick(wave.types));
      }
      AUDIO.tick();
      AUDIO.setIntensity(wi >= 3 ? 1 : 0);
    }
    if (G.elapsed >= 165 && !G.eliteFlags[165]) {
      G.eliteFlags[165] = true;
      spawnEnemy('elite', { warning: true });
      showToast('警告：精英单位「破城者」进入战区', 'red');
      AUDIO.boss();
    }
    if (G.elapsed >= 225 && !G.eliteFlags[225]) {
      G.eliteFlags[225] = true;
      spawnEnemy('elite', { warning: true });
      spawnEnemy('elite', { warning: true });
      showToast('警告：双精英编队压境', 'red');
      AUDIO.boss();
    }
    if (G.elapsed >= BOSS_AT && !G.bossSpawned) {
      G.bossSpawned = true;
      spawnBoss();
    }
    if (G.elapsed >= TOTAL_TIME) {
      if (G.mode === 'playing') endRun(true, 'extracted');
      return;
    }
    // Titan kill opens the extraction window immediately; do not idle until 06:00.
    if (G.bossDefeated) {
      G.victoryTimer = Math.max(0, G.victoryTimer - dt);
      if (G.victoryTimer <= 0 && G.mode === 'playing') {
        endRun(true, 'titan');
        return;
      }
    }
    // Keep pressure during the final Titan phase; previously all regular spawns stopped at 05:10.
    if (G.elapsed < TOTAL_TIME) {
      const wave = getWave();
      G.spawnTimer -= dt;
      // Solo late game needs a little more pressure; co-op keeps its current pacing.
      const soloLate = !G.twoPlayer && G.elapsed >= 225;
      const cap = wave.max + (soloLate ? 2 : 0);
      if (G.spawnTimer <= 0 && G.enemies.length < cap) {
        const type = pick(wave.types);
        spawnEnemy(type);
        // Each minute gets denser: wave tables step down, then a continuous time ramp adds pressure.
        const timeRamp = 1 - clamp(G.elapsed / TOTAL_TIME, 0, 1) * .15;
        let interval = wave.spawn * rand(1.08, .78) * (G.runMod && G.runMod.spawnMul ? G.runMod.spawnMul : 1) * timeRamp;
        if (soloLate) interval *= .94;
        G.spawnTimer = interval;
        if (G.elapsed > 120 && chance(.15 + G.elapsed / TOTAL_TIME * .16)) setTimeout(() => {
          if (G.mode === 'playing' && G.enemies.length < cap && G.elapsed < TOTAL_TIME) spawnEnemy(pick(wave.types));
        }, 220);
      }
    }
  }

  function spawnEnemy(type, opts) {
    opts = opts || {};
    const cfg = ENEMIES[type];
    if (!cfg) return null;
    if (G.enemies.length > 110) return null;
    let sp = opts.spawn || pick(SPAWN_POINTS);
    if (!opts.spawn) {
      let tries = 0;
      const ps = G.players && G.players.length ? G.players : [G.player];
      while (tries++ < 8 && ps.some(p => p && dist((sp.cx + .5) * TILE, (sp.cy + .5) * TILE, p.x, p.y) < 130)) sp = pick(SPAWN_POINTS);
    }
    const x = (sp.cx + .5) * TILE, y = (sp.cy + .5) * TILE;
    const mod = G.runMod || {};
    const timeScale = 1 + G.elapsed / 60 * .25;
    const dmgScale = 1 + G.elapsed / 60 * .065;
    const early = G.elapsed < 180 ? .82 : 1;
    const e = {
      id: ++G.entityId,
      type, x, y, cx: sp.cx, cy: sp.cy,
      bodyAngle: Math.PI / 2, turretAngle: Math.PI / 2,
      hp: cfg.hp * (cfg.elite ? 1.15 : 1) * (cfg.boss ? 1 : timeScale) * (mod.enemyHp || 1), maxHp: cfg.hp * (cfg.elite ? 1.15 : 1) * (cfg.boss ? 1 : timeScale) * (mod.enemyHp || 1),
      damage: cfg.damage * dmgScale * early * .84 * (mod.enemyDamage || 1), speed: cfg.speed * (mod.enemySpeed || 1), fireCd: rand(2.8, 1.4) * (G.elapsed < 180 ? 1.18 : 1), fireInterval: cfg.fire * (G.elapsed < 180 ? 1.18 : 1), bulletSpeed: cfg.bulletSpeed,
      radius: cfg.radius, size: cfg.elite ? 1.32 : type === 'heavy' ? 1.25 : type === 'bomber' ? .96 : type === 'scout' ? .9 : type === 'sniper' ? 1.0 : 1.04,
      color: cfg.color, dark: cfg.dark, light: cfg.light, coreColor: cfg.core,
      xp: cfg.xp, elite: !!cfg.elite, boss: !!cfg.boss,
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
    const cfg = ENEMIES.boss;
    const x = W / 2, y = 150;
    const scale = 1 + G.elapsed / 60 * .1;
    const mod = G.runMod || {};
    const e = {
      id: ++G.entityId, type: 'boss', x, y, cx: 14, cy: 4,
      bodyAngle: Math.PI / 2, turretAngle: Math.PI / 2,
      hp: cfg.hp * scale * (mod.bossHp || 1), maxHp: cfg.hp * scale * (mod.bossHp || 1), damage: cfg.damage * (1 + G.elapsed / 60 * .05) * .88 * (mod.enemyDamage || 1),
      speed: cfg.speed * (mod.enemySpeed || 1), radius: cfg.radius, size: 1.5, bulletSpeed: cfg.bulletSpeed,
      color: cfg.color, dark: cfg.dark, light: cfg.light, coreColor: cfg.core,
      elite: false, boss: true, xp: cfg.xp, spawnTimer: 1.35, spawnTotal: 1.35,
      hitFlash: 0, freeze: 0, trackPhase: 0, fireCd: 2.8, minionTimer: 11, burstCd: 4.5, shockCd: 7,
      bodyAngle: Math.PI / 2, turretAngle: Math.PI / 2, contactCd: 0, dead: false
    };
    markCodex('boss');
    G.enemies.push(e);
    G.boss = e;
    addEffect({ type: 'spawn', x, y, radius: 54, life: 1.4, maxLife: 1.4, color: '#ff4f58' });
    addShake(10, .8);
    G.flash = .7; G.flashColor = '#ff4f58';
    U.bossHud.classList.remove('is-hidden');
    U.bossHpLabel.textContent = `${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}`;
    U.bossHpBar.style.width = '100%';
    showToast('TITANFALL // 泰坦级猎杀单位降临', 'red');
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
      if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.poisonTimer > 0) {
        e.poisonTimer = Math.max(0, e.poisonTimer - dt);
        damageEnemy(e, (e.poisonDps || 0) * dt, false, 'poison', e.poisonOwner);
        if (e.dead) continue;
      }
      e.freeze = G.freezeTimer;
      if (G.freezeTimer > 0) continue;
      if (e.boss) {
        updateBoss(e, dt);
      } else {
        updateRegularEnemy(e, dt);
      }
      if (e.dead) continue;
      // contact damage
      if (e.contactCd > 0) e.contactCd -= dt;
      const p = nearestTarget(e.x, e.y);
      if (!p) continue;
      const contactR = (e.radius * e.size + p.radius + 1);
      if (dist2(e.x, e.y, p.x, p.y) < contactR * contactR) {
        if (e.type === 'bomber') { bomberExplode(e); continue; }
        if (e.contactCd <= 0) {
          if (p.isBase) damageBase(e.damage * .9, 'contact');
          else damagePlayer(e.damage * .75, p);
          e.contactCd = 1.0;
        }
      }
    }
    G.enemies = G.enemies.filter(e => !e.dead);
  }

  function updateRegularEnemy(e, dt) {
    e.think -= dt;
    if (G.elapsed >= 7) e.fireCd -= dt;
    else e.fireCd = Math.max(e.fireCd, 1.4);
    e.abilityCd -= dt;
    e.recoil = Math.max(0, e.recoil - dt * 6);
    const p = nearestTarget(e.x, e.y);
    if (!p) return;
    const targetMode = p.isBase ? 'base' : 'player';
    const tx = p.x;
    const ty = p.y;
    const targetDist = dist(e.x, e.y, tx, ty);
    // turret aim
    if (e.type !== 'bomber') {
      e.turretAngle = angleLerp(e.turretAngle, Math.atan2(ty - e.y, tx - e.x), dt * 5);
    }
    // elite area burst
    if (e.elite && e.abilityCd <= 0) {
      e.abilityCd = 8.5;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + rand(.15, -.15);
        fireEnemyBullet(e, e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, a, e.bulletSpeed * .48, e.damage * .35, { color: '#ffb52d', radius: 3.4 });
      }
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 64, life: .5, maxLife: .5, color: '#ffb52d' });
      addShake(3, .2);
    }
    // firing
    if (targetDist < 455 && e.fireCd <= 0 && e.type !== 'bomber') {
      const interval = e.fireInterval || ENEMIES[e.type].fire || 2.3;
      const shots = e.elite ? 3 : 1;
      const spread = e.elite ? .16 : 0;
      const lead = targetMode === 'player' ? clamp(dist(e.x, e.y, tx, ty) / e.bulletSpeed, 0, .22) : 0;
      const px = targetMode === 'player' ? p.x + p.moveX * p.speed * lead : tx;
      const py = targetMode === 'player' ? p.y + p.moveY * p.speed * lead : ty;
      const baseAngle = Math.atan2(py - e.y, px - e.x);
      for (let i = 0; i < shots; i++) {
        const a = baseAngle + (i - (shots - 1) / 2) * spread;
        fireEnemyBullet(e, e.x + Math.cos(a) * (e.radius + 5), e.y + Math.sin(a) * (e.radius + 5), a, e.bulletSpeed, e.damage, {
          color: e.type === 'sniper' ? '#9dbbff' : e.elite ? '#ffd15c' : '#ff6860',
          radius: e.type === 'heavy' || e.elite ? 4.2 : 3.2,
          trail: e.type === 'sniper' ? 32 : 14
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
            if (e.fireCd <= 0 && e.type !== 'bomber') {
              const bx = (dir.nx + .5) * TILE, by = (dir.ny + .5) * TILE;
              fireEnemyBullet(e, e.x + Math.cos(e.bodyAngle) * (e.radius + 4), e.y + Math.sin(e.bodyAngle) * (e.radius + 4), e.bodyAngle, e.bulletSpeed, e.damage * 1.1, { color: '#ff8062', radius: 3.2 });
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
    G.enemyBullets.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: opts.radius || 3.2, damage, life: 3, maxLife: 3,
      color: opts.color || '#ff6860', trail: opts.trail || 14, enemy: true, ownerId: e.id, hit: null
    });
    if (!G.lastEnemySound || performance.now() - G.lastEnemySound > 100) {
      G.lastEnemySound = performance.now();
      AUDIO.enemyShoot();
    }
  }

  function updateBoss(e, dt) {
    const p = nearestTarget(e.x, e.y);
    if (!p) return;
    e.fireCd -= dt;
    e.minionTimer -= dt;
    e.burstCd = (e.burstCd == null ? 5 : e.burstCd) - dt;
    e.shockCd = (e.shockCd == null ? 8 : e.shockCd) - dt;
    e.recoil = Math.max(0, e.recoil - dt * 4);
    const enraged = e.hp < e.maxHp * .58;
    const aimX = p.x, aimY = p.y;
    e.bodyAngle = angleLerp(e.bodyAngle, Math.atan2(p.y - e.y, p.x - e.x), dt * .9);
    e.turretAngle = angleLerp(e.turretAngle, Math.atan2(aimY - e.y, aimX - e.x), dt * 1.8);
    const dp = dist(e.x, e.y, p.x, p.y);
    if (dp > 220) {
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      const bossSpeed = e.speed * (e.slowTimer > 0 ? .7 : 1);
      e.x += Math.cos(angle) * bossSpeed * dt;
      e.y += Math.sin(angle) * bossSpeed * dt;
      e.x = clamp(e.x, 55, W - 55); e.y = clamp(e.y, 50, H - 50);
      e.trackPhase += dt * 4;
      // siege titan crushes tiles
      if (chance(dt * 5)) {
        const px = e.x + Math.cos(angle) * 46, py = e.y + Math.sin(angle) * 46;
        crushTileAt(px, py);
      }
    }
    if (e.fireCd <= 0) {
      // Main siege cannon: one readable shell, then a three-shell rake when enraged.
      const a = Math.atan2(aimY - e.y, aimX - e.x);
      const shells = enraged ? 3 : 1;
      for (let i = 0; i < shells; i++) {
        const aa = a + (i - (shells - 1) / 2) * .14;
        fireEnemyBullet(e, e.x + Math.cos(aa) * 38, e.y + Math.sin(aa) * 38, aa, e.bulletSpeed, e.damage, {
          color: enraged ? '#ff8a6b' : '#ff6b58', radius: 4.8, trail: 28
        });
      }
      e.fireCd = enraged ? 1.35 : 1.9;
      e.recoil = 1;
      addShake(enraged ? 3.2 : 2.4, .16);
      addEffect({ type: 'muzzle', x: e.x + Math.cos(a) * 44, y: e.y + Math.sin(a) * 44, angle: a, life: .18, maxLife: .18, color: '#ffb16b', radius: 16 });
    }
    if (e.burstCd <= 0) {
      // Telegraphed fan barrage. The gaps between shells are intentional.
      e.burstCd = enraged ? 5.2 : 7.2;
      const a = Math.atan2(aimY - e.y, aimX - e.x);
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 46, life: .35, maxLife: .35, color: '#ffcf73' });
      for (let i = 0; i < 5; i++) {
        const aa = a + (i - 2) * .16;
        fireEnemyBullet(e, e.x + Math.cos(aa) * 34, e.y + Math.sin(aa) * 34, aa, e.bulletSpeed * .82, e.damage * .55, {
          color: '#ffc36b', radius: 3.6, trail: 20
        });
      }
      addShake(4, .22);
    }
    if (e.shockCd <= 0 && dp < 165) {
      e.shockCd = enraged ? 6 : 9;
      addEffect({ type: 'ring', x: e.x, y: e.y, radius: 120, life: .7, maxLife: .7, color: '#ff5f4a' });
      addParticles(e.x, e.y, 22, '#ff9b62', 'spark', 1.2);
      if (p.isBase) damageBase(e.damage * 1.2, 'shockwave');
      else damagePlayer(e.damage * .8, p);
      addShake(8, .45);
    }
    if (e.minionTimer <= 0) {
      e.minionTimer = enraged ? 8 : 12;
      const count = enraged ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const sx = clamp(e.x + rand(42, -42), 36, W - 36), sy = clamp(e.y + 56, 36, H - 36);
        spawnEnemy(i ? 'grunt' : 'scout', { spawn: { cx: Math.floor(sx / TILE), cy: Math.floor(sy / TILE) } });
        addEffect({ type: 'ring', x: sx, y: sy, radius: 32, life: .5, maxLife: .5, color: '#ff4f58' });
      }
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

  function damageSeal(seal, amount) {
    if (!seal || seal.dead) return;
    seal.hp -= amount;
    seal.hitFlash = .12;
    for (let i = 0; i < 4; i++) addParticle(seal.x + rand(8, -8), seal.y + rand(8, -8), rand(45, -45), rand(45, -45), '#ffe3a0', 'spark', .35, 2);
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
    showToast(`封印核心破裂 // ${tank ? tank.name : '未知底盘'} 守卫苏醒`, 'red');
    spawnSealBoss(seal);
  }

  function spawnSealBoss(seal) {
    const tank = TANKS.find(t => t.id === seal.tankId);
    if (!tank) return;
    const sp = { cx: clamp(Math.floor(seal.x / TILE), 1, COLS - 2), cy: clamp(Math.floor(seal.y / TILE), 1, ROWS - 2) };
    const e = spawnEnemy('elite', { spawn: sp, warning: true });
    if (!e) {
      showToast('战场拥挤 // 封印守卫暂时无法入场', 'red');
      seal.dead = false; seal.hp = 1;
      return;
    }
    e.x = seal.x; e.y = seal.y; e.cx = sp.cx; e.cy = sp.cy;
    e.sealTankId = tank.id;
    e.sealLabel = tank.en || 'SEAL GUARD';
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

  function updateBullets(dt) {
    for (const b of G.bullets) {
      if (b.dead) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) { b.dead = true; continue; }
      const tile = tileAt(b.x, b.y);
      if (!b.baseShot && (tile.type === 'brick' || tile.type === 'steel')) {
        const broken = hitTile(tile, b.x, b.y, b.damage * .4, '#c45e3d');
        if (b.explode > 0) {
          explodeAt(b.x, b.y, b.explode, b.damage * .48, '#ffb15a', { source: 'cannon', silent: true, owner: b.owner });
          b.dead = true;
        } else if (broken) {
          b.dead = true;
        }
        continue;
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
          if (b.hit) b.hit.add(e.id);
          damageEnemy(e, b.damage, b.crit, 'bullet', b.owner);
          addParticle(b.x, b.y, rand(50, -50), rand(50, -50), b.color, 'spark', .2, 1.5);
          if (b.explode > 0) {
            explodeAt(b.x, b.y, b.explode, b.damage * .6, b.color, { source: 'cannon', owner: b.owner });
            b.dead = true;
          } else if (b.pierce <= 0 || (b.hit && b.hit.size > b.pierce)) {
            b.dead = true;
          }
          if (b.dead) break;
        }
      }
    }
    G.bullets = G.bullets.filter(b => !b.dead);
    for (const b of G.enemyBullets) {
      if (b.dead) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) { b.dead = true; continue; }
      const tile = tileAt(b.x, b.y);
      if (tile.type === 'brick') {
        hitTile(tile, b.x, b.y, 8, '#a55335', true);
        b.dead = true; continue;
      } else if (tile.type === 'steel') {
        for (let i = 0; i < 4; i++) addParticle(b.x, b.y, rand(60, -60), rand(60, -60), '#ffe4ae', 'spark', .24, 1.8);
        b.dead = true; continue;
      }
      const hit = activePlayers().find(p => dist2(b.x, b.y, p.x, p.y) < (p.radius + b.radius + 1) ** 2);
      if (hit) {
        damagePlayer(b.damage, hit);
        b.dead = true; continue;
      }
      if (G.core && G.core.alive && dist2(b.x, b.y, G.core.cx, G.core.cy) < (G.core.radius + b.radius + 1) ** 2) {
        damageBase(b.damage, 'shell');
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
    for (const e of G.enemies) {
      if (e.dead || e.spawnTimer > 0) continue;
      const rr = radius + e.radius * e.size;
      const d2 = dist2(x, y, e.x, e.y);
      if (d2 < rr * rr) {
        const fall = 1 - .35 * Math.sqrt(d2) / rr;
        damageEnemy(e, damage * fall, false, opts.source || 'explosion', opts.owner);
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
    }
    if (opts.hurtBase && G.core && G.core.alive && dist(x, y, G.core.cx, G.core.cy) < radius + G.core.radius) {
      damageBase(damage * .75, opts.source || 'blast');
    }
    addShake(Math.min(11, radius * .1), .22);
  }

  function damageEnemy(e, amount, crit, source, owner) {
    if (!e || e.dead || e.spawnTimer > 0) return;
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
      G.bossDefeated = true;
      G.boss = null;
      U.bossHud.classList.add('is-hidden');
      addEffect({ type: 'explosion', x: e.x, y: e.y, radius: 160, life: .9, maxLife: .9, color: '#ff8a3e' });
      addEffect({ type: 'explosion', x: e.x + 40, y: e.y - 20, radius: 100, life: .7, maxLife: .7, color: '#ffd05a' });
      addParticles(e.x, e.y, 50, '#ffb15a', 'spark', 2.2);
      addParticles(e.x, e.y, 24, '#4d3a30', 'smoke', 1.1);
      addShake(18, 1.0); G.flash = 1; G.flashColor = '#ffc46b';
      AUDIO.bigExplode();
      showToast('泰坦已击破 // 撤离通道开启', 'cyan');
      for (let i = 0; i < 9; i++) spawnPickup(chance(.55) ? 'xp' : pick(Object.keys(ITEMS)), e.x + rand(30, -30), e.y + rand(24, -24), 0);
      G.victoryTimer = 1.2;
    } else {
      if (e.elite) {
        addEffect({ type: 'explosion', x: e.x, y: e.y, radius: 72, life: .65, maxLife: .65, color: '#ffb52d' });
        addParticles(e.x, e.y, 24, '#ffbd58', 'spark', 1.6);
        addShake(8, .45); AUDIO.explode(1.6);
        if (e.sealTankId) unlockTankFromSeal(e.sealTankId);
        else showToast('精英单位已击毁', 'cyan');
      } else {
        addParticles(e.x, e.y, 12, e.color, 'debris', .55);
        addEffect({ type: 'explosion', x: e.x, y: e.y, radius: 28, life: .2, maxLife: .2, color: '#ff9a58' });
        if (chance(.18)) AUDIO.explode(.55);
        addShake(1.3, .1);
      }
      spawnPickup('xp', e.x, e.y, xpValue);
      const dropChance = (e.elite ? .95 : statsFor(owner).dropChance);
      if (chance(dropChance)) {
        const itemKeys = ['star', 'grenade', 'helmet', 'timer', 'shovel', 'tank', 'turret'];
        const weights = [15, 15, 15, 13, 15, 20, 10];
        let r = Math.random() * 103, item = 'star';
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

  function damageBase(amount, source) {
    const c = G.core;
    if (!c || !c.alive) return;
    amount = Math.max(1, amount);
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
      showToast('基地装甲归零 // 防线失守', 'red');
      endRun(false, 'base');
    }
  }

  function fireBaseShot(target, turretIndex) {
    const c = G.core;
    if (!c || !c.alive || !target) return;
    const mounts = [[0, -22], [22, 0], [0, 22], [-22, 0]];
    const [ox, oy] = mounts[(turretIndex || 0) % mounts.length];
    const sx = c.cx + ox, sy = c.cy + oy;
    const a = Math.atan2(target.y - sy, target.x - sx);
    c.turretAngle = a;
    const muzzle = 14;
    G.bullets.push({
      x: sx + Math.cos(a) * muzzle, y: sy + Math.sin(a) * muzzle,
      vx: Math.cos(a) * 520, vy: Math.sin(a) * 520,
      radius: 3.2, damage: 25, life: 1.2, maxLife: 1.2,
      color: '#8fffe6', trail: 16, enemy: false, baseShot: true,
      owner: null, crit: false, pierce: 0, explode: 0, hit: new Set()
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
    const turretCount = c.turrets || 0;
    if (turretCount <= 0) return;
    c.turretCd -= dt;
    if (c.turretCd <= 0) {
      let fired = false;
      for (let i = 0; i < turretCount; i++) {
        const target = nearestEnemy(c.cx, c.cy, BASE_RANGE);
        if (!target) break;
        fireBaseShot(target, i);
        fired = true;
      }
      c.turretCd = fired ? .92 : .2;
    }
  }

  function damagePlayer(amount, target) {
    const p = target || G.player;
    if (!p || !p.alive || p.downed || p.invincible > 0 || p.dashTimer > 0) return;
    amount *= .9 * (tankData(p).damageTakenMul || 1);
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
    G.shake = Math.max(G.shake, 5);
    G.flash = Math.max(G.flash, .35); G.flashColor = '#ff4343';
    addParticles(p.x, p.y, 10, '#ff8b58', 'spark', 1);
    AUDIO.hit(); rumble(.6, 120);
    if (p.hp <= 0 && !G.twoPlayer && !p.secondWindUsed) {
      p.secondWindUsed = true;
      p.hp = Math.round(p.maxHp * .4);
      p.invincible = 2.8;
      p.dashTimer = .18;
      G.enemyBullets = G.enemyBullets.filter(b => dist(b.x, b.y, p.x, p.y) > 170);
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 80, life: .7, maxLife: .7, color: '#5ff0ce' });
      addParticles(p.x, p.y, 24, '#5ff0ce', 'spark', 1.4);
      addShake(9, .55); G.flash = .6; G.flashColor = '#5ff0ce';
      showToast('应急核心启动 // 车体紧急修复', 'cyan');
      AUDIO.confirm(); rumble(.8, 240);
      return;
    }
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
        showToast(`P${p.index + 1} 车体损毁 // 队友靠近可救援`, 'red');
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
      value: value || 0, life: 38, seed: rand(TAU), picked: false
    });
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
      addXp(pk.value || 1, p);
      AUDIO.xp();
      addParticle(pk.x, pk.y, rand(20, -20), rand(-30, -60), '#aef9e7', 'spark', .35, 1.3);
      return;
    }
    const item = ITEMS[pk.type];
    if (!item) return;
    if (pk.type === 'turret') {
      if (G.core && G.core.alive) {
        const max = 4;
        if ((G.core.turrets || 0) < max) {
          G.core.turrets = (G.core.turrets || 0) + 1;
          addEffect({ type: 'ring', x: G.core.cx, y: G.core.cy, radius: 46, life: .55, maxLife: .55, color: '#8fffe6' });
          showToast(`基地防御塔 ${G.core.turrets} / ${max} // 自动索敌启用`, 'cyan');
          AUDIO.item();
        } else {
          const heal = G.core.maxHp * .1;
          G.core.hp = Math.min(G.core.maxHp, G.core.hp + heal);
          showToast('防御塔已满 // 基地装甲 +10%', 'cyan');
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
        showToast(`基地维修 // 装甲 +${Math.round(heal)}`, 'cyan');
        AUDIO.tick();
      }
      return;
    }
    if (pk.type === 'star') {
      if ((G.weapons.cannon || 1) < 8) G.weapons.cannon = (G.weapons.cannon || 1) + 1;
      else {
        const upgradable = Object.keys(G.weapons).filter(k => G.weapons[k] < 8);
        if (upgradable.length) G.weapons[pick(upgradable)] += 1;
        else healPlayer(25, p);
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
    showToast(`${item.name} // ${item.desc}`, 'cyan');
    addEffect({ type: 'ring', x: pk.x, y: pk.y, radius: 26, life: .4, maxLife: .4, color: item.color });
  }
  function addXp(amount, sourceP) {
    G.xp += Math.max(1, amount * statsFor(sourceP).xpGain * ((G.runMod && G.runMod.xpMul) || 1));
    let leveled = false;
    while (G.xp >= G.xpNext) {
      G.xp -= G.xpNext;
      G.level += 1;
      G.pendingLevels += 1;
      G.xpNext = xpNeeded(G.level);
      leveled = true;
    }
    if (leveled) {
      const p = sourceP || G.player;
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 42, life: .45, maxLife: .45, color: '#ffb52d' });
      addParticles(p.x, p.y, 14, '#ffd36b', 'spark', .8);
      G.loadoutDirty = true;
    }
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
    G.shake = Math.max(G.shake, mag);
    G.shakeTime = Math.max(G.shakeTime, time || .2);
  }

  function updateStatus(dt) {
    G.animTime += dt;
    G.freezeTimer = Math.max(0, G.freezeTimer - dt);
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

  function getUpgradeChoices() {
    const tank = tankData();
    const affinity = Array.from(new Set((G.twoPlayer ? [tankData(G.players[0]), tankData(G.players[1])] : [tank]).flatMap(t => t.affinity || [])));
    const fusionCandidates = [];
    for (const f of Object.values(FUSIONS)) {
      if (G.fusions[f.id]) continue;
      if ((G.weapons[f.weapon] || 0) < f.weaponLevel) continue;
      if ((G.passives[f.passive] || 0) < f.passiveLevel) continue;
      fusionCandidates.push({
        kind: 'fusion', id: f.id, data: f, fusion: f, level: 0, nextLevel: 0, max: 0,
        accent: f.color, weight: 8
      });
    }
    const weaponCandidates = [];
    const weaponCount = Object.keys(G.weapons).length;
    for (const id of Object.keys(WEAPONS)) {
      const data = WEAPONS[id];
      const lvl = G.weapons[id] || 0;
      if (lvl >= 8) continue;
      if (lvl === 0 && weaponCount >= 6) continue;
      weaponCandidates.push({
        kind: 'weapon', id, data, level: lvl, nextLevel: lvl + 1, max: 8,
        accent: data.color,
        weight: (lvl === 0 ? 1.15 : 1.7) * (affinity.includes(id) ? 1.6 : 1)
      });
    }
    const passiveCandidates = [];
    const passiveCount = Object.keys(G.passives).length;
    for (const id of Object.keys(PASSIVES)) {
      const data = PASSIVES[id];
      const lvl = G.passives[id] || 0;
      if (lvl >= data.max) continue;
      if (lvl === 0 && passiveCount >= 6) continue;
      passiveCandidates.push({
        kind: 'passive', id, data, level: lvl, nextLevel: lvl + 1, max: data.max,
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
      const p = weightedPick(passiveCandidates.filter(c => !picked.some(x => x.kind === c.kind && x.id === c.id)));
      if (p) picked[picked.length - 1] = p;
    }
    if (picked.length && !picked.some(c => c.kind === 'weapon') && weaponCandidates.length && picked.length >= 3) {
      const w = weightedPick(weaponCandidates.filter(c => !picked.some(x => x.kind === c.kind && x.id === c.id)));
      if (w) picked[picked.length - 1] = w;
    }
    const utilityPool = UTILITY_CARDS.slice();
    while (picked.length < 3 && utilityPool.length) {
      const utility = utilityPool.splice(Math.floor(Math.random() * utilityPool.length), 1)[0];
      picked.push({ kind: 'utility', id: utility.id, data: utility, level: 0, nextLevel: 0, max: 0, accent: utility.color, utility });
    }
    return picked;
  }

  function openLevelUp() {
    if (G.mode !== 'playing' && G.mode !== 'levelup') return;
    G.mode = 'levelup';
    G.resolvingUpgrade = false;
    Input.gamepad.selectedCard = 0;
    G.currentChoices = getUpgradeChoices();
    U.newLevel.textContent = String(G.level).padStart(2, '0');
    renderUpgradeCards(G.currentChoices);
    U.levelupScreen.classList.remove('hidden');
    U.rerollBtn.disabled = G.rerolls <= 0;
    U.rerollCount.textContent = String(G.rerolls);
    G.lastFrame = performance.now();
    AUDIO.levelUp();
  }

  function renderUpgradeCards(choices) {
    const cards = choices.map((c, i) => {
      const data = c.data;
      let typeLabel = c.kind === 'fusion' ? '合成协议 // FUSION' : c.kind === 'weapon' ? '武器模块 // WEAPON' : c.kind === 'passive' ? '被动协议 // PASSIVE' : '战地补给 // SUPPLY';
      let levelLabel = c.kind === 'utility' ? 'FIELD SUPPLY' : c.kind === 'fusion' ? 'EVOLVE' : c.level === 0 ? 'NEW MODULE' : `LV.${c.level} → ${c.level + 1}`;
      let desc = c.kind === 'utility' ? c.utility.desc : c.kind === 'fusion' ? c.fusion.desc : c.kind === 'weapon' ? WEAPONS[c.id].levels[c.nextLevel - 1].text : PASSIVES[c.id].text;
      let pips = '';
      if (c.kind === 'fusion') {
        pips = '<i class="is-on"></i><i class="is-on"></i><i class="is-on"></i><i class="is-on"></i>';
      } else if (c.kind !== 'utility') {
        const count = c.kind === 'weapon' ? 8 : c.max;
        for (let p = 0; p < count; p++) pips += `<i class="${p < c.nextLevel ? 'is-on' : ''}"></i>`;
      } else {
        pips = '<i class="is-on"></i><i class="is-on"></i><i class="is-on"></i>';
      }
      const name = c.kind === 'utility' ? c.utility.name : data.name;
      const en = c.kind === 'utility' ? c.utility.en : data.en;
      const icon = c.kind === 'utility' ? c.utility.icon : data.icon;
      const color = c.kind === 'utility' ? c.utility.color : data.color;
      const role = c.kind === 'utility' ? '即时补给' : c.kind === 'fusion' ? '武器进化' : (data.role || '') + (data.focus ? ' · ' + data.focus : '');
      return `<button class="upgrade-card" type="button" data-index="${i}" style="--accent:${color}" aria-label="选择 ${name}">
        <span class="upgrade-card__corner" aria-hidden="true"></span>
        <div class="upgrade-card__top"><span class="upgrade-card__type">${typeLabel}</span><span class="upgrade-card__level">${levelLabel}</span></div>
        <div class="upgrade-card__icon"><canvas data-icon="${icon}" data-color="${color}" data-size="82"></canvas></div>
        <div class="upgrade-card__body">
          <h3 class="upgrade-card__name">${name}</h3>
          <div class="upgrade-card__en">${en}</div>
          <div class="upgrade-card__role">${role}</div>
          <p class="upgrade-card__desc">${desc}</p>
        </div>
        <div class="upgrade-card__pips">${pips}</div>
        <span class="upgrade-card__key">${i + 1}</span>
      </button>`;
    }).join('');
    U.upgradeCards.innerHTML = cards;
    ICONS.applyAll(U.upgradeCards);
  }

  function chooseUpgrade(index) {
    if (G.mode !== 'levelup' || G.resolvingUpgrade) return;
    const c = G.currentChoices[index];
    if (!c) return;
    G.resolvingUpgrade = true;
    AUDIO.confirm();
    if (c.kind === 'fusion') {
      G.fusions[c.id] = true;
      showToast(`合成完成 // ${c.fusion.name}`, 'gold');
      addEffect({ type: 'ring', x: G.player.x, y: G.player.y, radius: 90, life: .8, maxLife: .8, color: c.fusion.color });
      addParticles(G.player.x, G.player.y, 28, c.fusion.color, 'spark', 1.6);
    } else if (c.kind === 'weapon') {
      const cur = G.weapons[c.id] || 0;
      G.weapons[c.id] = Math.min(8, cur + 1);
      if (cur === 0) G.weaponCds[c.id] = .5;
      showToast(`武器解锁 // ${c.data.name}`, 'cyan');
    } else if (c.kind === 'passive') {
      const cur = G.passives[c.id] || 0;
      G.passives[c.id] = Math.min(c.data.max, cur + 1);
      if (c.id === 'armor') for (const p of G.players) healPlayer(18, p);
      showToast(`协议升级 // ${c.data.name}`, 'cyan');
    } else if (c.kind === 'utility') {
      if (c.id === 'field_repair') for (const p of G.players) healPlayer(p.maxHp * .35, p);
      else if (c.id === 'pulse') {
        G.enemyBullets = [];
        for (const e of G.enemies) {
          if (e.dead) continue;
          if (G.players.some(p => dist(e.x, e.y, p.x, p.y) < 240)) damageEnemy(e, 90 * G.stats.damage, false, 'pulse');
        }
      } else if (c.id === 'emergency_shield') for (const p of G.players) p.shield = Math.max(p.shield, 40);
      showToast(`补给到位 // ${c.utility.name}`, 'cyan');
    }
    recalcStats(false);
    G.pendingLevels = Math.max(0, G.pendingLevels - 1);
    G.loadoutDirty = true;
    for (const p of G.players) {
      addEffect({ type: 'ring', x: p.x, y: p.y, radius: 50, life: .55, maxLife: .55, color: c.accent });
      addParticles(p.x, p.y, 10, c.accent, 'spark', .9);
    }
    updateHUD();
    if (G.pendingLevels > 0) {
      setTimeout(() => {
        if (G.mode === 'levelup') { openLevelUp(); }
      }, 180);
    } else {
      G.mode = 'playing';
      U.levelupScreen.classList.add('hidden');
      G.lastFrame = performance.now();
      G.resolvingUpgrade = false;
    }
  }

  function rerollUpgrades() {
    if (G.mode !== 'levelup' || G.rerolls <= 0 || G.resolvingUpgrade) { AUDIO.deny(); return; }
    G.rerolls -= 1;
    U.rerollCount.textContent = String(G.rerolls);
    U.rerollBtn.disabled = G.rerolls <= 0;
    G.currentChoices = getUpgradeChoices();
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

  function updateHUD() {
    const p = (G.players && G.players[0]) || G.player;
    if (!p) return;
    const hpPct = clamp(p.hp / p.maxHp * 100, 0, 100);
    const progress = clamp(G.elapsed / TOTAL_TIME * 100, 0, 100);
    const remain = Math.max(0, TOTAL_TIME - G.elapsed);
    const xpPct = clamp(G.xp / G.xpNext * 100, 0, 100);
    U.hpMeter.style.width = `${hpPct}%`;
    U.xpMeter.style.width = `${xpPct}%`;
    U.hpText.textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
    U.xpText.textContent = `${Math.floor(G.xp)} / ${Math.ceil(G.xpNext)}`;
    U.levelLabel.textContent = String(G.level).padStart(2, '0');
    U.statAtk.textContent = `${Math.round(G.stats.damage * 100)}`;
    U.statSpd.textContent = `${Math.round(p.speed / PLAYER_BASE.speed * 100)}`;
    U.statCrit.textContent = `${Math.round(G.stats.crit * 100)}%`;
    U.coreRing.style.setProperty('--p', progress.toFixed(1));
    U.corePercent.textContent = String(Math.floor(progress));
    U.coreText.textContent = fmtShort(remain);
    U.coreState.textContent = remain <= 0 ? 'READY' : `T-${fmtShort(remain)}`;
    const basePct = G.core ? clamp(G.core.hp / G.core.maxHp * 100, 0, 100) : 0;
    if (U.baseHpText) U.baseHpText.textContent = G.core ? `${Math.ceil(G.core.hp)} / ${Math.ceil(G.core.maxHp)}` : '--';
    if (U.baseHpMeter) U.baseHpMeter.style.width = `${basePct}%`;
    if (U.baseMeter) U.baseMeter.classList.toggle('is-low', basePct < 30);
    if (U.baseTurretNote) {
      const turrets = (G.core && G.core.turrets) || 0;
      U.baseTurretNote.textContent = turrets > 0 ? `防御塔 ${turrets} / 4 · 自动索敌` : '防御塔 0 / 4 · 拾取炮塔后启用';
      U.baseTurretNote.classList.toggle('is-active', turrets > 0);
    }
    U.coreState.classList.toggle('is-danger', basePct < 30 || hpPct < 35);
    Array.from(U.corePips.children).forEach((el, i) => el.classList.toggle('is-off', progress < (i + 1) * 20));
    U.killCount.textContent = String(G.kills).padStart(3, '0');
    U.topKills.textContent = String(G.kills).padStart(3, '0');
    U.pickupCount.textContent = String(G.pickupsCollected).padStart(3, '0');
    U.comboCount.textContent = `x${(1 + Math.min(1.5, G.combo * .02)).toFixed(1)}`;
    const wave = WAVES[clamp(G.waveIndex, 0, WAVES.length - 1)];
    if (G.boss) {
      U.phaseLabel.textContent = 'TITANFALL // 泰坦猎杀';
      U.objectiveLabel.textContent = '击破泰坦 · 撑到撤离';
      U.sideTip.textContent = G.twoPlayer ? '泰坦追最近的车体。保持移动，队友别站同一条弹道。' : '泰坦只追你。保持移动，别被逼进死角。';
    } else {
      U.phaseLabel.textContent = `WAVE ${String(clamp(G.waveIndex + 1, 1, 6)).padStart(2, '0')} // ${wave.label}`;
      U.objectiveLabel.textContent = `生存至撤离 · ${fmtShort(remain)}`;
      if (hpPct < 35) U.sideTip.textContent = '车体濒危 // 拉开距离，先吃维修包。';
      else if (G.autoHold) U.sideTip.textContent = '自动火线被掩体阻挡 // 手动瞄准可拆墙。';
      else if (G.elapsed > 240) U.sideTip.textContent = '铁幕推进 // 保持移动，别被包夹。';
      else if (G.weapons.flame && p.moving) U.sideTip.textContent = '燃迹喷流正在灼烧追兵。';
      else U.sideTip.textContent = '提示 // 砖墙可打碎，钢板不可。';
    }
    U.clockLabel.textContent = fmtTime(Math.max(0, TOTAL_TIME - G.elapsed));
    U.clockBar.style.width = `${clamp(G.elapsed / TOTAL_TIME * 100, 0, 100)}%`;
    if (U.mCoreBar) {
      U.mCoreBar.style.width = `${progress}%`;
      if (U.mBaseBar) U.mBaseBar.style.width = `${basePct}%`;
      U.mHpBar.style.width = `${hpPct}%`;
      U.mLevel.textContent = String(G.level).padStart(2, '0');
      U.mCoreBar.parentElement.parentElement.classList.toggle('is-low', false);
      if (U.mBaseBar) U.mBaseBar.parentElement.parentElement.classList.toggle('is-low', basePct < 30);
      U.mHpBar.parentElement.parentElement.classList.toggle('is-low', hpPct < 30);
    }
    const threat = clamp(1 + G.waveIndex * 1.1 + G.enemies.length / 9, 0, 8);
    Array.from(U.threatBars.children).forEach((el, i) => el.classList.toggle('is-on', i < threat));
    U.threatBars.classList.toggle('is-critical', threat > 5.5);
    U.threatLabel.textContent = threat > 6.5 ? '极危' : threat > 4.5 ? '高' : threat > 2.5 ? '中' : '低';
    U.dangerTint.classList.toggle('is-active', hpPct < 28);
    const dashLeft = Math.max(0, p.dashCd);
    U.dashStatus.textContent = dashLeft <= .03 ? '就绪' : `充能 ${dashLeft.toFixed(1)}s`;
    U.dashMeter.style.width = `${dashLeft <= .03 ? 100 : clamp((1 - dashLeft / p.dashMax) * 100, 0, 100)}%`;
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
            st.textContent = !q ? 'OFFLINE' : q.downed ? 'DOWN' : 'ONLINE';
            st.classList.toggle('is-down', !!q && q.downed);
            st.classList.toggle('is-alive', !!q && !q.downed);
          }
        }
        const downed = G.players.find(q => q.downed);
        if (downed) U.sideTip.textContent = `P${downed.index + 1} 倒地 // 队友靠近并停留 2.4 秒可重启`;
      }
    }
    if (U.coreNote) U.coreNote.innerHTML = `<span class="blink-dot"></span> ${G.twoPlayer ? '双人 06:00 · 双车或基地归零即失败' : '生存 06:00 · 车体或基地归零即失败'}`;
    if (G.weapons.cannon && U.primaryName) U.primaryName.textContent = G.fusions.cannon ? FUSIONS.cannon.name : G.weapons.cannon >= 8 ? '湮灭主炮' : WEAPONS.cannon.name;
    const downedNow = G.twoPlayer ? G.players.find(q => q.downed) : null;
    if (downedNow) U.sideTip.textContent = `P${downedNow.index + 1} 倒地 // 队友靠近并停留 2.4 秒可重启`;
    U.objectiveLabel.title = G.twoPlayer ? '双人合作：活到撤离，两人都倒下或基地被毁才失败' : (G.boss ? '泰坦会攻击最近的你和基地，撑到撤离' : '活到撤离，车体或基地归零即失败');
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
      const sub = fusion ? `FUSION // ${fusion.en}` : `LV.${lvl} / 8`;
      html += `<div class="loadout-item${fusion ? ' is-fused' : ''}">
        <canvas data-icon="${fusion ? fusion.icon : data.icon}" data-color="${fusion ? fusion.color : data.color}" data-size="22"></canvas>
        <div class="loadout-item__copy"><strong>${name}</strong><small>${sub}</small></div>
        <div class="loadout-pips">${Array.from({ length: 8 }, (_, i) => `<i class="${i < lvl ? 'is-on' : ''}"></i>`).join('')}</div>
      </div>`;
    }
    for (const id of Object.keys(G.passives)) {
      const data = PASSIVES[id]; const lvl = G.passives[id];
      if (!data) continue;
      html += `<div class="loadout-item is-passive">
        <canvas data-icon="${data.icon}" data-color="${data.color}" data-size="22"></canvas>
        <div class="loadout-item__copy"><strong>${data.name}</strong><small>PASSIVE · LV.${lvl} / ${data.max}</small></div>
        <div class="loadout-pips">${Array.from({ length: data.max }, (_, i) => `<i class="${i < lvl ? 'is-on' : ''}"></i>`).join('')}</div>
      </div>`;
    }
    const totalItems = Object.keys(G.weapons).length + Object.keys(G.passives).length;
    if (totalItems < 4) html += '<div class="loadout-hint">继续拾取余烬扩展构筑</div>';
    U.loadoutList.innerHTML = html || '<div class="empty-slot">升级解锁武器模块</div>';
    ICONS.applyAll(U.loadoutList);
    U.slotCount.textContent = `${Object.keys(G.weapons).length} / 6`;
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
      return `${map ? map.sector : `第 ${u.value} 关`} 封印 · 击破守卫`;
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
    showToast(`底盘解锁 // ${tank.name}`, 'cyan');
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
    showToast(`封印解除 // ${tank.name} 已解锁`, 'cyan');
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
    U.arenaOptions.innerHTML = MAPS.map((m, i) => {
      const locked = i >= camp.unlocked;
      const cleared = !!camp.cleared[i];
      const diff = difficultyData(stageDifficulty(camp, i));
      return `<button class="arena-card${i === G.arenaIndex ? ' is-active' : ''}${locked ? ' is-locked' : ''}${cleared ? ' is-cleared' : ''}" data-arena="${i}" type="button" ${locked ? 'disabled aria-disabled="true"' : ''}>
        <span class="arena-card__index">${String(i + 1).padStart(2, '0')} ${cleared ? '// CLEAR' : locked ? '// LOCKED' : '// READY'}</span>
        <span class="arena-card__name">${m.name}</span>
        <span class="arena-card__en">${m.en}</span>
        <span class="arena-card__trait">${m.desc}</span>
        <span class="arena-card__diff arena-card__diff--${diff.id}">${diff.name} / ${diff.en}</span>
        ${locked ? '<span class="arena-card__lock">▣</span>' : ''}
      </button>`;
    }).join('');
    U.arenaCards = Array.from(U.arenaOptions.querySelectorAll('.arena-card'));
    const p = U.stageProgress;
    if (p) p.textContent = `${String(camp.unlocked).padStart(2, '0')} / ${String(MAPS.length).padStart(2, '0')}`;
    if (U.stageFootHint) U.stageFootHint.textContent = camp.unlocked >= MAPS.length ? '全部星区已解锁。' : `已解锁 ${camp.unlocked} / ${MAPS.length} 个星区。`;
  }

  function drawTankPreview(canvas, tank) {
    if (!canvas || !tank) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    drawTankAt(ctx, canvas.width / 2, canvas.height / 2 + 3, -Math.PI / 2, -Math.PI / 2, tank.colors, .95, 0, { barrelLen: tank.id === 'railgun' ? 24 : 18, twin: tank.id === 'twin', heavy: tank.id === 'bastion' || tank.id === 'juggernaut', player: true });
  }

  function updateTankCount() {
    if (U.tankCountLabel) {
      const owned = (G.profile && G.profile.unlocked.length) || 1;
      U.tankCountLabel.textContent = `${owned} / ${TANKS.length}`;
    }
  }

  function updatePilotCard(slot) {
    const tank = TANKS.find(t => t.id === G.tankIds[slot]) || TANKS[0];
    const p2 = slot === 1;
    const nameEl = p2 ? U.pilotName2 : U.pilotName;
    const roleEl = p2 ? U.pilotRole2 : U.pilotRole;
    const traitEl = p2 ? U.pilotTrait2 : U.pilotTrait;
    const preview = p2 ? U.pilotPreview2 : U.pilotPreview;
    if (nameEl) nameEl.textContent = tank.name;
    if (roleEl) roleEl.textContent = `${tank.role} / ${tank.en}`;
    if (traitEl) traitEl.textContent = tank.trait;
    if (preview) drawTankPreview(preview, tank);
  }

  function renderTankGrid() {
    if (!U.tankGrid) return;
    const selected = G.tankViewId || G.tankIds[G.tankPickerSlot] || TANKS[0].id;
    const equipped = G.tankIds[G.tankPickerSlot] || TANKS[0].id;
    const profile = G.profile || readProfile();
    U.tankGrid.innerHTML = TANKS.map((t, i) => {
      const owned = tankOwned(t.id, profile);
      return `<button class="tank-card${t.id === selected ? ' is-active' : ''}${owned ? ' is-owned' : ' is-locked'}" type="button" data-tank="${t.id}" aria-pressed="${t.id === equipped ? 'true' : 'false'}">
        <div class="tank-card__top"><span class="tank-card__id">M-${String(i + 1).padStart(2, '0')}</span><span class="tank-card__role">${owned ? t.role : 'LOCKED'}</span></div>
        <canvas width="86" height="58" data-tank-preview="${t.id}"></canvas>
        <span class="tank-card__name">${t.name}</span>
        <span class="tank-card__en">${t.en}</span>
        <span class="tank-card__trait">${owned ? t.trait : tankRequirementText(t)}</span>
        ${owned ? (t.id === equipped ? '<span class="tank-card__lock">EQUIPPED</span>' : '') : `<span class="tank-card__lock">▣ ${t.cost} 核心</span>`}
      </button>`;
    }).join('');
    U.tankGrid.querySelectorAll('canvas[data-tank-preview]').forEach(cv => drawTankPreview(cv, TANKS.find(t => t.id === cv.dataset.tankPreview)));
    const tank = TANKS.find(t => t.id === selected) || TANKS[0];
    const owned = tankOwned(tank.id, profile);
    if (U.tankDetail) {
      const aff = (tank.affinity || []).map(id => (WEAPONS[id] && WEAPONS[id].name) || (PASSIVES[id] && PASSIVES[id].name) || id).join(' / ');
      const status = owned ? '<span class="tank-detail__ok">已解锁</span>' : `<span class="tank-detail__lock">未解锁 · ${tankRequirementText(tank)}</span>`;
      U.tankDetail.innerHTML = `<strong>${tank.name} // ${tank.en}</strong><br>${tank.desc}<br><b>${tank.trait}</b>${aff ? `<br><span class="tank-detail__affinity">协议偏好：${aff}</span>` : ''}<br>${status}${owned ? '' : ` · 兑换价 ${tank.cost} 核心`}`;
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
    renderStagePicker();
    updateDifficultyUI();
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
        return `<article class="fusion-card">
          <div class="fusion-card__part"><small>WEAPON / ${w.en}</small><strong>${w.name} Lv.${f.weaponLevel}</strong></div>
          <div class="fusion-card__plus">+</div>
          <div class="fusion-card__part"><small>PASSIVE / ${p.en}</small><strong>${p.name} Lv.${f.passiveLevel}</strong></div>
          <div class="fusion-card__result"><strong>${f.name}</strong><span>${f.desc}</span></div>
        </article>`;
      }).join('');
    }
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
    if (U.bestLevel) U.bestLevel.textContent = `LV.${String(Math.max(1, r.bestLevel)).padStart(2, '0')}`;
    if (U.bestWins) U.bestWins.textContent = String(r.wins);
  }

  function endRun(win, reason) {
    if (G.mode !== 'playing') return;
    G.mode = 'result';
    G.deadReason = reason || '';
    AUDIO.stopMusic();
    const progress = clamp(G.elapsed / TOTAL_TIME * 100, 0, 100);
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
      items.push(`<span${G.fusions[id] ? ' class="is-fused"' : ''}><i></i>${name} Lv.${G.weapons[id]}</span>`);
    }
    for (const id of Object.keys(G.passives)) if (PASSIVES[id]) items.push(`<span><i></i>${PASSIVES[id].short} Lv.${G.passives[id]}</span>`);
    U.resultBuild.innerHTML = items.join('');
    U.resultTime.textContent = fmtShort(G.elapsed);
    U.resultLevel.textContent = `LV.${String(G.level).padStart(2, '0')}`;
    U.resultKills.textContent = String(G.kills).padStart(3, '0');
    U.resultCore.textContent = `${Math.floor(progress)}%`;
    U.resultSeal.classList.toggle('is-win', win);
    U.resultSeal.querySelector('b').textContent = win ? 'WIN' : 'BF';
    U.resultTag.classList.toggle('is-win', win);
    const stageNo = String(G.arenaIndex + 1).padStart(2, '0');
    if (win) {
      const finalWin = G.arenaIndex >= MAPS.length - 1;
      U.resultTag.textContent = finalWin ? 'CAMPAIGN COMPLETE // 战役完成' : `SECTOR ${stageNo} CLEARED // 关卡突破`;
      U.resultTitle.textContent = finalWin ? '穹顶陷落' : '黎明抵达';
      U.resultFlavor.textContent = finalWin ? '最后一道钢铁潮汐退去。整条战役线已经打通。' : `第 ${stageNo} 关已清理。下一关的入口正在开启。`;
      U.resultCore.textContent = '100%';
      AUDIO.victory();
    } else {
      const baseLost = reason === 'base';
      U.resultTag.textContent = baseLost ? 'MISSION FAILED // 基地失守' : 'MISSION FAILED // 车体击毁';
      U.resultTitle.textContent = baseLost ? '防线归零' : '钢铁归零';
      U.resultFlavor.textContent = baseLost
        ? `第 ${stageNo} 关基地装甲归零，防线被撕开。优先清理拆墙单位和远程火力。`
        : `第 ${stageNo} 关未能突破。调整坦克与协议，再试一次。`;
      AUDIO.gameOver();
    }
    const resultDiff = difficultyData(G.difficulty);
    if (G.lastCoreReward) U.resultFlavor.textContent += ` // ${resultDiff.name} · 合金核心 +${G.lastCoreReward}`;
    if (U.nextBtn) {
      U.nextBtn.classList.toggle('is-hidden', !(win && G.nextStageIndex >= 0));
      const next = U.nextBtn.querySelector('strong');
      if (next) next.textContent = G.nextStageIndex >= 0 ? `下一关 · ${MAPS[G.nextStageIndex].name}` : '下一关';
    }
    U.bossHud.classList.add('is-hidden');
    U.levelupScreen.classList.add('hidden');
    U.pauseScreen.classList.add('hidden');
    setTimeout(() => {
      if (G.mode === 'result') {
        U.resultScreen.classList.remove('hidden');
        G.lastFrame = performance.now();
      }
    }, 520);
  }

  function returnToMenu() {
    G.mode = 'menu';
    AUDIO.stopMusic();
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
    Input.mouse.down = false;
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

  function pauseGame() {
    if (G.mode !== 'playing') return;
    G.mode = 'paused';
    Input.keys.clear();
    Input.mouse.down = false;
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
      ? (isTouchUI() ? '手机双人建议外接手柄 · 两台机型分别选择 · 共享构筑' : 'P1 键鼠 · P2 Xbox 手柄 / 方向键 · 各自选机型 · 共享构筑')
      : (isTouchUI() ? '触屏摇杆移动 · 自动索敌 · 单兵生存' : 'P1 键鼠 · 自动索敌 · 单兵生存');
    if (U.tankPickerBtn2) U.tankPickerBtn2.classList.toggle('is-hidden', !G.coopSelected);
    updatePilotCard(0);
    updatePilotCard(1);
    if (U.startBtnLabel) U.startBtnLabel.textContent = G.coopSelected ? '双人出击' : '点火出击';
    if (U.startBtnSub) U.startBtnSub.textContent = G.coopSelected ? 'LINK TWO PILOTS / CO-OP' : 'ENTER THE SECTOR';
  }

  function updateDifficultyUI() {
    const diff = difficultyData(G.difficulty);
    if (U.stageDifficulty) U.stageDifficulty.textContent = `${diff.en} / ${diff.name}`;
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
    index = clamp(index | 0, 0, Math.min(MAPS.length - 1, camp.unlocked - 1));
    G.arenaIndex = index;
    G.arena = MAPS[index];
    G.difficulty = stageDifficulty(camp, index);
    U.arenaCards.forEach((card, i) => {
      card.classList.toggle('is-active', i === index);
      card.setAttribute('aria-pressed', i === index ? 'true' : 'false');
    });
    const diff = difficultyData(G.difficulty);
    if (U.stageHint) {
      const cleared = camp.cleared[index] ? ' // 已突破' : '';
      U.stageHint.textContent = `${MAPS[index].sector} · ${diff.name} · ${MAPS[index].desc}${cleared} · 通关解锁下一关`;
    }
    if (U.stageIndex) U.stageIndex.textContent = String(index + 1).padStart(2, '0');
    if (U.stageName) U.stageName.textContent = MAPS[index].name;
    if (U.stageMeta) U.stageMeta.textContent = `${MAPS[index].sector} / ${MAPS[index].en}`;
    if (U.stageTrait) U.stageTrait.textContent = `${MAPS[index].desc}${camp.cleared[index] ? ' · 已突破' : ''}`;
    updateDifficultyUI();
    const frame = document.querySelector('.visual-frame');
    if (frame) {
      frame.style.borderColor = hexA(MAPS[index].palette.accent, .27);
      frame.style.boxShadow = `0 0 0 1px rgba(0,0,0,.5), 0 0 70px ${hexA(MAPS[index].palette.accent, .12)}`;
    }
    if (U.visualUnitSub) U.visualUnitSub.textContent = `MODULAR SIEGE PLATFORM / ${MAPS[index].sector}`;
    menuCache = null;
    menuParticles = [];
  }

  function codexEntries() {
    const normal = ['scout', 'grunt', 'heavy', 'bomber', 'sniper'].map(key => {
      const cfg = ENEMIES[key];
      return { key, type: key, name: cfg.name, en: cfg.en, desc: cfg.codex, colors: cfg, cls: 'normal' };
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
    const boss = [{ key: 'boss', type: 'boss', name: ENEMIES.boss.name, en: ENEMIES.boss.en, desc: ENEMIES.boss.codex, colors: ENEMIES.boss, cls: 'boss' }];
    return { normal, elite, boss };
  }

  function drawCodexPreview(canvas, entry) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const c = entry.colors || {};
    const locked = !readCodex().includes(entry.key);
    const colors = locked
      ? { body: '#1b2721', light: '#354740', dark: '#0b110e', core: '#5c746a' }
      : { body: c.body || c.color || '#555', light: c.light || '#ccc', dark: c.dark || '#222', core: c.core || c.coreColor || '#5ff0ce' };
    const isBoss = entry.cls === 'boss';
    const scale = isBoss ? 2.9 : entry.cls === 'elite' ? 2.25 : 1.95;
    ctx.save();
    ctx.translate(w / 2, h / 2 + 4);
    drawTankAt(ctx, 0, 0, -Math.PI / 2, -Math.PI / 2, colors, scale, .35, {
      recoil: 0, heavy: isBoss || entry.type === 'heavy', elite: entry.cls === 'elite' || isBoss,
      twin: isBoss || entry.cls === 'elite', bomber: entry.type === 'bomber', enemyType: entry.type,
      barrelLen: entry.type === 'sniper' ? 23 : entry.cls === 'elite' ? 20 : 16,
      barrelWide: entry.type === 'heavy' || entry.cls === 'elite' || isBoss
    });
    ctx.restore();
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
    const all = entries.normal.concat(entries.elite, entries.boss);
    const total = all.length;
    const found = all.filter(e => seen.has(e.key)).length;
    if (U.codexProgress) U.codexProgress.textContent = `${found} / ${total}`;
    const section = (title, sub, list) => {
      const n = list.filter(e => seen.has(e.key)).length;
      const cards = list.map(e => {
        const known = seen.has(e.key);
        return `<article class="codex-card is-${e.cls}${known ? '' : ' is-locked'}">
          <canvas width="200" height="116" data-codex-key="${e.key}"></canvas>
          <strong class="codex-card__name">${known ? e.name : '???'}</strong>
          <small class="codex-card__en">${known ? e.en : 'UNRECORDED'}</small>
          <span class="codex-card__desc">${known ? e.desc : '尚未遭遇。进入战区并让它出现在你的雷达上。'}</span>
        </article>`;
      }).join('');
      return `<section class="codex-section"><div class="codex-section__head"><span>${title} // ${sub}</span><b>${n} / ${list.length}</b></div><div class="codex-cards">${cards}</div></section>`;
    };
    U.codexGrid.innerHTML = section('NORMAL', '普通单位', entries.normal)
      + section('ELITE', '精英单位', entries.elite)
      + section('BOSS', 'Boss 单位', entries.boss);
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
    if (!data || typeof data !== 'object' || Array.isArray(data)) { setSaveStatus('不是有效的砖火存档。', 'bad'); return; }
    const keys = Object.keys(data).filter(k => SAVE_KEYS.includes(k));
    if (!keys.length) { setSaveStatus('存档中没有可导入的砖火数据。', 'bad'); return; }
    if (!window.confirm('导入会覆盖当前浏览器里的砖火存档，是否继续？')) return;
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

  function showHow() {
    U.howScreen.classList.remove('hidden');
    AUDIO.init(); AUDIO.tick();
  }
  function hideHow() { U.howScreen.classList.add('hidden'); }

  /* ---------------- input / lifecycle ---------------- */
  function cacheUI() {
    const ids = ['app', 'menuScreen', 'menuCanvas', 'startBtn', 'howBtn', 'howScreen', 'howClose', 'howStart', 'soundBtnMenu',
      'gameLayout', 'sectorLabel', 'phaseLabel', 'clockLabel', 'clockBar', 'bossMarker', 'topKills', 'soundBtn', 'pauseBtn', 'fullBtn', 'fullBtnMenu',
      'battleFrame', 'gameCanvas', 'toastStack', 'bossHud', 'bossHpLabel', 'bossHpBar', 'mobileHud', 'mCoreBar', 'mBaseBar', 'mHpBar', 'mLevel', 'levelLabel', 'hpText', 'hpMeter', 'xpText', 'xpMeter',
      'statAtk', 'statSpd', 'statCrit', 'coreState', 'corePercent', 'coreText', 'coreRing', 'corePips', 'slotCount', 'loadoutList',
      'coopPanel', 'coopHp1', 'coopMeter1', 'coopState1', 'coopHp2', 'coopMeter2', 'coopState2', 'deckHint', 'modePicker', 'modeHint', 'startBtnLabel', 'startBtnSub', 'coreNote',
      'killCount', 'comboCount', 'pickupCount', 'threatLabel', 'threatBars', 'sideTip', 'primaryIcon', 'primaryName', 'dashStatus', 'dashMeter',
      'objectiveLabel', 'dangerTint', 'levelupScreen', 'newLevel', 'upgradeCards', 'rerollBtn', 'rerollCount', 'pauseScreen', 'resumeBtn',
      'restartBtn', 'quitBtn', 'resultScreen', 'resultTag', 'resultTitle', 'resultSeal', 'resultFlavor', 'resultTime', 'resultLevel',
      'resultKills', 'resultCore', 'resultBuild', 'nextBtn', 'againBtn', 'backBtn', 'mobileStick', 'mobileDash', 'bestTime', 'bestLevel', 'bestWins',
      'arenaOptions', 'stageProgress', 'stageHint', 'tankPickerBtn', 'tankPickerBtn2', 'tankCountLabel', 'pilotPreview', 'pilotPreview2', 'pilotName', 'pilotName2', 'pilotRole', 'pilotRole2', 'pilotTrait', 'pilotTrait2', 'pilotHudName',
      'visualUnit', 'visualUnitSub', 'fusionBtn', 'tankScreen', 'tankGrid', 'tankDetail', 'tankClose', 'tankConfirm', 'tankSlotLabel', 'tankCores', 'tankUnlockBtn', 'tankScreenHint', 'fusionScreen', 'fusionGrid', 'fusionClose', 'fusionDone',
      'stageScreen', 'stagePickerBtn', 'stageClose', 'stageConfirm', 'stageFootHint', 'stageIndex', 'stageName', 'stageMeta', 'stageTrait', 'stageDifficulty', 'difficultyOptions', 'difficultyHint',
      'baseHpText', 'baseHpMeter', 'baseTurretNote', 'codexBtn', 'codexScreen', 'codexProgress', 'codexGrid', 'codexClose', 'codexDone', 'saveBtn', 'saveScreen', 'saveText', 'saveExportBtn', 'saveCopyBtn', 'saveImportBtn', 'saveClose', 'saveDone', 'saveStatus'];
    for (const id of ids) U[id] = document.getElementById(id);
    U.arenaCards = Array.from(U.arenaOptions ? U.arenaOptions.querySelectorAll('.arena-card') : document.querySelectorAll('.arena-card'));
    U.modeCards = Array.from(document.querySelectorAll('.mode-card'));
    U.visualFrame = document.querySelector('.visual-frame');
    U.baseMeter = document.querySelector('.base-meter');
  }

  function bindUI() {
    window.addEventListener('gamepadconnected', () => {
      Input.gamepad.connected = true;
      syncPadState();
    });
    window.addEventListener('gamepaddisconnected', () => {
      Input.gamepad.connected = false;
      syncPadState();
    });
    U.modeCards.forEach(card => card.addEventListener('click', () => { AUDIO.init(); selectCoop(card.dataset.coop === '1'); AUDIO.tick(); }));
    U.startBtn.addEventListener('click', () => { AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.coopSelected); });
    U.arenaOptions.addEventListener('click', e => {
      const card = e.target.closest('.arena-card');
      if (!card || card.disabled) return;
      AUDIO.init(); selectArena(parseInt(card.dataset.arena, 10)); closeStageScreen(); AUDIO.tick();
    });
    U.stagePickerBtn.addEventListener('click', openStageScreen);
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
      if (U.stageHint) U.stageHint.textContent = `${MAPS[G.arenaIndex].sector} · ${diff.name} · ${MAPS[G.arenaIndex].desc}${camp.cleared[G.arenaIndex] ? ' // 已突破' : ''} · 通关解锁下一关`;
      AUDIO.init(); AUDIO.tick();
    });
    U.stageClose.addEventListener('click', closeStageScreen);
    U.stageConfirm.addEventListener('click', closeStageScreen);
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
        showToast('合金核心不足 // 继续出战获取', 'red');
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
    U.saveBtn.addEventListener('click', openSaveScreen);
    U.saveClose.addEventListener('click', closeSaveScreen);
    U.saveDone.addEventListener('click', closeSaveScreen);
    U.saveScreen.addEventListener('click', e => { if (e.target === U.saveScreen || e.target.classList.contains('overlay__backdrop')) closeSaveScreen(); });
    U.saveExportBtn.addEventListener('click', downloadSave);
    U.saveCopyBtn.addEventListener('click', copySave);
    U.saveImportBtn.addEventListener('click', importSave);
    U.howBtn.addEventListener('click', showHow);
    U.howClose.addEventListener('click', hideHow);
    U.howStart.addEventListener('click', () => { hideHow(); AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.coopSelected); });
    U.howScreen.addEventListener('click', e => { if (e.target === U.howScreen || e.target.classList.contains('overlay__backdrop')) hideHow(); });
    U.soundBtnMenu.addEventListener('click', toggleMute);
    U.soundBtn.addEventListener('click', toggleMute);
    U.pauseBtn.addEventListener('click', pauseGame);
    U.fullBtn.addEventListener('click', toggleFullscreen);
    if (U.fullBtnMenu) U.fullBtnMenu.addEventListener('click', toggleFullscreen);
    U.resumeBtn.addEventListener('click', resumeGame);
    U.restartBtn.addEventListener('click', () => { AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.lastCoop); });
    U.quitBtn.addEventListener('click', returnToMenu);
    U.nextBtn.addEventListener('click', () => { AUDIO.init(); AUDIO.confirm(); startRun(G.nextStageIndex, G.lastCoop); });
    U.againBtn.addEventListener('click', () => { AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.lastCoop); });
    U.backBtn.addEventListener('click', returnToMenu);
    U.rerollBtn.addEventListener('click', rerollUpgrades);
    U.upgradeCards.addEventListener('click', e => {
      const card = e.target.closest('.upgrade-card');
      if (card) chooseUpgrade(parseInt(card.dataset.index, 10));
    });
    U.pauseScreen.addEventListener('click', e => { if (e.target.classList.contains('overlay__backdrop')) resumeGame(); });
    U.levelupScreen.addEventListener('click', e => { if (e.target.classList.contains('overlay__backdrop')) { /* must choose */ } });

    U.gameCanvas.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') Input.mouse.over = true; });
    U.gameCanvas.addEventListener('pointerleave', () => { Input.mouse.over = false; Input.mouse.down = false; });
    U.gameCanvas.addEventListener('pointermove', e => {
      const r = U.gameCanvas.getBoundingClientRect();
      Input.mouse.x = (e.clientX - r.left) / r.width * W;
      Input.mouse.y = (e.clientY - r.top) / r.height * H;
      Input.mouse.over = true;
    });
    U.gameCanvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const r = U.gameCanvas.getBoundingClientRect();
      Input.mouse.x = (e.clientX - r.left) / r.width * W;
      Input.mouse.y = (e.clientY - r.top) / r.height * H;
      Input.mouse.down = true;
      Input.mouse.over = true;
      if (G.mode === 'playing' && e.pointerType !== 'mouse') e.preventDefault();
    });
    window.addEventListener('pointerup', () => { Input.mouse.down = false; });
    U.gameCanvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('keydown', e => {
      if (e.code === 'KeyM') { toggleMute(); return; }
      if (e.code === 'KeyF') { toggleFullscreen(); return; }
      if (e.code === 'Escape') {
        if (!U.stageScreen.classList.contains('hidden')) { closeStageScreen(); return; }
        if (!U.tankScreen.classList.contains('hidden')) { closeTankScreen(); return; }
        if (!U.fusionScreen.classList.contains('hidden')) { closeFusionScreen(); return; }
        if (!U.howScreen.classList.contains('hidden')) { hideHow(); return; }
        if (G.mode === 'paused') { resumeGame(); return; }
        if (G.mode === 'playing') { pauseGame(); return; }
        if (G.mode === 'result') { returnToMenu(); return; }
        return;
      }
      if (G.mode === 'levelup') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') chooseUpgrade(0);
        else if (e.code === 'Digit2' || e.code === 'Numpad2') chooseUpgrade(1);
        else if (e.code === 'Digit3' || e.code === 'Numpad3') chooseUpgrade(2);
        else if (e.code === 'KeyR') rerollUpgrades();
        return;
      }
      if (G.mode === 'menu') {
        if (!U.howScreen.classList.contains('hidden')) {
          if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); hideHow(); startRun(G.arenaIndex, G.coopSelected); }
          return;
        }
        if (!U.stageScreen.classList.contains('hidden') || !U.tankScreen.classList.contains('hidden') || !U.fusionScreen.classList.contains('hidden')) return;
        if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.coopSelected); }
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
      if (e.code === 'KeyP') pauseGame();
    });
    window.addEventListener('keyup', e => Input.keys.delete(e.code));
    const autoPauseEnabled = !new URLSearchParams(location.search).has('noauto');
    window.addEventListener('blur', () => {
      Input.keys.clear(); Input.mouse.down = false;
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
    el.textContent = !supported ? 'PAD / 不支持' : Input.gamepad.connected ? 'PAD / ONLINE' : 'PAD / 按手柄键';
    el.title = !supported
      ? '当前浏览器不支持 Gamepad API；请使用 Chrome / Edge 等支持手柄的浏览器。'
      : Input.gamepad.connected
        ? `已识别手柄：${Input.gamepad.id || 'Controller'}`
        : '未检测到手柄。连接后按任意键；浏览器需支持 Gamepad API 并保持页面聚焦。';
    el.classList.toggle('is-on', Input.gamepad.connected);
  }

  function isUiVisible(el) {
    if (!el || el.classList.contains('hidden') || el.classList.contains('is-hidden')) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function uiContext() {
    const overlays = [
      ['levelup', U.levelupScreen], ['pause', U.pauseScreen], ['result', U.resultScreen],
      ['stage', U.stageScreen], ['tank', U.tankScreen], ['fusion', U.fusionScreen],
      ['codex', U.codexScreen], ['save', U.saveScreen], ['how', U.howScreen]
    ];
    for (const [key, el] of overlays) {
      if (isUiVisible(el)) return { key, root: el };
    }
    if (G.mode === 'menu' && isUiVisible(U.menuScreen)) return { key: 'menu', root: U.menuScreen };
    return null;
  }

  function padFocusables(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(el => {
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
  }

  function clearPadFocus() {
    const g = Input.gamepad;
    if (g.focusEl) g.focusEl.classList.remove('is-pad-focus');
    g.focusEl = null;
  }

  function defaultPadFocus(ctx) {
    if (!ctx) return null;
    if (ctx.key === 'menu') return U.startBtn;
    if (ctx.key === 'levelup') return U.upgradeCards && U.upgradeCards.querySelector('.upgrade-card');
    if (ctx.key === 'pause') return U.resumeBtn;
    if (ctx.key === 'result') return U.nextBtn && !U.nextBtn.classList.contains('is-hidden') ? U.nextBtn : U.againBtn;
    const list = padFocusables(ctx.root);
    return list.find(el => el.classList.contains('arena-card') || el.classList.contains('tank-card')) ||
      list.find(el => el.classList.contains('cta') && !el.classList.contains('close-btn')) || list[0] || null;
  }

  function syncPadContext(force) {
    const g = Input.gamepad;
    const ctx = uiContext();
    if (!ctx) { g.uiKey = ''; clearPadFocus(); return null; }
    if (force || ctx.key !== g.uiKey) {
      g.uiKey = ctx.key;
      g.selectedCard = 0;
      const first = defaultPadFocus(ctx);
      if (first) setPadFocus(first); else clearPadFocus();
    } else if (!g.focusEl || !padFocusables(ctx.root).includes(g.focusEl)) {
      const first = defaultPadFocus(ctx);
      if (first) setPadFocus(first); else clearPadFocus();
    }
    return ctx;
  }

  function movePadFocus(dx, dy) {
    const g = Input.gamepad;
    const ctx = syncPadContext(false);
    if (!ctx) return;
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
    if (best) { setPadFocus(best); return; }
    // Keep short lists usable at the edges: wrap to the nearest item in the
    // requested direction rather than dropping input.
    if (dx) setPadFocus(dx > 0 ? list[0] : list[list.length - 1]);
    else setPadFocus(dy > 0 ? list[0] : list[list.length - 1]);
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
    if (ctx.key === 'stage') closeStageScreen();
    else if (ctx.key === 'tank') closeTankScreen();
    else if (ctx.key === 'fusion') closeFusionScreen();
    else if (ctx.key === 'codex') closeCodexScreen();
    else if (ctx.key === 'save') closeSaveScreen();
    else if (ctx.key === 'how') hideHow();
    else if (ctx.key === 'pause') resumeGame();
    else if (ctx.key === 'result') returnToMenu();
    return true;
  }

  function pollGamepad() {
    const g = Input.gamepad;
    const pads = gamepadList();
    const gp = Array.from(pads).find(p => p && p.connected);
    if (!gp) {
      if (g.connected) {
        g.connected = false; g.id = ''; g.x = 0; g.y = 0; g.aimActive = false; g.fire = false; g.prevButtons = [];
        syncPadState();
        if (G.mode === 'playing') showToast('Xbox 手柄已断开', 'red');
      }
      return;
    }
    if (!g.connected) {
      g.connected = true;
      g.id = gp.id || 'Xbox Controller';
      syncPadState();
      if (G.mode === 'playing') showToast('Xbox 手柄已连接 // 左摇杆移动', 'cyan');
    }
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
    g.x = x; g.y = y;

    const ax = gp.axes[2] || 0, ay = gp.axes[3] || 0;
    const aimMag = Math.hypot(ax, ay);
    if (aimMag > .28) {
      g.aimActive = true;
      g.aimX = ax / aimMag; g.aimY = ay / aimMag;
    } else {
      g.aimActive = false; g.aimX = 0; g.aimY = 0;
    }
    g.fire = !!(btns[7] && btns[7].pressed) || !!(btns[6] && btns[6].pressed);

    const pressed = i => !!(btns[i] && btns[i].pressed);
    const was = i => !!g.prevButtons[i];
    const just = i => pressed(i) && !was(i);
    const dpadPressed = pressed(12) || pressed(13) || pressed(14) || pressed(15);
    let padStep = null;
    if (G.mode !== 'playing' && !dpadPressed) {
      const ax = Math.abs(x) >= .48 ? Math.sign(x) : 0;
      const ay = Math.abs(y) >= .48 ? Math.sign(y) : 0;
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
    } else if (G.mode === 'playing') {
      g.uiDirX = 0; g.uiDirY = 0;
    }

    if (G.mode === 'playing') {
      clearPadFocus();
      g.uiKey = '';
      if (just(0)) {
        if (G.twoPlayer) Input.dashQueued2 = true; else Input.dashQueued = true;
      }
      if (just(9)) pauseGame();
    } else {
      const ctx = syncPadContext(false);
      if (ctx && ctx.key === 'levelup') {
        const cardCount = 3;
        const left = just(14) || just(12) || just(4) || (padStep && padStep.dx < 0) || (padStep && padStep.dy < 0);
        const right = just(15) || just(13) || just(5) || (padStep && padStep.dx > 0) || (padStep && padStep.dy > 0);
        if (left) g.selectedCard = (g.selectedCard + cardCount - 1) % cardCount;
        if (right) g.selectedCard = (g.selectedCard + 1) % cardCount;
        if (just(0)) { AUDIO.init(); chooseUpgrade(g.selectedCard || 0); }
        if (just(1)) rerollUpgrades();
        const cards = U.upgradeCards ? U.upgradeCards.querySelectorAll('.upgrade-card') : [];
        if (cards[g.selectedCard]) setPadFocus(cards[g.selectedCard]);
        cards.forEach((card, i) => card.classList.toggle('is-pad', i === g.selectedCard));
      } else if (ctx) {
        if (padStep) movePadFocus(padStep.dx, padStep.dy);
        else if (just(12)) movePadFocus(0, -1);
        else if (just(13)) movePadFocus(0, 1);
        else if (just(14)) movePadFocus(-1, 0);
        else if (just(15)) movePadFocus(1, 0);
        if (just(0)) activatePadFocus();
        if (just(1)) backPadContext();
        if (just(9)) {
          if (G.mode === 'menu') { AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.coopSelected); }
          else if (G.mode === 'paused') resumeGame();
          else if (G.mode === 'result') returnToMenu();
        }
      } else if (G.mode === 'paused') {
        if (just(0) || just(9)) resumeGame();
      } else if (G.mode === 'result') {
        if (just(0)) { AUDIO.init(); AUDIO.confirm(); startRun(G.arenaIndex, G.lastCoop); }
        if (just(9)) returnToMenu();
      }
    }
    g.prevButtons = Array.from(btns, b => !!(b && b.pressed));
  }

  function init() {
    cacheUI();
    gameCtx = U.gameCanvas.getContext('2d');
    menuCtx = U.menuCanvas.getContext('2d');
    [gameCtx, menuCtx].forEach(ctx => { if (ctx) ctx.imageSmoothingEnabled = false; });
    bindUI();
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
    updateBestStats();
    syncPadState();
    U.bossMarker.style.left = `${BOSS_AT / TOTAL_TIME * 100}%`;
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
        return { mode: G.mode, elapsed: G.elapsed, hp: G.player && G.player.hp, hp1: G.players[0] && G.players[0].hp, hp2: G.players[1] && G.players[1].hp, down1: G.players[0] && G.players[0].downed, down2: G.players[1] && G.players[1].downed, progress: Math.round(G.elapsed / TOTAL_TIME * 100), level: G.level, kills: G.kills };
      };
      window.__BF_DEBUG = { G, Input, startRun, recalcStats, addXp, spawnEnemy, damageEnemy, damageSeal, killEnemy, spawnBoss, damageBase, updateBase, nearestTarget, hitTile, markCodex, renderCodex, makeSaveText, openCodexScreen, openSaveScreen, openLevelUp, chooseUpgrade, endRun, tick, draw: () => drawGame(performance.now() / 1000), pad: { poll: pollGamepad, context: uiContext, focusables: padFocusables, move: movePadFocus, activate: activatePadFocus, back: backPadContext, scan: () => Array.from(gamepadList()).filter(Boolean).map(gp => ({ id: gp.id, mapping: gp.mapping, connected: gp.connected, axes: Array.from(gp.axes || []), buttons: Array.from(gp.buttons || []).map(b => ({ pressed: b.pressed, value: b.value })) })) } };
    }
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (G.mode !== 'playing') return;
    G.time += dt;
    G.elapsed += dt;
    updateStatus(dt);
    if (G.mode !== 'playing') return;
    updateWaves(dt);
    if (G.mode !== 'playing') return;
    updateBase(dt);
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
    if (G.mode === 'playing' && G.pendingLevels > 0) openLevelUp();
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
