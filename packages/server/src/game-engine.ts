import type { Server, Socket } from 'socket.io';
import type {
  Room,
  Player,
  GameState,
  GamePhase,
  AuctionBox,
  BetType,
} from '@prize-battle/shared';
import {
  GAME_CONFIG,
  calculateLeaderboard,
  getMinBet,
} from '@prize-battle/shared';
import type { ServerToClientEvents, ClientToServerEvents } from '@prize-battle/shared';
import { createBettingState, placeBet, resolveBetting } from './betting.js';
import { createAuctionBoxes, createAuctionState, submitBid, resolveAuction } from './auction.js';
import { scheduleBotBets, scheduleBotBids } from './bot.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

interface ActiveGame {
  room: Room;
  auctionBoxes: AuctionBox[];
  playerShields: Set<string>;
  timerInterval: ReturnType<typeof setInterval> | null;
}

const activeGames = new Map<string, ActiveGame>();

export function startGame(io: TypedServer, room: Room): void {
  room.status = 'playing';

  const gameState: GameState = {
    phase: 'betting_intro',
    currentRound: 0,
    totalBettingRounds: GAME_CONFIG.TOTAL_BETTING_ROUNDS,
    totalAuctionItems: GAME_CONFIG.TOTAL_AUCTION_ITEMS,
    bettingState: null,
    auctionState: null,
    leaderboard: [],
  };

  room.gameState = gameState;

  const activeGame: ActiveGame = {
    room,
    auctionBoxes: createAuctionBoxes(),
    playerShields: new Set(),
    timerInterval: null,
  };

  activeGames.set(room.id, activeGame);

  io.to(room.id).emit('gameStart', gameState);
  io.to(`display_${room.id}`).emit('gameStart', gameState);

  // Start betting phase
  setTimeout(() => startBettingPhase(io, room.id), 500);
}

function startBettingPhase(io: TypedServer, roomId: string): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  const { room } = game;
  const gs = room.gameState!;

  gs.phase = 'betting_intro';
  emitPhaseChange(io, roomId, 'betting_intro');

  setTimeout(() => {
    startNextBettingRound(io, roomId);
  }, GAME_CONFIG.PHASE_INTRO_TIME * 1000);
}

function startNextBettingRound(io: TypedServer, roomId: string): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  const { room } = game;
  const gs = room.gameState!;

  gs.currentRound++;
  if (gs.currentRound > GAME_CONFIG.TOTAL_BETTING_ROUNDS) {
    // Move to auction phase
    startAuctionPhase(io, roomId);
    return;
  }

  const betType = GAME_CONFIG.BETTING_ROUNDS[gs.currentRound - 1];
  const bettingState = createBettingState(betType, gs.currentRound, room.players);
  gs.bettingState = bettingState;
  gs.phase = 'betting_round';

  emitPhaseChange(io, roomId, 'betting_round');
  io.to(roomId).emit('bettingRoundStart', bettingState);
  io.to(`display_${roomId}`).emit('bettingRoundStart', bettingState);

  // Schedule bot actions
  scheduleBotBets(io, roomId);

  // Start countdown
  startTimer(io, roomId, GAME_CONFIG.BETTING_TIME, () => {
    resolveBettingRound(io, roomId);
  });
}

function resolveBettingRound(io: TypedServer, roomId: string): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  const { room } = game;
  const gs = room.gameState!;
  const bettingState = gs.bettingState!;

  gs.phase = 'betting_reveal';
  emitPhaseChange(io, roomId, 'betting_reveal');

  const result = resolveBetting(bettingState, room.players);
  bettingState.result = result;

  // Send result after a brief delay for suspense
  setTimeout(() => {
    io.to(roomId).emit('bettingResult', result);
    io.to(`display_${roomId}`).emit('bettingResult', result);

    // Show result for a few seconds
    setTimeout(() => {
      gs.phase = 'betting_result';
      emitPhaseChange(io, roomId, 'betting_result');

      setTimeout(() => {
        startNextBettingRound(io, roomId);
      }, GAME_CONFIG.RESULT_DISPLAY_TIME * 1000);
    }, GAME_CONFIG.REVEAL_TIME * 1000);
  }, 1000);
}

function startAuctionPhase(io: TypedServer, roomId: string): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  const { room } = game;
  const gs = room.gameState!;

  gs.phase = 'auction_intro';
  gs.currentRound = 0;
  emitPhaseChange(io, roomId, 'auction_intro');

  setTimeout(() => {
    startNextAuctionRound(io, roomId);
  }, GAME_CONFIG.PHASE_INTRO_TIME * 1000);
}

function startNextAuctionRound(io: TypedServer, roomId: string): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  const { room, auctionBoxes } = game;
  const gs = room.gameState!;

  gs.currentRound++;
  if (gs.currentRound > GAME_CONFIG.TOTAL_AUCTION_ITEMS) {
    // Game over
    showFinalResults(io, roomId);
    return;
  }

  const boxIndex = gs.currentRound - 1;
  const box = auctionBoxes[boxIndex];
  const remaining = GAME_CONFIG.TOTAL_AUCTION_ITEMS - gs.currentRound;

  const auctionState = createAuctionState(gs.currentRound, box, remaining);
  gs.auctionState = auctionState;
  gs.phase = 'auction_round';

  emitPhaseChange(io, roomId, 'auction_round');
  io.to(roomId).emit('auctionRoundStart', auctionState);
  io.to(`display_${roomId}`).emit('auctionRoundStart', auctionState);

  // Schedule bot actions
  scheduleBotBids(io, roomId);

  // Start countdown
  startTimer(io, roomId, GAME_CONFIG.AUCTION_TIME, () => {
    resolveAuctionRound(io, roomId);
  });
}

