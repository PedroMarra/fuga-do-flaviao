// Sistema de partículas com pool fixo (nenhuma alocação durante o jogo).
import { sprite, ink, rrect, circle, INK, TAU, range, clamp, ease, outlinedText } from './util.js';

const N = 560;
const NT = 24;

export const P = { NOTE: 1, SMOKE: 2, SPARK: 3, DEBRIS: 4, FEATHER: 5, CONFETTI: 6, SWEAT: 7, STAR: 8, RING: 9, FIRE: 10, PAPER: 11, SPEED: 12 };

// ---- sprites ----
export function noteSprite() {
  return sprite('note', 26, 14, (g) => {
    rrect(g, -11, -6, 22, 12, 2); ink(g, '#58c46a', 2);
    rrect(g, -8, -3.5, 16, 7, 1.5); g.strokeStyle = '#2f8a43'; g.lineWidth = 1.2; g.stroke();
    circle(g, 0, 0, 3.6); g.fillStyle = '#a6eaa9'; g.fill();
    g.fillStyle = '#1f6b31'; g.font = 'bold 6px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('$', 0, 0.4);
  });
}
function smokeSprite() {
  return sprite('smoke', 40, 40, (g) => {
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, 19);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.6, 'rgba(235,235,240,0.7)');
    gr.addColorStop(1, 'rgba(235,235,240,0)');
    g.fillStyle = gr; circle(g, 0, 0, 19); g.fill();
  });
}
function featherSprite() {
  return sprite('feather', 16, 8, (g) => {
    g.beginPath(); g.ellipse(0, 0, 7, 2.8, 0, 0, TAU); ink(g, '#cfd3dc', 1.4);
  });
}
function paperSprite() {
  return sprite('paper', 14, 18, (g) => {
    rrect(g, -6, -8, 12, 16, 1); ink(g, '#fbf7e8', 1.6);
    g.strokeStyle = '#8a8aa0'; g.lineWidth = 1;
    for (let i = -4; i <= 4; i += 3) { g.beginPath(); g.moveTo(-3.5, i); g.lineTo(3.5, i); g.stroke(); }
  });
}
function starSprite() {
  return sprite('star', 18, 18, (g) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 3.6 : 8, a = (i / 10) * TAU - Math.PI / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); ink(g, '#ffd23f', 1.8);
  });
}
function sweatSprite() {
  return sprite('sweat', 12, 16, (g) => {
    g.beginPath(); g.moveTo(0, -7); g.quadraticCurveTo(5.5, 1, 4, 4); g.arc(0, 3.5, 4, 0, Math.PI); g.quadraticCurveTo(-5.5, 1, 0, -7);
    ink(g, '#8fe1ff', 1.8);
    circle(g, -1.3, 2.4, 1.2); g.fillStyle = '#fff'; g.fill();
  });
}

const CONFETTI_COLORS = ['#ffd23f', '#ff5e7e', '#4ad7ff', '#7bff7a', '#ffffff', '#c58bff'];

export class Particles {
  constructor() {
    this.p = [];
    for (let i = 0; i < N; i++) this.p.push({ on: false });
    this.cursor = 0;
    this.alive = 0;
    this.t = [];
    for (let i = 0; i < NT; i++) this.t.push({ on: false });
    this.tcursor = 0;
  }

  reset() {
    for (const q of this.p) q.on = false;
    for (const q of this.t) q.on = false;
  }

  // Pega a próxima partícula livre; se o pool estiver cheio, recicla a mais antiga.
  spawn(kind, x, y, vx, vy, life, size, front = false) {
    let q = null;
    for (let i = 0; i < N; i++) {
      const idx = (this.cursor + i) % N;
      if (!this.p[idx].on) { q = this.p[idx]; this.cursor = (idx + 1) % N; break; }
    }
    if (!q) { q = this.p[this.cursor]; this.cursor = (this.cursor + 1) % N; }
    q.on = true; q.kind = kind; q.x = x; q.y = y; q.vx = vx; q.vy = vy;
    q.life = life; q.max = life; q.size = size; q.front = front;
    q.rot = range(0, TAU); q.vr = range(-6, 6); q.phase = range(0, TAU);
    q.grav = 0; q.drag = 0; q.color = null; q.world = 0;
    return q;
  }

