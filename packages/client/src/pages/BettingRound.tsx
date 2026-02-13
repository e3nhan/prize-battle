import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../hooks/useSocket';
import { getBetTypeTitle, getBetTypeDescription, getMinBet } from '@prize-battle/shared';
import Timer from '../components/Timer';
import ChipDisplay from '../components/ChipDisplay';
import BetSlider from '../components/BetSlider';
import { GAME_CONFIG } from '@prize-battle/shared';

export default function BettingRound() {
  const bettingState = useGameStore((s) => s.bettingState);
  const bettingResult = useGameStore((s) => s.bettingResult);
  const phase = useGameStore((s) => s.phase);
  const timeLeft = useGameStore((s) => s.timeLeft);
  const room = useGameStore((s) => s.room);
  const playerId = useGameStore((s) => s.playerId);
  const hasPlacedBet = useGameStore((s) => s.hasPlacedBet);
  const setHasPlacedBet = useGameStore((s) => s.setHasPlacedBet);
  const confirmedBets = useGameStore((s) => s.confirmedBets);
  const confirmedRoundReady = useGameStore((s) => s.confirmedRoundReady);
  const hasConfirmedRound = useGameStore((s) => s.hasConfirmedRound);
  const setHasConfirmedRound = useGameStore((s) => s.setHasConfirmedRound);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null); // group_predict A/B
  const [betAmount, setBetAmount] = useState(100);

  // 每輪開始時重置選擇狀態，避免舊選擇殘留到下一輪
  useEffect(() => {
    setSelectedOption(null);
    setSelectedChoice(null);
  }, [bettingState?.roundNumber]);

  // Show intro (no bettingState needed)
  if (phase === 'betting_intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <p className="text-6xl mb-4">🎰</p>
          <h2 className="text-3xl font-black text-gold mb-2">押注預測</h2>
          <p className="text-gray-400">共 {GAME_CONFIG.TOTAL_BETTING_ROUNDS} 輪，考驗你的運氣和判斷！</p>
        </motion.div>
      </div>
    );
  }

  // Briefing：每輪開始說明規則，等所有玩家確認（移到 null guard 前，避免 bettingState 還沒到就被擋住）
  if (phase === 'betting_briefing') {
    const totalPlayers = room?.players.filter((p) => p.isConnected).length ?? 0;
    const myChipsNow = room?.players.find((p) => p.id === playerId)?.chips ?? 0;
    const readyCount = confirmedRoundReady.size;
    const handleReady = () => {
      if (hasConfirmedRound) return;
      getSocket().emit('roundReady');
      setHasConfirmedRound(true);
      if (navigator.vibrate) navigator.vibrate(50);
    };
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center space-y-4"
        >
          <p className="text-sm text-gray-500">第 {bettingState?.roundNumber ?? '?'} / {GAME_CONFIG.TOTAL_BETTING_ROUNDS} 輪</p>
          <h2 className="text-2xl font-black text-gold">{bettingState ? getBetTypeTitle(bettingState.type) : '準備中...'}</h2>
          {bettingState && (
            <p className="text-gray-300 text-base leading-relaxed bg-secondary rounded-xl p-4 border border-gray-700">
              {getBetTypeDescription(bettingState.type)}
            </p>
          )}
          <ChipDisplay amount={myChipsNow} size="sm" />

          {hasConfirmedRound ? (
            <div className="text-center">
              <p className="text-xl font-bold text-neon-green">✅ 已準備</p>
              <p className="text-gray-400 text-sm mt-1">等待其他玩家... ({readyCount}/{totalPlayers})</p>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleReady}
              className="w-full py-4 rounded-xl text-xl font-bold
                bg-gradient-to-r from-gold/80 to-yellow-600 text-primary
                active:scale-95 glow-gold"
            >
              準備好了！
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  if (!bettingState || !room) return null;

  const isGroupPredict = bettingState.type === 'group_predict';
  const me = room.players.find((p) => p.id === playerId);
  const myChips = me?.chips ?? 0;
  const minBet = getMinBet(myChips);
  const totalPlayers = room.players.filter((p) => p.isConnected).length;

  const handlePlaceBet = () => {
    if (!selectedOption || hasPlacedBet) return;
    // group_predict: optionId = predict_N, choiceId = choice_A/B
    const payload = isGroupPredict && selectedChoice
      ? { optionId: selectedOption, amount: betAmount, choiceId: selectedChoice }
      : { optionId: selectedOption, amount: betAmount };
    getSocket().emit('placeBet', payload);
    setHasPlacedBet(true);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const myResult = bettingResult?.playerResults[playerId!];

  // Show result
  if (phase === 'betting_result' && myResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          {myResult.won ? (
            <>
              <p className="text-6xl mb-4">🎉</p>
              <h2 className="text-3xl font-black text-neon-green mb-2">贏了！</h2>
              <p className="text-2xl text-gold">+{myResult.payout} 籌碼</p>
            </>
          ) : hasPlacedBet ? (
            <>
              <p className="text-6xl mb-4">😢</p>
              <h2 className="text-3xl font-black text-accent mb-2">輸了</h2>
              <p className="text-2xl text-gray-400">{myResult.payout} 籌碼</p>
            </>
          ) : (
            <>
              <p className="text-6xl mb-4">⏭️</p>
              <h2 className="text-3xl font-black text-gray-400 mb-2">棄權</h2>
            </>
          )}
          <ChipDisplay amount={myResult.newChips} size="lg" />
        </motion.div>
      </div>
    );
  }

  // Reveal phase — show type-specific animation + result when available
  if (phase === 'betting_reveal') {
    const isDice = bettingState.type === 'dice_high_low' || bettingState.type === 'dice_exact';
    const diceResult = bettingResult?.animationData as { dice?: number[] } | undefined;
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        {isDice && diceResult?.dice ? (
          <ClientDiceReveal dice={diceResult.dice} />
        ) : bettingResult ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <p className="text-6xl mb-4">{getRevealEmoji(bettingState.type)}</p>
            <h2 className="text-2xl font-bold text-gold">揭曉結果！</h2>
          </motion.div>
        ) : (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-center"
          >
            <p className="text-6xl mb-4">{getRevealEmoji(bettingState.type)}</p>
            <h2 className="text-2xl font-bold text-gold">開獎中...</h2>
          </motion.div>
        )}
      </div>
    );
  }

  // Betting UI
  const betOptions = isGroupPredict
    ? bettingState.options.filter((o) => o.id.startsWith('choice_'))
    : bettingState.options;
  const predictOptions = isGroupPredict
    ? bettingState.options.filter((o) => o.id.startsWith('predict_'))
    : [];

  // group_predict: 需要 A/B + 預測人數都選齊才能送出
  const canConfirm = isGroupPredict
    ? !!(selectedChoice && selectedOption)
    : !!selectedOption;

  const confirmedCount = confirmedBets.size;

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-3">
        <p className="text-sm text-gray-400">
          第 {bettingState.roundNumber} / {GAME_CONFIG.TOTAL_BETTING_ROUNDS} 輪
        </p>
        <h2 className="text-xl font-bold text-gold">
          {getBetTypeTitle(bettingState.type)}
        </h2>
        <ChipDisplay amount={myChips} size="sm" />
      </div>

      {/* Timer */}
      <Timer seconds={timeLeft} total={GAME_CONFIG.BETTING_TIME} />

      {/* Options */}
      {myChips === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-2">🏳️</p>
            <p className="text-xl font-bold text-gray-500">籌碼歸零</p>
            <p className="text-gray-600 text-sm mt-1">本輪自動跳過</p>
          </div>
        </div>
      ) : hasPlacedBet ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <p className="text-4xl mb-2">✅</p>
            <p className="text-xl font-bold text-neon-green">已下注</p>
            <p className="text-gray-400 mt-1">
              等待其他玩家... ({confirmedCount}/{totalPlayers})
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {/* Choice buttons */}
          <div className={`grid gap-2 ${betOptions.length <= 3 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {betOptions.map((option) => {
              // group_predict 的 A/B 按鈕用 selectedChoice，其他用 selectedOption
              const isSelected = isGroupPredict
                ? selectedChoice === option.id
                : selectedOption === option.id;
              return (
                <motion.button
                  key={option.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (isGroupPredict) {
                      setSelectedChoice(option.id);
                    } else {
                      setSelectedOption(option.id);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-gray-700 bg-secondary text-white hover:border-gray-500'
                  }`}
                >
                  <p className="font-bold text-lg">{option.label}</p>
                  {option.description && (
                    <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                  )}
                  {option.odds > 0 && (
                    <p className="text-sm text-neon-blue mt-1">賠率 1:{option.odds}</p>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Predict options for group predict — 選完 A/B 才顯示 */}
          {isGroupPredict && selectedChoice && (
            <div className="mt-3">
              <p className="text-sm text-gray-400 mb-2">
                你選了 <span className="text-gold font-bold">
                  {selectedChoice === 'choice_A' ? 'A' : 'B'}
                </span>，預測有幾人選 A？
              </p>
              <div className="flex flex-wrap gap-2">
                {predictOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      selectedOption === option.id
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-gray-700 bg-secondary text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bet amount slider — group_predict 不需要押注金額 */}
          {selectedOption && !isGroupPredict && (
            <BetSlider
              min={minBet}
              max={myChips}
              value={betAmount}
              onChange={setBetAmount}
            />
          )}

          {/* Confirm button */}
          {canConfirm && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlaceBet}
              className="w-full py-4 rounded-xl text-xl font-bold transition-all
                bg-gradient-to-r from-gold/80 to-yellow-600 text-primary
                active:scale-95 glow-gold"
            >
              {isGroupPredict ? '確認選擇' : `確認下注 🪙${betAmount}`}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Helper components for reveal phase ---

function getRevealEmoji(type: string): string {
  switch (type) {
    case 'dice_high_low':
    case 'dice_exact':
      return '🎲';
    case 'roulette':
      return '🎰';
    case 'coin_multiply':
      return '🪙';
    case 'mystery_pick':
      return '🎁';
    case 'group_predict':
      return '🔮';
    default:
      return '🎲';
  }
}

// Mini dice dot-pattern for client reveal
function MiniDiceFace({ value }: { value: number }) {
  const size = 56;
  const dotSize = 10;
  const pad = 13;
  const mid = size / 2;

  const dotPositions: Record<number, [number, number][]> = {
    1: [[mid, mid]],
    2: [[pad, size - pad], [size - pad, pad]],
    3: [[pad, size - pad], [mid, mid], [size - pad, pad]],
    4: [[pad, pad], [pad, size - pad], [size - pad, pad], [size - pad, size - pad]],
    5: [[pad, pad], [pad, size - pad], [mid, mid], [size - pad, pad], [size - pad, size - pad]],
    6: [[pad, pad], [pad, mid], [pad, size - pad], [size - pad, pad], [size - pad, mid], [size - pad, size - pad]],
  };

  const dots = dotPositions[value] || [];

  return (
    <div
      className="relative rounded-xl bg-gradient-to-br from-white to-gray-100"
      style={{
        width: size,
        height: size,
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {dots.map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            left: x - dotSize / 2,
            top: y - dotSize / 2,
            background: 'radial-gradient(circle at 35% 35%, #444, #111)',
          }}
        />
      ))}
    </div>
  );
}

function ClientDiceReveal({ dice }: { dice: number[] }) {
  const [displayDice, setDisplayDice] = useState(dice.map(() => 1));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const total = 20;
    const iv = setInterval(() => {
      frame++;
      if (frame < total) {
        setDisplayDice(dice.map(() => Math.floor(Math.random() * 6) + 1));
      } else {
        setDisplayDice(dice);
        setSettled(true);
        clearInterval(iv);
      }
    }, 80);
    return () => clearInterval(iv);
  }, [dice]);

  const sum = dice.reduce((a, b) => a + b, 0);
  const isTriple = dice.length >= 3 && dice.every((d) => d === dice[0]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-3">
        {displayDice.map((d, i) => (
          <motion.div
            key={i}
            animate={
              settled
                ? { y: [0, -12, 0], scale: [0.95, 1.08, 1] }
                : { y: [0, -8, 0], rotateZ: [0, -8, 8, 0] }
            }
            transition={
              settled
                ? { duration: 0.4, delay: i * 0.1 }
                : { duration: 0.3, repeat: Infinity, delay: i * 0.08 }
            }
          >
            <MiniDiceFace value={d} />
          </motion.div>
        ))}
      </div>

      {settled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {isTriple ? (
            <p className="text-2xl font-black text-accent">豹子！</p>
          ) : (
            <>
              <p className="text-4xl font-black text-gold">{sum}</p>
              <p className="text-lg font-bold mt-1">
                {sum >= 11 ? (
                  <span className="text-neon-blue">大！</span>
                ) : (
                  <span className="text-neon-pink">小！</span>
                )}
              </p>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
