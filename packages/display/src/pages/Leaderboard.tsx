import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisplayStore } from '../stores/displayStore';
import type { LeaderboardEntry } from '@prize-battle/shared';

export default function Leaderboard() {
  const leaderboard = useDisplayStore((s) => s.leaderboard);
  const [revealedCount, setRevealedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const reversed = [...leaderboard].reverse(); // Reveal from last to first

  useEffect(() => {
    if (leaderboard.length === 0) return;

    const timer = setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= leaderboard.length) {
          clearInterval(timer);
          setShowConfetti(true);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [leaderboard.length]);

  const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  const rankColors = [
    'from-gold/30 to-yellow-600/20 border-gold/50',
    'from-gray-400/20 to-gray-300/10 border-gray-400/50',
    'from-amber-700/20 to-amber-600/10 border-amber-700/50',
    'from-gray-700/20 to-gray-600/10 border-gray-700/50',
    'from-gray-700/20 to-gray-600/10 border-gray-700/50',
    'from-gray-700/20 to-gray-600/10 border-gray-700/50',
    'from-gray-700/20 to-gray-600/10 border-gray-700/50',
    'from-gray-700/20 to-gray-600/10 border-gray-700/50',
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-12 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: 720,
                opacity: 0,
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                ease: 'easeIn',
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                backgroundColor: ['#ffd700', '#e94560', '#00d4ff', '#39ff14', '#ff6ec7', '#bf5af2'][
                  Math.floor(Math.random() * 6)
                ],
              }}
            />
          ))}
        </div>
      )}

      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-black text-gold glow-text-gold mb-10"
      >
        🏆 最終排名
      </motion.h1>

      <div className="w-full max-w-3xl space-y-3">
        <AnimatePresence>
          {reversed.map((entry, i) => {
            const actualIndex = leaderboard.length - 1 - i;
            const isRevealed = i < revealedCount;

            if (!isRevealed) return null;

            return (
              <motion.div
                key={entry.playerId}
                initial={{ opacity: 0, x: -100, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 bg-gradient-to-r
                  ${rankColors[actualIndex] || rankColors[3]}
                  ${actualIndex === 0 ? 'glow-gold scale-105' : ''}
                `}
              >
                <span className="text-4xl">{rankEmojis[actualIndex]}</span>
                <div className="flex-1">
                  <p className={`text-2xl font-black ${actualIndex === 0 ? 'text-gold' : 'text-white'}`}>
                    {entry.playerName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl text-gold font-bold">🪙 {entry.chips.toLocaleString()}</p>
                  <p className="text-lg text-neon-green font-bold">💰 {entry.prize.toLocaleString()}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
