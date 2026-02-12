import type { Server } from 'socket.io';
import type {
  BettingState,
  BetResult,
  BetType,
  PlayerBet,
  Player,
  DiceAnimationData,
  CoinAnimationData,
  MysteryAnimationData,
} from '@prize-battle/shared';
import {
  GAME_CONFIG,
  getBettingOptions,
  getMinBet,
  rollDice,
  resolveDiceHighLow,
  spinRoulette,
  flipCoins,
  generateMysteryBoxes,
  resolveDiceExact,
  getDiceExactRangeWinner,
  resolveGroupPredict,
} from '@prize-battle/shared';
import type { ServerToClientEvents, ClientToServerEvents } from '@prize-battle/shared';

export function createBettingState(
  type: BetType,
  roundNumber: number,
  players: Player[],
): BettingState {
  return {
    type,
    roundNumber,
    timeLeft: GAME_CONFIG.BETTING_TIME,
    minBet: 1,
    maxBet: 0,
    options: getBettingOptions(type, players.length),
    playerBets: {},
    result: null,
  };
}

export function placeBet(
  state: BettingState,
  playerId: string,
  optionId: string,
  amount: number,
  playerChips: number,
): boolean {
  if (state.playerBets[playerId]) return false; // Already bet
  if (state.timeLeft <= 0) return false;

  const minBet = getMinBet(playerChips);
  if (amount < minBet || amount > playerChips) return false;

  const option = state.options.find((o) => o.id === optionId);
  if (!option) return false;

  state.playerBets[playerId] = {
    optionId,
    amount,
    timestamp: Date.now(),
  };

  return true;
}

export function resolveBetting(
  state: BettingState,
  players: Player[],
): BetResult {
  switch (state.type) {
    case 'dice_high_low':
      return resolveDiceHighLowBet(state, players);
    case 'roulette':
      return resolveRouletteBet(state, players);
    case 'coin_multiply':
      return resolveCoinMultiplyBet(state, players);
    case 'mystery_pick':
      return resolveMysteryPickBet(state, players);
    case 'dice_exact':
      return resolveDiceExactBet(state, players);
    case 'group_predict':
      return resolveGroupPredictBet(state, players);
  }
}

function resolveDiceHighLowBet(state: BettingState, players: Player[]): BetResult {
  const dice = rollDice(3);
  const { winningOptionId, animationData } = resolveDiceHighLow(dice);

  const playerResults: BetResult['playerResults'] = {};

  for (const player of players) {
    const bet = state.playerBets[player.id];
    if (!bet) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }

    if (winningOptionId === '__triple__') {
      // Triple: everyone loses
      player.chips -= bet.amount;
      playerResults[player.id] = { won: false, payout: -bet.amount, newChips: player.chips };
    } else if (bet.optionId === winningOptionId) {
      const payout = bet.amount;
      player.chips += payout;
      playerResults[player.id] = { won: true, payout, newChips: player.chips };
    } else {
      player.chips -= bet.amount;
      playerResults[player.id] = { won: false, payout: -bet.amount, newChips: player.chips };
    }
  }

  return { winningOptionId, animationData, playerResults };
}

function resolveRouletteBet(state: BettingState, players: Player[]): BetResult {
  const { winningOptionId, animationData } = spinRoulette();

  const playerResults: BetResult['playerResults'] = {};
  const winOption = state.options.find((o) => o.id === winningOptionId)!;

  for (const player of players) {
    const bet = state.playerBets[player.id];
    if (!bet) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }

    if (bet.optionId === winningOptionId) {
      const payout = bet.amount * winOption.odds;
      player.chips += payout;
      playerResults[player.id] = { won: true, payout, newChips: player.chips };
    } else {
      player.chips -= bet.amount;
      playerResults[player.id] = { won: false, payout: -bet.amount, newChips: player.chips };
    }
  }

  return { winningOptionId, animationData, playerResults };
}

