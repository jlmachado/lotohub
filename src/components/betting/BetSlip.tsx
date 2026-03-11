/**
 * @fileOverview Carrinho de Apostas Profissional refinado com finalização e exibição de bilhete.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X, Trash2, ReceiptText, TrendingUp, Wallet, ArrowRight, ShoppingCart, Loader2 } from 'lucide-react';
import { formatBRL } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TicketDialog } from '../ticket-dialog';

export function BetSlip() {
  const { betSlip, removeBetFromSlip, clearBetSlip, placeFootballBet, balance, user } = useAppContext();
  const [stakeInput, setStakeInput] = useState<string>('10');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Success Ticket Modal
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);
  const [lastTicketTime, setLastTicketTime] = useState<string | null>(null);
  const [lastTicketItems, setLastTicketItems] = useState<any[]>([]);
  const [lastTicketStake, setLastTicketStake] = useState(0);
  const [lastTicketPossibleReturn, setLastTicketPossibleReturn] = useState(0);

  const totalOdds = useMemo(() => {
    const prod = (betSlip || []).reduce((acc, item) => acc * (item.odd || 1), 1);
    return parseFloat(prod.toFixed(2));
  }, [betSlip]);

  const stake = parseFloat(stakeInput) || 0;
  const potentialWin = parseFloat((stake * totalOdds).toFixed(2));
  
  const isMultiple = (betSlip || []).length > 1;
  const canPlaceBet = stake >= 1 && stake <= (user?.tipoUsuario === 'CAMBISTA' ? 999999 : balance) && !isFinalizing;

  const handlePlaceBet = async () => {
    if (!canPlaceBet) return;
    setIsFinalizing(true);
    
    // Capturar dados para o bilhete ANTES de limpar o slip
    const itemsSnapshot = [...betSlip];
    const stakeSnapshot = stake;
    const winSnapshot = potentialWin;
    
    const pouleId = await placeFootballBet(stake);
    setIsFinalizing(false);
    
    if (pouleId) {
      setLastTicketId(pouleId);
      setLastTicketTime(new Date().toLocaleString('pt-BR'));
      setLastTicketItems(itemsSnapshot);
      setLastTicketStake(stakeSnapshot);
      setLastTicketPossibleReturn(winSnapshot);
      
      setIsOpen(false);
      setIsTicketOpen(true);
    }
  };

  if (!betSlip || betSlip.length === 0) return (
    <TicketDialog 
      isOpen={isTicketOpen} 
      onOpenChange={setIsTicketOpen} 
      onNewBet={() => setIsTicketOpen(false)}
      ticketId={lastTicketId}
      generationTime={lastTicketTime}
      lotteryName="Futebol"
      ticketItems={lastTicketItems}
      totalValue={lastTicketStake}
      possibleReturn={lastTicketPossibleReturn}
    />
  );

  return (
    <>
      <TicketDialog 
        isOpen={isTicketOpen} 
        onOpenChange={setIsTicketOpen} 
        onNewBet={() => setIsTicketOpen(false)}
        ticketId={lastTicketId}
        generationTime={lastTicketTime}
        lotteryName="Futebol"
        ticketItems={lastTicketItems}
        totalValue={lastTicketStake}
        possibleReturn={lastTicketPossibleReturn}
      />

      {/* Botão Flutuante (quando fechado) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[90] h-16 w-16 bg-primary text-black rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center animate-in zoom-in-50 duration-300 ring-2 ring-white/20"
        >
          <ShoppingCart size={28} />
          <Badge className="absolute -top-1 -right-1 bg-red-600 border-2 border-[#020617] h-6 min-w-[24px] flex items-center justify-center p-0 font-black">
            {betSlip.length}
          </Badge>
        </button>
      )}

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Carrinho Expandido */}
      <div className={cn(
        "fixed bottom-0 right-0 left-0 md:left-auto md:right-6 md:bottom-6 z-[100] w-full md:max-w-sm transition-all duration-500 transform",
        isOpen ? "translate-y-0" : "translate-y-full pointer-events-none opacity-0"
      )}>
        <Card className="shadow-2xl border-primary/30 bg-[#0f172a] text-white overflow-hidden ring-1 ring-white/10 rounded-t-[24px] md:rounded-[24px]">
          {/* Header */}
          <CardHeader className="p-4 flex flex-row items-center justify-between bg-primary/10 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg shadow-lg">
                <ReceiptText className="text-black h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase italic tracking-tight">
                  {isMultiple ? `Bilhete Múltiplo (${betSlip.length})` : 'Aposta Simples'}
                </CardTitle>
                <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest mt-0.5">Futebol Sportsbook</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white/30 hover:text-red-500 hover:bg-red-500/10" 
                onClick={clearBetSlip}
              >
                <Trash2 size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white/30" 
                onClick={() => setIsOpen(false)}
              >
                <X size={20} />
              </Button>
            </div>
          </CardHeader>
          
          {/* Itens */}
          <CardContent className="p-3 space-y-2 max-h-[40vh] md:max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-900/30">
            {betSlip.map((item) => (
              <div key={item.id} className="bg-white/5 p-3 rounded-xl border border-white/5 relative animate-in slide-in-from-right-2">
                <button 
                  onClick={() => removeBetFromSlip(item.id)}
                  className="absolute top-2.5 right-2.5 h-6 w-6 bg-black/40 rounded-full flex items-center justify-center text-white/50 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
                <p className="text-[10px] font-black text-primary uppercase italic tracking-tighter mb-1.5 truncate pr-6">{item.matchName}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[11px] font-bold text-slate-300 leading-none">{item.market}</p>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase font-black h-4 px-1.5 mt-1">
                      {item.pickLabel}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none mb-1">Odd</span>
                    <span className="text-sm font-black text-primary italic tabular-nums">@{item.odd.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>

          {/* Checkout */}
          <CardFooter className="p-4 flex-col gap-4 border-t border-white/10 bg-[#020617]">
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                  <TrendingUp size={14} className="text-primary" />
                  Odd Total
                </div>
                <span className="font-black text-primary text-xl italic tracking-tighter tabular-nums">{totalOdds.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-500 uppercase px-1">Valor da Aposta</span>
                  <div className="relative group">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <Input 
                      type="number" 
                      value={stakeInput} 
                      onChange={(e) => setStakeInput(e.target.value)} 
                      className="h-11 bg-black/40 border-white/10 pl-9 text-right font-black text-lg focus:border-primary/50 transition-all rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-green-500/70 uppercase px-1">Retorno Potencial</span>
                  <div className="h-11 flex items-center justify-end px-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <span className="text-lg font-black text-green-500 italic tabular-nums">{formatBRL(potentialWin)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handlePlaceBet} 
              disabled={!canPlaceBet}
              className={cn(
                "w-full h-14 font-black uppercase italic text-lg rounded-xl shadow-xl transition-all active:scale-95 group",
                canPlaceBet ? "lux-shine bg-primary text-black" : "bg-slate-800 text-slate-500 grayscale cursor-not-allowed"
              )}
            >
              {isFinalizing ? <Loader2 className="animate-spin" /> : (stake > (user?.tipoUsuario === 'CAMBISTA' ? 999999 : balance) ? 'Saldo Insuficiente' : 'Confirmar Aposta')}
              {!isFinalizing && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
