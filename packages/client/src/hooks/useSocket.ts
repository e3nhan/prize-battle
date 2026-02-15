import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@prize-battle/shared';
import { useGameStore } from '../stores/gameStore';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    const url = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

export function useSocket(): TypedSocket {
  const socketRef = useRef<TypedSocket>(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    const store = useGameStore.getState();

    s.on('roomUpdate', (room) => {
      useGameStore.getState().setRoom(room);
    });

    s.on('error', (message) => {
      if (message === 'reconnect_failed') {
        sessionStorage.removeItem('playerName');
        sessionStorage.removeItem('appMode');
        useGameStore.getState().reset();
        return;
      }
      useGameStore.getState().setError(message);
    });

    s.on('gameStart', (state) => {
      useGameStore.getState().setGameState(state);
    });

    s.on('phaseChange', (phase) => {
      useGameStore.getState().setPhase(phase);
    });

    s.on('timerTick', (secondsLeft) => {
      useGameStore.getState().setTimeLeft(secondsLeft);
    });

    s.on('countdownStart', (seconds) => {
      useGameStore.getState().setCountdown(seconds);
    });

    s.on('countdownCancel', () => {
      useGameStore.getState().setCountdown(0);
    });

    s.on('bettingRoundStart', (state) => {
      useGameStore.getState().setBettingState(state);
    });

    s.on('playerBetConfirmed', (playerId) => {
      useGameStore.getState().addConfirmedBet(playerId);
    });

    s.on('playerRoundReady', (playerId) => {
      useGameStore.getState().addConfirmedRoundReady(playerId);
    });

    s.on('bettingResult', (result) => {
      useGameStore.getState().setBettingResult(result);
    });

    s.on('auctionRoundStart', (state) => {
      useGameStore.getState().setAuctionState(state);
    });

    s.on('playerBidConfirmed', (playerId) => {
      useGameStore.getState().addConfirmedBid(playerId);
    });

    s.on('auctionResult', (result) => {
      useGameStore.getState().setAuctionResult(result);
    });

    s.on('finalResult', (leaderboard) => {
      useGameStore.getState().setLeaderboard(leaderboard);
    });

    // 斷線/連線狀態追蹤
    s.on('disconnect', () => {
      useGameStore.getState().setIsConnected(false);
    });

    s.on('connect', () => {
      useGameStore.getState().setIsConnected(true);
    });

    // 斷線重連提示
    s.io.on('reconnect', () => {
      useGameStore.getState().showToast('已重新連線');
      const name = sessionStorage.getItem('playerName');
      if (name && sessionStorage.getItem('appMode') === 'game') {
        useGameStore.getState().setPlayerId(s.id!);
        s.emit('reconnectGame', name);
      }
    });

    // 頁面重整後自動重連
    const savedName = sessionStorage.getItem('playerName');
    const appMode = sessionStorage.getItem('appMode');
    if (savedName && appMode === 'game') {
      store.setPlayerName(savedName);
      const tryReconnect = () => {
        useGameStore.getState().setPlayerId(s.id!);
        s.emit('reconnectGame', savedName);
      };
      if (s.connected) {
        tryReconnect();
      } else {
        s.once('connect', tryReconnect);
      }
    }

    return () => {
      s.off('roomUpdate');
      s.off('error');
      s.off('gameStart');
      s.off('phaseChange');
      s.off('timerTick');
      s.off('countdownStart');
      s.off('countdownCancel');
      s.off('bettingRoundStart');
      s.off('playerBetConfirmed');
      s.off('playerRoundReady');
      s.off('bettingResult');
      s.off('auctionRoundStart');
      s.off('playerBidConfirmed');
      s.off('auctionResult');
      s.off('finalResult');
      s.off('disconnect');
      s.off('connect');
      s.io.off('reconnect');
    };
  }, []);

  return socketRef.current;
}
