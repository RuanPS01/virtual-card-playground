// Motor do jogo: a única fonte de verdade sobre o que uma ação faz ao estado.
//
// É uma função pura (estado + ator + ação resulta em novo estado) justamente
// para rodar igual nos dois transportes: dentro do servidor WebSocket e dentro
// de uma transação do Firebase. Nenhum componente altera o estado por conta
// própria: tudo passa por applyAction.

import { RANKS, SUITS, isRank, isSuit, rankWeight, suitWeight } from './cards';
import { newId } from './ids';
import { DEFAULT_MANILHA, sanitizeManilha } from './manilha';
import { isPileSort } from './pileOrder';
import {
  MAX_CARDS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  type Action,
  type ActionEvent,
  type ActionResult,
  type CardSource,
  type CardState,
  type ErrorCode,
  type Place,
  type RoomState,
  type Zone,
} from './types';

type Rng = () => number;
type EventDraft = Omit<ActionEvent, 'rev' | 'by' | 'type'>;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/** Cartas de um lugar, da base para o topo (ou da esquerda para a direita). */
export const cardsIn = (state: RoomState, zone: Zone, owner: string | null = null): CardState[] =>
  Object.values(state.cards)
    .filter((c) => c.zone === zone && (zone === 'deck' || zone === 'table' || c.owner === owner))
    // O desempate por id deixa a ordem determinística mesmo se dois valores
    // de order coincidirem (o que só ocorreria com dado corrompido).
    .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));

const renumber = (cards: CardState[]): void => {
  cards.forEach((card, index) => {
    card.order = index;
  });
};

const placeOf = (card: CardState): Place => {
  if (card.zone === 'hand') return { zone: 'hand', playerId: card.owner ?? '' };
  if (card.zone === 'pile') return { zone: 'pile', pileId: card.owner ?? '' };
  return { zone: card.zone };
};

// ---------------------------------------------------------------------------
// Mutações internas (sempre sobre o clone feito em applyAction)
// ---------------------------------------------------------------------------

/** Id que ainda não existe na sala. A colisão é improvável, mas custaria uma carta. */
const freshId = (taken: Record<string, unknown>, rng: Rng): string => {
  let id = newId(rng);
  while (taken[id]) id = newId(rng);
  return id;
};

const shuffleInPlace = <T>(items: T[], rng: Rng): void => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
};

const shuffleDeck = (state: RoomState, rng: Rng): void => {
  const deck = cardsIn(state, 'deck');
  shuffleInPlace(deck, rng);
  renumber(deck);
};

const addDeckCards = (state: RoomState, rng: Rng): number => {
  let order = cardsIn(state, 'deck').length;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const id = freshId(state.cards, rng);
      state.cards[id] = { id, suit, rank, zone: 'deck', owner: null, order: order++, x: 0.5, y: 0.5, z: 0, faceUp: false };
    }
  }
  return SUITS.length * RANKS.length;
};

/**
 * Devolve a carta ao monte com um id NOVO. Sem isso, quem inspecionasse as
 * mensagens da rede poderia seguir o id de uma carta já vista e saber onde ela
 * reaparece depois de embaralhada.
 */
const sendToDeck = (state: RoomState, card: CardState, order: number, rng: Rng): void => {
  delete state.cards[card.id];
  card.id = freshId(state.cards, rng);
  card.zone = 'deck';
  card.owner = null;
  card.order = order;
  card.faceUp = false;
  state.cards[card.id] = card;
};

/** Depois que uma carta sai de um grupo: grupo de 1 vira carta solta, grupo vazio some. */
const settlePile = (state: RoomState, pileId: string): void => {
  const pile = state.piles[pileId];
  if (!pile) return;
  const rest = cardsIn(state, 'pile', pileId);
  if (rest.length >= 2) {
    renumber(rest);
    return;
  }
  if (rest.length === 1) {
    const last = rest[0];
    last.zone = 'table';
    last.owner = null;
    last.order = 0;
    last.x = pile.x;
    last.y = pile.y;
    last.z = pile.z;
  }
  delete state.piles[pileId];
};

