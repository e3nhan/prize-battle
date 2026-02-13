import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../hooks/useSocket';

export default function Lobby() {
  const room = useGameStore((s) => s.room);
  const countdown = useGameStore((s) => s.countdown);
  const playerId = useGameStore((s) => s.playerId);

  if (!room) return null;

  const me = room.players.find((p) => p.id === playerId);
  const isReady = me?.isReady ?? false;

  const hasBots = room.players.some((p) => p.id.startsWith('bot_'));

  const handleReady = () => {
    getSocket().emit('playerReady');
  };

  const handleUnready = () => {
    getSocket().emit('playerUnready');
  };

  const handleAddBot = () => {
    getSocket().emit('addBots', 1);
  };

  const handleRemoveBots = () => {
    getSocket().emit('removeBots');
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="text-center mb-6">
        <p className="text-xl font-bold text-gold">🎰 獎金爭奪戰</p>
        <p className="text-sm text-gray-500 mt-1">
          {room.players.length} / {room.maxPlayers} 人
        </p>
        <p className="text-base font-bold text-neon-green mt-1">
          🏆 獎金池：{room.players.reduce((sum, p) => sum + p.buyIn, 0)} 元
        </p>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-6">
        {room.players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-4 rounded-xl border ${
              player.id === playerId
                ? 'bg-gold/10 border-gold/30'
                : 'bg-secondary border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{player.avatar}</span>
              <div>
                <span className="font-bold text-lg">
                  {player.name}
                  {player.id === playerId && (
                    <span className="text-gold text-sm ml-2">(你)</span>
                  )}
                </span>
                <p className="text-xs text-gold">💰 {player.buyIn} 元</p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                player.isReady
                  ? 'bg-neon-green/20 text-neon-green'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {player.isReady ? '已準備' : '等待中'}
            </span>
          </motion.div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center justify-center p-4 rounded-xl border border-dashed border-gray-700 text-gray-600"
          >
            等待玩家加入...
          </div>
        ))}
      </div>

      {/* Bot controls */}
      {countdown === null && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleAddBot}
            disabled={room.players.length >= room.maxPlayers}
            className="flex-1 py-2 rounded-lg text-sm font-bold bg-secondary border border-gray-600
              text-gray-300 hover:border-gold hover:text-gold transition-all
              disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            + 電腦玩家
          </button>
          {hasBots && (
            <button
              onClick={handleRemoveBots}
              className="flex-1 py-2 rounded-lg text-sm font-bold bg-secondary border border-gray-600
                text-gray-300 hover:border-accent hover:text-accent transition-all active:scale-95"
            >
              移除電腦
            </button>
          )}
        </div>
      )}

      {/* Countdown or Ready button */}
      {countdown !== null ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <p className="text-gray-400 mb-2">遊戲即將開始</p>
          <motion.p
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-black text-gold"
          >
            {countdown}
          </motion.p>
        </motion.div>
      ) : isReady ? (
        <div className="space-y-2">
          <div className="w-full py-4 rounded-xl text-center text-lg font-bold
            bg-neon-green/20 text-neon-green border border-neon-green/30">
            ✅ 已準備，等待其他玩家
          </div>
          <button
            onClick={handleUnready}
            className="w-full py-3 rounded-xl text-base font-bold transition-all active:scale-95
              bg-secondary text-gray-400 border border-gray-600 hover:border-accent hover:text-accent"
          >
            取消準備
          </button>
        </div>
      ) : (
        <button
          onClick={handleReady}
          className="w-full py-5 rounded-xl text-xl font-bold transition-all active:scale-95
            bg-gradient-to-r from-gold/80 to-yellow-600 text-primary glow-gold"
        >
          準備就緒
        </button>
      )}
    </div>
  );
}
