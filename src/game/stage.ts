// Contexto do palco: o que os sprites e o controlador de arrasto compartilham.

import { createContext, useContext } from 'react';
import type { MotionValue } from 'framer-motion';

/**
 * Valores de movimento de algo arrastável. O controlador de arrasto escreve
 * neles direto a cada movimento do ponteiro, sem passar por estado do React:
 * 60 atualizações por segundo não podem custar 60 renders.
 */
export interface SpriteHandle {
  x: MotionValue<number>;
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  /** Escala de repouso atual (mesa 1, mão maior). */
  base(): number;
}

export type SpriteRegistry = Map<string, SpriteHandle>;

export type BurstKind = 'dust' | 'spark' | 'confetti';
export type TextTone = 'gold' | 'red' | 'blue';

/** Efeitos disparados de forma imperativa por eventos do jogo. */
export interface FxApi {
  burst(x: number, y: number, kind: BurstKind): void;
  text(x: number, y: number, text: string, tone?: TextTone): void;
  shake(strength?: number): void;
  /** "Pulo" de escala em uma carta ou etiqueta registrada. */
  pop(key: string): void;
}

export interface StageContextValue {
  registry: SpriteRegistry;
  fx: FxApi;
}

export const StageContext = createContext<StageContextValue | null>(null);

export const useStage = (): StageContextValue => {
  const value = useContext(StageContext);
  if (!value) throw new Error('useStage precisa estar dentro de GameStage');
  return value;
};

/** Chaves do registro para o que não é carta. */
export const DECK_KEY = 'deck-top';
export const pileKey = (pileId: string): string => `pile:${pileId}`;

/** Cores dos assentos, definidas como tokens em index.css. */
export const seatColor = (seat: number): string => `hsl(var(--seat-${seat % 8}))`;

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
