// Orquestra o jogo: máquina de estados, atualização em passo fixo e desenho.
// Estados: menu → playing ⇄ paused → dying → gameover; playing → miami → playing (volta 2).
import { W, H, WORLD, PLAYER, SPEED, TRAIL, JUICE, ROUTE, COUNTRIES, PICKUPS } from './config.js';
import { clamp, range, lerp, INK, outlinedText, ease } from './util.js';
import { Player, drawFlaviaoStanding, jetSprite, cockpitSprite } from './player.js';
import { Particles, P, noteSprite } from './particles.js';
import { Obstacles, warmObstacleSprites } from './obstacles.js';
import { Pickups, warmPickupSprites } from './powerups.js';
import { Background } from './background.js';
import { Audio } from './audio.js';
import { UI, AUTHOR } from './ui.js';
import { storage } from './storage.js';

export class Game {
  constructor(canvas, ctx, input, debug) {
    this.canvas = canvas; this.ctx = ctx; this.input = input; this.debug = debug;
    this.cfg = PICKUPS;
    this.countryLen = ROUTE.countryLength;
    this.muted = storage.muted;
    this.reduce = storage.reduceMotion;
    this.hi = storage.hi;

    this.player = new Player();
    this.particles = new Particles();
    this.obstacles = new Obstacles(this);
    this.pickups = new Pickups(this);
    this.bg = new Background();
    this.audio = new Audio(this.muted);
    this.ui = new UI(this);

    this.state = 'menu';
    this.time = 0; this.fps = 60; this.stateT = 0;
    this.worldX = 0; this.pworldX = 0;
    this.speed = SPEED.menuScroll;
    this.turboK = 0;
    this.shakeAmt = 0; this.camX = 0; this.camY = 0;
    this.flash = 0; this.hitStop = 0;
    this.trailAcc = 0;
    this.deaths = 0;
    this.resetRun();

    input.on('press', () => this.onPress());
    input.on('pause', () => this.togglePause());
    input.on('mute', () => this.toggleMute());
    input.on('confirm', () => { if (this.state === 'menu') this.start(); else if (this.state === 'gameover' && this.stateT > 0.35) this.start(); });

    this.ui.refreshMenuStats(this.hi, storage.totalMalas);
    this.ui.show('menu');
    if (debug.autostart) setTimeout(() => this.start(), 30);
  }

  resetRun() {
    this.score = 0; this.bonus = 0; this.totalDist = 0;
    this.routeDist = 0; this.countryIdx = 0; this.lap = 1;
    this.malasRun = 0; this.newRecord = false;
    this.spawnEnabled = true; this.breather = 0;
    this.miami = null;
  }

  onResize() {
    this.bg.invalidate();
    clearTimeout(this.warmT);
    this.warmT = setTimeout(() => { warmObstacleSprites(); warmPickupSprites(); jetSprite(); cockpitSprite(); noteSprite(); }, 50);
  }

  // ---------- Controle de estados ----------
  start() {
    this.audio.unlock();
    this.resetRun();
    this.player.reset();
    this.particles.reset();
    this.obstacles.reset();
    this.pickups.reset();
    this.shakeAmt = 0; this.flash = 0; this.hitStop = 0; this.turboK = 0;
    if (this.debug.skip) {
      const i = COUNTRIES.findIndex((c) => c.id === this.debug.skip);
      if (i > 0) this.routeDist = i * this.countryLen - 30;
      if (this.debug.skip === 'miami') this.routeDist = 8 * this.countryLen - 60;
    }
    this.countryIdx = Math.min(7, Math.floor(this.routeDist / this.countryLen));
    this.bg.setCountry(this.countryIdx, true);
    this.speed = this.computeSpeed();
    this.setState('playing');
    this.ui.show(null);
    this.audio.setLap(1);
    this.audio.startRun(this.countryIdx);
    // decolagem: impulso inicial para cima
    this.player.vy = -380;
    this.particles.burst(P.NOTE, this.player.x - 40, this.player.y, 14, 260, 1.2, false);
    if (this.debug.power) setTimeout(() => this.onCollect(this.debug.power, this.player.x, this.player.y), 0);
  }

  setState(s) { this.state = s; this.stateT = 0; }

  quitToMenu() {
    this.audio.stopRun();
    this.input.release();
    this.setState('menu');
    this.player.reset();
    this.obstacles.reset();
    this.pickups.reset();
    this.particles.reset();
    this.bg.setCountry(0, true);
    this.ui.refreshMenuStats(this.hi, storage.totalMalas);
    this.ui.show('menu');
  }

