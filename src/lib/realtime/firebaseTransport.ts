// Transporte Firebase: usado quando não há servidor WebSocket configurado.
//
// Não existe servidor para arbitrar, então a ordem das ações é garantida por
// runTransaction: cada ação lê o estado atual, passa pelo MESMO motor do
// servidor e só grava se ninguém mexeu no meio do caminho (senão o SDK repete
// com o estado novo). O código antigo fazia get seguido de set da sala
// inteira, e a escrita mais lenta apagava a do outro jogador.

import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  type DatabaseReference,
  type Unsubscribe,
} from 'firebase/database';
import { addPlayer, applyAction, createRoomState, normalizeState, removePlayer } from '@shared/engine';
import { newId, newRoomCode } from '@shared/ids';
import type { Action, ErrorCode, LiveMessage, RoomState } from '@shared/types';
import { viewFor } from '@shared/view';
import { database } from '@/lib/firebase';
import {
  RealtimeError,
  type ConnectRequest,
  type RoomConnection,
  type RoomHandlers,
  type RoomSession,
  type SendResult,
} from './types';

const roomRef = (roomId: string): DatabaseReference => ref(database, `rooms/${roomId}`);

// As posições de arrasto ficam FORA do nó da sala. Dentro dele, cada movimento
// do dedo invalidaria as transações em andamento dos outros jogadores.
const liveRef = (roomId: string, playerId?: string): DatabaseReference =>
  ref(database, `rooms/${roomId}-live${playerId ? `/${playerId}` : ''}`);

/** O Firebase rejeita undefined. O JSON descarta essas chaves. */
const clean = (state: RoomState): RoomState => JSON.parse(JSON.stringify(state));

const createRoom = async (name: string): Promise<RoomSession> => {
  const playerId = newId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const roomId = newRoomCode();
    const seated = addPlayer(createRoomState(roomId), playerId, name);
    if (!seated.ok) throw new RealtimeError((seated as { error: ErrorCode }).error);
    // Só grava se o código estiver livre. Código ocupado aborta e sorteia outro.
    const result = await runTransaction(roomRef(roomId), (current) => (current === null ? clean(seated.state) : undefined));
    if (result.committed) return { transport: 'firebase', roomId, playerId, token: '' };
  }
  throw new RealtimeError('room_full');
};

const joinRoom = async (roomId: string, name: string): Promise<RoomSession> => {
  const playerId = newId();
  let error: ErrorCode | null = null;
  const result = await runTransaction(roomRef(roomId), (current) => {
    error = null;
    // Na primeira execução o SDK pode entregar null só por não ter o dado em
    // cache. Devolver null deixa o servidor decidir: se a sala existe, ele
    // recusa e a função roda de novo com o valor real.
    if (current === null) return null;
    const state = normalizeState(current);
    if (!state) {
      error = 'room_not_found';
      return undefined;
    }
    const seated = addPlayer(state, playerId, name);
    if (!seated.ok) {
      error = (seated as { error: ErrorCode }).error;
      return undefined;
    }
    return clean(seated.state);
  });
  if (error) throw new RealtimeError(error);
  if (!result.committed || !result.snapshot.exists()) throw new RealtimeError('room_not_found');
  return { transport: 'firebase', roomId, playerId, token: '' };
};

const resumeRoom = async (session: RoomSession): Promise<RoomSession> => {
  const snapshot = await get(roomRef(session.roomId));
  const state = snapshot.exists() ? normalizeState(snapshot.val()) : null;
  if (!state) throw new RealtimeError('room_not_found');
  if (!state.players[session.playerId]) throw new RealtimeError('bad_session');
  return session;
};

class FirebaseConnection implements RoomConnection {
  private unsubscribers: Unsubscribe[] = [];
  private online = false;
  private wasOnline = false;
  private disposed = false;
  private liveSeen = new Map<string, string>();

  constructor(
    readonly session: RoomSession,
    private readonly handlers: RoomHandlers,
  ) {}

  private get room(): DatabaseReference {
    return roomRef(this.session.roomId);
  }

  private get presence(): DatabaseReference {
    return ref(database, `rooms/${this.session.roomId}/players/${this.session.playerId}/connected`);
  }

