import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalcStore } from '../stores/calcStore';
import { getSocket } from '../hooks/useSocket';

const AMOUNT_PRESETS = [10, 50, 100, 500];

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
  const otherPlayers = room.players.filter((p) => p.isConnected && p.id !== playerId);

  const handleTransfer = () => {
    if (!selectedTarget || amount <= 0) return;
    getSocket().emit('adjustChips', selectedTarget, amount, note || undefined);
    setAmount(0);
    setNote('');
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const recentTx = [...transactions].reverse().slice(0, 50);

  const getPlayerName = (id: string) =>
    room.players.find((p) => p.id === id)?.name ?? '???';

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-3">
        <h2 className="text-lg font-bold text-neon-blue">🧮 籌碼計算器</h2>
        {me && (
          <div className="mt-1">
            <span className="text-sm text-gray-400">{me.avatar} {me.name}</span>
            <p className="text-2xl font-black text-gold">🪙 {me.chips}</p>
          </div>
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
          轉帳
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
                <span className="font-bold truncate">{getPlayerName(tx.fromPlayerId)}</span>
                <span className="text-gray-500">→</span>
                <span className="font-bold truncate">{getPlayerName(tx.targetPlayerId)}</span>
                <span className="text-gold font-bold ml-auto whitespace-nowrap">🪙 {tx.amount}</span>
                {tx.note && <span className="text-gray-600 text-xs truncate max-w-[50px]">· {tx.note}</span>}
                <span className="text-gray-600 text-xs whitespace-nowrap">{formatTime(tx.timestamp)}</span>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* Transfer UI */
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Target player grid */}
          <div>
            <p className="text-xs text-gray-500 mb-2">轉給誰？</p>
            <div className="grid grid-cols-3 gap-2">
              {otherPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedTarget(player.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all active:scale-95 ${
                    selectedTarget === player.id
                      ? 'border-gold bg-gold/10'
                      : 'border-gray-700 bg-secondary'
                  }`}
                >
                  <span className="text-xl">{player.avatar}</span>
                  <p className="text-xs font-bold mt-1 truncate">{player.name}</p>
                  <p className="text-xs text-gold">🪙 {player.chips}</p>
                </button>
              ))}
              {otherPlayers.length === 0 && (
                <p className="col-span-3 text-center text-gray-500 py-4">等待其他玩家加入...</p>
              )}
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
                  <p className="text-xs text-gray-500 mb-2">轉帳金額</p>
                  <div className="grid grid-cols-4 gap-2">
                    {AMOUNT_PRESETS.map((val) => (
                      <button
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                          amount === val
                            ? 'bg-gold/20 border border-gold/50 text-gold'
                            : 'bg-secondary border border-gray-700 text-gray-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <input
                  type="number"
                  min={1}
                  value={amount || ''}
                  onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-3 bg-secondary border border-gray-700 rounded-xl
                    text-white text-lg text-center
                    focus:outline-none focus:border-gold transition-colors"
                  placeholder="自訂金額"
                />

                {/* Note */}
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={20}
                  placeholder="備註（選填）"
                  className="w-full px-3 py-2 bg-secondary border border-gray-700 rounded-xl
                    text-white text-sm placeholder-gray-500
                    focus:outline-none focus:border-gold transition-colors"
                />

                {/* Transfer summary + confirm */}
                <button
                  onClick={handleTransfer}
                  disabled={amount <= 0}
                  className="w-full py-4 rounded-xl text-lg font-bold transition-all active:scale-95
                    bg-gradient-to-r from-gold/80 to-yellow-600 text-primary glow-gold
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {amount <= 0
                    ? '請輸入金額'
                    : `轉 🪙${amount} 給 ${getPlayerName(selectedTarget)}`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
