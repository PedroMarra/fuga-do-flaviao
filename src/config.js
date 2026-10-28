// Todas as constantes de balanceamento do jogo ficam aqui.
// Unidades: px lógicos (tela 960×540), segundos, px/s e px/s².

export const W = 960;
export const H = 540;
export const STEP = 1 / 60;        // passo lógico fixo (60 Hz)
export const MAX_RENDER_SCALE = 2; // limite de pixels por px lógico (performance)

export const WORLD = {
  groundY: 482,      // topo do chão
  ceilingY: 22,      // teto invisível
  pxPerMeter: 10,    // 10 px percorridos = 1 m
};

export const PLAYER = {
  x: 230,
  startY: 430,
  thrust: 2350,        // empuxo para cima com o botão segurado
  gravity: 1300,       // gravidade ao soltar
  thrustRampUp: 10,    // quão rápido o empuxo chega ao máximo (curva, não binário)
  thrustRampDown: 7,
  maxRise: 470,
  maxFall: 540,
  hitboxScale: 0.8,    // hitbox ~20% menor que o desenho
  tiltPerVy: 0.00085,  // inclinação do bico conforme a velocidade vertical
  maxTilt: 0.42,
  groundBounce: 0.22,
  invulnAfterHit: 1.1, // após o escudo absorver uma batida
};

export const SPEED = {
  base: 330,           // velocidade inicial de rolagem
  perCountry: 0.065,   // +6,5% por país percorrido (contínuo)
  max: 640,            // teto da volta 1
  lapBonus: 0.25,      // cada volta extra: +25% de velocidade
  lapMaxBonus: 0.5,    // teto do bônus de volta
  turboMul: 1.9,       // multiplicador do Pix Expresso
  menuScroll: 60,      // rolagem lenta na tela inicial
};

export const ROUTE = {
  countryLength: 1200, // metros por país (8 países ≈ 9,6 km)
  breatherAfterBorder: 1.4, // segundos sem obstáculos após cruzar fronteira
};

// Pesos de cada padrão de obstáculo por país e intervalo médio de spawn (s).
export const COUNTRIES = [
  { id: 'brasil',   name: 'BRASIL',   spawn: 1.6,  mix: { pombos: 6, balao: 4 } },
  { id: 'paraguai', name: 'PARAGUAI', spawn: 1.45, mix: { pombos: 4, balao: 2, caca2: 4 } },
  { id: 'bolivia',  name: 'BOLÍVIA',  spawn: 1.35, mix: { condor: 5, tempestade: 3, caca2: 2 } },
  { id: 'peru',     name: 'PERU',     spawn: 1.25, mix: { condor: 4, heli: 3, pombos: 2, caca2: 2 } },
  { id: 'colombia', name: 'COLÔMBIA', spawn: 1.15, mix: { papagaios: 5, drone: 4, balao: 1 } },
  { id: 'panama',   name: 'PANAMÁ',   spawn: 1.1,  mix: { cargo: 3, heli: 3, papagaios: 2, pombos: 2 } },
  { id: 'mexico',   name: 'MÉXICO',   spawn: 1.0,  mix: { caca3: 4, drone: 3, tempestade: 3, condor: 1 } },
  { id: 'eua',      name: 'EUA',      spawn: 0.9,  mix: { caca3: 3, heli: 2, drone: 2, cargo: 2, tempestade: 2, pombos: 2, balao: 1 } },
];

export const SPAWN = {
  jitter: 0.22,          // ±22% no intervalo
  lapFaster: 0.2,        // volta 2+: intervalos 20% menores
  firstDelay: 1.2,       // folga no começo da partida
  extraDelay: { heli: 1.4, cargo: 1.6, tempestade: 0.6, caca3: 0.4 },
  maxActive: { heli: 1, cargo: 1, tempestade: 1, drone: 2 },
};

export const OBSTACLE = {
  pombo:     { relSpeed: 70,  r: 13 },
  balao:     { relSpeed: 0,   r: 22, rise: 42 },
  caca:      { relSpeed: 470, warn: 1.0 },
  heli:      { enter: 1.0, hover: 3.6, exitSpeed: 260, coneLen: 430, coneHalf: 0.17, sweep: 0.55, sweepPeriod: 3.2, warmup: 0.7 },
  drone:     { relSpeed: -0.45, track: 75, r: 17 },   // relSpeed negativo = fração da velocidade (mais lento que o mundo)
  tempestade:{ period: 2.0, warnAt: 0.95, strikeAt: 1.35, strikeEnd: 1.7 },
  cargo:     { relSpeed: -0.42, dropEvery: 0.75 },
  processo:  { gravity: 520, r: 14 },
  condor:    { relSpeed: 40,  amp: 55, period: 2.6 },
  papagaio:  { relSpeed: 130, amp: 38, period: 0.85 },
  nearMissMargin: 26,
};

export const PICKUPS = {
  malaValue: 50,
  nearMissBonus: 10,
  malaEvery: [1.5, 2.6],     // intervalo entre grupos de malas (s)
  powerEvery: [16, 26],      // intervalo entre power-ups (s)
  firstPower: 9,
  turboTime: 3,
  turboGrace: 0.8,
  magnetTime: 6,
  magnetRadius: 270,
  magnetPull: 900,
  collectRadius: 30,
};

export const TRAIL = {
  base: 20,          // notas por segundo voando normal
  rising: 38,        // segurando para subir
  turbo: 85,         // "chuva" de notas no turbo
  life: [0.9, 1.6],
  wind: 40,
};

export const JUICE = {
  hitStop: 0.08,
  shakeHit: 16,
  shakeBorder: 6,
  shakeNear: 3,
  shakeDecay: 7,
  flashGameOver: 0.9,
  deathDelay: 1.15,  // tempo da queda antes da tela de game over
};

export const AUDIO = {
  master: 0.7,
  music: 0.16,
  sfx: 0.8,
  engine: 0.07,
};
