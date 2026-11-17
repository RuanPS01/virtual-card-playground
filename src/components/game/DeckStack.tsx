import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { animate, motion } from 'framer-motion';
import { useSpriteMotion } from '@/hooks/useSpriteMotion';
import type { StageMetrics } from '@/game/layout';
import { DECK_KEY } from '@/game/stage';
import { useT } from '@/lib/i18n';
import { CardBack } from './CardFace';

// O monte. As cartas dele não existem individualmente no cliente (só a
// contagem chega), então o que se arrasta é um "fantasma": um verso que segue
// o ponteiro e, ao ser solto, vira o pedido "mova o topo do monte para cá".

interface DeckStackProps {
  count: number;
  metrics: StageMetrics;
  held: boolean;
  highlighted: boolean;
  /** Muda a cada embaralhada para reiniciar a animação. */
  shuffleTick: number;
  onGrab(event: ReactPointerEvent): void;
}

const DeckStack = ({ count, metrics, held, highlighted, shuffleTick, onGrab }: DeckStackProps) => {
  const t = useT();
  const { deck, cardW, cardH } = metrics;
  const motionValues = useSpriteMotion(DECK_KEY, { x: deck.x, y: deck.y, rot: 0, scale: 1 }, held);

  const firstTick = useRef(shuffleTick);
  useEffect(() => {
    if (shuffleTick === firstTick.current || shuffleTick === 0) return;
    const control = animate(motionValues.rotate, [0, -9, 8, -6, 4, 0], { duration: 0.5 });
    return () => control.stop();
  }, [shuffleTick, motionValues.rotate]);

  const size: CSSProperties = { width: cardW, height: cardH, marginLeft: -cardW / 2, marginTop: -cardH / 2, fontSize: cardW * 0.2 };
  // Camadas de volume sob a carta do topo. Não crescem além de três.
  const layers = Math.min(3, Math.max(0, count - 1));

  return (
    <>
      <div
        key={shuffleTick}
        className="deck-base"
        data-shuffle={shuffleTick !== 0 && shuffleTick !== firstTick.current}
        data-hover={highlighted}
        style={{ ...size, left: deck.x, top: deck.y }}
      >
        {count === 0 && <span className="deck-empty">{t('deck.empty')}</span>}
        {Array.from({ length: layers }, (_, index) => (
          <div
            key={index}
            className="deck-layer"
            style={{ '--i': index, transform: `translate(${(layers - index) * -1.5}px, ${(layers - index) * 2}px)` } as CSSProperties}
          >
            <CardBack flat />
          </div>
        ))}
      </div>
      {count > 0 && (
        <motion.div
          className="pc-sprite"
          data-key={DECK_KEY}
          data-drop="deck"
          data-zone="deck"
          data-face="down"
          data-held={held}
          data-hover={highlighted}
          style={{ ...motionValues, ...size, zIndex: held ? 950_000 : 6, '--shx': '0px', '--shy': `${held ? cardW * 0.22 : 0}px` } as unknown as CSSProperties}
          onPointerDown={onGrab}
        >
          <div className="pc-shadow" />
          <div className="pc-tilt">
            <div className="pc-flipper">
              <CardBack />
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default DeckStack;
