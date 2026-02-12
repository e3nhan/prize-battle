import { motion } from 'framer-motion';
import { ROULETTE_SEGMENTS } from '@prize-battle/shared';

interface RouletteWheelProps {
  spinning: boolean;
  finalAngle: number;
  winningSegment: number;
}

export default function RouletteWheel({ spinning, finalAngle, winningSegment }: RouletteWheelProps) {
  const segments = ROULETTE_SEGMENTS;
  const segmentAngle = 360 / segments.length;

  return (
    <div className="relative w-80 h-80 mx-auto">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
        <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px]
          border-l-transparent border-r-transparent border-t-gold" />
      </div>

      {/* Wheel */}
      <motion.div
        className="w-full h-full rounded-full border-4 border-gold/50 overflow-hidden relative"
        animate={{ rotate: spinning ? finalAngle : finalAngle }}
        transition={spinning ? {
          duration: 4,
          ease: [0.25, 0.1, 0.25, 1],
        } : { duration: 0 }}
      >
        {segments.map((seg, i) => {
          const rotation = i * segmentAngle;
          return (
            <div
              key={seg.id}
              className="absolute w-full h-full"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            >
              <div
                className="absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left flex items-center justify-center"
                style={{
                  backgroundColor: seg.color,
                  clipPath: `polygon(0 0, 100% 0, 0 100%)`,
                  transform: `rotate(${segmentAngle}deg)`,
                }}
              >
                <span
                  className="text-white font-bold text-sm absolute"
                  style={{
                    transform: `rotate(-${rotation + segmentAngle / 2}deg)`,
                    top: '30%',
                    left: '20%',
                  }}
                >
                  {seg.label}
                </span>
              </div>
            </div>
          );
        })}
        {/* Center circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-primary rounded-full border-2 border-gold flex items-center justify-center">
            <span className="text-gold text-xl">🎰</span>
          </div>
        </div>
      </motion.div>

      {/* Result label */}
      {!spinning && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2"
        >
          <div
            className="px-6 py-2 rounded-full text-white font-bold text-xl"
            style={{ backgroundColor: segments[winningSegment]?.color }}
          >
            {segments[winningSegment]?.label}
          </div>
        </motion.div>
      )}
    </div>
  );
}