  togglePause() {
    if (this.state === 'playing' || this.state === 'miami') {
      this.pausedFrom = this.state;
      this.setState('paused');
      this.input.release();
      this.audio.pause();
      this.ui.show('pause');
    } else if (this.state === 'paused') {
      this.state = this.pausedFrom || 'playing';
      this.audio.resume();
      this.ui.show(null);
    }
  }

  autoPause() { if (this.state === 'playing' || this.state === 'miami') this.togglePause(); }

  toggleMute() {
    this.muted = !this.muted;
    storage.muted = this.muted;
    this.audio.setMuted(this.muted);
    this.ui.refreshToggles();
  }

  toggleReduceMotion() {
    this.reduce = !this.reduce;
    storage.reduceMotion = this.reduce;
    this.ui.refreshToggles();
  }

  onPress() {
    this.audio.unlock();
    if (this.state === 'playing') this.player.press();
    else if (this.state === 'miami' && this.miami && this.miami.t > 1.5) this.miami.skip = true;
  }

  // ---------- Juice ----------
  shake(a) { if (!this.reduce) this.shakeAmt = Math.max(this.shakeAmt, a); }
  sfx(name, arg) { this.audio.play(name, arg); }

  // ---------- Velocidade e progresso ----------
  computeSpeed() {
    const prog = this.routeDist / this.countryLen;
    let s = Math.min(SPEED.max, SPEED.base * (1 + SPEED.perCountry * prog));
    s *= 1 + Math.min(SPEED.lapMaxBonus, SPEED.lapBonus * (this.lap - 1));
    return s * (1 + (SPEED.turboMul - 1) * this.turboK);
  }

  // ---------- Update ----------
  update(dt) {
    this.time += dt;
    this.stateT += dt;
    this.ui.update(dt);
    this.pworldX = this.worldX;

    if (this.state === 'paused') return;

    if (this.state === 'menu') {
      this.worldX += SPEED.menuScroll * dt;
      this.bg.update(dt);
      this.particles.update(dt, SPEED.menuScroll);
      return;
    }
    if (this.state === 'gameover') {
      this.particles.update(dt, 0);
      return;
    }

    if (this.hitStop > 0) { this.hitStop -= dt; return; }

    const p = this.player;
    if (this.state === 'playing') {
      this.turboK += ((p.turbo > 0 ? 1 : 0) - this.turboK) * Math.min(1, dt * 6);
      this.speed = this.computeSpeed();
      const meters = (this.speed * dt) / WORLD.pxPerMeter;
      this.totalDist += meters;
      this.routeDist += meters;
      this.score = Math.floor(this.totalDist) + this.bonus;
      if (!this.newRecord && this.hi > 0 && this.score > this.hi) this.onNewRecord();

      const idx = Math.min(7, Math.floor(this.routeDist / this.countryLen));
      if (idx !== this.countryIdx) this.onBorder(idx);
      if (idx < 7 && this.routeDist - idx * this.countryLen > this.countryLen * 0.35) this.bg.prefetch(idx + 1);
      if (this.routeDist >= 8 * this.countryLen) this.startMiami();

      if (this.breather > 0) { this.breather -= dt; this.spawnEnabled = this.breather <= 0; }

      const holding = this.debug.bot ? this.botHold() : this.input.holding;
      p.update(dt, holding);
      this.audio.engine(p.thrust, this.turboK);
      if (p.onGround && Math.random() < dt * 25) { this.particles.spark(p.x - 30, WORLD.groundY - 4, 200); }
    } else if (this.state === 'dying') {
      this.speed *= Math.max(0, 1 - dt * 1.6);
      p.update(dt, false);
      if (Math.random() < dt * 30) this.particles.smoke(p.x + range(-20, 20), p.y + range(-10, 10), range(30, 46), -60, -50, 0.9, false);
      if (Math.random() < dt * 20) this.particles.fire(p.x + range(-30, 10), p.y);
      if (this.stateT > JUICE.deathDelay) this.gameOver();
    } else if (this.state === 'miami') {
      this.updateMiami(dt);
      this.score = Math.floor(this.totalDist) + this.bonus;
    }

    this.worldX += this.speed * dt;
    this.bg.update(dt, this.speed);
    this.obstacles.update(dt, this.speed, COUNTRIES[this.countryIdx], this.lap);
    this.pickups.update(dt, this.speed);

    if (this.state === 'playing') {
      this.obstacles.collide(p, (o) => this.onHit(o), (o) => this.onNearMiss(o.x, o.y));
      this.emitTrail(dt);
      if (this.turboK > 0.3 && Math.random() < dt * 40) this.particles.speedLine(W + 10, range(30, WORLD.groundY - 10), range(60, 160));
    }
    if (this.state === 'miami' && p.pilotVisible && this.miami.phase === 0) this.emitTrail(dt);

    this.particles.update(dt, this.speed);
    this.shakeAmt = Math.max(0, this.shakeAmt - this.shakeAmt * JUICE.shakeDecay * dt - dt * 2);
    this.flash = Math.max(0, this.flash - dt * 2.2);

    if (this.debug.on || this.debug.bot) this.writeDebug();
  }

