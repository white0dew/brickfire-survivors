/* STEEL EMBERS // tiny procedural audio engine */
(function () {
  'use strict';

  const BGM_TRACKS = [
    '01-furnace.mp3', '02-marsh.mp3', '03-frost.mp3', '04-redtide.mp3',
    '05-foundry.mp3', '06-graveyard.mp3', '07-reactor.mp3', '08-dome.mp3',
    '09-citadel.mp3', '10-abyss.mp3', '11-solar.mp3', '12-throne.mp3'
  ];
  const MENU_TRACK = '00-menu.mp3';
  const INTRO_TRACK = 'deploy-intro.mp3';
  const INTRO_MS = 5100;
  const INTRO_VERSION = '20261024-67';
  const BGM_VERSION = '20261024-66';

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
      this.bgmEl = null;
      this.bgmGain = null;
      this.bgmToken = 0;
      this.currentStage = -1;
      this.menuMusicOn = false;
      this.bgmKind = 'stage';
      this.introTimer = null;
      this.introEl = null;
      this.introGain = null;
      this.introToken = 0;
      this.introDone = null;
      this.sfxVolume = this.readVolume('bf.sfxVolume', 1);
      this.bgmVolume = this.readVolume('bf.bgmVolume', 1);
    }

    readVolume(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === '') return fallback;
        const n = Number(raw);
        return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
      } catch (e) { return fallback; }
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
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = .34 * this.bgmVolume;
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = .82 * this.sfxVolume;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.noise = this.makeNoise(1.2);
      this.bgmEl = new Audio();
      this.bgmEl.loop = true;
      this.bgmEl.preload = 'auto';
      try {
        const src = this.ctx.createMediaElementSource(this.bgmEl);
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = .0001;
        src.connect(this.bgmGain);
        this.bgmGain.connect(this.musicBus);
      } catch (e) {
        this.bgmEl.volume = .55;
      }
      this.introEl = new Audio(`assets/audio/bgm/${INTRO_TRACK}?v=${INTRO_VERSION}`);
      this.introEl.preload = 'auto';
      try {
        const introSrc = this.ctx.createMediaElementSource(this.introEl);
        this.introGain = this.ctx.createGain();
        this.introGain.gain.value = .9;
        introSrc.connect(this.introGain);
        this.introGain.connect(this.musicBus);
      } catch (e) {
        this.introEl.volume = .55;
      }
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
      if (this.bgmEl && !this.bgmGain) this.bgmEl.volume = this.muted ? 0 : .55 * this.bgmVolume;
      return this.muted;
    }

    setSfxVolume(v) {
      const n = Number(v);
      this.sfxVolume = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
      try { localStorage.setItem('bf.sfxVolume', String(this.sfxVolume)); } catch (e) {}
      if (this.sfxBus && this.ctx) {
        this.sfxBus.gain.cancelScheduledValues(this.t);
        this.sfxBus.gain.setValueAtTime(this.sfxBus.gain.value || .0001, this.t);
        this.sfxBus.gain.linearRampToValueAtTime(.82 * this.sfxVolume, this.t + .08);
      }
      return this.sfxVolume;
    }

    setBgmVolume(v) {
      const n = Number(v);
      this.bgmVolume = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
      try { localStorage.setItem('bf.bgmVolume', String(this.bgmVolume)); } catch (e) {}
      if (this.musicBus && this.ctx) {
        this.musicBus.gain.cancelScheduledValues(this.t);
        this.musicBus.gain.setValueAtTime(this.musicBus.gain.value || .0001, this.t);
        this.musicBus.gain.linearRampToValueAtTime(.34 * this.bgmVolume, this.t + .08);
      }
      if (this.bgmEl && !this.bgmGain) this.bgmEl.volume = this.muted ? 0 : .55 * this.bgmVolume;
      return this.bgmVolume;
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

    playBgmFile(file, token, fade, fallback) {
      if (this.bgmEl && file) {
        this.bgmEl.src = `assets/audio/bgm/${file}?v=${BGM_VERSION}`;
        this.bgmEl.currentTime = 0;
        if (this.bgmGain) {
          this.bgmGain.gain.cancelScheduledValues(this.t);
          this.bgmGain.gain.setValueAtTime(.0001, this.t);
          this.bgmGain.gain.linearRampToValueAtTime(.9, this.t + fade);
        }
        const play = this.bgmEl.play();
        if (play && play.catch) play.catch(() => {
          if (token !== this.bgmToken) return;
          if (fallback && this.musicOn) this.startProceduralMusic();
        });
        return;
      }
      if (fallback && this.musicOn) this.startProceduralMusic();
    }

    startDeployIntro(done) {
      this.stopIntro();
      // This is the trimmed opening from the Battle City piano reference. The
      // first phrase ends around 4.45s; the later 2s phrase is intentionally
      // cut so the deploy sting leads straight into the stage loop.
      if (!this.introEl) {
        this.startSynthDeployIntro(done);
        return;
      }
      const token = ++this.introToken;
      const finish = () => {
        if (token !== this.introToken || this.introDone !== finish) return;
        if (this.introTimer) clearTimeout(this.introTimer);
        this.introTimer = null;
        this.introDone = null;
        if (this.introEl) this.introEl.onended = null;
        if (typeof done === 'function') done();
      };
      this.introDone = finish;
      this.introEl.onended = finish;
      try { this.introEl.pause(); this.introEl.currentTime = 0; } catch (e) {}
      if (this.introGain) {
        try {
          this.introGain.gain.cancelScheduledValues(this.t);
          this.introGain.gain.setValueAtTime(.0001, this.t);
          this.introGain.gain.linearRampToValueAtTime(.9, this.t + .04);
        } catch (e) {}
      }
      const play = this.introEl.play();
      if (play && play.catch) play.catch(() => {
        if (token !== this.introToken) return;
        this.stopIntro();
        this.startSynthDeployIntro(done);
      });
      // onended normally wins; the timer only protects against a stalled
      // media element so a run can never sit on the deployment screen.
      this.introTimer = setTimeout(finish, INTRO_MS + 180);
    }

    startSynthDeployIntro(done) {
      // Fallback for browsers where the media element cannot start.
      const notes = [130.81, 164.81, 196.00, 261.63, 329.63];
      notes.forEach((freq, i) => {
        const delay = i * .18;
        this.tone(freq, .13, 'square', .065, freq * 1.01, delay);
        this.tone(freq / 2, .18, 'sawtooth', .038, freq / 2, delay);
        this.burst(.04, .028, 'highpass', 1700, delay, .8);
      });
      this.tone(65.41, .52, 'sine', .09, 32, .9);
      this.tone(523.25, .55, 'triangle', .032, 523.25, 1.04);
      this.introTimer = setTimeout(() => {
        this.introTimer = null;
        if (typeof done === 'function') done();
      }, 1900);
    }

    stopIntro() {
      this.introToken += 1;
      this.introDone = null;
      if (this.introTimer) clearTimeout(this.introTimer);
      this.introTimer = null;
      if (this.introEl) {
        this.introEl.onended = null;
        try { this.introEl.pause(); this.introEl.currentTime = 0; } catch (e) {}
      }
    }

    startMusic(stageIndex, opts) {
      if (!this.ctx) return;
      this.stopIntro();
      // Silence the menu track (or the previous stage track) before the
      // deployment sting. The sting should land in clean air, then the new
      // stage BGM fades in underneath it.
      if (this.bgmEl && !this.bgmEl.paused) {
        try { this.bgmEl.pause(); } catch (e) {}
      }
      if (this.bgmGain) {
        try {
          this.bgmGain.gain.cancelScheduledValues(this.t);
          this.bgmGain.gain.setValueAtTime(.0001, this.t);
        } catch (e) {}
      }
      const token = ++this.bgmToken;
      this.musicOn = true;
      this.menuMusicOn = false;
      this.bgmKind = 'stage';
      this.currentStage = stageIndex | 0;
      const file = BGM_TRACKS[this.currentStage];
      const begin = () => {
        if (token !== this.bgmToken || !this.musicOn) return;
        this.playBgmFile(file, token, 1.65, true);
      };
      if (opts && opts.intro) this.startDeployIntro(begin);
      else begin();
    }

    startMenuMusic() {
      if (!this.ctx) return;
      if (this.menuMusicOn && this.bgmKind === 'menu') return;
      this.stopIntro();
      const token = ++this.bgmToken;
      this.menuMusicOn = true;
      this.musicOn = false;
      this.bgmKind = 'menu';
      this.currentStage = 2;
      this.playBgmFile(MENU_TRACK, token, 1.25, false);
    }
    startProceduralMusic() {
      this.step = 0;
      this.startPad();
      this.musicTimer = setInterval(() => this.musicStep(), 130);
    }
    stopMusic() {
      this.musicOn = false;
      this.menuMusicOn = false;
      this.bgmKind = '';
      this.stopIntro();
      this.bgmToken += 1;
      if (this.musicTimer) clearInterval(this.musicTimer);
      this.musicTimer = null;
      if (this.bgmEl && this.bgmGain) {
        try {
          this.bgmGain.gain.cancelScheduledValues(this.t);
          this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value || .0001, this.t);
          this.bgmGain.gain.linearRampToValueAtTime(.0001, this.t + .35);
        } catch (e) {}
      }
      if (this.bgmEl) {
        const el = this.bgmEl;
        const token = this.bgmToken;
        setTimeout(() => { if (token === this.bgmToken) el.pause(); }, 420);
      }
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
