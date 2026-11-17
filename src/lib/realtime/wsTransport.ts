// Transporte WebSocket: fala com o servidor autoritativo de server/.

import { WS_PATH, type ClientMessage, type ServerMessage } from '@shared/protocol';
import type { Action, LiveMessage } from '@shared/types';
import {
  RealtimeError,
  type ConnectRequest,
  type RoomConnection,
  type RoomHandlers,
  type RoomSession,
  type SendResult,
} from './types';

const CONNECT_TIMEOUT_MS = 8000;
const ACK_TIMEOUT_MS = 6000;
const PING_EVERY_MS = 20_000;
/** Sem nenhuma mensagem por este tempo, a conexão é dada como morta. */
const SILENCE_LIMIT_MS = 45_000;
const MAX_BACKOFF_MS = 8000;

/** Aceita "wss://host", "https://host" ou a URL completa com /ws. */
export const wsEndpoint = (raw: string): string => {
  const url = new URL(raw.trim().replace(/^http/i, 'ws'));
  if (url.pathname === '/' || url.pathname === '') url.pathname = WS_PATH;
  return url.toString();
};

class WsConnection implements RoomConnection {
  session: RoomSession = { transport: 'ws', roomId: '', playerId: '', token: '' };

  private socket: WebSocket | null = null;
  private disposed = false;
  private seq = 0;
  private attempt = 0;
  private lastSeen = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pending = new Map<number, { resolve: (result: SendResult) => void; timer: ReturnType<typeof setTimeout> }>();

  constructor(
    private readonly url: string,
    private readonly handlers: RoomHandlers,
  ) {}

  /** Primeira conexão: resolve quando o servidor confirma o assento. */
  open(request: ConnectRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error: RealtimeError) => {
        if (settled) return;
        settled = true;
        this.dispose();
        reject(error);
      };
      const timer = setTimeout(() => fail(new RealtimeError('timeout')), CONNECT_TIMEOUT_MS);

      const first: ClientMessage =
        request.kind === 'create'
          ? { t: 'create', name: request.name }
          : request.kind === 'join'
            ? { t: 'join', roomId: request.roomId, name: request.name }
            : { t: 'resume', roomId: request.session.roomId, playerId: request.session.playerId, token: request.session.token };

      this.connect(first, {
        onJoined: () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.startHeartbeat();
          resolve();
        },
        onError: (error) => {
          clearTimeout(timer);
          fail(error);
        },
      });
    });
  }

  send(action: Action): Promise<SendResult> {
    if (!this.isOpen()) return Promise.resolve({ ok: false, error: 'offline' });
    const id = ++this.seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ok: false, error: 'timeout' });
      }, ACK_TIMEOUT_MS);
      this.pending.set(id, { resolve, timer });
      this.write({ t: 'action', id, action });
    });
  }

  sendLive(msg: LiveMessage): void {
    if (this.isOpen()) this.write({ t: 'live', msg });
  }

  async leave(): Promise<void> {
    if (this.isOpen()) this.write({ t: 'leave' });
    this.dispose();
  }

  dispose(): void {
    this.disposed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    document.removeEventListener('visibilitychange', this.onWake);
    window.removeEventListener('online', this.onWake);
    this.failPending();
    // O buffer é esvaziado pelo navegador antes do fechamento, então um
    // "leave" escrito logo antes ainda chega ao servidor.
    this.socket?.close(1000);
    this.socket = null;
  }

  private isOpen(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  private write(message: ClientMessage): void {
    this.socket?.send(JSON.stringify(message));
  }

  private failPending(): void {
    for (const { resolve, timer } of this.pending.values()) {
      clearTimeout(timer);
      resolve({ ok: false, error: 'offline' });
    }
    this.pending.clear();
  }

  private connect(first: ClientMessage, hooks: { onJoined: () => void; onError: (error: RealtimeError) => void }): void {
    const socket = new WebSocket(this.url);
    this.socket = socket;
    let joined = false;

    socket.onopen = () => socket.send(JSON.stringify(first));

    socket.onmessage = (event) => {
      if (socket !== this.socket) return;
      this.lastSeen = Date.now();
      let message: ServerMessage;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      switch (message.t) {
        case 'joined':
          joined = true;
          this.attempt = 0;
          this.session = { transport: 'ws', roomId: message.roomId, playerId: message.playerId, token: message.token };
          this.handlers.onView(message.view);
          hooks.onJoined();
          break;
        case 'state':
          this.handlers.onView(message.view);
          break;
        case 'ack': {
          const waiting = this.pending.get(message.id);
          if (!waiting) break;
          clearTimeout(waiting.timer);
          this.pending.delete(message.id);
          waiting.resolve(message.ok ? { ok: true } : { ok: false, error: message.error ?? 'bad_action' });
          break;
        }
        case 'live':
          this.handlers.onLive(message.from, message.msg);
          break;
        case 'closed':
          this.dispose();
          this.handlers.onClosed(message.reason);
          break;
        case 'error':
          // Antes do assento confirmado, erro é a resposta do pedido de entrada.
          if (!joined) hooks.onError(new RealtimeError(message.code));
          break;
      }
    };

    socket.onclose = () => {
      if (socket !== this.socket || this.disposed) return;
      this.socket = null;
      this.failPending();
      if (!joined && this.session.playerId === '') {
        hooks.onError(new RealtimeError('offline'));
        return;
      }
      this.handlers.onStatus('reconnecting');
      this.scheduleReconnect();
    };

    // onclose sempre vem em seguida e cuida da reconexão.
    socket.onerror = () => undefined;
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.retryTimer) return;
    const delay = Math.min(MAX_BACKOFF_MS, 400 * 2 ** this.attempt++);
    this.retryTimer = setTimeout(() => this.reconnect(), delay);
  }

  private reconnect(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.disposed || this.socket) return;
    const { roomId, playerId, token } = this.session;
    this.connect(
      { t: 'resume', roomId, playerId, token },
      {
        onJoined: () => this.handlers.onStatus('online'),
        // O servidor respondeu e recusou: a sala expirou ou o assento não
        // existe mais. Insistir não adianta.
        onError: (error) => {
          if (error.code === 'offline') return this.scheduleReconnect();
          this.dispose();
          this.handlers.onClosed('room_gone');
        },
      },
    );
  }

  /** Voltar para a aba ou recuperar a rede: tenta já, sem esperar o backoff. */
  private onWake = (): void => {
    if (document.visibilityState !== 'visible' || this.disposed) return;
    if (!this.socket) {
      this.attempt = 0;
      this.reconnect();
    }
  };

  private startHeartbeat(): void {
    this.lastSeen = Date.now();
    document.addEventListener('visibilitychange', this.onWake);
    window.addEventListener('online', this.onWake);
    this.pingTimer = setInterval(() => {
      if (!this.isOpen()) return;
      // Celular que troca de rede deixa o socket "aberto" sem tráfego. Fechar
      // à força dispara onclose e a reconexão.
      if (Date.now() - this.lastSeen > SILENCE_LIMIT_MS) {
        this.socket?.close();
        return;
      }
      this.write({ t: 'ping' });
    }, PING_EVERY_MS);
  }
}

export const connectWs = async (url: string, request: ConnectRequest, handlers: RoomHandlers): Promise<RoomConnection> => {
  const connection = new WsConnection(url, handlers);
  await connection.open(request);
  return connection;
};