  // Rastro contínuo de notas: mais denso subindo, "chuva" no turbo.
  emitTrail(dt) {
    const p = this.player;
    const rate = p.turbo > 0 ? TRAIL.turbo : lerp(TRAIL.base, TRAIL.rising, p.thrust);
    this.trailAcc += rate * dt;
    while (this.trailAcc >= 1) {
      this.trailAcc -= 1;
      const ex = p.exhaust();
      if (p.turbo > 0) {
        this.particles.note(p.x + range(-70, 40), p.y + range(-10, 20), -this.speed * range(0.3, 0.6), range(80, 260), range(0.8, 1.3));
      } else {
        this.particles.note(ex.x + range(-6, 6), ex.y + range(-6, 6), -this.speed * range(0.35, 0.6) - 40, range(-40, 60) + p.vy * 0.15, range(TRAIL.life[0], TRAIL.life[1]));
      }
    }
    if (Math.random() < dt * 14) { const ex = p.exhaust(); this.particles.smoke(ex.x, ex.y, range(14, 22), -this.speed * 0.4, range(-20, 10), 0.5); }
  }

  // ---------- Eventos ----------
  onHit(o) {
    const p = this.player;
    if (this.debug.god) return;
    const smashable = this.obstacles.isSmashable(o);
    if (p.turbo > 0) {
      if (smashable) { this.obstacles.smash(o); this.addBonus(25, o.x, o.y - 30, '#4ad7ff'); this.shake(6); this.sfx('smash'); }
      return;
    }
    if (p.invuln > 0) return;
    if (p.shield) {
      p.shield = false;
      p.invuln = PLAYER.invulnAfterHit;
      if (smashable) this.obstacles.smash(o);
      this.particles.burst(P.CONFETTI, p.x, p.y, 24, 360, 0.9);
      this.particles.ring(p.x, p.y, 110, '#ffcf26', 0.4);
      this.particles.text('HABEAS CORPUS!', p.x + 40, p.y - 70, '#ffd23f', 24);
      p.setFace('scared', 0.9);
      this.shake(10);
      this.hitStop = JUICE.hitStop * 0.6;
      this.sfx('shieldBreak');
      return;
    }
    this.die(o);
  }

  die() {
    const p = this.player;
    p.alive = false;
    p.face = 'dazed'; p.faceT = 999;
    p.vy = -320;
    this.deaths++;
    this.setState('dying');
    this.hitStop = JUICE.hitStop;
    this.shake(JUICE.shakeHit);
    if (!this.reduce) this.flash = JUICE.flashGameOver;
    const pt = this.particles;
    pt.ring(p.x, p.y, 120, '#fff', 0.4);
    for (let i = 0; i < 14; i++) pt.fire(p.x + range(-30, 30), p.y + range(-20, 20), range(8, 16));
    for (let i = 0; i < 10; i++) pt.spark(p.x, p.y, 520);
    pt.debris(p.x, p.y, 10, ['#ffffff', '#ffc928', '#1f2e63']);
    pt.burst(P.NOTE, p.x, p.y, 40, 520, 1.6, true);
    for (let i = 0; i < 5; i++) pt.star(p.x + 30, p.y - 40, 1.4);
    this.sfx('explosion');
    this.audio.stopRun();
  }

  gameOver() {
    this.setState('gameover');
    this.score = Math.floor(this.totalDist) + this.bonus;
    const prevHi = this.hi;
    const record = this.score > prevHi && prevHi > 0; // na 1ª partida não há recorde a bater
    if (this.score > prevHi) { this.hi = this.score; storage.hi = this.hi; }
    storage.totalMalas = storage.totalMalas + this.malasRun;
    const progress = Math.min(8, this.routeDist / this.countryLen);
    this.ui.showGameOver({
      score: this.score, hi: this.hi, record, country: this.countryIdx, lap: this.lap,
      malas: this.malasRun, progress: progress * 7 / 8,
    });
    if (record) this.sfx('record');
    this.ui.refreshMenuStats(this.hi, storage.totalMalas);
  }

