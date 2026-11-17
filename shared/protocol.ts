// Contrato das mensagens do WebSocket. Tudo trafega como JSON.

import type { Action, ErrorCode, LiveMessage, RoomView } from './types';

export type ClientMessage =
  | { t: 'create'; name: string }
  | { t: 'join'; roomId: string; name: string }
  /** Reassume o mesmo assento depois de recarregar a página ou perder a rede. */
  | { t: 'resume'; roomId: string; playerId: string; token: string }
  /** id é um contador do cliente, devolvido no ack para casar pedido e resposta. */
  | { t: 'action'; id: number; action: Action }
  | { t: 'live'; msg: LiveMessage }
  | { t: 'leave' }
  | { t: 'ping' };

export type CloseReason = 'left' | 'removed' | 'replaced' | 'room_gone';

export type ServerMessage =
  | { t: 'joined'; roomId: string; playerId: string; token: string; view: RoomView }
  | { t: 'state'; view: RoomView }
  | { t: 'ack'; id: number; ok: boolean; error?: ErrorCode }
  | { t: 'live'; from: string; msg: LiveMessage }
  | { t: 'error'; code: ErrorCode }
  | { t: 'closed'; reason: CloseReason }
  | { t: 'pong' };

/** Caminho do endpoint WebSocket no servidor. */
export const WS_PATH = '/ws';
