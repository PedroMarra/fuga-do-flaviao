// Jatinho "Master Air" + Flavião: física com inércia, squash & stretch, hitbox e desenho.
import { PLAYER, WORLD } from './config.js';
import { clamp, lerp, ink, circle, ellipse, rrect, sprite, INK, TAU } from './util.js';

const SKIN = '#ffcfa6', SKIN_SH = '#f0a77c', HAIR = '#16131f', SUIT = '#1f2e63', SUIT_SH = '#16214a', GOLD = '#ffc928', GOLD_SH = '#d99a00';

// ======================= Jato (sprite em cache) =======================
const JET_W = 170, JET_H = 110;

function drawJetBody(g) {
  // Estabilizador horizontal (atrás)
  g.beginPath(); g.moveTo(-52, 2); g.lineTo(-78, -4); g.lineTo(-84, 2); g.lineTo(-60, 10); g.closePath(); ink(g, '#e7e9f2');
  // Deriva (cauda) com o logo "B$"
  g.beginPath(); g.moveTo(-36, -10); g.lineTo(-62, -48); g.quadraticCurveTo(-66, -52, -60, -52); g.lineTo(-46, -52); g.quadraticCurveTo(-40, -50, -36, -44); g.lineTo(-14, -12); g.closePath();
  ink(g, '#ffffff');
  g.save(); g.clip();
  g.fillStyle = GOLD; g.fillRect(-70, -54, 40, 7);
  g.fillStyle = '#e3e6f0'; g.beginPath(); g.moveTo(-36, -10); g.lineTo(-14, -12); g.lineTo(-30, -36); g.closePath(); g.fill();
  g.restore();
  g.beginPath(); g.moveTo(-36, -10); g.lineTo(-62, -48); g.quadraticCurveTo(-66, -52, -60, -52); g.lineTo(-46, -52); g.quadraticCurveTo(-40, -50, -36, -44); g.lineTo(-14, -12); g.closePath(); ink(g, null);
  g.save(); g.translate(-44, -30); g.rotate(-0.1);
  g.font = '15px "Bungee", "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText('B$', 0, 0);
  g.fillStyle = '#1846c9'; g.fillText('B$', 0, 0);
  g.restore();

  // Motor traseiro
  rrect(g, -60, -14, 34, 14, 7); ink(g, '#cfd3e0');
  rrect(g, -64, -12, 8, 10, 3); ink(g, '#585e78', 2.5);

  // Fuselagem
  const body = () => {
    g.beginPath();
    g.moveTo(-56, -9);
    g.lineTo(28, -15);
    g.quadraticCurveTo(70, -14, 76, 3);
    g.quadraticCurveTo(70, 16, 28, 16);
    g.lineTo(-54, 12);
    g.quadraticCurveTo(-66, 2, -56, -9);
    g.closePath();
  };
  body(); ink(g, '#ffffff', 0);
  g.save(); body(); g.clip();
  // sombra cel-shading na barriga
  g.fillStyle = '#dfe3ee'; g.beginPath(); g.moveTo(-70, 7); g.quadraticCurveTo(10, 12, 80, 5); g.lineTo(80, 30); g.lineTo(-70, 30); g.fill();
  // faixa dourada
  g.fillStyle = GOLD; g.beginPath(); g.moveTo(-70, 1); g.quadraticCurveTo(10, 5, 80, -1); g.lineTo(80, 5); g.quadraticCurveTo(10, 11, -70, 6); g.fill();
  g.fillStyle = GOLD_SH; g.beginPath(); g.moveTo(-70, 5); g.quadraticCurveTo(10, 10, 80, 4); g.lineTo(80, 5.5); g.quadraticCurveTo(10, 11.5, -70, 6.5); g.fill();
  // brilho no topo
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(10, -11, 40, 2.4, -0.02, 0, TAU); g.fill();
  // bico dourado
  g.fillStyle = GOLD; g.beginPath(); g.moveTo(62, -12); g.quadraticCurveTo(80, 0, 64, 16); g.lineTo(90, 16); g.lineTo(90, -16); g.fill();
  g.restore();
  body(); ink(g, null);
  // janelinhas
  for (let i = 0; i < 4; i++) { circle(g, -38 + i * 13, -3, 3.4); ink(g, '#2b4fb8', 2); }
  // nome na fuselagem
  g.font = '7.5px "Bungee", "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1f2e63'; g.fillText('MASTER AIR', -30, 10.5);

  // Asa (na frente)
  g.beginPath(); g.moveTo(-2, 6); g.lineTo(-30, 32); g.lineTo(-14, 33); g.lineTo(26, 9); g.closePath(); ink(g, '#ffffff');
  g.beginPath(); g.moveTo(-30, 32); g.lineTo(-14, 33); g.lineTo(-10, 30); g.lineTo(-25, 28); g.closePath(); ink(g, GOLD, 2);
}

