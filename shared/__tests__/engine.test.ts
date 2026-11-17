import { describe, expect, it } from 'vitest';
import { addPlayer, applyAction, cardsIn, createRoomState, normalizeState, removePlayer, setConnected } from '../engine';
import type { Action, RoomState } from '../types';
import { viewFor } from '../view';

// Gerador determinístico para os testes não dependerem de sorte.
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const room = (): RoomState => {
  let state = createRoomState('TEST22', seeded());
  for (const [id, name] of [['p1', 'Ana'], ['p2', 'Bia']] as const) {
    const joined = addPlayer(state, id, name);
    if (!joined.ok) throw new Error('join');
    state = joined.state;
  }
  return state;
};

// Um gerador só para todas as ações: reiniciar a semente a cada chamada
// repetiria os mesmos ids e esconderia colisões.
const actionRng = seeded(7);

const must = (state: RoomState, actor: string, action: Action): RoomState => {
  const result = applyAction(state, actor, action, actionRng);
  if (!result.ok) throw new Error(`${action.type}: ${(result as { error: string }).error}`);
  return result.state;
};

const draw = (state: RoomState, actor: string): RoomState => must(state, actor, { type: 'toHand', src: { from: 'deck' } });
const handIds = (state: RoomState, player: string): string[] => cardsIn(state, 'hand', player).map((c) => c.id);
const total = (state: RoomState): number => Object.keys(state.cards).length;

