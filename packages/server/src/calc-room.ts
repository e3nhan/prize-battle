import type { Room, Player, CalculatorState, ChipTransaction } from '@prize-battle/shared';
import { GAME_CONFIG, CALC_CONFIG } from '@prize-battle/shared';

const CALC_ROOM_ID = 'CALC_MAIN';

let calcRoom: Room | null = null;
let calcState: CalculatorState = { transactions: [] };
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

  // 轉帳：從自己扣，給對方加
  from.chips -= amount;
  target.chips += amount;

  const tx: ChipTransaction = {
    id: String(++txCounter),
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

export function resetCalcRoom(): { room: Room; state: CalculatorState } {
  const room = getOrCreateCalcRoom();
  room.players = room.players.filter((p: Player) => p.isConnected);
  for (const player of room.players) {
    player.chips = 0;
  }
  calcState = { transactions: [] };
  txCounter = 0;
  return { room, state: calcState };
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
