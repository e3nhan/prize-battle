import { useEffect } from 'react';
import { getSocket } from './useSocket';
import { useCalcStore } from '../stores/calcStore';

export function useCalcSocket() {
  useEffect(() => {
    const s = getSocket();
    const store = useCalcStore.getState();

    s.on('calcRoomUpdate', (room, state) => {
      useCalcStore.getState().setRoomAndState(room, state);
    });

    s.on('calcChipAdjusted', (tx, room) => {
      useCalcStore.getState().addTransaction(tx, room);
    });

    s.on('calcBetRoundUpdate', (round) => {
      useCalcStore.getState().setBetRound(round);
    });

    s.on('error', (message) => {
      if (message === 'reconnect_failed') {
        sessionStorage.removeItem('playerName');
        return;
      }
      useCalcStore.getState().setError(message);
    });

    // 頁面重整後自動重連
    const savedName = sessionStorage.getItem('playerName');
    const appMode = sessionStorage.getItem('appMode');
    if (savedName && appMode === 'calculator') {
      store.setPlayerName(savedName);
      const tryReconnect = () => {
        useCalcStore.getState().setPlayerId(s.id!);
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
      s.off('calcBetRoundUpdate');
      // Don't remove error listener here as game also uses it
    };
  }, []);
}