function drawCockpitFront(g) {
  // Para-brisa (vidro) na frente do Flavião
  g.beginPath(); g.moveTo(44, -15); g.quadraticCurveTo(52, -30, 58, -30); g.lineTo(62, -12); g.closePath();
  g.fillStyle = 'rgba(160,220,255,0.55)'; g.fill();
  g.lineWidth = 3; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
  g.beginPath(); g.moveTo(51, -18); g.lineTo(55, -26); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; g.stroke();
}

export function jetSprite() { return sprite('jet', JET_W, JET_H, drawJetBody); }
export function cockpitSprite() { return sprite('cockpit', JET_W, JET_H, drawCockpitFront); }

// ======================= Flavião =======================
// face: 'normal' | 'scared' | 'happy' | 'turbo' | 'dazed'
// s = tamanho da cabeça; t = tempo (para animações).
export function drawHead(g, s, face, t, opts = {}) {
  const mess = opts.mess ?? (face === 'dazed' ? 1 : face === 'scared' ? 0.6 : 0);
  const look = opts.look ?? 0; // -1..1 olhar para os lados
  const wob = face === 'turbo' ? Math.sin(t * 55) * s * 0.05 : 0;

  // orelhas
  ellipse(g, -s * 0.86, s * 0.08, s * 0.16, s * 0.22); ink(g, SKIN);
  ellipse(g, s * 0.86, s * 0.08, s * 0.16, s * 0.22); ink(g, SKIN);

  // rosto com queixo quadrado
  const facePath = () => {
    g.beginPath();
    g.moveTo(-s * 0.82, -s * 0.2);
    g.quadraticCurveTo(-s * 0.86, -s * 1.0, 0, -s * 1.0);
    g.quadraticCurveTo(s * 0.86, -s * 1.0, s * 0.82, -s * 0.2);
    g.lineTo(s * 0.8 + wob, s * 0.5);
    g.quadraticCurveTo(s * 0.8 + wob, s * 0.98, s * 0.36, s * 1.0);
    g.lineTo(-s * 0.36, s * 1.0);
    g.quadraticCurveTo(-s * 0.8 - wob, s * 0.98, -s * 0.8 - wob, s * 0.5);
    g.closePath();
  };
  facePath(); g.fillStyle = SKIN; g.fill();
  g.save(); facePath(); g.clip();
  g.fillStyle = SKIN_SH; // sombra cel
  g.beginPath(); g.moveTo(s * 0.45, -s); g.quadraticCurveTo(s * 0.62, s * 0.2, s * 0.25, s * 1.1); g.lineTo(s, s * 1.1); g.lineTo(s, -s); g.fill();
  // furinho do queixo
  g.strokeStyle = SKIN_SH; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(0, s * 0.82); g.lineTo(0, s * 0.95); g.stroke();
  g.restore();
  facePath(); ink(g, null, Math.max(2.5, s * 0.14));

  // bochechas (tremendo no turbo)
  if (face === 'turbo' || face === 'happy') {
    g.fillStyle = 'rgba(255,110,110,0.45)';
    ellipse(g, -s * 0.5 - wob, s * 0.38, s * 0.17, s * 0.1); g.fill();
    ellipse(g, s * 0.5 + wob, s * 0.38, s * 0.17, s * 0.1); g.fill();
  }

  // olhos
  const eyeY = -s * 0.12, ex = s * 0.34;
  const lw = Math.max(2, s * 0.1);
  if (face === 'dazed') {
    // olhos em espiral
    for (const sx of [-1, 1]) {
      g.beginPath();
      for (let a = 0; a < TAU * 2.2; a += 0.3) {
        const r = s * 0.02 + a * s * 0.022;
        g.lineTo(sx * ex + Math.cos(a + t * 8 * sx) * r, eyeY + Math.sin(a + t * 8 * sx) * r);
      }
      g.lineWidth = lw * 0.8; g.strokeStyle = INK; g.stroke();
    }
  } else {
    const wide = face === 'scared' ? 1.45 : face === 'turbo' ? 1.15 : 1;
    for (const sx of [-1, 1]) {
      if (face === 'happy' && sx === 1) { // piscadela
        g.beginPath(); g.moveTo(sx * ex - s * 0.15, eyeY + s * 0.02); g.quadraticCurveTo(sx * ex, eyeY - s * 0.14, sx * ex + s * 0.15, eyeY + s * 0.02);
        g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
        continue;
      }
      ellipse(g, sx * ex, eyeY, s * 0.15 * wide, s * 0.19 * wide); ink(g, '#fff', lw * 0.8);
      const pr = face === 'scared' ? s * 0.055 : s * 0.085;
      const px = sx * ex + look * s * 0.07 + (face === 'normal' ? s * 0.03 : 0);
      circle(g, px, eyeY + s * 0.02, pr); g.fillStyle = INK; g.fill();
      circle(g, px + pr * 0.35, eyeY - pr * 0.3, pr * 0.35); g.fillStyle = '#fff'; g.fill();
    }
  }

  // sobrancelhas grossas e expressivas
  const browY = -s * 0.42;
  const browRaise = face === 'scared' ? -s * 0.16 : face === 'happy' ? -s * 0.06 : 0;
  for (const sx of [-1, 1]) {
    let ang = 0;
    if (face === 'normal') ang = sx === 1 ? -0.18 : 0.05;         // uma levantada, ar de malandro
    if (face === 'scared') ang = sx * 0.25;
    if (face === 'turbo') ang = sx * -0.35;                          // concentrado
    if (face === 'happy') ang = sx === 1 ? 0.2 : -0.25;
    if (face === 'dazed') ang = sx * 0.35 + Math.sin(t * 6) * 0.2;
    g.save(); g.translate(sx * ex, browY + browRaise + (face === 'happy' && sx === -1 ? -s * 0.08 : 0)); g.rotate(ang);
    rrect(g, -s * 0.22, -s * 0.07, s * 0.44, s * 0.14, s * 0.07); g.fillStyle = HAIR; g.fill();
    g.restore();
  }

  // boca
  const my = s * 0.55;
  g.lineWidth = lw; g.strokeStyle = INK; g.lineCap = 'round';
  if (face === 'normal') {
    g.beginPath(); g.moveTo(-s * 0.28, my - s * 0.02); g.quadraticCurveTo(s * 0.05, my + s * 0.14, s * 0.32, my - s * 0.12); g.stroke();
  } else if (face === 'happy') {
    g.beginPath(); g.moveTo(-s * 0.38, my - s * 0.08); g.quadraticCurveTo(0, my + s * 0.42, s * 0.38, my - s * 0.08); g.closePath(); ink(g, '#7a1630', lw * 0.8);
    g.save(); g.clip(); g.fillStyle = '#fff'; g.fillRect(-s * 0.4, my - s * 0.12, s * 0.8, s * 0.12); g.restore();
  } else if (face === 'scared') {
    ellipse(g, 0, my + s * 0.04, s * 0.13, s * 0.17); ink(g, '#7a1630', lw * 0.8);
  } else if (face === 'turbo') {
    rrect(g, -s * 0.32, my - s * 0.1, s * 0.64, s * 0.22, s * 0.06); ink(g, '#fff', lw * 0.8);
    g.beginPath(); g.moveTo(-s * 0.32, my + s * 0.01); g.lineTo(s * 0.32, my + s * 0.01);
    for (let i = -2; i <= 2; i++) { g.moveTo(i * s * 0.11, my - s * 0.1); g.lineTo(i * s * 0.11, my + s * 0.12); }
    g.lineWidth = lw * 0.5; g.stroke();
  } else if (face === 'dazed') {
    g.beginPath(); g.moveTo(-s * 0.3, my);
    for (let i = 1; i <= 6; i++) g.lineTo(-s * 0.3 + i * s * 0.1, my + (i % 2 ? -1 : 1) * s * 0.06);
    g.stroke();
  }

  // cabelo preto com gel (topete penteado para trás)
  const hairPath = () => {
    g.beginPath();
    g.moveTo(-s * 0.86, -s * 0.12);
    g.quadraticCurveTo(-s * 1.0, -s * 1.05, -s * 0.2, -s * 1.22);
    g.quadraticCurveTo(s * 0.55, -s * 1.38, s * 0.88, -s * 0.85);
    g.quadraticCurveTo(s * 0.98, -s * 0.5, s * 0.84, -s * 0.18);
    g.quadraticCurveTo(s * 0.74, -s * 0.62, s * 0.3, -s * 0.66);
    g.quadraticCurveTo(-s * 0.3, -s * 0.72, -s * 0.66, -s * 0.5);
    g.quadraticCurveTo(-s * 0.76, -s * 0.36, -s * 0.86, -s * 0.12);
    g.closePath();
  };
  hairPath(); ink(g, HAIR, Math.max(2, s * 0.1));
  // brilho exagerado do gel (reflete o sol, varre o cabelo)
  g.save(); hairPath(); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = s * 0.12;
  g.beginPath(); g.moveTo(-s * 0.55, -s * 0.72); g.quadraticCurveTo(0, -s * 1.12, s * 0.6, -s * 0.9); g.stroke();
  if (!opts.noShine) {
    const sweep = ((t * 0.55) % 1.6) - 0.3;
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.ellipse(lerp(-s, s, sweep), -s * 0.9, s * 0.1, s * 0.6, 0.5, 0, TAU); g.fill();
  }
  g.restore();
  // estrelinha de brilho
  if (!opts.noShine && mess < 0.5) {
    const tw = (Math.sin(t * 4) + 1) / 2;
    g.save(); g.translate(s * 0.45, -s * 1.05); g.rotate(t); g.scale(0.4 + tw * 0.6, 0.4 + tw * 0.6);
    g.fillStyle = '#fff';
    g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.05 : s * 0.22, a = (i / 8) * TAU; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    g.restore();
  }
  // fios desarrumados
  if (mess > 0) {
    g.strokeStyle = HAIR; g.lineWidth = Math.max(2, s * 0.09); g.lineCap = 'round';
    const n = Math.round(3 + mess * 6);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.95 + (i / (n - 1)) * Math.PI * 0.9;
      const bx = Math.cos(a) * s * 0.85, by = Math.sin(a) * s * 1.05 - s * 0.2;
      const len = s * (0.25 + mess * 0.35) * (0.7 + ((i * 37) % 10) / 20);
      const wig = Math.sin(t * 20 + i) * s * 0.05 * mess;
      g.beginPath(); g.moveTo(bx, by);
      g.quadraticCurveTo(bx + Math.cos(a) * len * 0.6 + wig, by + Math.sin(a) * len * 0.6, bx + Math.cos(a + 0.4) * len + wig, by + Math.sin(a + 0.4) * len);
      g.stroke();
    }
  }

  // game over: gravata enrolada na cara
  if (face === 'dazed' && opts.tieOnFace !== false) {
    g.save();
    g.rotate(-0.35);
    rrect(g, -s * 1.05, -s * 0.12, s * 2.1, s * 0.3, s * 0.1); ink(g, GOLD, Math.max(2, s * 0.08));
    g.fillStyle = GOLD_SH; g.fillRect(-s * 1.0, s * 0.08, s * 2.0, s * 0.06);
    g.beginPath(); g.moveTo(s * 0.95, 0); g.lineTo(s * 1.45, s * 0.2 + Math.sin(t * 14) * s * 0.15); g.lineTo(s * 1.25, s * 0.45 + Math.sin(t * 14) * s * 0.15); g.lineTo(s * 0.85, s * 0.18); g.closePath(); ink(g, GOLD, Math.max(2, s * 0.08));
    g.restore();
  }
}

