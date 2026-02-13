import { create } from 'zustand';
import type { Room, CalculatorState, ChipTransaction, CalcBetRound } from '@prize-battle/shared';

interface CalcDisplayStore {
  room: Room | null;
  transactions: ChipTransaction[];
  betRound: CalcBetRound | null;

  setRoomAndState: (room: Room, state: CalculatorState) => void;
  addTransaction: (tx: ChipTransaction, room: Room) => void;
  setBetRound: (round: CalcBetRound | null) => void;
}

export const useCalcDisplayStore = create<CalcDisplayStore>((set) => ({
  room: null,
  transactions: [],
  betRound: null,

  setRoomAndState: (room, state) => set({
    room,
    transactions: state.transactions,
    betRound: state.currentBetRound,
  }),
  addTransaction: (tx, room) => set((s) => ({
    room,
    transactions: [...s.transactions, tx],
  })),
  setBetRound: (betRound) => set({ betRound }),
}));
