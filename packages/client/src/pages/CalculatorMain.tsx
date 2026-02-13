import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalcStore } from '../stores/calcStore';
import { getSocket } from '../hooks/useSocket';

const PRESETS = [-500, -100, -50, -10, 10, 50, 100, 500];

export default function CalculatorMain() {
  const room = useCalcStore((s) => s.room);
  const playerId = useCalcStore((s) => s.playerId);
  const transactions = useCalcStore((s) => s.transactions);

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  if (!room) return null;

  const me = room.players.find((p) => p.id === playerId);

  const handleAdjust = () => {
    if (!selectedTarget || amount === 0) return;
    getSocket().emit('adjustChips', selectedTarget, amount, note || undefined);
    setAmount(0);
    setNote('');
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handlePreset = (val: number) => {
    setAmount((prev) => prev + val);
  };

  const recentTx = [...transactions].reverse().slice(0, 50);

  const getPlayerName = (id: string) =>
    room.players.find((p) => p.id === id)?.name ?? '???';
  const getPlayerAvatar = (id: string) =>
    room.players.find((p) => p.id === id)?.avatar ?? '❓';

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-3">
        <h2 className="text-lg font-bold text-neon-blue">🧮 籌碼計算器</h2>
        {me && (
          <p className="text-sm text-gray-400">
            {me.avatar} {me.name} — <span className="text-gold font-bold">🪙 {me.chips}</span>
          </p>
        )}
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setShowHistory(false)}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            !showHistory
              ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50'
              : 'bg-secondary text-gray-400 border border-gray-700'
          }`}
        >
          調整籌碼
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            showHistory
              ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50'
              : 'bg-secondary text-gray-400 border border-gray-700'
          }`}
        >
          紀錄 ({transactions.length})
        </button>
      </div>

      {showHistory ? (
        /* Transaction History */
        <div className="flex-1 overflow-y-auto space-y-1">
          {recentTx.length === 0 ? (
            <p className="text-center text-gray-500 mt-8">尚無紀錄</p>
          ) : (
            recentTx.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-secondary text-sm"
              >
                <span className={`font-bold ${
                  tx.amount > 0 ? 'text-neon-green' : 'text-accent'
                }`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
                <span className="font-bold truncate">{getPlayerName(tx.targetPlayerId)}</span>
                <span className="text-gray-500 text-xs ml-auto whitespace-nowrap">by {getPlayerName(tx.fromPlayerId)}</span>
                {tx.note && <span className="text-gray-600 text-xs truncate max-w-[60px]">· {tx.note}</span>}
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* Adjust UI */
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Player grid */}
          <div>
            <p className="text-xs text-gray-500 mb-2">選擇玩家</p>
            <div className="grid grid-cols-3 gap-2">
              {room.players.filter((p) => p.isConnected).map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedTarget(player.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all active:scale-95 ${
                    selectedTarget === player.id
                      ? 'border-neon-blue bg-neon-blue/10'
                      : 'border-gray-700 bg-secondary'
                  }`}
                >
                  <span className="text-xl">{player.avatar}</span>
                  <p className="text-xs font-bold mt-1 truncate">{player.name}</p>
                  <p className="text-xs text-gold">🪙 {player.chips}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Amount section */}
          <AnimatePresence>
            {selectedTarget && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    調整 <span className="text-white font-bold">{getPlayerName(selectedTarget)}</span> 的籌碼
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESETS.map((val) => (
                      <button
                        key={val}
                        onClick={() => handlePreset(val)}
                        className={`py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                          val > 0
                            ? 'bg-neon-green/10 border border-neon-green/30 text-neon-green'
                            : 'bg-accent/10 border border-accent/30 text-accent'
                        }`}
                      >
                        {val > 0 ? '+' : ''}{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-3 bg-secondary border border-gray-700 rounded-xl
                      text-white text-lg text-center
                      focus:outline-none focus:border-neon-blue transition-colors"
                    placeholder="自訂金額"
                  />
                  <button
                    onClick={() => setAmount(0)}
                    className="px-4 py-3 rounded-xl bg-secondary border border-gray-700
                      text-gray-400 text-sm font-bold active:scale-95"
                  >
                    清除
                  </button>
                </div>

                {/* Note */}
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={20}
                  placeholder="備註（選填）"
                  className="w-full px-3 py-2 bg-secondary border border-gray-700 rounded-xl
                    text-white text-sm placeholder-gray-500
                    focus:outline-none focus:border-neon-blue transition-colors"
                />

                {/* Confirm */}
                <button
                  onClick={handleAdjust}
                  disabled={amount === 0}
                  className={`w-full py-4 rounded-xl text-xl font-bold transition-all active:scale-95
                    disabled:opacity-40 disabled:cursor-not-allowed ${
                    amount > 0
                      ? 'bg-gradient-to-r from-neon-green/80 to-green-600 text-primary'
                      : amount < 0
                        ? 'bg-gradient-to-r from-accent/80 to-red-700 text-white'
                        : 'bg-secondary text-gray-500 border border-gray-700'
                  }`}
                >
                  {amount === 0
                    ? '請輸入金額'
                    : `${getPlayerName(selectedTarget)} ${amount > 0 ? '+' : ''}${amount}`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
