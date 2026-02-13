import { create } from 'zustand';
import type { Room, CalculatorState, ChipTransaction } from '@prize-battle/shared';

interface CalcDisplayStore {
  room: Room | null;
  transactions: ChipTransaction[];

  setRoomAndState: (room: Room, state: CalculatorState) => void;
  addTransaction: (tx: ChipTransaction, room: Room) => void;
}

export const useCalcDisplayStore = create<CalcDisplayStore>((set) => ({
  room: null,
  transactions: [],

  setRoomAndState: (room, state) => set({
    room,
    transactions: state.transactions,
  }),
  addTransaction: (tx, room) => set((s) => ({
    room,
    transactions: [...s.transactions, tx],
  })),
}));
