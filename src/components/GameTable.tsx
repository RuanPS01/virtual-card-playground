
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Card, { Suit, Rank } from './Card';
import Deck from './Deck';
import PlayerHand from './PlayerHand';
import TableCard from './TableCard';
import { cn } from '@/lib/utils';

export interface Player {
  id: string;
  name: string;
  cards: Array<{
    suit: Suit;
    rank: Rank;
    faceUp: boolean;
    id: string;
  }>;
  position: number;
}

interface GameTableProps {
  currentPlayerId: string;
  players: Player[];
  deckCards: Array<{ suit: Suit; rank: Rank; faceUp: boolean }>;
  tableCards: Array<{
    id: string;
    suit: Suit;
    rank: Rank;
    faceUp: boolean;
    x: number;
    y: number;
  }>;
  onDealCard: (playerId: string) => void;
  onShuffleDeck: () => void;
  onResetGame: () => void;
  onAddDeck: () => void;
  onRemoveCardsDialog: () => void;
  onMoveCard: (cardId: string, fromType: 'hand' | 'table' | 'deck', toType: 'hand' | 'table', toPlayerId?: string, faceUp?: boolean, x?: number, y?: number) => void;
  onReorderPlayerCards: (playerId: string, startIndex: number, endIndex: number) => void;
}

