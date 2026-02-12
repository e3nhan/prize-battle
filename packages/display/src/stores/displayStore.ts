import { create } from 'zustand';
import type {
  Room,
  GameState,
  GamePhase,
  BettingState,
  BetResult,
  AuctionState,
  AuctionResult,
  LeaderboardEntry,
} from '@prize-battle/shared';

interface DisplayStore {
  room: Room | null;
  countdown: number | null;
  gameState: GameState | null;
  phase: GamePhase | null;
  timeLeft: number;

  bettingState: BettingState | null;
  bettingResult: BetResult | null;
  confirmedBets: Set<string>;

  auctionState: AuctionState | null;
  auctionResult: AuctionResult | null;
  confirmedBids: Set<string>;

  leaderboard: LeaderboardEntry[];

  setRoom: (room: Room) => void;
  setCountdown: (seconds: number) => void;
  setGameState: (state: GameState) => void;
  setPhase: (phase: GamePhase) => void;
  setTimeLeft: (seconds: number) => void;
  setBettingState: (state: BettingState) => void;
  setBettingResult: (result: BetResult) => void;
  addConfirmedBet: (playerId: string) => void;
  setAuctionState: (state: AuctionState) => void;
  setAuctionResult: (result: AuctionResult) => void;
  addConfirmedBid: (playerId: string) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
}

export const useDisplayStore = create<DisplayStore>((set) => ({
  room: null,
  countdown: null,
  gameState: null,
  phase: null,
  timeLeft: 0,
  bettingState: null,
  bettingResult: null,
  confirmedBets: new Set(),
  auctionState: null,
  auctionResult: null,
  confirmedBids: new Set(),
  leaderboard: [],

  setRoom: (room) => set({ room }),
  setCountdown: (seconds) => set({ countdown: seconds }),
  setGameState: (state) => set({ gameState: state, countdown: null }),
  setPhase: (phase) => set((s) => {
    const updates: Partial<DisplayStore> = { phase };
    if (phase === 'betting_round') {
      updates.confirmedBets = new Set();
      updates.bettingResult = null;
    }
    if (phase === 'auction_round') {
      updates.confirmedBids = new Set();
      updates.auctionResult = null;
    }
    return updates;
  }),
  setTimeLeft: (seconds) => set({ timeLeft: seconds }),
  setBettingState: (state) => set({
    bettingState: state,
    bettingResult: null,
    confirmedBets: new Set(),
    timeLeft: state.timeLeft,
  }),
  setBettingResult: (result) => set({ bettingResult: result }),
  addConfirmedBet: (playerId) => set((s) => {
    const newSet = new Set(s.confirmedBets);
    newSet.add(playerId);
    return { confirmedBets: newSet };
  }),
  setAuctionState: (state) => set({
    auctionState: state,
    auctionResult: null,
    confirmedBids: new Set(),
    timeLeft: state.timeLeft,
  }),
  setAuctionResult: (result) => set({ auctionResult: result }),
  addConfirmedBid: (playerId) => set((s) => {
    const newSet = new Set(s.confirmedBids);
    newSet.add(playerId);
    return { confirmedBids: newSet };
  }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
}));
