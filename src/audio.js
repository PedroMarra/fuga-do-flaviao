// Áudio 100% sintetizado com WebAudio: efeitos, ronco do motor e música chiptune
// gerada por código (padrão diferente por país). Nenhum arquivo de áudio externo.
import { AUDIO } from './config.js';
import { makeRng } from './util.js';

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], HARM = [0, 2, 3, 5, 7, 8, 11];

// Trilha por país: tônica (MIDI), escala, andamento e progressão de acordes (graus).
const SONGS = [
  { root: 60, scale: MAJOR, bpm: 128, prog: [0, 5, 1, 4], swing: 0.12, seed: 1 },  // Brasil
  { root: 67, scale: MAJOR, bpm: 122, prog: [0, 3, 4, 0], swing: 0, seed: 2 },     // Paraguai
  { root: 57, scale: MINOR, bpm: 112, prog: [0, 6, 5, 6], swing: 0, seed: 3 },     // Bolívia
  { root: 62, scale: MINOR, bpm: 118, prog: [0, 2, 6, 0], swing: 0.06, seed: 4 },  // Peru
  { root: 64, scale: MINOR, bpm: 124, prog: [0, 3, 6, 2], swing: 0.1, seed: 5 },   // Colômbia
  { root: 65, scale: MAJOR, bpm: 126, prog: [0, 4, 5, 3], swing: 0, seed: 6 },     // Panamá
  { root: 57, scale: HARM, bpm: 134, prog: [0, 3, 4, 0], swing: 0, seed: 7 },      // México
  { root: 57, scale: MAJOR, bpm: 118, prog: [5, 3, 0, 4], swing: 0, seed: 8 },     // EUA/Miami
];
const MIAMI_SONG = { root: 62, scale: MAJOR, bpm: 140, prog: [0, 3, 4, 0], swing: 0, seed: 9 };

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function buildPattern(song) {
  const rng = makeRng(song.seed * 7919);
  // frase de 2 compassos (32 semicolcheias), repetida com variação
  const lead = [];
  for (let i = 0; i < 32; i++) {
    const strong = i % 4 === 0, off = i % 2 === 1;
    let v = -1;
    if (strong) v = Math.floor(rng() * 4);
    else if (!off && rng() < 0.55) v = Math.floor(rng() * 4);
    else if (off && rng() < 0.22) v = Math.floor(rng() * 4);
    lead.push(v);
  }
  return { lead };
}

export class Audio {
  constructor(muted) {
    this.muted = muted;
    this.ctx = null;
    this.song = null; this.songIdx = 0; this.nextSong = null;
    this.step = 0; this.nextTime = 0; this.timer = null; this.lapFast = 1;
  }

