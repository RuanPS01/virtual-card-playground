// Testa o transporte Firebase contra um banco em memória que imita o que
// importa do Realtime Database: transações, ouvintes e o hábito de apagar
// objetos vazios e valores null ao gravar (a causa de vários "undefined"
// do código antigo).

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveMessage, RoomView } from '@shared/types';

type Tree = Record<string, unknown>;
type Listener = { path: string; seen: string; cb: (snap: { exists(): boolean; val(): unknown }) => void };

const db = vi.hoisted(() => ({ root: {} as Record<string, unknown>, listeners: [] as Listener[] }));

/** O que o Firebase faz ao gravar: some com null, undefined e objetos vazios. */
const prune = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') return value;
  const out: Tree = {};
  for (const [key, child] of Object.entries(value as Tree)) {
    const kept = prune(child);
    if (kept !== undefined) out[key] = kept;
  }
  return Object.keys(out).length ? out : undefined;
};

const parts = (path: string) => path.split('/').filter(Boolean);

const read = (path: string): unknown => {
  if (path === '.info/connected') return true;
  let node: unknown = db.root;
  for (const key of parts(path)) node = node && typeof node === 'object' ? (node as Tree)[key] : undefined;
  return node === undefined ? null : structuredClone(node);
};

const snap = (path: string) => {
  const value = read(path);
  return { exists: () => value !== null, val: () => value };
};

// Como o Firebase real, só avisa quem teve o valor alterado. Avisar todos
// faria o ouvinte de presença gravar de novo e entrar em laço.
const notify = () =>
  [...db.listeners].forEach((l) => {
    const now = JSON.stringify(read(l.path));
    if (now === l.seen) return;
    l.seen = now;
    l.cb(snap(l.path));
  });

const write = (path: string, value: unknown) => {
  const keys = parts(path);
  const last = keys.pop()!;
  let node = db.root as Tree;
  for (const key of keys) {
    if (!node[key] || typeof node[key] !== 'object') node[key] = {};
    node = node[key] as Tree;
  }
  const kept = prune(value);
  if (kept === undefined) delete node[last];
  else node[last] = kept;
  db.root = (prune(db.root) as Tree) ?? {};
  notify();
};

vi.mock('@/lib/firebase', () => ({ database: {} }));

vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => ({ path }),
  get: async (r: { path: string }) => snap(r.path),
  set: async (r: { path: string }, value: unknown) => write(r.path, value),
  remove: async (r: { path: string }) => write(r.path, null),
  onValue: (r: { path: string }, cb: Listener['cb']) => {
    const listener = { path: r.path, seen: JSON.stringify(read(r.path)), cb };
    db.listeners.push(listener);
    cb(snap(r.path));
    return () => {
      db.listeners = db.listeners.filter((l) => l !== listener);
    };
  },
  onDisconnect: () => ({ set: async () => undefined, remove: async () => undefined, cancel: async () => undefined }),
  runTransaction: async (r: { path: string }, update: (current: unknown) => unknown) => {
    const next = update(read(r.path));
    if (next === undefined) return { committed: false, snapshot: snap(r.path) };
    write(r.path, next);
    return { committed: true, snapshot: snap(r.path) };
  },
}));

const { connectFirebase } = await import('../firebaseTransport');

const handlers = () => {
  const views: RoomView[] = [];
  const live: Array<[string, LiveMessage]> = [];
  const closed: string[] = [];
  return {
    views,
    live,
    closed,
    last: () => views[views.length - 1],
    h: {
      onView: (v: RoomView) => views.push(v),
      onLive: (from: string, msg: LiveMessage) => live.push([from, msg]),
      onStatus: () => undefined,
      onClosed: (reason: string) => closed.push(reason),
    },
  };
};

describe('transporte Firebase', () => {
  beforeEach(() => {
    db.root = {};
    db.listeners = [];
  });

  it('cria, entra, joga e sai mantendo o baralho inteiro', async () => {
    const ana = handlers();
    const a = await connectFirebase({ kind: 'create', name: 'Ana' }, ana.h);
    expect(ana.last().deckCount).toBe(52);

    const bia = handlers();
    const b = await connectFirebase({ kind: 'join', roomId: a.session.roomId, name: 'Bia' }, bia.h);
    expect(ana.last().players.map((p) => p.name)).toEqual(['Ana', 'Bia']);

    expect(await a.send({ type: 'toHand', src: { from: 'deck' } })).toEqual({ ok: true });
    expect(await b.send({ type: 'toTable', src: { from: 'deck' }, x: 0.5, y: 0.5 })).toEqual({ ok: true });
    expect(bia.last().players.find((p) => p.name === 'Ana')?.handCount).toBe(1);
    expect(ana.last().cards.filter((c) => c.zone === 'table')).toHaveLength(1);

    // Erro do motor volta como resultado, sem gravar nada.
    const handCard = ana.last().cards.find((c) => c.zone === 'hand')!;
    expect(await b.send({ type: 'toTable', src: { from: 'card', cardId: handCard.id }, x: 0, y: 0 })).toEqual({
      ok: false,
      error: 'not_your_card',
    });

    await a.leave();
    expect(bia.last().players.map((p) => p.name)).toEqual(['Bia']);
    expect(bia.last().deckCount + bia.last().cards.length).toBe(52);

    await b.leave();
    expect(read(`rooms/${a.session.roomId}`)).toBeNull();
  });

  it('recusa sala inexistente e sessão de quem já saiu', async () => {
    await expect(connectFirebase({ kind: 'join', roomId: 'ZZZZZZ', name: 'Caio' }, handlers().h)).rejects.toMatchObject({
      code: 'room_not_found',
    });
    const a = await connectFirebase({ kind: 'create', name: 'Ana' }, handlers().h);
    const b = await connectFirebase({ kind: 'join', roomId: a.session.roomId, name: 'Bia' }, handlers().h);
    const session = b.session;
    await b.leave();
    await expect(connectFirebase({ kind: 'resume', session }, handlers().h)).rejects.toMatchObject({ code: 'bad_session' });
  });

  it('retoma o mesmo assento depois de recarregar', async () => {
    const a = await connectFirebase({ kind: 'create', name: 'Ana' }, handlers().h);
    await a.send({ type: 'toHand', src: { from: 'deck' } });
    a.dispose();
    const again = handlers();
    await connectFirebase({ kind: 'resume', session: a.session }, again.h);
    expect(again.last().me).toBe(a.session.playerId);
    expect(again.last().cards.filter((c) => c.zone === 'hand')).toHaveLength(1);
  });

  it('avisa quem foi removido e repassa o arrasto ao vivo', async () => {
    const ana = handlers();
    const a = await connectFirebase({ kind: 'create', name: 'Ana' }, ana.h);
    const bia = handlers();
    const b = await connectFirebase({ kind: 'join', roomId: a.session.roomId, name: 'Bia' }, bia.h);

    b.sendLive({ kind: 'drag', target: 'card', id: 'x', x: 0.2, y: 0.3 });
    expect(ana.live).toContainEqual([b.session.playerId, { kind: 'drag', target: 'card', id: 'x', x: 0.2, y: 0.3 }]);
    b.sendLive({ kind: 'end' });
    expect(ana.live.at(-1)).toEqual([b.session.playerId, { kind: 'end' }]);

    // Bia cai (o onDisconnect marcaria connected = false) e Ana remove.
    write(`rooms/${a.session.roomId}/players/${b.session.playerId}/connected`, false);
    expect(await a.send({ type: 'removePlayer', playerId: b.session.playerId })).toEqual({ ok: true });
    expect(bia.closed).toEqual(['removed']);
  });
});