describe('sala', () => {
  it('nasce com 52 cartas no monte, sem repetição', () => {
    const state = createRoomState('AAAAAA', seeded());
    expect(cardsIn(state, 'deck')).toHaveLength(52);
    expect(new Set(Object.values(state.cards).map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });

  it('dá o menor assento livre a quem entra', () => {
    let state = room();
    state = removePlayer(state, 'p1');
    const joined = addPlayer(state, 'p3', '  Caio   Silva ');
    expect(joined.ok && joined.state.players.p3).toMatchObject({ seat: 0, name: 'Caio Silva' });
  });

  it('recusa quem não está na sala', () => {
    expect(applyAction(room(), 'intruso', { type: 'shuffleDeck' })).toEqual({ ok: false, error: 'not_in_room' });
  });
});

describe('compra e mão', () => {
  it('compra do topo do monte para a própria mão', () => {
    const before = room();
    const top = cardsIn(before, 'deck').at(-1)!;
    const state = draw(before, 'p1');
    expect(handIds(state, 'p1')).toEqual([top.id]);
    expect(cardsIn(state, 'deck')).toHaveLength(51);
    expect(state.last).toMatchObject({ type: 'toHand', by: 'p1', from: { zone: 'deck' } });
  });

  it('reordena por id, e não por índice', () => {
    let state = room();
    for (let i = 0; i < 4; i++) state = draw(state, 'p1');
    const [a, b, c, d] = handIds(state, 'p1');
    state = must(state, 'p1', { type: 'toHand', src: { from: 'card', cardId: d }, beforeId: a });
    expect(handIds(state, 'p1')).toEqual([d, a, b, c]);
    state = must(state, 'p1', { type: 'toHand', src: { from: 'card', cardId: d }, beforeId: null });
    expect(handIds(state, 'p1')).toEqual([a, b, c, d]);
  });

  it('mantém a intenção quando a mão mudou no meio do caminho', () => {
    let state = room();
    for (let i = 0; i < 3; i++) state = draw(state, 'p1');
    const [a, b, c] = handIds(state, 'p1');
    // b sai da mão antes de chegar o pedido "coloque c antes de b".
    state = must(state, 'p1', { type: 'toTable', src: { from: 'card', cardId: b }, x: 0.2, y: 0.2 });
    state = must(state, 'p1', { type: 'toHand', src: { from: 'card', cardId: a }, beforeId: b });
    expect(handIds(state, 'p1')).toEqual([c, a]);
    expect(total(state)).toBe(52);
  });

  it('impede mexer na mão de outro jogador', () => {
    const state = draw(room(), 'p1');
    const [card] = handIds(state, 'p1');
    const result = applyAction(state, 'p2', { type: 'toTable', src: { from: 'card', cardId: card }, x: 0.5, y: 0.5 });
    expect(result).toEqual({ ok: false, error: 'not_your_card' });
  });

  it('entrega carta para outro jogador', () => {
    let state = draw(room(), 'p1');
    const [card] = handIds(state, 'p1');
    state = must(state, 'p1', { type: 'toHand', src: { from: 'card', cardId: card }, playerId: 'p2' });
    expect(handIds(state, 'p1')).toEqual([]);
    expect(handIds(state, 'p2')).toEqual([card]);
  });

  it('ordena a mão por valor e por naipe', () => {
    let state = room();
    for (let i = 0; i < 6; i++) state = draw(state, 'p1');
    state = must(state, 'p1', { type: 'sortHand', by: 'rank' });
    const weights = cardsIn(state, 'hand', 'p1').map((c) => (c.rank === 'A' ? 14 : ['2','3','4','5','6','7','8','9','10','J','Q','K'].indexOf(c.rank) + 2));
    expect(weights).toEqual([...weights].sort((x, y) => y - x));
    state = must(state, 'p1', { type: 'sortHand', by: 'suit' });
    const suits = cardsIn(state, 'hand', 'p1').map((c) => ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(c.suit));
    expect(suits).toEqual([...suits].sort((x, y) => x - y));
  });
});

describe('mesa', () => {
  it('limita a posição ao intervalo de 0 a 1 e sobe a camada a cada movimento', () => {
    let state = room();
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 3, y: -2 });
    state = must(state, 'p2', { type: 'toTable', src: { from: 'deck' }, x: 0.4, y: 0.4 });
    const [first, second] = cardsIn(state, 'table').sort((a, b) => a.z - b.z);
    expect(first).toMatchObject({ x: 1, y: 0, faceUp: false });
    state = must(state, 'p1', { type: 'toTable', src: { from: 'card', cardId: first.id }, x: 0.1, y: 0.1 });
    expect(state.cards[first.id].z).toBeGreaterThan(state.cards[second.id].z);
  });

  it('da mão sai aberta, do monte sai fechada, e o pedido explícito prevalece', () => {
    let state = draw(room(), 'p1');
    const [card] = handIds(state, 'p1');
    state = must(state, 'p1', { type: 'toTable', src: { from: 'card', cardId: card }, x: 0.5, y: 0.5 });
    expect(state.cards[card].faceUp).toBe(true);
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 0.5, y: 0.5, faceUp: true });
    expect(cardsIn(state, 'table').every((c) => c.faceUp)).toBe(true);
    state = must(state, 'p1', { type: 'flip', cardId: card });
    expect(state.cards[card].faceUp).toBe(false);
  });

  it('rejeita coordenada que não é número', () => {
    const result = applyAction(room(), 'p1', { type: 'toTable', src: { from: 'deck' }, x: Number.NaN, y: 0.5 });
    expect(result).toEqual({ ok: false, error: 'bad_action' });
  });
});

