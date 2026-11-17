# 4. Componentes, hooks e módulos

Catálogo do que já existe. Antes de criar algo, procure aqui.

## 4.1 Páginas

| Arquivo | O que é |
|---|---|
| [`pages/Index.tsx`](../src/pages/Index.tsx) | Usa `useRoom`. Mostra `RoomSetup` enquanto não há sala e `GameStage` depois |
| [`pages/NotFound.tsx`](../src/pages/NotFound.tsx) | 404 com link de volta |

## 4.2 Entrada e diálogos

| Componente | Props principais | Uso |
|---|---|---|
| [`RoomSetup`](../src/components/RoomSetup.tsx) | `busy`, `resumingRoom`, `transport`, `onCreateRoom`, `onJoinRoom` | Tela de entrada. Lê `?sala=` do link de convite e o último nome usado |
| [`ConfirmDialog`](../src/components/ConfirmDialog.tsx) | `title`, `description`, `confirmText`, `destructive`, `onConfirm` | Toda confirmação (adicionar baralho, reiniciar, sair, remover jogador) |
| [`RemoveCardsDialog`](../src/components/RemoveCardsDialog.tsx) | `isOpen`, `onClose`, `onRemoveCards(suits, ranks)` | Remover cartas do monte por valor ou naipe |
| [`game/HelpDialog`](../src/components/game/HelpDialog.tsx) | `open`, `onOpenChange` | "Como jogar": lista os gestos |

## 4.3 Mesa (`src/components/game/`)

| Componente | Responsabilidade |
|---|---|
| [`GameStage`](../src/components/game/GameStage.tsx) | Tela do jogo. Monta barra, mesa e mão; liga `useCardDrag`, `useViewEffects`, `useCardTransitions`; provê `StageContext` (registro de sprites e API de efeitos) |
| [`TopBar`](../src/components/game/TopBar.tsx) | Código da sala (toque copia o link de convite), indicador de reconexão, outros jogadores (etiquetas ou leques, conforme `useOpponentsView`) e menu |
| [`PlayerBadge`](../src/components/game/PlayerBadge.tsx) | Visão compacta (alternativa) de outro jogador: cor do assento, nome, mini versos, contagem. Alvo de soltura `player:ID`. Mostra botão de remover quando desconectado e recebe `onRemove`. Exporta `OpponentProps`, comum às duas visões de adversário |
| [`OpponentFan`](../src/components/game/OpponentFan.tsx) | Visão padrão do adversário: a mão dele em mini leque de versos (até 12 visíveis) com o nome embaixo, sem caixa em volta. Mesmas props e mesmo papel da `PlayerBadge` |
| [`PlayerReachBar`](../src/components/game/PlayerReachBar.tsx) | Barra de jogadores ampliada que aparece durante o arrasto perto do topo. Usa `PlayerBadge` ou `OpponentFan` (conforme a visão escolhida) com `anchor={false}`, para as cartas entregues voarem até a barra superior, e não até ela |
| [`GameMenu`](../src/components/game/GameMenu.tsx) | Menu suspenso: adicionar baralho, remover um baralho (desabilitado com um baralho só), remover cartas, reiniciar, reiniciar com um baralho original, cor da mesa, adversários, som, idioma, ajuda, instalar app (some quando já instalado), sair. Rola por dentro quando não cabe na altura |
| [`InstallDialog`](../src/components/game/InstallDialog.tsx) | Passo a passo de instalação para quem não tem o pedido direto do navegador (iPhone e outros). Usado pelo menu e pela tela de entrada |
| [`HandTray`](../src/components/game/HandTray.tsx) | Bandeja inferior: nome, ordenar por valor ou naipe, seletor Aberta/Fechada, contador e embaralhar do monte. Expõe as âncoras `handRef` e `deckRef` |
| [`CardLayer`](../src/components/game/CardLayer.tsx) | Camada única com o monte, todas as cartas visíveis (em `AnimatePresence`) e as etiquetas de grupo. Aceita `children` para sobreposições que ficam entre as cartas da mesa e a carta segurada (a `PlayerReachBar`) |
| [`CardSprite`](../src/components/game/CardSprite.tsx) | Uma carta: persegue o alvo com mola, vira, inclina no hover, mostra quem a está arrastando, sai voando para o destino |
| [`DeckStack`](../src/components/game/DeckStack.tsx) | O monte: camadas de volume, animação de embaralhar e a carta "fantasma" que se arrasta |
| [`PileChip`](../src/components/game/PileChip.tsx) | Etiqueta de grupo: contagem e alça para levar o grupo inteiro (mesa, monte, mãos, outro grupo, carta solta); toque alterna pilha e leque. No leque, mostra o `PileSortMenu` ao lado |
| [`PileSortMenu`](../src/components/game/PileSortMenu.tsx) | Botão de ordem do leque (livre, valor, manilha), ao lado da alça |
| [`CardFace`](../src/components/game/CardFace.tsx) | `CardFront`, `CardBack` e `SuitIcon` (naipes em SVG). Reaproveitado na entrada e no diálogo de remover cartas |
| [`effects/FeltBackground`](../src/components/game/effects/FeltBackground.tsx) | Fundo de feltro (verde ou vinho) com textura de tecido. Usado na mesa e na entrada |
| [`FeltPicker`](../src/components/game/FeltPicker.tsx) | Duas amostras de cor para escolher o feltro. Usado na entrada; no jogo a escolha fica no `GameMenu` |
| [`effects/FxLayer`](../src/components/game/effects/FxLayer.tsx) | Partículas e textos flutuantes, comandados por `ref` (`burst`, `text`) |

