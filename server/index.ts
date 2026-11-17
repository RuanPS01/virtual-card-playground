// Servidor de tempo real: HTTP mínimo (saúde) + WebSocket em /ws.
// Configuração por variáveis de ambiente, todas opcionais:
//   PORT             porta de escuta (padrão 8787)
//   ALLOWED_ORIGINS  origens aceitas, separadas por vírgula (padrão: qualquer)
//   ROOM_TTL_MIN     minutos que uma sala sem ninguém conectado sobrevive (padrão 30)
//   MAX_ROOMS        teto de salas simultâneas (padrão 500)

import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { normalizeRoomCode } from '../shared/ids';
import { WS_PATH, type ClientMessage } from '../shared/protocol';
import { RoomManager, send, type Seat } from './rooms';

const PORT = Number(process.env.PORT ?? 8787);
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MIN ?? 30) * 60_000;
const MAX_ROOMS = Number(process.env.MAX_ROOMS ?? 500);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const HEARTBEAT_MS = 30_000;
/** Mensagens por segundo por conexão. O arrasto ao vivo manda cerca de 20. */
const RATE_LIMIT = 80;

const rooms = new RoomManager(ROOM_TTL_MS, MAX_ROOMS);

const http = createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({
  server: http,
  path: WS_PATH,
  // Uma ação tem poucas centenas de bytes. O teto baixo barra payload abusivo.
  maxPayload: 8 * 1024,
  verifyClient: ({ origin }: { origin?: string }) =>
    ALLOWED_ORIGINS.length === 0 || (!!origin && ALLOWED_ORIGINS.includes(origin)),
});

interface Session {
  seat: Seat | null;
  alive: boolean;
  windowStart: number;
  count: number;
}

const sessions = new WeakMap<WebSocket, Session>();

const overLimit = (session: Session): boolean => {
  const now = Date.now();
  if (now - session.windowStart > 1000) {
    session.windowStart = now;
    session.count = 0;
  }
  return ++session.count > RATE_LIMIT;
};

const handle = (socket: WebSocket, session: Session, message: ClientMessage): void => {
  switch (message.t) {
    case 'ping':
      send(socket, { t: 'pong' });
      return;

    case 'create':
    case 'join':
    case 'resume': {
      // Trocar de sala no mesmo socket deixaria um assento fantasma na antiga.
      if (session.seat) return send(socket, { t: 'error', code: 'bad_action' });
      const joined =
        message.t === 'create'
          ? rooms.create(message.name, socket)
          : message.t === 'join'
            ? rooms.join(normalizeRoomCode(String(message.roomId ?? '')), message.name, socket)
            : rooms.resume(normalizeRoomCode(String(message.roomId ?? '')), String(message.playerId), String(message.token), socket);
      if (!joined.ok) return send(socket, { t: 'error', code: joined.error });
      session.seat = joined.seat;
      const view = rooms.viewOf(joined.seat);
      if (view) send(socket, { t: 'joined', ...joined.seat, token: joined.token, view });
      return;
    }

    case 'action': {
      if (!session.seat) return send(socket, { t: 'ack', id: message.id, ok: false, error: 'not_in_room' });
      const result = rooms.act(session.seat, message.action);
      // O estado novo já foi transmitido dentro de act. O ack vem depois de
      // propósito: quando o cliente o recebe, a visão dele já está atualizada.
      send(socket, { t: 'ack', id: message.id, ok: result.ok, error: result.ok ? undefined : result.error });
      return;
    }

    case 'live':
      if (session.seat && message.msg) rooms.relay(session.seat, message.msg);
      return;

    case 'leave':
      if (session.seat) rooms.leave(session.seat);
      session.seat = null;
      return;
  }
};

wss.on('connection', (socket) => {
  const session: Session = { seat: null, alive: true, windowStart: Date.now(), count: 0 };
  sessions.set(socket, session);

  socket.on('pong', () => {
    session.alive = true;
  });

  socket.on('message', (data, isBinary) => {
    if (isBinary) return;
    if (overLimit(session)) return send(socket, { t: 'error', code: 'rate_limited' });
    let message: ClientMessage;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (!message || typeof message !== 'object' || typeof message.t !== 'string') return;
    try {
      handle(socket, session, message);
    } catch (error) {
      // Uma mensagem malformada nunca pode derrubar o processo e as outras salas.
      console.error('[ws] erro ao tratar mensagem', message.t, error);
    }
  });

  socket.on('close', () => {
    if (session.seat) rooms.disconnect(session.seat, socket);
  });

  socket.on('error', () => socket.terminate());
});

// Conexão que cai sem fechar (celular sem sinal) só é percebida pelo ping.
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    const session = sessions.get(socket);
    if (!session) continue;
    if (!session.alive) {
      socket.terminate();
      continue;
    }
    session.alive = false;
    socket.ping();
  }
}, HEARTBEAT_MS);

const sweeper = setInterval(() => {
  const removed = rooms.sweep();
  if (removed > 0) console.log(`[salas] ${removed} sala(s) vazia(s) removida(s)`);
}, 60_000);

http.listen(PORT, () => {
  console.log(`[servidor] WebSocket em ws://localhost:${PORT}${WS_PATH}`);
});

const shutdown = () => {
  clearInterval(heartbeat);
  clearInterval(sweeper);
  for (const socket of wss.clients) socket.close(1001, 'shutdown');
  http.close(() => process.exit(0));
  // Sockets que não fecharem a tempo não podem segurar o processo.
  setTimeout(() => process.exit(0), 2000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
