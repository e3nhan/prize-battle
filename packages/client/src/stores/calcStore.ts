import { create } from 'zustand';
import type { Room, CalculatorState, ChipTransaction } from '@prize-battle/shared';

type CalcScreen = 'join' | 'main';

interface CalcStore {
  screen: CalcScreen;
  playerId: string | null;
  playerName: string | null;
  room: Room | null;
  transactions: ChipTransaction[];
  error: string | null;

  setScreen: (s: CalcScreen) => void;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setRoomAndState: (room: Room, state: CalculatorState) => void;
  addTransaction: (tx: ChipTransaction, room: Room) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useCalcStore = create<CalcStore>((set) => ({
  screen: 'join',
  playerId: null,
  playerName: null,
  room: null,
  transactions: [],
  error: null,

  setScreen: (screen) => set({ screen }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setRoomAndState: (room, state) => set({
    room,
    transactions: state.transactions,
    screen: 'main',
    error: null,
  }),
  addTransaction: (tx, room) => set((s) => ({
    room,
    transactions: [...s.transactions, tx],
  })),
  setError: (error) => set({ error }),
  reset: () => set({
    screen: 'join',
    room: null,
    transactions: [],
    error: null,
  }),
}));