describe('grupos', () => {
  const twoOnTable = () => {
    let state = room();
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 0.3, y: 0.3 });
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 0.6, y: 0.6 });
    const [a, b] = cardsIn(state, 'table').sort((x, y) => x.z - y.z).map((c) => c.id);
    return { state, a, b };
  };

  it('soltar carta sobre carta cria um grupo na posição do alvo', () => {
    const { state: start, a, b } = twoOnTable();
    const state = must(start, 'p1', { type: 'stackOn', src: { from: 'card', cardId: b }, targetId: a });
    const [pile] = Object.values(state.piles);
    expect(pile).toMatchObject({ x: 0.3, y: 0.3, mode: 'stack' });
    expect(cardsIn(state, 'pile', pile.id).map((c) => c.id)).toEqual([a, b]);
  });

  it('grupo que fica com uma carta volta a ser carta solta', () => {
    const { state: start, a, b } = twoOnTable();
    let state = must(start, 'p1', { type: 'stackOn', src: { from: 'card', cardId: b }, targetId: a });
    state = must(state, 'p2', { type: 'toHand', src: { from: 'card', cardId: b } });
    expect(state.piles).toEqual({});
    expect(state.cards[a]).toMatchObject({ zone: 'table', owner: null, x: 0.3, y: 0.3 });
  });

  it('dois jogadores tirando cartas diferentes do mesmo grupo não se atrapalham', () => {
    const { state: start, a, b } = twoOnTable();
    let state = must(start, 'p1', { type: 'stackOn', src: { from: 'card', cardId: b }, targetId: a });
    const pileId = Object.keys(state.piles)[0];
    state = must(state, 'p1', { type: 'toPile', src: { from: 'deck' }, pileId });
    const third = cardsIn(state, 'pile', pileId).at(-1)!.id;
    // O modelo antigo mandava "tire o índice 2" e "tire o índice 1": o segundo
    // pedido pegava a carta errada. Por id, cada um leva a sua.
    state = must(state, 'p1', { type: 'toHand', src: { from: 'card', cardId: third } });
    state = must(state, 'p2', { type: 'toHand', src: { from: 'card', cardId: b } });
    expect(handIds(state, 'p1')).toEqual([third]);
    expect(handIds(state, 'p2')).toEqual([b]);
    expect(total(state)).toBe(52);
  });

  it('juntar com carta que já entrou em um grupo entra no grupo dela', () => {
    const { state: start, a, b } = twoOnTable();
    let state = must(start, 'p1', { type: 'stackOn', src: { from: 'card', cardId: b }, targetId: a });
    state = must(state, 'p2', { type: 'stackOn', src: { from: 'deck' }, targetId: a, faceUp: true });
    expect(Object.keys(state.piles)).toHaveLength(1);
    expect(cardsIn(state, 'pile', Object.keys(state.piles)[0])).toHaveLength(3);
  });

  it('move o grupo e troca o modo', () => {
    const { state: start, a, b } = twoOnTable();
    let state = must(start, 'p1', { type: 'stackOn', src: { from: 'card', cardId: b }, targetId: a, mode: 'fan' });
    const pileId = Object.keys(state.piles)[0];
    state = must(state, 'p2', { type: 'movePile', pileId, x: 0.9, y: 2 });
    state = must(state, 'p2', { type: 'setPileMode', pileId, mode: 'stack' });
    expect(state.piles[pileId]).toMatchObject({ x: 0.9, y: 1, mode: 'stack' });
  });
});

describe('monte', () => {
  it('carta devolvida ao monte troca de id e fica no topo', () => {
    let state = draw(room(), 'p1');
    const [card] = handIds(state, 'p1');
    const { suit, rank } = state.cards[card];
    state = must(state, 'p1', { type: 'toDeck', cardId: card });
    expect(state.cards[card]).toBeUndefined();
    expect(cardsIn(state, 'deck').at(-1)).toMatchObject({ suit, rank, faceUp: false });
    expect(state.last?.cardId).toBe(card);
  });

  it('embaralhar conserva as cartas', () => {
    const before = room();
    const state = must(before, 'p1', { type: 'shuffleDeck' });
    const key = (s: RoomState) => cardsIn(s, 'deck').map((c) => c.id);
    expect(key(state)).not.toEqual(key(before));
    expect([...key(state)].sort()).toEqual([...key(before)].sort());
  });

  it('adiciona baralho, remove por naipe e valor, e respeita o teto', () => {
    let state = must(room(), 'p1', { type: 'addDeck' });
    expect(total(state)).toBe(104);
    state = must(state, 'p1', { type: 'removeCards', suits: ['hearts'], ranks: ['K'] });
    expect(state.last?.count).toBe(26 + 6);
    expect(cardsIn(state, 'deck').some((c) => c.suit === 'hearts' || c.rank === 'K')).toBe(false);
    let full = room();
    for (let i = 0; i < 7; i++) full = must(full, 'p1', { type: 'addDeck' });
    expect(applyAction(full, 'p1', { type: 'addDeck' })).toEqual({ ok: false, error: 'bad_action' });
  });

  it('reiniciar devolve tudo ao monte e apaga os grupos', () => {
    let state = draw(room(), 'p1');
    state = must(state, 'p2', { type: 'toTable', src: { from: 'deck' }, x: 0.5, y: 0.5 });
    state = must(state, 'p2', { type: 'stackOn', src: { from: 'deck' }, targetId: cardsIn(state, 'table')[0].id });
    state = must(state, 'p1', { type: 'reset' });
    expect(cardsIn(state, 'deck')).toHaveLength(52);
    expect(state.piles).toEqual({});
  });

  it('avisa quando o monte acabou', () => {
    let state = must(room(), 'p1', { type: 'removeCards', suits: ['hearts', 'diamonds', 'clubs', 'spades'], ranks: [] });
    expect(applyAction(state, 'p1', { type: 'toHand', src: { from: 'deck' } })).toEqual({ ok: false, error: 'deck_empty' });
    state = must(state, 'p1', { type: 'addDeck' });
    expect(cardsIn(state, 'deck')).toHaveLength(52);
  });
});

