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
    minBetRatio: GAME_CONFIG.MIN_BET_RATIO,
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

  const minBetRatio = state.minBetRatio ?? GAME_CONFIG.MIN_BET_RATIO;
  const minBet = Math.ceil(playerChips * minBetRatio);
  if (amount < minBet || amount > playerChips) return false;

  const option = state.options.find((o: BetOption) => o.id === optionId);
  if (!option) return false;

  // group_predict 強制驗證：必須同時有 choiceId (A/B) 和 predict_N optionId
  if (state.type === 'group_predict') {
    if (!choiceId) return false;
    if (!optionId.startsWith('predict_')) return false;
    const choiceOption = state.options.find((o: BetOption) => o.id === choiceId);
    if (!choiceOption || !choiceId.startsWith('choice_')) return false;
    // 強制金額為 minBet，避免不同金額造成 pool 不公平
    amount = minBet;
  } else if (choiceId) {
    // 非 group_predict 不應有 choiceId
    return false;
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
    playerResults[playerId] = { won: true, payout, newChips: player.chips };
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
  let result: BetResult;
  switch (state.type) {
    case 'dice_high_low':
      result = resolveDiceHighLowBet(state, players); break;
    case 'roulette':
      result = resolveRouletteBet(state, players); break;
    case 'coin_multiply':
      result = resolveCoinMultiplyBet(state, players); break;
    case 'mystery_pick':
      result = resolveMysteryPickBet(state, players); break;
    case 'dice_exact':
      result = resolveDiceExactBet(state, players); break;
    case 'group_predict':
      result = resolveGroupPredictBet(state, players); break;
  }
  // 套用輪次事件效果
  if (state.roundEvent) {
    applyRoundEvent(state, players, result);
  }
  // 附上每個人的下注資訊，供 display 結果畫面顯示
  result.playerBets = { ...state.playerBets };
  return result;
}

function applyRoundEvent(state: BettingState, players: Player[], result: BetResult): void {
  const event = state.roundEvent!;
  const bettorIds = Object.keys(state.playerBets);
  if (bettorIds.length === 0) return;

  switch (event.type) {
    case 'golden_round': {
      // 贏家額外再獲得一份 payout（系統注入，非零和）
      for (const id of bettorIds) {
        const r = result.playerResults[id];
        if (!r || r.payout <= 0) continue;
        const player = players.find((p: Player) => p.id === id);
        if (!player) continue;
        player.chips += r.payout;
        result.playerResults[id] = { ...r, payout: r.payout * 2, newChips: player.chips };
      }
      break;
    }

    case 'high_stakes':
      // 只影響下注門檻，解算邏輯不變
      break;

    case 'reverse': {
      const winners = bettorIds.filter((id) => (result.playerResults[id]?.payout ?? 0) > 0);
      const losers = bettorIds.filter((id) => (result.playerResults[id]?.payout ?? 0) < 0);
      if (winners.length === 0 || losers.length === 0) break;

      const pool = bettorIds.reduce((s, id) => s + state.playerBets[id].amount, 0);

      // 撤銷原本的籌碼變動
      for (const id of bettorIds) {
        const player = players.find((p: Player) => p.id === id);
        if (!player) continue;
        player.chips -= (result.playerResults[id]?.payout ?? 0);
      }
      // 原贏家改為輸（扣下注金額）
      for (const id of winners) {
        const player = players.find((p: Player) => p.id === id)!;
        const betAmount = state.playerBets[id].amount;
        player.chips -= betAmount;
        result.playerResults[id] = { won: false, payout: -betAmount, newChips: player.chips };
      }
      // 原輸家改為贏（平分彩池）
      const loserShare = Math.floor(pool / losers.length);
      for (let i = 0; i < losers.length; i++) {
        const id = losers[i];
        const player = players.find((p: Player) => p.id === id)!;
        const betAmount = state.playerBets[id].amount;
        const thisShare = i === losers.length - 1 ? pool - loserShare * (losers.length - 1) : loserShare;
        const payout = thisShare - betAmount;
        player.chips += payout;
        result.playerResults[id] = { won: payout > 0, payout, newChips: player.chips };
      }
      break;
    }

    case 'equal_share': {
      const pool = bettorIds.reduce((s, id) => s + state.playerBets[id].amount, 0);
      // 撤銷原本的籌碼變動
      for (const id of bettorIds) {
        const player = players.find((p: Player) => p.id === id);
        if (!player) continue;
        player.chips -= (result.playerResults[id]?.payout ?? 0);
      }
      // 平均分配彩池
      const share = Math.floor(pool / bettorIds.length);
      for (let i = 0; i < bettorIds.length; i++) {
        const id = bettorIds[i];
        const player = players.find((p: Player) => p.id === id)!;
        const betAmount = state.playerBets[id].amount;
        const thisShare = i === bettorIds.length - 1 ? pool - share * (bettorIds.length - 1) : share;
        const payout = thisShare - betAmount;
        player.chips += payout;
        result.playerResults[id] = { won: payout >= 0, payout, newChips: player.chips };
      }
      break;
    }
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
  // 丟一組共用的 3 枚硬幣，所有玩家看同一結果
  const { flips, animationData } = flipCoins(3);

  const playerResults = resolvePoolBetting(state, players, (_pid, bet) => {
    const times = bet.optionId === 'coin_1' ? 1 : bet.optionId === 'coin_2' ? 2 : 3;
    // 只看前 N 枚硬幣是否全部正面
    const won = flips.slice(0, times).every((f) => f === 'heads');
    if (!won) return 0;
    return times === 1 ? 2 : times === 2 ? 4 : 8;
  });

  return {
    winningOptionId: 'coin_result',
    animationData,
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
  const betsForPredict: Record<string, { optionId: string; choiceId?: string; amount: number }> = {};
  for (const [pid, bet] of Object.entries(state.playerBets)) {
    betsForPredict[pid] = { optionId: bet.optionId, choiceId: bet.choiceId, amount: bet.amount };
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
