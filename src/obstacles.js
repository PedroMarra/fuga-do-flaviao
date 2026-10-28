// Obstáculos (todos fictícios): pool fixo, padrões de spawn por país, colisão e quase-colisão.
import { W, WORLD, OBSTACLE as O, SPAWN, PLAYER } from './config.js';
import { range, irange, chance, weighted, circleCircle, circleRect, circleTri, sprite, blit, ink, circle, ellipse, rrect, INK, TAU, clamp, outlinedText } from './util.js';
import { P } from './particles.js';

const POOL = 56;

// ======================= Sprites =======================
function pomboSprite(frame) {
  return sprite('pombo' + frame, 44, 36, (g) => {
    // cauda
    g.beginPath(); g.moveTo(8, 2); g.lineTo(20, -2); g.lineTo(20, 6); g.closePath(); ink(g, '#7e8494', 2.5);
    // corpo
    ellipse(g, 2, 3, 13, 9); ink(g, '#a9afbd', 2.8);
    // pescoço iridescente
    g.beginPath(); g.ellipse(-8, -1, 6, 6, 0, 0, TAU); g.fillStyle = '#5c9e8c'; g.fill();
    // cabeça
    circle(g, -11, -5, 6.5); ink(g, '#8c92a3', 2.8);
    g.beginPath(); g.moveTo(-17, -5); g.lineTo(-22, -3); g.lineTo(-17, -2); g.closePath(); ink(g, '#ffb03b', 1.8);
    circle(g, -12.5, -6.5, 2); g.fillStyle = '#ff7b2f'; g.fill(); circle(g, -12.5, -6.5, 0.9); g.fillStyle = INK; g.fill();
    // asa batendo
    g.beginPath();
    if (frame === 0) { g.moveTo(-2, 0); g.quadraticCurveTo(4, -22, 14, -14); g.quadraticCurveTo(10, -4, 6, 1); }
    else { g.moveTo(-2, 2); g.quadraticCurveTo(6, 18, 14, 13); g.quadraticCurveTo(10, 5, 6, 3); }
    g.closePath(); ink(g, '#c4c9d4', 2.5);
    g.strokeStyle = '#555b6a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(5, frame === 0 ? -8 : 8); g.lineTo(11, frame === 0 ? -11 : 10); g.stroke();
  });
}

function balaoSprite() {
  return sprite('balao', 56, 76, (g) => {
    const shape = () => { g.beginPath(); g.moveTo(0, -34); g.quadraticCurveTo(26, -22, 22, 2); g.quadraticCurveTo(18, 20, 8, 26); g.lineTo(-8, 26); g.quadraticCurveTo(-18, 20, -22, 2); g.quadraticCurveTo(-26, -22, 0, -34); g.closePath(); };
    shape(); g.fillStyle = '#ff4f6d'; g.fill();
    g.save(); shape(); g.clip();
    const cols = ['#ffd23f', '#4ad7ff', '#7bff7a', '#ffd23f'];
    for (let i = 0; i < 4; i++) { g.fillStyle = cols[i]; g.fillRect(-26 + i * 14, -40, 6, 70); }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-9, -14, 5, 12, 0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(8, -40, 20, 70);
    g.restore();
    shape(); ink(g, null, 3);
    rrect(g, -9, 25, 18, 5, 2); ink(g, '#8a5a2b', 2.5);
    // franjas
    g.strokeStyle = INK; g.lineWidth = 1.5;
    for (let i = -8; i <= 8; i += 4) { g.beginPath(); g.moveTo(i, 30); g.lineTo(i, 34); g.stroke(); }
  });
}

function cacaSprite() {
  return sprite('caca', 100, 50, (g) => {
    // deriva
    g.beginPath(); g.moveTo(22, -4); g.lineTo(36, -22); g.lineTo(44, -22); g.lineTo(40, -2); g.closePath(); ink(g, '#6e7fa6', 3);
    // fuselagem apontando para a esquerda
    g.beginPath(); g.moveTo(-46, 2); g.quadraticCurveTo(-30, -9, 0, -8); g.lineTo(42, -6); g.lineTo(46, 4); g.lineTo(0, 9); g.quadraticCurveTo(-30, 9, -46, 2); g.closePath();
    ink(g, '#93a4c8', 3);
    g.save(); g.clip(); g.fillStyle = '#6e7fa6'; g.fillRect(-50, 3, 100, 10); g.restore();
    g.beginPath(); g.moveTo(-46, 2); g.quadraticCurveTo(-30, -9, 0, -8); g.lineTo(42, -6); g.lineTo(46, 4); g.lineTo(0, 9); g.quadraticCurveTo(-30, 9, -46, 2); g.closePath(); ink(g, null, 3);
    // bico vermelho
    g.beginPath(); g.moveTo(-46, 2); g.quadraticCurveTo(-40, -4, -32, -5); g.lineTo(-32, 7); g.quadraticCurveTo(-40, 6, -46, 2); g.fillStyle = '#ff4f4f'; g.fill(); g.stroke();
    // cabine
    g.beginPath(); g.moveTo(-24, -6); g.quadraticCurveTo(-14, -17, -2, -8); g.closePath(); ink(g, '#7fd8ff', 2.5);
    // asa delta
    g.beginPath(); g.moveTo(-6, 3); g.lineTo(26, 20); g.lineTo(34, 20); g.lineTo(24, 2); g.closePath(); ink(g, '#7d8fb3', 3);
    // insígnia fictícia "CF"
    circle(g, 12, 0, 6.5); ink(g, '#ffd23f', 2);
    g.fillStyle = INK; g.font = '6.5px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CF', 12, 0.5);
    // olhos zangados no bico (cartoon)
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-35, -3); g.lineTo(-29, -1); g.stroke();
  });
}

