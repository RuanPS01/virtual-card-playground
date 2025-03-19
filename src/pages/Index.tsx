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
import { firebaseService, GameSession } from '@/lib/firebase';
import { CardGroupType, GroupedCard } from '@/components/CardGroup';
import { v4 as uuidv4 } from 'uuid';

const Index = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [deckCards, setDeckCards] = useState<CardType[]>([]);
  const [tableCards, setTableCards] = useState<Array<CardType & { x: number, y: number }>>([]);
  const [cardGroups, setCardGroups] = useState<CardGroupType[]>([]);
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
      setCardGroups(gameState.cardGroups || []);
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

  const handleCreateCardGroup = async (cardIds: string[], x: number, y: number, mode: 'fan' | 'stack') => {
    console.log("handleCreateCardGroup called with:", cardIds, x, y, mode);

    const success = await updateGameState(state => {
      // Garantir que cardGroups exista
      if (!state.cardGroups) state.cardGroups = [];

      // Array para armazenar as cartas que serão agrupadas
      const groupCards: GroupedCard[] = [];

      // Nova lista de cartas na mesa (sem as que serão agrupadas)
      const newTableCards = [...(state.tableCards || [])];

      // Para cada id de carta
      for (const cardId of cardIds) {
        let foundCard = null;

        // Procurar na mesa
        const tableCardIndex = newTableCards.findIndex(c => c.id === cardId);
        if (tableCardIndex >= 0) {
          foundCard = newTableCards.splice(tableCardIndex, 1)[0];
        }

        // Se não foi encontrada na mesa, procurar no baralho
        if (!foundCard && cardId === 'top-card' && state.deckCards.length > 0) {
          foundCard = state.deckCards[state.deckCards.length - 1];
          state.deckCards = state.deckCards.slice(0, -1);
        }

        // Se ainda não foi encontrada, procurar nas mãos dos jogadores
        if (!foundCard) {
          for (const player of state.players) {
            if (!player.cards) continue;

            const handCardIndex = player.cards.findIndex(c => c.id === cardId);
            if (handCardIndex >= 0) {
              foundCard = player.cards.splice(handCardIndex, 1)[0];
              break;
            }
          }
        }

        // Se encontrou a carta, adicionar ao grupo
        if (foundCard) {
          groupCards.push({
            id: foundCard.id || uuidv4(),
            suit: foundCard.suit,
            rank: foundCard.rank,
            faceUp: foundCard.faceUp || true
          });
        }
      }

      // Criar o novo grupo se houver cartas
      if (groupCards.length > 0) {
        const newGroup: CardGroupType = {
          id: uuidv4(),
          cards: groupCards,
          x,
          y,
          mode
        };

        // Adicionar o grupo
        state.cardGroups.push(newGroup);

        // Atualizar a lista de cartas da mesa
        state.tableCards = newTableCards;
      }

      return state;
    });

    if (success) {
      toast.success('Cartas agrupadas com sucesso!');
    } else {
      toast.error('Erro ao agrupar cartas');
    }
  };

  const handleAddCardToGroup = async (groupId: string, cardId: string) => {
    console.log("Tentando adicionar carta", cardId, "ao grupo", groupId);

    const success = await updateGameState(state => {
      // Garantir que cardGroups existe
      if (!state.cardGroups) {
        console.log("Nenhum grupo de cartas encontrado");
        return state;
      }

      // Encontrar o grupo específico
      const groupIndex = state.cardGroups.findIndex(g => g.id === groupId);
      if (groupIndex < 0) {
        console.log("Grupo não encontrado:", groupId);
        return state;
      }

      // Variável para armazenar a carta a ser adicionada
      let cardToAdd: GroupedCard | null = null;

      // Verificar se cardId é uma referência para a carta do topo do baralho
      if (cardId === 'top-card' && state.deckCards && state.deckCards.length > 0) {
        const topCard = state.deckCards[state.deckCards.length - 1];

        // Remover do baralho
        state.deckCards = state.deckCards.slice(0, -1);

        cardToAdd = {
          id: topCard.id || uuidv4(),
          suit: topCard.suit,
          rank: topCard.rank,
          faceUp: true
        };
      }

      // Se não foi do baralho, procurar na mesa
      if (!cardToAdd && state.tableCards) {
        const tableCardIndex = state.tableCards.findIndex(c => c.id === cardId);

        if (tableCardIndex !== -1) {
          const card = state.tableCards[tableCardIndex];

          // Remover a carta da mesa
          state.tableCards.splice(tableCardIndex, 1);

          cardToAdd = {
            id: card.id,
            suit: card.suit,
            rank: card.rank,
            faceUp: card.faceUp
          };
        }
      }

      // Se não foi da mesa, procurar nas mãos dos jogadores
      if (!cardToAdd) {
        for (const player of state.players) {
          if (!player.cards) continue;

          const handCardIndex = player.cards.findIndex(c => c.id === cardId);

          if (handCardIndex !== -1) {
            // Remover a carta da mão do jogador
            const card = player.cards[handCardIndex];
            player.cards.splice(handCardIndex, 1);

            cardToAdd = {
              id: card.id,
              suit: card.suit,
              rank: card.rank,
              faceUp: true // Cartas da mão sempre viram para cima
            };

            break;
          }
        }
      }

      // Se encontrou a carta, adicionar ao grupo
      if (cardToAdd) {
        state.cardGroups[groupIndex].cards.push(cardToAdd);
      } else {
        console.log("Carta não encontrada:", cardId);
        toast.error('Carta não encontrada para adicionar ao grupo');
      }

      return state;
    });

    if (success) {
      toast.success('Carta adicionada ao grupo');
    } else {
      toast.error('Erro ao adicionar carta ao grupo');
    }
  };

  // Handle removing a card from a group
  const handleRemoveCardFromGroup = async (groupId: string, cardIndex: number, x?: number, y?: number) => {
    console.log("Removendo carta", cardIndex, "do grupo", groupId, "para posição", x, y);

    const success = await updateGameState(state => {
      // Verificações existentes...

      // Criar uma cópia profunda do estado
      const newState = JSON.parse(JSON.stringify(state));

      // Encontrar o grupo
      const groupIndex = newState.cardGroups.findIndex(g => g.id === groupId);
      if (groupIndex < 0) return state;

      const group = newState.cardGroups[groupIndex];

      // Verificar se o índice da carta é válido
      if (cardIndex < 0 || cardIndex >= group.cards.length) return state;

      // Remover a carta do grupo
      const removedCard = { ...group.cards[cardIndex] };
      group.cards.splice(cardIndex, 1);

      // Se o grupo ficar vazio, remover o grupo
      if (group.cards.length === 0) {
        newState.cardGroups.splice(groupIndex, 1);
      }

      // Adicionar a carta à mesa na posição especificada
      // Se não for especificada, usar a posição do grupo com um pequeno deslocamento
      const newTableCard = {
        id: removedCard.id,
        suit: removedCard.suit,
        rank: removedCard.rank,
        faceUp: removedCard.faceUp,
        x: x !== undefined ? x : group.x + 20,
        y: y !== undefined ? y : group.y + 20
      };

      if (!newState.tableCards) {
        newState.tableCards = [];
      }

      newState.tableCards.push(newTableCard);

      return newState;
    });

    if (success) {
      toast.success('Carta removida do grupo');
    }
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
        // Garantir que o jogador tem um array de cartas inicializado
        if (!state.players[playerIndex].cards) {
          state.players[playerIndex].cards = [];
        }

        // Agora é seguro adicionar a carta
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

  const handleMoveCardFromGroupToHand = async (groupId: string, cardIndex: number, playerId: string) => {
    console.log("Movendo carta", cardIndex, "do grupo", groupId, "para a mão do jogador", playerId);

    const success = await updateGameState(state => {
      // Verificar se o grupo existe
      if (!state.cardGroups) {
        console.log("Nenhum grupo de cartas encontrado");
        return state;
      }

      // Encontrar o grupo
      const groupIndex = state.cardGroups.findIndex(g => g.id === groupId);
      if (groupIndex < 0) {
        console.log("Grupo não encontrado:", groupId);
        return state;
      }

      // Verificar se o índice da carta é válido
      const group = state.cardGroups[groupIndex];
      if (cardIndex < 0 || cardIndex >= group.cards.length) {
        console.log("Índice de carta inválido:", cardIndex);
        return state;
      }

      // Encontrar o jogador
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex < 0) {
        console.log("Jogador não encontrado:", playerId);
        return state;
      }

      // Garantir que o jogador tenha um array de cartas
      if (!state.players[playerIndex].cards) {
        state.players[playerIndex].cards = [];
      }

      // Remover a carta do grupo
      const removedCard = { ...group.cards[cardIndex] };
      group.cards.splice(cardIndex, 1);

      // Se o grupo ficar vazio, remover o grupo
      if (group.cards.length === 0) {
        state.cardGroups.splice(groupIndex, 1);
      }

      // Adicionar a carta à mão do jogador (sempre virada para cima)
      state.players[playerIndex].cards.push({
        id: removedCard.id,
        suit: removedCard.suit,
        rank: removedCard.rank,
        faceUp: true
      });

      return state;
    });

    if (success) {
      toast.success('Carta movida para sua mão');
    } else {
      toast.error('Erro ao mover carta para sua mão');
    }
  };


  // Handle resetting the game
  const handleResetGame = async () => {
    const success = await updateGameState(state => {
      // Reunir todas as cartas, incluindo as dos grupos
      let allCards = [
        ...state.deckCards,
        ...state.tableCards,
        ...state.players.flatMap(player => player.cards || [])
      ];

      // Adicionar as cartas dos grupos
      if (state.cardGroups && state.cardGroups.length > 0) {
        const groupCards = state.cardGroups.flatMap(group => group.cards || []);
        allCards = [...allCards, ...groupCards];
      }

      // Atualizar o estado do jogo
      state.deckCards = shuffleDeck(allCards);
      state.tableCards = [];
      state.cardGroups = []; // Limpar os grupos de cartas

      // Limpar as mãos dos jogadores
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

  // Handle updating card group position
  const handleUpdateGroupPosition = async (groupId: string, x: number, y: number) => {
    console.log("Atualizando posição do grupo", groupId, "para", x, y);

    const success = await updateGameState(state => {
      // Verificar se o grupo existe
      if (!state.cardGroups) {
        console.log("Nenhum grupo de cartas encontrado");
        return state;
      }

      // Encontrar o grupo
      const groupIndex = state.cardGroups.findIndex(g => g.id === groupId);
      if (groupIndex < 0) {
        console.log("Grupo não encontrado:", groupId);
        return state;
      }

      // Atualizar a posição do grupo
      state.cardGroups[groupIndex].x = x;
      state.cardGroups[groupIndex].y = y;

      return state;
    });

    if (!success) {
      toast.error('Erro ao atualizar posição do grupo de cartas');
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
          cardGroups={cardGroups}
          onDealCard={handleDealCard}
          onShuffleDeck={handleShuffleDeck}
          onResetGame={handleResetGame}
          onAddDeck={handleAddDeck}
          onRemoveCardsDialog={() => setShowRemoveCardsDialog(true)}
          onMoveCard={handleMoveCard}
          onReorderPlayerCards={handleReorderPlayerCards}
          onCreateCardGroup={handleCreateCardGroup}
          onRemoveCardFromGroup={handleRemoveCardFromGroup}
          onAddCardToGroup={handleAddCardToGroup}
          onMoveCardFromGroupToHand={handleMoveCardFromGroupToHand}
          onUpdateGroupPosition={handleUpdateGroupPosition} // Nova prop
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