import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import type { ServerToClientEvents, ClientToServerEvents } from '@prize-battle/shared';
import {
  getOrCreateMainRoom,
  joinMainRoom,
  setPlayerReady,
  setPlayerUnready,
  isAllReady,
  handleDisconnect,
  handleReconnect,
  getRoomBySocketId,
  getPlayerRoomId,
  getMainRoom,
  resetRoom,
} from './room.js';
import {
  startGame,
  handlePlaceBet,
  handleSubmitBid,
  handlePlayAgain,
  handleRoundReady,
} from './game-engine.js';
import { addBots, removeBots, autoReadyBots } from './bot.js';
import {
  getOrCreateCalcRoom,
  joinCalcRoom,
  adjustPlayerChips,
  topUpChips,
  handleCalcDisconnect,
  handleCalcReconnect,
  resetCalcRoom,
  getCalcState,
} from './calc-room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Serve static files in production (built assets)
const clientDist = join(__dirname, '../../client/dist');
const displayDist = join(__dirname, '../../display/dist');
const isProduction = existsSync(join(clientDist, 'index.html'));

if (isProduction) {
  app.use('/display', express.static(displayDist));
  app.use(express.static(clientDist));
}

// API endpoint for room info
app.get('/api/room', (_req, res) => {
  const room = getMainRoom();
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({ id: room.id, playerCount: room.players.length, status: room.status });
});

// Initialize the main room on startup
getOrCreateMainRoom();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('quickJoin', (playerName: string, buyIn: number) => {
    try {
      const room = joinMainRoom(socket.id, playerName, buyIn);
      socket.join(room.id);
      io.to(room.id).emit('roomUpdate', room);
      io.to(`display_${room.id}`).emit('roomUpdate', room);
      console.log(`${playerName} joined the game (buy-in: ${buyIn})`);
    } catch (err: any) {
      socket.emit('error', err.message);
    }
  });

  // 重新連線（遊戲）
  socket.on('reconnectGame', (playerName: string) => {
    const room = handleReconnect(socket.id, playerName);
    if (!room) {
      socket.emit('error', 'reconnect_failed');
      return;
    }
    socket.join(room.id);
    socket.emit('roomUpdate', room);
    if (room.gameState) {
      socket.emit('gameStart', room.gameState);
      if (room.gameState.phase) {
        socket.emit('phaseChange', room.gameState.phase);
      }
    }
    // 通知其他人此玩家已重連
    io.to(room.id).emit('roomUpdate', room);
    io.to(`display_${room.id}`).emit('roomUpdate', room);
    console.log(`${playerName} reconnected to game`);
  });

  // 重新連線（計算器）
  socket.on('reconnectCalc', (playerName: string) => {
    const result = handleCalcReconnect(socket.id, playerName);
    if (!result) {
      socket.emit('error', 'reconnect_failed');
      return;
    }
    socket.join(result.room.id);
    socket.emit('calcRoomUpdate', result.room, result.state);
    // 通知其他人此玩家已重連
    io.to(result.room.id).emit('calcRoomUpdate', result.room, result.state);
    io.to(`display_${result.room.id}`).emit('calcRoomUpdate', result.room, result.state);
    console.log(`${playerName} reconnected to calculator`);
  });

  socket.on('playerReady', () => {
    const room = setPlayerReady(socket.id);
    if (!room) return;

    io.to(room.id).emit('roomUpdate', room);
    io.to(`display_${room.id}`).emit('roomUpdate', room);

    if (isAllReady(room)) {
      // Countdown 5 seconds then start
      let countdown = 5;
      io.to(room.id).emit('countdownStart', countdown);
      io.to(`display_${room.id}`).emit('countdownStart', countdown);

      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          startGame(io, room);
        } else {
          io.to(room.id).emit('countdownStart', countdown);
          io.to(`display_${room.id}`).emit('countdownStart', countdown);
        }
      }, 1000);
    }
  });

  socket.on('playerUnready', () => {
    const room = setPlayerUnready(socket.id);
    if (!room) return;
    io.to(room.id).emit('roomUpdate', room);
    io.to(`display_${room.id}`).emit('roomUpdate', room);
  });

  // Display screen
  socket.on('joinDisplay', () => {
    const room = getOrCreateMainRoom();
    socket.join(`display_${room.id}`);
    socket.emit('roomUpdate', room);
    if (room.gameState) {
      socket.emit('gameStart', room.gameState);
    }
  });

  // Betting
  socket.on('placeBet', (bet: { optionId: string; amount: number; choiceId?: string }) => {
    const roomId = getPlayerRoomId(socket.id);
    if (!roomId) return;
    const success = handlePlaceBet(io, roomId, socket.id, bet.optionId, bet.amount, bet.choiceId);
    if (!success) {
      socket.emit('error', '下注失敗');
    }
  });

  // 每輪準備確認
  socket.on('roundReady', () => {
    const roomId = getPlayerRoomId(socket.id);
    if (!roomId) return;
    handleRoundReady(io, roomId, socket.id);
  });

  // Auction
  socket.on('submitBid', (amount: number) => {
    const roomId = getPlayerRoomId(socket.id);
    if (!roomId) return;
    const success = handleSubmitBid(io, roomId, socket.id, amount);
    if (!success) {
      socket.emit('error', '出價失敗');
    }
  });

  // Play again
  socket.on('playAgain', () => {
    const roomId = getPlayerRoomId(socket.id);
    if (!roomId) return;
    const room = getMainRoom();
    if (!room) return;

    handlePlayAgain(io, roomId);
    resetRoom(room);
    autoReadyBots(room);
    io.to(room.id).emit('roomUpdate', room);
    io.to(`display_${room.id}`).emit('roomUpdate', room);
  });

  // Bot management
  socket.on('addBots', (count: number) => {
    try {
      const room = addBots(count);
      io.to(room.id).emit('roomUpdate', room);
      io.to(`display_${room.id}`).emit('roomUpdate', room);
      console.log(`Added ${count} bot(s)`);
    } catch (err: any) {
      socket.emit('error', err.message);
    }
  });

  socket.on('removeBots', () => {
    try {
      const room = removeBots();
      io.to(room.id).emit('roomUpdate', room);
      io.to(`display_${room.id}`).emit('roomUpdate', room);
      console.log('Removed all bots');
    } catch (err: any) {
      socket.emit('error', err.message);
    }
  });

  // ===== 籌碼計算器 =====
  socket.on('joinCalculator', (playerName: string, initialChips?: number) => {
    try {
      const { room, state } = joinCalcRoom(socket.id, playerName, initialChips ?? 0);
      socket.join(room.id);
      io.to(room.id).emit('calcRoomUpdate', room, state);
      io.to(`display_${room.id}`).emit('calcRoomUpdate', room, state);
      console.log(`${playerName} joined calculator (initial: ${initialChips ?? 0})`);
    } catch (err: any) {
      socket.emit('error', err.message);
    }
  });

  socket.on('joinCalcDisplay', () => {
    const room = getOrCreateCalcRoom();
    const state = getCalcState();
    socket.join(`display_${room.id}`);
    socket.emit('calcRoomUpdate', room, state);
  });

  socket.on('adjustChips', (targetPlayerId: string, amount: number, note?: string) => {
    const result = adjustPlayerChips(socket.id, targetPlayerId, amount, note);
    if (!result) {
      socket.emit('error', '調整籌碼失敗');
      return;
    }
    io.to(result.room.id).emit('calcChipAdjusted', result.tx, result.room);
    io.to(`display_${result.room.id}`).emit('calcChipAdjusted', result.tx, result.room);
  });

  socket.on('topUp', (amount: number) => {
    const result = topUpChips(socket.id, amount);
    if (!result) {
      socket.emit('error', '儲值失敗');
      return;
    }
    io.to(result.room.id).emit('calcChipAdjusted', result.tx, result.room);
    io.to(`display_${result.room.id}`).emit('calcChipAdjusted', result.tx, result.room);
  });

  socket.on('resetCalculator', () => {
    const { room, state } = resetCalcRoom();
    io.to(room.id).emit('calcRoomUpdate', room, state);
    io.to(`display_${room.id}`).emit('calcRoomUpdate', room, state);
  });

  socket.on('disconnect', () => {
    const room = handleDisconnect(socket.id);
    if (room) {
      io.to(room.id).emit('roomUpdate', room);
      io.to(`display_${room.id}`).emit('roomUpdate', room);
    }

    const cRoom = handleCalcDisconnect(socket.id);
    if (cRoom) {
      const cState = getCalcState();
      io.to(cRoom.id).emit('calcRoomUpdate', cRoom, cState);
      io.to(`display_${cRoom.id}`).emit('calcRoomUpdate', cRoom, cState);
    }

    console.log(`Player disconnected: ${socket.id}`);
  });
});

