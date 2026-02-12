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

type Screen = 'join' | 'lobby' | 'game' | 'result';

interface GameStore {
  // Connection
  screen: Screen;
  playerId: string | null;
  playerName: string | null;
  error: string | null;

  // Room
  room: Room | null;
  countdown: number | null;

  // Game
  gameState: GameState | null;
  phase: GamePhase | null;
  timeLeft: number;

  // Betting
  bettingState: BettingState | null;
  bettingResult: BetResult | null;
  confirmedBets: Set<string>;
  hasPlacedBet: boolean;

  // Auction
  auctionState: AuctionState | null;
  auctionResult: AuctionResult | null;
  confirmedBids: Set<string>;
  hasSubmittedBid: boolean;

  // Leaderboard
  leaderboard: LeaderboardEntry[];

  // Actions
  setScreen: (screen: Screen) => void;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setError: (error: string | null) => void;
  setRoom: (room: Room) => void;
  setCountdown: (seconds: number) => void;
  setGameState: (state: GameState) => void;
  setPhase: (phase: GamePhase) => void;
  setTimeLeft: (seconds: number) => void;
  setBettingState: (state: BettingState) => void;
  setBettingResult: (result: BetResult) => void;
  addConfirmedBet: (playerId: string) => void;
  setHasPlacedBet: (value: boolean) => void;
  setAuctionState: (state: AuctionState) => void;
  setAuctionResult: (result: AuctionResult) => void;
  addConfirmedBid: (playerId: string) => void;
  setHasSubmittedBid: (value: boolean) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  screen: 'join',
  playerId: null,
  playerName: null,
  error: null,
  room: null,
  countdown: null,
  gameState: null,
  phase: null,
  timeLeft: 0,
  bettingState: null,
  bettingResult: null,
  confirmedBets: new Set(),
  hasPlacedBet: false,
  auctionState: null,
  auctionResult: null,
  confirmedBids: new Set(),
  hasSubmittedBid: false,
  leaderboard: [],

  setScreen: (screen) => set({ screen }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setError: (error) => set({ error }),

  setRoom: (room) => set((state) => {
    const newState: Partial<GameStore> = { room, error: null };
    if (room.status === 'waiting' && state.screen !== 'lobby') {
      newState.screen = 'lobby';
    }
    if (room.status === 'finished') {
      newState.screen = 'result';
    }
    return newState;
  }),

  setCountdown: (seconds) => set({ countdown: seconds }),

  setGameState: (gameState) => set({
    gameState,
    screen: 'game',
    countdown: null,
  }),

  setPhase: (phase) => set((state) => {
    const newState: Partial<GameStore> = { phase };
    if (phase === 'final_result') {
      newState.screen = 'result';
    }
    // Reset bet/bid state when new round starts
    if (phase === 'betting_round') {
      newState.hasPlacedBet = false;
      newState.confirmedBets = new Set();
      newState.bettingResult = null;
    }
    if (phase === 'auction_round') {
      newState.hasSubmittedBid = false;
      newState.confirmedBids = new Set();
      newState.auctionResult = null;
    }
    return newState;
  }),

  setTimeLeft: (seconds) => set({ timeLeft: seconds }),

  setBettingState: (bettingState) => set({
    bettingState,
    bettingResult: null,
    hasPlacedBet: false,
    confirmedBets: new Set(),
    timeLeft: bettingState.timeLeft,
  }),

  setBettingResult: (result) => set({ bettingResult: result }),

  addConfirmedBet: (playerId) => set((state) => {
    const newSet = new Set(state.confirmedBets);
    newSet.add(playerId);
    return { confirmedBets: newSet };
  }),

  setHasPlacedBet: (value) => set({ hasPlacedBet: value }),

  setAuctionState: (auctionState) => set({
    auctionState,
    auctionResult: null,
    hasSubmittedBid: false,
    confirmedBids: new Set(),
    timeLeft: auctionState.timeLeft,
  }),

  setAuctionResult: (result) => set({ auctionResult: result }),

  addConfirmedBid: (playerId) => set((state) => {
    const newSet = new Set(state.confirmedBids);
    newSet.add(playerId);
    return { confirmedBids: newSet };
  }),

  setHasSubmittedBid: (value) => set({ hasSubmittedBid: value }),

  setLeaderboard: (leaderboard) => set({ leaderboard, screen: 'result' }),

  reset: () => set({
    screen: 'join',
    room: null,
    countdown: null,
    gameState: null,
    phase: null,
    timeLeft: 0,
    bettingState: null,
    bettingResult: null,
    confirmedBets: new Set(),
    hasPlacedBet: false,
    auctionState: null,
    auctionResult: null,
    confirmedBids: new Set(),
    hasSubmittedBid: false,
    leaderboard: [],
    error: null,
  }),
}));
