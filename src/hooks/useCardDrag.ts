// Controlador de arrasto por Pointer Events.
//
// O jogo antigo usava drag and drop nativo do HTML5, que não dispara em telas
// de toque, e ainda combinava isso com o `drag` do framer-motion na mesma
// carta. Aqui existe um caminho só, igual para mouse, dedo e caneta: o
// ponteiro move os valores de movimento do sprite diretamente e, ao soltar, o
// alvo é resolvido e vira UMA ação enviada à sala.

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { animate } from 'framer-motion';
import type { Action, CardSource, ErrorCode, LiveMessage, RoomView } from '@shared/types';
import { clamp, handSlots, nearestSlot, stageToTable, type Point, type StageMetrics } from '@/game/layout';
import { DECK_KEY, pileKey, type FxApi, type SpriteRegistry } from '@/game/stage';
import type { SendResult } from '@/lib/realtime';
import { sfx } from '@/lib/sfx';

export type DragSource =
  | { kind: 'card'; cardId: string }
  | { kind: 'deck' }
  | { kind: 'pile'; pileId: string };

type DropTarget =
  | { kind: 'hand'; index: number; beforeId: string | null }
  | { kind: 'player'; playerId: string }
  | { kind: 'deck' }
  | { kind: 'pile'; pileId: string }
  | { kind: 'card'; cardId: string }
  | { kind: 'table'; x: number; y: number };

/** O que o controlador precisa saber do mundo no instante do gesto. */
export interface DragWorld {
  view: RoomView;
  metrics: StageMetrics | null;
  /** Seletor aberta/fechada: face das cartas que chegam da mão ou do monte. */
  faceUp: boolean;
  /** Cartas e grupos (chave "pile:ID") que outro jogador está arrastando. */
  holders: ReadonlyMap<string, string>;
}

interface ActiveDrag {
  pointerId: number;
  pointerType: string;
  source: DragSource;
  startX: number;
  startY: number;
  started: boolean;
  keys: string[];
  offsets: Map<string, Point>;
  /** Posição atual do ponteiro em coordenadas do palco. */
  px: number;
  py: number;
  lastClientX: number;
  rot: number;
  rotTarget: number;
  dirty: boolean;
  lastLive: number;
  live: { target: 'card' | 'pile'; id: string } | null;
  frame: number;
  detach(): void;
}

interface Params {
  stageRef: RefObject<HTMLElement>;
  registry: SpriteRegistry;
  fx: FxApi;
  send(action: Action): Promise<SendResult>;
  sendLive(msg: LiveMessage): void;
  onError(code: ErrorCode): void;
}

const LIVE_EVERY_MS = 55;
/** Distância que separa um toque de um arrasto. O dedo treme mais que o mouse. */
const thresholdFor = (pointerType: string): number => (pointerType === 'mouse' ? 5 : 9);

