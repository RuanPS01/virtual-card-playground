// Alvo de cada carta na tela. Toda carta visível é uma entidade em UMA camada
// só, e esta função diz onde ela deve estar. Mudar de zona (mesa, grupo, mão)
// é só mudar de alvo: o sprite voa sozinho até lá, sem remontar nada.

import { sortPile } from '@shared/pileOrder';
import type { CardView, RoomView } from '@shared/types';
import {
  handSlots,
  hashOf,
  pileGeometry,
  tableToStage,
  type HandSlot,
  type PileGeometry,
  type StageMetrics,
} from './layout';

export interface SpriteTarget {
  x: number;
  y: number;
  rot: number;
  scale: number;
  z: number;
}

/** Algo que outro jogador está arrastando agora. */
export interface LiveDrag {
  target: 'card' | 'pile';
  id: string;
  x: number;
  y: number;
  at: number;
}

export interface PileGap {
  pileId: string;
  index: number;
}

export interface TargetInput {
  view: RoomView;
  metrics: StageMetrics;
  /** Cartas seguradas localmente (arrasto ou espera da confirmação). */
  held: ReadonlySet<string>;
  /** Índice da vaga aberta na mão enquanto uma carta paira sobre ela. */
  handGap: number | null;
  /** Vaga aberta em um grupo em leque enquanto uma carta paira sobre ele. */
  pileGap: PileGap | null;
  /** Arrastos remotos, por jogador. */
  live: ReadonlyMap<string, LiveDrag>;
}

export interface StageTargets {
  cards: Map<string, SpriteTarget>;
  piles: Map<string, PileGeometry>;
  /** Cartas da mão que não estão seguradas, na ordem. */
  freeHand: CardView[];
  /** Vagas da mão já contando a vaga aberta. */
  slots: HandSlot[];
  /** Quem está arrastando cada carta ou grupo (chave "pile:ID" para grupos). */
  holders: Map<string, string>;
}

const Z_STEP = 450;
const Z_HAND = 500_000;
const Z_REMOTE = 800_000;

const byOrder = (a: CardView, b: CardView): number => a.order - b.order || (a.id < b.id ? -1 : 1);

export const computeTargets = ({ view, metrics: m, held, handGap, pileGap, live }: TargetInput): StageTargets => {
  const cards = new Map<string, SpriteTarget>();
  const piles = new Map<string, PileGeometry>();
  const holders = new Map<string, string>();

  const liveCards = new Map<string, LiveDrag>();
  const livePiles = new Map<string, LiveDrag>();
  for (const [playerId, drag] of live) {
    if (drag.target === 'card') {
      liveCards.set(drag.id, drag);
      holders.set(drag.id, playerId);
    } else {
      livePiles.set(drag.id, drag);
      holders.set(`pile:${drag.id}`, playerId);
    }
  }

  // Camadas da mesa: cartas soltas e grupos disputam a mesma fila, ordenada
  // por quem foi tocado por último. O z do estado cresce sem parar, então
  // aqui ele vira uma posição na fila para o z-index não estourar.
  const loose = view.cards.filter((card) => card.zone === 'table');
  const layers = [
    ...loose.map((card) => ({ key: card.id, z: card.z })),
    ...view.piles.map((pile) => ({ key: `pile:${pile.id}`, z: pile.z })),
  ].sort((a, b) => a.z - b.z || (a.key < b.key ? -1 : 1));
  const layerOf = new Map(layers.map((layer, index) => [layer.key, 10 + index * Z_STEP]));

  for (const card of loose) {
    const drag = liveCards.get(card.id);
    const point = drag ? tableToStage(m, drag.x, drag.y) : tableToStage(m, card.x, card.y);
    cards.set(card.id, {
      ...point,
      // Inclinação leve e determinística: a mesma carta fica igual para todos.
      rot: drag ? 0 : (hashOf(card.id) % 9) - 4,
      scale: drag ? 1.08 : 1,
      z: drag ? Z_REMOTE : (layerOf.get(card.id) ?? 10),
    });
  }

  for (const pile of view.piles) {
    // A ordenação (valor, manilha) só vale com o grupo aberto em leque; na
    // pilha a carta de cima é sempre a última que entrou.
    const members = sortPile(
      view.cards.filter((card) => card.zone === 'pile' && card.pileId === pile.id),
      pile.mode === 'fan' ? pile.sort : 'manual',
    );
    const drag = livePiles.get(pile.id);
    const center = drag ? tableToStage(m, drag.x, drag.y) : undefined;
    // Igual à mão: a carta que o jogador tirou do leque deixa as outras se
    // juntarem, e a vaga aberta mostra onde ela vai entrar. Quando o grupo
    // inteiro está sendo movido, nada se reorganiza.
    const wholePile = held.has(`pile:${pile.id}`);
    const free = wholePile ? members : members.filter((card) => !held.has(card.id));
    const gap =
      !wholePile && pile.mode === 'fan' && pile.sort === 'manual' && pileGap?.pileId === pile.id ? Math.min(pileGap.index, free.length) : null;
    const geometry = pileGeometry(m, pile, Math.max(1, free.length + (gap === null ? 0 : 1)), center);
    piles.set(pile.id, geometry);
    const natural = free.length === members.length ? geometry : pileGeometry(m, pile, members.length, center);
    const base = drag ? Z_REMOTE : (layerOf.get(`pile:${pile.id}`) ?? 10);

    const place = (card: CardView, slot: number, from: PileGeometry) => {
      const cardDrag = liveCards.get(card.id);
      const point = cardDrag ? tableToStage(m, cardDrag.x, cardDrag.y) : from.cardAt(slot);
      cards.set(card.id, {
        ...point,
        rot: cardDrag || pile.mode === 'fan' ? 0 : (hashOf(card.id) % 5) - 2,
        scale: cardDrag ? 1.08 : 1,
        z: cardDrag ? Z_REMOTE : base + slot,
      });
    };
    free.forEach((card, index) => place(card, gap !== null && index >= gap ? index + 1 : index, geometry));
    // Carta segurada: o alvo só vale na hora de soltar. Vai para a vaga, se
    // houver, senão para o lugar de onde saiu.
    members.forEach((card, index) => {
      if (!cards.has(card.id)) place(card, gap ?? index, gap !== null ? geometry : natural);
    });
  }

  const mine = view.cards.filter((card) => card.zone === 'hand').sort(byOrder);
  const freeHand = mine.filter((card) => !held.has(card.id));
  const gap = handGap === null ? null : Math.min(handGap, freeHand.length);
  const slots = handSlots(m, freeHand.length + (gap === null ? 0 : 1));

  freeHand.forEach((card, index) => {
    const slot = slots[gap !== null && index >= gap ? index + 1 : index];
    cards.set(card.id, { x: slot.x, y: slot.y, rot: slot.rot, scale: m.handScale, z: Z_HAND + index });
  });

  // Carta da mão segurada: o alvo só importa na hora de soltar. Se há vaga
  // aberta ela volta para a vaga, senão para a posição natural.
  const natural = handSlots(m, mine.length);
  mine.forEach((card, index) => {
    if (cards.has(card.id)) return;
    const slot = gap !== null ? slots[gap] : natural[index];
    cards.set(card.id, { x: slot.x, y: slot.y, rot: slot.rot, scale: m.handScale, z: Z_HAND + index });
  });

  return { cards, piles, freeHand, slots, holders };
};
