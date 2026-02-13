import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../hooks/useSocket';

const BUY_IN_PRESETS = [50, 100, 200, 500];

export default function JoinRoom({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState(100);
  const error = useGameStore((s) => s.error);
  const setPlayerId = useGameStore((s) => s.setPlayerId);
  const setPlayerName = useGameStore((s) => s.setPlayerName);

  const handleSubmit = () => {
    if (!name.trim() || buyIn < 10) return;

    const socket = getSocket();
    setPlayerId(socket.id!);
    setPlayerName(name.trim());
    sessionStorage.setItem('playerName', name.trim());
    socket.emit('quickJoin', name.trim(), buyIn);
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

        {/* Buy-in section */}
        <div className="space-y-2">
          <p className="text-sm text-gray-400 text-center">投注金額（元）</p>

          {/* Preset buttons */}
          <div className="grid grid-cols-4 gap-2">
            {BUY_IN_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setBuyIn(preset)}
                className={`py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                  buyIn === preset
                    ? 'bg-gold text-primary'
                    : 'bg-secondary border border-gray-600 text-gray-300 hover:border-gold hover:text-gold'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          <input
            type="number"
            min={10}
            max={99999}
            step={10}
            value={buyIn}
            onChange={(e) => setBuyIn(Math.max(10, parseInt(e.target.value) || 10))}
            className="w-full px-4 py-3 bg-secondary border border-gray-700 rounded-xl
              text-white text-lg text-center
              focus:outline-none focus:border-gold transition-colors"
          />
          <p className="text-xs text-gray-500 text-center">最少 10 元，依最終籌碼比例分配獎金池</p>
        </div>

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
          disabled={!name.trim() || buyIn < 10}
          className="w-full py-4 rounded-xl text-xl font-bold transition-all
            bg-gradient-to-r from-gold/80 to-yellow-600 text-primary
            hover:from-gold hover:to-yellow-500
            disabled:opacity-40 disabled:cursor-not-allowed
            active:scale-95 glow-gold"
        >
          🚀 加入遊戲（投注 {buyIn} 元）
        </button>

        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl text-base font-bold transition-all
            bg-secondary text-gray-400 border border-gray-600
            hover:border-gray-400 active:scale-95"
        >
          返回首頁
        </button>

        <a
          href={import.meta.env.DEV
            ? `${window.location.protocol}//${window.location.hostname}:5174/display/`
            : '/display/'}
          className="block text-center text-gray-500 hover:text-gold transition-colors text-sm mt-2"
        >
          🖥️ 切換至大螢幕投放模式
        </a>
      </motion.div>
    </div>
  );
}
