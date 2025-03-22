import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card, { Suit, Rank } from './Card';
import { cn } from '@/lib/utils';
import { createCardDragImage } from '@/utils/dragImageUtils';

interface DeckProps {
  cards: Array<{ suit: Suit; rank: Rank; faceUp: boolean }>;
  onCardDragStart?: (e: React.DragEvent<HTMLDivElement>, cardIndex: number) => void;
  onDeckClick?: () => void;
  onDeckShuffle?: () => void;
  className?: string;
}

const Deck: React.FC<DeckProps> = ({
  cards,
  onCardDragStart,
  onDeckClick,
  onDeckShuffle,
  className
}) => {
  const [isShuffling, setIsShuffling] = useState(false);

  const handleShuffle = () => {
    if (isShuffling) return;

    setIsShuffling(true);

    if (onDeckShuffle) {
      onDeckShuffle();
    }

    setTimeout(() => {
      setIsShuffling(false);
    }, 800);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (cards.length === 0) return;

    const topCard = cards[cards.length - 1];

    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'card',
      id: 'top-card',
      suit: topCard.suit,
      rank: topCard.rank
    }));

    // Criar imagem personalizada para o arrasto
    createCardDragImage(topCard.suit, topCard.rank, false, e.dataTransfer);

    if (onCardDragStart) {
      onCardDragStart(e);
    }
  };

  if (cards.length === 0) {
    return (
      <motion.div
        className={cn("w-20 h-28 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span className="text-gray-400 text-xs text-center">Sem cartas</span>
      </motion.div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {cards.slice(0, Math.min(5, cards.length)).map((card, index, array) => {
        const isTopCard = index === array.length - 1;
        const offset = index * 0.5;

        return (
          <motion.div
            key={`${card.suit}-${card.rank}-${index}`}
            className="absolute"
            style={{
              zIndex: index,
              top: `${offset}px`,
              left: `${offset}px`,
            }}
            animate={isShuffling ? {
              x: [0, 5, -5, 5, 0],
              y: [0, -2, 2, -2, 0],
              rotate: [0, 2, -2, 2, 0],
            } : {}}
            transition={isShuffling ? {
              duration: 0.8,
              ease: "easeInOut",
            } : {}}
          >
            <Card
              suit={card.suit}
              rank={card.rank}
              faceUp={isTopCard ? card.faceUp : false}
              draggable={isTopCard}
              onDragStart={(e) => handleDragStart(e)}
              onClick={isTopCard ? onDeckClick : undefined}
            />
          </motion.div>
        );
      })}

      <div className="absolute -right-10 bottom-0 flex flex-col items-center space-y-2">
        <motion.button
          className="p-2 rounded-full bg-white shadow-md text-gray-700 hover:bg-gray-100"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShuffle}
          disabled={isShuffling || cards.length <= 1}
          title="Embaralhar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"></path>
            <path d="m18 2 4 4-4 4"></path>
            <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"></path>
            <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"></path>
            <path d="m18 14 4 4-4 4"></path>
          </svg>
        </motion.button>

        <div className="text-xs font-semibold bg-white px-2 py-1 rounded-md shadow-sm">
          {cards.length}
        </div>
      </div>
    </div>
  );
};

export default Deck;
