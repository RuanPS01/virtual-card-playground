// Arrastos dos OUTROS jogadores, recebidos como mensagens efêmeras. É o que
// faz a carta acompanhar o dedo de quem arrasta em vez de pular para o destino.

import { useEffect, useState } from 'react';
import type { RoomView } from '@shared/types';
import type { LiveDrag } from '@/game/targets';
import type { RoomApi } from './useRoom';

/** Sem atualização por este tempo, o arrasto é descartado (o "end" pode ter se perdido). */
const STALE_MS = 4000;

export const useLiveDrags = (room: RoomApi, view: RoomView): ReadonlyMap<string, LiveDrag> => {
  const [drags, setDrags] = useState<ReadonlyMap<string, LiveDrag>>(() => new Map());
  // onLive é estável. O objeto `room` inteiro muda a cada render e faria a
  // assinatura ser refeita sem necessidade.
  const { onLive } = room;

  useEffect(
    () =>
      onLive((from, msg) => {
        setDrags((prev) => {
          if (msg.kind === 'end') {
            if (!prev.has(from)) return prev;
            const next = new Map(prev);
            next.delete(from);
            return next;
          }
          const next = new Map(prev);
          next.set(from, { target: msg.target, id: msg.id, x: msg.x, y: msg.y, at: Date.now() });
          return next;
        });
      }),
    [onLive],
  );

  useEffect(() => {
    if (drags.size === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setDrags((prev) => {
        const alive = [...prev].filter(([, drag]) => now - drag.at < STALE_MS);
        return alive.length === prev.size ? prev : new Map(alive);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [drags.size]);

  // Quem caiu no meio de um arrasto não manda "end".
  useEffect(() => {
    setDrags((prev) => {
      const online = new Set(view.players.filter((player) => player.connected).map((player) => player.id));
      const alive = [...prev].filter(([playerId]) => online.has(playerId));
      return alive.length === prev.size ? prev : new Map(alive);
    });
  }, [view.players]);

  return drags;
};