export const useCardDrag = ({ stageRef, registry, fx, send, sendLive, onError }: Params) => {
  const [held, setHeld] = useState<ReadonlySet<string>>(() => new Set());
  const [handGap, setHandGap] = useState<number | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const world = useRef<DragWorld | null>(null);
  const active = useRef<ActiveDrag | null>(null);
  const heldRef = useRef(held);
  heldRef.current = held;
  /** Onde o jogador soltou a carta fantasma do monte: a carta real nasce ali. */
  const spawnHint = useRef<(Point & { at: number }) | null>(null);

  const hold = useCallback((keys: string[]) => {
    setHeld((prev) => new Set([...prev, ...keys]));
  }, []);

  const release = useCallback((keys: string[]) => {
    setHeld((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => next.delete(key));
      return next;
    });
  }, []);

  const stageOrigin = useCallback((): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    return { x: rect?.left ?? 0, y: rect?.top ?? 0 };
  }, [stageRef]);

  /** Centro do que está sendo arrastado, em pixels do palco. */
  const centerOf = useCallback(
    (drag: ActiveDrag, m: StageMetrics): Point | null => {
      if (drag.source.kind === 'pile') {
        const chip = registry.get(pileKey(drag.source.pileId));
        // A etiqueta fica logo abaixo do grupo. O centro sai dela.
        return chip ? { x: chip.x.get(), y: chip.y.get() - m.cardH / 2 - 15 } : null;
      }
      const handle = registry.get(drag.keys[0]);
      return handle ? { x: handle.x.get(), y: handle.y.get() } : null;
    },
    [registry],
  );

  const resolve = useCallback(
    (drag: ActiveDrag): DropTarget | null => {
      const now = world.current;
      const m = now?.metrics;
      if (!now || !m) return null;
      const center = centerOf(drag, m);
      if (!center) return null;

      if (drag.source.kind === 'pile') {
        return { kind: 'table', ...stageToTable(m, center.x, center.y) };
      }

      const origin = stageOrigin();
      const card = drag.source.kind === 'card' ? now.view.cards.find((c) => c.id === (drag.source as { cardId: string }).cardId) : null;

      // O que está sob o ponteiro, do mais alto para o mais baixo. Ler o DOM
      // respeita sobreposição e rotação exatamente como a tela mostra.
      for (const element of document.elementsFromPoint(drag.px + origin.x, drag.py + origin.y)) {
        const data = (element as HTMLElement).dataset;
        const drop = data?.drop;
        if (!drop) continue;
        if (data.key && drag.keys.includes(data.key)) continue;

        if (drop === 'hand') {
          const free = now.view.cards
            .filter((c) => c.zone === 'hand' && !drag.keys.includes(c.id) && !heldRef.current.has(c.id))
            .sort((a, b) => a.order - b.order);
          const index = nearestSlot(handSlots(m, free.length + 1), center.x);
          return { kind: 'hand', index, beforeId: free[index]?.id ?? null };
        }
        if (drop === 'deck') return drag.source.kind === 'deck' ? null : { kind: 'deck' };
        if (drop.startsWith('player:')) return { kind: 'player', playerId: drop.slice(7) };
        if (drop.startsWith('pile:')) {
          const pileId = drop.slice(5);
          // Soltar no próprio grupo cancela: a carta volta para o lugar.
          return card?.pileId === pileId ? null : { kind: 'pile', pileId };
        }
        if (drop.startsWith('card:')) {
          const targetId = drop.slice(5);
          const target = registry.get(targetId);
          // Só agrupa quando os centros estão próximos. Encostar de leve em
          // outra carta é sobreposição livre, e não pedido de grupo.
          if (target && Math.abs(center.x - target.x.get()) < m.cardW * 0.5 && Math.abs(center.y - target.y.get()) < m.cardH * 0.5) {
            return { kind: 'card', cardId: targetId };
          }
        }
      }
      return { kind: 'table', ...stageToTable(m, center.x, center.y) };
    },
    [centerOf, registry, stageOrigin],
  );

  const toAction = useCallback((source: DragSource, target: DropTarget): Action | null => {
    const now = world.current;
    if (!now) return null;
    if (source.kind === 'pile') {
      return target.kind === 'table' ? { type: 'movePile', pileId: source.pileId, x: target.x, y: target.y } : null;
    }
    const src: CardSource = source.kind === 'deck' ? { from: 'deck' } : { from: 'card', cardId: source.cardId };
    const card = source.kind === 'card' ? now.view.cards.find((c) => c.id === source.cardId) : null;
    // Carta que já está na mesa mantém a face. O seletor só vale para quem
    // chega da mão ou do monte.
    const faceUp = source.kind === 'deck' || card?.zone === 'hand' ? now.faceUp : undefined;
    switch (target.kind) {
      case 'hand':
        return { type: 'toHand', src, beforeId: target.beforeId };
      case 'player':
        return { type: 'toHand', src, playerId: target.playerId };
      case 'deck':
        return source.kind === 'card' ? { type: 'toDeck', cardId: source.cardId } : null;
      case 'pile':
        return { type: 'toPile', src, pileId: target.pileId, faceUp };
      case 'card':
        return { type: 'stackOn', src, targetId: target.cardId, faceUp };
      case 'table':
        return { type: 'toTable', src, x: target.x, y: target.y, faceUp };
    }
  }, []);

  const settleHandles = useCallback(
    (keys: string[]) => {
      keys.forEach((key) => {
        const handle = registry.get(key);
        if (!handle) return;
        animate(handle.rotate, 0, { type: 'spring', stiffness: 300, damping: 18 });
        animate(handle.scale, handle.base(), { type: 'spring', stiffness: 520, damping: 16 });
      });
    },
    [registry],
  );

  const finish = useCallback((drag: ActiveDrag) => {
    drag.detach();
    cancelAnimationFrame(drag.frame);
    if (active.current === drag) active.current = null;
    setHover(null);
  }, []);

  const cancel = useCallback(
    (drag: ActiveDrag) => {
      finish(drag);
      if (!drag.started) return;
      if (drag.live) sendLive({ kind: 'end' });
      setHandGap(null);
      release(drag.keys);
    },
    [finish, release, sendLive],
  );

  const tap = useCallback(
    async (source: DragSource) => {
      const now = world.current;
      if (!now) return;
      let action: Action | null = null;
      if (source.kind === 'deck') {
        action = { type: 'toHand', src: { from: 'deck' } };
      } else if (source.kind === 'pile') {
        const pile = now.view.piles.find((p) => p.id === source.pileId);
        if (pile) action = { type: 'setPileMode', pileId: pile.id, mode: pile.mode === 'fan' ? 'stack' : 'fan' };
      } else {
        const card = now.view.cards.find((c) => c.id === source.cardId);
        if (card?.zone === 'hand') {
          // Tocar em carta da mão não tem ação de jogo, mas responde ao toque.
          sfx.tap();
          fx.pop(card.id);
          return;
        }
        if (card) action = { type: 'flip', cardId: card.id };
      }
      if (!action) return;
      const result = await send(action);
      if (!result.ok) onError((result as { error: ErrorCode }).error);
    },
    [fx, onError, send],
  );

  const drop = useCallback(
    async (drag: ActiveDrag) => {
      const target = resolve(drag);
      const action = target ? toAction(drag.source, target) : null;
      finish(drag);
      settleHandles(drag.keys);

      if (!action) {
        if (drag.live) sendLive({ kind: 'end' });
        setHandGap(null);
        release(drag.keys);
        return;
      }

      const ghost = drag.source.kind === 'deck' ? registry.get(DECK_KEY) : null;
      if (ghost) spawnHint.current = { x: ghost.x.get(), y: ghost.y.get(), at: performance.now() };

      // A carta fica parada onde foi solta até a sala confirmar. Sem isso ela
      // voltaria para o lugar antigo e pularia de novo quando o estado chegasse.
      const result = await send(action);

      const deck = world.current?.metrics?.deck;
      if (ghost && result.ok && deck) {
        // A carta real já nasceu no ponto de soltura. O fantasma volta ao
        // monte sem animação para não parecerem duas cartas.
        ghost.x.jump(deck.x);
        ghost.y.jump(deck.y);
      }
      // O "fim" do arrasto ao vivo só sai depois da confirmação: nesse ponto
      // os outros já receberam o estado novo e a carta não dá meia-volta.
      if (drag.live) sendLive({ kind: 'end' });
      setHandGap(null);
      release(drag.keys);
      if (!result.ok) onError((result as { error: ErrorCode }).error);
    },
    [finish, onError, registry, release, resolve, send, sendLive, settleHandles, toAction],
  );

  const start = useCallback(
    (drag: ActiveDrag): boolean => {
      const now = world.current;
      if (!now?.metrics) return false;
      const { source } = drag;

      if (source.kind === 'pile') {
        const members = now.view.cards.filter((c) => c.zone === 'pile' && c.pileId === source.pileId).sort((a, b) => a.order - b.order);
        drag.keys = [...members.map((c) => c.id), pileKey(source.pileId)];
        drag.live = { target: 'pile', id: source.pileId };
      } else if (source.kind === 'deck') {
        drag.keys = [DECK_KEY];
      } else {
        const card = now.view.cards.find((c) => c.id === source.cardId);
        if (!card) return false;
        drag.keys = [card.id];
        // Só o que já está na mesa é transmitido. Mostrar aos outros uma carta
        // saindo da mão entregaria de onde ela veio antes de ser jogada.
        drag.live = card.zone === 'hand' ? null : { target: 'card', id: card.id };
      }

      const origin = stageOrigin();
      const startX = drag.startX - origin.x;
      const startY = drag.startY - origin.y;
      for (const key of drag.keys) {
        const handle = registry.get(key);
        if (!handle) continue;
        handle.x.stop();
        handle.y.stop();
        drag.offsets.set(key, { x: handle.x.get() - startX, y: handle.y.get() - startY });
        // Grupo inteiro não cresce: só carta avulsa "sobe" ao ser pega.
        if (source.kind !== 'pile') animate(handle.scale, handle.base() * 1.12, { duration: 0.12 });
      }
      if (drag.offsets.size === 0) return false;

      drag.started = true;
      hold(drag.keys);
      sfx.pick();
      return true;
    },
    [hold, registry, stageOrigin],
  );

  /** Uma vez por quadro: inclinação, alvo sob o ponteiro e transmissão ao vivo. */
  const tick = useCallback(
    (drag: ActiveDrag) => {
      if (active.current !== drag) return;
      const now = world.current;
      const m = now?.metrics;

      // A carta inclina na direção do movimento e volta ao eixo quando para.
      drag.rot += (drag.rotTarget - drag.rot) * 0.22;
      drag.rotTarget *= 0.84;
      if (drag.source.kind !== 'pile') registry.get(drag.keys[0])?.rotate.set(drag.rot);

      if (drag.dirty && m) {
        drag.dirty = false;
        const target = resolve(drag);
        setHandGap(target?.kind === 'hand' ? target.index : null);
        setHover(
          !target || target.kind === 'table'
            ? null
            : target.kind === 'hand' || target.kind === 'deck'
              ? target.kind
              : target.kind === 'player'
                ? `player:${target.playerId}`
                : target.kind === 'pile'
                  ? `pile:${target.pileId}`
                  : `card:${target.cardId}`,
        );

        const stamp = performance.now();
        const center = drag.live ? centerOf(drag, m) : null;
        if (drag.live && center && stamp - drag.lastLive > LIVE_EVERY_MS) {
          drag.lastLive = stamp;
          const point = stageToTable(m, center.x, center.y, 0.3);
          sendLive({ kind: 'drag', target: drag.live.target, id: drag.live.id, x: point.x, y: point.y });
        }
      }
      drag.frame = requestAnimationFrame(() => tick(drag));
    },
    [centerOf, registry, resolve, sendLive],
  );

  const begin = useCallback(
    (source: DragSource, event: ReactPointerEvent) => {
      if (active.current) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const now = world.current;
      if (!now?.metrics) return;

      // Trava leve: o que outro jogador está movendo, ou o que ainda espera
      // confirmação, não pode ser pego agora.
      const key = source.kind === 'card' ? source.cardId : source.kind === 'pile' ? pileKey(source.pileId) : DECK_KEY;
      if (heldRef.current.has(key) || now.holders.has(key)) return;
      if (source.kind === 'card') {
        const card = now.view.cards.find((c) => c.id === source.cardId);
        if (card?.pileId && now.holders.has(pileKey(card.pileId))) return;
      }
      if (event.pointerType === 'mouse') event.preventDefault();

      const drag: ActiveDrag = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        source,
        startX: event.clientX,
        startY: event.clientY,
        started: false,
        keys: [],
        offsets: new Map(),
        px: 0,
        py: 0,
        lastClientX: event.clientX,
        rot: 0,
        rotTarget: 0,
        dirty: false,
        lastLive: 0,
        live: null,
        frame: 0,
        detach: () => undefined,
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== drag.pointerId) return;
        if (!drag.started) {
          if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < thresholdFor(drag.pointerType)) return;
          if (!start(drag)) return cancel(drag);
          drag.frame = requestAnimationFrame(() => tick(drag));
        }
        const origin = stageOrigin();
        drag.px = ev.clientX - origin.x;
        drag.py = ev.clientY - origin.y;
        for (const moving of drag.keys) {
          const handle = registry.get(moving);
          const offset = drag.offsets.get(moving);
          if (!handle || !offset) continue;
          handle.x.set(drag.px + offset.x);
          handle.y.set(drag.py + offset.y);
        }
        // A carta sumiu durante o arrasto (outro jogador reiniciou o jogo, por
        // exemplo). Não há mais o que mover.
        if (!registry.get(drag.keys[0])) return cancel(drag);
        drag.rotTarget = clamp(drag.rotTarget + (ev.clientX - drag.lastClientX) * 0.9, -24, 24);
        drag.lastClientX = ev.clientX;
        drag.dirty = true;
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== drag.pointerId) return;
        if (!drag.started) {
          finish(drag);
          void tap(drag.source);
          return;
        }
        void drop(drag);
      };

      const onCancel = (ev: Event) => {
        if (ev instanceof PointerEvent && ev.pointerId !== drag.pointerId) return;
        cancel(drag);
      };

      // Na janela, e não no elemento: o sprite pode ser desmontado no meio do
      // gesto e os eventos precisam continuar chegando.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('blur', onCancel);
      drag.detach = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('blur', onCancel);
      };
      active.current = drag;
    },
    [cancel, drop, finish, registry, stageOrigin, start, tap, tick],
  );

  useEffect(
    () => () => {
      const drag = active.current;
      if (!drag) return;
      drag.detach();
      cancelAnimationFrame(drag.frame);
    },
    [],
  );

  return { held, handGap, hover, begin, world, spawnHint };
};

export type CardDragApi = ReturnType<typeof useCardDrag>;
