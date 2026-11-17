# 2026-11-17: tempo real autoritativo, mesa normalizada e efeitos

## Motivo

Relatos de uso:

- cartas fora de ordem e cartas sumindo ou duplicando quando mais de um
  jogador agia ao mesmo tempo;
- mover carta na mesa às vezes não refletia para os outros, ou refletia errado;
- no celular a mesa aparecia cortada, e uma carta movida no desktop podia
  ficar fora da tela do celular;
- arrastar não funcionava em tela de toque.

## Diagnóstico

1. Toda ação fazia `get` da sala inteira no Firebase, alterava a cópia e fazia
   `set` da sala inteira. Duas ações simultâneas: a última gravação apagava a
   primeira.
2. Ações apontavam para cartas pelo índice no array (`groupIndex`,
   `sourceIndex`), que muda quando outra pessoa mexe.
3. Posições da mesa eram pixels da tela de quem moveu a carta.
4. O arrasto usava o drag and drop nativo do HTML5 (não dispara em toque),
   misturado com o `drag` do framer-motion na mesma carta.
5. Sair da sala apagava o jogador junto com as cartas da mão.

## O que mudou

- **Motor compartilhado** (`shared/engine.ts`): função pura que aplica cada
  ação. Cartas viraram entidades com id, zona, dono e ordem. 27 testes.
- **Servidor WebSocket** (`server/`): aplica ações em fila, manda a cada
  jogador só o que ele pode ver, confirma cada ação, reconecta com token,
  limita taxa, salva salas em disco (`ROOMS_FILE`). `Dockerfile` incluso.
- **Firebase como alternativa**, agora com `runTransaction` passando pelo
  mesmo motor, presença com `onDisconnect` e arrasto ao vivo em nó separado.
  Escolha por `VITE_WS_URL`.
- **Mesa normalizada** de 0 a 1 projetada na área útil de cada tela; tamanho
  de carta calculado pela tela; modos retrato, estreito e paisagem compacta.
- **Arrasto por Pointer Events** em uma camada única de sprites; arrasto ao
  vivo visível para os outros, com trava da carta.
- **Visual e efeitos:** fonte pixel, fundo em shader, cartas próprias em SVG,
  flutuação, inclinação 3D, viradas com estalo, partículas, textos flutuantes,
  tremor, sons sintetizados. Respeita movimento reduzido.
- **Interface:** barra com jogadores e menu, bandeja da mão com ordenar e
  seletor aberta ou fechada, etiqueta de grupo que alterna pilha e leque,
  link de convite, volta automática à sala, i18n pt-BR e en.
- **CI:** o deploy agora roda `npm run check` e `npm test` antes do build.
- Pasta `docs/` criada.

## Compatibilidade

Salas criadas pela versão anterior (formato sem `v: 2`) não abrem: aparecem
como "sala não encontrada". Basta criar uma sala nova.

## Validação

Além dos testes automatizados, foi feito um roteiro com Playwright: três
jogadores (desktop, celular em pé e celular deitado, os dois com toque)
comprando, jogando nos quatro cantos, virando, agrupando, movendo grupo,
alternando leque, reordenando, entregando carta, devolvendo ao monte,
embaralhando, adicionando baralho, recarregando a página e reiniciando; 21
cartas na mesa e 20 na mão em 360x640, 640x360, 768x1024 e 1440x900, todas
visíveis; arrasto ao vivo e trava; e reinício do servidor no meio da partida
com volta automática ao mesmo assento.

O transporte Firebase foi testado contra um banco em memória, e não contra o
Firebase real nem o emulador oficial.
