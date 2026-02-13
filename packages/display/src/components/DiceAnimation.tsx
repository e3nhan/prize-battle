import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface DiceAnimationProps {
  dice: number[];
  rolling: boolean;
  onComplete?: () => void;
}

const diceFaces: Record<number, string> = {
  1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
};

export default function DiceAnimation({ dice, rolling, onComplete }: DiceAnimationProps) {
  const [displayDice, setDisplayDice] = useState(dice.map(() => 1));
  const [isRolling, setIsRolling] = useState(rolling);

  useEffect(() => {
    if (!rolling) {
      setDisplayDice(dice);
      return;
    }

    setIsRolling(true);
    let frame = 0;
    const maxFrames = 20;

    const interval = setInterval(() => {
      frame++;
      if (frame < maxFrames) {
        setDisplayDice(dice.map(() => Math.floor(Math.random() * 6) + 1));
      } else {
        setDisplayDice(dice);
        setIsRolling(false);
        clearInterval(interval);
        onComplete?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [rolling, dice]);

  const total = dice.reduce((a, b) => a + b, 0);
  const isTriple = dice.length >= 3 && dice.every((d) => d === dice[0]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-6">
        {displayDice.map((d, i) => (
          <motion.div
            key={i}
            animate={isRolling ? {
              rotate: [0, 180, 360],
              scale: [1, 1.2, 1],
            } : {
              rotate: 0,
              scale: [1.3, 1],
            }}
            transition={isRolling ? {
              duration: 0.3,
              repeat: Infinity,
            } : {
              duration: 0.5,
            }}
            className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl"
          >
            <span className="text-6xl leading-none text-gray-900">{diceFaces[d]}</span>
          </motion.div>
        ))}
      </div>

      {!isRolling && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {isTriple ? (
            <div>
              <p className="text-4xl font-black text-accent glow-text-red">豹子！</p>
              <p className="text-xl text-gray-400 mt-1">所有人輸！</p>
            </div>
          ) : (
            <div>
              <p className="text-6xl font-black text-gold glow-text-gold">{total}</p>
              <p className="text-2xl font-bold mt-1">
                {total >= 11 ? (
                  <span className="text-neon-blue">大！</span>
                ) : (
                  <span className="text-neon-pink">小！</span>
                )}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
