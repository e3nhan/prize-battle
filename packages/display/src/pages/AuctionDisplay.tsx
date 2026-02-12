import { motion } from 'framer-motion';
import { useDisplayStore } from '../stores/displayStore';
import { GAME_CONFIG } from '@prize-battle/shared';
import PlayerList from '../components/PlayerList';
import ChipRanking from '../components/ChipRanking';
import BoxOpening from '../components/BoxOpening';

export default function AuctionDisplay() {
  const room = useDisplayStore((s) => s.room);
  const phase = useDisplayStore((s) => s.phase);
  const auctionState = useDisplayStore((s) => s.auctionState);
  const auctionResult = useDisplayStore((s) => s.auctionResult);
  const confirmedBids = useDisplayStore((s) => s.confirmedBids);
  const timeLeft = useDisplayStore((s) => s.timeLeft);

  if (!room || !auctionState) return null;

  // Intro
  if (phase === 'auction_intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="text-center"
        >
          <p className="text-[100px]">📦</p>
          <h1 className="text-6xl font-black text-gold glow-text-gold mt-4">拍賣戰</h1>
          <p className="text-2xl text-gray-400 mt-4">共 {GAME_CONFIG.TOTAL_AUCTION_ITEMS} 個寶箱，暗標出價！</p>
          <p className="text-xl text-gray-500 mt-2">💎鑽石 x1 · 📦普通 x2 · 💀炸彈 x2 · 🎭神秘 x1</p>
        </motion.div>
      </div>
    );
  }

  // Reveal / Opening
  if ((phase === 'auction_reveal' || phase === 'auction_result') && auctionResult) {
    return (
      <div className="h-full flex flex-col p-8">
        <h2 className="text-3xl font-bold text-gold text-center mb-6">
          {auctionState.currentBox.displayName}
        </h2>

        {/* Bid reveal */}
        {phase === 'auction_reveal' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            {/* Show all bids sorted */}
            <div className="flex gap-4 flex-wrap justify-center">
              {Object.entries(auctionResult.playerChipsAfter)
                .map(([playerId]) => {
                  const player = room.players.find((p) => p.id === playerId);
                  const bid = auctionState.playerBids[playerId] ?? 0;
                  return { player, bid, playerId };
                })
                .filter((b) => b.player)
                .sort((a, b) => a.bid - b.bid)
                .map(({ player, bid, playerId }, i) => (
                  <motion.div
                    key={playerId}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className={`p-4 rounded-xl border text-center min-w-[120px] ${
                      playerId === auctionResult.winnerId
                        ? 'border-gold bg-gold/10 scale-110'
                        : bid === 0
                          ? 'border-gray-700 bg-gray-800/50 opacity-50'
                          : 'border-gray-700 bg-secondary'
                    }`}
                  >
                    <span className="text-2xl">{player!.avatar}</span>
                    <p className="font-bold text-sm mt-1">{player!.name}</p>
                    <p className={`text-xl font-bold mt-2 ${
                      playerId === auctionResult.winnerId ? 'text-gold' :
                      bid === 0 ? 'text-gray-600' : 'text-white'
                    }`}>
                      {bid === 0 ? '放棄' : `🪙 ${bid}`}
                    </p>
                  </motion.div>
                ))}
            </div>

            {auctionResult.winnerId === null && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold text-gray-400"
              >
                流標！同分或無人出價
              </motion.p>
            )}

            {auctionResult.winnerId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <BoxOpening result={auctionResult} />
              </motion.div>
            )}
          </div>
        )}

        {/* Result with chip ranking */}
        {phase === 'auction_result' && (
          <div className="flex-1 flex gap-8">
            <div className="flex-1 flex items-center justify-center">
              <BoxOpening result={auctionResult} />
            </div>
            <div className="w-96">
              <ChipRanking players={room.players} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Auction in progress
  const isUrgent = timeLeft <= 5;

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-400 text-lg">
            寶箱 {auctionState.roundNumber} / {GAME_CONFIG.TOTAL_AUCTION_ITEMS}
            {auctionState.remainingBoxes > 0 && ` · 剩餘 ${auctionState.remainingBoxes} 個`}
          </p>
          <h2 className="text-4xl font-black text-gold">暗標出價中</h2>
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
          animate={{ width: `${(timeLeft / GAME_CONFIG.AUCTION_TIME) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex gap-8">
        {/* Box display */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center"
          >
            <span className="text-[120px]">📦</span>
            <h3 className="text-3xl font-bold text-gold mt-4">
              {auctionState.currentBox.displayName}
            </h3>
            <p className="text-xl text-gray-400 mt-2 italic">
              「{auctionState.currentBox.hint}」
            </p>
          </motion.div>
        </div>

        {/* Players */}
        <div className="w-80">
          <h3 className="text-xl text-gray-400 mb-4">出價狀態</h3>
          <PlayerList
            players={room.players}
            confirmedActions={confirmedBids}
            showChips
          />
        </div>
      </div>
    </div>
  );
}