  // ----- emissores prontos -----
  note(x, y, vx, vy, life) {
    const q = this.spawn(P.NOTE, x, y, vx, vy, life, range(0.75, 1.1));
    q.vr = range(-5, 5); q.grav = 30; q.drag = 0.6;
    return q;
  }
  smoke(x, y, size, vx = 0, vy = -20, life = 0.8, front = false) {
    const q = this.spawn(P.SMOKE, x, y, vx, vy, life, size, front);
    q.drag = 1.2; return q;
  }
  fire(x, y, size, front = true) {
    const q = this.spawn(P.FIRE, x, y, range(-60, 60), range(-80, 20), range(0.25, 0.5), size, front);
    q.drag = 2; return q;
  }
  spark(x, y, speed = 380) {
    const a = range(0, TAU), s = range(speed * 0.4, speed);
    const q = this.spawn(P.SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s, range(0.2, 0.45), range(5, 11), true);
    q.drag = 3; q.grav = 400; return q;
  }
  burst(kind, x, y, n, speed, life = 0.8, front = true) {
    for (let i = 0; i < n; i++) {
      const a = range(0, TAU), s = range(speed * 0.3, speed);
      const q = this.spawn(kind, x, y, Math.cos(a) * s, Math.sin(a) * s, range(life * 0.6, life), range(0.8, 1.3), front);
      q.drag = 1.4; q.grav = kind === P.FEATHER || kind === P.PAPER ? 120 : kind === P.CONFETTI ? 260 : kind === P.NOTE ? 90 : 300;
      if (kind === P.CONFETTI || kind === P.DEBRIS) q.color = CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0];
    }
  }
  debris(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = range(0, TAU), s = range(120, 420);
      const q = this.spawn(P.DEBRIS, x, y, Math.cos(a) * s, Math.sin(a) * s - 120, range(0.5, 1.0), range(4, 9), true);
      q.grav = 700; q.drag = 0.5; q.color = colors[i % colors.length];
    }
  }
  ring(x, y, size, color = '#fff', life = 0.35) {
    const q = this.spawn(P.RING, x, y, 0, 0, life, size, true);
    q.color = color; return q;
  }
  sweat(x, y) {
    const q = this.spawn(P.SWEAT, x, y, range(-140, -60), range(-220, -140), 0.7, 1, true);
    q.grav = 700; q.vr = 0; q.rot = -0.5; return q;
  }
  star(x, y, life = 0.8) {
    const q = this.spawn(P.STAR, x, y, range(-120, 120), range(-220, -60), life, range(0.6, 1.1), true);
    q.grav = 350; return q;
  }
  speedLine(x, y, len) {
    const q = this.spawn(P.SPEED, x, y, -1400, 0, 0.35, len, false);
    q.vr = 0; return q;
  }

  // Texto flutuante ("+50", "UFA!").
  text(str, x, y, color = '#fff', size = 26, opts = {}) {
    const q = this.t[this.tcursor];
    this.tcursor = (this.tcursor + 1) % NT;
    q.on = true; q.str = str; q.x = x; q.y = y; q.color = color; q.size = size;
    q.life = opts.life ?? 0.9; q.max = q.life; q.vy = opts.vy ?? -70; q.blink = !!opts.blink;
    q.vx = opts.vx ?? 0;
  }

  update(dt, worldSpeed) {
    let alive = 0;
    for (let i = 0; i < N; i++) {
      const q = this.p[i];
      if (!q.on) continue;
      q.life -= dt;
      if (q.life <= 0) { q.on = false; continue; }
      alive++;
      if (q.drag) { const d = Math.max(0, 1 - q.drag * dt); q.vx *= d; q.vy *= d; }
      q.vy += q.grav * dt;
      q.x += q.vx * dt - (q.world ? worldSpeed * q.world * dt : 0);
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
      q.phase += dt * 7;
      if (q.kind === P.NOTE) q.vx += Math.sin(q.phase * 0.6) * 60 * dt; // balança com o vento
      if (q.kind === P.FEATHER || q.kind === P.PAPER) q.vx += Math.sin(q.phase * 0.5) * 90 * dt;
    }
    this.alive = alive;
    for (const q of this.t) {
      if (!q.on) continue;
      q.life -= dt;
      if (q.life <= 0) { q.on = false; continue; }
      q.y += q.vy * dt; q.x += q.vx * dt; q.vy *= 1 - 1.8 * dt;
    }
  }

  draw(ctx, front) {
    const m = ctx.getTransform();
    const k = m.a, e = m.e, f = m.f;
    const note = noteSprite(), smoke = smokeSprite(), feather = featherSprite(), star = starSprite(), sweat = sweatSprite(), paper = paperSprite();
    for (let i = 0; i < N; i++) {
      const q = this.p[i];
      if (!q.on || q.front !== front) continue;
      const lt = q.life / q.max; // 1 → 0
      switch (q.kind) {
        case P.NOTE: case P.FEATHER: case P.STAR: case P.SWEAT: case P.PAPER: {
          const s = q.kind === P.NOTE ? note : q.kind === P.FEATHER ? feather : q.kind === P.STAR ? star : q.kind === P.SWEAT ? sweat : paper;
          ctx.globalAlpha = clamp(lt / 0.35, 0, 1);
          const flip = q.kind === P.NOTE || q.kind === P.PAPER ? Math.cos(q.phase) : 1; // giro "3D"
          const c = Math.cos(q.rot), sn = Math.sin(q.rot), sx = q.size, sy = q.size * (Math.abs(flip) < 0.15 ? 0.15 * Math.sign(flip || 1) : flip);
          ctx.setTransform(k * c * sx, k * sn * sx, -k * sn * sy, k * c * sy, e + k * q.x, f + k * q.y);
          ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
          break;
        }
        case P.SMOKE: {
          const grow = 1 + (1 - lt) * 1.6;
          ctx.globalAlpha = lt * 0.85;
          const sz = q.size * grow;
          ctx.setTransform(k, 0, 0, k, e, f);
          ctx.drawImage(smoke.c, q.x - sz / 2, q.y - sz / 2, sz, sz);
          break;
        }
        case P.FIRE: {
          ctx.setTransform(k, 0, 0, k, e, f);
          ctx.globalAlpha = lt;
          ctx.fillStyle = lt > 0.6 ? '#fff6a8' : lt > 0.3 ? '#ffb03b' : '#ff5a2a';
          circle(ctx, q.x, q.y, q.size * (0.5 + lt * 0.7)); ctx.fill();
          break;
        }
        case P.SPARK: case P.SPEED: {
          ctx.setTransform(k, 0, 0, k, e, f);
          ctx.globalAlpha = q.kind === P.SPEED ? lt * 0.7 : lt;
          ctx.strokeStyle = q.kind === P.SPEED ? '#ffffff' : '#ffe066';
          ctx.lineWidth = q.kind === P.SPEED ? 2.5 : 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          if (q.kind === P.SPEED) { ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + q.size, q.y); }
          else { const sp = Math.hypot(q.vx, q.vy) || 1; ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - (q.vx / sp) * q.size, q.y - (q.vy / sp) * q.size); }
          ctx.stroke();
          break;
        }
        case P.DEBRIS: case P.CONFETTI: {
          const c = Math.cos(q.rot), sn = Math.sin(q.rot);
          ctx.setTransform(k * c, k * sn, -k * sn, k * c, e + k * q.x, f + k * q.y);
          ctx.globalAlpha = clamp(lt / 0.3, 0, 1);
          ctx.fillStyle = q.color || '#fff';
          const s = q.kind === P.CONFETTI ? 5 * q.size : q.size;
          ctx.fillRect(-s / 2, -s / 3, s, s * (q.kind === P.CONFETTI ? 0.55 * Math.cos(q.phase) : 0.7));
          if (q.kind === P.DEBRIS) { ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.strokeRect(-s / 2, -s / 3, s, s * 0.7); }
          break;
        }
        case P.RING: {
          ctx.setTransform(k, 0, 0, k, e, f);
          ctx.globalAlpha = lt;
          ctx.strokeStyle = q.color; ctx.lineWidth = 6 * lt + 1;
          circle(ctx, q.x, q.y, q.size * (1.2 - lt)); ctx.stroke();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(m);
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const q of this.t) {
      if (!q.on) continue;
      const age = q.max - q.life;
      if (q.blink && Math.floor(age * 12) % 2 === 1 && q.life > 0.25) continue;
      const s = ease.outBack(clamp(age / 0.18, 0, 1));
      ctx.globalAlpha = clamp(q.life / 0.25, 0, 1);
      outlinedText(ctx, q.str, q.x, q.y, q.size * s, q.color);
    }
    ctx.globalAlpha = 1;
  }
}
