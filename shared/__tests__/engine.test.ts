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

  it('reordena as cartas dentro do grupo por id', () => {
    const { state: start, a, b } = twoOnTable();
    let state = must(start, 'p1', { type: 'stackOn', src: { from: 'card', cardId: b }, targetId: a, mode: 'fan' });
    const pileId = Object.keys(state.piles)[0];
    state = must(state, 'p1', { type: 'toPile', src: { from: 'deck' }, pileId, faceUp: true });
    const c = cardsIn(state, 'pile', pileId).at(-1)!.id;
    const ids = () => cardsIn(state, 'pile', pileId).map((card) => card.id);
    expect(ids()).toEqual([a, b, c]);

    // Qualquer jogador pode reordenar: o grupo está na mesa, e não na mão.
    state = must(state, 'p2', { type: 'toPile', src: { from: 'card', cardId: c }, pileId, beforeId: a });
    expect(ids()).toEqual([c, a, b]);
    state = must(state, 'p1', { type: 'toPile', src: { from: 'card', cardId: c }, pileId, beforeId: null });
    expect(ids()).toEqual([a, b, c]);
    state = must(state, 'p1', { type: 'toPile', src: { from: 'card', cardId: a }, pileId, beforeId: c });
    expect(ids()).toEqual([b, a, c]);
    // Reordenar não muda a face nem tira ninguém do grupo.
    expect(state.cards[a].faceUp).toBe(false);
    expect(Object.keys(state.piles)).toEqual([pileId]);
    expect(total(state)).toBe(52);
  });

  it('insere carta vinda de fora em uma posição do grupo', () => {
    const { state: start, a, b } = twoOnTable();
    let state = must(start, 'p1', { type: 'stackOn', src: { from: 'card', cardId: b }, targetId: a, mode: 'fan' });
    const pileId = Object.keys(state.piles)[0];
    state = draw(state, 'p2');
    const [fromHand] = handIds(state, 'p2');
    state = must(state, 'p2', { type: 'toPile', src: { from: 'card', cardId: fromHand }, pileId, beforeId: b });
    expect(cardsIn(state, 'pile', pileId).map((card) => card.id)).toEqual([a, fromHand, b]);
    expect(state.cards[fromHand].faceUp).toBe(true);
  });

  it('vai para o topo quando a carta de referência saiu do grupo no meio do caminho', () => {
    const { state: start, a, b } = twoOnTable();
    let state = must(start, 'p1', { type: 'stackOn', src: { from: 'card', cardId: b }, targetId: a, mode: 'fan' });
    const pileId = Object.keys(state.piles)[0];
    state = must(state, 'p1', { type: 'toPile', src: { from: 'deck' }, pileId });
    const c = cardsIn(state, 'pile', pileId).at(-1)!.id;
    state = must(state, 'p2', { type: 'toHand', src: { from: 'card', cardId: b } });
    state = must(state, 'p1', { type: 'toPile', src: { from: 'card', cardId: a }, pileId, beforeId: b });
    expect(cardsIn(state, 'pile', pileId).map((card) => card.id)).toEqual([c, a]);
  });

  // Monta um grupo em leque com `size` cartas viradas para cima no centro.
  const fanOf = (size: number, at = 0.5) => {
    let state = room();
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: at, y: at, faceUp: true });
    const base = cardsIn(state, 'table').at(-1)!.id;
    state = must(state, 'p1', { type: 'stackOn', src: { from: 'deck' }, targetId: base, mode: 'fan', faceUp: true });
    const pileId = state.cards[base].owner!;
    for (let i = 2; i < size; i++) state = must(state, 'p1', { type: 'toPile', src: { from: 'deck' }, pileId, faceUp: true });
    return { state, pileId, ids: cardsIn(state, 'pile', pileId).map((c) => c.id) };
  };

  it('grupo inteiro vai para o topo do monte, fechado e com ids novos', () => {
    const { state: start, pileId, ids } = fanOf(4);
    const ranks = ids.map((id) => start.cards[id].rank);
    const state = must(start, 'p2', { type: 'sendPile', pileId, to: { zone: 'deck' } });
    expect(state.piles).toEqual({});
    expect(cardsIn(state, 'deck')).toHaveLength(52);
    expect(cardsIn(state, 'deck').slice(-4).map((c) => c.rank)).toEqual(ranks);
    expect(cardsIn(state, 'deck').slice(-4).every((c) => !c.faceUp && !ids.includes(c.id))).toBe(true);
    expect(state.last).toMatchObject({ type: 'sendPile', cardIds: ids, to: { zone: 'deck' }, count: 4 });
  });

  it('grupo inteiro vai para a própria mão ou para a de outro jogador', () => {
    const { state: start, pileId, ids } = fanOf(3);
    let state = draw(start, 'p1');
    state = must(state, 'p1', { type: 'sendPile', pileId, to: { zone: 'hand' } });
    expect(handIds(state, 'p1').slice(-3)).toEqual(ids);
    expect(handIds(state, 'p1')).toHaveLength(4);
    const other = fanOf(3);
    state = must(other.state, 'p1', { type: 'sendPile', pileId: other.pileId, to: { zone: 'hand', playerId: 'p2' } });
    expect(handIds(state, 'p2')).toEqual(other.ids);
    expect(state.piles).toEqual({});
    expect(total(state)).toBe(52);
  });

  it('grupo sobre outro grupo une os dois, e o destino mantém posição e ordenação', () => {
    const fan = fanOf(3, 0.2);
    const target = fan.pileId;
    let state = fan.state;
    state = must(state, 'p1', { type: 'setPileSort', pileId: target, sort: 'rank' });
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 0.8, y: 0.8, faceUp: true });
    const base = cardsIn(state, 'table').at(-1)!.id;
    state = must(state, 'p1', { type: 'stackOn', src: { from: 'deck' }, targetId: base, mode: 'stack' });
    const source = state.cards[base].owner!;
    const moving = cardsIn(state, 'pile', source).map((c) => c.id);
    const before = cardsIn(state, 'pile', target).map((c) => c.id);
    state = must(state, 'p2', { type: 'sendPile', pileId: source, to: { zone: 'pile', pileId: target } });
    expect(Object.keys(state.piles)).toEqual([target]);
    expect(cardsIn(state, 'pile', target).map((c) => c.id)).toEqual([...before, ...moving]);
    expect(state.piles[target]).toMatchObject({ x: 0.2, y: 0.2, sort: 'rank', mode: 'fan' });
    expect(applyAction(state, 'p1', { type: 'sendPile', pileId: target, to: { zone: 'pile', pileId: target } })).toEqual({ ok: false, error: 'pile_not_found' });
  });

  it('grupo sobre carta solta: a carta vira a base e o grupo vai para onde ela está', () => {
    const fan = fanOf(3, 0.3);
    const { pileId, ids } = fan;
    let state = fan.state;
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 0.9, y: 0.1 });
    const loose = cardsIn(state, 'table').at(-1)!.id;
    state = must(state, 'p2', { type: 'sendPile', pileId, to: { zone: 'card', cardId: loose } });
    expect(cardsIn(state, 'pile', pileId).map((c) => c.id)).toEqual([loose, ...ids]);
    expect(state.piles[pileId]).toMatchObject({ x: 0.9, y: 0.1 });
    expect(state.cards[loose].faceUp).toBe(false);
  });

  it('grupo sobre carta que acabou de entrar em outro grupo une com esse grupo', () => {
    const fan = fanOf(3, 0.3);
    const { pileId } = fan;
    let state = fan.state;
    // A carta solta entra em outro grupo antes de o pedido chegar.
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 0.7, y: 0.7 });
    const loose = cardsIn(state, 'table').at(-1)!.id;
    state = must(state, 'p1', { type: 'stackOn', src: { from: 'deck' }, targetId: loose });
    const otherPile = state.cards[loose].owner!;
    state = must(state, 'p2', { type: 'sendPile', pileId, to: { zone: 'card', cardId: loose } });
    expect(Object.keys(state.piles)).toEqual([otherPile]);
    expect(cardsIn(state, 'pile', otherPile)).toHaveLength(5);
  });

  it('ordenação é guardada no grupo e valida o valor', () => {
    const { state: start, pileId } = fanOf(2);
    expect(start.piles[pileId].sort).toBe('manual');
    const state = must(start, 'p2', { type: 'setPileSort', pileId, sort: 'manilha' });
    expect(state.piles[pileId].sort).toBe('manilha');
    expect(applyAction(state, 'p1', { type: 'setPileSort', pileId, sort: 'naipe' as never })).toEqual({ ok: false, error: 'bad_action' });
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

  const copiesOf = (state: RoomState) => {
    const map = new Map<string, number>();
    for (const card of Object.values(state.cards)) map.set(`${card.rank}${card.suit}`, (map.get(`${card.rank}${card.suit}`) ?? 0) + 1);
    return map;
  };

  it('remover baralho tira uma cópia de cada carta do monte', () => {
    let state = must(room(), 'p1', { type: 'addDeck' });
    state = must(state, 'p1', { type: 'addDeck' });
    expect(total(state)).toBe(156);
    state = must(state, 'p2', { type: 'removeDeck' });
    expect(state.last).toMatchObject({ type: 'removeDeck', count: 52, skipped: 0 });
    expect(cardsIn(state, 'deck')).toHaveLength(104);
    expect([...copiesOf(state).values()].every((n) => n === 2)).toBe(true);
    expect(copiesOf(state).size).toBe(52);
  });

  it('remover baralho nunca tira a última cópia de uma carta', () => {
    expect(applyAction(room(), 'p1', { type: 'removeDeck' })).toEqual({ ok: false, error: 'single_deck' });
    // Um baralho a mais, mas sem as copas: as copas só têm uma cópia e ficam.
    let state = must(room(), 'p1', { type: 'removeCards', suits: ['hearts'], ranks: [] });
    state = must(state, 'p1', { type: 'addDeck' });
    state = must(state, 'p1', { type: 'removeDeck' });
    expect(state.last).toMatchObject({ count: 39, skipped: 0 });
    expect(total(state)).toBe(52);
    expect([...copiesOf(state).values()].every((n) => n === 1)).toBe(true);
  });

  it('cópias fora do monte ficam e são contadas', () => {
    let state = must(room(), 'p1', { type: 'addDeck' });
    // Compra até a mão ter as duas cópias de alguma carta.
    const bothInHand = () => [...copiesOf({ ...state, cards: Object.fromEntries(handIds(state, 'p1').map((id) => [id, state.cards[id]])) }).values()].filter((n) => n === 2).length;
    while (bothInHand() === 0) state = draw(state, 'p1');
    const kept = bothInHand();
    const inHand = handIds(state, 'p1').length;
    state = must(state, 'p1', { type: 'removeDeck' });
    expect(state.last).toMatchObject({ count: 52 - kept, skipped: kept });
    expect(handIds(state, 'p1')).toHaveLength(inHand);
    expect(total(state)).toBe(104 - (52 - kept));
  });

  it('avisa quando as cópias extras estão todas fora do monte', () => {
    let state = must(room(), 'p1', { type: 'addDeck' });
    while (cardsIn(state, 'deck').length > 0) state = draw(state, 'p2');
    expect(applyAction(state, 'p1', { type: 'removeDeck' })).toEqual({ ok: false, error: 'deck_incomplete' });
  });

  it('reiniciar com um baralho original devolve as 52 cartas e só elas', () => {
    let state = must(room(), 'p1', { type: 'addDeck' });
    state = must(state, 'p1', { type: 'removeCards', suits: ['spades'], ranks: ['A'] });
    state = draw(state, 'p2');
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 0.5, y: 0.5 });
    state = must(state, 'p1', { type: 'stackOn', src: { from: 'deck' }, targetId: cardsIn(state, 'table')[0].id });
    const oldIds = new Set(Object.keys(state.cards));
    state = must(state, 'p2', { type: 'resetToOneDeck' });
    expect(cardsIn(state, 'deck')).toHaveLength(52);
    expect(total(state)).toBe(52);
    expect(copiesOf(state).size).toBe(52);
    expect(state.piles).toEqual({});
    expect(handIds(state, 'p2')).toEqual([]);
    expect(Object.keys(state.cards).some((id) => oldIds.has(id))).toBe(false);
    expect(Object.keys(state.players)).toEqual(['p1', 'p2']);
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

  it('grupo salvo antes da ordenação existir volta como livre', () => {
    let state = room();
    state = must(state, 'p1', { type: 'toTable', src: { from: 'deck' }, x: 0.5, y: 0.5 });
    state = must(state, 'p1', { type: 'stackOn', src: { from: 'deck' }, targetId: cardsIn(state, 'table')[0].id });
    const stored = JSON.parse(JSON.stringify(state));
    for (const pile of Object.values<Record<string, unknown>>(stored.piles)) delete pile.sort;
    expect(Object.values(normalizeState(stored)!.piles)[0].sort).toBe('manual');
  });

  it('ignora sala em formato antigo e resto de jogador sem nome', () => {
    expect(normalizeState({ roomId: 'OLD111', players: [], deckCards: [] })).toBeNull();
    const state = room();
    const stored = JSON.parse(JSON.stringify(state));
    stored.players.fantasma = { connected: false };
    expect(Object.keys(normalizeState(stored)!.players)).toEqual(['p1', 'p2']);
  });
});
