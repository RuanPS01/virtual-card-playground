import { memo, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { GalleryHorizontalEnd, GripVertical, Layers } from 'lucide-react';
import type { PileSort } from '@shared/pileOrder';
import type { PileMode } from '@shared/types';
import { useSpriteMotion } from '@/hooks/useSpriteMotion';
import { pileKey } from '@/game/stage';
import { useT } from '@/lib/i18n';
import PileSortMenu from './PileSortMenu';

// Etiqueta de um grupo de cartas. A alça mostra a contagem, serve para
// arrastar o grupo inteiro (para a mesa, o monte, uma mão ou outro grupo) e,
// com um toque, alterna entre pilha e leque. Com o grupo em leque aparece ao
// lado o botão de ordem das cartas.

interface PileChipProps {
  pileId: string;
  x: number;
  y: number;
  z: number;
  count: number;
  mode: PileMode;
  sort: PileSort;
  held: boolean;
  highlighted: boolean;
  holderColor: string | null;
  onGrab(pileId: string, event: ReactPointerEvent): void;
  onSort(pileId: string, sort: PileSort): void;
}

const PileChip = memo(({ pileId, x, y, z, count, mode, sort, held, highlighted, holderColor, onGrab, onSort }: PileChipProps) => {
  const t = useT();
  const key = pileKey(pileId);
  const motionValues = useSpriteMotion(key, { x, y, rot: 0, scale: 1 }, held);
  const label = mode === 'fan' ? t('pile.toStack') : t('pile.toFan');

  return (
    // O contêiner é o que se move; o botão de ordem fica fora do fluxo, à
    // direita, para a alça continuar centralizada embaixo do grupo.
    <motion.div className="pile-tools" style={{ ...motionValues, zIndex: held ? 950_000 : z } as unknown as CSSProperties}>
      <div
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
        style={{ '--seat': holderColor ?? 'transparent' } as CSSProperties}
        onPointerDown={(event) => onGrab(pileId, event)}
      >
        <GripVertical className="pile-chip-icon opacity-60" />
        <span className="tabular-nums">{count}</span>
        {mode === 'fan' ? <Layers className="pile-chip-icon" /> : <GalleryHorizontalEnd className="pile-chip-icon" />}
      </div>
      {mode === 'fan' && !held && <PileSortMenu sort={sort} onChange={(next) => onSort(pileId, next)} />}
    </motion.div>
  );
});
PileChip.displayName = 'PileChip';

export default PileChip;
