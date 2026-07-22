import React from 'react';
import { cn } from '../lib/utils';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const textSize = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl'
  }[size];

  return (
    <div className="flex flex-col items-center select-none">
      <div className={cn('font-display uppercase leading-none text-[#FFD700] drop-shadow-[0_2px_16px_rgba(255,215,0,0.25)]', textSize)}>
        Multy Forças
      </div>
      <div className={cn('font-light tracking-[0.5em] text-white/80 border-t border-[#FFD700]/20 pt-1.5 mt-2 uppercase',
        size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : 'text-xs')}>
        Academia
      </div>
    </div>
  );
};
