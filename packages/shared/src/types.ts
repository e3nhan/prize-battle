// ===== 玩家 =====
export interface Player {
  id: string;
  name: string;
  chips: number;
  buyIn: number;
  isReady: boolean;
  isConnected: boolean;
  avatar: string;
}

// ===== 房間 =====
export type RoomMode = 'game' | 'calculator';

export interface Room {
  id: string;
  mode: RoomMode;
  players: Player[];
  maxPlayers: number;
  status: RoomStatus;
  gameState: GameState | null;
  createdAt: number;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

// ===== 籌碼計算器 =====
export interface ChipTransaction {
  id: string;
  fromPlayerId: string;
  targetPlayerId: string;
  amount: number;
  fromNewBalance: number;
  toNewBalance: number;
  timestamp: number;
  note?: string;
}

export interface CalculatorState {
  transactions: ChipTransaction[];
}

// ===== 遊戲狀態 =====
export interface GameState {
  phase: GamePhase;
  currentRound: number;
  totalBettingRounds: number;
  totalAuctionItems: number;
  bettingState: BettingState | null;
  auctionState: AuctionState | null;
  leaderboard: LeaderboardEntry[];
}

export type GamePhase =
  | 'betting_intro'
  | 'betting_briefing'
  | 'betting_round'
  | 'betting_reveal'
  | 'betting_result'
  | 'auction_intro'
  | 'auction_briefing'
  | 'auction_round'
  | 'auction_reveal'
  | 'auction_result'
  | 'final_result';

// ===== 押注預測 =====
export type BetType =
  | 'dice_high_low'
  | 'dice_exact'
  | 'roulette'
  | 'coin_multiply'
  | 'mystery_pick'
  | 'group_predict';

export interface BettingState {
  type: BetType;
  roundNumber: number;
  timeLeft: number;
  minBet: number;
  maxBet: number;
  options: BetOption[];
  playerBets: Record<string, PlayerBet>;
  result: BetResult | null;
}

export interface BetOption {
  id: string;
  label: string;
  odds: number;
  description?: string;
}

export interface PlayerBet {
  optionId: string;
  choiceId?: string; // group_predict 用：記錄 A/B 選擇，optionId 為預測人數
  amount: number;
  timestamp: number;
}

export interface BetResult {
  winningOptionId: string;
  animationData: DiceAnimationData | RouletteAnimationData | CoinAnimationData | MysteryAnimationData | GroupPredictAnimationData;
  playerResults: Record<string, {
    won: boolean;
    payout: number;
    newChips: number;
  }>;
}

export interface DiceAnimationData {
  type: 'dice';
  dice: number[];
  total: number;
  isTriple: boolean;
}

export interface RouletteAnimationData {
  type: 'roulette';
  finalAngle: number;
  winningSegment: number;
}

export interface CoinAnimationData {
  type: 'coin';
  flips: ('heads' | 'tails')[];
}

export interface MysteryAnimationData {
  type: 'mystery';
  boxes: { id: string; content: string; multiplier: number }[];
  revealOrder: string[];
}

export interface GroupPredictAnimationData {
  type: 'group_predict';
  choiceA_count: number;
  choiceB_count: number;
  predictions: Record<string, number>;
  closestPlayers: string[];
}

// ===== 拍賣戰 =====
export type BoxType = 'diamond' | 'normal' | 'bomb' | 'mystery';

export interface AuctionState {
  roundNumber: number;
  currentBox: AuctionBoxPublic;
  timeLeft: number;
  playerBids: Record<string, number>;
  result: AuctionResult | null;
  remainingBoxes: number;
}

export interface AuctionBox {
  id: string;
  displayName: string;
  hint: string;
  type: BoxType;
  value: number;
  specialEffect?: SpecialEffect;
}

export interface AuctionBoxPublic {
  id: string;
  displayName: string;
  hint: string;
}

export type SpecialEffect =
  | { type: 'steal'; amount: number }
  | { type: 'swap' }
  | { type: 'redistribute' }
  | { type: 'double_or_nothing' }
  | { type: 'shield' };

export interface AuctionResult {
  winnerId: string | null;
  winningBid: number;
  box: AuctionBox;
  effectResult?: string;
  playerChipsAfter: Record<string, number>;
}

// ===== 排行榜 =====
export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  chips: number;
  rank: number;
  prize: number;
}
