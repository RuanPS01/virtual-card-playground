// Persistência do assento e das preferências no navegador.

import type { RoomSession } from './types';

const SESSION_KEY = 'vcp.session';
const NAME_KEY = 'vcp.name';

/** Parâmetro do link de convite: /?sala=ABC123 */
export const ROOM_PARAM = 'sala';

// sessionStorage (e não localStorage) de propósito: sobrevive a recarregar a
// página, mas cada aba tem o seu. Com localStorage, abrir duas abas para
// testar faria a segunda roubar o assento da primeira.
export const loadSession = (): RoomSession | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as RoomSession;
    return session && typeof session.roomId === 'string' && typeof session.playerId === 'string' ? session : null;
  } catch {
    return null;
  }
};

export const saveSession = (session: RoomSession | null): void => {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Navegação privada pode bloquear o storage. O jogo segue sem retomada.
  }
};

export const loadName = (): string => {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
};

export const saveName = (name: string): void => {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Mesmo caso de loadSession.
  }
};

export const roomFromUrl = (): string => new URLSearchParams(window.location.search).get(ROOM_PARAM) ?? '';

/** Mantém o código da sala na URL para o endereço da aba servir de convite. */
export const syncRoomUrl = (roomId: string | null): void => {
  const url = new URL(window.location.href);
  if (roomId) url.searchParams.set(ROOM_PARAM, roomId);
  else url.searchParams.delete(ROOM_PARAM);
  window.history.replaceState(null, '', url);
};

export const inviteLink = (roomId: string): string => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(ROOM_PARAM, roomId);
  return url.toString();
};
