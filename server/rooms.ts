// Salas em memória. O servidor é o dono do estado: ele aplica as ações na
// ordem em que chegam e manda a cada jogador somente a visão dele.

import { randomBytes } from 'node:crypto';
import type { WebSocket } from 'ws';
import { addPlayer, applyAction, createRoomState, removePlayer, setConnected } from '../shared/engine';
import { newId, newRoomCode } from '../shared/ids';
import type { CloseReason, ServerMessage } from '../shared/protocol';
import type { Action, ErrorCode, LiveMessage, RoomState } from '../shared/types';
import { viewFor } from '../shared/view';

interface Room {
  state: RoomState;
  sockets: Map<string, WebSocket>;
  tokens: Map<string, string>;
  /** Momento em que o último jogador conectado saiu. null enquanto há alguém. */
  emptySince: number | null;
}

export interface Seat {
  roomId: string;
  playerId: string;
}

type Joined = { ok: true; seat: Seat; token: string } | { ok: false; error: ErrorCode };

export const send = (socket: WebSocket, message: ServerMessage): void => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
};

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxRooms: number,
  ) {}

  get size(): number {
    return this.rooms.size;
  }

  create(name: string, socket: WebSocket): Joined {
    if (this.rooms.size >= this.maxRooms) return { ok: false, error: 'room_full' };
    let roomId = newRoomCode();
    while (this.rooms.has(roomId)) roomId = newRoomCode();
    const room: Room = { state: createRoomState(roomId), sockets: new Map(), tokens: new Map(), emptySince: null };
    this.rooms.set(roomId, room);
    const joined = this.seat(room, name, socket);
    // Sala criada com nome inválido não deve ficar ocupando memória.
    if (!joined.ok) this.rooms.delete(roomId);
    return joined;
  }

  join(roomId: string, name: string, socket: WebSocket): Joined {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, error: 'room_not_found' };
    return this.seat(room, name, socket);
  }

  resume(roomId: string, playerId: string, token: string, socket: WebSocket): Joined {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, error: 'room_not_found' };
    if (!room.state.players[playerId] || room.tokens.get(playerId) !== token) {
      return { ok: false, error: 'bad_session' };
    }
    // A mesma sessão aberta em outra aba ou depois de uma queda: o socket
    // antigo é encerrado para não existirem dois donos do mesmo assento.
    const old = room.sockets.get(playerId);
    if (old && old !== socket) {
      send(old, { t: 'closed', reason: 'replaced' });
      old.close(4000, 'replaced');
    }
    this.attach(room, playerId, socket);
    return { ok: true, seat: { roomId, playerId }, token };
  }

  act(seat: Seat, action: Action): { ok: true } | { ok: false; error: ErrorCode } {
    const room = this.rooms.get(seat.roomId);
    if (!room) return { ok: false, error: 'room_not_found' };
    const result = applyAction(room.state, seat.playerId, action);
    if (!result.ok) return { ok: false, error: result.error };
    const before = room.state;
    room.state = result.state;
    this.closeRemoved(room, before);
    this.broadcast(room);
    return { ok: true };
  }

  relay(seat: Seat, msg: LiveMessage): void {
    const room = this.rooms.get(seat.roomId);
    if (!room) return;
    for (const [playerId, socket] of room.sockets) {
      if (playerId !== seat.playerId) send(socket, { t: 'live', from: seat.playerId, msg });
    }
  }

  /** Saída voluntária: o assento some e a mão volta para o monte. */
  leave(seat: Seat): void {
    const room = this.rooms.get(seat.roomId);
    if (!room) return;
    const socket = room.sockets.get(seat.playerId);
    room.sockets.delete(seat.playerId);
    room.tokens.delete(seat.playerId);
    room.state = removePlayer(room.state, seat.playerId);
    if (socket) send(socket, { t: 'closed', reason: 'left' });
    if (Object.keys(room.state.players).length === 0) {
      this.rooms.delete(seat.roomId);
      return;
    }
    this.markEmpty(room);
    this.broadcast(room);
  }

  /** Queda de conexão: o assento e a mão ficam guardados para a volta. */
  disconnect(seat: Seat, socket: WebSocket): void {
    const room = this.rooms.get(seat.roomId);
    // Se o socket registrado já é outro, esta é a aba antiga de um resume.
    if (!room || room.sockets.get(seat.playerId) !== socket) return;
    room.sockets.delete(seat.playerId);
    room.state = setConnected(room.state, seat.playerId, false);
    this.relay(seat, { kind: 'end' });
    this.markEmpty(room);
    this.broadcast(room);
  }

  /** Apaga salas em que todos caíram há mais tempo que o TTL. */
  sweep(now = Date.now()): number {
    let removed = 0;
    for (const [roomId, room] of this.rooms) {
      if (room.emptySince !== null && now - room.emptySince > this.ttlMs) {
        this.rooms.delete(roomId);
        removed++;
      }
    }
    return removed;
  }

  viewOf(seat: Seat) {
    const room = this.rooms.get(seat.roomId);
    return room ? viewFor(room.state, seat.playerId) : null;
  }

  private seat(room: Room, name: string, socket: WebSocket): Joined {
    const playerId = newId();
    const result = addPlayer(room.state, playerId, name);
    if (!result.ok) return { ok: false, error: result.error };
    room.state = result.state;
    const token = randomBytes(18).toString('base64url');
    room.tokens.set(playerId, token);
    this.attach(room, playerId, socket);
    return { ok: true, seat: { roomId: room.state.roomId, playerId }, token };
  }

  private attach(room: Room, playerId: string, socket: WebSocket): void {
    room.sockets.set(playerId, socket);
    room.state = setConnected(room.state, playerId, true);
    room.emptySince = null;
    this.broadcast(room, playerId);
  }

  private markEmpty(room: Room): void {
    if (room.sockets.size === 0 && room.emptySince === null) room.emptySince = Date.now();
  }

  /** Quem foi removido por outro jogador precisa saber e perder o assento. */
  private closeRemoved(room: Room, before: RoomState): void {
    for (const playerId of Object.keys(before.players)) {
      if (room.state.players[playerId]) continue;
      room.tokens.delete(playerId);
      const socket = room.sockets.get(playerId);
      room.sockets.delete(playerId);
      if (socket) this.close(socket, 'removed');
    }
  }

  private close(socket: WebSocket, reason: CloseReason): void {
    send(socket, { t: 'closed', reason });
    socket.close(4001, reason);
  }

  private broadcast(room: Room, except?: string): void {
    for (const [playerId, socket] of room.sockets) {
      if (playerId === except) continue;
      send(socket, { t: 'state', view: viewFor(room.state, playerId) });
    }
  }
}
