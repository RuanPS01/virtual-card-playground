// Ordem de manilha da sala: a força das cartas usada para ordenar um leque
// "por manilha". É configuração da SALA, e não de cada jogador: o leque
// ordenado tem que aparecer igual para todos.
//
// A força de uma carta, da mais fraca para a mais forte, é:
//   1. a posição do valor em `ranks`, com o naipe em `suits` como desempate;
//   2. acima de todas elas, as `manilhas`, na ordem da lista.

import { RANKS, SUITS, isRank, isSuit, type Rank, type Suit } from './cards';

export type ManilhaPreset = 'paulista' | 'vira' | 'mineiro' | 'gaucho' | 'custom';
export const MANILHA_PRESETS: readonly ManilhaPreset[] = ['paulista', 'vira', 'mineiro', 'gaucho', 'custom'];

export interface ManilhaCard {
  rank: Rank;
  suit: Suit;
}

export interface ManilhaConfig {
  preset: ManilhaPreset;
  /** Todos os 13 valores, do mais fraco ao mais forte. */
  ranks: Rank[];
  /** Os 4 naipes, do mais fraco ao mais forte (desempate e ordem das manilhas da vira). */
  suits: Suit[];
  /** Cartas acima de todas as outras, da mais fraca à mais forte. */
  manilhas: ManilhaCard[];
  /** Só na predefinição "vira": o valor da vira. A manilha é o valor seguinte. */
  vira: Rank | null;
}

/** Força do truco, do 4 ao 3. O 8, o 9 e o 10 não existem no truco; ficam depois do 7. */
export const TRUCO_RANKS: readonly Rank[] = ['4', '5', '6', '7', '8', '9', '10', 'Q', 'J', 'K', 'A', '2', '3'];
/** Ordem dos naipes das manilhas no truco: ouros, espadas, copas, paus. */
export const TRUCO_SUITS: readonly Suit[] = ['diamonds', 'spades', 'hearts', 'clubs'];
/** Valores do baralho de truco (sem 8, 9 e 10), na ordem em que a vira "gira". */
export const VIRA_RANKS: readonly Rank[] = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

const card = (rank: Rank, suit: Suit): ManilhaCard => ({ rank, suit });

/** A manilha é o valor seguinte ao da vira; depois do 3 volta ao 4. */
export const manilhaRankForVira = (vira: Rank): Rank => {
  const index = VIRA_RANKS.indexOf(vira);
  return VIRA_RANKS[(index + 1) % VIRA_RANKS.length];
};

/**
 * Configuração completa de uma predefinição. Fixas (mineiro, gaúcho), da
 * manilha mais fraca para a mais forte:
 *   mineiro: pica-fumo (7 de ouros), espadilha (Ás de espadas), 7 de copas, zap (4 de paus)
 *   gaúcho:  7 de ouros, 7 de espadas, bastião (Ás de paus), espadão (Ás de espadas)
 */
export const presetConfig = (preset: Exclude<ManilhaPreset, 'custom'>, vira: Rank = '3'): ManilhaConfig => {
  const base = { preset, ranks: [...TRUCO_RANKS], suits: [...TRUCO_SUITS], vira: null };
  switch (preset) {
    case 'paulista':
      return { ...base, manilhas: [] };
    case 'vira': {
      const safeVira = VIRA_RANKS.includes(vira) ? vira : '3';
      const rank = manilhaRankForVira(safeVira);
      return { ...base, vira: safeVira, manilhas: TRUCO_SUITS.map((suit) => card(rank, suit)) };
    }
    case 'mineiro':
      return { ...base, manilhas: [card('7', 'diamonds'), card('A', 'spades'), card('7', 'hearts'), card('4', 'clubs')] };
    case 'gaucho':
      return { ...base, manilhas: [card('7', 'diamonds'), card('7', 'spades'), card('A', 'clubs'), card('A', 'spades')] };
  }
};

export const DEFAULT_MANILHA: ManilhaConfig = presetConfig('paulista');

const isPermutation = <T>(value: unknown, all: readonly T[], check: (item: unknown) => item is T): value is T[] =>
  Array.isArray(value) && value.length === all.length && value.every(check) && new Set(value).size === all.length;

/**
 * Valida e completa uma configuração vinda de fora (cliente ou banco).
 * Predefinições são sempre recalculadas a partir do nome: o cliente não
 * consegue gravar uma "mineiro" adulterada. Devolve null se for inválida.
 */
export const sanitizeManilha = (raw: unknown): ManilhaConfig | null => {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const preset = value.preset;
  if (!MANILHA_PRESETS.includes(preset as ManilhaPreset)) return null;
  if (preset !== 'custom') {
    return presetConfig(preset as Exclude<ManilhaPreset, 'custom'>, isRank(value.vira) ? value.vira : undefined);
  }
  if (!isPermutation(value.ranks, RANKS, isRank) || !isPermutation(value.suits, SUITS, isSuit)) return null;
  // O banco apaga lista vazia: sem manilhas chega como undefined.
  const rawManilhas = value.manilhas ?? [];
  if (!Array.isArray(rawManilhas) || rawManilhas.length > RANKS.length * SUITS.length) return null;
  const manilhas: ManilhaCard[] = [];
  const seen = new Set<string>();
  for (const item of rawManilhas) {
    const entry = item as Record<string, unknown>;
    if (!entry || !isRank(entry.rank) || !isSuit(entry.suit)) return null;
    const key = `${entry.rank}:${entry.suit}`;
    if (seen.has(key)) return null;
    seen.add(key);
    manilhas.push(card(entry.rank, entry.suit));
  }
  return { preset: 'custom', ranks: [...value.ranks], suits: [...value.suits], manilhas, vira: null };
};

/** Força de uma carta: maior é mais forte. Manilhas ficam acima de tudo. */
export const manilhaStrength = (config: ManilhaConfig, rank: Rank, suit: Suit): number => {
  const special = config.manilhas.findIndex((m) => m.rank === rank && m.suit === suit);
  if (special >= 0) return 1000 + special;
  return config.ranks.indexOf(rank) * SUITS.length + config.suits.indexOf(suit);
};
