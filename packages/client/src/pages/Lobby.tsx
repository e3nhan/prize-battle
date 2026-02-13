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
    <div className="h-full flex flex-col p-6 overflow-y-auto">
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
      <div className="space-y-2 mb-6">
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
            <div className="p-4 rounded-xl bg-secondary border border-gray-700 text-sm text-gray-300 space-y-3">
              <div>
                <p className="font-bold text-gold mb-1">遊戲目標</p>
                <p>每人起始 🪙{GAME_CONFIG.INITIAL_CHIPS} 籌碼，經過兩階段比拼後，依最終籌碼排名分配獎金池。</p>
              </div>

              <div>
                <p className="font-bold text-gold mb-1">第一階段：押注預測（{GAME_CONFIG.TOTAL_BETTING_ROUNDS} 輪）</p>
                <p className="mb-1">每輪是不同的小遊戲，所有人的下注匯入獎池，猜對的人瓜分全部獎池（零和制：你贏的就是別人輸的）。</p>
                <div className="text-xs text-gray-400 space-y-0.5 ml-2">
                  <p>🎲 骰子猜大小 — 3 顆骰子猜總和大或小，豹子全退</p>
                  <p>🎡 數字輪盤 — 8 格選 1 格，押冷門贏更多</p>
                  <p>🪙 硬幣翻倍 — 丟 3 枚硬幣，挑戰越多枚風險越高、贏的比重越大</p>
                  <p>📦 神秘箱 — 5 盒選 1，倍率 0x～3x，選到炸彈血本無歸</p>
                  <p>🎯 骰子猜點數 — 2 顆骰子猜精確點數或範圍</p>
                  <p>🤔 群體預測 — 選 A/B 再猜幾人選 A，預測最準的瓜分獎池</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-gold mb-1">第二階段：拍賣戰（{GAME_CONFIG.TOTAL_AUCTION_ITEMS} 輪）</p>
                <p className="mb-1">暗標競拍寶箱，最高價者得標（同價流標）。寶箱類型：</p>
                <div className="text-xs text-gray-400 space-y-0.5 ml-2">
                  <p>💎 鑽石 x{GAME_CONFIG.BOX_DISTRIBUTION.diamond} — 從其他人獲得出價 ×2 的籌碼</p>
                  <p>📦 普通 x{GAME_CONFIG.BOX_DISTRIBUTION.normal} — 從其他人獲得出價 30%～60%</p>
                  <p>💀 炸彈 x{GAME_CONFIG.BOX_DISTRIBUTION.bomb} — 損失出價 80% 給其他人</p>
                  <p>🎭 神秘 x{GAME_CONFIG.BOX_DISTRIBUTION.mystery} — 隨機特殊效果（偷竊/交換/重分配等）</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">提示有 30% 機率誤導！最低出價 🪙{GAME_CONFIG.MIN_BID}</p>
              </div>

              <div>
                <p className="font-bold text-gold mb-1">獎金分配</p>
                <p>最終依籌碼排名：第 1 名 {GAME_CONFIG.PRIZE_DISTRIBUTION[0] * 100}%、第 2 名 {GAME_CONFIG.PRIZE_DISTRIBUTION[1] * 100}%、第 3 名 {GAME_CONFIG.PRIZE_DISTRIBUTION[2] * 100}%、第 4 名 {GAME_CONFIG.PRIZE_DISTRIBUTION[3] * 100}%...</p>
              </div>
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
