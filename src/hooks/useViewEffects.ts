// Transforma eventos da sala em "suco": som, partículas, texto flutuante e
// tremor. Vale para ações de qualquer jogador, porque tudo sai do último
// evento registrado no estado, e não do gesto local.

import { useEffect, useRef, type MutableRefObject } from 'react';
import { toast } from 'sonner';
import type { ActionEvent, PlayerView, RoomView } from '@shared/types';
import type { StageMetrics } from '@/game/layout';
import { pileKey, type FxApi } from '@/game/stage';
import type { StageTargets } from '@/game/targets';
import { t } from '@/lib/i18n';
import { sfx } from '@/lib/sfx';

interface World {
  view: RoomView;
  metrics: StageMetrics | null;
  targets: StageTargets | null;
}

const badgeBottom = (playerId: string): { x: number; y: number } | null => {
  const rect = document.querySelector<HTMLElement>(`[data-player="${playerId}"]`)?.getBoundingClientRect();
  return rect ? { x: rect.left + rect.width / 2, y: rect.bottom + 6 } : null;
};

const play = (event: ActionEvent, { view, metrics, targets }: World, fx: FxApi): void => {
  if (!metrics) return;
  const { deck, cardH } = metrics;
  const mine = event.by === view.me;
  const card = event.cardId ? targets?.cards.get(event.cardId) : undefined;

  switch (event.type) {
    case 'toHand': {
      sfx.deal();
      const receiver = event.to?.zone === 'hand' ? event.to.playerId : view.me;
      if (receiver !== view.me) {
        const at = badgeBottom(receiver);
        if (at) fx.text(at.x, at.y, '+1', 'gold');
      } else if (event.cardId && event.from?.zone !== 'hand') {
        // Espera o voo terminar para a carta "assentar" na mão.
        const id = event.cardId;
        setTimeout(() => fx.pop(id), 220);
      }
      break;
    }
    case 'toTable':
      sfx.drop();
      if (card && event.cardId) {
        fx.burst(card.x, card.y + cardH * 0.42, 'dust');
        fx.pop(event.cardId);
      }
      break;
    case 'toPile':
    case 'stackOn':
      if (event.from?.zone === 'pile' && event.to?.zone === 'pile' && event.from.pileId === event.to.pileId) {
        // Reordenação dentro do leque: mesmo retorno da reordenação da mão.
        sfx.deal();
        if (event.cardId) fx.pop(event.cardId);
        break;
      }
      sfx.stack();
      if (card && event.cardId) {
        if (event.type === 'stackOn') fx.burst(card.x, card.y, 'spark');
        fx.pop(event.cardId);
      }
      break;
    case 'toDeck':
      sfx.deal();
      fx.text(deck.x, deck.y - cardH * 0.62, '+1', 'blue');
      break;
    case 'flip':
      sfx.flip();
      if (event.cardId) fx.pop(event.cardId);
      break;
    case 'movePile':
      sfx.drop();
      break;
    case 'setPileMode':
      sfx.flip();
      if (event.to?.zone === 'pile') fx.pop(pileKey(event.to.pileId));
      break;
    case 'shuffleDeck':
      sfx.shuffle();
      fx.shake(0.6);
      break;
    case 'addDeck':
      sfx.fanfare();
      fx.burst(deck.x, deck.y, 'confetti');
      fx.text(deck.x, deck.y - cardH * 0.62, `+${event.count ?? 52}`, 'gold');
      break;
    case 'removeCards':
      sfx.drop();
      if (event.count) fx.text(deck.x, deck.y - cardH * 0.62, `-${event.count}`, 'red');
      if (mine) toast.success(t('toast.removed', { count: event.count ?? 0 }));
      break;
    case 'reset':
      sfx.shuffle();
      fx.shake(1);
      fx.burst(deck.x, deck.y, 'confetti');
      break;
    case 'sortHand':
      if (mine) sfx.deal();
      break;
    case 'removePlayer':
      break;
  }
};

const announcePlayers = (before: Map<string, PlayerView>, view: RoomView): void => {
  for (const player of view.players) {
    if (player.id === view.me) continue;
    const old = before.get(player.id);
    if (!old) {
      sfx.join();
      toast.message(t('toast.playerJoined', { name: player.name }));
    } else if (old.connected && !player.connected) {
      toast.message(t('toast.playerDropped', { name: player.name }));
    } else if (!old.connected && player.connected) {
      toast.message(t('toast.playerBack', { name: player.name }));
    }
  }
  const present = new Set(view.players.map((player) => player.id));
  for (const old of before.values()) {
    if (present.has(old.id)) continue;
    sfx.leave();
    toast.message(t('toast.playerLeft', { name: old.name }));
  }
};

export const useViewEffects = (view: RoomView, world: MutableRefObject<World | null>, fx: FxApi): void => {
  const seenRev = useRef<number | null>(null);
  const players = useRef<Map<string, PlayerView> | null>(null);

  useEffect(() => {
    // Na primeira visão (entrada ou retomada) nada é reproduzido: o último
    // evento da sala aconteceu antes de o jogador chegar.
    if (seenRev.current !== null && view.last && view.last.rev > seenRev.current && world.current) {
      play(view.last, world.current, fx);
    }
    seenRev.current = view.rev;

    if (players.current) announcePlayers(players.current, view);
    players.current = new Map(view.players.map((player) => [player.id, player]));
  }, [view, world, fx]);
};
