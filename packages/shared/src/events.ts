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
  playerRoundReady: (playerId: string) => void;
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
  quickJoin: (playerName: string, buyIn: number) => void;
  playerReady: () => void;
  playerUnready: () => void;

  // 大螢幕
  joinDisplay: () => void;

  // 押注
  placeBet: (bet: { optionId: string; amount: number; choiceId?: string }) => void;

  // 拍賣
  submitBid: (amount: number) => void;

  // 電腦玩家
  addBots: (count: number) => void;
  removeBots: () => void;

  // 每輪準備
  roundReady: () => void;

  // 重新開始
  playAgain: () => void;
}
