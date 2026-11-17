import { memo, useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, type Variants } from 'framer-motion';
import type { Rank, Suit } from '@shared/cards';
import type { ExitLookup } from '@/hooks/useCardTransitions';
import { useSpriteMotion } from '@/hooks/useSpriteMotion';
import { hashOf } from '@/game/layout';
import { CardBack, CardFront } from './CardFace';

// Uma carta na tela. Recebe só valores primitivos de propósito: com memo, o
// sprite só renderiza de novo quando algo DELE muda, e não a cada atualização
// da sala.

export interface CardSpriteProps {
  id: string;
  zone: 'hand' | 'table' | 'pile';
  /** Atributo data-drop: o que acontece quando outra carta é solta aqui. */
  drop: string | undefined;
  faceUp: boolean;
  suit: Suit | null;
  rank: Rank | null;
  tx: number;
  ty: number;
  rot: number;
  scale: number;
  z: number;
  cardW: number;
  cardH: number;
  stageW: number;
  spawnX: number | null;
  spawnY: number | null;
  held: boolean;
  highlighted: boolean;
  holderName: string | null;
  holderColor: string | null;
  exitLookup: ExitLookup;
  onGrab(id: string, event: ReactPointerEvent): void;
}

const Z_HELD = 900_000;
const MAX_TILT = 14;

const CardSprite = memo((props: CardSpriteProps) => {
  const { id, zone, faceUp, suit, rank, tx, ty, cardW, cardH, held, exitLookup } = props;

  const spawn = props.spawnX !== null && props.spawnY !== null ? { x: props.spawnX, y: props.spawnY } : null;
  const motionValues = useSpriteMotion(id, { x: tx, y: ty, rot: props.rot, scale: props.scale }, held, spawn);

  // Ao virar para baixo o servidor para de mandar naipe e valor. Guardar a
  // última face conhecida evita a frente ficar em branco no meio do giro.
  const face = useRef({ suit, rank });
  if (suit && rank) face.current = { suit, rank };

  const tilt = useRef<HTMLDivElement>(null);

  // A saída é uma variante que consulta o destino na hora em que a carta some
  // (o AnimatePresence congela as props do último render).
  const variants = useMemo<Variants>(
    () => ({
      exit: (lookup: ExitLookup) => {
        const target = lookup?.(id);
        return target
          ? { x: target.x, y: target.y, scale: 0.4, opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }
          : { scale: 0.7, opacity: 0, transition: { duration: 0.16 } };
      },
    }),
    [id],
  );

  // Inclinação 3D seguindo o mouse. Escreve variáveis CSS direto no elemento:
  // um setState por movimento do mouse seria um render por pixel.
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || held || !tilt.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    tilt.current.style.setProperty('--ry', `${(px - 0.5) * 2 * MAX_TILT}deg`);
    tilt.current.style.setProperty('--rx', `${(0.5 - py) * 2 * MAX_TILT}deg`);
    tilt.current.style.setProperty('--sx', `${px * 100}%`);
    tilt.current.style.setProperty('--sy', `${py * 100}%`);
  };

  const onPointerLeave = () => {
    tilt.current?.style.setProperty('--ry', '0deg');
    tilt.current?.style.setProperty('--rx', '0deg');
  };

  const style = {
    ...motionValues,
    width: cardW,
    height: cardH,
    marginLeft: -cardW / 2,
    marginTop: -cardH / 2,
    zIndex: held ? Z_HELD + props.z : props.z,
    fontSize: cardW * 0.2,
    // Cada carta flutua em um ponto diferente do ciclo.
    '--bob-delay': `${-(hashOf(id) % 40) / 10}s`,
    // A sombra cai para longe do centro da tela, como se a luz viesse dele.
    '--shx': `${((tx / Math.max(1, props.stageW) - 0.5) * cardW * 0.14).toFixed(1)}px`,
    '--shy': `${(held ? cardW * 0.22 : cardW * 0.07).toFixed(1)}px`,
    '--seat': props.holderColor ?? 'transparent',
  } as unknown as CSSProperties;

  return (
    <motion.div
      className="pc-sprite"
      data-key={id}
      data-drop={props.drop}
      data-zone={zone}
      data-face={faceUp ? 'up' : 'down'}
      data-held={held}
      data-hover={props.highlighted}
      data-remote={props.holderName !== null}
      style={style}
      variants={variants}
      exit="exit"
      custom={exitLookup}
      onPointerDown={(event) => props.onGrab(id, event)}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="pc-shadow" />
      <div className="pc-bob">
        <div className="pc-tilt" ref={tilt}>
          <div className="pc-flipper">
            <CardFront suit={face.current.suit} rank={face.current.rank} />
            <CardBack />
          </div>
          <div className="pc-shine" />
        </div>
      </div>
      {props.holderName !== null && <span className="pc-holder">{props.holderName}</span>}
    </motion.div>
  );
});
CardSprite.displayName = 'CardSprite';

export default CardSprite;
