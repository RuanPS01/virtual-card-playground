import { forwardRef, type CSSProperties } from 'react';
import { ArrowDownWideNarrow, Eye, EyeOff, Shapes, Shuffle } from 'lucide-react';
import type { PlayerView } from '@shared/types';
import { seatColor } from '@/game/stage';
import { useT } from '@/lib/i18n';

// Faixa inferior: a mão do jogador e o monte. As cartas em si são desenhadas
// na CardLayer. Aqui ficam só o fundo, os controles e as ÂNCORAS que o hook
// useStageMetrics mede para saber onde a mão e o monte estão na tela.

interface HandTrayProps {
  me: PlayerView | undefined;
  deckCount: number;
  faceUp: boolean;
  hover: string | null;
  onSort(by: 'rank' | 'suit'): void;
  onToggleFace(): void;
  onShuffle(): void;
  handRef: React.RefObject<HTMLDivElement>;
  deckRef: React.RefObject<HTMLDivElement>;
}

const HandTray = forwardRef<HTMLDivElement, HandTrayProps>(
  ({ me, deckCount, faceUp, hover, onSort, onToggleFace, onShuffle, handRef, deckRef }, ref) => {
    const t = useT();
    const handCount = me?.handCount ?? 0;

    return (
      <footer className="hud-bottom" ref={ref}>
        <section className="hand-tray" data-drop="hand" data-hover={hover === 'hand'}>
          <div className="tray-head">
            <span className="tray-title" style={{ '--seat': seatColor(me?.seat ?? 0) } as CSSProperties}>
              <span className="player-dot" />
              <span className="min-w-0 truncate">{me?.name ?? t('hand.title')}</span>
              <span className="tray-count">{handCount}</span>
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button type="button" className="chip-btn" onClick={() => onSort('rank')} disabled={handCount < 2} title={`${t('hand.sort')}: ${t('hand.sortRank')}`}>
                <ArrowDownWideNarrow />
                <span className="chip-label">{t('hand.sortRank')}</span>
              </button>
              <button type="button" className="chip-btn" onClick={() => onSort('suit')} disabled={handCount < 2} title={`${t('hand.sort')}: ${t('hand.sortSuit')}`}>
                <Shapes />
                <span className="chip-label">{t('hand.sortSuit')}</span>
              </button>
              <button type="button" className="chip-btn" data-active={!faceUp} aria-pressed={!faceUp} onClick={onToggleFace} title={t('hand.faceHint')}>
                {faceUp ? <Eye /> : <EyeOff />}
                <span>{faceUp ? t('hand.faceUp') : t('hand.faceDown')}</span>
              </button>
            </div>
          </div>
          <div className="hand-slots" ref={handRef}>
            {handCount === 0 && <span className="hand-empty">{t('hand.empty')}</span>}
          </div>
        </section>

        <section className="deck-slot" data-drop="deck" data-hover={hover === 'deck'}>
          <div className="tray-head justify-between">
            <span className="tray-count" title={t('deck.label')}>
              {deckCount}
            </span>
            <button type="button" className="chip-btn" onClick={onShuffle} disabled={deckCount < 2} title={t('deck.shuffle')} aria-label={t('deck.shuffle')}>
              <Shuffle />
            </button>
          </div>
          <div className="deck-anchor" ref={deckRef} />
        </section>
      </footer>
    );
  },
);
HandTray.displayName = 'HandTray';

export default HandTray;
