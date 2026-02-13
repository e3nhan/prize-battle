import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@prize-battle/shared';
import { useCalcDisplayStore } from '../stores/calcDisplayStore';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

function getSocket(): TypedSocket {
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

export function useCalcDisplaySocket() {
  const socketRef = useRef<TypedSocket>(getSocket());
  const store = useCalcDisplayStore();

  useEffect(() => {
    const s = socketRef.current;

    s.emit('joinCalcDisplay');

    s.on('calcRoomUpdate', (room, state) => {
      store.setRoomAndState(room, state);
    });

    s.on('calcChipAdjusted', (tx, room) => {
      store.addTransaction(tx, room);
    });

    return () => {
      s.off('calcRoomUpdate');
      s.off('calcChipAdjusted');
    };
  }, []);
}
