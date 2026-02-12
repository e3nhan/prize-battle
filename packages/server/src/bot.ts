import type { Server } from 'socket.io';
import type { Room, Player } from '@prize-battle/shared';
import { GAME_CONFIG, getMinBet } from '@prize-battle/shared';
import type { ServerToClientEvents, ClientToServerEvents } from '@prize-battle/shared';
import { getOrCreateMainRoom } from './room.js';
import { handlePlaceBet, handleSubmitBid } from './game-engine.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

const BOT_PREFIX = 'bot_';
const BOT_NAMES = ['電腦1', '電腦2', '電腦3', '電腦4', '電腦5', '電腦6', '電腦7'];
const BOT_AVATARS = ['🤖', '👾', '🎮', '🕹️', '💻', '📟', '🧠'];

export function isBot(playerId: string): boolean {
  return playerId.startsWith(BOT_PREFIX);
}

export function addBots(count: number): Room {
  const room = getOrCreateMainRoom();
  if (room.status !== 'waiting') throw new Error('遊戲已開始，無法新增電腦玩家');

  const currentBotCount = room.players.filter((p) => isBot(p.id)).length;
  const available = room.maxPlayers - room.players.length;
  const toAdd = Math.min(count, available);

  for (let i = 0; i < toAdd; i++) {
    const index = currentBotCount + i;
    const bot: Player = {
      id: `${BOT_PREFIX}${index + 1}`,
      name: BOT_NAMES[index] || `電腦${index + 1}`,
      chips: GAME_CONFIG.INITIAL_CHIPS,
      isReady: true,
      isConnected: true,
      avatar: BOT_AVATARS[index] || '🤖',
    };
    room.players.push(bot);
  }

  return room;
}

export function removeBots(): Room {
  const room = getOrCreateMainRoom();
  if (room.status !== 'waiting') throw new Error('遊戲已開始，無法移除電腦玩家');
  room.players = room.players.filter((p) => !isBot(p.id));
  return room;
}

export function autoReadyBots(room: Room): void {
  for (const player of room.players) {
    if (isBot(player.id)) {
      player.isReady = true;
    }
  }
}

export function scheduleBotBets(io: TypedServer, roomId: string): void {
  const room = getOrCreateMainRoom();
  const gs = room.gameState;
  if (!gs?.bettingState) return;

  const bots = room.players.filter((p) => isBot(p.id));
  const options = gs.bettingState.options;

  for (const bot of bots) {
    const delay = 1000 + Math.random() * 2000; // 1-3 seconds
    setTimeout(() => {
      // Re-check state is still valid
      if (!gs.bettingState || gs.phase !== 'betting_round') return;
      if (gs.bettingState.playerBets[bot.id]) return;

      const option = options[Math.floor(Math.random() * options.length)];
      const minBet = getMinBet(bot.chips);
      const maxBet = Math.max(minBet, Math.floor(bot.chips * 0.5));
      const amount = minBet + Math.floor(Math.random() * (maxBet - minBet + 1));

      handlePlaceBet(io, roomId, bot.id, option.id, amount);
    }, delay);
  }
}

export function scheduleBotBids(io: TypedServer, roomId: string): void {
  const room = getOrCreateMainRoom();
  const gs = room.gameState;
  if (!gs?.auctionState) return;

  const bots = room.players.filter((p) => isBot(p.id));

  for (const bot of bots) {
    const delay = 1000 + Math.random() * 2000; // 1-3 seconds
    setTimeout(() => {
      // Re-check state is still valid
      if (!gs.auctionState || gs.phase !== 'auction_round') return;
      if (gs.auctionState.playerBids[bot.id] !== undefined) return;

      // 30% chance to skip
      if (Math.random() < 0.3 || bot.chips < GAME_CONFIG.MIN_BID) {
        handleSubmitBid(io, roomId, bot.id, 0);
        return;
      }

      const minBid = GAME_CONFIG.MIN_BID;
      const maxBid = Math.max(minBid, Math.floor(bot.chips * 0.3));
      const amount = minBid + Math.floor(Math.random() * (maxBid - minBid + 1));

      handleSubmitBid(io, roomId, bot.id, amount);
    }, delay);
  }
}