  attach(): void {
    const { roomId, playerId } = this.session;

    this.unsubscribers.push(
      onValue(this.room, (snapshot) => {
        if (this.disposed) return;
        const state = snapshot.exists() ? normalizeState(snapshot.val()) : null;
        if (!state) return this.close('room_gone');
        if (!state.players[playerId]) return this.close('removed');
        this.handlers.onView(viewFor(state, playerId));
      }),
    );

    this.unsubscribers.push(
      onValue(ref(database, '.info/connected'), (snapshot) => {
        if (this.disposed) return;
        this.online = snapshot.val() === true;
        if (!this.online) {
          if (this.wasOnline) this.handlers.onStatus('reconnecting');
          return;
        }
        // A cada (re)conexão o servidor esquece os onDisconnect anteriores, e
        // por isso eles são registrados de novo aqui.
        void onDisconnect(this.presence).set(false);
        void onDisconnect(liveRef(roomId, playerId)).remove();
        void set(this.presence, true);
        if (this.wasOnline) this.handlers.onStatus('online');
        this.wasOnline = true;
      }),
    );

    this.unsubscribers.push(
      onValue(liveRef(roomId), (snapshot) => {
        if (this.disposed) return;
        const all: Record<string, LiveMessage> = snapshot.val() ?? {};
        for (const [from, msg] of Object.entries(all)) {
          if (from === playerId) continue;
          const key = JSON.stringify(msg);
          if (this.liveSeen.get(from) === key) continue;
          this.liveSeen.set(from, key);
          this.handlers.onLive(from, msg);
        }
        for (const from of [...this.liveSeen.keys()]) {
          if (all[from]) continue;
          this.liveSeen.delete(from);
          this.handlers.onLive(from, { kind: 'end' });
        }
      }),
    );
  }

  async send(action: Action): Promise<SendResult> {
    if (!this.online || this.disposed) return { ok: false, error: 'offline' };
    let error: ErrorCode | null = null;
    try {
      const result = await runTransaction(this.room, (current) => {
        error = null;
        if (current === null) return null;
        const state = normalizeState(current);
        if (!state) {
          error = 'room_not_found';
          return undefined;
        }
        const applied = applyAction(state, this.session.playerId, action);
        if (!applied.ok) {
          error = (applied as { error: ErrorCode }).error;
          return undefined;
        }
        return clean(applied.state);
      });
      if (error) return { ok: false, error };
      if (!result.committed || !result.snapshot.exists()) return { ok: false, error: 'room_not_found' };
      return { ok: true };
    } catch {
      return { ok: false, error: 'offline' };
    }
  }

  sendLive(msg: LiveMessage): void {
    if (!this.online || this.disposed) return;
    const target = liveRef(this.session.roomId, this.session.playerId);
    void (msg.kind === 'end' ? remove(target) : set(target, msg)).catch(() => undefined);
  }

  async leave(): Promise<void> {
    const { roomId, playerId } = this.session;
    this.dispose();
    try {
      // Cancela antes de sair: um onDisconnect atrasado recriaria o campo
      // "connected" de um jogador que não existe mais.
      await onDisconnect(this.presence).cancel();
      await remove(liveRef(roomId, playerId));
      await runTransaction(this.room, (current) => {
        if (current === null) return null;
        const state = normalizeState(current);
        if (!state) return undefined;
        const next = removePlayer(state, playerId);
        // Sem servidor para varrer salas vazias, quem sai por último apaga.
        return Object.keys(next.players).length === 0 ? null : clean(next);
      });
    } catch {
      // Sem rede não há o que fazer: o onDisconnect marca a queda.
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  private close(reason: 'room_gone' | 'removed'): void {
    this.dispose();
    this.handlers.onClosed(reason);
  }
}

export const connectFirebase = async (request: ConnectRequest, handlers: RoomHandlers): Promise<RoomConnection> => {
  const session =
    request.kind === 'create'
      ? await createRoom(request.name)
      : request.kind === 'join'
        ? await joinRoom(request.roomId, request.name)
        : await resumeRoom(request.session);
  const connection = new FirebaseConnection(session, handlers);
  connection.attach();
  return connection;
};
