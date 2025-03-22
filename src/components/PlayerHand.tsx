import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card, { Suit, Rank } from './Card';
import { cn } from '@/lib/utils';
import { createCardDragImage } from '@/utils/dragImageUtils';

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
  cards = [], // Fornecer um valor padrão para evitar erros
  isCurrentPlayer,
  playerName,
  onCardDragStart,
  onDropCard,
  onReorderCards,
  className
}) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Constantes para cálculos
  const CARD_WIDTH = 80; // Largura de uma carta em px

  // Calcular espaçamento baseado no número de cartas e largura do contêiner
  const getCardSpacing = () => {
    if (!cardsContainerRef.current) return 20;

    const containerWidth = cardsContainerRef.current.offsetWidth;
    const cardWidth = CARD_WIDTH; // Largura aproximada da carta
    const maxOverlap = 60; // Sobreposição máxima
    const minSpacing = 20; // Espaçamento mínimo

    // Total de largura necessária se as cartas estivessem lado a lado
    const totalCardsWidth = cards.length * cardWidth;
    const availableWidth = containerWidth - cardWidth;

    if (totalCardsWidth <= containerWidth) {
      return minSpacing; // Espaçamento normal se couberem todas
    }

    // Calcular sobreposição necessária
    const requiredOverlap = (totalCardsWidth - availableWidth) / (cards.length - 1);
    return Math.max(cardWidth - requiredOverlap, cardWidth - maxOverlap);
  };

  // Lidar com início do arrasto
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (index < 0 || index >= cards.length) return;

    // Definir dados completos para transferência (incluindo suit e rank para visualização)
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'card',
      id: cards[index].id,
      index: index,
      suit: cards[index].suit,
      rank: cards[index].rank,
      faceUp: cards[index].faceUp
    }));

    // Criar imagem personalizada para o arrasto
    createCardDragImage(cards[index].suit, cards[index].rank, cards[index].faceUp, e.dataTransfer);

    // Não usar imagem vazia quando arrastar para fora do componente
    // para permitir que o GameTable mostre a visualização da carta
    if (e.target instanceof HTMLElement && !e.currentTarget.hasAttribute('data-external-drag')) {
      if (onCardDragStart) {
        onCardDragStart(e, index);
      }
    }

    setDraggingIndex(index);
  };

  // Lidar com arrasto sobre um elemento
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // Lidar com arrasto sobre o contêiner
  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Se não temos cartas, não precisamos calcular
    if (cards.length === 0 || !cardsContainerRef.current) return;

    // Obter posição do mouse
    const containerRect = cardsContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;

    // Calcular espaçamento
    const spacing = getCardSpacing();
    const expandedSpacing = spacing * 1.5; // Aumentar espaçamento durante o arrasto

    // Calcular posição central total
    const totalWidth = cards.length > 1 ? (cards.length - 1) * expandedSpacing : 0;
    const startX = (containerRect.width - totalWidth - CARD_WIDTH) / 2;

    // Determinar o índice mais próximo com base na posição do mouse
    for (let i = 0; i <= cards.length; i++) {
      const cardCenterX = startX + (i * expandedSpacing) + (CARD_WIDTH / 2);

      // Se estamos no início
      if (i === 0 && mouseX < cardCenterX) {
        setDragOverIndex(0);
        return;
      }

      // Se estamos no fim
      if (i === cards.length && mouseX >= cardCenterX - (expandedSpacing / 2)) {
        setDragOverIndex(cards.length);
        return;
      }

      // Se estamos entre duas cartas
      if (i < cards.length) {
        const nextCardCenterX = startX + ((i + 1) * expandedSpacing) + (CARD_WIDTH / 2);
        if (mouseX >= cardCenterX && mouseX < nextCardCenterX) {
          setDragOverIndex(i + 1);
          return;
        }
      }
    }
  };

  // Lidar com o soltar
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (onDropCard) {
      onDropCard(e);
    }

    if (draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex && isCurrentPlayer) {
      try {
        // Determinar a posição final correta
        let finalDropIndex = dragOverIndex;

        // Ajustar o índice se estamos arrastando de uma posição anterior para uma posterior
        if (draggingIndex < dragOverIndex) {
          finalDropIndex -= 1;
        }

        if (onReorderCards) {
          onReorderCards(draggingIndex, finalDropIndex);
        }
      } catch (error) {
        console.error('Erro ao processar arrasto:', error);
      }
    }

    // Resetar estados
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  // Lidar com o fim do arrasto
  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    // Apenas limpar o dragOverIndex se o mouse sair completamente do contêiner
    if (dragOverIndex !== null) {
      setDragOverIndex(null);
    }
  };

  // Função auxiliar para calcular as posições das cartas
  const calculateCardPositions = () => {
    if (!cardsContainerRef.current || cards.length === 0) return [];

    // Calcular espaçamento básico
    let spacing = getCardSpacing();

    // Se estamos arrastando, aumentar o espaçamento
    if (draggingIndex !== null) {
      spacing *= 1.5;
    }

    // Calcular a largura total para centralizar
    const containerWidth = cardsContainerRef.current.offsetWidth;
    const totalWidth = (cards.length - 1) * spacing + CARD_WIDTH;
    const startX = (containerWidth - totalWidth) / 2;

    return cards.map((_, index) => {
      // Calcular offset normal
      let offset = startX + (index * spacing);

      // Calcular posição com base em arrastar/soltar
      if (draggingIndex !== null && dragOverIndex !== null) {
        if (index === draggingIndex) {
          // A carta sendo arrastada
          offset = startX + (dragOverIndex * spacing);
        } else if (
          (draggingIndex < dragOverIndex && index > draggingIndex && index <= dragOverIndex) ||
          (draggingIndex > dragOverIndex && index < draggingIndex && index >= dragOverIndex)
        ) {
          // Cartas que precisam se mover para abrir espaço
          offset = startX + ((index + (draggingIndex < dragOverIndex ? -1 : 1)) * spacing);
        }
      }

      return offset;
    });
  };

  return (
    <motion.div
      className={cn("relative flex flex-col items-center", className)}
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
        onDragOver={handleContainerDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {cards.length === 0 && (
          <span className="text-gray-400 text-sm">
            {isCurrentPlayer ? "Sua mão está vazia" : "Mão vazia"}
          </span>
        )}

        <div
          ref={cardsContainerRef}
          className="flex items-center justify-center relative w-full h-28"
        >
          {/* Indicador de posição para arrasto */}
          {draggingIndex !== null && dragOverIndex !== null && isCurrentPlayer && cards.length > 0 && (
            <motion.div
              className="absolute h-28 w-1 bg-blue-500 rounded-full opacity-70 z-50"
              style={{
                left: (() => {
                  const positions = calculateCardPositions();
                  const idx = Math.min(Math.max(0, dragOverIndex), positions.length);

                  if (positions.length === 0) return "50%";

                  if (idx === 0) {
                    return `${positions[0] - 5}px`;
                  } else if (idx === positions.length) {
                    return `${positions[positions.length - 1] + CARD_WIDTH + 5}px`;
                  } else {
                    return `${positions[idx] - 5}px`;
                  }
                })()
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}

          <AnimatePresence>
            {cards.map((card, index) => {
              const isBeingDragged = index === draggingIndex;
              const positions = calculateCardPositions();
              const left = positions[index] || 0;

              return (
                <motion.div
                  key={card.id}
                  className={cn(
                    "absolute cursor-pointer transform-gpu",
                    isBeingDragged && "opacity-50"
                  )}
                  style={{
                    zIndex: isBeingDragged ? 100 : index
                  }}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{
                    y: 0,
                    opacity: isBeingDragged ? 0.5 : 1,
                    left: `${left}px`,
                    scale: isBeingDragged ? 1.05 : 1
                  }}
                  exit={{ y: 50, opacity: 0 }}
                  transition={{
                    duration: 0.3,
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                >
                  <div
                    draggable={isCurrentPlayer}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={isBeingDragged ? 'cursor-grabbing' : 'cursor-grab'}
                    data-external-drag={true} // Marca para permitir imagem de arrasto ao sair do componente
                  >
                    <Card
                      suit={card.suit}
                      rank={card.rank}
                      faceUp={isCurrentPlayer ? card.faceUp : false}
                      draggable={false} // Gerenciamos arrasto no div pai
                    />
                  </div>
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