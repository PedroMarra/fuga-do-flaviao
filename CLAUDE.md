# Fuga do Flavião

## Objetivo
Jogo arcade web de um botão (HTML + CSS + JS puro, ES modules, sem build): o jatinho do
Flavião foge do Brasil a Miami. Toda arte é desenhada por código (Canvas 2D) e todo som é
sintetizado (WebAudio). Publicado no GitHub Pages.

## Como rodar
- `python3 -m http.server 8080` na raiz e abrir http://localhost:8080
- Parâmetros de teste na URL: `debug`, `bot`, `god`, `skip=<país>`, `power=<tipo>`, `seed`, `fast` (ver README).

## Regras deste projeto
- Sem frameworks, sem etapa de build, sem assets externos (só a fonte do Google Fonts).
- Caminhos sempre relativos (GitHub Pages em subpasta).
- Constantes de balanceamento só em `src/config.js`.
- Nada de alocação no loop: obstáculos, coletáveis e partículas usam pool fixo.
- Sprites estáticos via `sprite()` em `src/util.js` (cache por escala de render).
- Todos os personagens, marcas e instituições são fictícios. Exceções que vieram da especificação do Pedro:
  nome do jatinho "Master Air" e o power-up "Pix Expresso" (ícone sem logo real).
- O jogo divulga o autor: Instagram @_pedro.marra e GitHub PedroMarra (menu, game over,
  texto de compartilhar, faixa do aviãozinho em Miami). Textos em `AUTHOR` (`src/ui.js`),
  links no `index.html`.
- Ao mudar URL de publicação, atualizar `index.html` (og:*) e `SHARE_URL` em `src/ui.js`.
- Para regenerar `og.png` e ícones: abrir `tools/render-assets.html` pelo servidor local.