function resolveAuctionRound(io: TypedServer, roomId: string): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  const { room, auctionBoxes, playerShields } = game;
  const gs = room.gameState!;
  const auctionState = gs.auctionState!;

  gs.phase = 'auction_reveal';
  emitPhaseChange(io, roomId, 'auction_reveal');

  const boxIndex = gs.currentRound - 1;
  const box = auctionBoxes[boxIndex];

  const result = resolveAuction(auctionState, box, room.players, playerShields);
  auctionState.result = result;

  setTimeout(() => {
    io.to(roomId).emit('auctionResult', result);
    io.to(`display_${roomId}`).emit('auctionResult', result);

    setTimeout(() => {
      gs.phase = 'auction_result';
      emitPhaseChange(io, roomId, 'auction_result');

      setTimeout(() => {
        startNextAuctionRound(io, roomId);
      }, GAME_CONFIG.RESULT_DISPLAY_TIME * 1000);
    }, GAME_CONFIG.REVEAL_TIME * 1000);
  }, 1000);
}

function showFinalResults(io: TypedServer, roomId: string): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  const { room } = game;
  const gs = room.gameState!;

  gs.phase = 'final_result';
  const totalPrize = room.players.length * GAME_CONFIG.INITIAL_CHIPS;
  gs.leaderboard = calculateLeaderboard(room.players, totalPrize);

  room.status = 'finished';

  emitPhaseChange(io, roomId, 'final_result');
  io.to(roomId).emit('finalResult', gs.leaderboard);
  io.to(`display_${roomId}`).emit('finalResult', gs.leaderboard);
}

function startTimer(
  io: TypedServer,
  roomId: string,
  seconds: number,
  onComplete: () => void,
): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  clearTimer(roomId);

  let timeLeft = seconds;

  game.timerInterval = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('timerTick', timeLeft);
    io.to(`display_${roomId}`).emit('timerTick', timeLeft);

    if (timeLeft <= 0) {
      clearTimer(roomId);
      onComplete();
    }
  }, 1000);
}

function clearTimer(roomId: string): void {
  const game = activeGames.get(roomId);
  if (game?.timerInterval) {
    clearInterval(game.timerInterval);
    game.timerInterval = null;
  }
}

function emitPhaseChange(io: TypedServer, roomId: string, phase: GamePhase): void {
  io.to(roomId).emit('phaseChange', phase);
  io.to(`display_${roomId}`).emit('phaseChange', phase);
}

// === Public API for socket handlers ===

export function handlePlaceBet(
  io: TypedServer,
  roomId: string,
  playerId: string,
  optionId: string,
  amount: number,
): boolean {
  const game = activeGames.get(roomId);
  if (!game) return false;

  const { room } = game;
  const gs = room.gameState;
  if (!gs || gs.phase !== 'betting_round' || !gs.bettingState) return false;

  const player = room.players.find((p: Player) => p.id === playerId);
  if (!player) return false;

  const success = placeBet(gs.bettingState, playerId, optionId, amount, player.chips);

  if (success) {
    io.to(roomId).emit('playerBetConfirmed', playerId);
    io.to(`display_${roomId}`).emit('playerBetConfirmed', playerId);

    // Check if all players have bet
    const allBet = room.players.every(
      (p) => !p.isConnected || gs.bettingState!.playerBets[p.id],
    );
    if (allBet) {
      clearTimer(roomId);
      resolveBettingRound(io, roomId);
    }
  }

  return success;
}

export function handleSubmitBid(
  io: TypedServer,
  roomId: string,
  playerId: string,
  amount: number,
): boolean {
  const game = activeGames.get(roomId);
  if (!game) return false;

  const { room } = game;
  const gs = room.gameState;
  if (!gs || gs.phase !== 'auction_round' || !gs.auctionState) return false;

  const player = room.players.find((p: Player) => p.id === playerId);
  if (!player) return false;

  const success = submitBid(gs.auctionState, playerId, amount, player.chips);

  if (success) {
    io.to(roomId).emit('playerBidConfirmed', playerId);
    io.to(`display_${roomId}`).emit('playerBidConfirmed', playerId);

    // Check if all players have bid
    const allBid = room.players.every(
      (p) => !p.isConnected || gs.auctionState!.playerBids[p.id] !== undefined,
    );
    if (allBid) {
      clearTimer(roomId);
      resolveAuctionRound(io, roomId);
    }
  }

  return success;
}

export function handlePlayAgain(io: TypedServer, roomId: string): void {
  const game = activeGames.get(roomId);
  if (!game) return;

  clearTimer(roomId);
  activeGames.delete(roomId);
}
