import { motion } from 'framer-motion';
import { useDisplayStore } from '../stores/displayStore';
import { getBetTypeTitle, getBetTypeDescription, GAME_CONFIG } from '@prize-battle/shared';
import type { DiceAnimationData, RouletteAnimationData, CoinAnimationData, MysteryAnimationData, GroupPredictAnimationData } from '@prize-battle/shared';
import PlayerList from '../components/PlayerList';
import DiceAnimation from '../components/DiceAnimation';
import RouletteWheel from '../components/RouletteWheel';

export default function BettingDisplay() {
  const room = useDisplayStore((s) => s.room);
  const phase = useDisplayStore((s) => s.phase);
  const bettingState = useDisplayStore((s) => s.bettingState);
  const bettingResult = useDisplayStore((s) => s.bettingResult);
  const confirmedBets = useDisplayStore((s) => s.confirmedBets);
  const confirmedRoundReady = useDisplayStore((s) => s.confirmedRoundReady);
  const timeLeft = useDisplayStore((s) => s.timeLeft);

  if (!room) return null;

  // Intro (bettingState not yet available at this phase)
  if (phase === 'betting_intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="text-center"
        >
          <p className="text-[100px]">🎰</p>
          <h1 className="text-6xl font-black text-gold glow-text-gold mt-4">押注預測</h1>
          <p className="text-2xl text-gray-400 mt-4">共 {GAME_CONFIG.TOTAL_BETTING_ROUNDS} 輪，測試你的運氣！</p>
        </motion.div>
      </div>
    );
  }

  // Briefing：每輪開始說明規則，等玩家確認
  if (phase === 'betting_briefing' && bettingState) {
    const readyCount = confirmedRoundReady.size;
    const totalPlayers = room.players.filter((p) => p.isConnected).length;
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-2xl w-full space-y-6"
        >
          <p className="text-gray-400 text-xl">
            第 {bettingState.roundNumber} / {GAME_CONFIG.TOTAL_BETTING_ROUNDS} 輪
          </p>
          <h2 className="text-5xl font-black text-gold glow-text-gold">
            {getBetTypeTitle(bettingState.type)}
          </h2>
          <p className="text-2xl text-gray-300 bg-secondary/80 rounded-2xl p-6 border border-gray-700 leading-relaxed">
            {getBetTypeDescription(bettingState.type)}
          </p>
          <div className="flex items-center justify-center gap-3 text-2xl">
            <span className="text-neon-green font-bold">{readyCount}</span>
            <span className="text-gray-500">/</span>
            <span className="text-gray-400">{totalPlayers}</span>
            <span className="text-gray-400">人已準備</span>
          </div>
          <PlayerList
            players={room.players}
            confirmedActions={confirmedRoundReady}
            showChips
          />
        </motion.div>
      </div>
    );
  }

  if (!bettingState) return null;

  // Reveal / Result with animation
  if ((phase === 'betting_reveal' || phase === 'betting_result') && bettingResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <h2 className="text-3xl font-bold text-gold mb-8">
          {getBetTypeTitle(bettingState.type)} - 第 {bettingState.roundNumber} 輪
        </h2>

        {/* Animation based on type */}
        <div className="mb-8">
          {renderAnimation(bettingState.type, bettingResult.animationData, phase === 'betting_reveal')}
        </div>

        {/* Results */}
        {phase === 'betting_result' && (() => {
          const hasAnyWinner = Object.values(bettingResult.playerResults).some((r) => r.won);
          return (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-3xl"
            >
              {!hasAnyWinner && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-2xl font-bold text-gray-300 mb-4"
                >
                  🤷 沒有贏家 — 籌碼已退回
                </motion.p>
              )}
              <div className="grid grid-cols-4 gap-3">
                {room.players.map((player) => {
                  const result = bettingResult.playerResults[player.id];
                  if (!result) return null;
                  const hasBet = confirmedBets.has(player.id);
                  const noWinnerRefund = hasBet && !hasAnyWinner;

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`p-4 rounded-xl border text-center ${
                        result.won
                          ? 'border-neon-green/50 bg-neon-green/10'
                          : result.payout < 0
                            ? 'border-accent/50 bg-accent/10'
                            : 'border-gray-700 bg-secondary'
                      }`}
                    >
                      <span className="text-2xl">{player.avatar}</span>
                      <p className="font-bold text-sm mt-1">{player.name}</p>
                      <p className={`text-lg font-bold mt-1 ${
                        result.payout > 0 ? 'text-neon-green' :
                        result.payout < 0 ? 'text-accent' : 'text-gray-400'
                      }`}>
                        {noWinnerRefund ? '退回' :
                         result.payout > 0 ? `+${result.payout}` :
                         `${result.payout}`}
                      </p>
                      <p className="text-xs text-gold mt-1">🪙 {result.newChips}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}
      </div>
    );
  }

  // Betting in progress
  const isUrgent = timeLeft <= 5;

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-400 text-lg">
            第 {bettingState.roundNumber} / {GAME_CONFIG.TOTAL_BETTING_ROUNDS} 輪
          </p>
          <h2 className="text-4xl font-black text-gold">
            {getBetTypeTitle(bettingState.type)}
          </h2>
        </div>

        <motion.div
          className={`text-6xl font-black ${isUrgent ? 'text-accent' : 'text-gold'}`}
          animate={isUrgent ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
        >
          {timeLeft}
        </motion.div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-8">
        <motion.div
          className={`h-full rounded-full ${isUrgent ? 'bg-accent' : 'bg-gold'}`}
          animate={{ width: `${(timeLeft / GAME_CONFIG.BETTING_TIME) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex gap-8">
        {/* Options display */}
        <div className="flex-1">
          <h3 className="text-xl text-gray-400 mb-4">選項</h3>
          <div className="grid grid-cols-2 gap-3">
            {bettingState.options
              .filter((o) => !o.id.startsWith('predict_'))
              .map((option) => (
              <div
                key={option.id}
                className="p-4 rounded-xl border border-gray-700 bg-secondary"
              >
                <p className="text-xl font-bold text-white">{option.label}</p>
                {option.odds > 0 && (
                  <p className="text-sm text-neon-blue">賠率 1:{option.odds}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Players status */}
        <div className="w-80">
          <h3 className="text-xl text-gray-400 mb-4">玩家狀態</h3>
          <PlayerList
            players={room.players}
            confirmedActions={confirmedBets}
            showChips
          />
        </div>
      </div>
    </div>
  );
}

function renderAnimation(type: string, data: any, isRevealing: boolean) {
  switch (type) {
    case 'dice_high_low':
    case 'dice_exact': {
      const diceData = data as DiceAnimationData;
      return <DiceAnimation dice={diceData.dice} rolling={isRevealing} />;
    }

    case 'roulette': {
      const rouletteData = data as RouletteAnimationData;
      return (
        <RouletteWheel
          spinning={isRevealing}
          finalAngle={rouletteData.finalAngle}
          winningSegment={rouletteData.winningSegment}
        />
      );
    }

    case 'coin_multiply': {
      const coinData = data as CoinAnimationData;
      return (
        <div className="flex gap-6 justify-center">
          {coinData.flips.map((flip, i) => (
            <motion.div
              key={i}
              initial={{ rotateY: 0 }}
              animate={isRevealing ? { rotateY: [0, 1800] } : { rotateY: 0 }}
              transition={{ duration: 2, delay: i * 0.5 }}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold border-4 ${
                flip === 'heads'
                  ? 'bg-gold/20 border-gold text-gold'
                  : 'bg-gray-700 border-gray-500 text-gray-400'
              }`}
            >
              {isRevealing ? '🪙' : flip === 'heads' ? '正' : '反'}
            </motion.div>
          ))}
        </div>
      );
    }

    case 'mystery_pick': {
      const mysteryData = data as MysteryAnimationData;
      return (
        <div className="flex gap-4 justify-center">
          {mysteryData.boxes.map((box, i) => (
            <motion.div
              key={box.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: isRevealing ? i * 0.3 : 0 }}
              className="w-24 h-24 rounded-xl bg-secondary border-2 border-gold/30 flex flex-col items-center justify-center"
            >
              {!isRevealing ? (
                <>
                  <span className="text-2xl">{box.multiplier >= 3 ? '💎' : box.multiplier >= 1.5 ? '🎁' : box.multiplier >= 1 ? '📭' : '💣'}</span>
                  <span className="text-xs text-gold mt-1">{box.multiplier}x</span>
                </>
              ) : (
                <span className="text-3xl">❓</span>
              )}
            </motion.div>
          ))}
        </div>
      );
    }

    case 'group_predict': {
      const groupData = data as GroupPredictAnimationData;
      return (
        <div className="text-center">
          <div className="flex gap-12 justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <p className="text-6xl font-black text-neon-blue">{groupData.choiceA_count}</p>
              <p className="text-xl text-gray-400">選 A</p>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-6xl font-black text-neon-pink">{groupData.choiceB_count}</p>
              <p className="text-xl text-gray-400">選 B</p>
            </motion.div>
          </div>
          {groupData.closestPlayers.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-neon-green"
            >
              預測最準確：{groupData.closestPlayers.length} 人獲得 bonus！
            </motion.p>
          )}
        </div>
      );
    }

    default:
      return <p className="text-2xl text-gray-400">開獎中...</p>;
  }
}
