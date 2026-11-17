// Contrato que a interface enxerga. Os componentes nunca sabem se a sala está
// em um servidor WebSocket ou no Firebase: só conversam com RoomConnection.

import type { CloseReason } from '@shared/protocol';
import type { Action, ErrorCode, LiveMessage, RoomView } from '@shared/types';

export type TransportKind = 'ws' | 'firebase';
export type ConnectionStatus = 'online' | 'reconnecting';

export interface RoomSession {
  transport: TransportKind;
  roomId: string;
  playerId: string;
  /** Segredo do assento no servidor WebSocket. Vazio no Firebase. */
  token: string;
}

export type ConnectRequest =
  | { kind: 'create'; name: string }
  | { kind: 'join'; roomId: string; name: string }
  | { kind: 'resume'; session: RoomSession };

export interface RoomHandlers {
  onView(view: RoomView): void;
  onLive(from: string, msg: LiveMessage): void;
  onStatus(status: ConnectionStatus): void;
  /** A sala acabou para este jogador. Depois disso a conexão não serve mais. */
  onClosed(reason: CloseReason): void;
}

export type SendResult = { ok: true } | { ok: false; error: ErrorCode };

export interface RoomConnection {
  readonly session: RoomSession;
  send(action: Action): Promise<SendResult>;
  sendLive(msg: LiveMessage): void;
  /** Saída voluntária: libera o assento e devolve a mão ao monte. */
  leave(): Promise<void>;
  /** Solta a conexão sem sair da sala (a página foi fechada ou recarregada). */
  dispose(): void;
}

export class RealtimeError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
    this.name = 'RealtimeError';
  }
}
