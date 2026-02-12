import { motion } from 'framer-motion';
import type { Player } from '@prize-battle/shared';

interface ChipRankingProps {
  players: Player[];
}

export default function ChipRanking({ players }: ChipRankingProps) {
  const sorted = [...players].sort((a, b) => b.chips - a.chips);

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-gray-400 uppercase tracking-wider">籌碼排行</h3>
      {sorted.map((player, i) => {
        const maxChips = sorted[0]?.chips || 1;
        const barWidth = (player.chips / maxChips) * 100;

        return (
          <div key={player.id} className="flex items-center gap-2">
            <span className="w-6 text-right text-sm text-gray-500">{i + 1}</span>
            <span className="text-lg">{player.avatar}</span>
            <span className="w-20 truncate text-sm font-bold">{player.name}</span>
            <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  i === 0 ? 'bg-gradient-to-r from-gold to-yellow-500' :
                  i === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-300' :
                  i === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-600' :
                  'bg-gradient-to-r from-gray-600 to-gray-500'
                }`}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="w-20 text-right text-sm text-gold font-bold">
              🪙 {player.chips.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