const GameTable: React.FC<GameTableProps> = ({
  currentPlayerId,
  players,
  deckCards,
  tableCards,
  onDealCard,
  onShuffleDeck,
  onResetGame,
  onAddDeck,
  onRemoveCardsDialog,
  onMoveCard,
  onReorderPlayerCards,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<{ x: number, y: number } | null>(null);
  const [showCardOptions, setShowCardOptions] = useState(false);
  const [draggedCard, setDraggedCard] = useState<{
    id?: string;
    suit: Suit;
    rank: Rank;
    sourceType: 'hand' | 'table' | 'deck';
    sourceId?: string;
    sourceIndex?: number;
  } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const otherPlayers = players.filter(p => p.id !== currentPlayerId);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
    
    if (tableRef.current) {
      const rect = tableRef.current.getBoundingClientRect();
      setDropPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!dropPosition) return;
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.type === 'card') {
        setDraggedCard({
          suit: data.suit,
          rank: data.rank,
          sourceType: draggedCard?.sourceType || 'deck',
          sourceId: draggedCard?.sourceId,
          sourceIndex: draggedCard?.sourceIndex
        });
        
        setShowCardOptions(true);
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }
    
    setIsDraggingOver(false);
    setDropPosition(null);
  };

  const handleCardOptionSelected = (faceUp: boolean) => {
    if (draggedCard && dropPosition && tableRef.current) {
      const x = dropPosition.x;
      const y = dropPosition.y;
      
      if (draggedCard.sourceType === 'hand') {
        // Mover da mão do jogador para a mesa
        const card = currentPlayer?.cards[draggedCard.sourceIndex || 0];
        if (card) {
          onMoveCard(card.id, 'hand', 'table', undefined, faceUp, x, y);
        }
      } else if (draggedCard.sourceType === 'deck') {
        // Mover do deck para a mesa
        onMoveCard('top-card', 'deck', 'table', undefined, faceUp, x, y);
      } else if (draggedCard.sourceType === 'table') {
        // Mover da mesa para outra posição na mesa
        const card = tableCards.find(c => c.id === draggedCard.sourceId);
        if (card) {
          onMoveCard(card.id, 'table', 'table', undefined, faceUp, x, y);
        }
      }
    }
    
    setShowCardOptions(false);
    setDraggedCard(null);
  };

  const handleDeckCardDrag = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedCard({
      suit: deckCards[deckCards.length - 1].suit,
      rank: deckCards[deckCards.length - 1].rank,
      sourceType: 'deck'
    });
  };

  const handleHandCardDrag = (e: React.DragEvent<HTMLDivElement>, cardIndex: number) => {
    if (!currentPlayer) return;
    
    const card = currentPlayer.cards[cardIndex];
    setDraggedCard({
      id: card.id,
      suit: card.suit,
      rank: card.rank,
      sourceType: 'hand',
      sourceId: currentPlayer.id,
      sourceIndex: cardIndex
    });
  };

  const handleTableCardDrag = (cardId: string, suit: Suit, rank: Rank) => {
    setDraggedCard({
      suit,
      rank,
      sourceType: 'table',
      sourceId: cardId
    });
  };

  const handlePlayerAreaDrop = (playerId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!draggedCard) return;
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.type === 'card') {
        if (draggedCard.sourceType === 'deck') {
          // Mover do deck diretamente para a mão do jogador
          onMoveCard('top-card', 'deck', 'hand', playerId, true);
        } else if (draggedCard.sourceType === 'table') {
          // Mover da mesa para a mão do jogador
          const card = tableCards.find(c => c.id === draggedCard.sourceId);
          if (card) {
            onMoveCard(card.id, 'table', 'hand', playerId, true);
          }
        } else if (draggedCard.sourceType === 'hand' && draggedCard.sourceId !== playerId) {
          // Mover da mão de um jogador para a mão de outro
          const card = players
            .find(p => p.id === draggedCard.sourceId)
            ?.cards[draggedCard.sourceIndex || 0];
            
          if (card) {
            onMoveCard(card.id, 'hand', 'hand', playerId, true);
          }
        }
      }
    } catch (error) {
      console.error('Error handling player area drop:', error);
    }
    
    setDraggedCard(null);
  };

  const getPlayerPosition = (position: number, totalPlayers: number) => {
    const angle = (position / totalPlayers) * 2 * Math.PI;
    const radius = 42; // % do container
    
    return {
      left: `${50 + radius * Math.cos(angle)}%`,
      top: `${50 + radius * Math.sin(angle)}%`,
    };
  };

  return (
    <div className="relative w-full h-full">
      <motion.div 
        ref={tableRef}
        className={cn(
          "table-felt relative w-full h-full rounded-3xl overflow-hidden shadow-xl",
          isDraggingOver && "border-4 border-yellow-300"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Table Cards */}
        <AnimatePresence>
          {tableCards.map((card) => (
            <TableCard
              key={card.id}
              id={card.id}
              suit={card.suit}
              rank={card.rank}
              faceUp={card.faceUp}
              x={card.x}
              y={card.y}
              onDragStart={handleTableCardDrag}
            />
          ))}
        </AnimatePresence>
        
        {/* Central Deck */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Deck 
            cards={deckCards}
            onCardDragStart={handleDeckCardDrag}
            onDeckClick={() => onDealCard(currentPlayerId)}
            onDeckShuffle={onShuffleDeck}
          />
        </div>
        
        {/* Other Players */}
        {otherPlayers.map((player) => {
          const position = getPlayerPosition(player.position, players.length);
          
          return (
            <div 
              key={player.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={position}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handlePlayerAreaDrop(player.id, e)}
            >
              <PlayerHand
                cards={player.cards}
                isCurrentPlayer={false}
                playerName={player.name}
                className="w-72"
              />
            </div>
          );
        })}
        
        {/* Current Player */}
        {currentPlayer && (
          <div 
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handlePlayerAreaDrop(currentPlayer.id, e)}
          >
            <PlayerHand
              cards={currentPlayer.cards}
              isCurrentPlayer={true}
              playerName={`${currentPlayer.name} (Você)`}
              onCardDragStart={handleHandCardDrag}
              onReorderCards={(startIndex, endIndex) => 
                onReorderPlayerCards(currentPlayer.id, startIndex, endIndex)
              }
              className="w-96"
            />
          </div>
        )}
        
        {/* Game Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <motion.button
            className="p-3 bg-white rounded-full shadow-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddDeck}
            title="Adicionar baralho"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 11h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z"/>
              <path d="M17 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2"/>
              <path d="M14 10V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8"/>
              <path d="M14 14h-3v3"/>
              <path d="M11 17h3"/>
            </svg>
          </motion.button>
          
          <motion.button
            className="p-3 bg-white rounded-full shadow-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRemoveCardsDialog}
            title="Remover cartas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/>
              <line x1="9" y1="9" x2="10" y2="9"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="15" y2="17"/>
            </svg>
          </motion.button>
          
          <motion.button
            className="p-3 bg-white rounded-full shadow-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onResetGame}
            title="Reiniciar jogo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </motion.button>
        </div>
      </motion.div>
      
      {/* Card Face Up/Down Dialog */}
      <Dialog open={showCardOptions} onOpenChange={setShowCardOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como deseja colocar a carta?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-8 my-4">
            <motion.div 
              className="text-center cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => handleCardOptionSelected(false)}
            >
              {draggedCard && (
                <div className="mb-2">
                  <Card 
                    suit={draggedCard.suit} 
                    rank={draggedCard.rank} 
                    faceUp={false} 
                    draggable={false} 
                  />
                </div>
              )}
              <Button variant="outline">Virada para baixo</Button>
            </motion.div>
            
            <motion.div 
              className="text-center cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => handleCardOptionSelected(true)}
            >
              {draggedCard && (
                <div className="mb-2">
                  <Card 
                    suit={draggedCard.suit} 
                    rank={draggedCard.rank} 
                    faceUp={true} 
                    draggable={false} 
                  />
                </div>
              )}
              <Button>Virada para cima</Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GameTable;
