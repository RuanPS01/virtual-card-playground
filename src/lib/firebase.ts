import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, update, onValue, off, push, child, remove } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

// Firebase configuration
// Replace with your own Firebase configuration from the Firebase console
const firebaseConfig = {
    apiKey: "AIzaSyAQdLCw8JPfRfZJdHgjsM9CFArbHWL-SCQ",
    authDomain: "virtual-card-playground.firebaseapp.com",
    databaseURL: "https://virtual-card-playground-default-rtdb.firebaseio.com",
    projectId: "virtual-card-playground",
    storageBucket: "virtual-card-playground.firebasestorage.app",
    messagingSenderId: "1095507757324",
    appId: "1:1095507757324:web:e03d82d3aa60188d926129"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Types for game data
import { CardType } from '@/utils/cardUtils';
import { Player } from '@/components/GameTable';

// Game session interface
export interface GameSession {
    roomId: string;
    players: Player[];
    deckCards: CardType[];
    tableCards: Array<CardType & { x: number, y: number }>;
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

            // Ensure players array exists
            const players = gameState.players || [];

            // Add player to the room
            const position = players.length;
            players.push({
                id: playerId,
                name: playerName,
                cards: [],
                position
            });

            // Update the room data with the new player
            await update(roomRef, {
                players: players,
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

            // Ensure all required properties exist
            const safeGameState: GameSession = {
                roomId: data.roomId || roomId,
                players: data.players || [],
                deckCards: data.deckCards || [],
                tableCards: data.tableCards || [],
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

        // Set up real-time listener
        onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                // Ensure all required properties exist
                const safeGameState: GameSession = {
                    roomId: data.roomId || roomId,
                    players: data.players || [],
                    deckCards: data.deckCards || [],
                    tableCards: data.tableCards || [],
                    lastUpdate: data.lastUpdate || Date.now()
                };

                callback(safeGameState);
            }
        });

        // Return unsubscribe function
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