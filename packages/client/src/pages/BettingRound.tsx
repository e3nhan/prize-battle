import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../hooks/useSocket';
import { getBetTypeTitle, getMinBet } from '@prize-battle/shared';
import Timer from '../components/Timer';
import ChipDisplay from '../components/ChipDisplay';
import BetSlider from '../components/BetSlider';
import type { BetType } from '@prize-battle/shared';
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

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(100);

  if (!bettingState || !room) return null;

  const me = room.players.find((p) => p.id === playerId);
  const myChips = me?.chips ?? 0;
  const minBet = getMinBet(myChips);

  const handlePlaceBet = () => {
    if (!selectedOption || hasPlacedBet) return;
    getSocket().emit('placeBet', { optionId: selectedOption, amount: betAmount });
    setHasPlacedBet(true);

    // Vibrate on bet
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const myResult = bettingResult?.playerResults[playerId!];

  // Show intro
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

  // Reveal phase
  if (phase === 'betting_reveal') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-center"
        >
          <p className="text-6xl mb-4">🎲</p>
          <h2 className="text-2xl font-bold text-gold">開獎中...</h2>
        </motion.div>
      </div>
    );
  }

  // Betting UI
  const isGroupPredict = bettingState.type === 'group_predict';
  const betOptions = isGroupPredict
    ? bettingState.options.filter((o) => o.id.startsWith('choice_'))
    : bettingState.options;
  const predictOptions = isGroupPredict
    ? bettingState.options.filter((o) => o.id.startsWith('predict_'))
    : [];

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
      {hasPlacedBet ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <p className="text-4xl mb-2">✅</p>
            <p className="text-xl font-bold text-neon-green">已下注</p>
            <p className="text-gray-400 mt-1">等待其他玩家...</p>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {/* Choice buttons */}
          <div className={`grid gap-2 ${betOptions.length <= 3 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {betOptions.map((option) => (
              <motion.button
                key={option.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedOption(option.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedOption === option.id
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
            ))}
          </div>

          {/* Predict options for group predict */}
          {isGroupPredict && selectedOption?.startsWith('choice_') && (
            <div className="mt-3">
              <p className="text-sm text-gray-400 mb-2">預測有幾人選 A？</p>
              <div className="flex flex-wrap gap-2">
                {predictOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      selectedOption === option.id
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-gray-700 bg-secondary text-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bet amount slider */}
          {selectedOption && !isGroupPredict && (
            <BetSlider
              min={minBet}
              max={myChips}
              value={betAmount}
              onChange={setBetAmount}
            />
          )}

          {/* Confirm button */}
          {selectedOption && (
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
