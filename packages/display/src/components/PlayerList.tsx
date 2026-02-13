import { motion } from 'framer-motion';
import type { Player } from '@prize-battle/shared';

interface PlayerListProps {
  players: Player[];
  confirmedActions?: Set<string>;
  showChips?: boolean;
  showBuyIn?: boolean;
}

export default function PlayerList({ players, confirmedActions, showChips = false, showBuyIn = false }: PlayerListProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {players.map((player, i) => (
        <motion.div
          key={player.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className={`relative p-4 rounded-xl border text-center transition-all ${
            !player.isConnected
              ? 'border-gray-700 bg-gray-800/50 opacity-50'
              : confirmedActions?.has(player.id)
                ? 'border-neon-green/50 bg-neon-green/10'
                : 'border-gray-700 bg-secondary'
          }`}
        >
          <span className="text-3xl">{player.avatar}</span>
          <p className="font-bold text-sm mt-1 truncate">{player.name}</p>
          {showChips && (
            <p className="text-gold text-xs mt-1">🪙 {player.chips.toLocaleString()}</p>
          )}
          {showBuyIn && (
            <p className="text-neon-green text-xs mt-1">💰 {player.buyIn} 元</p>
          )}
          {confirmedActions?.has(player.id) && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-neon-green rounded-full flex items-center justify-center text-xs"
            >
              ✓
            </motion.div>
          )}
          {!player.isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
              <span className="text-gray-400 text-xs">斷線</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