// SPA fallback for production
if (isProduction) {
  app.get('/display/*', (_req, res) => {
    res.sendFile(join(displayDist, 'index.html'));
  });
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
} else {
  // Dev mode: show info page with links
  const devPage = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prize Battle - Dev Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a1a; color: #fff; font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
    .container { text-align: center; max-width: 500px; }
    h1 { font-size: 2.5rem; color: #ffd700; margin-bottom: 0.5rem; }
    p { color: #888; margin-bottom: 2rem; }
    a { display: block; padding: 1rem 2rem; margin: 0.75rem 0; background: #16213e; border: 2px solid #ffd700; border-radius: 12px; color: #ffd700; text-decoration: none; font-size: 1.2rem; font-weight: bold; transition: all 0.2s; }
    a:hover { background: #ffd700; color: #0a0a1a; }
    .hint { color: #555; font-size: 0.85rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎰 獎金爭奪戰</h1>
    <p>Prize Battle — Dev Server Running</p>
    <a href="http://localhost:5173">📱 玩家手機端 (Client)</a>
    <a href="http://localhost:5174/display/">🖥️ 大螢幕投放端 (Display)</a>
    <a href="http://localhost:5174/display/calculator/">🧮 計算器投放端 (Calculator Display)</a>
    <p class="hint">確保已執行 pnpm dev 啟動所有服務</p>
  </div>
</body>
</html>`;

  app.get('/', (_req, res) => {
    res.send(devPage);
  });

  app.get('/display', (_req, res) => {
    res.redirect('http://localhost:5174/display/');
  });
}

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🎰 Prize Battle server running on port ${PORT}`);
  if (isProduction) {
    console.log(`   Client: http://localhost:${PORT}`);
    console.log(`   Display: http://localhost:${PORT}/display`);
  } else {
    console.log(`   Client (dev): http://localhost:5173`);
    console.log(`   Display (dev): http://localhost:5174/display/`);
    console.log(`   Dev info page: http://localhost:${PORT}`);
  }
});
