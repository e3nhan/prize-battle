import type { Room, Player, CalculatorState, ChipTransaction, CalcBetRound } from '@prize-battle/shared';
import { GAME_CONFIG, CALC_CONFIG } from '@prize-battle/shared';

const CALC_ROOM_ID = 'CALC_MAIN';

let calcRoom: Room | null = null;
let calcState: CalculatorState = { transactions: [], currentBetRound: null };
const calcPlayerMap = new Map<string, string>(); // socketId -> roomId
let txCounter = 0;

function getRandomAvatar(existingAvatars: string[]): string {
  const available = GAME_CONFIG.AVATARS.filter((a: string) => !existingAvatars.includes(a));
  return available[Math.floor(Math.random() * available.length)] || '🎮';
}

export function getOrCreateCalcRoom(): Room {
  if (!calcRoom) {
    calcRoom = {
      id: CALC_ROOM_ID,
      mode: 'calculator',
      players: [],
      maxPlayers: CALC_CONFIG.MAX_PLAYERS,
      status: 'waiting',
      gameState: null,
      createdAt: Date.now(),
    };
  }
  return calcRoom;
}

export function joinCalcRoom(
  socketId: string,
  playerName: string,
  initialChips: number,
): { room: Room; state: CalculatorState } {
  const room = getOrCreateCalcRoom();
  if (room.players.length >= room.maxPlayers) throw new Error('房間已滿');
  if (room.players.some((p: Player) => p.name === playerName)) throw new Error('暱稱已被使用');

  const existingAvatars = room.players.map((p: Player) => p.avatar);
  const player: Player = {
    id: socketId,
    name: playerName,
    chips: initialChips,
    buyIn: initialChips,
    isReady: false,
    isConnected: true,
    avatar: getRandomAvatar(existingAvatars),
  };

  room.players.push(player);
  calcPlayerMap.set(socketId, room.id);

  // 第一個加入的人是房主
  if (!room.hostId) {
    room.hostId = socketId;
  }

  return { room, state: calcState };
}

export function adjustPlayerChips(
  fromSocketId: string,
  targetPlayerId: string,
  amount: number,
  note?: string,
): { tx: ChipTransaction; room: Room } | null {
  if (!calcRoom) return null;
  if (!calcPlayerMap.has(fromSocketId)) return null;
  if (amount <= 0) return null;

  const from = calcRoom.players.find((p: Player) => p.id === fromSocketId);
  const target = calcRoom.players.find((p: Player) => p.id === targetPlayerId);
  if (!from || !target) return null;
  if (fromSocketId === targetPlayerId) return null;

  // 餘額檢查：不能轉超過自身籌碼
  if (from.chips < amount) return null;

  // 轉帳：從自己扣，給對方加
  from.chips -= amount;
  target.chips += amount;

  const tx: ChipTransaction = {
    id: String(++txCounter),
    type: 'transfer',
    fromPlayerId: fromSocketId,
    targetPlayerId,
    amount,
    fromNewBalance: from.chips,
    toNewBalance: target.chips,
    timestamp: Date.now(),
    note,
  };

  calcState.transactions.push(tx);
  if (calcState.transactions.length > CALC_CONFIG.MAX_TRANSACTIONS) {
    calcState.transactions = calcState.transactions.slice(-CALC_CONFIG.MAX_TRANSACTIONS);
  }

  return { tx, room: calcRoom };
}

export function topUpChips(
  socketId: string,
  amount: number,
): { tx: ChipTransaction; room: Room } | null {
  if (!calcRoom) return null;
  if (!calcPlayerMap.has(socketId)) return null;
  if (amount <= 0) return null;

  const player = calcRoom.players.find((p: Player) => p.id === socketId);
  if (!player) return null;

  player.chips += amount;

  const tx: ChipTransaction = {
    id: String(++txCounter),
    type: 'topup',
    fromPlayerId: socketId,
    targetPlayerId: socketId,
    amount,
    fromNewBalance: player.chips,
    toNewBalance: player.chips,
    timestamp: Date.now(),
  };

  calcState.transactions.push(tx);
  if (calcState.transactions.length > CALC_CONFIG.MAX_TRANSACTIONS) {
    calcState.transactions = calcState.transactions.slice(-CALC_CONFIG.MAX_TRANSACTIONS);
  }

  return { tx, room: calcRoom };
}

// ===== 投注功能 =====
let betRoundCounter = 0;

export function startCalcBetRound(): CalcBetRound | null {
  if (!calcRoom) return null;
  if (calcState.currentBetRound) return null; // 已有進行中的投注

  const round: CalcBetRound = {
    id: String(++betRoundCounter),
    status: 'betting',
    bets: {},
    lockedPlayers: [],
  };
  calcState.currentBetRound = round;
  return round;
}

