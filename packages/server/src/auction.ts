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

  if (amount === 0) {
    state.playerBids[playerId] = 0;
    return true;
  }

  if (amount < GAME_CONFIG.MIN_BID || amount > playerChips) return false;

  state.playerBids[playerId] = amount;
  return true;
}

// Zero-sum helper: transfer chips from sources to target, capped at each source's chips
function transferChips(
  target: Player,
  sources: Player[],
  totalAmount: number,
): void {
  if (sources.length === 0 || totalAmount <= 0) return;
  const perPlayer = Math.floor(totalAmount / sources.length);
  let remainder = totalAmount - perPlayer * sources.length;

  for (const source of sources) {
    let take = perPlayer + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    take = Math.min(take, source.chips);
    source.chips -= take;
    target.chips += take;
  }
}

// Zero-sum helper: transfer chips from source to destinations
function distributeChips(
  source: Player,
  destinations: Player[],
  totalAmount: number,
): void {
  if (destinations.length === 0 || totalAmount <= 0) return;
  const actual = Math.min(totalAmount, source.chips);
  const perPlayer = Math.floor(actual / destinations.length);
  let remainder = actual - perPlayer * destinations.length;

  source.chips -= actual;
  for (const dest of destinations) {
    const give = perPlayer + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    dest.chips += give;
  }
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
    const highestBid = bids[0][1];
    const tiedBidders = bids.filter(([, amount]) => amount === highestBid);

    if (tiedBidders.length === 1) {
      winnerId = tiedBidders[0][0];
      winningBid = highestBid;
    }
  }

  const playerChipsAfter: Record<string, number> = {};
  let effectResult: string | undefined;

  if (winnerId) {
    const winner = players.find((p: Player) => p.id === winnerId)!;
    const others = players.filter((p: Player) => p.id !== winnerId);

    switch (box.type) {
      case 'diamond': {
        const transferAmount = Math.floor(winningBid * box.value);
        transferChips(winner, others, transferAmount);
        effectResult = `恭喜！鑽石寶箱，從其他玩家獲得 ${transferAmount} 籌碼！`;
        break;
      }
      case 'normal': {
        const transferAmount = Math.floor(winningBid * box.value);
        transferChips(winner, others, transferAmount);
        effectResult = `普通寶箱，從其他玩家獲得 ${transferAmount} 籌碼`;
        break;
      }
      case 'bomb': {
        if (playerShields.has(winnerId)) {
          effectResult = '炸彈寶箱！但護盾保護了你！';
          playerShields.delete(winnerId);
        } else {
          const penalty = Math.floor(winningBid * 0.8);
          distributeChips(winner, others, penalty);
          effectResult = `炸彈寶箱！損失 ${penalty} 籌碼給其他玩家！`;
        }
        break;
      }
      case 'mystery': {
        effectResult = applySpecialEffect(box.specialEffect!, winnerId, winningBid, players, playerShields);
        break;
      }
    }
  }

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
  winningBid: number,
  players: Player[],
  playerShields: Set<string>,
): string {
  const winner = players.find((p: Player) => p.id === winnerId)!;
  const others = players.filter((p: Player) => p.id !== winnerId);

  switch (effect.type) {
    case 'steal': {
      const richest = others.sort((a: Player, b: Player) => b.chips - a.chips)[0];
      if (richest) {
        const stealAmount = Math.floor(richest.chips * effect.amount);
        richest.chips -= stealAmount;
        winner.chips += stealAmount;
        return `偷竊！從 ${richest.name} 偷走 ${stealAmount} 籌碼！`;
      }
      return '偷竊！但沒有目標...';
    }

    case 'swap': {
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
      const total = players.reduce((sum: number, p: Player) => sum + p.chips, 0);
      const avg = Math.floor(total / players.length);
      const remainder = total - avg * players.length;
      for (let i = 0; i < players.length; i++) {
        players[i].chips = avg + (i < remainder ? 1 : 0);
      }
      return `平均重分配！所有人籌碼變為 ${avg}！`;
    }

    case 'double_or_nothing': {
      const transferAmount = Math.floor(winningBid * 1.5);
      if (Math.random() < 0.5) {
        transferChips(winner, others, transferAmount);
        return `大獎！從其他玩家獲得 ${transferAmount} 籌碼！`;
      } else {
        distributeChips(winner, others, transferAmount);
        return `慘！損失 ${transferAmount} 籌碼給其他玩家！`;
      }
    }

    case 'shield': {
      playerShields.add(winnerId);
      return '獲得護盾！剩餘拍賣中免疫炸彈效果！';
    }
  }
}
