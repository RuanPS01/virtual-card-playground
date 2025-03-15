
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface CardProps {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  suit,
  rank,
  faceUp,
  draggable = true,
  onClick,
  onDragStart,
  onDragEnd,
  className,
  style
}) => {
  const [isFlipped, setIsFlipped] = useState(!faceUp);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsFlipped(!faceUp);
  }, [faceUp]);

  const suitSymbol = () => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
    }
  };

  const suitColor = suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-black';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggable) return;
    
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      type: 'card', 
      suit, 
      rank, 
      faceUp 
    }));
    
    e.currentTarget.classList.add('dragging');
    
    if (onDragStart) onDragStart(e);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
    if (onDragEnd) onDragEnd(e);
  };

  return (
    <motion.div
      className={cn(
        'relative w-20 h-28 rounded-md cursor-pointer perspective-1000 transform-gpu',
        isHovered && 'shadow-lg',
        className
      )}
      style={style}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileHover={{ y: -5 }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`card ${isFlipped ? 'flipped' : ''} w-full h-full`}>
        <div className="card-front absolute w-full h-full bg-white rounded-md border border-gray-200 p-2 flex flex-col justify-between card-shadow">
          <div className={`text-left text-lg font-semibold ${suitColor}`}>
            {rank}
            <span className="ml-1">{suitSymbol()}</span>
          </div>
          <div className={`text-center text-4xl font-bold ${suitColor}`}>
            {suitSymbol()}
          </div>
          <div className={`text-right text-lg font-semibold ${suitColor} rotate-180`}>
            {rank}
            <span className="ml-1">{suitSymbol()}</span>
          </div>
        </div>
        <div className="card-back absolute w-full h-full bg-blue-700 rounded-md border border-gray-200 card-shadow">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-24 rounded-md border-2 border-white flex items-center justify-center">
              <div className="w-12 h-20 rounded-sm border-2 border-white"></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Card;
