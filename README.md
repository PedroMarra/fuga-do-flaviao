# Fuga do Flavião ✈💰

Jogo arcade de um botão, no estilo Jetpack Joyride / Flappy Bird. Você pilota o jatinho
**Master Air** do Flavião, um empresário trapaceiro de mentirinha, fugindo do Brasil rumo a
Miami: desvie dos perseguidores, colete malas de dinheiro e chegue o mais longe que puder.

> Sátira cartunesca. Todos os personagens, marcas e instituições do jogo são inventados.

**Jogar:** https://pedromarra.github.io/fuga-do-flaviao/ (depois de publicado)

## Como jogar

- **Segure** (clique, toque, `Espaço` ou `↑`) para subir. Solte para descer.
- `P` ou `Esc` pausa · `M` liga/desliga o som.
- Rota: Brasil → Paraguai → Bolívia → Peru → Colômbia → Panamá → México → EUA (Miami).
  Chegando em Miami começa a **Volta 2**, mais rápida.
- Power-ups: **Habeas Corpus** (escudo de 1 batida), **Pix Expresso** (3 s de turbo invencível)
  e **Ímã de Bufunfa** (puxa as malas por 6 s).
- Pontos = metros percorridos + 50 por mala + 10 por "UFA!" (quase-colisão).
- O recorde, o total de malas, o mudo e o "reduzir movimento" ficam salvos no navegador.

## Rodar no computador

Não precisa instalar nada nem compilar. Só precisa de um servidor estático
(abrir o `index.html` direto com duplo clique não funciona, por causa dos módulos JS):

```bash
cd fuga-do-flaviao
python3 -m http.server 8080
```

Abra http://localhost:8080. Para testar no celular na mesma rede Wi-Fi, use
`python3 -m http.server 8080 --bind 0.0.0.0` e abra `http://<IP-do-computador>:8080` no celular.

## Publicar (link para qualquer pessoa jogar)

O projeto usa só caminhos relativos e não tem etapa de build, então funciona em qualquer
hospedagem estática.

### GitHub Pages (recomendado)

1. Crie um repositório no GitHub (ex.: `fuga-do-flaviao`) e envie os arquivos:
   ```bash
   git remote add origin https://github.com/<seu-usuario>/fuga-do-flaviao.git
   git push -u origin main
   ```
2. No GitHub, abra o repositório → **Settings** → **Pages**.
3. Em **Build and deployment**, escolha **Source: Deploy from a branch**,
   branch **main** e pasta **/ (root)**. Clique em **Save**.
4. Em 1–2 minutos o jogo fica em `https://<seu-usuario>.github.io/fuga-do-flaviao/`.
5. Se o endereço for diferente de `pedromarra.github.io/fuga-do-flaviao`, troque a URL em
   `index.html` (tags `og:url`, `og:image`, `twitter:image`) e `SHARE_URL` em `src/ui.js`,
   para a prévia no WhatsApp/redes e o botão "Compartilhar" apontarem para o lugar certo.

### Netlify Drop (sem conta de Git)

1. Acesse https://app.netlify.com/drop.
2. Arraste a pasta `fuga-do-flaviao` inteira para a página.
3. Pronto: o Netlify gera um link na hora (dá para renomear o subdomínio nas configurações).

### Vercel

1. Em https://vercel.com, clique em **Add New → Project** e importe o repositório do GitHub.
2. **Framework Preset: Other**, sem comando de build e com *Output Directory* vazio (raiz).
3. Clique em **Deploy**.

Nos dois casos, atualize as URLs do passo 5 do GitHub Pages se quiser a prévia correta.

## Estrutura

```
index.html          página, meta tags (SEO/Open Graph), telas em DOM
style.css           layout responsivo, letterbox, botões arcade
manifest.json       "adicionar à tela inicial"
favicon.svg, icons/, og.png   ícones e imagem de prévia (gerados pela arte do jogo)
tools/render-assets.html      regenera og.png e ícones (abra pelo servidor local)
src/
  config.js     TODAS as constantes de balanceamento
  main.js       canvas responsivo, loop de passo fixo (60 Hz) com interpolação
  game.js       estados do jogo, eventos, cutscene de Miami
  input.js      mouse, toque e teclado unificados
  player.js     física do jato e desenho do Flavião (4 reações)
  obstacles.js  obstáculos, padrões de spawn, colisão e quase-colisão
  powerups.js   malas e power-ups
  background.js 8 países com parallax desenhado por código
  particles.js  partículas com pool (notas do rastro, fumaça, faíscas, textos)
  ui.js         HUD, carimbo de passaporte, game over, mini-mapa, compartilhar
  audio.js      efeitos, motor e música chiptune sintetizados (WebAudio)
  storage.js    localStorage com proteção contra falhas
  util.js       matemática, aleatório com seed, colisão, cache de sprites
```

## Ajustar a dificuldade

Tudo fica em `src/config.js`: gravidade e empuxo (`PLAYER`), velocidade e crescimento
(`SPEED`), tamanho de cada país (`ROUTE`), intervalo e mistura de obstáculos por país
(`COUNTRIES`, `SPAWN`, `OBSTACLE`), power-ups (`PICKUPS`), densidade do rastro de notas
(`TRAIL`) e intensidade dos efeitos (`JUICE`).

## Parâmetros de teste (só para desenvolvimento)

Acrescente na URL, ex.: `http://localhost:8080/?debug&skip=peru`

| Parâmetro | O que faz |
|---|---|
| `debug` | mostra hitboxes, FPS e um painel com o estado |
| `skip=<país>` | começa perto do país (`paraguai`, `bolivia`, `peru`, `colombia`, `panama`, `mexico`, `eua`, `miami`) |
| `god` | invencível |
| `bot` | piloto automático (começa sozinho) |
| `power=<shield\|turbo\|magnet>` | começa com o power-up |
| `seed=<n>` | partidas reproduzíveis |
| `fast=<n>` | simulação acelerada para testes automáticos |

## Acessibilidade

- "Reduzir movimento" desliga tremor de tela e flashes; vem ligado automaticamente se o
  sistema pedir (`prefers-reduced-motion`).
- Tudo é jogável com teclado; os botões têm foco visível.
