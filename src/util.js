// Utilitários: matemática, aleatório com seed, easing, colisão e cache de sprites.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;

// Aleatório com seed (mulberry32). ?seed=42 na URL deixa as partidas reproduzíveis.
let seedState = (Math.random() * 2 ** 32) >>> 0;
export function setSeed(s) { seedState = s >>> 0; }
export function rand() {
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const range = (a, b) => a + (b - a) * rand();
export const irange = (a, b) => Math.floor(range(a, b + 1));
export const chance = (p) => rand() < p;
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// Escolhe uma chave de um objeto {chave: peso}.
export function weighted(mix, allow) {
  let total = 0;
  for (const k in mix) if (!allow || allow(k)) total += mix[k];
  if (total <= 0) return null;
  let r = rand() * total;
  for (const k in mix) {
    if (allow && !allow(k)) continue;
    r -= mix[k];
    if (r <= 0) return k;
  }
  return null;
}

// Gerador independente (para arte de fundo: não interfere no jogo).
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ease = {
  outCubic: (t) => 1 - (1 - t) ** 3,
  inCubic: (t) => t * t * t,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
  outElastic: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};

// ---------- Colisão ----------
export function circleCircle(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by, r = ar + br;
  return dx * dx + dy * dy < r * r;
}
export function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}
function distSegSq(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1), 0, 1);
  const dx = px - (ax + abx * t), dy = py - (ay + aby * t);
  return dx * dx + dy * dy;
}
export function circleTri(cx, cy, r, x1, y1, x2, y2, x3, y3) {
  const d1 = (cx - x2) * (y1 - y2) - (x1 - x2) * (cy - y2);
  const d2 = (cx - x3) * (y2 - y3) - (x2 - x3) * (cy - y3);
  const d3 = (cx - x1) * (y3 - y1) - (x3 - x1) * (cy - y1);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  if (!(neg && pos)) return true;
  const r2 = r * r;
  return distSegSq(cx, cy, x1, y1, x2, y2) < r2 || distSegSq(cx, cy, x2, y2, x3, y3) < r2 || distSegSq(cx, cy, x3, y3, x1, y1) < r2;
}

// ---------- Desenho cartoon ----------
export const INK = '#1d1838';           // cor do contorno grosso
export const LINE = 3.5;                // espessura padrão do contorno

export function ink(g, fill, lw = LINE, stroke = INK) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw > 0) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
}
export function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
export function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); }
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// ---------- Cache de sprites (desenha uma vez, reaproveita com drawImage) ----------
export const RS = { scale: 1 }; // pixels reais por px lógico; atualizado no resize
const cache = new Map();

export function sprite(key, w, h, draw) {
  let s = cache.get(key);
  if (!s) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * RS.scale));
    c.height = Math.max(1, Math.ceil(h * RS.scale));
    const g = c.getContext('2d');
    g.scale(c.width / w, c.height / h);
    g.translate(w / 2, h / 2);
    draw(g);
    s = { c, w, h };
    cache.set(key, s);
  }
  return s;
}
export function blit(ctx, s, x, y, rot = 0, sx = 1, sy = 1) {
  if (rot === 0 && sx === 1 && sy === 1) {
    ctx.drawImage(s.c, x - s.w / 2, y - s.h / 2, s.w, s.h);
  } else {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(sx, sy);
    ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  }
}
export function clearSprites() { cache.clear(); }

// Texto com contorno grosso (estilo arcade).
export function outlinedText(g, str, x, y, size, fill = '#fff', stroke = INK, font = 'Bungee', lw) {
  g.font = `${size}px "${font}", "Lilita One", system-ui, sans-serif`;
  g.lineJoin = 'round';
  g.lineWidth = lw ?? Math.max(3, size * 0.22);
  g.strokeStyle = stroke;
  g.strokeText(str, x, y);
  g.fillStyle = fill;
  g.fillText(str, x, y);
}

export const pad = (n, len = 5) => String(Math.max(0, Math.floor(n))).padStart(len, '0');
export const fmtPts = (n) => Math.floor(n).toLocaleString('pt-BR');
