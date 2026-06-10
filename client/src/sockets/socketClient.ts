import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().token;
    socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });

    socket.on('room:updated', ({ room }) => {
      useGameStore.getState().setRoom(room);
    });

    socket.on('game:started', ({ gameState }) => {
      useGameStore.getState().setGame(gameState);
    });

    socket.on('game:state', ({ gameState }) => {
      useGameStore.getState().setGame(gameState);
    });

    socket.on('game:diceRolled', ({ dice }) => {
      if (Array.isArray(dice) && dice.length > 0) {
        useGameStore.getState().setLastDice([...dice]);
      }
    });

    socket.on('chat:message', (msg) => {
      useGameStore.getState().addChatMessage(msg);
    });

    socket.on('error', ({ message }) => {
      useGameStore.getState().setError(message);
      setTimeout(() => useGameStore.getState().setError(null), 4000);
    });

    socket.on('game:finished', ({ winner }) => {
      const current = useGameStore.getState().game;
      if (current) {
        useGameStore.getState().setGame({ ...current, status: 'finished', winner });
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Error de conexión:', err.message);
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) s.connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

// Emit helpers
export const socketEmit = {
  createRoom: () => getSocket().emit('room:create'),
  joinRoom: (code: string) => getSocket().emit('room:join', { code }),
  leaveRoom: () => getSocket().emit('room:leave'),
  selectCharacter: (characterId: string) => getSocket().emit('player:selectCharacter', { characterId }),
  setReady: (ready: boolean) => getSocket().emit('player:setReady', { ready }),
  startGame: () => getSocket().emit('game:start'),
  rollDice: () => getSocket().emit('game:rollDice'),
  buyProperty: () => getSocket().emit('game:buyProperty'),
  skipBuy: () => getSocket().emit('game:skipBuy'),
  mortgageProperty: (propertyId: number) => getSocket().emit('game:mortgageProperty', { propertyId }),
  useAbility: (abilityId: string, targetPlayerId?: string) =>
    getSocket().emit('game:useAbility', { abilityId, targetPlayerId }),
  endTurn: () => getSocket().emit('game:endTurn'),
  declareBankruptcy: () => getSocket().emit('game:declareBankruptcy'),
  sendChat: (message: string) => getSocket().emit('chat:message', { message }),
  proposeTrade: (targetPlayerId: string, wantPropertyId: number, offerMoney: number) =>
    getSocket().emit('game:proposeTrade', { targetPlayerId, wantPropertyId, offerMoney }),
  respondTrade: (accept: boolean) => getSocket().emit('game:respondTrade', { accept }),
};
