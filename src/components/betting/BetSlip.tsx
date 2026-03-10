/**
 * @fileOverview Carrinho de Apostas Profissional.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X, Trash2, ReceiptText, TrendingUp, Wallet, Calculator } from 'lucide-react';
import { formatBRL } from '@/utils/currency';
import { calculateTotalOdds, calculatePotentialWin } from '@/utils/bet-calculator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function BetSlip() {
  const { betSlip, removeBetFromSlip, clearBetSlip, placeFootballBet, balance } = useAppContext();
  const [stakeInput, setStakeInput] = useState<string>('10');

  if (betSlip.length === 0) return null;

  const totalOdds = useMemo(() => calculateTotalOdds(betSlip), [betSlip]);
  const stake = parseFloat(stakeInput) || 0;
  const potentialWin = calculatePotentialWin(stake, totalOdds);
  
  const isMultiple = betSlip.length > 1;
  const canPlaceBet = stake >= 1 && stake <= balance;

  const handlePlaceBet = () => {
    if (!canPlaceBet) return;
    placeFootballBet(stake);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[calc(100%-32px)] max-w-sm animate-in slide-in-from-right-4 duration-500">
      <Card className="shadow-2xl border-primary/30 bg-[#0f172a] text-white overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <CardHeader className="p-4 flex flex-row items-center justify-between bg-primary/10 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-lg">
              <ReceiptText className="text-black h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase italic tracking-tight">
                {isMultiple ? `Múltipla (${betSlip.length})` : 'Aposta Simples'}
              </CardTitle>
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest mt-0.5">Bilhete de Jogo</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/5" 
            onClick={clearBetSlip}
          >
            <Trash2 size={16} />
          </Button>
        </CardHeader>
        
        {/* Items List */}
        <CardContent className="p-4 space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar bg-slate-900/30">
          {betSlip.map((bet) => (
            <div key={bet.id} className="bg-white/5 p-3 rounded-xl border border-white/5 relative group hover:border-primary/20 transition-all">
              <button 
                onClick={() => removeBetFromSlip(bet.id)}
                className="absolute top-2.5 right-2.5 h-6 w-6 bg-black/40 rounded-full flex items-center justify-center text-white/50 hover:text-red-500 transition-colors z-10"
              >
                <X size={14} />
              </button>
              
              <div className="pr-6">
                <p className="text-[10px] font-black text-primary uppercase italic tracking-tighter mb-1 truncate">{bet.matchName}</p>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-white leading-none">{bet.market}</p>
                    <Badge variant="outline" className="text-[9px] uppercase border-white/10 bg-slate-800 text-slate-300 font-mono h-4">
                      {bet.selection}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Odd</span>
                    <span className="text-sm font-black text-primary italic">@{bet.odd.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>

        {/* Footer / Calculations */}
        <CardFooter className="p-4 flex-col gap-4 border-t border-white/10 bg-[#020617]">
          <div className="w-full space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
              <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                <TrendingUp size={14} className="text-primary" />
                Cotação Total
              </div>
              <span className="font-black text-primary text-lg italic tracking-tighter tabular-nums">
                {totalOdds.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Investimento</span>
                  <span className="text-[9px] font-bold text-slate-400">Min R$ 1</span>
                </div>
                <div className="relative group">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <Input 
                    type="number" 
                    value={stakeInput} 
                    onChange={(e) => setStakeInput(e.target.value)} 
                    className="h-11 bg-black/40 border-white/10 pl-9 text-right font-black text-lg focus:border-primary/50 transition-all rounded-xl tabular-nums"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-green-500/70 uppercase px-1">Retorno Potencial</span>
                <div className="h-11 flex items-center justify-end px-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <span className="text-xl font-black text-green-500 italic tabular-nums">
                    {formatBRL(potentialWin)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handlePlaceBet} 
            disabled={!canPlaceBet}
            className={cn(
              "w-full h-14 font-black uppercase italic text-lg rounded-xl shadow-xl transition-all active:scale-95",
              canPlaceBet ? "lux-shine bg-primary text-black" : "bg-slate-800 text-slate-500 grayscale cursor-not-allowed"
            )}
          >
            {stake > balance ? 'Saldo Insuficiente' : 'Confirmar Aposta'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
