'use client';

import Link from 'next/link';
import { PawPrint, Star, Gem, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isModuleEnabled } from '@/utils/bancaContext';
import { useMemo } from 'react';

export const HomeCards = () => {
  const cards = useMemo(() => [
    {
      id: 'loterias',
      title: 'Loterias',
      icon: PawPrint,
      href: '/loterias',
      color: 'bg-green-600',
      iconColor: 'text-white',
      enabled: isModuleEnabled('jogoDoBicho') || 
               isModuleEnabled('seninha') || 
               isModuleEnabled('quininha') || 
               isModuleEnabled('lotinha') ||
               isModuleEnabled('loteriaUruguai')
    },
    {
      id: 'bingo',
      title: 'Bingo',
      icon: Star,
      href: '/bingo',
      color: 'bg-blue-600',
      iconColor: 'text-white',
      enabled: isModuleEnabled('bingo')
    },
    {
      id: 'cassino',
      title: 'Cassino',
      icon: Gem,
      href: '/cassino',
      color: 'bg-purple-700',
      iconColor: 'text-white',
      enabled: isModuleEnabled('cassino')
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      icon: MessageCircle,
      href: 'https://wa.me/17997637890',
      color: 'bg-emerald-500',
      iconColor: 'text-white',
      external: true,
      enabled: true
    }
  ], []);

  const visibleCards = cards.filter(c => c.enabled);

  return (
    <div className="px-4 grid grid-cols-2 lg:grid-cols-4 gap-4 pb-8">
      {visibleCards.map((card) => (
        <Link 
          key={card.id} 
          href={card.href}
          target={card.external ? '_blank' : undefined}
          rel={card.external ? 'noopener noreferrer' : undefined}
          className={cn(
            "h-[110px] rounded-[20px] p-4 flex flex-col justify-between shadow-sm transition-transform active:scale-[0.97] border border-white/5",
            card.color
          )}
        >
          <card.icon className={cn("h-8 w-8", card.iconColor)} />
          <span className="text-white font-bold text-lg leading-tight">
            {card.title}
          </span>
        </Link>
      ))}
    </div>
  );
};
