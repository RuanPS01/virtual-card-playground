// Ordem de exibição das cartas de um grupo em leque.
//
// A ordem MANUAL (campo order) é sempre a que fica guardada. Ordenar por valor
// ou por manilha é só um jeito de exibir aplicado por cima dela, por todos os
// clientes do mesmo jeito. Por isso a ordenação se atualiza sozinha quando
// entram ou saem cartas, e voltar para "livre" recupera a ordem manual, com
// as cartas que entraram nesse meio tempo no fim.

import { rankWeight, suitWeight, type Rank, type Suit } from './cards';
import { DEFAULT_MANILHA, manilhaStrength, type ManilhaConfig } from './manilha';

export type PileSort = 'manual' | 'rank' | 'manilha';
export const PILE_SORTS: readonly PileSort[] = ['manual', 'rank', 'manilha'];

export const isPileSort = (value: unknown): value is PileSort => PILE_SORTS.includes(value as PileSort);

interface Sortable {
  id: string;
  order: number;
  suit: Suit | null;
  rank: Rank | null;
}

const byManual = (a: Sortable, b: Sortable): number => a.order - b.order || (a.id < b.id ? -1 : 1);

const compareFor = (sort: Exclude<PileSort, 'manual'>, manilha: ManilhaConfig) =>
  sort === 'rank'
    ? // Do 2 ao Ás (Ás alto), naipe como desempate.
      (a: Sortable, b: Sortable) => rankWeight(a.rank!) - rankWeight(b.rank!) || suitWeight(a.suit!) - suitWeight(b.suit!)
    : // Da mais fraca à mais forte, pela ordem de manilha da sala.
      (a: Sortable, b: Sortable) => manilhaStrength(manilha, a.rank!, a.suit!) - manilhaStrength(manilha, b.rank!, b.suit!);

/**
 * Cartas na ordem em que aparecem no leque, da esquerda para a direita.
 *
 * Cartas viradas para baixo (sem naipe e valor na visão do jogador) nunca
 * entram na ordenação: ficam no fim, na ordem manual. Ordená-las pelo valor
 * escondido revelaria o valor pela posição.
 */
export const sortPile = <T extends Sortable>(cards: readonly T[], sort: PileSort, manilha: ManilhaConfig = DEFAULT_MANILHA): T[] => {
  const manual = [...cards].sort(byManual);
  if (sort === 'manual') return manual;
  const known = manual.filter((card) => card.suit && card.rank);
  const hidden = manual.filter((card) => !card.suit || !card.rank);
  // Array.prototype.sort é estável: cartas iguais (dois baralhos) mantêm a
  // ordem manual entre si.
  return [...known.sort(compareFor(sort, manilha)), ...hidden];
};
