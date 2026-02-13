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
      if (message === 'reconnect_failed') {
        sessionStorage.removeItem('playerName');
        return;
      }
      store.setError(message);
    });

    // 頁面重整後自動重連
    const savedName = sessionStorage.getItem('playerName');
    const appMode = sessionStorage.getItem('appMode');
    if (savedName && appMode === 'calculator') {
      store.setPlayerName(savedName);
      const tryReconnect = () => {
        store.setPlayerId(s.id!);
        s.emit('reconnectCalc', savedName);
      };
      if (s.connected) {
        tryReconnect();
      } else {
        s.once('connect', tryReconnect);
      }
    }

    return () => {
      s.off('calcRoomUpdate');
      s.off('calcChipAdjusted');
      // Don't remove error listener here as game also uses it
    };
  }, []);
}
