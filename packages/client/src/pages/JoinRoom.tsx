import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../hooks/useSocket';

export default function JoinRoom() {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const error = useGameStore((s) => s.error);
  const setPlayerId = useGameStore((s) => s.setPlayerId);
  const setPlayerName = useGameStore((s) => s.setPlayerName);

  // Check URL for room ID
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');
    if (rid) {
      setRoomId(rid.toUpperCase());
      setMode('join');
    }
  });

  const handleSubmit = () => {
    if (!name.trim()) return;

    const socket = getSocket();
    setPlayerId(socket.id!);
    setPlayerName(name.trim());

    if (mode === 'create') {
      socket.emit('createRoom', name.trim());
    } else {
      if (!roomId.trim()) return;
      socket.emit('joinRoom', roomId.trim().toUpperCase(), name.trim());
    }
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
        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-700">
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-3 font-bold transition-all ${
              mode === 'join'
                ? 'bg-gold text-primary'
                : 'bg-secondary text-gray-400'
            }`}
          >
            加入房間
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-3 font-bold transition-all ${
              mode === 'create'
                ? 'bg-gold text-primary'
                : 'bg-secondary text-gray-400'
            }`}
          >
            建立房間
          </button>
        </div>

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

        {/* Room code input */}
        {mode === 'join' && (
          <input
            type="text"
            placeholder="輸入房間碼"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full px-4 py-4 bg-secondary border border-gray-700 rounded-xl
              text-white text-lg text-center tracking-[0.3em] placeholder-gray-500 uppercase
              focus:outline-none focus:border-gold transition-colors"
          />
        )}

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
          disabled={!name.trim() || (mode === 'join' && !roomId.trim())}
          className="w-full py-4 rounded-xl text-xl font-bold transition-all
            bg-gradient-to-r from-gold/80 to-yellow-600 text-primary
            hover:from-gold hover:to-yellow-500
            disabled:opacity-40 disabled:cursor-not-allowed
            active:scale-95 glow-gold"
        >
          {mode === 'create' ? '🎲 建立房間' : '🚀 加入遊戲'}
        </button>
      </motion.div>
    </div>
  );
}
