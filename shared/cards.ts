// Vocabulário do baralho. Fica em shared/ porque cliente e servidor precisam
// concordar sobre naipes e valores sem depender de React nem de Node.

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const isSuit = (value: unknown): value is Suit => SUITS.includes(value as Suit);
export const isRank = (value: unknown): value is Rank => RANKS.includes(value as Rank);

export const isRedSuit = (suit: Suit): boolean => suit === 'hearts' || suit === 'diamonds';

/** Posição do valor na ordenação da mão (Ás alto, como na maioria dos jogos). */
export const rankWeight = (rank: Rank): number => (rank === 'A' ? 14 : RANKS.indexOf(rank) + 1);

export const suitWeight = (suit: Suit): number => SUITS.indexOf(suit);
