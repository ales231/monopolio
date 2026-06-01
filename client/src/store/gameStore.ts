import { create } from 'zustand';
import { GameState, Room } from '@shared/types/index';

interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

interface GameStore {
  room: Room | null;
  game: GameState | null;
  chat: ChatMessage[];
  error: string | null;
  lastDice: number[] | null;
  showPhraseFor: string | null; // playerId

  setRoom: (room: Room | null) => void;
  setGame: (game: GameState | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setError: (e: string | null) => void;
  setLastDice: (dice: number[]) => void;
  showPhrase: (playerId: string) => void;
  clearPhrase: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  room: null,
  game: null,
  chat: [],
  error: null,
  lastDice: null,
  showPhraseFor: null,

  setRoom: (room) => set({ room }),
  setGame: (game) => set({ game }),
  addChatMessage: (msg) =>
    set((s) => ({ chat: [...s.chat.slice(-99), msg] })),
  setError: (error) => set({ error }),
  setLastDice: (dice) => set({ lastDice: dice }),
  showPhrase: (playerId) => {
    set({ showPhraseFor: playerId });
    setTimeout(() => set({ showPhraseFor: null }), 3000);
  },
  clearPhrase: () => set({ showPhraseFor: null }),
  reset: () => set({ room: null, game: null, chat: [], error: null, lastDice: null }),
}));
