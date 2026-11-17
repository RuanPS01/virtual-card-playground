# 5. Padrões de nomes

## 5.1 Arquivos

| Tipo | Padrão | Exemplo |
|---|---|---|
| Componente React | PascalCase `.tsx`, nome igual ao componente | `CardSprite.tsx` |
| Hook | `useAlgo.ts` (camelCase) | `useCardDrag.ts` |
| Módulo puro | camelCase `.ts` | `layout.ts`, `targets.ts` |
| Primitivo shadcn/ui | kebab-case (convenção do kit) | `alert-dialog.tsx` |
| Teste | `nome.test.ts` em `__tests__/` ao lado | `shared/__tests__/engine.test.ts` |
| Documento | `NN-assunto.md` | `06-banco-de-dados.md` |
| Histórico | `AAAA-MM-DD-assunto.md` | `historico/2026-11-17-tempo-real-e-mesa-normalizada.md` |

## 5.2 Importações

| Alias | Aponta para |
|---|---|
| `@/` | `src/` |
| `@shared/` | `shared/` (só no cliente; o servidor usa caminho relativo `../shared/`) |

## 5.3 Tipos

| Sufixo | Significado | Exemplo |
|---|---|---|
| `State` | Dado autoritativo e completo, só o motor altera | `RoomState`, `CardState` |
| `View` | Recorte para um jogador | `RoomView`, `CardView` |
| `Props` | Props de componente | `CardSpriteProps` |
| `Api` | Retorno de hook usado como serviço | `RoomApi`, `CardDragApi` |

## 5.4 Ações do motor

Verbo ou destino em camelCase. A carta de origem vem sempre em `src`:
`{ from: 'deck' }` (topo do monte) ou `{ from: 'card', cardId }`.

| Ação | Efeito |
|---|---|
| `toHand` | Carta para uma mão (`playerId` opcional; `beforeId` posiciona) |
| `toTable` | Carta para a mesa em `x`, `y` normalizados (`faceUp` opcional) |
| `toPile` | Carta para um grupo existente |
| `stackOn` | Carta sobre outra: cria grupo ou entra no grupo do alvo |
| `toDeck` | Carta de volta ao topo do monte (ganha id novo) |
| `flip` | Vira carta da mesa ou de grupo |
| `movePile` | Move um grupo |
| `setPileMode` | `fan` (leque) ou `stack` (pilha) |
| `shuffleDeck`, `addDeck`, `removeCards`, `reset` | Monte |
| `sortHand` | Ordena a própria mão por `rank` ou `suit` |
| `removePlayer` | Remove jogador desconectado; a mão volta ao monte |

## 5.5 Zonas e lugares

`deck`, `hand`, `table`, `pile`. Em `CardState.owner`: id do jogador quando a
zona é `hand`, id do grupo quando é `pile`, `null` nas demais.

## 5.6 Códigos de erro

`snake_case`, listados em `ErrorCode` ([`shared/types.ts`](../shared/types.ts)).
Cada um tem texto em `error.<código>` no i18n: `deck_empty`, `not_your_card`,
`card_not_found`, `room_not_found`, `offline` e outros.

## 5.7 Chaves de i18n

`area.item`, em camelCase, agrupadas pela tela ou assunto:

| Prefixo | Onde aparece |
|---|---|
| `lobby.` | Tela de entrada |
| `hud.` | Barra superior |
| `menu.` | Menu da mesa |
| `hand.`, `deck.`, `table.`, `pile.`, `player.` | Partes da mesa |
| `confirm.<tipo>.title`, `.text`, `.ok` | Diálogos de confirmação |
| `toast.` | Avisos |
| `error.` | Códigos de erro |
| `suit.`, `rank.` | Nomes de naipes e valores |
| `help.` | Ajuda |
| `common.` | Cancelar, fechar |

Variáveis entre chaves: `t('toast.roomCreated', { room: 'K7M2QX' })`.

## 5.8 Chaves de armazenamento do navegador

Prefixo `vcp.`: `vcp.session` (sessionStorage), `vcp.name`, `vcp.muted`,
`vcp.locale` (localStorage).

## 5.9 Chaves do registro de sprites

Carta: o próprio id. Monte: `deck-top` (`DECK_KEY`). Etiqueta de grupo:
`pile:ID` (`pileKey(id)`).
