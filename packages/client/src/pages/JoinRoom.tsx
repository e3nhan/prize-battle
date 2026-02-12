import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../hooks/useSocket';

export default function JoinRoom() {
  const [name, setName] = useState('');
  const error = useGameStore((s) => s.error);
  const setPlayerId = useGameStore((s) => s.setPlayerId);
  const setPlayerName = useGameStore((s) => s.setPlayerName);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const socket = getSocket();
    setPlayerId(socket.id!);
    setPlayerName(name.trim());
    socket.emit('quickJoin', name.trim());
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-black text-gold mb-2">🎰 獎金爭奪戰</h1>
        <p className="text-gray-400">Prize Battle</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm space-y-4"
      >
        {/* Name input */}
        <input
          type="text"
          placeholder="輸入暱稱"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={10}
          className="w-full px-4 py-4 bg-secondary border border-gray-700 rounded-xl
            text-white text-lg text-center placeholder-gray-500
            focus:outline-none focus:border-gold transition-colors"
        />

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-accent text-center text-sm"
          >
            {error}
          </motion.p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full py-4 rounded-xl text-xl font-bold transition-all
            bg-gradient-to-r from-gold/80 to-yellow-600 text-primary
            hover:from-gold hover:to-yellow-500
            disabled:opacity-40 disabled:cursor-not-allowed
            active:scale-95 glow-gold"
        >
          🚀 加入遊戲
        </button>
      </motion.div>
    </div>
  );
}
