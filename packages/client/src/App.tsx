import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from './hooks/useSocket';
import { useCalcSocket } from './hooks/useCalcSocket';
import { useGameStore } from './stores/gameStore';
import { useCalcStore } from './stores/calcStore';
import HomeScreen from './pages/HomeScreen';
import JoinRoom from './pages/JoinRoom';
import Lobby from './pages/Lobby';
import BettingRound from './pages/BettingRound';
import AuctionRound from './pages/AuctionRound';
import Result from './pages/Result';
import CalculatorJoin from './pages/CalculatorJoin';
import CalculatorMain from './pages/CalculatorMain';

type AppMode = 'home' | 'game' | 'calculator';

function getInitialMode(): AppMode {
  return (sessionStorage.getItem('appMode') as AppMode) || 'home';
}

function Toast() {
  const toast = useGameStore((s) => s.toast);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl
            bg-neon-green/20 border border-neon-green/40 text-neon-green text-sm font-bold
            backdrop-blur-sm shadow-lg"
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GameApp({ onBack }: { onBack: () => void }) {
  useSocket();

  const screen = useGameStore((s) => s.screen);
  const phase = useGameStore((s) => s.phase);

  if (screen === 'join') return <JoinRoom onBack={onBack} />;
  if (screen === 'lobby') return <Lobby />;
  if (screen === 'result') return <Result />;

  if (screen === 'game') {
    if (
      phase === 'betting_intro' ||
      phase === 'betting_briefing' ||
      phase === 'betting_round' ||
      phase === 'betting_reveal' ||
      phase === 'betting_result'
    ) {
      return <BettingRound />;
    }

    if (
      phase === 'auction_intro' ||
      phase === 'auction_briefing' ||
      phase === 'auction_round' ||
      phase === 'auction_reveal' ||
      phase === 'auction_result'
    ) {
      return <AuctionRound />;
    }

    if (phase === 'final_result') {
      return <Result />;
    }
  }

  return <JoinRoom onBack={onBack} />;
}

function CalcApp({ onBack }: { onBack: () => void }) {
  useCalcSocket();

  const calcScreen = useCalcStore((s) => s.screen);

  if (calcScreen === 'join') return <CalculatorJoin onBack={onBack} />;
  return <CalculatorMain />;
}

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>(getInitialMode);

  const handleSetMode = useCallback((mode: AppMode) => {
    sessionStorage.setItem('appMode', mode);
    setAppMode(mode);
  }, []);

  const handleBack = useCallback(() => {
    sessionStorage.removeItem('appMode');
    sessionStorage.removeItem('playerName');
    setAppMode('home');
  }, []);

  if (appMode === 'home') {
    return <HomeScreen onSelectMode={handleSetMode} />;
  }

  if (appMode === 'calculator') {
    return <CalcApp onBack={handleBack} />;
  }

  return (
    <>
      <Toast />
      <GameApp onBack={handleBack} />
    </>
  );
}