const settleOrigin = (state: RoomState, from: Place): void => {
  if (from.zone === 'pile') settlePile(state, from.pileId);
  if (from.zone === 'hand') renumber(cardsIn(state, 'hand', from.playerId));
};

const takeSource = (
  state: RoomState,
  actorId: string,
  src: CardSource,
): { card: CardState; from: Place } | ErrorCode => {
  if (!src || typeof src !== 'object') return 'bad_action';
  if (src.from === 'deck') {
    const deck = cardsIn(state, 'deck');
    if (deck.length === 0) return 'deck_empty';
    const card = deck[deck.length - 1];
    return { card, from: { zone: 'deck' } };
  }
  if (src.from !== 'card' || typeof src.cardId !== 'string') return 'bad_action';
  const card = state.cards[src.cardId];
  // Carta do monte nunca é endereçável por id: o cliente não conhece esses ids.
  if (!card || card.zone === 'deck') return 'card_not_found';
  if (card.zone === 'hand' && card.owner !== actorId) return 'not_your_card';
  return { card, from: placeOf(card) };
};

/**
 * Face da carta ao pousar na mesa ou em um grupo. Quem já estava na mesa
 * mantém a face. Da mão sai aberta e do monte sai fechada, a menos que o
 * jogador peça outra coisa (o seletor "aberta/fechada" da interface).
 */
const landingFace = (from: Place, card: CardState, requested: unknown): boolean => {
  if (typeof requested === 'boolean') return requested;
  if (from.zone === 'table' || from.zone === 'pile') return card.faceUp;
  return from.zone === 'hand';
};

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

