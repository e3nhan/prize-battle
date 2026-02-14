import type {
  Player,
  BetOption,
  BetType,
  BettingState,
  BoxType,
  AuctionBox,
  LeaderboardEntry,
  DiceAnimationData,
  RouletteAnimationData,
  CoinAnimationData,
  MysteryAnimationData,
  GroupPredictAnimationData,
} from './types.js';
import {
  GAME_CONFIG,
  DICE_ODDS,
  ROULETTE_SEGMENTS,
  BOX_HINTS,
  MISLEAD_RATE,
} from './constants.js';

// ===== 骰子猜大小 =====
export function getDiceHighLowOptions(): BetOption[] {
  return [
    { id: 'high', label: '大 (11-18)', odds: 1.0, description: '總和 11-18 獲勝' },
    { id: 'low', label: '小 (3-10)', odds: 1.0, description: '總和 3-10 獲勝' },
  ];
}

export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

export function resolveDiceHighLow(dice: number[]): { winningOptionId: string; animationData: DiceAnimationData } {
  const total = dice.reduce((a, b) => a + b, 0);
  const isTriple = dice.every((d) => d === dice[0]);

  return {
    winningOptionId: isTriple ? '__triple__' : total >= 11 ? 'high' : 'low',
    animationData: { type: 'dice', dice, total, isTriple },
  };
}

// ===== 輪盤 =====
export function getRouletteOptions(): BetOption[] {
  return ROULETTE_SEGMENTS.map((seg) => ({
    id: seg.id,
    label: seg.label,
    odds: seg.odds,
    description: `賠率 1:${seg.odds}`,
  }));
}

export function spinRoulette(): { winningOptionId: string; animationData: RouletteAnimationData } {
  const totalSegments = ROULETTE_SEGMENTS.length;
  const winningIndex = Math.floor(Math.random() * totalSegments);
  const segment = ROULETTE_SEGMENTS[winningIndex];
  const segmentAngle = 360 / totalSegments;
  const finalAngle = 360 * 5 + winningIndex * segmentAngle + segmentAngle / 2;

  return {
    winningOptionId: segment.id,
    animationData: { type: 'roulette', finalAngle, winningSegment: winningIndex },
  };
}

// ===== 硬幣翻倍 =====
export function getCoinMultiplyOptions(): BetOption[] {
  return [
    { id: 'coin_1', label: '挑戰 1 枚', odds: 0, description: '第 1 枚正面即贏，分配比重 2x' },
    { id: 'coin_2', label: '挑戰 2 枚', odds: 0, description: '前 2 枚皆正面才贏，分配比重 4x' },
    { id: 'coin_3', label: '挑戰 3 枚', odds: 0, description: '3 枚皆正面才贏，分配比重 8x' },
  ];
}

export function flipCoins(times: number): { won: boolean; flips: ('heads' | 'tails')[]; animationData: CoinAnimationData } {
  const flips: ('heads' | 'tails')[] = [];
  let won = true;

  for (let i = 0; i < times; i++) {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    flips.push(result);
    if (result === 'tails') {
      won = false;
    }
  }

  return { won, flips, animationData: { type: 'coin', flips } };
}

// ===== 神秘箱選擇 =====
export function getMysteryPickOptions(): BetOption[] {
  return [
    { id: 'box_1', label: '箱子 A', odds: 0, description: '選擇箱子 A' },
    { id: 'box_2', label: '箱子 B', odds: 0, description: '選擇箱子 B' },
    { id: 'box_3', label: '箱子 C', odds: 0, description: '選擇箱子 C' },
    { id: 'box_4', label: '箱子 D', odds: 0, description: '選擇箱子 D' },
    { id: 'box_5', label: '箱子 E', odds: 0, description: '選擇箱子 E' },
  ];
}

export function generateMysteryBoxes(): { id: string; content: string; multiplier: number }[] {
  const contents = [
    { content: '大獎 💎', multiplier: 3.0 },
    { content: '小獎 🎁', multiplier: 1.5 },
    { content: '小獎 🎁', multiplier: 1.5 },
    { content: '空箱 📭', multiplier: 1.0 },
    { content: '炸彈 💣', multiplier: 0 },
  ];

  // Shuffle
  for (let i = contents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [contents[i], contents[j]] = [contents[j], contents[i]];
  }

  return contents.map((c, i) => ({
    id: `box_${i + 1}`,
    ...c,
  }));
}

