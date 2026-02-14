import type { Player, Room } from '@prize-battle/shared';
import { GAME_CONFIG } from '@prize-battle/shared';

const MAIN_ROOM_ID = 'MAIN';

const rooms = new Map<string, Room>();
const playerRoomMap = new Map<string, string>(); // socketId -> roomId

function getRandomAvatar(existingAvatars: string[]): string {
  const available = GAME_CONFIG.AVATARS.filter((a: string) => !existingAvatars.includes(a));
  return available[Math.floor(Math.random() * available.length)] || '🎮';
}

export function getOrCreateMainRoom(): Room {
  let room = rooms.get(MAIN_ROOM_ID);
  if (!room) {
    room = {
      id: MAIN_ROOM_ID,
      mode: 'game',
      players: [],
      maxPlayers: GAME_CONFIG.MAX_PLAYERS,
      status: 'waiting',
      gameState: null,
      createdAt: Date.now(),
    };
    rooms.set(MAIN_ROOM_ID, room);
  }
  return room;
}

export function joinMainRoom(socketId: string, playerName: string, buyIn: number): Room {
  const room = getOrCreateMainRoom();
  if (room.status !== 'waiting') throw new Error('遊戲已開始');
  if (room.players.length >= room.maxPlayers) throw new Error('房間已滿');
  if (room.players.some((p: Player) => p.name === playerName)) throw new Error('暱稱已被使用');

  const existingAvatars = room.players.map((p: Player) => p.avatar);
  const player: Player = {
    id: socketId,
    name: playerName,
    chips: buyIn,
    buyIn,
    isReady: false,
    isConnected: true,
    avatar: getRandomAvatar(existingAvatars),
  };

  room.players.push(player);
  playerRoomMap.set(socketId, room.id);
  return room;
}

export function setPlayerReady(socketId: string): Room | null {
  const roomId = playerRoomMap.get(socketId);
  if (!roomId) return null;
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p: Player) => p.id === socketId);
  if (player) player.isReady = true;
  return room;
}

export function setPlayerUnready(socketId: string): Room | null {
  const roomId = playerRoomMap.get(socketId);
  if (!roomId) return null;
  const room = rooms.get(roomId);
  if (!room || room.status !== 'waiting') return null;

  const player = room.players.find((p: Player) => p.id === socketId);
  if (player) player.isReady = false;
  return room;
}

export function isAllReady(room: Room): boolean {
  return room.players.length >= 2 && room.players.every((p: Player) => p.isReady);
}

export function handleDisconnect(socketId: string): Room | null {
  const roomId = playerRoomMap.get(socketId);
  if (!roomId) return null;
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p: Player) => p.id === socketId);
  if (player) {
    if (room.status === 'waiting') {
      // Remove player from waiting room (keep room alive)
      room.players = room.players.filter((p: Player) => p.id !== socketId);
    } else {
      // Mark as disconnected during game
      player.isConnected = false;
    }
  }

  playerRoomMap.delete(socketId);
  return room;
}

export function handleReconnect(socketId: string, playerName: string): { room: Room; oldId: string } | null {
  const room = rooms.get(MAIN_ROOM_ID);
  if (!room) return null;

  const player = room.players.find((p: Player) => p.name === playerName);
  if (!player) return null;

  const oldId = player.id;
  player.id = socketId;
  player.isConnected = true;
  playerRoomMap.delete(oldId);
  playerRoomMap.set(socketId, MAIN_ROOM_ID);
  return { room, oldId };
}

export function getMainRoom(): Room | undefined {
  return rooms.get(MAIN_ROOM_ID);
}

export function getRoomBySocketId(socketId: string): Room | undefined {
  const roomId = playerRoomMap.get(socketId);
  if (!roomId) return undefined;
  return rooms.get(roomId);
}

export function getPlayerRoomId(socketId: string): string | undefined {
  return playerRoomMap.get(socketId);
}

export function resetRoom(room: Room): void {
  room.status = 'waiting';
  room.gameState = null;
  // 移除已斷線玩家，避免鬼玩家卡住下局準備
  room.players = room.players.filter((p: Player) => p.isConnected);
  for (const player of room.players) {
    player.chips = player.buyIn;
    player.isReady = false;
  }
}
