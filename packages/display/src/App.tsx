import { useDisplaySocket } from './hooks/useSocket';
import { useDisplayStore } from './stores/displayStore';
import WaitingScreen from './pages/WaitingScreen';
import BettingDisplay from './pages/BettingDisplay';
import AuctionDisplay from './pages/AuctionDisplay';
import Leaderboard from './pages/Leaderboard';

export default function App() {
  useDisplaySocket();

  const room = useDisplayStore((s) => s.room);
  const phase = useDisplayStore((s) => s.phase);

  if (!room) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary">
        <p className="text-2xl text-gray-400">連接中...</p>
      </div>
    );
  }

  if (room.status === 'waiting' || !phase) {
    return <WaitingScreen />;
  }

  if (
    phase === 'betting_intro' ||
    phase === 'betting_briefing' ||
    phase === 'betting_round' ||
    phase === 'betting_reveal' ||
    phase === 'betting_result'
  ) {
    return <BettingDisplay />;
  }

  if (
    phase === 'auction_intro' ||
    phase === 'auction_briefing' ||
    phase === 'auction_round' ||
    phase === 'auction_reveal' ||
    phase === 'auction_result'
  ) {
    return <AuctionDisplay />;
  }

  if (phase === 'final_result') {
    return <Leaderboard />;
  }

  return <WaitingScreen />;
}
