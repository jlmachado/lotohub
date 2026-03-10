/**
 * @fileOverview Componente flutuante do Carrinho de Apostas.
 * Gerencia seleções, odds combinadas e confirmação de aposta.
 */

'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X, Trash2, ReceiptText, Calculator, TrendingUp } from 'lucide-react';
import { formatBRL } from '@/utils/currency';
import { calculateTotalOdds, calculatePotentialWin } from '@/utils/bet-calculator';
import { Badge } from '@/components/ui/badge';

export function BetSlip() {
  const { betSlip, removeBetFromSlip, clearBetSlip, placeFootballBet } = useAppContext();
  const [stake, setStake] = useState<string>('10');

  if (betSlip.length === 0) return null;

  const totalOdds = calculateTotalOdds(betSlip);
  const stakeNum = parseFloat(stake) || 0;
  const potentialWin = calculatePotentialWin(stakeNum, totalOdds);

  const handlePlaceBet = () => {
    if (stakeNum <= 0) return;
    placeFootballBet(stakeNum);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-full max-w-[320px] md:max-w-sm animate-in slide-in-from-right-4 duration-500">
      <Card className="shadow-2xl border-primary/20 bg-slate-900 text-white overflow-hidden">
        {/* Header */}
        <CardHeader className="p-4 flex flex-row items-center justify-between bg-primary/10 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-lg">
              <ReceiptText className="text-black h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-black uppercase italic tracking-tight">Bilhete de Aposta</CardTitle>
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
        <CardContent className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-900/50">
          {betSlip.map((bet) => (
            <div key={bet.id} className="bg-white/5 p-3 rounded-xl border border-white/10 relative group hover:border-primary/30 transition-colors">
              <button 
                onClick={() => removeBetFromSlip(bet.id)}
                className="absolute top-2 right-2 h-6 w-6 bg-black/40 rounded-full flex items-center justify-center text-white/50 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
              
              <div className="pr-6">
                <p className="text-[10px] font-black text-primary uppercase italic tracking-tighter mb-1 truncate">{bet.matchName}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[11px] font-bold text-white">{bet.market}</p>
                    <Badge variant="secondary" className="text-[9px] uppercase bg-white/10 border-0 h-4 px-1.5 mt-1">
                      {bet.pickLabel}
                    </Badge>
                  </div>
                  <p className="text-sm font-black text-primary italic">@{bet.odd.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>

        {/* Footer / Calculations */}
        <CardFooter className="p-4 flex-col gap-4 border-t border-white/5 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full space-y-3">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground font-bold uppercase tracking-widest">
                <TrendingUp size={12} className="text-primary" />
                Odd Total
              </div>
              <span className="font-black text-primary text-base italic">{totalOdds.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase ml-1">Valor Apostado</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                  <Input 
                    type="number" 
                    value={stake} 
                    onChange={(e) => setStake(e.target.value)} 
                    className="h-10 bg-black/40 border-white/10 pl-8 text-right font-black text-lg focus:border-primary/50 transition-all rounded-xl"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-black text-green-500 uppercase ml-1">Retorno Possível</span>
                <div className="h-10 flex items-center justify-end px-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <span className="text-lg font-black text-green-500 italic tabular-nums">{formatBRL(potentialWin)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handlePlaceBet} 
            className="w-full h-14 lux-shine font-black uppercase italic text-lg rounded-xl shadow-xl active:scale-95 transition-transform"
          >
            Confirmar Aposta
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
