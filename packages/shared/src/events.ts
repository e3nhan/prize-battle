import type {
  Room,
  GameState,
  GamePhase,
  BettingState,
  BetResult,
  AuctionState,
  AuctionResult,
  LeaderboardEntry,
} from './types.js';

export interface ServerToClientEvents {
  // 房間
  roomUpdate: (room: Room) => void;
  error: (message: string) => void;

  // 遊戲流程
  gameStart: (state: GameState) => void;
  phaseChange: (phase: GamePhase, data?: unknown) => void;
  timerTick: (secondsLeft: number) => void;
  countdownStart: (seconds: number) => void;

  // 押注
  bettingRoundStart: (state: BettingState) => void;
  playerBetConfirmed: (playerId: string) => void;
  bettingResult: (result: BetResult) => void;

  // 拍賣
  auctionRoundStart: (state: AuctionState) => void;
  playerBidConfirmed: (playerId: string) => void;
  auctionResult: (result: AuctionResult) => void;

  // 結算
  finalResult: (leaderboard: LeaderboardEntry[]) => void;
}

export interface ClientToServerEvents {
  // 房間
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  playerReady: () => void;

  // 大螢幕
  joinDisplay: (roomId: string) => void;
  createAndJoinDisplay: () => void;

  // 押注
  placeBet: (bet: { optionId: string; amount: number }) => void;

  // 拍賣
  submitBid: (amount: number) => void;

  // 重新開始
  playAgain: () => void;
}