const run = (state: RoomState, actorId: string, action: Action, rng: Rng): EventDraft | ErrorCode => {
  switch (action.type) {
    case 'toHand': {
      const targetId = action.playerId ?? actorId;
      if (!state.players[targetId]) return 'player_not_found';
      const taken = takeSource(state, actorId, action.src);
      if (typeof taken === 'string') return taken;
      const { card, from } = taken;

      const hand = cardsIn(state, 'hand', targetId).filter((c) => c.id !== card.id);
      // "Antes da carta X" em vez de "na posição N": se a mão mudou enquanto a
      // mensagem viajava, a intenção continua valendo. Sem X, vai para o fim.
      let index = typeof action.beforeId === 'string' ? hand.findIndex((c) => c.id === action.beforeId) : -1;
      if (index < 0) index = hand.length;
      hand.splice(index, 0, card);

      card.zone = 'hand';
      card.owner = targetId;
      card.faceUp = true;
      renumber(hand);
      if (!(from.zone === 'hand' && from.playerId === targetId)) settleOrigin(state, from);
      return { cardId: card.id, from, to: { zone: 'hand', playerId: targetId } };
    }

    case 'toTable': {
      if (!isNum(action.x) || !isNum(action.y)) return 'bad_action';
      const taken = takeSource(state, actorId, action.src);
      if (typeof taken === 'string') return taken;
      const { card, from } = taken;

      card.faceUp = landingFace(from, card, action.faceUp);
      card.zone = 'table';
      card.owner = null;
      card.order = 0;
      card.x = clamp01(action.x);
      card.y = clamp01(action.y);
      card.z = ++state.z;
      settleOrigin(state, from);
      return { cardId: card.id, from, to: { zone: 'table' } };
    }

    case 'toPile':
    case 'stackOn': {
      const taken = takeSource(state, actorId, action.src);
      if (typeof taken === 'string') return taken;
      const { card, from } = taken;

      let pileId: string;
      if (action.type === 'toPile') {
        if (!state.piles[action.pileId]) return 'pile_not_found';
        pileId = action.pileId;
      } else {
        const target = state.cards[action.targetId];
        if (!target || target.id === card.id) return 'card_not_found';
        if (target.zone === 'pile' && target.owner && state.piles[target.owner]) {
          // O alvo entrou em um grupo enquanto a mensagem viajava: a intenção
          // de "juntar com aquela carta" vira "entrar no grupo dela".
          pileId = target.owner;
        } else if (target.zone === 'table') {
          pileId = freshId(state.piles, rng);
          state.piles[pileId] = {
            id: pileId,
            x: target.x,
            y: target.y,
            z: ++state.z,
            mode: action.mode === 'fan' ? 'fan' : 'stack',
            sort: 'manual',
          };
          target.zone = 'pile';
          target.owner = pileId;
          target.order = 0;
        } else {
          return 'card_not_found';
        }
      }

      const face = landingFace(from, card, action.faceUp);
      const samePile = from.zone === 'pile' && from.pileId === pileId;
      const members = cardsIn(state, 'pile', pileId).filter((c) => c.id !== card.id);
      // Mesma regra da mão: "antes da carta X", e não "na posição N". Se X
      // saiu do grupo enquanto a mensagem viajava, a carta vai para o topo.
      const beforeId = action.type === 'toPile' ? action.beforeId : null;
      let index = typeof beforeId === 'string' ? members.findIndex((c) => c.id === beforeId) : -1;
      if (index < 0) index = members.length;
      members.splice(index, 0, card);
      card.faceUp = face;
      card.zone = 'pile';
      card.owner = pileId;
      state.piles[pileId].z = ++state.z;
      renumber(members);
      if (!samePile) settleOrigin(state, from);
      return { cardId: card.id, from, to: { zone: 'pile', pileId } };
    }

    case 'toDeck': {
      const taken = takeSource(state, actorId, { from: 'card', cardId: action.cardId });
      if (typeof taken === 'string') return taken;
      const { card, from } = taken;
      const oldId = card.id;
      sendToDeck(state, card, cardsIn(state, 'deck').length, rng);
      settleOrigin(state, from);
      return { cardId: oldId, from, to: { zone: 'deck' } };
    }

    case 'flip': {
      const card = state.cards[action.cardId];
      if (!card || (card.zone !== 'table' && card.zone !== 'pile')) return 'card_not_found';
      card.faceUp = !card.faceUp;
      return { cardId: card.id };
    }

    case 'movePile': {
      const pile = state.piles[action.pileId];
      if (!pile) return 'pile_not_found';
      if (!isNum(action.x) || !isNum(action.y)) return 'bad_action';
      pile.x = clamp01(action.x);
      pile.y = clamp01(action.y);
      pile.z = ++state.z;
      return { to: { zone: 'pile', pileId: pile.id } };
    }

    case 'setManilha': {
      const config = sanitizeManilha(action.config);
      if (!config) return 'bad_action';
      state.manilha = config;
      return {};
    }

    case 'setPileSort': {
      const pile = state.piles[action.pileId];
      if (!pile) return 'pile_not_found';
      if (!isPileSort(action.sort)) return 'bad_action';
      pile.sort = action.sort;
      return { to: { zone: 'pile', pileId: pile.id } };
    }

    case 'sendPile': {
      const pile = state.piles[action.pileId];
      if (!pile) return 'pile_not_found';
      const to = action.to;
      if (!to || typeof to !== 'object') return 'bad_action';
      const members = cardsIn(state, 'pile', pile.id);
      const cardIds = members.map((card) => card.id);
      const from: Place = { zone: 'pile', pileId: pile.id };
      const count = members.length;

      // Une os dois grupos: as cartas do arrastado entram no fim da ordem
      // manual do outro, que mantém posição, modo e ordenação.
      const mergeInto = (targetId: string): EventDraft | ErrorCode => {
        const target = state.piles[targetId];
        if (!target || target.id === pile.id) return 'pile_not_found';
        let order = cardsIn(state, 'pile', target.id).length;
        for (const card of members) {
          card.owner = target.id;
          card.order = order++;
        }
        target.z = ++state.z;
        delete state.piles[pile.id];
        return { cardIds, from, to: { zone: 'pile', pileId: target.id }, count };
      };

      switch (to.zone) {
        case 'deck': {
          // Vão para o topo do monte na ordem do grupo, viradas e com id novo.
          let order = cardsIn(state, 'deck').length;
          for (const card of members) sendToDeck(state, card, order++, rng);
          delete state.piles[pile.id];
          return { cardIds, from, to: { zone: 'deck' }, count };
        }
        case 'hand': {
          const playerId = to.playerId ?? actorId;
          if (!state.players[playerId]) return 'player_not_found';
          let order = cardsIn(state, 'hand', playerId).length;
          for (const card of members) {
            card.zone = 'hand';
            card.owner = playerId;
            card.order = order++;
            card.faceUp = true;
          }
          delete state.piles[pile.id];
          return { cardIds, from, to: { zone: 'hand', playerId }, count };
        }
        case 'pile':
          return mergeInto(to.pileId);
        case 'card': {
          const target = state.cards[to.cardId];
          if (!target) return 'card_not_found';
          // O alvo entrou em um grupo enquanto a mensagem viajava: une com ele.
          if (target.zone === 'pile' && target.owner && target.owner !== pile.id) return mergeInto(target.owner);
          if (target.zone !== 'table') return 'card_not_found';
          // A carta solta vira a base do grupo, e o grupo vai para onde ela está.
          target.zone = 'pile';
          target.owner = pile.id;
          target.order = -1;
          renumber(cardsIn(state, 'pile', pile.id));
          pile.x = target.x;
          pile.y = target.y;
          pile.z = ++state.z;
          return { cardIds, from, to: { zone: 'pile', pileId: pile.id }, count: count + 1 };
        }
        default:
          return 'bad_action';
      }
    }

    case 'setPileMode': {
      const pile = state.piles[action.pileId];
      if (!pile) return 'pile_not_found';
      if (action.mode !== 'fan' && action.mode !== 'stack') return 'bad_action';
      pile.mode = action.mode;
      return { to: { zone: 'pile', pileId: pile.id } };
    }

    case 'shuffleDeck': {
      shuffleDeck(state, rng);
      return {};
    }

    case 'addDeck': {
      if (Object.keys(state.cards).length + SUITS.length * RANKS.length > MAX_CARDS) return 'bad_action';
      const count = addDeckCards(state, rng);
      // O baralho novo entra ordenado. Sem embaralhar, as próximas compras
      // sairiam em sequência de fábrica.
      shuffleDeck(state, rng);
      return { count };
    }

    case 'removeCards': {
      if (!Array.isArray(action.suits) || !Array.isArray(action.ranks)) return 'bad_action';
      const suits = action.suits.filter(isSuit);
      const ranks = action.ranks.filter(isRank);
      let count = 0;
      for (const card of cardsIn(state, 'deck')) {
        if (suits.includes(card.suit) || ranks.includes(card.rank)) {
          delete state.cards[card.id];
          count++;
        }
      }
      renumber(cardsIn(state, 'deck'));
      return { count };
    }

    case 'removeDeck': {
      // Quantas cópias de cada carta existem na sala, em qualquer lugar.
      const copies = new Map<string, number>();
      for (const card of Object.values(state.cards)) {
        const key = `${card.rank}:${card.suit}`;
        copies.set(key, (copies.get(key) ?? 0) + 1);
      }
      const deck = cardsIn(state, 'deck');
      let count = 0;
      let skipped = 0;
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          // A última cópia nunca sai: a mesa mantém pelo menos um baralho.
          if ((copies.get(`${rank}:${suit}`) ?? 0) < 2) continue;
          // Só sai carta do monte. Tirar da mão de alguém ou da mesa no meio
          // do jogo seria pior do que deixar a cópia extra onde está.
          const victim = deck.find((card) => card.suit === suit && card.rank === rank);
          if (!victim) {
            skipped++;
            continue;
          }
          delete state.cards[victim.id];
          count++;
        }
      }
      if (count === 0) return skipped > 0 ? 'deck_incomplete' : 'single_deck';
      renumber(cardsIn(state, 'deck'));
      return { count, skipped };
    }

    case 'resetToOneDeck': {
      // Começa do zero, e não do que existe: cartas removidas voltam,
      // baralhos extras saem e ninguém herda id de carta antiga.
      state.cards = {};
      state.piles = {};
      state.z = 0;
      const count = addDeckCards(state, rng);
      shuffleDeck(state, rng);
      return { count };
    }

    case 'reset': {
      const all = Object.values(state.cards);
      all.forEach((card, index) => sendToDeck(state, card, index, rng));
      state.piles = {};
      state.z = 0;
      shuffleDeck(state, rng);
      return { count: all.length };
    }

    case 'sortHand': {
      if (action.by !== 'rank' && action.by !== 'suit') return 'bad_action';
      const hand = cardsIn(state, 'hand', actorId);
      const byRank = (a: CardState, b: CardState) => rankWeight(b.rank) - rankWeight(a.rank);
      const bySuit = (a: CardState, b: CardState) => suitWeight(a.suit) - suitWeight(b.suit);
      hand.sort(action.by === 'rank' ? (a, b) => byRank(a, b) || bySuit(a, b) : (a, b) => bySuit(a, b) || byRank(a, b));
      renumber(hand);
      return { to: { zone: 'hand', playerId: actorId } };
    }

    case 'removePlayer': {
      const target = state.players[action.playerId];
      if (!target || target.id === actorId) return 'player_not_found';
      // Só dá para remover quem caiu. Remover alguém conectado seria expulsão,
      // e a mesa não tem dono para decidir isso.
      if (target.connected) return 'player_connected';
      dropPlayer(state, target.id, rng);
      return { from: { zone: 'hand', playerId: target.id }, to: { zone: 'deck' } };
    }

    default:
      return 'bad_action';
  }
};

