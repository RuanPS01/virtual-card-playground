import { describe, expect, it } from 'vitest';
import { RANKS, type Rank, type Suit } from '../cards';
import { DEFAULT_MANILHA, manilhaRankForVira, manilhaStrength, presetConfig, sanitizeManilha, type ManilhaConfig } from '../manilha';
import { sortPile } from '../pileOrder';

const fan = (...labels: string[]) =>
  labels.map((label, order) => {
    const suit = ({ c: 'clubs', h: 'hearts', s: 'spades', d: 'diamonds' } as const)[label.at(-1) as 'c'];
    return { id: label, order, rank: label.slice(0, -1) as Rank, suit: suit as Suit };
  });
const ids = (cards: { id: string }[]) => cards.map((c) => c.id);

describe('predefinições de manilha', () => {
  it('paulista sem vira é o padrão: do 4 ao 3, sem manilhas', () => {
    expect(DEFAULT_MANILHA).toMatchObject({ preset: 'paulista', manilhas: [] });
    expect(ids(sortPile(fan('3s', 'Kh', '4c', 'Ad'), 'manilha'))).toEqual(['4c', 'Kh', 'Ad', '3s']);
  });

  it('a manilha é o valor seguinte ao da vira, e depois do 3 volta ao 4', () => {
    expect(manilhaRankForVira('4')).toBe('5');
    expect(manilhaRankForVira('7')).toBe('Q');
    expect(manilhaRankForVira('3')).toBe('4');
    const config = presetConfig('vira', '7');
    expect(config.manilhas).toEqual([
      { rank: 'Q', suit: 'diamonds' },
      { rank: 'Q', suit: 'spades' },
      { rank: 'Q', suit: 'hearts' },
      { rank: 'Q', suit: 'clubs' },
    ]);
    // Com vira 7, as damas passam o 3 e o zap é a dama de paus.
    expect(ids(sortPile(fan('Qc', '3s', 'Qd', 'Kh'), 'manilha', config))).toEqual(['Kh', '3s', 'Qd', 'Qc']);
  });

  it('mineiro: zap, 7 de copas, espadilha e pica-fumo acima do 3', () => {
    const config = presetConfig('mineiro');
    const sorted = ids(sortPile(fan('4c', '3s', '7d', 'As', '7h', '4d', 'Ah'), 'manilha', config));
    expect(sorted).toEqual(['4d', 'Ah', '3s', '7d', 'As', '7h', '4c']);
  });

  it('gaúcho: espadão, bastião, 7 de espadas e 7 de ouros acima do 3', () => {
    const config = presetConfig('gaucho');
    const sorted = ids(sortPile(fan('As', 'Ac', '7s', '7d', '3h', '7c'), 'manilha', config));
    expect(sorted).toEqual(['7c', '3h', '7d', '7s', 'Ac', 'As']);
  });
});

describe('configuração personalizada', () => {
  const custom: ManilhaConfig = {
    preset: 'custom',
    ranks: [...RANKS],
    suits: ['clubs', 'diamonds', 'hearts', 'spades'],
    manilhas: [{ rank: '2', suit: 'clubs' }],
    vira: null,
  };

  it('usa a ordem de valores, a de naipes e as manilhas escolhidas', () => {
    const config = sanitizeManilha(custom)!;
    expect(config).toEqual(custom);
    expect(manilhaStrength(config, '2', 'clubs')).toBeGreaterThan(manilhaStrength(config, 'K', 'spades'));
    expect(ids(sortPile(fan('Ks', 'Kc', '2c', 'Ah'), 'manilha', config))).toEqual(['Ah', 'Kc', 'Ks', '2c']);
  });

  it('recusa listas incompletas, repetidas ou com cartas inválidas', () => {
    expect(sanitizeManilha({ ...custom, ranks: RANKS.slice(1) })).toBeNull();
    expect(sanitizeManilha({ ...custom, suits: ['clubs', 'clubs', 'hearts', 'spades'] })).toBeNull();
    expect(sanitizeManilha({ ...custom, manilhas: [{ rank: '2', suit: 'clubs' }, { rank: '2', suit: 'clubs' }] })).toBeNull();
    expect(sanitizeManilha({ ...custom, manilhas: [{ rank: '11', suit: 'clubs' }] })).toBeNull();
    expect(sanitizeManilha({ ...custom, preset: 'qualquer' })).toBeNull();
    expect(sanitizeManilha(null)).toBeNull();
  });

  it('aceita personalizado sem manilhas (o banco apaga a lista vazia)', () => {
    const { manilhas: _drop, ...rest } = custom;
    expect(sanitizeManilha(rest)).toMatchObject({ preset: 'custom', manilhas: [] });
  });

  it('predefinição é sempre recalculada, mesmo que o cliente mande outras listas', () => {
    const forged = { ...presetConfig('mineiro'), manilhas: [{ rank: '2', suit: 'hearts' }], ranks: [...RANKS].reverse() };
    expect(sanitizeManilha(forged)).toEqual(presetConfig('mineiro'));
    expect(sanitizeManilha({ preset: 'vira', vira: '9' })).toEqual(presetConfig('vira', '3'));
  });
});