function heliSprite() {
  return sprite('heli', 130, 70, (g) => {
    // cauda
    g.beginPath(); g.moveTo(14, -6); g.lineTo(58, -10); g.lineTo(58, -2); g.lineTo(14, 6); g.closePath(); ink(g, '#2f3f7a', 3);
    g.beginPath(); g.moveTo(52, -10); g.lineTo(60, -24); g.lineTo(64, -24); g.lineTo(62, -4); g.closePath(); ink(g, '#2f3f7a', 2.5);
    // esquis
    g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-30, 26); g.lineTo(26, 26); g.moveTo(-16, 18); g.lineTo(-18, 26); g.moveTo(12, 18); g.lineTo(14, 26); g.stroke();
    // cabine
    g.beginPath(); g.moveTo(-36, 4); g.quadraticCurveTo(-36, -18, -6, -18); g.lineTo(18, -16); g.quadraticCurveTo(26, 0, 18, 18); g.lineTo(-20, 18); g.quadraticCurveTo(-36, 16, -36, 4); g.closePath();
    ink(g, '#3d55a8', 3);
    g.beginPath(); g.moveTo(-34, 2); g.quadraticCurveTo(-32, -14, -12, -14); g.lineTo(-12, 4); g.closePath(); ink(g, '#8fe1ff', 2.5);
    g.fillStyle = '#fff'; g.fillRect(-10, 6, 30, 5);
    g.fillStyle = INK; g.font = '7px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CAÇA-FUJÃO', 6, 9);
    // mastro do rotor + holofote
    rrect(g, -6, -24, 8, 7, 2); ink(g, '#2f3f7a', 2.5);
    rrect(g, -28, 14, 12, 9, 3); ink(g, '#ffe680', 2.5);
  });
}

function droneSprite() {
  return sprite('drone', 84, 84, (g) => {
    // papel "MANDADO" pendurado
    g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 8); g.lineTo(0, 16); g.stroke();
    g.save(); g.translate(0, 26); g.rotate(-0.08);
    rrect(g, -17, -10, 34, 20, 2); ink(g, '#fffbe8', 2.2);
    g.fillStyle = '#d32f2f'; g.font = '6.2px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MANDADO', 0, -3);
    g.fillStyle = '#777'; g.fillRect(-11, 3, 22, 1.5); g.fillRect(-11, 6, 16, 1.5);
    g.restore();
    // braços
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(-28, -14); g.lineTo(28, -14); g.stroke();
    g.strokeStyle = '#4a4f63'; g.lineWidth = 2.5; g.stroke();
    rrect(g, -32, -20, 8, 8, 2); ink(g, '#4a4f63', 2.2);
    rrect(g, 24, -20, 8, 8, 2); ink(g, '#4a4f63', 2.2);
    // corpo
    rrect(g, -15, -16, 30, 22, 7); ink(g, '#5d6378', 3);
    circle(g, 0, -3, 6); ink(g, '#1d1838', 2); circle(g, 1.5, -4.5, 2); g.fillStyle = '#8fe1ff'; g.fill();
  });
}

function nuvemSprite(lit) {
  return sprite('nuvem' + (lit ? 1 : 0), 170, 96, (g) => {
    const blobs = [[-50, 8, 26], [-22, -12, 32], [14, -16, 34], [46, 2, 28], [0, 12, 32], [-34, 16, 22], [34, 18, 22]];
    g.beginPath(); for (const [x, y, r] of blobs) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
    g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
    g.fillStyle = lit ? '#8a87b8' : '#4e4a73'; g.fill();
    g.fillStyle = lit ? '#a8a5d6' : '#666291';
    for (const [x, y, r] of blobs) { circle(g, x - r * 0.25, y - r * 0.3, r * 0.6); g.fill(); }
    // carinha brava
    g.strokeStyle = INK; g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-26, -4); g.lineTo(-12, 2); g.moveTo(26, -4); g.lineTo(12, 2); g.stroke();
    circle(g, -16, 8, 3.5); g.fillStyle = lit ? '#ffef5a' : '#fff'; g.fill();
    circle(g, 16, 8, 3.5); g.fill();
    g.beginPath(); g.arc(0, 26, 9, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  });
}

