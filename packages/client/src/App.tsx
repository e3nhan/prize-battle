import { useState } from 'react';
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

function GameApp() {
  useSocket();

  const screen = useGameStore((s) => s.screen);
  const phase = useGameStore((s) => s.phase);

  if (screen === 'join') return <JoinRoom />;
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

  return <JoinRoom />;
}

function CalcApp({ onBack }: { onBack: () => void }) {
  useCalcSocket();

  const calcScreen = useCalcStore((s) => s.screen);

  if (calcScreen === 'join') return <CalculatorJoin onBack={onBack} />;
  return <CalculatorMain />;
}

export default function App() {
  const [appMode, setAppMode] = useState<'home' | 'game' | 'calculator'>('home');

  if (appMode === 'home') {
    return <HomeScreen onSelectMode={setAppMode} />;
  }

  if (appMode === 'calculator') {
    return <CalcApp onBack={() => setAppMode('home')} />;
  }

  return <GameApp />;
}
