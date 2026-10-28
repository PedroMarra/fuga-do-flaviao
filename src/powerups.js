// Coletáveis: malas de dinheiro (moeda) e power-ups (Habeas Corpus, Pix Expresso, Ímã de Bufunfa).
import { W, WORLD, PICKUPS as C } from './config.js';
import { range, irange, chance, weighted, sprite, blit, ink, circle, ellipse, rrect, INK, TAU, clamp, outlinedText } from './util.js';
import { drawMalaShape } from './player.js';

const POOL = 48;

function malaSprite() { return sprite('mala', 46, 46, (g) => drawMalaShape(g, 0, 4, 1.2)); }

function shieldSprite() {
  return sprite('pu-shield', 60, 60, (g) => {
    // pergaminho dourado "HC" com selo
    g.save(); g.rotate(-0.15);
    rrect(g, -16, -18, 32, 36, 3); ink(g, '#fff6d6', 3);
    g.strokeStyle = '#b08a2a'; g.lineWidth = 1.6;
    for (let y = -8; y <= 8; y += 5) { g.beginPath(); g.moveTo(-10, y); g.lineTo(10, y); g.stroke(); }
    rrect(g, -19, -22, 38, 8, 4); ink(g, '#ffd23f', 2.5);
    rrect(g, -19, 14, 38, 8, 4); ink(g, '#ffd23f', 2.5);
    g.fillStyle = INK; g.font = '11px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HC', 0, -3);
    circle(g, 9, 9, 6); ink(g, '#e0262f', 2);
    g.restore();
  });
}

function turboSprite() {
  return sprite('pu-turbo', 60, 60, (g) => {
    // xícara de café expresso com raio (turbo "Pix Expresso")
    g.beginPath(); g.arc(14, 2, 7, -Math.PI / 2, Math.PI / 2); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.lineWidth = 3.5; g.strokeStyle = '#ffffff'; g.stroke();
    g.beginPath(); g.moveTo(-16, -8); g.lineTo(16, -8); g.lineTo(12, 14); g.quadraticCurveTo(0, 18, -12, 14); g.closePath(); ink(g, '#ffffff', 3);
    ellipse(g, 0, -8, 16, 4); ink(g, '#6b3d1e', 2.5);
    ellipse(g, 0, 18, 22, 4); ink(g, '#dfe3ee', 2.5);
    g.beginPath(); g.moveTo(2, -26); g.lineTo(-8, -6); g.lineTo(0, -6); g.lineTo(-4, 10); g.lineTo(10, -12); g.lineTo(2, -12); g.lineTo(8, -26); g.closePath();
    ink(g, '#4ad7ff', 2.5);
  });
}

function magnetSprite() {
  return sprite('pu-magnet', 60, 60, (g) => {
    g.save(); g.rotate(0.5);
    g.beginPath(); g.arc(0, 0, 16, Math.PI, 0, true); g.lineWidth = 17; g.strokeStyle = INK; g.stroke();
    g.lineWidth = 11; g.strokeStyle = '#ff3b3b'; g.stroke();
    g.beginPath(); g.moveTo(-16, 0); g.lineTo(-16, -12); g.moveTo(16, 0); g.lineTo(16, -12); g.lineWidth = 17; g.strokeStyle = INK; g.stroke();
    g.lineWidth = 11; g.strokeStyle = '#ff3b3b'; g.stroke();
    g.beginPath(); g.moveTo(-16, -8); g.lineTo(-16, -18); g.moveTo(16, -8); g.lineTo(16, -18); g.lineWidth = 11; g.strokeStyle = '#e8e8f0'; g.stroke();
    g.restore();
    g.fillStyle = '#ffe680'; g.font = '14px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = INK; g.strokeText('$', 0, 4); g.fillText('$', 0, 4);
  });
}

const LABEL = { shield: 'HABEAS CORPUS', turbo: 'PIX EXPRESSO', magnet: 'ÍMÃ DE BUFUNFA' };
const COLOR = { shield: '#ffd23f', turbo: '#4ad7ff', magnet: '#ff5e7e' };

export class Pickups {
  constructor(game) {
    this.game = game;
    this.list = [];
    for (let i = 0; i < POOL; i++) this.list.push({ on: false });
    this.reset();
  }

  reset() {
    for (const k of this.list) k.on = false;
    this.malaT = 1.0;
    this.powerT = C.firstPower;
  }

  add(kind, x, y) {
    const k = this.list.find((q) => !q.on);
    if (!k) return null;
    k.on = true; k.kind = kind; k.x = x; k.y = y; k.px = x; k.py = y; k.baseY = y;
    k.t = range(0, TAU); k.pulled = false; k.vx = 0; k.vy = 0;
    return k;
  }

  // Escolhe uma altura longe dos obstáculos que acabaram de entrar.
  freeY(lo = 80, hi = 440) {
    let best = (lo + hi) / 2, bestD = -1;
    for (let i = 0; i < 8; i++) {
      const y = range(lo, hi);
      let d = 9999;
      for (const o of this.game.obstacles.list) {
        if (!o.on || o.x < W - 260) continue;
        d = Math.min(d, Math.abs(o.y - y));
      }
      if (d > bestD) { bestD = d; best = y; }
    }
    return best;
  }

