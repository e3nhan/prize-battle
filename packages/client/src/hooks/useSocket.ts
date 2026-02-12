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
  const store = useGameStore();

  useEffect(() => {
    const s = socketRef.current;

    s.on('roomUpdate', (room) => {
      store.setRoom(room);
    });

    s.on('error', (message) => {
      store.setError(message);
    });

    s.on('gameStart', (state) => {
      store.setGameState(state);
    });

    s.on('phaseChange', (phase) => {
      store.setPhase(phase);
    });

    s.on('timerTick', (secondsLeft) => {
      store.setTimeLeft(secondsLeft);
    });

    s.on('countdownStart', (seconds) => {
      store.setCountdown(seconds);
    });

    s.on('bettingRoundStart', (state) => {
      store.setBettingState(state);
    });

    s.on('playerBetConfirmed', (playerId) => {
      store.addConfirmedBet(playerId);
    });

    s.on('bettingResult', (result) => {
      store.setBettingResult(result);
    });

    s.on('auctionRoundStart', (state) => {
      store.setAuctionState(state);
    });

    s.on('playerBidConfirmed', (playerId) => {
      store.addConfirmedBid(playerId);
    });

    s.on('auctionResult', (result) => {
      store.setAuctionResult(result);
    });

    s.on('finalResult', (leaderboard) => {
      store.setLeaderboard(leaderboard);
    });

    return () => {
      s.off('roomUpdate');
      s.off('error');
      s.off('gameStart');
      s.off('phaseChange');
      s.off('timerTick');
      s.off('countdownStart');
      s.off('bettingRoundStart');
      s.off('playerBetConfirmed');
      s.off('bettingResult');
      s.off('auctionRoundStart');
      s.off('playerBidConfirmed');
      s.off('auctionResult');
      s.off('finalResult');
    };
  }, []);

  return socketRef.current;
}