// Ombros, camisa e gravata dourada que voa com o vento (para a esquerda).
export function drawTorso(g, s, t, windy = true, face = 'normal') {
  const y0 = s * 0.95;
  // gravata voando (desenhada atrás do terno)
  if (face !== 'dazed') {
    g.beginPath();
    g.moveTo(-s * 0.06, y0 + s * 0.15);
    const segs = 5;
    const pts = [];
    for (let i = 1; i <= segs; i++) {
      const u = i / segs;
      const x = windy ? -s * 0.3 - u * s * 1.7 : -s * 0.05 + Math.sin(t * 3) * s * 0.03;
      const y = windy ? y0 + s * 0.1 - u * s * 0.75 + Math.sin(t * 22 - i * 1.2) * s * 0.2 * u : y0 + s * 0.2 + u * s * 0.9;
      pts.push([x, y]);
    }
    for (const [x, y] of pts) g.lineTo(x, y - s * 0.09);
    for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] - (i === pts.length - 1 ? s * 0.12 : 0), pts[i][1] + s * 0.09);
    g.lineTo(s * 0.06, y0 + s * 0.3);
    g.closePath(); ink(g, GOLD, Math.max(2, s * 0.1));
  }
  // terno azul-marinho
  g.beginPath();
  g.moveTo(-s * 0.95, y0 + s * 0.8);
  g.quadraticCurveTo(-s * 0.95, y0 + s * 0.05, -s * 0.3, y0);
  g.lineTo(s * 0.3, y0);
  g.quadraticCurveTo(s * 0.95, y0 + s * 0.05, s * 0.95, y0 + s * 0.8);
  g.closePath(); ink(g, SUIT, Math.max(2, s * 0.12));
  g.fillStyle = SUIT_SH; g.beginPath(); g.moveTo(s * 0.5, y0 + s * 0.05); g.quadraticCurveTo(s * 0.95, y0 + s * 0.1, s * 0.92, y0 + s * 0.78); g.lineTo(s * 0.55, y0 + s * 0.78); g.fill();
  // camisa branca (V)
  g.beginPath(); g.moveTo(-s * 0.3, y0); g.lineTo(0, y0 + s * 0.55); g.lineTo(s * 0.3, y0); g.closePath(); ink(g, '#fff', Math.max(1.5, s * 0.08));
  // nó da gravata
  g.beginPath(); g.moveTo(-s * 0.1, y0 + s * 0.06); g.lineTo(s * 0.1, y0 + s * 0.06); g.lineTo(s * 0.06, y0 + s * 0.24); g.lineTo(-s * 0.06, y0 + s * 0.24); g.closePath(); ink(g, GOLD, Math.max(1.5, s * 0.07));
  if (!windy && face !== 'dazed') {
    g.beginPath(); g.moveTo(-s * 0.06, y0 + s * 0.24); g.lineTo(s * 0.06, y0 + s * 0.24); g.lineTo(s * 0.1, y0 + s * 0.6); g.lineTo(0, y0 + s * 0.72); g.lineTo(-s * 0.1, y0 + s * 0.6); g.closePath(); ink(g, GOLD, Math.max(1.5, s * 0.07));
  }
}