  onNewRecord() {
    this.newRecord = true;
    const p = this.player;
    this.particles.text('NOVO RECORDE!', W / 2, 140, '#ffd23f', 30, { life: 1.6, vy: -20 });
    this.particles.burst(P.CONFETTI, W / 2, 120, 40, 420, 1.4);
    this.sfx('record');
    p.setFace('happy', 1);
  }

  onNearMiss(x, y) {
    const p = this.player;
    this.bonus += PICKUPS.nearMissBonus;
    this.ui.scorePop = 0.6;
    this.particles.text('UFA!', p.x + 70, p.y - 62, '#ffffff', 28, { blink: true, life: 0.8, vy: -40 });
    p.setFace('scared', 0.8);
    this.particles.sweat(p.x + 46, p.y - 50);
    this.particles.sweat(p.x + 20, p.y - 56);
    this.shake(JUICE.shakeNear);
    this.sfx('whoosh');
  }

  addBonus(v, x, y, color = '#7bff7a') {
    this.bonus += v;
    this.ui.scorePop = 1;
    this.particles.text('+' + v, x, y, color, 24);
  }

  onCollect(kind, x, y) {
    const p = this.player;
    if (kind === 'mala') {
      this.malasRun++;
      this.addBonus(PICKUPS.malaValue, x, y - 24);
      this.ui.malaPop = 1;
      this.particles.burst(P.NOTE, x, y, 6, 200, 0.7, true);
      p.setFace('happy', 0.6);
      this.sfx('coin');
      return;
    }
    this.particles.ring(x, y, 70, '#fff');
    this.particles.burst(P.CONFETTI, x, y, 18, 300, 0.8);
    this.shake(4);
    if (kind === 'shield') {
      p.shield = true;
      this.particles.text('HABEAS CORPUS!', x, y - 40, '#ffd23f', 24, { life: 1.1 });
      this.sfx('shield');
      p.setFace('happy', 0.8);
    } else if (kind === 'turbo') {
      p.turbo = PICKUPS.turboTime;
      p.invuln = Math.max(p.invuln, PICKUPS.turboTime + PICKUPS.turboGrace);
      p.face = 'turbo'; p.faceT = PICKUPS.turboTime;
      this.particles.text('PIX EXPRESSO!', x, y - 40, '#4ad7ff', 26, { life: 1.1 });
      this.sfx('turbo');
      this.shake(8);
    } else if (kind === 'magnet') {
      p.magnet = PICKUPS.magnetTime;
      this.particles.text('ÍMÃ DE BUFUNFA!', x, y - 40, '#ff5e7e', 24, { life: 1.1 });
      this.sfx('magnet');
      p.setFace('happy', 0.8);
    }
  }

  onBorder(idx) {
    this.countryIdx = idx;
    this.bg.setCountry(idx, false);
    this.ui.stamp(idx, this.lap);
    this.breather = ROUTE.breatherAfterBorder;
    this.spawnEnabled = false;
    this.audio.setCountry(idx);
  }

  onStampSlam() {
    this.shake(JUICE.shakeBorder);
    this.sfx('stamp');
    this.particles.burst(P.CONFETTI, 690, 175, 14, 260, 0.6);
  }

  // ---------- Final em Miami (cutscene curta) + Volta 2 ----------
  startMiami() {
    this.setState('miami');
    this.miami = { t: 0, phase: 0, skip: false, vanX: W + 160, landed: false };
    this.obstacles.clearAll(true);
    this.spawnEnabled = false;
    this.player.auto = WORLD.groundY - 24;
    this.player.turbo = 0; this.turboK = 0;
    this.audio.miami();
    this.ui.banner('MIAMI!', 'O jatinho vai pousar...', 2.0, '#ff7bd5');
  }