export function placeCalcBet(socketId: string, amount: number): CalcBetRound | null {
  if (!calcRoom || !calcState.currentBetRound) return null;
  if (calcState.currentBetRound.status !== 'betting') return null;
  if (!calcPlayerMap.has(socketId)) return null;
  if (amount <= 0) return null;

  // 餘額檢查：不能下注超過自身籌碼
  const player = calcRoom.players.find((p: Player) => p.id === socketId);
  if (!player || player.chips <= 0 || amount > player.chips) return null;

  // 不能已鎖定後再改
  if (calcState.currentBetRound.lockedPlayers.includes(socketId)) return null;

  calcState.currentBetRound.bets[socketId] = amount;
  return calcState.currentBetRound;
}

export function lockCalcBet(socketId: string): CalcBetRound | null {
  if (!calcRoom || !calcState.currentBetRound) return null;
  if (calcState.currentBetRound.status !== 'betting') return null;
  if (!calcState.currentBetRound.bets[socketId]) return null;
  if (calcState.currentBetRound.lockedPlayers.includes(socketId)) return null;

  calcState.currentBetRound.lockedPlayers.push(socketId);

  // 所有已下注的人都鎖定了 → status='locked'
  const bettors = Object.keys(calcState.currentBetRound.bets);
  if (bettors.every((id) => calcState.currentBetRound!.lockedPlayers.includes(id))) {
    calcState.currentBetRound.status = 'locked';
  }

  return calcState.currentBetRound;
}

export function resolveCalcBet(
  winnerIds: string[],
  multiplier: number,
): { transactions: ChipTransaction[]; room: Room } | null {
  if (!calcRoom || !calcState.currentBetRound) return null;
  if (calcState.currentBetRound.status !== 'locked') return null;
  if (winnerIds.length === 0) return null;
  if (![1, 2, 3].includes(multiplier)) return null;

  const round = calcState.currentBetRound;
  const pot = Object.values(round.bets).reduce((sum, v) => sum + v, 0);
  const winPerPerson = Math.floor((pot * multiplier) / winnerIds.length);
  const newTxs: ChipTransaction[] = [];
  const now = Date.now();

  // 處理每位參與者
  for (const [playerId, betAmount] of Object.entries(round.bets)) {
    const player = calcRoom.players.find((p: Player) => p.id === playerId);
    if (!player) continue;

    const isWinner = winnerIds.includes(playerId);

    if (isWinner) {
      const net = winPerPerson - betAmount;
      player.chips += net;
      newTxs.push({
        id: String(++txCounter),
        type: 'bet_win',
        fromPlayerId: playerId,
        targetPlayerId: playerId,
        amount: winPerPerson,
        fromNewBalance: player.chips,
        toNewBalance: player.chips,
        timestamp: now,
        note: `投注贏 (下注${betAmount}, 獲得${winPerPerson})`,
      });
    } else {
      player.chips -= betAmount;
      newTxs.push({
        id: String(++txCounter),
        type: 'bet_lose',
        fromPlayerId: playerId,
        targetPlayerId: playerId,
        amount: betAmount,
        fromNewBalance: player.chips,
        toNewBalance: player.chips,
        timestamp: now,
        note: `投注輸 (下注${betAmount})`,
      });
    }
  }

  calcState.transactions.push(...newTxs);
  if (calcState.transactions.length > CALC_CONFIG.MAX_TRANSACTIONS) {
    calcState.transactions = calcState.transactions.slice(-CALC_CONFIG.MAX_TRANSACTIONS);
  }

  calcState.currentBetRound = null;
  return { transactions: newTxs, room: calcRoom };
}

export function cancelCalcBetRound(): boolean {
  if (!calcState.currentBetRound) return false;
  calcState.currentBetRound = null;
  return true;
}

export function handleCalcDisconnect(socketId: string): Room | null {
  if (!calcPlayerMap.has(socketId)) return null;
  calcPlayerMap.delete(socketId);

  if (!calcRoom) return null;

  const player = calcRoom.players.find((p: Player) => p.id === socketId);
  if (player) {
    player.isConnected = false;
  }

  return calcRoom;
}

export function resetCalcRoom(socketId: string): { room: Room; state: CalculatorState } | null {
  if (!calcRoom) return null;
  if (calcRoom.hostId !== socketId) return null;

  // 完全重置：清除所有玩家和狀態
  calcRoom.players = [];
  calcRoom.hostId = undefined;
  calcPlayerMap.clear();
  calcState = { transactions: [], currentBetRound: null };
  txCounter = 0;
  betRoundCounter = 0;
  return { room: calcRoom, state: calcState };
}

export function getCalcRoom(): Room | undefined {
  return calcRoom ?? undefined;
}

export function getCalcState(): CalculatorState {
  return calcState;
}

export function isCalcPlayer(socketId: string): boolean {
  return calcPlayerMap.has(socketId);
}

export function handleCalcReconnect(
  socketId: string,
  playerName: string,
): { room: Room; state: CalculatorState } | null {
  if (!calcRoom) return null;

  const player = calcRoom.players.find((p: Player) => p.name === playerName);
  if (!player) return null;

  const oldId = player.id;
  player.id = socketId;
  player.isConnected = true;
  calcPlayerMap.set(socketId, CALC_ROOM_ID);

  // 房主重連時更新 hostId
  if (calcRoom.hostId === oldId) {
    calcRoom.hostId = socketId;
  }

  return { room: calcRoom, state: calcState };
}
