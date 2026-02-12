import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { AuctionResult } from '@prize-battle/shared';

interface BoxOpeningProps {
  result: AuctionResult;
  onComplete?: () => void;
}

const boxTypeEmoji: Record<string, string> = {
  diamond: '💎',
  normal: '📦',
  bomb: '💀',
  mystery: '🎭',
};

const boxTypeLabel: Record<string, string> = {
  diamond: '鑽石寶箱！',
  normal: '普通寶箱',
  bomb: '炸彈！',
  mystery: '神秘箱！',
};

export default function BoxOpening({ result, onComplete }: BoxOpeningProps) {
  const [stage, setStage] = useState<'shaking' | 'opening' | 'revealed'>('shaking');

  useEffect(() => {
    const timer1 = setTimeout(() => setStage('opening'), 2000);
    const timer2 = setTimeout(() => {
      setStage('revealed');
      onComplete?.();
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <AnimatePresence mode="wait">
        {stage === 'shaking' && (
          <motion.div
            key="shaking"
            animate={{
              rotate: [-5, 5, -5, 5, 0],
              scale: [1, 1.05, 1, 1.05, 1],
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-[120px]"
          >
            📦
          </motion.div>
        )}

        {stage === 'opening' && (
          <motion.div
            key="opening"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.5, 0.5, 2] }}
            transition={{ duration: 1.5 }}
            className="relative"
          >
            <motion.div
              animate={{ opacity: [0, 1, 0.5, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
              className="text-[120px]"
            >
              ✨
            </motion.div>
          </motion.div>
        )}

        {stage === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10 }}
            className="text-center"
          >
            <span className="text-[100px] block">
              {boxTypeEmoji[result.box.type]}
            </span>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`text-4xl font-black mt-4 ${
                result.box.type === 'diamond' ? 'text-neon-blue glow-text-gold' :
                result.box.type === 'bomb' ? 'text-accent glow-text-red' :
                result.box.type === 'mystery' ? 'text-neon-purple' :
                'text-gold'
              }`}
            >
              {boxTypeLabel[result.box.type]}
            </motion.p>

            {result.effectResult && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xl text-gray-300 mt-4 max-w-md"
              >
                {result.effectResult}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