  updateMiami(dt) {
    const m = this.miami, p = this.player;
    m.t += dt;
    if (m.phase === 0) {
      // pouso: desacelera até parar
      this.speed = Math.max(0, this.speed - this.speed * dt * 0.9 - dt * 30);
      p.update(dt, false);
      if (p.onGround && !m.landed) { m.landed = true; this.shake(5); for (let i = 0; i < 8; i++) this.particles.smoke(p.x - 20 + i * 8, WORLD.groundY - 6, 30, -80, -30, 0.8); this.sfx('land'); }
      if (this.speed < 8 && p.onGround) { this.speed = 0; m.phase = 1; m.pt = 0; p.pilotVisible = false; }
    } else if (m.phase === 1) {
      // Flavião desce, comemora ajeitando o cabelo; a viatura chega
      m.pt += dt;
      if (m.pt > 0.05 && !m.celebrated) { m.celebrated = true; this.particles.burst(P.CONFETTI, p.x + 80, 300, 50, 480, 1.5); this.sfx('record'); this.addBonus(1000, p.x + 120, 300, '#ffd23f'); this.ui.banner('CHEGUEI!', 'Miami, aqui vou eu!', 1.5, '#7fe7e0'); }
      if (m.pt > 1.6) { m.vanX += ((W - 170) - m.vanX) * Math.min(1, dt * 3); if (!m.siren) { m.siren = true; this.sfx('siren'); } }
      if (m.pt > 3.6 || m.skip) { m.phase = 2; m.pt = 0; this.ui.banner('VOLTA ' + (this.lap + 1), 'Mais rápido! Fuja de novo!', 2.2, '#ffd23f'); p.pilotVisible = true; this.sfx('turbo'); }
    } else {
      // decola de novo para a volta 2
      m.pt += dt;
      m.vanX += 140 * dt;
      this.speed = Math.min(SPEED.base, this.speed + dt * 300);
      p.auto = 240;
      p.update(dt, false);
      if (m.pt > 1.2) {
        p.auto = null;
        this.lap++;
        this.routeDist = 0;
        this.countryIdx = 0;
        this.bg.setCountry(0, false);
        this.ui.stamp(0, this.lap);
        this.bg.prefetch(1);
        this.breather = ROUTE.breatherAfterBorder + 0.6;
        this.spawnEnabled = false;
        this.audio.setLap(this.lap);
        this.audio.startRun(0);
        this.miami = null;
        this.setState('playing');
      }
    }
  }

  // ---------- Bot de teste (?bot=1) ----------
  botHold() {
    const p = this.player;
    let best = p.y, bestCost = Infinity;
    for (let ty = 70; ty <= 450; ty += 15) {
      let cost = Math.abs(ty - p.y) * 0.01 + Math.abs(ty - 270) * 0.004;
      for (const o of this.obstacles.list) {
        if (!o.on) continue;
        const dx = o.x - p.x;
        if (dx < -90 || dx > 460) continue;
        const w = 1.5 - Math.max(0, dx) / 460;
        const tx = o.type === 'heli' || o.type === 'tempestade' ? p.x + 30 : o.x;
        for (const off of [-20, 0, 20]) if (this.obstacles.hits(o, tx, ty + off, 44)) { cost += 60 * w; break; }
      }
      for (const k of this.pickups.list) if (k.on && Math.abs(k.y - ty) < 30 && k.x > p.x && k.x - p.x < 300) cost -= 3;
      if (cost < bestCost) { bestCost = cost; best = ty; }
    }
    const predicted = p.y + p.vy * 0.12;
    return predicted > best;
  }

  writeDebug() {
    if ((this.dbgT = (this.dbgT || 0) + 1) % 30) return;
    const el = document.getElementById('debug-out');
    el.hidden = !this.debug.on;
    el.textContent = JSON.stringify({
      state: this.state, lap: this.lap, country: COUNTRIES[this.countryIdx].id, route: Math.round(this.routeDist),
      score: this.score, hi: this.hi, malas: this.malasRun, deaths: this.deaths, fps: this.fps,
      obst: this.obstacles.active, parts: this.particles.alive, speed: Math.round(this.speed), audio: this.audio.ctx ? this.audio.ctx.state + (this.audio.timer ? '+music' : '') + (this.audio.eng ? '+engine' : '') : 'off', errors: this.debug.errors,
    });
  }

  // ---------- Render ----------
  render(alpha) {
    const ctx = this.ctx;
    const k = this.canvas.width / W;
    let sx = 0, sy = 0;
    if (this.shakeAmt > 0.2 && !this.reduce) { sx = (Math.random() * 2 - 1) * this.shakeAmt; sy = (Math.random() * 2 - 1) * this.shakeAmt; }
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);

