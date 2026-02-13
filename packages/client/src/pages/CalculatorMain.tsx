import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalcStore } from '../stores/calcStore';
import { getSocket } from '../hooks/useSocket';

const AMOUNT_PRESETS = [10, 50, 100, 500];
const TOPUP_PRESETS = [100, 500, 1000, 5000];
const BET_PRESETS = [50, 100, 200, 500];
const MULTIPLIERS = [1, 2, 3];

type Tab = 'transfer' | 'topup' | 'bet' | 'history';

export default function CalculatorMain() {
  const room = useCalcStore((s) => s.room);
  const playerId = useCalcStore((s) => s.playerId);
  const transactions = useCalcStore((s) => s.transactions);
  const betRound = useCalcStore((s) => s.betRound);

  const [tab, setTab] = useState<Tab>('transfer');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [topUpAmount, setTopUpAmount] = useState(0);
  const [note, setNote] = useState('');

  // Bet states
  const [betAmount, setBetAmount] = useState(0);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [multiplier, setMultiplier] = useState(1);

  if (!room) return null;

  const me = room.players.find((p) => p.id === playerId);
  const myChips = me?.chips ?? 0;
  const isHost = room.hostId === playerId;
  const connectedPlayers = room.players.filter((p) => p.isConnected);
  const otherPlayers = connectedPlayers.filter((p) => p.id !== playerId);

  const handleTransfer = () => {
    if (!selectedTarget || amount <= 0) return;
    if (amount > myChips) return;
    getSocket().emit('adjustChips', selectedTarget, amount, note || undefined);
    setAmount(0);
    setNote('');
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleTopUp = () => {
    if (topUpAmount <= 0) return;
    getSocket().emit('topUp', topUpAmount);
    setTopUpAmount(0);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleStartBet = () => {
    getSocket().emit('startCalcBet');
    setTab('bet');
  };

  const handlePlaceBet = () => {
    if (betAmount <= 0) return;
    getSocket().emit('placeCalcBet', betAmount);
  };

  const handleLockBet = () => {
    getSocket().emit('lockCalcBet');
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleResolve = () => {
    if (selectedWinners.length === 0) return;
    getSocket().emit('resolveCalcBet', selectedWinners, multiplier);
    setSelectedWinners([]);
    setMultiplier(1);
    setBetAmount(0);
    if (navigator.vibrate) navigator.vibrate(80);
  };

  const handleCancelBet = () => {
    getSocket().emit('cancelCalcBet');
    setBetAmount(0);
    setSelectedWinners([]);
    setMultiplier(1);
  };

  const toggleWinner = (id: string) => {
    setSelectedWinners((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  };

  const recentTx = [...transactions].reverse().slice(0, 50);
  const topUpTx = recentTx.filter((tx) => tx.type === 'topup');
  const transferTx = recentTx.filter((tx) => tx.type === 'transfer');
  const betTx = recentTx.filter((tx) => tx.type === 'bet_win' || tx.type === 'bet_lose');

  const getPlayerName = (id: string) =>
    room.players.find((p) => p.id === id)?.name ?? '???';

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // Bet round helpers
  const myBet = betRound?.bets[playerId ?? ''] ?? 0;
  const iLocked = betRound?.lockedPlayers.includes(playerId ?? '') ?? false;
  const pot = betRound ? Object.values(betRound.bets).reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-3">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-lg font-bold text-neon-blue">🧮 籌碼計算器</h2>
          {isHost && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold font-bold">房主</span>
          )}
        </div>
        {me && (
          <div className="mt-1">
            <span className="text-sm text-gray-400">{me.avatar} {me.name}</span>
            <p className="text-2xl font-black text-gold">🪙 {me.chips}</p>
            <p className="text-xs text-gray-500">初始預算 {me.buyIn}</p>
          </div>
        )}
        {isHost && (
          <button
            onClick={() => {
              if (confirm('確定要關閉房間？所有人將被踢出。')) {
                getSocket().emit('resetCalculator');
              }
            }}
            className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold
              bg-red-500/10 text-red-400 border border-red-500/30
              active:scale-95 transition-all"
          >
            關閉房間
          </button>
        )}
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1.5 mb-3">
        {([
          { key: 'transfer' as Tab, label: '轉帳', active: 'bg-neon-blue/20 text-neon-blue border-neon-blue/50' },
          { key: 'topup' as Tab, label: '儲值', active: 'bg-green-500/20 text-green-400 border-green-500/50' },
          { key: 'bet' as Tab, label: betRound ? '投注中' : '投注', active: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
          { key: 'history' as Tab, label: `紀錄`, active: 'bg-neon-blue/20 text-neon-blue border-neon-blue/50' },
        ] as const).map(({ key, label, active }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
              tab === key ? active : 'bg-secondary text-gray-400 border-gray-700'
            } ${key === 'bet' && betRound ? 'animate-pulse' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'bet' ? (
        /* Bet UI */
        <div className="flex-1 overflow-y-auto space-y-3">
          {!betRound ? (
            /* No active round */
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="text-4xl">🎲</p>
              <p className="text-gray-400">發起一輪投注，所有人下注後結算</p>
              <button
                onClick={handleStartBet}
                className="px-8 py-4 rounded-xl text-lg font-bold transition-all active:scale-95
                  bg-gradient-to-r from-orange-500/80 to-orange-400 text-white"
              >
                發起投注
              </button>
            </div>
          ) : betRound.status === 'betting' ? (
            /* Betting phase */
            <div className="space-y-3">
              {/* Player bet status */}
              <div>
                <p className="text-xs text-gray-500 mb-2">玩家狀態</p>
                <div className="grid grid-cols-3 gap-2">
                  {connectedPlayers.map((player) => {
                    const hasBet = betRound.bets[player.id] !== undefined;
                    const locked = betRound.lockedPlayers.includes(player.id);
                    return (
                      <div
                        key={player.id}
                        className={`p-2 rounded-xl border text-center text-xs ${
                          locked
                            ? 'border-orange-500/50 bg-orange-500/10'
                            : hasBet
                            ? 'border-gold/50 bg-gold/5'
                            : 'border-gray-700 bg-secondary'
                        }`}
                      >
                        <span className="text-lg">{player.avatar}</span>
                        <p className="font-bold truncate">{player.name}</p>
                        <p className={locked ? 'text-orange-400' : hasBet ? 'text-gold' : 'text-gray-500'}>
                          {locked ? `🔒 ${betRound.bets[player.id]}` : hasBet ? `🪙 ${betRound.bets[player.id]}` : '等待中'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* My bet input (if not locked) */}
              {!iLocked ? (
                myChips <= 0 ? (
                  <div className="text-center py-6">
                    <p className="text-4xl mb-2">🏳️</p>
                    <p className="text-red-400 font-bold">籌碼不足，無法下注</p>
                    <p className="text-gray-500 text-sm mt-1">餘額為 0，請先儲值</p>
                  </div>
                ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">我的下注金額（上限 🪙{myChips}）</p>
                    <div className="grid grid-cols-4 gap-2">
                      {BET_PRESETS.map((val) => (
                        <button
                          key={val}
                          onClick={() => setBetAmount(val)}
                          disabled={val > myChips}
                          className={`py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                            betAmount === val
                              ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400'
                              : val > myChips
                              ? 'bg-secondary border border-gray-700 text-gray-600 opacity-40 cursor-not-allowed'
                              : 'bg-secondary border border-gray-700 text-gray-300'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={myChips}
                    value={betAmount || ''}
                    onChange={(e) => setBetAmount(Math.min(myChips, Math.max(0, parseInt(e.target.value) || 0)))}
                    className={`w-full px-3 py-3 bg-secondary border rounded-xl
                      text-white text-lg text-center
                      focus:outline-none transition-colors ${
                        betAmount > myChips ? 'border-red-500' : 'border-gray-700 focus:border-orange-500'
                      }`}
                    placeholder="自訂金額"
                  />
                  {betAmount > myChips && (
                    <p className="text-red-400 text-xs text-center">超過餘額上限 🪙{myChips}</p>
                  )}
                  <div className="flex gap-2">
                    {!myBet ? (
                      <button
                        onClick={handlePlaceBet}
                        disabled={betAmount <= 0 || betAmount > myChips}
                        className="flex-1 py-3 rounded-xl text-base font-bold transition-all active:scale-95
                          bg-gradient-to-r from-orange-500/80 to-orange-400 text-white
                          disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {betAmount <= 0 ? '輸入金額' : betAmount > myChips ? '超過餘額' : `下注 🪙${betAmount}`}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handlePlaceBet}
                          disabled={betAmount <= 0 || betAmount > myChips}
                          className="flex-1 py-3 rounded-xl text-base font-bold transition-all active:scale-95
                            bg-secondary border border-orange-500/50 text-orange-400
                            disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          改為 🪙{betAmount || '?'}
                        </button>
                        <button
                          onClick={handleLockBet}
                          className="flex-1 py-3 rounded-xl text-base font-bold transition-all active:scale-95
                            bg-gradient-to-r from-orange-500/80 to-orange-400 text-white"
                        >
                          🔒 鎖定
                        </button>
                      </>
                    )}
                  </div>
                </div>
                )
              ) : (
                <div className="text-center py-4">
                  <p className="text-orange-400 font-bold">🔒 已鎖定 — 下注 🪙{myBet}</p>
                  <p className="text-gray-500 text-sm mt-1">等待其他玩家鎖定...</p>
                </div>
              )}

              <button
                onClick={handleCancelBet}
                className="w-full py-2 rounded-xl text-sm font-bold
                  bg-secondary text-gray-400 border border-gray-600
                  active:scale-95"
              >
                取消投注
              </button>
            </div>
          ) : (
            /* Locked phase — resolve */
            <div className="space-y-3">
              <div className="text-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-orange-400 font-bold text-lg">全員已鎖定</p>
                <p className="text-2xl font-black text-gold mt-1">彩池 🪙{pot}</p>
              </div>

              {/* Winner selection */}
              <div>
                <p className="text-xs text-gray-500 mb-2">選擇贏家（可複選 = 均分）</p>
                <div className="grid grid-cols-3 gap-2">
                  {connectedPlayers
                    .filter((p) => betRound.bets[p.id] !== undefined)
                    .map((player) => {
                      const isSelected = selectedWinners.includes(player.id);
                      return (
                        <button
                          key={player.id}
                          onClick={() => toggleWinner(player.id)}
                          className={`p-3 rounded-xl border-2 text-center transition-all active:scale-95 ${
                            isSelected
                              ? 'border-gold bg-gold/10'
                              : 'border-gray-700 bg-secondary'
                          }`}
                        >
                          <span className="text-xl">{player.avatar}</span>
                          <p className="text-xs font-bold mt-1 truncate">{player.name}</p>
                          <p className="text-xs text-gray-400">下注 🪙{betRound.bets[player.id]}</p>
                          {isSelected && <p className="text-xs text-gold font-bold mt-0.5">✓ 贏家</p>}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Multiplier */}
              <div>
                <p className="text-xs text-gray-500 mb-2">倍率</p>
                <div className="flex gap-2">
                  {MULTIPLIERS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMultiplier(m)}
                      className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all active:scale-95 ${
                        multiplier === m
                          ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400'
                          : 'bg-secondary border-2 border-gray-700 text-gray-300'
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {selectedWinners.length > 0 && (
                <div className="p-3 rounded-xl bg-secondary border border-gray-700 text-sm">
                  <p className="text-gray-400 mb-1">結算預覽</p>
                  <p className="text-gold font-bold">
                    每位贏家獲得 🪙{Math.floor((pot * multiplier) / selectedWinners.length)}
                    {multiplier > 1 && <span className="text-orange-400"> ({multiplier}x)</span>}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    贏家：{selectedWinners.map((id) => getPlayerName(id)).join('、')}
                  </p>
                </div>
              )}

              <button
                onClick={handleResolve}
                disabled={selectedWinners.length === 0}
                className="w-full py-4 rounded-xl text-lg font-bold transition-all active:scale-95
                  bg-gradient-to-r from-orange-500/80 to-orange-400 text-white
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selectedWinners.length === 0 ? '請選擇贏家' : '確認結算'}
              </button>

              <button
                onClick={handleCancelBet}
                className="w-full py-2 rounded-xl text-sm font-bold
                  bg-secondary text-gray-400 border border-gray-600
                  active:scale-95"
              >
                取消投注
              </button>
            </div>
          )}
        </div>
      ) : tab === 'history' ? (
        /* Transaction History */
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Bet records */}
          {betTx.length > 0 && (
            <div>
              <p className="text-xs font-bold text-orange-400 mb-1.5 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
                投注紀錄
              </p>
              <div className="space-y-1">
                {betTx.map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                      tx.type === 'bet_win'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <span className="font-bold truncate">{getPlayerName(tx.fromPlayerId)}</span>
                    <span className={`font-bold ml-auto whitespace-nowrap ${
                      tx.type === 'bet_win' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'bet_win' ? '+' : '-'}🪙 {tx.amount}
                    </span>
                    <span className="text-gray-600 text-xs whitespace-nowrap">{formatTime(tx.timestamp)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Top-up section */}
          {topUpTx.length > 0 && (
            <div>
              <p className="text-xs font-bold text-green-400 mb-1.5 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                儲值紀錄
              </p>
              <div className="space-y-1">
                {topUpTx.map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm"
                  >
                    <span className="font-bold truncate text-green-300">{getPlayerName(tx.fromPlayerId)}</span>
                    <span className="text-green-400 font-bold ml-auto whitespace-nowrap">+🪙 {tx.amount}</span>
                    <span className="text-gray-600 text-xs whitespace-nowrap">{formatTime(tx.timestamp)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Transfer section */}
          {transferTx.length > 0 && (
            <div>
              <p className="text-xs font-bold text-neon-blue mb-1.5 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-neon-blue" />
                轉帳紀錄
              </p>
              <div className="space-y-1">
                {transferTx.map((tx) => (
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
                ))}
              </div>
            </div>
          )}

          {recentTx.length === 0 && (
            <p className="text-center text-gray-500 mt-8">尚無紀錄</p>
          )}
        </div>
      ) : tab === 'topup' ? (
        /* Top-up UI */
        <div className="flex-1 overflow-y-auto space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-2">儲值金額</p>
            <div className="grid grid-cols-4 gap-2">
              {TOPUP_PRESETS.map((val) => (
                <button
                  key={val}
                  onClick={() => setTopUpAmount(val)}
                  className={`py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                    topUpAmount === val
                      ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                      : 'bg-secondary border border-gray-700 text-gray-300'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <input
            type="number"
            min={1}
            value={topUpAmount || ''}
            onChange={(e) => setTopUpAmount(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-3 bg-secondary border border-gray-700 rounded-xl
              text-white text-lg text-center
              focus:outline-none focus:border-green-500 transition-colors"
            placeholder="自訂金額"
          />

          <button
            onClick={handleTopUp}
            disabled={topUpAmount <= 0}
            className="w-full py-4 rounded-xl text-lg font-bold transition-all active:scale-95
              bg-gradient-to-r from-green-600/80 to-green-500 text-white
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {topUpAmount <= 0 ? '請輸入金額' : `儲值 +🪙${topUpAmount}`}
          </button>
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
                  <p className="text-[10px] text-gray-500">初始 {player.buyIn}</p>
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
                  max={myChips}
                  value={amount || ''}
                  onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`w-full px-3 py-3 bg-secondary border rounded-xl
                    text-white text-lg text-center
                    focus:outline-none transition-colors ${
                      amount > myChips ? 'border-red-500' : 'border-gray-700 focus:border-gold'
                    }`}
                  placeholder="自訂金額"
                />
                {amount > myChips && (
                  <p className="text-red-400 text-xs text-center">超過餘額上限 🪙{myChips}</p>
                )}

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
                  disabled={amount <= 0 || amount > myChips || myChips <= 0}
                  className="w-full py-4 rounded-xl text-lg font-bold transition-all active:scale-95
                    bg-gradient-to-r from-gold/80 to-yellow-600 text-primary glow-gold
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {myChips <= 0
                    ? '餘額不足'
                    : amount <= 0
                    ? '請輸入金額'
                    : amount > myChips
                    ? '超過餘額'
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
