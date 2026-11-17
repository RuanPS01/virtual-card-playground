// De onde uma carta nova surge e para onde uma carta removida vai.
//
// O monte e a mão dos outros jogadores chegam ao cliente só como contagem,
// então uma carta comprada "aparece" na visão e uma carta entregue "some".
// Este hook lê o último evento da sala para dar a essas cartas um ponto de
// partida (o monte, a etiqueta de quem jogou) e um ponto de chegada.

import { useCallback, useEffect, useMemo, useRef, type MutableRefObject, type RefObject } from 'react';
import type { RoomView } from '@shared/types';
import type { Point, StageMetrics } from '@/game/layout';

export type ExitLookup = (cardId: string) => Point | null;

/** A dica de soltura do monte vale por este tempo. */
const HINT_TTL_MS = 3000;

const badgeCenter = (stage: HTMLElement | null, playerId: string): Point | null => {
  const badge = stage?.querySelector<HTMLElement>(`[data-player="${playerId}"]`);
  if (!stage || !badge) return null;
  const origin = stage.getBoundingClientRect();
  const rect = badge.getBoundingClientRect();
  return { x: rect.left - origin.left + rect.width / 2, y: rect.top - origin.top + rect.height / 2 };
};

export const useCardTransitions = (
  view: RoomView,
  metrics: StageMetrics | null,
  stageRef: RefObject<HTMLElement>,
  spawnHint: MutableRefObject<(Point & { at: number }) | null>,
) => {
  const previous = useRef<Set<string> | null>(null);
  const exits = useRef(new Map<string, Point>());

  const spawns = useMemo(() => {
    const spawn = new Map<string, Point>();
    const before = previous.current;
    // Primeira visão (entrada ou retomada): as cartas já estão onde estão.
    if (!before || !metrics) return spawn;
    const last = view.last;
    const now = new Set(view.cards.map((card) => card.id));

    for (const card of view.cards) {
      if (before.has(card.id) || !last || last.cardId !== card.id) continue;
      if (last.from?.zone === 'deck') {
        const hint = spawnHint.current;
        const fresh = last.by === view.me && hint && performance.now() - hint.at < HINT_TTL_MS;
        spawn.set(card.id, fresh ? { x: hint.x, y: hint.y } : metrics.deck);
      } else if (last.from?.zone === 'hand' && last.from.playerId !== view.me) {
        const origin = badgeCenter(stageRef.current, last.from.playerId);
        if (origin) spawn.set(card.id, origin);
      }
    }

    exits.current = new Map();
    for (const id of before) {
      if (now.has(id) || !last) continue;
      if (last.type === 'reset' || (last.cardId === id && last.to?.zone === 'deck')) {
        exits.current.set(id, metrics.deck);
      } else if (last.cardId === id && last.to?.zone === 'hand' && last.to.playerId !== view.me) {
        const target = badgeCenter(stageRef.current, last.to.playerId);
        if (target) exits.current.set(id, target);
      }
    }
    return spawn;
    // metrics fica de fora de propósito: redimensionar a tela não cria cartas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    previous.current = new Set(view.cards.map((card) => card.id));
    // A dica é consumida aqui, depois do commit, e não dentro do useMemo: em
    // modo estrito o React chama o memo duas vezes e a segunda não a acharia.
    if (view.last?.by === view.me && view.last.from?.zone === 'deck') spawnHint.current = null;
  }, [view, spawnHint]);

  const exitLookup = useCallback<ExitLookup>((cardId) => exits.current.get(cardId) ?? null, []);

  return { spawns, exitLookup };
};