describe('jogadores', () => {
  it('quem sai devolve a mão para o fundo do monte', () => {
    let state = room();
    for (let i = 0; i < 3; i++) state = draw(state, 'p1');
    const topBefore = cardsIn(state, 'deck').at(-1)!.id;
    state = removePlayer(state, 'p1');
    expect(state.players.p1).toBeUndefined();
    expect(cardsIn(state, 'deck')).toHaveLength(52);
    expect(cardsIn(state, 'deck').at(-1)!.id).toBe(topBefore);
  });

  it('só remove outro jogador se ele estiver desconectado', () => {
    let state = draw(room(), 'p2');
    expect(applyAction(state, 'p1', { type: 'removePlayer', playerId: 'p2' })).toEqual({ ok: false, error: 'player_connected' });
    state = setConnected(state, 'p2', false);
    state = must(state, 'p1', { type: 'removePlayer', playerId: 'p2' });
    expect(Object.keys(state.players)).toEqual(['p1']);
    expect(total(state)).toBe(52);
  });
});

describe('visão por jogador', () => {
  it('esconde o monte, a mão alheia e a face das cartas fechadas', () => {
    let state = draw(draw(room(), 'p1'), 'p2');
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 0.5, y: 0.5 });
    const view = viewFor(state, 'p1');
    expect(view.deckCount).toBe(49);
    expect(view.players.map((p) => p.handCount)).toEqual([1, 1]);
    expect(view.cards.filter((c) => c.zone === 'hand')).toHaveLength(1);
    expect(view.cards.find((c) => c.zone === 'hand')?.rank).not.toBeNull();
    expect(view.cards.find((c) => c.zone === 'table')).toMatchObject({ faceUp: false, suit: null, rank: null });
    expect(JSON.stringify(view)).not.toContain(handIds(state, 'p2')[0]);
  });
});

describe('leitura do Firebase', () => {
  it('reconstrói o que o banco apaga (objetos vazios e null)', () => {
    const state = createRoomState('FIRE22', seeded());
    const stored = JSON.parse(JSON.stringify(state));
    delete stored.players;
    delete stored.piles;
    delete stored.last;
    for (const card of Object.values<Record<string, unknown>>(stored.cards)) delete card.owner;
    expect(normalizeState(stored)).toEqual(state);
  });

  it('ignora sala em formato antigo e resto de jogador sem nome', () => {
    expect(normalizeState({ roomId: 'OLD111', players: [], deckCards: [] })).toBeNull();
    const state = room();
    const stored = JSON.parse(JSON.stringify(state));
    stored.players.fantasma = { connected: false };
    expect(Object.keys(normalizeState(stored)!.players)).toEqual(['p1', 'p2']);
  });
});