function cargoSprite() {
  return sprite('cargo', 250, 100, (g) => {
    // cauda
    g.beginPath(); g.moveTo(70, -12); g.lineTo(100, -44); g.lineTo(114, -44); g.lineTo(110, -6); g.closePath(); ink(g, '#6d7a52', 3.5);
    // fuselagem gorda
    g.beginPath(); g.moveTo(-110, 6); g.quadraticCurveTo(-110, -24, -70, -24); g.lineTo(80, -18); g.lineTo(116, -4); g.lineTo(110, 10); g.lineTo(60, 26); g.lineTo(-80, 26); g.quadraticCurveTo(-110, 24, -110, 6); g.closePath();
    ink(g, '#8f9d6a', 3.5);
    g.save(); g.clip(); g.fillStyle = '#76844f'; g.fillRect(-120, 12, 240, 20); g.restore();
    g.beginPath(); g.moveTo(-110, 6); g.quadraticCurveTo(-110, -24, -70, -24); g.lineTo(80, -18); g.lineTo(116, -4); g.lineTo(110, 10); g.lineTo(60, 26); g.lineTo(-80, 26); g.quadraticCurveTo(-110, 24, -110, 6); g.closePath(); ink(g, null, 3.5);
    // cabine
    g.beginPath(); g.moveTo(-100, -6); g.quadraticCurveTo(-96, -20, -76, -20); g.lineTo(-74, -6); g.closePath(); ink(g, '#8fe1ff', 2.5);
    // texto fictício
    g.fillStyle = '#fffbe8'; g.font = '11px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = INK; g.strokeText('CARGAS JUDICIAIS', 4, 2); g.fillText('CARGAS JUDICIAIS', 4, 2);
    // asa + motores
    g.beginPath(); g.moveTo(-30, -14); g.lineTo(30, -40); g.lineTo(44, -40); g.lineTo(20, -12); g.closePath(); ink(g, '#7a8858', 3);
    rrect(g, -16, -32, 26, 12, 6); ink(g, '#5c6740', 2.5);
    rrect(g, 8, -42, 22, 10, 5); ink(g, '#5c6740', 2.5);
    // compartimento aberto embaixo
    rrect(g, -6, 22, 40, 8, 2); ink(g, '#2b2f20', 2.5);
  });
}

function processoSprite() {
  return sprite('processo', 40, 38, (g) => {
    for (let i = 3; i >= 0; i--) { rrect(g, -15 + i * 1.5, -12 + i * 3, 30, 22, 2); ink(g, i % 2 ? '#f5efd6' : '#fffbe8', 2.4); }
    g.fillStyle = '#d32f2f'; g.save(); g.rotate(-0.2);
    g.font = '6.5px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PROCESSO', 0, -4);
    g.strokeStyle = '#d32f2f'; g.lineWidth = 1.5; g.strokeRect(-17, -9, 34, 10); g.restore();
    g.fillStyle = '#9a9ab0'; g.fillRect(-10, 4, 18, 1.6); g.fillRect(-10, 7.5, 13, 1.6);
    rrect(g, -6, -15, 4, 8, 1.5); ink(g, '#c0c4d0', 1.6); // clipe
  });
}

function condorSprite(frame) {
  return sprite('condor' + frame, 120, 70, (g) => {
    // asa de trás
    g.beginPath(); g.moveTo(0, -2);
    if (frame === 0) { g.quadraticCurveTo(10, -36, 46, -30); g.lineTo(30, -18); g.lineTo(38, -14); g.lineTo(16, -4); }
    else { g.quadraticCurveTo(14, 18, 50, 20); g.lineTo(32, 10); g.lineTo(38, 6); g.lineTo(16, 4); }
    g.closePath(); ink(g, '#1e1a26', 3);
    // corpo
    ellipse(g, 6, 2, 26, 11, -0.05); ink(g, '#2a2433', 3);
    g.beginPath(); g.moveTo(28, 0); g.lineTo(46, -4); g.lineTo(46, 8); g.closePath(); ink(g, '#2a2433', 2.5);
    // colar branco
    ellipse(g, -16, 0, 7, 9); ink(g, '#f4f1ea', 2.5);
    // cabeça careca
    g.beginPath(); g.moveTo(-18, -4); g.quadraticCurveTo(-30, -14, -38, -6); g.lineTo(-44, -2); g.lineTo(-36, 1); g.quadraticCurveTo(-28, 4, -18, 4); g.closePath(); ink(g, '#d98a7a', 2.5);
    circle(g, -31, -6, 1.8); g.fillStyle = INK; g.fill();
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-35, -10); g.lineTo(-27, -9); g.stroke();
    // asa da frente
    g.beginPath(); g.moveTo(-6, 0);
    if (frame === 0) { g.quadraticCurveTo(4, -40, 40, -40); g.lineTo(26, -26); g.lineTo(34, -22); g.lineTo(10, -6); }
    else { g.quadraticCurveTo(6, 26, 44, 30); g.lineTo(26, 16); g.lineTo(32, 12); g.lineTo(10, 6); }
    g.closePath(); ink(g, '#3a3346', 3);
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(18, frame === 0 ? -26 : 16, 8, 3, frame === 0 ? -0.5 : 0.4, 0, TAU); g.fill();
  });
}

