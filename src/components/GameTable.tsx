import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Card, { Suit, Rank } from './Card';
import Deck from './Deck';
import PlayerHand from './PlayerHand';
import TableCard from './TableCard';
import CardGroup, { GroupedCard, CardGroupType } from './CardGroup';
import CardStackModeDialog from './CardStackModeDialog';
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
  cardGroups?: CardGroupType[];
  onDealCard: (playerId: string) => void;
  onShuffleDeck: () => void;
  onResetGame: () => void;
  onAddDeck: () => void;
  onRemoveCardsDialog: () => void;
  onMoveCard: (cardId: string, fromType: 'hand' | 'table' | 'deck', toType: 'hand' | 'table', toPlayerId?: string, faceUp?: boolean, x?: number, y?: number) => void;
  onReorderPlayerCards: (playerId: string, startIndex: number, endIndex: number) => void;
  onCreateCardGroup?: (cardIds: string[], x: number, y: number, mode: 'fan' | 'stack') => void;
  onRemoveCardFromGroup?: (groupId: string, cardIndex: number, x?: number, y?: number) => void;
  onAddCardToGroup?: (groupId: string, cardId: string) => void;
}

const GameTable: React.FC<GameTableProps> = ({
  currentPlayerId,
  players = [],
  deckCards = [],
  tableCards = [],
  cardGroups = [],
  onDealCard,
  onShuffleDeck,
  onResetGame,
  onAddDeck,
  onRemoveCardsDialog,
  onMoveCard,
  onReorderPlayerCards,
  onCreateCardGroup,
  onRemoveCardFromGroup,
  onAddCardToGroup
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<{ x: number, y: number } | null>(null);
  const [showCardOptions, setShowCardOptions] = useState(false);
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  const [draggedCard, setDraggedCard] = useState<{
    id?: string;
    suit: Suit;
    rank: Rank;
    sourceType: 'hand' | 'table' | 'deck';
    sourceId?: string;
    sourceIndex?: number;
  } | null>(null);

  // Estado para o modal de escolha entre leque e pilha
  const [showStackOptions, setShowStackOptions] = useState(false);
  const [stackTarget, setStackTarget] = useState<{
    draggedCardId: string;
    targetCardId: string;
    x: number;
    y: number;
    draggedSuit: Suit;
    draggedRank: Rank;
    targetSuit: Suit;
    targetRank: Rank;
  } | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  // Verificação de segurança para evitar erro quando currentPlayerId não é encontrado
  const currentPlayer = players.find(p => p.id === currentPlayerId) || null;

  // Verificação de segurança para evitar erro quando players é undefined
  const otherPlayers = currentPlayer
    ? players.filter(p => p.id !== currentPlayerId)
    : [];

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Check if we're dragging over a player hand element
    const target = e.target as HTMLElement;
    const isPlayerHand = target.closest('[data-player-area="true"]');

    if (isPlayerHand) {
      // Don't update table drop position if we're over a player hand
      return;
    }

    setIsDraggingOver(true); // This uses the state variable

    if (tableRef.current) {
      const rect = tableRef.current.getBoundingClientRect();
      setDropPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const isOverCardGroup = (x: number, y: number): { isOver: boolean; groupId: string } | null => {
    // Função para verificar se a posição de drop está sobre algum grupo de cartas
    for (const group of cardGroups) {
      // Considere uma área um pouco maior ao redor do grupo para facilitar o drop
      // Ajuste esses valores conforme necessário
      const groupLeft = group.x - 20;
      const groupRight = group.x + 100;
      const groupTop = group.y - 20;
      const groupBottom = group.y + 140;

      if (x >= groupLeft && x <= groupRight && y >= groupTop && y <= groupBottom) {
        return {
          isOver: true,
          groupId: group.id
        };
      }
    }

    return null;
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const isOverCard = (x: number, y: number): { isOver: boolean; cardId: string; suit: Suit; rank: Rank } | null => {
    // Função para verificar se a posição de drop está sobre alguma carta na mesa
    for (const card of tableCards) {
      // Considerando que a carta tem aproximadamente 80px de largura e 112px de altura
      const cardLeft = card.x;
      const cardRight = card.x + 80;
      const cardTop = card.y;
      const cardBottom = card.y + 112;

      if (x >= cardLeft && x <= cardRight && y >= cardTop && y <= cardBottom) {
        return {
          isOver: true,
          cardId: card.id,
          suit: card.suit,
          rank: card.rank
        };
      }
    }

    return null;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Check if we're dropping on a player hand element
    const target = e.target as HTMLElement;
    const playerHandElement = target.closest('[data-player-area="true"]');

    if (playerHandElement) {
      // If we're dropping on a player hand, we'll let handlePlayerAreaDrop handle it
      setIsDraggingOver(false);
      return;
    }

    if (!dropPosition) {
      setIsDraggingOver(false);
      return;
    }

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      if (data.type === 'card') {
        // Verificar se estamos dropando sobre outro grupo de cartas
        const overGroupInfo = isOverCardGroup(dropPosition.x, dropPosition.y);

        if (data.isGrouped && dropPosition) {
          // Esta é uma carta sendo arrastada de um grupo
          console.log("Carta arrastada de um grupo:", data);

          if (onRemoveCardFromGroup) {
            // Remover do grupo
            onRemoveCardFromGroup(data.groupId, data.groupIndex, dropPosition.x, dropPosition.y);
            setIsDraggingOver(false);
            return;
          }
        }
        if (overGroupInfo && overGroupInfo.isOver) {
          // Estamos dropando sobre um grupo existente
          // Adicionar a carta ao grupo
          if (onAddCardToGroup) {
            const draggedCardId = draggedCard?.id || data.id;
            onAddCardToGroup(overGroupInfo.groupId, draggedCardId);
            setIsDraggingOver(false);
            return;
          }
        }

        // Verificar se estamos dropando sobre outra carta
        const overCardInfo = isOverCard(dropPosition.x, dropPosition.y);

        if (overCardInfo && overCardInfo.isOver) {
          // Estamos dropando sobre outra carta, mostrar o modal de escolha
          const draggedCardId = draggedCard?.id || data.id;

          setStackTarget({
            draggedCardId: draggedCardId,
            targetCardId: overCardInfo.cardId,
            x: dropPosition.x,
            y: dropPosition.y,
            draggedSuit: data.suit,
            draggedRank: data.rank,
            targetSuit: overCardInfo.suit,
            targetRank: overCardInfo.rank
          });

          // Armazenar a posição do mouse para o modal
          setMousePosition({ x: e.clientX, y: e.clientY });

          // Mostrar o modal de escolha do modo de agrupamento
          setShowStackOptions(true);
          setIsDraggingOver(false);
          return;
        }

        // Identify the source type of the card
        const sourceType = draggedCard?.sourceType || 'deck';

        // Set up the dragged card information
        const newDraggedCard = {
          id: data.id,
          suit: data.suit,
          rank: data.rank,
          sourceType: sourceType,
          sourceId: draggedCard?.sourceId,
          sourceIndex: draggedCard?.sourceIndex
        };

        setDraggedCard(newDraggedCard);

        // Store the current mouse position for the dialog
        setMousePosition({ x: e.clientX, y: e.clientY });

        // If the card is already on the table, we don't show the modal
        // We move the card directly to the new position
        if (sourceType === 'table') {
          const card = tableCards.find(c => c.id === newDraggedCard.sourceId);
          if (card) {
            onMoveCard(
              card.id,
              'table',
              'table',
              undefined,
              card.faceUp,
              dropPosition.x,
              dropPosition.y
            );
          }
        } else {
          // For cards from hand or deck, we show the modal
          setShowCardOptions(true);
        }
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }

    setIsDraggingOver(false);
  };

  const handleCardOptionSelected = (faceUp: boolean) => {
    if (draggedCard && dropPosition && tableRef.current) {
      const x = dropPosition.x;
      const y = dropPosition.y;

      if (draggedCard.sourceType === 'hand' && currentPlayer) {
        // Move from player's hand to the table
        const card = currentPlayer.cards[draggedCard.sourceIndex || 0];
        if (card) {
          onMoveCard(card.id, 'hand', 'table', undefined, faceUp, x, y);
        }
      } else if (draggedCard.sourceType === 'deck') {
        // Move from deck to the table
        onMoveCard('top-card', 'deck', 'table', undefined, faceUp, x, y);
      } else if (draggedCard.sourceType === 'table') {
        // Move from the table to another position on the table
        const card = tableCards.find(c => c.id === draggedCard.sourceId);
        if (card) {
          onMoveCard(card.id, 'table', 'table', undefined, faceUp, x, y);
        }
      }
    }

    setShowCardOptions(false);
    setDraggedCard(null);
    setDropPosition(null);
  };

  const handleStackModeSelected = (mode: 'fan' | 'stack') => {
    console.log("Stack mode selected:", mode, stackTarget, onCreateCardGroup);

    if (stackTarget && onCreateCardGroup) {
      // Criar um grupo de cartas com as duas cartas
      const cardIds = [stackTarget.draggedCardId, stackTarget.targetCardId];
      console.log("Creating card group with IDs:", cardIds);
      onCreateCardGroup(cardIds, stackTarget.x, stackTarget.y, mode);
    }

    setShowStackOptions(false);
    setStackTarget(null);
    setDraggedCard(null);
  };

  const handleDeckCardDrag = (e: React.DragEvent<HTMLDivElement>) => {
    if (deckCards.length === 0) return;

    setDraggedCard({
      id: 'top-card', // Identifica como a carta do topo do deck
      suit: deckCards[deckCards.length - 1].suit,
      rank: deckCards[deckCards.length - 1].rank,
      sourceType: 'deck'
    });

    // Certifique-se de que os dados estão sendo definidos corretamente no evento
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'card',
      id: 'top-card',
      suit: deckCards[deckCards.length - 1].suit,
      rank: deckCards[deckCards.length - 1].rank
    }));
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
      id: cardId,
      suit,
      rank,
      sourceType: 'table',
      sourceId: cardId
    });
  };

  const handleGroupCardDrag = (cardId: string, suit: Suit, rank: Rank) => {
    setDraggedCard({
      id: cardId,
      suit,
      rank,
      sourceType: 'table',
      sourceId: cardId
    });
  };

  const handlePlayerAreaDrop = (playerId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent the event from bubbling up to the table's drop handler

    if (!draggedCard) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      if (data.type === 'card') {
        if (draggedCard.sourceType === 'deck') {
          // Move from deck directly to player's hand
          onMoveCard('top-card', 'deck', 'hand', playerId, true);
        } else if (draggedCard.sourceType === 'table') {
          // Move from table to player's hand
          const card = tableCards.find(c => c.id === draggedCard.sourceId);
          if (card) {
            onMoveCard(card.id, 'table', 'hand', playerId, true);
          }
        } else if (draggedCard.sourceType === 'hand' && draggedCard.sourceId !== playerId) {
          // Move from one player's hand to another's
          const sourcePlayer = players.find(p => p.id === draggedCard.sourceId);
          if (sourcePlayer && typeof draggedCard.sourceIndex === 'number') {
            const card = sourcePlayer.cards[draggedCard.sourceIndex];
            if (card) {
              onMoveCard(card.id, 'hand', 'hand', playerId, true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling player area drop:', error);
    }

    setDraggedCard(null);
    setDropPosition(null);
  };

  // Posicionamento estratégico dos jogadores em torno da mesa
  const getPlayerPositions = (players: Player[]) => {
    const positions: Record<string, { left: string, top: string }> = {};

    // Total de jogadores excluindo o atual
    const otherPlayerCount = players.length - 1;

    if (otherPlayerCount === 0) {
      return positions;
    }

    // Definir posições apenas para os lados e topo
    // Evitando a parte inferior onde fica o jogador atual
    players.forEach(player => {
      if (player.id === currentPlayerId) {
        // Jogador atual já está posicionado na parte inferior
        return;
      }

      // Calcular a posição baseada no índice do jogador
      // Distribuir entre: topo-esquerda, topo, topo-direita, direita, esquerda
      const index = player.position % 5;

      switch (index) {
        case 0: // topo-esquerda
          positions[player.id] = { left: '15%', top: '15%' };
          break;
        case 1: // topo
          positions[player.id] = { left: '50%', top: '10%' };
          break;
        case 2: // topo-direita
          positions[player.id] = { left: '85%', top: '15%' };
          break;
        case 3: // direita
          positions[player.id] = { left: '85%', top: '40%' };
          break;
        case 4: // esquerda
          positions[player.id] = { left: '15%', top: '40%' };
          break;
      }
    });

    return positions;
  };

  const playerPositions = getPlayerPositions(players);

  return (
    <div className="relative w-full h-full">
      <motion.div
        ref={tableRef}
        className={cn(
          "table-felt relative w-full h-full rounded-3xl overflow-hidden shadow-xl"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <AnimatePresence>
          {/* Table Cards */}
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

          {/* Card Groups - certifique-se de que temos cardGroups e que é um array */}
          {cardGroups && Array.isArray(cardGroups) && cardGroups.map((group) => (
            <CardGroup
              key={group.id}
              groupId={group.id}
              cards={group.cards}
              x={group.x}
              y={group.y}
              mode={group.mode}
              onDragStart={handleGroupCardDrag}
              onRemoveCard={onRemoveCardFromGroup}
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
          const position = playerPositions[player.id];

          if (!position) return null;

          return (
            <div
              key={player.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: position.left,
                top: position.top,
              }}
              data-player-area="true"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Stop propagation to prevent table drag over
              }}
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
            data-player-area="true"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation(); // Stop propagation to prevent table drag over
            }}
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
              <path d="M17 11h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" />
              <path d="M17 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2" />
              <path d="M14 10V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8" />
              <path d="M14 14h-3v3" />
              <path d="M11 17h3" />
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
              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
              <line x1="9" y1="9" x2="10" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="15" y2="17" />
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
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </motion.button>
        </div>
      </motion.div>

      {/* Card Face Up/Down Dialog */}
      <Dialog open={showCardOptions} onOpenChange={setShowCardOptions}>
        <DialogContent
          className="w-100 absolute p-4"
          style={{
            position: 'fixed',
            top: mousePosition ? `${mousePosition.y}px` : '50%',
            left: mousePosition ? `${mousePosition.x}px` : '50%',
            transform: mousePosition ? 'translate(-50%, -80%)' : 'translate(-50%, -50%)'
          }}
        >
          <DialogHeader>
            <DialogTitle>Virada para baixo?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-4">
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
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Stack Mode Dialog */}
      {stackTarget && (
        <CardStackModeDialog
          open={showStackOptions}
          onOpenChange={setShowStackOptions}
          onSelectMode={handleStackModeSelected}
          baseSuit={stackTarget.draggedSuit}
          baseRank={stackTarget.draggedRank}
          mousePosition={mousePosition}
        />
      )}
    </div>
  );
};

export default GameTable;