  // Precisa de um gesto do usuário (política de autoplay dos navegadores).
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = new AC();
        this.ctx = c;
        this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : AUDIO.master;
        const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
        this.master.connect(comp); comp.connect(c.destination);
        this.musicBus = c.createGain(); this.musicBus.gain.value = AUDIO.music; this.musicBus.connect(this.master);
        this.sfxBus = c.createGain(); this.sfxBus.gain.value = AUDIO.sfx; this.sfxBus.connect(this.master);
        const len = c.sampleRate;
        this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.ctx = null; }
  }

  get ok() { return !!this.ctx; }
  get now() { return this.ctx.currentTime; }

  setMuted(m) {
    this.muted = m;
    if (this.ok) this.master.gain.setTargetAtTime(m ? 0 : AUDIO.master, this.now, 0.03);
  }

  // ---------- Primitivas ----------
  tone(type, f0, f1, dur, vol, when = 0, dest = this.sfxBus, attack = 0.005) {
    const c = this.ctx, t = this.now + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, type, f0, f1, vol, when = 0, q = 1, dest = this.sfxBus) {
    const c = this.ctx, t = this.now + when;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ---------- Efeitos ----------
  play(name) {
    if (!this.ok || this.muted) return;
    switch (name) {
      case 'coin': // "cha-ching"
        this.noise(0.06, 'highpass', 5000, 5000, 0.25);
        this.tone('square', 1318, 1318, 0.08, 0.12, 0.0);
        this.tone('square', 1760, 1760, 0.22, 0.12, 0.07);
        this.noise(0.14, 'bandpass', 7000, 9000, 0.18, 0.07, 3);
        break;
      case 'shield':
        [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.16, 0.22, i * 0.06));
        break;
      case 'shieldBreak':
        this.noise(0.3, 'lowpass', 3000, 300, 0.4);
        this.tone('square', 700, 140, 0.35, 0.16);
        break;
      case 'turbo':
        this.tone('sawtooth', 160, 1300, 0.45, 0.15);
        this.noise(0.5, 'bandpass', 600, 4000, 0.25, 0, 2);
        break;
      case 'magnet':
        for (let i = 0; i < 4; i++) this.tone('sine', 300 + i * 80, 600 + i * 80, 0.1, 0.18, i * 0.07);
        break;
      case 'explosion':
        this.noise(0.9, 'lowpass', 2400, 80, 0.8);
        this.tone('sine', 140, 35, 0.6, 0.6);
        this.noise(0.25, 'highpass', 3000, 1000, 0.3);
        break;
      case 'stamp':
        this.tone('sine', 170, 45, 0.22, 0.6);
        this.noise(0.05, 'highpass', 2500, 2500, 0.35);
        break;
      case 'record':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone('square', f, f, i === 5 ? 0.4 : 0.1, 0.11, i * 0.09));
        this.tone('triangle', 262, 262, 0.6, 0.15, 0.45);
        break;
      case 'whoosh':
        this.noise(0.32, 'bandpass', 500, 2600, 0.35, 0, 3);
        break;
      case 'jet':
        this.noise(0.7, 'bandpass', 3000, 500, 0.22, 0, 1.5);
        break;
      case 'thunder':
        this.noise(0.08, 'highpass', 4000, 4000, 0.4);
        this.noise(0.8, 'lowpass', 900, 60, 0.5, 0.04);
        break;
      case 'smash':
        this.noise(0.18, 'lowpass', 2500, 300, 0.4);
        this.tone('square', 220, 80, 0.15, 0.12);
        break;
      case 'land':
        this.tone('sine', 110, 40, 0.3, 0.5);
        this.noise(0.4, 'lowpass', 900, 200, 0.25);
        break;
      case 'siren':
        for (let i = 0; i < 6; i++) this.tone('square', i % 2 ? 950 : 700, i % 2 ? 950 : 700, 0.26, 0.07, i * 0.27, this.sfxBus, 0.02);
        break;
    }
  }

  // ---------- Motor contínuo ----------
  startEngine() {
    if (!this.ok || this.eng) return;
    const c = this.ctx;
    const o1 = c.createOscillator(), o2 = c.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'square';
    o1.frequency.value = 55; o2.frequency.value = 27.7;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 2;
    const g = c.createGain(); g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
    o1.start(); o2.start();
    this.eng = { o1, o2, f, g };
  }
  stopEngine() {
    if (!this.eng) return;
    const e = this.eng, t = this.now;
    e.g.gain.setTargetAtTime(0, t, 0.08);
    e.o1.stop(t + 0.5); e.o2.stop(t + 0.5);
    this.eng = null;
  }
  engine(thrust, turbo) {
    if (!this.eng) return;
    const t = this.now, e = this.eng;
    const f = 52 + thrust * 30 + turbo * 50;
    e.o1.frequency.setTargetAtTime(f, t, 0.05);
    e.o2.frequency.setTargetAtTime(f / 2 + 0.7, t, 0.05);
    e.f.frequency.setTargetAtTime(350 + thrust * 700 + turbo * 1400, t, 0.05);
    e.g.gain.setTargetAtTime(this.muted ? 0 : AUDIO.engine * (0.55 + 0.45 * thrust + turbo * 0.4), t, 0.05);
  }

  // ---------- Música (sequenciador com lookahead) ----------
  setSong(song) {
    this.nextSong = { song, pat: buildPattern(song) };
    if (!this.song) { this.song = this.nextSong; this.nextSong = null; this.step = 0; }
  }

  startMusic() {
    if (!this.ok || this.timer) return;
    this.nextTime = this.now + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }
  stopMusic() { clearInterval(this.timer); this.timer = null; }

  schedule() {
    if (!this.ok || !this.song) return;
    while (this.nextTime < this.now + 0.12) {
      this.playStep(this.step, this.nextTime);
      const spb = 60 / (this.song.song.bpm * this.lapFast) / 4;
      const swing = this.song.song.swing && this.step % 2 === 0 ? spb * this.song.song.swing : -(this.song.song.swing ? spb * this.song.song.swing : 0);
      this.nextTime += spb + swing;
      this.step++;
      // troca de música só na virada do compasso (sem tropeço)
      if (this.step % 16 === 0 && this.nextSong) { this.song = this.nextSong; this.nextSong = null; this.step = 0; }
    }
  }

  playStep(step, when) {
    if (this.muted) return;
    const { song, pat } = this.song;
    const c = this.ctx, bus = this.musicBus;
    const bar = Math.floor(step / 16) % 4;
    const deg = song.prog[bar];
    const tone = (k) => {
      const sc = song.scale, idx = deg + k * 2;
      return song.root + sc[idx % 7] + 12 * Math.floor(idx / 7);
    };
    const at = when - this.now;
    const s = step % 16;
    // baixo
    if (s % 4 === 0 || s === 6 || s === 14) {
      const n = tone(0) - 24 + (s === 6 || s === 14 ? 12 : 0);
      this.tone('triangle', mtof(n), mtof(n), 0.18, 0.5, at, bus);
    }
    // melodia (arpejo com a frase gerada)
    const v = pat.lead[step % 32];
    if (v >= 0) {
      const n = (v === 3 ? tone(0) + 12 : tone(v)) + (bar === 3 && s > 11 ? 2 : 0);
      this.tone('square', mtof(n), mtof(n), 0.11, 0.12, at, bus);
    }
    // percussão
    if (s === 0 || s === 8 || (s === 11 && bar % 2)) this.tone('sine', 150, 45, 0.12, 0.55, at, bus);
    if (s === 4 || s === 12) this.noise(0.09, 'bandpass', 1800, 1200, 0.28, at, 1, bus);
    if (s % 2 === 1) this.noise(0.03, 'highpass', 8000, 8000, 0.12, at, 1, bus);
  }

  // ---------- API usada pelo jogo ----------
  startRun(idx) {
    this.unlock();
    if (!this.ok) return;
    this.song = null;
    this.setSong(SONGS[idx]);
    this.startEngine();
    this.startMusic();
  }
  setLap(lap) { this.lapFast = 1 + Math.min(0.15, (lap - 1) * 0.07); }
  setCountry(idx) { if (this.ok) this.setSong(SONGS[idx]); }
  miami() { if (this.ok) { this.setSong(MIAMI_SONG); this.stopEngine(); } }
  stopRun() { this.stopEngine(); this.stopMusic(); this.song = null; }
  pause() { if (this.ok) { this.stopMusic(); this.ctx.suspend(); } }
  resume() { if (this.ok) { this.ctx.resume(); this.nextTime = this.now + 0.05; this.startMusic(); } }
}
