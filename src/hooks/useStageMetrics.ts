// Mede o palco e as âncoras do layout (área da mesa, faixa da mão, vaga do
// monte). O CSS decide onde cada bloco fica, com flex e safe-area, e este hook
// só lê os retângulos resultantes. Assim a mesma conta serve para celular em
// pé, deitado, tablet e desktop sem pontos de quebra espalhados no JS.

import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { cardSizeFor, type Rect, type StageMetrics } from '@/game/layout';

interface Anchors {
  w: number;
  h: number;
  play: Rect;
  hand: Rect;
  deck: Rect;
}

export interface StageRefs {
  stage: RefObject<HTMLElement>;
  play: RefObject<HTMLElement>;
  hand: RefObject<HTMLElement>;
  deck: RefObject<HTMLElement>;
}

const sameRect = (a: Rect, b: Rect): boolean => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

export const useStageMetrics = (refs: StageRefs): { size: ReturnType<typeof cardSizeFor>; metrics: StageMetrics | null } => {
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [anchors, setAnchors] = useState<Anchors | null>(null);

  useLayoutEffect(() => {
    const stage = refs.stage.current;
    const play = refs.play.current;
    const hand = refs.hand.current;
    const deck = refs.deck.current;
    if (!stage || !play || !hand || !deck) return;

    const measure = () => {
      const origin = stage.getBoundingClientRect();
      const rectOf = (element: HTMLElement): Rect => {
        const rect = element.getBoundingClientRect();
        return {
          x: Math.round(rect.left - origin.left),
          y: Math.round(rect.top - origin.top),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        };
      };
      const next: Anchors = {
        w: Math.round(origin.width),
        h: Math.round(origin.height),
        play: rectOf(play),
        hand: rectOf(hand),
        deck: rectOf(deck),
      };
      setViewport((prev) => (prev.w === next.w && prev.h === next.h ? prev : { w: next.w, h: next.h }));
      // Guardar o mesmo objeto quando nada mudou evita um ciclo: o tamanho da
      // carta muda o layout, que dispara o observer, que mediria de novo.
      setAnchors((prev) =>
        prev &&
        prev.w === next.w &&
        prev.h === next.h &&
        sameRect(prev.play, next.play) &&
        sameRect(prev.hand, next.hand) &&
        sameRect(prev.deck, next.deck)
          ? prev
          : next,
      );
    };

    const observer = new ResizeObserver(measure);
    [stage, play, hand, deck].forEach((element) => observer.observe(element));
    measure();
    // Girar o aparelho nem sempre dispara o ResizeObserver no mesmo quadro.
    window.addEventListener('orientationchange', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [refs.stage, refs.play, refs.hand, refs.deck]);

  const size = useMemo(() => cardSizeFor(viewport.w, viewport.h), [viewport.w, viewport.h]);

  const metrics = useMemo<StageMetrics | null>(() => {
    if (!anchors || anchors.play.w <= 0 || anchors.play.h <= 0) return null;
    return {
      ...size,
      w: anchors.w,
      h: anchors.h,
      play: anchors.play,
      hand: anchors.hand,
      deck: { x: anchors.deck.x + anchors.deck.w / 2, y: anchors.deck.y + anchors.deck.h / 2 },
    };
  }, [anchors, size]);

  return { size, metrics };
};
