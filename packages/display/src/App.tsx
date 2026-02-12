import { useState, useEffect } from 'react';
import { useDisplaySocket } from './hooks/useSocket';
import { useDisplayStore } from './stores/displayStore';
import WaitingScreen from './pages/WaitingScreen';
import BettingDisplay from './pages/BettingDisplay';
import AuctionDisplay from './pages/AuctionDisplay';
import Leaderboard from './pages/Leaderboard';

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');

  // Check URL for room parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');
    if (rid) setRoomId(rid.toUpperCase());
  }, []);

  if (!roomId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-primary">
        <h1 className="text-5xl font-black text-gold">🎰 獎金爭奪戰</h1>
        <p className="text-xl text-gray-400">大螢幕投放端</p>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="輸入房間碼"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
            className="px-6 py-3 bg-secondary border border-gray-700 rounded-xl
              text-white text-xl text-center tracking-[0.3em] uppercase
              focus:outline-none focus:border-gold"
            maxLength={6}
          />
          <button
            onClick={() => setRoomId(inputRoomId)}
            disabled={!inputRoomId}
            className="px-8 py-3 bg-gold text-primary font-bold rounded-xl text-xl
              disabled:opacity-40"
          >
            連接
          </button>
        </div>
      </div>
    );
  }

  return <DisplayContent roomId={roomId} />;
}

function DisplayContent({ roomId }: { roomId: string }) {
  useDisplaySocket(roomId);

  const room = useDisplayStore((s) => s.room);
  const phase = useDisplayStore((s) => s.phase);

  if (!room) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary">
        <p className="text-2xl text-gray-400">連接房間 {roomId} 中...</p>
      </div>
    );
  }

  if (room.status === 'waiting' || !phase) {
    return <WaitingScreen />;
  }

  if (
    phase === 'betting_intro' ||
    phase === 'betting_round' ||
    phase === 'betting_reveal' ||
    phase === 'betting_result'
  ) {
    return <BettingDisplay />;
  }

  if (
    phase === 'auction_intro' ||
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
