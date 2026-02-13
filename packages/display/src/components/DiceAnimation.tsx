import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

interface DiceAnimationProps {
  dice: number[];
  rolling: boolean;
  onComplete?: () => void;
}

// CSS dot-pattern dice face
function DiceFace({ value, size = 96 }: { value: number; size?: number }) {
  const dotSize = size * 0.18;
  const pad = size * 0.22;
  const mid = size / 2;

  // Dot positions for each face value
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
      className="relative rounded-2xl bg-gradient-to-br from-white to-gray-100"
      style={{
        width: size,
        height: size,
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), 0 6px 20px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
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
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 1px rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </div>
  );
}

export default function DiceAnimation({ dice, rolling, onComplete }: DiceAnimationProps) {
  const [displayDice, setDisplayDice] = useState(dice.map(() => 1));
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'landing' | 'done'>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!rolling) {
      setDisplayDice(dice);
      setPhase('done');
      return;
    }

    setPhase('rolling');
    let frame = 0;
    const totalFrames = 24;

    intervalRef.current = setInterval(() => {
      frame++;
      if (frame < totalFrames) {
        // Slow down near the end
        setDisplayDice(dice.map(() => Math.floor(Math.random() * 6) + 1));
      } else {
        // Land!
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setPhase('landing');
        setDisplayDice(dice);

        setTimeout(() => {
          setPhase('done');
          onComplete?.();
        }, 600);
      }
    }, frame < 12 ? 80 : frame < 18 ? 120 : 180);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rolling, dice]);

  const total = dice.reduce((a, b) => a + b, 0);
  const isTriple = dice.length >= 3 && dice.every((d) => d === dice[0]);
  const isRolling = phase === 'rolling';
  const showResult = phase === 'done';

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Dice container */}
      <div className="flex gap-8 items-center justify-center">
        {displayDice.map((d, i) => (
          <motion.div
            key={i}
            animate={
              isRolling
                ? {
                    y: [0, -30, 0, -15, 0],
                    rotateZ: [0, -15, 15, -10, 0],
                    scale: [1, 1.05, 0.95, 1.02, 1],
                  }
                : phase === 'landing'
                  ? {
                      y: [0, -40, 0, -8, 0],
                      scale: [0.9, 1.15, 1],
                      rotateZ: 0,
                    }
                  : { y: 0, rotateZ: 0, scale: 1 }
            }
            transition={
              isRolling
                ? {
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: 'easeInOut',
                  }
                : phase === 'landing'
                  ? {
                      duration: 0.6,
                      delay: i * 0.15,
                      ease: [0.34, 1.56, 0.64, 1], // bounce
                    }
                  : { duration: 0.3 }
            }
            style={{
              filter: isRolling ? 'blur(0.5px)' : 'none',
            }}
          >
            <DiceFace value={d} size={110} />
          </motion.div>
        ))}
      </div>

      {/* Shadow under dice */}
      <div className="flex gap-8 -mt-4">
        {displayDice.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full bg-black/20"
            animate={
              isRolling
                ? { width: [80, 60, 80], opacity: [0.3, 0.15, 0.3] }
                : { width: 90, opacity: 0.25 }
            }
            transition={
              isRolling
                ? { duration: 0.5, repeat: Infinity, delay: i * 0.12 }
                : { duration: 0.3 }
            }
            style={{ height: 8 }}
          />
        ))}
      </div>

      {/* Result reveal */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="text-center"
          >
            {isTriple ? (
              <div className="relative">
                <motion.p
                  className="text-5xl font-black text-accent glow-text-red"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  豹子！
                </motion.p>
                <p className="text-xl text-gray-400 mt-2">全額沒收！</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-4">
                  <motion.p
                    className="text-7xl font-black text-gold glow-text-gold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 8, stiffness: 200 }}
                  >
                    {total}
                  </motion.p>
                </div>
                <motion.p
                  className="text-3xl font-bold mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {total >= 11 ? (
                    <span className="text-neon-blue">⬆ 大！</span>
                  ) : (
                    <span className="text-neon-pink">⬇ 小！</span>
                  )}
                </motion.p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
