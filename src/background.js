// Cenário: 8 países, cada um com céu próprio e 4 camadas de parallax + nuvens.
// As camadas são desenhadas por código uma vez (canvas offscreen) e repetidas lado a lado.
import { W, H, WORLD } from './config.js';
import { RS, makeRng, ink, circle, ellipse, rrect, INK, TAU, clamp, lerp } from './util.js';

const TW = 1024; // largura do "azulejo" que se repete
const GY = WORLD.groundY;

// Camadas: fator de parallax, altura e topo (em px lógicos).
const LAYERS = [
  { key: 'clouds', f: 0.05, h: 220, top: 20 },
  { key: 'far', f: 0.12, h: 300, top: GY - 300 },
  { key: 'mid', f: 0.3, h: 250, top: GY - 250 },
  { key: 'near', f: 0.6, h: 180, top: GY - 180 },
  { key: 'ground', f: 1.0, h: H - GY, top: GY },
];

// ---------- Helpers de desenho ----------
// Desenha fn(x) e também a cópia do outro lado quando encosta na borda (emenda perfeita).
function rep(x, w, fn) { fn(x); if (x - w < 0) fn(x + TW); if (x + w > TW) fn(x - TW); }

// Cordilheira contínua e periódica (soma de senos com frequências inteiras).
function ridge(g, rng, { base, amps, h, color, shade, lw = 3.5, snow }) {
  const ph = amps.map(() => rng() * TAU);
  const y = (x) => base - amps.reduce((s, a, i) => s + a * Math.sin((TAU * (i + 1) * x) / TW + ph[i]), 0);
  const path = (dx = 0, dy = 0) => {
    g.beginPath(); g.moveTo(-2, h + 2);
    for (let x = -2; x <= TW + 2; x += 8) g.lineTo(x + dx, y(x) + dy);
    g.lineTo(TW + 2, h + 2); g.closePath();
  };
  path(); g.fillStyle = color; g.fill();
  if (shade) { g.save(); path(); g.clip(); path(14, 22); g.fillStyle = shade; g.fill(); g.restore(); }
  if (snow) {
    g.save(); path(); g.clip();
    g.fillStyle = snow;
    g.beginPath(); g.moveTo(-2, 0);
    for (let x = -2; x <= TW + 2; x += 8) g.lineTo(x, y(x) + 14 + Math.sin(x * 0.15) * 5);
    g.lineTo(TW + 2, 0); g.closePath(); g.fill();
    g.restore();
  }
  g.beginPath(); for (let x = -2; x <= TW + 2; x += 8) g.lineTo(x, y(x));
  g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
  return y;
}

function peak(g, x, base, w, h, color, shade, snow) {
  rep(x, w, (xx) => {
    const p = () => { g.beginPath(); g.moveTo(xx - w, base); g.quadraticCurveTo(xx - w * 0.35, base - h * 0.55, xx, base - h); g.quadraticCurveTo(xx + w * 0.35, base - h * 0.5, xx + w, base); g.closePath(); };
    p(); g.fillStyle = color; g.fill();
    g.save(); p(); g.clip();
    g.fillStyle = shade; g.beginPath(); g.moveTo(xx, base - h); g.lineTo(xx + w, base); g.lineTo(xx + w * 0.1, base); g.closePath(); g.fill();
    if (snow) {
      g.fillStyle = snow; g.beginPath(); g.moveTo(xx - w, base - h * 0.62);
      for (let i = 0; i <= 8; i++) g.lineTo(xx - w + (i / 8) * 2 * w, base - h * 0.62 + (i % 2 ? 10 : -4));
      g.lineTo(xx + w, base - h - 10); g.lineTo(xx - w, base - h - 10); g.closePath(); g.fill();
    }
    g.restore();
    p(); ink(g, null);
  });
}

function palm(g, x, base, h, lean = 0.15, trunk = '#a8743a', leaf = '#2fa84a') {
  rep(x, 70, (xx) => {
    const tx = xx + h * lean, ty = base - h;
    g.beginPath(); g.moveTo(xx - 6, base); g.quadraticCurveTo(xx + h * lean * 0.3, base - h * 0.5, tx - 3, ty); g.lineTo(tx + 3, ty); g.quadraticCurveTo(xx + h * lean * 0.3 + 8, base - h * 0.5, xx + 6, base); g.closePath();
    ink(g, trunk, 3);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    for (let i = 1; i < 6; i++) { const yy = base - (h * i) / 6, xx2 = xx + h * lean * (i / 6) * 0.9; g.beginPath(); g.moveTo(xx2 - 5, yy); g.lineTo(xx2 + 5, yy - 3); g.stroke(); }
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55, len = h * 0.45;
      const ex = tx + Math.cos(a) * len * 1.3, ey = ty + Math.sin(a) * len * 0.5 + len * 0.45;
      g.beginPath(); g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.8, ty + Math.sin(a) * len * 0.9 - 6, ex, ey);
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.4 + 8, tx, ty);
      ink(g, leaf, 3);
    }
    circle(g, tx - 4, ty + 6, 5); ink(g, '#7a4a22', 2.5);
    circle(g, tx + 5, ty + 7, 5); ink(g, '#7a4a22', 2.5);
  });
}

