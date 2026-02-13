import { create } from 'zustand';
import type { Room, CalculatorState, ChipTransaction, CalcBetRound } from '@prize-battle/shared';

type CalcScreen = 'join' | 'main';

interface CalcStore {
  screen: CalcScreen;
  playerId: string | null;
  playerName: string | null;
  room: Room | null;
  transactions: ChipTransaction[];
  betRound: CalcBetRound | null;
  error: string | null;

  setScreen: (s: CalcScreen) => void;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setRoomAndState: (room: Room, state: CalculatorState) => void;
  addTransaction: (tx: ChipTransaction, room: Room) => void;
  setBetRound: (round: CalcBetRound | null) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useCalcStore = create<CalcStore>((set) => ({
  screen: 'join',
  playerId: null,
  playerName: null,
  room: null,
  transactions: [],
  betRound: null,
  error: null,

  setScreen: (screen) => set({ screen }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setRoomAndState: (room, state) => set({
    room,
    transactions: state.transactions,
    betRound: state.currentBetRound,
    screen: 'main',
    error: null,
  }),
  addTransaction: (tx, room) => set((s) => ({
    room,
    transactions: [...s.transactions, tx],
  })),
  setBetRound: (betRound) => set({ betRound }),
  setError: (error) => set({ error }),
  reset: () => set({
    screen: 'join',
    room: null,
    transactions: [],
    betRound: null,
    error: null,
  }),
}));