    const wx = lerp(this.pworldX, this.worldX, alpha);
    this.bg.draw(ctx, wx, this.time);
    if (this.state === 'menu' || this.state === 'miami' || (this.state === 'paused' && this.pausedFrom === 'miami')) this.bg.drawRunway(ctx, wx);

    if (this.state === 'menu') { this.drawMenuScene(ctx); ctx.setTransform(k, 0, 0, k, 0, 0); return; }

    this.particles.draw(ctx, false);
    this.pickups.draw(ctx, alpha, this.time);
    this.obstacles.draw(ctx, alpha, this.time);

    if (this.state === 'miami' || (this.miami && this.miami.phase)) this.drawMiamiScene(ctx);
    if (this.turboK > 0.05) this.drawTurboGhosts(ctx, alpha);
    this.player.draw(ctx, alpha, this.time, this.reduce);
    this.particles.draw(ctx, true);
    this.obstacles.drawWarnings(ctx, this.time);
    this.particles.drawTexts(ctx);

    if (this.debug.on) { this.player.drawHitbox(ctx); this.obstacles.drawHitboxes(ctx); }

    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash)})`; ctx.fillRect(0, 0, W, H); }
    if (this.state === 'dying' && this.reduce) { ctx.fillStyle = 'rgba(29,24,56,0.25)'; ctx.fillRect(0, 0, W, H); }
    if (this.state !== 'gameover') this.ui.drawHUD(ctx, this);
    this.ui.drawStamp(ctx, (c, i, x, y, w, h) => this.bg.drawThumb(c, i, x, y, w, h));
    this.ui.drawBanner(ctx);
    if (this.debug.on) { ctx.textAlign = 'left'; outlinedText(ctx, this.fps + ' fps', 12, H - 14, 14, '#7bff7a'); }
  }

  // "Motion blur" do turbo: cópias fantasmas do jato.
  drawTurboGhosts(ctx, alpha) {
    const p = this.player;
    const jet = jetSprite();
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.18 * this.turboK * (1 - i / 4);
      ctx.save();
      ctx.translate(lerp(p.px, p.x, alpha) - i * 26, lerp(p.py, p.y, alpha) + i * p.vy * 0.012);
      ctx.rotate(p.tilt);
      ctx.drawImage(jet.c, -jet.w / 2, -jet.h / 2, jet.w, jet.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawMenuScene(ctx) {
    const t = this.time;
    // jato estacionado na pista
    const jet = jetSprite();
    ctx.save(); ctx.translate(150, WORLD.groundY - 26);
    ctx.drawImage(jet.c, -jet.w / 2, -jet.h / 2, jet.w, jet.h);
    ctx.restore();
    // Flavião ajeitando o cabelo com o pente, olhando para os lados
    const comb = (Math.sin(t * 3.2) + 1) / 2;
    const look = Math.sin(t * 0.9) > 0.3 ? 1 : Math.sin(t * 0.9) < -0.3 ? -1 : 0;
    ctx.save(); ctx.translate(300, WORLD.groundY + 6);
    drawFlaviaoStanding(ctx, t, { comb, look });
    ctx.restore();
    if (Math.floor(t * 2) % 4 === 0) { ctx.textAlign = 'center'; outlinedText(ctx, '?', 300 + look * 40, WORLD.groundY - 170, 26, '#fff'); }
  }

  drawMiamiScene(ctx) {
    const m = this.miami;
    if (!m) return;
    const p = this.player;
    // aviãozinho com a faixa do autor cruzando o céu de Miami
    this.bg.drawTowPlane(ctx, W + 80 - m.t * 150, 118, this.time, AUTHOR.banner);
    // viatura "EXTRADIÇÃO EXPRESS"
    if (m.vanX < W + 150) this.bg.drawVan(ctx, m.vanX, WORLD.groundY + 2, this.time);
    if (m.phase === 1) {
      const t = m.pt;
      const jump = Math.abs(Math.sin(t * 6)) * 18 * (t < 1.6 ? 1 : 0.2);
      ctx.save(); ctx.translate(p.x + 110, WORLD.groundY + 6);
      drawFlaviaoStanding(ctx, this.time, { comb: t < 1.6 ? (Math.sin(t * 8) + 1) / 2 : 0.2, face: t > 1.8 ? 'scared' : 'happy', jump, look: t > 1.8 ? 1 : 0 });
      ctx.restore();
      if (t > 2 && Math.floor(t * 4) % 2) { ctx.textAlign = 'center'; outlinedText(ctx, '!', p.x + 112, WORLD.groundY - 190, 34, '#ff3b3b'); }
    }
  }
}
