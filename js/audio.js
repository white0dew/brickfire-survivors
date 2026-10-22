/* BRICKFIRE // tiny procedural audio engine */
(function () {
  'use strict';

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicBus = null;
      this.sfxBus = null;
      this.noise = null;
      this.muted = localStorage.getItem('bf.muted') === '1';
      this.musicTimer = null;
      this.step = 0;
      this.intensity = 0;
      this.musicOn = false;
      this.lastXp = 0;
    }

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 14; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .18;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : .48;
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = .22;
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = .82;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.noise = this.makeNoise(1.2);
    }

    makeNoise(seconds) {
      const len = Math.floor(this.ctx.sampleRate * seconds);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    }

    get t() { return this.ctx ? this.ctx.currentTime : 0; }

    setMuted(m) {
      this.muted = !!m;
      localStorage.setItem('bf.muted', this.muted ? '1' : '0');
      if (this.master && this.ctx) {
        this.master.gain.cancelScheduledValues(this.t);
        this.master.gain.linearRampToValueAtTime(this.muted ? 0 : .48, this.t + .08);
      }
      return this.muted;
    }

    toggleMute() { return this.setMuted(!this.muted); }

    tone(freq, duration, type, gain, slide, delay, dest) {
      if (!this.ctx || this.muted) return;
      const t0 = this.t + (delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + duration);
      g.gain.setValueAtTime(.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain == null ? .08 : gain), t0 + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + duration);
      osc.connect(g); g.connect(dest || this.sfxBus);
      osc.start(t0); osc.stop(t0 + duration + .03);
    }

    burst(duration, gain, type, freq, delay, q) {
      if (!this.ctx || this.muted || !this.noise) return;
      const t0 = this.t + (delay || 0);
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.playbackRate.value = .8 + Math.random() * .35;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type || 'lowpass'; filter.frequency.value = freq || 1200; filter.Q.value = q || .7;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain == null ? .08 : gain, t0 + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + duration);
      src.connect(filter); filter.connect(g); g.connect(this.sfxBus);
      src.start(t0); src.stop(t0 + duration + .03);
    }

    shoot() {
      this.tone(155, .07, 'square', .04, 65);
      this.burst(.07, .055, 'highpass', 900, 0, .8);
    }
    enemyShoot() {
      this.tone(95, .1, 'triangle', .022, 52);
      this.burst(.05, .02, 'bandpass', 520, 0, 1.4);
    }
    hit() {
      this.burst(.035, .035, 'highpass', 1400);
      this.tone(250, .04, 'square', .018, 180);
    }
    coreHit() {
      this.tone(70, .32, 'sawtooth', .055, 38);
      this.burst(.24, .04, 'lowpass', 260);
    }
    explode(size) {
      const s = size || 1;
      this.burst(.34 * s, .12, 'lowpass', 420 + 400 / s, 0, .8);
      this.tone(58, .38 * s, 'sine', .11, 20);
      if (s > 1.2) this.tone(42, .7, 'triangle', .09, 16, .03);
    }
    bigExplode() { this.explode(2.1); this.tone(31, 1.15, 'sine', .12, 14, .04); }
    pickup() {
      this.tone(720, .07, 'triangle', .035, 980);
      this.tone(980, .09, 'triangle', .025, 1320, .04);
    }
    xp() {
      const now = performance.now();
      if (now - this.lastXp < 35) return;
      this.lastXp = now;
      this.tone(860 + Math.random() * 220, .045, 'sine', .018, 1120);
    }
    item() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .18, 'triangle', .045, f * 1.02, i * .055));
    }
    levelUp() {
      [261, 329, 392, 523, 659].forEach((f, i) => this.tone(f, .35, 'sawtooth', .022, f, i * .06));
      this.burst(.4, .025, 'highpass', 1800, 0, .5);
    }
    select() { this.tone(440, .06, 'square', .03, 620); }
    confirm() { this.tone(330, .08, 'triangle', .04, 440); this.tone(660, .1, 'triangle', .03, 880, .06); }
    deny() { this.tone(130, .1, 'square', .035, 90); }
    dash() {
      this.burst(.22, .07, 'bandpass', 900, 0, 1.2);
      this.tone(180, .17, 'sawtooth', .028, 600);
    }
    shield() {
      this.tone(260, .3, 'triangle', .035, 520);
      this.burst(.18, .024, 'highpass', 2200);
    }
    boss() {
      [110, 112, 110, 147].forEach((f, i) => this.tone(f, .7, 'sawtooth', .045, f * .99, i * .23));
      this.burst(.7, .04, 'lowpass', 200);
    }
    victory() {
      [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone(f, .65, 'triangle', .035, f, i * .11));
      this.burst(1.3, .025, 'highpass', 2000, 0, .6);
    }
    gameOver() {
      [220, 196, 147, 98].forEach((f, i) => this.tone(f, .55, 'sawtooth', .04, f * .92, i * .13));
      this.burst(.7, .03, 'lowpass', 300);
    }
    tick() { this.tone(560, .03, 'square', .012, 540); }

    startMusic() {
      if (!this.ctx || this.musicOn) return;
      this.musicOn = true;
      this.step = 0;
      this.startPad();
      this.musicTimer = setInterval(() => this.musicStep(), 130);
    }
    stopMusic() {
      this.musicOn = false;
      if (this.musicTimer) clearInterval(this.musicTimer);
      this.musicTimer = null;
      if (this.pad) {
        try { this.pad.gain.exponentialRampToValueAtTime(.0001, this.t + .3); } catch (e) {}
        this.pad = null;
      }
    }
    startPad() {
      if (!this.ctx) return;
      const g = this.ctx.createGain(); g.gain.value = .0001; g.connect(this.musicBus);
      const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 240; filter.Q.value = 1.1;
      const a = this.ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = 73.42;
      const b = this.ctx.createOscillator(); b.type = 'triangle'; b.frequency.value = 110; b.detune.value = -7;
      a.connect(filter); b.connect(filter); filter.connect(g);
      a.start(); b.start();
      g.gain.exponentialRampToValueAtTime(.035, this.t + 1.4);
      this.pad = g; this.padOsc = [a, b];
    }
    musicStep() {
      if (!this.ctx || this.muted) return;
      const s = this.step++ % 32;
      const t = this.t;
      const bass = [73.42, 0, 0, 73.42, 0, 87.31, 0, 0, 73.42, 0, 0, 98, 0, 116.54, 0, 73.42,
                    73.42, 0, 0, 73.42, 0, 87.31, 0, 0, 65.41, 0, 0, 87.31, 0, 98, 0, 110];
      if (bass[s]) this.tone(bass[s], .18, 'sawtooth', .018, bass[s] * .98, 0, this.musicBus);
      if (s % 4 === 0) {
        this.tone(52, .2, 'sine', .055, 35, 0, this.musicBus);
        this.burst(.1, .017, 'lowpass', 140, 0, .8);
      }
      if (s % 2 === 1) this.burst(.025, .006, 'highpass', 5000, 0, .7);
      if (s === 0 || s === 16) {
        this.tone(293.66, .55, 'triangle', .013, 293.66, 0, this.musicBus);
        this.tone(440, .55, 'sine', .008, 440, .05, this.musicBus);
      }
      if (this.intensity > 0 && (s === 6 || s === 22)) this.burst(.08, .014, 'bandpass', 2600, 0, 1.4);
      if (this.intensity > 0 && s % 8 === 4) this.tone(146.83, .12, 'square', .008, 110, 0, this.musicBus);
    }
    setIntensity(v) { this.intensity = v; }
  }

  window.BF_AUDIO = new AudioEngine();
})();
