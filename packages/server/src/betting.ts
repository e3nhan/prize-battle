import type {
  BettingState,
  BetResult,
  BetType,
  BetOption,
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
  getDiceExactRangeWinner,
  resolveGroupPredict,
} from '@prize-battle/shared';

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
  choiceId?: string,
): boolean {
  if (state.playerBets[playerId]) return false;
  if (state.timeLeft <= 0) return false;

  const minBet = getMinBet(playerChips);
  if (amount < minBet || amount > playerChips) return false;

  const option = state.options.find((o: BetOption) => o.id === optionId);
  if (!option) return false;

  // group_predict 時驗證 choiceId 是合法的 A/B 選項
  if (choiceId) {
    const choiceOption = state.options.find((o: BetOption) => o.id === choiceId);
    if (!choiceOption) return false;
  }

  state.playerBets[playerId] = {
    optionId,
    ...(choiceId ? { choiceId } : {}),
    amount,
    timestamp: Date.now(),
  };

  return true;
}

// ===== Zero-sum pool helper =====
// All bets go into a pool. Winners split the pool by weight. Losers lose their bet.
function resolvePoolBetting(
  state: BettingState,
  players: Player[],
  getWinnerWeight: (playerId: string, bet: PlayerBet) => number,
): BetResult['playerResults'] {
  const playerResults: BetResult['playerResults'] = {};

  let pool = 0;
  let totalWeight = 0;
  const winnerWeights: Record<string, number> = {};

  for (const player of players) {
    const bet = state.playerBets[player.id];
    if (!bet) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }

    pool += bet.amount;
    const weight = getWinnerWeight(player.id, bet);

    if (weight > 0) {
      winnerWeights[player.id] = weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    // No winners - refund all bets
    for (const player of players) {
      if (!playerResults[player.id]) {
        playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      }
    }
    return playerResults;
  }

  // Distribute pool to winners by weight
  let distributed = 0;
  const winnerIds = Object.keys(winnerWeights);

  for (let i = 0; i < winnerIds.length; i++) {
    const playerId = winnerIds[i];
    const player = players.find((p: Player) => p.id === playerId)!;
    const bet = state.playerBets[playerId];

    let share: number;
    if (i === winnerIds.length - 1) {
      share = pool - distributed;
    } else {
      share = Math.floor((pool * winnerWeights[playerId]) / totalWeight);
    }
    distributed += share;

    const payout = share - bet.amount;
    player.chips += payout;
    playerResults[playerId] = { won: payout > 0, payout, newChips: player.chips };
  }

  // Losers
  for (const player of players) {
    if (playerResults[player.id]) continue;
    const bet = state.playerBets[player.id];
    if (!bet) {
      playerResults[player.id] = { won: false, payout: 0, newChips: player.chips };
      continue;
    }
    player.chips -= bet.amount;
    playerResults[player.id] = { won: false, payout: -bet.amount, newChips: player.chips };
  }

  return playerResults;
}

export function resolveBetting(state: BettingState, players: Player[]): BetResult {
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

  const playerResults = resolvePoolBetting(state, players, (_pid, bet) => {
    if (winningOptionId === '__triple__') return 0;
    return bet.optionId === winningOptionId ? 1 : 0;
  });

  return { winningOptionId, animationData, playerResults };
}

function resolveRouletteBet(state: BettingState, players: Player[]): BetResult {
  const { winningOptionId, animationData } = spinRoulette();

  const playerResults = resolvePoolBetting(state, players, (_pid, bet) => {
    return bet.optionId === winningOptionId ? 1 : 0;
  });

  return { winningOptionId, animationData, playerResults };
}

function resolveCoinMultiplyBet(state: BettingState, players: Player[]): BetResult {
  const flipResults: Record<string, { won: boolean; animationData: CoinAnimationData }> = {};
  let firstFlipData: CoinAnimationData | null = null;

  for (const [pid, bet] of Object.entries(state.playerBets)) {
    const times = bet.optionId === 'coin_1' ? 1 : bet.optionId === 'coin_2' ? 2 : 3;
    const { won, animationData } = flipCoins(times);
    flipResults[pid] = { won, animationData };
    if (!firstFlipData) firstFlipData = animationData;
  }

  const playerResults = resolvePoolBetting(state, players, (pid, bet) => {
    if (!flipResults[pid]?.won) return 0;
    return bet.optionId === 'coin_1' ? 2 : bet.optionId === 'coin_2' ? 4 : 8;
  });

  return {
    winningOptionId: 'coin_result',
    animationData: firstFlipData || { type: 'coin', flips: ['heads'] },
    playerResults,
  };
}

function resolveMysteryPickBet(state: BettingState, players: Player[]): BetResult {
  const boxes = generateMysteryBoxes();

  const boxPickers: Record<string, number> = {};
  for (const bet of Object.values(state.playerBets)) {
    boxPickers[bet.optionId] = (boxPickers[bet.optionId] || 0) + 1;
  }

  const playerResults = resolvePoolBetting(state, players, (_pid, bet) => {
    const box = boxes.find((b: { id: string; content: string; multiplier: number }) => b.id === bet.optionId);
    if (!box || box.multiplier === 0) return 0;
    return box.multiplier / (boxPickers[bet.optionId] || 1);
  });

  const animationData: MysteryAnimationData = {
    type: 'mystery',
    boxes,
    revealOrder: boxes.map((b: { id: string }) => b.id),
  };

  return { winningOptionId: 'mystery_result', animationData, playerResults };
}

function resolveDiceExactBet(state: BettingState, players: Player[]): BetResult {
  const dice = rollDice(2);
  const total = dice.reduce((a: number, b: number) => a + b, 0);
  const exactWinner = `exact_${total}`;
  const rangeWinner = getDiceExactRangeWinner(total);

  const animationData: DiceAnimationData = {
    type: 'dice',
    dice,
    total,
    isTriple: false,
  };

  const playerResults = resolvePoolBetting(state, players, (_pid, bet) => {
    const option = state.options.find((o: BetOption) => o.id === bet.optionId);
    if (!option) return 0;
    if (bet.optionId === exactWinner || bet.optionId === rangeWinner) {
      return option.odds;
    }
    return 0;
  });

  return { winningOptionId: exactWinner, animationData, playerResults };
}

function resolveGroupPredictBet(state: BettingState, players: Player[]): BetResult {
  const betsForPredict: Record<string, { optionId: string; amount: number }> = {};
  for (const [pid, bet] of Object.entries(state.playerBets)) {
    betsForPredict[pid] = { optionId: bet.optionId, amount: bet.amount };
  }

  const { animationData, bonusPlayers } = resolveGroupPredict(betsForPredict, players.length);

  const playerResults = resolvePoolBetting(state, players, (pid) => {
    return bonusPlayers.includes(pid) ? 1 : 0;
  });

  return {
    winningOptionId: 'predict_result',
    animationData,
    playerResults,
  };
}
