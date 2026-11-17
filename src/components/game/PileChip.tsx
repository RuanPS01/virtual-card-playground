import { memo, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { GalleryHorizontalEnd, GripVertical, Layers } from 'lucide-react';
import type { PileMode } from '@shared/types';
import { useSpriteMotion } from '@/hooks/useSpriteMotion';
import { pileKey } from '@/game/stage';
import { useT } from '@/lib/i18n';

// Etiqueta de um grupo de cartas: mostra a contagem, serve de alça para
// arrastar o grupo inteiro e, com um toque, alterna entre pilha e leque.
// Substitui o diálogo "Leque ou Pilha?" que abria a cada agrupamento.

interface PileChipProps {
  pileId: string;
  x: number;
  y: number;
  z: number;
  count: number;
  mode: PileMode;
  held: boolean;
  highlighted: boolean;
  holderColor: string | null;
  onGrab(pileId: string, event: ReactPointerEvent): void;
}

const PileChip = memo(({ pileId, x, y, z, count, mode, held, highlighted, holderColor, onGrab }: PileChipProps) => {
  const t = useT();
  const key = pileKey(pileId);
  const motionValues = useSpriteMotion(key, { x, y, rot: 0, scale: 1 }, held);
  const label = mode === 'fan' ? t('pile.toStack') : t('pile.toFan');

  return (
    <motion.div
      role="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      className="pile-chip"
      data-key={key}
      data-drop={key}
      data-held={held}
      data-hover={highlighted}
      data-remote={holderColor !== null}
      style={{ ...motionValues, zIndex: held ? 950_000 : z, '--seat': holderColor ?? 'transparent' } as unknown as CSSProperties}
      onPointerDown={(event) => onGrab(pileId, event)}
    >
      <GripVertical className="pile-chip-icon opacity-60" />
      <span className="tabular-nums">{count}</span>
      {mode === 'fan' ? <Layers className="pile-chip-icon" /> : <GalleryHorizontalEnd className="pile-chip-icon" />}
    </motion.div>
  );
});
PileChip.displayName = 'PileChip';

export default PileChip;