function papagaioSprite(frame) {
  return sprite('papagaio' + frame, 54, 40, (g) => {
    g.beginPath(); g.moveTo(8, 2); g.lineTo(26, 0); g.lineTo(24, 6); g.closePath(); ink(g, '#2e7dff', 2.5); // cauda
    ellipse(g, 0, 2, 12, 8); ink(g, '#2fcf4a', 2.8);
    circle(g, -11, -3, 7); ink(g, '#ff3b3b', 2.8);
    g.beginPath(); g.moveTo(-17, -5); g.quadraticCurveTo(-24, -3, -20, 3); g.lineTo(-16, 0); g.closePath(); ink(g, '#ffe680', 2);
    circle(g, -12, -4.5, 2.2); g.fillStyle = '#fff'; g.fill(); circle(g, -12.5, -4.5, 1.1); g.fillStyle = INK; g.fill();
    g.beginPath();
    if (frame === 0) { g.moveTo(-3, -2); g.quadraticCurveTo(2, -20, 14, -14); g.lineTo(6, 0); }
    else { g.moveTo(-3, 2); g.quadraticCurveTo(4, 18, 14, 12); g.lineTo(6, 2); }
    g.closePath(); ink(g, '#ffd23f', 2.5);
    g.fillStyle = '#2e7dff'; g.beginPath(); g.ellipse(9, frame === 0 ? -12 : 10, 4, 2.5, 0.4, 0, TAU); g.fill();
  });
}

// Desenha todos os sprites uma vez (evita engasgo no primeiro aparecimento).
export function warmObstacleSprites() {
  pomboSprite(0); pomboSprite(1); balaoSprite(); cacaSprite(); heliSprite(); droneSprite();
  nuvemSprite(false); nuvemSprite(true); cargoSprite(); processoSprite();
  condorSprite(0); condorSprite(1); papagaioSprite(0); papagaioSprite(1);
}

// Cores de destroços ao destruir com turbo/escudo.
const DEBRIS = {
  pombo: ['#a9afbd', '#c4c9d4'], balao: ['#ff4f6d', '#ffd23f', '#4ad7ff'], caca: ['#93a4c8', '#6e7fa6', '#ff4f4f'],
  heli: ['#3d55a8', '#2f3f7a', '#fff'], drone: ['#5d6378', '#fffbe8'], cargo: ['#8f9d6a', '#76844f'],
  processo: ['#fffbe8', '#f5efd6'], condor: ['#2a2433', '#f4f1ea'], papagaio: ['#2fcf4a', '#ff3b3b', '#ffd23f'],
};
const SMASHABLE = new Set(['pombo', 'balao', 'caca', 'heli', 'drone', 'processo', 'condor', 'papagaio', 'cargo']);

// ======================= Gerenciador =======================
export class Obstacles {
  constructor(game) {
    this.game = game;
    this.list = [];
    for (let i = 0; i < POOL; i++) this.list.push({ on: false });
    this.reset();
  }

  reset() {
    for (const o of this.list) o.on = false;
    this.spawnT = SPAWN.firstDelay;
    this.active = 0;
  }

  add(type, x, y) {
    const o = this.list.find((q) => !q.on);
    if (!o) return null;
    o.on = true; o.type = type; o.x = x; o.y = y; o.px = x; o.py = y; o.baseY = y;
    o.vx = 0; o.vy = 0; o.t = 0; o.phase = range(0, TAU); o.warn = 0; o.state = 0;
    o.near = false; o.nearCand = false; o.rot = 0; o.drop = 0; o.strikeX = 0; o.struck = false;
    return o;
  }

  count(type) { let n = 0; for (const o of this.list) if (o.on && o.type === type) n++; return n; }

  clearAll(poof = true) {
    for (const o of this.list) {
      if (!o.on) continue;
      if (poof && o.x > -60 && o.x < W + 60) this.game.particles.smoke(o.x, o.y, 50, 0, -30, 0.6, true);
      o.on = false;
    }
  }