export const applyAction = (
  prev: RoomState,
  actorId: string,
  action: Action,
  rng: Rng = Math.random,
): ActionResult => {
  if (!prev.players[actorId]) return { ok: false, error: 'not_in_room' };
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
    return { ok: false, error: 'bad_action' };
  }
  const state = structuredClone(prev);
  const outcome = run(state, actorId, action, rng);
  if (typeof outcome === 'string') return { ok: false, error: outcome };
  state.rev += 1;
  state.last = { ...outcome, rev: state.rev, by: actorId, type: action.type };
  return { ok: true, state };
};

// ---------------------------------------------------------------------------
// Sala e jogadores (fora de applyAction porque quem decide é o transporte)
// ---------------------------------------------------------------------------

export const createRoomState = (roomId: string, rng: Rng = Math.random): RoomState => {
  const state: RoomState = {
    v: 2,
    roomId,
    rev: 0,
    z: 0,
    players: {},
    cards: {},
    piles: {},
    manilha: structuredClone(DEFAULT_MANILHA),
    last: null,
  };
  addDeckCards(state, rng);
  shuffleDeck(state, rng);
  return state;
};

export const sanitizeName = (raw: unknown): string =>
  (typeof raw === 'string' ? raw : '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);

export const addPlayer = (prev: RoomState, playerId: string, rawName: unknown): ActionResult => {
  const name = sanitizeName(rawName);
  if (!name) return { ok: false, error: 'bad_action' };
  if (prev.players[playerId]) return { ok: true, state: prev };
  const taken = new Set(Object.values(prev.players).map((p) => p.seat));
  if (taken.size >= MAX_PLAYERS) return { ok: false, error: 'room_full' };
  let seat = 0;
  while (taken.has(seat)) seat++;
  const state = structuredClone(prev);
  state.players[playerId] = { id: playerId, name, seat, connected: true };
  return { ok: true, state };
};

/**
 * Tira o jogador e devolve a mão dele para o FUNDO do monte. O modelo antigo
 * apagava o jogador junto com as cartas, e o baralho ia encolhendo a cada saída.
 */
const dropPlayer = (state: RoomState, playerId: string, rng: Rng): void => {
  const hand = cardsIn(state, 'hand', playerId);
  const deck = cardsIn(state, 'deck');
  hand.forEach((card, index) => sendToDeck(state, card, index, rng));
  deck.forEach((card, index) => {
    card.order = hand.length + index;
  });
  delete state.players[playerId];
};

export const removePlayer = (prev: RoomState, playerId: string, rng: Rng = Math.random): RoomState => {
  if (!prev.players[playerId]) return prev;
  const state = structuredClone(prev);
  dropPlayer(state, playerId, rng);
  return state;
};

export const setConnected = (prev: RoomState, playerId: string, connected: boolean): RoomState => {
  const player = prev.players[playerId];
  if (!player || player.connected === connected) return prev;
  const state = structuredClone(prev);
  state.players[playerId].connected = connected;
  return state;
};

// ---------------------------------------------------------------------------
// Leitura defensiva (Firebase)
// ---------------------------------------------------------------------------

const num = (value: unknown, fallback = 0): number => (isNum(value) ? value : fallback);

type Raw = Record<string, unknown>;
const asRecord = (value: unknown): Raw => (value && typeof value === 'object' ? (value as Raw) : {});

/**
 * O Realtime Database apaga objetos vazios e valores null ao gravar, então
 * "players: {}" e "owner: null" voltam como undefined. Esta função devolve o
 * formato completo, ou null quando o dado não é uma sala v2.
 */
export const normalizeState = (raw: unknown): RoomState | null => {
  const root = asRecord(raw);
  if (root.v !== 2 || typeof root.roomId !== 'string') return null;
  const state: RoomState = {
    v: 2,
    roomId: root.roomId,
    rev: num(root.rev),
    z: num(root.z),
    players: {},
    cards: {},
    piles: {},
    // Sala salva antes da configuração de manilha existir: vale o padrão.
    manilha: sanitizeManilha(root.manilha) ?? structuredClone(DEFAULT_MANILHA),
    last: root.last && typeof root.last === 'object' ? (root.last as ActionEvent) : null,
  };
  for (const [id, value] of Object.entries(asRecord(root.players))) {
    const p = asRecord(value);
    // Um onDisconnect atrasado pode recriar só o campo "connected" de alguém
    // que já saiu. Jogador sem nome é esse resto, e é descartado.
    if (typeof p.name !== 'string' || !p.name) continue;
    state.players[id] = { id, name: p.name, seat: num(p.seat), connected: p.connected === true };
  }
  for (const [id, value] of Object.entries(asRecord(root.piles))) {
    const pile = asRecord(value);
    state.piles[id] = {
      id,
      x: num(pile.x, 0.5),
      y: num(pile.y, 0.5),
      z: num(pile.z),
      mode: pile.mode === 'fan' ? 'fan' : 'stack',
      // Salas criadas antes da ordenação existir não têm o campo.
      sort: isPileSort(pile.sort) ? pile.sort : 'manual',
    };
  }
  for (const [id, value] of Object.entries(asRecord(root.cards))) {
    const c = asRecord(value);
    if (!isSuit(c.suit) || !isRank(c.rank)) continue;
    const zone: Zone = c.zone === 'hand' || c.zone === 'table' || c.zone === 'pile' ? c.zone : 'deck';
    state.cards[id] = {
      id,
      suit: c.suit,
      rank: c.rank,
      zone,
      owner: typeof c.owner === 'string' ? c.owner : null,
      order: num(c.order),
      x: num(c.x, 0.5),
      y: num(c.y, 0.5),
      z: num(c.z),
      faceUp: c.faceUp === true,
    };
  }
  return state;
};
