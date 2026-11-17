import type { CardView, PlayerView, RoomState, RoomView } from './types';

/**
 * Recorta o estado para o que UM jogador pode saber.
 *
 * No servidor WebSocket é isto que impede alguém de ler a mão dos outros ou a
 * ordem do monte pelas ferramentas do navegador: o dado escondido nem sai do
 * servidor. No transporte Firebase o cliente recebe o estado inteiro e aplica
 * esta mesma função localmente (ali o recorte é só de apresentação).
 */
export const viewFor = (state: RoomState, playerId: string): RoomView => {
  const handCounts: Record<string, number> = {};
  const cards: CardView[] = [];
  let deckCount = 0;

  for (const card of Object.values(state.cards)) {
    if (card.zone === 'deck') {
      deckCount++;
      continue;
    }
    if (card.zone === 'hand') {
      const owner = card.owner ?? '';
      handCounts[owner] = (handCounts[owner] ?? 0) + 1;
      if (owner !== playerId) continue;
    }
    const visible = card.zone === 'hand' || card.faceUp;
    cards.push({
      id: card.id,
      zone: card.zone,
      pileId: card.zone === 'pile' ? card.owner : null,
      order: card.order,
      x: card.x,
      y: card.y,
      z: card.z,
      faceUp: card.zone === 'hand' ? true : card.faceUp,
      suit: visible ? card.suit : null,
      rank: visible ? card.rank : null,
    });
  }

  const players: PlayerView[] = Object.values(state.players)
    .map((p) => ({ id: p.id, name: p.name, seat: p.seat, connected: p.connected, handCount: handCounts[p.id] ?? 0 }))
    .sort((a, b) => a.seat - b.seat);

  return {
    roomId: state.roomId,
    rev: state.rev,
    me: playerId,
    players,
    deckCount,
    cards,
    piles: Object.values(state.piles),
    manilha: state.manilha,
    last: state.last,
  };
};
