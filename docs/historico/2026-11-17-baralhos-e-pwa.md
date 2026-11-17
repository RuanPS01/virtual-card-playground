# 2026-11-17: remover baralho, reiniciar com um baralho original e PWA

## Motivo

Pedidos:

1. Dava para adicionar baralhos ao monte, mas não para remover.
2. Voltar a configuração do baralho para um único baralho original.
3. Tornar a aplicação um PWA, com opção de instalar o app no menu.

## O que mudou

- **`removeDeck`**: tira do monte uma cópia de cada carta. Nunca tira a última
  cópia (a sala mantém pelo menos um baralho) e só tira do monte. Cópias que
  estão na mesa ou nas mãos ficam e são contadas em `skipped`; o aviso diz
  quantas ficaram. Erros novos: `single_deck` e `deck_incomplete`. No menu, a
  opção fica desabilitada quando a sala tem 52 cartas ou menos.
- **`resetToOneDeck`**: recolhe tudo e recria um baralho original de 52 cartas,
  embaralhado, com ids novos. Desfaz baralhos adicionados e cartas removidas.
- O ícone de "Remover cartas do monte" virou um filtro, para não confundir com
  "Remover um baralho".
- **PWA** com `vite-plugin-pwa` (Workbox): manifesto, service worker com cache
  versionado, ícones 192, 512 e maskable, metas do iOS. O service worker não
  intercepta o tempo real.
- **Instalar app** (`src/lib/pwa.ts`, `useInstallFlow`, `InstallDialog`): no
  menu da mesa e na tela de entrada. Abre o pedido do navegador quando existe
  (Chrome, Edge, Android) ou o passo a passo (iPhone e outros). Some quando o
  app já está aberto como app. A faixa automática de instalação do Chrome no
  celular é suprimida, para não cobrir a mesa no meio do jogo.
- **Versão nova**: aviso com o botão Atualizar, sem recarregar sozinho.
- O menu da mesa rola por dentro quando não cabe na altura.

## Validação

- `npm test`: 39 testes (5 novos para `removeDeck` e `resetToOneDeck`).
- Playwright, dois jogadores (desktop e celular com toque): opção desabilitada
  com um baralho, três baralhos e remoção pela Bia vista pelos dois, aviso,
  remoção com cartas na mão, reinício com um baralho original depois de
  remover copas e jogar cartas, e as 52 cartas de volta sem repetição.
- Playwright no build de produção (`vite preview`): service worker ativo,
  manifesto sem erros, Chrome considera o app instalável (sem pendências),
  instalação pelo menu e pela entrada, passo a passo do iPhone, abertura sem
  rede pelo cache, e a opção some quando aberto como app.
- Roteiros de jogo anteriores repetidos contra o build de produção, com o
  service worker ativo, sem falhas.
