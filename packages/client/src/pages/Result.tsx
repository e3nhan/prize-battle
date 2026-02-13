import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../hooks/useSocket';

export default function Result() {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const playerId = useGameStore((s) => s.playerId);

  const myEntry = leaderboard.find((e) => e.playerId === playerId);

  const handlePlayAgain = () => {
    getSocket().emit('playAgain');
    // 不呼叫 reset()，讓 server 的 roomUpdate(status='waiting') 自動導向 lobby
  };

  const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

  return (
    <div className="h-full flex flex-col p-6">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black text-gold">🏆 最終排名</h2>
      </div>

      {/* My result */}
      {myEntry && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-gold/20 to-yellow-600/10 border border-gold/30 text-center"
        >
          <p className="text-5xl mb-2">{rankEmojis[myEntry.rank - 1] || '🎮'}</p>
          <p className="text-xl text-gray-300">你的排名</p>
          <p className="text-4xl font-black text-gold">第 {myEntry.rank} 名</p>
          <div className="mt-3 flex justify-center gap-6">
            <div>
              <p className="text-sm text-gray-400">最終籌碼</p>
              <p className="text-xl font-bold text-white">🪙 {myEntry.chips}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">獲得獎金</p>
              <p className="text-xl font-bold text-neon-green">💰 {myEntry.prize}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Full leaderboard */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {leaderboard.map((entry, index) => (
          <motion.div
            key={entry.playerId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            className={`flex items-center justify-between p-3 rounded-xl border ${
              entry.playerId === playerId
                ? 'bg-gold/10 border-gold/30'
                : 'bg-secondary border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{rankEmojis[index] || `${index + 1}`}</span>
              <span className="font-bold">{entry.playerName}</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gold">🪙 {entry.chips}</p>
              <p className="text-xs text-neon-green">💰 {entry.prize}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Play again */}
      <button
        onClick={handlePlayAgain}
        className="mt-4 w-full py-4 rounded-xl text-xl font-bold
          bg-gradient-to-r from-gold/80 to-yellow-600 text-primary
          active:scale-95 glow-gold"
      >
        🔄 再來一局
      </button>
    </div>
  );
}
