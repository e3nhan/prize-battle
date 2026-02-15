import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@prize-battle/shared';
import { useDisplayStore } from '../stores/displayStore';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    const url = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function useDisplaySocket(): TypedSocket {
  const socketRef = useRef<TypedSocket>(getSocket());
  const store = useDisplayStore();

  useEffect(() => {
    const s = socketRef.current;

    s.emit('joinDisplay');
    // Re-join display room after socket reconnection (server-side room membership resets)
    s.on('connect', () => s.emit('joinDisplay'));

    s.on('roomUpdate', (room) => store.setRoom(room));
    s.on('gameStart', (state) => store.setGameState(state));
    s.on('phaseChange', (phase) => store.setPhase(phase));
    s.on('timerTick', (seconds) => store.setTimeLeft(seconds));
    s.on('countdownStart', (seconds) => store.setCountdown(seconds));
    s.on('countdownCancel', () => store.setCountdown(0));
    s.on('bettingRoundStart', (state) => store.setBettingState(state));
    s.on('playerBetConfirmed', (id) => store.addConfirmedBet(id));
    s.on('playerRoundReady', (id) => store.addConfirmedRoundReady(id));
    s.on('bettingResult', (result) => store.setBettingResult(result));
    s.on('auctionRoundStart', (state) => store.setAuctionState(state));
    s.on('playerBidConfirmed', (id) => store.addConfirmedBid(id));
    s.on('auctionResult', (result) => store.setAuctionResult(result));
    s.on('finalResult', (leaderboard) => store.setLeaderboard(leaderboard));

    return () => {
      s.off('connect');
      s.off('roomUpdate');
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
    };
  }, []);

  return socketRef.current;
}
