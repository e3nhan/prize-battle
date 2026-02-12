import type { Player, Room } from '@prize-battle/shared';
import { GAME_CONFIG, ROOM_CODE_LENGTH, ROOM_CODE_CHARS } from '@prize-battle/shared';

const rooms = new Map<string, Room>();
const playerRoomMap = new Map<string, string>(); // socketId -> roomId

function generateRoomCode(): string {
  let code: string;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function getRandomAvatar(existingAvatars: string[]): string {
  const available = GAME_CONFIG.AVATARS.filter((a) => !existingAvatars.includes(a));
  return available[Math.floor(Math.random() * available.length)] || '🎮';
}

export function createRoom(socketId: string, playerName: string): Room {
  const roomId = generateRoomCode();
  const existingAvatars: string[] = [];
  const player: Player = {
    id: socketId,
    name: playerName,
    chips: GAME_CONFIG.INITIAL_CHIPS,
    isReady: false,
    isConnected: true,
    avatar: getRandomAvatar(existingAvatars),
  };

  const room: Room = {
    id: roomId,
    players: [player],
    maxPlayers: GAME_CONFIG.MAX_PLAYERS,
    status: 'waiting',
    gameState: null,
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);
  playerRoomMap.set(socketId, roomId);
  return room;
}

export function joinRoom(roomId: string, socketId: string, playerName: string): Room {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) throw new Error('房間不存在');
  if (room.status !== 'waiting') throw new Error('遊戲已開始');
  if (room.players.length >= room.maxPlayers) throw new Error('房間已滿');
  if (room.players.some((p) => p.name === playerName)) throw new Error('暱稱已被使用');

  const existingAvatars = room.players.map((p) => p.avatar);
  const player: Player = {
    id: socketId,
    name: playerName,
    chips: GAME_CONFIG.INITIAL_CHIPS,
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

  const player = room.players.find((p) => p.id === socketId);
  if (player) player.isReady = true;
  return room;
}

export function isAllReady(room: Room): boolean {
  return room.players.length >= 2 && room.players.every((p) => p.isReady);
}

export function handleDisconnect(socketId: string): Room | null {
  const roomId = playerRoomMap.get(socketId);
  if (!roomId) return null;
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === socketId);
  if (player) {
    if (room.status === 'waiting') {
      // Remove player from waiting room
      room.players = room.players.filter((p) => p.id !== socketId);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      }
    } else {
      // Mark as disconnected during game
      player.isConnected = false;
    }
  }

  playerRoomMap.delete(socketId);
  return room;
}

export function handleReconnect(socketId: string, roomId: string, playerName: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.name === playerName);
  if (player) {
    player.id = socketId;
    player.isConnected = true;
    playerRoomMap.set(socketId, roomId);
  }
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId.toUpperCase());
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
  for (const player of room.players) {
    player.chips = GAME_CONFIG.INITIAL_CHIPS;
    player.isReady = false;
  }
}
