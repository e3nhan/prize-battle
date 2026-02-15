import { useState, useEffect, useCallback } from 'react';
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
import ScratchTracker from './pages/ScratchTracker';

type AppMode = 'home' | 'game' | 'calculator' | 'scratch';

function hashToMode(): AppMode {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  if (hash === 'game' || hash === 'calculator' || hash === 'scratch') return hash;
  // 重整後 hash 可能遺失，從 sessionStorage 恢復
  const saved = sessionStorage.getItem('appMode');
  if (saved === 'game' || saved === 'calculator' || saved === 'scratch') {
    window.location.hash = `#/${saved}`;
    return saved;
  }
  return 'home';
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

function DisconnectOverlay() {
  const isConnected = useGameStore((s) => s.isConnected);
  const screen = useGameStore((s) => s.screen);

  // 只在已進入遊戲後才顯示斷線提示（join 頁面不需要）
  if (isConnected || screen === 'join') return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="text-center px-6">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white text-lg font-bold mb-1">連線中斷</p>
        <p className="text-gray-400 text-sm">正在重新連線...</p>
      </div>
    </motion.div>
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
  const [appMode, setAppMode] = useState<AppMode>(hashToMode);

  useEffect(() => {
    const onHashChange = () => setAppMode(hashToMode());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSetMode = useCallback((mode: AppMode) => {
    sessionStorage.setItem('appMode', mode);
    window.location.hash = `#/${mode}`;
  }, []);

  const handleBack = useCallback(() => {
    sessionStorage.removeItem('playerName');
    sessionStorage.removeItem('appMode');
    window.location.hash = '';
  }, []);

  if (appMode === 'home') {
    return <HomeScreen onSelectMode={handleSetMode} />;
  }

  if (appMode === 'calculator') {
    return <CalcApp onBack={handleBack} />;
  }

  if (appMode === 'scratch') {
    return <ScratchTracker onBack={handleBack} />;
  }

  return (
    <>
      <Toast />
      <DisconnectOverlay />
      <GameApp onBack={handleBack} />
    </>
  );
}