// Flavião de corpo inteiro (tela inicial e cutscene). Pés em (0,0).
// pose: { comb: 0..1 (braço do pente), look: -1..1, bag: true, face, jump }
export function drawFlaviaoStanding(g, t, pose = {}) {
  const s = 30; // cabeça grande, corpo pequeno
  const face = pose.face || 'normal';
  const bodyTop = -86;
  g.save();
  g.translate(0, -(pose.jump || 0));
  // sombra no chão
  g.save(); g.translate(0, pose.jump || 0); g.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(g, 0, 2, 30 - (pose.jump || 0) * 0.2, 6); g.fill(); g.restore();
  // pernas
  g.lineCap = 'round';
  for (const sx of [-1, 1]) {
    rrect(g, sx * 10 - 6, -34, 12, 32, 4); ink(g, SUIT_SH);
    ellipse(g, sx * 11 + 3, -2, 11, 5.5); ink(g, '#2a1a12');
  }
  // corpo (terno)
  rrect(g, -24, bodyTop + 20, 48, 40, 12); ink(g, SUIT);
  g.fillStyle = SUIT_SH; g.fillRect(8, bodyTop + 24, 13, 34);
  g.beginPath(); g.moveTo(-10, bodyTop + 20); g.lineTo(0, bodyTop + 42); g.lineTo(10, bodyTop + 20); g.closePath(); ink(g, '#fff', 2);
  g.beginPath(); g.moveTo(-4, bodyTop + 22); g.lineTo(4, bodyTop + 22); g.lineTo(6, bodyTop + 46); g.lineTo(0, bodyTop + 52); g.lineTo(-6, bodyTop + 46); g.closePath(); ink(g, GOLD, 2);
  // braço esquerdo (da tela) com a mala de dinheiro
  if (pose.bag !== false) {
    g.beginPath(); g.moveTo(-22, bodyTop + 26); g.quadraticCurveTo(-34, bodyTop + 42, -32, bodyTop + 56); g.lineWidth = 11; g.strokeStyle = INK; g.stroke(); g.lineWidth = 7; g.strokeStyle = SUIT; g.stroke();
    drawMalaShape(g, -34, bodyTop + 70, 1.1, t);
    circle(g, -32, bodyTop + 57, 5.5); ink(g, SKIN, 2.5);
  }
  // braço direito com o pente (ajeitando o cabelo)
  const comb = pose.comb ?? 0;
  const hx = lerp(30, 26, comb), hy = lerp(bodyTop + 50, bodyTop - 32, comb);
  g.beginPath(); g.moveTo(22, bodyTop + 26); g.quadraticCurveTo(lerp(38, 44, comb), lerp(bodyTop + 40, bodyTop + 5, comb), hx, hy);
  g.lineWidth = 11; g.strokeStyle = INK; g.stroke(); g.lineWidth = 7; g.strokeStyle = SUIT; g.stroke();
  // cabeça
  g.save(); g.translate(0, bodyTop - 2);
  drawHead(g, s, face, t, { look: pose.look ?? 0, mess: pose.mess });
  g.restore();
  // mão + pente na frente
  g.save(); g.translate(hx, hy); g.rotate(-0.3 + comb * 0.5);
  rrect(g, -3, -16, 7, 22, 2); ink(g, '#2f2f3a', 2);
  g.strokeStyle = '#2f2f3a'; g.lineWidth = 1.5;
  for (let i = -14; i < 4; i += 3) { g.beginPath(); g.moveTo(-3, i); g.lineTo(-7, i); g.stroke(); }
  circle(g, 1, 4, 6); ink(g, SKIN, 2.5);
  g.restore();
  g.restore();
}

