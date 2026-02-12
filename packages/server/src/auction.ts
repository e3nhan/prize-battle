import type {
  AuctionBox,
  AuctionState,
  AuctionResult,
  Player,
  SpecialEffect,
} from '@prize-battle/shared';
import { generateAuctionBoxes, GAME_CONFIG } from '@prize-battle/shared';

export function createAuctionBoxes(): AuctionBox[] {
  return generateAuctionBoxes();
}

export function createAuctionState(
  roundNumber: number,
  box: AuctionBox,
  remainingBoxes: number,
): AuctionState {
  return {
    roundNumber,
    currentBox: {
      id: box.id,
      displayName: box.displayName,
      hint: box.hint,
    },
    timeLeft: GAME_CONFIG.AUCTION_TIME,
    playerBids: {},
    result: null,
    remainingBoxes,
  };
}

export function submitBid(
  state: AuctionState,
  playerId: string,
  amount: number,
  playerChips: number,
): boolean {
  if (state.playerBids[playerId] !== undefined) return false;
  if (state.timeLeft <= 0) return false;

  // 0 means skip
  if (amount === 0) {
    state.playerBids[playerId] = 0;
    return true;
  }

  if (amount < GAME_CONFIG.MIN_BID || amount > playerChips) return false;

  state.playerBids[playerId] = amount;
  return true;
}

export function resolveAuction(
  state: AuctionState,
  box: AuctionBox,
  players: Player[],
  playerShields: Set<string>,
): AuctionResult {
  const bids = Object.entries(state.playerBids)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a);

  let winnerId: string | null = null;
  let winningBid = 0;

  if (bids.length > 0) {
    // Check for tie at highest bid
    const highestBid = bids[0][1];
    const tiedBidders = bids.filter(([, amount]) => amount === highestBid);

    if (tiedBidders.length === 1) {
      winnerId = tiedBidders[0][0];
      winningBid = highestBid;
    }
    // Tied = no winner (流標)
  }

  const playerChipsAfter: Record<string, number> = {};
  let effectResult: string | undefined;

  if (winnerId) {
    const winner = players.find((p) => p.id === winnerId)!;
    winner.chips -= winningBid; // Pay bid amount

    // Apply box effect
    switch (box.type) {
      case 'diamond':
        winner.chips += Math.floor(winningBid * (1 + box.value)); // +200% = get back 3x
        effectResult = `恭喜！鑽石寶箱，獲得 ${Math.floor(winningBid * box.value)} 籌碼！`;
        break;
      case 'normal':
        winner.chips += Math.floor(winningBid * (1 + box.value));
        effectResult = `普通寶箱，獲得 ${Math.floor(winningBid * box.value)} 籌碼`;
        break;
      case 'bomb':
        if (playerShields.has(winnerId)) {
          winner.chips += winningBid; // Refund
          effectResult = '炸彈寶箱！但護盾保護了你！';
          playerShields.delete(winnerId);
        } else {
          // Already paid, lose 80% = only get back 20%
          winner.chips += Math.floor(winningBid * 0.2);
          effectResult = `炸彈寶箱！損失 ${Math.floor(winningBid * 0.8)} 籌碼！`;
        }
        break;
      case 'mystery':
        effectResult = applySpecialEffect(box.specialEffect!, winnerId, players, playerShields);
        break;
    }
  }

  // Ensure no negative chips
  for (const player of players) {
    if (player.chips < 0) player.chips = 0;
    playerChipsAfter[player.id] = player.chips;
  }

  return {
    winnerId,
    winningBid,
    box,
    effectResult,
    playerChipsAfter,
  };
}

function applySpecialEffect(
  effect: SpecialEffect,
  winnerId: string,
  players: Player[],
  playerShields: Set<string>,
): string {
  const winner = players.find((p) => p.id === winnerId)!;

  switch (effect.type) {
    case 'steal': {
      const richest = players
        .filter((p) => p.id !== winnerId)
        .sort((a, b) => b.chips - a.chips)[0];
      if (richest) {
        const stealAmount = Math.floor(richest.chips * effect.amount);
        richest.chips -= stealAmount;
        winner.chips += stealAmount;
        return `偷竊！從 ${richest.name} 偷走 ${stealAmount} 籌碼！`;
      }
      return '偷竊！但沒有目標...';
    }

    case 'swap': {
      const others = players.filter((p) => p.id !== winnerId);
      const target = others[Math.floor(Math.random() * others.length)];
      if (target) {
        const temp = winner.chips;
        winner.chips = target.chips;
        target.chips = temp;
        return `交換！與 ${target.name} 交換了全部籌碼！`;
      }
      return '交換！但沒有目標...';
    }

    case 'redistribute': {
      const total = players.reduce((sum, p) => sum + p.chips, 0);
      const avg = Math.floor(total / players.length);
      for (const p of players) {
        p.chips = avg;
      }
      return `平均重分配！所有人籌碼變為 ${avg}！`;
    }

    case 'double_or_nothing': {
      if (Math.random() < 0.5) {
        winner.chips *= 2;
        return `翻倍！籌碼變為 ${winner.chips}！`;
      } else {
        winner.chips = 0;
        return '歸零！所有籌碼消失了！';
      }
    }

    case 'shield': {
      playerShields.add(winnerId);
      return '獲得護盾！剩餘拍賣中免疫炸彈效果！';
    }
  }
}
