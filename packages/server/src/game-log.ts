import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { LeaderboardEntry, Player } from '@prize-battle/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = process.env.GAME_LOG_DIR || join(__dirname, '../data');
const LOG_FILE = join(DATA_DIR, 'game-logs.json');

export interface GameLogEntry {
  id: string;
  timestamp: number;
  players: {
    id: string;
    name: string;
    buyIn: number;
    finalChips: number;
    rank: number;
    prize: number;
    isBot: boolean;
  }[];
  totalPrize: number;
  duration: number; // 遊戲時長（秒）
}

function load(): GameLogEntry[] {
  if (!existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(readFileSync(LOG_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function save(logs: GameLogEntry[]) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

export function logGameResult(
  players: Player[],
  leaderboard: LeaderboardEntry[],
  totalPrize: number,
  startTime: number,
): GameLogEntry {
  const logs = load();
  const entry: GameLogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    players: leaderboard.map((lb) => {
      const player = players.find((p) => p.id === lb.playerId);
      return {
        id: lb.playerId,
        name: lb.playerName,
        buyIn: player?.buyIn ?? 0,
        finalChips: lb.chips,
        rank: lb.rank,
        prize: lb.prize,
        isBot: lb.playerId.startsWith('bot_'),
      };
    }),
    totalPrize,
    duration: Math.round((Date.now() - startTime) / 1000),
  };
  logs.push(entry);
  save(logs);
  console.log(`[GameLog] 遊戲結束 — ${entry.players.map((p) => `${p.name}#${p.rank}(${p.prize}元)`).join(', ')}`);
  return entry;
}

export function getGameLogs(): GameLogEntry[] {
  return load();
}