function tree(g, x, base, r, color, shade, trunk = '#7a4a22') {
  rep(x, r * 1.6, (xx) => {
    rrect(g, xx - r * 0.14, base - r * 1.2, r * 0.28, r * 1.2, 3); ink(g, trunk, 3);
    const blobs = [[0, -r * 1.55, r], [-r * 0.7, -r * 1.2, r * 0.7], [r * 0.7, -r * 1.2, r * 0.72]];
    g.beginPath(); for (const [bx, by, br] of blobs) { g.moveTo(xx + bx + br, base + by); g.arc(xx + bx, base + by, br, 0, TAU); }
    g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.fillStyle = color; g.fill();
    g.fillStyle = shade; for (const [bx, by, br] of blobs) { circle(g, xx + bx + br * 0.25, base + by + br * 0.25, br * 0.7); g.fill(); }
    g.fillStyle = color; for (const [bx, by, br] of blobs) { circle(g, xx + bx - br * 0.15, base + by - br * 0.15, br * 0.62); g.fill(); }
  });
}

function bush(g, x, base, r, color, shade) {
  rep(x, r * 2, (xx) => {
    g.beginPath(); g.moveTo(xx - r * 1.6, base); g.arc(xx - r * 0.8, base, r * 0.8, Math.PI, 0); g.arc(xx, base - r * 0.2, r, Math.PI, 0); g.arc(xx + r * 0.9, base, r * 0.75, Math.PI, 0); g.closePath();
    ink(g, color, 3);
    g.fillStyle = shade; circle(g, xx + r * 0.4, base - r * 0.1, r * 0.45); g.fill();
  });
}

function cactus(g, x, base, h, color = '#3fae5a', shade = '#2b8a45') {
  rep(x, 40, (xx) => {
    const w = h * 0.16;
    const arm = (sx, ay, ah) => {
      g.beginPath(); g.moveTo(xx + sx * w * 0.5, base - ay); g.lineTo(xx + sx * (w * 1.6), base - ay); g.quadraticCurveTo(xx + sx * w * 2.2, base - ay, xx + sx * w * 2.2, base - ay - w * 0.6);
      g.lineTo(xx + sx * w * 2.2, base - ay - ah); g.arc(xx + sx * w * 1.75, base - ay - ah, w * 0.45, 0, Math.PI, true);
      g.lineTo(xx + sx * w * 1.3, base - ay - w * 0.6); g.lineTo(xx + sx * w * 0.5, base - ay - w * 0.6); g.closePath();
      ink(g, color, 3);
    };
    arm(-1, h * 0.4, h * 0.25); arm(1, h * 0.55, h * 0.22);
    rrect(g, xx - w / 2, base - h, w, h, w / 2); ink(g, color, 3);
    g.fillStyle = shade; g.fillRect(xx + w * 0.1, base - h + w * 0.5, w * 0.25, h - w * 0.6);
  });
}

function building(g, x, base, w, h, color, trim, opts = {}) {
  rep(x, w, (xx) => {
    rrect(g, xx - w / 2, base - h, w, h, opts.round ?? 4); ink(g, color, 3);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(xx + w * 0.22, base - h + 3, w * 0.26, h - 4);
    if (opts.deco) { // art déco: degraus no topo + faixas
      rrect(g, xx - w * 0.3, base - h - 18, w * 0.6, 20, 3); ink(g, color, 3);
      rrect(g, xx - w * 0.12, base - h - 34, w * 0.24, 18, 3); ink(g, trim, 3);
      g.fillStyle = trim; g.fillRect(xx - w / 2 + 3, base - h + 10, w - 6, 5);
    }
    if (opts.windows !== false) {
      g.fillStyle = opts.win || '#bfeaff';
      for (let wy = base - h + 22; wy < base - 16; wy += 22)
        for (let wx = xx - w / 2 + 8; wx < xx + w / 2 - 10; wx += 16) { rrect(g, wx, wy, 8, 11, 2); g.fill(); }
    }
  });
}

function cloud(g, x, y, s, color = '#fff', alpha = 0.95) {
  rep(x, 80 * s, (xx) => {
    g.globalAlpha = alpha;
    const blobs = [[-34, 6, 20], [-12, -8, 26], [16, -4, 22], [36, 8, 16], [0, 10, 22]];
    g.beginPath(); for (const [bx, by, br] of blobs) { g.moveTo(xx + bx * s + br * s, y + by * s); g.arc(xx + bx * s, y + by * s, br * s, 0, TAU); }
    g.lineWidth = 3; g.strokeStyle = 'rgba(29,24,56,0.25)'; g.stroke(); g.fillStyle = color; g.fill();
    g.globalAlpha = 1;
  });
}

