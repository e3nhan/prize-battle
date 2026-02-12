import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { useDisplayStore } from '../stores/displayStore';
import PlayerList from '../components/PlayerList';

export default function WaitingScreen() {
  const room = useDisplayStore((s) => s.room);
  const countdown = useDisplayStore((s) => s.countdown);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!room) return;
    // Dev: client on port 5173; Production: same origin (no port)
    const url = import.meta.env.DEV
      ? `${window.location.protocol}//${window.location.hostname}:5173`
      : window.location.origin;

    QRCode.toDataURL(url, {
      width: 250,
      margin: 2,
      color: { dark: '#ffd700', light: '#0a0a1a' },
    }).then(setQrUrl);
  }, [room]);

  if (!room) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-2xl text-gray-400">等待房間建立...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-12">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-6xl font-black text-gold glow-text-gold mb-8"
      >
        🎰 獎金爭奪戰
      </motion.h1>

      {countdown !== null ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <p className="text-2xl text-gray-400 mb-4">遊戲即將開始</p>
          <motion.p
            key={countdown}
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[120px] font-black text-gold glow-text-gold"
          >
            {countdown}
          </motion.p>
        </motion.div>
      ) : (
        <div className="flex gap-16 items-start">
          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <div className="p-4 bg-secondary rounded-2xl border border-gold/30 glow-gold">
              {qrUrl && <img src={qrUrl} alt="QR Code" className="w-64 h-64" />}
            </div>
            <p className="text-gray-400 mt-4">掃碼加入遊戲</p>
            <a
              href={import.meta.env.DEV
                ? `${window.location.protocol}//${window.location.hostname}:5173`
                : '/'}
              className="text-gold/60 hover:text-gold transition-colors text-sm mt-2 inline-block"
            >
              📱 切換至手機玩家模式
            </a>
          </motion.div>

          {/* Players */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <p className="text-xl text-gray-400 mb-4">
              已加入玩家 ({room.players.length} / {room.maxPlayers})
            </p>
            <PlayerList players={room.players} />
            {room.players.length < 2 && (
              <p className="text-gray-500 text-center mt-4">至少需要 2 人才能開始</p>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
