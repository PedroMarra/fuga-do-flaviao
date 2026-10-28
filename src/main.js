// Boot: canvas responsivo com letterbox + devicePixelRatio, loop de passo fixo
// (60 Hz lógico) com interpolação, pausa automática e carregamento das fontes.
import { W, H, STEP, MAX_RENDER_SCALE } from './config.js';
import { RS, clearSprites, setSeed } from './util.js';
import { Input } from './input.js';
import { Game } from './game.js';

const params = new URLSearchParams(location.search);
const debug = {
  on: params.has('debug'),
  bot: params.has('bot'),
  god: params.has('god'),
  skip: params.get('skip'),
  power: params.get('power'),
  autostart: params.has('autostart') || params.has('bot'),
  timeScale: Math.max(1, Math.min(8, Number(params.get('ts')) || 1)),
  errors: [],
};
if (params.has('seed')) setSeed(Number(params.get('seed')) || 1);
window.addEventListener('error', (e) => debug.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => debug.errors.push(String(e.reason)));

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });
const input = new Input();
const game = new Game(canvas, ctx, input, debug);

// ---------- Resize com letterbox ----------
let lastKey = '';
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
  stage.style.width = cssW + 'px';
  stage.style.height = cssH + 'px';
  stage.style.left = Math.floor((vw - cssW) / 2) + 'px';
  stage.style.top = Math.floor((vh - cssH) / 2) + 'px';
  stage.style.setProperty('--stage-w', cssW + 'px');

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const rs = Math.max(0.5, Math.min(scale * dpr, MAX_RENDER_SCALE));
  const key = rs.toFixed(3);
  if (key !== lastKey) {
    lastKey = key;
    canvas.width = Math.round(W * rs);
    canvas.height = Math.round(H * rs);
    RS.scale = canvas.width / W;
    clearSprites();
    game.onResize();
  }
  game.ui.setPortrait(vh > vw);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
resize();

// ---------- Pausa automática ----------
document.addEventListener('visibilitychange', () => { if (document.hidden) game.autoPause(); });
window.addEventListener('blur', () => game.autoPause());

// ---------- Loop: passo fixo + interpolação ----------
let last = performance.now();
let acc = 0;
let fpsT = 0, fpsN = 0;
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25; // evita "espiral da morte" após travadas
  acc += dt * debug.timeScale;
  let steps = 0;
  while (acc >= STEP && steps < 8 * debug.timeScale) {
    game.update(STEP);
    acc -= STEP;
    steps++;
  }
  if (steps >= 8 * debug.timeScale) acc = 0;
  game.render(acc / STEP);

  fpsN++; fpsT += dt;
  if (fpsT >= 0.5) { game.fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
  requestAnimationFrame(frame);
}
// ?fast=N (só para testes automáticos): avança N passos por tique via setTimeout,
// independente do requestAnimationFrame (que quase não roda em navegador headless).
const fast = Math.min(120, Number(params.get('fast')) || 0);
// ?snap=nome:t1,t2 envia "fotos" do canvas ao servidor de teste em cada tempo de jogo (s).
const snapArg = params.get('snap');
const snaps = snapArg ? snapArg.split(':')[1].split(',').map(Number) : [];
const snapName = snapArg ? snapArg.split(':')[0] : '';
if (fast > 0) {
  const tick = () => {
    for (let i = 0; i < fast; i++) {
      game.update(STEP);
      if (snaps.length && game.time >= snaps[0]) {
        const t = snaps.shift();
        game.render(1);
        fetch(`/__snap?name=${snapName}-${t}`, { method: 'POST', body: canvas.toDataURL('image/png') });
      }
    }
    game.render(1);
    setTimeout(tick, 16);
  };
  tick();
} else {
  requestAnimationFrame(frame);
}

// ---------- Fontes: redesenha sprites quando a fonte arcade chegar ----------
if (document.fonts && document.fonts.load) {
  Promise.all([document.fonts.load('20px "Bungee"'), document.fonts.load('20px "Lilita One"')])
    .then(() => { clearSprites(); game.onResize(); })
    .catch(() => { /* sem fonte: usa a reserva do sistema */ });
}

window.__game = game; // ajuda nos testes automáticos
