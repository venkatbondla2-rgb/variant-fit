// src/components/track/SplitCard.tsx

import React from 'react';
import { SplitOption } from '@/lib/types';

interface SplitCardProps {
  option: SplitOption;
  selected: boolean;
  onSelect: (id: string) => void;
}

export const SplitCard: React.FC<SplitCardProps> = ({ option, selected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(option.id)}
      className={`w-full p-4 bg-surface rounded-2xl border border-border glass-card transition-all duration-200 ${selected ? 'border-brand shadow-xl' : 'hover:scale-105'} `}
    >
      <h3 className="text-lg font-bold text-brand mb-2">{option.name}</h3>
      <p className="text-sm text-zinc-300 mb-1">Volume: {option.volumeInfo}</p>
      <p className="text-sm text-zinc-300 mb-1">Cardio: {option.cardioInfo}</p>
      <p className="text-sm text-zinc-300 mb-1">Calories: {option.calorieTarget} kcal/day</p>
      <p className="text-sm text-zinc-300 mb-1">Difficulty: {option.difficulty}</p>
      <p className="text-xs text-zinc-400 mt-2">{option.explanation}</p>
    </button>
  );
};

// Note: SplitOption type is imported from '@/lib/types' via a global import in the file where this component is used.
