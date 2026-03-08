'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getLogoSrc } from '@/utils/branding';

interface LogoProps {
  className?: string;
  width?: number; 
  height?: number;
}

export const Logo = ({ className, height }: LogoProps) => {
  const [logoError, setLogoError] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/logo-lotohub.png');

  useEffect(() => {
    const updateLogo = () => {
      setLogoSrc(getLogoSrc());
      setLogoError(false);
    };

    // Carregamento inicial
    updateLogo();

    // Ouvir atualizações de branding (mesma aba)
    window.addEventListener('branding-update', updateLogo);
    
    // Ouvir mudanças no storage (outras abas)
    window.addEventListener('storage', (e) => {
      if (e.key === 'app:branding:v1') updateLogo();
    });

    return () => {
      window.removeEventListener('branding-update', updateLogo);
      window.removeEventListener('storage', updateLogo);
    };
  }, []);

  // Fallback em texto caso a imagem não carregue ou não exista
  if (logoError) {
    return (
      <span className={cn(
        "text-white font-[800] tracking-[1px] text-[16px] md:text-[18px] uppercase italic drop-shadow-sm whitespace-nowrap",
        className
      )}>
        Lotohub
      </span>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src={logoSrc}
        alt="Lotohub"
        onError={() => setLogoError(true)}
        className="h-[24px] md:h-[28px] w-auto object-contain block"
        style={height ? { height: `${height}px` } : undefined}
      />
    </div>
  );
};
