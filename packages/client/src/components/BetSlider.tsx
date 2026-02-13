import { useState } from 'react';

interface BetSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export default function BetSlider({ min, max, value, onChange }: BetSliderProps) {
  const presets = [
    { label: '最小', value: min },
    { label: '25%', value: Math.max(min, Math.floor(max * 0.25)) },
    { label: '50%', value: Math.max(min, Math.floor(max * 0.5)) },
    { label: 'ALL IN', value: max },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-gray-400">
        <span>下注金額</span>
        <span className="text-gold font-bold text-lg">{value}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-7
          [&::-webkit-slider-thumb]:h-7
          [&::-webkit-slider-thumb]:bg-gold
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-lg"
      />
      <div className="flex justify-between text-xs text-gray-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      <div className="flex gap-2">
        {presets.map((preset) => {
          const isActive = value === preset.value;
          return (
            <button
              key={preset.label}
              onClick={() => onChange(preset.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all
                ${preset.label === 'ALL IN'
                  ? isActive
                    ? 'bg-accent text-white border border-accent'
                    : 'bg-accent/30 text-accent border border-accent/50 hover:bg-accent/50'
                  : isActive
                    ? 'bg-gold/20 text-gold border border-gold'
                    : 'bg-secondary text-gray-300 border border-gray-600 hover:border-gold hover:text-gold'
                }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
