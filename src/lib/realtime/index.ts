// Escolha do transporte. Com VITE_WS_URL definido no build, o jogo usa o
// servidor WebSocket autoritativo. Sem ele, cai no Firebase, que funciona em
// hospedagem estática (GitHub Pages) sem nenhum servidor próprio.

import { connectWs, wsEndpoint } from './wsTransport';
import type { ConnectRequest, RoomConnection, RoomHandlers, TransportKind } from './types';

const WS_URL = (import.meta.env.VITE_WS_URL ?? '').trim();

export const transportKind: TransportKind = WS_URL ? 'ws' : 'firebase';

export const connectRoom = async (request: ConnectRequest, handlers: RoomHandlers): Promise<RoomConnection> => {
  if (transportKind === 'ws') return connectWs(wsEndpoint(WS_URL), request, handlers);
  // Import dinâmico: o SDK do Firebase é pesado e não deve entrar no pacote
  // inicial de quem joga pelo WebSocket.
  const { connectFirebase } = await import('./firebaseTransport');
  return connectFirebase(request, handlers);
};

export * from './types';
