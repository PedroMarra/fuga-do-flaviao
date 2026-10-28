// Interface: HUD no canvas (estilo Chrome Dino), carimbo de passaporte, banners,
// telas em DOM (menu, pausa, game over), mini-mapa da rota e compartilhar.
import { W, H, COUNTRIES } from './config.js';
import { outlinedText, pad, fmtPts, clamp, ease, INK, ink, rrect, circle, sprite, TAU, pick } from './util.js';
import { drawMalaShape } from './player.js';

export const SHARE_URL = 'https://pedromarra.github.io/fuga-do-flaviao/';

// Autor do jogo (links do menu e do game over ficam no index.html).
export const AUTHOR = {
  insta: '@_pedro.marra',
  github: 'github.com/PedroMarra',
  banner: 'SIGA @_PEDRO.MARRA',
};

const GAME_OVER_LINES = [
  'Pego no embarque!',
  'Cancelaram seu passaporte',
  'Fim da linha, Flavião',
  'Malas confiscadas!',
  'Ficou retido na alfândega',
  'Jatinho apreendido!',
  'Bens bloqueados, cabelo também',
];

// "até o Brasil", "até a Bolívia", "até os EUA"...
const ARTICLE = { brasil: 'o', paraguai: 'o', bolivia: 'a', peru: 'o', colombia: 'a', panama: 'o', mexico: 'o', eua: 'os' };
const NICE = { brasil: 'Brasil', paraguai: 'Paraguai', bolivia: 'Bolívia', peru: 'Peru', colombia: 'Colômbia', panama: 'Panamá', mexico: 'México', eua: 'EUA' };
export const countryPhrase = (idx, miami) => (miami ? 'Miami' : `${ARTICLE[COUNTRIES[idx].id]} ${NICE[COUNTRIES[idx].id]}`);

const MUTE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke-width="2.4" stroke-linecap="round"/></svg>';
const SOUND_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-width="2.2" stroke-linecap="round"/></svg>';

const $ = (id) => document.getElementById(id);

function malaIcon() { return sprite('mala-icon', 40, 40, (g) => drawMalaShape(g, 0, 4, 1.05)); }

export class UI {
  constructor(game) {
    this.game = game;
    this.screens = { menu: $('menu'), pause: $('pause'), gameover: $('gameover') };
    this.hudButtons = $('hud-buttons');
    this.stampAnim = null;
    this.bannerAnim = null;
    this.scorePop = 0;
    this.malaPop = 0;
    this.portrait = false;
    this.rotateDismissed = false;
    this.lastShare = null;

    $('btn-play').addEventListener('click', () => game.start());
    $('btn-retry').addEventListener('click', () => game.start());
    $('btn-resume').addEventListener('click', () => game.togglePause());
    $('btn-quit').addEventListener('click', () => game.quitToMenu());
    $('btn-pause').addEventListener('click', () => game.togglePause());
    $('btn-share').addEventListener('click', () => this.share());
    for (const id of ['btn-mute', 'btn-mute-p', 'btn-mute-hud']) $(id).addEventListener('click', () => game.toggleMute());
    for (const id of ['btn-motion', 'btn-motion-p']) $(id).addEventListener('click', () => game.toggleReduceMotion());
    $('btn-rotate-close').addEventListener('click', () => { this.rotateDismissed = true; this.setPortrait(this.portrait); });
    this.refreshToggles();
  }

