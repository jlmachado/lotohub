'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'gold' | 'black' | 'white' | 'currentColor';
  height?: number;
}

/**
 * Componente de Logo LOTOHUB
 * Exibe o nome da marca em tipografia robusta, impactante e moderna.
 */
export const Logo = ({ className, variant = 'gold', height = 24 }: LogoProps) => {
  const colorMap = {
    gold: '#FFD700',
    black: '#000000',
    white: '#FFFFFF',
    currentColor: 'currentColor',
  };

  const activeColor = colorMap[variant] || colorMap.gold;

  return (
    <div 
      className={cn(
        "flex items-center justify-center font-black italic uppercase tracking-tighter select-none",
        className
      )}
      style={{ 
        height: `${height}px`,
        fontSize: `${height}px`,
        lineHeight: 1,
        color: activeColor,
        textShadow: variant === 'gold' ? '0 0 12px rgba(255, 215, 0, 0.3)' : 'none'
      }}
    >
      LOTOHUB
    </div>
  );
};
