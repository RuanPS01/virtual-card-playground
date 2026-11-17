import type { Rank, Suit } from './cards';
import type { PileSort } from './pileOrder';

// ---------------------------------------------------------------------------
// Estado autoritativo da sala
// ---------------------------------------------------------------------------

export type Zone = 'deck' | 'hand' | 'table' | 'pile';
export type PileMode = 'fan' | 'stack';

/**
 * Uma carta é uma entidade com endereço próprio (zona + dono + ordem).
 * O modelo antigo guardava arrays por lugar e movia cartas por ÍNDICE, e dois
 * jogadores agindo ao mesmo tempo trocavam ou perdiam cartas. Aqui toda ação
 * referencia a carta pelo id, então a ordem de chegada nunca muda o alvo.
 */
export interface CardState {
  id: string;
  suit: Suit;
  rank: Rank;
  zone: Zone;
  /** playerId quando zone = hand, pileId quando zone = pile, null nas demais. */
  owner: string | null;
  /** Posição dentro do monte, da mão ou do grupo. Maior = mais no topo ou à direita. */
  order: number;
  /** Centro da carta na mesa, normalizado de 0 a 1. Só vale em zone = table. */
  x: number;
  y: number;
  /** Camada na mesa: quem foi tocado por último fica por cima. */
  z: number;
  faceUp: boolean;
}

export interface PileState {
  id: string;
  /** Centro do grupo, normalizado de 0 a 1. */
  x: number;
  y: number;
  z: number;
  mode: PileMode;
  /** Ordem de exibição no leque. A ordem manual (order das cartas) fica guardada por baixo. */
  sort: PileSort;
}

export interface PlayerState {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
}

export interface RoomState {
  /** Versão do formato. Salas antigas (sem v) são tratadas como inexistentes. */
  v: 2;
  roomId: string;
  /** Sobe 1 a cada ação aplicada. O cliente usa para saber se já viu o evento. */
  rev: number;
  /** Contador de camadas da mesa. */
  z: number;
  players: Record<string, PlayerState>;
  cards: Record<string, CardState>;
  piles: Record<string, PileState>;
  /** Última ação aplicada. Alimenta sons, partículas e origem das animações. */
  last: ActionEvent | null;
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

/** De onde sai a carta: o topo do monte (id desconhecido do cliente) ou uma carta visível. */
export type CardSource = { from: 'deck' } | { from: 'card'; cardId: string };

export type Action =
  | { type: 'toHand'; src: CardSource; playerId?: string; beforeId?: string | null }
  | { type: 'toTable'; src: CardSource; x: number; y: number; faceUp?: boolean }
  /** beforeId posiciona a carta no grupo, como na mão. Sem ele, vai para o topo. */
  | { type: 'toPile'; src: CardSource; pileId: string; faceUp?: boolean; beforeId?: string | null }
  | { type: 'stackOn'; src: CardSource; targetId: string; mode?: PileMode; faceUp?: boolean }
  | { type: 'toDeck'; cardId: string }
  | { type: 'flip'; cardId: string }
  | { type: 'movePile'; pileId: string; x: number; y: number }
  | { type: 'setPileMode'; pileId: string; mode: PileMode }
  | { type: 'setPileSort'; pileId: string; sort: PileSort }
  /** Leva o grupo inteiro de uma vez, como se fosse uma carta só. */
  | { type: 'sendPile'; pileId: string; to: PileDestination }
  | { type: 'shuffleDeck' }
  | { type: 'addDeck' }
  | { type: 'removeCards'; suits: Suit[]; ranks: Rank[] }
  /** Tira do monte uma cópia de cada carta: desfaz um "adicionar baralho". */
  | { type: 'removeDeck' }
  | { type: 'reset' }
  /** Recolhe tudo e deixa só um baralho original de 52 cartas. */
  | { type: 'resetToOneDeck' }
  | { type: 'sortHand'; by: 'rank' | 'suit' }
  | { type: 'removePlayer'; playerId: string };

/** Destinos de um grupo inteiro: os mesmos de uma carta, menos a posição na mesa. */
export type PileDestination =
  | { zone: 'deck' }
  | { zone: 'hand'; playerId?: string }
  | { zone: 'pile'; pileId: string }
  /** Carta solta na mesa: ela vira a base do grupo. */
  | { zone: 'card'; cardId: string };

export type ActionType = Action['type'];

export type ErrorCode =
  | 'bad_action'
  | 'not_in_room'
  | 'card_not_found'
  | 'not_your_card'
  | 'deck_empty'
  | 'single_deck'
  | 'deck_incomplete'
  | 'pile_not_found'
  | 'player_not_found'
  | 'player_connected'
  | 'room_not_found'
  | 'room_full'
  | 'bad_session'
  | 'offline'
  | 'timeout'
  | 'rate_limited';

export type ActionResult = { ok: true; state: RoomState } | { ok: false; error: ErrorCode };

export type Place =
  | { zone: 'deck' }
  | { zone: 'hand'; playerId: string }
  | { zone: 'table' }
  | { zone: 'pile'; pileId: string };

export interface ActionEvent {
  rev: number;
  by: string;
  type: ActionType;
  /** Id da carta ANTES da ação. Ao voltar para o monte a carta troca de id. */
  cardId?: string;
  from?: Place;
  to?: Place;
  /** Quantidade afetada (baralho adicionado, cartas removidas). */
  count?: number;
  /** Ids (antes da ação) das cartas movidas juntas, como as de um grupo inteiro. */
  cardIds?: string[];
  /** Cartas que deveriam sair mas ficaram (estavam fora do monte). */
  skipped?: number;
}

// ---------------------------------------------------------------------------
// Visão por jogador
// ---------------------------------------------------------------------------

/**
 * O que UM jogador pode saber. Cartas viradas para baixo chegam sem naipe e
 * valor, o monte chega só como contagem e a mão dos outros também.
 */
export interface CardView {
  id: string;
  zone: 'hand' | 'table' | 'pile';
  pileId: string | null;
  order: number;
  x: number;
  y: number;
  z: number;
  faceUp: boolean;
  suit: Suit | null;
  rank: Rank | null;
}

export interface PlayerView {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  handCount: number;
}

export interface RoomView {
  roomId: string;
  rev: number;
  me: string;
  players: PlayerView[];
  deckCount: number;
  cards: CardView[];
  piles: PileState[];
  last: ActionEvent | null;
}

// ---------------------------------------------------------------------------
// Mensagens efêmeras (não alteram o estado)
// ---------------------------------------------------------------------------

/** Posição de algo que um jogador está arrastando agora. Nunca é persistida. */
export type LiveMessage =
  | { kind: 'drag'; target: 'card' | 'pile'; id: string; x: number; y: number }
  | { kind: 'end' };

export const MAX_PLAYERS = 8;
export const MAX_NAME_LENGTH = 20;
/** Teto de cartas na sala. Evita que alguém adicione baralhos sem parar. */
export const MAX_CARDS = 52 * 8;
