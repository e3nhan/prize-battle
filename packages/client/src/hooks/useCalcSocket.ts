import { useEffect } from 'react';
import { getSocket } from './useSocket';
import { useCalcStore } from '../stores/calcStore';

export function useCalcSocket() {
  const store = useCalcStore();

  useEffect(() => {
    const s = getSocket();

    s.on('calcRoomUpdate', (room, state) => {
      store.setRoomAndState(room, state);
    });

    s.on('calcChipAdjusted', (tx, room) => {
      store.addTransaction(tx, room);
    });

    s.on('error', (message) => {
      store.setError(message);
    });

    return () => {
      s.off('calcRoomUpdate');
      s.off('calcChipAdjusted');
      // Don't remove error listener here as game also uses it
    };
  }, []);
}