// Mala de dinheiro (usada também no coletável).
export function drawMalaShape(g, x, y, k = 1, t = 0) {
  g.save(); g.translate(x, y); g.scale(k, k);
  // notas saindo
  g.save(); g.rotate(-0.25); rrect(g, -9, -16, 14, 8, 1.5); ink(g, '#58c46a', 1.6); g.restore();
  g.save(); g.rotate(0.3); rrect(g, 0, -17, 14, 8, 1.5); ink(g, '#6fd67f', 1.6); g.restore();
  rrect(g, -5, -15, 10, 5, 2); ink(g, null, 2.2); // alça
  rrect(g, -15, -10, 30, 20, 4); ink(g, '#7a4a22', 2.5);
  g.fillStyle = '#5c3416'; g.fillRect(-13.5, 3, 27, 5.5);
  g.fillStyle = GOLD; g.fillRect(-2.5, -10, 5, 20);
  g.fillStyle = '#ffe680'; g.font = '13px "Bungee", "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 3; g.strokeStyle = INK; g.strokeText('$', 0, 1); g.fillText('$', 0, 1);
  g.restore();
}

// ======================= Player =======================
export class Player {
  constructor() {
    this.circles = [{ x: 0, y: 0, r: 0 }, { x: 0, y: 0, r: 0 }, { x: 0, y: 0, r: 0 }];
    this.reset();
  }

