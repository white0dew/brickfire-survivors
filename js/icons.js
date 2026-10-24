/* STEEL EMBERS // procedural pixel icon painter */
(function () {
  'use strict';

  function rgba(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function lighten(hex, amt) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = Math.min(255, ((n >> 16) & 255) + amt);
    const g = Math.min(255, ((n >> 8) & 255) + amt);
    const b = Math.min(255, (n & 255) + amt);
    return `rgb(${r},${g},${b})`;
  }
  function darken(hex, amt) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = Math.max(0, ((n >> 16) & 255) - amt);
    const g = Math.max(0, ((n >> 8) & 255) - amt);
    const b = Math.max(0, (n & 255) - amt);
    return `rgb(${r},${g},${b})`;
  }

  function painter(ctx, color) {
    const U = 20;
    const light = lighten(color, 74);
    const soft = lighten(color, 30);
    const dark = darken(color, 74);
    const deep = darken(color, 112);
    const ink = '#07100c';
    const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const glow = (on) => { ctx.shadowColor = on ? rgba(color, .8) : 'transparent'; ctx.shadowBlur = on ? 8 : 0; };
    return { U, light, soft, dark, deep, ink, rect, glow, color };
  }

  const DRAW = {
    cannon(ctx, p) {
      const { rect, light, soft, dark, deep, ink, glow, color } = p;
      glow(true); rect(9, 1, 3, 8, soft); rect(8, 1, 5, 2, light); glow(false);
      rect(10, 3, 1, 5, light);
      rect(5, 7, 10, 2, ink); rect(4, 9, 12, 8, dark); rect(5, 9, 10, 6, soft);
      rect(7, 8, 6, 6, color); rect(8, 9, 4, 3, light);
      rect(2, 10, 2, 7, ink); rect(3, 10, 2, 6, dark); rect(16, 10, 2, 6, dark); rect(17, 10, 1, 6, ink);
      rect(5, 14, 10, 1, deep); rect(6, 16, 2, 1, light); rect(12, 16, 2, 1, light);
      rect(9, 10, 2, 1, ink);
    },
    drone(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      glow(true); rect(8, 8, 4, 4, light); glow(false);
      rect(4, 4, 3, 3, soft); rect(13, 4, 3, 3, soft); rect(4, 13, 3, 3, soft); rect(13, 13, 3, 3, soft);
      rect(5, 5, 1, 1, '#fff'); rect(14, 5, 1, 1, '#fff'); rect(5, 14, 1, 1, '#fff'); rect(14, 14, 1, 1, '#fff');
      rect(6, 6, 2, 1, dark); rect(12, 6, 2, 1, dark); rect(6, 13, 2, 1, dark); rect(12, 13, 2, 1, dark);
      rect(2, 3, 1, 5, dark); rect(17, 3, 1, 5, dark); rect(3, 2, 3, 1, deep); rect(14, 2, 3, 1, deep);
      rect(2, 15, 1, 3, dark); rect(17, 15, 1, 3, dark);
      rect(7, 7, 6, 1, deep); rect(7, 12, 6, 1, deep);
    },
    arc(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(3, 15, 14, 2, deep); rect(5, 14, 10, 1, dark);
      rect(5, 4, 2, 10, dark); rect(13, 4, 2, 10, dark); rect(7, 3, 6, 2, soft);
      rect(6, 5, 1, 7, color); rect(14, 5, 1, 7, color); rect(8, 4, 4, 1, light);
      glow(true);
      rect(9, 3, 2, 3, light); rect(7, 6, 3, 3, light); rect(10, 8, 3, 2, light); rect(8, 11, 3, 2, light); rect(9, 13, 2, 3, light);
      glow(false);
      rect(6, 16, 2, 1, light); rect(12, 16, 2, 1, light);
    },
    flame(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      glow(true);
      rect(9, 1, 3, 4, soft); rect(7, 4, 4, 3, color); rect(11, 4, 3, 4, color);
      rect(5, 8, 4, 5, soft); rect(10, 7, 5, 7, color); rect(3, 12, 4, 4, dark);
      rect(6, 12, 6, 5, color); rect(9, 11, 4, 5, light); rect(12, 12, 3, 4, dark);
      rect(8, 9, 3, 6, light);
      glow(false);
      rect(4, 16, 12, 2, deep); rect(3, 15, 2, 1, dark); rect(15, 15, 2, 1, dark);
      rect(9, 6, 1, 2, '#fff6d8');
    },
    mine(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      glow(false);
      rect(8, 2, 4, 2, dark); rect(8, 16, 4, 2, dark); rect(2, 8, 2, 4, dark); rect(16, 8, 2, 4, dark);
      rect(5, 5, 2, 2, soft); rect(13, 5, 2, 2, soft); rect(4, 13, 2, 2, soft); rect(14, 13, 2, 2, soft);
      rect(5, 6, 10, 8, deep); rect(6, 6, 8, 8, dark); rect(5, 8, 10, 4, color);
      rect(7, 5, 6, 10, color); rect(8, 7, 4, 6, soft);
      glow(true); rect(9, 9, 2, 2, '#fff2a5'); rect(8, 8, 4, 1, light); glow(false);
      rect(8, 12, 4, 1, deep); rect(9, 15, 2, 2, deep);
    },
    orbital(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(2, 2, 3, 3, dark); rect(15, 2, 3, 3, dark); rect(7, 7, 6, 6, deep); rect(8, 8, 4, 4, color);
      rect(2, 3, 1, 1, light); rect(17, 3, 1, 1, light); rect(3, 3, 1, 1, light); rect(16, 3, 1, 1, light);
      rect(9, 3, 2, 4, dark); rect(9, 3, 1, 4, soft);
      glow(true); rect(9, 13, 2, 5, light); rect(8, 12, 4, 2, soft); rect(10, 8, 1, 5, light); glow(false);
      rect(5, 12, 2, 1, deep); rect(13, 12, 2, 1, deep); rect(6, 14, 1, 2, dark); rect(13, 14, 1, 2, dark);
      rect(9, 10, 2, 1, '#fff');
    },
    engine(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(3, 4, 14, 12, deep); rect(4, 5, 12, 10, dark); rect(6, 6, 8, 8, color);
      rect(8, 8, 4, 4, light); rect(9, 9, 2, 2, soft);
      rect(1, 6, 2, 2, dark); rect(17, 6, 2, 2, dark); rect(1, 12, 2, 2, dark); rect(17, 12, 2, 2, dark);
      rect(7, 2, 2, 3, soft); rect(11, 2, 2, 3, soft); rect(7, 15, 2, 3, deep); rect(11, 15, 2, 3, deep);
      glow(true); rect(9, 16, 1, 3, light); rect(11, 16, 1, 2, soft); glow(false);
    },
    armor(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(4, 2, 12, 2, dark); rect(3, 4, 14, 3, dark);
      rect(4, 4, 12, 7, soft); rect(5, 4, 10, 8, color); rect(6, 12, 8, 3, color); rect(8, 15, 4, 2, dark);
      rect(5, 5, 10, 1, light); rect(7, 8, 6, 1, deep); rect(6, 11, 8, 1, deep);
      glow(true); rect(9, 6, 2, 4, light); rect(8, 7, 4, 2, light); glow(false);
      rect(5, 6, 1, 1, '#fff'); rect(14, 6, 1, 1, '#fff');
    },
    loader(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(3, 5, 6, 10, deep); rect(4, 6, 4, 8, dark); rect(5, 7, 2, 2, soft); rect(5, 10, 2, 2, soft);
      rect(7, 3, 3, 14, deep); rect(8, 4, 1, 12, color);
      rect(11, 7, 4, 2, color); rect(14, 7, 2, 2, soft); rect(15, 9, 2, 4, soft); rect(11, 12, 4, 2, color);
      glow(true); rect(10, 5, 2, 2, light); rect(16, 12, 2, 2, light); glow(false);
      rect(11, 13, 2, 2, dark);
    },
    magnet(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(3, 3, 4, 4, dark); rect(13, 3, 4, 4, dark);
      rect(4, 3, 2, 9, color); rect(14, 3, 2, 9, color); rect(4, 3, 1, 7, light); rect(14, 3, 1, 7, light);
      rect(4, 10, 12, 4, color); rect(6, 12, 8, 4, dark); rect(5, 11, 10, 1, soft);
      rect(2, 2, 2, 5, deep); rect(16, 2, 2, 5, deep);
      glow(true); rect(6, 12, 1, 3, light); rect(13, 12, 1, 3, light); glow(false);
    },
    warhead(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(8, 2, 4, 3, light); rect(7, 5, 6, 7, color); rect(5, 6, 2, 7, dark); rect(13, 6, 2, 7, dark);
      rect(7, 11, 6, 2, deep); rect(8, 13, 4, 2, dark); rect(5, 14, 10, 2, deep);
      rect(6, 7, 2, 4, soft); rect(9, 5, 1, 6, light);
      glow(true); rect(10, 15, 2, 4, light); rect(12, 17, 3, 2, soft); glow(false);
      rect(8, 5, 1, 1, '#fff');
    },
    cooling(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(8, 2, 4, 16, dark); rect(2, 8, 16, 4, dark);
      rect(9, 3, 2, 14, color); rect(3, 9, 14, 2, color);
      rect(4, 4, 3, 3, soft); rect(13, 4, 3, 3, soft); rect(4, 13, 3, 3, soft); rect(13, 13, 3, 3, soft);
      rect(9, 9, 2, 2, deep); rect(8, 8, 4, 4, light); rect(9, 9, 2, 1, '#fff');
      glow(true); rect(9, 1, 2, 2, light); rect(9, 17, 2, 2, light); glow(false);
    },
    crit(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      glow(false); rect(9, 2, 2, 7, dark); rect(9, 11, 2, 7, dark); rect(2, 9, 7, 2, dark); rect(11, 9, 7, 2, dark);
      rect(6, 6, 8, 8, deep); rect(7, 7, 6, 6, dark); rect(9, 9, 2, 2, color);
      glow(true); rect(9, 1, 2, 4, light); rect(9, 15, 2, 4, soft); rect(1, 9, 4, 2, light); rect(15, 9, 4, 2, soft); glow(false);
      rect(5, 5, 2, 2, color); rect(13, 5, 2, 2, color); rect(5, 13, 2, 2, color); rect(13, 13, 2, 2, color);
    },
    salvage(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      glow(true); rect(8, 2, 4, 2, light); rect(6, 4, 8, 5, soft); rect(5, 7, 9, 5, color); rect(6, 12, 7, 3, dark); rect(8, 15, 3, 2, deep); glow(false);
      rect(9, 4, 2, 8, light); rect(7, 7, 2, 1, dark); rect(12, 9, 2, 1, dark);
      rect(2, 10, 2, 2, dark); rect(16, 6, 2, 2, dark); rect(3, 12, 1, 3, deep); rect(16, 8, 1, 3, deep);
      rect(4, 4, 1, 2, color); rect(15, 14, 2, 1, color);
    },
    nano(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(7, 3, 6, 14, deep); rect(3, 7, 14, 6, deep);
      rect(5, 5, 10, 10, dark); rect(6, 6, 8, 8, soft); rect(7, 7, 6, 6, color);
      glow(true); rect(9, 7, 2, 6, light); rect(7, 9, 6, 2, light); rect(9, 9, 2, 2, '#fff'); glow(false);
      rect(3, 3, 1, 1, color); rect(16, 3, 1, 1, color); rect(3, 16, 1, 1, color); rect(16, 16, 1, 1, color);
    },
    overdrive(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(3, 3, 14, 14, deep); rect(4, 4, 12, 12, dark); rect(5, 5, 10, 10, color);
      rect(8, 5, 4, 10, deep);
      glow(true); rect(9, 4, 3, 4, light); rect(7, 8, 3, 3, light); rect(10, 9, 3, 3, light); rect(8, 12, 4, 3, light); glow(false);
      rect(2, 2, 2, 2, dark); rect(16, 2, 2, 2, dark); rect(2, 16, 2, 2, dark); rect(16, 16, 2, 2, dark);
    },
    shield(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(4, 2, 12, 3, dark); rect(3, 4, 14, 6, dark); rect(4, 9, 12, 4, dark); rect(6, 13, 8, 3, dark); rect(8, 16, 4, 2, deep);
      rect(5, 4, 10, 5, soft); rect(6, 4, 8, 9, color); rect(8, 13, 4, 2, color);
      glow(true); rect(9, 5, 2, 7, light); rect(8, 7, 4, 2, light); glow(false);
      rect(5, 5, 2, 1, '#fff'); rect(13, 5, 2, 1, '#fff');
    },
    emp(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(4, 4, 12, 1, dark); rect(4, 15, 12, 1, dark);
      rect(4, 5, 1, 10, dark); rect(15, 5, 1, 10, dark);
      rect(6, 6, 8, 1, soft); rect(6, 13, 8, 1, soft);
      rect(7, 7, 6, 6, deep); rect(8, 8, 4, 4, color); rect(9, 9, 2, 2, light);
      glow(true);
      rect(2, 9, 2, 2, light); rect(16, 9, 2, 2, light); rect(9, 2, 2, 2, light); rect(9, 16, 2, 2, light);
      rect(3, 5, 2, 1, soft); rect(15, 5, 2, 1, soft); rect(3, 14, 2, 1, soft); rect(15, 14, 2, 1, soft);
      glow(false);
      rect(5, 10, 2, 1, dark); rect(13, 10, 2, 1, dark);
      rect(10, 5, 1, 2, '#fff'); rect(10, 13, 1, 2, '#fff');
    },
    turret(ctx, p) {
      const { rect, light, soft, dark, deep, glow, color } = p;
      rect(5, 13, 10, 3, dark); rect(3, 15, 14, 2, deep); rect(8, 8, 4, 6, color); rect(6, 9, 8, 4, soft);
      glow(true); rect(9, 2, 2, 7, light); rect(12, 3, 2, 6, soft); glow(false);
      rect(9, 2, 1, 6, '#fff'); rect(5, 10, 3, 1, dark); rect(12, 10, 3, 1, dark);
      rect(4, 8, 2, 2, dark); rect(14, 8, 2, 2, dark);
    }
  };

  const BG = {
    engine: 'radial', armor: 'diag', loader: 'line', magnet: 'radial', warhead: 'radial', cooling: 'diag',
    crit: 'radial', salvage: 'diag', nano: 'radial', overdrive: 'radial', shield: 'diag', turret: 'line',
    cannon: 'line', drone: 'radial', arc: 'radial', flame: 'radial', mine: 'diag', orbital: 'line', emp: 'radial'
  };

  function draw(canvas, id, color, size) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = size || canvas.clientWidth || 64;
    canvas.width = Math.round(s * dpr);
    canvas.height = Math.round(s * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, s, s);

    const p = painter(ctx, color);
    const pad = s * .08;
    const unit = (s - pad * 2) / 20;

    // backdrop: micro grid, scanline, corner ticks
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.fillStyle = rgba(color, .045);
    ctx.fillRect(pad, pad, s - pad * 2, s - pad * 2);
    if (BG[id] === 'diag') {
      ctx.strokeStyle = rgba(color, .08); ctx.lineWidth = .7;
      for (let i = -1; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(pad + i * s / 4, pad); ctx.lineTo(pad + i * s / 4 + s / 4, s - pad); ctx.stroke();
      }
    } else if (BG[id] === 'line') {
      ctx.strokeStyle = rgba(color, .08); ctx.lineWidth = .7;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(pad, pad + i * (s - pad * 2) / 4); ctx.lineTo(s - pad, pad + i * (s - pad * 2) / 4); ctx.stroke();
      }
    } else {
      const g = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s * .5);
      g.addColorStop(0, rgba(color, .15)); g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(pad, pad);
    ctx.scale(unit, unit);
    ctx.imageSmoothingEnabled = false;
    (DRAW[id] || DRAW.cannon)(ctx, p);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = .55;
    ctx.strokeStyle = rgba(color, .5); ctx.lineWidth = 1;
    const c = 3;
    [[pad, pad, 1, 1], [s - pad, pad, -1, 1], [pad, s - pad, 1, -1], [s - pad, s - pad, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + dy * c * 2); ctx.lineTo(x, y); ctx.lineTo(x + dx * c * 2, y); ctx.stroke();
    });
    ctx.restore();
    if (window.BF && window.BF.registerIconCanvas) window.BF.registerIconCanvas(canvas, id);
  }

  function applyAll(root) {
    (root || document).querySelectorAll('canvas[data-icon]').forEach(canvas => {
      draw(canvas, canvas.dataset.icon, canvas.dataset.color || '#ffb52d', parseInt(canvas.dataset.size || '64', 10));
    });
  }

  window.BF_ICONS = { draw, applyAll, rgba, lighten, darken };
})();
