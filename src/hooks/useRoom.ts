// Ciclo de vida da sala: entrar, retomar depois de recarregar, sair, e a
// visão atual do jogo. É o único ponto da interface que fala com o transporte.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Action, LiveMessage, RoomView } from '@shared/types';
import { t, type MessageKey } from '@/lib/i18n';
import {
  connectRoom,
  RealtimeError,
  transportKind,
  type ConnectionStatus,
  type ConnectRequest,
  type RoomConnection,
  type RoomHandlers,
  type SendResult,
  type TransportKind,
} from '@/lib/realtime';
import { loadSession, saveName, saveSession, syncRoomUrl } from '@/lib/realtime/session';

export type RoomPhase = 'lobby' | 'connecting' | 'playing';
export type LiveListener = (from: string, msg: LiveMessage) => void;

export interface RoomApi {
  phase: RoomPhase;
  status: ConnectionStatus;
  view: RoomView | null;
  transport: TransportKind;
  /** Código da sala que está sendo retomada (para a tela de carregamento). */
  resumingRoom: string | null;
  create(name: string): Promise<void>;
  join(roomId: string, name: string): Promise<void>;
  leave(): Promise<void>;
  send(action: Action): Promise<SendResult>;
  sendLive(msg: LiveMessage): void;
  onLive(listener: LiveListener): () => void;
}

const RESUME_TRIES = 3;

const errorCode = (error: unknown): string => (error instanceof RealtimeError ? error.code : 'offline');
const errorText = (code: string): string => t(`error.${code}` as MessageKey);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useRoom = (): RoomApi => {
  const [saved] = useState(() => {
    const session = loadSession();
    return session && session.transport === transportKind ? session : null;
  });
  const [phase, setPhase] = useState<RoomPhase>(saved ? 'connecting' : 'lobby');
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [view, setView] = useState<RoomView | null>(null);
  const [resumingRoom, setResumingRoom] = useState<string | null>(saved?.roomId ?? null);

  const connection = useRef<RoomConnection | null>(null);
  const liveListeners = useRef(new Set<LiveListener>());
  const statusRef = useRef<ConnectionStatus>('online');
  // Cada tentativa de conexão ganha um número. Se outra começar (ou o
  // componente desmontar) antes de esta terminar, o resultado é descartado.
  const attempt = useRef(0);

  const backToLobby = useCallback(() => {
    connection.current = null;
    saveSession(null);
    syncRoomUrl(null);
    setView(null);
    setResumingRoom(null);
    setPhase('lobby');
  }, []);

  const handlers = useMemo<RoomHandlers>(
    () => ({
      onView: setView,
      onLive: (from, msg) => liveListeners.current.forEach((listener) => listener(from, msg)),
      onStatus: (next) => {
        if (statusRef.current === 'reconnecting' && next === 'online') toast.success(t('toast.reconnected'));
        statusRef.current = next;
        setStatus(next);
      },
      onClosed: (reason) => {
        backToLobby();
        toast.message(t(`toast.closed.${reason}` as MessageKey));
      },
    }),
    [backToLobby],
  );

  const open = useCallback(
    async (request: ConnectRequest): Promise<'ok' | 'stale'> => {
      const mine = ++attempt.current;
      try {
        const opened = await connectRoom(request, handlers);
        if (mine !== attempt.current) {
          opened.dispose();
          return 'stale';
        }
        connection.current = opened;
        saveSession(opened.session);
        syncRoomUrl(opened.session.roomId);
        statusRef.current = 'online';
        setStatus('online');
        setResumingRoom(null);
        setPhase('playing');
        return 'ok';
      } catch (error) {
        if (mine !== attempt.current) return 'stale';
        throw error;
      }
    },
    [handlers],
  );

  /** Invalida tentativas em andamento e solta a conexão sem sair da sala. */
  const teardown = useCallback(() => {
    attempt.current++;
    connection.current?.dispose();
    connection.current = null;
  }, []);

  // Retomada: quem recarrega a página volta para o mesmo assento, com a mesma mão.
  useEffect(() => {
    let cancelled = false;
    const resume = async () => {
      if (!saved) return;
      let code = 'offline';
      for (let i = 0; i < RESUME_TRIES && !cancelled; i++) {
        try {
          await open({ kind: 'resume', session: saved });
          return;
        } catch (error) {
          code = errorCode(error);
          // Sala inexistente ou sessão inválida não melhoram com insistência.
          if (code !== 'offline' && code !== 'timeout') break;
          await sleep(1200);
        }
      }
      if (cancelled) return;
      backToLobby();
      toast.error(errorText(code));
    };
    void resume();
    return () => {
      cancelled = true;
      teardown();
    };
  }, [saved, open, backToLobby, teardown]);

  const enter = useCallback(
    async (request: ConnectRequest, name: string, success: MessageKey) => {
      saveName(name);
      setPhase('connecting');
      try {
        if ((await open(request)) === 'ok') {
          toast.success(t(success, { room: connection.current?.session.roomId ?? '' }));
        }
      } catch (error) {
        setPhase('lobby');
        toast.error(errorText(errorCode(error)));
      }
    },
    [open],
  );

  const create = useCallback((name: string) => enter({ kind: 'create', name }, name, 'toast.roomCreated'), [enter]);

  const join = useCallback(
    (roomId: string, name: string) => enter({ kind: 'join', roomId, name }, name, 'toast.roomJoined'),
    [enter],
  );

  const leave = useCallback(async () => {
    const current = connection.current;
    attempt.current++;
    backToLobby();
    await current?.leave();
    toast.message(t('toast.left'));
  }, [backToLobby]);

  const send = useCallback(
    (action: Action): Promise<SendResult> =>
      connection.current?.send(action) ?? Promise.resolve<SendResult>({ ok: false, error: 'offline' }),
    [],
  );

  const sendLive = useCallback((msg: LiveMessage) => connection.current?.sendLive(msg), []);

  const onLive = useCallback((listener: LiveListener) => {
    liveListeners.current.add(listener);
    return () => {
      liveListeners.current.delete(listener);
    };
  }, []);

  return { phase, status, view, transport: transportKind, resumingRoom, create, join, leave, send, sendLive, onLive };
};
