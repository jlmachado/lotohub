'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'gold' | 'black' | 'white' | 'currentColor';
  height?: number;
}

/**
 * LR° Logo Component
 * Projetado para ser moderno, minimalista e altamente legível.
 * O símbolo "°" é estilizado como um anel tecnológico.
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
      className={cn("flex items-center justify-center", className)}
      style={{ height: `${height}px`, width: 'auto' }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        {/* Letras LR com tipografia bold e moderna */}
        <text
          x="45"
          y="72"
          fill={activeColor}
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 900,
            fontSize: '65px',
            letterSpacing: '-0.05em',
          }}
          textAnchor="middle"
        >
          LR
        </text>
        
        {/* Símbolo de grau ° estilizado como anel tecnológico */}
        <circle
          cx="92"
          cy="32"
          r="10"
          stroke={activeColor}
          strokeWidth="12"
          fill="none"
        />
      </svg>
    </div>
  );
};
