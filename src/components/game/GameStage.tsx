import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import { animate } from 'framer-motion';
import { toast } from 'sonner';
import type { Rank, Suit } from '@shared/cards';
import type { Action, ErrorCode, PlayerView, RoomView } from '@shared/types';
import ConfirmDialog from '@/components/ConfirmDialog';
import RemoveCardsDialog from '@/components/RemoveCardsDialog';
import { useCardDrag } from '@/hooks/useCardDrag';
import { useCardTransitions } from '@/hooks/useCardTransitions';
import { useLiveDrags } from '@/hooks/useLiveDrags';
import type { RoomApi } from '@/hooks/useRoom';
import { useStageMetrics } from '@/hooks/useStageMetrics';
import { useViewEffects } from '@/hooks/useViewEffects';
import { prefersReducedMotion, StageContext, type FxApi, type SpriteRegistry } from '@/game/stage';
import { computeTargets, type StageTargets } from '@/game/targets';
import { t as translate, useT, type MessageKey } from '@/lib/i18n';
import { sfx } from '@/lib/sfx';
import CardLayer from './CardLayer';
import FxLayer, { type FxLayerHandle } from './effects/FxLayer';
import FeltBackground from './effects/FeltBackground';
import HandTray from './HandTray';
import HelpDialog from './HelpDialog';
import TopBar from './TopBar';

// Tela do jogo. Monta as três faixas (barra, mesa, mão), a camada de cartas
// por cima delas e liga o estado da sala aos hooks de arrasto e de efeitos.

interface GameStageProps {
  room: RoomApi;
  view: RoomView;
}

type Confirm = { kind: 'addDeck' } | { kind: 'reset' } | { kind: 'leave' } | { kind: 'removePlayer'; player: PlayerView };

const NO_HOLDERS: ReadonlyMap<string, string> = new Map();
const SHUFFLE_EVENTS = new Set(['shuffleDeck', 'reset', 'addDeck']);

