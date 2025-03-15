
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card, { Suit, Rank } from './Card';
import { cn } from '@/lib/utils';

interface PlayerHandProps {
  cards: Array<{ suit: Suit; rank: Rank; faceUp: boolean; id: string }>;
  isCurrentPlayer: boolean;
  playerName: string;
  onCardDragStart?: (e: React.DragEvent<HTMLDivElement>, cardIndex: number) => void;
  onDropCard?: (e: React.DragEvent<HTMLDivElement>) => void;
  onReorderCards?: (startIndex: number, endIndex: number) => void;
  className?: string;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  isCurrentPlayer,
  playerName,
  onCardDragStart,
  onDropCard,
  onReorderCards,
  className
}) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const handRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggingIndex(index);
    if (onCardDragStart) onCardDragStart(e, index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setDropIndex(index);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (onDropCard) {
      onDropCard(e);
    }
    
    const dragData = e.dataTransfer.getData('application/json');
    if (dragData && draggingIndex !== null && dropIndex !== null && draggingIndex !== dropIndex) {
      const draggedItem = JSON.parse(dragData);
      
      if (draggedItem.type === 'card' && onReorderCards) {
        onReorderCards(draggingIndex, dropIndex);
      }
    }
    
    setDraggingIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDropIndex(null);
  };

  const getCardSpacing = () => {
    if (!handRef.current) return 20;
    
    const handWidth = handRef.current.offsetWidth;
    const cardWidth = 80; // Largura aproximada da carta em px
    const maxOverlap = 60; // Sobreposição máxima
    const minSpacing = 20; // Espaçamento mínimo 
    
    const totalCardsWidth = cards.length * cardWidth;
    const availableSpace = handWidth - cardWidth;
    
    if (totalCardsWidth <= handWidth) {
      return minSpacing; // Espaçamento normal se couberem todas as cartas
    }
    
    // Calcular sobreposição necessária
    const requiredOverlap = (totalCardsWidth - availableSpace) / (cards.length - 1);
    return Math.max(cardWidth - requiredOverlap, cardWidth - maxOverlap);
  };

  return (
    <motion.div 
      className={cn(
        "relative flex flex-col items-center",
        className
      )}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-2 px-3 py-1 bg-white bg-opacity-80 rounded-full shadow-sm">
        <span className="text-sm font-medium">{playerName}</span>
        <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>
      
      <div
        ref={handRef}
        className={cn(
          "relative flex items-center justify-center p-4 min-h-28 w-full max-w-md",
          isCurrentPlayer ? "glass rounded-xl" : "bg-transparent border-2 border-dashed border-gray-200 rounded-xl"
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {cards.length === 0 && (
          <span className="text-gray-400 text-sm">
            {isCurrentPlayer ? "Sua mão está vazia" : "Mão vazia"}
          </span>
        )}
        
        <div className="flex items-center justify-center relative">
          <AnimatePresence>
            {cards.map((card, index) => {
              const offset = index * getCardSpacing();
              
              return (
                <motion.div
                  key={card.id}
                  className="absolute"
                  style={{ 
                    left: `${offset}px`,
                    zIndex: index,
                  }}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  layoutId={card.id}
                  drag={isCurrentPlayer}
                  dragConstraints={handRef}
                  onDragStart={(e: any) => handleDragStart(e, index)}
                  onDragOver={(e: any) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <Card
                    suit={card.suit}
                    rank={card.rank}
                    faceUp={isCurrentPlayer ? card.faceUp : false}
                    draggable={isCurrentPlayer}
                    onDragStart={(e) => handleDragStart(e, index)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default PlayerHand;
