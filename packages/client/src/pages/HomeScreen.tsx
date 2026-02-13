import { motion } from 'framer-motion';

interface HomeScreenProps {
  onSelectMode: (mode: 'game' | 'calculator') => void;
}

export default function HomeScreen({ onSelectMode }: HomeScreenProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
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
        <button
          onClick={() => onSelectMode('game')}
          className="w-full py-6 rounded-xl text-xl font-bold transition-all active:scale-95
            bg-gradient-to-r from-gold/80 to-yellow-600 text-primary glow-gold"
        >
          🎮 開始遊戲
        </button>

        <button
          onClick={() => onSelectMode('calculator')}
          className="w-full py-6 rounded-xl text-xl font-bold transition-all active:scale-95
            bg-secondary border-2 border-neon-blue/50 text-neon-blue
            hover:bg-neon-blue/10"
        >
          🧮 籌碼計算器
        </button>
      </motion.div>
    </div>
  );
}
