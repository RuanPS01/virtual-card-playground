import { useCallback, useMemo, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { PileSort } from '@shared/pileOrder';
import type { RoomView } from '@shared/types';
import type { CardDragApi } from '@/hooks/useCardDrag';
import type { ExitLookup } from '@/hooks/useCardTransitions';
import type { Point, StageMetrics } from '@/game/layout';
import { DECK_KEY, pileKey, seatColor } from '@/game/stage';
import type { StageTargets } from '@/game/targets';
import CardSprite from './CardSprite';
import DeckStack from './DeckStack';
import PileChip from './PileChip';

// Camada única onde vivem todas as cartas, o monte e as etiquetas de grupo.
// Mesa, grupos e mão não são contêineres diferentes: são alvos diferentes na
// mesma camada. É isso que permite uma carta voar da mão para a mesa sem ser
// desmontada e montada de novo.

interface CardLayerProps {
  view: RoomView;
  metrics: StageMetrics;
  targets: StageTargets;
  spawns: ReadonlyMap<string, Point>;
  exitLookup: ExitLookup;
  drag: CardDragApi;
  shuffleTick: number;
  onPileSort(pileId: string, sort: PileSort): void;
  /** Sobreposições que precisam ficar entre as cartas da mesa e a carta segurada. */
  children?: ReactNode;
}

const CardLayer = ({ view, metrics, targets, spawns, exitLookup, drag, shuffleTick, onPileSort, children }: CardLayerProps) => {
  const { begin, held, hover } = drag;

  const grabCard = useCallback((cardId: string, event: ReactPointerEvent) => begin({ kind: 'card', cardId }, event), [begin]);
  const grabPile = useCallback((pileId: string, event: ReactPointerEvent) => begin({ kind: 'pile', pileId }, event), [begin]);
  const grabDeck = useCallback((event: ReactPointerEvent) => begin({ kind: 'deck' }, event), [begin]);

  const players = useMemo(() => new Map(view.players.map((player) => [player.id, player])), [view.players]);
  const holderOf = (key: string) => {
    const player = players.get(targets.holders.get(key) ?? '');
    return player ? { name: player.name, color: seatColor(player.seat) } : null;
  };

  return (
    <div className="card-layer">
      <DeckStack
        count={view.deckCount}
        metrics={metrics}
        held={held.has(DECK_KEY)}
        highlighted={hover === 'deck'}
        shuffleTick={shuffleTick}
        onGrab={grabDeck}
      />

      <AnimatePresence custom={exitLookup}>
        {view.cards.map((card) => {
          const target = targets.cards.get(card.id);
          if (!target) return null;
          const spawn = spawns.get(card.id);
          // Grupo arrastado por outro jogador marca todas as cartas dele.
          const holder = holderOf(card.id) ?? (card.pileId ? holderOf(pileKey(card.pileId)) : null);
          const drop = card.zone === 'table' ? `card:${card.id}` : card.zone === 'pile' ? pileKey(card.pileId ?? '') : undefined;
          return (
            <CardSprite
              key={card.id}
              id={card.id}
              zone={card.zone}
              drop={drop}
              faceUp={card.faceUp}
              suit={card.suit}
              rank={card.rank}
              tx={target.x}
              ty={target.y}
              rot={target.rot}
              scale={target.scale}
              z={target.z}
              cardW={metrics.cardW}
              cardH={metrics.cardH}
              stageW={metrics.w}
              spawnX={spawn?.x ?? null}
              spawnY={spawn?.y ?? null}
              held={held.has(card.id)}
              highlighted={hover === `card:${card.id}` || (card.pileId !== null && hover === pileKey(card.pileId))}
              holderName={holder?.name ?? null}
              holderColor={holder?.color ?? null}
              exitLookup={exitLookup}
              onGrab={grabCard}
            />
          );
        })}
      </AnimatePresence>

      {view.piles.map((pile) => {
        const geometry = targets.piles.get(pile.id);
        if (!geometry) return null;
        const key = pileKey(pile.id);
        // A etiqueta fica acima das cartas do próprio grupo e conta as cartas
        // de verdade, e não as vagas (a vaga aberta no leque não é carta).
        const members = view.cards.filter((card) => card.pileId === pile.id);
        const top = Math.max(0, ...members.map((card) => targets.cards.get(card.id)?.z ?? 0));
        return (
          <PileChip
            key={pile.id}
            pileId={pile.id}
            x={geometry.chip.x}
            y={geometry.chip.y}
            z={top + 1}
            count={members.length}
            mode={pile.mode}
            sort={pile.sort}
            onSort={onPileSort}
            held={held.has(key)}
            highlighted={hover === key}
            holderColor={holderOf(key)?.color ?? null}
            onGrab={grabPile}
          />
        );
      })}
      {children}
    </div>
  );
};

export default CardLayer;
