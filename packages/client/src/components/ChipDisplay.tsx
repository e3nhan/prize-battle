import { motion, AnimatePresence } from 'framer-motion';

interface ChipDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showChange?: number | null;
}

export default function ChipDisplay({ amount, size = 'md', showChange }: ChipDisplayProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-gold">🪙</span>
      <motion.span
        key={amount}
        initial={{ scale: 1.3, color: '#fff' }}
        animate={{ scale: 1, color: '#ffd700' }}
        className={`${sizeClasses[size]} font-bold text-gold`}
      >
        {amount.toLocaleString()}
      </motion.span>
      <AnimatePresence>
        {showChange !== null && showChange !== undefined && showChange !== 0 && (
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`text-sm font-bold ${showChange > 0 ? 'text-neon-green' : 'text-accent'}`}
          >
            {showChange > 0 ? '+' : ''}{showChange}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
