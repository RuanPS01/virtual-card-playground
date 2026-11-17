import { describe, expect, it } from 'vitest';
import type { Rank, Suit } from '../cards';
import { sortPile } from '../pileOrder';

const card = (id: string, order: number, rank: Rank | null, suit: Suit | null) => ({ id, order, rank, suit });
const labels = (cards: ReturnType<typeof card>[]) => cards.map((c) => (c.rank ? `${c.rank}${c.suit![0]}` : `?${c.id}`));

describe('ordem do leque', () => {
  const pile = [
    card('a', 0, '3', 'spades'),
    card('b', 1, 'K', 'hearts'),
    card('c', 2, '4', 'clubs'),
    card('d', 3, 'A', 'diamonds'),
    card('e', 4, '7', 'hearts'),
    card('f', 5, '2', 'clubs'),
  ];

  it('livre segue a ordem manual', () => {
    expect(labels(sortPile([...pile].reverse(), 'manual'))).toEqual(['3s', 'Kh', '4c', 'Ad', '7h', '2c']);
  });

  it('valor vai do 2 ao Ás', () => {
    expect(labels(sortPile(pile, 'rank'))).toEqual(['2c', '3s', '4c', '7h', 'Kh', 'Ad']);
  });

  it('manilha segue a força do truco, do 4 ao 3', () => {
    expect(labels(sortPile(pile, 'manilha'))).toEqual(['4c', '7h', 'Kh', 'Ad', '2c', '3s']);
  });

  it('manilha desempata pelo naipe: ouros, espadas, copas, paus', () => {
    const fours = [card('p', 0, '4', 'clubs'), card('h', 1, '4', 'hearts'), card('o', 2, '4', 'diamonds'), card('e', 3, '4', 'spades')];
    expect(labels(sortPile(fours, 'manilha'))).toEqual(['4d', '4s', '4h', '4c']);
  });

  it('cartas fechadas ficam no fim, na ordem manual, sem entrar na ordenação', () => {
    const mixed = [card('x', 0, null, null), card('k', 1, 'K', 'spades'), card('y', 2, null, null), card('two', 3, '2', 'hearts')];
    expect(labels(sortPile(mixed, 'rank'))).toEqual(['2h', 'Ks', '?x', '?y']);
  });

  it('cartas iguais (dois baralhos) mantêm a ordem manual entre si', () => {
    const twins = [card('second', 1, '5', 'hearts'), card('first', 0, '5', 'hearts')];
    expect(sortPile(twins, 'rank').map((c) => c.id)).toEqual(['first', 'second']);
  });
});
