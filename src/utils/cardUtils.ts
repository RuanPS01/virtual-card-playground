
import { Suit, Rank } from '@/components/Card';
import { v4 as uuidv4 } from 'uuid';

export interface CardType {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const createDeck = (): CardType[] => {
  const deck: CardType[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: uuidv4(),
        suit,
        rank,
        faceUp: false
      });
    }
  }
  
  return deck;
};

export const shuffleDeck = (deck: CardType[]): CardType[] => {
  const newDeck = [...deck];
  
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  
  return newDeck;
};

export const dealCard = (deck: CardType[]): { card: CardType | null, newDeck: CardType[] } => {
  if (deck.length === 0) {
    return { card: null, newDeck: [] };
  }
  
  const newDeck = [...deck];
  const card = newDeck.pop()!;
  
  return { card, newDeck };
};

export const removeCardsByRank = (deck: CardType[], ranks: Rank[]): CardType[] => {
  return deck.filter(card => !ranks.includes(card.rank));
};

export const removeCardsBySuit = (deck: CardType[], suits: Suit[]): CardType[] => {
  return deck.filter(card => !suits.includes(card.suit));
};

export const removeSpecificCards = (deck: CardType[], cardsToRemove: { suit: Suit, rank: Rank }[]): CardType[] => {
  return deck.filter(card => {
    return !cardsToRemove.some(c => c.suit === card.suit && c.rank === card.rank);
  });
};

export const moveCard = (
  source: CardType[],
  destination: CardType[],
  cardIndex: number,
  faceUp: boolean = false
): { newSource: CardType[], newDestination: CardType[] } => {
  if (cardIndex < 0 || cardIndex >= source.length) {
    return { newSource: source, newDestination: destination };
  }
  
  const newSource = [...source];
  const newDestination = [...destination];
  
  const [card] = newSource.splice(cardIndex, 1);
  card.faceUp = faceUp;
  
  newDestination.push(card);
  
  return { newSource, newDestination };
};

export const reorderCards = (
  cards: CardType[],
  startIndex: number,
  endIndex: number
): CardType[] => {
  const result = [...cards];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  
  return result;
};
