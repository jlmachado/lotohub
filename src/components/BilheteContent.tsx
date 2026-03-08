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
      <h3 className="font-bold text-lg border-b pb-2 text-center uppercase italic tracking-tighter text-primary">
        Resumo - {lotteryName}
      </h3>
      <div className="space-y-3">
        {ticketItems.map((item, index) => {
          const valorAposta = parseFloat(String(item.valor || '0').replace(',', '.')) || 0;
          const retornoPossivel = item.retornoPossivel || 0;

          return (
            <div key={item.id || index} className="p-3 border rounded-xl bg-muted/30 text-sm space-y-1 shadow-sm">
              <p className="font-black text-primary uppercase text-[11px] italic">
                {item.modalidadeLabel}
                {item.colocacaoLabel ? ` - ${item.colocacaoLabel}` : item.premio ? ` - Até ${item.premio}º Prêmio` : ''}
              </p>
              <p className="text-[10px] text-muted-foreground font-bold">
                {item.loteriaLabel ? `Loteria: ${item.loteriaLabel} - ` : ''}
                {item.horario ? `${item.horario} ` : ''}
                (Aposta para {item.dataAposta})
              </p>
              <div className="bg-black/10 p-2 rounded-lg my-1">
                <p className="font-mono text-foreground font-bold break-all">
                  {Array.isArray(item.numeros) ? item.numeros.join(', ') : (item.numeros || item.numero)}
                </p>
              </div>
              <div className="flex justify-between items-center pt-1">
                <p className="font-medium text-muted-foreground text-xs">Valor: <span className="text-foreground font-bold">R$ {valorAposta.toFixed(2).replace('.', ',')}</span></p>
                {retornoPossivel > 0 && (
                  <p className="font-bold text-green-600">
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
        <p className="text-lg font-black text-white">
          VALOR TOTAL: R$ {(totalValue || 0).toFixed(2).replace('.', ',')}
        </p>
        {possibleReturn > 0 && (
          <p className="font-black text-green-500">
            RETORNO POSSÍVEL: R$ {possibleReturn.toFixed(2).replace('.', ',')}
          </p>
        )}
      </div>
    </div>
  );
}
