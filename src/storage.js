// Persistência local (estilo dinossauro do Chrome). Se o localStorage falhar
// (aba anônima, bloqueado, cheio), o jogo segue normal usando só a memória.

const PREFIX = 'fugaFlaviao.';
const mem = {};

function read(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (v !== null) return JSON.parse(v);
  } catch { /* storage indisponível */ }
  return key in mem ? mem[key] : fallback;
}

function write(key, value) {
  mem[key] = value;
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* ignora */ }
}

const prefersReduced = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export const storage = {
  get hi() { return Number(read('hi', 0)) || 0; },
  set hi(v) { write('hi', Math.floor(v)); },
  get totalMalas() { return Number(read('malas', 0)) || 0; },
  set totalMalas(v) { write('malas', Math.floor(v)); },
  get muted() { return !!read('mute', false); },
  set muted(v) { write('mute', !!v); },
  get reduceMotion() { return !!read('reduce', prefersReduced()); },
  set reduceMotion(v) { write('reduce', !!v); },
};
