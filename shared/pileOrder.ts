// Ordem de exibição das cartas de um grupo em leque.
//
// A ordem MANUAL (campo order) é sempre a que fica guardada. Ordenar por valor
// ou por manilha é só um jeito de exibir aplicado por cima dela, por todos os
// clientes do mesmo jeito. Por isso a ordenação se atualiza sozinha quando
// entram ou saem cartas, e voltar para "livre" recupera a ordem manual, com
// as cartas que entraram nesse meio tempo no fim.

import { rankWeight, suitWeight, type Rank, type Suit } from './cards';

export type PileSort = 'manual' | 'rank' | 'manilha';
export const PILE_SORTS: readonly PileSort[] = ['manual', 'rank', 'manilha'];

export const isPileSort = (value: unknown): value is PileSort => PILE_SORTS.includes(value as PileSort);

/**
 * Força das cartas no truco, da mais fraca para a mais forte. O 8, o 9 e o 10
 * não existem no baralho de truco; se estiverem no grupo, ficam depois do 7,
 * na posição natural.
 */
const MANILHA_RANKS: readonly Rank[] = ['4', '5', '6', '7', '8', '9', '10', 'Q', 'J', 'K', 'A', '2', '3'];
/** Naipes das manilhas, do mais fraco para o mais forte: ouros, espadas, copas, paus. */
const MANILHA_SUITS: readonly Suit[] = ['diamonds', 'spades', 'hearts', 'clubs'];

interface Sortable {
  id: string;
  order: number;
  suit: Suit | null;
  rank: Rank | null;
}

const byManual = (a: Sortable, b: Sortable): number => a.order - b.order || (a.id < b.id ? -1 : 1);

const compareFor = (sort: Exclude<PileSort, 'manual'>) =>
  sort === 'rank'
    ? // Do 2 ao Ás (Ás alto), naipe como desempate.
      (a: Sortable, b: Sortable) => rankWeight(a.rank!) - rankWeight(b.rank!) || suitWeight(a.suit!) - suitWeight(b.suit!)
    : (a: Sortable, b: Sortable) =>
        MANILHA_RANKS.indexOf(a.rank!) - MANILHA_RANKS.indexOf(b.rank!) ||
        MANILHA_SUITS.indexOf(a.suit!) - MANILHA_SUITS.indexOf(b.suit!);

/**
 * Cartas na ordem em que aparecem no leque, da esquerda para a direita.
 *
 * Cartas viradas para baixo (sem naipe e valor na visão do jogador) nunca
 * entram na ordenação: ficam no fim, na ordem manual. Ordená-las pelo valor
 * escondido revelaria o valor pela posição.
 */
export const sortPile = <T extends Sortable>(cards: readonly T[], sort: PileSort): T[] => {
  const manual = [...cards].sort(byManual);
  if (sort === 'manual') return manual;
  const known = manual.filter((card) => card.suit && card.rank);
  const hidden = manual.filter((card) => !card.suit || !card.rank);
  // Array.prototype.sort é estável: cartas iguais (dois baralhos) mantêm a
  // ordem manual entre si.
  return [...known.sort(compareFor(sort)), ...hidden];
};
