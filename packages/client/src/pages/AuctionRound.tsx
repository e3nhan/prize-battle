import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../hooks/useSocket';
import { GAME_CONFIG } from '@prize-battle/shared';
import Timer from '../components/Timer';
import ChipDisplay from '../components/ChipDisplay';
import BidInput from '../components/BidInput';

export default function AuctionRound() {
  const auctionState = useGameStore((s) => s.auctionState);
  const auctionResult = useGameStore((s) => s.auctionResult);
  const phase = useGameStore((s) => s.phase);
  const timeLeft = useGameStore((s) => s.timeLeft);
  const room = useGameStore((s) => s.room);
  const playerId = useGameStore((s) => s.playerId);
  const hasSubmittedBid = useGameStore((s) => s.hasSubmittedBid);
  const setHasSubmittedBid = useGameStore((s) => s.setHasSubmittedBid);
  const confirmedBids = useGameStore((s) => s.confirmedBids);
  const chipsBeforeAuction = useGameStore((s) => s.chipsBeforeAuction);
  const confirmedRoundReady = useGameStore((s) => s.confirmedRoundReady);
  const hasConfirmedRound = useGameStore((s) => s.hasConfirmedRound);
  const setHasConfirmedRound = useGameStore((s) => s.setHasConfirmedRound);

  const [myBidAmount, setMyBidAmount] = useState<number | null>(null);

  const me = room?.players.find((p) => p.id === playerId);
  const myChips = me?.chips ?? 0;

  // 每輪重置出價記錄
  useEffect(() => {
    setMyBidAmount(null);
  }, [auctionState?.roundNumber]);

  // 籌碼不足最低出價時自動棄標
  useEffect(() => {
    if (phase === 'auction_round' && myChips < GAME_CONFIG.MIN_BID && !hasSubmittedBid) {
      getSocket().emit('submitBid', 0);
      setHasSubmittedBid(true);
    }
  }, [phase, myChips, hasSubmittedBid]);

  // Briefing：每箱拍賣前說明，等所有玩家確認（移到 null guard 前，避免 auctionState 還沒到就被擋住）
  if (phase === 'auction_briefing') {
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
          <p className="text-sm text-gray-500">
            寶箱 {auctionState?.roundNumber ?? '?'} / {GAME_CONFIG.TOTAL_AUCTION_ITEMS}
          </p>
          <p className="text-5xl">📦</p>
          <h2 className="text-2xl font-black text-gold">{auctionState?.currentBox.displayName ?? '準備中...'}</h2>
          {auctionState && (
            <div className="bg-secondary rounded-xl p-4 border border-gray-700 text-left space-y-2">
              <p className="text-gray-300 italic">「{auctionState.currentBox.hint}」</p>
              <p className="text-xs text-gray-500">⚠️ 提示可能為誤導</p>
            </div>
          )}
          <p className="text-sm text-gray-400">最低出價：🪙{GAME_CONFIG.MIN_BID}</p>
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
              準備出價！
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  // Intro（auctionState 尚未送達，必須在 null guard 前處理）
  if (phase === 'auction_intro') {
    const totalPlayers = room?.players.filter((p) => p.isConnected).length ?? 0;
    const readyCount = confirmedRoundReady.size;
    const handleIntroReady = () => {
      if (hasConfirmedRound) return;
      getSocket().emit('roundReady');
      setHasConfirmedRound(true);
      if (navigator.vibrate) navigator.vibrate(50);
    };
    return (
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-full max-w-sm mx-auto space-y-4"
        >
          <div className="text-center">
            <p className="text-5xl mb-2">📦</p>
            <h2 className="text-3xl font-black text-gold">拍賣戰</h2>
            <p className="text-gray-400 text-sm mt-1">共 {GAME_CONFIG.TOTAL_AUCTION_ITEMS} 輪暗標競拍</p>
          </div>

          <div className="p-4 rounded-xl bg-secondary border border-gray-700 text-sm text-gray-300 space-y-3">
            <div>
              <p className="font-bold text-gold mb-1">玩法</p>
              <p>每輪拍賣一個寶箱，所有人秘密出價（暗標），最高價者得標。出價相同則流標，無人出價也流標。</p>
            </div>

            <div>
              <p className="font-bold text-gold mb-1">寶箱種類</p>
              <div className="space-y-1 ml-1">
                <p>💎 鑽石 x{GAME_CONFIG.BOX_DISTRIBUTION.diamond} — 從其他玩家獲得出價 ×2 的籌碼</p>
                <p>📦 普通 x{GAME_CONFIG.BOX_DISTRIBUTION.normal} — 從其他玩家獲得出價 30%～60%</p>
                <p>💀 炸彈 x{GAME_CONFIG.BOX_DISTRIBUTION.bomb} — 損失出價 80% 給其他玩家</p>
                <p>🎭 神秘 x{GAME_CONFIG.BOX_DISTRIBUTION.mystery} — 隨機特殊效果（偷竊/交換/重分配等）</p>
              </div>
            </div>

            <div>
              <p className="font-bold text-gold mb-1">提示系統</p>
              <p>每個寶箱附帶一條提示，但有 30% 機率是誤導！最低出價 🪙{GAME_CONFIG.MIN_BID}，也可以選擇放棄出價。</p>
            </div>

            <div>
              <p className="font-bold text-gold mb-1">策略要點</p>
              <p>得標鑽石箱利潤最大，但炸彈箱會嚴重虧損。觀察提示的可信度，合理分配籌碼，不要孤注一擲！</p>
            </div>
          </div>

          {hasConfirmedRound ? (
            <div className="text-center">
              <p className="text-xl font-bold text-neon-green">✅ 已確認</p>
              <p className="text-gray-400 text-sm mt-1">等待其他玩家... ({readyCount}/{totalPlayers})</p>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleIntroReady}
              className="w-full py-4 rounded-xl text-xl font-bold
                bg-gradient-to-r from-gold/80 to-yellow-600 text-primary
                active:scale-95 glow-gold"
            >
              我瞭解了，開始拍賣！
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  if (!auctionState || !room) return null;

  const confirmedCount = confirmedBids.size;
  const totalPlayers = room.players.filter((p) => p.isConnected).length;

  const handleSubmitBid = (amount: number) => {
    getSocket().emit('submitBid', amount);
    setHasSubmittedBid(true);
    setMyBidAmount(amount);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  // Result
  if ((phase === 'auction_reveal' || phase === 'auction_result') && auctionResult) {
    const isWinner = auctionResult.winnerId === playerId;
    const myNewChips = auctionResult.playerChipsAfter[playerId!] ?? myChips;
    const delta = myNewChips - chipsBeforeAuction;

    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center space-y-4"
        >
          {auctionResult.winnerId === null ? (
            <>
              <p className="text-4xl">🚫</p>
              <h2 className="text-2xl font-bold text-gray-400">流標</h2>
            </>
          ) : isWinner ? (
            <>
              <p className="text-4xl">
                {auctionResult.box.type === 'diamond' ? '💎' :
                 auctionResult.box.type === 'bomb' ? '💀' :
                 auctionResult.box.type === 'mystery' ? '🎭' : '📦'}
              </p>
              <h2 className="text-2xl font-bold text-gold">你得標了！</h2>
              <p className="text-lg">出價: 🪙{auctionResult.winningBid}</p>
              <p className="text-sm text-gray-400 mt-1">
                {auctionResult.box.type === 'diamond' ? '鑽石箱：出價 x3 返還' :
                 auctionResult.box.type === 'bomb' ? '炸彈箱：損失 80% 出價' :
                 auctionResult.box.type === 'mystery' ? '神秘箱：觸發特殊效果' :
                 '普通箱：出價 +30%~60% 返還'}
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl">👀</p>
              <h2 className="text-2xl font-bold text-gray-300">
                {room.players.find((p) => p.id === auctionResult.winnerId)?.name} 得標
              </h2>
            </>
          )}

          {auctionResult.effectResult && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-neon-blue"
            >
              {auctionResult.effectResult}
            </motion.p>
          )}

          {auctionResult.winnerId !== null && delta !== 0 && (
            <p className={`text-lg font-bold ${delta > 0 ? 'text-neon-green' : 'text-accent'}`}>
              {delta > 0 ? `+${delta}` : `${delta}`} 籌碼
            </p>
          )}

          <ChipDisplay amount={myNewChips} size="lg" />
        </motion.div>
      </div>
    );
  }

  // Bidding UI
  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-3">
        <p className="text-sm text-gray-400">
          寶箱 {auctionState.roundNumber} / {GAME_CONFIG.TOTAL_AUCTION_ITEMS}
          {auctionState.remainingBoxes > 0 && ` · 剩餘 ${auctionState.remainingBoxes} 個`}
        </p>
        <ChipDisplay amount={myChips} size="sm" />
      </div>

      {/* Timer */}
      <Timer seconds={timeLeft} total={GAME_CONFIG.AUCTION_TIME} />

      {/* Box display */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="my-4 p-6 rounded-2xl bg-secondary border border-gray-700 text-center"
      >
        <p className="text-5xl mb-3">📦</p>
        <h3 className="text-xl font-bold text-gold mb-2">
          {auctionState.currentBox.displayName}
        </h3>
        <p className="text-gray-400 italic">
          「{auctionState.currentBox.hint}」
        </p>
        <p className="text-xs text-gray-600 mt-2">⚠️ 提示可能為誤導</p>
      </motion.div>

      {/* Bid input or waiting */}
      {myChips < GAME_CONFIG.MIN_BID ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-2">🏳️</p>
            <p className="text-xl font-bold text-gray-500">籌碼不足</p>
            <p className="text-gray-600 text-sm mt-1">自動棄標，等待本輪結束</p>
            <p className="text-gray-400 mt-2 text-sm">
              ({confirmedCount}/{totalPlayers})
            </p>
          </div>
        </div>
      ) : hasSubmittedBid ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <p className="text-4xl mb-2">✅</p>
            <p className="text-xl font-bold text-neon-green">已出價</p>
            {myBidAmount !== null && (
              <p className="mt-2 px-4 py-2 rounded-lg bg-secondary border border-gray-700 text-gold font-bold">
                {myBidAmount === 0 ? '放棄出價' : `🪙 ${myBidAmount}`}
              </p>
            )}
            <p className="text-gray-400 mt-2">
              等待其他玩家... ({confirmedCount}/{totalPlayers})
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1">
          <BidInput
            min={GAME_CONFIG.MIN_BID}
            max={myChips}
            onSubmit={handleSubmitBid}
            disabled={hasSubmittedBid}
          />
        </div>
      )}
    </div>
  );
}
