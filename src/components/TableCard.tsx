import React, { useEffect, useState } from 'react';
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
  // Gerar uma rotação aleatória na montagem do componente
  const [rotation] = useState(() => Math.random() * 20 - 10);

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
      initial={{
        scale: 0.8,
        opacity: 0,
        rotate: rotation
      }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: rotation
      }}
      exit={{
        scale: 0.8,
        opacity: 0,
        rotate: rotation
      }}
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
          draggable={false}
        />
      </div>
    </motion.div>
  );
};

export default TableCard;