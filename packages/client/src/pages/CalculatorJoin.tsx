import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCalcStore } from '../stores/calcStore';
import { getSocket } from '../hooks/useSocket';

export default function CalculatorJoin({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [initialChips, setInitialChips] = useState(0);
  const error = useCalcStore((s) => s.error);
  const setPlayerId = useCalcStore((s) => s.setPlayerId);
  const setPlayerName = useCalcStore((s) => s.setPlayerName);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const socket = getSocket();
    setPlayerId(socket.id!);
    setPlayerName(name.trim());
    sessionStorage.setItem('playerName', name.trim());
    socket.emit('joinCalculator', name.trim(), initialChips);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-black text-neon-blue mb-2">🧮 籌碼計算器</h1>
        <p className="text-gray-400">記錄每位玩家的籌碼增減</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm space-y-4"
      >
        <input
          type="text"
          placeholder="輸入暱稱"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={10}
          className="w-full px-4 py-4 bg-secondary border border-gray-700 rounded-xl
            text-white text-lg text-center placeholder-gray-500
            focus:outline-none focus:border-neon-blue transition-colors"
        />

        <div className="space-y-2">
          <p className="text-sm text-gray-400 text-center">初始籌碼（可設 0）</p>
          <input
            type="number"
            min={0}
            step={10}
            value={initialChips}
            onChange={(e) => setInitialChips(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-4 py-3 bg-secondary border border-gray-700 rounded-xl
              text-white text-lg text-center
              focus:outline-none focus:border-neon-blue transition-colors"
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-accent text-center text-sm"
          >
            {error}
          </motion.p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full py-4 rounded-xl text-xl font-bold transition-all
            bg-gradient-to-r from-neon-blue/80 to-blue-600 text-white
            disabled:opacity-40 disabled:cursor-not-allowed
            active:scale-95"
        >
          加入計算器
        </button>

        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl text-base font-bold transition-all
            bg-secondary text-gray-400 border border-gray-600
            hover:border-gray-400 active:scale-95"
        >
          返回首頁
        </button>
      </motion.div>
    </div>
  );
}
