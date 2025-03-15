
import React from 'react';
import { motion } from 'framer-motion';
import Card, { Suit, Rank } from './Card';

interface TableCardProps {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  x: number;
  y: number;
  onDragStart: (id: string, suit: Suit, rank: Rank) => void;
}

const TableCard: React.FC<TableCardProps> = ({
  id,
  suit,
  rank,
  faceUp,
  x,
  y,
  onDragStart
}) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      type: 'card', 
      id, 
      suit, 
      rank, 
      faceUp 
    }));
    
    onDragStart(id, suit, rank);
  };

  return (
    <motion.div
      className="absolute"
      style={{
        left: x,
        top: y,
        zIndex: 10,
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      layoutId={id}
      drag
      dragMomentum={false}
    >
      <div 
        draggable={true} 
        onDragStart={handleDragStart}
      >
        <Card
          suit={suit}
          rank={rank}
          faceUp={faceUp}
          draggable={true}
          onDragStart={handleDragStart}
        />
      </div>
    </motion.div>
  );
};

export default TableCard;
