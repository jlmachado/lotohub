'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ShoppingCart, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LotteryBetSlipProps {
  items: any[];
  totalValue: number;
  totalPossibleReturn: number;
  onRemoveItem: (id: string | number) => void;
  onFinalize: () => void;
  lotteryName: string;
}

export function LotteryBetSlip({
  items,
  totalValue,
  totalPossibleReturn,
  onRemoveItem,
  onFinalize,
  lotteryName,
}: LotteryBetSlipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (items.length > prevCount) {
      if (items.length === 1) setIsOpen(true);
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevCount(items.length);
  }, [items.length, prevCount]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (items.length > 0) {
      setIsOpen(!isOpen);
    }
  };

  if (!mounted) return null;

  const cartContent = (
    <>
      <button
        id="boletimBtn"
        onClick={toggleOpen}
        className={cn(
          "fixed bottom-[84px] right-4 z-[9999] h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all duration-300 active:scale-90 flex items-center justify-center border-2 border-white/20",
          items.length === 0 && "opacity-50 grayscale pointer-events-none scale-75",
          isOpen && "opacity-0 scale-90 pointer-events-none",
          isPulsing && !isOpen && "animate-bounce"
        )}
      >
        <span className="text-3xl">🛒</span>
        {items.length > 0 && (
          <span className={cn(
            "absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-[12px] font-black text-destructive-foreground border-2 border-white shadow-md animate-in zoom-in",
            isPulsing && "scale-125"
          )}>
            {items.length}
          </span>
        )}
      </button>

      <div
        className={cn(
          "fixed inset-0 z-[9997] bg-black/80 backdrop-blur-[3px] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[9998] w-full max-w-2xl mx-auto bg-background shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-500 flex flex-col border-t border-white/10 rounded-t-[24px] overflow-hidden",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ height: '65vh', maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between p-5 bg-card border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ShoppingCart size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Carrinho</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">{lotteryName}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="h-10 w-10 flex items-center justify-center bg-white/5 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 custom-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic gap-4 opacity-40">
              <ShoppingCart size={64} strokeWidth={1} />
              <p className="text-sm font-bold">Seu carrinho está vazio</p>
            </div>
          ) : (
            items.map((aposta) => {
              const isFootball = lotteryName === 'Futebol';
              const displayNumbers = Array.isArray(aposta.numeros)
                ? aposta.numeros.join(', ')
                : aposta.numeros || aposta.numero;
              
              const valorItem = isFootball 
                ? aposta.value 
                : (typeof aposta.valor === 'string' ? parseFloat(aposta.valor.replace(',', '.')) : aposta.valor);
              
              const retornoItem = isFootball
                ? (aposta.value * aposta.odd)
                : (aposta.retornoPossivel || 0);

              return (
                <div 
                  key={aposta.id} 
                  className="bg-card/50 border-l-4 border-primary p-4 rounded-r-xl shadow-sm relative group animate-in slide-in-from-bottom-2 duration-300"
                >
                  <button
                    onClick={() => onRemoveItem(aposta.id)}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <div className="pr-8">
                    {isFootball ? (
                      <>
                        <p className="font-black text-sm uppercase italic text-primary">
                          {aposta.match?.homeTeamName} vs {aposta.match?.awayTeamName}
                        </p>
                        <p className="text-[11px] font-bold text-muted-foreground mb-2">
                          {aposta.pickLabel} | @{aposta.odd?.toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-black text-sm uppercase italic text-primary">
                          {aposta.modalidadeLabel}
                        </p>
                        <p className="text-[11px] font-bold text-muted-foreground mb-2">
                          {aposta.colocacaoLabel || (aposta.premio ? `Até ${aposta.premio}º Prêmio` : '')}
                        </p>
                        <div className="bg-black/20 p-2 rounded-lg mb-3 border border-white/5">
                          <p className="font-mono text-foreground text-sm break-all leading-tight font-bold">
                            {displayNumbers}
                          </p>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between items-end border-t border-dashed border-white/10 pt-3">
                      <div>
                        <span className="text-[9px] font-black uppercase text-muted-foreground block">Valor</span>
                        <span className="font-bold text-base">R$ {valorItem.toFixed(2).replace('.', ',')}</span>
                      </div>
                      {retornoItem > 0 && (
                        <div className="text-right">
                          <span className="text-[9px] font-black uppercase text-muted-foreground block">Retorno</span>
                          <span className="font-black text-green-500">R$ {retornoItem.toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-white/10 bg-card flex-shrink-0 shadow-[0_-15px_30px_rgba(0,0,0,0.3)]">
            <div className="mb-4 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">Valor Total:</span>
                <span className="text-2xl font-black text-white tabular-nums">
                  R$ {totalValue.toFixed(2).replace('.', ',')}
                </span>
              </div>
              {totalPossibleReturn > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-green-500/70 font-black uppercase tracking-widest">Retorno Potencial:</span>
                  <span className="text-lg font-black text-green-500 tabular-nums">
                    R$ {totalPossibleReturn.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
            </div>
            <Button
              className="w-full h-14 text-lg font-black bg-primary text-primary-foreground uppercase italic rounded-xl shadow-lg active:scale-95 transition-transform lux-shine"
              onClick={() => {
                onFinalize();
                setIsOpen(false);
              }}
            >
              Finalizar Bilhete
            </Button>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(cartContent, document.body);
}
