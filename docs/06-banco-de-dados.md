# 6. Estado e persistência

Não há banco relacional. O "banco" é o estado de cada sala (`RoomState`),
guardado na memória do servidor WebSocket ou no Firebase Realtime Database,
conforme o transporte (ver [01-arquitetura.md](01-arquitetura.md)).

## 6.1 Modelo

Definido em [`shared/types.ts`](../shared/types.ts).

```ts
interface RoomState {
  v: 2;                                   // versão do formato
  roomId: string;                         // código de 6 letras e números
  rev: number;                            // sobe 1 a cada ação aplicada
  z: number;                              // contador de camadas da mesa
  players: Record<string, PlayerState>;
  cards: Record<string, CardState>;
  piles: Record<string, PileState>;
  last: ActionEvent | null;               // última ação (alimenta os efeitos)
}

interface CardState {
  id: string;
  suit: Suit; rank: Rank;
  zone: 'deck' | 'hand' | 'table' | 'pile';
  owner: string | null;                   // jogador (hand) ou grupo (pile)
  order: number;                          // posição no monte, na mão ou no grupo
  x: number; y: number;                   // centro na mesa, de 0 a 1
  z: number;                              // camada na mesa
  faceUp: boolean;
}

interface PileState { id: string; x: number; y: number; z: number; mode: 'fan' | 'stack' }
interface PlayerState { id: string; name: string; seat: number; connected: boolean }
```

### Por que este formato

A versão anterior tinha um array por lugar (`deckCards`, `tableCards`,
`players[].cards`, `cardGroups[].cards`) e movia cartas por índice. Mover uma
carta exigia tirar de um array e pôr em outro, e duas pessoas fazendo isso ao
mesmo tempo perdiam ou duplicavam cartas.

Agora **cada carta é uma entidade com endereço** (zona, dono, ordem). Mover é
mudar três campos de uma carta. O total de cartas nunca muda por acidente, e os
testes verificam isso.

### Invariantes

- O id de uma carta é único na sala.
- Ao voltar para o monte, a carta ganha **id novo**. Sem isso, quem lesse a
  rede saberia onde uma carta já vista reaparece depois de embaralhar.
- Grupo com uma carta só vira carta solta; grupo vazio é apagado.
- Posições `x`, `y` sempre entre 0 e 1 (o motor limita).
- Quem sai devolve a mão ao **fundo** do monte.
- No máximo 8 jogadores e 416 cartas (8 baralhos) por sala.

## 6.2 Visão por jogador

`viewFor(state, playerId)` ([`shared/view.ts`](../shared/view.ts)) produz o
`RoomView` que a interface recebe:

- o monte vira só `deckCount`;
- a mão dos outros vira só `handCount` em cada jogador;
- carta fechada na mesa chega com `suit` e `rank` nulos.

## 6.3 Servidor WebSocket

- Salas em memória, em um `Map` dentro de `RoomManager`.
- Cada assento tem um **token** aleatório, entregue só a quem o ocupa. É ele
  que permite voltar ao mesmo lugar (`resume`).
- Sala em que todos caíram é apagada depois de `ROOM_TTL_MIN` minutos.
- Com `ROOMS_FILE`, as salas e os tokens vão para um JSON a cada 10 s (se algo
  mudou) e no desligamento, gravando em arquivo temporário e renomeando. No
  boot, as salas voltam com todos marcados como desconectados até
  reconectarem.

## 6.4 Firebase Realtime Database

Caminhos:

| Caminho | Conteúdo |
|---|---|
| `rooms/{roomId}` | O `RoomState` inteiro |
| `rooms/{roomId}/players/{playerId}/connected` | Presença, com `onDisconnect` para `false` |
| `rooms/{roomId}-live/{playerId}` | Arrasto ao vivo (`LiveMessage`), apagado ao soltar e no `onDisconnect` |

O arrasto ao vivo fica **fora** do nó da sala de propósito: dentro dele, cada
movimento do dedo invalidaria as transações em andamento dos outros jogadores.

Toda ação roda em `runTransaction` sobre `rooms/{roomId}`, passando pelo mesmo
`applyAction` do servidor. Se outro cliente gravar no meio, o SDK repete a
função com o estado novo.

### O que o Firebase apaga

O Realtime Database descarta objetos vazios e valores `null` ao gravar. Por
isso todo estado lido passa por `normalizeState`
([`shared/engine.ts`](../shared/engine.ts)), que reconstrói `players: {}`,
`owner: null` e afins, e devolve `null` para qualquer coisa que não seja uma
sala `v: 2`. Salas no formato antigo são tratadas como inexistentes.

### Limitações deste transporte

- Sem servidor, o cliente recebe o estado inteiro: alguém com conhecimento
  técnico pode ler cartas escondidas pelas ferramentas do navegador. Para jogo
  com informação oculta de verdade, use o servidor WebSocket.
- Sala abandonada sem que o último jogador clique em "Sair" fica no banco. Uma
  limpeza periódica (Cloud Function ou script) pode apagar salas com todos
  desconectados há mais de um dia.

### Regras de segurança sugeridas

As regras do projeto Firebase não estão neste repositório e não foram
alteradas. Uma base mínima, que limita o acesso ao nó `rooms` e impede gravar
algo que não seja uma sala v2:

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        ".write": true,
        ".validate": "$room.matches(/^[A-Z0-9]{6}(-live)?$/) && (newData.child('v').val() === 2 || $room.endsWith('-live'))"
      }
    }
  }
}
```

Elas não autenticam jogadores (o projeto não tem login). Para isso seria
preciso Firebase Authentication anônima e regras por `auth.uid`.
