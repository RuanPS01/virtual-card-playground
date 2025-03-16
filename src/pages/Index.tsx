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
import { firebaseService } from '@/lib/firebase';

const Index = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [deckCards, setDeckCards] = useState<CardType[]>([]);
  const [tableCards, setTableCards] = useState<Array<CardType & { x: number, y: number }>>([]);
  const [showRemoveCardsDialog, setShowRemoveCardsDialog] = useState(false);

  // Effect to register disconnect handler
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInRoom && roomId && currentPlayerId) {
        firebaseService.leaveRoom(roomId, currentPlayerId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Clean up when component unmounts
      if (isInRoom && roomId && currentPlayerId) {
        firebaseService.leaveRoom(roomId, currentPlayerId);
      }
    };
  }, [isInRoom, roomId, currentPlayerId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isInRoom || !roomId) return;

    const unsubscribe = firebaseService.subscribeToRoom(roomId, (gameState) => {
      setPlayers(gameState.players);
      setDeckCards(gameState.deckCards);
      setTableCards(gameState.tableCards);
    });

    return () => unsubscribe();
  }, [isInRoom, roomId]);

  // Initialize game with a fresh deck
  const initializeNewRoom = async (roomId: string) => {
    await firebaseService.updateGameState(roomId, (state) => {
      // Initialize with a fresh, shuffled deck
      state.deckCards = shuffleDeck(createDeck());
      return state;
    });
  };

  // Handler for creating a new room
  const handleCreateRoom = async (playerName: string) => {
    setIsLoading(true);
    try {
      const [newRoomId, newPlayerId] = await firebaseService.createRoom(playerName);

      // Initialize the room with a deck
      await initializeNewRoom(newRoomId);

      // Get latest game state
      const gameState = await firebaseService.getGameState(newRoomId);

      if (!gameState) {
        toast.error('Erro ao inicializar a sala');
        setIsLoading(false);
        return;
      }

      setRoomId(newRoomId);
      setCurrentPlayerId(newPlayerId);
      setPlayers(gameState.players);
      setDeckCards(gameState.deckCards);
      setTableCards(gameState.tableCards);
      setIsInRoom(true);

      toast.success(`Sala ${newRoomId} criada com sucesso!`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error('Erro ao criar sala. Por favor, tente novamente.');
    }
    setIsLoading(false);
  };

  // Handler for joining an existing room
  const handleJoinRoom = async (playerName: string, enteredRoomId: string) => {
    setIsLoading(true);
    try {
      const [newRoomId, newPlayerId, success] = await firebaseService.joinRoom(enteredRoomId, playerName);

      if (!success) {
        toast.error(`Sala ${enteredRoomId} não encontrada`);
        setIsLoading(false);
        return;
      }

      const gameState = await firebaseService.getGameState(newRoomId);

      if (!gameState) {
        toast.error('Erro ao acessar a sala');
        setIsLoading(false);
        return;
      }

      setRoomId(newRoomId);
      setCurrentPlayerId(newPlayerId);
      setPlayers(gameState.players);
      setDeckCards(gameState.deckCards);
      setTableCards(gameState.tableCards);
      setIsInRoom(true);

      toast.success(`Você entrou na sala ${newRoomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error('Erro ao entrar na sala. Por favor, tente novamente.');
    }
    setIsLoading(false);
  };

  // Function to send updates to Firebase
  const updateGameState = async (updater: (state: any) => any) => {
    return await firebaseService.updateGameState(roomId, updater);
  };

  // Handle dealing a card to a player
  const handleDealCard = async (playerId: string) => {
    const success = await updateGameState(state => {
      if (state.deckCards.length === 0) {
        toast.error('O baralho está vazio!');
        return state;
      }

      const { card, newDeck } = dealCard(state.deckCards);

      if (!card) {
        toast.error('Não há mais cartas no baralho!');
        return state;
      }

      state.deckCards = newDeck;

      const playerIndex = state.players.findIndex(p => p.id === playerId);

      if (playerIndex >= 0) {
        state.players[playerIndex].cards.push({ ...card, faceUp: true });
      }

      return state;
    });

    if (success) {
      toast.success('Carta comprada!');
    }
  };

  // Handle shuffling the deck
  const handleShuffleDeck = async () => {
    const success = await updateGameState(state => {
      state.deckCards = shuffleDeck([...state.deckCards]);
      return state;
    });

    if (success) {
      toast.success('Baralho embaralhado!');
    }
  };

  // Handle adding a new deck
  const handleAddDeck = async () => {
    const success = await updateGameState(state => {
      const newDeck = createDeck();
      state.deckCards = [...state.deckCards, ...newDeck];
      return state;
    });

    if (success) {
      toast.success('Novo baralho adicionado!');
    }
  };

  // Handle removing cards from the deck
  const handleRemoveCards = async (suits: Suit[], ranks: Rank[]) => {
    const currentDeckSize = deckCards.length;

    const success = await updateGameState(state => {
      let newDeck = [...state.deckCards];

      if (suits.length > 0) {
        newDeck = removeCardsBySuit(newDeck, suits);
      }

      if (ranks.length > 0) {
        newDeck = removeCardsByRank(newDeck, ranks);
      }

      state.deckCards = newDeck;
      return state;
    });

    if (success) {
      const gameState = await firebaseService.getGameState(roomId);
      if (gameState) {
        const removedCount = currentDeckSize - gameState.deckCards.length;
        toast.success(`${removedCount} cartas removidas do baralho!`);
      }
    }
  };

  // Handle resetting the game
  const handleResetGame = async () => {
    const success = await updateGameState(state => {
      // Gather all cards back to the deck
      const allCards = [
        ...state.deckCards,
        ...state.tableCards,
        ...state.players.flatMap(player => player.cards)
      ];

      state.deckCards = shuffleDeck(allCards);
      state.tableCards = [];

      // Clear all players' hands
      state.players.forEach(player => {
        player.cards = [];
      });

      return state;
    });

    if (success) {
      toast.success('Jogo reiniciado! Todas as cartas retornaram ao baralho.');
    }
  };

  // Função auxiliar para encontrar uma carta
  const findCard = (
    state: GameSession,
    cardId: string,
    fromType: 'hand' | 'table' | 'deck'
  ): { card: CardType | null, playerIndex?: number, cardIndex: number } => {
    if (fromType === 'deck') {
      const deckCards = state.deckCards || [];
      return {
        card: deckCards.length > 0 ? deckCards[deckCards.length - 1] : null,
        cardIndex: deckCards.length - 1
      };
    } else if (fromType === 'table') {
      const tableCards = state.tableCards || [];
      const cardIndex = tableCards.findIndex(c => c.id === cardId);
      return {
        card: cardIndex >= 0 ? { ...tableCards[cardIndex] } : null,
        cardIndex
      };
    } else {
      // Procurar nos jogadores
      const players = state.players || [];
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (!player || !player.cards) continue;

        const cardIndex = player.cards.findIndex(c => c.id === cardId);
        if (cardIndex >= 0) {
          return {
            card: { ...player.cards[cardIndex] },
            playerIndex: i,
            cardIndex
          };
        }
      }
      return { card: null, cardIndex: -1 };
    }
  };

  // Handle moving cards between places
  const handleMoveCard = async (
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
      await updateGameState(state => {
        // Verificar se o baralho tem cartas
        if (!state.deckCards || state.deckCards.length === 0) {
          toast.error('O baralho está vazio!');
          return state;
        }

        const { card, newDeck } = dealCard(state.deckCards);

        if (!card) return state;

        // Garantir que tableCards exista
        const tableCards = state.tableCards || [];

        return {
          ...state,
          deckCards: newDeck,
          tableCards: [...tableCards, { ...card, faceUp: faceUp ?? false, x, y }],
          lastUpdate: Date.now()
        };
      });
      return;
    }

    // Do baralho para a mão
    if (fromType === 'deck' && toType === 'hand' && toPlayerId) {
      await updateGameState(state => {
        // Verificar se o baralho tem cartas
        if (!state.deckCards || state.deckCards.length === 0) {
          toast.error('O baralho está vazio!');
          return state;
        }

        const { card, newDeck } = dealCard(state.deckCards);

        if (!card) return state;

        // Garantir que players existe
        const players = [...(state.players || [])];
        const playerIndex = players.findIndex(p => p.id === toPlayerId);

        if (playerIndex < 0) return state;

        // Garantir que o jogador tem um array de cartas
        if (!players[playerIndex].cards) {
          players[playerIndex].cards = [];
        }

        players[playerIndex].cards.push({ ...card, faceUp: faceUp ?? true });

        return {
          ...state,
          deckCards: newDeck,
          players,
          lastUpdate: Date.now()
        };
      });
      return;
    }

    // Da mão para a mesa
    if (fromType === 'hand' && toType === 'table' && typeof x === 'number' && typeof y === 'number') {
      await updateGameState(state => {
        // Encontrar a carta na mão do jogador
        const { card, playerIndex, cardIndex } = findCard(state, cardId, 'hand');

        if (!card || playerIndex === undefined || cardIndex < 0) return state;

        // Criar cópias dos arrays para modificar
        const players = [...(state.players || [])];

        // Garantir que o player tem um array de cartas
        if (!players[playerIndex].cards) {
          return state; // Se não tiver cartas, algo está errado
        }

        const playerCards = [...players[playerIndex].cards];

        // Remover a carta da mão do jogador
        playerCards.splice(cardIndex, 1);
        players[playerIndex].cards = playerCards;

        // Garantir que tableCards exista
        const tableCards = state.tableCards || [];

        // Adicionar a carta à mesa
        return {
          ...state,
          players,
          tableCards: [...tableCards, { ...card, faceUp: faceUp ?? false, x, y }],
          lastUpdate: Date.now()
        };
      });
      return;
    }

    // Da mesa para a mão
    if (fromType === 'table' && toType === 'hand' && toPlayerId) {
      await updateGameState(state => {
        // Garantir que tableCards exista
        const tableCards = state.tableCards || [];

        // Encontrar a carta na mesa
        const cardIndex = tableCards.findIndex(c => c.id === cardId);

        if (cardIndex < 0) return state;

        const card = tableCards[cardIndex];

        // Criar uma cópia da array de cartas da mesa
        const newTableCards = [...tableCards];
        newTableCards.splice(cardIndex, 1);

        // Encontrar o jogador alvo
        const players = [...(state.players || [])];
        const playerIndex = players.findIndex(p => p.id === toPlayerId);

        if (playerIndex < 0) return state;

        // Garantir que o jogador tem um array de cartas
        if (!players[playerIndex].cards) {
          players[playerIndex].cards = [];
        }

        players[playerIndex].cards.push({ ...card, faceUp: faceUp ?? true });

        return {
          ...state,
          players,
          tableCards: newTableCards,
          lastUpdate: Date.now()
        };
      });
      return;
    }

    // Da mesa para a mesa (reposicionamento)
    if (fromType === 'table' && toType === 'table' && typeof x === 'number' && typeof y === 'number') {
      await updateGameState(state => {
        // Garantir que tableCards exista
        const tableCards = state.tableCards || [];

        // Encontrar a carta na mesa
        const cardIndex = tableCards.findIndex(c => c.id === cardId);

        if (cardIndex < 0) return state;

        // Criar uma cópia da array de cartas da mesa
        const newTableCards = [...tableCards];

        // Atualizar posição e estado da carta
        newTableCards[cardIndex] = {
          ...newTableCards[cardIndex],
          x,
          y,
          faceUp: faceUp ?? newTableCards[cardIndex].faceUp
        };

        return {
          ...state,
          tableCards: newTableCards,
          lastUpdate: Date.now()
        };
      });
      return;
    }

    // Da mão para a mão (transferir entre jogadores)
    if (fromType === 'hand' && toType === 'hand' && toPlayerId) {
      await updateGameState(state => {
        // Garantir que players exista
        const players = [...(state.players || [])];

        // Encontrar a carta na mão do jogador
        let sourcePlayerIndex = -1;
        let sourceCardIndex = -1;
        let sourceCard = null;

        // Procurar a carta em todas as mãos dos jogadores
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          if (!player.cards) continue;

          const index = player.cards.findIndex(c => c.id === cardId);
          if (index !== -1) {
            sourcePlayerIndex = i;
            sourceCardIndex = index;
            sourceCard = { ...player.cards[index] };
            break;
          }
        }

        if (sourceCardIndex === -1 || !sourceCard) return state;

        // Remover a carta do jogador de origem
        const sourcePlayerCards = [...players[sourcePlayerIndex].cards];
        sourcePlayerCards.splice(sourceCardIndex, 1);
        players[sourcePlayerIndex].cards = sourcePlayerCards;

        // Encontrar o jogador alvo
        const targetPlayerIndex = players.findIndex(p => p.id === toPlayerId);

        if (targetPlayerIndex < 0) return state;

        // Garantir que o jogador alvo tenha um array de cartas
        if (!players[targetPlayerIndex].cards) {
          players[targetPlayerIndex].cards = [];
        }

        // Adicionar a carta à mão do jogador alvo
        players[targetPlayerIndex].cards.push({
          ...sourceCard,
          faceUp: faceUp ?? true
        });

        return {
          ...state,
          players,
          lastUpdate: Date.now()
        };
      });
    }
  };

  // Handle reordering cards in a player's hand
  const handleReorderPlayerCards = async (playerId: string, startIndex: number, endIndex: number) => {
    // Make sure indices are valid
    if (startIndex === endIndex) return;

    const success = await updateGameState(state => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);

      if (playerIndex === -1) return state;

      const player = state.players[playerIndex];

      // Create a new cards array with the reordered cards
      player.cards = reorderCards(player.cards, startIndex, endIndex);

      return state;
    });

    if (success) {
      toast.success('Cartas reordenadas!', { duration: 1000 });
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4">
        <div className="glass p-8 rounded-2xl shadow-lg text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Render room setup if not in a room
  if (!isInRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4">
        <RoomSetup onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
      </div>
    );
  }

  // Render game table
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-100 to-blue-50 p-4">
      <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-white bg-opacity-80 rounded-full shadow-sm">
        <span className="text-xs font-semibold text-gray-500 mr-2">SALA:</span>
        <span className="text-sm font-mono font-bold select-all cursor-pointer" onClick={() => {
          navigator.clipboard.writeText(roomId);
          toast.success('Código copiado para a área de transferência!');
        }} title="Clique para copiar">{roomId}</span>
        <span className="ml-4 text-xs font-semibold text-gray-500 mr-2">JOGADORES:</span>
        <span className="text-sm font-mono font-bold">{players.length}</span>
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

      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
        <button
          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          onClick={async () => {
            await firebaseService.leaveRoom(roomId, currentPlayerId);
            setIsInRoom(false);
            setRoomId('');
            setCurrentPlayerId('');
            setPlayers([]);
            setDeckCards([]);
            setTableCards([]);
            toast.success('Você saiu da sala.');
          }}
        >
          Sair da Sala
        </button>
      </div>
    </div>
  );
};

export default Index;