  spawnMalas() {
    const n = irange(5, 8), y0 = this.freeY(90, 430), shape = irange(0, 2);
    const amp = range(30, 60);
    for (let i = 0; i < n; i++) {
      const x = W + 40 + i * 40;
      let y = y0;
      if (shape === 1) y = y0 - Math.sin((i / (n - 1)) * Math.PI) * amp;          // arco
      if (shape === 2) y = y0 + (i - n / 2) * 16 * (y0 > 260 ? -1 : 1);           // diagonal
      this.add('mala', x, clamp(y, 70, 445));
    }
  }

  spawnPower() {
    const p = this.game.player;
    const kind = weighted({ shield: p.shield ? 0 : 4, turbo: 3, magnet: p.magnet > 0 ? 1 : 3 }) || 'turbo';
    this.add(kind, W + 50, this.freeY(110, 400));
  }

  update(dt, speed) {
    const g = this.game, p = g.player;
    const playing = g.state === 'playing';
    if (playing && g.spawnEnabled) {
      this.malaT -= dt;
      if (this.malaT <= 0) { this.spawnMalas(); this.malaT = range(C.malaEvery[0], C.malaEvery[1]); }
      this.powerT -= dt;
      if (this.powerT <= 0) { this.spawnPower(); this.powerT = range(C.powerEvery[0], C.powerEvery[1]); }
    }
    const cx = p.x + 6, cy = p.y - 8;
    for (const k of this.list) {
      if (!k.on) continue;
      k.px = k.x; k.py = k.y;
      k.t += dt;
      // ímã: puxa as malas próximas
      if (k.kind === 'mala' && p.magnet > 0 && playing) {
        const dx = cx - k.x, dy = cy - k.y, d = Math.hypot(dx, dy);
        if (d < C.magnetRadius || k.pulled) {
          k.pulled = true;
          const pull = C.magnetPull * (1.2 - Math.min(1, d / C.magnetRadius));
          k.vx += (dx / (d || 1)) * pull * dt * 6; k.vy += (dy / (d || 1)) * pull * dt * 6;
          const sp = Math.hypot(k.vx, k.vy), max = 900;
          if (sp > max) { k.vx *= max / sp; k.vy *= max / sp; }
          k.x += k.vx * dt; k.y += k.vy * dt;
          if (Math.random() < dt * 20) g.particles.spark(k.x, k.y, 80);
        }
      }
      if (!k.pulled) {
        k.x -= speed * dt;
        k.y = k.baseY + Math.sin(k.t * 3) * (k.kind === 'mala' ? 4 : 8);
      }
      if (k.x < -60) { k.on = false; continue; }
      // coleta (raio generoso: coletar é bom, bater é justo)
      if (playing && p.alive) {
        const r = k.kind === 'mala' ? C.collectRadius + 16 : C.collectRadius + 22;
        const dx = cx - k.x, dy = cy - k.y;
        if (dx * dx + dy * dy < r * r) { k.on = false; g.onCollect(k.kind, k.x, k.y); }
      }
    }
  }

  draw(ctx, alpha, time) {
    for (const k of this.list) {
      if (!k.on) continue;
      const x = k.px + (k.x - k.px) * alpha, y = k.py + (k.y - k.py) * alpha;
      if (k.kind === 'mala') {
        const pulse = 0.5 + 0.5 * Math.sin(time * 6 + k.t);
        ctx.globalAlpha = 0.25 + pulse * 0.2;
        ctx.fillStyle = '#fff3a0'; circle(ctx, x, y, 22 + pulse * 4); ctx.fill();
        ctx.globalAlpha = 1;
        blit(ctx, malaSprite(), x, y, Math.sin(time * 4 + k.t) * 0.12);
        // brilho que passa
        if (((time + k.t) % 2.2) < 0.15) { ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(x + 10, y - 10); ctx.rotate(time * 4); ctx.fillRect(-1.5, -7, 3, 14); ctx.fillRect(-7, -1.5, 14, 3); ctx.restore(); }
      } else {
        const col = COLOR[k.kind];
        const pulse = 1 + Math.sin(time * 5) * 0.06;
        ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
        // bolha
        ctx.globalAlpha = 0.35; ctx.fillStyle = col; circle(ctx, 0, 0, 32); ctx.fill();
        ctx.globalAlpha = 1; ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
        ctx.lineWidth = 2.5; ctx.strokeStyle = col; circle(ctx, 0, 0, 32); ctx.stroke();
        // raios girando
        ctx.save(); ctx.rotate(time * 1.5); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(36, 0); ctx.lineTo(44, 0); ctx.stroke(); }
        ctx.restore();
        ctx.beginPath(); ctx.arc(-10, -12, 10, Math.PI * 1.1, Math.PI * 1.6); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
        ctx.restore();
        const s = k.kind === 'shield' ? shieldSprite() : k.kind === 'turbo' ? turboSprite() : magnetSprite();
        blit(ctx, s, x, y);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        outlinedText(ctx, LABEL[k.kind], x, y + 46, 11, col, INK, 'Bungee', 4);
      }
    }
  }
}
