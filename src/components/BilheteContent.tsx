'use client';

import React from 'react';
import { Separator } from '@/components/ui/separator';

interface BilheteContentProps {
  lotteryName: string;
  ticketItems: any[];
  totalValue: number;
  possibleReturn: number;
}

export function BilheteContent({
  lotteryName,
  ticketItems,
  totalValue,
  possibleReturn,
}: BilheteContentProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-xl border-b pb-2 text-center uppercase italic tracking-tighter text-primary">
        Resumo - {lotteryName}
      </h3>
      <div className="space-y-3">
        {ticketItems.map((item, index) => {
          const isFootball = lotteryName === 'Futebol';
          const valorAposta = isFootball 
            ? (item.value || 0) 
            : (parseFloat(String(item.valor || '0').replace(',', '.')) || 0);
          const retornoPossivel = isFootball 
            ? (item.value * item.odd) 
            : (item.retornoPossivel || 0);

          return (
            <div key={item.id || index} className="p-4 border rounded-xl bg-muted/30 text-base space-y-1 shadow-sm">
              {isFootball ? (
                <>
                  <p className="font-black text-primary uppercase text-[13px] italic">
                    {item.match?.homeTeamName || 'Time Casa'} vs {item.match?.awayTeamName || 'Time Fora'}
                  </p>
                  <p className="text-[12px] text-muted-foreground font-bold uppercase tracking-widest">
                    Vencedor: <span className="text-foreground">{item.pickLabel}</span> | Odd: <span className="text-primary">@{item.odd?.toFixed(2)}</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-black text-primary uppercase text-[13px] italic">
                    {item.modalidadeLabel}
                    {item.colocacaoLabel ? ` - ${item.colocacaoLabel}` : item.premio ? ` - Até ${item.premio}º Prêmio` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-bold uppercase">
                    {item.loteriaLabel ? `Loteria: ${item.loteriaLabel} - ` : ''}
                    {item.horario ? `${item.horario} ` : ''}
                    (Aposta para {item.dataAposta})
                  </p>
                  <div className="bg-black/10 p-2 rounded-lg my-1">
                    <p className="font-mono text-foreground font-black break-all text-sm tracking-widest">
                      {Array.isArray(item.numeros) ? item.numeros.join(', ') : (item.numeros || item.numero)}
                    </p>
                  </div>
                </>
              )}
              
              <div className="flex justify-between items-center pt-1">
                <p className="font-medium text-muted-foreground text-xs uppercase">Valor: <span className="text-foreground font-bold text-sm">R$ {valorAposta.toFixed(2).replace('.', ',')}</span></p>
                {retornoPossivel > 0 && (
                  <p className="font-bold text-green-600 text-sm">
                    Retorno: R$ {retornoPossivel.toFixed(2).replace('.', ',')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Separator className="opacity-50" />
      <div className="text-right space-y-1 pr-2">
        <p className="text-xl font-black text-white italic">
          VALOR TOTAL: R$ {(totalValue || 0).toFixed(2).replace('.', ',')}
        </p>
        {possibleReturn > 0 && (
          <p className="font-black text-green-500 text-lg">
            RETORNO POSSÍVEL: R$ {possibleReturn.toFixed(2).replace('.', ',')}
          </p>
        )}
      </div>
    </div>
  );
}