/**
 * @fileOverview Item individual dentro do Carrinho de Apostas.
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BetSlipItem as BetItemType } from '@/utils/bet-calculator';

interface Props {
  item: BetItemType;
  onRemove: () => void;
}

export function BetSlipItem({ item, onRemove }: Props) {
  return (
    <div className="bg-white/5 p-3 rounded-xl border border-white/5 relative group hover:border-primary/30 transition-all animate-in slide-in-from-right-2">
      <button 
        onClick={onRemove}
        className="absolute top-2.5 right-2.5 h-6 w-6 bg-black/40 rounded-full flex items-center justify-center text-white/50 hover:text-red-500 transition-colors z-10"
      >
        <X size={14} />
      </button>
      
      <div className="pr-6">
        <p className="text-[10px] font-black text-primary uppercase italic tracking-tighter mb-1.5 truncate">
          {item.matchName}
        </p>
        
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-300 leading-none">
              {item.market}
            </p>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase font-black h-4 px-1.5 mt-1">
              {item.selection}
            </Badge>
          </div>
          
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none mb-1">Odd</span>
            <span className="text-sm font-black text-primary italic tabular-nums">
              @{item.odd.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
