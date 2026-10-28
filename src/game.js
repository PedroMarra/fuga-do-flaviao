// Orquestra o jogo: estados, atualização em passo fixo e desenho.
import { W, H, WORLD, PLAYER, SPEED, TRAIL, JUICE } from './config.js';
import { clamp, range, lerp } from './util.js';
import { Player, drawFlaviaoStanding } from './player.js';
import { Particles } from './particles.js';
import { storage } from './storage.js';

export class Game {
  constructor(canvas, ctx, input, debug) {
    this.canvas = canvas; this.ctx = ctx; this.input = input; this.debug = debug;
    this.player = new Player();
    this.particles = new Particles();
    this.ui = { setPortrait() {} };
    this.state = 'menu';
    this.time = 0; this.fps = 60;
    this.worldX = 0; this.pworldX = 0;
    this.speed = SPEED.menuScroll;
    this.trailAcc = 0;
    this.reduce = storage.reduceMotion;

    input.on('press', () => this.onPress());
    document.getElementById('btn-play').onclick = () => this.start();
    document.getElementById('menu').hidden = false;
    if (debug.autostart) setTimeout(() => this.start(), 50);
  }

  onResize() {}

  start() {
    document.getElementById('menu').hidden = true;
    this.player.reset();
    this.particles.reset();
    this.state = 'playing';
    this.speed = SPEED.base;
  }

  onPress() {
    if (this.state === 'playing') this.player.press();
  }

  autoPause() {}

  update(dt) {
    this.time += dt;
    this.pworldX = this.worldX;
    if (this.state === 'menu') {
      this.worldX += SPEED.menuScroll * dt;
      this.particles.update(dt, SPEED.menuScroll);
      return;
    }
    if (this.state === 'playing') {
      this.worldX += this.speed * dt;
      this.player.update(dt, this.input.holding);
      this.emitTrail(dt);
      this.particles.update(dt, this.speed);
    }
  }

  emitTrail(dt) {
    const p = this.player;
    const rate = p.turbo > 0 ? TRAIL.turbo : p.thrust > 0.5 ? TRAIL.rising : TRAIL.base;
    this.trailAcc += rate * dt;
    while (this.trailAcc >= 1) {
      this.trailAcc -= 1;
      const ex = p.exhaust();
      this.particles.note(ex.x + range(-6, 6), ex.y + range(-6, 6), -this.speed * range(0.35, 0.6) - 40, range(-40, 60) + p.vy * 0.15, range(TRAIL.life[0], TRAIL.life[1]));
    }
  }

  render(alpha) {
    const ctx = this.ctx;
    const k = this.canvas.width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3aa8ff'); g.addColorStop(1, '#bfeaff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5bbf4a'; ctx.fillRect(0, WORLD.groundY, W, H - WORLD.groundY);
    const wx = lerp(this.pworldX, this.worldX, alpha);
    ctx.fillStyle = '#3d8f34';
    for (let x = -(wx % 80); x < W; x += 80) ctx.fillRect(x, WORLD.groundY + 18, 40, 6);

    if (this.state === 'menu') {
      ctx.save(); ctx.translate(250, WORLD.groundY + 4);
      drawFlaviaoStanding(ctx, this.time, { comb: (Math.sin(this.time * 4) + 1) / 2, look: Math.sin(this.time * 1.3) });
      ctx.restore();
      return;
    }
    this.particles.draw(ctx, false);
    this.player.draw(ctx, alpha, this.time, this.reduce);
    this.particles.draw(ctx, true);
    if (this.debug.on) this.player.drawHitbox(ctx);
  }
}
