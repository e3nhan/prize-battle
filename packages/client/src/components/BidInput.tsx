import { useState } from 'react';

interface BidInputProps {
  min: number;
  max: number;
  onSubmit: (amount: number) => void;
  disabled: boolean;
}

export default function BidInput({ min, max, onSubmit, disabled }: BidInputProps) {
  const [amount, setAmount] = useState(min);

  const presets = [
    { label: '放棄', value: 0 },
    { label: '最低', value: min },
    { label: '25%', value: Math.floor(max * 0.25) },
    { label: '50%', value: Math.floor(max * 0.5) },
    { label: 'ALL IN', value: max },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="text-sm text-gray-400">你的出價</span>
        <div className="text-3xl font-bold text-gold mt-1">
          🪙 {amount}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={Math.max(10, Math.floor(max / 100) * 10)}
        value={amount === 0 ? min : amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        disabled={disabled || amount === 0}
        className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-7
          [&::-webkit-slider-thumb]:h-7
          [&::-webkit-slider-thumb]:bg-gold
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-lg
          disabled:opacity-50"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>最低 {min}</span>
        <span>最高 {max}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => setAmount(preset.value)}
            disabled={disabled}
            className={`flex-1 min-w-[60px] py-2 rounded-lg text-sm font-bold transition-all
              ${preset.label === 'ALL IN'
                ? 'bg-accent/30 text-accent border border-accent/50'
                : preset.label === '放棄'
                  ? 'bg-gray-700 text-gray-400 border border-gray-600'
                  : 'bg-secondary text-gray-300 border border-gray-600'
              }
              disabled:opacity-50`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => onSubmit(amount)}
        disabled={disabled || (amount > 0 && amount < min)}
        className="w-full py-4 rounded-xl text-xl font-bold transition-all
          bg-gradient-to-r from-gold/80 to-yellow-600 text-primary
          hover:from-gold hover:to-yellow-500
          disabled:opacity-50 disabled:cursor-not-allowed
          active:scale-95"
      >
        {amount === 0 ? '放棄出價' : `確認出價 🪙${amount}`}
      </button>
    </div>
  );
}