function groundBase(g, h, color, top, stripe) {
  g.fillStyle = color; g.fillRect(0, 0, TW, h);
  g.fillStyle = top; g.fillRect(0, 0, TW, 9);
  g.fillStyle = INK; g.fillRect(0, 0, TW, 3.5);
  if (stripe) { g.fillStyle = stripe; for (let x = 0; x < TW; x += 64) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 26, 12); g.lineTo(x + 40, 12); g.lineTo(x + 14, h); g.fill(); } }
}

// ---------- Arte de cada país ----------
const ART = [
  { // BRASIL: morros arredondados, casinhas coloridas no morro, coqueiros
    sky: ['#29a3ff', '#c8f2ff'], sun: ['#fff27a', 820, 90, 46], cloud: '#ffffff',
    far: (g, r, h) => {
      ridge(g, r, { base: h - 90, amps: [26, 18, 8], h, color: '#58b98a', shade: '#3f9a70' });
      for (const [x, w, hh] of [[160, 70, 210], [250, 50, 150], [700, 80, 230], [820, 55, 160]]) peak(g, x, h, w, hh, '#5cbf7d', '#46a165');
    },
    mid: (g, r, h) => {
      const y = ridge(g, r, { base: h - 60, amps: [30, 14], h, color: '#7ccf5a', shade: '#62b545' });
      const cols = ['#ff6b6b', '#ffd23f', '#4ad7ff', '#ff9ff3', '#7bff7a', '#ffa94d'];
      for (let i = 0; i < 46; i++) {
        const x = r() * TW, yy = y(x) + 10 + r() * 50, w = 18 + r() * 14;
        rep(x, w, (xx) => { rrect(g, xx - w / 2, yy - w * 0.8, w, w * 0.8, 2); ink(g, cols[i % cols.length], 2.5); g.fillStyle = INK; g.fillRect(xx - 3, yy - w * 0.45, 6, 7); });
      }
    },
    near: (g, r, h) => { for (let i = 0; i < 6; i++) palm(g, 60 + i * 175 + r() * 40, h, 110 + r() * 50, 0.1 + r() * 0.2); for (let i = 0; i < 8; i++) bush(g, r() * TW, h, 18 + r() * 12, '#3fae5a', '#2b8a45'); },
    ground: (g, r, h) => { groundBase(g, h, '#5bbf4a', '#79d65e', '#4ea83f'); for (let i = 0; i < 20; i++) { const x = r() * TW; g.fillStyle = ['#ffd23f', '#ff6b6b', '#fff'][i % 3]; circle(g, x, 20 + r() * 30, 3); g.fill(); } },
  },
  { // PARAGUAI: fim de tarde, terra vermelha, lojas de "importados", ipês
    sky: ['#ff8a5c', '#ffe3a8'], sun: ['#fff0a0', 760, 120, 60], cloud: '#ffe1cf',
    far: (g, r, h) => { ridge(g, r, { base: h - 60, amps: [12, 8, 4], h, color: '#c97a5a', shade: '#b0644a' }); },
    mid: (g, r, h) => {
      ridge(g, r, { base: h - 30, amps: [6, 4], h, color: '#d8925e', shade: '#c27d4c' });
      const signs = ['IMPORTADOS', 'ELETRÔNICOS', 'TUDO 1,99', 'MUAMBA & CIA', 'PREÇO BOM'];
      const cols = ['#ffd23f', '#4ad7ff', '#ff6b9a', '#7bff7a', '#c58bff'];
      for (let i = 0; i < 6; i++) {
        const x = 80 + i * 170, w = 120 + r() * 30, hh = 90 + r() * 70;
        building(g, x, h, w, hh, '#f3e3c3', '#c97a5a', { win: '#9ad6ff' });
        rep(x, w, (xx) => { rrect(g, xx - w * 0.45, h - hh - 26, w * 0.9, 26, 4); ink(g, cols[i % 5], 3); g.fillStyle = INK; g.font = '13px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(signs[i % 5], xx, h - hh - 12); });
      }
    },
    near: (g, r, h) => { for (let i = 0; i < 6; i++) tree(g, 70 + i * 175 + r() * 50, h, 32 + r() * 12, i % 2 ? '#ff7fc4' : '#ffd23f', i % 2 ? '#e55aa6' : '#e6b300'); },
    ground: (g, r, h) => { groundBase(g, h, '#c0603a', '#d97a4f', '#a95232'); },
  },
  { // BOLÍVIA: Andes nevados, salar branco, lhamas, casas de adobe
    sky: ['#1f63d6', '#a9d8ff'], sun: ['#ffffff', 180, 80, 34], cloud: '#ffffff',
    far: (g, r, h) => { for (let i = 0; i < 7; i++) peak(g, 70 + i * 150 + r() * 40, h, 110 + r() * 40, 200 + r() * 90, '#8a8fc9', '#6f73ad', '#ffffff'); },
    mid: (g, r, h) => {
      g.fillStyle = '#eef6ff'; g.fillRect(0, h - 70, TW, 70);
      g.fillStyle = '#d4e6fb'; for (let i = 0; i < 20; i++) { g.beginPath(); g.ellipse(r() * TW, h - 10 - r() * 50, 30 + r() * 30, 3, 0, 0, TAU); g.fill(); }
      g.fillStyle = INK; g.fillRect(0, h - 72, TW, 3);
      for (let i = 0; i < 5; i++) { // lhamas
        const x = 100 + i * 200 + r() * 60, b = h - 20;
        rep(x, 30, (xx) => {
          ellipse(g, xx, b - 22, 18, 11); ink(g, '#f4e3c8', 3);
          rrect(g, xx - 17, b - 50, 9, 32, 4); ink(g, '#f4e3c8', 3);
          ellipse(g, xx - 16, b - 52, 8, 6); ink(g, '#f4e3c8', 3);
          g.lineWidth = 3; g.strokeStyle = INK; g.beginPath(); for (const lx of [-10, -4, 6, 12]) { g.moveTo(xx + lx, b - 14); g.lineTo(xx + lx, b); } g.stroke();
          g.fillStyle = '#ff5e7e'; g.fillRect(xx - 6, b - 30, 12, 5);
        });
      }
    },
    near: (g, r, h) => {
      for (let i = 0; i < 4; i++) {
        const x = 120 + i * 260 + r() * 60, w = 90, hh = 60;
        rep(x, w, (xx) => {
          rrect(g, xx - w / 2, h - hh, w, hh, 3); ink(g, '#d9a066', 3);
          g.beginPath(); g.moveTo(xx - w / 2 - 8, h - hh); g.lineTo(xx, h - hh - 30); g.lineTo(xx + w / 2 + 8, h - hh); g.closePath(); ink(g, '#c4473a', 3);
          rrect(g, xx - 10, h - 34, 20, 34, 3); ink(g, '#7a4a22', 2.5);
        });
      }
      for (let i = 0; i < 6; i++) cactus(g, r() * TW, h, 50 + r() * 30, '#5fae6a', '#468e52');
    },
    ground: (g, r, h) => { groundBase(g, h, '#e9e3d4', '#f6f2e8', '#d8d0bc'); },
  },
  { // PERU: picos verdes e cidadela inca com terraços (inspirada em Machu Picchu)
    sky: ['#4ab6ff', '#e6fbff'], sun: ['#fff27a', 860, 70, 38], cloud: '#ffffff',
    far: (g, r, h) => { for (let i = 0; i < 6; i++) peak(g, 80 + i * 180 + r() * 30, h, 80 + r() * 30, 230 + r() * 60, '#3e9a6a', '#2f7f56'); },
    mid: (g, r, h) => {
      for (let k = 0; k < 2; k++) {
        const cx = 260 + k * 512;
        peak(g, cx + 150, h, 90, 220, '#4fae74', '#3c905f');
        rep(cx, 220, (xx) => {
          for (let t = 0; t < 6; t++) { // terraços
            const w = 300 - t * 36, y = h - t * 22;
            rrect(g, xx - w / 2, y - 22, w, 22, 3); ink(g, t % 2 ? '#7cc95c' : '#6dbb50', 3);
            g.fillStyle = '#a49a8a'; g.fillRect(xx - w / 2 + 2, y - 6, w - 4, 4);
          }
          for (let b = 0; b < 4; b++) { // ruínas de pedra
            const bx = xx - 70 + b * 46, by = h - 132;
            rrect(g, bx, by - 30, 36, 30, 2); ink(g, '#b9b0a0', 3);
            g.strokeStyle = 'rgba(29,24,56,0.4)'; g.lineWidth = 1.5;
            g.beginPath(); g.moveTo(bx, by - 15); g.lineTo(bx + 36, by - 15); g.moveTo(bx + 18, by - 30); g.lineTo(bx + 18, by - 15); g.stroke();
            g.beginPath(); g.moveTo(bx - 4, by - 30); g.lineTo(bx + 18, by - 46); g.lineTo(bx + 40, by - 30); g.closePath(); ink(g, '#8f7a5a', 3);
          }
        });
      }
    },
    near: (g, r, h) => {
      for (let i = 0; i < 5; i++) { const x = 60 + i * 210, w = 140; rep(x, w, (xx) => { rrect(g, xx - w / 2, h - 46, w, 46, 3); ink(g, '#b9b0a0', 3); g.strokeStyle = 'rgba(29,24,56,0.35)'; g.lineWidth = 2; for (let s = 0; s < 4; s++) { g.beginPath(); g.moveTo(xx - w / 2, h - 46 + s * 12); g.lineTo(xx + w / 2, h - 46 + s * 12); g.stroke(); } }); }
      for (let i = 0; i < 10; i++) bush(g, r() * TW, h, 14 + r() * 10, '#4fae5a', '#3a8f47');
    },
    ground: (g, r, h) => { groundBase(g, h, '#6dbb50', '#86d266', '#5aa443'); },
  },
  { // COLÔMBIA: selva, montanhas na névoa, folhas gigantes, café
    sky: ['#2fbfae', '#d8ffe8'], sun: ['#fffbd0', 640, 100, 44], cloud: '#effff7',
    far: (g, r, h) => { ridge(g, r, { base: h - 150, amps: [40, 22, 10], h, color: '#6fb8a8', shade: '#5aa394', lw: 3 }); g.fillStyle = 'rgba(230,255,245,0.45)'; g.fillRect(0, h - 120, TW, 120); },
    mid: (g, r, h) => {
      ridge(g, r, { base: h - 60, amps: [10, 6], h, color: '#1f7a45', shade: '#17663a' });
      for (let i = 0; i < 22; i++) tree(g, r() * TW, h - 40 + r() * 30, 24 + r() * 16, ['#2a9a52', '#1f8a48', '#37ad5e'][i % 3], '#1a6e3b', '#5c3a1c');
    },
    near: (g, r, h) => {
      for (let i = 0; i < 9; i++) {
        const x = r() * TW, s = 0.8 + r() * 0.6;
        rep(x, 80, (xx) => {
          for (let k = -2; k <= 2; k++) {
            const a = -Math.PI / 2 + k * 0.45;
            g.beginPath(); g.moveTo(xx, h);
            g.quadraticCurveTo(xx + Math.cos(a - 0.3) * 70 * s, h + Math.sin(a - 0.3) * 70 * s, xx + Math.cos(a) * 110 * s, h + Math.sin(a) * 110 * s);
            g.quadraticCurveTo(xx + Math.cos(a + 0.3) * 70 * s, h + Math.sin(a + 0.3) * 70 * s, xx, h);
            ink(g, k % 2 ? '#2fae5a' : '#3fc46a', 3);
          }
        });
      }
      for (let i = 0; i < 6; i++) { const x = r() * TW; rep(x, 30, (xx) => { bush(g, xx, h, 20, '#2b8a45', '#1f6e36'); for (let b = 0; b < 5; b++) { circle(g, xx - 14 + b * 7, h - 14 - (b % 2) * 8, 3.5); ink(g, '#e0262f', 1.5); } }); }
    },
    ground: (g, r, h) => { groundBase(g, h, '#2f7d3f', '#3f9a4f', '#286c36'); },
  },
  { // PANAMÁ: canal com navios cargueiros, eclusas e guindastes
    sky: ['#3ea2ff', '#cdeeff'], sun: ['#fff27a', 200, 90, 40], cloud: '#ffffff',
    far: (g, r, h) => { ridge(g, r, { base: h - 80, amps: [30, 12, 6], h, color: '#5fb875', shade: '#4a9c60' }); },
    mid: (g, r, h) => {
      g.fillStyle = '#2f8fd8'; g.fillRect(0, h - 50, TW, 50);
      g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 30; i++) { g.fillRect(r() * TW, h - 45 + r() * 40, 20 + r() * 20, 2); }
      g.fillStyle = INK; g.fillRect(0, h - 52, TW, 3);
      const cc = ['#ff5e5e', '#4ad7ff', '#ffd23f', '#7bff7a', '#ff9f43', '#c58bff'];
      for (let s = 0; s < 3; s++) {
        const x = 150 + s * 340, w = 230;
        rep(x, w / 2 + 20, (xx) => {
          g.beginPath(); g.moveTo(xx - w / 2, h - 50); g.lineTo(xx + w / 2 + 14, h - 50); g.lineTo(xx + w / 2, h - 20); g.lineTo(xx - w / 2 + 10, h - 20); g.closePath(); ink(g, s % 2 ? '#2f3f7a' : '#a8323a', 3);
          for (let c = 0; c < 9; c++) for (let rr = 0; rr < 2; rr++) { rrect(g, xx - w / 2 + 14 + c * 21, h - 72 - rr * 20, 20, 20, 1); ink(g, cc[(c + rr * 3 + s) % 6], 2); }
          rrect(g, xx + w / 2 - 34, h - 104, 26, 54, 3); ink(g, '#ffffff', 3);
          g.fillStyle = '#7fd8ff'; g.fillRect(xx + w / 2 - 30, h - 98, 18, 6);
        });
      }
    },
    near: (g, r, h) => {
      for (let i = 0; i < 3; i++) { // guindastes
        const x = 100 + i * 340;
        rep(x, 120, (xx) => {
          g.lineWidth = 6; g.strokeStyle = INK; g.beginPath(); g.moveTo(xx - 30, h); g.lineTo(xx - 20, h - 150); g.moveTo(xx + 30, h); g.lineTo(xx + 20, h - 150); g.stroke();
          g.lineWidth = 3.5; g.strokeStyle = '#ffb703'; g.stroke();
          rrect(g, xx - 40, h - 168, 160, 18, 3); ink(g, '#ffb703', 3);
          rrect(g, xx - 28, h - 150, 34, 24, 3); ink(g, '#fff', 3);
          g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(xx + 100, h - 150); g.lineTo(xx + 100, h - 90); g.stroke();
          rrect(g, xx + 88, h - 92, 24, 16, 2); ink(g, '#ff5e5e', 2.5);
        });
      }
      for (let i = 0; i < 2; i++) { const x = 300 + i * 512; rep(x, 70, (xx) => { rrect(g, xx - 60, h - 54, 120, 54, 3); ink(g, '#8c96a8', 3); g.fillStyle = '#ffd23f'; for (let k = 0; k < 6; k++) g.fillRect(xx - 56 + k * 20, h - 50, 10, 6); }); }
    },
    ground: (g, r, h) => { groundBase(g, h, '#9aa3b2', '#b5bdca', null); g.fillStyle = '#ffd23f'; for (let x = 0; x < TW; x += 80) g.fillRect(x, 26, 44, 7); },
  },
  { // MÉXICO: deserto ao pôr do sol, mesas, pirâmide maia em degraus, cactos
    sky: ['#ff6f59', '#ffd59a'], sun: ['#fff0a0', 520, 150, 70], cloud: '#ffd8c4',
    far: (g, r, h) => {
      for (let i = 0; i < 4; i++) { const x = 120 + i * 260 + r() * 50, w = 120 + r() * 40, hh = 90 + r() * 60; rep(x, w, (xx) => { g.beginPath(); g.moveTo(xx - w, h); g.lineTo(xx - w * 0.6, h - hh); g.lineTo(xx + w * 0.6, h - hh); g.lineTo(xx + w, h); g.closePath(); ink(g, '#d9764f', 3); g.fillStyle = '#c4633f'; g.fillRect(xx + w * 0.2, h - hh + 2, w * 0.4, hh - 2); g.fillStyle = '#e8916a'; g.fillRect(xx - w * 0.6 + 2, h - hh + 2, w * 1.2 - 4, 8); }); }
    },
    mid: (g, r, h) => {
      ridge(g, r, { base: h - 30, amps: [12, 8], h, color: '#e9a56b', shade: '#d58f55' });
      const x = 380;
      rep(x, 200, (xx) => {
        for (let s = 0; s < 6; s++) { const w = 320 - s * 46, y = h - 10 - s * 30; rrect(g, xx - w / 2, y - 30, w, 30, 2); ink(g, s % 2 ? '#c9b48a' : '#bba57a', 3); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(xx + w * 0.2, y - 28, w * 0.28, 27); }
        rrect(g, xx - 16, h - 190, 32, 160, 2); ink(g, '#a8916a', 3); // escadaria
        g.strokeStyle = 'rgba(29,24,56,0.5)'; g.lineWidth = 2; for (let y = h - 186; y < h - 30; y += 8) { g.beginPath(); g.moveTo(xx - 15, y); g.lineTo(xx + 15, y); g.stroke(); }
        rrect(g, xx - 40, h - 230, 80, 42, 3); ink(g, '#bba57a', 3);
        rrect(g, xx - 12, h - 220, 24, 32, 2); ink(g, '#3b2a1a', 2.5);
      });
      for (let i = 0; i < 4; i++) { const xx = 700 + i * 70 + r() * 30; rep(xx, 30, (q) => { g.beginPath(); for (let k = -3; k <= 3; k++) { g.moveTo(q, h); g.lineTo(q + k * 9, h - 28 - Math.abs(3 - Math.abs(k)) * 6); } g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#6fae7a'; g.stroke(); }); }
    },
    near: (g, r, h) => { for (let i = 0; i < 6; i++) cactus(g, 60 + i * 175 + r() * 50, h, 90 + r() * 50); },
    ground: (g, r, h) => { groundBase(g, h, '#e8b06a', '#f5c584', '#d79d58'); },
  },
  { // EUA / MIAMI: pôr do sol, prédios art déco pastel, palmeiras, praia
    sky: ['#ff5fa8', '#ffd3a1'], sun: ['#ffe066', 700, 170, 80], cloud: '#ffd1ec', stripes: true,
    far: (g, r, h) => {
      for (let i = 0; i < 18; i++) { const x = i * 58 + r() * 20, w = 40 + r() * 30, hh = 80 + r() * 150; building(g, x, h, w, hh, '#c77dc9', '#a35fae', { windows: false, round: 2 }); }
      g.fillStyle = 'rgba(255,190,220,0.35)'; g.fillRect(0, 0, TW, h);
    },
    mid: (g, r, h) => {
      const cols = ['#ff9ec7', '#7fe7e0', '#ffe28a', '#b9a6ff', '#ffffff'];
      for (let i = 0; i < 7; i++) {
        const x = 70 + i * 146 + r() * 20, w = 100 + r() * 30, hh = 100 + r() * 80;
        building(g, x, h, w, hh, cols[i % 5], cols[(i + 2) % 5], { deco: true, win: '#5ec8ff' });
        rep(x, w, (xx) => { g.strokeStyle = cols[(i + 1) % 5]; g.lineWidth = 3; g.beginPath(); g.moveTo(xx - w / 2 + 6, h - 30); g.lineTo(xx + w / 2 - 6, h - 30); g.stroke(); });
      }
    },
    near: (g, r, h) => { for (let i = 0; i < 7; i++) palm(g, 40 + i * 150 + r() * 40, h, 130 + r() * 60, 0.12 + r() * 0.2, '#b07a40', '#26b36a'); },
    ground: (g, r, h) => {
      groundBase(g, h, '#f3d39a', '#fbe3b4', null);
      g.fillStyle = '#3fc7d9'; g.fillRect(0, h - 16, TW, 16);
      g.fillStyle = '#fff'; for (let x = 0; x < TW; x += 40) { g.beginPath(); g.arc(x + 20, h - 16, 10, Math.PI, 0); g.fill(); }
      for (let i = 0; i < 4; i++) { const x = 120 + i * 260; g.fillStyle = ['#ff5e7e', '#4ad7ff', '#ffd23f', '#7bff7a'][i]; g.beginPath(); g.moveTo(x, 34); g.arc(x, 34, 22, Math.PI, 0); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.moveTo(x, 34); g.lineTo(x, 50); g.stroke(); }
    },
  },
];

// ---------- Fundo ----------
export class Background {
  constructor() {
    this.cache = new Map(); // idx -> { layers, skyGrad }
    this.idx = 0; this.prev = -1; this.fade = 1;
    this.scroll = 0;
    this.scale = 0;
  }

  invalidate() { this.cache.clear(); }

  build(i) {
    if (this.scale !== RS.scale) { this.cache.clear(); this.scale = RS.scale; }
    let c = this.cache.get(i);
    if (c) return c;
    const art = ART[i];
    const layers = LAYERS.map((L) => {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(TW * RS.scale);
      cv.height = Math.ceil(L.h * RS.scale);
      const g = cv.getContext('2d');
      g.scale(RS.scale, RS.scale);
      const rng = makeRng(1000 * (i + 1) + L.h);
      if (L.key === 'clouds') {
        for (let k = 0; k < 5; k++) cloud(g, k * 205 + rng() * 60, 40 + rng() * 120, 0.8 + rng() * 0.7, art.cloud, 0.9);
      } else {
        art[L.key](g, rng, L.h);
      }
      return { cv, ...L };
    });
    c = { layers };
    this.cache.set(i, c);
    // mantém só o país atual, o anterior e o próximo em memória
    for (const k of this.cache.keys()) if (k !== i && k !== this.idx && k !== this.prev && k !== (this.idx + 1) % 8) this.cache.delete(k);
    return c;
  }

  setCountry(i, instant) {
    if (i === this.idx && !instant) return;
    this.prev = instant ? -1 : this.idx;
    this.idx = i;
    this.fade = instant ? 1 : 0;
    this.build(i);
    // pré-desenha o próximo país sem travar a fronteira
    const next = (i + 1) % 8;
    setTimeout(() => this.build(next), 400);
  }

  update(dt) {
    if (this.fade < 1) { this.fade = Math.min(1, this.fade + dt / 1.4); if (this.fade >= 1) this.prev = -1; }
  }

  drawSky(ctx, i, alpha = 1, t = 0) {
    const art = ART[i];
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, art.sky[0]); g.addColorStop(1, art.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const [col, sx, sy, sr] = art.sun;
    ctx.fillStyle = col; ctx.globalAlpha = alpha * 0.3; circle(ctx, sx, sy, sr * 1.35 + Math.sin(t * 2) * 3); ctx.fill();
    ctx.globalAlpha = alpha; circle(ctx, sx, sy, sr); ctx.fill();
    if (art.stripes) { ctx.fillStyle = art.sky[1]; for (let k = 0; k < 5; k++) ctx.fillRect(sx - sr, sy + 10 + k * 13, sr * 2, 3 + k); }
    ctx.globalAlpha = 1;
  }

  drawLayers(ctx, i, wx, alpha = 1) {
    const c = this.build(i);
    ctx.globalAlpha = alpha;
    for (const L of c.layers) {
      const off = ((wx * L.f) % TW + TW) % TW;
      for (let x = -off; x < W; x += TW) ctx.drawImage(L.cv, x, L.top, TW, L.h);
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx, wx, t) {
    if (this.prev >= 0 && this.fade < 1) {
      this.drawSky(ctx, this.prev, 1, t);
      this.drawLayers(ctx, this.prev, wx, 1);
      const a = this.fade * this.fade * (3 - 2 * this.fade);
      this.drawSky(ctx, this.idx, a, t);
      this.drawLayers(ctx, this.idx, wx, a);
    } else {
      this.drawSky(ctx, this.idx, 1, t);
      this.drawLayers(ctx, this.idx, wx, 1);
    }
  }

  // Miniatura do país para o cartão-postal.
  drawThumb(ctx, i, x, y, w, h) {
    const art = ART[i];
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, art.sky[0]); g.addColorStop(1, art.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const k = h / 330, top = GY + 58 - 330; // mostra a faixa inferior da cena
    const srcW = w / k;
    const c = this.build(i);
    ctx.fillStyle = art.sun[0]; circle(ctx, x + w * 0.75, y + h * 0.22, 14); ctx.fill();
    for (const L of c.layers) {
      if (L.key === 'clouds') continue;
      ctx.drawImage(L.cv, 0, 0, srcW * (L.cv.width / TW), L.cv.height, x, y + (L.top - top) * k, w, L.h * k);
    }
  }

  // Pista de pouso (tela inicial e Miami).
  drawRunway(ctx, wx) {
    ctx.fillStyle = '#5a5f72'; ctx.fillRect(0, GY, W, H - GY);
    ctx.fillStyle = INK; ctx.fillRect(0, GY, W, 3.5);
    ctx.fillStyle = '#ffffff';
    const off = ((wx % 90) + 90) % 90;
    for (let x = -off; x < W; x += 90) ctx.fillRect(x, GY + 26, 50, 7);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, GY + 6, W, 3);
  }

  // Viatura cartunesca "EXTRADIÇÃO EXPRESS" (virada para a esquerda).
  drawVan(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, 0, 0, 90, 7); ctx.fill();
    // corpo
    ctx.beginPath(); ctx.moveTo(-86, -20); ctx.lineTo(-80, -50); ctx.quadraticCurveTo(-74, -62, -58, -62); ctx.lineTo(-40, -62); ctx.lineTo(-30, -86); ctx.lineTo(80, -86); ctx.quadraticCurveTo(88, -86, 88, -76); ctx.lineTo(88, -18); ctx.lineTo(-86, -18); ctx.closePath();
    ink(ctx, '#ffffff', 4);
    ctx.fillStyle = '#2f5fd0'; ctx.fillRect(-84, -40, 170, 14);
    ctx.fillStyle = INK; ctx.font = '11px "Bungee", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('EXTRADIÇÃO', 30, -66); ctx.fillStyle = '#fff'; ctx.fillText('EXPRESS', 22, -33);
    // janela + motorista
    ctx.beginPath(); ctx.moveTo(-72, -46); ctx.lineTo(-62, -58); ctx.lineTo(-44, -58); ctx.lineTo(-44, -46); ctx.closePath(); ink(ctx, '#8fe1ff', 2.5);
    circle(ctx, -54, -50, 6); ctx.fillStyle = INK; ctx.fill();
    // sirene
    const on = Math.sin(t * 14) > 0;
    rrect(ctx, -10, -98, 40, 12, 4); ink(ctx, '#ddd', 2.5);
    ctx.fillStyle = on ? '#ff2b2b' : '#7a1010'; ctx.fillRect(-7, -96, 15, 8);
    ctx.fillStyle = on ? '#1c3fa8' : '#3b8bff'; ctx.fillRect(12, -96, 15, 8);
    ctx.globalAlpha = 0.35; ctx.fillStyle = on ? '#ff2b2b' : '#3b8bff'; circle(ctx, on ? 0 : 20, -92, 26); ctx.fill(); ctx.globalAlpha = 1;
    // rodas
    for (const wx of [-52, 56]) { circle(ctx, wx, -16, 15); ink(ctx, '#2a2733', 3.5); circle(ctx, wx, -16, 6); ctx.fillStyle = '#bbb'; ctx.fill(); }
    ctx.restore();
  }
}