// ===== 骰子猜點數 =====
export function getDiceExactOptions(): BetOption[] {
  const options: BetOption[] = [];

  // 精確數字
  for (let i = 2; i <= 12; i++) {
    const key = `exact_${i}` as keyof typeof DICE_ODDS;
    options.push({
      id: `exact_${i}`,
      label: `精確 ${i}`,
      odds: DICE_ODDS[key],
      description: `猜中精確數字 ${i}，賠率 1:${DICE_ODDS[key]}`,
    });
  }

  // 範圍
  options.push(
    { id: 'range_low', label: '範圍 2-5', odds: DICE_ODDS.range_low, description: '賠率 1:2' },
    { id: 'range_mid', label: '範圍 6-8', odds: DICE_ODDS.range_mid, description: '賠率 1:2' },
    { id: 'range_high', label: '範圍 9-12', odds: DICE_ODDS.range_high, description: '賠率 1:2' },
  );

  return options;
}

export function resolveDiceExact(dice: number[]): string {
  const total = dice.reduce((a, b) => a + b, 0);
  return `exact_${total}`;
}

export function getDiceExactRangeWinner(total: number): string | null {
  if (total >= 2 && total <= 5) return 'range_low';
  if (total >= 6 && total <= 8) return 'range_mid';
  if (total >= 9 && total <= 12) return 'range_high';
  return null;
}

// ===== 群體預測 =====
export function getGroupPredictOptions(playerCount: number): BetOption[] {
  const options: BetOption[] = [
    { id: 'choice_A', label: '選擇 A', odds: 0, description: '選擇 A 陣營' },
    { id: 'choice_B', label: '選擇 B', odds: 0, description: '選擇 B 陣營' },
  ];

  for (let i = 0; i <= playerCount; i++) {
    options.push({
      id: `predict_${i}`,
      label: `預測 ${i} 人選 A`,
      odds: 0,
      description: `你認為會有 ${i} 人選 A`,
    });
  }

  return options;
}

export function resolveGroupPredict(
  playerBets: Record<string, { optionId: string; choiceId?: string; amount: number }>,
  playerCount: number,
): { animationData: GroupPredictAnimationData; bonusPlayers: string[] } {
  let choiceA = 0;
  let choiceB = 0;
  const predictions: Record<string, number> = {};

  for (const [playerId, bet] of Object.entries(playerBets)) {
    // choiceId 記錄 A/B 選擇（server 端已強制驗證必須存在）
    const choice = bet.choiceId;
    if (choice === 'choice_A') choiceA++;
    else if (choice === 'choice_B') choiceB++;

    // optionId 為 predict_N 時記錄預測人數
    const predMatch = bet.optionId.match(/predict_(\d+)/);
    if (predMatch) {
      predictions[playerId] = parseInt(predMatch[1]);
    }
  }

  // Find closest predictors
  const actualA = choiceA;
  const diffs = Object.entries(predictions).map(([id, pred]) => ({
    id,
    diff: Math.abs(pred - actualA),
  }));
  diffs.sort((a, b) => a.diff - b.diff);
  const bonusPlayers = diffs.slice(0, 3).filter((d) => d.diff <= 2).map((d) => d.id);

  return {
    animationData: {
      type: 'group_predict',
      choiceA_count: choiceA,
      choiceB_count: choiceB,
      predictions,
      closestPlayers: bonusPlayers,
    },
    bonusPlayers,
  };
}