  // ---------- Spawn ----------
  update(dt, speed, country, lap) {
    const g = this.game;
    if (g.spawnEnabled) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const kind = weighted(country.mix, (k) => {
          const base = k.startsWith('caca') ? null : k === 'papagaios' ? null : k;
          const cap = base && SPAWN.maxActive[base];
          return !cap || this.count(base) < cap;
        }) || 'pombos';
        this.spawnPattern(kind);
        const lapF = 1 - Math.min(0.4, SPAWN.lapFaster * (lap - 1));
        this.spawnT = country.spawn * lapF * range(1 - SPAWN.jitter, 1 + SPAWN.jitter) + (SPAWN.extraDelay[kind] || 0);
      }
    }

    const player = g.player;
    let active = 0;
    for (const o of this.list) {
      if (!o.on) continue;
      active++;
      o.px = o.x; o.py = o.y;
      o.t += dt;
      this.move(o, dt, speed, player);
      if (o.x < -260 || o.y > 640 || o.y < -200) o.on = false;
    }
    this.active = active;
  }

  spawnPattern(kind) {
    const X = W + 50;
    switch (kind) {
      case 'pombos': {
        const n = irange(3, 5), y0 = range(100, 420);
        for (let i = 0; i < n; i++) this.add('pombo', X + i * range(28, 44), clamp(y0 + range(-50, 50), 70, 450));
        break;
      }
      case 'balao': {
        const n = chance(0.4) ? 2 : 1;
        for (let i = 0; i < n; i++) { const o = this.add('balao', X + i * range(120, 200), range(400, 560)); }
        break;
      }
      case 'caca2': case 'caca3': {
        const y0 = range(120, 420), three = kind === 'caca3';
        const slots = three ? [[0, 0], [52, -48], [52, 48]] : [[0, 0], [52, chance(0.5) ? -48 : 48]];
        for (const [dx, dy] of slots) {
          const o = this.add('caca', W + 70 + dx, clamp(y0 + dy, 50, 455));
          if (o) o.warn = O.caca.warn;
        }
        break;
      }
      case 'heli': {
        const o = this.add('heli', W + 80, range(85, 130));
        if (o) { o.state = 0; o.targetX = range(470, 560); o.light = 0; }
        break;
      }
      case 'drone': this.add('drone', X, range(110, 400)); break;
      case 'tempestade': {
        const o = this.add('tempestade', W + 110, range(58, 92));
        if (o) o.phase = range(0, 0.6); // primeiro raio já com aviso visível
        break;
      }
      case 'cargo': this.add('cargo', W + 140, range(66, 84)); break;
      case 'condor': {
        const n = chance(0.35) ? 2 : 1;
        for (let i = 0; i < n; i++) this.add('condor', X + 20 + i * 150, range(140, 380));
        break;
      }
      case 'papagaios': {
        const y0 = range(120, 380), dir = chance(0.5) ? 1 : -1;
        for (let i = 0; i < 3; i++) this.add('papagaio', X + i * 48, y0 + i * 30 * dir);
        break;
      }
    }
  }

  // ---------- Movimento por tipo ----------
  move(o, dt, speed, player) {
    const g = this.game;
    switch (o.type) {
      case 'pombo':
        o.x -= (speed + O.pombo.relSpeed) * dt;
        o.y = o.baseY + Math.sin(o.t * 5 + o.phase) * 7;
        break;
      case 'balao':
        o.x -= speed * dt;
        o.y -= O.balao.rise * dt;
        o.rot = Math.sin(o.t * 1.6 + o.phase) * 0.08;
        break;
      case 'caca':
        if (o.warn > 0) { o.warn -= dt; if (o.warn <= 0) g.sfx('jet'); break; }
        o.x -= (speed + O.caca.relSpeed) * dt;
        if (Math.random() < dt * 30) g.particles.smoke(o.x + 46, o.y + 2, 16, 60, 0, 0.35);
        break;
      case 'heli': {
        const H = O.heli;
        o.phase += dt * TAU / H.sweepPeriod;
        if (o.state === 0) { // entrando
          o.x += (o.targetX - o.x) * Math.min(1, dt * 3.2);
          if (o.t > H.enter) { o.state = 1; o.t = 0; }
        } else if (o.state === 1) { // pairando e varrendo
          o.light = Math.min(1, o.t / H.warmup);
          o.y = o.baseY + Math.sin(o.t * 2) * 6;
          if (o.t > H.hover) { o.state = 2; o.t = 0; }
        } else { // indo embora
          o.light = Math.max(0, o.light - dt * 2);
          o.x -= (H.exitSpeed + o.t * 400) * dt;
        }
        break;
      }
      case 'drone':
        o.x -= speed * (1 + O.drone.relSpeed) * dt;
        o.y += clamp(player.y - o.y, -O.drone.track * dt, O.drone.track * dt);
        break;
      case 'tempestade': {
        o.x -= speed * dt;
        const T = O.tempestade;
        const c = (o.t + o.phase) % T.period;
        const was = o.state;
        o.state = c < T.warnAt ? 0 : c < T.strikeAt ? 1 : c < T.strikeEnd ? 2 : 3;
        if (o.state === 1 && was !== 1) o.strikeX = range(-26, 26);
        if (o.state === 2 && was !== 2 && o.x > 0 && o.x < W) { g.sfx('thunder'); g.shake(4); }
        if (was === 2 && o.state !== 2 && o.nearCand && !o.near) { o.near = true; g.onNearMiss(o.x + o.strikeX, player.y); }
        if (o.state !== 2) o.nearCand = false;
        break;
      }
      case 'cargo': {
        o.x -= speed * (1 + O.cargo.relSpeed) * dt;
        o.drop -= dt;
        if (o.drop <= 0 && o.x < W - 20 && o.x > 150) {
          o.drop = O.cargo.dropEvery;
          const p = this.add('processo', o.x + 14, o.y + 34);
          if (p) { p.vy = 60; p.rot = range(-0.3, 0.3); }
        }
        break;
      }
      case 'processo':
        o.x -= speed * dt;
        o.vy += O.processo.gravity * dt;
        o.y += o.vy * dt;
        o.rot += dt * 2.5;
        if (o.y > WORLD.groundY - 14) { g.particles.burst(P.PAPER, o.x, WORLD.groundY - 10, 6, 160, 0.9, false); o.on = false; }
        break;
      case 'condor':
        o.x -= (speed + O.condor.relSpeed) * dt;
        o.y = o.baseY + Math.sin(o.t * TAU / O.condor.period + o.phase) * O.condor.amp;
        break;
      case 'papagaio':
        o.x -= (speed + O.papagaio.relSpeed) * dt;
        o.y = o.baseY + Math.sin(o.t * TAU / O.papagaio.period + o.phase) * O.papagaio.amp;
        break;
    }
  }

  // ---------- Colisão ----------
  // Triângulo do holofote. k < 1 gera o cone de colisão, mais estreito que o desenhado.
  coneTri(o, k = 1, x = o.x, y = o.y) {
    const H = O.heli;
    const a = Math.PI * 0.78 + Math.sin(o.phase) * H.sweep;
    const ox = x - 22, oy = y + 20, half = H.coneHalf * k, len = H.coneLen * (k < 1 ? 0.96 : 1);
    return [ox, oy, ox + Math.cos(a - half) * len, oy + Math.sin(a - half) * len, ox + Math.cos(a + half) * len, oy + Math.sin(a + half) * len];
  }

  // Retorna se o círculo (cx,cy,r) toca o obstáculo. Formas já ~80% do desenho.
  hits(o, cx, cy, r, includeHazards = true) {
    switch (o.type) {
      case 'pombo': case 'papagaio': return circleCircle(cx, cy, r, o.x - 2, o.y + 1, O.pombo.r);
      case 'balao': return circleCircle(cx, cy, r, o.x, o.y - 6, O.balao.r);
      case 'caca': return o.warn <= 0 && (circleCircle(cx, cy, r, o.x - 18, o.y + 1, 12) || circleCircle(cx, cy, r, o.x + 12, o.y + 1, 12));
      case 'heli': {
        if (circleCircle(cx, cy, r, o.x - 6, o.y, 23)) return true;
        if (includeHazards && o.state === 1 && o.light >= 1) {
          const t = this.coneTri(o, 0.8);
          return circleTri(cx, cy, r, t[0], t[1], t[2], t[3], t[4], t[5]);
        }
        return false;
      }
      case 'drone': return circleCircle(cx, cy, r, o.x, o.y - 4, O.drone.r);
      case 'tempestade': {
        if (!includeHazards || o.state !== 2) return false;
        const bx = o.x + o.strikeX;
        return circleRect(cx, cy, r, bx - 9, o.y + 30, 18, WORLD.groundY - o.y - 30);
      }
      case 'cargo': return circleRect(cx, cy, r, o.x - 100, o.y - 18, 205, 40);
      case 'processo': return circleCircle(cx, cy, r, o.x, o.y, O.processo.r);
      case 'condor': return circleCircle(cx, cy, r, o.x + 4, o.y + 2, 17) || circleCircle(cx, cy, r, o.x - 28, o.y - 3, 9);
    }
    return false;
  }

  // Testa colisão com o jogador. onHit(o) / onNear(o).
  collide(player, onHit, onNear) {
    const m = O.nearMissMargin;
    for (const o of this.list) {
      if (!o.on) continue;
      let hit = false, near = false;
      for (const c of player.circles) {
        if (this.hits(o, c.x, c.y, c.r)) { hit = true; break; }
        if (!near && !o.near && this.hits(o, c.x, c.y, c.r + m)) near = true;
      }
      if (hit) { onHit(o); continue; }
      if (near) o.nearCand = true;
      if (o.type === 'tempestade') continue; // tratado no fim do raio
      if (o.nearCand && !o.near && o.x < player.x - 70) { o.near = true; onNear(o); }
    }
  }

  isSmashable(o) { return SMASHABLE.has(o.type); }

  // Explode o obstáculo (turbo/escudo).
  smash(o) {
    const pt = this.game.particles;
    const cols = DEBRIS[o.type] || ['#fff'];
    pt.debris(o.x, o.y, 12, cols);
    pt.ring(o.x, o.y, 60, '#fff');
    for (let i = 0; i < 6; i++) pt.smoke(o.x + range(-20, 20), o.y + range(-15, 15), range(30, 50), range(-60, 60), range(-60, 0), 0.7, true);
    if (o.type === 'pombo' || o.type === 'condor' || o.type === 'papagaio') pt.burst(P.FEATHER, o.x, o.y, 10, 220, 1.1);
    if (o.type === 'processo' || o.type === 'cargo') pt.burst(P.PAPER, o.x, o.y, 12, 260, 1.2);
    o.on = false;
  }

  // ---------- Desenho ----------
  draw(ctx, alpha, time) {
    // primeiro os efeitos de fundo (holofote), depois os corpos
    for (const o of this.list) {
      if (!o.on || o.type !== 'heli' || o.light <= 0) continue;
      const x = o.px + (o.x - o.px) * alpha, y = o.py + (o.y - o.py) * alpha;
      const t = this.coneTri(o, 1, x, y);
      const lit = o.light >= 1;
      const fl = lit ? 1 : (Math.sin(time * 40) > 0 ? 0.5 : 0.15) * o.light;
      const gr = ctx.createLinearGradient(t[0], t[1], (t[2] + t[4]) / 2, (t[3] + t[5]) / 2);
      gr.addColorStop(0, `rgba(255,248,170,${0.75 * fl})`);
      gr.addColorStop(1, `rgba(255,240,120,${0.12 * fl})`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(t[0], t[1]); ctx.lineTo(t[2], t[3]); ctx.lineTo(t[4], t[5]); ctx.closePath(); ctx.fill();
      if (lit) { ctx.strokeStyle = 'rgba(255,230,90,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]); }
    }

    for (const o of this.list) {
      if (!o.on) continue;
      const x = o.px + (o.x - o.px) * alpha, y = o.py + (o.y - o.py) * alpha;
      switch (o.type) {
        case 'pombo': blit(ctx, pomboSprite(Math.floor(time * 10 + o.phase) % 2), x, y); break;
        case 'papagaio': blit(ctx, papagaioSprite(Math.floor(time * 14 + o.phase) % 2), x, y); break;
        case 'condor': blit(ctx, condorSprite(Math.floor(time * 2.5 + o.phase) % 2), x, y); break;
        case 'balao': {
          blit(ctx, balaoSprite(), x, y, o.rot);
          const f = 1 + Math.sin(time * 25 + o.phase) * 0.25;
          ctx.fillStyle = '#ffb03b'; circle(ctx, x, y + 34, 5 * f); ctx.fill();
          ctx.fillStyle = '#fff6a8'; circle(ctx, x, y + 34, 2.5 * f); ctx.fill();
          break;
        }
        case 'caca':
          if (o.warn > 0) break;
          blit(ctx, cacaSprite(), x, y);
          ctx.fillStyle = Math.sin(time * 50) > 0 ? '#ffb03b' : '#ff7b2f';
          ctx.beginPath(); ctx.moveTo(x + 46, y - 4); ctx.lineTo(x + 62 + Math.sin(time * 60) * 4, y); ctx.lineTo(x + 46, y + 5); ctx.fill();
          break;
        case 'heli': {
          blit(ctx, heliSprite(), x, y);
          // rotor girando
          const w = Math.abs(Math.cos(time * 30)) * 62 + 8;
          ctx.fillStyle = 'rgba(30,25,55,0.85)'; rrect(ctx, x - 4 - w, y - 29, w * 2, 5, 2); ctx.fill();
          ctx.strokeStyle = 'rgba(30,25,55,0.6)'; ctx.lineWidth = 2; circle(ctx, x + 62, y - 16, 9 + Math.sin(time * 40) * 2); ctx.stroke();
          // sirene
          ctx.fillStyle = Math.sin(time * 12) > 0 ? '#ff3b3b' : '#3b8bff'; circle(ctx, x - 2, y - 22, 4); ctx.fill();
          break;
        }
        case 'drone': {
          blit(ctx, droneSprite(), x, y, Math.sin(o.t * 3) * 0.08);
          ctx.fillStyle = 'rgba(30,25,55,0.7)';
          const w = 10 + Math.abs(Math.sin(time * 35)) * 8;
          rrect(ctx, x - 28 - w, y - 22, w * 2, 3.5, 2); ctx.fill();
          rrect(ctx, x + 28 - w, y - 22, w * 2, 3.5, 2); ctx.fill();
          ctx.fillStyle = Math.sin(time * 10) > 0 ? '#ff3b3b' : '#ffd23f'; circle(ctx, x, y - 22, 3); ctx.fill();
          break;
        }
        case 'tempestade': {
          const lit = o.state === 1 ? Math.sin(time * 40) > 0 : o.state === 2;
          if (o.state === 1) { // aviso: linha tracejada mostrando onde vai cair
            ctx.strokeStyle = 'rgba(255,240,120,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
            ctx.beginPath(); ctx.moveTo(x + o.strikeX, y + 34); ctx.lineTo(x + o.strikeX, WORLD.groundY); ctx.stroke(); ctx.setLineDash([]);
          }
          if (o.state === 2) this.drawBolt(ctx, x + o.strikeX, y + 30, time);
          blit(ctx, nuvemSprite(lit), x, y);
          break;
        }
        case 'cargo': {
          blit(ctx, cargoSprite(), x, y);
          ctx.fillStyle = 'rgba(30,25,55,0.7)';
          const h = 6 + Math.abs(Math.sin(time * 30)) * 12;
          rrect(ctx, x - 19, y - 26 - h, 4, h * 2, 2); ctx.fill();
          rrect(ctx, x + 4, y - 37 - h, 4, h * 2, 2); ctx.fill();
          break;
        }
        case 'processo': blit(ctx, processoSprite(), x, y, o.rot); break;
      }
    }
  }

  drawBolt(ctx, x, y0, time) {
    const y1 = WORLD.groundY;
    const seg = 9;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    for (let i = 1; i <= seg; i++) {
      const yy = y0 + (y1 - y0) * (i / seg);
      const off = i === seg ? 0 : (((i * 7 + Math.floor(time * 20)) % 5) - 2) * 9;
      ctx.lineTo(x + off, yy);
    }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,240,120,0.35)'; ctx.lineWidth = 22; ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = '#fff36a'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
  }

  // "!" piscando na borda direita antes dos caças.
  drawWarnings(ctx, time) {
    for (const o of this.list) {
      if (!o.on || o.type !== 'caca' || o.warn <= 0) continue;
      const urgent = o.warn < 0.4;
      if (Math.floor(time * (urgent ? 16 : 8)) % 2) continue;
      const x = W - 34, y = o.y;
      const s = urgent ? 1.15 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(4, -18); ctx.lineTo(18, -18); ctx.lineTo(18, 18); ctx.lineTo(4, 18); ctx.closePath();
      ink(ctx, '#ff3b3b', 3.5);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      outlinedText(ctx, '!', 6, 1, 26, '#fff', INK, 'Bungee', 4);
      ctx.restore();
    }
  }

  drawHitboxes(ctx) {
    ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2;
    // aproximação visual: testa uma grade de pontos é caro; desenha formas principais
    for (const o of this.list) {
      if (!o.on) continue;
      ctx.beginPath();
      switch (o.type) {
        case 'pombo': case 'papagaio': ctx.arc(o.x - 2, o.y + 1, O.pombo.r, 0, TAU); break;
        case 'balao': ctx.arc(o.x, o.y - 6, O.balao.r, 0, TAU); break;
        case 'caca': ctx.arc(o.x - 18, o.y + 1, 12, 0, TAU); ctx.moveTo(o.x + 24, o.y + 1); ctx.arc(o.x + 12, o.y + 1, 12, 0, TAU); break;
        case 'heli': ctx.arc(o.x - 6, o.y, 23, 0, TAU); break;
        case 'drone': ctx.arc(o.x, o.y - 4, O.drone.r, 0, TAU); break;
        case 'cargo': ctx.rect(o.x - 100, o.y - 18, 205, 40); break;
        case 'processo': ctx.arc(o.x, o.y, O.processo.r, 0, TAU); break;
        case 'condor': ctx.arc(o.x + 4, o.y + 2, 17, 0, TAU); ctx.moveTo(o.x - 19, o.y - 3); ctx.arc(o.x - 28, o.y - 3, 9, 0, TAU); break;
        case 'tempestade': if (o.state === 2) ctx.rect(o.x + o.strikeX - 9, o.y + 30, 18, WORLD.groundY - o.y - 30); break;
      }
      ctx.stroke();
    }
  }
}
