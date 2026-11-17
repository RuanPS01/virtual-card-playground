// Geometria da mesa. Funções puras: recebem as medidas da tela e devolvem
// posições em pixels do palco.
//
// A posição de uma carta na mesa é guardada NORMALIZADA: (0,0) é o canto
// superior esquerdo da área útil e (1,1) o inferior direito, sempre medindo o
// CENTRO da carta. Cada aparelho projeta esse par na sua própria área útil.
// O modelo antigo guardava pixels da tela de quem moveu, e uma carta em
// x=1200 no desktop caía fora da tela de um celular de 360px.

import type { PileMode } from '@shared/types';

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  w: number;
  h: number;
}

export interface CardSize {
  cardW: number;
  cardH: number;
  /** Altura curta (celular deitado): a mão fica parcialmente recolhida. */
  compact: boolean;
  /** Barra superior em duas linhas (celular em pé). */
  narrow: boolean;
  /** Ampliação das cartas da mão em relação às da mesa. */
  handScale: number;
}

export interface StageMetrics extends CardSize {
  w: number;
  h: number;
  /** Área livre da mesa, onde as posições normalizadas são projetadas. */
  play: Rect;
  /** Faixa onde as cartas da mão se distribuem. */
  hand: Rect;
  /** Centro do monte. */
  deck: Point;
}

export const CARD_RATIO = 5 / 7;

/** Respiro entre a carta e a borda da área útil. */
const PAD = 6;
/** Embaixo sobra espaço para a etiqueta dos grupos não invadir a mão. */
const PAD_BOTTOM = 30;

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * Tamanho da carta a partir da tela. A carta é limitada tanto pela altura
 * (cabem a barra, umas 3 fileiras de mesa e a mão) quanto pela largura
 * (cabem pelo menos 6 cartas lado a lado em um celular em pé).
 */
export const cardSizeFor = (w: number, h: number): CardSize => {
  const compact = h < 500;
  const narrow = w < 640 && !compact;
  const reservedTop = narrow ? 104 : 56;
  const byHeight = (h - reservedTop) / (compact ? 4.3 : 4.9);
  const byWidth = w / 6.3 / CARD_RATIO;
  const cardH = Math.round(clamp(Math.min(byHeight, byWidth), 54, 148));
  return {
    cardW: Math.round(cardH * CARD_RATIO),
    cardH,
    compact,
    narrow,
    handScale: compact || narrow ? 1 : 1.12,
  };
};

const spanX = (m: StageMetrics): number => Math.max(1, m.play.w - m.cardW - PAD * 2);
const spanY = (m: StageMetrics): number => Math.max(1, m.play.h - m.cardH - PAD - PAD_BOTTOM);

/** Posição normalizada para o centro da carta em pixels do palco. */
export const tableToStage = (m: StageMetrics, nx: number, ny: number): Point => ({
  x: m.play.x + PAD + m.cardW / 2 + nx * spanX(m),
  y: m.play.y + PAD + m.cardH / 2 + ny * spanY(m),
});

/**
 * Inverso de tableToStage. `slack` deixa o valor passar um pouco de 0 a 1,
 * usado só no arrasto ao vivo para a carta acompanhar o dedo de quem arrasta
 * mesmo quando ele sai da área útil.
 */
export const stageToTable = (m: StageMetrics, x: number, y: number, slack = 0): Point => ({
  x: clamp((x - m.play.x - PAD - m.cardW / 2) / spanX(m), -slack, 1 + slack),
  y: clamp((y - m.play.y - PAD - m.cardH / 2) / spanY(m), -slack, 1 + slack),
});

export interface PileGeometry {
  /** Centro do retângulo que envolve o grupo. */
  cx: number;
  cy: number;
  width: number;
  mode: PileMode;
  count: number;
  /** Onde fica a etiqueta (contagem, modo, alça de arrasto). */
  chip: Point;
  /** Centro da carta de índice i (0 = base). */
  cardAt(index: number): Point;
}

/**
 * Geometria de um grupo. O leque se comprime para caber na largura da área
 * útil, e o centro é empurrado para dentro quando o grupo encostaria na borda:
 * um leque aberto no desktop continua inteiro na tela do celular.
 */
export const pileGeometry = (
  m: StageMetrics,
  pile: { x: number; y: number; mode: PileMode },
  count: number,
  centerOverride?: Point,
): PileGeometry => {
  const fan = pile.mode === 'fan';
  const gaps = Math.max(1, count - 1);
  const step = fan ? Math.min(m.cardW * 0.36, (m.play.w - m.cardW - PAD * 2) / gaps) : 0;
  // Na pilha cada carta sobe um pouco para dar volume, com teto no total.
  const lift = fan ? 0 : Math.min(1.3, 12 / gaps);
  const width = m.cardW + step * (count - 1);

  const raw = centerOverride ?? tableToStage(m, pile.x, pile.y);
  const half = width / 2;
  const minX = m.play.x + PAD + half;
  const maxX = m.play.x + m.play.w - PAD - half;
  const cx = centerOverride ? raw.x : minX > maxX ? m.play.x + m.play.w / 2 : clamp(raw.x, minX, maxX);
  const cy = raw.y;

  return {
    cx,
    cy,
    width,
    mode: pile.mode,
    count,
    chip: { x: cx, y: cy + m.cardH / 2 + 15 },
    cardAt: (index) =>
      fan
        ? { x: cx - half + m.cardW / 2 + index * step, y: cy }
        : { x: cx - index * lift * 0.4, y: cy - index * lift },
  };
};

export interface HandSlot extends Point {
  rot: number;
}

/**
 * Vagas da mão em arco. O passo entre cartas encolhe conforme a mão cresce,
 * então 20 cartas continuam cabendo em 360px com o índice de cada uma visível.
 */
export const handSlots = (m: StageMetrics, count: number): HandSlot[] => {
  if (count <= 0) return [];
  const cardW = m.cardW * m.handScale;
  const cardH = m.cardH * m.handScale;
  const room = Math.max(0, m.hand.w - cardW - 12);
  const step = count > 1 ? Math.min(cardW * 0.8, room / (count - 1)) : 0;
  const startX = m.hand.x + m.hand.w / 2 - (step * (count - 1)) / 2;
  // Em altura curta a carta ancora no topo da faixa e a base some da tela.
  const baseY = m.compact ? m.hand.y + cardH / 2 + 4 : m.hand.y + m.hand.h / 2;
  const maxTilt = Math.min(9, count * 1.5);
  const drop = Math.min(cardH * 0.07, count * 1.1);

  return Array.from({ length: count }, (_, index) => {
    const t = count > 1 ? (index - (count - 1) / 2) / ((count - 1) / 2) : 0;
    return { x: startX + index * step, y: baseY + t * t * drop, rot: t * maxTilt };
  });
};

/** Índice da vaga mais próxima de um x do palco (vagas da mão ou de um leque). */
export const nearestSlot = (slots: ReadonlyArray<{ x: number }>, x: number): number => {
  let best = 0;
  let bestDistance = Infinity;
  slots.forEach((slot, index) => {
    const distance = Math.abs(slot.x - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
};

/** Número estável derivado do id, para inclinações que todos veem iguais. */
export const hashOf = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash);
};
