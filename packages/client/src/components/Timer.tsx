import { motion } from 'framer-motion';

interface TimerProps {
  seconds: number;
  total: number;
}

export default function Timer({ seconds, total }: TimerProps) {
  const percentage = (seconds / total) * 100;
  const isUrgent = seconds <= 5;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-400">剩餘時間</span>
        <motion.span
          className={`text-2xl font-bold ${isUrgent ? 'text-accent' : 'text-gold'}`}
          animate={isUrgent ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
        >
          {seconds}s
        </motion.span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isUrgent ? 'bg-accent' : 'bg-gold'}`}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
