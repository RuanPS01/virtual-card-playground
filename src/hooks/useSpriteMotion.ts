// Movimento de um sprite (carta, fantasma do monte, etiqueta de grupo).
// Cada sprite tem quatro valores de movimento e persegue o alvo com mola.
// Enquanto está "segurado", quem manda nos valores é o controlador de arrasto.

import { useEffect, useLayoutEffect, useRef } from 'react';
import { animate, useMotionValue } from 'framer-motion';
import type { Point } from '@/game/layout';
import { useStage, type SpriteHandle } from '@/game/stage';

interface Target extends Point {
  rot: number;
  scale: number;
}

// Mola levemente subamortecida: chega rápido e passa um fio do alvo antes de
// assentar. É o que dá o "peso" de carta em vez de um deslize linear.
const MOVE = { type: 'spring', stiffness: 360, damping: 30, mass: 0.9 } as const;
const SCALE = { type: 'spring', stiffness: 420, damping: 18 } as const;

export const useSpriteMotion = (key: string, target: Target, held: boolean, spawn?: Point | null) => {
  const { registry } = useStage();
  const x = useMotionValue(spawn?.x ?? target.x);
  const y = useMotionValue(spawn?.y ?? target.y);
  const rotate = useMotionValue(spawn ? 0 : target.rot);
  // Carta que nasce de um ponto de origem começa pequena e cresce no voo.
  const scale = useMotionValue(spawn ? target.scale * 0.55 : target.scale);

  const base = useRef(target.scale);
  base.current = target.scale;

  useLayoutEffect(() => {
    const handle: SpriteHandle = { x, y, rotate, scale, base: () => base.current };
    registry.set(key, handle);
    return () => {
      // Só remove se ainda for o próprio registro: uma remontagem com a mesma
      // chave pode ter registrado o novo antes deste cleanup rodar.
      if (registry.get(key) === handle) registry.delete(key);
    };
  }, [key, registry, x, y, rotate, scale]);

  useEffect(() => {
    if (held) return;
    const controls = [
      animate(x, target.x, MOVE),
      animate(y, target.y, MOVE),
      animate(rotate, target.rot, MOVE),
      animate(scale, target.scale, SCALE),
    ];
    return () => controls.forEach((control) => control.stop());
  }, [held, target.x, target.y, target.rot, target.scale, x, y, rotate, scale]);

  return { x, y, rotate, scale };
};