// ===== 拍賣箱生成 =====
export function generateAuctionBoxes(): AuctionBox[] {
  const boxes: AuctionBox[] = [];
  const types: BoxType[] = [];

  // 按分配數量生成
  const dist = GAME_CONFIG.BOX_DISTRIBUTION;
  for (let i = 0; i < dist.diamond; i++) types.push('diamond');
  for (let i = 0; i < dist.normal; i++) types.push('normal');
  for (let i = 0; i < dist.bomb; i++) types.push('bomb');
  for (let i = 0; i < dist.mystery; i++) types.push('mystery');

  // Shuffle
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  const specialEffects: Array<{ type: 'steal'; amount: number } | { type: 'swap' } | { type: 'redistribute' } | { type: 'double_or_nothing' } | { type: 'shield' }> = [
    { type: 'steal', amount: 0.2 },
    { type: 'swap' },
    { type: 'redistribute' },
    { type: 'double_or_nothing' },
    { type: 'shield' },
  ];

  for (let i = 0; i < types.length; i++) {
    const boxType = types[i];
    let value = 0;

    switch (boxType) {
      case 'diamond':
        value = 2.0; // +200% of winning bid
        break;
      case 'normal':
        value = 0.3 + Math.random() * 0.3; // +30%~60%
        break;
      case 'bomb':
        value = -0.8; // -80%
        break;
      case 'mystery':
        value = 0;
        break;
    }

    // Get hint (with possible mislead)
    const isMislead = Math.random() < MISLEAD_RATE;
    let hintType = boxType;
    if (isMislead) {
      const otherTypes = (['diamond', 'normal', 'bomb', 'mystery'] as BoxType[]).filter((t) => t !== boxType);
      hintType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
    }
    const hints = BOX_HINTS[hintType];
    const hint = hints[Math.floor(Math.random() * hints.length)];

    boxes.push({
      id: `box_${i + 1}`,
      displayName: `寶箱 #${i + 1}`,
      hint,
      type: boxType,
      value,
      specialEffect: boxType === 'mystery'
        ? specialEffects[Math.floor(Math.random() * specialEffects.length)]
        : undefined,
    });
  }

  return boxes;
}

// ===== 排行榜計算 =====
export function calculateLeaderboard(players: Player[], totalPrizePool: number): LeaderboardEntry[] {
  const sorted = [...players].sort((a, b) => b.chips - a.chips);
  const totalChips = players.reduce((sum, p) => sum + p.chips, 0);

  return sorted.map((player, index) => ({
    playerId: player.id,
    playerName: player.name,
    chips: player.chips,
    rank: index + 1,
    prize: totalChips > 0
      ? Math.round((player.chips / totalChips) * totalPrizePool)
      : Math.round(totalPrizePool / players.length),
  }));
}

// ===== 工具函式 =====
export function getMinBet(currentChips: number): number {
  return Math.max(1, Math.floor(currentChips * GAME_CONFIG.MIN_BET_RATIO));
}

export function getBettingOptions(type: BetType, playerCount?: number): BetOption[] {
  switch (type) {
    case 'dice_high_low':
      return getDiceHighLowOptions();
    case 'roulette':
      return getRouletteOptions();
    case 'coin_multiply':
      return getCoinMultiplyOptions();
    case 'mystery_pick':
      return getMysteryPickOptions();
    case 'dice_exact':
      return getDiceExactOptions();
    case 'group_predict':
      return getGroupPredictOptions(playerCount || 8);
  }
}

export function getBetTypeTitle(type: BetType): string {
  switch (type) {
    case 'dice_high_low':
      return '🎲 骰子猜大小';
    case 'roulette':
      return '🎡 數字輪盤';
    case 'coin_multiply':
      return '🪙 硬幣翻倍挑戰';
    case 'mystery_pick':
      return '📦 神秘箱選擇';
    case 'dice_exact':
      return '🎯 骰子猜點數';
    case 'group_predict':
      return '🤔 群體預測';
  }
}

export function getBetTypeDescription(type: BetType): string {
  switch (type) {
    case 'dice_high_low':
      return '3 顆骰子，猜總和大（11-18）或小（3-10）。猜對保本，並瓜分猜錯者的下注額。豹子出現則全額退回。';
    case 'roulette':
      return '8 格轉盤，選一格下注。猜中保本，並瓜分其他人的下注額。押冷門贏了賺更多！';
    case 'coin_multiply':
      return '丟 3 枚硬幣，選擇挑戰次數：1 次只看第 1 枚、2 次看前 2 枚、3 次看全部。必須全部正面才算贏，贏家保本並按比重瓜分輸家下注額。';
    case 'mystery_pick':
      return '5 個神秘寶盒藏有不同倍率（0x～3x）。選同一盒的人共享該倍率，選到炸彈（0x）則血本無歸！';
    case 'dice_exact':
      return '2 顆骰子，猜確切點數或範圍（2-5/6-8/9-12）。猜中保本，並按賠率權重瓜分猜錯者的下注額。點數越難猜，分到的比例越高。';
    case 'group_predict':
      return '每人先選 A 或 B 陣營，再預測總共有幾人選 A。預測最接近的前 3 名（誤差 ≤2）保本並瓜分其餘人的下注額！';
  }
}