const GameStage = ({ room, view }: GameStageProps) => {
  const t = useT();
  const stageRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const fxLayer = useRef<FxLayerHandle>(null);

  const [faceUp, setFaceUp] = useState(true);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const registry = useMemo<SpriteRegistry>(() => new Map(), []);

  const fx = useMemo<FxApi>(
    () => ({
      burst: (x, y, kind) => fxLayer.current?.burst(x, y, kind),
      text: (x, y, text, tone = 'gold') => fxLayer.current?.text(x, y, text, tone),
      shake: (strength = 1) => {
        if (prefersReducedMotion()) return;
        const reach = 7 * strength;
        shakeRef.current?.animate(
          [
            { transform: 'translate(0, 0) rotate(0deg)' },
            { transform: `translate(${reach}px, ${-reach * 0.6}px) rotate(${0.25 * strength}deg)` },
            { transform: `translate(${-reach * 0.8}px, ${reach * 0.5}px) rotate(${-0.2 * strength}deg)` },
            { transform: `translate(${reach * 0.4}px, ${reach * 0.3}px) rotate(0deg)` },
            { transform: 'translate(0, 0) rotate(0deg)' },
          ],
          { duration: 320, easing: 'ease-out' },
        );
      },
      pop: (key) => {
        const handle = registry.get(key);
        if (!handle) return;
        const base = handle.base();
        // Estica, afunda e assenta: o "pulo" que marca que algo aconteceu ali.
        animate(handle.scale, [base * 1.2, base * 0.93, base], { duration: 0.32, ease: 'easeOut' });
      },
    }),
    [registry],
  );

  const stageValue = useMemo(() => ({ registry, fx }), [registry, fx]);

  const refs = useMemo(() => ({ stage: stageRef, play: playRef, hand: handRef, deck: deckRef }), []);
  const { size, metrics } = useStageMetrics(refs);
  const live = useLiveDrags(room, view);

  const onError = useCallback((code: ErrorCode) => {
    sfx.error();
    toast.error(translate(`error.${code}` as MessageKey));
  }, []);

  const drag = useCardDrag({ stageRef, registry, fx, send: room.send, sendLive: room.sendLive, onError });

  const targets = useMemo<StageTargets | null>(
    () => (metrics ? computeTargets({ view, metrics, held: drag.held, handGap: drag.handGap, live }) : null),
    [view, metrics, drag.held, drag.handGap, live],
  );

  // Os hooks de arrasto e de efeitos leem o "mundo" por ref: precisam do valor
  // mais recente dentro de callbacks, sem recriar os callbacks a cada render.
  drag.world.current = { view, metrics, faceUp, holders: targets?.holders ?? NO_HOLDERS };
  const effectsWorld = useRef<{ view: RoomView; metrics: typeof metrics; targets: StageTargets | null } | null>(null);
  effectsWorld.current = { view, metrics, targets };

  useViewEffects(view, effectsWorld, fx);
  const { spawns, exitLookup } = useCardTransitions(view, metrics, stageRef, drag.spawnHint);

  const { send } = room;
  const act = useCallback(
    async (action: Action) => {
      const result = await send(action);
      if (!result.ok) onError((result as { error: ErrorCode }).error);
    },
    [send, onError],
  );

  const me = view.players.find((player) => player.id === view.me);
  const shuffleTick = view.last && SHUFFLE_EVENTS.has(view.last.type) ? view.last.rev : 0;

  // O texto fica guardado depois de fechar: o diálogo ainda está na tela
  // durante a animação de saída e não pode aparecer vazio.
  const confirmCopy = useRef({ title: '', text: '', ok: '' });
  if (confirm) {
    confirmCopy.current = {
      title: t(`confirm.${confirm.kind}.title` as MessageKey, confirm.kind === 'removePlayer' ? { name: confirm.player.name } : undefined),
      text: t(`confirm.${confirm.kind}.text` as MessageKey),
      ok: t(`confirm.${confirm.kind}.ok` as MessageKey),
    };
  }

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'addDeck') void act({ type: 'addDeck' });
    if (confirm.kind === 'reset') void act({ type: 'reset' });
    if (confirm.kind === 'removePlayer') void act({ type: 'removePlayer', playerId: confirm.player.id });
    if (confirm.kind === 'leave') void room.leave();
    setConfirm(null);
  };

  const stageStyle = {
    '--card-w': `${size.cardW}px`,
    '--card-h': `${size.cardH}px`,
    '--hand-scale': size.handScale,
  } as CSSProperties;

  const tableIsEmpty = !view.cards.some((card) => card.zone !== 'hand');

  return (
    <StageContext.Provider value={stageValue}>
      <div
        ref={stageRef}
        className="stage"
        data-compact={size.compact}
        style={stageStyle}
        // Toque longo no celular abriria o menu de contexto no meio do arrasto.
        onContextMenu={(event) => event.preventDefault()}
      >
        <div ref={shakeRef} className="stage-shake">
          <FeltBackground />

          <div className="stage-content">
            <TopBar
              view={view}
              status={room.status}
              hover={drag.hover}
              onRemovePlayer={(player) => setConfirm({ kind: 'removePlayer', player })}
              onAddDeck={() => setConfirm({ kind: 'addDeck' })}
              onRemoveCards={() => setRemoveOpen(true)}
              onReset={() => setConfirm({ kind: 'reset' })}
              onHelp={() => setHelpOpen(true)}
              onLeave={() => setConfirm({ kind: 'leave' })}
            />

            <main ref={playRef} className="play-area" data-drop="table">
              {tableIsEmpty && <span className="play-hint">{t('table.empty')}</span>}
            </main>

            <HandTray
              me={me}
              deckCount={view.deckCount}
              faceUp={faceUp}
              hover={drag.hover}
              onSort={(by) => void act({ type: 'sortHand', by })}
              onToggleFace={() => {
                sfx.tap();
                setFaceUp((value) => !value);
              }}
              onShuffle={() => void act({ type: 'shuffleDeck' })}
              handRef={handRef}
              deckRef={deckRef}
            />
          </div>

          {metrics && targets && (
            <CardLayer
              view={view}
              metrics={metrics}
              targets={targets}
              spawns={spawns}
              exitLookup={exitLookup}
              drag={drag}
              shuffleTick={shuffleTick}
            />
          )}

          <FxLayer ref={fxLayer} />
        </div>

        <div className="stage-crt" aria-hidden="true" />
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirmCopy.current.title}
        description={confirmCopy.current.text}
        confirmText={confirmCopy.current.ok}
        destructive={confirm?.kind === 'leave' || confirm?.kind === 'removePlayer' || confirm?.kind === 'reset'}
        onConfirm={runConfirm}
      />

      <RemoveCardsDialog
        isOpen={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onRemoveCards={(suits: Suit[], ranks: Rank[]) => void act({ type: 'removeCards', suits, ranks })}
      />

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </StageContext.Provider>
  );
};

export default GameStage;