## 4.4 Hooks (`src/hooks/`)

| Hook | Devolve | Uso |
|---|---|---|
| [`useRoom`](../src/hooks/useRoom.ts) | `phase`, `status`, `view`, `create`, `join`, `leave`, `send`, `sendLive`, `onLive` | Único ponto que fala com o transporte. Retoma a sala depois de recarregar |
| [`useCardDrag`](../src/hooks/useCardDrag.ts) | `held`, `handGap`, `pileGap`, `hover`, `reachPlayers`, `begin`, `world`, `spawnHint` | Arrasto e toque por Pointer Events. Resolve o alvo (inclusive a vaga no leque), decide quando ampliar a barra de jogadores e envia a ação |
| [`useStageMetrics`](../src/hooks/useStageMetrics.ts) | `size`, `metrics` | Mede o palco e as âncoras; calcula o tamanho da carta |
| [`useSpriteMotion`](../src/hooks/useSpriteMotion.ts) | `x`, `y`, `rotate`, `scale` | Valores de movimento de um sprite, registrados para o arrasto |
| [`useLiveDrags`](../src/hooks/useLiveDrags.ts) | mapa de arrastos remotos | Recebe a posição do que os outros estão arrastando |
| [`useViewEffects`](../src/hooks/useViewEffects.ts) | nada | Transforma `view.last` em som, partícula, texto, tremor e toasts de entrada e saída de jogadores |
| [`useInstallFlow`](../src/hooks/useInstallFlow.ts) | `installed`, `method`, `install`, `helpOpen`, `setHelpOpen` | Instalar o app: abre o pedido do navegador ou, sem ele, o `InstallDialog` |
| [`useCardTransitions`](../src/hooks/useCardTransitions.ts) | `spawns`, `exitLookup` | De onde uma carta nova surge (monte, etiqueta de quem jogou) e para onde uma carta removida voa |
| [`use-mobile`](../src/hooks/use-mobile.tsx), [`use-toast`](../src/hooks/use-toast.ts) | | Herdados do shadcn/ui, não usados pelo jogo |

## 4.5 Módulos puros

| Módulo | Conteúdo |
|---|---|
| [`shared/pileOrder.ts`](../shared/pileOrder.ts) | `sortPile(cartas, ordem)`, `PILE_SORTS`, `isPileSort`: ordem de exibição do leque, igual em todos os clientes |
| [`game/layout.ts`](../src/game/layout.ts) | `cardSizeFor`, `tableToStage`, `stageToTable`, `pileGeometry`, `handSlots`, `nearestSlot`, `hashOf` |
| [`game/targets.ts`](../src/game/targets.ts) | `computeTargets`: alvo (x, y, rotação, escala, camada) de cada carta, com as vagas abertas na mão (`handGap`) e no leque (`pileGap`) |
| [`game/stage.ts`](../src/game/stage.ts) | `StageContext`, `useStage`, `SpriteRegistry`, `FxApi`, `seatColor`, `DECK_KEY`, `pileKey`, `prefersReducedMotion` |
| [`lib/realtime/`](../src/lib/realtime/) | `connectRoom`, `transportKind`, tipos da conexão, sessão e link de convite |
| [`lib/i18n.ts`](../src/lib/i18n.ts) | `t`, `useT`, `setLocale`, `getLocale` |
| [`lib/sfx.ts`](../src/lib/sfx.ts) | `sfx.pick`, `drop`, `deal`, `flip`, `stack`, `shuffle`, `fanfare`, `join`, `leave`, `error`, `tap`; `useMuted`, `setMuted` |
| [`lib/tokens.ts`](../src/lib/tokens.ts) | `tokenColor` |
| [`lib/pwa.ts`](../src/lib/pwa.ts) | `registerPwa` (service worker, só no build de produção, com aviso de versão nova), `promptInstall`, `useInstallState` (instalado? pedido do navegador, iPhone ou manual) |
| [`lib/preference.ts`](../src/lib/preference.ts) | `createPreference(chave, valores, padrão, efeito?)`: preferência do jogador no navegador, com hook `useValue`. Base de `felt.ts` e `opponentsView.ts` |
| [`lib/felt.ts`](../src/lib/felt.ts) | `FELTS`, `useFelt`, `setFelt`, `getFelt`: cor da mesa escolhida pelo jogador |
| [`lib/opponentsView.ts`](../src/lib/opponentsView.ts) | `OPPONENT_VIEWS`, `useOpponentsView`, `setOpponentsView`: adversários como leques (padrão) ou etiquetas |
| [`lib/feltTexture.ts`](../src/lib/feltTexture.ts) | `feltTextureUrl`, `FELT_TILE`: textura de tecido gerada uma vez e reaproveitada |
| [`lib/firebase.ts`](../src/lib/firebase.ts) | Instância do Realtime Database |

## 4.6 Componentes removidos nesta versão

`GameTable`, `PlayerHand`, `TableCard`, `CardGroup`, `CardStackModeDialog`,
`Deck`, `Card`, `utils/cardUtils.ts` e `utils/dragImageUtils.ts` foram
substituídos pela camada única de sprites e pelo motor compartilhado. O diálogo
"Leque ou Pilha?" deu lugar à etiqueta do grupo (`PileChip`), que alterna o
modo com um toque.

O fundo animado em WebGL (`effects/SwirlBackground`) foi substituído pelo
feltro (`effects/FeltBackground`); ver
[historico/2026-11-17-feltro-verde-e-vinho.md](historico/2026-11-17-feltro-verde-e-vinho.md).