  reset() {
    this.x = PLAYER.x; this.y = PLAYER.startY; this.py = this.y; this.px = this.x;
    this.vy = -260; this.thrust = 0; this.acc = 0;
    this.tilt = 0; this.ptilt = 0;
    this.squash = 0; this.squashV = 0;
    this.face = 'normal'; this.faceT = 0;
    this.shield = false; this.invuln = 0;
    this.turbo = 0; this.magnet = 0;
    this.alive = true; this.spin = 0; this.pspin = 0;
    this.pilotVisible = true;
    this.onGround = false;
    this.auto = null; // alvo de y quando em piloto automático (cutscene)
    this.updateHitbox();
  }

  setFace(face, time = 0.8) {
    if (this.face === 'dazed') return;
    if (this.turbo > 0 && face !== 'dazed' && face !== 'happy') face = 'turbo';
    this.face = face; this.faceT = time;
  }

  press() { this.squashV -= 3.2; }

  update(dt, holding) {
    this.px = this.x; this.py = this.y; this.ptilt = this.tilt; this.pspin = this.spin;
    const prevVy = this.vy;

    if (!this.alive) {
      // queda em parafuso
      this.vy += PLAYER.gravity * 0.9 * dt;
      this.y += this.vy * dt;
      this.spin += dt * 7;
      if (this.y > WORLD.groundY - 10) { this.y = WORLD.groundY - 10; this.vy *= -0.3; this.spin *= 0.6; }
      return;
    }

    let wantUp = holding;
    if (this.auto !== null) wantUp = this.y > this.auto + 4 && this.vy > -200;

    const target = wantUp ? 1 : 0;
    const ramp = wantUp ? PLAYER.thrustRampUp : PLAYER.thrustRampDown;
    this.thrust += (target - this.thrust) * Math.min(1, ramp * dt);
    this.acc = PLAYER.gravity - (PLAYER.thrust * this.thrust);
    this.vy = clamp(this.vy + this.acc * dt, -PLAYER.maxRise, PLAYER.maxFall);
    this.y += this.vy * dt;

    const top = WORLD.ceilingY + 30, bottom = WORLD.groundY - 22;
    this.onGround = false;
    if (this.y < top) { this.y = top; if (this.vy < 0) this.vy *= -0.15; }
    if (this.y > bottom) {
      this.y = bottom;
      if (this.vy > 120) { this.squashV += this.vy * 0.004; this.vy *= -PLAYER.groundBounce; }
      else this.vy = Math.min(this.vy, 0);
      this.onGround = true;
    }

    this.tilt = clamp(this.vy * PLAYER.tiltPerVy, -PLAYER.maxTilt, PLAYER.maxTilt);

    // squash & stretch: mola amortecida + resposta à mudança de velocidade
    const dv = (this.vy - prevVy) / dt;
    this.squashV += -dv * 0.000012;
    this.squashV += (-180 * this.squash - 14 * this.squashV) * dt;
    this.squash = clamp(this.squash + this.squashV * dt, -0.22, 0.22);

    if (this.faceT > 0) { this.faceT -= dt; if (this.faceT <= 0) this.face = this.turbo > 0 ? 'turbo' : 'normal'; }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.magnet > 0) this.magnet -= dt;
    if (this.turbo > 0) {
      this.turbo -= dt;
      if (this.face === 'normal') this.face = 'turbo';
      if (this.turbo <= 0 && this.face === 'turbo') this.face = 'normal';
    }
    this.updateHitbox();
  }

  // Três círculos ~80% do desenho: frente, traseira e cabeça do Flavião.
  updateHitbox() {
    const k = PLAYER.hitboxScale;
    const c = Math.cos(this.tilt), s = Math.sin(this.tilt);
    const set = (o, lx, ly, r) => { o.x = this.x + lx * c - ly * s; o.y = this.y + lx * s + ly * c; o.r = r * k; };
    set(this.circles[0], 34, 1, 18);
    set(this.circles[1], -26, 1, 17);
    set(this.circles[2], 33, -36, 19);
  }

  get invincible() { return this.turbo > 0 || this.invuln > 0; }

  // Posição do bocal do motor (para fumaça e notas).
  exhaust() {
    const c = Math.cos(this.tilt), s = Math.sin(this.tilt);
    return { x: this.x - 66 * c + 6 * s, y: this.y - 66 * s - 6 * c + 6 };
  }

  draw(ctx, alpha, t, reduce) {
    const x = lerp(this.px, this.x, alpha), y = lerp(this.py, this.y, alpha);
    const tilt = lerp(this.ptilt, this.tilt, alpha) + lerp(this.pspin, this.spin, alpha);
    const blink = this.invuln > 0 && this.turbo <= 0 && Math.floor(this.invuln * 14) % 2 === 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    const sq = this.squash;
    ctx.scale(1 + sq, 1 - sq);
    if (blink) ctx.globalAlpha = 0.45;

    // chama do motor
    if (this.alive) {
      const fl = 0.6 + this.thrust * 0.8 + (this.turbo > 0 ? 1.2 : 0);
      const flick = 1 + Math.sin(t * 60) * 0.12;
      ctx.beginPath(); ctx.moveTo(-63, -12); ctx.quadraticCurveTo(-63 - 30 * fl * flick, -7, -63, -2); ctx.closePath();
      ctx.fillStyle = this.turbo > 0 ? '#7ef9ff' : '#ff9b2f'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-63, -10); ctx.quadraticCurveTo(-63 - 16 * fl * flick, -7, -63, -4); ctx.closePath();
      ctx.fillStyle = '#fff6b0'; ctx.fill();
    }

    const jet = jetSprite();
    ctx.drawImage(jet.c, -JET_W / 2, -JET_H / 2, JET_W, JET_H);

    // Flavião na cabine aberta
    if (this.pilotVisible) {
      ctx.save();
      ctx.translate(32, -36);
      const hs = 20;
      drawTorso(ctx, hs, t, true, this.face);
      // mãos no volante (turbo)
      if (this.face === 'turbo') {
        ctx.beginPath(); ctx.moveTo(0, hs * 1.55); ctx.lineTo(hs * 1.1, hs * 1.1); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
        circle(ctx, hs * 1.0 + Math.sin(t * 50) * 1.2, hs * 1.15, 5); ink(ctx, SKIN, 2.5);
        circle(ctx, hs * 0.55 + Math.sin(t * 50 + 1) * 1.2, hs * 1.35, 5); ink(ctx, SKIN, 2.5);
      }
      drawHead(ctx, hs, this.face, t);
      ctx.restore();
    }
    const cp = cockpitSprite();
    ctx.drawImage(cp.c, -JET_W / 2, -JET_H / 2, JET_W, JET_H);

    // bolha dourada do Habeas Corpus
    if (this.shield) {
      const pulse = 1 + Math.sin(t * 6) * 0.03;
      ctx.scale(pulse, pulse);
      ctx.globalAlpha = 0.28; ellipse(ctx, 4, -8, 96, 62); ctx.fillStyle = '#ffd94a'; ctx.fill();
      ctx.globalAlpha = 0.95; ctx.lineWidth = 4; ctx.strokeStyle = '#ffcf26'; ctx.stroke();
      ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(4, -8, 84, 50, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
    }
    ctx.restore();
  }

  drawHitbox(ctx) {
    ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2;
    for (const c of this.circles) { circle(ctx, c.x, c.y, c.r); ctx.stroke(); }
  }
}