function resolveCoinMultiplyBet(state: BettingState, players: Player[]): BetResult {
  // Each player's coin flips are independent
  const allFlips: ('heads' | 'tails')[] = [];
  const playerResults: BetResult['playerResults'] = {};
  let firstFlipData: CoinAnimationData | null = null;

  for (const player of players) {
    const bet = state.playerBets[player.id];
    if (!bet) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }

    const times = bet.optionId === 'coin_1' ? 1 : bet.optionId === 'coin_2' ? 2 : 3;
    const multiplier = bet.optionId === 'coin_1' ? 2 : bet.optionId === 'coin_2' ? 4 : 8;
    const { won, flips, animationData } = flipCoins(times);

    if (!firstFlipData) firstFlipData = animationData;

    if (won) {
      const payout = bet.amount * (multiplier - 1);
      player.chips += payout;
      playerResults[player.id] = { won: true, payout, newChips: player.chips };
    } else {
      player.chips -= bet.amount;
      playerResults[player.id] = { won: false, payout: -bet.amount, newChips: player.chips };
    }
  }

  return {
    winningOptionId: 'coin_result',
    animationData: firstFlipData || { type: 'coin', flips: ['heads'] },
    playerResults,
  };
}

function resolveMysteryPickBet(state: BettingState, players: Player[]): BetResult {
  const boxes = generateMysteryBoxes();
  const playerResults: BetResult['playerResults'] = {};

  // Count how many players picked each box
  const boxPickers: Record<string, string[]> = {};
  for (const [playerId, bet] of Object.entries(state.playerBets)) {
    if (!boxPickers[bet.optionId]) boxPickers[bet.optionId] = [];
    boxPickers[bet.optionId].push(playerId);
  }

  for (const player of players) {
    const bet = state.playerBets[player.id];
    if (!bet) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }

    const box = boxes.find((b) => b.id === bet.optionId);
    if (!box) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }

    const sharers = boxPickers[bet.optionId]?.length || 1;
    const effectiveMultiplier = box.multiplier / sharers;

    if (box.multiplier === 0) {
      // Bomb
      player.chips -= bet.amount;
      playerResults[player.id] = { won: false, payout: -bet.amount, newChips: player.chips };
    } else {
      const payout = Math.floor(bet.amount * effectiveMultiplier) - bet.amount;
      player.chips += payout;
      playerResults[player.id] = {
        won: payout > 0,
        payout,
        newChips: player.chips,
      };
    }
  }

  const animationData: MysteryAnimationData = {
    type: 'mystery',
    boxes,
    revealOrder: boxes.map((b) => b.id),
  };

  return { winningOptionId: 'mystery_result', animationData, playerResults };
}

function resolveDiceExactBet(state: BettingState, players: Player[]): BetResult {
  const dice = rollDice(2);
  const total = dice.reduce((a, b) => a + b, 0);
  const exactWinner = `exact_${total}`;
  const rangeWinner = getDiceExactRangeWinner(total);

  const playerResults: BetResult['playerResults'] = {};
  const animationData: DiceAnimationData = {
    type: 'dice',
    dice,
    total,
    isTriple: false,
  };

  for (const player of players) {
    const bet = state.playerBets[player.id];
    if (!bet) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }

    const option = state.options.find((o) => o.id === bet.optionId);
    if (!option) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }

    const isExactWin = bet.optionId === exactWinner;
    const isRangeWin = bet.optionId === rangeWinner;

    if (isExactWin || isRangeWin) {
      const payout = Math.floor(bet.amount * option.odds);
      player.chips += payout;
      playerResults[player.id] = { won: true, payout, newChips: player.chips };
    } else {
      player.chips -= bet.amount;
      playerResults[player.id] = { won: false, payout: -bet.amount, newChips: player.chips };
    }
  }

  return { winningOptionId: exactWinner, animationData, playerResults };
}

function resolveGroupPredictBet(state: BettingState, players: Player[]): BetResult {
  const betsForPredict: Record<string, { optionId: string; amount: number }> = {};

  for (const [pid, bet] of Object.entries(state.playerBets)) {
    betsForPredict[pid] = { optionId: bet.optionId, amount: bet.amount };
  }

  const { animationData, bonusPlayers } = resolveGroupPredict(betsForPredict, players.length);
  const playerResults: BetResult['playerResults'] = {};

  const bonusAmount = 100; // Bonus chips for closest predictors

  for (const player of players) {
    const bet = state.playerBets[player.id];
    if (!bet) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }

    const isBonus = bonusPlayers.includes(player.id);
    if (isBonus) {
      player.chips += bonusAmount;
      playerResults[player.id] = { won: true, payout: bonusAmount, newChips: player.chips };
    } else {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
    }
  }

  return {
    winningOptionId: 'predict_result',
    animationData,
    playerResults,
  };
}