  // ---------- DOM ----------
  show(name) {
    for (const k in this.screens) {
      const el = this.screens[k];
      const on = k === name;
      if (on && el.hidden) { el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
      else if (!on) el.hidden = true;
    }
    this.hudButtons.hidden = !(name === null || name === 'pause');
    const focusBtn = name === 'menu' ? $('btn-play') : name === 'pause' ? $('btn-resume') : null;
    if (focusBtn && matchMedia('(hover: hover)').matches) focusBtn.focus({ preventScroll: true });
  }

  setPortrait(p) {
    this.portrait = p;
    $('rotate-hint').hidden = !p || this.rotateDismissed;
  }

  refreshToggles() {
    const g = this.game;
    const muted = g.muted;
    for (const id of ['btn-mute', 'btn-mute-p']) {
      const b = $(id);
      b.textContent = muted ? 'Som: desligado' : 'Som: ligado';
      b.setAttribute('aria-pressed', String(muted));
    }
    const hb = $('btn-mute-hud');
    hb.innerHTML = muted ? MUTE_ICON : SOUND_ICON;
    hb.setAttribute('aria-label', muted ? 'Ligar som' : 'Desligar som');
    for (const id of ['btn-motion', 'btn-motion-p']) {
      const b = $(id);
      b.textContent = 'Reduzir movimento: ' + (g.reduce ? 'sim' : 'não');
      b.setAttribute('aria-pressed', String(g.reduce));
    }
    document.body.classList.toggle('reduce-motion', g.reduce);
  }

  refreshMenuStats(hi, malas) {
    $('menu-hi').textContent = 'HI ' + pad(hi);
    $('menu-malas').textContent = `${fmtPts(malas)} ${malas === 1 ? 'mala' : 'malas'}`;
  }

  showGameOver(d) {
    $('go-title').textContent = d.miamiWin ? 'Fim da linha, Flavião' : pick(GAME_OVER_LINES);
    $('go-record').hidden = !d.record;
    $('go-score').textContent = fmtPts(d.score);
    $('go-hi').textContent = fmtPts(d.hi);
    $('go-country').textContent = (d.lap > 1 ? `V${d.lap} · ` : '') + COUNTRIES[d.country].name;
    $('go-malas').textContent = fmtPts(d.malas);
    $('toast').textContent = '';
    this.lastShare = d;
    this.drawMinimap($('go-map'), d.progress);
    this.show('gameover');
    if (matchMedia('(hover: hover)').matches) $('btn-retry').focus({ preventScroll: true });
  }

  // Mini-mapa estilizado da rota com o pin onde o jogador caiu.
  // progress: 0..8 (países percorridos, fracionário)
  drawMinimap(cv, progress) {
    const g = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    // mar
    const sea = g.createLinearGradient(0, 0, 0, h);
    sea.addColorStop(0, '#7fd3ff'); sea.addColorStop(1, '#4fb2ef');
    g.fillStyle = sea; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(30 + i * 85, 20 + (i % 2) * 110, 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    // pontos da rota (Brasil embaixo à esquerda → Miami em cima à direita)
    const pts = [[52, 112], [104, 124], [158, 104], [206, 80], [262, 62], [314, 74], [372, 50], [436, 32]];
    // "terra" sob cada ponto
    g.fillStyle = '#7ed36b';
    for (const [x, y] of pts) { g.beginPath(); g.ellipse(x, y + 2, 34, 17, -0.2, 0, TAU); g.fill(); }
    g.lineWidth = 3; g.strokeStyle = INK;
    for (const [x, y] of pts) { g.beginPath(); g.ellipse(x, y + 2, 34, 17, -0.2, 0, TAU); g.stroke(); }
    g.fillStyle = '#7ed36b';
    for (const [x, y] of pts) { g.beginPath(); g.ellipse(x, y + 2, 32, 15, -0.2, 0, TAU); g.fill(); }
    // rota tracejada
    const pathTo = (limit) => {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        if (i > limit + 1) break;
        const f = clamp(limit - (i - 1), 0, 1);
        g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f);
      }
    };
    pathTo(7); g.setLineDash([6, 6]); g.lineWidth = 3; g.strokeStyle = 'rgba(29,24,56,0.5)'; g.stroke(); g.setLineDash([]);
    const prog = clamp(progress, 0, 7);
    pathTo(prog); g.lineWidth = 5; g.strokeStyle = '#ff3b6b'; g.stroke();
    // bolinhas + nomes
    g.font = '11px "Bungee", sans-serif'; g.textAlign = 'center';
    pts.forEach(([x, y], i) => {
      circle(g, x, y, 5.5); ink(g, i <= Math.floor(progress) ? '#ffd23f' : '#fff', 2.5);
      const name = i === 7 ? 'MIAMI' : COUNTRIES[i].name;
      g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText(name, x, y + (i % 2 ? -12 : 22));
      g.fillStyle = INK; g.fillText(name, x, y + (i % 2 ? -12 : 22));
    });
    // pin
    const i0 = Math.floor(prog), f = prog - i0;
    const a = pts[i0], b = pts[Math.min(7, i0 + 1)];
    const px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f;
    g.save(); g.translate(px, py);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-14, -18, -12, -34, 0, -34); g.bezierCurveTo(12, -34, 14, -18, 0, 0); g.closePath();
    ink(g, '#ff3b3b', 3);
    circle(g, 0, -23, 5); g.fillStyle = '#fff'; g.fill();
    g.restore();
  }

  shareText(d) {
    const where = countryPhrase(d.country, false);
    const url = (location.protocol.startsWith('http') && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname)) ? location.origin + location.pathname : SHARE_URL;
    return { text: `Fugi até ${where} com ${fmtPts(d.score)} pts na Fuga do Flavião! Duvido você passar: ${url}\nJogo do ${AUTHOR.insta} (${AUTHOR.github})`, url };
  }

  async share() {
    const d = this.lastShare;
    if (!d) return;
    const { text } = this.shareText(d);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Fuga do Flavião', text });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return; // usuário cancelou
    }
    try {
      await navigator.clipboard.writeText(text);
      this.toast('Copiado! Cole onde quiser 😉');
    } catch {
      // último recurso: seleciona o texto para copiar manualmente
      window.prompt('Copie o texto abaixo:', text);
    }
  }

  toast(msg) { $('toast').textContent = msg; }

  // ---------- Animações no canvas ----------
  stamp(idx, lap) {
    this.stampAnim = { t: 0, idx, lap, name: COUNTRIES[idx].name, slammed: false };
  }
  banner(title, sub, dur = 2.2, color = '#ffd23f') {
    this.bannerAnim = { t: 0, title, sub, dur, color };
  }

  update(dt) {
    if (this.stampAnim) {
      const s = this.stampAnim;
      s.t += dt;
      if (!s.slammed && s.t > 0.45) { s.slammed = true; this.game.onStampSlam(); }
      if (s.t > 2.6) this.stampAnim = null;
    }
    if (this.bannerAnim) { this.bannerAnim.t += dt; if (this.bannerAnim.t > this.bannerAnim.dur) this.bannerAnim = null; }
    this.scorePop = Math.max(0, this.scorePop - dt * 4);
    this.malaPop = Math.max(0, this.malaPop - dt * 4);
  }

  // Cartão-postal + carimbo "CARIMBADO: PERU ✈".
  drawStamp(ctx, drawThumb) {
    const s = this.stampAnim;
    if (!s) return;
    const t = s.t;
    const inT = clamp(t / 0.4, 0, 1), outT = clamp((t - 2.1) / 0.5, 0, 1);
    const cx = 700, cy = 168;
    const yOff = (1 - ease.outBack(inT)) * -260 + ease.inCubic(outT) * -300;
    ctx.save();
    ctx.translate(cx, cy + yOff);
    ctx.rotate(0.06 - inT * 0.1);
    // cartão-postal
    rrect(ctx, -150, -86, 300, 172, 10); ink(ctx, '#fff8e6', 4);
    ctx.save(); rrect(ctx, -138, -74, 160, 148, 6); ctx.clip();
    drawThumb(ctx, s.idx, -138, -74, 160, 148);
    ctx.restore();
    rrect(ctx, -138, -74, 160, 148, 6); ink(ctx, null, 3);
    ctx.strokeStyle = 'rgba(29,24,56,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(36, -10 + i * 22); ctx.lineTo(136, -10 + i * 22); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    outlinedText(ctx, 'POSTAL', 86, -54, 15, '#ff5e7e', INK, 'Bungee', 3);
    // carimbo batendo
    if (t > 0.25) {
      const st = clamp((t - 0.25) / 0.2, 0, 1);
      const sc = 2.6 - 1.6 * ease.inCubic(st);
      ctx.save();
      ctx.translate(20, 8);
      ctx.rotate(-0.22);
      ctx.scale(sc, sc);
      ctx.globalAlpha = 0.25 + 0.7 * st;
      const col = s.lap > 1 ? '#7b2ff7' : '#d32f2f';
      ctx.strokeStyle = col; ctx.lineWidth = 4;
      rrect(ctx, -112, -36, 224, 72, 12); ctx.stroke();
      ctx.lineWidth = 1.8; rrect(ctx, -104, -28, 208, 56, 8); ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = '13px "Bungee", sans-serif'; ctx.fillText('CARIMBADO:', 0, -13);
      const fs = s.name.length > 7 ? 21 : 26;
      ctx.font = `${fs}px "Bungee", sans-serif`;
      const label = s.name + ' ✈';
      ctx.fillText(label, 0, 12);
      ctx.restore();
    }
    ctx.restore();
  }

  drawBanner(ctx) {
    const b = this.bannerAnim;
    if (!b) return;
    const inT = clamp(b.t / 0.35, 0, 1), outT = clamp((b.t - (b.dur - 0.35)) / 0.35, 0, 1);
    const sc = ease.outBack(inT) * (1 - outT);
    if (sc <= 0) return;
    ctx.save();
    ctx.translate(W / 2, 170);
    ctx.scale(sc, sc);
    ctx.rotate(-0.04);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    outlinedText(ctx, b.title, 0, 0, 52, b.color, INK, 'Bungee', 10);
    if (b.sub) outlinedText(ctx, b.sub, 0, 46, 22, '#fff', INK, 'Bungee', 6);
    ctx.restore();
  }

  // HUD: pontuação estilo Chrome Dino, malas, rota e power-ups.
  drawHUD(ctx, g) {
    ctx.textBaseline = 'middle';
    // pontos + HI (canto superior direito)
    ctx.textAlign = 'right';
    const sp = 1 + this.scorePop * 0.25;
    ctx.save(); ctx.translate(W - 22, 30); ctx.scale(sp, sp);
    outlinedText(ctx, pad(g.score), 0, 0, 30, this.scorePop > 0 ? '#ffe066' : '#fff', INK, 'Bungee', 7);
    ctx.restore();
    ctx.font = '30px "Bungee", sans-serif';
    const scoreW = ctx.measureText('00000').width;
    outlinedText(ctx, 'HI ' + pad(Math.max(g.hi, g.newRecord ? g.score : 0)), W - 40 - scoreW, 31, 20, g.newRecord ? '#ffd23f' : '#d8d6ee', INK, 'Bungee', 5);

    // malas
    const mp = 1 + this.malaPop * 0.35;
    ctx.save(); ctx.translate(W - 116, 74); ctx.scale(mp, mp);
    const icon = malaIcon();
    ctx.drawImage(icon.c, -18, -20, 36, 36);
    ctx.restore();
    ctx.textAlign = 'left';
    outlinedText(ctx, '× ' + g.malasRun, W - 92, 74, 22, '#fff', INK, 'Bungee', 5);

    // rota (centro superior): bolinhas dos países + aviãozinho
    const x0 = 330, x1 = 630, y = 24;
    const prog = clamp(g.routeDist / g.countryLen, 0, 8);
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * prog / 8, y); ctx.stroke();
    for (let i = 0; i <= 8; i++) {
      circle(ctx, x0 + (x1 - x0) * i / 8, y, i === 8 ? 6.5 : 4.5);
      ink(ctx, i <= prog ? '#ffd23f' : '#fff', 2.5);
    }
    // avião
    const ax = x0 + (x1 - x0) * prog / 8;
    ctx.save(); ctx.translate(ax, y); ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-7, -6); ctx.lineTo(-4, 0); ctx.lineTo(-7, 6); ctx.closePath(); ink(ctx, '#fff', 2.5);
    ctx.restore();
    ctx.textAlign = 'center';
    const label = (g.lap > 1 ? `VOLTA ${g.lap} · ` : '') + COUNTRIES[g.countryIdx].name;
    outlinedText(ctx, label, (x0 + x1) / 2, y + 26, 16, '#fff', INK, 'Bungee', 5);

    // power-ups ativos (abaixo da rota)
    const p = g.player;
    const items = [];
    if (p.shield) items.push(['HABEAS CORPUS', 1, '#ffcf26']);
    if (p.turbo > 0) items.push(['PIX EXPRESSO', p.turbo / g.cfg.turboTime, '#4ad7ff']);
    if (p.magnet > 0) items.push(['ÍMÃ', p.magnet / g.cfg.magnetTime, '#ff5e7e']);
    let iy = 80;
    for (const [name, frac, col] of items) {
      ctx.textAlign = 'center';
      outlinedText(ctx, name, W / 2, iy, 12, col, INK, 'Bungee', 4);
      rrect(ctx, W / 2 - 50, iy + 10, 100, 8, 4); ink(ctx, 'rgba(255,255,255,0.6)', 2.5);
      rrect(ctx, W / 2 - 50, iy + 10, 100 * clamp(frac, 0, 1), 8, 4); ctx.fillStyle = col; ctx.fill();
      iy += 34;
    }
  }
}
