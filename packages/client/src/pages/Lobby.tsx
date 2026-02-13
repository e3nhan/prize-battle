import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../hooks/useSocket';
import { GAME_CONFIG } from '@prize-battle/shared';

export default function Lobby() {
  const room = useGameStore((s) => s.room);
  const countdown = useGameStore((s) => s.countdown);
  const playerId = useGameStore((s) => s.playerId);

  if (!room) return null;

  const me = room.players.find((p) => p.id === playerId);
  const isReady = me?.isReady ?? false;

  const hasBots = room.players.some((p) => p.id.startsWith('bot_'));
  const [showRules, setShowRules] = useState(false);
  const [showPrizeInfo, setShowPrizeInfo] = useState(false);
  const totalPrize = room.players.reduce((sum, p) => sum + p.buyIn, 0);

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
          🏆 獎金池：{totalPrize} 元
          <button
            onClick={() => setShowPrizeInfo(!showPrizeInfo)}
            className="ml-1 text-xs text-gray-500 hover:text-gold transition-colors"
          >
            ⓘ
          </button>
        </p>
        <AnimatePresence>
          {showPrizeInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 px-3 py-2 rounded-lg bg-secondary border border-gray-700 text-xs text-gray-400 space-y-1">
                {GAME_CONFIG.PRIZE_DISTRIBUTION.slice(0, room.players.length || 4).map((pct, i) => (
                  <div key={i} className="flex justify-between">
                    <span>第{i + 1}名</span>
                    <span className="text-gold">{Math.round(pct * 100)}% = {Math.round(totalPrize * pct)} 元</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* 遊戲規則 */}
      <button
        onClick={() => setShowRules(!showRules)}
        className="w-full py-2 mb-3 rounded-lg text-sm font-bold bg-secondary border border-gray-600
          text-gray-400 hover:text-gold hover:border-gold transition-all active:scale-95"
      >
        {showRules ? '收起規則 ▲' : '遊戲規則 ▼'}
      </button>
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="p-4 rounded-xl bg-secondary border border-gray-700 text-sm text-gray-300 space-y-2">
              <p className="font-bold text-gold">遊戲流程</p>
              <p>1. 押注預測（{GAME_CONFIG.TOTAL_BETTING_ROUNDS} 輪）：骰子、輪盤、硬幣等小遊戲，選擇下注贏取籌碼。</p>
              <p>2. 拍賣戰（{GAME_CONFIG.TOTAL_AUCTION_ITEMS} 輪）：暗標競拍寶箱，可能是鑽石（大獎）、普通、炸彈（虧損）或神秘箱。</p>
              <p className="font-bold text-gold mt-2">獎金分配</p>
              <p>最終依籌碼排名分配獎金池：第1名 {GAME_CONFIG.PRIZE_DISTRIBUTION[0] * 100}%、第2名 {GAME_CONFIG.PRIZE_DISTRIBUTION[1] * 100}%、第3名 {GAME_CONFIG.PRIZE_DISTRIBUTION[2] * 100}%...</p>
              <p className="text-gray-500 text-xs mt-1">初始籌碼：🪙{GAME_CONFIG.INITIAL_CHIPS}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
