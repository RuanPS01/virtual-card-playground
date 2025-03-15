
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import GameTable, { Player } from '@/components/GameTable';
import RemoveCardsDialog from '@/components/RemoveCardsDialog';
import RoomSetup from '@/components/RoomSetup';
import { Suit, Rank } from '@/components/Card';
import { 
  CardType, 
  createDeck, 
  shuffleDeck, 
  dealCard, 
  removeCardsByRank, 
  removeCardsBySuit, 
  reorderCards
} from '@/utils/cardUtils';
import { v4 as uuidv4 } from 'uuid';

// Simulação de servidor para demonstração
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const Index = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [deckCards, setDeckCards] = useState<CardType[]>([]);
  const [tableCards, setTableCards] = useState<Array<CardType & { x: number, y: number }>>([]);
  const [showRemoveCardsDialog, setShowRemoveCardsDialog] = useState(false);
  
  // Inicializar jogo
  const initializeGame = (playerName: string, existingRoomId?: string) => {
    const newRoomId = existingRoomId || generateRoomId();
    const playerId = uuidv4();
    
    // Criar baralho inicial
    const initialDeck = shuffleDeck(createDeck());
    
    // Configurar jogador atual
    const currentPlayer: Player = {
      id: playerId,
      name: playerName,
      cards: [],
      position: 0
    };
    
    // Simular outros jogadores para demonstração
    const demoPlayers: Player[] = [];
    
    if (!existingRoomId) {
      // Se estiver criando uma nova sala, adicione alguns jogadores de demonstração
      const demoNames = ['Carlos', 'Ana', 'João', 'Luiza'];
      for (let i = 0; i < 4; i++) {
        demoPlayers.push({
          id: uuidv4(),
          name: demoNames[i],
          cards: [],
          position: i + 1
        });
      }
    }
    
    const allPlayers = [currentPlayer, ...demoPlayers];
    
    setRoomId(newRoomId);
    setCurrentPlayerId(playerId);
    setPlayers(allPlayers);
    setDeckCards(initialDeck);
    setIsInRoom(true);
    
    toast.success(existingRoomId 
      ? `Você entrou na sala ${newRoomId}` 
      : `Sala ${newRoomId} criada com sucesso!`
    );
  };
  
  // Lidar com criação de sala
  const handleCreateRoom = (playerName: string) => {
    initializeGame(playerName);
  };
  
  // Lidar com entrada em sala existente
  const handleJoinRoom = (playerName: string, roomId: string) => {
    initializeGame(playerName, roomId);
  };
  
  // Lidar com distribuição de carta
  const handleDealCard = (playerId: string) => {
    if (deckCards.length === 0) {
      toast.error('O baralho está vazio!');
      return;
    }
    
    const { card, newDeck } = dealCard(deckCards);
    
    if (!card) {
      toast.error('Não há mais cartas no baralho!');
      return;
    }
    
    setDeckCards(newDeck);
    
    setPlayers(prevPlayers => 
      prevPlayers.map(player => {
        if (player.id === playerId) {
          return {
            ...player,
            cards: [...player.cards, { ...card, faceUp: true }]
          };
        }
        return player;
      })
    );
    
    toast.success('Carta comprada!');
  };
  
  // Lidar com embaralhamento
  const handleShuffleDeck = () => {
    setDeckCards(prevDeck => shuffleDeck([...prevDeck]));
    toast.success('Baralho embaralhado!');
  };
  
  // Lidar com adição de baralho
  const handleAddDeck = () => {
    const newDeck = createDeck();
    setDeckCards(prevDeck => [...prevDeck, ...newDeck]);
    toast.success('Novo baralho adicionado!');
  };
  
  // Lidar com remoção de cartas
  const handleRemoveCards = (suits: Suit[], ranks: Rank[]) => {
    let newDeck = [...deckCards];
    
    if (suits.length > 0) {
      newDeck = removeCardsBySuit(newDeck, suits);
    }
    
    if (ranks.length > 0) {
      newDeck = removeCardsByRank(newDeck, ranks);
    }
    
    setDeckCards(newDeck);
    
    const removedCount = deckCards.length - newDeck.length;
    toast.success(`${removedCount} cartas removidas do baralho!`);
  };
  
  // Reiniciar jogo
  const handleResetGame = () => {
    // Reunir todas as cartas de volta ao baralho
    const allCards = [
      ...deckCards,
      ...tableCards,
      ...players.flatMap(player => player.cards)
    ];
    
    setDeckCards(shuffleDeck(allCards));
    setTableCards([]);
    setPlayers(prevPlayers => 
      prevPlayers.map(player => ({ ...player, cards: [] }))
    );
    
    toast.success('Jogo reiniciado! Todas as cartas retornaram ao baralho.');
  };
  
  // Mover carta entre locais
  const handleMoveCard = (
    cardId: string, 
    fromType: 'hand' | 'table' | 'deck', 
    toType: 'hand' | 'table', 
    toPlayerId?: string,
    faceUp?: boolean,
    x?: number,
    y?: number
  ) => {
    // Do baralho para a mesa
    if (fromType === 'deck' && toType === 'table' && typeof x === 'number' && typeof y === 'number') {
      if (deckCards.length === 0) {
        toast.error('O baralho está vazio!');
        return;
      }
      
      const { card, newDeck } = dealCard(deckCards);
      
      if (!card) return;
      
      setDeckCards(newDeck);
      setTableCards(prev => [...prev, { ...card, faceUp: faceUp ?? false, x, y }]);
      return;
    }
    
    // Do baralho para a mão
    if (fromType === 'deck' && toType === 'hand' && toPlayerId) {
      if (deckCards.length === 0) {
        toast.error('O baralho está vazio!');
        return;
      }
      
      const { card, newDeck } = dealCard(deckCards);
      
      if (!card) return;
      
      setDeckCards(newDeck);
      setPlayers(prevPlayers => 
        prevPlayers.map(player => {
          if (player.id === toPlayerId) {
            return {
              ...player,
              cards: [...player.cards, { ...card, faceUp: faceUp ?? true }]
            };
          }
          return player;
        })
      );
      return;
    }
    
    // Da mão para a mesa
    if (fromType === 'hand' && toType === 'table' && typeof x === 'number' && typeof y === 'number') {
      setPlayers(prevPlayers => {
        const newPlayers = [...prevPlayers];
        const playerIndex = newPlayers.findIndex(p => p.cards.some(c => c.id === cardId));
        
        if (playerIndex === -1) return prevPlayers;
        
        const player = newPlayers[playerIndex];
        const cardIndex = player.cards.findIndex(c => c.id === cardId);
        const card = player.cards[cardIndex];
        
        player.cards.splice(cardIndex, 1);
        
        setTableCards(prev => [...prev, { ...card, faceUp: faceUp ?? false, x, y }]);
        
        return newPlayers;
      });
      return;
    }
    
    // Da mesa para a mão
    if (fromType === 'table' && toType === 'hand' && toPlayerId) {
      const cardIndex = tableCards.findIndex(c => c.id === cardId);
      
      if (cardIndex === -1) return;
      
      const card = tableCards[cardIndex];
      
      setTableCards(prev => prev.filter(c => c.id !== cardId));
      
      setPlayers(prevPlayers => 
        prevPlayers.map(player => {
          if (player.id === toPlayerId) {
            return {
              ...player,
              cards: [...player.cards, { ...card, faceUp: faceUp ?? true }]
            };
          }
          return player;
        })
      );
      return;
    }
    
    // Da mesa para a mesa (reposicionar)
    if (fromType === 'table' && toType === 'table' && typeof x === 'number' && typeof y === 'number') {
      setTableCards(prev => {
        return prev.map(card => {
          if (card.id === cardId) {
            return { ...card, x, y, faceUp: faceUp ?? card.faceUp };
          }
          return card;
        });
      });
      return;
    }
    
    // Da mão para a mão (transferir entre jogadores)
    if (fromType === 'hand' && toType === 'hand' && toPlayerId) {
      setPlayers(prevPlayers => {
        const newPlayers = [...prevPlayers];
        
        // Encontrar o jogador que possui a carta
        const fromPlayerIndex = newPlayers.findIndex(p => p.cards.some(c => c.id === cardId));
        
        if (fromPlayerIndex === -1) return prevPlayers;
        
        const fromPlayer = newPlayers[fromPlayerIndex];
        const cardIndex = fromPlayer.cards.findIndex(c => c.id === cardId);
        const card = { ...fromPlayer.cards[cardIndex], faceUp: faceUp ?? true };
        
        // Remover a carta do jogador atual
        fromPlayer.cards.splice(cardIndex, 1);
        
        // Adicionar a carta ao jogador de destino
        newPlayers.forEach(player => {
          if (player.id === toPlayerId) {
            player.cards.push(card);
          }
        });
        
        return newPlayers;
      });
    }
  };
  
  // Reordenar cartas na mão
  const handleReorderPlayerCards = (playerId: string, startIndex: number, endIndex: number) => {
    setPlayers(prevPlayers => 
      prevPlayers.map(player => {
        if (player.id === playerId) {
          return {
            ...player,
            cards: reorderCards(player.cards, startIndex, endIndex)
          };
        }
        return player;
      })
    );
  };
  
  // Renderizar componente
  if (!isInRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4">
        <RoomSetup onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-100 to-blue-50 p-4">
      <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-white bg-opacity-80 rounded-full shadow-sm">
        <span className="text-xs font-semibold text-gray-500 mr-2">SALA:</span>
        <span className="text-sm font-mono font-bold">{roomId}</span>
      </div>
      
      <div className="w-full h-full">
        <GameTable
          currentPlayerId={currentPlayerId}
          players={players}
          deckCards={deckCards}
          tableCards={tableCards}
          onDealCard={handleDealCard}
          onShuffleDeck={handleShuffleDeck}
          onResetGame={handleResetGame}
          onAddDeck={handleAddDeck}
          onRemoveCardsDialog={() => setShowRemoveCardsDialog(true)}
          onMoveCard={handleMoveCard}
          onReorderPlayerCards={handleReorderPlayerCards}
        />
      </div>
      
      <RemoveCardsDialog
        isOpen={showRemoveCardsDialog}
        onClose={() => setShowRemoveCardsDialog(false)}
        onRemoveCards={handleRemoveCards}
      />
    </div>
  );
};

export default Index;
