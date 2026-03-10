'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X, Trash2, Calculator, ReceiptText } from 'lucide-react';
import { formatBRL } from '@/utils/currency';
import { calculateTotalOdds, calculatePotentialWin } from '@/utils/bet-calculator';

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
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-[320px] md:max-w-sm animate-in slide-in-from-right-4">
      <Card className="shadow-2xl border-primary/20 bg-slate-900 text-white">
        <CardHeader className="p-4 flex flex-row items-center justify-between bg-primary/10 border-b border-white/5 rounded-t-lg">
          <div className="flex items-center gap-2">
            <ReceiptText className="text-primary h-5 w-5" />
            <CardTitle className="text-sm font-black uppercase italic">Bilhete de Aposta</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" onClick={clearBetSlip}>
            <Trash2 size={16} />
          </Button>
        </CardHeader>
        
        <CardContent className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
          {betSlip.map((bet) => (
            <div key={bet.id} className="bg-white/5 p-3 rounded-lg border border-white/5 relative group">
              <button 
                onClick={() => removeBetFromSlip(bet.id)}
                className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              <p className="text-[10px] font-black text-primary uppercase italic mb-1">{bet.matchName}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-white">{bet.market}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{bet.selection}</p>
                </div>
                <p className="text-sm font-black text-primary">@{bet.odd.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </CardContent>

        <CardFooter className="p-4 flex-col gap-4 border-t border-white/5 bg-slate-950/50">
          <div className="w-full space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground uppercase font-bold">Total Odds</span>
              <span className="font-black text-primary">{totalOdds.toFixed(2)}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs font-bold uppercase whitespace-nowrap">Valor R$</span>
              <Input 
                type="number" 
                value={stake} 
                onChange={(e) => setStake(e.target.value)} 
                className="h-9 bg-black/40 border-white/10 text-right font-black"
              />
            </div>
            <div className="flex justify-between items-center p-2 bg-primary/5 rounded border border-primary/10">
              <span className="text-[10px] font-black uppercase text-primary">Retorno Potencial</span>
              <span className="text-lg font-black text-green-500 italic">{formatBRL(potentialWin)}</span>
            </div>
          </div>
          
          <Button onClick={handlePlaceBet} className="w-full h-12 lux-shine font-black uppercase italic text-lg rounded-xl">
            Confirmar Aposta
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
