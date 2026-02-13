import { motion, AnimatePresence } from 'framer-motion';
import { useCalcDisplayStore } from '../stores/calcDisplayStore';

export default function CalcDisplay() {
  const room = useCalcDisplayStore((s) => s.room);
  const transactions = useCalcDisplayStore((s) => s.transactions);

  if (!room) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary">
        <p className="text-2xl text-gray-400">連接中...</p>
      </div>
    );
  }

  const players = room.players.filter((p) => p.isConnected);
  const recentTx = [...transactions].reverse().slice(0, 30);

  const getPlayerName = (id: string) =>
    room.players.find((p) => p.id === id)?.name ?? '???';
  const getPlayerAvatar = (id: string) =>
    room.players.find((p) => p.id === id)?.avatar ?? '❓';

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col p-8 bg-primary">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black text-neon-blue">🧮 籌碼計算器</h1>
        <p className="text-gray-400 mt-1">{players.length} 人在線</p>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Left: Player Cards */}
        <div className="flex-1">
          <h3 className="text-xl text-gray-400 mb-4">玩家籌碼</h3>
          <div className="grid grid-cols-3 gap-4">
            <AnimatePresence>
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="p-6 rounded-2xl border border-gray-700 bg-secondary text-center"
                >
                  <span className="text-4xl">{player.avatar}</span>
                  <p className="font-bold text-lg mt-2">{player.name}</p>
                  <motion.p
                    key={player.chips}
                    initial={{ scale: 1.3, color: '#ffd700' }}
                    animate={{ scale: 1, color: '#ffd700' }}
                    transition={{ duration: 0.3 }}
                    className="text-3xl font-black text-gold mt-2"
                  >
                    🪙 {player.chips}
                  </motion.p>
                </motion.div>
              ))}
            </AnimatePresence>

            {players.length === 0 && (
              <div className="col-span-3 text-center text-gray-500 py-12">
                <p className="text-6xl mb-4">📱</p>
                <p className="text-xl">等待玩家加入...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Transaction History */}
        <div className="w-96 flex flex-col">
          <h3 className="text-xl text-gray-400 mb-4">交易紀錄</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {recentTx.length === 0 ? (
              <p className="text-center text-gray-600 mt-8">尚無紀錄</p>
            ) : (
              <>
                {/* Top-up records */}
                {recentTx.some((tx) => tx.type === 'topup') && (
                  <div>
                    <p className="text-sm font-bold text-green-400 mb-2 flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" />
                      儲值紀錄
                    </p>
                    <div className="space-y-2">
                      {recentTx.filter((tx) => tx.type === 'topup').map((tx) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-green-300">
                              {getPlayerAvatar(tx.fromPlayerId)} {getPlayerName(tx.fromPlayerId)}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-green-400 whitespace-nowrap">
                            +🪙 {tx.amount}
                          </span>
                          <span className="text-xs text-gray-600 whitespace-nowrap">{formatTime(tx.timestamp)}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transfer records */}
                {recentTx.some((tx) => tx.type === 'transfer') && (
                  <div>
                    <p className="text-sm font-bold text-neon-blue mb-2 flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-neon-blue" />
                      轉帳紀錄
                    </p>
                    <div className="space-y-2">
                      {recentTx.filter((tx) => tx.type === 'transfer').map((tx) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-gray-700"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">
                              {getPlayerName(tx.fromPlayerId)}
                              <span className="text-gray-500 font-normal mx-2">→</span>
                              {getPlayerName(tx.targetPlayerId)}
                            </p>
                            {tx.note && <p className="text-xs text-gray-500 truncate">{tx.note}</p>}
                          </div>
                          <span className="text-lg font-bold text-gold whitespace-nowrap">
                            🪙 {tx.amount}
                          </span>
                          <span className="text-xs text-gray-600 whitespace-nowrap">{formatTime(tx.timestamp)}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
