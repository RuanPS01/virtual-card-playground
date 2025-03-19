import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, update, onValue, off, push, child, remove } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

// Firebase configuration
// Replace with your own Firebase configuration from the Firebase console
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Types for game data
import { CardType } from '@/utils/cardUtils';
import { Player } from '@/components/GameTable';
import { Rank, Suit } from '@/components/Card';

// Game session interface
export interface GameSession {
    roomId: string;
    players: Player[];
    deckCards: CardType[];
    tableCards: Array<CardType & { x: number, y: number }>;
    cardGroups?: Array<{
        id: string;
        cards: Array<{
            id: string;
            suit: Suit;
            rank: Rank;
            faceUp: boolean;
        }>;
        x: number;
        y: number;
        mode: 'fan' | 'stack';
    }>;
    lastUpdate: number;
}

// Firebase utility functions
export const firebaseService = {
    // Create a new game room
    createRoom: async (creatorName: string): Promise<[string, string]> => {
        // Generate a unique room ID (6 characters, uppercase)
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const playerId = uuidv4();

        // Create initial game state with the creator as the first player
        const newGameState: GameSession = {
            roomId,
            players: [{
                id: playerId,
                name: creatorName,
                cards: [],
                position: 0
            }],
            deckCards: [], // We'll initialize the deck after creating the room
            tableCards: [],
            lastUpdate: Date.now()
        };

        // Save to Firebase
        const roomRef = ref(database, `rooms/${roomId}`);
        await set(roomRef, newGameState);

        return [roomId, playerId];
    },

    // Join an existing room
    joinRoom: async (roomId: string, playerName: string): Promise<[string, string, boolean]> => {
        try {
            // Check if room exists
            const roomRef = ref(database, `rooms/${roomId}`);
            const snapshot = await get(roomRef);

            if (!snapshot.exists()) {
                return ['', '', false];
            }

            const gameState = snapshot.val() as GameSession;
            const playerId = uuidv4();

            // Garantir que players e cardGroups existam
            const players = gameState.players || [];
            const cardGroups = gameState.cardGroups || [];

            // Adicionar jogador à sala
            const position = players.length;
            players.push({
                id: playerId,
                name: playerName,
                cards: [],
                position
            });

            // Atualizar o estado da sala
            await update(roomRef, {
                players: players,
                cardGroups: cardGroups, // Manter os grupos de cartas existentes
                lastUpdate: Date.now()
            });

            return [roomId, playerId, true];
        } catch (error) {
            console.error("Error joining room:", error);
            return ['', '', false];
        }
    },

    // Get current game state
    getGameState: async (roomId: string): Promise<GameSession | null> => {
        try {
            const roomRef = ref(database, `rooms/${roomId}`);
            const snapshot = await get(roomRef);

            if (!snapshot.exists()) {
                return null;
            }

            const data = snapshot.val();

            // Garantir que todas as propriedades existam com valores padrão seguros
            const safeGameState: GameSession = {
                roomId: data.roomId || roomId,
                players: data.players || [],
                deckCards: data.deckCards || [],
                tableCards: data.tableCards || [],
                cardGroups: data.cardGroups || [],
                lastUpdate: data.lastUpdate || Date.now()
            };

            return safeGameState;
        } catch (error) {
            console.error("Error getting game state:", error);
            return null;
        }
    },

    // Update game state with a transaction
    updateGameState: async (roomId: string, updateFunction: (state: GameSession) => GameSession): Promise<boolean> => {
        try {
            // Get current state
            const roomRef = ref(database, `rooms/${roomId}`);
            const snapshot = await get(roomRef);

            if (!snapshot.exists()) {
                return false;
            }

            // Apply the update function to the current state
            const currentState = snapshot.val() as GameSession;

            // Ensure all required properties exist before updating
            const safeState: GameSession = {
                roomId: currentState.roomId || roomId,
                players: currentState.players || [],
                deckCards: currentState.deckCards || [],
                tableCards: currentState.tableCards || [],
                cardGroups: currentState.cardGroups || [], // Incluir cardGroups
                lastUpdate: currentState.lastUpdate || Date.now()
            };

            // Apply the update function to get new state
            const newState = updateFunction(safeState);

            // Update the timestamp
            newState.lastUpdate = Date.now();

            // Ensure all properties still exist after the update
            const safeNewState: GameSession = {
                roomId: newState.roomId || roomId,
                players: newState.players || [],
                deckCards: newState.deckCards || [],
                tableCards: newState.tableCards || [],
                cardGroups: newState.cardGroups || [], // Incluir cardGroups
                lastUpdate: newState.lastUpdate
            };

            // Save the new state
            await set(roomRef, safeNewState);

            return true;
        } catch (error) {
            console.error("Error updating game state:", error);
            return false;
        }
    },

    // Subscribe to real-time updates for a room
    subscribeToRoom: (roomId: string, callback: (gameState: GameSession) => void) => {
        const roomRef = ref(database, `rooms/${roomId}`);

        // Configurar listener de tempo real
        onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                // Garantir valores seguros
                const safeGameState: GameSession = {
                    roomId: data.roomId || roomId,
                    players: data.players || [],
                    deckCards: data.deckCards || [],
                    tableCards: data.tableCards || [],
                    cardGroups: data.cardGroups || null,
                    lastUpdate: data.lastUpdate || Date.now()
                };

                callback(safeGameState);
            }
        });

        // Retornar função de unsubscribe
        return () => off(roomRef);
    },

    // Leave a room
    leaveRoom: async (roomId: string, playerId: string): Promise<boolean> => {
        try {
            const roomRef = ref(database, `rooms/${roomId}`);
            const snapshot = await get(roomRef);

            if (!snapshot.exists()) {
                return false;
            }

            const gameState = snapshot.val() as GameSession;

            // Ensure players array exists
            const players = gameState.players || [];

            // Filter out the leaving player
            const updatedPlayers = players.filter(player => player.id !== playerId);

            // If no players left, delete the room
            if (updatedPlayers.length === 0) {
                await remove(roomRef);
                return true;
            }

            // Update the player positions if needed
            updatedPlayers.forEach((player, index) => {
                player.position = index;
            });

            // Update the game state
            await update(roomRef, {
                players: updatedPlayers,
                lastUpdate: Date.now()
            });

            return true;
        } catch (error) {
            console.error("Error leaving room:", error);
            return false;
        }
    }
};

export default firebaseService;