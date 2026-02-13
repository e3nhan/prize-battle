import { useSocket } from './hooks/useSocket';
import { useGameStore } from './stores/gameStore';
import JoinRoom from './pages/JoinRoom';
import Lobby from './pages/Lobby';
import BettingRound from './pages/BettingRound';
import AuctionRound from './pages/AuctionRound';
import Result from './pages/Result';

export default function App() {
  useSocket();

  const screen = useGameStore((s) => s.screen);
  const phase = useGameStore((s) => s.phase);

  if (screen === 'join') return <JoinRoom />;
  if (screen === 'lobby') return <Lobby />;
  if (screen === 'result') return <Result />;

  // Game screen - show appropriate sub-page based on phase
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
